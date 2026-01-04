/**
 * Test script to verify garment category configuration
 * This script tests the garment category system functionality
 */

const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

// Configuration
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000/api';
const APP_DATA = process.env.APPDATA || 'C:\\Users\\akash\\AppData\\Roaming\\retailspos';
const APP_NAME = process.env.APPNAME || 'retailspos';

class GarmentCategoryTester {
    constructor() {
        this.testResults = [];
        this.failedTests = 0;
        this.passedTests = 0;
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Starting Garment Category System Tests...\n');

        try {
            await this.testGarmentCategoriesAPI();
            await this.testInventoryGarmentEnhancements();
            await this.testDatabaseInitialization();
            await this.testCategoryHierarchy();
            await this.testVariantRecommendations();

            this.printTestSummary();
        } catch (error) {
            console.error('❌ Test execution failed:', error);
        }
    }

    /**
     * Test garment categories API endpoints
     */
    async testGarmentCategoriesAPI() {
        console.log('📋 Testing Garment Categories API...');

        // Test API welcome endpoint
        await this.testEndpoint('GET', '/garment_categories', null, (response, data) => {
            this.assert(data.includes('Garment Category API'), 'API welcome message should contain garment category reference');
        });

        // Test initializing default categories
        await this.testEndpoint('POST', '/garment_categories/initialize-defaults', null, (response, data) => {
            this.assert(data.result && data.result.total > 0, 'Should initialize default categories successfully');
        });

        // Test getting all categories
        await this.testEndpoint('GET', '/garment_categories/all', null, (response, data) => {
            this.assert(data.categories && data.categories.length > 0, 'Should return categories list');
            this.assert(data.hierarchical && data.hierarchical.length > 0, 'Should return hierarchical structure');
        });

        // Test getting category tree
        await this.testEndpoint('GET', '/garment_categories/tree', null, (response, data) => {
            this.assert(Array.isArray(data), 'Should return category tree as array');
        });

        // Test getting specific category by code
        await this.testEndpoint('GET', '/garment_categories/code/MENS', null, (response, data) => {
            this.assert(data.category_code === 'MENS', 'Should return correct category for MENS code');
            this.assert(data.garment_specific && data.garment_specific.has_sizes, 'Should have garment-specific settings');
        });

        console.log('✅ Garment Categories API tests completed\n');
    }

    /**
     * Test inventory garment enhancements
     */
    async testInventoryGarmentEnhancements() {
        console.log('📦 Testing Inventory Garment Enhancements...');

        // Test getting garment categories from inventory endpoint
        await this.testEndpoint('GET', '/inventory/garment-categories', null, (response, data) => {
            this.assert(data.categories && data.categories.length > 0, 'Should return garment categories');
            this.assert(data.hierarchical && data.hierarchical.length > 0, 'Should return hierarchical structure');
        });

        // Test recommended sizes for a category
        await this.testEndpoint('GET', '/inventory/recommended-sizes/MENS', null, (response, data) => {
            this.assert(data.category_code === 'MENS', 'Should return correct category code');
            this.assert(data.recommended_sizes && data.recommended_sizes.length > 0, 'Should return recommended sizes');
        });

        // Test recommended colors for a category
        await this.testEndpoint('GET', '/inventory/recommended-colors/MENS', null, (response, data) => {
            this.assert(data.category_code === 'MENS', 'Should return correct category code');
            this.assert(data.recommended_colors && data.recommended_colors.length > 0, 'Should return recommended colors');
        });

        // Test variant combinations
        await this.testEndpoint('POST', '/inventory/variants/combinations', {
            product_id: 123,
            sizes: ['S', 'M', 'L'],
            colors: ['Black', 'White']
        }, (response, data) => {
            this.assert(data.product_id === 123, 'Should return correct product ID');
            this.assert(data.total_combinations === 6, 'Should generate correct number of combinations (3 sizes × 2 colors)');
            this.assert(data.combinations && data.combinations.length === 6, 'Should return all combinations');
        });

        // Test variant alerts
        await this.testEndpoint('GET', '/inventory/variants/alerts?type=all', null, (response, data) => {
            this.assert(data.alerts !== undefined, 'Should return alerts array');
            this.assert(data.alert_type === 'all', 'Should return correct alert type');
        });

        // Test garment insights
        await this.testEndpoint('GET', '/inventory/analytics/garment-insights', null, (response, data) => {
            this.assert(data.total_garment_products !== undefined, 'Should return total garment products count');
            this.assert(data.size_distribution !== undefined, 'Should return size distribution');
            this.assert(data.color_distribution !== undefined, 'Should return color distribution');
        });

        console.log('✅ Inventory Garment Enhancement tests completed\n');
    }

    /**
     * Test database initialization
     */
    async testDatabaseInitialization() {
        console.log('🗄️ Testing Database Initialization...');

        const dbPath = path.join(APP_DATA, APP_NAME, "server", "databases", "garment_categories.db");
        
        // Check if database file exists
        const dbExists = fs.existsSync(dbPath);
        this.assert(dbExists, 'Garment categories database should exist');

        if (dbExists) {
            console.log('✅ Database file found');
        } else {
            console.log('⚠️ Database file not found - may need to run migration');
        }

        console.log('✅ Database initialization tests completed\n');
    }

    /**
     * Test category hierarchy
     */
    async testCategoryHierarchy() {
        console.log('🌳 Testing Category Hierarchy...');

        await this.testEndpoint('GET', '/garment_categories/all', null, (response, data) => {
            // Check main categories exist
            const mainCategories = data.categories.filter(cat => !cat.parent_category);
            this.assert(mainCategories.length >= 5, 'Should have at least 5 main categories (MENS, WOMENS, KIDS, ACCESSORIES, FOOTWEAR)');

            // Check specific main categories
            const mensCategory = data.categories.find(cat => cat.category_code === 'MENS');
            this.assert(mensCategory, 'MENS category should exist');

            const womensCategory = data.categories.find(cat => cat.category_code === 'WOMENS');
            this.assert(womensCategory, 'WOMENS category should exist');

            // Check hierarchical structure
            this.assert(data.hierarchical && data.hierarchical.length > 0, 'Should have hierarchical structure');
            
            // Check subcategories exist under main categories
            const mensSubcategories = data.categories.filter(cat => cat.parent_category === 'MENS');
            this.assert(mensSubcategories.length > 0, 'MENS should have subcategories');

            const womensSubcategories = data.categories.filter(cat => cat.parent_category === 'WOMENS');
            this.assert(womensSubcategories.length > 0, 'WOMENS should have subcategories');
        });

        console.log('✅ Category hierarchy tests completed\n');
    }

    /**
     * Test variant recommendations
     */
    async testVariantRecommendations() {
        console.log('🎯 Testing Variant Recommendations...');

        // Test sizes for different categories
        const testCategories = ['MENS', 'WOMENS', 'KIDS', 'FOOTWEAR', 'ACCESSORIES'];
        
        for (const categoryCode of testCategories) {
            await this.testEndpoint('GET', `/inventory/recommended-sizes/${categoryCode}`, null, (response, data) => {
                this.assert(data.category_code === categoryCode, `Should return correct category code for ${categoryCode}`);
                this.assert(data.recommended_sizes && data.recommended_sizes.length > 0, `${categoryCode} should have recommended sizes`);
            });

            await this.testEndpoint('GET', `/inventory/recommended-colors/${categoryCode}`, null, (response, data) => {
                this.assert(data.category_code === categoryCode, `Should return correct category code for ${categoryCode}`);
                this.assert(data.recommended_colors && data.recommended_colors.length > 0, `${categoryCode} should have recommended colors`);
            });
        }

        console.log('✅ Variant recommendation tests completed\n');
    }

    /**
     * Test a single API endpoint
     */
    async testEndpoint(method, endpoint, body, assertion) {
        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            const data = await response.json();

            // Run assertion
            try {
                assertion(response, data);
                this.passedTests++;
                console.log(`  ✅ ${method} ${endpoint} - PASSED`);
            } catch (assertionError) {
                this.failedTests++;
                console.log(`  ❌ ${method} ${endpoint} - FAILED: ${assertionError.message}`);
                console.log(`     Response:`, JSON.stringify(data, null, 2));
            }

        } catch (error) {
            this.failedTests++;
            console.log(`  ❌ ${method} ${endpoint} - ERROR: ${error.message}`);
        }
    }

    /**
     * Assert a condition
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    /**
     * Print test summary
     */
    printTestSummary() {
        console.log('📊 Test Summary:');
        console.log(`  Total Tests: ${this.passedTests + this.failedTests}`);
        console.log(`  ✅ Passed: ${this.passedTests}`);
        console.log(`  ❌ Failed: ${this.failedTests}`);
        console.log(`  Success Rate: ${((this.passedTests / (this.passedTests + this.failedTests)) * 100).toFixed(1)}%`);

        if (this.failedTests === 0) {
            console.log('\n🎉 All tests passed! Garment category system is working correctly.');
        } else {
            console.log('\n⚠️ Some tests failed. Please check the configuration.');
        }

        console.log('\n' + '='.repeat(60));
    }
}

// Additional helper functions for manual testing
function testLocalDatabaseSetup() {
    console.log('🔧 Testing Local Database Setup...');
    
    const dbPath = path.join(APP_DATA, APP_NAME, "server", "databases");
    
    if (!fs.existsSync(dbPath)) {
        console.log('❌ Database directory does not exist');
        return false;
    }

    console.log('✅ Database directory exists');

    // Check for garment categories database
    const garmentDbPath = path.join(dbPath, 'garment_categories.db');
    if (fs.existsSync(garmentDbPath)) {
        console.log('✅ Garment categories database exists');
        
        // Try to read the database file (basic check)
        try {
            const stats = fs.statSync(garmentDbPath);
            console.log(`✅ Database file size: ${stats.size} bytes`);
            console.log(`✅ Database last modified: ${stats.mtime}`);
        } catch (error) {
            console.log('⚠️ Could not read database file stats:', error.message);
        }
    } else {
        console.log('⚠️ Garment categories database does not exist - run migration script');
    }

    return true;
}

function displayCategoryStructure() {
    console.log('📋 Expected Category Structure:');
    console.log(`
Main Categories:
├── MENS (Men's Clothing)
│   ├── MENS_TOPS (Men's Tops)
│   ├── MENS_BOTTOMS (Men's Bottoms)
│   ├── MENS_OUTERWEAR (Men's Outerwear)
│   └── MENS_UNDERWEAR (Men's Underwear)
├── WOMENS (Women's Clothing)
│   ├── WOMENS_TOPS (Women's Tops)
│   ├── WOMENS_BOTTOMS (Women's Bottoms)
│   ├── WOMENS_DRESSES (Women's Dresses)
│   ├── WOMENS_OUTERWEAR (Women's Outerwear)
│   └── WOMENS_UNDERWEAR (Women's Underwear)
├── KIDS (Children's Clothing)
│   ├── KIDS_BABY (Baby Clothing)
│   ├── KIDS_TODDLER (Toddler Clothing)
│   └── KIDS_YOUTH (Youth Clothing)
├── ACCESSORIES (Accessories)
│   ├── BAGS (Bags & Luggage)
│   ├── JEWELRY (Jewelry)
│   ├── WATCHES (Watches)
│   ├── HATS (Hats & Caps)
│   └── SCARVES (Scarves)
└── FOOTWEAR (Footwear)
    ├── CASUAL_SHOES (Casual Shoes)
    ├── DRESS_SHOES (Dress Shoes)
    ├── ATHLETIC_SHOES (Athletic Shoes)
    └── BOOTS (Boots)
    `);
}

// CLI usage
if (require.main === module) {
    const tester = new GarmentCategoryTester();
    
    console.log('Garment Category System Test Suite');
    console.log('=====================================\n');

    // Check local database setup first
    testLocalDatabaseSetup();
    console.log();

    // Display expected structure
    displayCategoryStructure();
    console.log();

    // Check if API is running
    const apiUrl = process.env.TEST_API_URL;
    if (!apiUrl) {
        console.log('⚠️ TEST_API_URL not set. Please set it to test API endpoints.');
        console.log('Example: export TEST_API_URL=http://localhost:3000/api');
        console.log('\n🔧 To start the server, run: npm start');
        process.exit(0);
    }

    // Run tests
    tester.runAllTests().catch(console.error);
}

module.exports = { GarmentCategoryTester, testLocalDatabaseSetup, displayCategoryStructure };