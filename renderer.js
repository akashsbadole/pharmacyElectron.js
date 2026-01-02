window.$ = window.jQuery = require('jquery');

// IPC Communication for server configuration
let { ipcRenderer } = require('electron');
let serverConfig = { port: null, host: 'localhost' };

// Initialize API configuration when server config is received
function initializeAPI(config) {
    if (config && config.port) {
        serverConfig.port = config.port;
        serverConfig.host = config.host || 'localhost';
        
        // Update global API variables used by other modules
        window.port = config.port;
        window.host = config.host || 'localhost';
        window.api = "http://" + window.host + ":" + window.port + "/api/";
        
        console.log('API configured:', window.api);
        
        // Trigger custom event for other modules to initialize
        window.dispatchEvent(new CustomEvent('api-configured', { detail: serverConfig }));
    }
}

// Listen for server configuration from main process
ipcRenderer.on('server-config', (event, config) => {
    console.log('Received server config:', config);
    initializeAPI(config);
});

// Request server configuration if not received
setTimeout(() => {
    if (!serverConfig.port) {
        console.log('Requesting server config via IPC...');
        ipcRenderer.send('get-server-config');
        
        // Also try direct server query as fallback
        setTimeout(async () => {
            if (!serverConfig.port) {
                console.log('Trying direct server query as fallback...');
                try {
                    // Try common ports and localhost
                    const possiblePorts = [3000, 8080, 8081, 52554];
                    for (const port of possiblePorts) {
                        try {
                            const response = await fetch(`http://localhost:${port}/config`);
                            if (response.ok) {
                                const config = await response.json();
                                console.log('Direct server config found:', config);
                                initializeAPI(config);
                                break;
                            }
                        } catch (error) {
                            // Continue to next port
                        }
                    }
                } catch (error) {
                    console.error('Direct server query failed:', error);
                }
            }
        }, 1000);
    }
}, 500);

// Test API connectivity with retry logic
function testAPIConnection() {
    if (window.api && window.api !== "http://localhost:undefined/api/") {
        console.log('Testing API connectivity to:', window.api);
        
        // Test multiple endpoints to ensure they're working
        const testEndpoints = [
            'users/check/',
            'inventory/products',
            'transactions/all'
        ];
        
        let testsCompleted = 0;
        let testsPassed = 0;
        
        testEndpoints.forEach(endpoint => {
            fetch(window.api + endpoint)
                .then(response => {
                    testsCompleted++;
                    if (response.ok) {
                        testsPassed++;
                        console.log(`✅ ${endpoint} - OK`);
                    } else {
                        console.log(`⚠️ ${endpoint} - Failed with status:`, response.status);
                    }
                    
                    // After all tests are done
                    if (testsCompleted === testEndpoints.length) {
                        if (testsPassed === testEndpoints.length) {
                            console.log('✅ All API endpoints are working correctly');
                        } else {
                            console.log(`⚠️ ${testsPassed}/${testsCompleted} API endpoints are working`);
                        }
                    }
                })
                .catch(error => {
                    testsCompleted++;
                    console.error(`❌ ${endpoint} - Connection failed:`, error);
                    
                    // After all tests are done
                    if (testsCompleted === testEndpoints.length) {
                        console.log(`⚠️ ${testsPassed}/${testsCompleted} API endpoints are working`);
                    }
                });
        });
    } else {
        console.log('API not configured yet, skipping connectivity test');
    }
}

// Test API when configured with retry logic
window.addEventListener('api-configured', () => {
    let retryCount = 0;
    const maxRetries = 10;
    
    const attemptTest = () => {
        testAPIConnection();
        
        // If some endpoints failed, retry after a delay
        if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(attemptTest, 1000); // Retry after 1 second
        }
    };
    
    setTimeout(attemptTest, 1000); // Start with 1 second delay
});

// Load application modules
require('./assets/js/pos.js');
require('./assets/js/contact.js');
require('./assets/js/product-filter.js');
require('./assets/js/checkout.js');
require('print-js');
require('./assets/js/suppliers.js');
require('./assets/js/purchase_orders.js');
require('./assets/js/backup.js');
require('./assets/js/inventory.js');

// Load new modular application
require('./assets/js/app');
