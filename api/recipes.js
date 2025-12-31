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
    "recipes.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

let recipesDB = getDatabase(dbPath);
recipesDB.ensureIndex({ fieldName: "_id", unique: true });
recipesDB.ensureIndex({ fieldName: "name" });
recipesDB.ensureIndex({ fieldName: "category" });
recipesDB.ensureIndex({ fieldName: "menu_item_id" });

/**
 * GET endpoint: Get the welcome message for the Recipes API.
 */
app.get("/", function (req, res) {
    res.send("Recipes API - Recipe Management System");
});

/**
 * GET endpoint: Get all recipes with optional filtering
 */
app.get("/recipes", function (req, res) {
    let query = {};
    let sortOptions = {};
    
    // Apply filters
    if (req.query.category) {
        query.category = req.query.category;
    }
    
    if (req.query.difficulty) {
        query.difficulty_level = req.query.difficulty;
    }
    
    if (req.query.search) {
        const searchTerm = req.query.search.toLowerCase();
        query.$or = [
            { name: new RegExp(searchTerm, 'i') },
            { category: new RegExp(searchTerm, 'i') },
            { 'ingredients.ingredient_name': new RegExp(searchTerm, 'i') }
        ];
    }
    
    // Sorting options
    if (req.query.sort) {
        switch (req.query.sort) {
            case 'name':
                sortOptions.name = 1;
                break;
            case 'cost':
                sortOptions.cost_per_serving = 1;
                break;
            case 'prep_time':
                sortOptions.prep_time = 1;
                break;
            case 'created':
                sortOptions.created_date = -1;
                break;
            default:
                sortOptions.name = 1;
        }
    } else {
        sortOptions.name = 1;
    }
    
    recipesDB.find(query).sort(sortOptions).exec(function (err, docs) {
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
 * GET endpoint: Get recipe by ID
 */
app.get("/recipes/:recipeId", function (req, res) {
    if (!req.params.recipeId) {
        res.status(400).send("Recipe ID is required.");
    } else {
        recipesDB.findOne(
            { _id: req.params.recipeId },
            function (err, recipe) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "An unexpected error occurred.",
                    });
                } else if (!recipe) {
                    res.status(404).json({
                        error: "Recipe not found",
                        message: "The requested recipe does not exist.",
                    });
                } else {
                    res.send(recipe);
                }
            }
        );
    }
});

/**
 * POST endpoint: Create a new recipe
 */
app.post("/recipes", function (req, res) {
    try {
        const recipeData = req.body;
        
        // Validate required fields
        if (!recipeData.name || !recipeData.ingredients || !Array.isArray(recipeData.ingredients)) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Recipe name and ingredients are required."
            });
        }
        
        // Calculate cost per serving
        const costPerServing = calculateRecipeCost(recipeData.ingredients, recipeData.serving_size || 1);
        
        const recipe = {
            _id: recipeData._id || Math.floor(Date.now() / 1000),
            name: validator.escape(recipeData.name),
            menu_item_id: recipeData.menu_item_id || null,
            category: validator.escape(recipeData.category || "General"),
            ingredients: recipeData.ingredients.map(ingredient => ({
                ingredient_name: validator.escape(ingredient.ingredient_name),
                quantity: parseFloat(ingredient.quantity) || 0,
                unit: validator.escape(ingredient.unit || "g"),
                cost_per_unit: parseFloat(ingredient.cost_per_unit) || 0,
                supplier_id: ingredient.supplier_id || null
            })),
            instructions: recipeData.instructions || [],
            prep_time: parseInt(recipeData.prep_time) || 0,
            cook_time: parseInt(recipeData.cook_time) || 0,
            serving_size: parseInt(recipeData.serving_size) || 1,
            cost_per_serving: costPerServing,
            yield_percentage: parseFloat(recipeData.yield_percentage) || 100,
            difficulty_level: validator.escape(recipeData.difficulty_level || "Medium"),
            allergens: Array.isArray(recipeData.allergens) ? recipeData.allergens : [],
            dietary_info: Array.isArray(recipeData.dietary_info) ? recipeData.dietary_info : [],
            nutritional_info: recipeData.nutritional_info || {},
            created_date: new Date().toISOString(),
            last_modified: new Date().toISOString(),
            created_by: recipeData.created_by || "system"
        };
        
        recipesDB.insert(recipe, function (err, newRecipe) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to create recipe.",
                });
            } else {
                res.status(201).json(newRecipe);
            }
        });
        
    } catch (error) {
        console.error("Recipe creation error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while creating the recipe.",
        });
    }
});

/**
 * PUT endpoint: Update an existing recipe
 */
app.put("/recipes/:recipeId", function (req, res) {
    try {
        const recipeId = req.params.recipeId;
        const recipeData = req.body;
        
        // Validate required fields
        if (!recipeData.name || !recipeData.ingredients || !Array.isArray(recipeData.ingredients)) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Recipe name and ingredients are required."
            });
        }
        
        // Calculate cost per serving
        const costPerServing = calculateRecipeCost(recipeData.ingredients, recipeData.serving_size || 1);
        
        const updateData = {
            name: validator.escape(recipeData.name),
            menu_item_id: recipeData.menu_item_id || null,
            category: validator.escape(recipeData.category || "General"),
            ingredients: recipeData.ingredients.map(ingredient => ({
                ingredient_name: validator.escape(ingredient.ingredient_name),
                quantity: parseFloat(ingredient.quantity) || 0,
                unit: validator.escape(ingredient.unit || "g"),
                cost_per_unit: parseFloat(ingredient.cost_per_unit) || 0,
                supplier_id: ingredient.supplier_id || null
            })),
            instructions: recipeData.instructions || [],
            prep_time: parseInt(recipeData.prep_time) || 0,
            cook_time: parseInt(recipeData.cook_time) || 0,
            serving_size: parseInt(recipeData.serving_size) || 1,
            cost_per_serving: costPerServing,
            yield_percentage: parseFloat(recipeData.yield_percentage) || 100,
            difficulty_level: validator.escape(recipeData.difficulty_level || "Medium"),
            allergens: Array.isArray(recipeData.allergens) ? recipeData.allergens : [],
            dietary_info: Array.isArray(recipeData.dietary_info) ? recipeData.dietary_info : [],
            nutritional_info: recipeData.nutritional_info || {},
            last_modified: new Date().toISOString()
        };
        
        recipesDB.update(
            { _id: recipeId },
            { $set: updateData },
            {},
            function (err, numReplaced) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "Failed to update recipe.",
                    });
                } else if (numReplaced === 0) {
                    res.status(404).json({
                        error: "Recipe not found",
                        message: "The recipe to update does not exist.",
                    });
                } else {
                    recipesDB.findOne({ _id: recipeId }, function (err, recipe) {
                        if (err) {
                            res.status(500).json({
                                error: "Internal Server Error",
                                message: "Recipe updated but failed to retrieve updated data.",
                            });
                        } else {
                            res.json(recipe);
                        }
                    });
                }
            }
        );
        
    } catch (error) {
        console.error("Recipe update error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while updating the recipe.",
        });
    }
});

/**
 * DELETE endpoint: Delete a recipe
 */
app.delete("/recipes/:recipeId", function (req, res) {
    recipesDB.remove(
        { _id: req.params.recipeId },
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
                    error: "Recipe not found",
                    message: "The recipe to delete does not exist.",
                });
            } else {
                res.sendStatus(200);
            }
        }
    );
});

/**
 * POST endpoint: Calculate recipe cost for given servings
 */
app.post("/recipes/:recipeId/calculate-cost", function (req, res) {
    const { recipeId } = req.params;
    const { servings, scaling_factor } = req.body;
    
    recipesDB.findOne({ _id: recipeId }, function (err, recipe) {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        } else if (!recipe) {
            return res.status(404).json({ error: "Recipe not found" });
        }
        
        const targetServings = servings || recipe.serving_size;
        const scaleFactor = scaling_factor || (targetServings / recipe.serving_size);
        
        const scaledIngredients = recipe.ingredients.map(ingredient => ({
            ...ingredient,
            scaled_quantity: ingredient.quantity * scaleFactor,
            total_cost: ingredient.quantity * scaleFactor * ingredient.cost_per_unit
        }));
        
        const totalCost = scaledIngredients.reduce((sum, ing) => sum + ing.total_cost, 0);
        const costPerServing = totalCost / targetServings;
        
        res.json({
            recipe_id: recipe._id,
            recipe_name: recipe.name,
            original_servings: recipe.serving_size,
            target_servings: targetServings,
            scaling_factor: scaleFactor,
            total_cost: totalCost,
            cost_per_serving: costPerServing,
            scaled_ingredients: scaledIngredients
        });
    });
});

/**
 * GET endpoint: Get recipes by category
 */
app.get("/recipes/category/:category", function (req, res) {
    const category = req.params.category;
    
    recipesDB.find({ category: category }, function (err, docs) {
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
 * GET endpoint: Get available recipe categories
 */
app.get("/recipes/categories", function (req, res) {
    recipesDB.find({}, { category: 1, _id: 0 }, function (err, docs) {
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
 * GET endpoint: Get ingredient usage report
 */
app.get("/recipes/ingredient-usage", function (req, res) {
    recipesDB.find({}, function (err, recipes) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            const ingredientUsage = {};
            
            recipes.forEach(recipe => {
                recipe.ingredients.forEach(ingredient => {
                    const name = ingredient.ingredient_name;
                    if (!ingredientUsage[name]) {
                        ingredientUsage[name] = {
                            ingredient_name: name,
                            total_recipes: 0,
                            total_quantity_used: 0,
                            average_cost_per_unit: 0,
                            recipes: []
                        };
                    }
                    
                    ingredientUsage[name].total_recipes++;
                    ingredientUsage[name].total_quantity_used += ingredient.quantity;
                    ingredientUsage[name].recipes.push({
                        recipe_id: recipe._id,
                        recipe_name: recipe.name,
                        quantity: ingredient.quantity,
                        unit: ingredient.unit
                    });
                });
            });
            
            // Calculate average costs
            Object.values(ingredientUsage).forEach(usage => {
                const totalCost = recipes.reduce((sum, recipe) => {
                    const ingredient = recipe.ingredients.find(ing => ing.ingredient_name === usage.ingredient_name);
                    return sum + (ingredient ? ingredient.cost_per_unit : 0);
                }, 0);
                usage.average_cost_per_unit = totalCost / usage.total_recipes;
            });
            
            res.send(Object.values(ingredientUsage));
        }
    });
});

/**
 * GET endpoint: Export recipes to CSV
 */
app.get("/export/csv", function (req, res) {
    recipesDB.find({}, function (err, recipes) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve recipes for export"
            });
        }

        if (!recipes || recipes.length === 0) {
            return res.status(404).json({
                error: "No recipes found",
                message: "No recipes available for export"
            });
        }

        try {
            const csvData = recipes.map(recipe => ({
                id: recipe._id,
                name: recipe.name,
                menu_item_id: recipe.menu_item_id || '',
                category: recipe.category,
                serving_size: recipe.serving_size,
                prep_time: recipe.prep_time,
                cook_time: recipe.cook_time,
                cost_per_serving: recipe.cost_per_serving,
                yield_percentage: recipe.yield_percentage,
                difficulty_level: recipe.difficulty_level,
                allergens: (recipe.allergens || []).join(', '),
                dietary_info: (recipe.dietary_info || []).join(', '),
                ingredients: recipe.ingredients.map(ing => 
                    `${ing.ingredient_name}:${ing.quantity}${ing.unit}@$${ing.cost_per_unit}`
                ).join('; '),
                instructions: (recipe.instructions || []).join(' | '),
                created_date: recipe.created_date,
                created_by: recipe.created_by
            }));

            const fields = [
                { label: 'Recipe ID', value: 'id' },
                { label: 'Recipe Name', value: 'name' },
                { label: 'Menu Item ID', value: 'menu_item_id' },
                { label: 'Category', value: 'category' },
                { label: 'Serving Size', value: 'serving_size' },
                { label: 'Prep Time (min)', value: 'prep_time' },
                { label: 'Cook Time (min)', value: 'cook_time' },
                { label: 'Cost per Serving', value: 'cost_per_serving' },
                { label: 'Yield Percentage', value: 'yield_percentage' },
                { label: 'Difficulty Level', value: 'difficulty_level' },
                { label: 'Allergens', value: 'allergens' },
                { label: 'Dietary Info', value: 'dietary_info' },
                { label: 'Ingredients', value: 'ingredients' },
                { label: 'Instructions', value: 'instructions' },
                { label: 'Created Date', value: 'created_date' },
                { label: 'Created By', value: 'created_by' }
            ];

            const csv = json2csv(csvData, { fields });

            const filename = `recipes_export_${new Date().toISOString().split('T')[0]}.csv`;
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
 * POST endpoint: Import recipes from CSV
 */
app.post("/import/csv", function (req, res) {
    // Implementation for CSV import similar to inventory
    res.status(501).json({
        error: "Not Implemented",
        message: "CSV import functionality will be implemented in a future update"
    });
});

/**
 * GET endpoint: Get recipe nutritional information
 */
app.get("/recipes/:recipeId/nutrition", function (req, res) {
    recipesDB.findOne({ _id: req.params.recipeId }, function (err, recipe) {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        } else if (!recipe) {
            return res.status(404).json({ error: "Recipe not found" });
        }
        
        res.send({
            recipe_id: recipe._id,
            recipe_name: recipe.name,
            nutritional_info: recipe.nutritional_info || {},
            servings: recipe.serving_size,
            cost_per_serving: recipe.cost_per_serving
        });
    });
});

/**
 * Helper function to calculate recipe cost
 */
function calculateRecipeCost(ingredients, servingSize) {
    const totalCost = ingredients.reduce((sum, ingredient) => {
        const quantity = parseFloat(ingredient.quantity) || 0;
        const costPerUnit = parseFloat(ingredient.cost_per_unit) || 0;
        return sum + (quantity * costPerUnit);
    }, 0);
    
    const servings = parseInt(servingSize) || 1;
    return totalCost / servings;
}

/**
 * Function to scale recipe ingredients
 */
app.scaleRecipe = function(recipe, targetServings) {
    const scaleFactor = targetServings / recipe.serving_size;
    
    return {
        ...recipe,
        serving_size: targetServings,
        scaled_ingredients: recipe.ingredients.map(ingredient => ({
            ...ingredient,
            quantity: ingredient.quantity * scaleFactor,
            total_cost: ingredient.quantity * scaleFactor * ingredient.cost_per_unit
        })),
        total_cost: recipe.cost_per_serving * targetServings
    };
};

/**
 * Function to get recipes by menu item ID
 */
app.getRecipesByMenuItem = function(menuItemId, callback) {
    recipesDB.find({ menu_item_id: menuItemId }, callback);
};

/**
 * Function to deduct ingredients from inventory based on recipe usage
 */
app.deductInventoryForRecipe = function(recipeId, servings, inventoryDB, callback) {
    recipesDB.findOne({ _id: recipeId }, function(err, recipe) {
        if (err || !recipe) {
            return callback(err || new Error('Recipe not found'));
        }
        
        const scaleFactor = servings / recipe.serving_size;
        const ingredientDeductions = [];
        
        recipe.ingredients.forEach(ingredient => {
            const deduction = {
                ingredient_name: ingredient.ingredient_name,
                quantity: ingredient.quantity * scaleFactor,
                unit: ingredient.unit
            };
            ingredientDeductions.push(deduction);
        });
        
        // This would integrate with the inventory system's decrement function
        callback(null, ingredientDeductions);
    });
};

module.exports = app;