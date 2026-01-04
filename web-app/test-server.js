// Simple test script to verify the web application server
const express = require('express');
const path = require('path');

// Test if we can load the server module
try {
    console.log('Testing web application server...');

    // Try to load the server from the current directory (web-app)
    const server = require('./server/server.js');

    console.log('✅ Web application server loaded successfully!');
    console.log('✅ All modules loaded correctly');

} catch (error) {
    console.error('❌ Error loading web application server:', error.message);
    console.error('Stack:', error.stack);
}
