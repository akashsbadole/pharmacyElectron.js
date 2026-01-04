/**
 * Comprehensive Pricing Engine for StyleMine
 * Handles MRP compliance, dynamic pricing, competitor analysis, and price optimization
 */

const express = require("express");
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const path = require("path");
const validator = require("validator");
const async = require("async");
const crypto = require("crypto");

const app = express();
app.use(bodyParser.json());

const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

// Database paths for pricing system
const dbPaths = {
    pricing_history: path.join(appData, appName, "server", "databases", "pricing_history.db"),
    competitor_prices: path.join(appData, appName, "server", "databases", "competitor_prices.db"),
    pricing_rules: path.join(appData, appName, "server", "databases", "pricing_rules.db"),
    pricing_analytics: path.join(appData, appName, "server", "databases", "pricing_analytics.db"),
    mrp_compliance: path.join(appData, appName, "server", "databases", "mrp_compliance.db"),
    price_elasticity: path.join(appData, appName, "server", "databases", "price_elasticity.db"),
    dynamic_pricing: path.join(appData, appName, "server", "databases", "dynamic_pricing.db")
};

const { getDatabase } = require('./database_utils');

// Initialize pricing databases
const pricingDBs = {};
Object.keys(dbPaths).forEach(key => {
    pricingDBs[key] = getDatabase(dbPaths[key]);
    pricingDBs[key].ensureIndex({ fieldName: "_id", unique: true });
    if (key === 'pricing_history') {
        pricingDBs[key].ensureIndex({ fieldName: "product_id", unique: false });
        pricingDBs[key].ensureIndex({ fieldName: "timestamp", unique: false });
    }
});

module.exports = app;

/**
 * MRP (Maximum Retail Price) Management System
 */

// GET - Get MRP compliance report
app.get("/mrp/compliance-report", function (req, res) {
    const { start_date, end_date, category, severity } = req.query;
    
    let query = {};
    if (category) query.product_category = category;
    if (severity) query.severity_level = severity;
    
    if (start_date || end_date) {
        query.timestamp = {};
        if (start_date) query.timestamp.$gte = start_date;
        if (end_date) query.timestamp.$lte = end_date;
    }
    
    pricingDBs.mrp_compliance.find(query).sort({ timestamp: -1 }).exec(function (err, violations) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            const summary = {
                total_violations: violations.length,
                critical_violations: violations.filter(v => v.severity_level === 'critical').length,
                warning_violations: violations.filter(v => v.severity_level === 'warning').length,
                categories_affected: [...new Set(violations.map(v => v.product_category))],
                compliance_rate: calculateComplianceRate(violations)
            };
            
            res.json({
                summary: summary,
                violations: violations,
                generated_at: new Date().toISOString()
            });
        }
    });
});

// POST - Validate MRP compliance for product
app.post("/mrp/validate", function (req, res) {
    const { product_id, selling_price, mrp, category, user_id } = req.body;
    
    if (!product_id || !selling_price || !mrp) {
        res.status(400).json({ error: "Missing required fields: product_id, selling_price, mrp" });
        return;
    }
    
    const violation = {
        product_id: product_id,
        mrp: parseFloat(mrp),
        selling_price: parseFloat(selling_price),
        variance_amount: parseFloat(selling_price) - parseFloat(mrp),
        variance_percentage: ((parseFloat(selling_price) - parseFloat(mrp)) / parseFloat(mrp)) * 100,
        severity_level: calculateViolationSeverity(parseFloat(selling_price), parseFloat(mrp)),
        timestamp: new Date().toISOString(),
        user_id: user_id || 'system',
        status: 'detected'
    };
    
    if (violation.variance_amount > 0) {
        // Log violation
        pricingDBs.mrp_compliance.insert(violation, function (err, newViolation) {
            if (err) {
                console.error(err);
                res.status(500).json({ error: "Failed to log MRP violation" });
            } else {
                res.json({
                    compliant: false,
                    violation: newViolation,
                    message: "MRP violation detected and logged"
                });
            }
        });
    } else {
        res.json({
            compliant: true,
            message: "MRP compliance validated"
        });
    }
});

// GET - Bulk MRP update and management
app.post("/mrp/bulk-update", function (req, res) {
    const { updates, update_reason, user_id } = req.body;
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
        res.status(400).json({ error: "Invalid or empty updates array" });
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
        const { product_id, new_mrp, old_mrp } = update;
        
        if (!product_id || !new_mrp) {
            results.failed.push({
                product_id: product_id,
                error: "Missing required fields: product_id, new_mrp"
            });
            results.summary.failed_updates++;
            completed++;
            return;
        }
        
        // Log MRP change in pricing history
        const priceChange = {
            product_id: product_id,
            change_type: 'mrp_update',
            old_value: parseFloat(old_mrp) || 0,
            new_value: parseFloat(new_mrp),
            change_reason: update_reason || 'bulk_update',
            change_percentage: old_mrp ? ((new_mrp - old_mrp) / old_mrp) * 100 : 0,
            timestamp: new Date().toISOString(),
            user_id: user_id || 'system',
            approval_required: Math.abs(parseFloat(new_mrp) - parseFloat(old_mrp || 0)) > (parseFloat(old_mrp || 0) * 0.1), // 10% change requires approval
            status: 'completed'
        };
        
        pricingDBs.pricing_history.insert(priceChange, function (err, historyRecord) {
            if (err) {
                results.failed.push({
                    product_id: product_id,
                    error: "Failed to log price change"
                });
                results.summary.failed_updates++;
            } else {
                results.successful.push({
                    product_id: product_id,
                    old_mrp: old_mrp,
                    new_mrp: new_mrp,
                    history_id: historyRecord._id
                });
                results.summary.successful_updates++;
            }
            
            completed++;
            if (completed === updates.length) {
                res.json(results);
            }
        });
    });
});

/**
 * Dynamic Pricing Engine
 */

// POST - Calculate dynamic price
app.post("/pricing/calculate-dynamic", function (req, res) {
    const { product_id, base_price, customer_id, location, quantity, timestamp } = req.body;
    
    if (!product_id || !base_price) {
        res.status(400).json({ error: "Missing required fields: product_id, base_price" });
        return;
    }
    
    // Get all active pricing rules
    pricingDBs.pricing_rules.find({ "status.is_active": true }, function (err, rules) {
        if (err) {
            res.status(500).json({ error: "Failed to fetch pricing rules" });
            return;
        }
        
        calculateDynamicPrice({
            product_id: product_id,
            base_price: parseFloat(base_price),
            customer_id: customer_id,
            location: location,
            quantity: parseInt(quantity) || 1,
            timestamp: timestamp || new Date().toISOString(),
            rules: rules
        }).then(result => {
            res.json(result);
        }).catch(error => {
            console.error('Dynamic pricing calculation error:', error);
            res.status(500).json({ error: "Dynamic pricing calculation failed" });
        });
    });
});

// POST - Apply dynamic pricing strategy
app.post("/pricing/apply-strategy", function (req, res) {
    const { product_ids, strategy_type, parameters, user_id } = req.body;
    
    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
        res.status(400).json({ error: "Invalid or empty product_ids array" });
        return;
    }
    
    if (!strategy_type) {
        res.status(400).json({ error: "Missing required field: strategy_type" });
        return;
    }
    
    const results = {
        strategy_applied: strategy_type,
        products_processed: 0,
        successful_updates: 0,
        failed_updates: 0,
        details: []
    };
    
    async.eachSeries(product_ids, (productId, callback) => {
        applyPricingStrategy(productId, strategy_type, parameters, user_id)
            .then(result => {
                results.products_processed++;
                if (result.success) {
                    results.successful_updates++;
                    results.details.push({
                        product_id: productId,
                        old_price: result.old_price,
                        new_price: result.new_price,
                        change_reason: result.reason
                    });
                } else {
                    results.failed_updates++;
                    results.details.push({
                        product_id: productId,
                        error: result.error
                    });
                }
                callback();
            })
            .catch(error => {
                results.products_processed++;
                results.failed_updates++;
                results.details.push({
                    product_id: productId,
                    error: error.message
                });
                callback();
            });
    }, (err) => {
        if (err) {
            res.status(500).json({ error: "Strategy application failed" });
        } else {
            res.json(results);
        }
    });
});

// GET - Get pricing history for product
app.get("/pricing/history/:productId", function (req, res) {
    const productId = parseInt(req.params.productId);
    const { start_date, end_date, change_type, limit } = req.query;
    
    let query = { product_id: productId };
    if (change_type) query.change_type = change_type;
    
    if (start_date || end_date) {
        query.timestamp = {};
        if (start_date) query.timestamp.$gte = start_date;
        if (end_date) query.timestamp.$lte = end_date;
    }
    
    const queryLimit = parseInt(limit) || 100;
    
    pricingDBs.pricing_history.find(query)
        .sort({ timestamp: -1 })
        .limit(queryLimit)
        .exec(function (err, history) {
            if (err) {
                console.error(err);
                res.status(500).json({ error: "Internal Server Error" });
            } else {
                res.json({
                    product_id: productId,
                    history: history,
                    total_records: history.length,
                    generated_at: new Date().toISOString()
                });
            }
        });
});

/**
 * Competitor Price Monitoring
 */

// POST - Add competitor price data
app.post("/competitor/add-price", function (req, res) {
    const { product_id, competitor_name, competitor_price, product_url, scrape_date, notes } = req.body;
    
    if (!product_id || !competitor_name || !competitor_price) {
        res.status(400).json({ error: "Missing required fields: product_id, competitor_name, competitor_price" });
        return;
    }
    
    const competitorPrice = {
        product_id: parseInt(product_id),
        competitor_name: validator.escape(competitor_name),
        competitor_price: parseFloat(competitor_price),
        product_url: validator.escape(product_url || ""),
        scrape_date: scrape_date || new Date().toISOString(),
        notes: validator.escape(notes || ""),
        created_at: new Date().toISOString()
    };
    
    pricingDBs.competitor_prices.insert(competitorPrice, function (err, newRecord) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to add competitor price" });
        } else {
            res.status(201).json({
                success: true,
                record_id: newRecord._id,
                message: "Competitor price added successfully"
            });
        }
    });
});

// GET - Get competitor price analysis
app.get("/competitor/analysis/:productId", function (req, res) {
    const productId = parseInt(req.params.productId);
    const { days } = req.query;
    
    const daysBack = parseInt(days) || 30;
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
    
    pricingDBs.competitor_prices.find({
        product_id: productId,
        scrape_date: { $gte: cutoffDate }
    }).sort({ competitor_name: 1, scrape_date: -1 }).exec(function (err, prices) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            const analysis = analyzeCompetitorPrices(prices);
            res.json({
                product_id: productId,
                analysis_period_days: daysBack,
                competitor_analysis: analysis,
                raw_data: prices,
                generated_at: new Date().toISOString()
            });
        }
    });
});

/**
 * Price Elasticity Analysis
 */

// POST - Calculate price elasticity
app.post("/elasticity/calculate", function (req, res) {
    const { product_id, price_changes, sales_data } = req.body;
    
    if (!product_id || !price_changes || !sales_data) {
        res.status(400).json({ error: "Missing required fields: product_id, price_changes, sales_data" });
        return;
    }
    
    const elasticity = calculatePriceElasticity(price_changes, sales_data);
    
    const elasticityRecord = {
        product_id: parseInt(product_id),
        elasticity_coefficient: elasticity.coefficient,
        elasticity_type: elasticity.type,
        confidence_level: elasticity.confidence,
        calculation_method: 'historical_data',
        data_points: price_changes.length,
        price_range: {
            min_price: Math.min(...price_changes.map(p => p.price)),
            max_price: Math.max(...price_changes.map(p => p.price))
        },
        sales_range: {
            min_quantity: Math.min(...sales_data.map(s => s.quantity)),
            max_quantity: Math.max(...sales_data.map(s => s.quantity))
        },
        calculated_at: new Date().toISOString(),
        status: 'active'
    };
    
    pricingDBs.price_elasticity.insert(elasticityRecord, function (err, newRecord) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to store elasticity data" });
        } else {
            res.json({
                success: true,
                elasticity: elasticity,
                record_id: newRecord._id
            });
        }
    });
});

// GET - Get price elasticity for product
app.get("/elasticity/:productId", function (req, res) {
    const productId = parseInt(req.params.productId);
    
    pricingDBs.price_elasticity.findOne({ product_id: productId, status: 'active' }, function (err, elasticity) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else if (!elasticity) {
            res.status(404).json({ error: "No elasticity data found for this product" });
        } else {
            res.json(elasticity);
        }
    });
});

/**
 * Pricing Analytics and Business Intelligence
 */

// GET - Pricing performance analytics
app.get("/analytics/performance", function (req, res) {
    const { start_date, end_date, category, metric_type } = req.query;
    
    let query = {};
    if (category) query.product_category = category;
    
    if (start_date || end_date) {
        query.timestamp = {};
        if (start_date) query.timestamp.$gte = start_date;
        if (end_date) query.timestamp.$lte = end_date;
    }
    
    pricingDBs.pricing_analytics.find(query, function (err, analytics) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            const performance = aggregatePricingAnalytics(analytics, metric_type);
            res.json(performance);
        }
    });
});

// GET - Price optimization recommendations
app.get("/analytics/optimization-recommendations", function (req, res) {
    const { product_id, category, timeframe } = req.query;
    
    // This would analyze pricing data and provide recommendations
    // For now, returning a structured response with sample data
    const recommendations = generatePricingRecommendations({
        product_id: product_id,
        category: category,
        timeframe: timeframe || '30_days'
    });
    
    res.json({
        recommendations: recommendations,
        analysis_date: new Date().toISOString(),
        parameters: {
            product_id: product_id,
            category: category,
            timeframe: timeframe || '30_days'
        }
    });
});

/**
 * Pricing Rules Management
 */

// GET - Get all pricing rules
app.get("/rules", function (req, res) {
    const { active_only, rule_type } = req.query;
    
    let query = {};
    if (active_only === 'true') {
        query['status.is_active'] = true;
    }
    if (rule_type) {
        query.rule_type = rule_type;
    }
    
    pricingDBs.pricing_rules.find(query, function (err, rules) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.send(rules);
        }
    });
});

// POST - Create pricing rule
app.post("/rules/create", function (req, res) {
    const rule = {
        rule_id: `PRICE_RULE_${Date.now()}`,
        rule_name: validator.escape(req.body.rule_name || ""),
        rule_type: validator.escape(req.body.rule_type || "dynamic"),
        
        // Rule Configuration
        rule_config: {
            description: validator.escape(req.body.description || ""),
            trigger_conditions: req.body.trigger_conditions || {},
            pricing_formula: req.body.pricing_formula || {},
            priority: parseInt(req.body.priority) || 1,
            is_stackable: req.body.is_stackable !== false
        },
        
        // Applicability
        applicability: {
            product_ids: req.body.product_ids || [],
            categories: req.body.categories || [],
            customer_segments: req.body.customer_segments || [],
            geographic_regions: req.body.geographic_regions || [],
            time_restrictions: req.body.time_restrictions || {}
        },
        
        // Pricing Parameters
        pricing_parameters: {
            base_price_modifier: parseFloat(req.body.base_price_modifier) || 0,
            percentage_adjustment: parseFloat(req.body.percentage_adjustment) || 0,
            fixed_amount_adjustment: parseFloat(req.body.fixed_amount_adjustment) || 0,
            minimum_price: parseFloat(req.body.minimum_price) || 0,
            maximum_price: parseFloat(req.body.maximum_price) || 0,
            floor_margin_percentage: parseFloat(req.body.floor_margin_percentage) || 0
        },
        
        // Dynamic Factors
        dynamic_factors: {
            demand_based: req.body.demand_based || false,
            competitor_based: req.body.competitor_based || false,
            inventory_based: req.body.inventory_based || false,
            time_based: req.body.time_based || false,
            customer_based: req.body.customer_based || false
        },
        
        // Validity
        validity: {
            start_date: req.body.start_date || new Date().toISOString(),
            end_date: req.body.end_date || null,
            usage_limit: parseInt(req.body.usage_limit) || 0,
            is_active: true
        },
        
        status: {
            is_active: true,
            created_by: validator.escape(req.body.created_by || "admin"),
            created_at: new Date().toISOString()
        }
    };

    pricingDBs.pricing_rules.insert(rule, function (err, newRule) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.status(201).json({
                success: true,
                rule_id: rule.rule_id,
                message: "Pricing rule created successfully",
                rule: newRule
            });
        }
    });
});

/**
 * HELPER FUNCTIONS
 */

// Calculate dynamic price based on rules
async function calculateDynamicPrice(params) {
    const { product_id, base_price, customer_id, location, quantity, timestamp, rules } = params;
    
    let finalPrice = base_price;
    const appliedRules = [];
    const priceBreakdown = {
        base_price: base_price,
        adjustments: [],
        final_price: base_price
    };
    
    // Sort rules by priority
    const sortedRules = rules.sort((a, b) => a.rule_config.priority - b.rule_config.priority);
    
    for (const rule of sortedRules) {
        if (isRuleApplicable(rule, params)) {
            const adjustment = calculatePriceAdjustment(rule, params);
            if (adjustment.applied) {
                finalPrice = applyPriceAdjustment(finalPrice, adjustment);
                appliedRules.push({
                    rule_id: rule.rule_id,
                    rule_name: rule.rule_name,
                    adjustment: adjustment
                });
                priceBreakdown.adjustments.push({
                    rule_id: rule.rule_id,
                    type: adjustment.type,
                    amount: adjustment.amount,
                    description: adjustment.description
                });
            }
        }
    }
    
    priceBreakdown.final_price = finalPrice;
    priceBreakdown.applied_rules = appliedRules;
    priceBreakdown.total_adjustment = finalPrice - base_price;
    
    return {
        product_id: product_id,
        original_price: base_price,
        final_price: finalPrice,
        price_breakdown: priceBreakdown,
        timestamp: timestamp,
        calculation_id: crypto.randomBytes(16).toString("hex")
    };
}

// Check if pricing rule is applicable
function isRuleApplicable(rule, params) {
    const { product_id, customer_id, location, quantity, timestamp } = params;
    const applicability = rule.applicability;
    
    // Check product applicability
    if (applicability.product_ids.length > 0 && !applicability.product_ids.includes(product_id)) {
        return false;
    }
    
    // Check customer segments
    if (applicability.customer_segments.length > 0 && customer_id) {
        // This would check customer segment data
        // For now, assuming all customers are in 'general' segment
        if (!applicability.customer_segments.includes('general')) {
            return false;
        }
    }
    
    // Check geographic regions
    if (applicability.geographic_regions.length > 0 && location) {
        if (!applicability.geographic_regions.includes(location)) {
            return false;
        }
    }
    
    // Check time restrictions
    if (applicability.time_restrictions.start_date) {
        const startDate = new Date(applicability.time_restrictions.start_date);
        if (new Date(timestamp) < startDate) {
            return false;
        }
    }
    
    if (applicability.time_restrictions.end_date) {
        const endDate = new Date(applicability.time_restrictions.end_date);
        if (new Date(timestamp) > endDate) {
            return false;
        }
    }
    
    return true;
}

// Calculate price adjustment for a rule
function calculatePriceAdjustment(rule, params) {
    const config = rule.pricing_parameters;
    const { base_price, quantity, timestamp } = params;
    
    let adjustment = {
        applied: false,
        type: 'unknown',
        amount: 0,
        description: ''
    };
    
    // Apply percentage adjustment
    if (config.percentage_adjustment !== 0) {
        const amount = (base_price * config.percentage_adjustment) / 100;
        adjustment = {
            applied: true,
            type: 'percentage',
            amount: amount,
            description: `${config.percentage_adjustment}% adjustment`
        };
    }
    
    // Apply fixed amount adjustment
    if (config.fixed_amount_adjustment !== 0) {
        adjustment = {
            applied: true,
            type: 'fixed_amount',
            amount: config.fixed_amount_adjustment,
            description: `₹${config.fixed_amount_adjustment} adjustment`
        };
    }
    
    // Apply dynamic demand-based pricing
    if (rule.dynamic_factors.demand_based) {
        const demandMultiplier = calculateDemandMultiplier(params);
        const demandAdjustment = base_price * (demandMultiplier - 1);
        adjustment = {
            applied: true,
            type: 'demand_based',
            amount: demandAdjustment,
            description: `Demand-based adjustment (${((demandMultiplier - 1) * 100).toFixed(1)}%)`
        };
    }
    
    // Apply competitor-based pricing
    if (rule.dynamic_factors.competitor_based) {
        const competitorAdjustment = calculateCompetitorAdjustment(params);
        if (competitorAdjustment.applied) {
            adjustment = competitorAdjustment;
        }
    }
    
    // Apply inventory-based pricing
    if (rule.dynamic_factors.inventory_based) {
        const inventoryAdjustment = calculateInventoryAdjustment(params);
        if (inventoryAdjustment.applied) {
            adjustment = inventoryAdjustment;
        }
    }
    
    return adjustment;
}

// Apply price adjustment
function applyPriceAdjustment(currentPrice, adjustment) {
    switch (adjustment.type) {
        case 'percentage':
        case 'demand_based':
        case 'competitor_based':
        case 'inventory_based':
            return Math.max(0, currentPrice + adjustment.amount);
        case 'fixed_amount':
            return Math.max(0, currentPrice + adjustment.amount);
        default:
            return currentPrice;
    }
}

// Calculate demand multiplier (simplified)
function calculateDemandMultiplier(params) {
    // This would use actual demand data
    // For now, returning a simple multiplier based on quantity
    if (params.quantity > 10) return 1.05; // High demand, increase price
    if (params.quantity < 2) return 0.95; // Low demand, decrease price
    return 1.0;
}

// Calculate competitor adjustment
function calculateCompetitorAdjustment(params) {
    // This would fetch competitor prices and calculate adjustment
    // For now, returning null adjustment
    return {
        applied: false,
        type: 'competitor_based',
        amount: 0,
        description: ''
    };
}

// Calculate inventory adjustment
function calculateInventoryAdjustment(params) {
    // This would fetch inventory levels and calculate adjustment
    // For now, returning null adjustment
    return {
        applied: false,
        type: 'inventory_based',
        amount: 0,
        description: ''
    };
}

// Apply pricing strategy to a product
async function applyPricingStrategy(productId, strategyType, parameters, userId) {
    // This would implement various pricing strategies
    // For now, returning a mock response
    return {
        success: true,
        old_price: 100.0,
        new_price: 95.0,
        reason: `${strategyType} strategy applied`
    };
}

// Calculate violation severity
function calculateViolationSeverity(sellingPrice, mrp) {
    const variance = ((sellingPrice - mrp) / mrp) * 100;
    
    if (variance > 10) return 'critical';
    if (variance > 5) return 'warning';
    return 'minor';
}

// Calculate compliance rate
function calculateComplianceRate(violations) {
    // This would calculate based on total transactions vs violations
    // For now, returning a placeholder
    return violations.length < 10 ? 95.5 : 87.2;
}

// Analyze competitor prices
function analyzeCompetitorPrices(prices) {
    const competitorGroups = {};
    
    prices.forEach(price => {
        if (!competitorGroups[price.competitor_name]) {
            competitorGroups[price.competitor_name] = [];
        }
        competitorGroups[price.competitor_name].push(price);
    });
    
    const analysis = {
        total_competitors: Object.keys(competitorGroups).length,
        average_price: 0,
        lowest_price: null,
        highest_price: null,
        price_range: 0,
        competitors: []
    };
    
    let allPrices = [];
    
    Object.keys(competitorGroups).forEach(competitor => {
        const competitorPrices = competitorGroups[competitor];
        const avgPrice = competitorPrices.reduce((sum, p) => sum + p.competitor_price, 0) / competitorPrices.length;
        
        allPrices = allPrices.concat(competitorPrices.map(p => p.competitor_price));
        
        analysis.competitors.push({
            name: competitor,
            average_price: avgPrice,
            price_count: competitorPrices.length,
            latest_price: competitorPrices[0].competitor_price,
            latest_date: competitorPrices[0].scrape_date
        });
    });
    
    if (allPrices.length > 0) {
        analysis.average_price = allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length;
        analysis.lowest_price = Math.min(...allPrices);
        analysis.highest_price = Math.max(...allPrices);
        analysis.price_range = analysis.highest_price - analysis.lowest_price;
    }
    
    return analysis;
}

// Calculate price elasticity
function calculatePriceElasticity(priceChanges, salesData) {
    // Simplified elasticity calculation
    // In production, this would use more sophisticated statistical methods
    
    if (priceChanges.length < 2 || salesData.length < 2) {
        return {
            coefficient: 0,
            type: 'insufficient_data',
            confidence: 0
        };
    }
    
    // Calculate percentage changes
    const priceChanges_pct = [];
    const quantityChanges_pct = [];
    
    for (let i = 1; i < priceChanges.length; i++) {
        const priceChange_pct = ((priceChanges[i].price - priceChanges[i-1].price) / priceChanges[i-1].price) * 100;
        const quantityChange_pct = ((salesData[i].quantity - salesData[i-1].quantity) / salesData[i-1].quantity) * 100;
        
        if (priceChange_pct !== 0) {
            priceChanges_pct.push(priceChange_pct);
            quantityChanges_pct.push(quantityChange_pct);
        }
    }
    
    // Calculate correlation coefficient (simplified elasticity)
    const avgPriceChange = priceChanges_pct.reduce((sum, p) => sum + p, 0) / priceChanges_pct.length;
    const avgQuantityChange = quantityChanges_pct.reduce((sum, q) => sum + q, 0) / quantityChanges_pct.length;
    
    let numerator = 0;
    let priceSumSquares = 0;
    let quantitySumSquares = 0;
    
    for (let i = 0; i < priceChanges_pct.length; i++) {
        const priceDiff = priceChanges_pct[i] - avgPriceChange;
        const quantityDiff = quantityChanges_pct[i] - avgQuantityChange;
        
        numerator += priceDiff * quantityDiff;
        priceSumSquares += priceDiff * priceDiff;
        quantitySumSquares += quantityDiff * quantityDiff;
    }
    
    const correlation = numerator / Math.sqrt(priceSumSquares * quantitySumSquares);
    const elasticityCoefficient = correlation * (avgQuantityChange / avgPriceChange);
    
    let elasticityType = 'unitary';
    if (elasticityCoefficient > 1) elasticityType = 'elastic';
    else if (elasticityCoefficient < 1) elasticityType = 'inelastic';
    
    return {
        coefficient: Math.abs(elasticityCoefficient),
        type: elasticityType,
        confidence: Math.min(priceChanges_pct.length * 20, 100), // Simple confidence metric
        correlation: correlation
    };
}

// Generate pricing recommendations
function generatePricingRecommendations(parameters) {
    const recommendations = [];
    
    // Sample recommendations based on parameters
    if (parameters.category) {
        recommendations.push({
            type: 'category_optimization',
            priority: 'high',
            title: `Optimize ${parameters.category} pricing`,
            description: 'Consider dynamic pricing based on demand patterns',
            expected_impact: '10-15% revenue increase',
            implementation_effort: 'medium'
        });
    }
    
    recommendations.push({
        type: 'elasticity_optimization',
        priority: 'medium',
        title: 'Review price elasticity assumptions',
        description: 'Update pricing based on recent sales elasticity analysis',
        expected_impact: '5-8% margin improvement',
        implementation_effort: 'low'
    });
    
    return recommendations;
}

// Aggregate pricing analytics
function aggregatePricingAnalytics(analytics, metricType) {
    const aggregated = {
        total_records: analytics.length,
        time_period: {
            start: analytics.length > 0 ? analytics[0].timestamp : null,
            end: analytics.length > 0 ? analytics[analytics.length - 1].timestamp : null
        },
        metrics: {}
    };
    
    if (analytics.length === 0) {
        return aggregated;
    }
    
    // Calculate summary metrics
    const prices = analytics.map(a => a.final_price || a.price).filter(p => p > 0);
    const adjustments = analytics.map(a => a.price_change || 0);
    
    aggregated.metrics = {
        average_price: prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0,
        price_volatility: calculateVolatility(prices),
        total_adjustments: adjustments.length,
        average_adjustment: adjustments.length > 0 ? adjustments.reduce((sum, a) => sum + a, 0) / adjustments.length : 0,
        adjustment_frequency: (adjustments.length / analytics.length) * 100
    };
    
    return aggregated;
}

// Calculate price volatility
function calculateVolatility(prices) {
    if (prices.length < 2) return 0;
    
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    
    return Math.sqrt(variance);
}