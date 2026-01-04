// Sync Middleware for PharmaMine Web Application

const syncEngine = require('../sync/sync-engine');

// Sync middleware to handle sync operations
const syncMiddleware = async (req, res, next) => {
    try {
        // Check if this is a sync-related request
        const isSyncRequest = req.path.startsWith('/api/sync') || 
                             req.headers['x-sync-token'] ||
                             req.body.sync_operation;

        if (isSyncRequest) {
            // Add sync context to request
            req.syncContext = {
                timestamp: new Date().toISOString(),
                operation: req.method,
                path: req.path,
                source: 'web-app'
            };

            // Log sync operation
            console.log(`🔄 Sync operation: ${req.method} ${req.path}`);
        }

        // Continue to next middleware
        next();
    } catch (error) {
        console.error('Sync middleware error:', error);
        next(error);
    }
};

// Sync status middleware
const syncStatusMiddleware = (req, res, next) => {
    // Add sync status to response headers
    res.set({
        'X-Sync-Status': syncEngine.isRunning ? 'running' : 'stopped',
        'X-Sync-Last-Run': syncEngine.lastSyncTime || 'never',
        'X-Sync-Next-Run': syncEngine.nextSyncTime || 'unknown'
    });
    
    next();
};

// Sync authentication middleware
const syncAuthMiddleware = (req, res, next) => {
    const syncToken = req.headers['x-sync-token'];
    
    // For now, we'll allow sync operations without authentication
    // In a production environment, you would validate the sync token here
    
    if (syncToken) {
        req.syncToken = syncToken;
    }
    
    next();
};

module.exports = {
    syncMiddleware,
    syncStatusMiddleware,
    syncAuthMiddleware
};
