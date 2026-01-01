// Standalone script to manage Indian recipe data in NeDB
const fs = require('fs');
const path = require('path');
const Datastore = require('@seald-io/nedb');

// Set up environment variables for NeDB
process.env.APPDATA = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
process.env.APPNAME = 'PharmaMine';

// Database paths
const dbDir = path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases");
const recipesDbPath = path.join(dbDir, "recipes.db");
const recipeIngredientsDbPath = path.join(dbDir, "recipe_ingredients.db");

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Created database directory: ${dbDir}`);
}

// Initialize databases
const recipesDB = new Datastore({ filename: recipesDbPath, autoload: true });
const recipeIngredientsDB = new Datastore({ filename: recipeIngredientsDbPath, autoload: true });

console.log('=== Indian Recipe Database Management ===');
console.log('Database paths:');
console.log('- Recipes:', recipesDbPath);
console.log('- Recipe Ingredients:', recipeIngredientsDbPath);

// Function to check if database exists and has data
async function checkDatabaseStatus() {
    return new Promise((resolve) => {
        recipesDB.count({}, (err, count) => {
            if (err) {
                console.error('Error checking recipes database:', err);
                resolve({ recipesCount: 0, hasData: false });
            } else {
                console.log(`Current recipes in database: ${count}`);
                resolve({ recipesCount: count, hasData: count > 0 });
            }
        });
    });
}

// Function to remove existing recipe data
async function removeExistingRecipes() {
    console.log('\n--- Removing existing recipe data ---');
    
    return new Promise((resolve, reject) => {
        // Remove all recipes
        recipesDB.remove({}, { multi: true }, (err, numRemoved) => {
            if (err) {
                console.error('Error removing recipes:', err);
                reject(err);
                return;
            }
            
            console.log(`Removed ${numRemoved} recipes`);
            
            // Remove all recipe ingredients
            recipeIngredientsDB.remove({}, { multi: true }, (err, numRemoved) => {
                if (err) {
                    console.error('Error removing recipe ingredients:', err);
                    reject(err);
                    return;
                }
                
                console.log(`Removed ${numRemoved} recipe ingredients`);
                console.log('✓ All existing recipe data removed successfully');
                resolve();
            });
        });
    });
}

// Function to add Indian recipes
async function addIndianRecipes() {
    console.log('\n--- Adding Indian recipes ---');
    
    // Sample Indian recipes (200+ recipes would be here in the full implementation)
    const indianRecipes = [
        {
            name: "Butter Chicken",
            category: "Main Course - Non-Vegetarian",
            instructions: [
                "Marinate chicken in yogurt, ginger-garlic paste, and spices for 2 hours",
                "Grill or pan-fry chicken until cooked",
                "Prepare gravy with butter, tomatoes, cream, and spices",
                "Add chicken to gravy and simmer for 15 minutes",
                "Garnish with fresh cream and serve with naan"
            ],
            prep_time: 30,
            cook_time: 45,
            serving_size: 4,
            cost_per_serving: 8.50,
            yield_percentage: 95,
            difficulty_level: "medium",
            allergens: ["dairy"],
            dietary_info: ["non-vegetarian"],
            nutritional_info: {
                calories: 450,
                protein: 25,
                carbohydrates: 15,
                fat: 30
            }
        },
        {
            name: "Palak Paneer",
            category: "Main Course - Vegetarian",
            instructions: [
                "Blend spinach with green chilies and ginger",
                "Cook paneer cubes until golden",
                "Prepare gravy with spinach puree, tomatoes, and spices",
                "Add paneer and simmer for 10 minutes",
                "Serve hot with roti or rice"
            ],
            prep_time: 20,
            cook_time: 30,
            serving_size: 4,
            cost_per_serving: 6.50,
            yield_percentage: 90,
            difficulty_level: "easy",
            allergens: ["dairy"],
            dietary_info: ["vegetarian"],
            nutritional_info: {
                calories: 320,
                protein: 18,
                carbohydrates: 20,
                fat: 18
            }
        },
        {
            name: "Masala Chai",
            category: "Beverages",
            instructions: [
                "Boil water with tea leaves and spices (cardamom, ginger, cloves)",
                "Add milk and sugar",
                "Simmer for 5 minutes",
                "Strain and serve hot"
            ],
            prep_time: 5,
            cook_time: 10,
            serving_size: 1,
            cost_per_serving: 0.75,
            yield_percentage: 100,
            difficulty_level: "easy",
            allergens: ["dairy"],
            dietary_info: ["vegetarian"],
            nutritional_info: {
                calories: 80,
                protein: 3,
                carbohydrates: 10,
                fat: 3
            }
        }
    ];

    return new Promise((resolve, reject) => {
        let addedCount = 0;
        
        indianRecipes.forEach((recipe, index) => {
            // Add recipe
            recipesDB.insert(recipe, (err, newDoc) => {
                if (err) {
                    console.error(`Error adding recipe ${recipe.name}:`, err);
                    reject(err);
                    return;
                }
                
                addedCount++;
                console.log(`Added recipe: ${recipe.name} (ID: ${newDoc._id})`);
                
                // Add recipe ingredients (sample data)
                const ingredients = getSampleIngredients(recipe.name);
                ingredients.forEach(ingredient => {
                    recipeIngredientsDB.insert({
                        recipe_id: newDoc._id,
                        ingredient_name: ingredient.name,
                        quantity: ingredient.quantity,
                        unit: ingredient.unit,
                        cost_per_unit: ingredient.cost
                    }, (err, ingDoc) => {
                        if (err) {
                            console.error(`Error adding ingredient ${ingredient.name}:`, err);
                        }
                    });
                });
                
                if (addedCount === indianRecipes.length) {
                    console.log(`✓ Added ${addedCount} Indian recipes successfully`);
                    resolve();
                }
            });
        });
    });
}

// Function to get sample ingredients for a recipe
function getSampleIngredients(recipeName) {
    const ingredientMap = {
        "Butter Chicken": [
            { name: "Chicken", quantity: 500, unit: "g", cost: 0.02 },
            { name: "Butter", quantity: 50, unit: "g", cost: 0.05 },
            { name: "Tomatoes", quantity: 400, unit: "g", cost: 0.01 },
            { name: "Cream", quantity: 100, unit: "ml", cost: 0.03 },
            { name: "Spices", quantity: 20, unit: "g", cost: 0.02 }
        ],
        "Palak Paneer": [
            { name: "Spinach", quantity: 500, unit: "g", cost: 0.01 },
            { name: "Paneer", quantity: 250, unit: "g", cost: 0.04 },
            { name: "Tomatoes", quantity: 200, unit: "g", cost: 0.01 },
            { name: "Ghee", quantity: 30, unit: "g", cost: 0.06 },
            { name: "Spices", quantity: 15, unit: "g", cost: 0.02 }
        ],
        "Masala Chai": [
            { name: "Tea leaves", quantity: 5, unit: "g", cost: 0.02 },
            { name: "Milk", quantity: 200, unit: "ml", cost: 0.03 },
            { name: "Sugar", quantity: 20, unit: "g", cost: 0.01 },
            { name: "Cardamom", quantity: 2, unit: "pieces", cost: 0.01 },
            { name: "Ginger", quantity: 5, unit: "g", cost: 0.01 }
        ]
    };
    
    return ingredientMap[recipeName] || [];
}

// Function to verify the implementation
async function verifyImplementation() {
    console.log('\n--- Verifying implementation ---');
    
    return new Promise((resolve) => {
        recipesDB.count({}, (err, recipeCount) => {
            if (err) {
                console.error('Error counting recipes:', err);
                resolve(false);
                return;
            }
            
            recipeIngredientsDB.count({}, (err, ingredientCount) => {
                if (err) {
                    console.error('Error counting ingredients:', err);
                    resolve(false);
                    return;
                }
                
                console.log(`✓ Verification complete:`);
                console.log(`  - Recipes: ${recipeCount}`);
                console.log(`  - Recipe Ingredients: ${ingredientCount}`);
                
                // Show sample recipes
                recipesDB.find({}).limit(5).exec((err, recipes) => {
                    if (err) {
                        console.error('Error fetching sample recipes:', err);
                        resolve(false);
                        return;
                    }
                    
                    console.log('\nSample recipes added:');
                    recipes.forEach(recipe => {
                        console.log(`  - ${recipe.name} (${recipe.category})`);
                    });
                    
                    resolve(recipeCount > 0);
                });
            });
        });
    });
}

// Main execution function
async function main() {
    try {
        console.log('Starting Indian recipe database implementation...\n');
        
        // Check current status
        const status = await checkDatabaseStatus();
        
        if (status.hasData) {
            console.log('Existing recipe data found. Removing...');
            await removeExistingRecipes();
        } else {
            console.log('No existing recipe data found.');
        }
        
        // Add Indian recipes
        await addIndianRecipes();
        
        // Verify implementation
        const success = await verifyImplementation();
        
        if (success) {
            console.log('\n🎉 Indian recipe database implementation completed successfully!');
            console.log('You can now access the recipes through the POS system.');
        } else {
            console.log('\n❌ Implementation completed but verification failed.');
        }
        
    } catch (error) {
        console.error('\n❌ Error during implementation:', error);
    } finally {
        console.log('\n=== Implementation Complete ===');
    }
}

// Run the main function
main();