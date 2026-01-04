#!/usr/bin/env node

/**
 * Direct Garment Product Import Script
 * Imports sample garment products directly to NeDB database
 */

const fs = require('fs');
const csv = require('csv-parser');
const Datastore = require('@seald-io/nedb');
const path = require('path');

class DirectGarmentImporter {
    constructor() {
        // Database path - matching the server configuration
        const appData = process.env.APPDATA || 'C:\\Users\\akash\\AppData\\Roaming\\retailspos';
        const appName = process.env.APPNAME || 'retailspos';
        this.dbPath = path.join(appData, appName, 'server', 'databases', 'inventory.db');
        
        this.inventoryDB = new Datastore({ 
            filename: this.dbPath, 
            autoload: true,
            timestampData: true 
        });
        
        this.importedCount = 0;
        this.errorCount = 0;
        this.errors = [];
    }

    async loadCsvData(csvFile) {
        return new Promise((resolve, reject) => {
            const products = [];
            
            fs.createReadStream(csvFile)
                .pipe(csv())
                .on('data', (row) => products.push(row))
                .on('end', () => {
                    console.log(`✓ Loaded ${products.length} products from ${csvFile}`);
                    resolve(products);
                })
                .on('error', (error) => {
                    console.log(`✗ Error loading CSV: ${error.message}`);
                    reject(error);
                });
        });
    }

    parseGarmentData(row) {
        // Parse sizes (comma-separated)
        const sizes = row['Sizes'] ? row['Sizes'].split(',').map(size => size.trim()).filter(Boolean) : [];
        
        // Parse colors (comma-separated)
        const colors = row['Colors'] ? row['Colors'].split(',').map(color => color.trim()).filter(Boolean) : [];
        
        // Parse materials (comma-separated)
        const materials = row['Materials'] ? row['Materials'].split(',').map(material => material.trim()).filter(Boolean) : [];
        
        // Parse variant tracking
        const variantTrackingEnabled = (row['Variant Tracking'] || '').toLowerCase() === 'enabled';
        
        return {
            garment_specific: {
                has_sizes: sizes.length > 0,
                has_colors: colors.length > 0,
                has_materials: materials.length > 0,
                common_sizes: sizes,
                common_colors: colors,
                common_materials: materials,
                material_composition: materials[0] || 'Cotton',
                care_instructions: this.getCareInstructions(materials)
            },
            variant_tracking: {
                enabled: variantTrackingEnabled,
                track_sizes: variantTrackingEnabled && sizes.length > 0,
                track_colors: variantTrackingEnabled && colors.length > 0,
                size_chart: this.getSizeChart(row['Garment Category'] || ''),
                available_variants: this.generateVariants(sizes, colors)
            },
            inventory_management: {
                manage_variants: variantTrackingEnabled,
                variant_strategy: variantTrackingEnabled ? 'individual_tracking' : 'aggregate',
                low_stock_alerts: true,
                restock_notifications: true
            }
        };
    }

    getSizeChart(categoryCode) {
        const sizeCharts = {
            'MENS_TOPS': 'mens_tops',
            'MENS_BOTTOMS': 'mens_bottoms',
            'MENS_OUTERWEAR': 'mens_outerwear',
            'MENS_UNDERWEAR': 'mens_underwear',
            'WOMENS_TOPS': 'womens_tops',
            'WOMENS_BOTTOMS': 'womens_bottoms',
            'WOMENS_DRESSES': 'womens_dresses',
            'WOMENS_OUTERWEAR': 'womens_outerwear',
            'WOMENS_UNDERWEAR': 'womens_underwear',
            'KIDS_BABY': 'baby_clothing',
            'KIDS_TODDLER': 'toddler_clothing',
            'KIDS_YOUTH': 'youth_clothing',
            'BAGS': 'bags_luggage',
            'JEWELRY': 'jewelry',
            'WATCHES': 'watches',
            'HATS': 'hats_caps',
            'SCARVES': 'scarves',
            'CASUAL_SHOES': 'casual_shoes',
            'DRESS_SHOES': 'dress_shoes',
            'ATHLETIC_SHOES': 'athletic_shoes',
            'BOOTS': 'boots'
        };
        return sizeCharts[categoryCode] || 'standard';
    }

    getCareInstructions(materials) {
        const instructions = [];
        
        if (materials.some(material => material.toLowerCase().includes('cotton'))) {
            instructions.push('Machine wash cold', 'Tumble dry low', 'Iron on medium');
        }
        
        if (materials.some(material => material.toLowerCase().includes('wool') || material.toLowerCase().includes('cashmere'))) {
            instructions.push('Hand wash cold', 'Dry clean recommended', 'Lay flat to dry');
        }
        
        if (materials.some(material => material.toLowerCase().includes('silk'))) {
            instructions.push('Dry clean only', 'Do not bleach');
        }
        
        if (materials.some(material => material.toLowerCase().includes('leather'))) {
            instructions.push('Wipe clean with damp cloth', 'Condition regularly', 'Store in cool dry place');
        }
        
        if (instructions.length === 0) {
            instructions.push('Machine wash cold', 'Tumble dry low', 'Do not bleach');
        }
        
        return instructions;
    }

    generateVariants(sizes, colors) {
        const variants = [];
        
        if (sizes.length === 0 && colors.length === 0) {
            return [{ sku_suffix: '', size: null, color: null, stock: 0 }];
        }
        
        // Generate size variants if only sizes
        if (sizes.length > 0 && colors.length === 0) {
            sizes.forEach(size => {
                variants.push({
                    sku_suffix: `-${size}`,
                    size: size,
                    color: null,
                    stock: 0
                });
            });
        }
        
        // Generate color variants if only colors
        if (colors.length > 0 && sizes.length === 0) {
            colors.forEach(color => {
                variants.push({
                    sku_suffix: `-${color.replace(/\s+/g, '')}`,
                    size: null,
                    color: color,
                    stock: 0
                });
            });
        }
        
        // Generate size + color combinations
        if (sizes.length > 0 && colors.length > 0) {
            sizes.forEach(size => {
                colors.forEach(color => {
                    variants.push({
                        sku_suffix: `-${size}-${color.replace(/\s+/g, '')}`,
                        size: size,
                        color: color,
                        stock: 0
                    });
                });
            });
        }
        
        return variants;
    }

    createProductData(row) {
        // Parse garment-specific fields
        const garmentData = this.parseGarmentData(row);
        
        // Calculate quantity distribution across variants
        const totalQuantity = parseInt(row['Quantity'] || '0') || 0;
        const variants = garmentData.variant_tracking.available_variants;
        
        // Distribute quantity across variants
        if (variants.length > 0 && garmentData.variant_tracking.enabled) {
            const baseQuantity = Math.floor(totalQuantity / variants.length);
            const remainder = totalQuantity % variants.length;
            
            variants.forEach((variant, index) => {
                variant.stock = baseQuantity + (index < remainder ? 1 : 0);
            });
        }
        
        // Create base product data matching the database schema
        const productData = {
            _id: Math.floor(Date.now() / 1000) + this.importedCount, // Unique ID
            name: row['Product Name'] || '',
            barcode: row['Barcode/SKU'] ? parseInt(row['Barcode/SKU']) : null,
            price: row['Price'] || '0',
            cost: row['Cost Price'] || row['Price'] || '0',
            category: row['Garment Category'] || 'General',  // Use garment category code
            quantity: totalQuantity,
            stock: 1, // 1 = enabled, 0 = disabled
            minStock: parseInt(row['Minimum Stock'] || '1') || 1,
            img: row['Image File'] || '',
            supplierId: row['Supplier ID'] ? parseInt(row['Supplier ID']) : null,
            reorderQuantity: parseInt(row['Reorder Quantity'] || '0') || 0,
            alertHistory: [],
            lastRestocked: null,
            batches: [],
            // Add garment-specific data
            ...garmentData
        };
        
        return productData;
    }

    async importProduct(productData) {
        return new Promise((resolve) => {
            // Check if product already exists by barcode or name
            const query = productData.barcode ? 
                { barcode: productData.barcode } : 
                { name: productData.name };
            
            this.inventoryDB.findOne(query, (err, existing) => {
                if (err) {
                    console.log(`✗ Database error for ${productData.name}: ${err.message}`);
                    this.errors.push({
                        product: productData.name,
                        error: `Database error: ${err.message}`
                    });
                    this.errorCount++;
                    resolve(false);
                    return;
                }
                
                if (existing) {
                    console.log(`⚠ Skipping existing product: ${productData.name}`);
                    resolve(true); // Consider as success to continue
                    return;
                }
                
                // Insert new product
                this.inventoryDB.insert(productData, (insertErr, newProduct) => {
                    if (insertErr) {
                        console.log(`✗ Error inserting ${productData.name}: ${insertErr.message}`);
                        this.errors.push({
                            product: productData.name,
                            error: `Insert error: ${insertErr.message}`
                        });
                        this.errorCount++;
                        resolve(false);
                    } else {
                        console.log(`✓ Imported: ${productData.name} (ID: ${newProduct._id})`);
                        this.importedCount++;
                        resolve(true);
                    }
                });
            });
        });
    }

    async importProducts(csvFile) {
        console.log(`\n=== Starting Direct Garment Product Import ===`);
        console.log(`CSV File: ${csvFile}`);
        console.log(`Database: ${this.dbPath}`);
        
        // Check if database exists
        if (!fs.existsSync(this.dbPath)) {
            console.log(`✗ Database file not found: ${this.dbPath}`);
            console.log(`  Make sure the server has been started at least once to create the database.`);
            return { imported: 0, errors: 0 };
        }
        
        // Load CSV data
        const products = await this.loadCsvData(csvFile);
        if (products.length === 0) {
            return { imported: 0, errors: 0 };
        }
        
        // Process each product
        for (let i = 0; i < products.length; i++) {
            const row = products[i];
            console.log(`\n[${i + 1}/${products.length}] Processing: ${row['Product Name'] || 'Unknown'}`);
            
            try {
                // Create product data
                const productData = this.createProductData(row);
                
                // Import product
                await this.importProduct(productData);
                
            } catch (error) {
                console.log(`✗ Error processing ${row['Product Name'] || 'Unknown'}: ${error.message}`);
                this.errorCount++;
                this.errors.push({
                    product: row['Product Name'] || 'Unknown',
                    error: error.message
                });
            }
        }
        
        // Print summary
        console.log(`\n=== Import Summary ===`);
        console.log(`Total products: ${products.length}`);
        console.log(`Successfully imported: ${this.importedCount}`);
        console.log(`Errors: ${this.errorCount}`);
        
        if (this.errors.length > 0) {
            console.log(`\nErrors encountered:`);
            this.errors.forEach(error => {
                console.log(`  - ${error.product}: ${error.error}`);
            });
        }
        
        return {
            imported: this.importedCount,
            errors: this.errorCount,
            total: products.length
        };
    }

    async verifyImport() {
        return new Promise((resolve) => {
            this.inventoryDB.find({}, (err, products) => {
                if (err) {
                    console.log(`✗ Error during verification: ${err.message}`);
                    resolve({});
                    return;
                }
                
                const garmentProducts = products.filter(p => p.garment_specific);
                
                console.log(`\n=== Verification Results ===`);
                console.log(`Total products in database: ${products.length}`);
                console.log(`Garment products: ${garmentProducts.length}`);
                
                // Show categories distribution
                const categories = {};
                garmentProducts.forEach(product => {
                    const category = product.category || 'Unknown';
                    categories[category] = (categories[category] || 0) + 1;
                });
                
                console.log(`\nCategory distribution:`);
                Object.keys(categories).sort().forEach(category => {
                    console.log(`  ${category}: ${categories[category]} products`);
                });
                
                // Show sample products
                console.log(`\nSample imported products:`);
                garmentProducts.slice(0, 5).forEach(product => {
                    console.log(`  - ${product.name} (${product.category})`);
                    if (product.variant_tracking?.enabled && product.variant_tracking?.available_variants?.length > 0) {
                        console.log(`    Variants: ${product.variant_tracking.available_variants.length} size/color combinations`);
                    }
                });
                
                resolve({
                    total_products: products.length,
                    garment_products: garmentProducts.length,
                    categories: categories
                });
            });
        });
    }
}

// Main function
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log("Usage: node direct_import_garments.js <csv_file>");
        console.log("Example: node direct_import_garments.js garment_products_for_import.csv");
        process.exit(1);
    }
    
    const csvFile = args[0];
    
    // Check if CSV file exists
    if (!fs.existsSync(csvFile)) {
        console.log(`✗ CSV file not found: ${csvFile}`);
        process.exit(1);
    }
    
    // Create importer and run import
    const importer = new DirectGarmentImporter();
    const results = await importer.importProducts(csvFile);
    
    // Verify import
    if (results.imported > 0) {
        console.log(`\n=== Running Verification ===`);
        const verification = await importer.verifyImport();
        
        if (Object.keys(verification).length > 0) {
            console.log(`\n✓ Import completed successfully!`);
            console.log(`  - ${results.imported} products imported`);
            console.log(`  - ${verification.garment_products} garment products in database`);
        } else {
            console.log(`\n⚠ Import completed but verification failed`);
        }
    } else {
        console.log(`\n✗ Import failed - no products were imported`);
        process.exit(1);
    }
}

// Run main function
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = DirectGarmentImporter;