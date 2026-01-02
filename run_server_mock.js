const path = require('path');
const os = require('os');

// Mock Electron
const mockElectron = {
    app: {
        getPath: (name) => {
            if (name === 'appData') return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
            return '';
        }
    }
};

// Override require to return mock for 'electron'
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(request) {
    if (request === 'electron') {
        return mockElectron;
    }
    return originalRequire.apply(this, arguments);
};

// Set fixed port for testing
process.env.PORT = 8001;
process.env.APPNAME = 'garmentpos_Test'; // Use a test app name to avoid messing with real DB if possible, but user asked for features so maybe use real one?
// Wait, if I change APPNAME, I won't see existing data. But I am adding new features.
// Use 'garmentpos' as in package.json to match real environment behavior?
// package.json name is "garmentpos".
// server.js uses pkg.name.
const pkg = require("./package.json"); 
process.env.APPNAME = pkg.name; // Keep it real to ensure we test against real DB structure (NeDB files)

console.log("Starting Server with Mock Electron...");
require('./server');
