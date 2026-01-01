const http = require("http");
const express = require("express")();
const server = http.createServer(express);
const io = require('socket.io')(server);
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const pkg = require("./package.json");
const {app} = require('electron');
const { periodicCleanup, getDatabase, createBackup, getEncryptionKey, setGlobalEncryptionKey } = require("./api/database_utils");
const dayCloseModule = require("./api/day_close");
process.env.APPDATA = app.getPath('appData');
process.env.APPNAME = pkg.name;
const path = require('path');
const fs = require('fs');

let lastBackupDate = null;

// Ensure database directories exist
const dbDir = path.join(process.env.APPDATA, pkg.name, "server", "databases");
const uploadDir = path.join(process.env.APPDATA, pkg.name, "uploads");

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Initialize Encryption based on settings with retry logic
const settingsPath = path.join(dbDir, "settings.db");
const settingsDB = getDatabase(settingsPath);

// Function to safely initialize encryption with retry logic
function initializeEncryptionWithRetry(attempt = 1, maxAttempts = 5) {
    settingsDB.findOne({ _id: 1 }, (err, doc) => {
        if (err) {
            if (attempt < maxAttempts) {
                console.warn(`Encryption initialization attempt ${attempt} failed: ${err.message}. Retrying...`);
                setTimeout(() => initializeEncryptionWithRetry(attempt + 1, maxAttempts), 1000 * attempt);
            } else {
                console.error(`Failed to initialize encryption after ${maxAttempts} attempts: ${err.message}`);
            }
            return;
        }

        if (doc && doc.settings && doc.settings.enable_encryption) {
            const key = getEncryptionKey();
            if (key) {
                console.log("Encryption enabled. Setting global encryption key.");
                setGlobalEncryptionKey(key);
            }
        }
    });
}

// Start encryption initialization with retry logic
initializeEncryptionWithRetry();

const PORT = process.env.PORT || 0;
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
});

console.log("Server started");

express.use(bodyParser.json());
express.use(bodyParser.urlencoded({ extended: false }));
express.use(limiter);

express.all("/*", function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    res.header(
        "Access-Control-Allow-Headers",
        "Content-type,Accept,X-Access-Token,X-Key",
    );
    if (req.method == "OPTIONS") {
        res.status(200).end();
    } else {
        next();
    }
});

express.get("/", function (req, res) {
    res.send("POS Server Online.");
});

// Server configuration endpoint for renderer
express.get('/config', function(req, res) {
    const port = server.address().port;
    console.log('Config endpoint accessed, providing port:', port);
    res.json({ 
        port: port, 
        host: 'localhost',
        ready: true 
    });
});

express.use("/api/inventory", require("./api/inventory"));
express.use("/api/customers", require("./api/customers"));
express.use("/api/categories", require("./api/categories"));
express.use("/api/settings", require("./api/settings"));
express.use("/api/contact", require("./api/contact"));
express.use("/api/users", require("./api/users"));
express.use("/api/suppliers", require("./api/suppliers"));
express.use("/api/purchase_orders", require("./api/purchase_orders"));
express.use("/api/session-logs", require("./api/session_logs"));
express.use("/api/backup", require("./api/backup"));
express.use("/api", require("./api/transactions"));
express.use("/api/integration", require("./api/integration"));
express.use("/api/notifications", require("./api/notifications"));
express.use("/api/audit-logs", require("./api/audit_logs"));
express.use("/api/recipes", require("./api/recipes"));
express.use("/api/kitchen", require("./api/kitchen"));
express.use("/api/tables", require("./api/tables"));
express.use("/api/combos", require("./api/combos"));
express.use("/api/waste", require("./api/waste"));
express.use("/api/shifts", require("./api/shifts"));
express.use("/api/time-pricing-rules", require("./api/time_pricing_rules"));
express.use("/api/day-close", require("./api/day_close"));

global.io = io;

// Server module exports
let serverReady = false;
let serverPort = null;

server.listen(PORT, () => {
    serverPort = server.address().port;
    process.env.PORT = serverPort;
    console.log("Listening on PORT", serverPort);
    
    // Signal that server is ready
    serverReady = true;
    console.log("Server is ready for connections");
    
    // Make port available globally for main process
    global.serverPort = serverPort;
    global.serverReady = true;
    
    // Set up periodic cleanup of temporary database files
    const dbPaths = [
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "inventory.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "session_logs.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "users.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "suppliers.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "customers.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "categories.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "settings.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "recipes.db"), // Added for recipe management
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "kitchen_orders.db"), // Added for kitchen display system
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "tables.db"), // Added for table management
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "combos.db"), // Added for combo meal builder
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "purchase_orders.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "contact.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "audit_logs.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "shifts.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "time_pricing_rules.db")
    ];
    
    // Run cleanup every 10 minutes (increased from 5)
    setInterval(() => {
        periodicCleanup(dbPaths);
    }, 10 * 60 * 1000);
    
    // Defer initial cleanup by 10 seconds to avoid race conditions with database loading/recovery
    setTimeout(() => {
        console.log("Running initial database cleanup...");
        periodicCleanup(dbPaths);
    }, 10000);

    // Initialize Automated Backup Scheduler
    initBackupScheduler();
    
    // Initialize Automated Day Close Scheduler
    initDayCloseScheduler();
});

/**
 * Initializes the automated backup scheduler.
 */
function initBackupScheduler() {
    console.log("Initializing Automated Backup Scheduler...");
    
    const settingsPath = path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "settings.db");
    const settingsDB = getDatabase(settingsPath);
    const backupDir = path.join(process.env.APPDATA, process.env.APPNAME, 'server', 'backups');

    setInterval(() => {
        settingsDB.findOne({ _id: 1 }, (err, doc) => {
            if (err || !doc || !doc.settings) return;

            const settings = doc.settings;
            const freq = settings.backup_frequency;
            const time = settings.backup_time; // HH:mm

            if (!freq || freq === 'off' || !time) return;

            const now = new Date();
            const currentDay = now.toDateString();
            const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

            if (currentTime === time && lastBackupDate !== currentDay) {
                // Check frequency logic
                let shouldBackup = false;
                if (freq === 'daily') shouldBackup = true;
                else if (freq === 'weekly' && now.getDay() === 0) shouldBackup = true; // Sunday
                else if (freq === 'monthly' && now.getDate() === 1) shouldBackup = true; // 1st of month

                if (shouldBackup) {
                    console.log(`Triggering automated ${freq} backup at ${currentTime}...`);
                    createBackup(backupDir, (progress, status) => {
                        console.log(`Auto-backup progress: ${progress}% - ${status}`);
                    }).then(info => {
                        console.log(`Auto-backup completed: ${info.filename}`);
                        lastBackupDate = currentDay;
                        // Log to notifications/audit logs if needed
                    }).catch(err => {
                        console.error("Auto-backup failed:", err);
                    });
                }
            }
        });
    }, 60 * 1000); // Check every minute
}

/**
 * Initializes the automated day close scheduler.
 */
function initDayCloseScheduler() {
    console.log("Initializing Automated Day Close Scheduler...");
    
    const settingsPath = path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "settings.db");
    const settingsDB = getDatabase(settingsPath);
    const dayCloseAPI = require("./api/day_close");

    setInterval(() => {
        settingsDB.findOne({ _id: 1 }, (err, doc) => {
            if (err || !doc || !doc.settings) return;

            const settings = doc.settings;
            const autoDayClose = settings.autoDayClose;
            const dayCloseTime = settings.dayCloseTime || "23:59";
            const dayCloseDay = settings.dayCloseDay || "everyday";
            const lastDayCloseDate = settings.lastDayCloseDate;

            if (!autoDayClose) return;

            const now = new Date();
            const currentDayStr = now.toISOString().split('T')[0];
            const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

            // Check if we already did day close today
            if (lastDayCloseDate === currentDayStr) {
                return;
            }

            // Check if it's time for day close
            if (currentTime === dayCloseTime) {
                // Check day of week condition
                let shouldClose = false;
                const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
                
                switch (dayCloseDay) {
                    case 'everyday':
                        shouldClose = true;
                        break;
                    case 'friday':
                        shouldClose = dayOfWeek === 5; // Friday
                        break;
                    case 'saturday':
                        shouldClose = dayOfWeek === 6; // Saturday
                        break;
                    case 'weekly':
                        shouldClose = dayOfWeek === 0; // Sunday
                        break;
                }
                
                if (shouldClose) {
                    console.log(`Triggering automatic day close at ${currentTime}...`);
                    
                    // Make HTTP request to day close API
                    const http = require('http');
                    const postData = JSON.stringify({
                        date: currentDayStr,
                        generateReport: true,
                        backup: true
                    });
                    
                    const options = {
                        hostname: 'localhost',
                        port: serverPort,
                        path: '/api/day-close/close-day',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(postData)
                        }
                    };
                    
                    const req = http.request(options, (res) => {
                        let data = '';
                        res.on('data', (chunk) => {
                            data += chunk;
                        });
                        res.on('end', () => {
                            console.log('Automatic day close completed:', data);
                        });
                    });
                    
                    req.on('error', (error) => {
                        console.error('Automatic day close failed:', error);
                    });
                    
                    req.write(postData);
                    req.end();
                }
            }
        });
    }, 60 * 1000); // Check every minute
}

/**
 * Restarts the server process.
 */
function restartServer() {
    server.close(() => {
        // Remove cached modules so require() reloads them
        Object.keys(require.cache).forEach(key => {
            if (key.includes('api') || key.endsWith('server.js')) {
                delete require.cache[key];
            }
        });
        // Re-require server.js to restart everything
        require('./server');
    });
}

module.exports = { restartServer, io, serverReady, serverPort };
