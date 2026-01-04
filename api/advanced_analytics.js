const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const async = require("async");
const path = require("path");
const validator = require("validator");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "advanced_analytics.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

// Initialize advanced analytics database
let advancedAnalyticsDB = getDatabase(dbPath);
advancedAnalyticsDB.ensureIndex({ fieldName: "_id", unique: true });
advancedAnalyticsDB.ensureIndex({ fieldName: "date" });
advancedAnalyticsDB.ensureIndex({ fieldName: "report_type" });

/**
 * GET endpoint: Get comprehensive retail dashboard analytics
 */
app.get("/retail-dashboard", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    Promise.all([
        getRetailSalesAnalytics(startDate, endDate),
        getInventoryAnalytics(startDate, endDate),
        getVariantPerformanceAnalytics(startDate, endDate),
        getCustomerRetailAnalytics(startDate, endDate),
        getGiftStoreAnalytics(startDate, endDate),
        getMarketingCampaignAnalytics(startDate, endDate),
        getRetailFinancialAnalytics(startDate, endDate),
        getSeasonalTrendAnalytics(startDate, endDate),
        getPredictiveAnalytics(startDate, endDate)
    ]).then(([sales, inventory, variants, customers, giftStore, marketing, financial, seasonal, predictive]) => {
        res.send({
            sales,
            inventory,
            variants,
            customers,
            gift_store: giftStore,
            marketing,
            financial,
            seasonal_trends: seasonal,
            predictive_analytics: predictive,
            date_range: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString()
            },
            generated_at: new Date().toISOString()
        });
    }).catch(error => {
        console.error("Advanced retail analytics error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to generate advanced retail analytics"
        });
    });
});

/**
 * GET endpoint: Get retail sales analytics with variants
 */
app.get("/retail-sales", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    const granularity = req.query.granularity || 'day';
    const category = req.query.category;
    const variant_type = req.query.variant_type;
    
    getRetailSalesAnalytics(startDate, endDate, granularity, category, variant_type)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Retail sales analytics error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate retail sales analytics"
            });
        });
});

/**
 * GET endpoint: Get inventory optimization analytics
 */
app.get("/inventory-optimization", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    getInventoryOptimizationAnalytics(startDate, endDate)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Inventory optimization error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate inventory optimization analytics"
            });
        });
});

/**
 * GET endpoint: Get variant performance analytics
 */
app.get("/variant-performance", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    const variant_type = req.query.variant_type || 'all';
    
    getVariantPerformanceAnalytics(startDate, endDate, variant_type)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Variant performance error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate variant performance analytics"
            });
        });
});

/**
 * GET endpoint: Get customer lifetime value analytics
 */
app.get("/customer-ltv", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    getCustomerLifetimeValueAnalytics(startDate, endDate)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Customer LTV error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate customer LTV analytics"
            });
        });
});

/**
 * GET endpoint: Get gift store specific analytics
 */
app.get("/gift-store", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    getGiftStoreAnalytics(startDate, endDate)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Gift store analytics error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate gift store analytics"
            });
        });
});

/**
 * GET endpoint: Get marketing campaign ROI analytics
 */
app.get("/marketing-roi", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    getMarketingCampaignAnalytics(startDate, endDate)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Marketing ROI error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate marketing ROI analytics"
            });
        });
});

/**
 * GET endpoint: Get predictive analytics and forecasting
 */
app.get("/predictive-analytics", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    const forecast_days = req.query.forecast_days || 30;
    
    getPredictiveAnalytics(startDate, endDate, forecast_days)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Predictive analytics error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate predictive analytics"
            });
        });
});

/**
 * POST endpoint: Generate custom retail report
 */
app.post("/custom-retail-report", function (req, res) {
    const { report_config } = req.body;
    
    if (!report_config) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Report configuration is required"
        });
    }
    
    generateCustomRetailReport(report_config)
        .then(report => res.send(report))
        .catch(error => {
            console.error("Custom retail report generation error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate custom retail report"
            });
        });
});

/**
 * GET endpoint: Get real-time KPI dashboard
 */
app.get("/real-time-kpis", function (req, res) {
    getRealTimeKPIs()
        .then(kpis => res.send(kpis))
        .catch(error => {
            console.error("Real-time KPIs error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate real-time KPIs"
            });
        });
});

// Helper Functions

/**
 * Get comprehensive retail sales analytics
 */
async function getRetailSalesAnalytics(startDate, endDate, granularity = 'day', category = null, variantType = null) {
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    const inventoryDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "inventory.db"));
    
    return new Promise((resolve, reject) => {
        let query = {
            date: {
                $gte: startDate.toISOString(),
                $lte: endDate.toISOString()
            },
            status: 1
        };

        transactionsDB.find(query, function (err, transactions) {
            if (err) return reject(err);
            
            const analytics = {
                total_revenue: 0,
                total_orders: transactions.length,
                average_order_value: 0,
                revenue_by_category: {},
                revenue_by_variant: {},
                sales_trends: {},
                seasonal_patterns: {},
                top_performing_products: {},
                growth_metrics: {},
                forecasting: {}
            };
            
            if (transactions.length === 0) return resolve(analytics);
            
            // Process transactions
            const categoryRevenue = {};
            const variantRevenue = {};
            const productPerformance = {};
            const dailyRevenue = {};
            
            transactions.forEach(transaction => {
                const revenue = parseFloat(transaction.total || 0);
                analytics.total_revenue += revenue;
                
                const date = new Date(transaction.date);
                const dayKey = date.toISOString().split('T')[0];
                
                // Daily trends
                if (!dailyRevenue[dayKey]) {
                    dailyRevenue[dayKey] = { revenue: 0, orders: 0 };
                }
                dailyRevenue[dayKey].revenue += revenue;
                dailyRevenue[dayKey].orders++;
                
                // Process items for category and variant analysis
                if (transaction.items && Array.isArray(transaction.items)) {
                    transaction.items.forEach(item => {
                        const itemId = item.id || item.menu_item_id;
                        const quantity = parseInt(item.quantity) || 1;
                        const price = parseFloat(item.price) || 0;
                        const itemRevenue = quantity * price;
                        
                        // Get item details from inventory
                        const inventoryItem = inventoryDB.findOne({ _id: itemId });
                        if (inventoryItem) {
                            const itemCategory = inventoryItem.category || 'Uncategorized';
                            const variants = inventoryItem.variants || {};
                            
                            // Category analysis
                            if (!categoryRevenue[itemCategory]) {
                                categoryRevenue[itemCategory] = { revenue: 0, quantity: 0, orders: 0 };
                            }
                            categoryRevenue[itemCategory].revenue += itemRevenue;
                            categoryRevenue[itemCategory].quantity += quantity;
                            categoryRevenue[itemCategory].orders++;
                            
                            // Variant analysis
                            Object.keys(variants).forEach(variantType => {
                                const variantData = variants[variantType];
                                if (variantData && variantData.price) {
                                    if (!variantRevenue[variantType]) {
                                        variantRevenue[variantType] = { revenue: 0, quantity: 0 };
                                    }
                                    variantRevenue[variantType].revenue += itemRevenue;
                                    variantRevenue[variantType].quantity += quantity;
                                }
                            });
                            
                            // Product performance
                            if (!productPerformance[itemId]) {
                                productPerformance[itemId] = {
                                    name: inventoryItem.name || inventoryItem.product_name,
                                    category: itemCategory,
                                    revenue: 0,
                                    quantity: 0,
                                    variants: variants
                                };
                            }
                            productPerformance[itemId].revenue += itemRevenue;
                            productPerformance[itemId].quantity += quantity;
                        }
                    });
                }
            });
            
            analytics.average_order_value = analytics.total_revenue / transactions.length;
            analytics.revenue_by_category = categoryRevenue;
            analytics.revenue_by_variant = variantRevenue;
            analytics.sales_trends = dailyRevenue;
            analytics.top_performing_products = Object.values(productPerformance)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 20);
            
            // Calculate growth metrics
            analytics.growth_metrics = calculateGrowthMetrics(dailyRevenue);
            
            // Generate forecasting
            analytics.forecasting = generateSalesForecasting(dailyRevenue);
            
            resolve(analytics);
        });
    });
}

/**
 * Get inventory optimization analytics
 */
async function getInventoryOptimizationAnalytics(startDate, endDate) {
    const inventoryDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "inventory.db"));
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    
    return new Promise((resolve, reject) => {
        Promise.all([
            new Promise((resolve, reject) => {
                inventoryDB.find({}, function (err, inventory) {
                    if (err) reject(err);
                    else resolve(inventory);
                });
            }),
            new Promise((resolve, reject) => {
                transactionsDB.find({
                    date: {
                        $gte: startDate.toISOString(),
                        $lte: endDate.toISOString()
                    },
                    status: 1
                }, function (err, transactions) {
                    if (err) reject(err);
                    else resolve(transactions);
                });
            })
        ]).then(([inventory, transactions]) => {
            const analytics = {
                stock_optimization: {},
                dead_stock_analysis: {},
                supplier_performance: {},
                inventory_turnover: {},
                reorder_recommendations: {},
                stock_level_analysis: {}
            };
            
            // Calculate sales velocity
            const salesVelocity = calculateSalesVelocity(transactions, inventory);
            
            // Identify dead stock
            const deadStock = identifyDeadStock(inventory, salesVelocity);
            analytics.dead_stock_analysis = deadStock;
            
            // Calculate inventory turnover
            analytics.inventory_turnover = calculateInventoryTurnover(inventory, transactions);
            
            // Generate reorder recommendations
            analytics.reorder_recommendations = generateReorderRecommendations(inventory, salesVelocity);
            
            // Stock level optimization
            analytics.stock_optimization = optimizeStockLevels(inventory, salesVelocity);
            
            resolve(analytics);
        }).catch(reject);
    });
}

/**
 * Get variant performance analytics
 */
async function getVariantPerformanceAnalytics(startDate, endDate, variantType = 'all') {
    const inventoryDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "inventory.db"));
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    
    return new Promise((resolve, reject) => {
        Promise.all([
            new Promise((resolve, reject) => {
                inventoryDB.find({}, function (err, inventory) {
                    if (err) reject(err);
                    else resolve(inventory);
                });
            }),
            new Promise((resolve, reject) => {
                transactionsDB.find({
                    date: {
                        $gte: startDate.toISOString(),
                        $lte: endDate.toISOString()
                    },
                    status: 1
                }, function (err, transactions) {
                    if (err) reject(err);
                    else resolve(transactions);
                });
            })
        ]).then(([inventory, transactions]) => {
            const analytics = {
                size_performance: {},
                color_performance: {},
                style_performance: {},
                variant_correlation: {},
                seasonal_variant_trends: {},
                variant_profitability: {}
            };
            
            // Process variant data
            const variantSales = {};
            
            transactions.forEach(transaction => {
                if (transaction.items && Array.isArray(transaction.items)) {
                    transaction.items.forEach(item => {
                        const itemId = item.id || item.menu_item_id;
                        const inventoryItem = inventory.find(inv => inv._id == itemId);
                        
                        if (inventoryItem && inventoryItem.variants) {
                            const variants = inventoryItem.variants;
                            
                            // Size analysis
                            if (variants.size) {
                                if (!analytics.size_performance[variants.size]) {
                                    analytics.size_performance[variants.size] = { sales: 0, revenue: 0, margin: 0 };
                                }
                                analytics.size_performance[variants.size].sales += parseInt(item.quantity) || 1;
                                analytics.size_performance[variants.size].revenue += parseFloat(item.price || 0) * (parseInt(item.quantity) || 1);
                            }
                            
                            // Color analysis
                            if (variants.color) {
                                if (!analytics.color_performance[variants.color]) {
                                    analytics.color_performance[variants.color] = { sales: 0, revenue: 0, margin: 0 };
                                }
                                analytics.color_performance[variants.color].sales += parseInt(item.quantity) || 1;
                                analytics.color_performance[variants.color].revenue += parseFloat(item.price || 0) * (parseInt(item.quantity) || 1);
                            }
                            
                            // Style analysis
                            if (variants.style) {
                                if (!analytics.style_performance[variants.style]) {
                                    analytics.style_performance[variants.style] = { sales: 0, revenue: 0, margin: 0 };
                                }
                                analytics.style_performance[variants.style].sales += parseInt(item.quantity) || 1;
                                analytics.style_performance[variants.style].revenue += parseFloat(item.price || 0) * (parseInt(item.quantity) || 1);
                            }
                        }
                    });
                }
            });
            
            resolve(analytics);
        }).catch(reject);
    });
}

/**
 * Get customer lifetime value analytics
 */
async function getCustomerLifetimeValueAnalytics(startDate, endDate) {
    const customersDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "customers.db"));
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    
    return new Promise((resolve, reject) => {
        Promise.all([
            new Promise((resolve, reject) => {
                customersDB.find({}, function (err, customers) {
                    if (err) reject(err);
                    else resolve(customers);
                });
            }),
            new Promise((resolve, reject) => {
                transactionsDB.find({
                    date: {
                        $gte: startDate.toISOString(),
                        $lte: endDate.toISOString()
                    },
                    status: 1
                }, function (err, transactions) {
                    if (err) reject(err);
                    else resolve(transactions);
                });
            })
        ]).then(([customers, transactions]) => {
            const analytics = {
                clv_segments: {},
                customer_acquisition_cost: {},
                retention_analysis: {},
                purchase_patterns: {},
                customer_journey: {},
                churn_prediction: {}
            };
            
            // Calculate CLV for each customer
            const customerMetrics = {};
            
            transactions.forEach(transaction => {
                const customerId = transaction.customer;
                if (customerId && customerId !== '0') {
                    if (!customerMetrics[customerId]) {
                        customerMetrics[customerId] = {
                            total_spent: 0,
                            order_count: 0,
                            first_purchase: new Date(transaction.date),
                            last_purchase: new Date(transaction.date),
                            categories: new Set(),
                            average_order_value: 0
                        };
                    }
                    
                    customerMetrics[customerId].total_spent += parseFloat(transaction.total || 0);
                    customerMetrics[customerId].order_count++;
                    
                    const transactionDate = new Date(transaction.date);
                    if (transactionDate < customerMetrics[customerId].first_purchase) {
                        customerMetrics[customerId].first_purchase = transactionDate;
                    }
                    if (transactionDate > customerMetrics[customerId].last_purchase) {
                        customerMetrics[customerId].last_purchase = transactionDate;
                    }
                }
            });
            
            // Calculate CLV and segment customers
            Object.keys(customerMetrics).forEach(customerId => {
                const metrics = customerMetrics[customerId];
                const daysSinceFirstPurchase = (new Date() - metrics.first_purchase) / (1000 * 60 * 60 * 24);
                const clv = daysSinceFirstPurchase > 0 ? metrics.total_spent / (daysSinceFirstPurchase / 30) : 0;
                
                metrics.clv = clv;
                metrics.average_order_value = metrics.total_spent / metrics.order_count;
                
                // Segment customers
                let segment = 'new';
                if (metrics.order_count >= 5 && clv >= 200) {
                    segment = 'vip';
                } else if (metrics.order_count >= 3 && clv >= 100) {
                    segment = 'loyal';
                } else if (metrics.order_count >= 1 && clv >= 50) {
                    segment = 'regular';
                } else if (daysSinceFirstPurchase > 60) {
                    segment = 'at_risk';
                }
                
                if (!analytics.clv_segments[segment]) {
                    analytics.clv_segments[segment] = [];
                }
                analytics.clv_segments[segment].push({
                    customer_id: customerId,
                    clv: clv,
                    order_count: metrics.order_count,
                    total_spent: metrics.total_spent
                });
            });
            
            resolve(analytics);
        }).catch(reject);
    });
}

/**
 * Get gift store specific analytics
 */
async function getGiftStoreAnalytics(startDate, endDate) {
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    const inventoryDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "inventory.db"));
    
    return new Promise((resolve, reject) => {
        transactionsDB.find({
            date: {
                $gte: startDate.toISOString(),
                $lte: endDate.toISOString()
            },
            status: 1,
            $or: [
                { gift_wrapped: true },
                { gift_message: { $exists: true } },
                { occasion: { $exists: true } }
            ]
        }, function (err, giftTransactions) {
            if (err) return reject(err);
            
            const analytics = {
                gift_services_revenue: 0,
                gift_wrapping_utilization: 0,
                occasion_analysis: {},
                gift_message_analytics: {},
                gift_bundle_performance: {},
                seasonal_gift_trends: {}
            };
            
            // Process gift store transactions
            let totalRevenue = 0;
            let giftServiceRevenue = 0;
            const occasionData = {};
            
            giftTransactions.forEach(transaction => {
                const revenue = parseFloat(transaction.total || 0);
                totalRevenue += revenue;
                
                // Gift wrapping service
                if (transaction.gift_wrapped) {
                    giftServiceRevenue += revenue;
                }
                
                // Occasion analysis
                if (transaction.occasion) {
                    if (!occasionData[transaction.occasion]) {
                        occasionData[transaction.occasion] = { count: 0, revenue: 0 };
                    }
                    occasionData[transaction.occasion].count++;
                    occasionData[transaction.occasion].revenue += revenue;
                }
            });
            
            analytics.gift_services_revenue = giftServiceRevenue;
            analytics.gift_wrapping_utilization = totalRevenue > 0 ? (giftTransactions.length / giftTransactions.length) * 100 : 0;
            analytics.occasion_analysis = occasionData;
            
            resolve(analytics);
        });
    });
}

/**
 * Get marketing campaign analytics
 */
async function getMarketingCampaignAnalytics(startDate, endDate) {
    const campaignsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "marketing_campaigns.db"));
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    
    return new Promise((resolve, reject) => {
        Promise.all([
            new Promise((resolve, reject) => {
                campaignsDB.find({
                    start_date: {
                        $gte: startDate.toISOString(),
                        $lte: endDate.toISOString()
                    }
                }, function (err, campaigns) {
                    if (err) reject(err);
                    else resolve(campaigns);
                });
            }),
            new Promise((resolve, reject) => {
                transactionsDB.find({
                    date: {
                        $gte: startDate.toISOString(),
                        $lte: endDate.toISOString()
                    },
                    status: 1,
                    campaign_id: { $exists: true }
                }, function (err, campaignTransactions) {
                    if (err) reject(err);
                    else resolve(campaignTransactions);
                });
            })
        ]).then(([campaigns, campaignTransactions]) => {
            const analytics = {
                campaign_performance: {},
                roi_analysis: {},
                attribution_analysis: {},
                conversion_funnel: {},
                channel_performance: {}
            };
            
            // Process campaign data
            campaigns.forEach(campaign => {
                const campaignId = campaign._id;
                const relatedTransactions = campaignTransactions.filter(t => t.campaign_id === campaignId);
                
                const totalRevenue = relatedTransactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0);
                const totalOrders = relatedTransactions.length;
                const cost = parseFloat(campaign.budget || 0);
                
                analytics.campaign_performance[campaignId] = {
                    name: campaign.name,
                    revenue: totalRevenue,
                    orders: totalOrders,
                    cost: cost,
                    roi: cost > 0 ? ((totalRevenue - cost) / cost) * 100 : 0,
                    conversion_rate: totalOrders / (campaign.impressions || 1) * 100
                };
            });
            
            resolve(analytics);
        }).catch(reject);
    });
}

/**
 * Get retail financial analytics
 */
async function getRetailFinancialAnalytics(startDate, endDate) {
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    const inventoryDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "inventory.db"));
    
    return new Promise((resolve, reject) => {
        Promise.all([
            new Promise((resolve, reject) => {
                transactionsDB.find({
                    date: {
                        $gte: startDate.toISOString(),
                        $lte: endDate.toISOString()
                    },
                    status: 1
                }, function (err, transactions) {
                    if (err) reject(err);
                    else resolve(transactions);
                });
            }),
            new Promise((resolve, reject) => {
                inventoryDB.find({}, function (err, inventory) {
                    if (err) reject(err);
                    else resolve(inventory);
                });
            })
        ]).then(([transactions, inventory]) => {
            const analytics = {
                revenue_breakdown: {},
                cost_analysis: {},
                profit_margins: {},
                pricing_elasticity: {},
                category_profitability: {},
                gift_store_revenue: {}
            };
            
            const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0);
            const totalCOGS = inventory.reduce((sum, item) => {
                return sum + (parseFloat(item.cost || 0) * parseFloat(item.quantity || 0));
            }, 0);
            
            analytics.revenue_breakdown = {
                total_revenue: totalRevenue,
                gross_profit: totalRevenue - totalCOGS,
                gross_margin: totalRevenue > 0 ? ((totalRevenue - totalCOGS) / totalRevenue * 100) : 0
            };
            
            analytics.cost_analysis = {
                total_cogs: totalCOGS,
                inventory_value: totalCOGS,
                carrying_cost: totalCOGS * 0.15, // 15% carrying cost
                total_operating_costs: totalCOGS + (totalRevenue * 0.25) // Operating costs estimate
            };
            
            analytics.profit_margins = {
                gross_margin: analytics.revenue_breakdown.gross_margin,
                operating_margin: totalRevenue > 0 ? ((totalRevenue - totalCOGS - (totalRevenue * 0.25)) / totalRevenue * 100) : 0,
                net_margin: totalRevenue > 0 ? ((totalRevenue - totalCOGS - (totalRevenue * 0.25) - (totalRevenue * 0.10)) / totalRevenue * 100) : 0
            };
            
            resolve(analytics);
        }).catch(reject);
    });
}

/**
 * Get seasonal trend analytics
 */
async function getSeasonalTrendAnalytics(startDate, endDate) {
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    
    return new Promise((resolve, reject) => {
        transactionsDB.find({
            date: {
                $gte: startDate.toISOString(),
                $lte: endDate.toISOString()
            },
            status: 1
        }, function (err, transactions) {
            if (err) return reject(err);
            
            const analytics = {
                monthly_trends: {},
                seasonal_patterns: {},
                holiday_impact: {},
                weather_correlation: {},
                event_driven_sales: {}
            };
            
            // Process seasonal data
            const monthlyData = {};
            const seasonalData = {};
            
            transactions.forEach(transaction => {
                const date = new Date(transaction.date);
                const month = date.getMonth() + 1;
                const season = getSeason(month);
                const revenue = parseFloat(transaction.total || 0);
                
                // Monthly trends
                if (!monthlyData[month]) {
                    monthlyData[month] = { revenue: 0, orders: 0 };
                }
                monthlyData[month].revenue += revenue;
                monthlyData[month].orders++;
                
                // Seasonal patterns
                if (!seasonalData[season]) {
                    seasonalData[season] = { revenue: 0, orders: 0 };
                }
                seasonalData[season].revenue += revenue;
                seasonalData[season].orders++;
            });
            
            analytics.monthly_trends = monthlyData;
            analytics.seasonal_patterns = seasonalData;
            
            resolve(analytics);
        });
    });
}

/**
 * Get predictive analytics and forecasting
 */
async function getPredictiveAnalytics(startDate, endDate, forecastDays = 30) {
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    
    return new Promise((resolve, reject) => {
        transactionsDB.find({
            date: {
                $gte: startDate.toISOString(),
                $lte: endDate.toISOString()
            },
            status: 1
        }, function (err, transactions) {
            if (err) return reject(err);
            
            const analytics = {
                demand_forecasting: {},
                inventory_demand_prediction: {},
                customer_churn_prediction: {},
                seasonal_forecasting: {},
                trend_analysis: {},
                risk_assessment: {}
            };
            
            // Generate simple forecasting models
            analytics.demand_forecasting = generateDemandForecasting(transactions, forecastDays);
            analytics.seasonal_forecasting = generateSeasonalForecasting(transactions);
            analytics.trend_analysis = analyzeTrends(transactions);
            
            resolve(analytics);
        });
    });
}

/**
 * Get real-time KPIs
 */
async function getRealTimeKPIs() {
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    const inventoryDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "inventory.db"));
    
    return new Promise((resolve, reject) => {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
        
        Promise.all([
            new Promise((resolve, reject) => {
                transactionsDB.find({
                    date: {
                        $gte: startOfDay.toISOString(),
                        $lte: endOfDay.toISOString()
                    },
                    status: 1
                }, function (err, todayTransactions) {
                    if (err) reject(err);
                    else resolve(todayTransactions);
                });
            }),
            new Promise((resolve, reject) => {
                inventoryDB.find({ quantity: { $lt: 10 } }, function (err, lowStock) {
                    if (err) reject(err);
                    else resolve(lowStock);
                });
            })
        ]).then(([todayTransactions, lowStockItems]) => {
            const kpis = {
                today_revenue: todayTransactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0),
                today_orders: todayTransactions.length,
                average_order_value: todayTransactions.length > 0 ? 
                    todayTransactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0) / todayTransactions.length : 0,
                low_stock_alerts: lowStockItems.length,
                conversion_rate: 85 + Math.random() * 10, // Simulated
                customer_satisfaction: 90 + Math.random() * 8, // Simulated
                last_updated: new Date().toISOString()
            };
            
            resolve(kpis);
        }).catch(reject);
    });
}

// Helper Functions for Analytics Calculations

/**
 * Calculate growth metrics
 */
function calculateGrowthMetrics(dailyRevenue) {
    const days = Object.keys(dailyRevenue).sort();
    if (days.length < 14) return { revenue_growth: 0, order_growth: 0 };
    
    const recentWeek = days.slice(-7);
    const previousWeek = days.slice(-14, -7);
    
    const recentRevenue = recentWeek.reduce((sum, day) => sum + dailyRevenue[day].revenue, 0);
    const previousRevenue = previousWeek.reduce((sum, day) => sum + dailyRevenue[day].revenue, 0);
    
    const recentOrders = recentWeek.reduce((sum, day) => sum + dailyRevenue[day].orders, 0);
    const previousOrders = previousWeek.reduce((sum, day) => sum + dailyRevenue[day].orders, 0);
    
    return {
        revenue_growth: previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0,
        order_growth: previousOrders > 0 ? ((recentOrders - previousOrders) / previousOrders) * 100 : 0
    };
}

/**
 * Generate sales forecasting
 */
function generateSalesForecasting(dailyRevenue) {
    const days = Object.keys(dailyRevenue).sort();
    const recentDays = days.slice(-7);
    const avgDailyRevenue = recentDays.reduce((sum, day) => sum + dailyRevenue[day].revenue, 0) / recentDays.length;
    const avgDailyOrders = recentDays.reduce((sum, day) => sum + dailyRevenue[day].orders, 0) / recentDays.length;
    
    return {
        next_7_days: {
            predicted_revenue: avgDailyRevenue * 7,
            predicted_orders: Math.round(avgDailyOrders * 7),
            confidence: 0.75
        },
        next_30_days: {
            predicted_revenue: avgDailyRevenue * 30,
            predicted_orders: Math.round(avgDailyOrders * 30),
            confidence: 0.65
        }
    };
}

/**
 * Calculate sales velocity
 */
function calculateSalesVelocity(transactions, inventory) {
    const velocity = {};
    
    transactions.forEach(transaction => {
        if (transaction.items && Array.isArray(transaction.items)) {
            transaction.items.forEach(item => {
                const itemId = item.id || item.menu_item_id;
                const quantity = parseInt(item.quantity) || 1;
                
                if (!velocity[itemId]) {
                    velocity[itemId] = { total_sold: 0, days_active: 0 };
                }
                velocity[itemId].total_sold += quantity;
                velocity[itemId].days_active = Math.max(velocity[itemId].days_active, 
                    (new Date() - new Date(transaction.date)) / (1000 * 60 * 60 * 24));
            });
        }
    });
    
    // Calculate daily velocity
    Object.keys(velocity).forEach(itemId => {
        const data = velocity[itemId];
        data.daily_velocity = data.days_active > 0 ? data.total_sold / data.days_active : 0;
    });
    
    return velocity;
}

/**
 * Identify dead stock
 */
function identifyDeadStock(inventory, salesVelocity) {
    const deadStock = [];
    
    inventory.forEach(item => {
        const velocity = salesVelocity[item._id];
        const daysSinceLastSale = velocity ? velocity.days_active : 999;
        
        if (daysSinceLastSale > 30 || (velocity && velocity.daily_velocity < 0.1)) {
            deadStock.push({
                item_id: item._id,
                name: item.name || item.product_name,
                quantity: item.quantity || 0,
                days_since_sale: Math.round(daysSinceLastSale),
                recommended_action: daysSinceLastSale > 60 ? 'remove' : 'discount'
            });
        }
    });
    
    return {
        dead_stock_items: deadStock,
        total_dead_stock_value: deadStock.reduce((sum, item) => sum + (item.quantity * (item.cost || 0)), 0),
        percentage_of_inventory: inventory.length > 0 ? (deadStock.length / inventory.length) * 100 : 0
    };
}

/**
 * Calculate inventory turnover
 */
function calculateInventoryTurnover(inventory, transactions) {
    const totalInventoryValue = inventory.reduce((sum, item) => 
        sum + (parseFloat(item.cost || 0) * parseFloat(item.quantity || 0)), 0);
    
    const totalSalesValue = transactions.reduce((sum, transaction) => 
        sum + parseFloat(transaction.total || 0), 0);
    
    return {
        turnover_ratio: totalInventoryValue > 0 ? totalSalesValue / totalInventoryValue : 0,
        days_of_inventory: totalSalesValue > 0 ? (totalInventoryValue / totalSalesValue) * 365 : 0,
        optimal_turnover_ratio: 4.0 // Industry benchmark
    };
}

/**
 * Generate reorder recommendations
 */
function generateReorderRecommendations(inventory, salesVelocity) {
    const recommendations = [];
    
    inventory.forEach(item => {
        const velocity = salesVelocity[item._id];
        if (velocity && velocity.daily_velocity > 0) {
            const currentStock = parseFloat(item.quantity || 0);
            const dailyVelocity = velocity.daily_velocity;
            const leadTime = 7; // Assume 7 days lead time
            const safetyStock = dailyVelocity * 3; // 3 days safety stock
            
            const reorderPoint = (dailyVelocity * leadTime) + safetyStock;
            const optimalOrderQuantity = reorderPoint * 2; // Order for 2 cycles
            
            if (currentStock <= reorderPoint) {
                recommendations.push({
                    item_id: item._id,
                    name: item.name || item.product_name,
                    current_stock: currentStock,
                    reorder_point: Math.round(reorderPoint),
                    recommended_quantity: Math.round(optimalOrderQuantity),
                    urgency: currentStock <= safetyStock ? 'high' : 'medium'
                });
            }
        }
    });
    
    return {
        total_recommended_orders: recommendations.length,
        high_priority_orders: recommendations.filter(r => r.urgency === 'high').length,
        total_estimated_cost: recommendations.reduce((sum, r) => sum + (r.recommended_quantity * (r.cost || 0)), 0),
        recommendations: recommendations
    };
}

/**
 * Optimize stock levels
 */
function optimizeStockLevels(inventory, salesVelocity) {
    return {
        overstocked_items: inventory.filter(item => {
            const velocity = salesVelocity[item._id];
            return velocity && parseFloat(item.quantity || 0) > velocity.daily_velocity * 60;
        }).length,
        understocked_items: inventory.filter(item => {
            const velocity = salesVelocity[item._id];
            return velocity && parseFloat(item.quantity || 0) < velocity.daily_velocity * 7;
        }).length,
        optimal_stock_items: inventory.filter(item => {
            const velocity = salesVelocity[item._id];
            return velocity && parseFloat(item.quantity || 0) >= velocity.daily_velocity * 7 && 
                   parseFloat(item.quantity || 0) <= velocity.daily_velocity * 30;
        }).length
    };
}

/**
 * Get season from month
 */
function getSeason(month) {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
}

/**
 * Generate demand forecasting
 */
function generateDemandForecasting(transactions, forecastDays) {
    const dailySales = {};
    
    transactions.forEach(transaction => {
        const date = new Date(transaction.date).toISOString().split('T')[0];
        if (!dailySales[date]) {
            dailySales[date] = 0;
        }
        dailySales[date] += parseFloat(transaction.total || 0);
    });
    
    const salesValues = Object.values(dailySales);
    const avgDailySales = salesValues.length > 0 ? salesValues.reduce((a, b) => a + b, 0) / salesValues.length : 0;
    
    return {
        forecast_period_days: forecastDays,
        predicted_daily_sales: avgDailySales,
        predicted_total_sales: avgDailySales * forecastDays,
        confidence_interval: {
            lower: avgDailySales * 0.8 * forecastDays,
            upper: avgDailySales * 1.2 * forecastDays
        }
    };
}

/**
 * Generate seasonal forecasting
 */
function generateSeasonalForecasting(transactions) {
    const seasonalData = { spring: 0, summer: 0, fall: 0, winter: 0 };
    
    transactions.forEach(transaction => {
        const month = new Date(transaction.date).getMonth() + 1;
        const season = getSeason(month);
        seasonalData[season] += parseFloat(transaction.total || 0);
    });
    
    const totalSales = Object.values(seasonalData).reduce((a, b) => a + b, 0);
    
    // Calculate seasonal multipliers
    const seasonalMultipliers = {};
    Object.keys(seasonalData).forEach(season => {
        seasonalMultipliers[season] = totalSales > 0 ? (seasonalData[season] / totalSales) * 4 : 1;
    });
    
    return {
        historical_seasonal_data: seasonalData,
        seasonal_multipliers: seasonalMultipliers,
        next_quarter_forecast: {
            predicted_spring: totalSales * 0.25 * seasonalMultipliers.spring,
            predicted_summer: totalSales * 0.25 * seasonalMultipliers.summer,
            predicted_fall: totalSales * 0.25 * seasonalMultipliers.fall,
            predicted_winter: totalSales * 0.25 * seasonalMultipliers.winter
        }
    };
}

/**
 * Analyze trends
 */
function analyzeTrends(transactions) {
    const monthlyRevenue = {};
    
    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyRevenue[monthKey]) {
            monthlyRevenue[monthKey] = 0;
        }
        monthlyRevenue[monthKey] += parseFloat(transaction.total || 0);
    });
    
    const months = Object.keys(monthlyRevenue).sort();
    const trends = {
        direction: 'stable',
        strength: 0,
        growth_rate: 0
    };
    
    if (months.length >= 3) {
        const recent = monthlyRevenue[months[months.length - 1]];
        const previous = monthlyRevenue[months[months.length - 2]];
        const growth = previous > 0 ? ((recent - previous) / previous) * 100 : 0;
        
        trends.growth_rate = growth;
        trends.direction = growth > 5 ? 'increasing' : growth < -5 ? 'decreasing' : 'stable';
        trends.strength = Math.abs(growth);
    }
    
    return {
        monthly_revenue_trend: monthlyRevenue,
        trend_analysis: trends,
        prediction: trends.direction === 'increasing' ? 'positive_outlook' : 
                   trends.direction === 'decreasing' ? 'requires_attention' : 'stable_outlook'
    };
}

/**
 * Generate custom retail report
 */
async function generateCustomRetailReport(config) {
    const { report_type, date_range, metrics, filters } = config;
    const startDate = new Date(date_range.start);
    const endDate = new Date(date_range.end);
    
    const report = {
        report_type,
        date_range: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
        },
        generated_at: new Date().toISOString(),
        data: {},
        summary: {},
        recommendations: [],
        visualizations: []
    };
    
    // Generate requested metrics
    const metricFunctions = {
        retail_sales: () => getRetailSalesAnalytics(startDate, endDate),
        inventory_optimization: () => getInventoryOptimizationAnalytics(startDate, endDate),
        variant_performance: () => getVariantPerformanceAnalytics(startDate, endDate),
        customer_ltv: () => getCustomerLifetimeValueAnalytics(startDate, endDate),
        gift_store: () => getGiftStoreAnalytics(startDate, endDate),
        marketing_roi: () => getMarketingCampaignAnalytics(startDate, endDate),
        financial: () => getRetailFinancialAnalytics(startDate, endDate),
        seasonal_trends: () => getSeasonalTrendAnalytics(startDate, endDate),
        predictive: () => getPredictiveAnalytics(startDate, endDate)
    };
    
    for (const metric of metrics) {
        if (metricFunctions[metric]) {
            try {
                report.data[metric] = await metricFunctions[metric]();
            } catch (error) {
                console.error(`Error generating ${metric} metric:`, error);
                report.data[metric] = { error: error.message };
            }
        }
    }
    
    // Generate summary and recommendations
    report.summary = generateRetailReportSummary(report.data);
    report.recommendations = generateRetailRecommendations(report.data);
    
    return report;
}

/**
 * Generate retail report summary
 */
function generateRetailReportSummary(data) {
    const summary = {
        total_revenue: 0,
        key_insights: [],
        performance_indicators: {}
    };
    
    if (data.retail_sales) {
        summary.total_revenue += data.retail_sales.total_revenue || 0;
    }
    
    if (data.inventory_optimization) {
        const optimization = data.inventory_optimization;
        summary.performance_indicators.dead_stock_percentage = optimization.dead_stock_analysis?.percentage_of_inventory || 0;
        summary.performance_indicators.inventory_turnover = optimization.inventory_turnover?.turnover_ratio || 0;
    }
    
    return summary;
}

/**
 * Generate retail recommendations
 */
function generateRetailRecommendations(data) {
    const recommendations = [];
    
    if (data.inventory_optimization?.dead_stock_analysis?.dead_stock_items?.length > 0) {
        recommendations.push({
            area: 'Inventory Management',
            priority: 'high',
            recommendation: `Consider clearing ${data.inventory_optimization.dead_stock_analysis.dead_stock_items.length} dead stock items`,
            impact: 'High',
            action: 'Review and liquidate slow-moving inventory'
        });
    }
    
    if (data.retail_sales?.growth_metrics?.revenue_growth < 0) {
        recommendations.push({
            area: 'Sales Performance',
            priority: 'high',
            recommendation: 'Implement promotional strategies to reverse negative revenue trend',
            impact: 'High',
            action: 'Launch targeted marketing campaigns'
        });
    }
    
    return recommendations;
}

module.exports = app;