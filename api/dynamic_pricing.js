const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const path = require("path");
const validator = require("validator");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "dynamic_pricing.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

// Initialize dynamic pricing database
let pricingDB = getDatabase(dbPath);
pricingDB.ensureIndex({ fieldName: "_id", unique: true });
pricingDB.ensureIndex({ fieldName: "productId" });
pricingDB.ensureIndex({ fieldName: "type" });
pricingDB.ensureIndex({ fieldName: "isActive" });

/**
 * GET endpoint: Get the welcome message for the Dynamic Pricing API.
 */
app.get("/", function (req, res) {
    res.send("Dynamic Pricing & Promotion Engine API");
});

/**
 * GET endpoint: Get all pricing rules
 */
app.get("/pricing-rules", function (req, res) {
    const type = req.query.type; // 'dynamic', 'margin', 'competitor', 'promotional'
    const isActive = req.query.isActive;

    let query = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    pricingDB.find(query, function (err, rules) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve pricing rules"
            });
        } else {
            res.send(rules);
        }
    });
});

/**
 * POST endpoint: Create pricing rule
 */
app.post("/pricing-rules", function (req, res) {
    const ruleData = req.body;

    // Validate required fields
    if (!ruleData.name || !ruleData.type || !ruleData.productId) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Name, type, and product ID are required"
        });
    }

    // Validate rule type
    const validTypes = ['dynamic', 'margin', 'competitor', 'promotional', 'clearance', 'seasonal'];
    if (!validTypes.includes(ruleData.type)) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Invalid rule type. Must be one of: " + validTypes.join(', ')
        });
    }

    const pricingRule = {
        _id: Math.floor(Date.now() / 1000),
        name: ruleData.name,
        description: ruleData.description || '',
        type: ruleData.type,
        productId: ruleData.productId,
        categoryId: ruleData.categoryId || null,
        isActive: ruleData.isActive !== undefined ? ruleData.isActive : true,
        priority: ruleData.priority || 1, // Higher priority rules execute first
        conditions: ruleData.conditions || {},
        actions: ruleData.actions || {},
        schedule: ruleData.schedule || {
            startDate: new Date().toISOString(),
            endDate: null,
            daysOfWeek: [1, 2, 3, 4, 5, 6, 0], // All days
            timeRanges: [] // No time restrictions
        },
        limits: {
            maxDiscount: ruleData.limits?.maxDiscount || null, // percentage
            minMargin: ruleData.limits?.minMargin || null, // percentage
            maxPrice: ruleData.limits?.maxPrice || null,
            minPrice: ruleData.limits?.minPrice || null
        },
        competitorData: ruleData.competitorData || [],
        performance: {
            timesExecuted: 0,
            lastExecuted: null,
            averageImpact: 0,
            totalRevenue: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    pricingDB.insert(pricingRule, function (err, newRule) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to create pricing rule"
            });
        } else {
            res.status(201).json(newRule);
        }
    });
});

/**
 * PUT endpoint: Update pricing rule
 */
app.put("/pricing-rules/:ruleId", function (req, res) {
    const ruleId = parseInt(req.params.ruleId);
    const updateData = req.body;
    updateData.updatedAt = new Date().toISOString();

    pricingDB.update(
        { _id: ruleId },
        { $set: updateData },
        {},
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to update pricing rule"
                });
            } else if (numReplaced === 0) {
                res.status(404).json({
                    error: "Not Found",
                    message: "Pricing rule not found"
                });
            } else {
                res.json({ success: true, ruleId: ruleId });
            }
        }
    );
});

/**
 * DELETE endpoint: Delete pricing rule
 */
app.delete("/pricing-rules/:ruleId", function (req, res) {
    const ruleId = parseInt(req.params.ruleId);

    pricingDB.remove({ _id: ruleId }, {}, function (err, numRemoved) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to delete pricing rule"
            });
        } else if (numRemoved === 0) {
            res.status(404).json({
                error: "Not Found",
                message: "Pricing rule not found"
            });
        } else {
            res.json({ success: true, deletedRuleId: ruleId });
        }
    });
});

/**
 * POST endpoint: Calculate dynamic price for a product
 */
app.post("/calculate-price", function (req, res) {
    const { productId, basePrice, currentDate, context } = req.body;

    if (!productId || !basePrice) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Product ID and base price are required"
        });
    }

    calculateDynamicPrice(productId, parseFloat(basePrice), new Date(currentDate || Date.now()), context)
        .then(priceResult => {
            res.json(priceResult);
        })
        .catch(error => {
            console.error("Price calculation error:", error);
            res.status(500).json({
                error: "Price Calculation Error",
                message: error.message
            });
        });
});

/**
 * POST endpoint: Apply pricing rules to multiple products (batch update)
 */
app.post("/batch-apply", function (req, res) {
    const { productIds, applyAllActiveRules } = req.body;

    if (!productIds || !Array.isArray(productIds)) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Product IDs array is required"
        });
    }

    let processedProducts = [];
    let errors = [];

    // Get all active pricing rules
    pricingDB.find({ isActive: true }, function (err, rules) {
        if (err) {
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve pricing rules"
            });
        }

        // Sort rules by priority (higher priority first)
        rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        async.eachSeries(productIds, function (productId, callback) {
            // Get current product price (would integrate with inventory API)
            const currentPrice = 29.99; // Placeholder - would fetch from inventory

            calculateDynamicPrice(productId, currentPrice, new Date(), {})
                .then(priceResult => {
                    processedProducts.push({
                        productId: productId,
                        originalPrice: currentPrice,
                        newPrice: priceResult.finalPrice,
                        appliedRules: priceResult.appliedRules,
                        changes: priceResult.changes
                    });
                    callback();
                })
                .catch(error => {
                    errors.push({
                        productId: productId,
                        error: error.message
                    });
                    callback();
                });
        }, function () {
            res.json({
                success: true,
                processedProducts: processedProducts,
                errors: errors,
                summary: {
                    totalProcessed: productIds.length,
                    successful: processedProducts.length,
                    errors: errors.length
                }
            });
        });
    });
});

/**
 * GET endpoint: Get competitor pricing data
 */
app.get("/competitor-pricing", function (req, res) {
    const productId = req.query.productId;
    const category = req.query.category;

    let query = { type: 'competitor' };
    if (productId) query.productId = parseInt(productId);
    if (category) query.categoryId = category;

    pricingDB.find(query, function (err, competitorData) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve competitor pricing data"
            });
        } else {
            res.send(competitorData);
        }
    });
});

/**
 * POST endpoint: Update competitor pricing data
 */
app.post("/competitor-pricing", function (req, res) {
    const { productId, competitorName, competitorPrice, source, lastUpdated } = req.body;

    if (!productId || !competitorName || !competitorPrice) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Product ID, competitor name, and competitor price are required"
        });
    }

    // Find existing competitor rule for this product
    pricingDB.findOne({ 
        type: 'competitor', 
        productId: parseInt(productId) 
    }, function (err, existingRule) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Database error occurred"
            });
        }

        const competitorEntry = {
            name: competitorName,
            price: parseFloat(competitorPrice),
            source: source || 'manual',
            lastUpdated: lastUpdated || new Date().toISOString()
        };

        if (existingRule) {
            // Update existing competitor data
            let updatedCompetitorData = [...(existingRule.competitorData || [])];
            
            // Update existing competitor or add new one
            const existingIndex = updatedCompetitorData.findIndex(c => c.name === competitorName);
            if (existingIndex >= 0) {
                updatedCompetitorData[existingIndex] = competitorEntry;
            } else {
                updatedCompetitorData.push(competitorEntry);
            }

            pricingDB.update(
                { _id: existingRule._id },
                {
                    $set: {
                        competitorData: updatedCompetitorData,
                        updatedAt: new Date().toISOString()
                    }
                },
                {},
                function (err, numReplaced) {
                    if (err) {
                        console.error(err);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: "Failed to update competitor data"
                        });
                    } else {
                        res.json({
                            success: true,
                            productId: productId,
                            competitorData: updatedCompetitorData
                        });
                    }
                }
            );
        } else {
            // Create new competitor pricing rule
            const competitorRule = {
                _id: Math.floor(Date.now() / 1000),
                name: `Competitor Pricing - Product ${productId}`,
                description: `Automated competitor price tracking`,
                type: 'competitor',
                productId: parseInt(productId),
                isActive: true,
                priority: 3,
                competitorData: [competitorEntry],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            pricingDB.insert(competitorRule, function (err, newRule) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "Failed to create competitor pricing rule"
                    });
                } else {
                    res.status(201).json(newRule);
                }
            });
        }
    });
});

/**
 * GET endpoint: Get promotion analytics
 */
app.get("/analytics/promotions", function (req, res) {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    pricingDB.find({ isActive: true }, function (err, rules) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve promotion analytics"
            });
        }

        const analytics = {
            totalActivePromotions: rules.length,
            promotionsByType: {},
            topPerformingPromotions: [],
            promotionEffectiveness: {},
            revenueImpact: {
                totalAdditionalRevenue: 0,
                averageRevenuePerPromotion: 0,
                promotionLift: 0
            },
            costAnalysis: {
                totalDiscountCost: 0,
                averageDiscountPerTransaction: 0,
                discountRate: 0
            }
        };

        // Analyze promotions by type
        rules.forEach(rule => {
            if (!analytics.promotionsByType[rule.type]) {
                analytics.promotionsByType[rule.type] = {
                    count: 0,
                    totalRevenue: 0,
                    averagePerformance: 0
                };
            }
            analytics.promotionsByType[rule.type].count++;
        });

        // Calculate promotion effectiveness
        rules.forEach(rule => {
            const effectiveness = rule.performance.timesExecuted > 0 ? 
                rule.performance.totalRevenue / rule.performance.timesExecuted : 0;
            
            if (!analytics.promotionEffectiveness[rule.type]) {
                analytics.promotionEffectiveness[rule.type] = {
                    totalRevenue: 0,
                    totalExecutions: 0,
                    averageRevenue: 0
                };
            }
            
            analytics.promotionEffectiveness[rule.type].totalRevenue += rule.performance.totalRevenue;
            analytics.promotionEffectiveness[rule.type].totalExecutions += rule.performance.timesExecuted;
        });

        // Calculate averages
        Object.keys(analytics.promotionEffectiveness).forEach(type => {
            const data = analytics.promotionEffectiveness[type];
            data.averageRevenue = data.totalExecutions > 0 ? 
                data.totalRevenue / data.totalExecutions : 0;
        });

        // Top performing promotions
        analytics.topPerformingPromotions = rules
            .filter(rule => rule.performance.totalRevenue > 0)
            .sort((a, b) => b.performance.totalRevenue - a.performance.totalRevenue)
            .slice(0, 10)
            .map(rule => ({
                id: rule._id,
                name: rule.name,
                type: rule.type,
                totalRevenue: rule.performance.totalRevenue,
                timesExecuted: rule.performance.timesExecuted,
                averageRevenue: rule.performance.timesExecuted > 0 ? 
                    rule.performance.totalRevenue / rule.performance.timesExecuted : 0
            }));

        res.send(analytics);
    });
});

/**
 * POST endpoint: Execute scheduled pricing updates
 */
app.post("/execute-scheduled", function (req, res) {
    const currentDate = new Date();

    pricingDB.find({ isActive: true }, function (err, rules) {
        if (err) {
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve pricing rules"
            });
        }

        let executedRules = [];
        let errors = [];

        rules.forEach(rule => {
            // Check if rule should be executed based on schedule
            if (shouldExecuteRule(rule, currentDate)) {
                // This would integrate with the inventory system to actually update prices
                // For now, we'll simulate the execution
                
                executedRules.push({
                    ruleId: rule._id,
                    name: rule.name,
                    type: rule.type,
                    productId: rule.productId,
                    executedAt: currentDate.toISOString()
                });

                // Update performance metrics
                pricingDB.update(
                    { _id: rule._id },
                    {
                        $set: {
                            'performance.timesExecuted': (rule.performance.timesExecuted || 0) + 1,
                            'performance.lastExecuted': currentDate.toISOString()
                        }
                    },
                    {},
                    function (err, numReplaced) {
                        if (err) console.error('Failed to update performance metrics:', err);
                    }
                );
            }
        });

        res.json({
            success: true,
            executedRules: executedRules,
            totalExecuted: executedRules.length,
            executionTime: currentDate.toISOString()
        });
    });
});

/**
 * Helper function to calculate dynamic price
 */
async function calculateDynamicPrice(productId, basePrice, currentDate, context) {
    return new Promise((resolve, reject) => {
        // Get all active pricing rules for this product
        pricingDB.find({ 
            productId: productId, 
            isActive: true 
        }, function (err, rules) {
            if (err) {
                return reject(new Error("Failed to retrieve pricing rules"));
            }

            if (!rules || rules.length === 0) {
                return resolve({
                    finalPrice: basePrice,
                    appliedRules: [],
                    changes: [],
                    originalPrice: basePrice
                });
            }

            // Sort rules by priority
            rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

            let currentPrice = basePrice;
            let appliedRules = [];
            let changes = [];

            rules.forEach(rule => {
                if (shouldExecuteRule(rule, currentDate)) {
                    const ruleResult = applyPricingRule(rule, currentPrice, context);
                    
                    if (ruleResult.success) {
                        currentPrice = ruleResult.newPrice;
                        appliedRules.push({
                            ruleId: rule._id,
                            name: rule.name,
                            type: rule.type,
                            originalPrice: ruleResult.originalPrice,
                            newPrice: ruleResult.newPrice,
                            changeAmount: ruleResult.changeAmount,
                            changePercentage: ruleResult.changePercentage
                        });
                        
                        changes.push({
                            type: rule.type,
                            change: ruleResult.changePercentage,
                            reason: rule.name
                        });
                    }
                }
            });

            resolve({
                finalPrice: Math.round(currentPrice * 100) / 100, // Round to 2 decimal places
                appliedRules: appliedRules,
                changes: changes,
                originalPrice: basePrice
            });
        });
    });
}

/**
 * Helper function to apply individual pricing rule
 */
function applyPricingRule(rule, currentPrice, context) {
    const originalPrice = currentPrice;
    let newPrice = currentPrice;
    let success = false;

    try {
        switch (rule.type) {
            case 'margin':
                if (rule.actions.targetMargin) {
                    const targetMargin = rule.actions.targetMargin; // percentage
                    // Calculate new price based on target margin
                    // This would need cost data from inventory
                    const cost = context.cost || currentPrice * 0.6; // Assume 60% cost if not provided
                    newPrice = cost / (1 - targetMargin / 100);
                    success = true;
                }
                break;

            case 'competitor':
                if (rule.competitorData && rule.competitorData.length > 0) {
                    const competitorPrices = rule.competitorData.map(c => c.price);
                    const minCompetitorPrice = Math.min(...competitorPrices);
                    const competitorBuffer = rule.actions.buffer || 0.05; // 5% buffer by default
                    
                    newPrice = minCompetitorPrice * (1 - competitorBuffer);
                    success = true;
                }
                break;

            case 'promotional':
                if (rule.actions.discountPercentage) {
                    const discount = rule.actions.discountPercentage / 100;
                    newPrice = currentPrice * (1 - discount);
                    success = true;
                } else if (rule.actions.discountAmount) {
                    newPrice = Math.max(0, currentPrice - rule.actions.discountAmount);
                    success = true;
                }
                break;

            case 'clearance':
                if (rule.actions.clearancePercentage) {
                    const clearance = rule.actions.clearancePercentage / 100;
                    newPrice = currentPrice * (1 - clearance);
                    success = true;
                }
                break;

            case 'seasonal':
                if (rule.actions.seasonalMultiplier) {
                    newPrice = currentPrice * rule.actions.seasonalMultiplier;
                    success = true;
                }
                break;

            case 'dynamic':
                // Complex dynamic pricing logic would go here
                // For now, implement basic demand-based pricing
                if (context.demand) {
                    const demandMultiplier = Math.max(0.5, Math.min(1.5, context.demand)); // Cap between 50% and 150%
                    newPrice = currentPrice * demandMultiplier;
                    success = true;
                }
                break;
        }

        // Apply limits
        if (success && rule.limits) {
            if (rule.limits.maxPrice && newPrice > rule.limits.maxPrice) {
                newPrice = rule.limits.maxPrice;
            }
            if (rule.limits.minPrice && newPrice < rule.limits.minPrice) {
                newPrice = rule.limits.minPrice;
            }
        }

        if (success) {
            const changeAmount = newPrice - originalPrice;
            const changePercentage = ((newPrice - originalPrice) / originalPrice) * 100;

            return {
                success: true,
                originalPrice: originalPrice,
                newPrice: newPrice,
                changeAmount: changeAmount,
                changePercentage: changePercentage
            };
        } else {
            return {
                success: false,
                originalPrice: originalPrice,
                newPrice: originalPrice,
                changeAmount: 0,
                changePercentage: 0
            };
        }

    } catch (error) {
        console.error("Error applying pricing rule:", error);
        return {
            success: false,
            originalPrice: originalPrice,
            newPrice: originalPrice,
            changeAmount: 0,
            changePercentage: 0,
            error: error.message
        };
    }
}

/**
 * Helper function to check if rule should be executed based on schedule
 */
function shouldExecuteRule(rule, currentDate) {
    const schedule = rule.schedule || {};
    
    // Check if rule is within date range
    if (schedule.startDate && new Date(schedule.startDate) > currentDate) {
        return false;
    }
    
    if (schedule.endDate && new Date(schedule.endDate) < currentDate) {
        return false;
    }

    // Check day of week (0 = Sunday, 1 = Monday, etc.)
    const currentDay = currentDate.getDay();
    if (schedule.daysOfWeek && !schedule.daysOfWeek.includes(currentDay)) {
        return false;
    }

    // Check time ranges
    if (schedule.timeRanges && schedule.timeRanges.length > 0) {
        const currentTime = currentDate.getHours() * 100 + currentDate.getMinutes();
        const inTimeRange = schedule.timeRanges.some(range => {
            const startTime = parseTimeRange(range.start);
            const endTime = parseTimeRange(range.end);
            return currentTime >= startTime && currentTime <= endTime;
        });
        
        if (!inTimeRange) {
            return false;
        }
    }

    return true;
}

/**
 * Helper function to parse time range (e.g., "09:00" -> 900)
 */
function parseTimeRange(timeString) {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 100 + minutes;
}