const app = require("express")();
const bodyParser = require("body-parser");

app.use(bodyParser.json());

module.exports = app;

/**
 * GET endpoint: Welcome message
 */
app.get("/", function (req, res) {
    res.send("Integration API");
});

/**
 * POST endpoint: Cloud Sync Stub
 */
app.post("/sync/cloud", function (req, res) {
    console.log("Initiating Cloud Sync...");
    // Future integration to upload local databases/files to cloud bucket
    setTimeout(() => {
        res.json({ success: true, message: "Use Data successfully synced to cloud securely!" });
    }, 1000);
});

/**
 * POST endpoint: Multi-device Sync Stub
 */
app.post("/sync/device", function (req, res) {
    const { deviceDetails } = req.body;
    console.log("Syncing with device:", deviceDetails);
    // Future integration for P2P or Server-mediated sync
    res.json({ success: true, message: "Sync handshake successful." });
});
