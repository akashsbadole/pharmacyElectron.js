// Customers API Module for PharmaMine Web Application

const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
const { validateCustomer } = require('../middleware/validation');
const config = require('../config/database');

const router = express.Router();
const pool = new Pool(config);

// Get all customers
router.get('/all', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, phone, address, loyalty_tier, loyalty_points, total_orders, total_spent, average_order_value, last_purchase, created_at FROM customers ORDER BY created_at DESC'
        );

        res.json({
            success: true,
            data: {
                customers: result.rows
            }
        });

    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get customer by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, phone, address, loyalty_tier, loyalty_points, total_orders, total_spent, average_order_value, last_purchase, created_at FROM customers WHERE id = $1',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.json({
            success: true,
            data: {
                customer: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Create customer
router.post('/customer', authenticateToken, validateCustomer, async (req, res) => {
    try {
        const { name, email, phone, address, loyalty_tier, loyalty_points } = req.body;

        // Check if email already exists
        if (email) {
            const existingCustomer = await pool.query(
                'SELECT id FROM customers WHERE email = $1',
                [email]
            );

            if (existingCustomer.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Customer with this email already exists'
                });
            }
        }

        const result = await pool.query(
            'INSERT INTO customers (name, email, phone, address, loyalty_tier, loyalty_points, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, name, email, phone, address, loyalty_tier, loyalty_points, total_orders, total_spent, average_order_value, last_purchase, created_at',
            [name, email, phone, address, loyalty_tier || 'bronze', loyalty_points || 0]
        );

        res.status(201).json({
            success: true,
            message: 'Customer created successfully',
            data: {
                customer: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Create customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update customer
router.put('/customer/:id', authenticateToken, validateCustomer, async (req, res) => {
    try {
        const { name, email, phone, address, loyalty_tier, loyalty_points } = req.body;

        // Check if email already exists for another customer
        if (email) {
            const existingCustomer = await pool.query(
                'SELECT id FROM customers WHERE email = $1 AND id != $2',
                [email, req.params.id]
            );

            if (existingCustomer.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Customer with this email already exists'
                });
            }
        }

        const result = await pool.query(
            'UPDATE customers SET name = $1, email = $2, phone = $3, address = $4, loyalty_tier = $5, loyalty_points = $6, updated_at = NOW() WHERE id = $7 RETURNING id, name, email, phone, address, loyalty_tier, loyalty_points, total_orders, total_spent, average_order_value, last_purchase, created_at',
            [name, email, phone, address, loyalty_tier, loyalty_points, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.json({
            success: true,
            message: 'Customer updated successfully',
            data: {
                customer: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Delete customer
router.delete('/customer/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM customers WHERE id = $1 RETURNING id',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.json({
            success: true,
            message: 'Customer deleted successfully'
        });

    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Search customers
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { q, tier, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT id, name, email, phone, address, loyalty_tier, loyalty_points, 
                   total_orders, total_spent, average_order_value, last_purchase, created_at 
            FROM customers 
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (q) {
            query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`;
            params.push(`%${q}%`);
            paramIndex++;
        }

        if (tier) {
            query += ` AND loyalty_tier = $${paramIndex}`;
            params.push(tier);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: {
                customers: result.rows
            }
        });

    } catch (error) {
        console.error('Search customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
