/**
 * Comprehensive Promotion Engine for StyleMine
 * Handles seasonal discounts, promotions, campaigns, and business intelligence
 */

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const validator = require("validator");
const Datastore = require("@seald-io/nedb");
const async = require("async");

const app = express();
app.use(bodyParser.json());

const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

// Database paths for promotion system
const dbPaths = {
    seasonal_campaigns: path.join(appData, appName, "server", "databases", "seasonal_campaigns.db"),
    promotion_rules: path.join(appData, appName, "server", "databases", "promotion_rules.db"),
    customer_segments: path.join(appData, appName, "server", "databases", "customer_segments.db"),
    promotion_analytics: path.join(appData, appName, "server", "databases", "promotion_analytics.db"),
    ab_testing: path.join(appData, appName, "server", "databases", "ab_testing.db"),
    promotion_conflicts: path.join(appData, appName, "server", "databases", "promotion_conflicts.db"),
    item_discounts: path.join(appData, appName, "server", "databases", "item_discounts.db"),
    cart_item_discounts: path.join(appData, appName, "server", "databases", "cart_item_discounts.db")
};

const { getDatabase } = require('./database_utils');

// Initialize promotion databases
const promotionDBs = {};
Object.keys(dbPaths).forEach(key => {
    promotionDBs[key] = getDatabase(dbPaths[key]);
    promotionDBs[key].ensureIndex({ fieldName: "_id", unique: true });
});

module.exports = app;

/**
 * SEASONAL CAMPAIGN MANAGEMENT
 */

// GET - Get all active seasonal campaigns
app.get("/promotions/campaigns/active", function (req, res) {
    const now = new Date().toISOString();
    
    promotionDBs.seasonal_campaigns.find({
        $and: [
            { "timing.start_date": { $lte: now } },
            { "timing.end_date": { $gte: now } },
            { "status.is_active": true }
        ]
    }, function (err, campaigns) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.send(campaigns);
        }
    });
});

// POST - Create seasonal campaign
app.post("/promotions/campaigns/create", function (req, res) {
    const campaign = {
        campaign_id: `CAMP${Date.now()}`,
        campaign_name: validator.escape(req.body.campaign_name || ""),
        campaign_type: validator.escape(req.body.campaign_type || "seasonal"),
        season: validator.escape(req.body.season || ""),
        festival: validator.escape(req.body.festival || ""),
        
        // Campaign Details
        campaign_details: {
            description: validator.escape(req.body.description || ""),
            banner_image: validator.escape(req.body.banner_image || ""),
            terms_conditions: validator.escape(req.body.terms_conditions || ""),
            min_order_value: parseFloat(req.body.min_order_value) || 0,
            max_discount_amount: parseFloat(req.body.max_discount_amount) || 0,
            usage_limit_per_customer: parseInt(req.body.usage_limit_per_customer) || 1,
            total_usage_limit: parseInt(req.body.total_usage_limit) || 1000
        },
        
        // Timing and Scheduling
        timing: {
            start_date: req.body.start_date,
            end_date: req.body.end_date,
            timezone: "Asia/Kolkata",
            is_active: true,
            is_recurring: req.body.is_recurring || false,
            recurring_pattern: req.body.recurring_pattern || null,
            early_bird_access: {
                enabled: req.body.early_bird_enabled || false,
                loyalty_tier_required: req.body.early_bird_tier || null,
                access_hours_before: parseInt(req.body.early_bird_hours) || 24
            }
        },
        
        // Discount Structure
        discount_structure: {
            discount_type: validator.escape(req.body.discount_type || "percentage"),
            discount_value: parseFloat(req.body.discount_value) || 0,
            applicable_categories: req.body.applicable_categories || [],
            applicable_products: req.body.applicable_products || [],
            excluded_products: req.body.excluded_products || [],
            minimum_quantity: parseInt(req.body.minimum_quantity) || 1,
            maximum_quantity: parseInt(req.body.maximum_quantity) || 999,
            tiered_discounts: req.body.tiered_discounts || [],
            buy_x_get_y: req.body.buy_x_get_y || null
        },
        
        // Targeting and Segmentation
        targeting: {
            customer_segments: req.body.customer_segments || ["all"],
            specific_customers: req.body.specific_customers || [],
            new_customers_only: req.body.new_customers_only || false,
            loyalty_tiers: req.body.loyalty_tiers || ["bronze", "silver", "gold", "platinum", "diamond"],
            minimum_loyalty_points: parseInt(req.body.minimum_loyalty_points) || 0,
            first_purchase_only: req.body.first_purchase_only || false,
            geographic_restrictions: req.body.geographic_restrictions || [],
            exclude_segments: req.body.exclude_segments || [],
            age_groups: req.body.age_groups || [],
            gender_restrictions: req.body.gender_restrictions || []
        },
        
        // Stacking Rules
        stacking: {
            can_stack_with_loyalty: req.body.can_stack_with_loyalty || true,
            can_stack_with_coupons: req.body.can_stack_with_coupons || false,
            can_stack_with_other_promotions: req.body.can_stack_with_other_promotions || false,
            priority_order: parseInt(req.body.priority_order) || 1,
            conflict_resolution: req.body.conflict_resolution || "highest_discount"
        },
        
        // Performance Tracking
        performance: {
            views: 0,
            clicks: 0,
            conversions: 0,
            revenue_generated: 0,
            discount_amount_given: 0,
            roi: 0,
            conversion_rate: 0,
            customer_satisfaction: 0,
            return_rate: 0
        },
        
        // Campaign Templates
        templates: {
            is_template: req.body.is_template || false,
            template_name: req.body.template_name || null,
            reusable: req.body.reusable || false
        },
        
        // Status and Approval
        status: {
            is_active: true,
            created_by: validator.escape(req.body.created_by || "admin"),
            approved_by: null,
            approval_status: "pending",
            approval_date: null,
            notes: validator.escape(req.body.notes || "")
        },
        
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    promotionDBs.seasonal_campaigns.insert(campaign, function (err, newCampaign) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.status(201).json({
                success: true,
                campaign_id: campaign.campaign_id,
                message: "Campaign created successfully",
                campaign: newCampaign
            });
        }
    });
});

// GET - Get campaign templates
app.get("/promotions/campaigns/templates", function (req, res) {
    promotionDBs.seasonal_campaigns.find({
        "templates.is_template": true
    }, function (err, templates) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.send(templates);
        }
    });
});

// POST - Create campaign from template
app.post("/promotions/campaigns/create-from-template", function (req, res) {
    const { template_id, campaign_data } = req.body;
    
    promotionDBs.seasonal_campaigns.findOne({ _id: template_id }, function (err, template) {
        if (err || !template) {
            res.status(404).json({ error: "Template not found" });
            return;
        }
        
        // Create new campaign from template
        const newCampaign = {
            ...template,
            _id: undefined,
            campaign_id: `CAMP${Date.now()}`,
            campaign_name: campaign_data.campaign_name || `${template.campaign_name} - ${new Date().toLocaleDateString()}`,
            timing: {
                ...template.timing,
                start_date: campaign_data.start_date || new Date().toISOString(),
                end_date: campaign_data.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            performance: {
                views: 0,
                clicks: 0,
                conversions: 0,
                revenue_generated: 0,
                discount_amount_given: 0,
                roi: 0,
                conversion_rate: 0,
                customer_satisfaction: 0,
                return_rate: 0
            },
            status: {
                ...template.status,
                is_active: true,
                approval_status: "pending",
                approved_by: null,
                approval_date: null
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        promotionDBs.seasonal_campaigns.insert(newCampaign, function (insertErr, createdCampaign) {
            if (insertErr) {
                console.error(insertErr);
                res.status(500).json({ error: "Failed to create campaign from template" });
            } else {
                res.status(201).json({
                    success: true,
                    campaign_id: createdCampaign.campaign_id,
                    message: "Campaign created from template successfully",
                    campaign: createdCampaign
                });
            }
        });
    });
});

/**
 * PROMOTION RULES ENGINE
 */

// GET - Get all promotion rules
app.get("/promotions/rules", function (req, res) {
    const { category, active_only } = req.query;
    let query = {};
    
    if (active_only === 'true') {
        query['status.is_active'] = true;
    }
    
    if (category) {
        query['applicable_categories'] = category;
    }
    
    promotionDBs.promotion_rules.find(query, function (err, rules) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.send(rules);
        }
    });
});

// POST - Create promotion rule
app.post("/promotions/rules/create", function (req, res) {
    const rule = {
        rule_id: `RULE${Date.now()}`,
        rule_name: validator.escape(req.body.rule_name || ""),
        rule_type: validator.escape(req.body.rule_type || "automatic"),
        rule_category: validator.escape(req.body.rule_category || "discount"),
        
        // Rule Configuration
        rule_config: {
            description: validator.escape(req.body.description || ""),
            trigger_conditions: req.body.trigger_conditions || {},
            action_parameters: req.body.action_parameters || {},
            priority: parseInt(req.body.priority) || 1,
            is_stackable: req.body.is_stackable !== false
        },
        
        // Applicability
        applicability: {
            applicable_categories: req.body.applicable_categories || [],
            applicable_products: req.body.applicable_products || [],
            applicable_customers: req.body.applicable_customers || [],
            customer_segments: req.body.customer_segments || [],
            minimum_order_value: parseFloat(req.body.minimum_order_value) || 0,
            maximum_order_value: parseFloat(req.body.maximum_order_value) || 0,
            time_restrictions: req.body.time_restrictions || {},
            quantity_restrictions: req.body.quantity_restrictions || {}
        },
        
        // Discount Calculation
        discount_calculation: {
            calculation_method: validator.escape(req.body.calculation_method || "percentage"),
            discount_value: parseFloat(req.body.discount_value) || 0,
            maximum_discount: parseFloat(req.body.maximum_discount) || 0,
            tiered_structure: req.body.tiered_structure || [],
            conditional_logic: req.body.conditional_logic || {}
        },
        
        // Validity
        validity: {
            start_date: req.body.start_date,
            end_date: req.body.end_date,
            usage_limit: parseInt(req.body.usage_limit) || 0,
            customer_usage_limit: parseInt(req.body.customer_usage_limit) || 1,
            is_active: true
        },
        
        // Analytics
        analytics: {
            times_triggered: 0,
            total_discount_given: 0,
            revenue_impact: 0,
            customer_satisfaction: 0
        },
        
        status: {
            is_active: true,
            created_by: validator.escape(req.body.created_by || "system"),
            created_at: new Date().toISOString()
        }
    };

    promotionDBs.promotion_rules.insert(rule, function (err, newRule) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.status(201).json({
                success: true,
                rule_id: rule.rule_id,
                message: "Promotion rule created successfully",
                rule: newRule
            });
        }
    });
});

// POST - Apply promotion rules to cart
app.post("/promotions/rules/apply", function (req, res) {
    const { cart_items, customer_id, order_value, customer_loyalty_tier } = req.body;
    
    // Get all active promotion rules
    promotionDBs.promotion_rules.find({ "status.is_active": true }, function (err, rules) {
        if (err) {
            res.status(500).json({ error: "Failed to fetch promotion rules" });
            return;
        }
        
        const applicablePromotions = [];
        let totalDiscount = 0;
        const discountBreakdown = {};
        
        // Evaluate each rule against the cart
        rules.forEach(rule => {
            if (evaluatePromotionRule(rule, cart_items, customer_id, order_value, customer_loyalty_tier)) {
                const discount = calculatePromotionDiscount(rule, cart_items, order_value);
                if (discount > 0) {
                    applicablePromotions.push({
                        rule_id: rule.rule_id,
                        rule_name: rule.rule_name,
                        discount_amount: discount,
                        discount_type: rule.discount_calculation.calculation_method,
                        priority: rule.rule_config.priority
                    });
                    totalDiscount += discount;
                    discountBreakdown[rule.rule_id] = discount;
                }
            }
        });
        
        // Sort by priority and resolve conflicts
        const resolvedPromotions = resolvePromotionConflicts(applicablePromotions);
        
        res.json({
            success: true,
            applicable_promotions: resolvedPromotions,
            total_discount: totalDiscount,
            discount_breakdown: discountBreakdown,
            final_amount: order_value - totalDiscount
        });
    });
});

// Helper function to evaluate promotion rules
function evaluatePromotionRule(rule, cartItems, customerId, orderValue, loyaltyTier) {
    const config = rule.applicability;
    
    // Check time restrictions
    if (config.time_restrictions.start_date && new Date() < new Date(config.time_restrictions.start_date)) {
        return false;
    }
    if (config.time_restrictions.end_date && new Date() > new Date(config.time_restrictions.end_date)) {
        return false;
    }
    
    // Check order value restrictions
    if (config.minimum_order_value && orderValue < config.minimum_order_value) {
        return false;
    }
    if (config.maximum_order_value && orderValue > config.maximum_order_value) {
        return false;
    }
    
    // Check customer restrictions
    if (config.applicable_customers.length > 0 && !config.applicable_customers.includes(customerId)) {
        return false;
    }
    
    // Check category applicability
    if (config.applicable_categories.length > 0) {
        const hasApplicableCategory = cartItems.some(item => 
            config.applicable_categories.includes(item.category)
        );
        if (!hasApplicableCategory) {
            return false;
        }
    }
    
    return true;
}

// Helper function to calculate promotion discount
function calculatePromotionDiscount(rule, cartItems, orderValue) {
    const calc = rule.discount_calculation;
    let discount = 0;
    
    switch (calc.calculation_method) {
        case "percentage":
            discount = (orderValue * calc.discount_value) / 100;
            break;
        case "fixed_amount":
            discount = calc.discount_value;
            break;
        case "tiered":
            discount = calculateTieredDiscount(calc.tiered_structure, orderValue);
            break;
        case "buy_x_get_y":
            discount = calculateBXGYSDiscount(calc, cartItems);
            break;
    }
    
    // Apply maximum discount limit
    if (calc.maximum_discount > 0) {
        discount = Math.min(discount, calc.maximum_discount);
    }
    
    return discount;
}

// Helper function to resolve promotion conflicts
function resolvePromotionConflicts(promotions) {
    // Sort by priority (lower number = higher priority)
    promotions.sort((a, b) => a.priority - b.priority);
    
    // For now, allow stacking if explicitly allowed
    // In production, this would be more sophisticated
    return promotions;
}

/**
 * CUSTOMER SEGMENTATION
 */

// GET - Get customer segments
app.get("/promotions/segments", function (req, res) {
    promotionDBs.customer_segments.find({}, function (err, segments) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.send(segments);
        }
    });
});

// POST - Create customer segment
app.post("/promotions/segments/create", function (req, res) {
    const segment = {
        segment_id: `SEG${Date.now()}`,
        segment_name: validator.escape(req.body.segment_name || ""),
        segment_type: validator.escape(req.body.segment_type || "behavioral"),
        
        // Segment Criteria
        criteria: {
            demographics: req.body.demographics || {},
            behavioral: req.body.behavioral || {},
            purchase_history: req.body.purchase_history || {},
            loyalty_data: req.body.loyalty_data || {},
            geographic: req.body.geographic || {},
            psychographic: req.body.psychographic || {}
        },
        
        // Segment Configuration
        config: {
            is_dynamic: req.body.is_dynamic || true,
            update_frequency: validator.escape(req.body.update_frequency || "daily"),
            auto_segmentation: req.body.auto_segmentation || true,
            minimum_segment_size: parseInt(req.body.minimum_segment_size) || 10
        },
        
        // Segment Statistics
        statistics: {
            total_customers: 0,
            average_order_value: 0,
            purchase_frequency: 0,
            loyalty_score: 0,
            lifetime_value: 0
        },
        
        // Targeting Rules
        targeting: {
            promotional_eligibility: req.body.promotional_eligibility !== false,
            preferred_discount_types: req.body.preferred_discount_types || [],
            communication_preferences: req.body.communication_preferences || {},
            sensitivity_analysis: req.body.sensitivity_analysis || {}
        },
        
        status: {
            is_active: true,
            created_by: validator.escape(req.body.created_by || "admin"),
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString()
        }
    };

    promotionDBs.customer_segments.insert(segment, function (err, newSegment) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.status(201).json({
                success: true,
                segment_id: segment.segment_id,
                message: "Customer segment created successfully",
                segment: newSegment
            });
        }
    });
});

// POST - Update customer segment membership
app.post("/promotions/segments/update-membership", function (req, res) {
    const { segment_id, customer_updates } = req.body;
    
    promotionDBs.customer_segments.findOne({ segment_id }, function (err, segment) {
        if (err || !segment) {
            res.status(404).json({ error: "Segment not found" });
            return;
        }
        
        // Update segment statistics based on customer changes
        const updatedStats = calculateSegmentStatistics(segment, customer_updates);
        
        promotionDBs.customer_segments.update(
            { segment_id },
            {
                $set: {
                    statistics: updatedStats,
                    'status.last_updated': new Date().toISOString()
                }
            },
            {},
            function (updateErr, numReplaced) {
                if (updateErr) {
                    res.status(500).json({ error: "Failed to update segment membership" });
                } else {
                    res.json({
                        success: true,
                        message: "Segment membership updated successfully",
                        updated_statistics: updatedStats
                    });
                }
            }
        );
    });
});

/**
 * PROMOTION ANALYTICS AND BUSINESS INTELLIGENCE
 */

// GET - Promotion performance analytics
app.get("/promotions/analytics/performance", function (req, res) {
    const { start_date, end_date, campaign_id, segment_id } = req.query;
    
    let query = {};
    if (campaign_id) query.campaign_id = campaign_id;
    if (segment_id) query.segment_id = segment_id;
    
    if (start_date || end_date) {
        query.date = {};
        if (start_date) query.date.$gte = start_date;
        if (end_date) query.date.$lte = end_date;
    }
    
    promotionDBs.promotion_analytics.find(query, function (err, analytics) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            const aggregated = aggregatePromotionAnalytics(analytics);
            res.json(aggregated);
        }
    });
});

// POST - Track promotion interaction
app.post("/promotions/analytics/track", function (req, res) {
    const {
        campaign_id,
        interaction_type, // 'view', 'click', 'application', 'conversion'
        customer_id,
        order_value,
        discount_applied,
        timestamp
    } = req.body;
    
    const analyticsRecord = {
        campaign_id,
        interaction_type,
        customer_id,
        order_value: parseFloat(order_value) || 0,
        discount_applied: parseFloat(discount_applied) || 0,
        timestamp: timestamp || new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
    };
    
    promotionDBs.promotion_analytics.insert(analyticsRecord, function (err, record) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to track promotion interaction" });
        } else {
            // Update campaign performance metrics
            updateCampaignMetrics(campaign_id, interaction_type, order_value, discount_applied);
            res.json({ success: true, message: "Interaction tracked successfully" });
        }
    });
});

// GET - ROI analysis
app.get("/promotions/analytics/roi", function (req, res) {
    const { start_date, end_date, campaign_type } = req.query;
    
    // Aggregate ROI data
    promotionDBs.promotion_analytics.find({
        date: {
            $gte: start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            $lte: end_date || new Date().toISOString().split('T')[0]
        }
    }, function (err, analytics) {
        if (err) {
            res.status(500).json({ error: "Failed to fetch ROI data" });
            return;
        }
        
        const roiAnalysis = calculateROIAnalysis(analytics, campaign_type);
        res.json(roiAnalysis);
    });
});

// GET - A/B testing results
app.get("/promotions/ab-testing/results", function (req, res) {
    const { test_id, status } = req.query;
    
    let query = {};
    if (test_id) query.test_id = test_id;
    if (status) query.status = status;
    
    promotionDBs.ab_testing.find(query, function (err, tests) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.send(tests);
        }
    });
});

// POST - Create A/B test
app.post("/promotions/ab-testing/create", function (req, res) {
    const test = {
        test_id: `ABTEST${Date.now()}`,
        test_name: validator.escape(req.body.test_name || ""),
        test_type: validator.escape(req.body.test_type || "promotion_comparison"),
        
        // Test Configuration
        test_config: {
            hypothesis: validator.escape(req.body.hypothesis || ""),
            control_variant: req.body.control_variant,
            test_variants: req.body.test_variants || [],
            traffic_split: req.body.traffic_split || { control: 50, test: 50 },
            sample_size: parseInt(req.body.sample_size) || 1000,
            confidence_level: parseFloat(req.body.confidence_level) || 95,
            test_duration_days: parseInt(req.body.test_duration_days) || 14
        },
        
        // Test Metrics
        metrics: {
            primary_metric: validator.escape(req.body.primary_metric || "conversion_rate"),
            secondary_metrics: req.body.secondary_metrics || [],
            success_criteria: req.body.success_criteria || {}
        },
        
        // Test Status
        status: {
            is_active: true,
            start_date: req.body.start_date || new Date().toISOString(),
            end_date: req.body.end_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            current_phase: "running", // "setup", "running", "analysis", "completed"
            results: {}
        },
        
        created_at: new Date().toISOString()
    };

    promotionDBs.ab_testing.insert(test, function (err, newTest) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.status(201).json({
                success: true,
                test_id: test.test_id,
                message: "A/B test created successfully",
                test: newTest
            });
        }
    });
});

/**
 * ITEM-LEVEL DISCOUNT SERVICE
 */

class ItemDiscountService {
    constructor() {
        this.discountCache = new Map();
        this.bulkDiscountCache = new Map();
    }

    // Get applicable item discounts for a product
    async getApplicableItemDiscounts(productId, customerId, quantity = 1) {
        const cacheKey = `${productId}_${customerId}_${quantity}`;
        if (this.discountCache.has(cacheKey)) {
            return this.discountCache.get(cacheKey);
        }

        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            const query = {
                product_id: productId,
                'status.is_active': true,
                'conditions.valid_from': { $lte: now },
                'conditions.valid_until': { $gte: now },
                'conditions.minimum_quantity': { $lte: quantity },
                'conditions.maximum_quantity': { $gte: quantity }
            };

            // Add customer segment check if customerId provided
            if (customerId) {
                query.$or = [
                    { 'conditions.customer_segments': 'all' },
                    { 'conditions.customer_segments': { $in: ['vip', 'loyal', 'regular'] } } // Default segments
                ];
            }

            promotionDBs.item_discounts.find(query, (err, discounts) => {
                if (err) {
                    reject(err);
                } else {
                    // Cache the result
                    this.discountCache.set(cacheKey, discounts);
                    resolve(discounts);
                }
            });
        });
    }

    // Calculate discount amount for a cart item
    calculateDiscountAmount(discount, cartItem) {
        const { discount_type, discount_value } = discount;
        const { price, quantity } = cartItem;

        switch (discount_type) {
            case 'percentage':
                return (price * quantity * discount_value) / 100;

            case 'fixed_amount':
                return Math.min(discount_value * quantity, price * quantity);

            case 'bulk':
                return this.calculateBulkDiscountAmount(discount, cartItem);

            default:
                return 0;
        }
    }

    // Calculate bulk discount amount
    calculateBulkDiscountAmount(discount, cartItem) {
        const { bulk_rules } = discount;
        const { price, quantity } = cartItem;

        if (!bulk_rules) return 0;

        switch (bulk_rules.type) {
            case 'buy_x_get_y_free':
                const { buy_quantity, get_quantity } = bulk_rules;
                const sets = Math.floor(quantity / buy_quantity);
                const freeItems = sets * get_quantity;
                return Math.min(freeItems * price, price * quantity);

            case 'quantity_discount':
                const discountPercentage = bulk_rules.discount_percentage || discount.discount_value;
                return (price * quantity * discountPercentage) / 100;

            case 'step_discount':
                // Implement step discount logic
                return this.calculateStepDiscount(bulk_rules, cartItem);

            default:
                return 0;
        }
    }

    // Calculate step discount (progressive discounts)
    calculateStepDiscount(bulkRules, cartItem) {
        const { price, quantity } = cartItem;
        let discountAmount = 0;

        // Assume bulk_rules has steps array with quantity thresholds and discounts
        const steps = bulkRules.steps || [];
        steps.sort((a, b) => b.quantity_threshold - a.quantity_threshold);

        for (const step of steps) {
            if (quantity >= step.quantity_threshold) {
                discountAmount = (price * quantity * step.discount_percentage) / 100;
                break;
            }
        }

        return discountAmount;
    }

    // Apply item discounts to cart items
    async applyItemDiscounts(cartItems, customerId, includeBulkDiscounts = true) {
        const itemDiscounts = {};

        for (let i = 0; i < cartItems.length; i++) {
            const cartItem = cartItems[i];
            const discounts = await this.getApplicableItemDiscounts(
                cartItem.product_id,
                customerId,
                cartItem.quantity
            );

            if (discounts.length > 0) {
                // Sort by priority (highest discount first, then by type)
                discounts.sort((a, b) => {
                    if (a.discount_type === 'bulk' && includeBulkDiscounts) return -1;
                    if (b.discount_type === 'bulk' && includeBulkDiscounts) return 1;
                    return b.discount_value - a.discount_value;
                });

                const applicableDiscount = discounts[0]; // Take the best discount
                const discountAmount = this.calculateDiscountAmount(applicableDiscount, cartItem);

                if (discountAmount > 0) {
                    itemDiscounts[i] = {
                        discount_id: applicableDiscount.discount_id,
                        type: applicableDiscount.discount_type,
                        value: applicableDiscount.discount_value,
                        amount: discountAmount
                    };
                }
            }
        }

        return itemDiscounts;
    }

    // Validate manual discount application
    async validateManualDiscount(productId, discountType, discountValue, quantity, customerId) {
        const discounts = await this.getApplicableItemDiscounts(productId, customerId, quantity);

        // Check if the manual discount is reasonable compared to automatic discounts
        const maxAutoDiscount = Math.max(
            ...discounts.map(d => this.calculateDiscountAmount(d, { price: 1000, quantity, product_id: productId }))
        );

        const manualDiscountAmount = discountType === 'percentage'
            ? (1000 * quantity * discountValue) / 100
            : discountValue * quantity;

        return {
            is_valid: manualDiscountAmount <= maxAutoDiscount * 1.5, // Allow 50% more than auto
            max_allowed_discount: maxAutoDiscount,
            suggested_discount: maxAutoDiscount
        };
    }

    // Clear discount caches
    clearCaches() {
        this.discountCache.clear();
        this.bulkDiscountCache.clear();
    }
}

// Initialize the item discount service
const itemDiscountService = new ItemDiscountService();

/**
 * ITEM-LEVEL DISCOUNT ENDPOINTS
 */

// GET - Get item discount rules for a product
app.get("/promotions/items/rules", function (req, res) {
    const { product_id, customer_id } = req.query;

    if (!product_id) {
        return res.status(400).json({ error: "product_id is required" });
    }

    itemDiscountService.getApplicableItemDiscounts(product_id, customer_id)
        .then(discounts => {
            res.json({
                success: true,
                product_id,
                applicable_discounts: discounts
            });
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: "Failed to fetch item discount rules" });
        });
});

// POST - Create item discount rule
app.post("/promotions/items/rules", function (req, res) {
    const discount = {
        discount_id: `DISC_ITEM_${Date.now()}`,
        product_id: validator.escape(req.body.product_id || ""),
        discount_type: validator.escape(req.body.discount_type || "percentage"),
        discount_value: parseFloat(req.body.discount_value) || 0,
        conditions: {
            minimum_quantity: parseInt(req.body.minimum_quantity) || 1,
            maximum_quantity: parseInt(req.body.maximum_quantity) || 999,
            customer_segments: req.body.customer_segments || ["all"],
            valid_from: req.body.valid_from || new Date().toISOString(),
            valid_until: req.body.valid_until || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        },
        bulk_rules: req.body.bulk_rules || null,
        status: {
            is_active: true,
            created_at: new Date().toISOString(),
            created_by: validator.escape(req.body.created_by || "admin")
        },
        analytics: {
            times_applied: 0,
            total_discount_given: 0,
            revenue_impact: 0
        }
    };

    promotionDBs.item_discounts.insert(discount, function (err, newDiscount) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.status(201).json({
                success: true,
                discount_id: discount.discount_id,
                message: "Item discount rule created successfully",
                discount: newDiscount
            });
        }
    });
});

// POST - Apply item discounts to cart
app.post("/promotions/items/apply", function (req, res) {
    const { cart_items, customer_id, apply_bulk_discounts } = req.body;

    if (!cart_items || !Array.isArray(cart_items)) {
        return res.status(400).json({ error: "cart_items array is required" });
    }

    const includeBulk = apply_bulk_discounts !== false;

    itemDiscountService.applyItemDiscounts(cart_items, customer_id, includeBulk)
        .then(itemDiscounts => {
            const totalItemDiscount = Object.values(itemDiscounts).reduce((sum, discount) => sum + discount.amount, 0);

            res.json({
                success: true,
                item_discounts: itemDiscounts,
                total_item_discount: totalItemDiscount,
                bulk_discounts_applied: includeBulk
            });
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: "Failed to apply item discounts" });
        });
});

// POST - Validate manual item discount
app.post("/promotions/items/validate", function (req, res) {
    const { product_id, discount_type, discount_value, quantity, customer_id } = req.body;

    if (!product_id || !discount_type || discount_value === undefined || !quantity) {
        return res.status(400).json({ error: "product_id, discount_type, discount_value, and quantity are required" });
    }

    itemDiscountService.validateManualDiscount(product_id, discount_type, discount_value, quantity, customer_id)
        .then(validation => {
            res.json({
                success: true,
                validation: validation
            });
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: "Failed to validate discount" });
        });
});

/**
 * HELPER FUNCTIONS
 */

// Calculate tiered discount
function calculateTieredDiscount(tieredStructure, orderValue) {
    let discount = 0;
    for (const tier of tieredStructure) {
        if (orderValue >= tier.minimum_order_value) {
            discount = tier.discount_amount;
        }
    }
    return discount;
}

// Calculate Buy X Get Y discount
function calculateBXGYSDiscount(ruleConfig, cartItems) {
    // Implementation for Buy X Get Y promotions
    const { buy_quantity, get_quantity, discount_percentage } = ruleConfig;
    let totalDiscount = 0;
    
    cartItems.forEach(item => {
        const eligibleSets = Math.floor(item.quantity / buy_quantity);
        if (eligibleSets > 0) {
            const freeItems = eligibleSets * get_quantity;
            totalDiscount += freeItems * item.price * (discount_percentage / 100);
        }
    });
    
    return totalDiscount;
}

// Calculate segment statistics
function calculateSegmentStatistics(segment, customerUpdates) {
    // Implementation to calculate segment statistics
    // This would integrate with customer data
    return segment.statistics;
}

// Aggregate promotion analytics
function aggregatePromotionAnalytics(analytics) {
    const aggregated = {
        total_interactions: analytics.length,
        total_revenue: 0,
        total_discounts: 0,
        conversion_rate: 0,
        average_order_value: 0,
        interaction_breakdown: {},
        roi_metrics: {}
    };
    
    analytics.forEach(record => {
        aggregated.total_revenue += record.order_value;
        aggregated.total_discounts += record.discount_applied;
        
        if (!aggregated.interaction_breakdown[record.interaction_type]) {
            aggregated.interaction_breakdown[record.interaction_type] = 0;
        }
        aggregated.interaction_breakdown[record.interaction_type]++;
    });
    
    // Calculate derived metrics
    const conversions = analytics.filter(a => a.interaction_type === 'conversion').length;
    aggregated.conversion_rate = analytics.length > 0 ? (conversions / analytics.length) * 100 : 0;
    aggregated.average_order_value = aggregated.total_revenue / analytics.length;
    aggregated.roi_metrics = {
        revenue_per_discount: aggregated.total_discounts > 0 ? aggregated.total_revenue / aggregated.total_discounts : 0,
        discount_rate: aggregated.total_revenue > 0 ? (aggregated.total_discounts / aggregated.total_revenue) * 100 : 0
    };
    
    return aggregated;
}

// Update campaign metrics
function updateCampaignMetrics(campaignId, interactionType, orderValue, discountApplied) {
    promotionDBs.seasonal_campaigns.findOne({ campaign_id: campaignId }, function (err, campaign) {
        if (err || !campaign) return;
        
        const metrics = campaign.performance;
        metrics[interaction_type + 's'] = (metrics[interaction_type + 's'] || 0) + 1;
        
        if (interactionType === 'conversion') {
            metrics.revenue_generated += orderValue;
            metrics.discount_amount_given += discountApplied;
            metrics.conversion_rate = (metrics.conversions / metrics.clicks) * 100;
            metrics.roi = metrics.revenue_generated / (metrics.discount_amount_given + 1);
        }
        
        promotionDBs.seasonal_campaigns.update(
            { campaign_id: campaignId },
            { $set: { performance: metrics, updated_at: new Date().toISOString() } },
            {}
        );
    });
}

// Calculate ROI analysis
function calculateROIAnalysis(analytics, campaignType) {
    const totalRevenue = analytics.reduce((sum, a) => sum + a.order_value, 0);
    const totalDiscounts = analytics.reduce((sum, a) => sum + a.discount_applied, 0);
    const conversions = analytics.filter(a => a.interaction_type === 'conversion').length;
    
    return {
        total_revenue: totalRevenue,
        total_discounts_given: totalDiscounts,
        net_revenue: totalRevenue - totalDiscounts,
        roi_percentage: totalDiscounts > 0 ? ((totalRevenue - totalDiscounts) / totalDiscounts) * 100 : 0,
        conversion_rate: (conversions / analytics.length) * 100,
        average_order_value: totalRevenue / analytics.length,
        discount_rate: totalRevenue > 0 ? (totalDiscounts / totalRevenue) * 100 : 0,
        recommendations: generateROIRecommendations(totalRevenue, totalDiscounts, conversions)
    };
}

// Generate ROI recommendations
function generateROIRecommendations(totalRevenue, totalDiscounts, conversions) {
    const recommendations = [];
    
    if (totalDiscounts / totalRevenue > 0.2) {
        recommendations.push("Consider reducing discount rates as they exceed 20% of revenue");
    }
    
    if (conversions < 10) {
        recommendations.push("Low conversion rate detected. Review promotion targeting and messaging");
    }
    
    return recommendations;
}