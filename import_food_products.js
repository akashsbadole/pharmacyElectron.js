const fs = require('fs');
const path = require('path');

// Import the inventory API module
const inventoryAPI = require('./api/inventory');

// Application configuration
const appName = process.env.APPNAME || "foodMine";
const appData = process.env.APPDATA || path.join(process.env.HOMEPATH, "AppData", "Roaming");

console.log('=== IMPORTING FOOD PRODUCTS ===');
console.log('Database path:', path.join(appData, appName, "server", "databases", "inventory.db"));

// Create a mock request object for the import
const mockReq = {
    file: {
        buffer: fs.readFileSync('./food_products_import.csv'),
        originalname: 'food_products_import.csv',
        mimetype: 'text/csv'
    },
    query: {
        action: 'replace' // Replace existing data
    }
};

// Create a mock response object
const mockRes = {
    status: function(code) {
        console.log(`HTTP Status: ${code}`);
        return this;
    },
    json: function(data) {
        console.log('Import Result:', JSON.stringify(data, null, 2));
        
        if (data.summary) {
            console.log('\n=== IMPORT SUMMARY ===');
            console.log(`Total rows processed: ${data.summary.totalRows}`);
            console.log(`Successful imports: ${data.summary.successful}`);
            console.log(`Duplicates: ${data.summary.duplicates}`);
            console.log(`Errors: ${data.summary.errors}`);
            
            if (data.results && data.results.success) {
                console.log('\n=== SUCCESSFULLY IMPORTED PRODUCTS ===');
                data.results.success.forEach((result, index) => {
                    console.log(`${index + 1}. ${result.data['Product Name']} - ${result.data.Category}`);
                });
            }
        }
        
        return this;
    },
    send: function(data) {
        console.log('Response:', data);
        return this;
    }
};

// Test the import functionality
console.log('Starting CSV import...');

// Since the import endpoint is POST /import/csv, we need to simulate that
// Let's directly call the import logic from the inventory API

try {
    // Access the inventory database directly
    const inventoryDB = inventoryAPI.inventoryDB;
    
    if (!inventoryDB) {
        console.error('Inventory database not available');
        process.exit(1);
    }
    
    console.log('Database connected successfully');
    
    // Clear existing data first
    inventoryDB.remove({}, { multi: true }, (err, numRemoved) => {
        if (err) {
            console.error('Error clearing existing data:', err);
            return;
        }
        
        console.log(`Cleared ${numRemoved} existing products`);
        
        // Now import the CSV data
        const csvData = fs.readFileSync('./food_products_import.csv', 'utf-8');
        const lines = csvData.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            console.error('Invalid CSV file - must contain header and data');
            return;
        }
        
        console.log(`Processing ${lines.length - 1} products from CSV...`);
        
        // Parse CSV header
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, '').replace(/\s+/g, ''));
        
        // Create header mapping for restaurant schema
        const headerMap = {
            'productname': 'name',
            'name': 'name',
            'barcodesku': 'barcode',
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
            'requiresscription': 'requires_prescription',
            'supplierid': 'supplierid',
            'supplier': 'supplierid',
            'reorderquantity': 'reorderquantity',
            'reorder': 'reorderquantity',
            'imagefile': 'image',
            'image': 'image'
        };
        
        const importResults = {
            success: [],
            errors: [],
            duplicates: [],
            totalProcessed: 0
        };
        
        let processedCount = 0;
        const totalRows = lines.length - 1;
        
        function checkCompletion() {
            if (processedCount >= totalRows) {
                console.log('\n=== IMPORT COMPLETE ===');
                console.log(`Total processed: ${importResults.totalProcessed}`);
                console.log(`Successful: ${importResults.success.length}`);
                console.log(`Duplicates: ${importResults.duplicates.length}`);
                console.log(`Errors: ${importResults.errors.length}`);
                
                // Verify the import
                verifyImport();
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
                    name: productData.name,
                    barcode: productData.barcode ? parseInt(productData.barcode) : null,
                    price: productData.price,
                    cost: productData.cost || productData.price,
                    category: productData.category || 'General',
                    quantity: productData.quantity ? parseInt(productData.quantity) : 0,
                    stock: productData.stock && productData.stock.toLowerCase().includes('disable') ? 0 : 1,
                    minStock: productData.minstock ? parseInt(productData.minstock) : 1,
                    expirationDate: productData.expirationdate || '',
                    available: productData.available && productData.available.toLowerCase() === 'yes' ? true : false,
                    supplierId: productData.supplierid || null,
                    reorderQuantity: productData.reorderquantity ? parseInt(productData.reorderquantity) : 0,
                    img: productData.image || '',
                    alertHistory: [],
                    lastRestocked: null
                };
                
                // Check for duplicates by barcode or name
                const query = product.barcode ? { barcode: product.barcode } : { name: product.name };
                
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
                        if (mockReq.query.action === 'update' || mockReq.query.action === 'replace') {
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
        
    });
    
} catch (error) {
    console.error('Import failed:', error);
}

function verifyImport() {
    console.log('\n=== VERIFYING IMPORT ===');
    
    const inventoryDB = inventoryAPI.inventoryDB;
    
    inventoryDB.count({}, (err, count) => {
        if (err) {
            console.error('Error counting products:', err);
            return;
        }
        
        console.log(`Total products in database: ${count}`);
        
        if (count > 0) {
            inventoryDB.find({}).limit(10).exec((err, docs) => {
                if (err) {
                    console.error('Error retrieving products:', err);
                    return;
                }
                
                console.log('\n=== SAMPLE PRODUCTS ===');
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
            });
        }
    });
}