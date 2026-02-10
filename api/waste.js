const app = require("express")();
const Datastore = require("@seald-io/nedb");
const async = require("async");
const validator = require("validator");
const path = require("path");

const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
const wasteDBPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "waste.db",
);

const inventoryApp = require('./inventory');
const inventoryDB = require('./inventory').inventoryDB;

let wasteDB = require('./database_utils').getDatabase(wasteDBPath);
wasteDB.ensureIndex({ fieldName: "_id", unique: true });

module.exports = app;

/**
 * GET endpoint: Get waste tracking API info
 */
app.get("/", function (req, res) {
    res.send("Waste Tracking API");
});

/**
 * POST endpoint: Log waste entry and deduct from inventory
 */
app.post("/waste", function (req, res) {
    const { productId, quantity, reason, notes } = req.body;

    if (!productId || !quantity || !reason) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Product ID, quantity, and reason are required.",
        });
    }

    const wasteQuantity = parseInt(quantity);
    if (isNaN(wasteQuantity) || wasteQuantity <= 0) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Quantity must be a positive number.",
        });
    }

    // Get product details
    inventoryDB.findOne({ _id: parseInt(productId) }, function (err, product) {
        if (err || !product) {
            return res.status(404).json({
                error: "Product not found",
                message: "The specified product does not exist in inventory.",
            });
        }

        if (parseInt(product.quantity) < wasteQuantity) {
            return res.status(400).json({
                error: "Insufficient stock",
                message: `Cannot waste ${wasteQuantity} units. Only ${product.quantity} available.`,
            });
        }

        const unitCost = parseFloat(product.cost) || 0;
        const totalCost = unitCost * wasteQuantity;

        const wasteEntry = {
            _id: Date.now() + Math.floor(Math.random() * 1000),
            productId: parseInt(productId),
            productName: validator.escape(product.name),
            quantity: wasteQuantity,
            reason: validator.escape(reason),
            unitCost: unitCost,
            totalCost: totalCost,
            date: new Date().toISOString(),
            notes: notes ? validator.escape(notes) : "",
        };

        // Insert waste entry
        wasteDB.insert(wasteEntry, function (err, newDoc) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to log waste entry.",
                });
            }

            // Deduct from inventory
            inventoryApp.decrementInventory([{ id: productId, quantity: wasteQuantity }]);

            res.status(201).json({
                message: "Waste entry logged successfully",
                wasteEntry: newDoc,
            });
        });
    });
});

/**
 * GET endpoint: Get all waste entries with optional filtering
 */
app.get("/waste", function (req, res) {
    const { startDate, endDate, reason, productId, limit = 100, offset = 0 } = req.query;

    let query = {};

    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate).toISOString();
        if (endDate) query.date.$lte = new Date(endDate).toISOString();
    }

    if (reason) query.reason = reason;
    if (productId) query.productId = parseInt(productId);

    wasteDB.find(query)
        .sort({ date: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .exec(function (err, docs) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to retrieve waste entries.",
                });
            }

            res.json(docs);
        });
});

/**
 * GET endpoint: Get waste analytics
 */
app.get("/analytics", function (req, res) {
    const { startDate, endDate } = req.query;

    let query = {};
    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate).toISOString();
        if (endDate) query.date.$lte = new Date(endDate).toISOString();
    }

    wasteDB.find(query, function (err, docs) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve analytics data.",
            });
        }

        const analytics = {
            totalEntries: docs.length,
            totalWasteCost: docs.reduce((sum, entry) => sum + (entry.totalCost || 0), 0),
            totalWasteQuantity: docs.reduce((sum, entry) => sum + (entry.quantity || 0), 0),
            wasteByReason: {},
            wasteByProduct: {},
            trends: {},
        };

        docs.forEach(entry => {
            // By reason
            if (!analytics.wasteByReason[entry.reason]) {
                analytics.wasteByReason[entry.reason] = { count: 0, cost: 0, quantity: 0 };
            }
            analytics.wasteByReason[entry.reason].count++;
            analytics.wasteByReason[entry.reason].cost += entry.totalCost || 0;
            analytics.wasteByReason[entry.reason].quantity += entry.quantity || 0;

            // By product
            if (!analytics.wasteByProduct[entry.productName]) {
                analytics.wasteByProduct[entry.productName] = { count: 0, cost: 0, quantity: 0 };
            }
            analytics.wasteByProduct[entry.productName].count++;
            analytics.wasteByProduct[entry.productName].cost += entry.totalCost || 0;
            analytics.wasteByProduct[entry.productName].quantity += entry.quantity || 0;

            // Trends by date
            const dateKey = entry.date.split('T')[0]; // YYYY-MM-DD
            if (!analytics.trends[dateKey]) {
                analytics.trends[dateKey] = { count: 0, cost: 0, quantity: 0 };
            }
            analytics.trends[dateKey].count++;
            analytics.trends[dateKey].cost += entry.totalCost || 0;
            analytics.trends[dateKey].quantity += entry.quantity || 0;
        });

        res.json(analytics);
    });
});

/**
 * DELETE endpoint: Delete a waste entry
 */
app.delete("/waste/:wasteId", function (req, res) {
    const wasteId = parseInt(req.params.wasteId);

    wasteDB.remove({ _id: wasteId }, {}, function (err, numRemoved) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to delete waste entry.",
            });
        }

        if (numRemoved === 0) {
            return res.status(404).json({
                error: "Not Found",
                message: "Waste entry not found.",
            });
        }

        res.json({
            message: "Waste entry deleted successfully.",
        });
    });
});