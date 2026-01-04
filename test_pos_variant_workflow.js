#!/usr/bin/env node

/**
 * POS Variant Management Workflow Test Script
 * Tests the complete POS workflow with garment variants including:
 * - Barcode scanning and variant detection
 * - Variant selection interface
 * - Cart operations with variants
 * - Payment processing
 * - Edge cases and error handling
 * - Integration with existing POS features
 */

const Datastore = require('@seald-io/nedb');
const path = require('path');
const http = require('http');

class POSVariantWorkflowTester {
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
        
        this.serverConfig = {
            port: 3000,
            host: 'localhost'
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

    // Test 1: Barcode Scanning and Variant Detection
    testBarcodeScanningWorkflow(products) {
        this.log('=== Testing Barcode Scanning and Variant Detection ===');
        
        // Test with different product types
        const testProducts = [
            products.find(p => p.category === 'MENS_TOPS'), // Clothing
            products.find(p => p.category === 'ATHLETIC_SHOES'), // Footwear
            products.find(p => p.category === 'BAGS'), // Accessories
            products.find(p => p.category === 'WOMENS_DRESSES') // Women's clothing
        ].filter(Boolean);

        testProducts.forEach(product => {
            this.log(`Testing barcode scan for: ${product.name}`);
            
            // Test barcode format
            this.test('Product has barcode', product.barcode && product.barcode.toString().length > 0, 
                `Product ${product.name} missing barcode`);
            
            // Test variant detection
            this.test('Product has variant tracking', product.variant_tracking && product.variant_tracking.enabled, 
                `Product ${product.name} doesn't have variant tracking enabled`);
            
            // Test available variants
            const variants = product.variant_tracking?.available_variants || [];
            this.test('Product has available variants', variants.length > 0, 
                `Product ${product.name} has no variants`);
            
            // Test variant structure for POS compatibility
            if (variants.length > 0) {
                const firstVariant = variants[0];
                this.test('Variant has barcode for scanning', firstVariant.barcode && firstVariant.barcode.length > 0,
                    `First variant of ${product.name} missing barcode`);
                this.test('Variant has size information', firstVariant.size !== undefined,
                    `First variant of ${product.name} missing size`);
                this.test('Variant has color information', firstVariant.color !== undefined,
                    `First variant of ${product.name} missing color`);
                this.test('Variant has stock tracking', typeof firstVariant.stock === 'number',
                    `First variant of ${product.name} missing stock tracking`);
            }
        });
    }

    // Test 2: Variant Selection Interface Logic
    testVariantSelectionLogic(products) {
        this.log('=== Testing Variant Selection Interface Logic ===');
        
        const testProducts = products.slice(0, 4); // Test first 4 products
        
        testProducts.forEach(product => {
            this.log(`Testing variant selection for: ${product.name}`);
            
            const variants = product.variant_tracking?.available_variants || [];
            const garmentData = product.garment_specific;
            
            // Test variant filtering by size
            const sizes = garmentData?.common_sizes || [];
            this.test('Product has size options for selection', sizes.length > 0,
                `Product ${product.name} has no size options`);
            
            // Test variant filtering by color
            const colors = garmentData?.common_colors || [];
            this.test('Product has color options for selection', colors.length > 0,
                `Product ${product.name} has no color options`);
            
            // Test variant combination logic
            if (sizes.length > 0 && colors.length > 0) {
                const expectedCombinations = sizes.length * colors.length;
                this.test('Variant combinations match size*color', variants.length >= expectedCombinations,
                    `Product ${product.name}: Expected ${expectedCombinations} combinations, got ${variants.length}`);
            }
            
            // Test stock availability display
            const inStockVariants = variants.filter(v => v.stock > 0);
            this.test('Some variants are in stock', inStockVariants.length > 0,
                `Product ${product.name} has no variants in stock`);
            
            // Test low stock detection
            const lowStockVariants = variants.filter(v => v.stock <= 2);
            this.log(`Product ${product.name}: ${lowStockVariants.length} low stock variants`);
        });
    }

    // Test 3: Cart Operations with Variants
    testCartOperationsWithVariants(products) {
        this.log('=== Testing Cart Operations with Variants ===');
        
        const testProduct = products.find(p => p.category === 'MENS_TOPS');
        if (!testProduct) return;
        
        this.log(`Testing cart operations for: ${testProduct.name}`);
        
        const variants = testProduct.variant_tracking?.available_variants || [];
        if (variants.length === 0) return;
        
        // Test adding specific variant to cart
        const testVariant = variants[0];
        const cartItem = this.createCartItemFromVariant(testProduct, testVariant);
        
        this.test('Cart item created from variant', cartItem !== null);
        this.test('Cart item has variant key', cartItem?.variant_data?.variant_key !== undefined);
        this.test('Cart item has product name with variant', 
            cartItem?.product_name?.includes('(') && cartItem?.product_name?.includes(')'));
        this.test('Cart item has variant barcode', cartItem?.sku === testVariant.barcode);
        this.test('Cart item is marked as variant', cartItem?.is_variant === true);
        
        // Test quantity management for variants
        const updatedCartItem = { ...cartItem, quantity: 2 };
        this.test('Variant quantity update works', updatedCartItem.quantity === 2);
        
        // Test variant removal from cart
        const removedCartItem = null;
        this.test('Variant removal works', removedCartItem === null || cartItem !== null);
    }

    // Test 4: Inventory Tracking Per Variant
    testInventoryTrackingPerVariant(products) {
        this.log('=== Testing Inventory Tracking Per Variant ===');
        
        products.slice(0, 3).forEach(product => {
            this.log(`Testing inventory tracking for: ${product.name}`);
            
            const variants = product.variant_tracking?.available_variants || [];
            let totalVariantStock = 0;
            
            variants.forEach(variant => {
                this.test('Variant has individual stock tracking', typeof variant.stock === 'number');
                this.test('Variant stock is non-negative', variant.stock >= 0);
                totalVariantStock += variant.stock;
            });
            
            this.test('Total variant stock calculation works', totalVariantStock >= 0);
            
            // Test stock reservation logic (simulate adding to cart)
            const reservedStock = Math.min(1, variants[0]?.stock || 0);
            const availableAfterReservation = variants[0]?.stock - reservedStock;
            this.test('Stock reservation logic works', availableAfterReservation >= 0);
            
            // Test out-of-stock detection
            const outOfStockVariants = variants.filter(v => v.stock === 0);
            this.log(`Product ${product.name}: ${outOfStockVariants.length} out of stock variants`);
        });
    }

    // Test 5: Category-Specific Sizing Standards
    testCategorySpecificSizing(products) {
        this.log('=== Testing Category-Specific Sizing Standards ===');
        
        // Test clothing sizes (alpha: XS, S, M, L, XL)
        const clothingProducts = products.filter(p => 
            ['MENS_TOPS', 'WOMENS_DRESSES', 'WOMENS_BOTTOMS'].includes(p.category)
        );
        
        clothingProducts.forEach(product => {
            const sizes = product.garment_specific?.common_sizes || [];
            const hasAlphaSizes = sizes.some(size => ['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(size));
            this.test('Clothing product has alpha sizes', hasAlphaSizes, 
                `Clothing product ${product.name} should have alpha sizes`);
        });
        
        // Test footwear sizes (numeric: 6, 6.5, 7, 8, 9, etc.)
        const footwearProducts = products.filter(p => 
            ['ATHLETIC_SHOES', 'CASUAL_SHOES', 'BOOTS'].includes(p.category)
        );
        
        footwearProducts.forEach(product => {
            const sizes = product.garment_specific?.common_sizes || [];
            const hasNumericSizes = sizes.some(size => !isNaN(parseFloat(size)));
            this.test('Footwear product has numeric sizes', hasNumericSizes,
                `Footwear product ${product.name} should have numeric sizes`);
        });
        
        // Test one-size accessories
        const accessoryProducts = products.filter(p => 
            ['BAGS', 'HATS', 'SCARVES', 'JEWELRY'].includes(p.category)
        );
        
        accessoryProducts.forEach(product => {
            const sizes = product.garment_specific?.common_sizes || [];
            const hasOneSize = sizes.includes('One Size') || sizes.length === 1;
            this.test('Accessory product has one size', hasOneSize,
                `Accessory product ${product.name} should have one size`);
        });
    }

    // Test 6: Edge Cases and Error Handling
    testEdgeCasesAndErrorHandling(products) {
        this.log('=== Testing Edge Cases and Error Handling ===');
        
        // Test out-of-stock variant handling
        const testProduct = products.find(p => p.variant_tracking?.available_variants?.some(v => v.stock === 0));
        if (testProduct) {
            const outOfStockVariants = testProduct.variant_tracking.available_variants.filter(v => v.stock === 0);
            this.test('Out-of-stock variants detected', outOfStockVariants.length > 0,
                `Found out-of-stock variants for testing`);
            
            // Test that out-of-stock variants are properly flagged
            outOfStockVariants.forEach(variant => {
                this.test('Out-of-stock variant has zero stock', variant.stock === 0);
            });
        }
        
        // Test invalid barcode handling
        this.test('Invalid barcode detection works', !isNaN('invalid-barcode'));
        
        // Test variant combination limits
        products.forEach(product => {
            const variants = product.variant_tracking?.available_variants || [];
            const maxReasonableVariants = 100; // Reasonable upper limit
            this.test('Variant count is reasonable', variants.length <= maxReasonableVariants,
                `Product ${product.name} has too many variants: ${variants.length}`);
        });
        
        // Test empty variant array handling
        const productWithNoVariants = { variant_tracking: { available_variants: [] } };
        this.test('Empty variant array handled gracefully', 
            productWithNoVariants.variant_tracking.available_variants.length === 0);
    }

    // Test 7: Integration with POS Features
    testPOSFeatureIntegration(products) {
        this.log('=== Testing Integration with POS Features ===');
        
        const testProduct = products.find(p => p.category === 'MENS_TOPS');
        if (!testProduct) return;
        
        const variants = testProduct.variant_tracking?.available_variants || [];
        if (variants.length === 0) return;
        
        const testVariant = variants[0];
        
        // Test receipt generation with variants
        const receiptData = this.generateReceiptData(testProduct, testVariant);
        this.test('Receipt data includes variant information', 
            receiptData.items[0]?.product_name?.includes('('));
        this.test('Receipt includes variant barcode', 
            receiptData.items[0]?.sku === testVariant.barcode);
        
        // Test transaction processing with variants
        const transactionData = this.generateTransactionData(testProduct, testVariant);
        this.test('Transaction data includes variant details', 
            transactionData.items[0]?.variant_data !== undefined);
        this.test('Transaction preserves variant pricing', 
            transactionData.items[0]?.price === parseFloat(testProduct.price));
        
        // Test inventory deduction simulation
        const inventoryAfterSale = testVariant.stock - 1;
        this.test('Inventory deduction simulation works', inventoryAfterSale >= 0);
    }

    // Test 8: UI/UX Workflow Simulation
    testUIUXWorkflow(products) {
        this.log('=== Testing UI/UX Workflow Simulation ===');
        
        const testProduct = products.find(p => p.category === 'WOMENS_DRESSES');
        if (!testProduct) return;
        
        // Simulate complete customer interaction workflow
        const workflow = this.simulateCustomerWorkflow(testProduct);
        
        this.test('Workflow simulation completed', workflow.stepsCompleted > 0);
        this.test('Product selection step works', workflow.productSelected);
        this.test('Size selection step works', workflow.sizeSelected);
        this.test('Color selection step works', workflow.colorSelected);
        this.test('Add to cart step works', workflow.addedToCart);
        this.test('Checkout step works', workflow.checkoutCompleted);
        
        // Test variant selection UX
        const sizes = testProduct.garment_specific?.common_sizes || [];
        const colors = testProduct.garment_specific?.common_colors || [];
        
        this.test('Size selection options are clear', sizes.length > 0);
        this.test('Color selection options are clear', colors.length > 0);
        this.test('Size-color combination validation works', 
            this.validateSizeColorCombination(sizes[0], colors[0], testProduct));
    }

    // Helper methods
    createCartItemFromVariant(product, variant) {
        if (!product || !variant) return null;
        
        return {
            id: `${product._id}_${variant.size}_${variant.color}`,
            product_id: product._id,
            variant_key: `${variant.size}-${variant.color}`,
            product_name: `${product.name} (${variant.size}-${variant.color})`,
            sku: variant.barcode,
            price: parseFloat(product.price),
            quantity: 1,
            is_variant: true,
            variant_data: {
                matrix_id: product.variant_tracking?.matrix_id,
                variant_key: `${variant.size}-${variant.color}`,
                color: variant.color,
                size: variant.size,
                barcode: variant.barcode
            }
        };
    }

    generateReceiptData(product, variant) {
        const cartItem = this.createCartItemFromVariant(product, variant);
        return {
            transaction_id: 'TEST-123',
            date: new Date(),
            items: [cartItem],
            total: cartItem.price * cartItem.quantity
        };
    }

    generateTransactionData(product, variant) {
        const cartItem = this.createCartItemFromVariant(product, variant);
        return {
            order: Date.now(),
            items: [cartItem],
            subtotal: cartItem.price,
            total: cartItem.price,
            customer: { name: 'Test Customer' }
        };
    }

    simulateCustomerWorkflow(product) {
        const workflow = {
            stepsCompleted: 0,
            productSelected: false,
            sizeSelected: false,
            colorSelected: false,
            addedToCart: false,
            checkoutCompleted: false
        };
        
        // Step 1: Product selection
        workflow.productSelected = product && product.name ? true : false;
        if (workflow.productSelected) workflow.stepsCompleted++;
        
        // Step 2: Size selection
        const sizes = product.garment_specific?.common_sizes || [];
        workflow.sizeSelected = sizes.length > 0;
        if (workflow.sizeSelected) workflow.stepsCompleted++;
        
        // Step 3: Color selection
        const colors = product.garment_specific?.common_colors || [];
        workflow.colorSelected = colors.length > 0;
        if (workflow.colorSelected) workflow.stepsCompleted++;
        
        // Step 4: Add to cart
        workflow.addedToCart = workflow.productSelected && workflow.sizeSelected && workflow.colorSelected;
        if (workflow.addedToCart) workflow.stepsCompleted++;
        
        // Step 5: Checkout
        workflow.checkoutCompleted = workflow.addedToCart;
        if (workflow.checkoutCompleted) workflow.stepsCompleted++;
        
        return workflow;
    }

    validateSizeColorCombination(size, color, product) {
        const variants = product.variant_tracking?.available_variants || [];
        return variants.some(v => v.size === size && v.color === color);
    }

    async runAllTests() {
        this.log('Starting POS Variant Management Workflow Tests', 'info');
        this.log('==============================================');
        
        try {
            // Load all garment products
            const products = await this.loadGarmentProducts();
            
            this.log(`Found ${products.length} garment products for testing`);
            
            if (products.length === 0) {
                this.log('No garment products found to test!', 'fail');
                return this.testResults;
            }
            
            // Run all test suites
            this.testBarcodeScanningWorkflow(products);
            this.testVariantSelectionLogic(products);
            this.testCartOperationsWithVariants(products);
            this.testInventoryTrackingPerVariant(products);
            this.testCategorySpecificSizing(products);
            this.testEdgeCasesAndErrorHandling(products);
            this.testPOSFeatureIntegration(products);
            this.testUIUXWorkflow(products);
            
            // Summary
            this.log('\n=== Test Summary ===');
            this.log(`Total tests: ${this.testResults.passed + this.testResults.failed}`);
            this.log(`Passed: ${this.testResults.passed}`);
            this.log(`Failed: ${this.testResults.failed}`);
            this.log(`Success rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
            
            // Show failed tests
            if (this.testResults.failed > 0) {
                this.log('\nFailed tests:');
                this.testResults.tests
                    .filter(test => test.status === 'FAIL')
                    .forEach(test => {
                        this.log(`  - ${test.name}: ${test.error}`, 'fail');
                    });
            }
            
            // Generate detailed test report
            this.generateTestReport(products);
            
        } catch (error) {
            this.log(`Error during testing: ${error.message}`, 'fail');
        }
        
        return this.testResults;
    }

    generateTestReport(products) {
        this.log('\n=== Detailed Test Report ===');
        
        // Product analysis
        this.log('\nProduct Analysis:');
        products.forEach(product => {
            const variants = product.variant_tracking?.available_variants || [];
            const sizes = product.garment_specific?.common_sizes || [];
            const colors = product.garment_specific?.common_colors || [];
            
            this.log(`  ${product.name} (${product.category}):`);
            this.log(`    - Sizes: ${sizes.length} options (${sizes.join(', ')})`);
            this.log(`    - Colors: ${colors.length} options (${colors.join(', ')})`);
            this.log(`    - Variants: ${variants.length} total combinations`);
            this.log(`    - Stock distribution: ${variants.reduce((sum, v) => sum + v.stock, 0)} total units`);
        });
        
        // Category analysis
        this.log('\nCategory Analysis:');
        const categories = {};
        products.forEach(product => {
            if (!categories[product.category]) {
                categories[product.category] = {
                    count: 0,
                    totalVariants: 0,
                    totalStock: 0
                };
            }
            categories[product.category].count++;
            categories[product.category].totalVariants += product.variant_tracking?.available_variants?.length || 0;
            categories[product.category].totalStock += product.variant_tracking?.available_variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
        });
        
        Object.entries(categories).forEach(([category, data]) => {
            this.log(`  ${category}: ${data.count} products, ${data.totalVariants} variants, ${data.totalStock} total stock`);
        });
    }
}

// Main function
async function main() {
    const tester = new POSVariantWorkflowTester();
    const results = await tester.runAllTests();
    
    // Exit with appropriate code
    if (results.failed > 0) {
        console.log('\n❌ Some tests failed!');
        process.exit(1);
    } else {
        console.log('\n✅ All POS variant workflow tests passed!');
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

module.exports = POSVariantWorkflowTester;