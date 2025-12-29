const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const async = require("async");
const validator = require("validator");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
const path = require("path");

const ordersDbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "purchase_orders.db",
);

const inventoryDbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "inventory.db",
);

const suppliersDbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "suppliers.db",
);

app.use(bodyParser.json());

module.exports = app;

let purchaseOrdersDB = new Datastore({
    filename: ordersDbPath,
    autoload: true,
});

let inventoryDB = new Datastore({
    filename: inventoryDbPath,
    autoload: true,
});

let suppliersDB = new Datastore({
    filename: suppliersDbPath,
    autoload: true,
});

purchaseOrdersDB.ensureIndex({ fieldName: "_id", unique: true });

/**
 * GET endpoint: Get all purchase orders with supplier details.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/all", function (req, res) {
    purchaseOrdersDB.find({}, function (err, orders) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            // Populate supplier details
            async.map(
                orders,
                function (order, callback) {
                    if (order.supplier_id) {
                        suppliersDB.findOne({ _id: parseInt(order.supplier_id) }, function (err, supplier) {
                            if (err) {
                                callback(err);
                            } else {
                                order.supplier = supplier;
                                callback(null, order);
                            }
                        });
                    } else {
                        order.supplier = null;
                        callback(null, order);
                    }
                },
                function (err, populatedOrders) {
                    if (err) {
                        console.error(err);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: "An unexpected error occurred.",
                        });
                    } else {
                        res.send(populatedOrders);
                    }
                },
            );
        }
    });
});

/**
 * GET endpoint: Get purchase order by ID with supplier details.
 *
 * @param {Object} req request object with order ID as parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/:orderId", function (req, res) {
    if (!req.params.orderId) {
        res.status(400).send("Order ID is required.");
    } else {
        purchaseOrdersDB.findOne(
            {
                _id: parseInt(req.params.orderId),
            },
            function (err, order) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "An unexpected error occurred.",
                    });
                } else if (!order) {
                    res.status(404).json({
                        error: "Not Found",
                        message: "Purchase order not found.",
                    });
                } else {
                    // Populate supplier details
                    if (order.supplier_id) {
                        suppliersDB.findOne({ _id: parseInt(order.supplier_id) }, function (err, supplier) {
                            if (err) {
                                console.error(err);
                                res.status(500).json({
                                    error: "Internal Server Error",
                                    message: "An unexpected error occurred.",
                                });
                            } else {
                                order.supplier = supplier;
                                res.send(order);
                            }
                        });
                    } else {
                        order.supplier = null;
                        res.send(order);
                    }
                }
            },
        );
    }
});

/**
 * POST endpoint: Create a new purchase order.
 *
 * @param {Object} req request object with order data in body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.post("/new", function (req, res) {
    let totalCost = 0;
    req.body.items.forEach(item => {
        totalCost += parseFloat(item.quantity) * parseFloat(item.unit_cost);
    });

    let order = {
        _id: Math.floor(Date.now() / 1000),
        supplier_id: validator.escape(req.body.supplier_id),
        items: req.body.items.map(item => ({
            product_id: validator.escape(item.product_id),
            quantity: parseInt(item.quantity),
            unit_cost: parseFloat(item.unit_cost),
        })),
        order_date: new Date().toISOString(),
        expected_delivery: validator.escape(req.body.expected_delivery),
        status: "pending",
        total_cost: totalCost,
        notes: validator.escape(req.body.notes || ""),
    };

    purchaseOrdersDB.insert(order, function (err, newOrder) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            // Populate supplier for response
            suppliersDB.findOne({ _id: parseInt(order.supplier_id) }, function (err, supplier) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "An unexpected error occurred.",
                    });
                } else {
                    newOrder.supplier = supplier;
                    res.send(newOrder);
                }
            });
        }
    });
});

/**
 * PUT endpoint: Update purchase order status.
 *
 * @param {Object} req request object with status in body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.put("/update-status/:orderId", function (req, res) {
    let orderId = parseInt(req.params.orderId);
    let newStatus = validator.escape(req.body.status);

    // Validate status
    const validStatuses = ["pending", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(newStatus)) {
        res.status(400).json({
            error: "Bad Request",
            message: "Invalid status value.",
        });
        return;
    }

    purchaseOrdersDB.findOne({ _id: orderId }, function (err, order) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else if (!order) {
            res.status(404).json({
                error: "Not Found",
                message: "Purchase order not found.",
            });
        } else {
            let oldStatus = order.status;

            purchaseOrdersDB.update(
                { _id: orderId },
                { $set: { status: newStatus } },
                {},
                function (err, numReplaced) {
                    if (err) {
                        console.error(err);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: "An unexpected error occurred.",
                        });
                    } else if (numReplaced === 0) {
                        res.status(404).json({
                            error: "Not Found",
                            message: "Purchase order not found.",
                        });
                    } else {
                        // If status changed to "delivered", update inventory
                        if (oldStatus !== "delivered" && newStatus === "delivered") {
                            incrementInventory(order.items);
                        }

                        purchaseOrdersDB.findOne({ _id: orderId }, function (err, updatedOrder) {
                            if (err) {
                                console.error(err);
                                res.status(500).json({
                                    error: "Internal Server Error",
                                    message: "An unexpected error occurred.",
                                });
                            } else {
                                res.send(updatedOrder);
                            }
                        });
                    }
                },
            );
        }
    });
});

/**
 * Increment inventory quantities based on delivered purchase order items.
 *
 * @param {Array} items - List of items in the purchase order.
 * @returns {void}
 */
function incrementInventory(items) {
    async.eachSeries(items, function (item, callback) {
        inventoryDB.findOne(
            {
                _id: parseInt(item.product_id),
            },
            function (err, product) {
                if (!product) {
                    callback();
                } else {
                    let updatedQuantity = parseInt(product.quantity) + parseInt(item.quantity);
                    let now = new Date().toISOString();

                    inventoryDB.update(
                        {
                            _id: parseInt(product._id),
                        },
                        {
                            $set: {
                                quantity: updatedQuantity,
                                lastRestocked: now,
                            },
                        },
                        {},
                        callback,
                    );
                }
            },
        );
    });
}