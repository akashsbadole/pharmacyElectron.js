const Datastore = require("@seald-io/nedb");
const path = require("path");
const fs = require("fs");

// Application configuration
const appName = "foodMine";
const appData = path.join(process.env.USERPROFILE || process.env.HOME, "AppData", "Roaming");

// Database path
const dbPath = path.join(appData, appName, "server", "databases", "inventory.db");

console.log('=== DIRECT FOOD PRODUCT IMPORT ===');
console.log("Database path:", dbPath);

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log("Created database directory:", dbDir);
}

// Initialize database
const inventoryDB = new Datastore({ 
    filename: dbPath, 
    autoload: true,
    timestampData: true
});

// Food products data
const foodProducts = [
    {
        name: "Margherita Pizza",
        barcode: 1000000000001,
        price: "12.99",
        cost: "6.50",
        category: "Fast Food",
        quantity: 50,
        stock: 1,
        minStock: 10,
        expirationDate: "2025-01-31",
        available: true,
        preparation_time: 15,
        dietary_info: ["Vegetarian"],
        allergens: ["Gluten", "Dairy"],
        kitchen_station: "Oven",
        is_combo: false,
        seasonal_item: false,
        popularity_score: 85,
        supplierId: "SUP-001",
        reorderQuantity: 30,
        img: "margherita_pizza.jpg"
    },
    {
        name: "Pepperoni Pizza",
        barcode: 1000000000002,
        price: "14.99",
        cost: "7.25",
        category: "Fast Food",
        quantity: 45,
        stock: 1,
        minStock: 8,
        expirationDate: "2025-01-31",
        available: true,
        preparation_time: 15,
        dietary_info: [],
        allergens: ["Gluten", "Dairy", "Pork"],
        kitchen_station: "Oven",
        is_combo: false,
        seasonal_item: false,
        popularity_score: 92,
        supplierId: "SUP-001",
        reorderQuantity: 25,
        img: "pepperoni_pizza.jpg"
    },
    {
        name: "Chicken Burger",
        barcode: 1000000000003,
        price: "9.99",
        cost: "4.75",
        category: "Fast Food",
        quantity: 60,
        stock: 1,
        minStock: 15,
        expirationDate: "2025-01-31",
        available: true,
        preparation_time: 10,
        dietary_info: [],
        allergens: ["Gluten", "Dairy"],
        kitchen_station: "Grill",
        is_combo: false,
        seasonal_item: false,
        popularity_score: 88,
        supplierId: "SUP-002",
        reorderQuantity: 40,
        img: "chicken_burger.jpg"
    },
    {
        name: "Beef Burger",
        barcode: 1000000000004,
        price: "11.99",
        cost: "5.50",
        category: "Fast Food",
        quantity: 55,
        stock: 1,
        minStock: 12,
        expirationDate: "2025-01-31",
        available: true,
        preparation_time: 12,
        dietary_info: [],
        allergens: ["Gluten", "Dairy", "Beef"],
        kitchen_station: "Grill",
        is_combo: false,
        seasonal_item: false,
        popularity_score: 90,
        supplierId: "SUP-002",
        reorderQuantity: 35,
        img: "beef_burger.jpg"
    },
    {
        name: "French Fries",
        barcode: 1000000000005,
        price: "4.99",
        cost: "1.75",
        category: "Fast Food",
        quantity: 100,
        stock: 1,
        minStock: 20,
        expirationDate: "2025-01-31",
        available: true,
        preparation_time: 5,
        dietary_info: ["Vegetarian", "Vegan"],
        allergens: [],
        kitchen_station: "Fryer",
        is_combo: true,
        seasonal_item: false,
        popularity_score: 95,
        supplierId: "SUP-003",
        reorderQuantity: 50,
        img: "french_fries.jpg"
    },
    {
        name: "Coca-Cola (330ml)",
        barcode: 2000000000001,
        price: "2.50",
        cost: "0.80",
        category: "Beverages",
        quantity: 200,
        stock: 1,
        minStock: 50,
        expirationDate: "2025-06-30",
        available: true,
        preparation_time: 1,
        dietary_info: ["Vegetarian", "Vegan"],
        allergens: [],
        kitchen_station: "Beverage",
        is_combo: true,
        seasonal_item: false,
        popularity_score: 90,
        supplierId: "SUP-005",
        reorderQuantity: 100,
        img: "coca_cola.jpg"
    },
    {
        name: "Pepsi (330ml)",
        barcode: 2000000000002,
        price: "2.50",
        cost: "0.80",
        category: "Beverages",
        quantity: 180,
        stock: 1,
        minStock: 40,
        expirationDate: "2025-06-30",
        available: true,
        preparation_time: 1,
        dietary_info: ["Vegetarian", "Vegan"],
        allergens: [],
        kitchen_station: "Beverage",
        is_combo: true,
        seasonal_item: false,
        popularity_score: 85,
        supplierId: "SUP-005",
        reorderQuantity: 90,
        img: "pepsi.jpg"
    },
    {
        name: "Fresh Orange Juice",
        barcode: 2000000000004,
        price: "4.99",
        cost: "1.50",
        category: "Beverages",
        quantity: 80,
        stock: 1,
        minStock: 20,
        expirationDate: "2025-01-15",
        available: true,
        preparation_time: 3,
        dietary_info: ["Vegetarian", "Vegan", "Gluten-Free"],
        allergens: [],
        kitchen_station: "Beverage",
        is_combo: false,
        seasonal_item: true,
        popularity_score: 78,
        supplierId: "SUP-006",
        reorderQuantity: 40,
        img: "orange_juice.jpg"
    },
    {
        name: "Nachos with Cheese",
        barcode: 3000000000001,
        price: "7.99",
        cost: "2.75",
        category: "Snacks",
        quantity: 40,
        stock: 1,
        minStock: 8,
        expirationDate: "2025-01-28",
        available: true,
        preparation_time: 8,
        dietary_info: ["Vegetarian"],
        allergens: ["Gluten", "Dairy"],
        kitchen_station: "Snack",
        is_combo: false,
        seasonal_item: false,
        popularity_score: 75,
        supplierId: "SUP-008",
        reorderQuantity: 25,
        img: "nachos.jpg"
    },
    {
        name: "Chicken Nuggets (8 pcs)",
        barcode: 3000000000003,
        price: "6.99",
        cost: "2.50",
        category: "Snacks",
        quantity: 45,
        stock: 1,
        minStock: 9,
        expirationDate: "2025-01-30",
        available: true,
        preparation_time: 10,
        dietary_info: [],
        allergens: ["Gluten", "Chicken"],
        kitchen_station: "Fryer",
        is_combo: true,
        seasonal_item: false,
        popularity_score: 85,
        supplierId: "SUP-004",
        reorderQuantity: 25,
        img: "chicken_nuggets.jpg"
    },
    {
        name: "Chocolate Brownie",
        barcode: 4000000000001,
        price: "4.99",
        cost: "1.75",
        category: "Desserts",
        quantity: 40,
        stock: 1,
        minStock: 8,
        expirationDate: "2025-01-20",
        available: true,
        preparation_time: 5,
        dietary_info: ["Vegetarian"],
        allergens: ["Gluten", "Dairy", "Eggs"],
        kitchen_station: "Dessert",
        is_combo: false,
        seasonal_item: false,
        popularity_score: 90,
        supplierId: "SUP-011",
        reorderQuantity: 25,
        img: "brownie.jpg"
    },
    {
        name: "Ice Cream (Vanilla)",
        barcode: 4000000000002,
        price: "3.99",
        cost: "1.25",
        category: "Desserts",
        quantity: 50,
        stock: 1,
        minStock: 10,
        expirationDate: "2025-03-31",
        available: true,
        preparation_time: 2,
        dietary_info: ["Vegetarian"],
        allergens: ["Dairy"],
        kitchen_station: "Dessert",
        is_combo: false,
        seasonal_item: false,
        popularity_score: 85,
        supplierId: "SUP-012",
        reorderQuantity: 30,
        img: "vanilla_ice_cream.jpg"
    },
    {
        name: "Butter Chicken",
        barcode: 5000000000001,
        price: "14.99",
        cost: "6.00",
        category: "Indian Cuisine",
        quantity: 40,
        stock: 1,
        minStock: 8,
        expirationDate: "2025-01-16",
        available: true,
        preparation_time: 20,
        dietary_info: [],
        allergens: ["Dairy"],
        kitchen_station: "Indian",
        is_combo: false,
        seasonal_item: false,
        popularity_score: 95,
        supplierId: "SUP-014",
        reorderQuantity: 25,
        img: "butter_chicken.jpg"
    },
    {
        name: "Chicken Biryani",
        barcode: 5000000000004,
        price: "12.99",
        cost: "5.00",
        category: "Indian Cuisine",
        quantity: 45,
        stock: 1,
        minStock: 9,
        expirationDate: "2025-01-16",
        available: true,
        preparation_time: 25,
        dietary_info: [],
        allergens: [],
        kitchen_station: "Indian",
        is_combo: false,
        seasonal_item: false,
        popularity_score: 94,
        supplierId: "SUP-016",
        reorderQuantity: 30,
        img: "chicken_biryani.jpg"
    },
    {
        name: "Naan Bread",
        barcode: 5000000000006,
        price: "3.99",
        cost: "1.25",
        category: "Indian Cuisine",
        quantity: 80,
        stock: 1,
        minStock: 16,
        expirationDate: "2025-01-18",
        available: true,
        preparation_time: 8,
        dietary_info: ["Vegetarian"],
        allergens: ["Gluten", "Dairy"],
        kitchen_station: "Indian",
        is_combo: true,
        seasonal_item: false,
        popularity_score: 90,
        supplierId: "SUP-017",
        reorderQuantity: 40,
        img: "naan_bread.jpg"
    },
    {
        name: "Classic Burger Combo",
        barcode: 6000000000001,
        price: "14.99",
        cost: "6.75",
        category: "Combo Meals",
        quantity: 50,
        stock: 1,
        minStock: 10,
        expirationDate: "2025-01-31",
        available: true,
        preparation_time: 15,
        dietary_info: [],
        allergens: ["Gluten", "Dairy"],
        kitchen_station: "Combo",
        is_combo: true,
        seasonal_item: false,
        popularity_score: 95,
        supplierId: "SUP-002",
        reorderQuantity: 30,
        img: "burger_combo.jpg"
    },
    {
        name: "Full English Breakfast",
        barcode: 7000000000001,
        price: "12.99",
        cost: "5.00",
        category: "Breakfast",
        quantity: 30,
        stock: 1,
        minStock: 6,
        expirationDate: "2025-01-15",
        available: true,
        preparation_time: 20,
        dietary_info: [],
        allergens: ["Gluten", "Dairy", "Eggs", "Pork"],
        kitchen_station: "Breakfast",
        is_combo: false,
        seasonal_item: false,
        popularity_score: 85,
        supplierId: "SUP-018",
        reorderQuantity: 20,
        img: "english_breakfast.jpg"
    }
];

// Set up database event handlers
inventoryDB.on('ready', () => {
    console.log('Database is ready. Clearing existing data...');
    
    // Clear existing data first
    inventoryDB.remove({}, { multi: true }, (err, numRemoved) => {
        if (err) {
            console.error('Error clearing existing data:', err);
            return;
        }
        
        console.log(`Cleared ${numRemoved} existing products.`);
        
        // Insert new products
        let insertedCount = 0;
        let errorCount = 0;
        
        console.log(`Inserting ${foodProducts.length} food products...`);
        
        foodProducts.forEach((product, index) => {
            const productData = {
                ...product,
                _id: Math.floor(Date.now() / 1000) + index
            };
            
            inventoryDB.insert(productData, (err, newDoc) => {
                if (err) {
                    console.error(`Error inserting product ${product.name}:`, err);
                    errorCount++;
                } else {
                    console.log(`✓ Inserted: ${product.name} (ID: ${newDoc._id})`);
                    insertedCount++;
                }
                
                // Check if all products have been processed
                if (insertedCount + errorCount === foodProducts.length) {
                    console.log(`\n=== INSERTION COMPLETE ===`);
                    console.log(`Successfully inserted: ${insertedCount} products`);
                    console.log(`Failed to insert: ${errorCount} products`);
                    console.log(`Total products: ${foodProducts.length}`);
                    
                    // Verify the data
                    verifyDatabase();
                }
            });
        });
    });
});

inventoryDB.on('error', (err) => {
    console.error('Database error:', err);
});

function verifyDatabase() {
    console.log('\n=== VERIFYING DATABASE CONTENTS ===');
    
    inventoryDB.count({}, (err, count) => {
        if (err) {
            console.error('Error counting products:', err);
            return;
        }
        
        console.log(`Total products in database: ${count}`);
        
        if (count > 0) {
            inventoryDB.find({}).exec((err, docs) => {
                if (err) {
                    console.error('Error retrieving products:', err);
                    return;
                }
                
                console.log('\n=== ALL PRODUCTS ===');
                docs.forEach(doc => {
                    console.log(`- ${doc.name} (${doc.category}) - $${doc.price} - Stock: ${doc.quantity} - Barcode: ${doc.barcode}`);
                });
                
                // Group by category
                const categories = {};
                docs.forEach(doc => {
                    categories[doc.category] = (categories[doc.category] || 0) + 1;
                });
                
                console.log('\n=== CATEGORY BREAKDOWN ===');
                Object.entries(categories).forEach(([category, count]) => {
                    console.log(`${category}: ${count} products`);
                });
                
                console.log('\n✅ Food product database successfully created!');
                console.log('The POS interface should now display food products instead of pharmaceuticals.');
                console.log(`Database file: ${dbPath}`);
            });
        } else {
            console.log('No products found in database.');
        }
    });
}

console.log('Starting database initialization...');