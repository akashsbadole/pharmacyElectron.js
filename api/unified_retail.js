const express = require("express")();
const bodyParser = require("body-parser");
const path = require("path");
const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

module.exports = app;

/**
 * UNIFIED RETAIL API - Consolidates multiple retail functions into a single service
 * 
 * This module combines:
 * - Inventory Management
 * - Customer Management  
 * - Loyalty Program
 * - Promotions & Discounts
 * - Gift Store Operations
 * - Analytics & Reporting
 */

class UnifiedRetailService {
    constructor() {
        this.initializeDatabases();
        this.setupRoutes();
    }

    initializeDatabases() {
        const dbPath = path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases");
        
        // Core unified database (replaces multiple separate databases)
        this.unifiedDB = getDatabase(path.join(dbPath, "unified_retail.db"));
        
        // Indexes for performance
        this.unifiedDB.ensureIndex({ fieldName: "type", unique: false });
        this.unifiedDB.ensureIndex({ fieldName: "category", unique: false });
        this.unifiedDB.ensureIndex({ fieldName: "barcode", unique: true });
        this.unifiedDB.ensureIndex({ fieldName: "customer_id", unique: false });
        this.unifiedDB.ensureIndex({ fieldName: "date", unique: false });
    }

    setupRoutes() {
        // Product Management (Unified)
        app.get("/products", this.getProducts.bind(this));
        app.post("/products", this.createProduct.bind(this));
        app.put("/products/:id", this.updateProduct.bind(this));
        app.delete("/products/:id", this.deleteProduct.bind(this));
        app.get("/products/variants/:productId", this.getProductVariants.bind(this));
        app.post("/products/variants", this.createVariant.bind(this));
        
        // Customer Management (Unified)
        app.get("/customers", this.getCustomers.bind(this));
        app.post("/customers", this.createCustomer.bind(this));
        app.put("/customers/:id", this.updateCustomer.bind(this));
        app.get("/customers/:id/loyalty", this.getCustomerLoyalty.bind(this));
        app.post("/customers/:id/loyalty/points", this.calculateLoyaltyPoints.bind(this));
        
        // Promotion & Discount Management
        app.get("/promotions/active", this.getActivePromotions.bind(this));
        app.post("/promotions/validate", this.validatePromotion.bind(this));
        app.post("/promotions/apply", this.applyPromotion.bind(this));
        
        // Gift Store Operations
        app.post("/gifts/wrap", this.processGiftWrap.bind(this));
        app.post("/gifts/cards/redeem", this.redeemGiftCard.bind(this));
        app.post("/bundles/create", this.createBundle.bind(this));
        app.get("/bundles", this.getBundles.bind(this));
        
        // Unified Checkout
        app.post("/checkout/process", this.processCheckout.bind(this));
        app.post("/checkout/validate", this.validateCheckout.bind(this));
        
        // Analytics & Reporting
        app.get("/analytics/dashboard", this.getDashboardMetrics.bind(this));
        app.get("/analytics/sales", this.getSalesAnalytics.bind(this));
        app.get("/analytics/inventory", this.getInventoryAnalytics.bind(this));
        
        // Bulk Operations
        app.post("/bulk/inventory-update", this.bulkUpdateInventory.bind(this));
        app.post("/bulk/customer-import", this.bulkImportCustomers.bind(this));
    }

    // PRODUCT MANAGEMENT
    async getProducts(req, res) {
        try {
            const { category, search, limit = 50, page = 1 } = req.query;
            let query = {};
            
            if (category) query.category = category;
            if (search) {
                query.$or = [
                    { name: new RegExp(search, 'i') },
                    { barcode: new RegExp(search, 'i') }
                ];
            }

            const products = await this.findWithPagination('product', query, parseInt(limit), parseInt(page));
            res.json({ success: true, data: products });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async createProduct(req, res) {
        try {
            const product = {
                _id: Date.now(),
                type: 'product',
                name: req.body.name,
                barcode: req.body.barcode,
                price: req.body.price,
                cost: req.body.cost || req.body.price,
                category: req.body.category,
                sub_category: req.body.sub_category || null,
                product_type: req.body.product_type || 'garment', // garment, gift, accessory
                
                // Garment-specific fields
                variants: {
                    sizes: req.body.sizes || [],
                    colors: req.body.colors || [],
                    styles: req.body.styles || [],
                    materials: req.body.materials || []
                },
                
                // Inventory management
                stock: {
                    total: parseInt(req.body.quantity) || 0,
                    variants: req.body.variant_stock || {},
                    min_stock: parseInt(req.body.min_stock) || 5,
                    reorder_point: parseInt(req.body.reorder_point) || 10
                },
                
                // Gift store fields
                gift_eligible: req.body.gift_eligible || false,
                gift_wrapping: req.body.gift_wrapping || { available: false, cost: 0 },
                
                // Retail analytics
                analytics: {
                    views: 0,
                    sales: 0,
                    return_rate: 0,
                    rating: 0
                },
                
                // Metadata
                created_date: new Date().toISOString(),
                status: 'active'
            };

            await this.unifiedDB.insert(product);
            res.json({ success: true, data: product });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // CUSTOMER MANAGEMENT
    async getCustomers(req, res) {
        try {
            const { search, tier, limit = 50, page = 1 } = req.query;
            let query = { type: 'customer' };
            
            if (search) {
                query.$or = [
                    { name: new RegExp(search, 'i') },
                    { email: new RegExp(search, 'i') },
                    { phone: new RegExp(search, 'i') }
                ];
            }
            
            if (tier) {
                query['loyalty.tier'] = tier;
            }

            const customers = await this.findWithPagination('customer', query, parseInt(limit), parseInt(page));
            res.json({ success: true, data: customers });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async createCustomer(req, res) {
        try {
            const customer = {
                _id: Date.now(),
                type: 'customer',
                customer_id: `CUST${Date.now()}`,
                name: req.body.name,
                email: req.body.email || null,
                phone: req.body.phone || null,
                address: req.body.address || null,
                
                // Loyalty program data
                loyalty: {
                    tier: 'bronze',
                    points: 0,
                    lifetime_points: 0,
                    join_date: new Date().toISOString(),
                    benefits: []
                },
                
                // Shopping preferences
                preferences: {
                    sizes: req.body.preferred_sizes || {},
                    colors: req.body.preferred_colors || [],
                    styles: req.body.style_preferences || [],
                    brands: req.body.brand_preferences || []
                },
                
                // Purchase history summary
                purchase_history: {
                    total_orders: 0,
                    total_spent: 0,
                    average_order_value: 0,
                    last_purchase: null
                },
                
                created_date: new Date().toISOString(),
                status: 'active'
            };

            await this.unifiedDB.insert(customer);
            res.json({ success: true, data: customer });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getCustomerLoyalty(req, res) {
        try {
            const customer = await this.findById('customer', req.params.id);
            if (!customer) {
                return res.status(404).json({ success: false, error: 'Customer not found' });
            }

            const loyaltyData = {
                customer_id: customer.customer_id,
                tier: customer.loyalty.tier,
                points: customer.loyalty.points,
                lifetime_points: customer.loyalty.lifetime_points,
                benefits: customer.loyalty.benefits,
                next_tier: this.getNextTier(customer.loyalty.tier, customer.loyalty.points)
            };

            res.json({ success: true, data: loyaltyData });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // PROMOTION MANAGEMENT
    async getActivePromotions(req, res) {
        try {
            const now = new Date();
            const query = {
                type: 'promotion',
                'timing.start_date': { $lte: now },
                'timing.end_date': { $gte: now },
                status: 'active'
            };

            const promotions = await this.unifiedDB.find(query);
            res.json({ success: true, data: promotions });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async validatePromotion(req, res) {
        try {
            const { promotion_code, customer_id, order_value, items } = req.body;
            
            const promotion = await this.unifiedDB.findOne({
                type: 'promotion',
                'promotion_code': promotion_code
            });

            if (!promotion) {
                return res.json({ 
                    success: true, 
                    data: { valid: false, error: 'Invalid promotion code' }
                });
            }

            // Check validity, customer eligibility, etc.
            const validation = this.validatePromotionRules(promotion, customer_id, order_value, items);
            
            res.json({ success: true, data: validation });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // GIFT STORE OPERATIONS
    async processGiftWrap(req, res) {
        try {
            const { items, wrapping_style, gift_message, recipient_name } = req.body;
            
            const wrappingCost = this.calculateWrappingCost(wrapping_style, items.length);
            const giftReceipt = {
                _id: Date.now(),
                type: 'gift_receipt',
                items: items,
                wrapping: {
                    style: wrapping_style,
                    cost: wrappingCost
                },
                message: gift_message,
                recipient: recipient_name,
                created_date: new Date().toISOString()
            };

            await this.unifiedDB.insert(giftReceipt);
            res.json({ success: true, data: giftReceipt });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // UNIFIED CHECKOUT
    async processCheckout(req, res) {
        try {
            const { customer_id, items, promotion_code, payment_method, gift_options } = req.body;
            
            // Calculate totals
            const subtotal = this.calculateSubtotal(items);
            const discount = await this.calculateDiscount(items, promotion_code, customer_id);
            const gift_wrap_cost = gift_options ? this.calculateWrappingCost(gift_options.style, items.length) : 0;
            const tax = this.calculateTax(subtotal - discount + gift_wrap_cost);
            const total = subtotal - discount + gift_wrap_cost + tax;

            // Create transaction
            const transaction = {
                _id: Date.now(),
                type: 'transaction',
                customer_id: customer_id,
                items: items,
                pricing: {
                    subtotal: subtotal,
                    discount: discount,
                    gift_wrap: gift_wrap_cost,
                    tax: tax,
                    total: total
                },
                payment: {
                    method: payment_method,
                    amount: total,
                    status: 'completed'
                },
                promotion_applied: promotion_code || null,
                gift_options: gift_options || null,
                created_date: new Date().toISOString()
            };

            // Update inventory
            await this.updateInventoryForSale(items);
            
            // Update customer loyalty
            if (customer_id) {
                await this.updateCustomerLoyalty(customer_id, total);
            }

            await this.unifiedDB.insert(transaction);
            res.json({ success: true, data: transaction });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // ANALYTICS & DASHBOARD
    async getDashboardMetrics(req, res) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Get today's sales
            const todayTransactions = await this.unifiedDB.find({
                type: 'transaction',
                'created_date': { $gte: `${today}T00:00:00Z` }
            });

            const todaySales = todayTransactions.reduce((sum, t) => sum + t.pricing.total, 0);
            const transactionCount = todayTransactions.length;

            // Get low stock alerts
            const lowStockProducts = await this.unifiedDB.find({
                type: 'product',
                'stock.total': { $lt: '$stock.min_stock' }
            });

            // Get top selling products
            const topProducts = await this.getTopSellingProducts(5);

            // Get customer metrics
            const totalCustomers = await this.unifiedDB.count({ type: 'customer' });

            const metrics = {
                today_sales: todaySales,
                transaction_count: transactionCount,
                low_stock_alerts: lowStockProducts.length,
                total_customers: totalCustomers,
                top_products: topProducts,
                sales_change: 0, // Calculate from previous day
                transaction_change: 0
            };

            res.json({ success: true, data: metrics });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // BULK OPERATIONS
    async bulkUpdateInventory(req, res) {
        try {
            const { updates } = req.body;
            const operations = updates.map(update => ({
                updateOne: {
                    filter: { _id: update.product_id, type: 'product' },
                    update: { $inc: { 'stock.total': update.quantity_change } }
                }
            }));

            // Execute bulk operations
            const result = await this.unifiedDB.bulkWrite(operations);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // HELPER METHODS
    async findById(type, id) {
        return new Promise((resolve, reject) => {
            this.unifiedDB.findOne({ type, _id: parseInt(id) }, (err, doc) => {
                if (err) reject(err);
                else resolve(doc);
            });
        });
    }

    async findWithPagination(type, query, limit, page) {
        return new Promise((resolve, reject) => {
            this.skip = (page - 1) * limit;
            this.unifiedDB.find(query)
                .skip(this.skip)
                .limit(limit)
                .exec((err, docs) => {
                    if (err) reject(err);
                    else resolve(docs);
                });
        });
    }

    calculateSubtotal(items) {
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    calculateTax(amount) {
        return amount * 0.18; // 18% GST
    }

    calculateWrappingCost(style, itemCount) {
        const costs = {
            basic: 15,
            premium: 25,
            luxury: 50
        };
        return (costs[style] || 15) * itemCount;
    }

    async updateInventoryForSale(items) {
        for (const item of items) {
            await this.unifiedDB.update(
                { type: 'product', _id: item.id },
                { $inc: { 'stock.total': -item.quantity, 'analytics.sales': item.quantity } }
            );
        }
    }

    async updateCustomerLoyalty(customer_id, amount) {
        const points = Math.floor(amount); // 1 point per rupee
        await this.unifiedDB.update(
            { type: 'customer', _id: parseInt(customer_id) },
            { 
                $inc: { 
                    'loyalty.points': points,
                    'loyalty.lifetime_points': points,
                    'purchase_history.total_orders': 1,
                    'purchase_history.total_spent': amount
                },
                $set: { 'purchase_history.last_purchase': new Date().toISOString() }
            }
        );
    }

    getNextTier(currentTier, currentPoints) {
        const tiers = {
            bronze: { name: 'silver', points: 1000 },
            silver: { name: 'gold', points: 5000 },
            gold: { name: 'platinum', points: 15000 },
            platinum: { name: 'diamond', points: 50000 }
        };
        
        const next = tiers[currentTier];
        if (next) {
            return {
                tier: next.name,
                points_required: next.points,
                current_progress: (currentPoints / next.points) * 100
            };
        }
        return null;
    }

    validatePromotionRules(promotion, customer_id, order_value, items) {
        // Simplified validation logic
        const now = new Date();
        
        if (new Date(promotion.timing.start_date) > now) {
            return { valid: false, error: 'Promotion not yet started' };
        }
        
        if (new Date(promotion.timing.end_date) < now) {
            return { valid: false, error: 'Promotion has expired' };
        }
        
        if (order_value < promotion.min_order_value) {
            return { valid: false, error: 'Minimum order value not met' };
        }
        
        const discount_amount = this.calculateDiscountAmount(promotion, order_value);
        return { valid: true, discount_amount };
    }

    calculateDiscountAmount(promotion, order_value) {
        if (promotion.discount_type === 'percentage') {
            return (order_value * promotion.discount_value) / 100;
        } else if (promotion.discount_type === 'fixed') {
            return promotion.discount_value;
        }
        return 0;
    }

    async calculateDiscount(items, promotion_code, customer_id) {
        if (!promotion_code) return 0;
        
        const promotion = await this.unifiedDB.findOne({
            type: 'promotion',
            promotion_code: promotion_code
        });
        
        if (!promotion) return 0;
        
        const subtotal = this.calculateSubtotal(items);
        return this.calculateDiscountAmount(promotion, subtotal);
    }

    async getTopSellingProducts(limit) {
        return new Promise((resolve, reject) => {
            this.unifiedDB.find({ type: 'product' })
                .sort({ 'analytics.sales': -1 })
                .limit(limit)
                .exec((err, docs) => {
                    if (err) reject(err);
                    else resolve(docs);
                });
        });
    }
}

// Initialize the unified retail service
const unifiedRetailService = new UnifiedRetailService();

module.exports = app;