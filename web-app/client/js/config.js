// Browser Environment Configuration
// This file provides browser-compatible environment variables

// Set API base URL from server-provided configuration
window.API_BASE_URL = (function() {
    // Get the current host and port
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = '3001'; // Default web server port
    
    // Construct API base URL
    return `${protocol}//${host}:${port}/api`;
})();

// Set other browser-compatible environment variables
window.APP_CONFIG = {
    apiBaseUrl: window.API_BASE_URL,
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    timeout: 10000,
    version: '1.0.0'
};

// Log configuration for debugging
if (window.APP_CONFIG.isDevelopment) {
    console.log('🔧 Environment Configuration:', {
        apiBaseUrl: window.API_BASE_URL,
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        port: window.location.port
    });
}