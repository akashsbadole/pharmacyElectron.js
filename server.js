const http = require("http");
const express = require("express")();
const server = http.createServer(express);
const io = require('socket.io')(server);
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const pkg = require("./package.json");
const {app} = require('electron');
const { periodicCleanup } = require("./api/database_utils");
process.env.APPDATA = app.getPath('appData');
process.env.APPNAME = pkg.name;
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
express.use("/api/users", require("./api/users"));
express.use("/api/prescriptions", require("./api/prescriptions"));
express.use("/api/suppliers", require("./api/suppliers"));
express.use("/api/purchase_orders", require("./api/purchase_orders"));
express.use("/api/session-logs", require("./api/session_logs"));
express.use("/api/backup", require("./api/backup"));
express.use("/api", require("./api/transactions"));

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
        require('path').join(process.env.APPDATA, process.env.APPDATA, "server", "databases", "customers.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "categories.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "settings.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "prescriptions.db"),
        require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "purchase_orders.db")
    ];
    
    // Run cleanup every 5 minutes
    setInterval(() => {
        periodicCleanup(dbPaths);
    }, 5 * 60 * 1000);
    
    // Run initial cleanup on startup
    periodicCleanup(dbPaths);
});

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