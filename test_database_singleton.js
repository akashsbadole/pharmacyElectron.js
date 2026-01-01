const fs = require("fs");
const path = require("path");

/**
 * Test script to verify database singleton pattern is working correctly
 * and no ENOENT errors occur during database operations
 */

console.log("🧪 Testing Database Singleton Pattern and ENOENT Error Resolution\n");

// Set up test environment
process.env.APPDATA = "C:\\Users\\akash\\AppData\\Roaming";
process.env.APPNAME = "pharmingo";

// Track database instances to verify singleton pattern
const dbInstances = new Map();
let testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

// Mock console.error to capture any ENOENT errors
const originalConsoleError = console.error;
console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('ENOENT') || message.includes('no such file or directory')) {
        testResults.errors.push(`ENOENT Error: ${message}`);
        testResults.failed++;
    }
    originalConsoleError(...args);
};

function testModule(moduleName, modulePath) {
    console.log(`\n📦 Testing ${moduleName}...`);
    
    try {
        // Clear the module cache to ensure fresh import
        delete require.cache[require.resolve(modulePath)];
        
        const startTime = Date.now();
        const module = require(modulePath);
        const loadTime = Date.now() - startTime;
        
        console.log(`   ✅ Module loaded successfully (${loadTime}ms)`);
        testResults.passed++;
        
        // Check if module has expected structure
        if (module && typeof module === 'object') {
            console.log(`   ✅ Module has valid structure`);
            testResults.passed++;
        } else {
            console.log(`   ❌ Module structure invalid`);
            testResults.failed++;
        }
        
        return true;
    } catch (error) {
        console.log(`   ❌ Module failed to load: ${error.message}`);
        testResults.failed++;
        testResults.errors.push(`${moduleName}: ${error.message}`);
        return false;
    }
}

function testDatabaseUtils() {
    console.log("\n🔧 Testing Database Utils...");
    
    try {
        const { getDatabase, cleanupTempFiles } = require('./api/database_utils');
        console.log(`   ✅ Database utils loaded successfully`);
        testResults.passed++;
        
        // Test getDatabase function exists and is callable
        if (typeof getDatabase === 'function') {
            console.log(`   ✅ getDatabase function is available`);
            testResults.passed++;
        } else {
            console.log(`   ❌ getDatabase function not found`);
            testResults.failed++;
        }
        
        // Test cleanupTempFiles function exists
        if (typeof cleanupTempFiles === 'function') {
            console.log(`   ✅ cleanupTempFiles function is available`);
            testResults.passed++;
        } else {
            console.log(`   ❌ cleanupTempFiles function not found`);
            testResults.failed++;
        }
        
        return true;
    } catch (error) {
        console.log(`   ❌ Database utils failed: ${error.message}`);
        testResults.failed++;
        testResults.errors.push(`Database Utils: ${error.message}`);
        return false;
    }
}

function testSingletonPattern() {
    console.log("\n🎯 Testing Singleton Pattern...");
    
    try {
        const { getDatabase } = require('./api/database_utils');
        
        // Test that same database path returns same instance
        const testPath = path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "test.db");
        
        const db1 = getDatabase(testPath);
        const db2 = getDatabase(testPath);
        
        if (db1 === db2) {
            console.log(`   ✅ Singleton pattern working: same instance returned`);
            testResults.passed++;
        } else {
            console.log(`   ❌ Singleton pattern failed: different instances returned`);
            testResults.failed++;
        }
        
        // Test different paths return different instances
        const testPath2 = path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "test2.db");
        const db3 = getDatabase(testPath2);
        
        if (db1 !== db3) {
            console.log(`   ✅ Different databases: different instances returned`);
            testResults.passed++;
        } else {
            console.log(`   ❌ Different databases: same instance returned`);
            testResults.failed++;
        }
        
        return true;
    } catch (error) {
        console.log(`   ❌ Singleton test failed: ${error.message}`);
        testResults.failed++;
        testResults.errors.push(`Singleton Test: ${error.message}`);
        return false;
    }
}

function testAllApiModules() {
    console.log("\n🔍 Testing All API Modules...");
    
    const apiModules = [
        ['Audit Logs', './api/audit_logs'],
        ['Session Logs', './api/session_logs'],
        ['Suppliers', './api/suppliers'],
        ['Customers', './api/customers'],
        ['Transactions', './api/transactions'],
        ['Inventory', './api/inventory'],
        ['Purchase Orders', './api/purchase_orders'],
        ['Categories', './api/categories'],
        ['Users', './api/users'],
        ['Settings', './api/settings'],
        ['Contact', './api/contact'],
        ['Backup', './api/backup'],
        ['Notifications', './api/notifications'],
        ['Integration', './api/integration']
    ];
    
    apiModules.forEach(([name, path]) => {
        testModule(name, path);
    });
}

function generateTestReport() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST REPORT");
    console.log("=".repeat(60));
    
    console.log(`✅ Tests Passed: ${testResults.passed}`);
    console.log(`❌ Tests Failed: ${testResults.failed}`);
    console.log(`📁 Total Tests: ${testResults.passed + testResults.failed}`);
    
    if (testResults.errors.length > 0) {
        console.log("\n🚨 ERRORS DETECTED:");
        testResults.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
    } else {
        console.log("\n🎉 NO ERRORS DETECTED!");
    }
    
    // Success criteria
    const successRate = testResults.passed / (testResults.passed + testResults.failed);
    console.log(`\n📈 Success Rate: ${(successRate * 100).toFixed(1)}%`);
    
    if (successRate >= 0.95 && testResults.errors.length === 0) {
        console.log("🎯 STATUS: ALL TESTS PASSED - ENOENT ERRORS RESOLVED!");
    } else if (successRate >= 0.8) {
        console.log("⚠️  STATUS: MOSTLY SUCCESSFUL - Minor issues detected");
    } else {
        console.log("❌ STATUS: TESTS FAILED - Issues need attention");
    }
    
    console.log("=".repeat(60));
}

// Run all tests
try {
    testDatabaseUtils();
    testSingletonPattern();
    testAllApiModules();
    generateTestReport();
} catch (error) {
    console.error("\n💥 Test suite crashed:", error.message);
    process.exit(1);
}

// Restore original console.error
console.error = originalConsoleError;