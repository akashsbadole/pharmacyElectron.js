const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const validator = require("validator");
const path = require("path");
const { getDatabase } = require('./database_utils');

const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "time_pricing_rules.db",
);

app.use(bodyParser.json());

module.exports = app;

let timePricingRulesDB = getDatabase(dbPath);
module.exports.timePricingRulesDB = timePricingRulesDB;
timePricingRulesDB.ensureIndex({ fieldName: "_id", unique: true });

/**
 * GET endpoint: Get welcome message for Time Pricing Rules API.
 */
app.get("/", function (req, res) {
    res.send("Time Pricing Rules API");
});

/**
 * GET endpoint: Get all time pricing rules.
 */
app.get("/rules", function (req, res) {
    timePricingRulesDB.find({}, function (err, docs) {
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
 * GET endpoint: Get time pricing rules for a specific item.
 */
app.get("/rules/:itemId", function (req, res) {
    const itemId = parseInt(req.params.itemId);
    timePricingRulesDB.find({ item_id: itemId, active: true }, function (err, docs) {
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
 * POST endpoint: Create a new time pricing rule.
 */
app.post("/rule", function (req, res) {
    const rule = {
        _id: Math.floor(Date.now() / 1000),
        item_id: parseInt(validator.escape(req.body.item_id || "")),
        name: validator.escape(req.body.name || ""),
        description: validator.escape(req.body.description || ""),
        start_time: validator.escape(req.body.start_time || ""),
        end_time: validator.escape(req.body.end_time || ""),
        discount_type: validator.escape(req.body.discount_type || "percentage"),
        discount_value: parseFloat(req.body.discount_value || 0),
        days_of_week: req.body.days_of_week || [0,1,2,3,4,5,6], // Default all days
        active: req.body.active !== undefined ? req.body.active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // Validate required fields
    if (!rule.item_id || !rule.start_time || !rule.end_time || rule.discount_value <= 0) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Item ID, start time, end time, and discount value are required.",
        });
    }

    timePricingRulesDB.insert(rule, function (err, newRule) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            res.sendStatus(200);
        }
    });
});

/**
 * PUT endpoint: Update an existing time pricing rule.
 */
app.put("/rule/:ruleId", function (req, res) {
    const ruleId = parseInt(req.params.ruleId);

    const updateData = {
        name: validator.escape(req.body.name || ""),
        description: validator.escape(req.body.description || ""),
        start_time: validator.escape(req.body.start_time || ""),
        end_time: validator.escape(req.body.end_time || ""),
        discount_type: validator.escape(req.body.discount_type || "percentage"),
        discount_value: parseFloat(req.body.discount_value || 0),
        days_of_week: req.body.days_of_week || [0,1,2,3,4,5,6],
        active: req.body.active !== undefined ? req.body.active : true,
        updated_at: new Date().toISOString()
    };

    timePricingRulesDB.update(
        { _id: ruleId },
        { $set: updateData },
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
                    message: "Rule not found.",
                });
            } else {
                res.sendStatus(200);
            }
        }
    );
});

/**
 * DELETE endpoint: Delete a time pricing rule.
 */
app.delete("/rule/:ruleId", function (req, res) {
    const ruleId = parseInt(req.params.ruleId);
    timePricingRulesDB.remove(
        { _id: ruleId },
        {},
        function (err, numRemoved) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            } else if (numRemoved === 0) {
                res.status(404).json({
                    error: "Not Found",
                    message: "Rule not found.",
                });
            } else {
                res.sendStatus(200);
            }
        }
    );
});

/**
 * GET endpoint: Get current applicable pricing for an item.
 * This checks if any rules apply at the current time.
 */
app.get("/current-pricing/:itemId", function (req, res) {
    const itemId = parseInt(req.params.itemId);
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentDay = now.getDay(); // 0 = Sunday

    timePricingRulesDB.find(
        { item_id: itemId, active: true },
        function (err, rules) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            }

            // Find applicable rules
            const applicableRules = rules.filter(rule => {
                // Check if current day is included
                if (!rule.days_of_week.includes(currentDay)) {
                    return false;
                }

                // Check if current time is within range
                return currentTime >= rule.start_time && currentTime <= rule.end_time;
            });

            if (applicableRules.length === 0) {
                return res.json({ has_discount: false, original_price: null });
            }

            // Apply the first applicable rule (could be extended to handle multiple)
            const rule = applicableRules[0];
            const result = {
                has_discount: true,
                rule_id: rule._id,
                rule_name: rule.name,
                discount_type: rule.discount_type,
                discount_value: rule.discount_value,
                start_time: rule.start_time,
                end_time: rule.end_time
            };

            res.json(result);
        }
    );
});