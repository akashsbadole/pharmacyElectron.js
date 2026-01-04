#!/usr/bin/env node

// Test script for web application
const express = require('express');
const path = require('path');

// Set environment variables for PostgreSQL
process.env.USE_POSTGRESQL = 'true';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'garmentpos';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'root';
process.env.DB_TYPE = 'postgres';

async function testWebApp() {
    console.log('🧪 Testing web application setup...');
    
    try {
        // Test database connection
        console.log('📦 Testing database connection...');
        const database = require('./web-app/server/config/database');
        
        await database.connect();
        console.log('✅ Database connected successfully');
        
        await database.createTables();
        console.log('✅ Database tables verified');
        
        // Test API modules
        console.log('🔌 Testing API modules...');
        
        // Test auth routes
        const authRoutes = require('./web-app/server/api/auth');
        console.log('✅ Auth routes loaded');
        
        // Test inventory routes
        const inventoryRoutes = require('./web-app/server/api/inventory');
        console.log('✅ Inventory routes loaded');
        
        // Test customer routes
        const customerRoutes = require('./web-app/server/api/customers');
        console.log('✅ Customer routes loaded');
        
        // Test transaction routes
        const transactionRoutes = require('./web-app/server/api/transactions');
        console.log('✅ Transaction routes loaded');
        
        // Test user routes
        const userRoutes = require('./web-app/server/api/users');
        console.log('✅ User routes loaded');
        
        // Test settings routes
        const settingsRoutes = require('./web-app/server/api/settings');
        console.log('✅ Settings routes loaded');
        
        console.log('\n🎉 All web application components loaded successfully!');
        console.log('📊 Web application is ready to run');
        console.log('🚀 To start the server, run: cd web-app && node server/server.js');
        
    } catch (error) {
        console.error('❌ Web application test failed:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Run test
if (require.main === module) {
    testWebApp()
        .then(() => {
            console.log('\n✅ Web application test completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Web application test failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testWebApp };
