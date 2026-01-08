// Sync Engine for PharmaMine Web Application

const winston = require('winston');
const { syncLog, getSyncLog, clearSyncLog } = require('../api/sync');

// Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/sync.log', level: 'info' }),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

class SyncEngine {
    constructor() {
        this.isRunning = false;
        this.syncInterval = null;
        this.lastSyncTime = null;
        this.nextSyncTime = null;
        this.syncLog = [];
        this.conflicts = [];
        this.maxRetries = 3;
        this.retryInterval = 5000; // 5 seconds
    }

    // Initialize sync engine
    async initialize() {
        try {
            logger.info('Initializing sync engine...');
            
            // Start periodic sync
            this.startPeriodicSync();
            
            this.isRunning = true;
            logger.info('✅ Sync engine initialized successfully');
            
        } catch (error) {
            logger.error('Failed to initialize sync engine:', error);
            throw error;
        }
    }

    // Start periodic synchronization
    startPeriodicSync() {
        const interval = parseInt(process.env.SYNC_INTERVAL) || 30000; // 30 seconds default
        
        this.syncInterval = setInterval(async () => {
            await this.performSync();
        }, interval);
        
        logger.info(`🔄 Periodic sync started (every ${interval / 1000} seconds)`);
    }

    // Perform synchronization
    async performSync() {
        try {
            const startTime = Date.now();
            logger.info('Starting sync operation...');
            
            // Update sync timestamps
            this.lastSyncTime = new Date();
            this.nextSyncTime = new Date(Date.now() + (parseInt(process.env.SYNC_INTERVAL) || 30000));
            
            // Log sync attempt
            const syncLogEntry = {
                operation: 'sync_start',
                timestamp: new Date().toISOString(),
                duration: 0,
                status: 'success',
                details: 'Periodic sync operation started'
            };
            
            // Simulate sync operations (in a real implementation, this would sync with desktop app)
            await this.syncWithDesktopApp();
            
            // Update log entry
            syncLogEntry.duration = Date.now() - startTime;
            syncLogEntry.status = 'success';
            syncLogEntry.details = 'Periodic sync completed successfully';
            
            this.syncLog.push(syncLogEntry);
            
            // Keep only last 100 sync logs
            if (this.syncLog.length > 100) {
                this.syncLog = this.syncLog.slice(-100);
            }
            
            logger.info(`✅ Sync completed in ${syncLogEntry.duration}ms`);
            
        } catch (error) {
            logger.error('Sync operation failed:', error);
            
            // Log error
            const syncLogEntry = {
                operation: 'sync_error',
                timestamp: new Date().toISOString(),
                duration: Date.now() - (this.lastSyncTime?.getTime() || 0),
                status: 'error',
                error: error.message,
                details: 'Sync operation failed'
            };
            
            this.syncLog.push(syncLogEntry);
        }
    }

    // Sync with desktop application (NeDB)
    async syncWithDesktopApp() {
        try {
            // Check if desktop app is reachable
            const nedbHost = process.env.NEDB_HOST || 'localhost';
            const nedbPort = process.env.NEDB_PORT || 49499;
            
            // In a real implementation, you would:
            // 1. Connect to desktop app via HTTP API
            // 2. Get changes from desktop app
            // 3. Get changes from web app
            // 4. Merge changes with conflict resolution
            // 5. Update both databases
            
            logger.debug('Simulating sync with desktop application...');
            
            // For now, just log that we're attempting sync
            // In production, you would make actual API calls to the desktop app
            
            return true;
            
        } catch (error) {
            logger.error('Failed to sync with desktop application:', error);
            throw error;
        }
    }

    // Manual sync trigger
    async triggerSync() {
        logger.info('Manual sync triggered');
        
        if (this.isRunning) {
            // Clear existing interval
            if (this.syncInterval) {
                clearInterval(this.syncInterval);
                this.syncInterval = null;
            }
            
            // Perform immediate sync
            await this.performSync();
            
            // Restart periodic sync
            this.startPeriodicSync();
            
            return true;
        } else {
            throw new Error('Sync engine is not running');
        }
    }

    // Stop sync engine
    async stop() {
        try {
            logger.info('Stopping sync engine...');
            
            this.isRunning = false;
            
            if (this.syncInterval) {
                clearInterval(this.syncInterval);
                this.syncInterval = null;
            }
            
            logger.info('✅ Sync engine stopped');
            
        } catch (error) {
            logger.error('Error stopping sync engine:', error);
            throw error;
        }
    }

    // Get sync status
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastSyncTime: this.lastSyncTime ? this.lastSyncTime.toISOString() : null,
            nextSyncTime: this.nextSyncTime ? this.nextSyncTime.toISOString() : null,
            syncInterval: parseInt(process.env.SYNC_INTERVAL) || 30000,
            totalSyncs: this.syncLog.length,
            conflicts: this.conflicts.length
        };
    }

    // Get sync history
    getHistory(limit = 50) {
        return this.syncLog.slice(-limit);
    }

    // Get conflicts
    getConflicts() {
        return this.conflicts;
    }

    // Resolve conflict
    resolveConflict(conflictId, resolution) {
        const conflictIndex = this.conflicts.findIndex(c => c.id === conflictId);
        
        if (conflictIndex !== -1) {
            this.conflicts[conflictIndex].resolution = resolution;
            this.conflicts[conflictIndex].resolvedAt = new Date();
            
            logger.info(`Conflict ${conflictId} resolved with: ${resolution}`);
            
            return true;
        }
        
        return false;
    }

    // Add sync log entry
    addLogEntry(entry) {
        this.syncLog.push({
            ...entry,
            timestamp: entry.timestamp || new Date().toISOString()
        });
        
        // Keep only last 100 entries
        if (this.syncLog.length > 100) {
            this.syncLog = this.syncLog.slice(-100);
        }
    }

    // Clear sync log
    clearLog() {
        this.syncLog = [];
        logger.info('Sync log cleared');
    }

    // Test connection to desktop app
    async testDesktopConnection() {
        try {
            const nedbHost = process.env.NEDB_HOST || 'localhost';
            const nedbPort = parseInt(process.env.NEDB_PORT) || 49499;
            
            // In a real implementation, you would make an HTTP request to test connectivity
            // For now, we'll simulate a successful connection
            logger.info(`Testing connection to desktop app at ${nedbHost}:${nedbPort}`);
            
            // Simulate connection test
            return {
                connected: true,
                host: nedbHost,
                port: nedbPort,
                message: 'Desktop app connection test successful (simulated)'
            };
            
        } catch (error) {
            logger.error('Desktop app connection test failed:', error);
            
            return {
                connected: false,
                error: error.message,
                message: 'Failed to connect to desktop application'
            };
        }
    }

    // Get sync statistics
    getStatistics() {
        const now = new Date();
        const last24Hours = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        
        const recentSyncs = this.syncLog.filter(log => 
            new Date(log.timestamp) > last24Hours
        );
        
        const successfulSyncs = recentSyncs.filter(log => log.status === 'success').length;
        const failedSyncs = recentSyncs.filter(log => log.status === 'error').length;
        
        const avgDuration = recentSyncs.length > 0 
            ? recentSyncs.reduce((sum, log) => sum + (log.duration || 0), 0) / recentSyncs.length
            : 0;
        
        return {
            period: '24 hours',
            totalSyncs: recentSyncs.length,
            successfulSyncs,
            failedSyncs,
            successRate: recentSyncs.length > 0 ? (successfulSyncs / recentSyncs.length * 100).toFixed(2) : 0,
            averageDuration: Math.round(avgDuration),
            conflicts: this.conflicts.length,
            lastSync: this.lastSyncTime ? this.lastSyncTime.toISOString() : null
        };
    }
}

// Create and export sync engine instance
const syncEngine = new SyncEngine();

module.exports = syncEngine;
