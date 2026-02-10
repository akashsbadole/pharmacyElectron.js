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
    "kitchen_orders.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

// Initialize kitchen orders database
let kitchenOrdersDB = getDatabase(dbPath);
kitchenOrdersDB.ensureIndex({ fieldName: "_id", unique: true });
kitchenOrdersDB.ensureIndex({ fieldName: "order_number" });
kitchenOrdersDB.ensureIndex({ fieldName: "order_status" });
kitchenOrdersDB.ensureIndex({ fieldName: "priority" });
kitchenOrdersDB.ensureIndex({ fieldName: "order_time" });

// Kitchen stations configuration
const KITCHEN_STATIONS = {
    'grill': { name: 'Grill Station', color: '#dc3545', items: ['burgers', 'steaks', 'grilled'] },
    'fryer': { name: 'Fryer Station', color: '#fd7e14', items: ['fried', 'fries', 'wings'] },
    'salad': { name: 'Salad Station', color: '#28a745', items: ['salads', 'cold', 'fresh'] },
    'dessert': { name: 'Dessert Station', color: '#6f42c1', items: ['desserts', 'ice cream', 'bakery'] },
    'beverage': { name: 'Beverage Station', color: '#17a2b8', items: ['drinks', 'coffee', 'smoothies'] },
    'general': { name: 'General Station', color: '#6c757d', items: ['general', 'other'] }
};

/**
 * GET endpoint: Get the welcome message for the Kitchen API.
 */
app.get("/", function (req, res) {
    res.send("Kitchen API - Kitchen Display System");
});

/**
 * GET endpoint: Get all kitchen orders with optional filtering
 */
app.get("/orders", function (req, res) {
    let query = {};
    let sortOptions = { order_time: -1 }; // Most recent first
    
    // Apply filters
    if (req.query.status) {
        query.order_status = req.query.status;
    }
    
    if (req.query.priority) {
        query.priority = req.query.priority;
    }
    
    if (req.query.station) {
        query['items.kitchen_station'] = req.query.station;
    }
    
    if (req.query.date) {
        const date = new Date(req.query.date);
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        
        query.order_time = {
            $gte: date.toISOString(),
            $lt: nextDate.toISOString()
        };
    }
    
    if (req.query.search) {
        const searchTerm = req.query.search.toLowerCase();
        query.$or = [
            { order_number: new RegExp(searchTerm, 'i') },
            { customer_name: new RegExp(searchTerm, 'i') },
            { table_number: new RegExp(searchTerm, 'i') },
            { 'items.name': new RegExp(searchTerm, 'i') }
        ];
    }
    
    kitchenOrdersDB.find(query).sort(sortOptions).exec(function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            res.send(docs);
        }
    });
});

/**
 * GET endpoint: Get order by ID
 */
app.get("/orders/:orderId", function (req, res) {
    if (!req.params.orderId) {
        res.status(400).send("Order ID is required.");
    } else {
        kitchenOrdersDB.findOne(
            { _id: req.params.orderId },
            function (err, order) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "An unexpected error occurred.",
                    });
                } else if (!order) {
                    res.status(404).json({
                        error: "Order not found",
                        message: "The requested order does not exist.",
                    });
                } else {
                    res.send(order);
                }
            }
        );
    }
});

/**
 * POST endpoint: Create a new kitchen order
 */
app.post("/orders", function (req, res) {
    try {
        const orderData = req.body;
        
        // Validate required fields
        if (!orderData.order_number || !orderData.items || !Array.isArray(orderData.items)) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Order number and items are required."
            });
        }
        
        // Calculate total prep time (longest item prep time)
        const totalPrepTime = Math.max(...orderData.items.map(item => item.prep_time || 15));
        const estimatedCompletion = new Date(Date.now() + totalPrepTime * 60 * 1000);
        
        const kitchenOrder = {
            _id: orderData._id || Math.floor(Date.now() / 1000),
            order_number: validator.escape(orderData.order_number),
            table_number: validator.escape(orderData.table_number || ""),
            customer_name: validator.escape(orderData.customer_name || ""),
            items: orderData.items.map(item => ({
                menu_item_id: item.menu_item_id || null,
                name: validator.escape(item.name),
                quantity: parseInt(item.quantity) || 1,
                special_instructions: validator.escape(item.special_instructions || ""),
                kitchen_station: validator.escape(item.kitchen_station || "general"),
                prep_time: parseInt(item.prep_time) || 15,
                status: "pending",
                started_at: null,
                completed_at: null
            })),
            order_status: "pending",
            total_prep_time: totalPrepTime,
            priority: validator.escape(orderData.priority || "normal"),
            order_time: new Date().toISOString(),
            estimated_completion: estimatedCompletion.toISOString(),
            actual_completion: null,
            server_notes: validator.escape(orderData.server_notes || "")
        };
        
        kitchenOrdersDB.insert(kitchenOrder, function (err, newOrder) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to create kitchen order.",
                });
            } else {
                // Emit real-time update
                if (global.io) {
                    global.io.emit('new-order', newOrder);
                }
                
                res.status(201).json(newOrder);
            }
        });
        
    } catch (error) {
        console.error("Kitchen order creation error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while creating the kitchen order.",
        });
    }
});

/**
 * PUT endpoint: Update order status
 */
app.put("/orders/:orderId/status", function (req, res) {
    try {
        const orderId = req.params.orderId;
        const { status, item_id, station } = req.body;
        
        if (!status) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Status is required."
            });
        }
        
        const validStatuses = ["pending", "preparing", "ready", "served"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Invalid status. Must be one of: " + validStatuses.join(", ")
            });
        }
        
        kitchenOrdersDB.findOne({ _id: orderId }, function (err, order) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Database error."
                });
            }
            
            if (!order) {
                return res.status(404).json({
                    error: "Order not found",
                    message: "The order to update does not exist."
                });
            }
            
            const updateData = {};
            const now = new Date().toISOString();
            
            if (item_id) {
                // Update specific item status
                const itemIndex = order.items.findIndex(item => item.menu_item_id == item_id);
                if (itemIndex >= 0) {
                    order.items[itemIndex].status = status;
                    if (status === "preparing" && !order.items[itemIndex].started_at) {
                        order.items[itemIndex].started_at = now;
                    }
                    if (status === "ready" && !order.items[itemIndex].completed_at) {
                        order.items[itemIndex].completed_at = now;
                    }
                }
                
                // Check if all items are ready
                const allItemsReady = order.items.every(item => item.status === "ready" || item.status === "served");
                if (allItemsReady && order.order_status !== "ready") {
                    updateData.order_status = "ready";
                    updateData.actual_completion = now;
                }
            } else {
                // Update entire order status
                updateData.order_status = status;
                
                if (status === "preparing") {
                    order.items.forEach(item => {
                        if (!item.started_at) {
                            item.started_at = now;
                        }
                    });
                }
                
                if (status === "ready") {
                    order.items.forEach(item => {
                        if (!item.completed_at) {
                            item.completed_at = now;
                        }
                    });
                    updateData.actual_completion = now;
                }
                
                if (status === "served") {
                    updateData.actual_completion = now;
                }
            }
            
            updateData.last_modified = now;
            
            kitchenOrdersDB.update(
                { _id: orderId },
                { $set: updateData, items: order.items },
                {},
                function (err, numReplaced) {
                    if (err) {
                        console.error(err);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: "Failed to update order status.",
                        });
                    } else {
                        // Emit real-time update
                        if (global.io) {
                            global.io.emit('order-updated', {
                                order_id: orderId,
                                status: status,
                                item_id: item_id,
                                station: station
                            });
                        }
                        
                        kitchenOrdersDB.findOne({ _id: orderId }, function (err, updatedOrder) {
                            res.json(updatedOrder);
                        });
                    }
                }
            );
        });
        
    } catch (error) {
        console.error("Order status update error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while updating the order status.",
        });
    }
});

/**
 * GET endpoint: Get orders by kitchen station
 */
app.get("/orders/station/:station", function (req, res) {
    const station = req.params.station;
    
    kitchenOrdersDB.find({
        'items.kitchen_station': station,
        order_status: { $in: ['pending', 'preparing'] }
    }).sort({ order_time: 1 }).exec(function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            res.send(docs);
        }
    });
});

/**
 * GET endpoint: Get kitchen performance metrics
 */
app.get("/metrics", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    kitchenOrdersDB.find({
        order_time: {
            $gte: startDate.toISOString(),
            $lte: endDate.toISOString()
        }
    }, function (err, orders) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            const metrics = calculateKitchenMetrics(orders);
            res.send(metrics);
        }
    });
});

/**
 * GET endpoint: Get overdue orders (orders past estimated completion time)
 */
app.get("/orders/overdue", function (req, res) {
    const now = new Date().toISOString();
    
    kitchenOrdersDB.find({
        order_status: { $in: ['pending', 'preparing'] },
        estimated_completion: { $lt: now }
    }).sort({ estimated_completion: 1 }).exec(function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            res.send(docs);
        }
    });
});

/**
 * GET endpoint: Get kitchen stations status
 */
app.get("/stations", function (req, res) {
    const stations = {};
    
    Object.keys(KITCHEN_STATIONS).forEach(stationKey => {
        stations[stationKey] = {
            ...KITCHEN_STATIONS[stationKey],
            active_orders: 0,
            pending_orders: 0,
            preparing_orders: 0,
            avg_prep_time: 0
        };
    });
    
    kitchenOrdersDB.find({
        order_status: { $in: ['pending', 'preparing'] }
    }, function (err, orders) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            // Calculate station metrics
            orders.forEach(order => {
                order.items.forEach(item => {
                    if (stations[item.kitchen_station]) {
                        stations[item.kitchen_station].active_orders++;
                        if (item.status === 'pending') {
                            stations[item.kitchen_station].pending_orders++;
                        } else if (item.status === 'preparing') {
                            stations[item.kitchen_station].preparing_orders++;
                        }
                    }
                });
            });
            
            res.send(stations);
        }
    });
});

/**
 * POST endpoint: Update order priority
 */
app.put("/orders/:orderId/priority", function (req, res) {
    const orderId = req.params.orderId;
    const { priority } = req.body;
    
    const validPriorities = ['normal', 'rush', 'vip'];
    if (!validPriorities.includes(priority)) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Invalid priority. Must be one of: " + validPriorities.join(", ")
        });
    }
    
    kitchenOrdersDB.update(
        { _id: orderId },
        { 
            $set: { 
                priority: priority,
                last_modified: new Date().toISOString()
            }
        },
        {},
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to update order priority.",
                });
            } else if (numReplaced === 0) {
                res.status(404).json({
                    error: "Order not found",
                    message: "The order to update does not exist.",
                });
            } else {
                // Emit real-time update
                if (global.io) {
                    global.io.emit('priority-updated', {
                        order_id: orderId,
                        priority: priority
                    });
                }
                
                res.sendStatus(200);
            }
        }
    );
});

/**
 * DELETE endpoint: Cancel an order
 */
app.delete("/orders/:orderId", function (req, res) {
    const orderId = req.params.orderId;
    
    kitchenOrdersDB.update(
        { _id: orderId },
        { 
            $set: { 
                order_status: 'cancelled',
                last_modified: new Date().toISOString()
            }
        },
        {},
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to cancel order.",
                });
            } else if (numReplaced === 0) {
                res.status(404).json({
                    error: "Order not found",
                    message: "The order to cancel does not exist.",
                });
            } else {
                // Emit real-time update
                if (global.io) {
                    global.io.emit('order-cancelled', { order_id: orderId });
                }
                
                res.sendStatus(200);
            }
        }
    );
});

/**
 * Helper function to calculate kitchen performance metrics
 */
function calculateKitchenMetrics(orders) {
    const metrics = {
        total_orders: orders.length,
        completed_orders: orders.filter(o => o.order_status === 'served').length,
        cancelled_orders: orders.filter(o => o.order_status === 'cancelled').length,
        average_prep_time: 0,
        on_time_delivery: 0,
        rush_orders: orders.filter(o => o.priority === 'rush' || o.priority === 'vip').length,
        station_performance: {},
        hourly_breakdown: {}
    };
    
    if (orders.length === 0) return metrics;
    
    // Calculate average prep time
    const completedOrders = orders.filter(o => o.actual_completion && o.order_time);
    if (completedOrders.length > 0) {
        const totalPrepTime = completedOrders.reduce((sum, order) => {
            const start = new Date(order.order_time);
            const end = new Date(order.actual_completion);
            return sum + (end - start) / (1000 * 60); // Convert to minutes
        }, 0);
        metrics.average_prep_time = Math.round(totalPrepTime / completedOrders.length);
    }
    
    // Calculate on-time delivery percentage
    const ordersWithEstimates = orders.filter(o => o.estimated_completion && o.actual_completion);
    if (ordersWithEstimates.length > 0) {
        const onTimeOrders = ordersWithEstimates.filter(order => {
            return new Date(order.actual_completion) <= new Date(order.estimated_completion);
        }).length;
        metrics.on_time_delivery = Math.round((onTimeOrders / ordersWithEstimates.length) * 100);
    }
    
    // Calculate station performance
    Object.keys(KITCHEN_STATIONS).forEach(station => {
        const stationOrders = orders.filter(order => 
            order.items.some(item => item.kitchen_station === station)
        );
        
        const completedStationOrders = stationOrders.filter(o => o.actual_completion);
        const avgTime = completedStationOrders.length > 0 
            ? completedStationOrders.reduce((sum, order) => {
                const start = new Date(order.order_time);
                const end = new Date(order.actual_completion);
                return sum + (end - start) / (1000 * 60);
            }, 0) / completedStationOrders.length
            : 0;
        
        metrics.station_performance[station] = {
            total_orders: stationOrders.length,
            completed_orders: completedStationOrders.length,
            average_prep_time: Math.round(avgTime)
        };
    });
    
    // Calculate hourly breakdown
    orders.forEach(order => {
        const hour = new Date(order.order_time).getHours();
        if (!metrics.hourly_breakdown[hour]) {
            metrics.hourly_breakdown[hour] = 0;
        }
        metrics.hourly_breakdown[hour]++;
    });
    
    return metrics;
}

/**
 * Helper function to get kitchen order from POS transaction
 */
app.createKitchenOrderFromTransaction = function(transaction, menuItems, callback) {
    try {
        const orderItems = [];
        
        transaction.products.forEach(product => {
            const menuItem = menuItems.find(item => item._id == product.id);
            if (menuItem) {
                orderItems.push({
                    menu_item_id: menuItem._id,
                    name: menuItem.name,
                    quantity: product.quantity,
                    special_instructions: product.special_instructions || "",
                    kitchen_station: menuItem.kitchen_station || "general",
                    prep_time: menuItem.preparation_time || 15
                });
            }
        });
        
        if (orderItems.length === 0) {
            return callback(new Error('No kitchen items found in transaction'));
        }
        
        const kitchenOrder = {
            order_number: transaction.transaction_id.toString(),
            table_number: transaction.table_number || "",
            customer_name: transaction.customer_name || "",
            items: orderItems,
            priority: "normal",
            server_notes: transaction.notes || ""
        };
        
        // Calculate total prep time
        const totalPrepTime = Math.max(...orderItems.map(item => item.prep_time));
        const estimatedCompletion = new Date(Date.now() + totalPrepTime * 60 * 1000);
        
        const newKitchenOrder = {
            _id: Date.now() + Math.floor(Math.random() * 1000),
            order_number: kitchenOrder.order_number,
            table_number: kitchenOrder.table_number,
            customer_name: kitchenOrder.customer_name,
            items: orderItems.map(item => ({
                ...item,
                status: "pending",
                started_at: null,
                completed_at: null
            })),
            order_status: "pending",
            total_prep_time: totalPrepTime,
            priority: kitchenOrder.priority,
            order_time: new Date().toISOString(),
            estimated_completion: estimatedCompletion.toISOString(),
            actual_completion: null,
            server_notes: kitchenOrder.server_notes
        };
        
        kitchenOrdersDB.insert(newKitchenOrder, function (err, createdOrder) {
            if (err) {
                callback(err);
            } else {
                // Emit real-time update
                if (global.io) {
                    global.io.emit('new-order', createdOrder);
                }
                callback(null, createdOrder);
            }
        });
        
    } catch (error) {
        callback(error);
    }
};

module.exports = app;