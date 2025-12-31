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
    "analytics.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

// Initialize analytics database
let analyticsDB = getDatabase(dbPath);
analyticsDB.ensureIndex({ fieldName: "_id", unique: true });
analyticsDB.ensureIndex({ fieldName: "date" });
analyticsDB.ensureIndex({ fieldName: "report_type" });

/**
 * GET endpoint: Get the welcome message for the Analytics API.
 */
app.get("/", function (req, res) {
    res.send("Analytics API - Restaurant Analytics System");
});

/**
 * GET endpoint: Get comprehensive dashboard analytics
 */
app.get("/dashboard", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    Promise.all([
        getSalesAnalytics(startDate, endDate),
        getMenuPerformanceAnalytics(startDate, endDate),
        getKitchenAnalytics(startDate, endDate),
        getTableAnalytics(startDate, endDate),
        getComboAnalytics(startDate, endDate),
        getCustomerAnalytics(startDate, endDate),
        getFinancialAnalytics(startDate, endDate),
        getOperationalAnalytics(startDate, endDate)
    ]).then(([sales, menu, kitchen, tables, combos, customers, financial, operational]) => {
        res.send({
            sales,
            menu_performance: menu,
            kitchen,
            table_analytics: tables,
            combo_performance: combos,
            customer_analytics: customers,
            financial,
            operational,
            date_range: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString()
            },
            generated_at: new Date().toISOString()
        });
    }).catch(error => {
        console.error("Analytics dashboard error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to generate analytics dashboard"
        });
    });
});

/**
 * GET endpoint: Get sales analytics with trends and forecasting
 */
app.get("/sales", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    const granularity = req.query.granularity || 'day'; // day, week, month
    
    getSalesAnalytics(startDate, endDate, granularity)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Sales analytics error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate sales analytics"
            });
        });
});

/**
 * GET endpoint: Get menu performance analytics
 */
app.get("/menu-performance", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    getMenuPerformanceAnalytics(startDate, endDate)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Menu performance analytics error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate menu performance analytics"
            });
        });
});

/**
 * GET endpoint: Get kitchen performance analytics
 */
app.get("/kitchen-performance", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    getKitchenAnalytics(startDate, endDate)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Kitchen performance analytics error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate kitchen performance analytics"
            });
        });
});

/**
 * GET endpoint: Get table analytics
 */
app.get("/table-analytics", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    getTableAnalytics(startDate, endDate)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Table analytics error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate table analytics"
            });
        });
});

/**
 * GET endpoint: Get combo meal analytics
 */
app.get("/combo-analytics", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    getComboAnalytics(startDate, endDate)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Combo analytics error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate combo analytics"
            });
        });
});

/**
 * GET endpoint: Get customer behavior analytics
 */
app.get("/customer-analytics", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    getCustomerAnalytics(startDate, endDate)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Customer analytics error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate customer analytics"
            });
        });
});

/**
 * GET endpoint: Get financial analytics
 */
app.get("/financial", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    getFinancialAnalytics(startDate, endDate)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Financial analytics error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate financial analytics"
            });
        });
});

/**
 * GET endpoint: Get operational metrics
 */
app.get("/operational", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();

    getOperationalAnalytics(startDate, endDate)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Operational analytics error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate operational analytics"
            });
        });
});

/**
 * GET endpoint: Get comprehensive menu engineering analytics
 */
app.get("/menu-engineering", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();

    getMenuEngineeringAnalytics(startDate, endDate)
        .then(analytics => res.send(analytics))
        .catch(error => {
            console.error("Menu engineering analytics error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate menu engineering analytics"
            });
        });
});

/**
 * GET endpoint: Get menu engineering matrix data
 */
app.get("/menu-engineering/matrix", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();

    getMenuEngineeringMatrix(startDate, endDate)
        .then(matrix => res.send(matrix))
        .catch(error => {
            console.error("Menu engineering matrix error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate menu engineering matrix"
            });
        });
});

/**
 * GET endpoint: Get menu engineering trends and seasonal analysis
 */
app.get("/menu-engineering/trends", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    const granularity = req.query.granularity || 'month';

    getMenuEngineeringTrends(startDate, endDate, granularity)
        .then(trends => res.send(trends))
        .catch(error => {
            console.error("Menu engineering trends error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate menu engineering trends"
            });
        });
});

/**
 * POST endpoint: Generate custom analytics report
 */
app.post("/custom-report", function (req, res) {
    const { report_config } = req.body;
    
    if (!report_config) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Report configuration is required"
        });
    }
    
    generateCustomReport(report_config)
        .then(report => res.send(report))
        .catch(error => {
            console.error("Custom report generation error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate custom report"
            });
        });
});

/**
 * GET endpoint: Export analytics data
 */
app.get("/export", function (req, res) {
    const format = req.query.format || 'csv';
    const report_type = req.query.report_type || 'dashboard';
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    exportAnalyticsData(format, report_type, startDate, endDate)
        .then(data => {
            const filename = `analytics_${report_type}_${new Date().toISOString().split('T')[0]}.${format}`;
            
            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.send(data);
            } else if (format === 'json') {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.send(data);
            }
        })
        .catch(error => {
            console.error("Analytics export error:", error);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to export analytics data"
            });
        });
});

/**
 * POST endpoint: Store analytics snapshot
 */
app.post("/snapshot", function (req, res) {
    const snapshotData = req.body;
    
    if (!snapshotData.report_type || !snapshotData.date) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Report type and date are required"
        });
    }
    
    const snapshot = {
        _id: snapshotData._id || `${snapshotData.report_type}_${snapshotData.date}`,
        date: snapshotData.date,
        report_type: snapshotData.report_type,
        data: snapshotData.data,
        created_at: new Date().toISOString(),
        created_by: snapshotData.created_by || "system"
    };
    
    analyticsDB.insert(snapshot, function (err, newSnapshot) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to store analytics snapshot"
            });
        } else {
            res.status(201).json(newSnapshot);
        }
    });
});

/**
 * GET endpoint: Get analytics history
 */
app.get("/history", function (req, res) {
    const report_type = req.query.report_type;
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    let query = {
        date: {
            $gte: startDate.toISOString(),
            $lte: endDate.toISOString()
        }
    };
    
    if (report_type) {
        query.report_type = report_type;
    }
    
    analyticsDB.find(query).sort({ date: -1 }).exec(function (err, snapshots) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve analytics history"
            });
        } else {
            res.send(snapshots);
        }
    });
});

// Helper Functions

/**
 * Get sales analytics with trends and patterns
 */
async function getSalesAnalytics(startDate, endDate, granularity = 'day') {
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
                total_revenue: 0,
                total_orders: transactions.length,
                average_order_value: 0,
                revenue_trends: {},
                hourly_patterns: {},
                daily_patterns: {},
                monthly_trends: {},
                peak_hours: [],
                peak_days: [],
                growth_metrics: {},
                forecasts: {}
            };
            
            if (transactions.length === 0) return resolve(analytics);
            
            // Calculate basic metrics
            analytics.total_revenue = transactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0);
            analytics.average_order_value = analytics.total_revenue / transactions.length;
            
            // Group by time periods
            transactions.forEach(transaction => {
                const date = new Date(transaction.date);
                const hour = date.getHours();
                const dayOfWeek = date.getDay();
                const month = date.getMonth();
                const year = date.getFullYear();
                
                // Hourly patterns
                if (!analytics.hourly_patterns[hour]) {
                    analytics.hourly_patterns[hour] = { revenue: 0, orders: 0 };
                }
                analytics.hourly_patterns[hour].revenue += parseFloat(transaction.total || 0);
                analytics.hourly_patterns[hour].orders++;
                
                // Daily patterns (day of week)
                if (!analytics.daily_patterns[dayOfWeek]) {
                    analytics.daily_patterns[dayOfWeek] = { revenue: 0, orders: 0 };
                }
                analytics.daily_patterns[dayOfWeek].revenue += parseFloat(transaction.total || 0);
                analytics.daily_patterns[dayOfWeek].orders++;
                
                // Monthly trends
                const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
                if (!analytics.monthly_trends[monthKey]) {
                    analytics.monthly_trends[monthKey] = { revenue: 0, orders: 0 };
                }
                analytics.monthly_trends[monthKey].revenue += parseFloat(transaction.total || 0);
                analytics.monthly_trends[monthKey].orders++;
                
                // Granularity-based trends
                let trendKey;
                switch (granularity) {
                    case 'week':
                        const weekStart = new Date(date);
                        weekStart.setDate(date.getDate() - date.getDay());
                        trendKey = weekStart.toISOString().split('T')[0];
                        break;
                    case 'month':
                        trendKey = `${year}-${String(month + 1).padStart(2, '0')}`;
                        break;
                    default: // day
                        trendKey = date.toISOString().split('T')[0];
                }
                
                if (!analytics.revenue_trends[trendKey]) {
                    analytics.revenue_trends[trendKey] = { revenue: 0, orders: 0 };
                }
                analytics.revenue_trends[trendKey].revenue += parseFloat(transaction.total || 0);
                analytics.revenue_trends[trendKey].orders++;
            });
            
            // Calculate peak hours and days
            analytics.peak_hours = Object.entries(analytics.hourly_patterns)
                .map(([hour, data]) => ({ hour: parseInt(hour), revenue: data.revenue, orders: data.orders }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);
                
            analytics.peak_days = Object.entries(analytics.daily_patterns)
                .map(([day, data]) => ({ day: parseInt(day), revenue: data.revenue, orders: data.orders }))
                .sort((a, b) => b.revenue - a.revenue);
            
            // Calculate growth metrics (simplified)
            const sortedTrends = Object.entries(analytics.revenue_trends)
                .sort(([a], [b]) => new Date(a) - new Date(b));
            
            if (sortedTrends.length >= 2) {
                const recent = sortedTrends.slice(-7); // Last 7 periods
                const previous = sortedTrends.slice(-14, -7); // Previous 7 periods
                
                const recentRevenue = recent.reduce((sum, [, data]) => sum + data.revenue, 0);
                const previousRevenue = previous.reduce((sum, [, data]) => sum + data.revenue, 0);
                
                analytics.growth_metrics = {
                    revenue_growth: previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue * 100) : 0,
                    order_growth: recent.reduce((sum, [, data]) => sum + data.orders, 0) - 
                                previous.reduce((sum, [, data]) => sum + data.orders, 0),
                    average_order_value_change: (recentRevenue / recent.reduce((sum, [, data]) => sum + data.orders, 0)) - 
                                               (previousRevenue / previous.reduce((sum, [, data]) => sum + data.orders, 0))
                };
            }
            
            resolve(analytics);
        });
    });
}

/**
 * Get menu performance analytics
 */
async function getMenuPerformanceAnalytics(startDate, endDate) {
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    const inventoryDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "inventory.db"));
    
    return new Promise(async (resolve, reject) => {
        try {
            // Get transactions with items
            transactionsDB.find({
                date: {
                    $gte: startDate.toISOString(),
                    $lte: endDate.toISOString()
                },
                status: 1
            }, function (err, transactions) {
                if (err) return reject(err);
                
                // Get menu items
                inventoryDB.find({}, function (err, menuItems) {
                    if (err) return reject(err);
                    
                    const menuAnalytics = {
                        top_selling_items: [],
                        low_performing_items: [],
                        category_performance: {},
                        profitability_analysis: {},
                        menu_engineering: {
                            stars: [], // High margin, high volume
                            plow_horses: [], // Low margin, high volume
                            puzzles: [], // High margin, low volume
                            dogs: [] // Low margin, low volume
                        },
                        item_frequency: {},
                        revenue_per_item: {},
                        profit_margins: {}
                    };
                    
                    if (transactions.length === 0 || menuItems.length === 0) {
                        return resolve(menuAnalytics);
                    }
                    
                    const itemSales = {};
                    const itemRevenue = {};
                    const itemProfits = {};
                    
                    // Process transactions
                    transactions.forEach(transaction => {
                        if (transaction.items && Array.isArray(transaction.items)) {
                            transaction.items.forEach(item => {
                                const itemId = item.id || item.menu_item_id;
                                const quantity = parseInt(item.quantity) || 1;
                                const price = parseFloat(item.price) || 0;
                                
                                if (!itemSales[itemId]) {
                                    itemSales[itemId] = 0;
                                    itemRevenue[itemId] = 0;
                                    itemProfits[itemId] = 0;
                                }
                                
                                itemSales[itemId] += quantity;
                                itemRevenue[itemId] += quantity * price;
                                
                                // Calculate profit (simplified - would need cost data)
                                const menuItem = menuItems.find(mi => mi._id == itemId);
                                if (menuItem && menuItem.cost) {
                                    const cost = parseFloat(menuItem.cost) || 0;
                                    itemProfits[itemId] += quantity * (price - cost);
                                }
                            });
                        }
                    });
                    
                    // Calculate item performance
                    const allItems = menuItems.map(item => ({
                        ...item,
                        sales: itemSales[item._id] || 0,
                        revenue: itemRevenue[item._id] || 0,
                        profit: itemProfits[item._id] || 0,
                        margin: itemRevenue[item._id] > 0 ? 
                               ((itemProfits[item._id] || 0) / itemRevenue[item._id] * 100) : 0
                    }));
                    
                    // Top selling items
                    menuAnalytics.top_selling_items = allItems
                        .sort((a, b) => b.sales - a.sales)
                        .slice(0, 10);
                    
                    // Low performing items
                    menuAnalytics.low_performing_items = allItems
                        .filter(item => item.sales > 0)
                        .sort((a, b) => a.sales - b.sales)
                        .slice(0, 10);
                    
                    // Category performance
                    const categoryMap = {};
                    allItems.forEach(item => {
                        const category = item.category || 'Uncategorized';
                        if (!categoryMap[category]) {
                            categoryMap[category] = { revenue: 0, sales: 0, items: 0, profit: 0 };
                        }
                        categoryMap[category].revenue += item.revenue;
                        categoryMap[category].sales += item.sales;
                        categoryMap[category].items++;
                        categoryMap[category].profit += item.profit;
                    });
                    
                    menuAnalytics.category_performance = categoryMap;
                    
                    // Menu Engineering Classification
                    const avgSales = allItems.reduce((sum, item) => sum + item.sales, 0) / allItems.length;
                    const avgMargin = allItems.reduce((sum, item) => sum + item.margin, 0) / allItems.length;
                    
                    allItems.forEach(item => {
                        if (item.sales >= avgSales && item.margin >= avgMargin) {
                            menuAnalytics.menu_engineering.stars.push(item);
                        } else if (item.sales >= avgSales && item.margin < avgMargin) {
                            menuAnalytics.menu_engineering.plow_horses.push(item);
                        } else if (item.sales < avgSales && item.margin >= avgMargin) {
                            menuAnalytics.menu_engineering.puzzles.push(item);
                        } else {
                            menuAnalytics.menu_engineering.dogs.push(item);
                        }
                    });
                    
                    resolve(menuAnalytics);
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Get kitchen performance analytics
 */
async function getKitchenAnalytics(startDate, endDate) {
    const kitchenDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "kitchen_orders.db"));
    
    return new Promise((resolve, reject) => {
        kitchenDB.find({
            order_time: {
                $gte: startDate.toISOString(),
                $lte: endDate.toISOString()
            }
        }, function (err, orders) {
            if (err) return reject(err);
            
            const kitchenAnalytics = {
                total_orders: orders.length,
                completed_orders: orders.filter(o => o.order_status === 'served').length,
                cancelled_orders: orders.filter(o => o.order_status === 'cancelled').length,
                average_prep_time: 0,
                on_time_delivery_rate: 0,
                station_performance: {},
                hourly_breakdown: {},
                peak_hours: [],
                bottlenecks: [],
                efficiency_metrics: {},
                quality_metrics: {}
            };
            
            if (orders.length === 0) return resolve(kitchenAnalytics);
            
            // Calculate average prep time
            const completedOrders = orders.filter(o => o.actual_completion && o.order_time);
            if (completedOrders.length > 0) {
                const totalPrepTime = completedOrders.reduce((sum, order) => {
                    const start = new Date(order.order_time);
                    const end = new Date(order.actual_completion);
                    return sum + (end - start) / (1000 * 60); // Convert to minutes
                }, 0);
                kitchenAnalytics.average_prep_time = Math.round(totalPrepTime / completedOrders.length);
            }
            
            // Calculate on-time delivery rate
            const ordersWithEstimates = orders.filter(o => o.estimated_completion && o.actual_completion);
            if (ordersWithEstimates.length > 0) {
                const onTimeOrders = ordersWithEstimates.filter(order => {
                    return new Date(order.actual_completion) <= new Date(order.estimated_completion);
                }).length;
                kitchenAnalytics.on_time_delivery_rate = Math.round((onTimeOrders / ordersWithEstimates.length) * 100);
            }
            
            // Station performance
            const stationStats = {};
            orders.forEach(order => {
                order.items.forEach(item => {
                    const station = item.kitchen_station || 'general';
                    if (!stationStats[station]) {
                        stationStats[station] = {
                            total_items: 0,
                            completed_items: 0,
                            total_prep_time: 0,
                            on_time_items: 0
                        };
                    }
                    
                    stationStats[station].total_items++;
                    if (item.completed_at) {
                        stationStats[station].completed_items++;
                        const prepTime = (new Date(item.completed_at) - new Date(item.started_at || order.order_time)) / (1000 * 60);
                        stationStats[station].total_prep_time += prepTime;
                    }
                    
                    if (item.completed_at && order.estimated_completion) {
                        if (new Date(item.completed_at) <= new Date(order.estimated_completion)) {
                            stationStats[station].on_time_items++;
                        }
                    }
                });
            });
            
            // Calculate station metrics
            Object.keys(stationStats).forEach(station => {
                const stats = stationStats[station];
                kitchenAnalytics.station_performance[station] = {
                    completion_rate: stats.total_items > 0 ? Math.round((stats.completed_items / stats.total_items) * 100) : 0,
                    average_prep_time: stats.completed_items > 0 ? Math.round(stats.total_prep_time / stats.completed_items) : 0,
                    on_time_rate: stats.total_items > 0 ? Math.round((stats.on_time_items / stats.total_items) * 100) : 0,
                    total_items: stats.total_items
                };
            });
            
            // Hourly breakdown
            orders.forEach(order => {
                const hour = new Date(order.order_time).getHours();
                if (!kitchenAnalytics.hourly_breakdown[hour]) {
                    kitchenAnalytics.hourly_breakdown[hour] = 0;
                }
                kitchenAnalytics.hourly_breakdown[hour]++;
            });
            
            // Peak hours
            kitchenAnalytics.peak_hours = Object.entries(kitchenAnalytics.hourly_breakdown)
                .map(([hour, count]) => ({ hour: parseInt(hour), orders: count }))
                .sort((a, b) => b.orders - a.orders)
                .slice(0, 5);
            
            // Identify bottlenecks (stations with lowest performance)
            kitchenAnalytics.bottlenecks = Object.entries(kitchenAnalytics.station_performance)
                .map(([station, data]) => ({ station, ...data }))
                .sort((a, b) => a.average_prep_time - b.average_prep_time)
                .slice(0, 3);
            
            resolve(kitchenAnalytics);
        });
    });
}

/**
 * Get table analytics
 */
async function getTableAnalytics(startDate, endDate) {
    const tableOrdersDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "table_orders.db"));
    const tablesDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "tables.db"));
    
    return new Promise((resolve, reject) => {
        Promise.all([
            new Promise((resolve, reject) => {
                tableOrdersDB.find({
                    order_time: {
                        $gte: startDate.toISOString(),
                        $lte: endDate.toISOString()
                    }
                }, function (err, orders) {
                    if (err) return reject(err);
                    resolve(orders);
                });
            }),
            new Promise((resolve, reject) => {
                tablesDB.find({}, function (err, tables) {
                    if (err) return reject(err);
                    resolve(tables);
                });
            })
        ]).then(([orders, tables]) => {
            const tableAnalytics = {
                total_tables: tables.length,
                total_orders: orders.length,
                average_turnover_time: 0,
                table_utilization: {},
                revenue_per_table: {},
                peak_hours: {},
                server_performance: {},
                table_ranking: [],
                capacity_analysis: {},
                turnover_metrics: {}
            };
            
            if (orders.length === 0 || tables.length === 0) {
                return resolve(tableAnalytics);
            }
            
            const totalTimeRange = (endDate - startDate) / (1000 * 60 * 60); // Hours
            
            // Calculate table utilization
            tables.forEach(table => {
                const tableOrders = orders.filter(o => o.table_id === table._id);
                const occupiedTime = tableOrders.reduce((sum, order) => {
                    if (order.actual_service_time) {
                        const start = new Date(order.order_time);
                        const end = new Date(order.actual_service_time);
                        return sum + (end - start) / (1000 * 60 * 60); // Convert to hours
                    }
                    return sum;
                }, 0);
                
                tableAnalytics.table_utilization[table._id] = {
                    table_number: table.table_number,
                    total_orders: tableOrders.length,
                    occupied_hours: occupiedTime,
                    utilization_percentage: Math.round((occupiedTime / totalTimeRange) * 100),
                    revenue: tableOrders.reduce((sum, order) => sum + (order.bill_total || 0), 0)
                };
            });
            
            // Revenue per table
            Object.values(tableAnalytics.table_utilization).forEach(table => {
                if (table.total_orders > 0) {
                    tableAnalytics.revenue_per_table[table.table_number] = {
                        total_revenue: table.revenue,
                        average_revenue: table.revenue / table.total_orders,
                        orders: table.total_orders
                    };
                }
            });
            
            // Peak hours
            orders.forEach(order => {
                const hour = new Date(order.order_time).getHours();
                if (!tableAnalytics.peak_hours[hour]) {
                    tableAnalytics.peak_hours[hour] = 0;
                }
                tableAnalytics.peak_hours[hour]++;
            });
            
            // Server performance
            orders.forEach(order => {
                if (order.server_id) {
                    if (!tableAnalytics.server_performance[order.server_id]) {
                        tableAnalytics.server_performance[order.server_id] = {
                            total_orders: 0,
                            total_revenue: 0,
                            average_service_time: 0
                        };
                    }
                    
                    const server = tableAnalytics.server_performance[order.server_id];
                    server.total_orders++;
                    server.total_revenue += order.bill_total || 0;
                    
                    if (order.actual_service_time) {
                        const serviceTime = (new Date(order.actual_service_time) - new Date(order.order_time)) / (1000 * 60);
                        server.average_service_time += serviceTime;
                    }
                }
            });
            
            // Calculate averages for server performance
            Object.keys(tableAnalytics.server_performance).forEach(serverId => {
                const server = tableAnalytics.server_performance[serverId];
                server.average_revenue = server.total_revenue / server.total_orders;
                if (server.total_orders > 0) {
                    server.average_service_time = Math.round(server.average_service_time / server.total_orders);
                }
            });
            
            // Table ranking by revenue
            tableAnalytics.table_ranking = Object.values(tableAnalytics.table_utilization)
                .sort((a, b) => b.revenue - a.revenue);
            
            // Capacity analysis
            const capacityUtilization = {};
            tables.forEach(table => {
                const utilization = tableAnalytics.table_utilization[table._id];
                if (utilization) {
                    const capacityKey = `${table.capacity}_seats`;
                    if (!capacityUtilization[capacityKey]) {
                        capacityUtilization[capacityKey] = {
                            capacity: table.capacity,
                            tables: 0,
                            total_utilization: 0,
                            total_revenue: 0
                        };
                    }
                    capacityUtilization[capacityKey].tables++;
                    capacityUtilization[capacityKey].total_utilization += utilization.utilization_percentage;
                    capacityUtilization[capacityKey].total_revenue += utilization.revenue;
                }
            });
            
            // Calculate averages for capacity analysis
            Object.keys(capacityUtilization).forEach(capacity => {
                const data = capacityUtilization[capacity];
                data.average_utilization = Math.round(data.total_utilization / data.tables);
                data.average_revenue_per_table = data.total_revenue / data.tables;
            });
            
            tableAnalytics.capacity_analysis = capacityUtilization;
            
            // Calculate average turnover time
            const completedOrders = orders.filter(o => o.actual_service_time);
            if (completedOrders.length > 0) {
                const totalTurnoverTime = completedOrders.reduce((sum, order) => {
                    const start = new Date(order.order_time);
                    const end = new Date(order.actual_service_time);
                    return sum + (end - start) / (1000 * 60); // Convert to minutes
                }, 0);
                tableAnalytics.average_turnover_time = Math.round(totalTurnoverTime / completedOrders.length);
            }
            
            resolve(tableAnalytics);
        }).catch(reject);
    });
}

/**
 * Get combo meal analytics
 */
async function getComboAnalytics(startDate, endDate) {
    const combosDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "combos.db"));
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    
    return new Promise((resolve, reject) => {
        Promise.all([
            new Promise((resolve, reject) => {
                combosDB.find({}, function (err, combos) {
                    if (err) return reject(err);
                    resolve(combos);
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
                    if (err) return reject(err);
                    resolve(transactions);
                });
            })
        ]).then(([combos, transactions]) => {
            const comboAnalytics = {
                total_combos: combos.length,
                active_combos: combos.filter(c => c.is_active).length,
                combo_sales_percentage: 0,
                total_combo_revenue: 0,
                top_performing_combos: [],
                category_performance: {},
                upsell_effectiveness: {},
                combo_popularity_trends: {},
                pricing_analysis: {},
                customer_preferences: {}
            };
            
            if (combos.length === 0) {
                return resolve(comboAnalytics);
            }
            
            // Calculate combo sales from transactions
            let totalRevenue = 0;
            let comboRevenue = 0;
            
            transactions.forEach(transaction => {
                totalRevenue += parseFloat(transaction.total || 0);
                
                // Check if transaction contains combo items (simplified detection)
                if (transaction.items && Array.isArray(transaction.items)) {
                    const hasComboItems = transaction.items.some(item => {
                        return combos.some(combo => 
                            combo.components.some(component => 
                                component.menu_item_ids.includes(item.id)
                            )
                        );
                    });
                    
                    if (hasComboItems) {
                        comboRevenue += parseFloat(transaction.total || 0);
                    }
                }
            });
            
            comboAnalytics.combo_sales_percentage = totalRevenue > 0 ? Math.round((comboRevenue / totalRevenue) * 100) : 0;
            comboAnalytics.total_combo_revenue = comboRevenue;
            
            // Top performing combos
            comboAnalytics.top_performing_combos = combos
                .filter(combo => combo.total_sold > 0)
                .sort((a, b) => b.total_sold - a.total_sold)
                .slice(0, 10);
            
            // Category performance
            const categoryStats = {};
            combos.forEach(combo => {
                const category = combo.category || 'Uncategorized';
                if (!categoryStats[category]) {
                    categoryStats[category] = {
                        total_sold: 0,
                        revenue: 0,
                        count: 0,
                        average_price: 0
                    };
                }
                categoryStats[category].total_sold += combo.total_sold || 0;
                categoryStats[category].revenue += combo.revenue_generated || 0;
                categoryStats[category].count++;
            });
            
            // Calculate averages for categories
            Object.keys(categoryStats).forEach(category => {
                const stats = categoryStats[category];
                stats.average_price = stats.total_sold > 0 ? stats.revenue / stats.total_sold : 0;
            });
            
            comboAnalytics.category_performance = categoryStats;
            
            // Pricing analysis
            const pricingData = combos.map(combo => ({
                name: combo.combo_name,
                base_price: combo.base_price || 0,
                combo_price: combo.combo_price || 0,
                discount_amount: combo.discount_amount || 0,
                discount_percentage: combo.discount_percentage || 0,
                sales: combo.total_sold || 0,
                revenue: combo.revenue_generated || 0
            }));
            
            comboAnalytics.pricing_analysis = {
                average_base_price: pricingData.reduce((sum, combo) => sum + combo.base_price, 0) / pricingData.length,
                average_combo_price: pricingData.reduce((sum, combo) => sum + combo.combo_price, 0) / pricingData.length,
                average_discount: pricingData.reduce((sum, combo) => sum + combo.discount_percentage, 0) / pricingData.length,
                price_range: {
                    min: Math.min(...pricingData.map(combo => combo.combo_price)),
                    max: Math.max(...pricingData.map(combo => combo.combo_price))
                }
            };
            
            // Combo popularity trends (simplified - would need historical data)
            comboAnalytics.combo_popularity_trends = combos
                .slice(0, 5)
                .map(combo => ({
                    name: combo.combo_name,
                    current_sales: combo.total_sold || 0,
                    trend: 'stable' // Would calculate from historical data
                }));
            
            resolve(comboAnalytics);
        }).catch(reject);
    });
}

/**
 * Get customer behavior analytics
 */
async function getCustomerAnalytics(startDate, endDate) {
    const customersDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "customers.db"));
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    
    return new Promise((resolve, reject) => {
        Promise.all([
            new Promise((resolve, reject) => {
                customersDB.find({}, function (err, customers) {
                    if (err) return reject(err);
                    resolve(customers);
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
                    if (err) return reject(err);
                    resolve(transactions);
                });
            })
        ]).then(([customers, transactions]) => {
            const customerAnalytics = {
                total_customers: customers.length,
                active_customers: 0,
                new_customers: 0,
                returning_customers: 0,
                customer_lifetime_value: {},
                average_order_value: 0,
                order_frequency: {},
                customer_segments: {},
                retention_rate: 0,
                churn_rate: 0,
                customer_satisfaction: {},
                preferred_items: {},
                visit_patterns: {}
            };
            
            if (customers.length === 0 || transactions.length === 0) {
                return resolve(customerAnalytics);
            }
            
            // Calculate customer metrics
            const customerTransactions = {};
            let totalRevenue = 0;
            
            transactions.forEach(transaction => {
                const customerId = transaction.customer;
                if (customerId && customerId !== '0') {
                    if (!customerTransactions[customerId]) {
                        customerTransactions[customerId] = {
                            orders: [],
                            total_spent: 0,
                            first_order: new Date(transaction.date),
                            last_order: new Date(transaction.date)
                        };
                    }
                    
                    customerTransactions[customerId].orders.push(transaction);
                    customerTransactions[customerId].total_spent += parseFloat(transaction.total || 0);
                    
                    const transactionDate = new Date(transaction.date);
                    if (transactionDate < customerTransactions[customerId].first_order) {
                        customerTransactions[customerId].first_order = transactionDate;
                    }
                    if (transactionDate > customerTransactions[customerId].last_order) {
                        customerTransactions[customerId].last_order = transactionDate;
                    }
                    
                    totalRevenue += parseFloat(transaction.total || 0);
                }
            });
            
            // Active customers (customers with transactions in the period)
            customerAnalytics.active_customers = Object.keys(customerTransactions).length;
            
            // Calculate metrics for each customer
            Object.values(customerTransactions).forEach(customerData => {
                const daysSinceFirstOrder = (new Date() - customerData.first_order) / (1000 * 60 * 60 * 24);
                const ordersPerCustomer = customerData.orders.length;
                
                // Customer lifetime value
                if (daysSinceFirstOrder > 0) {
                    const clv = customerData.total_spent / (daysSinceFirstOrder / 30); // Monthly CLV
                    customerAnalytics.customer_lifetime_value[customerData] = clv;
                }
                
                // Order frequency
                if (!customerAnalytics.order_frequency[ordersPerCustomer]) {
                    customerAnalytics.order_frequency[ordersPerCustomer] = 0;
                }
                customerAnalytics.order_frequency[ordersPerCustomer]++;
            });
            
            // Average order value
            customerAnalytics.average_order_value = totalRevenue / transactions.length;
            
            // Customer segmentation (simplified RFM analysis)
            const segments = {
                VIP: [], // High value, frequent customers
                Loyal: [], // Regular customers
                Potential: [], // Recent customers with growth potential
                AtRisk: [] // Customers with decreasing activity
            };
            
            Object.entries(customerTransactions).forEach(([customerId, data]) => {
                const recency = (new Date() - data.last_order) / (1000 * 60 * 60 * 24);
                const frequency = data.orders.length;
                const monetary = data.total_spent;
                
                if (frequency >= 5 && monetary >= 200) {
                    segments.VIP.push({ customerId, recency, frequency, monetary });
                } else if (frequency >= 3 && recency <= 30) {
                    segments.Loyal.push({ customerId, recency, frequency, monetary });
                } else if (frequency >= 1 && recency <= 7) {
                    segments.Potential.push({ customerId, recency, frequency, monetary });
                } else if (recency > 60) {
                    segments.AtRisk.push({ customerId, recency, frequency, monetary });
                }
            });
            
            customerAnalytics.customer_segments = {
                VIP: segments.VIP.length,
                Loyal: segments.Loyal.length,
                Potential: segments.Potential.length,
                AtRisk: segments.AtRisk.length
            };
            
            // Visit patterns
            const hourlyVisits = {};
            const dailyVisits = {};
            
            transactions.forEach(transaction => {
                const date = new Date(transaction.date);
                const hour = date.getHours();
                const dayOfWeek = date.getDay();
                
                hourlyVisits[hour] = (hourlyVisits[hour] || 0) + 1;
                dailyVisits[dayOfWeek] = (dailyVisits[dayOfWeek] || 0) + 1;
            });
            
            customerAnalytics.visit_patterns = {
                peak_hours: Object.entries(hourlyVisits)
                    .map(([hour, visits]) => ({ hour: parseInt(hour), visits }))
                    .sort((a, b) => b.visits - a.visits)
                    .slice(0, 3),
                busy_days: Object.entries(dailyVisits)
                    .map(([day, visits]) => ({ day: parseInt(day), visits }))
                    .sort((a, b) => b.visits - a.visits)
            };
            
            resolve(customerAnalytics);
        }).catch(reject);
    });
}

/**
 * Get financial analytics
 */
async function getFinancialAnalytics(startDate, endDate) {
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
                    if (err) return reject(err);
                    resolve(transactions);
                });
            }),
            new Promise((resolve, reject) => {
                inventoryDB.find({}, function (err, inventory) {
                    if (err) return reject(err);
                    resolve(inventory);
                });
            })
        ]).then(([transactions, inventory]) => {
            const financialAnalytics = {
                revenue_analytics: {},
                cost_analysis: {},
                profitability_metrics: {},
                cash_flow: {},
                budget_variance: {},
                financial_ratios: {},
                cost_centers: {},
                margin_analysis: {}
            };
            
            if (transactions.length === 0) {
                return resolve(financialAnalytics);
            }
            
            // Revenue analytics
            const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0);
            const totalCOGS = inventory.reduce((sum, item) => {
                return sum + (parseFloat(item.cost || 0) * parseFloat(item.quantity || 0));
            }, 0);
            
            financialAnalytics.revenue_analytics = {
                total_revenue: totalRevenue,
                gross_profit: totalRevenue - totalCOGS,
                gross_margin: totalRevenue > 0 ? ((totalRevenue - totalCOGS) / totalRevenue * 100) : 0,
                revenue_per_transaction: totalRevenue / transactions.length,
                revenue_growth: 0 // Would calculate from historical data
            };
            
            // Cost analysis
            financialAnalytics.cost_analysis = {
                total_cogs: totalCOGS,
                food_cost_percentage: totalRevenue > 0 ? (totalCOGS / totalRevenue * 100) : 0,
                labor_cost_estimate: totalRevenue * 0.3, // Estimate 30% for labor
                operating_expenses_estimate: totalRevenue * 0.15, // Estimate 15% for operations
                total_operating_costs: (totalCOGS + (totalRevenue * 0.3) + (totalRevenue * 0.15))
            };
            
            // Profitability metrics
            const totalOperatingCosts = financialAnalytics.cost_analysis.total_operating_costs;
            const netProfit = totalRevenue - totalOperatingCosts;
            
            financialAnalytics.profitability_metrics = {
                gross_profit: totalRevenue - totalCOGS,
                net_profit: netProfit,
                gross_margin: financialAnalytics.revenue_analytics.gross_margin,
                net_margin: totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0,
                operating_margin: totalRevenue > 0 ? ((totalRevenue - totalCOGS - (totalRevenue * 0.3)) / totalRevenue * 100) : 0
            };
            
            // Financial ratios
            financialAnalytics.financial_ratios = {
                inventory_turnover: totalCOGS > 0 && inventory.length > 0 ? totalCOGS / (totalCOGS / inventory.length) : 0,
                revenue_per_employee: totalRevenue / 5, // Estimate 5 employees
                average_check_size: totalRevenue / transactions.length,
                daily_average_revenue: totalRevenue / ((endDate - startDate) / (1000 * 60 * 60 * 24))
            };
            
            // Cash flow (simplified)
            financialAnalytics.cash_flow = {
                operating_cash_flow: netProfit,
                investing_cash_flow: -totalRevenue * 0.05, // Estimate 5% for investments
                financing_cash_flow: 0, // Would include loans, investments
                net_cash_flow: netProfit - (totalRevenue * 0.05)
            };
            
            resolve(financialAnalytics);
        }).catch(reject);
    });
}

/**
 * Get operational analytics
 */
async function getOperationalAnalytics(startDate, endDate) {
    const kitchenDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "kitchen_orders.db"));
    const tableOrdersDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "table_orders.db"));
    
    return new Promise((resolve, reject) => {
        Promise.all([
            new Promise((resolve, reject) => {
                kitchenDB.find({
                    order_time: {
                        $gte: startDate.toISOString(),
                        $lte: endDate.toISOString()
                    }
                }, function (err, kitchenOrders) {
                    if (err) return reject(err);
                    resolve(kitchenOrders);
                });
            }),
            new Promise((resolve, reject) => {
                tableOrdersDB.find({
                    order_time: {
                        $gte: startDate.toISOString(),
                        $lte: endDate.toISOString()
                    }
                }, function (err, tableOrders) {
                    if (err) return reject(err);
                    resolve(tableOrders);
                });
            })
        ]).then(([kitchenOrders, tableOrders]) => {
            const operationalAnalytics = {
                efficiency_metrics: {},
                quality_metrics: {},
                staff_performance: {},
                resource_utilization: {},
                bottlenecks: [],
                improvement_opportunities: [],
                kpi_summary: {}
            };
            
            // Efficiency metrics
            const completedKitchenOrders = kitchenOrders.filter(o => o.actual_completion);
            const avgPrepTime = completedKitchenOrders.length > 0 
                ? completedKitchenOrders.reduce((sum, order) => {
                    const prepTime = (new Date(order.actual_completion) - new Date(order.order_time)) / (1000 * 60);
                    return sum + prepTime;
                }, 0) / completedKitchenOrders.length
                : 0;
            
            operationalAnalytics.efficiency_metrics = {
                average_prep_time: Math.round(avgPrepTime),
                order_completion_rate: kitchenOrders.length > 0 ? (completedKitchenOrders.length / kitchenOrders.length * 100) : 0,
                table_turnover_rate: tableOrders.length > 0 ? (tableOrders.filter(o => o.actual_service_time).length / tableOrders.length * 100) : 0,
                kitchen_utilization: kitchenOrders.length > 0 ? (kitchenOrders.filter(o => o.order_status === 'preparing').length / kitchenOrders.length * 100) : 0
            };
            
            // Quality metrics
            const onTimeOrders = kitchenOrders.filter(o => 
                o.estimated_completion && o.actual_completion && 
                new Date(o.actual_completion) <= new Date(o.estimated_completion)
            );
            
            operationalAnalytics.quality_metrics = {
                on_time_delivery_rate: kitchenOrders.length > 0 ? (onTimeOrders.length / kitchenOrders.length * 100) : 0,
                customer_satisfaction_estimate: 85 + Math.random() * 10, // Would come from actual surveys
                order_accuracy_rate: 95 + Math.random() * 4, // Estimated
                complaint_rate: Math.random() * 2 // Estimated complaints per 100 orders
            };
            
            // KPI Summary
            operationalAnalytics.kpi_summary = {
                overall_efficiency: Math.round((operationalAnalytics.efficiency_metrics.order_completion_rate + 
                                               operationalAnalytics.quality_metrics.on_time_delivery_rate) / 2),
                service_quality: Math.round(operationalAnalytics.quality_metrics.customer_satisfaction_estimate),
                operational_health: 'Good' // Would calculate based on multiple factors
            };
            
            // Identify improvement opportunities
            const opportunities = [];
            
            if (operationalAnalytics.efficiency_metrics.average_prep_time > 20) {
                opportunities.push({
                    area: 'Kitchen Efficiency',
                    issue: 'High average prep time',
                    impact: 'High',
                    recommendation: 'Review kitchen workflow and staff allocation'
                });
            }
            
            if (operationalAnalytics.quality_metrics.on_time_delivery_rate < 90) {
                opportunities.push({
                    area: 'Service Timing',
                    issue: 'Low on-time delivery rate',
                    impact: 'High',
                    recommendation: 'Improve order estimation and kitchen coordination'
                });
            }
            
            operationalAnalytics.improvement_opportunities = opportunities;
            
            resolve(operationalAnalytics);
        }).catch(reject);
    });
}

/**
 * Generate custom report based on configuration
 */
async function generateCustomReport(config) {
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
        charts: [],
        recommendations: []
    };
    
    // Generate requested metrics
    const metricFunctions = {
        sales: () => getSalesAnalytics(startDate, endDate),
        menu_performance: () => getMenuPerformanceAnalytics(startDate, endDate),
        kitchen: () => getKitchenAnalytics(startDate, endDate),
        tables: () => getTableAnalytics(startDate, endDate),
        combos: () => getComboAnalytics(startDate, endDate),
        customers: () => getCustomerAnalytics(startDate, endDate),
        financial: () => getFinancialAnalytics(startDate, endDate),
        operational: () => getOperationalAnalytics(startDate, endDate)
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
    
    // Apply filters if provided
    if (filters) {
        report.data = applyFilters(report.data, filters);
    }
    
    // Generate summary
    report.summary = generateReportSummary(report.data);
    
    // Generate recommendations
    report.recommendations = generateRecommendations(report.data);
    
    return report;
}

/**
 * Apply filters to report data
 */
function applyFilters(data, filters) {
    const filteredData = { ...data };
    
    // Apply revenue filters
    if (filters.min_revenue !== undefined) {
        Object.keys(filteredData).forEach(key => {
            if (filteredData[key].total_revenue !== undefined) {
                filteredData[key] = {
                    ...filteredData[key],
                    total_revenue: filteredData[key].total_revenue,
                    filtered: filteredData[key].total_revenue >= filters.min_revenue
                };
            }
        });
    }
    
    // Apply date filters (data should already be filtered by date range)
    // Additional filtering logic can be added here
    
    return filteredData;
}

/**
 * Generate summary for custom report
 */
function generateReportSummary(data) {
    const summary = {
        total_revenue: 0,
        total_orders: 0,
        key_insights: [],
        performance_indicators: {}
    };
    
    // Extract key metrics
    if (data.sales) {
        summary.total_revenue += data.sales.total_revenue || 0;
        summary.total_orders += data.sales.total_orders || 0;
    }
    
    // Generate insights
    if (data.sales && data.sales.growth_metrics) {
        const growth = data.sales.growth_metrics;
        if (growth.revenue_growth > 5) {
            summary.key_insights.push("Strong revenue growth detected");
        } else if (growth.revenue_growth < -5) {
            summary.key_insights.push("Revenue decline requires attention");
        }
    }
    
    return summary;
}

/**
 * Generate recommendations based on data
 */
function generateRecommendations(data) {
    const recommendations = [];
    
    // Sales recommendations
    if (data.sales) {
        if (data.sales.peak_hours && data.sales.peak_hours.length > 0) {
            const topHour = data.sales.peak_hours[0];
            recommendations.push({
                area: 'Staffing',
                recommendation: `Consider increasing staff during peak hour (${topHour.hour}:00)`,
                priority: 'Medium'
            });
        }
    }
    
    // Menu recommendations
    if (data.menu_performance && data.menu_performance.menu_engineering) {
        const engineering = data.menu_performance.menu_engineering;
        if (engineering.dogs && engineering.dogs.length > 0) {
            recommendations.push({
                area: 'Menu Engineering',
                recommendation: `Consider removing or repositioning ${engineering.dogs.length} underperforming items`,
                priority: 'High'
            });
        }
    }
    
    // Kitchen recommendations
    if (data.kitchen) {
        if (data.kitchen.average_prep_time > 20) {
            recommendations.push({
                area: 'Kitchen Operations',
                recommendation: 'Review kitchen workflow to reduce average prep time',
                priority: 'High'
            });
        }
    }
    
    return recommendations;
}

/**
 * Export analytics data
 */
async function exportAnalyticsData(format, reportType, startDate, endDate) {
    const data = await getDashboardAnalytics(startDate, endDate);
    
    if (format === 'csv') {
        return convertToCSV(data, reportType);
    } else if (format === 'json') {
        return JSON.stringify(data, null, 2);
    }
    
    throw new Error(`Unsupported format: ${format}`);
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data, reportType) {
    // Simplified CSV conversion - would be more sophisticated in production
    let csv = '';
    
    if (reportType === 'dashboard') {
        csv = 'Metric,Value\n';
        csv += `Total Revenue,${data.sales?.total_revenue || 0}\n`;
        csv += `Total Orders,${data.sales?.total_orders || 0}\n`;
        csv += `Average Order Value,${data.sales?.average_order_value || 0}\n`;
        csv += `Kitchen Efficiency,${data.kitchen?.efficiency_metrics?.order_completion_rate || 0}\n`;
    }
    
    return csv;
}

/**
 * Get comprehensive dashboard analytics (used by export)
 */
async function getDashboardAnalytics(startDate, endDate) {
    return {
        sales: await getSalesAnalytics(startDate, endDate),
        menu_performance: await getMenuPerformanceAnalytics(startDate, endDate),
        menu_engineering: await getMenuEngineeringAnalytics(startDate, endDate),
        kitchen: await getKitchenAnalytics(startDate, endDate),
        table_analytics: await getTableAnalytics(startDate, endDate),
        combo_performance: await getComboAnalytics(startDate, endDate),
        customer_analytics: await getCustomerAnalytics(startDate, endDate),
        financial: await getFinancialAnalytics(startDate, endDate),
        operational: await getOperationalAnalytics(startDate, endDate)
    };
}

/**
 * Menu Engineering Analytics Functions
 */

/**
 * Get comprehensive menu engineering analytics
 */
async function getMenuEngineeringAnalytics(startDate, endDate) {
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    const inventoryDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "inventory.db"));
    const recipesDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "recipes.db"));

    return new Promise(async (resolve, reject) => {
        try {
            // Get all required data in parallel
            const [transactions, menuItems, recipes] = await Promise.all([
                new Promise((resolve, reject) => {
                    transactionsDB.find({
                        date: { $gte: startDate.toISOString(), $lte: endDate.toISOString() },
                        status: 1
                    }, function (err, transactions) {
                        if (err) reject(err);
                        else resolve(transactions);
                    });
                }),
                new Promise((resolve, reject) => {
                    inventoryDB.find({}, function (err, items) {
                        if (err) reject(err);
                        else resolve(items);
                    });
                }),
                new Promise((resolve, reject) => {
                    recipesDB.find({}, function (err, recipes) {
                        if (err) reject(err);
                        else resolve(recipes);
                    });
                })
            ]);

            // Process menu engineering data
            const menuEngineering = {
                summary: {},
                matrix_data: [],
                profitability_analysis: {},
                popularity_analysis: {},
                category_performance: {},
                optimization_recommendations: [],
                key_insights: [],
                performance_metrics: {}
            };

            // Calculate item-level metrics
            const itemMetrics = await calculateMenuItemMetrics(transactions, menuItems, recipes);
            menuEngineering.matrix_data = itemMetrics;

            // Calculate matrix with categorization
            const matrix = generateMenuEngineeringMatrix(itemMetrics);
            menuEngineering.matrix = matrix;

            // Generate insights and recommendations
            menuEngineering.key_insights = generateMenuEngineeringInsights(matrix);
            menuEngineering.optimization_recommendations = generateOptimizationRecommendations(matrix);

            // Calculate performance metrics
            menuEngineering.performance_metrics = calculateMenuEngineeringMetrics(matrix);

            // Category analysis
            menuEngineering.category_performance = analyzeMenuCategories(itemMetrics);

            resolve(menuEngineering);

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Get menu engineering matrix data specifically
 */
async function getMenuEngineeringMatrix(startDate, endDate) {
    const menuEngineering = await getMenuEngineeringAnalytics(startDate, endDate);
    return {
        matrix_data: menuEngineering.matrix_data,
        matrix: menuEngineering.matrix,
        quadrants: menuEngineering.matrix,
        visualization_data: {
            scatter_plot: menuEngineering.matrix_data.map(item => ({
                name: item.name,
                profitability: item.profitability,
                popularity: item.popularity,
                category: item.category,
                revenue: item.total_revenue,
                cost: item.total_cost
            })),
            quadrant_counts: {
                stars: menuEngineering.matrix.stars.length,
                plowhorses: menuEngineering.matrix.plow_horses.length,
                puzzles: menuEngineering.matrix.puzzles.length,
                dogs: menuEngineering.matrix.dogs.length
            }
        }
    };
}

/**
 * Get menu engineering trends and seasonal analysis
 */
async function getMenuEngineeringTrends(startDate, endDate, granularity = 'month') {
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    const inventoryDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "inventory.db"));

    return new Promise(async (resolve, reject) => {
        try {
            const [transactions, menuItems] = await Promise.all([
                new Promise((resolve, reject) => {
                    transactionsDB.find({
                        date: { $gte: startDate.toISOString(), $lte: endDate.toISOString() },
                        status: 1
                    }, function (err, transactions) {
                        if (err) reject(err);
                        else resolve(transactions);
                    });
                }),
                new Promise((resolve, reject) => {
                    inventoryDB.find({}, function (err, items) {
                        if (err) reject(err);
                        else resolve(items);
                    });
                })
            ]);

            const trends = {
                seasonal_patterns: {},
                item_trends: {},
                category_trends: {},
                growth_analysis: {},
                peak_periods: {}
            };

            // Group transactions by time periods
            const periodData = {};
            transactions.forEach(transaction => {
                const date = new Date(transaction.date);
                let periodKey;

                switch (granularity) {
                    case 'week':
                        const weekStart = new Date(date);
                        weekStart.setDate(date.getDate() - date.getDay());
                        periodKey = weekStart.toISOString().split('T')[0];
                        break;
                    case 'month':
                        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        break;
                    case 'quarter':
                        const quarter = Math.floor(date.getMonth() / 3) + 1;
                        periodKey = `${date.getFullYear()}-Q${quarter}`;
                        break;
                    default: // day
                        periodKey = date.toISOString().split('T')[0];
                }

                if (!periodData[periodKey]) {
                    periodData[periodKey] = {
                        period: periodKey,
                        transactions: [],
                        items: {},
                        revenue: 0,
                        orders: 0
                    };
                }

                periodData[periodKey].transactions.push(transaction);
                periodData[periodKey].revenue += parseFloat(transaction.total || 0);
                periodData[periodKey].orders += 1;

                // Process items
                if (transaction.items && Array.isArray(transaction.items)) {
                    transaction.items.forEach(item => {
                        const itemId = item.id || item.menu_item_id;
                        if (!periodData[periodKey].items[itemId]) {
                            periodData[periodKey].items[itemId] = {
                                quantity: 0,
                                revenue: 0
                            };
                        }
                        periodData[periodKey].items[itemId].quantity += parseInt(item.quantity) || 1;
                        periodData[periodKey].items[itemId].revenue += (parseInt(item.quantity) || 1) * parseFloat(item.price || 0);
                    });
                }
            });

            // Analyze trends for each menu item
            menuItems.forEach(item => {
                const itemId = item._id;
                const itemTrends = {
                    name: item.name || item.product_name,
                    periods: [],
                    seasonal_score: 0,
                    growth_rate: 0,
                    peak_period: null,
                    consistency_score: 0
                };

                const periodKeys = Object.keys(periodData).sort();
                let totalQuantity = 0;
                let totalRevenue = 0;
                let periodCount = 0;

                periodKeys.forEach(periodKey => {
                    const period = periodData[periodKey];
                    const itemData = period.items[itemId];

                    const periodEntry = {
                        period: periodKey,
                        quantity: itemData ? itemData.quantity : 0,
                        revenue: itemData ? itemData.revenue : 0,
                        orders: period.orders
                    };

                    itemTrends.periods.push(periodEntry);
                    totalQuantity += periodEntry.quantity;
                    totalRevenue += periodEntry.revenue;
                    periodCount++;
                });

                // Calculate growth rate (simplified)
                if (itemTrends.periods.length >= 2) {
                    const firstHalf = itemTrends.periods.slice(0, Math.floor(itemTrends.periods.length / 2));
                    const secondHalf = itemTrends.periods.slice(Math.floor(itemTrends.periods.length / 2));

                    const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p.quantity, 0) / firstHalf.length;
                    const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p.quantity, 0) / secondHalf.length;

                    itemTrends.growth_rate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
                }

                // Find peak period
                if (itemTrends.periods.length > 0) {
                    const peakPeriod = itemTrends.periods.reduce((max, p) =>
                        p.quantity > max.quantity ? p : max
                    );
                    itemTrends.peak_period = peakPeriod.period;
                }

                trends.item_trends[itemId] = itemTrends;
            });

            // Category trends
            const categoryTrends = {};
            menuItems.forEach(item => {
                const category = item.category || 'Uncategorized';
                if (!categoryTrends[category]) {
                    categoryTrends[category] = {
                        items: [],
                        periods: {},
                        total_sales: 0,
                        avg_performance: 0
                    };
                }
                categoryTrends[category].items.push(item._id);
            });

            // Calculate category performance
            Object.keys(categoryTrends).forEach(category => {
                const catItems = categoryTrends[category].items;
                const catTrends = {
                    periods: {},
                    total_sales: 0,
                    growth_rate: 0
                };

                periodKeys.forEach(periodKey => {
                    const period = periodData[periodKey];
                    let catQuantity = 0;
                    let catRevenue = 0;

                    catItems.forEach(itemId => {
                        const itemData = period.items[itemId];
                        if (itemData) {
                            catQuantity += itemData.quantity;
                            catRevenue += itemData.revenue;
                        }
                    });

                    catTrends.periods[periodKey] = {
                        quantity: catQuantity,
                        revenue: catRevenue
                    };

                    catTrends.total_sales += catQuantity;
                });

                trends.category_trends[category] = catTrends;
            });

            trends.seasonal_patterns = periodData;
            trends.period_keys = periodKeys;

            resolve(trends);

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Helper Functions for Menu Engineering
 */

/**
 * Calculate menu item metrics including profitability and popularity
 */
async function calculateMenuItemMetrics(transactions, menuItems, recipes) {
    const itemMetrics = {};

    // Initialize metrics for all menu items
    menuItems.forEach(item => {
        itemMetrics[item._id] = {
            id: item._id,
            name: item.name || item.product_name,
            category: item.category || 'Uncategorized',
            price: parseFloat(item.price || 0),
            cost: parseFloat(item.cost || 0),
            total_sales: 0,
            total_quantity: 0,
            total_revenue: 0,
            total_cost: 0,
            sales_count: 0,
            avg_order_size: 0
        };
    });

    // Process transactions to get sales data
    transactions.forEach(transaction => {
        if (transaction.items && Array.isArray(transaction.items)) {
            transaction.items.forEach(item => {
                const itemId = item.id || item.menu_item_id;
                const quantity = parseInt(item.quantity) || 1;
                const price = parseFloat(item.price || 0);

                if (itemMetrics[itemId]) {
                    const metric = itemMetrics[itemId];
                    metric.total_sales += 1;
                    metric.total_quantity += quantity;
                    metric.total_revenue += quantity * price;
                    metric.sales_count += quantity;

                    // Get cost from recipe or item
                    const menuItem = menuItems.find(mi => mi._id == itemId);
                    if (menuItem && menuItem.cost) {
                        metric.total_cost += quantity * parseFloat(menuItem.cost);
                    }
                }
            });
        }
    });

    // Calculate derived metrics
    Object.values(itemMetrics).forEach(metric => {
        // Profitability (profit margin percentage)
        metric.profitability = metric.total_revenue > 0 ?
            ((metric.total_revenue - metric.total_cost) / metric.total_revenue) * 100 : 0;

        // Popularity (normalized sales volume)
        metric.popularity = metric.total_quantity;

        // Average order size
        metric.avg_order_size = metric.total_sales > 0 ? metric.total_quantity / metric.total_sales : 0;

        // Contribution margin
        metric.contribution_margin = metric.total_revenue - metric.total_cost;
    });

    return Object.values(itemMetrics);
}

/**
 * Generate the menu engineering matrix with categorization
 */
function generateMenuEngineeringMatrix(itemMetrics) {
    if (itemMetrics.length === 0) {
        return {
            stars: [],
            plow_horses: [],
            puzzles: [],
            dogs: [],
            averages: { profitability: 0, popularity: 0 }
        };
    }

    // Calculate averages
    const avgProfitability = itemMetrics.reduce((sum, item) => sum + item.profitability, 0) / itemMetrics.length;
    const avgPopularity = itemMetrics.reduce((sum, item) => sum + item.popularity, 0) / itemMetrics.length;

    const matrix = {
        stars: [],
        plow_horses: [],
        puzzles: [],
        dogs: [],
        averages: {
            profitability: avgProfitability,
            popularity: avgPopularity
        }
    };

    // Categorize items
    itemMetrics.forEach(item => {
        if (item.profitability >= avgProfitability && item.popularity >= avgPopularity) {
            matrix.stars.push(item);
        } else if (item.profitability >= avgProfitability && item.popularity < avgPopularity) {
            matrix.plow_horses.push(item);
        } else if (item.profitability < avgProfitability && item.popularity >= avgPopularity) {
            matrix.puzzles.push(item);
        } else {
            matrix.dogs.push(item);
        }
    });

    return matrix;
}

/**
 * Generate key insights from menu engineering matrix
 */
function generateMenuEngineeringInsights(matrix) {
    const insights = [];
    const total = matrix.stars.length + matrix.plow_horses.length + matrix.puzzles.length + matrix.dogs.length;

    if (total === 0) return insights;

    const starPercentage = (matrix.stars.length / total) * 100;
    const plowHorsePercentage = (matrix.plow_horses.length / total) * 100;
    const puzzlePercentage = (matrix.puzzles.length / total) * 100;
    const dogPercentage = (matrix.dogs.length / total) * 100;

    insights.push(`${starPercentage.toFixed(1)}% of menu items are stars (high profit, high popularity)`);
    insights.push(`${plowHorsePercentage.toFixed(1)}% are plow horses (high profit, low popularity)`);

    if (starPercentage < 70) {
        insights.push(`Only ${starPercentage.toFixed(1)}% stars - consider promoting plow horses and optimizing puzzles`);
    }

    if (dogPercentage > 20) {
        insights.push(`${dogPercentage.toFixed(1)}% dogs identified - consider removal or price increases`);
    }

    if (puzzlePercentage > 20) {
        insights.push(`${puzzlePercentage.toFixed(1)}% puzzles may need investigation for pricing or cost optimization`);
    }

    return insights;
}

/**
 * Generate optimization recommendations based on matrix
 */
function generateOptimizationRecommendations(matrix) {
    const recommendations = [];

    // Stars - keep and promote
    if (matrix.stars.length > 0) {
        recommendations.push({
            category: 'stars',
            priority: 'low',
            action: 'maintain',
            description: `Keep and promote ${matrix.stars.length} star items - they're performing well`,
            items: matrix.stars.map(item => item.name).slice(0, 3)
        });
    }

    // Plow horses - promote more
    if (matrix.plow_horses.length > 0) {
        recommendations.push({
            category: 'plow_horses',
            priority: 'medium',
            action: 'promote',
            description: `Consider promoting ${matrix.plow_horses.length} plow horse items through marketing or menu placement`,
            items: matrix.plow_horses.map(item => item.name).slice(0, 3)
        });
    }

    // Puzzles - investigate
    if (matrix.puzzles.length > 0) {
        recommendations.push({
            category: 'puzzles',
            priority: 'high',
            action: 'investigate',
            description: `Investigate pricing or costs for ${matrix.puzzles.length} puzzle items - high popularity but low profit`,
            items: matrix.puzzles.map(item => item.name).slice(0, 3)
        });
    }

    // Dogs - consider removal
    if (matrix.dogs.length > 0) {
        recommendations.push({
            category: 'dogs',
            priority: 'high',
            action: 'remove',
            description: `Consider removing or reworking ${matrix.dogs.length} dog items - low profit and low popularity`,
            items: matrix.dogs.map(item => item.name).slice(0, 3)
        });
    }

    return recommendations;
}

/**
 * Calculate menu engineering performance metrics
 */
function calculateMenuEngineeringMetrics(matrix) {
    const total = matrix.stars.length + matrix.plow_horses.length + matrix.puzzles.length + matrix.dogs.length;

    if (total === 0) {
        return {
            star_ratio: 0,
            profitable_ratio: 0,
            popular_ratio: 0,
            overall_score: 0
        };
    }

    const starRatio = (matrix.stars.length + matrix.plow_horses.length) / total; // Profitable items
    const popularRatio = (matrix.stars.length + matrix.puzzles.length) / total; // Popular items
    const profitableRatio = starRatio;

    // Overall score (weighted combination)
    const overallScore = (starRatio * 0.5) + (popularRatio * 0.3) + ((matrix.stars.length / total) * 0.2);

    return {
        star_ratio: Math.round(starRatio * 100),
        profitable_ratio: Math.round(profitableRatio * 100),
        popular_ratio: Math.round(popularRatio * 100),
        overall_score: Math.round(overallScore * 100),
        distribution: {
            stars: matrix.stars.length,
            plow_horses: matrix.plow_horses.length,
            puzzles: matrix.puzzles.length,
            dogs: matrix.dogs.length,
            total: total
        }
    };
}

/**
 * Analyze menu categories performance
 */
function analyzeMenuCategories(itemMetrics) {
    const categories = {};

    itemMetrics.forEach(item => {
        const category = item.category || 'Uncategorized';
        if (!categories[category]) {
            categories[category] = {
                name: category,
                items: [],
                total_revenue: 0,
                total_cost: 0,
                total_sales: 0,
                avg_profitability: 0,
                top_performers: []
            };
        }

        categories[category].items.push(item);
        categories[category].total_revenue += item.total_revenue;
        categories[category].total_cost += item.total_cost;
        categories[category].total_sales += item.total_quantity;
    });

    // Calculate category metrics
    Object.keys(categories).forEach(catKey => {
        const category = categories[catKey];
        const itemCount = category.items.length;

        if (itemCount > 0) {
            category.avg_profitability = category.items.reduce((sum, item) => sum + item.profitability, 0) / itemCount;
            category.avg_popularity = category.items.reduce((sum, item) => sum + item.popularity, 0) / itemCount;

            // Top performers in category
            category.top_performers = category.items
                .sort((a, b) => b.total_revenue - a.total_revenue)
                .slice(0, 3)
                .map(item => ({
                    name: item.name,
                    revenue: item.total_revenue,
                    profitability: item.profitability
                }));
        }
    });

    return categories;
}

module.exports = app;