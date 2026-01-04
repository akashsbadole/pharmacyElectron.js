#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'root',
    database: 'postgres' // Connect to default database first
};

// Target database name
const targetDbName = process.env.DB_NAME || 'garmentpos';

async function setupDatabase() {
    console.log('🚀 Starting PostgreSQL database setup...');
    
    let client;
    
    try {
        // Connect to default postgres database
        console.log('📦 Connecting to PostgreSQL server...');
        client = new Pool(dbConfig);
        
        // Check if target database exists
        console.log(`📋 Checking if database "${targetDbName}" exists...`);
        const result = await client.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [targetDbName]
        );
        
        if (result.rows.length === 0) {
            console.log(`🆕 Creating database "${targetDbName}"...`);
            await client.query(`CREATE DATABASE "${targetDbName}"`);
            console.log(`✅ Database "${targetDbName}" created successfully!`);
        } else {
            console.log(`ℹ️  Database "${targetDbName}" already exists.`);
        }
        
        // Close connection to default database
        await client.end();
        
        // Connect to the target database
        console.log(`🔗 Connecting to database "${targetDbName}"...`);
        const targetDbConfig = {
            ...dbConfig,
            database: targetDbName
        };
        
        client = new Pool(targetDbConfig);
        
        // Test connection
        const testResult = await client.query('SELECT NOW() as current_time');
        console.log(`✅ Connected to "${targetDbName}" successfully!`);
        console.log(`⏰ Current time: ${testResult.rows[0].current_time}`);
        
        // Read and execute schema file
        console.log('🏗️  Creating database schema...');
        const schemaPath = path.join(__dirname, 'web-app', 'database_schemas', 'centralized_schema.sql');
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found: ${schemaPath}`);
        }
        
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Split SQL into individual statements
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);
        
        console.log(`📝 Executing ${statements.length} schema statements...`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            try {
                await client.query(statement);
                console.log(`   ✅ Statement ${i + 1}/${statements.length} executed`);
            } catch (error) {
                console.warn(`   ⚠️  Statement ${i + 1}/${statements.length} failed: ${error.message}`);
                // Continue with other statements
            }
        }
        
        console.log('🎉 Database setup completed successfully!');
        
        // Verify tables were created
        console.log('🔍 Verifying table creation...');
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);
        
        console.log('📊 Created tables:');
        tablesResult.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    } finally {
        if (client) {
            await client.end();
        }
    }
}

// Run setup
if (require.main === module) {
    setupDatabase()
        .then(() => {
            console.log('\n🎉 PostgreSQL database setup completed!');
            console.log('📋 Next steps:');
            console.log('   1. Run the migration script to transfer data from NeDB');
            console.log('   2. Update API modules to use PostgreSQL');
            console.log('   3. Test both applications');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Setup failed:', error.message);
            process.exit(1);
        });
}

module.exports = { setupDatabase };
