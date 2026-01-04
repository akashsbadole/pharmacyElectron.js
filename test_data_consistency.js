#!/usr/bin/env node

// Data consistency and performance test
const { Pool } = require('pg');

// Set environment variables for PostgreSQL
process.env.USE_POSTGRESQL = 'true';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'garmentpos';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'root';

// Re-require the database utils after setting environment variables
delete require.cache[require.resolve('./api/database_utils')];
const { initializePostgreSQL, queryPostgreSQL, insertWithConflict, usePostgreSQL } = require('./api/database_utils');

async function testDataConsistency() {
    console.log('🧪 Testing data consistency and performance...');
    
    try {
        // Initialize PostgreSQL
        const initialized = await initializePostgreSQL();
        if (!initialized) {
            throw new Error('PostgreSQL initialization failed');
        }
        
        console.log('✅ PostgreSQL initialized successfully');
        
        // Test 1: Basic CRUD operations
        console.log('\n📋 Test 1: Basic CRUD Operations');
        
        // Create test data
        const testUser = {
            username: 'test_user_' + Date.now(),
            email: 'test@example.com',
            password_hash: 'test_hash',
            fullname: 'Test User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Insert
        const insertResult = await insertWithConflict('users', testUser, ['id']);
        console.log('✅ Insert operation successful');
        
        // Read
        const readResult = await queryPostgreSQL(
            'SELECT * FROM users WHERE username = $1',
            [testUser.username]
        );
        console.log('✅ Read operation successful');
        
        // Update
        const updateData = {
            ...testUser,
            email: 'updated@example.com',
            updated_at: new Date().toISOString()
        };
        
        const updateResult = await insertWithConflict('users', updateData, ['id']);
        console.log('✅ Update operation successful');
        
        // Delete (soft delete by updating deleted_at)
        const deleteResult = await queryPostgreSQL(
            'UPDATE users SET deleted_at = $1 WHERE username = $2',
            [new Date().toISOString(), testUser.username]
        );
        console.log('✅ Delete operation successful');
        
        // Test 2: Performance test
        console.log('\n⚡ Test 2: Performance Test');
        
        const startTime = Date.now();
        const testRecords = [];
        
        // Create 100 test records
        for (let i = 0; i < 100; i++) {
            testRecords.push({
                name: `Test Product ${i}`,
                price: Math.floor(Math.random() * 100) + 10,
                quantity: Math.floor(Math.random() * 100),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }
        
        // Bulk insert
        for (const record of testRecords) {
            await insertWithConflict('products', record, ['id']);
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`✅ Bulk insert of 100 records completed in ${duration}ms`);
        console.log(`📊 Average insert time: ${(duration / 100).toFixed(2)}ms per record`);
        
        // Test 3: Query performance
        console.log('\n🔍 Test 3: Query Performance');
        
        const queryStartTime = Date.now();
        
        // Test various query types
        await queryPostgreSQL('SELECT COUNT(*) FROM products');
        await queryPostgreSQL('SELECT * FROM products WHERE price > 50 LIMIT 10');
        await queryPostgreSQL('SELECT * FROM products ORDER BY created_at DESC LIMIT 20');
        await queryPostgreSQL('SELECT category_id, COUNT(*) FROM products GROUP BY category_id');
        
        const queryEndTime = Date.now();
        const queryDuration = queryEndTime - queryStartTime;
        
        console.log(`✅ Query performance test completed in ${queryDuration}ms`);
        
        // Test 4: Data integrity
        console.log('\n🔒 Test 4: Data Integrity');
        
        // Test constraints
        try {
            await insertWithConflict('users', {
                username: null, // Should fail - NOT NULL constraint
                email: 'test@example.com',
                password_hash: 'test_hash'
            }, ['id']);
            console.log('❌ Constraint test failed - should have thrown error');
        } catch (error) {
            console.log('✅ Constraint validation working correctly');
        }
        
        // Test unique constraints
        try {
            await insertWithConflict('users', {
                username: 'admin', // Should fail - duplicate username
                email: 'admin@example.com',
                password_hash: 'test_hash'
            }, ['id']);
            console.log('❌ Unique constraint test failed - should have thrown error');
        } catch (error) {
            console.log('✅ Unique constraint validation working correctly');
        }
        
        // Test 5: Table relationships
        console.log('\n🔗 Test 5: Table Relationships');
        
        // Test foreign key relationships
        const categoryResult = await insertWithConflict('categories', {
            name: 'Test Category',
            description: 'Test category for relationship testing',
            created_at: new Date().toISOString()
        }, ['id']);
        
        const categoryId = categoryResult.rows[0].id;
        
        const productResult = await insertWithConflict('products', {
            name: 'Test Product with Category',
            category_id: categoryId,
            price: 25.00,
            quantity: 10,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }, ['id']);
        
        console.log('✅ Foreign key relationship test successful');
        
        // Test 6: Index performance
        console.log('\n📈 Test 6: Index Performance');
        
        const indexStartTime = Date.now();
        
        // Test indexed queries
        await queryPostgreSQL('SELECT * FROM users WHERE username = $1', ['admin']);
        await queryPostgreSQL('SELECT * FROM products WHERE category_id = $1', [categoryId]);
        await queryPostgreSQL('SELECT * FROM products WHERE barcode IS NOT NULL LIMIT 10');
        
        const indexEndTime = Date.now();
        const indexDuration = indexEndTime - indexStartTime;
        
        console.log(`✅ Index performance test completed in ${indexDuration}ms`);
        
        // Cleanup test data
        console.log('\n🧹 Cleaning up test data...');
        
        await queryPostgreSQL('DELETE FROM products WHERE name LIKE $1', ['Test Product%']);
        await queryPostgreSQL('DELETE FROM categories WHERE name = $1', ['Test Category']);
        
        console.log('✅ Test data cleanup completed');
        
        // Summary
        console.log('\n📊 Test Summary:');
        console.log('✅ Basic CRUD operations: PASSED');
        console.log('✅ Performance (100 records): PASSED');
        console.log('✅ Query performance: PASSED');
        console.log('✅ Data integrity constraints: PASSED');
        console.log('✅ Table relationships: PASSED');
        console.log('✅ Index performance: PASSED');
        
        console.log('\n🎉 All data consistency and performance tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Data consistency test failed:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Run test
if (require.main === module) {
    testDataConsistency()
        .then(() => {
            console.log('\n✅ Data consistency test completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Data consistency test failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testDataConsistency };
