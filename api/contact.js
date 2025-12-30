const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const validator = require("validator");
const path = require("path");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "contact.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

let contactDB = getDatabase(dbPath);

contactDB.ensureIndex({ fieldName: "_id", unique: true });

/**
 * GET endpoint: Get the welcome message for the Contact API.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/", function (req, res) {
    res.send("Contact Information API");
});

/**
 * GET endpoint: Get contact information.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/get", function (req, res) {
    contactDB.findOne(
        {
            _id: 1,
        },
        function (err, docs) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to retrieve contact information.",
                });
            } else {
                res.send(docs);
            }
        },
    );
});

/**
 * POST endpoint: Create or update contact information.
 *
 * @param {Object} req request object with contact data in the body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.post("/post", function (req, res) {
    let contactInfo = {
        _id: 1,
        contact: {
            companyName: validator.escape(req.body.companyName || ""),
            phone: validator.escape(req.body.phone || ""),
            email: validator.escape(req.body.email || ""),
            website: validator.escape(req.body.website || ""),
            address: validator.escape(req.body.address || ""),
            supportHours: validator.escape(req.body.supportHours || ""),
            facebook: validator.escape(req.body.facebook || ""),
            twitter: validator.escape(req.body.twitter || ""),
            instagram: validator.escape(req.body.instagram || ""),
        },
    };

    if (validator.escape(req.body.id) === "") {
        contactDB.insert(contactInfo, function (err, contact) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to create contact information.",
                });
            } else {
                res.sendStatus(200);
            }
        });
    } else {
        contactDB.update(
            {
                _id: 1,
            },
            contactInfo,
            {},
            function (err, numReplaced, contact) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "Failed to update contact information.",
                    });
                } else {
                    res.sendStatus(200);
                }
            },
        );
    }
});
