const app = require("express")();
const bodyParser = require("body-parser");
const path = require("path");
const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

/**
 * Garment-Specific Inventory Enhancements
 * Extends the existing inventory system with garment-specific functionality
 */

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
 * POST endpoint: Get variant combinations for a garment product
 */
app.post("/variants/combinations", function (req, res) {
    const { product_id, sizes, colors } = req.body;
    
    if (!product_id) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Product ID is required"
        });
    }

    // Generate all possible size/color combinations
    const combinations = [];
    const sizeList = sizes || [];
    const colorList = colors || [];

    sizeList.forEach(size => {
        colorList.forEach(color => {
            combinations.push({
                size: size,
                color: color,
                combination_key: `${size}_${color}`,
                sku_suffix: `${size}-${color.replace(/\s+/g, '_').toLowerCase()}`
            });
        });
    });

    res.json({
        product_id: product_id,
        total_combinations: combinations.length,
        combinations: combinations
    });
});

/**
 * GET endpoint: Get low stock alerts for garment variants
 */
app.get("/variants/alerts", function (req, res) {
    const alertType = req.query.type || 'all'; // sizes, colors, combinations, all
    
    // Use the main inventory database
    const inventoryPath = path.join(
        process.env.APPDATA || 'C:\\Users\\akash\\AppData\\Roaming\\retailspos',
        process.env.APPNAME || 'retailspos',
        "server",
        "databases",
        "inventory.db"
    );
    
    const inventoryDB = getDatabase(inventoryPath);
    inventoryDB.find({}, function (err, products) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to fetch inventory data.",
            });
        } else {
            const alerts = [];
            
            products.forEach(product => {
                if (product.garment_specific && product.garment_specific.has_variants) {
                    // Check size-based alerts
                    if (alertType === 'sizes' || alertType === 'all') {
                        const sizeAlerts = checkSizeStockAlerts(product);
                        alerts.push(...sizeAlerts);
                    }
                    
                    // Check color-based alerts
                    if (alertType === 'colors' || alertType === 'all') {
                        const colorAlerts = checkColorStockAlerts(product);
                        alerts.push(...colorAlerts);
                    }
                    
                    // Check combination alerts
                    if (alertType === 'combinations' || alertType === 'all') {
                        const combinationAlerts = checkCombinationStockAlerts(product);
                        alerts.push(...combinationAlerts);
                    }
                }
            });
            
            res.json({
                alerts: alerts,
                total_alerts: alerts.length,
                alert_type: alertType
            });
        }
    });
});

/**
 * GET endpoint: Get garment-specific inventory analytics
 */
app.get("/analytics/garment-insights", function (req, res) {
    const days = parseInt(req.query.days) || 30;
    
    // Use the main inventory database
    const inventoryPath = path.join(
        process.env.APPDATA || 'C:\\Users\\akash\\AppData\\Roaming\\retailspos',
        process.env.APPNAME || 'retailspos',
        "server",
        "databases",
        "inventory.db"
    );
    
    const inventoryDB = getDatabase(inventoryPath);
    inventoryDB.find({}, function (err, products) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to fetch inventory data.",
            });
        } else {
            const insights = generateGarmentInsights(products);
            res.json(insights);
        }
    });
});

/**
 * POST endpoint: Update garment variant stock levels
 */
app.post("/variants/update-stock", function (req, res) {
    const { product_id, variant_type, variant_value, quantity_change } = req.body;
    
    if (!product_id || !variant_type || variant_value === undefined || !quantity_change) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Product ID, variant type, variant value, and quantity change are required"
        });
    }

    // Use the main inventory database
    const inventoryPath = path.join(
        process.env.APPDATA || 'C:\\Users\\akash\\AppData\\Roaming\\retailspos',
        process.env.APPNAME || 'retailspos',
        "server",
        "databases",
        "inventory.db"
    );
    
    const inventoryDB = getDatabase(inventoryPath);
    inventoryDB.findOne({ _id: parseInt(product_id) }, function (err, product) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to fetch product data.",
            });
        } else if (!product) {
            res.status(404).json({
                error: "Product not found",
                message: `No product found with ID: ${product_id}`
            });
        } else {
            // Update variant stock (this is a simplified implementation)
            // In a real system, you'd need more sophisticated variant tracking
            const newQuantity = Math.max(0, (product.quantity || 0) + parseInt(quantity_change));
            
            inventoryDB.update(
                { _id: parseInt(product_id) },
                { $set: { quantity: newQuantity } },
                {},
                function (updateErr) {
                    if (updateErr) {
                        console.error(updateErr);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: "Failed to update variant stock.",
                        });
                    } else {
                        res.json({
                            success: true,
                            product_id: product_id,
                            variant_type: variant_type,
                            variant_value: variant_value,
                            old_quantity: product.quantity || 0,
                            new_quantity: newQuantity,
                            quantity_change: parseInt(quantity_change)
                        });
                    }
                }
            );
        }
    });
});

/**
 * Helper function to build garment category hierarchy
 */
function buildGarmentCategoryHierarchy(categories) {
    const categoryMap = {};
    const rootCategories = [];

    // Create map and initialize children array
    categories.forEach(category => {
        category.children = [];
        categoryMap[category._id] = category;
    });

    // Build hierarchy
    categories.forEach(category => {
        if (category.parent_category) {
            const parent = categories.find(c => c.category_code === category.parent_category);
            if (parent) {
                const parentObj = categoryMap[parent._id];
                if (parentObj) {
                    parentObj.children.push(category);
                }
            }
        } else {
            rootCategories.push(category);
        }
    });

    return rootCategories;
}

/**
 * Helper function to check size-based stock alerts
 */
function checkSizeStockAlerts(product) {
    const alerts = [];
    const garmentSpec = product.garment_specific;
    const variantTracking = product.variant_tracking || {};
    
    if (!garmentSpec.has_variants || !variantTracking.track_sizes) {
        return alerts;
    }
    
    garmentSpec.sizes.forEach(size => {
        const threshold = variantTracking.alert_threshold_sizes[size] || product.minStock;
        const currentStock = getSizeStock(product, size);
        
        if (currentStock <= threshold) {
            alerts.push({
                product_id: product._id,
                product_name: product.name,
                alert_type: 'size_low_stock',
                variant_type: 'size',
                variant_value: size,
                current_stock: currentStock,
                threshold: threshold,
                severity: currentStock === 0 ? 'critical' : 'warning'
            });
        }
    });
    
    return alerts;
}

/**
 * Helper function to check color-based stock alerts
 */
function checkColorStockAlerts(product) {
    const alerts = [];
    const garmentSpec = product.garment_specific;
    const variantTracking = product.variant_tracking || {};
    
    if (!garmentSpec.has_variants || !variantTracking.track_colors) {
        return alerts;
    }
    
    garmentSpec.colors.forEach(color => {
        const threshold = variantTracking.alert_threshold_colors[color] || product.minStock;
        const currentStock = getColorStock(product, color);
        
        if (currentStock <= threshold) {
            alerts.push({
                product_id: product._id,
                product_name: product.name,
                alert_type: 'color_low_stock',
                variant_type: 'color',
                variant_value: color,
                current_stock: currentStock,
                threshold: threshold,
                severity: currentStock === 0 ? 'critical' : 'warning'
            });
        }
    });
    
    return alerts;
}

/**
 * Helper function to check combination stock alerts
 */
function checkCombinationStockAlerts(product) {
    const alerts = [];
    const garmentSpec = product.garment_specific;
    const variantTracking = product.variant_tracking || {};
    
    if (!garmentSpec.has_variants || !variantTracking.track_combinations) {
        return alerts;
    }
    
    // This would require more complex tracking of specific size/color combinations
    // For now, we'll just check total stock
    if (product.quantity <= product.minStock) {
        alerts.push({
            product_id: product._id,
            product_name: product.name,
            alert_type: 'combination_low_stock',
            variant_type: 'total',
            variant_value: 'all_combinations',
            current_stock: product.quantity,
            threshold: product.minStock,
            severity: product.quantity === 0 ? 'critical' : 'warning'
        });
    }
    
    return alerts;
}

/**
 * Helper function to generate garment-specific insights
 */
function generateGarmentInsights(products) {
    const garmentProducts = products.filter(p => p.garment_specific && p.garment_specific.has_variants);
    
    const insights = {
        total_garment_products: garmentProducts.length,
        products_with_sizes: garmentProducts.filter(p => p.garment_specific.sizes?.length > 0).length,
        products_with_colors: garmentProducts.filter(p => p.garment_specific.colors?.length > 0).length,
        products_with_materials: garmentProducts.filter(p => p.garment_specific.materials?.length > 0).length,
        size_distribution: {},
        color_distribution: {},
        low_stock_variants: 0,
        fast_moving_sizes: [],
        slow_moving_sizes: []
    };

    // Analyze size distribution
    garmentProducts.forEach(product => {
        product.garment_specific.sizes?.forEach(size => {
            insights.size_distribution[size] = (insights.size_distribution[size] || 0) + 1;
        });
    });

    // Analyze color distribution
    garmentProducts.forEach(product => {
        product.garment_specific.colors?.forEach(color => {
            insights.color_distribution[color] = (insights.color_distribution[color] || 0) + 1;
        });
    });

    // Find fast and slow moving sizes
    const sizeEntries = Object.entries(insights.size_distribution);
    insights.fast_moving_sizes = sizeEntries
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([size]) => size);
    
    insights.slow_moving_sizes = sizeEntries
        .sort(([,a], [,b]) => a - b)
        .slice(0, 3)
        .map(([size]) => size);

    // Count low stock variants
    garmentProducts.forEach(product => {
        if (product.quantity <= product.minStock) {
            insights.low_stock_variants++;
        }
    });

    return insights;
}

/**
 * Helper function to get stock for a specific size
 */
function getSizeStock(product, size) {
    // This would need to be implemented based on how variant stock is tracked
    // For now, return a portion of total stock based on size distribution
    const totalStock = product.quantity || 0;
    const sizeCount = product.garment_specific?.sizes?.length || 1;
    return Math.floor(totalStock / sizeCount);
}

/**
 * Helper function to get stock for a specific color
 */
function getColorStock(product, color) {
    // This would need to be implemented based on how variant stock is tracked
    // For now, return a portion of total stock based on color distribution
    const totalStock = product.quantity || 0;
    const colorCount = product.garment_specific?.colors?.length || 1;
    return Math.floor(totalStock / colorCount);
}