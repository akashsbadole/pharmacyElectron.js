const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const multer = require("multer");
const sanitizeFilename = require('sanitize-filename');
const fs = require("fs");
const path = require("path");
const validator = require("validator");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
const validFileTypes = [
    "image/jpg",
    "image/jpeg",
    "image/png",
    "image/webp"];
const maxFileSize = 2097152 //2MB = 2*1024*1024
const defaultLogoName = "logo";
const {filterFile} = require('../assets/js/utils');
const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "settings.db",
);

const storage = multer.diskStorage({
    destination: path.join(appData, appName, "uploads"),
    filename: function (req, file, callback) {
        callback(null, defaultLogoName+path.extname(file.originalname));
    },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: maxFileSize },
  fileFilter: filterFile,
}).single("imagename");


const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

let settingsDB = getDatabase(dbPath);
settingsDB.ensureIndex({ fieldName: "_id", unique: true });
/**
 * GET endpoint: Get the welcome message for the Settings API.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */

app.get("/", function (req, res) {
    res.send("Settings API");
});

/**
 * GET endpoint: Get settings details.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/get", function (req, res) {
    settingsDB.findOne(
        {
            _id: 1,
        },
        function (err, docs) {
            res.send(docs);
        },
    );
});

/**
 * POST endpoint: Create or update settings.
 *
 * @param {Object} req request object with settings data in the body.
 * @param {Object} res response object.
 * @returns {void}
 */

app.post("/post", function (req, res) {
    upload(req, res, function (err) {

        if (err) {
            if (err instanceof multer.MulterError) {
                console.error('Upload Error:', err);
                return res.status(400).json({
                    error: 'Upload Error',
                    message: err.message,
                });
            } else {
                console.error('Unknown Error:', err);
                return res.status(500).json({
                    error: 'Internal Server Error',
                    message: err.message,
                });
            }
        }

    let image = "";

    if (validator.escape(req.body.img) !== "") {
        image = sanitizeFilename(req.body.img);
    }

    if (req.file) {
        image = sanitizeFilename(req.file.filename);
    }


    if (validator.escape(req.body.remove) === "1") {
            try {
                let imgPath = path.join(
                appData,
                appName,
                "uploads",
                image,
                );

                if (!req.file) {
                fs.unlinkSync(imgPath);
                image = "";
                }
                
            } catch (err) {
                console.error(err);
            }

        }
        
    let Settings = {
        _id: 1,
        settings: {
            app: validator.escape(req.body.app),
            store: validator.escape(req.body.store),
            address_one: validator.escape(req.body.address_one),
            address_two: validator.escape(req.body.address_two),
            contact: validator.escape(req.body.contact),
            tax: validator.escape(req.body.tax),
            symbol: validator.escape(req.body.symbol),
            percentage: validator.escape(req.body.percentage),
            charge_tax: req.body.charge_tax === 'on',
            footer: validator.escape(req.body.footer),
            img: image,
            gstin: validator.escape(req.body.gstin || ""),
            cgst: validator.escape(req.body.cgst || "0"),
            sgst: validator.escape(req.body.sgst || "0"),
            igst: validator.escape(req.body.igst || "0"),
            payment_modes: req.body.payment_modes || ["Cash", "Card", "UPI", "Net Banking"],
            upi_merchant_id: validator.escape(req.body.upi_merchant_id || ""),
            upi_merchant_name: validator.escape(req.body.upi_merchant_name || ""),
            backup_frequency: validator.escape(req.body.backup_frequency || "off"),
            backup_time: validator.escape(req.body.backup_time || "00:00"),
            enable_encryption: req.body.enable_encryption === 'on' || req.body.enable_encryption === true,
            receipt_auto_save: {
                enabled: req.body.receipt_auto_save_enabled === 'on' || req.body.receipt_auto_save_enabled === true,
                save_pdf: req.body.receipt_save_pdf === 'on' || req.body.receipt_save_pdf === true,
                save_image: req.body.receipt_save_image === 'on' || req.body.receipt_save_image === true,
                folder_structure: validator.escape(req.body.receipt_folder_structure || "receipts/{YYYY}/{MM}/{DD}"),
                filename_pattern: validator.escape(req.body.receipt_filename_pattern || "receipt-{transaction_id}"),
                image_format: validator.escape(req.body.receipt_image_format || "png"),
                image_quality: parseFloat(req.body.receipt_image_quality || "0.95"),
                pdf_format: validator.escape(req.body.receipt_pdf_format || "a4"),
                include_timestamp: req.body.receipt_include_timestamp === 'on' || req.body.receipt_include_timestamp === true
            }
        },
    };

    if (validator.escape(req.body.id) === "") {
        settingsDB.insert(Settings, function (err, settings) {
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
    } else {
        settingsDB.update(
            {
                _id: 1,
            },
            Settings,
            {},
            function (err, numReplaced, settings) {
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
    }
});

/**
 * POST endpoint: Test SMTP email configuration
 */
app.post("/test-smtp", function (req, res) {
    const nodemailer = require('nodemailer');

    // Get SMTP settings from database
    settingsDB.findOne({ _id: 1 }, function (err, docs) {
        if (err) {
            console.error('Error fetching settings:', err);
            return res.status(500).json({ success: false, error: 'Failed to fetch settings' });
        }

        const settings = docs?.settings || {};
        const emailConfig = settings.email_sharing || {};

        if (!emailConfig.enabled) {
            return res.status(400).json({ success: false, error: 'Email sharing is not enabled' });
        }

        if (!emailConfig.smtp_host || !emailConfig.smtp_username || !emailConfig.smtp_password) {
            return res.status(400).json({ success: false, error: 'SMTP configuration incomplete' });
        }

        // Create transporter
        const transporter = nodemailer.createTransporter({
            host: emailConfig.smtp_host,
            port: emailConfig.smtp_port || 587,
            secure: emailConfig.smtp_secure || false,
            auth: {
                user: emailConfig.smtp_username,
                pass: emailConfig.smtp_password
            }
        });

        // Test email options
        const testEmail = req.body.test_email || emailConfig.from_email;
        const mailOptions = {
            from: `"${emailConfig.from_name || 'Test'}" <${emailConfig.from_email}>`,
            to: testEmail,
            subject: 'SMTP Test Email - PharmaMine',
            html: `
                <h2>SMTP Configuration Test</h2>
                <p>This is a test email to verify your SMTP configuration in PharmaMine.</p>
                <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
                <p>If you received this email, your SMTP settings are configured correctly!</p>
                <hr>
                <p><small>This is an automated test email from PharmaMine POS system.</small></p>
            `
        };

        // Send test email
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.error('SMTP test failed:', error);
                return res.status(500).json({
                    success: false,
                    error: 'SMTP test failed',
                    details: error.message
                });
            }

            console.log('SMTP test successful:', info.messageId);
            res.json({
                success: true,
                message: 'SMTP test successful',
                messageId: info.messageId,
                testEmail: testEmail
            });
        });
    });
});

});