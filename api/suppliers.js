const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const validator = require("validator");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
const path = require("path");

const { getDatabase } = require('./database_utils');

const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "suppliers.db",
);

app.use(bodyParser.json());

module.exports = app;

let suppliersDB = getDatabase(dbPath);
suppliersDB.ensureIndex({ fieldName: "_id", unique: true });

/**
 * GET endpoint: Get all suppliers.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/", function (req, res) {
    suppliersDB.find({}, function (err, docs) {
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
 * GET endpoint: Get supplier by ID.
 *
 * @param {Object} req request object with supplier ID as parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/:supplierId", function (req, res) {
    if (!req.params.supplierId) {
        res.status(400).send("Supplier ID is required.");
    } else {
        suppliersDB.findOne(
            {
                _id: parseInt(req.params.supplierId),
            },
            function (err, supplier) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "An unexpected error occurred.",
                    });
                } else {
                    res.send(supplier);
                }
            },
        );
    }
});

/**
 * POST endpoint: Create a new supplier.
 *
 * @param {Object} req request object with supplier data in body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.post("/", function (req, res) {
    let supplier = {
        _id: Math.floor(Date.now() / 1000),
        name: validator.escape(req.body.name),
        contact_person: validator.escape(req.body.contact_person || ""),
        phone: validator.escape(req.body.phone || ""),
        email: validator.escape(req.body.email || ""),
        address: validator.escape(req.body.address || ""),
        payment_terms: validator.escape(req.body.payment_terms || ""),
    };

    suppliersDB.insert(supplier, function (err, newSupplier) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            res.send(newSupplier);
        }
    });
});

/**
 * PUT endpoint: Update a supplier.
 *
 * @param {Object} req request object with supplier data in body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.put("/:supplierId", function (req, res) {
    let supplierId = parseInt(req.params.supplierId);
    let updateData = {
        name: validator.escape(req.body.name),
        contact_person: validator.escape(req.body.contact_person || ""),
        phone: validator.escape(req.body.phone || ""),
        email: validator.escape(req.body.email || ""),
        address: validator.escape(req.body.address || ""),
        payment_terms: validator.escape(req.body.payment_terms || ""),
    };

    suppliersDB.update(
        { _id: supplierId },
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
                    message: "Supplier not found.",
                });
            } else {
                suppliersDB.findOne({ _id: supplierId }, function (err, supplier) {
                    if (err) {
                        console.error(err);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: "An unexpected error occurred.",
                        });
                    } else {
                        res.send(supplier);
                    }
                });
            }
        },
    );
});

/**
 * DELETE endpoint: Delete a supplier by ID.
 *
 * @param {Object} req request object with supplier ID as parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.delete("/:supplierId", function (req, res) {
    suppliersDB.remove(
        {
            _id: parseInt(req.params.supplierId),
        },
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
                    message: "Supplier not found.",
                });
            } else {
                res.sendStatus(200);
            }
        },
    );
});