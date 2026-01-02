const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const async = require("async");
const path = require("path");
const validator = require("validator");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "retail_inventory.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

// Initialize retail inventory database
let retailInventoryDB = getDatabase(dbPath);
retailInventoryDB.ensureIndex({ fieldName: "_id", unique: true });
retailInventoryDB.ensureIndex({ fieldName: "productId" });
retailInventoryDB.ensureIndex({ fieldName: "expirationDate" });

/**
 * GET endpoint: Get the welcome message for the Retail Inventory API.
 */
app.get("/", function (req, res) {
    res.send("Retail Inventory API - Shelf Life & Batch Management");
});

/**
 * GET endpoint: Get all products with enhanced retail features
 */
app.get("/products/enhanced", function (req, res) {
    const includeExpiryInfo = req.query.includeExpiryInfo === 'true';
    const includeBatches = req.query.includeBatches === 'true';
    const expiringWithin = req.query.expiringWithin ? parseInt(req.query.expiringWithin) : null;

    retailInventoryDB.find({}, function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve retail inventory data"
            });
        } else {
            let products = docs;

            // Filter expiring products if requested
            if (expiringWithin) {
                const today = new Date();
                const futureDate = new Date();
                futureDate.setDate(today.getDate() + expiringWithin);

                products = products.filter(product => {
                    if (product.retailFeatures && product.retailFeatures.isPerishable) {
                        const expiryDate = new Date(product.earliestExpiry);
                        return expiryDate <= futureDate;
                    }
                    return false;
                });
            }

            // Add calculated expiry info if requested
            if (includeExpiryInfo) {
                products = products.map(product => ({
                    ...product,
                    expiryInfo: calculateExpiryInfo(product)
                }));
            }

            res.send(products);
        }
    });
});

/**
 * GET endpoint: Get expiring products (within specified days)
 */
app.get("/products/expiring", function (req, res) {
    const daysThreshold = req.query.days ? parseInt(req.query.days) : 30;
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysThreshold);

    retailInventoryDB.find({}, function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve expiring products"
            });
        } else {
            let expiringProducts = [];
            
            docs.forEach(product => {
                if (product.batches && product.batches.length > 0) {
                    const expiringBatches = product.batches.filter(batch => {
                        if (!batch.expirationDate) return false;
                        const expDate = new Date(batch.expirationDate);
                        return expDate <= futureDate;
                    });

                    if (expiringBatches.length > 0) {
                        expiringProducts.push({
                            _id: product._id,
                            productId: product.productId,
                            name: product.name,
                            category: product.category,
                            expiring_batches: expiringBatches,
                            total_expiring_quantity: expiringBatches.reduce((sum, batch) => sum + parseInt(batch.quantity), 0),
                            days_until_expiry: Math.min(...expiringBatches.map(batch => {
                                const expDate = new Date(batch.expirationDate);
                                const diffTime = expDate - today;
                                return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            }))
                        });
                    }
                }
            });

            res.send(expiringProducts);
        }
    });
});

/**
 * POST endpoint: Create or update product with retail features
 */
app.post("/products", function (req, res) {
    const productData = req.body;

    // Validate required fields
    if (!productData.productId || !productData.name) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Product ID and name are required"
        });
    }

    // Calculate earliest expiry date from batches
    let earliestExpiry = '';
    if (productData.batches && productData.batches.length > 0) {
        const validBatches = productData.batches.filter(batch => batch.expirationDate);
        if (validBatches.length > 0) {
            validBatches.sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));
            earliestExpiry = validBatches[0].expirationDate;
        }
    }

    const retailProduct = {
        _id: Math.floor(Date.now() / 1000),
        productId: productData.productId,
        name: productData.name,
        category: productData.category || 'General',
        price: productData.price || '0',
        cost: productData.cost || productData.price || '0',
        quantity: productData.quantity || 0,
        batches: productData.batches || [],
        earliestExpiry: earliestExpiry,
        retailFeatures: {
            shelfLife: productData.retailFeatures?.shelfLife || null,
            storageRequirements: productData.retailFeatures?.storageRequirements || '',
            isPerishable: productData.retailFeatures?.isPerishable || false,
            temperatureRange: productData.retailFeatures?.temperatureRange || '',
            allergenInfo: productData.retailFeatures?.allergenInfo || [],
            dietaryTags: productData.retailFeatures?.dietaryTags || []
        },
        wasteTracking: {
            totalWaste: 0,
            wasteCost: 0,
            lastWasteDate: null,
            wasteReasons: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    retailInventoryDB.insert(retailProduct, function (err, newProduct) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to create retail product"
            });
        } else {
            res.status(201).json(newProduct);
        }
    });
});

/**
 * PUT endpoint: Update product batches
 */
app.put("/products/:productId/batches", function (req, res) {
    const productId = parseInt(req.params.productId);
    const { batches, action } = req.body;

    retailInventoryDB.findOne({ productId: productId }, function (err, product) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Database error occurred"
            });
        }

        if (!product) {
            return res.status(404).json({
                error: "Not Found",
                message: "Product not found"
            });
        }

        let updatedBatches = [...product.batches];
        let totalQuantity = 0;
        let earliestExpiry = '';

        switch (action) {
            case 'add':
                if (Array.isArray(batches)) {
                    batches.forEach(batch => {
                        const newBatch = {
                            batchId: batch.batchId || `BATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            quantity: parseInt(batch.quantity) || 0,
                            expirationDate: batch.expirationDate || '',
                            supplierId: batch.supplierId || null,
                            costPrice: parseFloat(batch.costPrice) || 0,
                            receivedDate: new Date().toISOString(),
                            status: 'active'
                        };
                        updatedBatches.push(newBatch);
                    });
                }
                break;

            case 'remove':
                if (batches && batches.batchId) {
                    updatedBatches = updatedBatches.filter(b => b.batchId !== batches.batchId);
                }
                break;

            case 'update':
                if (batches && batches.batchId) {
                    updatedBatches = updatedBatches.map(b => 
                        b.batchId === batches.batchId ? { ...b, ...batches } : b
                    );
                }
                break;
        }

        // Calculate total quantity and earliest expiry
        if (updatedBatches.length > 0) {
            totalQuantity = updatedBatches.reduce((sum, batch) => sum + (parseInt(batch.quantity) || 0), 0);
            
            const validBatches = updatedBatches.filter(batch => batch.expirationDate);
            if (validBatches.length > 0) {
                validBatches.sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));
                earliestExpiry = validBatches[0].expirationDate;
            }
        }

        // Update product
        const updateData = {
            batches: updatedBatches,
            quantity: totalQuantity,
            earliestExpiry: earliestExpiry,
            updatedAt: new Date().toISOString()
        };

        retailInventoryDB.update(
            { productId: productId },
            { $set: updateData },
            {},
            function (err, numReplaced) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "Failed to update product batches"
                    });
                } else {
                    res.json({
                        success: true,
                        productId: productId,
                        updatedBatches: updatedBatches,
                        totalQuantity: totalQuantity,
                        earliestExpiry: earliestExpiry
                    });
                }
            }
        );
    });
});

/**
 * POST endpoint: Record waste/shrinkage
 */
app.post("/waste/record", function (req, res) {
    const { productId, quantity, reason, batchId } = req.body;

    if (!productId || !quantity || !reason) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Product ID, quantity, and reason are required"
        });
    }

    retailInventoryDB.findOne({ productId: parseInt(productId) }, function (err, product) {
        if (err || !product) {
            return res.status(404).json({
                error: "Not Found",
                message: "Product not found"
            });
        }

        // Update batches if batchId provided
        let updatedBatches = [...product.batches];
        if (batchId) {
            updatedBatches = updatedBatches.map(batch => {
                if (batch.batchId === batchId) {
                    const newQuantity = (parseInt(batch.quantity) || 0) - parseInt(quantity);
                    return { ...batch, quantity: Math.max(0, newQuantity) };
                }
                return batch;
            }).filter(batch => parseInt(batch.quantity) > 0);
        }

        // Update waste tracking
        const wasteEntry = {
            date: new Date().toISOString(),
            quantity: parseInt(quantity),
            reason: reason,
            batchId: batchId || null,
            cost: (parseFloat(product.cost) || 0) * parseInt(quantity)
        };

        const wasteTracking = {
            totalWaste: (product.wasteTracking?.totalWaste || 0) + parseInt(quantity),
            wasteCost: (product.wasteTracking?.wasteCost || 0) + wasteEntry.cost,
            lastWasteDate: new Date().toISOString(),
            wasteReasons: [...(product.wasteTracking?.wasteReasons || []), wasteEntry]
        };

        // Recalculate total quantity
        const totalQuantity = updatedBatches.reduce((sum, batch) => sum + (parseInt(batch.quantity) || 0), 0);

        retailInventoryDB.update(
            { productId: parseInt(productId) },
            {
                $set: {
                    batches: updatedBatches,
                    quantity: totalQuantity,
                    wasteTracking: wasteTracking,
                    updatedAt: new Date().toISOString()
                }
            },
            {},
            function (err, numReplaced) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "Failed to record waste"
                    });
                } else {
                    res.json({
                        success: true,
                        wasteRecorded: wasteEntry,
                        totalWaste: wasteTracking.totalWaste,
                        totalWasteCost: wasteTracking.wasteCost
                    });
                }
            }
        );
    });
});

/**
 * GET endpoint: Get waste analytics
 */
app.get("/analytics/waste", function (req, res) {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    retailInventoryDB.find({}, function (err, products) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve waste analytics"
            });
        }

        const wasteAnalytics = {
            totalWaste: 0,
            totalWasteCost: 0,
            wasteByReason: {},
            wasteByCategory: {},
            wasteByMonth: {},
            topWasteProducts: [],
            wasteReductionOpportunities: []
        };

        products.forEach(product => {
            const wasteData = product.wasteTracking;
            if (wasteData && wasteData.wasteReasons) {
                const relevantWaste = wasteData.wasteReasons.filter(waste => {
                    const wasteDate = new Date(waste.date);
                    return wasteDate >= startDate && wasteDate <= endDate;
                });

                relevantWaste.forEach(waste => {
                    wasteAnalytics.totalWaste += waste.quantity;
                    wasteAnalytics.totalWasteCost += waste.cost;

                    // Waste by reason
                    if (!wasteAnalytics.wasteByReason[waste.reason]) {
                        wasteAnalytics.wasteByReason[waste.reason] = {
                            quantity: 0,
                            cost: 0,
                            count: 0
                        };
                    }
                    wasteAnalytics.wasteByReason[waste.reason].quantity += waste.quantity;
                    wasteAnalytics.wasteByReason[waste.reason].cost += waste.cost;
                    wasteAnalytics.wasteByReason[waste.reason].count++;

                    // Waste by category
                    if (!wasteAnalytics.wasteByCategory[product.category]) {
                        wasteAnalytics.wasteByCategory[product.category] = {
                            quantity: 0,
                            cost: 0,
                            count: 0
                        };
                    }
                    wasteAnalytics.wasteByCategory[product.category].quantity += waste.quantity;
                    wasteAnalytics.wasteByCategory[product.category].cost += waste.cost;
                    wasteAnalytics.wasteByCategory[product.category].count++;

                    // Waste by month
                    const monthKey = new Date(waste.date).toISOString().substring(0, 7);
                    if (!wasteAnalytics.wasteByMonth[monthKey]) {
                        wasteAnalytics.wasteByMonth[monthKey] = {
                            quantity: 0,
                            cost: 0,
                            count: 0
                        };
                    }
                    wasteAnalytics.wasteByMonth[monthKey].quantity += waste.quantity;
                    wasteAnalytics.wasteByMonth[monthKey].cost += waste.cost;
                    wasteAnalytics.wasteByMonth[monthKey].count++;
                });
            }
        });

        // Top waste products
        wasteAnalytics.topWasteProducts = products
            .filter(product => product.wasteTracking && product.wasteTracking.totalWaste > 0)
            .map(product => ({
                productId: product.productId,
                name: product.name,
                category: product.category,
                totalWaste: product.wasteTracking.totalWaste,
                wasteCost: product.wasteTracking.wasteCost,
                wasteRate: product.quantity > 0 ? 
                    (product.wasteTracking.totalWaste / (product.quantity + product.wasteTracking.totalWaste) * 100) : 0
            }))
            .sort((a, b) => b.wasteCost - a.wasteCost)
            .slice(0, 10);

        res.send(wasteAnalytics);
    });
});

/**
 * GET endpoint: Get expiry alerts and recommendations
 */
app.get("/alerts/expiry-recommendations", function (req, res) {
    const daysThreshold = req.query.days ? parseInt(req.query.days) : 30;

    retailInventoryDB.find({}, function (err, products) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve expiry recommendations"
            });
        }

        const recommendations = [];
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + daysThreshold);

        products.forEach(product => {
            if (product.retailFeatures?.isPerishable && product.batches?.length > 0) {
                const expiringBatches = product.batches.filter(batch => {
                    if (!batch.expirationDate) return false;
                    const expDate = new Date(batch.expirationDate);
                    return expDate <= futureDate;
                });

                if (expiringBatches.length > 0) {
                    const daysUntilExpiry = Math.min(...expiringBatches.map(batch => {
                        const expDate = new Date(batch.expirationDate);
                        const diffTime = expDate - today;
                        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    }));

                    let recommendation = {
                        productId: product.productId,
                        name: product.name,
                        category: product.category,
                        daysUntilExpiry: daysUntilExpiry,
                        totalExpiringQuantity: 0,
                        batches: expiringBatches,
                        recommendedActions: []
                    };

                    recommendation.totalExpiringQuantity = expiringBatches.reduce((sum, batch) => sum + parseInt(batch.quantity), 0);

                    // Generate recommendations based on days until expiry
                    if (daysUntilExpiry <= 7) {
                        recommendation.recommendedActions.push({
                            action: 'immediate_markdown',
                            discount: '50%',
                            urgency: 'high',
                            description: 'Apply immediate 50% markdown to clear inventory'
                        });
                        recommendation.recommendedActions.push({
                            action: 'staff_discount',
                            discount: '75%',
                            urgency: 'high',
                            description: 'Offer 75% discount to staff for personal use'
                        });
                    } else if (daysUntilExpiry <= 14) {
                        recommendation.recommendedActions.push({
                            action: 'promotional_pricing',
                            discount: '25%',
                            urgency: 'medium',
                            description: 'Apply 25% promotional discount'
                        });
                        recommendation.recommendedActions.push({
                            action: 'bundle_offer',
                            discount: '30%',
                            urgency: 'medium',
                            description: 'Create bundle offers with complementary products'
                        });
                    } else if (daysUntilExpiry <= daysThreshold) {
                        recommendation.recommendedActions.push({
                            action: 'early_markdown',
                            discount: '15%',
                            urgency: 'low',
                            description: 'Apply early bird 15% discount'
                        });
                        recommendation.recommendedActions.push({
                            action: 'return_to_supplier',
                            urgency: 'low',
                            description: 'Contact supplier for return authorization if possible'
                        });
                    }

                    recommendations.push(recommendation);
                }
            }
        });

        // Sort by urgency (earliest expiry first)
        recommendations.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

        res.send({
            recommendations: recommendations,
            summary: {
                totalProducts: recommendations.length,
                urgentActions: recommendations.filter(r => r.daysUntilExpiry <= 7).length,
                mediumActions: recommendations.filter(r => r.daysUntilExpiry > 7 && r.daysUntilExpiry <= 14).length,
                earlyActions: recommendations.filter(r => r.daysUntilExpiry > 14).length,
                totalExpiringValue: recommendations.reduce((sum, r) => sum + (r.totalExpiringQuantity * parseFloat(r.batches[0]?.costPrice || 0)), 0)
            }
        });
    });
});

/**
 * Helper function to calculate expiry information for a product
 */
function calculateExpiryInfo(product) {
    if (!product.batches || product.batches.length === 0) {
        return {
            isExpiring: false,
            daysUntilExpiry: null,
            expiryStatus: 'no_expiry_data',
            recommendedActions: []
        };
    }

    const today = new Date();
    const validBatches = product.batches.filter(batch => batch.expirationDate);
    
    if (validBatches.length === 0) {
        return {
            isExpiring: false,
            daysUntilExpiry: null,
            expiryStatus: 'no_expiry_data',
            recommendedActions: []
        };
    }

    // Find earliest expiry
    validBatches.sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));
    const earliestExpiry = new Date(validBatches[0].expirationDate);
    const diffTime = earliestExpiry - today;
    const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let expiryStatus = 'fresh';
    let recommendedActions = [];

    if (daysUntilExpiry < 0) {
        expiryStatus = 'expired';
        recommendedActions.push({
            action: 'remove_from_sale',
            urgency: 'critical',
            description: 'Remove from sale immediately'
        });
    } else if (daysUntilExpiry <= 3) {
        expiryStatus = 'very_close';
        recommendedActions.push({
            action: 'immediate_clearance',
            urgency: 'high',
            description: 'Clear at 70% discount'
        });
    } else if (daysUntilExpiry <= 7) {
        expiryStatus = 'close';
        recommendedActions.push({
            action: 'promotional_pricing',
            urgency: 'medium',
            description: 'Apply 40% discount'
        });
    } else if (daysUntilExpiry <= 14) {
        expiryStatus = 'approaching';
        recommendedActions.push({
            action: 'early_discount',
            urgency: 'low',
            description: 'Apply 20% discount'
        });
    }

    return {
        isExpiring: daysUntilExpiry <= 30,
        daysUntilExpiry: daysUntilExpiry,
        expiryStatus: expiryStatus,
        earliestExpiry: earliestExpiry.toISOString(),
        totalExpiringQuantity: validBatches.reduce((sum, batch) => sum + (parseInt(batch.quantity) || 0), 0),
        recommendedActions: recommendedActions
    };
}