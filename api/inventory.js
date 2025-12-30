const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const async = require("async");
const sanitizeFilename = require('sanitize-filename');
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const csv = require('csv-parser');
const json2csv = require('json-2-csv').json2csv;
const { Readable } = require('stream');
const { filterFile } = require('../assets/js/utils');
const { initializeDatabase, cleanupTempFiles } = require('./database_utils');
const validFileTypes = [
    "image/jpg",
    "image/jpeg",
    "image/png",
    "image/webp"];
const maxFileSize = 2097152 //2MB = 2*1024*1024
const validator = require("validator");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "inventory.db",
);

const storage = multer.diskStorage({
    destination: path.join(appData, appName, "uploads"),
    filename: function (req, file, callback) {
        callback(null, Date.now() + path.extname(file.originalname));
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

let inventoryDB = getDatabase(dbPath);
inventoryDB.ensureIndex({ fieldName: "_id", unique: true });

/**
 * GET endpoint: Get the welcome message for the Inventory API.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/", function (req, res) {
    res.send("Inventory API");
});

/**
 * GET endpoint: Get product details (alias for /products for compatibility).
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/product", function (req, res) {
    inventoryDB.find({}, function (err, docs) {
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
 * GET endpoint: Get product details by product ID.
 *
 * @param {Object} req request object with product ID as a parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/product/:productId", function (req, res) {
    if (!req.params.productId) {
        res.status(500).send("ID field is required.");
    } else {
        inventoryDB.findOne(
            {
                _id: parseInt(req.params.productId),
            },
            function (err, product) {
                res.send(product);
            },
        );
    }
});

/**
 * GET endpoint: Get details of all products.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/products", function (req, res) {
    inventoryDB.find({}, function (err, docs) {
        res.send(docs);
    });
});

/**
 * POST endpoint: Create a new product.
 *
 * @param {Object} req request object with product data in the body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.post("/product", function (req, res) {
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
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            }

        }

        let batches = [];
        try {
            if (req.body.batches) {
                batches = JSON.parse(req.body.batches);
            }
        } catch (e) {
            console.error("Error parsing batches", e);
        }

        let quantity = validator.escape(req.body.quantity || "");
        let expirationDate = validator.escape(req.body.expirationDate || "");

        if (batches.length > 0) {
            quantity = batches.reduce((sum, b) => sum + (parseInt(b.quantity) || 0), 0);
            
            // Find earliest expiry
            const sortedBatches = batches.filter(b => b.expirationDate).sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));
            if (sortedBatches.length > 0) {
                expirationDate = sortedBatches[0].expirationDate;
            }
        }

        let Product = {
            _id: parseInt(validator.escape(req.body.id || "")),
            barcode: req.body.barcode ? parseInt(validator.escape(req.body.barcode)) : null,
            expirationDate: expirationDate,
            price: validator.escape(req.body.price || ""),
            cost: validator.escape(req.body.cost || req.body.price || ""), // Cost price for COGS
            category: validator.escape(req.body.category || ""),
            quantity: quantity == "" ? 0 : quantity,
            name: validator.escape(req.body.name || ""),
            stock: req.body.stock === "on" ? 0 : 1,
            minStock: validator.escape(req.body.minStock || ""),
            img: image,
            alertHistory: req.body.alertHistory || [],
            lastRestocked: validator.escape(req.body.lastRestocked || "") || null,
            supplierId: validator.escape(req.body.supplierId || "") || null,
            reorderQuantity: validator.escape(req.body.reorderQuantity || "") || 0,
            requires_prescription: req.body.requires_prescription === "on" ? true : false,
            generic_name: validator.escape(req.body.generic_name || ""), 
            drug_schedule: validator.escape(req.body.drug_schedule || ""), 
            hsn_code: validator.escape(req.body.hsn_code || ""),
            batches: batches
        };

        if (validator.escape(req.body.id || "") === "") {
            Product._id = Math.floor(Date.now() / 1000);
            inventoryDB.insert(Product, function (err, product) {
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
            inventoryDB.update(
                {
                    _id: parseInt(validator.escape(req.body.id || "")),
                },
                Product,
                {},
                function (err, numReplaced, product) {
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
});

/**
 * PUT endpoint: Update an existing product.
 *
 * @param {Object} req request object with product data in the body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.put("/product", function (req, res) {
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

        if (req.body.img && validator.escape(req.body.img) !== "") {
            image = sanitizeFilename(req.body.img);
        }

        if (req.file) {
            image = sanitizeFilename(req.file.filename);
        }


        if (req.body.remove && req.body.remove === "1") {
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
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            }

        }

        let Product = {
            _id: parseInt(validator.escape(req.body.id || "")),
            barcode: req.body.barcode ? parseInt(validator.escape(req.body.barcode)) : null,
            expirationDate: validator.escape(req.body.expirationDate || ""),
            price: validator.escape(req.body.price || ""),
            cost: validator.escape(req.body.cost || req.body.price || ""), // Cost price for COGS
            category: validator.escape(req.body.category || ""),
            quantity:
                validator.escape(req.body.quantity || "") == ""
                    ? 0
                    : validator.escape(req.body.quantity || ""),
            name: validator.escape(req.body.name || ""),
            stock: req.body.stock === "on" ? 0 : 1,
            minStock: validator.escape(req.body.minStock || ""),
            img: image,
            alertHistory: req.body.alertHistory || [],
            lastRestocked: validator.escape(req.body.lastRestocked || "") || null,
            supplierId: validator.escape(req.body.supplierId || "") || null,
            reorderQuantity: validator.escape(req.body.reorderQuantity || "") || 0,
            requires_prescription: req.body.requires_prescription === "on" ? true : false,
        };

        // For PUT requests, we expect an ID to be provided for update
        if (validator.escape(req.body.id || "") === "") {
            res.status(400).json({
                error: "Bad Request",
                message: "Product ID is required for updates.",
            });
        } else {
            let batches = [];
            try {
                if (req.body.batches) {
                    batches = JSON.parse(req.body.batches);
                }
            } catch (e) {
                console.error("Error parsing batches", e);
            }

            let quantity = validator.escape(req.body.quantity || "");
            let expirationDate = validator.escape(req.body.expirationDate || "");
    
            if (batches.length > 0) {
                quantity = batches.reduce((sum, b) => sum + (parseInt(b.quantity) || 0), 0);
                
                // Find earliest expiry
                const sortedBatches = batches.filter(b => b.expirationDate).sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));
                if (sortedBatches.length > 0) {
                    expirationDate = sortedBatches[0].expirationDate;
                }
            }

            let Product = {
                _id: parseInt(validator.escape(req.body.id || "")),
                barcode: req.body.barcode ? parseInt(validator.escape(req.body.barcode)) : null,
                expirationDate: expirationDate,
                price: validator.escape(req.body.price || ""),
                cost: validator.escape(req.body.cost || req.body.price || ""), // Cost price for COGS
                category: validator.escape(req.body.category || ""),
                quantity: quantity == "" ? 0 : quantity,
                name: validator.escape(req.body.name || ""),
                stock: req.body.stock === "on" ? 0 : 1,
                minStock: validator.escape(req.body.minStock || ""),
                img: image,
                alertHistory: req.body.alertHistory || [],
                lastRestocked: validator.escape(req.body.lastRestocked || "") || null,
                supplierId: validator.escape(req.body.supplierId || "") || null,
                reorderQuantity: validator.escape(req.body.reorderQuantity || "") || 0,
                requires_prescription: req.body.requires_prescription === "on" ? true : false,
                generic_name: validator.escape(req.body.generic_name || ""),
                drug_schedule: validator.escape(req.body.drug_schedule || ""),
                hsn_code: validator.escape(req.body.hsn_code || ""),
                batches: batches
            };

            inventoryDB.update(
                {
                    _id: parseInt(validator.escape(req.body.id || "")),
                },
                Product,
                {},
                function (err, numReplaced, product) {
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
});

/**
 * DELETE endpoint: Delete a product by product ID.
 *
 * @param {Object} req request object with product ID as a parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.delete("/product/:productId", function (req, res) {
    inventoryDB.remove(
        {
            _id: parseInt(req.params.productId),
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
 * GET endpoint: Get alerts for products with low stock.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/alerts", function (req, res) {
    inventoryDB.find({}, function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            const alerts = docs.filter(product => parseInt(product.quantity) <= parseInt(product.minStock));
            res.send(alerts);
        }
    });
});

/**
 * GET endpoint: Get alerts for products with expiring batches (within 30 days default).
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/alerts/expiry", function (req, res) {
    const daysThreshold = req.query.days ? parseInt(req.query.days) : 30;
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysThreshold);

    inventoryDB.find({}, function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            let expiringProducts = [];
            docs.forEach(product => {
                if (product.batches && product.batches.length > 0) {
                    const expiringBatches = product.batches.filter(batch => {
                        if (!batch.expirationDate) return false;
                        const expDate = new Date(batch.expirationDate);
                        return expDate <= futureDate; // Expired or expiring soon
                    });

                    if (expiringBatches.length > 0) {
                        expiringProducts.push({
                            _id: product._id,
                            name: product.name,
                            sku: product.barcode,
                            expiring_batches: expiringBatches
                        });
                    }
                } else if (product.expirationDate) {
                     // Fallback forproducts without batches but with global expiry
                    const expDate = new Date(product.expirationDate);
                     if (expDate <= futureDate) {
                        expiringProducts.push({
                            _id: product._id,
                            name: product.name,
                            sku: product.barcode,
                            expiring_batches: [{ expirationDate: product.expirationDate, quantity: product.quantity }]
                        });
                     }
                }
            });
            res.send(expiringProducts);
        }
    });
});

/**
 * POST endpoint: Reorder a product.
 *
 * @param {Object} req request object with product ID in the body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.post("/reorder", function (req, res) {
    const productId = parseInt(validator.escape(req.body.productId));
    inventoryDB.findOne({ _id: productId }, function (err, product) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else if (!product) {
            res.status(404).json({
                error: "Product not found",
            });
        } else {
            const newQuantity = parseInt(product.quantity) + parseInt(product.reorderQuantity);
            const now = new Date().toISOString();
            inventoryDB.update(
                { _id: productId },
                {
                    $set: {
                        quantity: newQuantity,
                        lastRestocked: now,
                    },
                },
                {},
                function (err, numReplaced) {
                    if (err) {
                        console.error(err);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: "An unexpected error occurred.",
                        });
                    } else {
                        res.sendStatus(200);
                    }
                }
            );
        }
    });
});

/**
 * POST endpoint: Find a product by SKU code.
 *
 * @param {Object} req request object with SKU code in the body.
 * @param {Object} res response object.
 * @returns {void}
 */

app.post("/product/sku", function (req, res) {
    let sku = validator.escape(req.body.skuCode);
    inventoryDB.findOne(
        {
            barcode: parseInt(sku),
        },
        function (err, doc) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            } else {
                res.send(doc);
            }
        },
    );
});

/**
 * Decrement inventory quantities based on a list of products in a transaction.
 *
 * @param {Array} products - List of products in the transaction.
 * @returns {void}
 */
app.decrementInventory = function (products) {
    async.eachSeries(products, function (transactionProduct, callback) {
        inventoryDB.findOne(
            {
                _id: parseInt(transactionProduct.id),
            },
            function (err, product) {
                if (!product || !product.quantity) {
                    callback();
                } else {
                    let quantityToDeduct = parseInt(transactionProduct.quantity);
                    let updatedQuantity = parseInt(product.quantity) - quantityToDeduct;
                    let updateObj = {
                        quantity: updatedQuantity,
                    };

                    // Handle Batches Logic
                    if (product.batches && product.batches.length > 0) {
                        let remainingDeduction = quantityToDeduct;
                        // Clone and sort batches by expiry
                        let updatedBatches = [...product.batches].sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));

                        updatedBatches = updatedBatches.map(batch => {
                            if (remainingDeduction <= 0) return batch;
                            
                            let batchQty = parseInt(batch.quantity);
                            if (batchQty >= remainingDeduction) {
                                batch.quantity = batchQty - remainingDeduction;
                                remainingDeduction = 0;
                            } else {
                                remainingDeduction -= batchQty;
                                batch.quantity = 0;
                            }
                            return batch;
                        }).filter(batch => parseInt(batch.quantity) > 0); 

                        updateObj.batches = updatedBatches;
                        
                        // Update expirationDate to the new earliest batch
                        if (updatedBatches.length > 0) {
                             updateObj.expirationDate = updatedBatches[0].expirationDate;
                        } else {
                             updateObj.expirationDate = ""; 
                        }
                    }

                    if (updatedQuantity <= parseInt(product.minStock)) {
                        let alertEntry = {
                            date: new Date().toISOString(),
                            message: `Low stock alert: quantity ${updatedQuantity} <= minStock ${product.minStock}`,
                        };
                        updateObj.alertHistory = product.alertHistory || [];
                        updateObj.alertHistory.push(alertEntry);

                        if(global.io) {
                            global.io.emit('low-stock-alert', {
                                productId: product._id,
                                name: product.name,
                                quantity: updatedQuantity,
                                minStock: product.minStock,
                            });
                        }
                    }

                    inventoryDB.update(
                        {
                            _id: parseInt(product._id),
                        },
                        {
                            $set: updateObj,
                        },
                        {},
                        callback,
                    );
                }
            },
        );
    });
};

/**
 * GET endpoint: Get substitute medicines based on generic name.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/substitutes/:productId", function (req, res) {
    const productId = parseInt(req.params.productId);
    
    inventoryDB.findOne({ _id: productId }, function (err, product) {
        if (err || !product) {
            return res.status(404).json({ error: "Product not found" });
        }
        
        const genericName = product.generic_name;
        if (!genericName) {
            return res.json([]); // No generic name, no substitutes
        }

        // Find other products with same generic name, excluding current product
        inventoryDB.find({ 
            generic_name: genericName,
            _id: { $ne: productId }
        }, function (err, substitutes) {
            if (err) {
                console.error(err);
                res.status(500).json({ error: "Internal Server Error" });
            } else {
                res.send(substitutes);
            }
        });
    });
});

/**
 * Get all inventory items (for reporting functions)
 *
 * @param {Function} callback - Callback function to receive inventory data
 * @returns {void}
 */
app.getInventory = function (callback) {
    inventoryDB.find({}, function (err, docs) {
        if (err) {
            console.error(err);
            callback([]);
        } else {
            callback(docs);
        }
    });
};

/**
 * GET endpoint: Get stock aging report.
 * Groups stock by age (based on lastRestocked date).
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/reports/aging", function (req, res) {
    inventoryDB.find({}, function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            const today = new Date();
            const report = {
                "0-30_days": [],
                "31-60_days": [],
                "61-90_days": [],
                "90+_days": []
            };

            docs.forEach(product => {
                let lastRestockDate = product.lastRestocked ? new Date(product.lastRestocked) : new Date(0); // Default to old date if unknown
                if (product.lastRestocked === null || product.lastRestocked === "") {
                     // if lastRestocked is missing, we can try to infer from creation or just put it in 90+
                     // For now, let's treat unknown as old stock (90+)
                     lastRestockDate = new Date(0); 
                }

                const diffTime = Math.abs(today - lastRestockDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                const item = {
                    _id: product._id,
                    name: product.name,
                    quantity: product.quantity,
                    value: (parseFloat(product.price) || 0) * (parseInt(product.quantity) || 0),
                    days_in_stock: diffDays
                };

                if (diffDays <= 30) {
                    report["0-30_days"].push(item);
                } else if (diffDays <= 60) {
                    report["31-60_days"].push(item);
                } else if (diffDays <= 90) {
                    report["61-90_days"].push(item);
                } else {
                    report["90+_days"].push(item);
                }
            });

            res.send(report);
        }
    });
});

/**
 * GET endpoint: Export all products to CSV
 * 
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/export/csv", function (req, res) {
    inventoryDB.find({}, function (err, products) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve products for export"
            });
        }

        if (!products || products.length === 0) {
            return res.status(404).json({
                error: "No products found",
                message: "No products available for export"
            });
        }

        try {
            // Map products to CSV format with all relevant fields
            const csvData = products.map(product => ({
                id: product._id,
                name: product.name,
                barcode: product.barcode || '',
                price: product.price,
                cost: product.cost || product.price,
                category: product.category,
                quantity: product.quantity,
                stock: product.stock === 1 ? 'Enabled' : 'Disabled',
                minStock: product.minStock || 1,
                expirationDate: product.expirationDate || '',
                requiresPrescription: product.requires_prescription ? 'Yes' : 'No',
                supplierId: product.supplierId || '',
                reorderQuantity: product.reorderQuantity || 0,
                image: product.img || ''
            }));

            // Define CSV fields
            const fields = [
                { label: 'Product ID', value: 'id' },
                { label: 'Product Name', value: 'name' },
                { label: 'Barcode/SKU', value: 'barcode' },
                { label: 'Price', value: 'price' },
                { label: 'Cost Price', value: 'cost' },
                { label: 'Category', value: 'category' },
                { label: 'Quantity', value: 'quantity' },
                { label: 'Stock Management', value: 'stock' },
                { label: 'Minimum Stock', value: 'minStock' },
                { label: 'Expiration Date', value: 'expirationDate' },
                { label: 'Requires Prescription', value: 'requiresPrescription' },
                { label: 'Supplier ID', value: 'supplierId' },
                { label: 'Reorder Quantity', value: 'reorderQuantity' },
                { label: 'Image File', value: 'image' }
            ];

            const csv = json2csv(csvData, { fields });

            // Set response headers for file download
            const filename = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', Buffer.byteLength(csv));

            res.send(csv);
        } catch (error) {
            console.error('CSV export error:', error);
            res.status(500).json({
                error: "CSV Export Error",
                message: "Failed to generate CSV file"
            });
        }
    });
});

/**
 * POST endpoint: Import products from CSV file
 * 
 * @param {Object} req request object with CSV file.
 * @param {Object} res response object.
 * @returns {void}
 */
app.post("/import/csv", function (req, res) {
    // Setup multer for CSV file upload
    const csvUpload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
        fileFilter: function (req, file, cb) {
            if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
                cb(null, true);
            } else {
                cb(new Error('Only CSV files are allowed'), false);
            }
        }
    }).single('csvfile');

    csvUpload(req, res, function (err) {
        if (err) {
            console.error('CSV upload error:', err);
            return res.status(400).json({
                error: 'Upload Error',
                message: err.message
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please select a CSV file to import'
            });
        }

        try {
            const csvData = req.file.buffer.toString('utf-8');
            const lines = csvData.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                return res.status(400).json({
                    error: 'Invalid CSV',
                    message: 'CSV file must contain a header row and at least one data row'
                });
            }

            // Parse CSV header
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, '').replace(/\s+/g, ''));
            const requiredFields = ['productname', 'price'];

            // Create header mapping for common variations
            const headerMap = {
                'productname': 'name',
                'name': 'name',
                'barcode/sku': 'barcode',
                'barcode': 'barcode',
                'sku': 'barcode',
                'price': 'price',
                'costprice': 'cost',
                'cost': 'cost',
                'category': 'category',
                'quantity': 'quantity',
                'stockmanagement': 'stock',
                'stock': 'stock',
                'minimumstock': 'minstock',
                'minstock': 'minstock',
                'expirationdate': 'expirationdate',
                'expiry': 'expirationdate',
                'requiresprescription': 'requiresprescription',
                'prescription': 'requiresprescription',
                'supplierid': 'supplierid',
                'supplier': 'supplierid',
                'reorderquantity': 'reorderquantity',
                'reorder': 'reorderquantity',
                'imagefile': 'image',
                'image': 'image'
            };

            // Validate required fields
            const mappedHeaders = headers.map(h => headerMap[h] || h);
            for (const field of requiredFields) {
                const mappedField = headerMap[field] || field;
                if (!mappedHeaders.includes(mappedField)) {
                    return res.status(400).json({
                        error: 'Invalid CSV format',
                        message: `Missing required field: ${field}. Required fields: Product Name, Price`
                    });
                }
            }

            const importResults = {
                success: [],
                errors: [],
                duplicates: [],
                totalProcessed: 0
            };

            let processedCount = 0;
            const totalRows = lines.length - 1;

            // Function to check if all rows are processed and send response
            function checkCompletion() {
                if (processedCount >= totalRows) {
                    res.json({
                        message: 'CSV import completed',
                        summary: {
                            totalRows: totalRows,
                            successful: importResults.success.length,
                            duplicates: importResults.duplicates.length,
                            errors: importResults.errors.length
                        },
                        results: importResults
                    });
                }
            }

            // Process each data row
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) {
                    processedCount++;
                    checkCompletion();
                    continue;
                }

                try {
                    importResults.totalProcessed++;

                    // Parse CSV line (handle quoted values)
                    const values = [];
                    let current = '';
                    let inQuotes = false;

                    for (let j = 0; j < line.length; j++) {
                        const char = line[j];
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            values.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    values.push(current.trim());

                    // Create product object from CSV data
                    const productData = {};
                    headers.forEach((header, index) => {
                        const mappedHeader = headerMap[header] || header;
                        productData[mappedHeader] = values[index] ? values[index].replace(/"/g, '') : '';
                    });

                    // Validate required fields
                    if (!productData.name || !productData.price) {
                        importResults.errors.push({
                            row: i + 1,
                            message: 'Name and price are required fields',
                            data: productData
                        });
                        processedCount++;
                        checkCompletion();
                        continue;
                    }

                    // Create product object for database
                    const product = {
                        name: validator.escape(productData.name),
                        barcode: productData.barcode ? parseInt(productData.barcode) || null : null,
                        price: validator.escape(productData.price),
                        cost: validator.escape(productData.cost) || validator.escape(productData.price),
                        category: validator.escape(productData.category) || 'General',
                        quantity: productData.quantity ? parseInt(productData.quantity) || 0 : 0,
                        stock: productData.stock && productData.stock.toLowerCase().includes('disable') ? 0 : 1,
                        minStock: productData.minstock ? parseInt(productData.minstock) || 1 : 1,
                        expirationDate: productData.expirationdate || '',
                        requires_prescription: productData.requiresprescription &&
                            productData.requiresprescription.toLowerCase().includes('yes') ? true : false,
                        supplierId: productData.supplierid || null,
                        reorderQuantity: productData.reorderquantity ? parseInt(productData.reorderquantity) || 0 : 0,
                        img: productData.image || '',
                        alertHistory: [],
                        lastRestocked: null
                    };

                    // Check for duplicates by barcode or name
                    const query = product.barcode ?
                        { barcode: product.barcode } :
                        { name: product.name };

                    inventoryDB.findOne(query, function (err, existing) {
                        if (err) {
                            importResults.errors.push({
                                row: i + 1,
                                message: 'Database error while checking for duplicates',
                                data: productData
                            });
                            processedCount++;
                            checkCompletion();
                            return;
                        }

                        if (existing) {
                            // Handle duplicate based on query parameter
                            if (req.query.action === 'update' || req.query.duplicate === 'update') {
                                // Update existing product
                                product._id = existing._id;
                                inventoryDB.update(
                                    { _id: existing._id },
                                    product,
                                    {},
                                    function (updateErr) {
                                        if (updateErr) {
                                            importResults.errors.push({
                                                row: i + 1,
                                                message: 'Failed to update existing product',
                                                data: productData
                                            });
                                        } else {
                                            importResults.duplicates.push({
                                                row: i + 1,
                                                action: 'updated',
                                                data: productData
                                            });
                                        }
                                        processedCount++;
                                        checkCompletion();
                                    }
                                );
                            } else {
                                // Skip duplicate
                                importResults.duplicates.push({
                                    row: i + 1,
                                    action: 'skipped',
                                    data: productData
                                });
                                processedCount++;
                                checkCompletion();
                            }
                        } else {
                            // Insert new product
                            product._id = Math.floor(Date.now() / 1000) + i; // Ensure unique ID
                            inventoryDB.insert(product, function (insertErr) {
                                if (insertErr) {
                                    importResults.errors.push({
                                        row: i + 1,
                                        message: 'Failed to insert product',
                                        error: insertErr.message,
                                        data: productData
                                    });
                                } else {
                                    importResults.success.push({
                                        row: i + 1,
                                        data: productData
                                    });
                                }
                                processedCount++;
                                checkCompletion();
                            });
                        }
                    });

                } catch (rowError) {
                    console.error(`Error processing row ${i + 1}:`, rowError);
                    importResults.errors.push({
                        row: i + 1,
                        message: 'Invalid row format',
                        error: rowError.message
                    });
                    processedCount++;
                    checkCompletion();
                }
            }

        } catch (parseError) {
            console.error('CSV parsing error:', parseError);
            res.status(400).json({
                error: 'CSV Parse Error',
                message: 'Failed to parse CSV file. Please check the file format.'
            });
        }
    });
});

/**
 * GET endpoint: Get CSV import template
 * 
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/import/template", function (req, res) {
    const templateData = [
        {
            'Product Name': 'Example Product',
            'Barcode/SKU': '123456789',
            'Price': '29.99',
            'Cost Price': '20.00',
            'Category': 'General',
            'Quantity': '100',
            'Stock Management': 'Enabled',
            'Minimum Stock': '10',
            'Expiration Date': '31/12/2025',
            'Requires Prescription': 'No',
            'Supplier ID': '',
            'Reorder Quantity': '50',
            'Image File': ''
        }
    ];

    const fields = [
        { label: 'Product Name', value: 'Product Name' },
        { label: 'Barcode/SKU', value: 'Barcode/SKU' },
        { label: 'Price', value: 'Price' },
        { label: 'Cost Price', value: 'Cost Price' },
        { label: 'Category', value: 'Category' },
        { label: 'Quantity', value: 'Quantity' },
        { label: 'Stock Management', value: 'Stock Management' },
        { label: 'Minimum Stock', value: 'Minimum Stock' },
        { label: 'Expiration Date', value: 'Expiration Date' },
        { label: 'Requires Prescription', value: 'Requires Prescription' },
        { label: 'Supplier ID', value: 'Supplier ID' },
        { label: 'Reorder Quantity', value: 'Reorder Quantity' },
        { label: 'Image File', value: 'Image File' }
    ];

    try {
        const csv = json2csv(templateData, { fields });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="product_import_template.csv"');
        res.send(csv);
    } catch (error) {
        console.error('Template generation error:', error);
        res.status(500).json({
            error: "Template Error",
            message: "Failed to generate import template"
        });
    }
});
