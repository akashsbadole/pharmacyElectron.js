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
            
            // Find earliest expiry only if any batch has an expiry date
            const batchesWithExpiry = batches.filter(b => b.expirationDate && b.expirationDate.trim() !== "");
            if (batchesWithExpiry.length > 0) {
                const sortedBatches = batchesWithExpiry.sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));
                expirationDate = sortedBatches[0].expirationDate;
            } else {
                // If no batches have expiry dates, keep the expirationDate as is (empty or from form)
                expirationDate = expirationDate || "";
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
            // Garment-specific fields
            garment_specific: parseGarmentSpecific(req.body.garment_specific || '{}'),
            variant_tracking: parseVariantTracking(req.body.variant_tracking || '{}'),
            inventory_management: parseInventoryManagement(req.body.inventory_management || '{}'),
            batches: batches
        };

        if (validator.escape(req.body.id || "") === "") {
            MenuItem._id = Math.floor(Date.now() / 1000);
            inventoryDB.insert(MenuItem, function (err, menuItem) {
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
                MenuItem,
                {},
                function (err, numReplaced, menuItem) {
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
            // Removed pharmaceutical prescription requirement field
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
                
                // Find earliest expiry only if any batch has an expiry date
                const batchesWithExpiry = batches.filter(b => b.expirationDate && b.expirationDate.trim() !== "");
                if (batchesWithExpiry.length > 0) {
                    const sortedBatches = batchesWithExpiry.sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));
                    expirationDate = sortedBatches[0].expirationDate;
                } else {
                    // If no batches have expiry dates, keep the expirationDate as is (empty or from form)
                    expirationDate = expirationDate || "";
                }
            }

            let MenuItem = {
                _id: parseInt(validator.escape(req.body.id || "")),
                sku: req.body.sku || (req.body.barcode ? parseInt(validator.escape(req.body.barcode)) : null),
                name: validator.escape(req.body.name || ""),
                price: validator.escape(req.body.price || ""),
                cost: validator.escape(req.body.cost || req.body.price || ""), // garment cost for margin analysis
                category: validator.escape(req.body.category || ""),
                quantity: quantity == "" ? 0 : quantity,
                stock: req.body.stock === "on" ? 0 : 1,
                minStock: validator.escape(req.body.minStock || ""),
                
                // Restaurant-specific fields (for backward compatibility)
                availability_status: validator.escape(req.body.availability_status || "Available"),
                preparation_time: parseInt(validator.escape(req.body.preparation_time || "15")),
                dietary_info: parseDietaryInfo(req.body.dietary_info || "[]"),
                allergens: parseAllergens(req.body.allergens || "[]"),
                kitchen_station: validator.escape(req.body.kitchen_station || "General"),
                is_combo: req.body.is_combo === "on" ? true : false,
                combo_items: parseComboItems(req.body.combo_items || "[]"),
                seasonal_item: req.body.seasonal_item === "on" ? true : false,
                popularity_score: parseInt(validator.escape(req.body.popularity_score || "0")),
                last_ordered: req.body.last_ordered || null,
                
                // Garment-specific fields
                garment_specific: parseGarmentSpecific(req.body.garment_specific || '{}'),
                variant_tracking: parseVariantTracking(req.body.variant_tracking || '{}'),
                inventory_management: parseInventoryManagement(req.body.inventory_management || '{}'),
                
                // Common fields
                img: image,
                alertHistory: req.body.alertHistory || [],
                lastRestocked: validator.escape(req.body.lastRestocked || "") || null,
                supplierId: validator.escape(req.body.supplierId || "") || null,
                reorderQuantity: validator.escape(req.body.reorderQuantity || "") || 0,
                batches: batches
            };

            inventoryDB.update(
                {
                    _id: parseInt(validator.escape(req.body.id || "")),
                },
                MenuItem,
                {},
                function (err, numReplaced, menuItem) {
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
 * POST endpoint: Search products by name or SKU.
 *
 * @param {Object} req request object with search term in the body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.post("/products/search", function (req, res) {
    let searchTerm = validator.escape(req.body.search || "");
    let limit = parseInt(req.body.limit) || 10;

    if (!searchTerm || searchTerm.trim().length < 2) {
        return res.json([]);
    }

    // Create search query for name and barcode
    let query = {
        $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { barcode: isNaN(searchTerm) ? null : parseInt(searchTerm) }
        ].filter(condition => condition.barcode !== null || condition.name)
    };

    inventoryDB.find(query)
        .limit(limit)
        .exec(function (err, docs) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Search failed.",
                });
            } else {
                res.send(docs);
            }
        });
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
 * GET endpoint: Get garment categories for product categorization.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/garment-categories", function (req, res) {
    // Fetch garment categories from the garment categories API
    const garmentCategoriesPath = path.join(
        process.env.APPDATA || 'C:\\Users\\akash\\AppData\\Roaming\\retailspos',
        process.env.APPNAME || 'retailspos',
        "server",
        "databases",
        "garment_categories.db"
    );
    
    const garmentCategoryDB = getDatabase(garmentCategoriesPath);
    garmentCategoryDB.find({ "status.is_active": true })
        .sort({ parent_category: 1, sort_order: 1, name: 1 }, function (err, categories) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to fetch garment categories.",
                });
            } else {
                res.send({
                    categories: categories,
                    hierarchical: buildGarmentCategoryHierarchy(categories)
                });
            }
        });
});

/**
 * GET endpoint: Get recommended sizes for a garment category.
 *
 * @param {Object} req request object with category parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/recommended-sizes/:categoryCode", function (req, res) {
    const categoryCode = req.params.categoryCode;
    
    // Fetch garment categories and find the specific category
    const garmentCategoriesPath = path.join(
        process.env.APPDATA || 'C:\\Users\\akash\\AppData\\Roaming\\retailspos',
        process.env.APPNAME || 'retailspos',
        "server",
        "databases",
        "garment_categories.db"
    );
    
    const garmentCategoryDB = getDatabase(garmentCategoriesPath);
    garmentCategoryDB.findOne({ category_code: categoryCode }, function (err, category) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to fetch category information.",
            });
        } else if (!category) {
            res.status(404).json({
                error: "Category not found",
                message: `No category found with code: ${categoryCode}`
            });
        } else {
            // Return recommended sizes based on category configuration
            const recommendedSizes = category.garment_specific?.common_sizes || [];
            res.send({
                category_code: categoryCode,
                recommended_sizes: recommendedSizes,
                size_chart: category.garment_specific?.size_chart || null
            });
        }
    });
});

/**
 * GET endpoint: Get recommended colors for a garment category.
 *
 * @param {Object} req request object with category parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/recommended-colors/:categoryCode", function (req, res) {
    const categoryCode = req.params.categoryCode;
    
    // Fetch garment categories and find the specific category
    const garmentCategoriesPath = path.join(
        process.env.APPDATA || 'C:\\Users\\akash\\AppData\\Roaming\\retailspos',
        process.env.APPNAME || 'retailspos',
        "server",
        "databases",
        "garment_categories.db"
    );
    
    const garmentCategoryDB = getDatabase(garmentCategoriesPath);
    garmentCategoryDB.findOne({ category_code: categoryCode }, function (err, category) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to fetch category information.",
            });
        } else if (!category) {
            res.status(404).json({
                error: "Category not found",
                message: `No category found with code: ${categoryCode}`
            });
        } else {
            // Return recommended colors based on category configuration
            const recommendedColors = category.garment_specific?.common_colors || [];
            res.send({
                category_code: categoryCode,
                recommended_colors: recommendedColors
            });
        }
    });
});

/**
 * GET endpoint: Get alternative/similar menu items based on category and dietary info.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/alternatives/:menuItemId", function (req, res) {
    const menuItemId = parseInt(req.params.menuItemId);

    inventoryDB.findOne({ _id: menuItemId }, function (err, menuItem) {
        if (err || !menuItem) {
            return res.status(404).json({ error: "Menu item not found" });
        }

        const category = menuItem.category;
        const dietaryInfo = menuItem.dietary_info || [];

        if (!category) {
            return res.json([]); // No category, no alternatives
        }

        // Find other menu items in same category with overlapping dietary info
        inventoryDB.find({
            category: category,
            _id: { $ne: menuItemId },
            availability_status: { $ne: 'Out of Stock' }
        }, function (err, alternatives) {
            if (err) {
                console.error(err);
                res.status(500).json({ error: "Internal Server Error" });
            } else {
                // Filter by dietary compatibility
                const compatibleAlternatives = alternatives.filter(item => {
                    const itemDietary = item.dietary_info || [];
                    return dietaryInfo.length === 0 ||
                           itemDietary.length === 0 ||
                           dietaryInfo.some(diet => itemDietary.includes(diet));
                });
                res.send(compatibleAlternatives);
            }
        });
    });
});

/**
 * GET endpoint: Get substitute products based on category and similar name patterns (for garments).
 * Substitutes are alternative sizes/colors of similar garment types.
 *
 * @param {Object} req request object with product ID as parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/substitutes/:productId", function (req, res) {
    const productId = parseInt(req.params.productId);

    inventoryDB.findOne({ _id: productId }, function (err, product) {
        if (err || !product) {
            return res.status(404).json({ error: "Product not found" });
        }

        const category = product.category;
        const productName = product.name.toLowerCase();

        if (!category) {
            return res.json([]); // No category, no substitutes
        }

        // Find products in same category, excluding current product
        inventoryDB.find({
            category: category,
            _id: { $ne: productId },
            stock: { $ne: 0 }, // Not out of stock (stock field: 1 = enabled, 0 = disabled)
            quantity: { $gt: 0 } // Has available quantity
        }, function (err, products) {
            if (err) {
                console.error(err);
                res.status(500).json({ error: "Internal Server Error" });
            } else {
                // Filter products that are likely substitutes based on name similarity
                const substitutes = products.filter(item => {
                    const itemName = item.name.toLowerCase();

                    // Check if names are similar (same base name, different sizes/colors)
                    // This is a simple heuristic: look for common garment patterns
                    const sizePatterns = /\b(small|medium|large|xl|xxl|xs|s|m|l|2xl|3xl|4xl|extra small|extra large)\b/gi;
                    const colorPatterns = /\b(black|white|red|blue|green|yellow|orange|purple|pink|gray|grey|brown|beige|navy|maroon|olive|tan|gold|silver|bronze|charcoal|indigo|turquoise|lavender|coral|crimson|teal|mint|violet|peach|burgundy|khaki|aquamarine)\b/gi;

                    // Remove sizes and colors from both names for comparison
                    const baseProductName = productName.replace(sizePatterns, '').replace(colorPatterns, '').trim();
                    const baseItemName = itemName.replace(sizePatterns, '').replace(colorPatterns, '').trim();

                    // Consider products as substitutes if they have similar base names
                    // (allowing for minor differences in spelling or word order)
                    const similarityThreshold = 0.8;
                    const similarity = calculateStringSimilarity(baseProductName, baseItemName);

                    return similarity >= similarityThreshold;
                });

                // Return up to 10 substitutes
                res.send(substitutes.slice(0, 10));
            }
        });
    });
});

/**
 * Helper function to calculate string similarity (simple Levenshtein-based)
 */
function calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
        return 1.0;
    }

    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * GET endpoint: Check inventory availability for combo components
 */
app.get("/combos/:comboId/availability", function (req, res) {
    const comboId = req.params.comboId;
    const quantity = parseInt(req.query.quantity) || 1;
    
    // This would call the combos API to get combo details
    // For now, we'll simulate the check
    res.json({
        combo_id: comboId,
        quantity: quantity,
        is_available: true,
        available_quantity: 100,
        insufficient_items: []
    });
});

/**
 * POST endpoint: Process combo order and deduct inventory
 */
app.post("/combos/:comboId/process-order", function (req, res) {
    const comboId = req.params.comboId;
    const { quantity, selected_items } = req.body;
    
    // This would:
    // 1. Get combo details from combos API
    // 2. Check inventory availability for all components
    // 3. Deduct inventory if available
    // 4. Record the transaction
    
    res.json({
        success: true,
        combo_id: comboId,
        quantity: quantity,
        deducted_items: [],
        message: 'Combo order processed successfully'
    });
});

/**
 * Helper function to check combo component availability
 */
app.checkComboComponentAvailability = function(comboComponents, quantity, callback) {
    let allAvailable = true;
    const insufficientItems = [];
    let checkedComponents = 0;
    const totalComponents = comboComponents.length;
    
    if (totalComponents === 0) {
        return callback(true, []);
    }
    
    comboComponents.forEach(component => {
        const requiredQuantity = (component.quantity || 1) * quantity;
        
        // Check each menu item in the component
        component.menu_item_ids.forEach(menuItemId => {
            inventoryDB.findOne({ _id: menuItemId }, function(err, menuItem) {
                if (err || !menuItem) {
                    insufficientItems.push({
                        component_type: component.component_type,
                        menu_item_id: menuItemId,
                        reason: 'Menu item not found'
                    });
                    allAvailable = false;
                } else if (parseInt(menuItem.quantity) < requiredQuantity) {
                    insufficientItems.push({
                        component_type: component.component_type,
                        menu_item_id: menuItemId,
                        menu_item_name: menuItem.name,
                        required_quantity: requiredQuantity,
                        available_quantity: parseInt(menuItem.quantity),
                        reason: 'Insufficient stock'
                    });
                    allAvailable = false;
                }
                
                checkedComponents++;
                if (checkedComponents === totalComponents) {
                    callback(allAvailable, insufficientItems);
                }
            });
        });
    });
};

/**
 * Helper function to deduct inventory for combo order
 */
app.deductComboInventory = function(comboComponents, quantity, callback) {
    const deductions = [];
    
    comboComponents.forEach(component => {
        const deductionQuantity = (component.quantity || 1) * quantity;
        
        component.menu_item_ids.forEach(menuItemId => {
            deductions.push({
                menu_item_id: menuItemId,
                quantity: deductionQuantity,
                component_type: component.component_type
            });
        });
    });
    
    // Process deductions using the existing decrementInventory function
    app.decrementInventory(deductions);
    callback(null, deductions);
};

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
                error: "No menu items found",
                message: "No menu items available for export"
            });
        }

        try {
            // Map menu items to CSV format with all relevant fields
            const csvData = products.map(menuItem => ({
                id: menuItem._id,
                name: menuItem.name,
                sku: menuItem.sku || menuItem._id,
                price: menuItem.price,
                cost: menuItem.cost || menuItem.price,
                category: menuItem.category,
                quantity: menuItem.quantity,
                stock: menuItem.stock === 1 ? 'Enabled' : 'Disabled',
                minStock: menuItem.minStock || 1,
                expirationDate: menuItem.expirationDate || '',
                availabilityStatus: menuItem.availability_status || 'Available',
                preparationTime: menuItem.preparation_time || 15,
                dietaryInfo: (menuItem.dietary_info || []).join(', '),
                allergens: (menuItem.allergens || []).join(', '),
                kitchenStation: menuItem.kitchen_station || 'General',
                isCombo: menuItem.is_combo ? 'Yes' : 'No',
                seasonalItem: menuItem.seasonal_item ? 'Yes' : 'No',
                popularityScore: menuItem.popularity_score || 0,
                supplierId: menuItem.supplierId || '',
                reorderQuantity: menuItem.reorderQuantity || 0,
                image: menuItem.img || ''
            }));

            // Define CSV fields for menu items
            const fields = [
                { label: 'Menu Item ID', value: 'id' },
                { label: 'Menu Item Name', value: 'name' },
                { label: 'SKU/Item Code', value: 'sku' },
                { label: 'Price', value: 'price' },
                { label: 'Cost Price', value: 'cost' },
                { label: 'Category', value: 'category' },
                { label: 'Quantity', value: 'quantity' },
                { label: 'Stock Management', value: 'stock' },
                { label: 'Minimum Stock', value: 'minStock' },
                { label: 'Expiration Date', value: 'expirationDate' },
                { label: 'Availability Status', value: 'availabilityStatus' },
                { label: 'Preparation Time (min)', value: 'preparationTime' },
                { label: 'Dietary Info', value: 'dietaryInfo' },
                { label: 'Allergens', value: 'allergens' },
                { label: 'Kitchen Station', value: 'kitchenStation' },
                { label: 'Is Combo', value: 'isCombo' },
                { label: 'Seasonal Item', value: 'seasonalItem' },
                { label: 'Popularity Score', value: 'popularityScore' },
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
 * POST endpoint: Import products (redirect to CSV import)
 * 
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.post("/import", function (req, res) {
    // Redirect to CSV import endpoint
    req.url = '/import/csv';
    app.handle(req, res);
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

            // Parse CSV header and normalize it
            const headers = lines[0].split(',').map(h => {
                // Remove quotes, convert to lowercase, remove spaces and special characters
                return h.trim().toLowerCase()
                        .replace(/"/g, '')
                        .replace(/\s+/g, '')  // Remove all spaces
                        .replace(/[^a-z0-9]/g, '');  // Remove special characters except alphanumeric
            });
            const requiredFields = ['name', 'price'];

            // Create header mapping for common variations (restaurant schema)
            const headerMap = {
                'menuname': 'name',
                'productname': 'name',  // Added for CSV template compatibility
                'product': 'name',
                'name': 'name',
                'sku': 'sku',
                'barcode': 'barcode',
                'barcode/sku': 'barcode',  // Handle combined header
                'itemcode': 'sku',
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
                'availabilitystatus': 'availability_status',
                'availability': 'availability_status',
                'preparationtime': 'preparation_time',
                'prepTime': 'preparation_time',
                'dietaryinfo': 'dietary_info',
                'dietary': 'dietary_info',
                'allergens': 'allergens',
                'kitchenstation': 'kitchen_station',
                'station': 'kitchen_station',
                'iscombo': 'is_combo',
                'combo': 'is_combo',
                'seasonalitem': 'seasonal_item',
                'seasonal': 'seasonal_item',
                'popularityscore': 'popularity_score',
                'popularity': 'popularity_score',
                'supplierid': 'supplierid',
                'supplier': 'supplierid',
                'reorderquantity': 'reorderquantity',
                'reorder': 'reorderquantity',
                'imagefile': 'image',
                'image': 'image',
                'requiresprescription': 'requires_prescription',  // For backward compatibility
                'prescription': 'requires_prescription'
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
                        // Removed pharmaceutical prescription requirement field
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

/**
 * GET endpoint: Generate printable barcode sheet for all products
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/barcodes/print", function (req, res) {
    inventoryDB.find({}, function (err, products) {
        if (err) {
            console.error('Barcode generation error:', err);
            return res.status(500).json({
                error: "Database Error",
                message: "Failed to retrieve products for barcode generation"
            });
        }

        if (!products || products.length === 0) {
            return res.status(404).json({
                error: "No products found",
                message: "No products available for barcode generation"
            });
        }

        // Generate HTML page with barcodes
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Barcodes</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
        .barcode-container {
            display: inline-block;
            text-align: center;
            margin: 10px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .barcode-label {
            margin-top: 5px;
            font-size: 12px;
            font-weight: bold;
        }
        .barcode-price {
            margin-top: 2px;
            font-size: 10px;
            color: #666;
        }
        @media print {
            body {
                margin: 0;
            }
            .barcode-container {
                page-break-inside: avoid;
                margin: 5px;
                padding: 5px;
            }
        }
    </style>
</head>
<body>
    <h1>Product Barcodes</h1>
    <p>Generated on ${new Date().toLocaleDateString()}</p>
    <div id="barcodes">`;

        products.forEach(product => {
            const barcodeValue = product.barcode || product._id;
            const price = parseFloat(product.price).toFixed(2);
            html += `
        <div class="barcode-container">
            <svg id="barcode-${product._id}"></svg>
            <div class="barcode-label">${product.name}</div>
            <div class="barcode-price">${price}</div>
        </div>`;
        });

        html += `
    </div>

    <script>
        // Generate barcodes
        window.addEventListener('load', function() {`;

        products.forEach(product => {
            const barcodeValue = product.barcode || product._id;
            html += `
            JsBarcode("#barcode-${product._id}", "${barcodeValue}", {
                width: 2,
                height: 40,
                fontSize: 14,
                textMargin: 0,
                margin: 0
            });`;
        });

        html += `
        });

        // Auto-print when loaded
        window.addEventListener('load', function() {
            setTimeout(function() {
                window.print();
            }, 1000);
        });
    </script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    });
});
