// Transactions API Module for PharmaMine Web Application

const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
const { validateTransaction } = require('../middleware/validation');
const config = require('../config/database');

const router = express.Router();
const pool = new Pool(config);

// Get all transactions
router.get('/all', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.*, c.name as customer_name 
            FROM transactions t 
            LEFT JOIN customers c ON t.customer_id = c.id 
            ORDER BY t.created_at DESC
        `);

        res.json({
            success: true,
            data: {
                transactions: result.rows
            }
        });

    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get transaction by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.*, c.name as customer_name 
            FROM transactions t 
            LEFT JOIN customers c ON t.customer_id = c.id 
            WHERE t.id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        res.json({
            success: true,
            data: {
                transaction: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Create transaction
router.post('/new', authenticateToken, validateTransaction, async (req, res) => {
    try {
        const { order_number, customer_id, items, subtotal, discount, tax, total, payment_type, payment_amount, change } = req.body;

        // Check if order number already exists
        const existingOrder = await pool.query(
            'SELECT id FROM transactions WHERE order_number = $1',
            [order_number]
        );

        if (existingOrder.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Order number already exists'
            });
        }

        // Update customer stats if customer_id is provided
        if (customer_id) {
            await pool.query(`
                UPDATE customers 
                SET total_orders = total_orders + 1, 
                    total_spent = total_spent + $1, 
                    average_order_value = (total_spent + $1) / (total_orders + 1), 
                    last_purchase = NOW(), 
                    updated_at = NOW() 
                WHERE id = $2
            `, [total, customer_id]);
        }

        const result = await pool.query(`
            INSERT INTO transactions 
            (order_number, customer_id, items, subtotal, discount, tax, total, payment_type, payment_amount, change, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) 
            RETURNING id, order_number, customer_id, items, subtotal, discount, tax, total, payment_type, payment_amount, change, created_at
        `, [order_number, customer_id, JSON.stringify(items), subtotal, discount, tax, total, payment_type, payment_amount, change]);

        res.status(201).json({
            success: true,
            message: 'Transaction created successfully',
            data: {
                transaction: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update transaction
router.put('/:id', authenticateToken, validateTransaction, async (req, res) => {
    try {
        const { order_number, customer_id, items, subtotal, discount, tax, total, payment_type, payment_amount, change } = req.body;

        // Check if order number already exists for another transaction
        const existingOrder = await pool.query(
            'SELECT id FROM transactions WHERE order_number = $1 AND id != $2',
            [order_number, req.params.id]
        );

        if (existingOrder.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Order number already exists'
            });
        }

        const result = await pool.query(`
            UPDATE transactions 
            SET order_number = $1, customer_id = $2, items = $3, subtotal = $4, discount = $5, tax = $6, total = $7, 
                payment_type = $8, payment_amount = $9, change = $10, created_at = NOW() 
            WHERE id = $11 
            RETURNING id, order_number, customer_id, items, subtotal, discount, tax, total, payment_type, payment_amount, change, created_at
        `, [order_number, customer_id, JSON.stringify(items), subtotal, discount, tax, total, payment_type, payment_amount, change, req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        res.json({
            success: true,
            message: 'Transaction updated successfully',
            data: {
                transaction: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Delete transaction
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM transactions WHERE id = $1 RETURNING id',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        res.json({
            success: true,
            message: 'Transaction deleted successfully'
        });

    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get transactions by date range
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date, customer_id, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT t.*, c.name as customer_name 
            FROM transactions t 
            LEFT JOIN customers c ON t.customer_id = c.id 
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (start_date) {
            query += ` AND t.created_at >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            query += ` AND t.created_at <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }

        if (customer_id) {
            query += ` AND t.customer_id = $${paramIndex}`;
            params.push(customer_id);
            paramIndex++;
        }

        query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: {
                transactions: result.rows
            }
        });

    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get transaction statistics
router.get('/stats/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_transactions,
                SUM(total) as total_revenue,
                AVG(total) as average_transaction_value,
                COUNT(DISTINCT customer_id) as unique_customers
            FROM transactions 
            WHERE customer_id = $1
        `, [req.params.id]);

        res.json({
            success: true,
            data: {
                stats: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Get transaction stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
