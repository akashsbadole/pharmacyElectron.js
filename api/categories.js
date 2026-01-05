const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore =  require('@seald-io/nedb');
const async = require("async");
const path = require("path");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "categories.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

let categoryDB = getDatabase(dbPath);
categoryDB.ensureIndex({ fieldName: "_id", unique: true });

/**
 * GET endpoint: Get the welcome message for the Category API.
 *
 * @param {Object} req  request object.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.get("/", function (req, res) {
    res.send("Category API");
});

/**
 * GET endpoint: Get details of all categories.
 *
 * @param {Object} req  request object.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.get("/all", function (req, res) {
    categoryDB.find({}, function (err, docs) {
        res.send(docs);
    });
});

/**
 * POST endpoint: Create a new category.
 *
 * @param {Object} req  request object with new category data in the body.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.post("/category", function (req, res) {
    let newCategory = req.body;
    
    // Validate required fields
    if (!newCategory || !newCategory.name || newCategory.name.trim() === "") {
        return res.status(400).json({
            success: false,
            error: "Validation Error",
            message: "Category name is required and cannot be empty."
        });
    }
    
    // Trim whitespace from name
    newCategory.name = newCategory.name.trim();
    
    // Check for duplicate category name (case-insensitive)
    categoryDB.findOne({ name: { $regex: new RegExp('^' + newCategory.name + '$', 'i') } }, function (err, existingCategory) {
        if (err) {
            console.error('Database error while checking for duplicate category:', err);
            return res.status(500).json({
                success: false,
                error: "Database Error",
                message: "Failed to check for duplicate category name."
            });
        }
        
        if (existingCategory) {
            return res.status(409).json({
                success: false,
                error: "Duplicate Category",
                message: "A category with this name already exists."
            });
        }
        
        // Proceed with insertion
        newCategory._id = Math.floor(Date.now() / 1000);
        newCategory.createdAt = new Date().toISOString();
        
        categoryDB.insert(newCategory, function (err, category) {
            if (err) {
                console.error('Database error while inserting category:', err);
                return res.status(500).json({
                    success: false,
                    error: "Database Error",
                    message: "Failed to create category. Please try again."
                });
            }
            
            // Return success response with created category data
            res.status(201).json({
                success: true,
                message: "Category created successfully.",
                category: category
            });
        });
    });
});

/**
 * DELETE endpoint: Delete a category by category ID.
 *
 * @param {Object} req  request object with category ID as a parameter.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.delete("/category/:categoryId", function (req, res) {
    categoryDB.remove(
        {
            _id: parseInt(req.params.categoryId),
        },
        function (err, numRemoved) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "An unexpected error occurred.",
                    });
                }
            else{res.sendStatus(200);}
        },
    );
});

/**
 * PUT endpoint: Update category details.
 *
 * @param {Object} req  request object with updated category data in the body.
 * @param {Object} res  response object.
 * @returns {void}
 */
app.put("/category", function (req, res) {
    categoryDB.update(
        {
            _id: parseInt(req.body.id),
        },
        req.body,
        {},
        function (err, numReplaced, category) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "An unexpected error occurred.",
                    });
                }
            else{res.sendStatus(200);}
        },
    );
});
