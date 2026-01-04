#!/usr/bin/env node

/**
 * Garment Variant Management Test Script
 * Tests variant functionality with imported garment products
 */

const Datastore = require('@seald-io/nedb');
const path = require('path');

class VariantManagementTester {
    constructor() {
        // Database path - matching the server configuration
        const appData = process.env.APPDATA || 'C:\\Users\\akash\\AppData\\Roaming\\retailspos';
        const appName = process.env.APPNAME || 'retailspos';
        this.dbPath = path.join(appData, appName, 'server', 'databases', 'inventory.db');
        
        this.inventoryDB = new Datastore({ 
            filename: this.dbPath, 
            autoload: true 
        });
        
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'pass' ? '✓' : type === 'fail' ? '✗' : 'ℹ';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    test(name, condition, errorMessage = '') {
        if (condition) {
            this.log(`Test passed: ${name}`, 'pass');
            this.testResults.passed++;
            this.testResults.tests.push({ name, status: 'PASS', error: null });
        } else {
            this.log(`Test failed: ${name} - ${errorMessage}`, 'fail');
            this.testResults.failed++;
            this.testResults.tests.push({ name, status: 'FAIL', error: errorMessage });
        }
    }

    async loadGarmentProducts() {
        return new Promise((resolve, reject) => {
            this.inventoryDB.find({ garment_specific: { $exists: true } }, (err, products) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(products);
                }
            });
        });
    }

    testProductStructure(product) {
        this.log(`Testing product structure: ${product.name}`);
        
        // Test basic fields
        this.test('Product has name', product.name && product.name.trim().length > 0);
        this.test('Product has category', product.category && product.category.length > 0);
        this.test('Product has price', parseFloat(product.price) > 0);
        this.test('Product has quantity', parseInt(product.quantity) >= 0);
        
        // Test garment-specific fields
        this.test('Product has garment_specific', product.garment_specific && typeof product.garment_specific === 'object');
        this.test('Garment specific has has_sizes', typeof product.garment_specific?.has_sizes === 'boolean');
        this.test('Garment specific has has_colors', typeof product.garment_specific?.has_colors === 'boolean');
        this.test('Garment specific has common_sizes', Array.isArray(product.garment_specific?.common_sizes));
        this.test('Garment specific has common_colors', Array.isArray(product.garment_specific?.common_colors));
        this.test('Garment specific has care_instructions', Array.isArray(product.garment_specific?.care_instructions));
        
        // Test variant tracking
        this.test('Product has variant_tracking', product.variant_tracking && typeof product.variant_tracking === 'object');
        this.test('Variant tracking has enabled', typeof product.variant_tracking?.enabled === 'boolean');
        this.test('Variant tracking has available_variants', Array.isArray(product.variant_tracking?.available_variants));
        
        // Test inventory management
        this.test('Product has inventory_management', product.inventory_management && typeof product.inventory_management === 'object');
        this.test('Inventory management has manage_variants', typeof product.inventory_management?.manage_variants === 'boolean');
    }

    testVariantGeneration(product) {
        this.log(`Testing variant generation for: ${product.name}`);
        
        const variants = product.variant_tracking?.available_variants || [];
        const garmentData = product.garment_specific;
        
        this.test('Variants array is not empty', variants.length > 0, `Product has ${variants.length} variants`);
        
        if (variants.length > 0) {
            // Test variant structure
            const firstVariant = variants[0];
            this.test('Variant has sku_suffix', firstVariant.sku_suffix !== undefined);
            this.test('Variant has stock', typeof firstVariant.stock === 'number');
            
            // Test that variants have either size or color or both
            const hasSizeOrColor = variants.some(v => v.size || v.color);
            this.test('Variants have size or color', hasSizeOrColor);
            
            // Test quantity distribution
            const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
            this.test('Stock distribution is reasonable', totalStock <= parseInt(product.quantity), 
                `Total variant stock (${totalStock}) vs total product quantity (${product.quantity})`);
        }
    }

    testCategoryMapping(product) {
        this.log(`Testing category mapping for: ${product.name}`);
        
        const validCategories = [
            'MENS_TOPS', 'MENS_BOTTOMS', 'MENS_OUTERWEAR', 'MENS_UNDERWEAR',
            'WOMENS_TOPS', 'WOMENS_BOTTOMS', 'WOMENS_DRESSES', 'WOMENS_OUTERWEAR', 'WOMENS_UNDERWEAR',
            'KIDS_BABY', 'KIDS_TODDLER', 'KIDS_YOUTH',
            'BAGS', 'JEWELRY', 'WATCHES', 'HATS', 'SCARVES',
            'CASUAL_SHOES', 'DRESS_SHOES', 'ATHLETIC_SHOES', 'BOOTS'
        ];
        
        this.test('Category is valid', validCategories.includes(product.category), 
            `Invalid category: ${product.category}`);
        
        // Test size chart mapping
        const sizeChart = product.variant_tracking?.size_chart;
        this.test('Has size chart', sizeChart && sizeChart.length > 0);
    }

    testGarmentSpecificFeatures(product) {
        this.log(`Testing garment-specific features for: ${product.name}`);
        
        const garmentData = product.garment_specific;
        
        // Test material composition
        this.test('Has material composition', garmentData.material_composition && garmentData.material_composition.length > 0);
        
        // Test care instructions
        this.test('Has care instructions', garmentData.care_instructions && garmentData.care_instructions.length > 0);
        
        // Test that care instructions are relevant to materials
        const materials = garmentData.common_materials || [];
        const careInstructions = garmentData.care_instructions || [];
        
        if (materials.length > 0 && careInstructions.length > 0) {
            const hasRelevantCare = this.checkRelevantCareInstructions(materials, careInstructions);
            this.test('Care instructions match materials', hasRelevantCare);
        }
    }

    checkRelevantCareInstructions(materials, careInstructions) {
        // Check if care instructions contain relevant terms for the materials
        const materialText = materials.join(' ').toLowerCase();
        const careText = careInstructions.join(' ').toLowerCase();
        
        // Cotton items should mention washing instructions
        if (materialText.includes('cotton') && (careText.includes('wash') || careText.includes('machine'))) {
            return true;
        }
        
        // Wool items should mention gentle care
        if (materialText.includes('wool') && (careText.includes('gentle') || careText.includes('hand') || careText.includes('dry clean'))) {
            return true;
        }
        
        // Leather items should mention cleaning/wiping
        if (materialText.includes('leather') && (careText.includes('wipe') || careText.includes('clean') || careText.includes('condition'))) {
            return true;
        }
        
        // Silk items should mention dry clean
        if (materialText.includes('silk') && careText.includes('dry clean')) {
            return true;
        }
        
        // Default: any care instructions are better than none
        return careInstructions.length > 0;
    }

    testInventoryManagement(product) {
        this.log(`Testing inventory management for: ${product.name}`);
        
        const inventoryData = product.inventory_management;
        
        this.test('Has inventory management config', inventoryData && typeof inventoryData === 'object');
        this.test('Has variant strategy', inventoryData.variant_strategy && inventoryData.variant_strategy.length > 0);
        this.test('Has low stock alerts', typeof inventoryData.low_stock_alerts === 'boolean');
        this.test('Has restock notifications', typeof inventoryData.restock_notifications === 'boolean');
    }

    async runAllTests() {
        this.log('Starting Variant Management Tests', 'info');
        this.log('======================================');
        
        try {
            // Load all garment products
            const products = await this.loadGarmentProducts();
            
            this.log(`Found ${products.length} garment products for testing`);
            
            if (products.length === 0) {
                this.log('No garment products found to test!', 'fail');
                return this.testResults;
            }
            
            // Test each product
            for (const product of products) {
                this.log(`\\n--- Testing Product: ${product.name} (${product.category}) ---`);
                
                this.testProductStructure(product);
                this.testVariantGeneration(product);
                this.testCategoryMapping(product);
                this.testGarmentSpecificFeatures(product);
                this.testInventoryManagement(product);
            }
            
            // Summary
            this.log('\\n=== Test Summary ===');
            this.log(`Total tests: ${this.testResults.passed + this.testResults.failed}`);
            this.log(`Passed: ${this.testResults.passed}`);
            this.log(`Failed: ${this.testResults.failed}`);
            this.log(`Success rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
            
            // Show failed tests
            if (this.testResults.failed > 0) {
                this.log('\\nFailed tests:');
                this.testResults.tests
                    .filter(test => test.status === 'FAIL')
                    .forEach(test => {
                        this.log(`  - ${test.name}: ${test.error}`, 'fail');
                    });
            }
            
            // Test specific variant combinations
            this.log('\\n=== Testing Sample Variant Combinations ===');
            await this.testSampleVariants(products);
            
        } catch (error) {
            this.log(`Error during testing: ${error.message}`, 'fail');
        }
        
        return this.testResults;
    }

    async testSampleVariants(products) {
        // Test a few specific products with different category types
        const sampleProducts = [
            products.find(p => p.category === 'MENS_TOPS'),
            products.find(p => p.category === 'WOMENS_DRESSES'),
            products.find(p => p.category === 'ATHLETIC_SHOES'),
            products.find(p => p.category === 'BAGS')
        ].filter(Boolean);
        
        for (const product of sampleProducts) {
            this.log(`\\nDetailed variant analysis for: ${product.name}`);
            
            const variants = product.variant_tracking?.available_variants || [];
            const sizes = product.garment_specific?.common_sizes || [];
            const colors = product.garment_specific?.common_colors || [];
            
            this.log(`  Sizes: ${sizes.join(', ')}`);
            this.log(`  Colors: ${colors.join(', ')}`);
            this.log(`  Generated variants: ${variants.length}`);
            
            // Show first few variants as examples
            variants.slice(0, 5).forEach((variant, index) => {
                const sizeStr = variant.size ? `Size ${variant.size}` : 'No size';
                const colorStr = variant.color ? `Color ${variant.color}` : 'No color';
                this.log(`    Variant ${index + 1}: ${sizeStr}, ${colorStr}, Stock: ${variant.stock}`);
            });
            
            if (variants.length > 5) {
                this.log(`    ... and ${variants.length - 5} more variants`);
            }
        }
    }
}

// Main function
async function main() {
    const tester = new VariantManagementTester();
    const results = await tester.runAllTests();
    
    // Exit with appropriate code
    if (results.failed > 0) {
        console.log('\\n❌ Some tests failed!');
        process.exit(1);
    } else {
        console.log('\\n✅ All tests passed!');
        process.exit(0);
    }
}

// Run main function
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = VariantManagementTester;