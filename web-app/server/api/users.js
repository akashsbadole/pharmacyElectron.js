// Users API Module for PharmaMine Web Application

const express = require('express');
const { Pool } = require('pg');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateRegistration } = require('../middleware/validation');
const config = require('../config/database');

const router = express.Router();
const pool = new Pool(config);

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email, created_at, updated_at FROM users ORDER BY created_at DESC'
        );

        res.json({
            success: true,
            data: {
                users: result.rows
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email, created_at, updated_at FROM users WHERE id = $1',
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update user profile
router.put('/me', authenticateToken, validateRegistration, async (req, res) => {
    try {
        const { username, email } = req.body;

        // Check if username or email is already taken by another user
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
            [username, email, req.userId]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Update user
        const result = await pool.query(
            'UPDATE users SET username = $1, email = $2, updated_at = NOW() WHERE id = $3 RETURNING id, username, email, created_at, updated_at',
            [username, email, req.userId]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Delete user account (soft delete by updating username to indicate deletion)
router.delete('/me', authenticateToken, async (req, res) => {
    try {
        // In a real application, you might want to implement soft delete
        // For now, we'll just return a success message without actually deleting
        // This is for security and data integrity reasons
        
        res.json({
            success: true,
            message: 'Account deletion request received. Please contact administrator for account removal.'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get user statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
        const recentUsers = await pool.query(
            'SELECT username, email, created_at FROM users ORDER BY created_at DESC LIMIT 10'
        );

        res.json({
            success: true,
            data: {
                totalUsers: parseInt(userCount.rows[0].count),
                recentUsers: recentUsers.rows
            }
        });

    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
