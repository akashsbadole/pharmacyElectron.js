# Centralized Database Migration Plan

## Overview

This document outlines the migration plan to implement a centralized PostgreSQL database for both the Electron.js desktop application and the web application, replacing the current NeDB-based architecture.

## Current Database Status

✅ **PostgreSQL Database Created**: `garmentpos`
- **Host**: localhost
- **Port**: 5432
- **Username**: postgres
- **Password**: root
- **Database Name**: garmentpos

## Migration Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Web App       │    │   Electron App  │
│   (Browser)     │    │   (Desktop)     │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────────────────┘
                     │
          ┌─────────────────┐
          │ Centralized     │
          │ PostgreSQL DB   │
          │ (garmentpos)    │
          └─────────────────┘
```

## Phase 1: Web Application Configuration

### 1.1 Update Database Configuration

**File**: `web-app/.env`
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=garmentpos
DB_USER=postgres
DB_PASSWORD=root
DB_TYPE=postgres
```

**File**: `web-app/server/config/database.js`
- Already configured for PostgreSQL
- Connection pooling and error handling in place
- Schema creation and migration support

### 1.2 Test Web Application Connectivity

```bash
# Start web application
cd web-app
npm install
node server/server.js

# Test database connection
curl http://localhost:3001/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-04T12:00:00.000Z",
  "database": "connected",
  "sync": "stopped"
}
```

## Phase 2: Electron App Database Migration

### 2.1 Database Schema Analysis

**Current NeDB Collections to Migrate**:
- `inventory.db` → `products` table
- `categories.db` → `categories` table
- `customers.db` → `customers` table
- `transactions.db` → `transactions` table
- `inventory_matrix.db` → `inventory_matrix` table
- `gift_store.db` → `gift_receipts`, `gift_cards`, `gift_bundles` tables
- `users.db` → `users` table
- `settings.db` → `settings` table
- `suppliers.db` → `suppliers` table
- `purchase_orders.db` → `purchase_orders` table

### 2.2 Database Schema Creation

**File**: `web-app/database_schemas/centralized_schema.sql`

```sql
-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER DEFAULT 0,
    barcode VARCHAR(50),
    description TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    total DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20),
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Matrix Table
CREATE TABLE IF NOT EXISTS inventory_matrix (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    size VARCHAR(20),
    color VARCHAR(20),
    quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    total DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    store_name VARCHAR(100),
    store_address TEXT,
    store_phone VARCHAR(20),
    currency VARCHAR(10) DEFAULT 'USD',
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sync Log Table
CREATE TABLE IF NOT EXISTS sync_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    operation VARCHAR(10) NOT NULL,
    data JSONB NOT NULL,
    source VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT FALSE,
    error_message TEXT
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_number ON transactions(order_number);
CREATE INDEX IF NOT EXISTS idx_inventory_matrix_product_id ON inventory_matrix(product_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_table_name ON sync_log(table_name);
CREATE INDEX IF NOT EXISTS idx_sync_log_record_id ON sync_log(record_id);
```

### 2.3 Data Migration Scripts

**File**: `web-app/migration_scripts/migrate_nedb_to_postgres.js`

```javascript
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const Datastore = require('@seald-io/nedb');

// PostgreSQL connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'garmentpos',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'root'
});

// NeDB database paths
const nedbPath = process.env.NEDB_PATH || './data/databases';

async function migrateData() {
    try {
        console.log('Starting NeDB to PostgreSQL migration...');
        
        // Migrate Categories
        await migrateCategories();
        
        // Migrate Products
        await migrateProducts();
        
        // Migrate Customers
        await migrateCustomers();
        
        // Migrate Users
        await migrateUsers();
        
        // Migrate Settings
        await migrateSettings();
        
        console.log('Migration completed successfully!');
        
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

async function migrateCategories() {
    const db = new Datastore({ filename: path.join(nedbPath, 'categories.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({}, (err, categories) => {
            if (err) return reject(err);
            
            if (categories.length === 0) {
                console.log('No categories to migrate');
                return resolve();
            }
            
            const insertPromises = categories.map(category => {
                return pool.query(
                    `INSERT INTO categories (name, description, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4) 
                     ON CONFLICT DO NOTHING`,
                    [category.name, category.description, category.created_at, category.updated_at]
                );
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`Migrated ${categories.length} categories`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

async function migrateProducts() {
    const db = new Datastore({ filename: path.join(nedbPath, 'inventory.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({}, (err, products) => {
            if (err) return reject(err);
            
            if (products.length === 0) {
                console.log('No products to migrate');
                return resolve();
            }
            
            const insertPromises = products.map(product => {
                return pool.query(
                    `INSERT INTO products (name, category_id, price, quantity, barcode, description, image_url, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                     ON CONFLICT DO NOTHING`,
                    [product.name, product.category_id, product.price, product.quantity, 
                     product.barcode, product.description, product.image_url, 
                     product.created_at, product.updated_at]
                );
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`Migrated ${products.length} products`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

async function migrateCustomers() {
    const db = new Datastore({ filename: path.join(nedbPath, 'customers.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({}, (err, customers) => {
            if (err) return reject(err);
            
            if (customers.length === 0) {
                console.log('No customers to migrate');
                return resolve();
            }
            
            const insertPromises = customers.map(customer => {
                return pool.query(
                    `INSERT INTO customers (name, email, phone, address, loyalty_points, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) 
                     ON CONFLICT DO NOTHING`,
                    [customer.name, customer.email, customer.phone, customer.address, 
                     customer.loyalty_points, customer.created_at, customer.updated_at]
                );
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`Migrated ${customers.length} customers`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

async function migrateUsers() {
    const db = new Datastore({ filename: path.join(nedbPath, 'users.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({}, (err, users) => {
            if (err) return reject(err);
            
            if (users.length === 0) {
                console.log('No users to migrate');
                return resolve();
            }
            
            const insertPromises = users.map(user => {
                return pool.query(
                    `INSERT INTO users (username, password_hash, fullname, email, role, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) 
                     ON CONFLICT DO NOTHING`,
                    [user.username, user.password_hash, user.fullname, user.email, 
                     user.role, user.created_at, user.updated_at]
                );
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`Migrated ${users.length} users`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

async function migrateSettings() {
    const db = new Datastore({ filename: path.join(nedbPath, 'settings.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({}, (err, settings) => {
            if (err) return reject(err);
            
            if (settings.length === 0) {
                console.log('No settings to migrate');
                return resolve();
            }
            
            const insertPromises = settings.map(setting => {
                return pool.query(
                    `INSERT INTO settings (store_name, store_address, store_phone, currency, tax_rate, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) 
                     ON CONFLICT DO NOTHING`,
                    [setting.store_name, setting.store_address, setting.store_phone, 
                     setting.currency, setting.tax_rate, setting.created_at, setting.updated_at]
                );
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`Migrated ${settings.length} settings`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

// Run migration
if (require.main === module) {
    migrateData()
        .then(() => {
            console.log('Migration script completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateData };
```

## Phase 3: Electron App Database Integration

### 3.1 Update Database Configuration

**File**: `api/database_utils.js` (update for PostgreSQL)

```javascript
// Update the existing database_utils.js to support PostgreSQL
const { Pool } = require('pg');
const Datastore = require('@seald-io/nedb');
const path = require('path');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'garmentpos',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'root'
};

// PostgreSQL connection pool
const pool = new Pool(dbConfig);

// NeDB databases (for backward compatibility)
const databases = {
    inventory: new Datastore({ filename: path.join(__dirname, '../data/databases/inventory.db'), autoload: true }),
    categories: new Datastore({ filename: path.join(__dirname, '../data/databases/categories.db'), autoload: true }),
    customers: new Datastore({ filename: path.join(__dirname, '../data/databases/customers.db'), autoload: true }),
    transactions: new Datastore({ filename: path.join(__dirname, '../data/databases/transactions.db'), autoload: true }),
    inventory_matrix: new Datastore({ filename: path.join(__dirname, '../data/databases/inventory_matrix.db'), autoload: true }),
    gift_store: new Datastore({ filename: path.join(__dirname, '../data/databases/gift_store.db'), autoload: true }),
    users: new Datastore({ filename: path.join(__dirname, '../data/databases/users.db'), autoload: true }),
    settings: new Datastore({ filename: path.join(__dirname, '../data/databases/settings.db'), autoload: true }),
    suppliers: new Datastore({ filename: path.join(__dirname, '../data/databases/suppliers.db'), autoload: true }),
    purchase_orders: new Datastore({ filename: path.join(__dirname, '../data/databases/purchase_orders.db'), autoload: true })
};

// Database type selection
const usePostgreSQL = process.env.USE_POSTGRESQL === 'true';

// PostgreSQL query function
async function queryPostgreSQL(text, params) {
    try {
        const result = await pool.query(text, params);
        return result;
    } catch (error) {
        console.error('PostgreSQL query error:', error);
        throw error;
    }
}

// NeDB query function (existing)
function queryNeDB(collection, query, options = {}) {
    return new Promise((resolve, reject) => {
        let cursor = databases[collection].find(query);
        
        if (options.sort) {
            cursor = cursor.sort(options.sort);
        }
        
        if (options.limit) {
            cursor = cursor.limit(options.limit);
        }
        
        if (options.skip) {
            cursor = cursor.skip(options.skip);
        }
        
        cursor.exec((err, docs) => {
            if (err) {
                reject(err);
            } else {
                resolve(docs);
            }
        });
    });
}

// Unified query function
async function query(collection, query, options = {}) {
    if (usePostgreSQL) {
        // Convert NeDB query to PostgreSQL query
        const sql = convertQueryToSQL(collection, query, options);
        return await queryPostgreSQL(sql.text, sql.params);
    } else {
        return await queryNeDB(collection, query, options);
    }
}

// Convert NeDB query to PostgreSQL SQL
function convertQueryToSQL(collection, query, options) {
    // This is a simplified conversion - would need to be expanded for full functionality
    let sql = `SELECT * FROM ${collection}`;
    const params = [];
    let paramIndex = 1;
    
    if (Object.keys(query).length > 0) {
        sql += ' WHERE ';
        const conditions = [];
        
        for (const [key, value] of Object.entries(query)) {
            if (typeof value === 'string') {
                conditions.push(`${key} = $${paramIndex}`);
                params.push(value);
                paramIndex++;
            } else if (typeof value === 'object' && value.$regex) {
                conditions.push(`${key} LIKE $${paramIndex}`);
                params.push(`%${value.$regex}%`);
                paramIndex++;
            }
        }
        
        sql += conditions.join(' AND ');
    }
    
    if (options.sort) {
        const sortFields = Object.entries(options.sort)
            .map(([field, direction]) => `${field} ${direction === 1 ? 'ASC' : 'DESC'}`)
            .join(', ');
        sql += ` ORDER BY ${sortFields}`;
    }
    
    if (options.limit) {
        sql += ` LIMIT $${paramIndex}`;
        params.push(options.limit);
        paramIndex++;
    }
    
    if (options.skip) {
        sql += ` OFFSET $${paramIndex}`;
        params.push(options.skip);
    }
    
    return { text: sql, params };
}

// Export functions
module.exports = {
    query,
    queryPostgreSQL,
    queryNeDB,
    convertQueryToSQL,
    pool,
    databases,
    usePostgreSQL
};
```

### 3.2 Update API Modules

Each API module in the `api/` directory needs to be updated to support both NeDB and PostgreSQL. The migration will be gradual:

1. **Phase 1**: Keep existing NeDB functionality
2. **Phase 2**: Add PostgreSQL support alongside NeDB
3. **Phase 3**: Switch to PostgreSQL by default
4. **Phase 4**: Remove NeDB code

## Phase 4: Testing and Deployment

### 4.1 Testing Strategy

1. **Unit Tests**: Test individual database operations
2. **Integration Tests**: Test API endpoints with PostgreSQL
3. **Migration Tests**: Test data migration from NeDB to PostgreSQL
4. **Performance Tests**: Compare NeDB vs PostgreSQL performance
5. **User Acceptance Tests**: Test with real users

### 4.2 Deployment Steps

1. **Backup Existing Data**: Export all NeDB data
2. **Create PostgreSQL Schema**: Run the schema creation script
3. **Migrate Data**: Run the migration script
4. **Update Configuration**: Set `USE_POSTGRESQL=true` in environment
5. **Test Thoroughly**: Verify all functionality works
6. **Deploy**: Update both applications
7. **Monitor**: Watch for any issues in production

### 4.3 Rollback Plan

If issues occur:
1. Set `USE_POSTGRESQL=false` to revert to NeDB
2. Restore NeDB databases from backup
3. Investigate and fix issues
4. Retry migration

## Benefits of Centralized Database

1. **Real-time Data Access**: Both applications see the same data instantly
2. **No Synchronization Issues**: Eliminates the complex sync engine
3. **Better Performance**: Direct database access vs. API calls
4. **Data Integrity**: PostgreSQL's ACID compliance ensures consistency
5. **Scalability**: Can support multiple devices and concurrent users
6. **Backup & Recovery**: Centralized backup strategy
7. **Analytics**: Better reporting and analytics capabilities

## Next Steps

1. **Create Database Schema**: Run the SQL schema creation
2. **Test Web Application**: Verify web app works with PostgreSQL
3. **Create Migration Tools**: Build and test data migration scripts
4. **Update Electron App**: Gradually migrate API modules
5. **Test Integration**: Ensure both applications work together
6. **Deploy**: Roll out the centralized database solution

This centralized database approach will provide a much more robust and scalable solution for your retail POS system, eliminating all the synchronization issues we've been working on.
