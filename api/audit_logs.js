const app = require("express")();
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const path = require("path");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "audit_logs.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

let auditDB = getDatabase(dbPath);

module.exports = app;

/**
 * GET endpoint: Get all audit logs
 */
app.get("/all", function (req, res) {
    auditDB.find({}).sort({ timestamp: -1 }).exec(function (err, docs) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.send(docs);
        }
    });
});

/**
 * POST endpoint: Create a new audit log entry
 */
app.post("/log", function (req, res) {
    let logEntry = {
        _id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp: new Date().toISOString(),
        action: req.body.action,
        user: req.body.user || "System",
        details: req.body.details,
        severity: req.body.severity || "info"
    };

    auditDB.insert(logEntry, function (err, newDoc) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.send(newDoc);
        }
    });
});

/**
 * Internal function to log transaction details
 */
app.logTransaction = function (details) {
    let logEntry = {
        _id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp: new Date().toISOString(),
        action: "RESTRICTED_DRUG_SALE",
        user: details.user || "System",
        details: details,
        severity: "warning"
    };

    auditDB.insert(logEntry, function (err) {
        if (err) console.error("Audit Log Error:", err);
    });
};
