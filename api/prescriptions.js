const app = require("express")();
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const validator = require("validator");
const sanitizeFilename = require('sanitize-filename');

const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "prescriptions.db",
);

const uploadDir = path.join(__dirname, "../public/uploads/prescriptions");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const validFileTypes = [
    "image/jpg",
    "image/jpeg",
    "image/png",
    "application/pdf"
];
const maxFileSize = 5 * 1024 * 1024; // 5MB

const fileFilter = (req, file, cb) => {
    if (validFileTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and PDF are allowed.'), false);
    }
};

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: function (req, file, callback) {
        callback(null, Date.now() + "-" + sanitizeFilename(file.originalname));
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: maxFileSize },
    fileFilter: fileFilter,
}).single("prescription_file");

app.use(bodyParser.json());

module.exports = app;

let prescriptionDB = new Datastore({
    filename: dbPath,
    autoload: true,
});

prescriptionDB.ensureIndex({ fieldName: "_id", unique: true });
prescriptionDB.ensureIndex({ fieldName: "customer_id" });

/**
 * GET /all?customerId=X
 */
app.get("/all", function (req, res) {
    const customerId = req.query.customerId;
    if (!customerId) {
        return res.status(400).send("customerId is required");
    }
    prescriptionDB.find({ customer_id: customerId }, function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
        } else {
            res.send(docs);
        }
    });
});

/**
 * POST /upload
 */
app.post("/upload", function (req, res) {
    upload(req, res, function (err) {
        if (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: 'Upload Error', message: err.message });
            } else {
                return res.status(400).json({ error: 'File Error', message: err.message });
            }
        }

        const { customer_id, product_id, doctor_name, notes } = req.body;

        if (!customer_id) {
            return res.status(400).json({ error: 'Customer ID is required' });
        }

        let prescription = {
            _id: Math.floor(Date.now() / 1000),
            customer_id: validator.escape(customer_id),
            product_id: product_id ? JSON.parse(product_id) : [], // assuming array
            prescription_data: req.file ? req.file.filename : null,
            date: new Date().toISOString(),
            doctor_name: doctor_name ? validator.escape(doctor_name) : '',
            notes: notes ? validator.escape(notes) : '',
        };

        prescriptionDB.insert(prescription, function (err, newDoc) {
            if (err) {
                console.error(err);
                res.status(500).json({ error: "Internal Server Error" });
            } else {
                res.status(200).send(newDoc);
            }
        });
    });
});

/**
 * DELETE /delete/:id
 */
app.delete("/delete/:id", function (req, res) {
    const id = req.params.id;
    prescriptionDB.findOne({ _id: parseInt(id) }, function (err, doc) {
        if (err) {
            console.error(err);
            return res.status(500).send("Internal Server Error");
        }
        if (!doc) {
            return res.status(404).send("Prescription not found");
        }

        // Remove file if exists
        if (doc.prescription_data) {
            const filePath = path.join(uploadDir, doc.prescription_data);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (err) {
                console.error("Error deleting file:", err);
            }
        }

        prescriptionDB.remove({ _id: parseInt(id) }, {}, function (err, numRemoved) {
            if (err) {
                console.error(err);
                res.status(500).send("Internal Server Error");
            } else {
                res.sendStatus(200);
            }
        });
    });
});

/**
 * GET /view/:id
 */
app.get("/view/:id", function (req, res) {
    const id = req.params.id;
    prescriptionDB.findOne({ _id: parseInt(id) }, function (err, doc) {
        if (err) {
            console.error(err);
            return res.status(500).send("Internal Server Error");
        }
        if (!doc || !doc.prescription_data) {
            return res.status(404).send("File not found");
        }

        const filePath = path.join(uploadDir, doc.prescription_data);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send("File not found");
        }

        res.sendFile(filePath);
    });
});