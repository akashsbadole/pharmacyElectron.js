// NeDB to PostgreSQL Migration Script
// This script migrates data from NeDB files to PostgreSQL database

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const Datastore = require('@seald-io/nedb');

// PostgreSQL connection configuration
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'garmentpos',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'root'
});

// NeDB database paths
const nedbPath = process.env.NEDB_PATH || './data/databases';

// Migration statistics
const stats = {
    totalRecords: 0,
    migratedRecords: 0,
    errors: 0,
    startTime: null,
    endTime: null
};

async function migrateData() {
    try {
        console.log('🚀 Starting NeDB to PostgreSQL migration...');
        console.log(`📊 Database: ${process.env.DB_NAME || 'garmentpos'}`);
        console.log(`📁 NeDB Path: ${nedbPath}`);
        
        stats.startTime = new Date();
        
        // Test PostgreSQL connection
        await testPostgreSQLConnection();
        
        // Migrate data in order (respecting foreign key constraints)
        await migrateCategories();
        await migrateProducts();
        await migrateSuppliers();
        await migrateCustomers();
        await migrateUsers();
        await migrateSettings();
        await migrateInventoryMatrix();
        await migrateGiftCards();
        await migrateGiftBundles();
        await migrateTransactions();
        await migrateGiftReceipts();
        await migratePurchaseOrders();
        
        stats.endTime = new Date();
        const duration = stats.endTime - stats.startTime;
        
        console.log('\n✅ Migration completed successfully!');
        console.log('📈 Migration Statistics:');
        console.log(`  - Total Records: ${stats.totalRecords}`);
        console.log(`  - Migrated: ${stats.migratedRecords}`);
        console.log(`  - Errors: ${stats.errors}`);
        console.log(`  - Duration: ${Math.round(duration / 1000)} seconds`);
        
        // Close database connections
        await pool.end();
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack:', error.stack);
        
        // Close database connections
        await pool.end();
        
        process.exit(1);
    }
}

async function testPostgreSQLConnection() {
    try {
        const result = await pool.query('SELECT NOW() as current_time');
        console.log(`✅ PostgreSQL connection successful: ${result.rows[0].current_time}`);
    } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        throw error;
    }
}

async function migrateCategories() {
    console.log('\n📦 Migrating Categories...');
    
    const db = new Datastore({ filename: path.join(nedbPath, 'categories.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({}, (err, categories) => {
            if (err) {
                console.error('❌ Error reading categories:', err);
                return reject(err);
            }
            
            if (categories.length === 0) {
                console.log('  ℹ️  No categories to migrate');
                return resolve();
            }
            
            console.log(`  📋 Found ${categories.length} categories`);
            
            const insertPromises = categories.map(category => {
                stats.totalRecords++;
                return pool.query(
                    `INSERT INTO categories (name, description, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4) 
                     ON CONFLICT (name) DO UPDATE SET 
                     description = EXCLUDED.description,
                     updated_at = EXCLUDED.updated_at`,
                    [
                        category.name || 'Unknown Category',
                        category.description || null,
                        category.created_at || new Date(),
                        category.updated_at || new Date()
                    ]
                ).then(() => {
                    stats.migratedRecords++;
                }).catch(error => {
                    stats.errors++;
                    console.error(`  ❌ Error migrating category "${category.name}":`, error.message);
                });
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`  ✅ Migrated ${categories.length} categories`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

async function migrateProducts() {
    console.log('\n🛍️  Migrating Products...');
    
    const db = new Datastore({ filename: path.join(nedbPath, 'inventory.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({}, (err, products) => {
            if (err) {
                console.error('❌ Error reading products:', err);
                return reject(err);
            }
            
            if (products.length === 0) {
                console.log('  ℹ️  No products to migrate');
                return resolve();
            }
            
            console.log(`  📋 Found ${products.length} products`);
            
            const insertPromises = products.map(product => {
                stats.totalRecords++;
                return pool.query(
                    `INSERT INTO products (name, category_id, price, quantity, barcode, description, image_url, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                     ON CONFLICT (name) DO UPDATE SET 
                     category_id = EXCLUDED.category_id,
                     price = EXCLUDED.price,
                     quantity = EXCLUDED.quantity,
                     barcode = EXCLUDED.barcode,
                     description = EXCLUDED.description,
                     image_url = EXCLUDED.image_url,
                     updated_at = EXCLUDED.updated_at`,
                    [
                        product.name || 'Unknown Product',
                        product.category_id || null,
                        parseFloat(product.price) || 0,
                        parseInt(product.quantity) || 0,
                        product.barcode || null,
                        product.description || null,
                        product.image_url || null,
                        product.created_at || new Date(),
                        product.updated_at || new Date()
                    ]
                ).then(() => {
                    stats.migratedRecords++;
                }).catch(error => {
                    stats.errors++;
                    console.error(`  ❌ Error migrating product "${product.name}":`, error.message);
                });
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`  ✅ Migrated ${products.length} products`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

async function migrateSuppliers() {
    console.log('\n🏢 Migrating Suppliers...');
    
    const db = new Datastore({ filename: path.join(nedbPath, 'suppliers.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({}, (err, suppliers) => {
            if (err) {
                console.error('❌ Error reading suppliers:', err);
                return reject(err);
            }
            
            if (suppliers.length === 0) {
                console.log('  ℹ️  No suppliers to migrate');
                return resolve();
            }
            
            console.log(`  📋 Found ${suppliers.length} suppliers`);
            
            const insertPromises = suppliers.map(supplier => {
                stats.totalRecords++;
                return pool.query(
                    `INSERT INTO suppliers (name, contact_person, email, phone, address, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) 
                     ON CONFLICT (name) DO UPDATE SET 
                     contact_person = EXCLUDED.contact_person,
                     email = EXCLUDED.email,
                     phone = EXCLUDED.phone,
                     address = EXCLUDED.address,
                     updated_at = EXCLUDED.updated_at`,
                    [
                        supplier.name || 'Unknown Supplier',
                        supplier.contact_person || null,
                        supplier.email || null,
                        supplier.phone || null,
                        supplier.address || null,
                        supplier.created_at || new Date(),
                        supplier.updated_at || new Date()
                    ]
                ).then(() => {
                    stats.migratedRecords++;
                }).catch(error => {
                    stats.errors++;
                    console.error(`  ❌ Error migrating supplier "${supplier.name}":`, error.message);
                });
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`  ✅ Migrated ${suppliers.length} suppliers`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

async function migrateCustomers() {
    console.log('\n👥 Migrating Customers...');
    
    const db = new Datastore({ filename: path.join(nedbPath, 'customers.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({}, (err, customers) => {
            if (err) {
                console.error('❌ Error reading customers:', err);
                return reject(err);
            }
            
            if (customers.length === 0) {
                console.log('  ℹ️  No customers to migrate');
                return resolve();
            }
            
            console.log(`  📋 Found ${customers.length} customers`);
            
            const insertPromises = customers.map(customer => {
                stats.totalRecords++;
                return pool.query(
                    `INSERT INTO customers (name, email, phone, address, loyalty_points, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) 
                     ON CONFLICT (name) DO UPDATE SET 
                     email = EXCLUDED.email,
                     phone = EXCLUDED.phone,
                     address = EXCLUDED.address,
                     loyalty_points = EXCLUDED.loyalty_points,
                     updated_at = EXCLUDED.updated_at`,
                    [
                        customer.name || 'Unknown Customer',
                        customer.email || null,
                        customer.phone || null,
                        customer.address || null,
                        parseInt(customer.loyalty_points) || 0,
                        customer.created_at || new Date(),
                        customer.updated_at || new Date()
                    ]
                ).then(() => {
                    stats.migratedRecords++;
                }).catch(error => {
                    stats.errors++;
                    console.error(`  ❌ Error migrating customer "${customer.name}":`, error.message);
                });
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`  ✅ Migrated ${customers.length} customers`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

async function migrateUsers() {
    console.log('\n👤 Migrating Users...');
    
    const db = new Datastore({ filename: path.join(nedbPath, 'users.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({}, (err, users) => {
            if (err) {
                console.error('❌ Error reading users:', err);
                return reject(err);
            }
            
            if (users.length === 0) {
                console.log('  ℹ️  No users to migrate');
                return resolve();
            }
            
            console.log(`  📋 Found ${users.length} users`);
            
            const insertPromises = users.map(user => {
                stats.totalRecords++;
                return pool.query(
                    `INSERT INTO users (username, password_hash, fullname, email, role, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) 
                     ON CONFLICT (username) DO UPDATE SET 
                     fullname = EXCLUDED.fullname,
                     email = EXCLUDED.email,
                     role = EXCLUDED.role,
                     updated_at = EXCLUDED.updated_at`,
                    [
                        user.username || 'unknown_user',
                        user.password_hash || '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // default password: "admin123"
                        user.fullname || 'Unknown User',
                        user.email || null,
                        user.role || 'user',
                        user.created_at || new Date(),
                        user.updated_at || new Date()
                    ]
                ).then(() => {
                    stats.migratedRecords++;
                }).catch(error => {
                    stats.errors++;
                    console.error(`  ❌ Error migrating user "${user.username}":`, error.message);
                });
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`  ✅ Migrated ${users.length} users`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

async function migrateSettings() {
    console.log('\n⚙️  Migrating Settings...');
    
    const db = new Datastore({ filename: path.join(nedbPath, 'settings.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({}, (err, settings) => {
            if (err) {
                console.error('❌ Error reading settings:', err);
                return reject(err);
            }
            
            if (settings.length === 0) {
                console.log('  ℹ️  No settings to migrate');
                return resolve();
            }
            
            console.log(`  📋 Found ${settings.length} settings`);
            
            const insertPromises = settings.map(setting => {
                stats.totalRecords++;
                return pool.query(
                    `INSERT INTO settings (store_name, store_address, store_phone, currency, tax_rate, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) 
                     ON CONFLICT DO UPDATE SET 
                     store_name = EXCLUDED.store_name,
                     store_address = EXCLUDED.store_address,
                     store_phone = EXCLUDED.store_phone,
                     currency = EXCLUDED.currency,
                     tax_rate = EXCLUDED.tax_rate,
                     updated_at = EXCLUDED.updated_at`,
                    [
                        setting.store_name || 'PharmaMine Retail',
                        setting.store_address || null,
                        setting.store_phone || null,
                        setting.currency || 'USD',
                        parseFloat(setting.tax_rate) || 0.00,
                        setting.created_at || new Date(),
                        setting.updated_at || new Date()
                    ]
                ).then(() => {
                    stats.migratedRecords++;
                }).catch(error => {
                    stats.errors++;
                    console.error(`  ❌ Error migrating settings:`, error.message);
                });
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`  ✅ Migrated ${settings.length} settings`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

async function migrateInventoryMatrix() {
    console.log('\n📦 Migrating Inventory Matrix...');
    
    const db = new Datastore({ filename: path.join(nedbPath, 'inventory_matrix.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({}, (err, items) => {
            if (err) {
                console.error('❌ Error reading inventory matrix:', err);
                return reject(err);
            }
            
            if (items.length === 0) {
                console.log('  ℹ️  No inventory matrix items to migrate');
                return resolve();
            }
            
            console.log(`  📋 Found ${items.length} inventory matrix items`);
            
            const insertPromises = items.map(item => {
                stats.totalRecords++;
                return pool.query(
                    `INSERT INTO inventory_matrix (product_id, size, color, quantity, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4, $5, $6) 
                     ON CONFLICT (product_id, size, color) DO UPDATE SET 
                     quantity = EXCLUDED.quantity,
                     updated_at = EXCLUDED.updated_at`,
                    [
                        item.product_id || null,
                        item.size || null,
                        item.color || null,
                        parseInt(item.quantity) || 0,
                        item.created_at || new Date(),
                        item.updated_at || new Date()
                    ]
                ).then(() => {
                    stats.migratedRecords++;
                }).catch(error => {
                    stats.errors++;
                    console.error(`  ❌ Error migrating inventory matrix item:`, error.message);
                });
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`  ✅ Migrated ${items.length} inventory matrix items`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

async function migrateGiftCards() {
    console.log('\n🎁 Migrating Gift Cards...');
    
    const db = new Datastore({ filename: path.join(nedbPath, 'gift_store.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({}, (err, giftCards) => {
            if (err) {
                console.error('❌ Error reading gift cards:', err);
                return reject(err);
            }
            
            if (giftCards.length === 0) {
                console.log('  ℹ️  No gift cards to migrate');
                return resolve();
            }
            
            console.log(`  📋 Found ${giftCards.length} gift cards`);
            
            const insertPromises = giftCards.map(card => {
                stats.totalRecords++;
                return pool.query(
                    `INSERT INTO gift_cards (card_number, balance, status, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4, $5) 
                     ON CONFLICT (card_number) DO UPDATE SET 
                     balance = EXCLUDED.balance,
                     status = EXCLUDED.status,
                     updated_at = EXCLUDED.updated_at`,
                    [
                        card.card_number || 'GC-' + Math.random().toString(36).substr(2, 9),
                        parseFloat(card.balance) || 0.00,
                        card.status || 'active',
                        card.created_at || new Date(),
                        card.updated_at || new Date()
                    ]
                ).then(() => {
                    stats.migratedRecords++;
                }).catch(error => {
                    stats.errors++;
                    console.error(`  ❌ Error migrating gift card "${card.card_number}":`, error.message);
                });
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`  ✅ Migrated ${giftCards.length} gift cards`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

async function migrateGiftBundles() {
    console.log('\n🎀 Migrating Gift Bundles...');
    
    const db = new Datastore({ filename: path.join(nedbPath, 'gift_store.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({ type: 'bundle' }, (err, bundles) => {
            if (err) {
                console.error('❌ Error reading gift bundles:', err);
                return reject(err);
            }
            
            if (bundles.length === 0) {
                console.log('  ℹ️  No gift bundles to migrate');
                return resolve();
            }
            
            console.log(`  📋 Found ${bundles.length} gift bundles`);
            
            const insertPromises = bundles.map(bundle => {
                stats.totalRecords++;
                return pool.query(
                    `INSERT INTO gift_bundles (name, description, price, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4, $5) 
                     ON CONFLICT (name) DO UPDATE SET 
                     description = EXCLUDED.description,
                     price = EXCLUDED.price,
                     updated_at = EXCLUDED.updated_at`,
                    [
                        bundle.name || 'Unknown Bundle',
                        bundle.description || null,
                        parseFloat(bundle.price) || 0.00,
                        bundle.created_at || new Date(),
                        bundle.updated_at || new Date()
                    ]
                ).then(() => {
                    stats.migratedRecords++;
                }).catch(error => {
                    stats.errors++;
                    console.error(`  ❌ Error migrating gift bundle "${bundle.name}":`, error.message);
                });
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`  ✅ Migrated ${bundles.length} gift bundles`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

async function migrateTransactions() {
    console.log('\n💳 Migrating Transactions...');
    
    const db = new Datastore({ filename: path.join(nedbPath, 'transactions.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({}, (err, transactions) => {
            if (err) {
                console.error('❌ Error reading transactions:', err);
                return reject(err);
            }
            
            if (transactions.length === 0) {
                console.log('  ℹ️  No transactions to migrate');
                return resolve();
            }
            
            console.log(`  📋 Found ${transactions.length} transactions`);
            
            const insertPromises = transactions.map(transaction => {
                stats.totalRecords++;
                return pool.query(
                    `INSERT INTO transactions (order_number, customer_id, total, payment_method, status, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) 
                     ON CONFLICT (order_number) DO UPDATE SET 
                     customer_id = EXCLUDED.customer_id,
                     total = EXCLUDED.total,
                     payment_method = EXCLUDED.payment_method,
                     status = EXCLUDED.status,
                     updated_at = EXCLUDED.updated_at`,
                    [
                        transaction.order_number || 'TRX-' + Math.random().toString(36).substr(2, 9),
                        transaction.customer_id || null,
                        parseFloat(transaction.total) || 0.00,
                        transaction.payment_method || 'cash',
                        transaction.status || 'completed',
                        transaction.created_at || new Date(),
                        transaction.updated_at || new Date()
                    ]
                ).then(() => {
                    stats.migratedRecords++;
                }).catch(error => {
                    stats.errors++;
                    console.error(`  ❌ Error migrating transaction "${transaction.order_number}":`, error.message);
                });
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`  ✅ Migrated ${transactions.length} transactions`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

async function migrateGiftReceipts() {
    console.log('\n🎫 Migrating Gift Receipts...');
    
    const db = new Datastore({ filename: path.join(nedbPath, 'gift_store.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({ type: 'receipt' }, (err, receipts) => {
            if (err) {
                console.error('❌ Error reading gift receipts:', err);
                return reject(err);
            }
            
            if (receipts.length === 0) {
                console.log('  ℹ️  No gift receipts to migrate');
                return resolve();
            }
            
            console.log(`  📋 Found ${receipts.length} gift receipts`);
            
            const insertPromises = receipts.map(receipt => {
                stats.totalRecords++;
                return pool.query(
                    `INSERT INTO gift_receipts (transaction_id, gift_card_number, amount, created_at) 
                     VALUES ($1, $2, $3, $4)`,
                    [
                        receipt.transaction_id || null,
                        receipt.gift_card_number || 'GC-' + Math.random().toString(36).substr(2, 9),
                        parseFloat(receipt.amount) || 0.00,
                        receipt.created_at || new Date()
                    ]
                ).then(() => {
                    stats.migratedRecords++;
                }).catch(error => {
                    stats.errors++;
                    console.error(`  ❌ Error migrating gift receipt:`, error.message);
                });
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`  ✅ Migrated ${receipts.length} gift receipts`);
                    resolve();
                })
                .catch(reject);
        });
    });
}

async function migratePurchaseOrders() {
    console.log('\n📋 Migrating Purchase Orders...');
    
    const db = new Datastore({ filename: path.join(nedbPath, 'purchase_orders.db'), autoload: true });
    
    return new Promise((resolve, reject) => {
        db.find({}, (err, orders) => {
            if (err) {
                console.error('❌ Error reading purchase orders:', err);
                return reject(err);
            }
            
            if (orders.length === 0) {
                console.log('  ℹ️  No purchase orders to migrate');
                return resolve();
            }
            
            console.log(`  📋 Found ${orders.length} purchase orders`);
            
            const insertPromises = orders.map(order => {
                stats.totalRecords++;
                return pool.query(
                    `INSERT INTO purchase_orders (supplier_id, order_date, expected_delivery_date, status, total, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) 
                     ON CONFLICT DO NOTHING`,
                    [
                        order.supplier_id || null,
                        order.order_date || new Date(),
                        order.expected_delivery_date || null,
                        order.status || 'pending',
                        parseFloat(order.total) || 0.00,
                        order.created_at || new Date(),
                        order.updated_at || new Date()
                    ]
                ).then(() => {
                    stats.migratedRecords++;
                }).catch(error => {
                    stats.errors++;
                    console.error(`  ❌ Error migrating purchase order:`, error.message);
                });
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    console.log(`  ✅ Migrated ${orders.length} purchase orders`);
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
            console.log('\n🎉 Migration script completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Migration script failed:', error.message);
            process.exit(1);
        });
}

module.exports = { migrateData, stats };
