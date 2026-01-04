/**
 * Retail Extensions API - Extended endpoints for garments and gift store features
 * Integrates with existing StyleMine architecture using NeDB
 */

const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const path = require("path");
const validator = require("validator");
const async = require("async");

const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

// Database paths for new collections
const dbPaths = {
    promotions: path.join(appData, appName, "server", "databases", "promotions.db"),
    loyalty_rules: path.join(appData, appName, "server", "databases", "loyalty_rules.db"),
    gift_cards: path.join(appData, appName, "server", "databases", "gift_cards.db"),
    bundles: path.join(appData, appName, "server", "databases", "bundles.db"),
    customer_preferences: path.join(appData, appName, "server", "databases", "customer_preferences.db"),
    inventory_matrix: path.join(appData, appName, "server", "databases", "inventory_matrix.db"),
    occasions: path.join(appData, appName, "server", "databases", "occasions.db")
};

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

// Initialize all retail databases
const retailDBs = {};
Object.keys(dbPaths).forEach(key => {
    retailDBs[key] = getDatabase(dbPaths[key]);
    retailDBs[key].ensureIndex({ fieldName: "_id", unique: true });
});

/**
 * Promotions API Endpoints
 */

// GET - Get all active promotions
app.get("/promotions/active", function (req, res) {
    const now = new Date().toISOString();
    
    retailDBs.promotions.find({
        $and: [
            { "timing.start_date": { $lte: now } },
            { "timing.end_date": { $gte: now } },
            { "timing.is_active": true },
            { "approval.approval_status": "approved" }
        ]
    }, function (err, promotions) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.send(promotions);
        }
    });
});

// POST - Create new promotion
app.post("/promotions/create", function (req, res) {
    const promotion = {
        promotion_id: `PROMO${Date.now()}`,
        promotion_name: validator.escape(req.body.promotion_name || ""),
        promotion_type: validator.escape(req.body.promotion_type || "seasonal"),
        promotion_code: validator.escape(req.body.promotion_code || ""),
        promotion_details: {
            description: validator.escape(req.body.description || ""),
            banner_image: validator.escape(req.body.banner_image || ""),
            terms_conditions: validator.escape(req.body.terms_conditions || ""),
            min_order_value: parseFloat(req.body.min_order_value) || 0,
            max_discount_amount: parseFloat(req.body.max_discount_amount) || 0,
            usage_limit_per_customer: parseInt(req.body.usage_limit_per_customer) || 1,
            total_usage_limit: parseInt(req.body.total_usage_limit) || 1000
        },
        discount_structure: {
            discount_type: validator.escape(req.body.discount_type || "percentage"),
            discount_value: parseFloat(req.body.discount_value) || 0,
            applicable_categories: req.body.applicable_categories || [],
            applicable_products: req.body.applicable_products || [],
            excluded_products: req.body.excluded_products || [],
            minimum_quantity: parseInt(req.body.minimum_quantity) || 1,
            maximum_quantity: parseInt(req.body.maximum_quantity) || 999
        },
        timing: {
            start_date: req.body.start_date,
            end_date: req.body.end_date,
            timezone: "Asia/Kolkata",
            is_active: true,
            is_recurring: false,
            recurring_pattern: null
        },
        targeting: {
            customer_segments: req.body.customer_segments || ["all"],
            specific_customers: req.body.specific_customers || [],
            new_customers_only: req.body.new_customers_only || false,
            loyalty_tiers: req.body.loyalty_tiers || ["bronze", "silver", "gold", "platinum", "diamond"],
            minimum_loyalty_points: parseInt(req.body.minimum_loyalty_points) || 0,
            first_purchase_only: req.body.first_purchase_only || false,
            geographic_restrictions: req.body.geographic_restrictions || [],
            exclude_segments: req.body.exclude_segments || []
        },
        stacking: {
            can_stack_with_loyalty: req.body.can_stack_with_loyalty || true,
            can_stack_with_coupons: req.body.can_stack_with_coupons || false,
            can_stack_with_other_promotions: req.body.can_stack_with_other_promotions || false,
            priority_order: parseInt(req.body.priority_order) || 1
        },
        analytics: {
            views: 0,
            clicks: 0,
            conversions: 0,
            revenue_generated: 0,
            discount_amount_given: 0,
            roi: 0,
            conversion_rate: 0
        },
        approval: {
            created_by: validator.escape(req.body.created_by || "admin"),
            approved_by: null,
            approval_status: "pending",
            approval_date: null,
            notes: validator.escape(req.body.notes || "")
        }
    };

    retailDBs.promotions.insert(promotion, function (err, newPromotion) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.sendStatus(200);
        }
    });
});

/**
 * Loyalty Program API Endpoints
 */

// GET - Get loyalty rules
app.get("/loyalty/rules", function (req, res) {
    retailDBs.loyalty_rules.find({ "status.is_active": true }, function (err, rules) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.send(rules);
        }
    });
});

// POST - Calculate points for transaction
app.post("/loyalty/points/calculate", function (req, res) {
    const { customer_id, order_value, category, loyalty_tier } = req.body;
    
    retailDBs.loyalty_rules.findOne({ rule_type: "earning" }, function (err, rule) {
        if (err || !rule) {
            res.status(404).json({ error: "Loyalty rules not found" });
            return;
        }

        let points_earned = 0;
        const base_rate = rule.points_calculation.points_per_rupee || 1;
        
        // Calculate base points
        points_earned = Math.floor(order_value * base_rate);
        
        // Apply tier bonuses
        if (loyalty_tier && rule.points_calculation.tier_bonuses[loyalty_tier]) {
            const tier_bonus = rule.points_calculation.tier_bonuses[loyalty_tier];
            points_earned += Math.floor(points_earned * tier_bonus);
        }
        
        // Apply category bonuses
        if (category && rule.points_calculation.category_bonuses[category]) {
            const category_bonus = rule.points_calculation.category_bonuses[category];
            points_earned += Math.floor(points_earned * category_bonus);
        }
        
        // Check for bonus multipliers
        const now = new Date();
        if (rule.bonus_campaigns) {
            rule.bonus_campaigns.forEach(campaign => {
                const start = new Date(campaign.start_date);
                const end = new Date(campaign.end_date);
                
                if (now >= start && now <= end) {
                    points_earned = Math.floor(points_earned * campaign.bonus_multiplier);
                }
            });
        }
        
        // Apply max points per transaction limit
        const max_points = rule.rule_config.max_points_per_transaction || 10000;
        points_earned = Math.min(points_earned, max_points);
        
        res.json({
            customer_id: customer_id,
            order_value: order_value,
            points_earned: points_earned,
            tier: loyalty_tier,
            category: category,
            calculation_details: {
                base_rate: base_rate,
                tier_bonus_applied: rule.points_calculation.tier_bonuses[loyalty_tier] || 0,
                category_bonus_applied: rule.points_calculation.category_bonuses[category] || 0,
                bonus_multipliers: rule.bonus_campaigns ? rule.bonus_campaigns.length : 0
            }
        });
    });
});

/**
 * Gift Cards API Endpoints
 */

// GET - Check gift card balance
app.get("/gift-cards/:cardId/balance", function (req, res) {
    const cardId = req.params.cardId;
    
    retailDBs.gift_cards.findOne({ 
        $or: [
            { gift_card_id: cardId },
            { gift_card_number: cardId }
        ]
    }, function (err, giftCard) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else if (!giftCard) {
            res.status(404).json({ error: "Gift card not found" });
        } else {
            res.json({
                card_id: giftCard.gift_card_id,
                card_number: giftCard.gift_card_number,
                current_balance: giftCard.card_details.current_balance,
                currency: giftCard.card_details.currency,
                expiry_date: giftCard.validity.expiry_date,
                is_active: giftCard.status.is_active,
                is_blocked: giftCard.status.is_blocked
            });
        }
    });
});

// POST - Redeem gift card
app.post("/gift-cards/redeem", function (req, res) {
    const { card_id, amount, order_id, customer_id } = req.body;
    
    retailDBs.gift_cards.findOne({
        $or: [
            { gift_card_id: card_id },
            { gift_card_number: card_id }
        ]
    }, function (err, giftCard) {
        if (err) {
            res.status(500).json({ error: "Internal Server Error" });
            return;
        }
        
        if (!giftCard) {
            res.status(404).json({ error: "Gift card not found" });
            return;
        }
        
        if (giftCard.status.is_blocked) {
            res.status(400).json({ error: "Gift card is blocked" });
            return;
        }
        
        const currentBalance = giftCard.card_details.current_balance;
        if (currentBalance < amount) {
            res.status(400).json({ error: "Insufficient gift card balance" });
            return;
        }
        
        // Check expiry
        const now = new Date();
        const expiryDate = new Date(giftCard.validity.expiry_date);
        if (now > expiryDate) {
            res.status(400).json({ error: "Gift card has expired" });
            return;
        }
        
        // Calculate new balance
        const newBalance = currentBalance - amount;
        
        // Create transaction record
        const transaction = {
            transaction_id: `TXN${Date.now()}`,
            transaction_date: now.toISOString(),
            transaction_type: "purchase",
            amount: amount,
            order_id: order_id,
            remaining_balance: newBalance,
            store_location: validator.escape(req.body.store_location || "Main Store"),
            cashier: validator.escape(req.body.cashier || "System")
        };
        
        // Update gift card
        const updatedTransactions = [...(giftCard.transactions || []), transaction];
        const updatedGiftCard = {
            ...giftCard,
            card_details: {
                ...giftCard.card_details,
                current_balance: newBalance
            },
            transactions: updatedTransactions,
            status: {
                ...giftCard.status,
                last_used_date: now.toISOString(),
                usage_count: (giftCard.status.usage_count || 0) + 1
            }
        };
        
        retailDBs.gift_cards.update(
            { _id: giftCard._id },
            updatedGiftCard,
            {},
            function (updateErr, numReplaced) {
                if (updateErr) {
                    console.error(updateErr);
                    res.status(500).json({ error: "Failed to update gift card" });
                } else {
                    res.json({
                        success: true,
                        redeemed_amount: amount,
                        remaining_balance: newBalance,
                        transaction_id: transaction.transaction_id
                    });
                }
            }
        );
    });
});

/**
 * Gift Bundles API Endpoints
 */

// GET - Get available bundles
app.get("/bundles/available", function (req, res) {
    const { category, occasion, gender } = req.query;
    
    let query = {
        "inventory.is_available": true
    };
    
    if (category) query["bundle_details.category"] = category;
    if (occasion) query["bundle_details.occasion"] = occasion;
    if (gender) query["bundle_details.gender"] = gender;
    
    retailDBs.bundles.find(query, function (err, bundles) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.send(bundles);
        }
    });
});

// POST - Create custom bundle
app.post("/bundles/create", function (req, res) {
    const bundle = {
        bundle_id: `BUNDLE${Date.now()}`,
        bundle_name: validator.escape(req.body.bundle_name || ""),
        bundle_type: validator.escape(req.body.bundle_type || "build_your_own"),
        bundle_details: {
            description: validator.escape(req.body.description || ""),
            category: validator.escape(req.body.category || ""),
            occasion: validator.escape(req.body.occasion || ""),
            gender: validator.escape(req.body.gender || ""),
            age_group: validator.escape(req.body.age_group || "adults"),
            season: validator.escape(req.body.season || "all_season"),
            style_theme: validator.escape(req.body.style_theme || "")
        },
        components: req.body.components || [],
        pricing: {
            total_individual_price: req.body.total_individual_price || 0,
            bundle_price: req.body.bundle_price || 0,
            total_discount: req.body.total_discount || 0,
            discount_percentage: req.body.discount_percentage || 0
        },
        variants: req.body.variants || [],
        inventory: {
            is_available: true,
            stock_status: "in_stock",
            low_stock_threshold: 10,
            current_stock: parseInt(req.body.initial_stock) || 25
        },
        marketing: {
            featured: false,
            banner_image: validator.escape(req.body.banner_image || ""),
            gallery_images: req.body.gallery_images || [],
            promotional_tags: req.body.promotional_tags || [],
            seo_title: validator.escape(req.body.seo_title || ""),
            seo_description: validator.escape(req.body.seo_description || "")
        },
        customization: {
            allow_component_substitution: req.body.allow_component_substitution || true,
            allow_size_selection: req.body.allow_size_selection || true,
            allow_color_selection: req.body.allow_color_selection || false,
            gift_wrapping_included: req.body.gift_wrapping_included || false,
            gift_message_included: req.body.gift_message_included || true,
            personalization_options: req.body.personalization_options || {}
        },
        performance: {
            views: 0,
            conversions: 0,
            conversion_rate: 0,
            revenue_generated: 0,
            average_order_value: 0,
            return_rate: 0,
            customer_satisfaction: 0
        },
        validity: {
            start_date: new Date().toISOString(),
            end_date: null,
            is_seasonal: false,
            seasonal_restrictions: [],
            limited_time_offer: false
        }
    };

    retailDBs.bundles.insert(bundle, function (err, newBundle) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.sendStatus(200);
        }
    });
});

/**
 * Customer Preferences API Endpoints
 */

// GET - Get customer preferences
app.get("/customers/:id/preferences", function (req, res) {
    const customerId = req.params.id;
    
    retailDBs.customer_preferences.findOne({ customer_id: customerId }, function (err, preferences) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else if (!preferences) {
            res.status(404).json({ error: "Customer preferences not found" });
        } else {
            res.send(preferences);
        }
    });
});

// PUT - Update customer preferences
app.put("/customers/:id/preferences", function (req, res) {
    const customerId = req.params.id;
    const updatedPreferences = {
        ...req.body,
        last_updated: new Date().toISOString()
    };

    retailDBs.customer_preferences.update(
        { customer_id: customerId },
        updatedPreferences,
        {},
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({ error: "Internal Server Error" });
            } else if (numReplaced === 0) {
                res.status(404).json({ error: "Customer preferences not found" });
            } else {
                res.sendStatus(200);
            }
        }
    );
});

/**
 * Inventory Matrix API Endpoints
 */

// GET - Get product variant stock matrix
app.get("/inventory/matrix/:productId", function (req, res) {
    const productId = parseInt(req.params.productId);
    
    retailDBs.inventory_matrix.findOne({ product_id: productId }, function (err, matrix) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else if (!matrix) {
            res.status(404).json({ error: "Inventory matrix not found" });
        } else {
            res.send(matrix);
        }
    });
});

// POST - Update variant stock
app.post("/inventory/variant-stock", function (req, res) {
    const { matrix_id, variant_key, quantity_change, reason } = req.body;
    
    retailDBs.inventory_matrix.findOne({ matrix_id }, function (err, matrix) {
        if (err || !matrix) {
            res.status(404).json({ error: "Inventory matrix not found" });
            return;
        }
        
        // Parse variant key (e.g., "Blue-M-L")
        const [color, size] = variant_key.split('-');
        
        if (!matrix.stock_matrix[color] || !matrix.stock_matrix[color][size]) {
            res.status(400).json({ error: "Invalid variant key" });
            return;
        }
        
        // Update stock
        const currentStock = matrix.stock_matrix[color][size].stock;
        const newStock = Math.max(0, currentStock + quantity_change);
        
        matrix.stock_matrix[color][size].stock = newStock;
        matrix.last_updated = new Date().toISOString();
        
        retailDBs.inventory_matrix.update(
            { matrix_id },
            matrix,
            {},
            function (updateErr, numReplaced) {
                if (updateErr) {
                    console.error(updateErr);
                    res.status(500).json({ error: "Failed to update stock" });
                } else {
                    res.json({
                        success: true,
                        variant_key: variant_key,
                        previous_stock: currentStock,
                        new_stock: newStock,
                        quantity_change: quantity_change,
                        reason: reason
                    });
                }
            }
        );
    });
});

/**
 * Occasions API Endpoints
 */

// GET - Get active occasions
app.get("/occasions/active", function (req, res) {
    const now = new Date();
    
    retailDBs.occasions.find({
        $or: [
            {
                $and: [
                    { "timing.start_date": { $lte: now.toISOString() } },
                    { "timing.end_date": { $gte: now.toISOString() } }
                ]
            },
            { "timing.next_occurrence": { $exists: true } }
        ]
    }, function (err, occasions) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.send(occasions);
        }
    });
});

// GET - Get occasion by ID
app.get("/occasions/:occasionId", function (req, res) {
    const occasionId = req.params.occasionId;
    
    retailDBs.occasions.findOne({ occasion_id: occasionId }, function (err, occasion) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else if (!occasion) {
            res.status(404).json({ error: "Occasion not found" });
        } else {
            res.send(occasion);
        }
    });
});

/**
 * Utility Functions
 */

// Validate promotion code
app.post("/promotions/validate", function (req, res) {
    const { promotion_code, customer_id, order_value, items } = req.body;
    
    retailDBs.promotions.findOne({
        "promotion_code": promotion_code,
        "approval.approval_status": "approved",
        "timing.is_active": true
    }, function (err, promotion) {
        if (err || !promotion) {
            res.json({ valid: false, error: "Invalid or expired promotion code" });
            return;
        }
        
        // Check timing
        const now = new Date();
        const startDate = new Date(promotion.timing.start_date);
        const endDate = new Date(promotion.timing.end_date);
        
        if (now < startDate || now > endDate) {
            res.json({ valid: false, error: "Promotion is not active" });
            return;
        }
        
        // Check minimum order value
        if (order_value < promotion.promotion_details.min_order_value) {
            res.json({ 
                valid: false, 
                error: `Minimum order value of ₹${promotion.promotion_details.min_order_value} required` 
            });
            return;
        }
        
        // Calculate discount
        let discount_amount = 0;
        if (promotion.discount_structure.discount_type === "percentage") {
            discount_amount = (order_value * promotion.discount_structure.discount_value) / 100;
        } else if (promotion.discount_structure.discount_type === "fixed_amount") {
            discount_amount = promotion.discount_structure.discount_value;
        }
        
        // Apply maximum discount limit
        if (promotion.promotion_details.max_discount_amount > 0) {
            discount_amount = Math.min(discount_amount, promotion.promotion_details.max_discount_amount);
        }
        
        res.json({
            valid: true,
            promotion: promotion,
            discount_amount: discount_amount,
            final_amount: order_value - discount_amount
        });
    });
});

/**
 * VARIANT MANAGEMENT SYSTEM - Comprehensive variant tracking and management
 */

// GET - Get all variants for a product
app.get('/variants/product/:productId', function (req, res) {
    const productId = parseInt(req.params.productId);
    
    // First get the product to check if it has variants
    retailDBs.inventory.findOne({ _id: productId }, function (err, product) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        
        // If product doesn't have variant tracking, return empty array
        if (product.stock_tracking_method !== 'variant') {
            res.json({ variants: [], tracking_method: 'aggregate' });
            return;
        }
        
        // Get variants from inventory_matrix
        retailDBs.inventory_matrix.findOne({ product_id: productId }, function (err, matrix) {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }
            
            if (!matrix) {
                res.json({ variants: [], tracking_method: 'variant' });
                return;
            }
            
            res.json({
                product_id: productId,
                product_name: product.name,
                tracking_method: 'variant',
                matrix_config: matrix.matrix_config,
                variants: matrix.stock_matrix,
                performance_metrics: matrix.performance_metrics,
                sales_velocity: matrix.sales_velocity
            });
        });
    });
});

// POST - Create new variant matrix for a product
app.post('/variants/create-matrix', function (req, res) {
    const { 
        product_id, 
        tracking_type, 
        dimensions, 
        initial_stock 
    } = req.body;
    
    // Validate required fields
    if (!product_id || !tracking_type || !dimensions) {
        res.status(400).json({ 
            error: 'Missing required fields: product_id, tracking_type, dimensions' 
        });
        return;
    }
    
    // Check if product exists
    retailDBs.inventory.findOne({ _id: parseInt(product_id) }, function (err, product) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        
        // Check if matrix already exists
        retailDBs.inventory_matrix.findOne({ product_id: parseInt(product_id) }, function (err, existingMatrix) {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }
            
            if (existingMatrix) {
                res.status(400).json({ error: 'Variant matrix already exists for this product' });
                return;
            }
            
            // Create new variant matrix
            const matrixId = `MATRIX${Date.now()}`;
            const stockMatrix = {};
            const defaultStock = initial_stock || 10;
            
            // Generate stock matrix based on dimensions
            if (dimensions.colors && dimensions.sizes) {
                dimensions.colors.forEach(color => {
                    stockMatrix[color] = {};
                    dimensions.sizes.forEach(size => {
                        stockMatrix[color][size] = {
                            stock: defaultStock,
                            reserved: 0,
                            min_stock: 5,
                            max_stock: 50,
                            reorder_point: 10,
                            barcode: generateVariantBarcode(product_id, color, size),
                            last_updated: new Date().toISOString()
                        };
                    });
                });
            }
            
            const newMatrix = {
                matrix_id: matrixId,
                product_id: parseInt(product_id),
                product_name: product.name,
                matrix_config: {
                    tracking_type: tracking_type,
                    dimensions: dimensions,
                    matrix_structure: dimensions.colors && dimensions.sizes ? '2D' : '1D'
                },
                stock_matrix: stockMatrix,
                reorder_management: {
                    auto_reorder_enabled: true,
                    reorder_rules: {
                        low_stock_alerts: true,
                        critical_stock_alerts: true,
                        overstock_alerts: false,
                        seasonal_adjustments: false
                    },
                    supplier_information: {
                        primary_supplier: product.supplierId || 'Default Supplier',
                        lead_time_days: 7,
                        minimum_order_quantity: 50,
                        reorder_multiples: 10
                    },
                    pending_orders: []
                },
                sales_velocity: {
                    time_period_days: 30,
                    sales_data: {},
                    predicted_demand: {},
                    seasonal_factor: 1.0
                },
                abc_analysis: {
                    classification_date: new Date().toISOString().split('T')[0],
                    analysis_period: '30_days',
                    classifications: {}
                },
                dead_stock: {
                    identification_date: new Date().toISOString().split('T')[0],
                    dead_stock_threshold_days: 90,
                    identified_items: [],
                    slow_moving_items: []
                },
                store_distribution: {
                    total_company_stock: defaultStock * (dimensions.colors?.length || 1) * (dimensions.sizes?.length || 1),
                    distribution_strategy: 'equal_distribution',
                    store_allocations: {}
                },
                performance_metrics: {
                    last_updated: new Date().toISOString(),
                    stock_accuracy: 1.0,
                    stock_turnover_rate: 0,
                    stockout_frequency: 0,
                    average_holding_days: 0,
                    holding_cost_percentage: 2.5,
                    stock_valuation: {
                        total_value: defaultStock * (dimensions.colors?.length || 1) * (dimensions.sizes?.length || 1) * parseFloat(product.cost || product.price || 0),
                        currency: 'INR',
                        valuation_method: 'fifo'
                    }
                },
                created_date: new Date().toISOString(),
                last_updated: new Date().toISOString()
            };
            
            // Insert new matrix
            retailDBs.inventory_matrix.insert(newMatrix, function (insertErr, insertedMatrix) {
                if (insertErr) {
                    console.error(insertErr);
                    res.status(500).json({ error: 'Failed to create variant matrix' });
                    return;
                }
                
                // Update product to use variant tracking
                retailDBs.inventory.update(
                    { _id: parseInt(product_id) },
                    { 
                        $set: { 
                            stock_tracking_method: 'variant',
                            variants: {
                                sizes: dimensions.sizes || [],
                                colors: dimensions.colors || [],
                                styles: dimensions.styles || [],
                                materials: dimensions.materials || [],
                                patterns: dimensions.patterns || []
                            },
                            size_chart: dimensions.size_chart || {}
                        }
                    },
                    {},
                    function (updateErr, numReplaced) {
                        if (updateErr) {
                            console.error(updateErr);
                            res.status(500).json({ error: 'Failed to update product tracking method' });
                            return;
                        }
                        
                        res.status(201).json({
                            success: true,
                            matrix_id: matrixId,
                            message: 'Variant matrix created successfully',
                            matrix: insertedMatrix
                        });
                    }
                );
            });
        });
    });
});

// PUT - Update variant stock
app.put('/variants/update-stock', function (req, res) {
    const { 
        matrix_id, 
        variant_key, 
        quantity_change, 
        reason, 
        operation_type 
    } = req.body;
    
    if (!matrix_id || !variant_key || quantity_change === undefined) {
        res.status(400).json({ 
            error: 'Missing required fields: matrix_id, variant_key, quantity_change' 
        });
        return;
    }
    
    retailDBs.inventory_matrix.findOne({ matrix_id }, function (err, matrix) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        
        if (!matrix) {
            res.status(404).json({ error: 'Variant matrix not found' });
            return;
        }
        
        // Parse variant key (e.g., "Blue-M-L" or "Blue-M")
        const variantParts = variant_key.split('-');
        let color, size, style;
        
        if (variantParts.length === 3) {
            [color, size, style] = variantParts;
        } else if (variantParts.length === 2) {
            [color, size] = variantParts;
        } else {
            res.status(400).json({ error: 'Invalid variant key format. Expected format: Color-Size or Color-Size-Style' });
            return;
        }
        
        // Check if variant exists
        if (!matrix.stock_matrix[color] || !matrix.stock_matrix[color][size]) {
            res.status(404).json({ error: 'Variant not found' });
            return;
        }
        
        const currentStock = matrix.stock_matrix[color][size].stock;
        let newStock;
        
        // Handle different operation types
        switch (operation_type) {
            case 'set':
                newStock = Math.max(0, quantity_change);
                break;
            case 'add':
            default:
                newStock = Math.max(0, currentStock + quantity_change);
                break;
        }
        
        // Update stock
        matrix.stock_matrix[color][size].stock = newStock;
        matrix.stock_matrix[color][size].last_updated = new Date().toISOString();
        matrix.last_updated = new Date().toISOString();
        
        // Add stock movement record
        if (!matrix.stock_movements) {
            matrix.stock_movements = [];
        }
        
        matrix.stock_movements.push({
            movement_id: `MOV${Date.now()}`,
            variant_key: variant_key,
            operation_type: operation_type || 'add',
            previous_stock: currentStock,
            quantity_change: quantity_change,
            new_stock: newStock,
            reason: reason || 'manual_adjustment',
            timestamp: new Date().toISOString(),
            user_id: req.body.user_id || 'system'
        });
        
        retailDBs.inventory_matrix.update(
            { matrix_id },
            matrix,
            {},
            function (updateErr, numReplaced) {
                if (updateErr) {
                    console.error(updateErr);
                    res.status(500).json({ error: 'Failed to update variant stock' });
                    return;
                }
                
                // Check for low stock alerts
                const variant = matrix.stock_matrix[color][size];
                let alert_level = null;
                
                if (newStock <= variant.min_stock && newStock > 0) {
                    alert_level = 'low_stock';
                } else if (newStock === 0) {
                    alert_level = 'out_of_stock';
                }
                
                res.json({
                    success: true,
                    variant_key: variant_key,
                    previous_stock: currentStock,
                    new_stock: newStock,
                    quantity_change: quantity_change,
                    operation_type: operation_type || 'add',
                    reason: reason,
                    alert_level: alert_level,
                    timestamp: new Date().toISOString()
                });
            }
        );
    });
});

// GET - Get variant stock report
app.get('/variants/stock-report/:productId', function (req, res) {
    const productId = parseInt(req.params.productId);
    
    retailDBs.inventory_matrix.findOne({ product_id: productId }, function (err, matrix) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        
        if (!matrix) {
            res.status(404).json({ error: 'Variant matrix not found' });
            return;
        }
        
        // Calculate stock summary
        const stockSummary = {
            total_variants: 0,
            in_stock: 0,
            low_stock: 0,
            out_of_stock: 0,
            total_stock_value: 0,
            variants_detail: []
        };
        
        Object.keys(matrix.stock_matrix).forEach(color => {
            Object.keys(matrix.stock_matrix[color]).forEach(size => {
                const variant = matrix.stock_matrix[color][size];
                stockSummary.total_variants++;
                
                if (variant.stock === 0) {
                    stockSummary.out_of_stock++;
                } else if (variant.stock <= variant.min_stock) {
                    stockSummary.low_stock++;
                } else {
                    stockSummary.in_stock++;
                }
                
                stockSummary.variants_detail.push({
                    variant_key: `${color}-${size}`,
                    color: color,
                    size: size,
                    stock: variant.stock,
                    min_stock: variant.min_stock,
                    stock_status: variant.stock === 0 ? 'out_of_stock' : 
                                 variant.stock <= variant.min_stock ? 'low_stock' : 'in_stock',
                    barcode: variant.barcode,
                    last_updated: variant.last_updated
                });
                
                // Calculate stock value (assuming cost from product)
                // This would need product cost/price data
                stockSummary.total_stock_value += variant.stock * 100; // Placeholder calculation
            });
        });
        
        res.json({
            product_id: productId,
            product_name: matrix.product_name,
            stock_summary: stockSummary,
            performance_metrics: matrix.performance_metrics,
            abc_analysis: matrix.abc_analysis,
            generated_at: new Date().toISOString()
        });
    });
});

// POST - Bulk update variant stock
app.post('/variants/bulk-stock-update', function (req, res) {
    const { updates, reason } = req.body;
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
        res.status(400).json({ error: 'Invalid or empty updates array' });
        return;
    }
    
    const results = {
        successful: [],
        failed: [],
        summary: {
            total_updates: updates.length,
            successful_updates: 0,
            failed_updates: 0
        }
    };
    
    let completed = 0;
    
    updates.forEach(update => {
        const { matrix_id, variant_key, quantity_change, operation_type } = update;
        
        // Call the individual update endpoint logic
        retailDBs.inventory_matrix.findOne({ matrix_id }, function (err, matrix) {
            if (err || !matrix) {
                results.failed.push({
                    variant_key: variant_key,
                    error: err ? err.message : 'Matrix not found'
                });
                results.summary.failed_updates++;
                
                completed++;
                if (completed === updates.length) {
                    res.json(results);
                }
                return;
            }
            
            const variantParts = variant_key.split('-');
            let color, size;
            
            if (variantParts.length >= 2) {
                [color, size] = variantParts;
            } else {
                results.failed.push({
                    variant_key: variant_key,
                    error: 'Invalid variant key format'
                });
                results.summary.failed_updates++;
                
                completed++;
                if (completed === updates.length) {
                    res.json(results);
                }
                return;
            }
            
            if (!matrix.stock_matrix[color] || !matrix.stock_matrix[color][size]) {
                results.failed.push({
                    variant_key: variant_key,
                    error: 'Variant not found'
                });
                results.summary.failed_updates++;
                
                completed++;
                if (completed === updates.length) {
                    res.json(results);
                }
                return;
            }
            
            const currentStock = matrix.stock_matrix[color][size].stock;
            let newStock;
            
            switch (operation_type) {
                case 'set':
                    newStock = Math.max(0, quantity_change);
                    break;
                case 'add':
                default:
                    newStock = Math.max(0, currentStock + quantity_change);
                    break;
            }
            
            matrix.stock_matrix[color][size].stock = newStock;
            matrix.stock_matrix[color][size].last_updated = new Date().toISOString();
            matrix.last_updated = new Date().toISOString();
            
            retailDBs.inventory_matrix.update(
                { matrix_id },
                matrix,
                {},
                function (updateErr, numReplaced) {
                    if (updateErr) {
                        results.failed.push({
                            variant_key: variant_key,
                            error: 'Database update failed'
                        });
                        results.summary.failed_updates++;
                    } else {
                        results.successful.push({
                            variant_key: variant_key,
                            previous_stock: currentStock,
                            new_stock: newStock,
                            quantity_change: quantity_change
                        });
                        results.summary.successful_updates++;
                    }
                    
                    completed++;
                    if (completed === updates.length) {
                        res.json(results);
                    }
                }
            );
        });
    });
});

// GET - Export variants to CSV
app.get('/variants/export/:productId', function (req, res) {
    const productId = parseInt(req.params.productId);
    
    retailDBs.inventory_matrix.findOne({ product_id: productId }, function (err, matrix) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        
        if (!matrix) {
            res.status(404).json({ error: 'Variant matrix not found' });
            return;
        }
        
        // Generate CSV content
        let csvContent = 'Variant Key,Color,Size,Stock,Min Stock,Barcode,Last Updated\n';
        
        Object.keys(matrix.stock_matrix).forEach(color => {
            Object.keys(matrix.stock_matrix[color]).forEach(size => {
                const variant = matrix.stock_matrix[color][size];
                csvContent += `${color}-${size},${color},${size},${variant.stock},${variant.min_stock},${variant.barcode},${variant.last_updated}\n`;
            });
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="variants_${productId}_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
    });
});

// POST - Import variants from CSV
app.post('/variants/import', function (req, res) {
    // This would handle CSV file upload and parsing
    // For now, return a placeholder response
    res.json({
        success: true,
        message: 'Variant import functionality will be implemented with file upload handling',
        imported_count: 0,
        errors: []
    });
});

// Helper function to generate variant barcode
function generateVariantBarcode(productId, color, size, format = 'UPC-E') {
    const timestamp = Date.now().toString().slice(-6);
    const colorCode = color.substring(0, 2).toUpperCase();
    const sizeCode = size.toUpperCase();
    return `${productId}${colorCode}${sizeCode}${timestamp}`;
}

/**
 * Enhanced Barcode Management System
 */

// GET - Get variant by barcode
app.get('/barcode/variant/:barcode', function (req, res) {
    const barcode = req.params.barcode;
    
    // Search in inventory_matrix for variant barcodes
    retailDBs.inventory_matrix.findOne({
        'stock_matrix.*.*.barcode': barcode
    }, function (err, matrix) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        
        if (!matrix) {
            // Also search in regular inventory for product barcodes
            retailDBs.inventory.findOne({ barcode: barcode }, function (err, product) {
                if (err) {
                    console.error(err);
                    res.status(500).json({ error: 'Internal Server Error' });
                    return;
                }
                
                if (!product) {
                    res.status(404).json({ error: 'Product not found' });
                    return;
                }
                
                res.json({
                    type: 'product',
                    product: product,
                    tracking_method: 'aggregate'
                });
            });
            return;
        }
        
        // Find the specific variant
        let foundVariant = null;
        let variantKey = null;
        
        Object.keys(matrix.stock_matrix).forEach(color => {
            Object.keys(matrix.stock_matrix[color]).forEach(size => {
                const variant = matrix.stock_matrix[color][size];
                if (variant.barcode === barcode) {
                    foundVariant = variant;
                    variantKey = `${color}-${size}`;
                }
            });
        });
        
        if (!foundVariant) {
            res.status(404).json({ error: 'Variant not found' });
            return;
        }
        
        res.json({
            type: 'variant',
            matrix_id: matrix.matrix_id,
            product_id: matrix.product_id,
            product_name: matrix.product_name,
            variant_key: variantKey,
            variant: foundVariant,
            tracking_method: 'variant'
        });
    });
});

// POST - Generate barcode for new variant
app.post('/barcode/generate', function (req, res) {
    const { product_id, variant_attributes, format, prefix, suffix } = req.body;
    
    if (!product_id || !variant_attributes) {
        res.status(400).json({ error: 'Missing required fields: product_id, variant_attributes' });
        return;
    }
    
    // Build variant key from attributes
    const variantKey = Object.values(variant_attributes).join('-');
    
    // Generate barcode based on format and pattern
    let barcode;
    const timestamp = Date.now().toString().slice(-6);
    
    switch (format) {
        case 'UPC-E':
            barcode = `${prefix || ''}${product_id}${variantKey.substring(0, 3)}${suffix || ''}`;
            break;
        case 'EAN-13':
            barcode = `${prefix || ''}${product_id}${variantKey.substring(0, 5)}${timestamp}${suffix || ''}`;
            break;
        case 'Code128':
            barcode = `${prefix || ''}${product_id}-${variantKey}-${timestamp}${suffix || ''}`;
            break;
        case 'QR':
            barcode = `QR${product_id}${variantKey}${timestamp}`;
            break;
        default:
            barcode = `${product_id}${variantKey.substring(0, 2)}${timestamp}`;
    }
    
    // Ensure barcode uniqueness
    barcode += generateCheckDigit(barcode, format);
    
    res.json({
        barcode: barcode,
        format: format,
        variant_attributes: variant_attributes,
        variant_key: variantKey,
        generated_at: new Date().toISOString()
    });
});

// POST - Bulk generate barcodes for variants
app.post('/barcode/bulk-generate', function (req, res) {
    const { product_id, variants, format, pattern } = req.body;
    
    if (!product_id || !variants || !Array.isArray(variants)) {
        res.status(400).json({ error: 'Invalid input data' });
        return;
    }
    
    const generatedBarcodes = [];
    const errors = [];
    
    variants.forEach((variant, index) => {
        try {
            const variantKey = variant.attributes ? 
                Object.values(variant.attributes).join('-') : 
                `${variant.color || ''}-${variant.size || ''}`;
            
            let barcode;
            const timestamp = Date.now().toString().slice(-4);
            
            // Apply pattern-based generation
            switch (pattern) {
                case 'product-color-size':
                    barcode = `${product_id}${variantKey.replace(/-/g, '')}${timestamp}`;
                    break;
                case 'color-size-product':
                    barcode = `${variantKey.replace(/-/g, '')}${product_id}${timestamp}`;
                    break;
                case 'sequential':
                    barcode = `${product_id}${String(index + 1).padStart(4, '0')}${timestamp}`;
                    break;
                default:
                    barcode = `${product_id}${variantKey.substring(0, 2)}${timestamp}`;
            }
            
            barcode += generateCheckDigit(barcode, format);
            
            generatedBarcodes.push({
                variant_key: variantKey,
                attributes: variant.attributes || { color: variant.color, size: variant.size },
                barcode: barcode,
                format: format,
                pattern: pattern
            });
            
        } catch (error) {
            errors.push({
                variant_index: index,
                variant: variant,
                error: error.message
            });
        }
    });
    
    res.json({
        success: true,
        product_id: product_id,
        total_generated: generatedBarcodes.length,
        total_errors: errors.length,
        barcodes: generatedBarcodes,
        errors: errors,
        generated_at: new Date().toISOString()
    });
});

// POST - Validate barcode format and checksum
app.post('/barcode/validate', function (req, res) {
    const { barcode, format } = req.body;
    
    if (!barcode) {
        res.status(400).json({ error: 'Barcode is required' });
        return;
    }
    
    const validation = validateBarcodeFormat(barcode, format);
    
    res.json({
        barcode: barcode,
        format: format,
        is_valid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        barcode_type: validation.type,
        check_digit_valid: validation.checkDigitValid
    });
});

// GET - Get barcode scanning history
app.get('/barcode/scan-history/:productId?', function (req, res) {
    const { productId } = req.params;
    
    // This would typically come from a separate scan_history collection
    // For now, return a placeholder response
    res.json({
        scans: [],
        total_scans: 0,
        last_scan: null,
        popular_products: [],
        scan_analytics: {
            daily_scans: 0,
            hourly_pattern: {},
            success_rate: 0
        }
    });
});

// POST - Update variant barcode
app.put('/barcode/variant', function (req, res) {
    const { matrix_id, variant_key, new_barcode } = req.body;
    
    if (!matrix_id || !variant_key || !new_barcode) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }
    
    retailDBs.inventory_matrix.findOne({ matrix_id }, function (err, matrix) {
        if (err || !matrix) {
            res.status(404).json({ error: 'Variant matrix not found' });
            return;
        }
        
        const variantParts = variant_key.split('-');
        let color, size;
        
        if (variantParts.length >= 2) {
            [color, size] = variantParts;
        } else {
            res.status(400).json({ error: 'Invalid variant key format' });
            return;
        }
        
        if (!matrix.stock_matrix[color] || !matrix.stock_matrix[color][size]) {
            res.status(404).json({ error: 'Variant not found' });
            return;
        }
        
        // Validate new barcode format
        const validation = validateBarcodeFormat(new_barcode);
        if (!validation.isValid) {
            res.status(400).json({ 
                error: 'Invalid barcode format', 
                validation_errors: validation.errors 
            });
            return;
        }
        
        // Update barcode
        matrix.stock_matrix[color][size].barcode = new_barcode;
        matrix.stock_matrix[color][size].last_updated = new Date().toISOString();
        matrix.last_updated = new Date().toISOString();
        
        retailDBs.inventory_matrix.update(
            { matrix_id },
            matrix,
            {},
            function (updateErr, numReplaced) {
                if (updateErr) {
                    console.error(updateErr);
                    res.status(500).json({ error: 'Failed to update barcode' });
                } else {
                    res.json({
                        success: true,
                        matrix_id: matrix_id,
                        variant_key: variant_key,
                        old_barcode: matrix.stock_matrix[color][size].barcode,
                        new_barcode: new_barcode,
                        updated_at: new Date().toISOString()
                    });
                }
            }
        );
    });
});

// GET - Export barcodes for printing
app.get('/barcode/export/:productId', function (req, res) {
    const productId = parseInt(req.params.productId);
    const { format } = req.query; // 'csv', 'pdf', 'json'
    
    retailDBs.inventory_matrix.findOne({ product_id: productId }, function (err, matrix) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        
        if (!matrix) {
            res.status(404).json({ error: 'Product variants not found' });
            return;
        }
        
        // Generate export data
        const exportData = [];
        
        Object.keys(matrix.stock_matrix).forEach(color => {
            Object.keys(matrix.stock_matrix[color]).forEach(size => {
                const variant = matrix.stock_matrix[color][size];
                exportData.push({
                    variant_key: `${color}-${size}`,
                    color: color,
                    size: size,
                    barcode: variant.barcode,
                    stock: variant.stock,
                    product_name: matrix.product_name,
                    product_id: matrix.product_id
                });
            });
        });
        
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="barcodes_${productId}_${new Date().toISOString().split('T')[0]}.csv"`);
            
            const csvContent = [
                'Variant Key,Color,Size,Barcode,Stock,Product Name,Product ID',
                ...exportData.map(item => 
                    `${item.variant_key},${item.color},${item.size},${item.barcode},${item.stock},${item.product_name},${item.product_id}`
                )
            ].join('\n');
            
            res.send(csvContent);
        } else {
            res.json({
                product_id: productId,
                product_name: matrix.product_name,
                export_format: format || 'json',
                total_variants: exportData.length,
                generated_at: new Date().toISOString(),
                data: exportData
            });
        }
    });
});

/**
 * Barcode validation and generation utilities
 */

// Generate check digit for various barcode formats
function generateCheckDigit(barcode, format) {
    if (!format || format === 'Code128' || format === 'QR') {
        return ''; // No check digit for these formats
    }
    
    const numbers = barcode.replace(/\D/g, '');
    
    switch (format) {
        case 'UPC-E':
            return generateUPCECheckDigit(numbers);
        case 'EAN-13':
            return generateEAN13CheckDigit(numbers);
        case 'EAN-8':
            return generateEAN8CheckDigit(numbers);
        default:
            return '';
    }
}

// UPC-E check digit generation
function generateUPCECheckDigit(number) {
    if (number.length !== 7) return '';
    
    let sum = 0;
    for (let i = 0; i < number.length; i++) {
        const digit = parseInt(number[i]);
        sum += (i % 2 === 0) ? digit * 1 : digit * 3;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
}

// EAN-13 check digit generation
function generateEAN13CheckDigit(number) {
    if (number.length !== 12) return '';
    
    let sum = 0;
    for (let i = 0; i < number.length; i++) {
        const digit = parseInt(number[i]);
        sum += (i % 2 === 0) ? digit * 1 : digit * 3;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
}

// EAN-8 check digit generation
function generateEAN8CheckDigit(number) {
    if (number.length !== 7) return '';
    
    let sum = 0;
    for (let i = 0; i < number.length; i++) {
        const digit = parseInt(number[i]);
        sum += (i % 2 === 0) ? digit * 3 : digit * 1;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
}

// Validate barcode format
function validateBarcodeFormat(barcode, format) {
    const result = {
        isValid: true,
        errors: [],
        warnings: [],
        type: 'unknown',
        checkDigitValid: false
    };
    
    if (!barcode || typeof barcode !== 'string') {
        result.isValid = false;
        result.errors.push('Barcode must be a non-empty string');
        return result;
    }
    
    const cleanBarcode = barcode.trim();
    
    // Determine format if not specified
    if (!format) {
        if (cleanBarcode.length === 8 && /^\d{8}$/.test(cleanBarcode)) {
            format = 'EAN-8';
        } else if (cleanBarcode.length === 12 && /^\d{12}$/.test(cleanBarcode)) {
            format = 'UPC-A';
        } else if (cleanBarcode.length === 8 && /^[0-9A-Z\-\. \$\/\+\%]+$/.test(cleanBarcode)) {
            format = 'UPC-E';
        } else if (cleanBarcode.length === 13 && /^\d{13}$/.test(cleanBarcode)) {
            format = 'EAN-13';
        } else if (cleanBarcode.startsWith('QR')) {
            format = 'QR';
        } else {
            format = 'Code128';
        }
    }
    
    result.type = format;
    
    // Validate based on format
    switch (format) {
        case 'EAN-8':
            if (!/^\d{8}$/.test(cleanBarcode)) {
                result.isValid = false;
                result.errors.push('EAN-8 must be exactly 8 digits');
            }
            result.checkDigitValid = validateEAN8CheckDigit(cleanBarcode);
            break;
            
        case 'EAN-13':
            if (!/^\d{13}$/.test(cleanBarcode)) {
                result.isValid = false;
                result.errors.push('EAN-13 must be exactly 13 digits');
            }
            result.checkDigitValid = validateEAN13CheckDigit(cleanBarcode);
            break;
            
        case 'UPC-A':
            if (!/^\d{12}$/.test(cleanBarcode)) {
                result.isValid = false;
                result.errors.push('UPC-A must be exactly 12 digits');
            }
            result.checkDigitValid = validateUPCACheckDigit(cleanBarcode);
            break;
            
        case 'UPC-E':
            if (cleanBarcode.length < 6 || cleanBarcode.length > 8) {
                result.isValid = false;
                result.errors.push('UPC-E must be 6-8 characters');
            }
            break;
            
        case 'Code128':
            if (!/^[0-9A-Z\-\. \$\/\+\%]+$/.test(cleanBarcode)) {
                result.isValid = false;
                result.errors.push('Code128 contains invalid characters');
            }
            break;
            
        case 'QR':
            if (cleanBarcode.length > 4296) {
                result.isValid = false;
                result.errors.push('QR code data too long');
            }
            break;
            
        default:
            result.warnings.push(`Unknown format: ${format}`);
    }
    
    return result;
}

// Validate check digits
function validateEAN13CheckDigit(barcode) {
    if (barcode.length !== 13) return false;
    
    const numbers = barcode.substring(0, 12);
    const checkDigit = parseInt(barcode[12]);
    
    let sum = 0;
    for (let i = 0; i < numbers.length; i++) {
        const digit = parseInt(numbers[i]);
        sum += (i % 2 === 0) ? digit * 1 : digit * 3;
    }
    
    const calculatedCheck = (10 - (sum % 10)) % 10;
    return checkDigit === calculatedCheck;
}

function validateEAN8CheckDigit(barcode) {
    if (barcode.length !== 8) return false;
    
    const numbers = barcode.substring(0, 7);
    const checkDigit = parseInt(barcode[7]);
    
    let sum = 0;
    for (let i = 0; i < numbers.length; i++) {
        const digit = parseInt(numbers[i]);
        sum += (i % 2 === 0) ? digit * 3 : digit * 1;
    }
    
    const calculatedCheck = (10 - (sum % 10)) % 10;
    return checkDigit === calculatedCheck;
}

function validateUPCACheckDigit(barcode) {
    if (barcode.length !== 12) return false;
    
    const numbers = barcode.substring(0, 11);
    const checkDigit = parseInt(barcode[11]);
    
    let sum = 0;
    for (let i = 0; i < numbers.length; i++) {
        const digit = parseInt(numbers[i]);
        sum += (i % 2 === 0) ? digit * 3 : digit * 1;
    }
    
    const calculatedCheck = (10 - (sum % 10)) % 10;
    return checkDigit === calculatedCheck;
}

/**
 * Analytics and Reporting Endpoints
 */

// GET - Sales performance by category
app.get("/analytics/sales-by-category", function (req, res) {
    const { start_date, end_date, store_id } = req.query;
    
    // This would integrate with the transactions API to get sales data
    // For now, returning a sample response
    res.json({
        period: {
            start_date: start_date,
            end_date: end_date
        },
        store_id: store_id,
        categories: [
            { category: "formal_shirts", sales: 125000, units: 250, avg_price: 500 },
            { category: "casual_pants", sales: 98000, units: 196, avg_price: 500 },
            { category: "accessories", sales: 45000, units: 450, avg_price: 100 }
        ],
        total_sales: 268000,
        total_units: 896,
        overall_avg_price: 299
    });
});

// GET - Inventory turnover report
app.get("/analytics/inventory-turnover", function (req, res) {
    const { category, period_days } = req.query;
    const days = parseInt(period_days) || 30;
    
    // This would calculate actual turnover rates
    res.json({
        period_days: days,
        category: category || "all",
        turnover_rates: {
            formal_shirts: 4.2,
            casual_pants: 3.8,
            accessories: 6.1,
            footwear: 2.9
        },
        days_in_stock: {
            formal_shirts: 87,
            casual_pants: 96,
            accessories: 60,
            footwear: 126
        },
        recommendations: [
            "Increase inventory for accessories (high turnover)",
            "Consider reducing footwear stock (low turnover)",
            "Monitor formal shirts closely (optimal turnover)"
        ]
    });
});
