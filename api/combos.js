const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const async = require("async");
const path = require("path");
const csv = require('csv-parser');
const json2csv = require('json-2-csv').json2csv;
const validator = require("validator");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "combos.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

let combosDB = getDatabase(dbPath);
combosDB.ensureIndex({ fieldName: "_id", unique: true });
combosDB.ensureIndex({ fieldName: "combo_code" });
combosDB.ensureIndex({ fieldName: "category" });
combosDB.ensureIndex({ fieldName: "is_active" });

/**
 * GET endpoint: Get the welcome message for the Combos API.
 */
app.get("/", function (req, res) {
    res.send("Combos API - Combo Meal Builder System");
});

/**
 * GET endpoint: Get all combo meals with optional filtering
 */
app.get("/combos", function (req, res) {
    let query = {};
    let sortOptions = {};
    
    // Apply filters
    if (req.query.category) {
        query.category = req.query.category;
    }
    
    if (req.query.is_active !== undefined) {
        query.is_active = req.query.is_active === 'true';
    }
    
    if (req.query.search) {
        const searchTerm = req.query.search.toLowerCase();
        query.$or = [
            { combo_name: new RegExp(searchTerm, 'i') },
            { combo_code: new RegExp(searchTerm, 'i') },
            { description: new RegExp(searchTerm, 'i') }
        ];
    }
    
    if (req.query.seasonal !== undefined) {
        query.is_seasonal = req.query.seasonal === 'true';
    }
    
    // Sorting options
    if (req.query.sort) {
        switch (req.query.sort) {
            case 'name':
                sortOptions.combo_name = 1;
                break;
            case 'price':
                sortOptions.combo_price = 1;
                break;
            case 'popularity':
                sortOptions.popularity_score = -1;
                break;
            case 'created':
                sortOptions.created_date = -1;
                break;
            default:
                sortOptions.combo_name = 1;
        }
    } else {
        sortOptions.combo_name = 1;
    }
    
    combosDB.find(query).sort(sortOptions).exec(function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            // Check availability for each combo
            async.map(docs, function(combo, callback) {
                app.checkComboAvailability(combo, function(available) {
                    callback(null, {
                        ...combo,
                        is_currently_available: available
                    });
                });
            }, function(err, combosWithAvailability) {
                if (err) {
                    res.status(500).json({ error: "Error checking availability" });
                } else {
                    res.send(combosWithAvailability);
                }
            });
        }
    });
});

/**
 * GET endpoint: Get combo meal by ID
 */
app.get("/combos/:comboId", function (req, res) {
    if (!req.params.comboId) {
        res.status(400).send("Combo ID is required.");
    } else {
        combosDB.findOne(
            { _id: req.params.comboId },
            function (err, combo) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "An unexpected error occurred.",
                    });
                } else if (!combo) {
                    res.status(404).json({
                        error: "Combo meal not found",
                        message: "The requested combo meal does not exist.",
                    });
                } else {
                    // Check availability
                    app.checkComboAvailability(combo, function(available) {
                        res.send({
                            ...combo,
                            is_currently_available: available
                        });
                    });
                }
            }
        );
    }
});

/**
 * POST endpoint: Create a new combo meal
 */
app.post("/combos", function (req, res) {
    try {
        const comboData = req.body;
        
        // Validate required fields
        if (!comboData.combo_name || !comboData.components || !Array.isArray(comboData.components)) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Combo name and components are required."
            });
        }
        
        // Validate pricing data
        if (!comboData.combo_price && !comboData.base_price) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Combo price or base price is required."
            });
        }
        
        // Generate combo code if not provided
        if (!comboData.combo_code) {
            comboData.combo_code = app.generateComboCode(comboData.combo_name);
        }
        
        // Calculate pricing if not provided
        const pricing = app.calculateComboPricing(comboData);
        
        const combo = {
            _id: comboData._id || Math.floor(Date.now() / 1000),
            combo_name: validator.escape(comboData.combo_name),
            combo_code: validator.escape(comboData.combo_code),
            description: validator.escape(comboData.description || ""),
            category: validator.escape(comboData.category || "General"),
            image_url: validator.escape(comboData.image_url || ""),
            is_active: comboData.is_active !== false, // Default to true
            is_seasonal: comboData.is_seasonal || false,
            availability_start: comboData.availability_start || null,
            availability_end: comboData.availability_end || null,
            
            // Pricing Structure
            pricing_type: comboData.pricing_type || "fixed",
            base_price: parseFloat(comboData.base_price) || pricing.base_price,
            combo_price: parseFloat(comboData.combo_price) || pricing.combo_price,
            discount_amount: parseFloat(comboData.discount_amount) || pricing.discount_amount,
            discount_percentage: parseFloat(comboData.discount_percentage) || pricing.discount_percentage,
            
            // Components
            components: comboData.components.map(component => ({
                component_type: validator.escape(component.component_type),
                component_name: validator.escape(component.component_name),
                menu_item_ids: Array.isArray(component.menu_item_ids) ? component.menu_item_ids : [],
                quantity: parseInt(component.quantity) || 1,
                is_required: component.is_required !== false, // Default to true
                max_selections: parseInt(component.max_selections) || 1,
                default_selection: component.default_selection || null
            })),
            
            // Nutritional Info
            total_calories: parseInt(comboData.total_calories) || 0,
            preparation_time: parseInt(comboData.preparation_time) || 0,
            
            // Business Rules
            min_order_quantity: parseInt(comboData.min_order_quantity) || 1,
            max_order_quantity: parseInt(comboData.max_order_quantity) || 10,
            applicable_days: Array.isArray(comboData.applicable_days) ? comboData.applicable_days : [],
            applicable_hours: comboData.applicable_hours || {},
            
            // Analytics (initialize to zero)
            popularity_score: parseInt(comboData.popularity_score) || 0,
            total_sold: parseInt(comboData.total_sold) || 0,
            revenue_generated: parseFloat(comboData.revenue_generated) || 0,
            
            // Timestamps
            created_date: new Date().toISOString(),
            last_modified: new Date().toISOString(),
            created_by: comboData.created_by || "system"
        };
        
        // Validate component selections
        const validation = app.validateComboComponents(combo.components);
        if (!validation.valid) {
            return res.status(400).json({
                error: "Validation Error",
                message: validation.message
            });
        }
        
        combosDB.insert(combo, function (err, newCombo) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to create combo meal.",
                });
            } else {
                res.status(201).json(newCombo);
            }
        });
        
    } catch (error) {
        console.error("Combo creation error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while creating the combo meal.",
        });
    }
});

/**
 * PUT endpoint: Update an existing combo meal
 */
app.put("/combos/:comboId", function (req, res) {
    try {
        const comboId = req.params.comboId;
        const comboData = req.body;
        
        // Validate required fields
        if (!comboData.combo_name || !comboData.components || !Array.isArray(comboData.components)) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Combo name and components are required."
            });
        }
        
        // Calculate pricing if not provided
        const pricing = app.calculateComboPricing(comboData);
        
        const updateData = {
            combo_name: validator.escape(comboData.combo_name),
            combo_code: validator.escape(comboData.combo_code),
            description: validator.escape(comboData.description || ""),
            category: validator.escape(comboData.category || "General"),
            image_url: validator.escape(comboData.image_url || ""),
            is_active: comboData.is_active !== false,
            is_seasonal: comboData.is_seasonal || false,
            availability_start: comboData.availability_start || null,
            availability_end: comboData.availability_end || null,
            
            // Pricing Structure
            pricing_type: comboData.pricing_type || "fixed",
            base_price: parseFloat(comboData.base_price) || pricing.base_price,
            combo_price: parseFloat(comboData.combo_price) || pricing.combo_price,
            discount_amount: parseFloat(comboData.discount_amount) || pricing.discount_amount,
            discount_percentage: parseFloat(comboData.discount_percentage) || pricing.discount_percentage,
            
            // Components
            components: comboData.components.map(component => ({
                component_type: validator.escape(component.component_type),
                component_name: validator.escape(component.component_name),
                menu_item_ids: Array.isArray(component.menu_item_ids) ? component.menu_item_ids : [],
                quantity: parseInt(component.quantity) || 1,
                is_required: component.is_required !== false,
                max_selections: parseInt(component.max_selections) || 1,
                default_selection: component.default_selection || null
            })),
            
            // Nutritional Info
            total_calories: parseInt(comboData.total_calories) || 0,
            preparation_time: parseInt(comboData.preparation_time) || 0,
            
            // Business Rules
            min_order_quantity: parseInt(comboData.min_order_quantity) || 1,
            max_order_quantity: parseInt(comboData.max_order_quantity) || 10,
            applicable_days: Array.isArray(comboData.applicable_days) ? comboData.applicable_days : [],
            applicable_hours: comboData.applicable_hours || {},
            
            // Analytics
            popularity_score: parseInt(comboData.popularity_score) || 0,
            total_sold: parseInt(comboData.total_sold) || 0,
            revenue_generated: parseFloat(comboData.revenue_generated) || 0,
            
            last_modified: new Date().toISOString()
        };
        
        // Validate component selections
        const validation = app.validateComboComponents(updateData.components);
        if (!validation.valid) {
            return res.status(400).json({
                error: "Validation Error",
                message: validation.message
            });
        }
        
        combosDB.update(
            { _id: comboId },
            { $set: updateData },
            {},
            function (err, numReplaced) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "Failed to update combo meal.",
                    });
                } else if (numReplaced === 0) {
                    res.status(404).json({
                        error: "Combo meal not found",
                        message: "The combo meal to update does not exist.",
                    });
                } else {
                    combosDB.findOne({ _id: comboId }, function (err, combo) {
                        if (err) {
                            res.status(500).json({
                                error: "Internal Server Error",
                                message: "Combo meal updated but failed to retrieve updated data.",
                            });
                        } else {
                            res.json(combo);
                        }
                    });
                }
            }
        );
        
    } catch (error) {
        console.error("Combo update error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while updating the combo meal.",
        });
    }
});

/**
 * DELETE endpoint: Delete a combo meal
 */
app.delete("/combos/:comboId", function (req, res) {
    combosDB.remove(
        { _id: req.params.comboId },
        {},
        function (err, numRemoved) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            } else if (numRemoved === 0) {
                res.status(404).json({
                    error: "Combo meal not found",
                    message: "The combo meal to delete does not exist.",
                });
            } else {
                res.sendStatus(200);
            }
        }
    );
});

/**
 * POST endpoint: Calculate combo pricing
 */
app.post("/combos/:comboId/calculate-pricing", function (req, res) {
    const { comboId } = req.params;
    const { components } = req.body;
    
    combosDB.findOne({ _id: comboId }, function (err, combo) {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        } else if (!combo) {
            return res.status(404).json({ error: "Combo not found" });
        }
        
        const componentData = components || combo.components;
        app.calculateComponentPricing(componentData, function(pricing) {
            res.json({
                combo_id: combo._id,
                combo_name: combo.combo_name,
                base_price: pricing.base_price,
                combo_price: pricing.combo_price,
                discount_amount: pricing.discount_amount,
                discount_percentage: pricing.discount_percentage,
                components: pricing.component_details
            });
        });
    });
});

/**
 * POST endpoint: Check combo availability
 */
app.post("/combos/:comboId/check-availability", function (req, res) {
    const { comboId } = req.params;
    const { quantity } = req.body;
    
    combosDB.findOne({ _id: comboId }, function (err, combo) {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        } else if (!combo) {
            return res.status(404).json({ error: "Combo not found" });
        }
        
        const orderQuantity = quantity || 1;
        app.checkComboAvailability(combo, function(available) {
            app.checkComboInventory(combo, orderQuantity, function(inventoryAvailable) {
                res.json({
                    combo_id: combo._id,
                    combo_name: combo.combo_name,
                    quantity: orderQuantity,
                    is_available: available && inventoryAvailable,
                    availability_reasons: {
                        time_based: available,
                        inventory_based: inventoryAvailable
                    }
                });
            });
        });
    });
});

/**
 * GET endpoint: Get combo meals by category
 */
app.get("/combos/category/:category", function (req, res) {
    const category = req.params.category;
    
    combosDB.find({ category: category, is_active: true }, function (err, docs) {
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
 * GET endpoint: Get available combo categories
 */
app.get("/combos/categories", function (req, res) {
    combosDB.find({}, { category: 1, _id: 0 }, function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            const categories = [...new Set(docs.map(doc => doc.category))].filter(Boolean);
            res.send(categories);
        }
    });
});

/**
 * GET endpoint: Get combo performance analytics
 */
app.get("/combos/analytics/performance", function (req, res) {
    combosDB.find({}, function (err, combos) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            const analytics = {
                total_combos: combos.length,
                active_combos: combos.filter(c => c.is_active).length,
                top_performing: combos
                    .sort((a, b) => b.total_sold - a.total_sold)
                    .slice(0, 10),
                total_revenue: combos.reduce((sum, c) => sum + c.revenue_generated, 0),
                average_popularity: combos.length > 0 
                    ? combos.reduce((sum, c) => sum + c.popularity_score, 0) / combos.length 
                    : 0,
                category_performance: {}
            };
            
            // Category performance
            combos.forEach(combo => {
                if (!analytics.category_performance[combo.category]) {
                    analytics.category_performance[combo.category] = {
                        total_sold: 0,
                        revenue: 0,
                        count: 0
                    };
                }
                analytics.category_performance[combo.category].total_sold += combo.total_sold;
                analytics.category_performance[combo.category].revenue += combo.revenue_generated;
                analytics.category_performance[combo.category].count += 1;
            });
            
            res.send(analytics);
        }
    });
});

/**
 * POST endpoint: Record combo sale
 */
app.post("/combos/:comboId/record-sale", function (req, res) {
    const { comboId } = req.params;
    const { quantity, price } = req.body;
    
    combosDB.findOne({ _id: comboId }, function (err, combo) {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        } else if (!combo) {
            return res.status(404).json({ error: "Combo not found" });
        }
        
        const saleQuantity = quantity || 1;
        const salePrice = price || combo.combo_price;
        const revenue = saleQuantity * salePrice;
        
        combosDB.update(
            { _id: comboId },
            {
                $inc: {
                    total_sold: saleQuantity,
                    revenue_generated: revenue,
                    popularity_score: saleQuantity
                },
                $set: {
                    last_modified: new Date().toISOString()
                }
            },
            {},
            function (err, numReplaced) {
                if (err) {
                    console.error(err);
                    res.status(500).json({ error: "Failed to record sale" });
                } else {
                    res.json({
                        success: true,
                        combo_id: comboId,
                        quantity_sold: saleQuantity,
                        revenue_generated: revenue
                    });
                }
            }
        );
    });
});

/**
 * GET endpoint: Export combo meals to CSV
 */
app.get("/export/csv", function (req, res) {
    combosDB.find({}, function (err, combos) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve combos for export"
            });
        }

        if (!combos || combos.length === 0) {
            return res.status(404).json({
                error: "No combo meals found",
                message: "No combo meals available for export"
            });
        }

        try {
            const csvData = combos.map(combo => ({
                id: combo._id,
                combo_name: combo.combo_name,
                combo_code: combo.combo_code,
                description: combo.description,
                category: combo.category,
                base_price: combo.base_price,
                combo_price: combo.combo_price,
                discount_amount: combo.discount_amount,
                discount_percentage: combo.discount_percentage,
                total_calories: combo.total_calories,
                preparation_time: combo.preparation_time,
                is_active: combo.is_active ? 'Yes' : 'No',
                is_seasonal: combo.is_seasonal ? 'Yes' : 'No',
                popularity_score: combo.popularity_score,
                total_sold: combo.total_sold,
                revenue_generated: combo.revenue_generated,
                components: combo.components.map(comp => 
                    `${comp.component_type}: ${comp.component_name} (${comp.menu_item_ids.length} options)`
                ).join('; '),
                created_date: combo.created_date
            }));

            const fields = [
                { label: 'Combo ID', value: 'id' },
                { label: 'Combo Name', value: 'combo_name' },
                { label: 'Combo Code', value: 'combo_code' },
                { label: 'Description', value: 'description' },
                { label: 'Category', value: 'category' },
                { label: 'Base Price', value: 'base_price' },
                { label: 'Combo Price', value: 'combo_price' },
                { label: 'Discount Amount', value: 'discount_amount' },
                { label: 'Discount Percentage', value: 'discount_percentage' },
                { label: 'Total Calories', value: 'total_calories' },
                { label: 'Preparation Time (min)', value: 'preparation_time' },
                { label: 'Active', value: 'is_active' },
                { label: 'Seasonal', value: 'is_seasonal' },
                { label: 'Popularity Score', value: 'popularity_score' },
                { label: 'Total Sold', value: 'total_sold' },
                { label: 'Revenue Generated', value: 'revenue_generated' },
                { label: 'Components', value: 'components' },
                { label: 'Created Date', value: 'created_date' }
            ];

            const csv = json2csv(csvData, { fields });

            const filename = `combos_export_${new Date().toISOString().split('T')[0]}.csv`;
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
 * Helper function to generate combo code
 */
app.generateComboCode = function(comboName) {
    const prefix = "COMBO";
    const number = Math.floor(Math.random() * 9000) + 1000;
    const nameCode = comboName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
    return `${prefix}${nameCode}${number}`;
};

/**
 * Helper function to calculate combo pricing
 */
app.calculateComboPricing = function(comboData) {
    let basePrice = 0;
    
    // Calculate base price from components (if not provided)
    if (!comboData.base_price && comboData.components) {
        // This would typically fetch menu item prices from inventory
        // For now, we'll use a placeholder calculation
        basePrice = comboData.components.reduce((sum, comp) => {
            return sum + (comp.estimated_price || 10) * comp.quantity;
        }, 0);
    } else {
        basePrice = parseFloat(comboData.base_price) || 0;
    }
    
    let comboPrice = parseFloat(comboData.combo_price) || basePrice;
    let discountAmount = basePrice - comboPrice;
    let discountPercentage = basePrice > 0 ? (discountAmount / basePrice) * 100 : 0;
    
    return {
        base_price: basePrice,
        combo_price: comboPrice,
        discount_amount: discountAmount,
        discount_percentage: discountPercentage
    };
};

/**
 * Helper function to validate combo components
 */
app.validateComboComponents = function(components) {
    const componentTypes = ['main', 'side', 'drink', 'dessert', 'appetizer'];
    const usedTypes = new Set();
    
    for (const component of components) {
        if (!componentTypes.includes(component.component_type)) {
            return {
                valid: false,
                message: `Invalid component type: ${component.component_type}`
            };
        }
        
        if (usedTypes.has(component.component_type) && component.is_required) {
            return {
                valid: false,
                message: `Multiple required components of type: ${component.component_type}`
            };
        }
        
        if (component.is_required && (!component.menu_item_ids || component.menu_item_ids.length === 0)) {
            return {
                valid: false,
                message: `Required component ${component.component_type} must have menu items`
            };
        }
        
        usedTypes.add(component.component_type);
    }
    
    return { valid: true };
};

/**
 * Helper function to check combo availability based on time/business rules
 */
app.checkComboAvailability = function(combo, callback) {
    // Check if combo is active
    if (!combo.is_active) {
        return callback(false);
    }
    
    // Check seasonal availability
    if (combo.is_seasonal) {
        const now = new Date();
        if (combo.availability_start && new Date(combo.availability_start) > now) {
            return callback(false);
        }
        if (combo.availability_end && new Date(combo.availability_end) < now) {
            return callback(false);
        }
    }
    
    // Check applicable days
    if (combo.applicable_days && combo.applicable_days.length > 0) {
        const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
        if (!combo.applicable_days.includes(today)) {
            return callback(false);
        }
    }
    
    // Check applicable hours
    if (combo.applicable_hours && Object.keys(combo.applicable_hours).length > 0) {
        const now = new Date();
        const currentHour = now.getHours();
        const dayOfWeek = now.getDay();
        
        if (combo.applicable_hours[dayOfWeek]) {
            const hours = combo.applicable_hours[dayOfWeek];
            if (currentHour < hours.start || currentHour > hours.end) {
                return callback(false);
            }
        }
    }
    
    callback(true);
};

/**
 * Helper function to check inventory availability for combo components
 */
app.checkComboInventory = function(combo, quantity, callback) {
    // This would integrate with the inventory system to check component availability
    // For now, we'll simulate the check
    let allAvailable = true;
    let checkedComponents = 0;
    let totalComponents = combo.components.length;
    
    if (totalComponents === 0) {
        return callback(true);
    }
    
    combo.components.forEach(component => {
        // Simulate inventory check for each component
        // In real implementation, this would query the inventory database
        const hasInventory = Math.random() > 0.1; // 90% chance of availability for demo
        
        if (!hasInventory) {
            allAvailable = false;
        }
        
        checkedComponents++;
        if (checkedComponents === totalComponents) {
            callback(allAvailable);
        }
    });
};

/**
 * Helper function to calculate component pricing
 */
app.calculateComponentPricing = function(components, callback) {
    let basePrice = 0;
    const componentDetails = [];
    
    // In real implementation, this would fetch actual menu item prices
    components.forEach(component => {
        const estimatedPrice = component.estimated_price || 10;
        const totalComponentPrice = estimatedPrice * component.quantity;
        basePrice += totalComponentPrice;
        
        componentDetails.push({
            component_type: component.component_type,
            component_name: component.component_name,
            quantity: component.quantity,
            estimated_price: estimatedPrice,
            total_price: totalComponentPrice,
            menu_item_count: component.menu_item_ids ? component.menu_item_ids.length : 0
        });
    });
    
    const comboPrice = basePrice; // Simplified - would apply pricing rules
    const discountAmount = basePrice - comboPrice;
    const discountPercentage = basePrice > 0 ? (discountAmount / basePrice) * 100 : 0;
    
    callback({
        base_price: basePrice,
        combo_price: comboPrice,
        discount_amount: discountAmount,
        discount_percentage: discountPercentage,
        component_details: componentDetails
    });
};

/**
 * Function to decrement inventory for combo components
 */
app.decrementInventoryForCombo = function(comboId, quantity, inventoryDB, callback) {
    combosDB.findOne({ _id: comboId }, function(err, combo) {
        if (err || !combo) {
            return callback(err || new Error('Combo not found'));
        }
        
        const ingredientDeductions = [];
        
        combo.components.forEach(component => {
            component.menu_item_ids.forEach(menuItemId => {
                const deduction = {
                    menu_item_id: menuItemId,
                    quantity: component.quantity * quantity,
                    component_type: component.component_type
                };
                ingredientDeductions.push(deduction);
            });
        });
        
        // This would integrate with the inventory system's decrement function
        callback(null, ingredientDeductions);
    });
};

module.exports = app;