// Inventory API Module for PharmaMine Web Application

const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
const { validateProduct } = require('../middleware/validation');
const config = require('../config/database');

const router = express.Router();
const pool = new Pool(config);

// Get all products
router.get('/products', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.created_at DESC
        `);

        res.json({
            success: true,
            data: {
                products: result.rows
            }
        });

    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get product by ID
router.get('/products/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: {
                product: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Create product
router.post('/products', authenticateToken, validateProduct, async (req, res) => {
    try {
        const { name, barcode, price, quantity, category_id, min_stock, description, img } = req.body;

        // Check if barcode already exists
        if (barcode) {
            const existingProduct = await pool.query(
                'SELECT id FROM products WHERE barcode = $1',
                [barcode]
            );

            if (existingProduct.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Product with this barcode already exists'
                });
            }
        }

        const result = await pool.query(`
            INSERT INTO products (name, barcode, price, quantity, category_id, min_stock, description, img, created_at, updated_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) 
            RETURNING id, name, barcode, price, quantity, category_id, min_stock, description, img, created_at, updated_at
        `, [name, barcode, price, quantity, category_id, min_stock || 0, description, img]);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: {
                product: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update product
router.put('/products/:id', authenticateToken, validateProduct, async (req, res) => {
    try {
        const { name, barcode, price, quantity, category_id, min_stock, description, img } = req.body;

        // Check if barcode already exists for another product
        if (barcode) {
            const existingProduct = await pool.query(
                'SELECT id FROM products WHERE barcode = $1 AND id != $2',
                [barcode, req.params.id]
            );

            if (existingProduct.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Product with this barcode already exists'
                });
            }
        }

        const result = await pool.query(`
            UPDATE products 
            SET name = $1, barcode = $2, price = $3, quantity = $4, category_id = $5, min_stock = $6, 
                description = $7, img = $8, updated_at = NOW() 
            WHERE id = $9 
            RETURNING id, name, barcode, price, quantity, category_id, min_stock, description, img, created_at, updated_at
        `, [name, barcode, price, quantity, category_id, min_stock, description, img, req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product updated successfully',
            data: {
                product: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Delete product
router.delete('/products/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM products WHERE id = $1 RETURNING id',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Search products
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { q, category, low_stock, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

        if (q) {
            query += ` AND (p.name ILIKE $${paramIndex} OR p.barcode ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
            params.push(`%${q}%`);
            paramIndex++;
        }

        if (category) {
            query += ` AND p.category_id = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        if (low_stock === 'true') {
            query += ` AND p.quantity <= p.min_stock AND p.quantity > 0`;
        } else if (low_stock === 'out') {
            query += ` AND p.quantity = 0`;
        }

        query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: {
                products: result.rows
            }
        });

    } catch (error) {
        console.error('Search products error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get all categories
router.get('/categories', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, description, created_at FROM categories ORDER BY name'
        );

        res.json({
            success: true,
            data: {
                categories: result.rows
            }
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Create category
router.post('/categories', authenticateToken, async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        const result = await pool.query(
            'INSERT INTO categories (name, description, created_at) VALUES ($1, $2, NOW()) RETURNING id, name, description, created_at',
            [name, description]
        );

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: {
                category: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update inventory quantity
router.put('/products/:id/quantity', authenticateToken, async (req, res) => {
    try {
        const { quantity, operation } = req.body; // operation: 'add', 'subtract', 'set'

        if (!quantity || !operation) {
            return res.status(400).json({
                success: false,
                message: 'Quantity and operation are required'
            });
        }

        let newQuantity;
        const currentProduct = await pool.query(
            'SELECT quantity FROM products WHERE id = $1',
            [req.params.id]
        );

        if (currentProduct.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const currentQuantity = currentProduct.rows[0].quantity;

        switch (operation) {
            case 'add':
                newQuantity = currentQuantity + parseInt(quantity);
                break;
            case 'subtract':
                newQuantity = currentQuantity - parseInt(quantity);
                if (newQuantity < 0) newQuantity = 0;
                break;
            case 'set':
                newQuantity = parseInt(quantity);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid operation. Use: add, subtract, or set'
                });
        }

        const result = await pool.query(
            'UPDATE products SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, quantity, min_stock',
            [newQuantity, req.params.id]
        );

        res.json({
            success: true,
            message: 'Inventory updated successfully',
            data: {
                product: result.rows[0]
            }
        });

    } catch (error) {
        console.error('Update inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
