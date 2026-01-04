// Test script to verify middleware functionality
const express = require('express');

console.log('Testing middleware imports...');

try {
    // Test sync middleware import
    const syncMiddleware = require('./server/middleware/sync');
    console.log('✅ Sync middleware imported successfully');
    console.log('Sync middleware type:', typeof syncMiddleware);
    console.log('Sync middleware keys:', Object.keys(syncMiddleware));

    if (typeof syncMiddleware.syncMiddleware === 'function') {
        console.log('✅ syncMiddleware.syncMiddleware is a function');
    } else {
        console.log('❌ syncMiddleware.syncMiddleware is not a function:', typeof syncMiddleware.syncMiddleware);
    }

    // Test destructured import
    const { syncMiddleware: destructuredSyncMiddleware } = require('./server/middleware/sync');
    console.log('✅ Destructured syncMiddleware imported successfully');
    console.log('Destructured syncMiddleware type:', typeof destructuredSyncMiddleware);

    if (typeof destructuredSyncMiddleware === 'function') {
        console.log('✅ destructuredSyncMiddleware is a function');
    } else {
        console.log('❌ destructuredSyncMiddleware is not a function:', typeof destructuredSyncMiddleware);
    }

    // Test error handler import
    const { errorHandler } = require('./server/middleware/error-handler');
    console.log('✅ Error handler imported successfully');
    console.log('Error handler type:', typeof errorHandler);

    if (typeof errorHandler === 'function') {
        console.log('✅ errorHandler is a function');
    } else {
        console.log('❌ errorHandler is not a function:', typeof errorHandler);
    }

} catch (error) {
    console.error('❌ Error importing middleware:', error.message);
    console.error('Stack:', error.stack);
}