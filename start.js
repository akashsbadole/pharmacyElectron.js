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

app.whenReady().then(() => {
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
