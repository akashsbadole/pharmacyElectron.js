const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const path = require("path");
const { getDatabase } = require('./database_utils');

const dbPath = path.join(
    process.env.APPDATA,
    process.env.APPNAME,
    "server",
    "databases",
    "session_logs.db",
);

app.use(bodyParser.json());

module.exports = app;

let sessionLogsDB = getDatabase(dbPath);
sessionLogsDB.ensureIndex({ fieldName: "_id", unique: true });

/**
 * GET endpoint: Get the welcome message for the Session Logs API.
 */
app.get("/", function (req, res) {
    res.send("Session Logs API");
});

/**
 * POST endpoint: Log a session event.
 */
app.post("/log", function (req, res) {
    let log = {
        user_id: req.body.user_id,
        action: req.body.action, // 'login' or 'logout'
        timestamp: new Date().toISOString()
    };
    sessionLogsDB.insert(log, function (err, doc) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.sendStatus(200);
        }
    });
});

/**
 * GET endpoint: Get logs for a user within date range.
 */
app.get("/user/:userId", function (req, res) {
    let start = new Date(req.query.start);
    let end = new Date(req.query.end);
    sessionLogsDB.find({
        user_id: parseInt(req.params.userId),
        timestamp: { $gte: start.toISOString(), $lte: end.toISOString() }
    }, function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.send(docs);
        }
    });
});