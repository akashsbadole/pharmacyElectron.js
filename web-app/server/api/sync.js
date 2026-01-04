// Sync API Module for PharmaMine Web Application

const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
const config = require('../config/database');
const syncEngine = require('../sync/sync-engine');

const router = express.Router();
const pool = new Pool(config);

// Get sync status
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const status = syncEngine.getStatus();
        
        res.json({
            success: true,
            data: {
                syncStatus: status,
                configuration: {
                    syncInterval: process.env.SYNC_INTERVAL || 30000,
                    maxRetries: process.env.MAX_RETRIES || 3,
                    conflictResolution: process.env.CONFLICT_STRATEGY || 'timestamp'
                }
            }
        });

    } catch (error) {
        console.error('Get sync status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get sync status'
        });
    }
});

// Trigger manual sync
router.post('/trigger', authenticateToken, async (req, res) => {
    try {
        const status = await syncEngine.triggerSync();
        
        res.json({
            success: true,
            message: 'Sync triggered successfully',
            data: {
                syncStatus: status
            }
        });

    } catch (error) {
        console.error('Trigger sync error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger sync',
            error: error.message
        });
    }
});

// Get sync logs
router.get('/logs', authenticateToken, async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        
        const result = await pool.query(`
            SELECT id, table_name, record_id, operation, data, timestamp, source, synced, error_message
            FROM sync_log 
            ORDER BY timestamp DESC 
            LIMIT $1 OFFSET $2
        `, [parseInt(limit), parseInt(offset)]);

        res.json({
            success: true,
            data: {
                logs: result.rows
            }
        });

    } catch (error) {
        console.error('Get sync logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get sync logs'
        });
    }
});

// Get conflicts
router.get('/conflicts', authenticateToken, async (req, res) => {
    try {
        // Get unresolved conflicts from sync status
        const conflicts = syncEngine.getStatus().conflicts;
        
        res.json({
            success: true,
            data: {
                conflicts: conflicts
            }
        });

    } catch (error) {
        console.error('Get conflicts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get conflicts'
        });
    }
});

// Resolve conflict manually
router.post('/resolve-conflict', authenticateToken, async (req, res) => {
    try {
        const { conflictId, resolution } = req.body;
        
        // This would need to be implemented based on your conflict resolution strategy
        // For now, we'll return a placeholder response
        
        res.json({
            success: true,
            message: 'Conflict resolution not yet implemented in this version'
        });

    } catch (error) {
        console.error('Resolve conflict error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resolve conflict'
        });
    }
});

// Test NeDB connection
router.get('/test-nedb', authenticateToken, async (req, res) => {
    try {
        const axios = require('axios');
        const { nedbConfig } = require('../config/sync');
        
        // Test connection to NeDB API
        try {
            const response = await axios.get(`http://${nedbConfig.host}:${nedbConfig.port}/api/health`, {
                timeout: 5000
            });
            
            res.json({
                success: true,
                message: 'NeDB connection successful',
                data: {
                    status: 'connected',
                    host: nedbConfig.host,
                    port: nedbConfig.port,
                    response: response.data
                }
            });
            
        } catch (apiError) {
            res.json({
                success: false,
                message: 'NeDB API not accessible',
                data: {
                    status: 'disconnected',
                    host: nedbConfig.host,
                    port: nedbConfig.port,
                    error: apiError.message
                }
            });
        }

    } catch (error) {
        console.error('Test NeDB connection error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test NeDB connection'
        });
    }
});

// Get sync statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const stats = syncEngine.getStatus().stats;
        const performance = syncEngine.getStatus().performance;
        
        res.json({
            success: true,
            data: {
                statistics: stats,
                performance: performance
            }
        });

    } catch (error) {
        console.error('Get sync stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get sync statistics'
        });
    }
});

// Sync configuration endpoint
router.get('/config', authenticateToken, async (req, res) => {
    try {
        const { syncConfig, nedbConfig, postgresConfig } = require('../config/sync');
        
        res.json({
            success: true,
            data: {
                syncConfig: {
                    syncInterval: syncConfig.syncInterval,
                    maxRetries: syncConfig.maxRetries,
                    conflictResolution: syncConfig.conflictResolution,
                    tables: syncConfig.tables
                },
                nedbConfig: {
                    host: nedbConfig.host,
                    port: nedbConfig.port,
                    path: nedbConfig.path,
                    collections: nedbConfig.collections
                },
                postgresConfig: {
                    host: postgresConfig.host,
                    port: postgresConfig.port,
                    database: postgresConfig.database,
                    user: postgresConfig.user
                    // Note: Don't expose password in response
                }
            }
        });

    } catch (error) {
        console.error('Get sync config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get sync configuration'
        });
    }
});

// Sync troubleshooting endpoint
router.get('/troubleshoot', authenticateToken, async (req, res) => {
    try {
        const { nedbConfig } = require('../config/sync');
        const axios = require('axios');
        
        const troubleshooting = {
            nedbApiAccessible: false,
            nedbApiError: null,
            syncEngineRunning: syncEngine.isRunning,
            lastSyncTime: syncEngine.lastSyncTime,
            nedbConfig: {
                host: nedbConfig.host,
                port: nedbConfig.port,
                path: nedbConfig.path
            }
        };
        
        // Test NeDB API accessibility
        try {
            const response = await axios.get(`http://${nedbConfig.host}:${nedbConfig.port}/api/health`, {
                timeout: 3000
            });
            troubleshooting.nedbApiAccessible = true;
        } catch (apiError) {
            troubleshooting.nedbApiError = apiError.message;
        }
        
        // Provide troubleshooting recommendations
        const recommendations = [];
        
        if (!troubleshooting.nedbApiAccessible) {
            recommendations.push({
                type: 'warning',
                message: 'NeDB API is not accessible. Please ensure:',
                details: [
                    'The desktop PharmaMine application is running',
                    'The desktop application is configured to expose sync API',
                    'The desktop application is accessible at the configured host and port',
                    'Firewall is not blocking the connection'
                ]
            });
        }
        
        if (!troubleshooting.syncEngineRunning) {
            recommendations.push({
                type: 'info',
                message: 'Sync engine is not running. This is normal if no sync is currently in progress.',
                details: ['The sync engine will start automatically when needed']
            });
        }
        
        res.json({
            success: true,
            data: {
                troubleshooting: troubleshooting,
                recommendations: recommendations
            }
        });

    } catch (error) {
        console.error('Sync troubleshooting error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform sync troubleshooting'
        });
    }
});

module.exports = router;
