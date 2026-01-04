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
    "customers.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

let customerDB = getDatabase(dbPath);
customerDB.ensureIndex({ fieldName: "_id", unique: true });

/**
 * GET endpoint: Get the welcome message for the Customer API.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/", function (req, res) {
    res.send("Customer API");
});

/**
 * GET endpoint: Get customer details by customer ID.
 *
 * @param {Object} req request object with customer ID as a parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/customer/:customerId", function (req, res) {
    if (!req.params.customerId) {
        res.status(500).send("ID field is required.");
    } else {
        customerDB.findOne(
            {
                _id: req.params.customerId,
            },
            function (err, customer) {
                res.send(customer);
            },
        );
    }
});

/**
 * GET endpoint: Get details of all customers.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/all", function (req, res) {
    customerDB.find({}, function (err, docs) {
        res.send(docs);
    });
});

/**
 * POST endpoint: Create a new customer.
 *
 * @param {Object} req request object with new customer data in the body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.post("/customer", function (req, res) {
    var newCustomer = req.body;
    
    // Initialize garment-specific preferences if not present
    if (!newCustomer.garmentPreferences) {
        newCustomer.garmentPreferences = {
            sizePreferences: {},
            colorPreferences: {},
            brandPreferences: [],
            stylePreferences: [],
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
    }
    
    customerDB.insert(newCustomer, function (err, customer) {
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
 * PUT endpoint: Update customer garment preferences
 */
app.put("/preferences/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    const preferenceUpdates = req.body;
    
    // Validate customer exists
    customerDB.findOne({ _id: customerId }, function (err, customer) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to find customer"
            });
            return;
        }
        
        if (!customer) {
            res.status(404).json({
                error: "Not Found",
                message: "Customer not found"
            });
            return;
        }
        
        // Update garment preferences
        const updateData = {
            garmentPreferences: {
                ...customer.garmentPreferences,
                ...preferenceUpdates,
                lastUpdated: new Date().toISOString()
            }
        };
        
        customerDB.update(
            { _id: customerId },
            { $set: updateData },
            {},
            function (err, numReplaced) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "Failed to update preferences"
                    });
                } else {
                    res.sendStatus(200);
                }
            }
        );
    });
});

/**
 * GET endpoint: Get customer garment preferences
 */
app.get("/preferences/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    
    customerDB.findOne({ _id: customerId }, function (err, customer) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve customer"
            });
            return;
        }
        
        if (!customer) {
            res.status(404).json({
                error: "Not Found",
                message: "Customer not found"
            });
            return;
        }
        
        // Return garment preferences or default structure
        const preferences = customer.garmentPreferences || {
            sizePreferences: {},
            colorPreferences: {},
            brandPreferences: [],
            stylePreferences: [],
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        res.send(preferences);
    });
});

/**
 * POST endpoint: Add size preference for a customer
 */
app.post("/preferences/:customerId/size", function (req, res) {
    const customerId = req.params.customerId;
    const { category, size, preference } = req.body;
    
    if (!category || !size) {
        res.status(400).json({
            error: "Bad Request",
            message: "Category and size are required"
        });
        return;
    }
    
    customerDB.findOne({ _id: customerId }, function (err, customer) {
        if (err || !customer) {
            res.status(404).json({
                error: "Not Found",
                message: "Customer not found"
            });
            return;
        }
        
        // Initialize preferences if not exists
        if (!customer.garmentPreferences) {
            customer.garmentPreferences = {
                sizePreferences: {},
                colorPreferences: {},
                brandPreferences: [],
                stylePreferences: [],
                createdAt: new Date().toISOString()
            };
        }
        
        if (!customer.garmentPreferences.sizePreferences[category]) {
            customer.garmentPreferences.sizePreferences[category] = {};
        }
        
        // Update or set size preference
        customer.garmentPreferences.sizePreferences[category][size] = preference || 1;
        customer.garmentPreferences.lastUpdated = new Date().toISOString();
        
        customerDB.update(
            { _id: customerId },
            { $set: { garmentPreferences: customer.garmentPreferences } },
            {},
            function (err, numReplaced) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "Failed to update size preference"
                    });
                } else {
                    res.sendStatus(200);
                }
            }
        );
    });
});

/**
 * POST endpoint: Add color preference for a customer
 */
app.post("/preferences/:customerId/color", function (req, res) {
    const customerId = req.params.customerId;
    const { color, preference } = req.body;
    
    if (!color) {
        res.status(400).json({
            error: "Bad Request",
            message: "Color is required"
        });
        return;
    }
    
    customerDB.findOne({ _id: customerId }, function (err, customer) {
        if (err || !customer) {
            res.status(404).json({
                error: "Not Found",
                message: "Customer not found"
            });
            return;
        }
        
        // Initialize preferences if not exists
        if (!customer.garmentPreferences) {
            customer.garmentPreferences = {
                sizePreferences: {},
                colorPreferences: {},
                brandPreferences: [],
                stylePreferences: [],
                createdAt: new Date().toISOString()
            };
        }
        
        if (!customer.garmentPreferences.colorPreferences) {
            customer.garmentPreferences.colorPreferences = {};
        }
        
        // Update or set color preference
        customer.garmentPreferences.colorPreferences[color] = preference || 1;
        customer.garmentPreferences.lastUpdated = new Date().toISOString();
        
        customerDB.update(
            { _id: customerId },
            { $set: { garmentPreferences: customer.garmentPreferences } },
            {},
            function (err, numReplaced) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "Failed to update color preference"
                    });
                } else {
                    res.sendStatus(200);
                }
            }
        );
    });
});

/**
 * GET endpoint: Get customers with preferences for analytics
 */
app.get("/with-preferences", function (req, res) {
    const minPurchases = parseInt(req.query.min_purchases) || 1;
    
    customerDB.find({ 
        'garmentPreferences': { $exists: true }
    }, function (err, customers) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve customers"
            });
            return;
        }
        
        // Filter customers with meaningful preferences
        const customersWithPreferences = customers.filter(customer => {
            const prefs = customer.garmentPreferences;
            if (!prefs) return false;
            
            const hasSizePrefs = Object.keys(prefs.sizePreferences || {}).length > 0;
            const hasColorPrefs = Object.keys(prefs.colorPreferences || {}).length > 0;
            const hasBrandPrefs = (prefs.brandPreferences || []).length > 0;
            
            return hasSizePrefs || hasColorPrefs || hasBrandPrefs;
        });
        
        res.send({
            total_customers: customersWithPreferences.length,
            customers: customersWithPreferences.map(customer => ({
                _id: customer._id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                garmentPreferences: customer.garmentPreferences
            }))
        });
    });
});

/**
 * DELETE endpoint: Delete a customer by customer ID.
 *
 * @param {Object} req request object with customer ID as a parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.delete("/customer/:customerId", function (req, res) {
    customerDB.remove(
        {
            _id: req.params.customerId,
        },
        function (err, numRemoved) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            } else {
                res.sendStatus(200);
            }
        },
    );
});

/**
 * PUT endpoint: Update customer details.
 *
 * @param {Object} req request object with updated customer data in the body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.put("/customer", function (req, res) {
    let customerId = validator.escape(req.body._id);

    customerDB.update(
        {
            _id: customerId,
        },
        req.body,
        {},
        function (err, numReplaced, customer) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            } else {
                res.sendStatus(200);
            }
        },
    );
});