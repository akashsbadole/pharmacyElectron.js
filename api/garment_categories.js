const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const async = require("async");
const path = require("path");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "garment_categories.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

let garmentCategoryDB = getDatabase(dbPath);
garmentCategoryDB.ensureIndex({ fieldName: "_id", unique: true });
garmentCategoryDB.ensureIndex({ fieldName: "category_code", unique: true });

/**
 * GET endpoint: Get the welcome message for the Garment Category API.
 *
 * @param {Object} req  request object.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.get("/", function (req, res) {
    res.send("Garment Category API - Specialized for Clothing & Apparel");
});

/**
 * GET endpoint: Get all garment categories with hierarchical structure.
 *
 * @param {Object} req  request object.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.get("/all", function (req, res) {
    const includeInactive = req.query.includeInactive === 'true';
    let query = {};
    
    if (!includeInactive) {
        query = { "status.is_active": true };
    }

    garmentCategoryDB.find(query).sort({ parent_category: 1, sort_order: 1, name: 1 }, function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            // Build hierarchical structure
            const hierarchical = buildHierarchicalStructure(docs);
            res.send({
                categories: hierarchical,
                flat_list: docs,
                total_count: docs.length
            });
        }
    });
});

/**
 * GET endpoint: Get categories by parent category.
 *
 * @param {Object} req  request object with parent category as parameter.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.get("/by-parent/:parentCategory", function (req, res) {
    const parentCategory = req.params.parentCategory;
    
    garmentCategoryDB.find({ parent_category: parentCategory, "status.is_active": true })
        .sort({ sort_order: 1, name: 1 }, function (err, docs) {
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
 * GET endpoint: Get category details by category code.
 *
 * @param {Object} req  request object with category code as parameter.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.get("/code/:categoryCode", function (req, res) {
    const categoryCode = req.params.categoryCode;
    
    garmentCategoryDB.findOne({ category_code: categoryCode }, function (err, doc) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else if (!doc) {
            res.status(404).json({
                error: "Category not found",
                message: `No category found with code: ${categoryCode}`
            });
        } else {
            res.send(doc);
        }
    });
});

/**
 * POST endpoint: Create a new garment category.
 *
 * @param {Object} req  request object with new category data in the body.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.post("/category", function (req, res) {
    const categoryData = req.body;
    
    // Validate required fields
    if (!categoryData.name || !categoryData.category_code) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Category name and category code are required."
        });
    }

    // Generate unique ID
    categoryData._id = Math.floor(Date.now() / 1000);
    
    // Set default values
    categoryData.status = categoryData.status || {
        is_active: true,
        created_date: new Date().toISOString(),
        created_by: "system"
    };
    
    categoryData.sort_order = categoryData.sort_order || 0;
    categoryData.parent_category = categoryData.parent_category || null;

    garmentCategoryDB.insert(categoryData, function (err, category) {
        if (err) {
            console.error(err);
            if (err.errorType === 'uniqueViolated') {
                res.status(400).json({
                    error: "Duplicate Error",
                    message: "Category code already exists."
                });
            } else {
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            }
        } else {
            res.status(201).json({
                message: "Category created successfully",
                category: category
            });
        }
    });
});

/**
 * PUT endpoint: Update category details.
 *
 * @param {Object} req  request object with updated category data in the body.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.put("/category", function (req, res) {
    const categoryData = req.body;
    
    if (!categoryData._id) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Category ID is required for updates."
        });
    }

    // Add update metadata
    categoryData.status = categoryData.status || {};
    categoryData.status.last_modified = new Date().toISOString();
    categoryData.status.modified_by = "system";

    garmentCategoryDB.update(
        { _id: parseInt(categoryData._id) },
        { $set: categoryData },
        {},
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            } else if (numReplaced === 0) {
                res.status(404).json({
                    error: "Not Found",
                    message: "Category not found."
                });
            } else {
                res.json({
                    message: "Category updated successfully",
                    modified_count: numReplaced
                });
            }
        }
    );
});

/**
 * DELETE endpoint: Soft delete a category by setting is_active to false.
 *
 * @param {Object} req  request object with category ID as a parameter.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.delete("/category/:categoryId", function (req, res) {
    const categoryId = parseInt(req.params.categoryId);
    
    // Soft delete - just mark as inactive
    garmentCategoryDB.update(
        { _id: categoryId },
        { 
            $set: {
                "status.is_active": false,
                "status.last_modified": new Date().toISOString(),
                "status.modified_by": "system"
            }
        },
        {},
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            } else if (numReplaced === 0) {
                res.status(404).json({
                    error: "Not Found",
                    message: "Category not found."
                });
            } else {
                res.json({
                    message: "Category deactivated successfully",
                    deactivated_count: numReplaced
                });
            }
        }
    );
});

/**
 * POST endpoint: Initialize default garment categories.
 *
 * @param {Object} req  request object.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.post("/initialize-defaults", function (req, res) {
    initializeDefaultGarmentCategories()
        .then(result => {
            res.json({
                message: "Default garment categories initialized successfully",
                result: result
            });
        })
        .catch(error => {
            console.error('Error initializing default categories:', error);
            res.status(500).json({
                error: "Initialization Error",
                message: "Failed to initialize default categories",
                details: error.message
            });
        });
});

/**
 * GET endpoint: Get category tree for UI display.
 *
 * @param {Object} req  request object.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.get("/tree", function (req, res) {
    garmentCategoryDB.find({ "status.is_active": true })
        .sort({ parent_category: 1, sort_order: 1, name: 1 }, function (err, docs) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            } else {
                const tree = buildCategoryTree(docs);
                res.send(tree);
            }
        });
});

/**
 * Helper function to build hierarchical structure from flat list
 */
function buildHierarchicalStructure(categories) {
    const categoryMap = {};
    const rootCategories = [];

    // First pass: create map of all categories
    categories.forEach(category => {
        category.children = [];
        categoryMap[category._id] = category;
    });

    // Second pass: build hierarchy
    categories.forEach(category => {
        if (category.parent_category) {
            const parent = categoryMap[category.parent_category];
            if (parent) {
                parent.children.push(category);
            }
        } else {
            rootCategories.push(category);
        }
    });

    return rootCategories;
}

/**
 * Helper function to build category tree for UI
 */
function buildCategoryTree(categories) {
    const tree = [];
    const categoryMap = {};

    // Create map and initialize children array
    categories.forEach(category => {
        categoryMap[category.category_code] = {
            id: category._id,
            code: category.category_code,
            name: category.name,
            description: category.description,
            children: []
        };
    });

    // Build tree structure
    categories.forEach(category => {
        if (category.parent_category) {
            const parent = categoryMap[category.parent_category];
            if (parent) {
                parent.children.push(categoryMap[category.category_code]);
            }
        } else {
            tree.push(categoryMap[category.category_code]);
        }
    });

    return tree;
}

/**
 * Initialize default garment categories
 */
async function initializeDefaultGarmentCategories() {
    const defaultCategories = getDefaultGarmentCategories();
    let insertedCount = 0;
    let updatedCount = 0;

    for (const categoryData of defaultCategories) {
        try {
            // Check if category already exists
            const existing = await new Promise((resolve, reject) => {
                garmentCategoryDB.findOne({ category_code: categoryData.category_code }, (err, doc) => {
                    if (err) reject(err);
                    else resolve(doc);
                });
            });

            if (existing) {
                // Update existing category
                await new Promise((resolve, reject) => {
                    garmentCategoryDB.update(
                        { _id: existing._id },
                        { $set: categoryData },
                        {},
                        (err) => {
                            if (err) reject(err);
                            else {
                                updatedCount++;
                                resolve();
                            }
                        }
                    );
                });
            } else {
                // Insert new category
                categoryData._id = Math.floor(Date.now() / 1000) + insertedCount + updatedCount;
                categoryData.status = {
                    is_active: true,
                    created_date: new Date().toISOString(),
                    created_by: "system"
                };

                await new Promise((resolve, reject) => {
                    garmentCategoryDB.insert(categoryData, (err) => {
                        if (err) reject(err);
                        else {
                            insertedCount++;
                            resolve();
                        }
                    });
                });
            }
        } catch (error) {
            console.error(`Error processing category ${categoryData.category_code}:`, error);
        }
    }

    return {
        inserted: insertedCount,
        updated: updatedCount,
        total: insertedCount + updatedCount
    };
}

/**
 * Define default garment categories structure
 */
function getDefaultGarmentCategories() {
    return [
        // Main Categories
        {
            category_code: "MENS",
            name: "Men's Clothing",
            description: "All clothing items for men",
            parent_category: null,
            sort_order: 1,
            category_type: "main",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["XS", "S", "M", "L", "XL", "XXL"],
                common_colors: ["Black", "White", "Navy", "Gray", "Brown"],
                size_chart: "mens_standard"
            },
            seo_metadata: {
                slug: "mens-clothing",
                meta_title: "Men's Clothing",
                meta_description: "Shop the latest men's clothing trends"
            }
        },
        {
            category_code: "WOMENS",
            name: "Women's Clothing",
            description: "All clothing items for women",
            parent_category: null,
            sort_order: 2,
            category_type: "main",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["XS", "S", "M", "L", "XL", "XXL"],
                common_colors: ["Black", "White", "Navy", "Gray", "Brown", "Pink", "Red"],
                size_chart: "womens_standard"
            },
            seo_metadata: {
                slug: "womens-clothing",
                meta_title: "Women's Clothing",
                meta_description: "Discover the latest women's fashion trends"
            }
        },
        {
            category_code: "KIDS",
            name: "Children's Clothing",
            description: "Clothing items for children and toddlers",
            parent_category: null,
            sort_order: 3,
            category_type: "main",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["2T", "3T", "4T", "5T", "6", "7", "8", "10", "12", "14"],
                common_colors: ["Black", "White", "Navy", "Gray", "Brown", "Pink", "Red", "Blue"],
                size_chart: "kids_standard"
            },
            seo_metadata: {
                slug: "kids-clothing",
                meta_title: "Children's Clothing",
                meta_description: "Comfortable and stylish clothing for children"
            }
        },
        {
            category_code: "ACCESSORIES",
            name: "Accessories",
            description: "Fashion accessories and add-ons",
            parent_category: null,
            sort_order: 4,
            category_type: "main",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["One Size"],
                common_colors: ["Black", "White", "Brown", "Gold", "Silver"],
                size_chart: "accessories_standard"
            },
            seo_metadata: {
                slug: "accessories",
                meta_title: "Fashion Accessories",
                meta_description: "Complete your look with our fashion accessories"
            }
        },
        {
            category_code: "FOOTWEAR",
            name: "Footwear",
            description: "Shoes, boots, and footwear",
            parent_category: null,
            sort_order: 5,
            category_type: "main",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12"],
                common_colors: ["Black", "White", "Brown", "Tan", "Navy"],
                size_chart: "footwear_standard"
            },
            seo_metadata: {
                slug: "footwear",
                meta_title: "Footwear",
                meta_description: "Find the perfect shoes for every occasion"
            }
        },

        // Men's Subcategories
        {
            category_code: "MENS_TOPS",
            name: "Men's Tops",
            description: "Shirts, t-shirts, and tops for men",
            parent_category: "MENS",
            sort_order: 1,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["XS", "S", "M", "L", "XL", "XXL"],
                common_colors: ["Black", "White", "Navy", "Gray", "Brown", "Blue", "Green"],
                size_chart: "mens_tops"
            }
        },
        {
            category_code: "MENS_BOTTOMS",
            name: "Men's Bottoms",
            description: "Pants, jeans, and shorts for men",
            parent_category: "MENS",
            sort_order: 2,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["28", "30", "32", "34", "36", "38", "40", "42"],
                common_colors: ["Black", "Blue", "Navy", "Gray", "Khaki", "Brown"],
                size_chart: "mens_bottoms"
            }
        },
        {
            category_code: "MENS_OUTERWEAR",
            name: "Men's Outerwear",
            description: "Jackets, coats, and outerwear for men",
            parent_category: "MENS",
            sort_order: 3,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["XS", "S", "M", "L", "XL", "XXL"],
                common_colors: ["Black", "Navy", "Gray", "Brown", "Olive"],
                size_chart: "mens_outerwear"
            }
        },
        {
            category_code: "MENS_UNDERWEAR",
            name: "Men's Underwear",
            description: "Underwear and innerwear for men",
            parent_category: "MENS",
            sort_order: 4,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["XS", "S", "M", "L", "XL"],
                common_colors: ["Black", "White", "Gray", "Navy"],
                size_chart: "mens_underwear"
            }
        },

        // Women's Subcategories
        {
            category_code: "WOMENS_TOPS",
            name: "Women's Tops",
            description: "Blouses, t-shirts, and tops for women",
            parent_category: "WOMENS",
            sort_order: 1,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["XS", "S", "M", "L", "XL", "XXL"],
                common_colors: ["Black", "White", "Pink", "Red", "Blue", "Gray", "Navy"],
                size_chart: "womens_tops"
            }
        },
        {
            category_code: "WOMENS_BOTTOMS",
            name: "Women's Bottoms",
            description: "Pants, jeans, skirts, and shorts for women",
            parent_category: "WOMENS",
            sort_order: 2,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["0", "2", "4", "6", "8", "10", "12", "14", "16"],
                common_colors: ["Black", "Blue", "Navy", "Gray", "Khaki", "White"],
                size_chart: "womens_bottoms"
            }
        },
        {
            category_code: "WOMENS_DRESSES",
            name: "Women's Dresses",
            description: "Dresses for all occasions",
            parent_category: "WOMENS",
            sort_order: 3,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["XS", "S", "M", "L", "XL", "XXL"],
                common_colors: ["Black", "White", "Pink", "Red", "Blue", "Navy", "Green"],
                size_chart: "womens_dresses"
            }
        },
        {
            category_code: "WOMENS_OUTERWEAR",
            name: "Women's Outerwear",
            description: "Jackets, coats, and outerwear for women",
            parent_category: "WOMENS",
            sort_order: 4,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["XS", "S", "M", "L", "XL", "XXL"],
                common_colors: ["Black", "Navy", "Gray", "Brown", "Camel"],
                size_chart: "womens_outerwear"
            }
        },
        {
            category_code: "WOMENS_UNDERWEAR",
            name: "Women's Underwear",
            description: "Bras, panties, and lingerie",
            parent_category: "WOMENS",
            sort_order: 5,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["32A", "32B", "32C", "34A", "34B", "34C", "36A", "36B", "36C", "38B", "38C"],
                common_colors: ["Black", "White", "Gray", "Nude", "Pink"],
                size_chart: "womens_underwear"
            }
        },

        // Kids Subcategories
        {
            category_code: "KIDS_BABY",
            name: "Baby Clothing",
            description: "Clothing for babies (0-24 months)",
            parent_category: "KIDS",
            sort_order: 1,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["0-3M", "3-6M", "6-9M", "9-12M", "12-18M", "18-24M"],
                common_colors: ["White", "Pink", "Blue", "Yellow", "Green"],
                size_chart: "baby_clothing"
            }
        },
        {
            category_code: "KIDS_TODDLER",
            name: "Toddler Clothing",
            description: "Clothing for toddlers (2-5 years)",
            parent_category: "KIDS",
            sort_order: 2,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["2T", "3T", "4T", "5T"],
                common_colors: ["Red", "Blue", "Green", "Yellow", "Purple", "Pink"],
                size_chart: "toddler_clothing"
            }
        },
        {
            category_code: "KIDS_YOUTH",
            name: "Youth Clothing",
            description: "Clothing for older children (6-14 years)",
            parent_category: "KIDS",
            sort_order: 3,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["6", "7", "8", "10", "12", "14"],
                common_colors: ["Black", "Blue", "Red", "Green", "Gray", "Navy"],
                size_chart: "youth_clothing"
            }
        },

        // Accessories Subcategories
        {
            category_code: "BAGS",
            name: "Bags & Luggage",
            description: "Handbags, backpacks, and luggage",
            parent_category: "ACCESSORIES",
            sort_order: 1,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["One Size", "Small", "Medium", "Large"],
                common_colors: ["Black", "Brown", "Tan", "Navy", "Gray"],
                size_chart: "bags_luggage"
            }
        },
        {
            category_code: "JEWELRY",
            name: "Jewelry",
            description: "Necklaces, rings, bracelets, and earrings",
            parent_category: "ACCESSORIES",
            sort_order: 2,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["One Size"],
                common_colors: ["Gold", "Silver", "Rose Gold", "Black", "White"],
                size_chart: "jewelry"
            }
        },
        {
            category_code: "WATCHES",
            name: "Watches",
            description: "Timepieces and watches",
            parent_category: "ACCESSORIES",
            sort_order: 3,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["Small", "Medium", "Large"],
                common_colors: ["Silver", "Gold", "Black", "Brown", "Rose Gold"],
                size_chart: "watches"
            }
        },
        {
            category_code: "HATS",
            name: "Hats & Caps",
            description: "Headwear and accessories",
            parent_category: "ACCESSORIES",
            sort_order: 4,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["One Size", "Small", "Medium", "Large"],
                common_colors: ["Black", "Brown", "Navy", "Gray", "Khaki"],
                size_chart: "hats_caps"
            }
        },
        {
            category_code: "SCARVES",
            name: "Scarves",
            description: "Scarves and neckwear",
            parent_category: "ACCESSORIES",
            sort_order: 5,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["One Size"],
                common_colors: ["Black", "Gray", "Navy", "Red", "Pink", "Green"],
                size_chart: "scarves"
            }
        },

        // Footwear Subcategories
        {
            category_code: "CASUAL_SHOES",
            name: "Casual Shoes",
            description: "Everyday casual footwear",
            parent_category: "FOOTWEAR",
            sort_order: 1,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12"],
                common_colors: ["Black", "White", "Brown", "Navy", "Gray"],
                size_chart: "casual_shoes"
            }
        },
        {
            category_code: "DRESS_SHOES",
            name: "Dress Shoes",
            description: "Formal and dress shoes",
            parent_category: "FOOTWEAR",
            sort_order: 2,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12"],
                common_colors: ["Black", "Brown", "Tan", "Cognac"],
                size_chart: "dress_shoes"
            }
        },
        {
            category_code: "ATHLETIC_SHOES",
            name: "Athletic Shoes",
            description: "Sports and athletic footwear",
            parent_category: "FOOTWEAR",
            sort_order: 3,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12"],
                common_colors: ["Black", "White", "Gray", "Blue", "Red", "Navy"],
                size_chart: "athletic_shoes"
            }
        },
        {
            category_code: "BOOTS",
            name: "Boots",
            description: "All types of boots",
            parent_category: "FOOTWEAR",
            sort_order: 4,
            category_type: "sub",
            garment_specific: {
                has_sizes: true,
                has_colors: true,
                has_materials: true,
                common_sizes: ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12"],
                common_colors: ["Black", "Brown", "Tan", "Cognac", "Navy"],
                size_chart: "boots"
            }
        }
    ];
}