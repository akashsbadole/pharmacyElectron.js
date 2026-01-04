// Settings API Module for PharmaMine Web Application

const express = require('express');
const { Pool } = require('pg');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const config = require('../config/database');

const router = express.Router();
const pool = new Pool(config);

// Get all settings
router.get('/get', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT key, value, type, description, created_at, updated_at FROM settings ORDER BY key'
        );

        // Convert settings to object format
        const settings = {};
        result.rows.forEach(row => {
            let value = row.value;
            
            // Convert based on type
            if (row.type === 'number') {
                value = parseFloat(value);
            } else if (row.type === 'boolean') {
                value = value === 'true';
            } else if (row.type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    value = null;
                }
            }

            settings[row.key] = value;
        });

        res.json({
            success: true,
            data: {
                settings: settings
            }
        });

    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get specific setting
router.get('/:key', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT key, value, type, description, created_at, updated_at FROM settings WHERE key = $1',
            [req.params.key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        const row = result.rows[0];
        let value = row.value;

        // Convert based on type
        if (row.type === 'number') {
            value = parseFloat(value);
        } else if (row.type === 'boolean') {
            value = value === 'true';
        } else if (row.type === 'json') {
            try {
                value = JSON.parse(value);
            } catch (e) {
                value = null;
            }
        }

        res.json({
            success: true,
            data: {
                setting: {
                    key: row.key,
                    value: value,
                    type: row.type,
                    description: row.description,
                    created_at: row.created_at,
                    updated_at: row.updated_at
                }
            }
        });

    } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update setting
router.post('/update', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { key, value, type, description } = req.body;

        if (!key) {
            return res.status(400).json({
                success: false,
                message: 'Setting key is required'
            });
        }

        // Convert value to string based on type
        let stringValue = value;
        if (type === 'json') {
            stringValue = JSON.stringify(value);
        } else {
            stringValue = String(value);
        }

        const result = await pool.query(`
            INSERT INTO settings (key, value, type, description, updated_at) 
            VALUES ($1, $2, $3, $4, NOW()) 
            ON CONFLICT (key) 
            DO UPDATE SET value = $2, type = $3, description = $4, updated_at = NOW() 
            RETURNING key, value, type, description, created_at, updated_at
        `, [key, stringValue, type || 'string', description || null]);

        const row = result.rows[0];
        let convertedValue = row.value;

        // Convert back based on type
        if (row.type === 'number') {
            convertedValue = parseFloat(convertedValue);
        } else if (row.type === 'boolean') {
            convertedValue = convertedValue === 'true';
        } else if (row.type === 'json') {
            try {
                convertedValue = JSON.parse(convertedValue);
            } catch (e) {
                convertedValue = null;
            }
        }

        res.json({
            success: true,
            message: 'Setting updated successfully',
            data: {
                setting: {
                    key: row.key,
                    value: convertedValue,
                    type: row.type,
                    description: row.description,
                    created_at: row.created_at,
                    updated_at: row.updated_at
                }
            }
        });

    } catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Create default settings
router.post('/defaults', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const defaultSettings = [
            { key: 'app_name', value: 'PharmaMine Web', type: 'string', description: 'Application name' },
            { key: 'app_version', value: '1.0.0', type: 'string', description: 'Application version' },
            { key: 'currency', value: 'USD', type: 'string', description: 'Default currency' },
            { key: 'tax_rate', value: '0.08', type: 'number', description: 'Default tax rate' },
            { key: 'discount_enabled', value: 'true', type: 'boolean', description: 'Enable discount functionality' },
            { key: 'loyalty_enabled', value: 'true', type: 'boolean', description: 'Enable loyalty program' },
            { key: 'inventory_alerts', value: 'true', type: 'boolean', description: 'Enable low stock alerts' },
            { key: 'backup_enabled', value: 'true', type: 'boolean', description: 'Enable automatic backups' },
            { key: 'sync_enabled', value: 'true', type: 'boolean', description: 'Enable data synchronization' },
            { key: 'theme', value: 'light', type: 'string', description: 'Default theme' }
        ];

        for (const setting of defaultSettings) {
            await pool.query(`
                INSERT INTO settings (key, value, type, description, created_at, updated_at) 
                VALUES ($1, $2, $3, $4, NOW(), NOW()) 
                ON CONFLICT (key) DO NOTHING
            `, [setting.key, setting.value, setting.type, setting.description]);
        }

        res.json({
            success: true,
            message: 'Default settings created successfully'
        });

    } catch (error) {
        console.error('Create default settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Delete setting
router.delete('/:key', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM settings WHERE key = $1 RETURNING key',
            [req.params.key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        res.json({
            success: true,
            message: 'Setting deleted successfully'
        });

    } catch (error) {
        console.error('Delete setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get settings by type
router.get('/type/:type', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT key, value, type, description, created_at, updated_at FROM settings WHERE type = $1 ORDER BY key',
            [req.params.type]
        );

        const settings = {};
        result.rows.forEach(row => {
            let value = row.value;
            
            // Convert based on type
            if (row.type === 'number') {
                value = parseFloat(value);
            } else if (row.type === 'boolean') {
                value = value === 'true';
            } else if (row.type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    value = null;
                }
            }

            settings[row.key] = value;
        });

        res.json({
            success: true,
            data: {
                settings: settings,
                type: req.params.type
            }
        });

    } catch (error) {
        console.error('Get settings by type error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
