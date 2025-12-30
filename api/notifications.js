const app = require("express")();
const bodyParser = require("body-parser");

app.use(bodyParser.json());

module.exports = app;

/**
 * GET endpoint: Welcome message
 */
app.get("/", function (req, res) {
    res.send("Notifications API");
});

/**
 * POST endpoint: Send Alert Stub
 */
app.post("/alerts/send", function (req, res) {
    const { type, recipient, message } = req.body;
    console.log(`Sending ${type} alert to ${recipient}: ${message}`);
    // Future integration with SMS/Email gateway
    res.json({ success: true, message: `Alert sent via ${type}` });
});
