require("@electron/remote/main").initialize();
require("electron-store").initRenderer();
const setupEvents = require("./installers/setupEvents");
if (setupEvents.handleSquirrelEvent()) {
    return;
}
const { app, BrowserWindow, ipcMain, screen } = require("electron");
const serverModule = require('./server');
const { restartServer, io } = serverModule;
const path = require("path");
const contextMenu = require("electron-context-menu");
let { Menu, template } = require("./assets/js/native_menu/menu");
const menuController = require('./assets/js/native_menu/menuController.js');
const isPackaged = app.isPackaged;
const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
let mainWindow;
let customerDisplayWindow = null;
let kotDisplayWindow = null;

// License checking variables
let licenseCheckCompleted = false;
let licenseValid = false;
let licenseGracePeriod = false;

//stop app from launching multiple times during these squirrel spawning events
if (require('electron-squirrel-startup')) app.quit();

function createWindow() {

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        frame: true,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: false,
            contextIsolation: false,
        },
    });
    menuController.initializeMainWindow(mainWindow);
    mainWindow.maximize();
    mainWindow.show();

    mainWindow.loadURL(`file://${path.join(__dirname, "index.html")}`);

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

}

function createCustomerDisplayWindow() {
    if (customerDisplayWindow) {
        customerDisplayWindow.focus();
        return;
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    customerDisplayWindow = new BrowserWindow({
        width: 800,
        height: 600,
        x: width - 810, // Position to the right of main window
        y: 0,
        frame: false,
        alwaysOnTop: false,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: false,
            contextIsolation: false,
        },
        title: 'Customer Display'
    });

    customerDisplayWindow.loadURL(`file://${path.join(__dirname, "customer-display.html")}`);

    customerDisplayWindow.on('closed', () => {
        customerDisplayWindow = null;
    });

    menuController.initializeMainWindow(customerDisplayWindow);
}

function createKOTDisplayWindow() {
    if (kotDisplayWindow) {
        kotDisplayWindow.focus();
        return;
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    kotDisplayWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        x: width - 1010, // Position to the right of customer display
        y: 100,
        frame: true,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: false,
            contextIsolation: false,
        },
        title: 'Kitchen Order Display'
    });

    kotDisplayWindow.loadURL(`file://${path.join(__dirname, "kot-display.html")}`);

    kotDisplayWindow.on('closed', () => {
        kotDisplayWindow = null;
    });

    menuController.initializeMainWindow(kotDisplayWindow);
}

function closeCustomerDisplayWindow() {
    if (customerDisplayWindow) {
        customerDisplayWindow.close();
        customerDisplayWindow = null;
    }
}

function closeKOTDisplayWindow() {
    if (kotDisplayWindow) {
        kotDisplayWindow.close();
        kotDisplayWindow = null;
    }
}

app.on("browser-window-created", (_, window) => {
    require("@electron/remote/main").enable(window.webContents);
});

let serverReady = false;

app.whenReady().then(async () => {
    // First, check license before creating main window
    const licenseValid = await checkLicenseBeforeStartup();
    
    if (!licenseValid) {
        // Show license dialog and wait for activation
        const activationSuccessful = await showLicenseActivationDialog();
        if (!activationSuccessful) {
            app.quit();
            return;
        }
    }

    createWindow();

    // Monitor for server readiness
    const checkServerReady = () => {
        if (process.env.PORT && mainWindow && !isNaN(process.env.PORT)) {
            serverReady = true;
            console.log('Server ready detected, PORT:', process.env.PORT);
            console.log('Sending server config to renderer:', { port: process.env.PORT, host: 'localhost' });
            mainWindow.webContents.send('server-config', {
                port: process.env.PORT,
                host: 'localhost'
            });
        } else {
            // Keep checking until we have both PORT and mainWindow
            setTimeout(checkServerReady, 100);
        }
    };

    // Start monitoring immediately
    checkServerReady();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

ipcMain.on("app-quit", (evt, arg) => {
    app.quit();
});

ipcMain.on("app-reload", (event, arg) => {
    mainWindow.reload();
});

ipcMain.on("restart-app", () => {
    autoUpdater.quitAndInstall();
});

ipcMain.on("get-server-config", (event) => {
    if (process.env.PORT) {
        event.reply('server-config', {
            port: process.env.PORT,
            host: 'localhost'
        });
    }
});

// IPC handlers for display windows
ipcMain.on("toggle-customer-display", (event, arg) => {
    if (customerDisplayWindow) {
        closeCustomerDisplayWindow();
    } else {
        createCustomerDisplayWindow();
    }
});

ipcMain.on("toggle-kot-display", (event, arg) => {
    if (kotDisplayWindow) {
        closeKOTDisplayWindow();
    } else {
        createKOTDisplayWindow();
    }
});

// Handle display ready signals and send initial data
ipcMain.on("customer-display-ready", async (event) => {
    // Send current settings and any existing order data
    const settings = await getCurrentSettings();
    if (customerDisplayWindow) {
        customerDisplayWindow.webContents.send('customer-display-update', {
            type: 'settings',
            settings: settings
        });
    }
});

ipcMain.on("kot-display-ready", async (event) => {
    // Send current settings and pending orders
    const settings = await getCurrentSettings();
    const pendingOrders = await getPendingOrders();
    if (kotDisplayWindow) {
        kotDisplayWindow.webContents.send('kot-display-update', {
            type: 'settings',
            settings: settings
        });
        kotDisplayWindow.webContents.send('kot-display-update', {
            type: 'orders',
            orders: pendingOrders
        });
    }
});

// Handle order updates for customer display
ipcMain.on("update-customer-display", (event, data) => {
    if (customerDisplayWindow) {
        customerDisplayWindow.webContents.send('customer-display-update', {
            type: 'order',
            orderData: data
        });
    }
});

// Handle order updates for KOT display
ipcMain.on("update-kot-display", (event, data) => {
    if (kotDisplayWindow) {
        kotDisplayWindow.webContents.send('kot-display-update', {
            type: 'orders',
            orders: data
        });
    }
});

// Handle KOT actions
ipcMain.on("kot-order-ready", (event, data) => {
    // Update order status to ready
    updateOrderStatus(data.orderId, 'ready');
    // Notify main window and refresh displays
    if (mainWindow) {
        mainWindow.webContents.send('order-status-changed', { orderId: data.orderId, status: 'ready' });
    }
    refreshDisplays();
});

ipcMain.on("kot-order-snooze", (event, data) => {
    // Update order priority or status
    updateOrderStatus(data.orderId, 'snoozed');
    refreshDisplays();
});

// Helper functions
function getCurrentSettings() {
    // Fetch settings from database
    const Datastore = require("@seald-io/nedb");
    const path = require("path");
    const appName = process.env.APPNAME;
    const appData = process.env.APPDATA;
    const dbPath = path.join(appData, appName, "server", "databases", "settings.db");

    const settingsDB = new Datastore({ filename: dbPath, autoload: true });

    return new Promise((resolve) => {
        settingsDB.findOne({}, function (err, settings) {
            if (err || !settings) {
                resolve({
                    store: 'Restaurant POS',
                    taxRate: 0.08,
                    serviceChargeRate: 0.1,
                    symbol: '$'
                });
            } else {
                resolve({
                    store: settings.store || 'Restaurant POS',
                    taxRate: settings.percentage ? parseFloat(settings.percentage) / 100 : 0.08,
                    serviceChargeRate: settings.service_charge ? parseFloat(settings.service_charge) / 100 : 0.1,
                    symbol: settings.symbol || '$'
                });
            }
        });
    });
}

function getPendingOrders() {
    // Fetch pending orders from transactions database
    const Datastore = require("@seald-io/nedb");
    const path = require("path");
    const appName = process.env.APPNAME;
    const appData = process.env.APPDATA;
    const dbPath = path.join(appData, appName, "server", "databases", "transactions.db");

    const transactionsDB = new Datastore({ filename: dbPath, autoload: true });

    return new Promise((resolve) => {
        // Get transactions with status 1 (paid) but not yet marked as ready for kitchen
        transactionsDB.find({
            $and: [
                { status: 1 }, // Paid transactions
                { $or: [
                    { kitchen_status: { $exists: false } },
                    { kitchen_status: { $ne: 'ready' } }
                ]}
            ]
        }, function (err, transactions) {
            if (err) {
                console.error('Error fetching pending orders:', err);
                resolve([]);
                return;
            }

            // Transform transactions to KOT format
            const pendingOrders = transactions.map(trans => ({
                id: trans._id,
                number: trans.order,
                items: trans.items.map(item => ({
                    name: item.product_name,
                    quantity: item.quantity,
                    notes: item.modifiers ? item.modifiers.map(m => m.name).join(', ') : ''
                })),
                type: 'dine-in', // Default, could be expanded based on transaction data
                status: trans.kitchen_status || 'new',
                timestamp: trans.date,
                priority: trans.priority || 'normal'
            }));

            resolve(pendingOrders);
        });
    });
}

function updateOrderStatus(orderId, status) {
    // Update order status in database
    const Datastore = require("@seald-io/nedb");
    const path = require("path");
    const appName = process.env.APPNAME;
    const appData = process.env.APPDATA;
    const dbPath = path.join(appData, appName, "server", "databases", "transactions.db");

    const transactionsDB = new Datastore({ filename: dbPath, autoload: true });

    transactionsDB.update(
        { _id: orderId },
        { $set: { kitchen_status: status, kitchen_updated_at: new Date() } },
        {},
        function (err, numReplaced) {
            if (err) {
                console.error(`Error updating order ${orderId} to status ${status}:`, err);
            } else {
                console.log(`Updated order ${orderId} to status ${status}`);
            }
        }
    );
}

async function refreshDisplays() {
    // Refresh both displays with current data
    const settings = await getCurrentSettings();
    const pendingOrders = await getPendingOrders();

    if (customerDisplayWindow) {
        customerDisplayWindow.webContents.send('customer-display-update', {
            type: 'settings',
            settings: settings
        });
    }

    if (kotDisplayWindow) {
        kotDisplayWindow.webContents.send('kot-display-update', {
            type: 'orders',
            orders: pendingOrders
        });
    }
}

//Context menu
contextMenu({
    prepend: (params, browserWindow) => [
        {
            label: "Refresh",
            click() {
                mainWindow.reload();
            },
        },
    ],
});

//Live reload during development
if (!isPackaged) {
    try {
        require("electron-reloader")(module);
    } catch (_) { }
}

/**
 * License checking functions
 */

// License configuration
const LICENSE_CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbycaTL7DqADUwcHDujyFdRqSpeaUCIrzCx4F6-W7tikXmmT9kxwO_iLRTgsdNn2WzL7/exec',
    GRACE_PERIOD_DAYS: 7,
    STORAGE_KEY: 'foodmine_license'
};

/**
 * Check license before application startup
 */
async function checkLicenseBeforeStartup() {
    try {
        // Try to load existing license from storage
        const license = loadLicenseFromStorage();
        
        if (!license || !license.license_key) {
            console.log('No license found');
            return false;
        }

        // Check license online
        const isValid = await validateLicenseOnline(license.license_key, license.email);
        
        if (isValid) {
            console.log('License is valid');
            licenseValid = true;
            licenseGracePeriod = false;
            return true;
        } else {
            // Check if expired but in grace period
            const expiryDate = new Date(license.expiry_date);
            const now = new Date();
            const graceEndDate = new Date(expiryDate.getTime() + (LICENSE_CONFIG.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000));
            
            if (now <= graceEndDate) {
                console.log('License expired but in grace period');
                licenseValid = true;
                licenseGracePeriod = true;
                return true;
            } else {
                console.log('License has expired');
                licenseValid = false;
                licenseGracePeriod = false;
                return false;
            }
        }
        
    } catch (error) {
        console.error('License check failed:', error);
        return false;
    }
}

/**
 * Show license activation dialog
 */
async function showLicenseActivationDialog() {
    return new Promise((resolve) => {
        const dialog = new BrowserWindow({
            width: 400,
            height: 300,
            modal: true,
            parent: mainWindow,
            resizable: false,
            title: 'License Activation Required',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        dialog.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>License Activation</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .container { max-width: 350px; margin: 0 auto; }
                    h3 { color: #333; }
                    .form-group { margin-bottom: 15px; }
                    label { display: block; margin-bottom: 5px; font-weight: bold; }
                    input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
                    .buttons { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
                    button { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
                    .btn-primary { background: #007bff; color: white; }
                    .btn-secondary { background: #6c757d; color: white; }
                    .error { color: red; margin-top: 10px; }
                    .success { color: green; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h3>License Activation Required</h3>
                    <p>Please enter your license key to activate the application.</p>
                    
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" id="email" placeholder="Enter your email">
                    </div>
                    
                    <div class="form-group">
                        <label>License Key</label>
                        <input type="text" id="licenseKey" placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXX">
                    </div>
                    
                    <div id="message" class="error" style="display: none;"></div>
                    
                    <div class="buttons">
                        <button class="btn-secondary" id="cancelBtn">Cancel</button>
                        <button class="btn-primary" id="activateBtn">Activate</button>
                    </div>
                </div>
                
                <script>
                    const { ipcRenderer } = require('electron');
                    
                    document.getElementById('activateBtn').addEventListener('click', async () => {
                        const email = document.getElementById('email').value.trim();
                        const licenseKey = document.getElementById('licenseKey').value.trim();
                        
                        if (!email || !licenseKey) {
                            document.getElementById('message').style.display = 'block';
                            document.getElementById('message').textContent = 'Please enter both email and license key.';
                            return;
                        }
                        
                        document.getElementById('activateBtn').disabled = true;
                        document.getElementById('activateBtn').textContent = 'Activating...';
                        
                        try {
                            const result = await ipcRenderer.invoke('activate-license', licenseKey, email);
                            
                            if (result.success) {
                                document.getElementById('message').className = 'success';
                                document.getElementById('message').style.display = 'block';
                                document.getElementById('message').textContent = 'License activated successfully!';
                                
                                setTimeout(() => {
                                    window.close();
                                    ipcRenderer.send('license-activated');
                                }, 1000);
                            } else {
                                document.getElementById('message').className = 'error';
                                document.getElementById('message').style.display = 'block';
                                document.getElementById('message').textContent = result.error;
                                document.getElementById('activateBtn').disabled = false;
                                document.getElementById('activateBtn').textContent = 'Activate';
                            }
                        } catch (error) {
                            document.getElementById('message').className = 'error';
                            document.getElementById('message').style.display = 'block';
                            document.getElementById('message').textContent = 'Network error. Please try again.';
                            document.getElementById('activateBtn').disabled = false;
                            document.getElementById('activateBtn').textContent = 'Activate';
                        }
                    });
                    
                    document.getElementById('cancelBtn').addEventListener('click', () => {
                        window.close();
                        ipcRenderer.send('license-cancelled');
                    });
                </script>
            </body>
            </html>
        `)}`);

        dialog.on('closed', () => {
            resolve(false);
        });
    });
}

/**
 * Load license from storage
 */
function loadLicenseFromStorage() {
    try {
        const { app } = require('electron');
        const path = require('path');
        const fs = require('fs');
        
        const userDataPath = app.getPath('userData');
        const licensePath = path.join(userDataPath, 'license.json');
        
        if (fs.existsSync(licensePath)) {
            const data = fs.readFileSync(licensePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.warn('Could not load license from storage:', error);
    }
    return null;
}

/**
 * Save license to storage
 */
function saveLicenseToStorage(license) {
    try {
        const { app } = require('electron');
        const path = require('path');
        const fs = require('fs');
        
        const userDataPath = app.getPath('userData');
        const licensePath = path.join(userDataPath, 'license.json');
        
        fs.writeFileSync(licensePath, JSON.stringify(license, null, 2));
    } catch (error) {
        console.warn('Could not save license to storage:', error);
    }
}

/**
 * Validate license online
 */
async function validateLicenseOnline(licenseKey, email) {
    try {
        const response = await fetch(`${LICENSE_CONFIG.API_URL}?path=/validate&license_key=${encodeURIComponent(licenseKey)}&email=${encodeURIComponent(email)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success) {
            // Save updated license info
            const license = {
                license_key: licenseKey,
                email: email,
                status: data.status,
                expiry_date: data.expiry_date,
                activation_date: data.activation_date,
                hardware_id: data.hardware_id
            };
            saveLicenseToStorage(license);
            return true;
        } else {
            return false;
        }
        
    } catch (error) {
        console.error('License validation failed:', error);
        return false;
    }
}

/**
 * Activate license
 */
async function activateLicense(licenseKey, email) {
    try {
        const response = await fetch(`${LICENSE_CONFIG.API_URL}?path=/activate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                license_key: licenseKey,
                email: email
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Save license info
            const license = {
                license_key: licenseKey,
                email: email,
                status: data.status,
                activation_date: new Date().toISOString()
            };
            saveLicenseToStorage(license);
            return { success: true, message: 'License activated successfully' };
        } else {
            return { success: false, error: data.error };
        }
        
    } catch (error) {
        return { success: false, error: 'Network error. Please try again.' };
    }
}

// IPC handlers for license operations
ipcMain.handle('activate-license', activateLicense);

ipcMain.on('license-activated', () => {
    licenseValid = true;
    licenseGracePeriod = false;
});

ipcMain.on('license-cancelled', () => {
    licenseValid = false;
    licenseGracePeriod = false;
});
