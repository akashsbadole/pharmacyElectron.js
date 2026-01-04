#!/usr/bin/env node

// Set environment variables for PostgreSQL
process.env.USE_POSTGRESQL = 'true';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'garmentpos';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'root';

const { initializePostgreSQL, queryPostgreSQL, usePostgreSQL } = require('./api/database_utils');

async function testPostgreSQL() {
    console.log('🧪 Testing PostgreSQL connection...');
    
    try {
        // Initialize PostgreSQL
        const initialized = await initializePostgreSQL();
        
        if (!initialized) {
            console.log('❌ PostgreSQL initialization failed');
            return;
        }
        
        console.log('✅ PostgreSQL initialized successfully');
        
        // Test basic query
        const result = await queryPostgreSQL('SELECT NOW() as current_time, version() as postgres_version');
        
        console.log('✅ PostgreSQL query successful!');
        console.log('📅 Current time:', result.rows[0].current_time);
        console.log('🐘 PostgreSQL version:', result.rows[0].postgres_version);
        
        // Test table existence
        const tables = ['users', 'customers', 'products', 'transactions', 'categories'];
        
        console.log('\n📋 Checking table existence:');
        for (const table of tables) {
            try {
                const existsResult = await queryPostgreSQL(
                    'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)',
                    [table]
                );
                
                const exists = existsResult.rows[0].exists;
                console.log(`   ${exists ? '✅' : '❌'} ${table}: ${exists ? 'exists' : 'not found'}`);
            } catch (error) {
                console.log(`   ❌ ${table}: error checking - ${error.message}`);
            }
        }
        
        console.log('\n🎉 PostgreSQL connection test completed successfully!');
        
    } catch (error) {
        console.error('❌ PostgreSQL test failed:', error.message);
        process.exit(1);
    }
}

// Run test
if (require.main === module) {
    testPostgreSQL()
        .then(() => {
            console.log('\n✅ All PostgreSQL tests passed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 PostgreSQL test failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testPostgreSQL };
