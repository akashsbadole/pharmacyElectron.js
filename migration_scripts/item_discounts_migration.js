/**
 * Item Discounts Database Migration Script
 * Creates and initializes item-level discount database tables for StyleMine
 */

const Datastore = require("@seald-io/nedb");
const path = require("path");
const async = require("async");

const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

// Database paths for item discounts
const dbPaths = {
    item_discounts: path.join(appData, appName, "server", "databases", "item_discounts.db"),
    cart_item_discounts: path.join(appData, appName, "server", "databases", "cart_item_discounts.db")
};

class ItemDiscountsMigration {
    constructor() {
        this.databases = {};
        this.migrationResults = {
            success: true,
            databases_created: 0,
            tables_initialized: 0,
            default_data_inserted: 0,
            errors: []
        };
    }

    async initialize() {
        try {
            console.log('Starting Item Discounts Database Migration...');

            // Create all item discount databases
            await this.createDatabases();

            // Initialize database schemas
            await this.initializeSchemas();

            // Insert default data
            await this.insertDefaultData();

            // Create indexes
            await this.createIndexes();

            console.log('Item Discounts Database Migration completed successfully!');
            console.log('Migration Results:', this.migrationResults);

            return this.migrationResults;

        } catch (error) {
            console.error('Item Discounts Database Migration failed:', error);
            this.migrationResults.success = false;
            this.migrationResults.errors.push(error.message);
            throw error;
        }
    }

    async createDatabases() {
        const dbCreationTasks = Object.keys(dbPaths).map(dbName => {
            return (callback) => {
                try {
                    const dbPath = dbPaths[dbName];
                    const db = new Datastore({
                        filename: dbPath,
                        autoload: true,
                        timestampData: true
                    });

                    this.databases[dbName] = db;
                    console.log(`✓ Created database: ${dbName}`);
                    this.migrationResults.databases_created++;
                    callback();
                } catch (error) {
                    console.error(`✗ Failed to create database ${dbName}:`, error);
                    this.migrationResults.errors.push(`Database creation failed: ${dbName}`);
                    callback(error);
                }
            };
        });

        return new Promise((resolve, reject) => {
            async.series(dbCreationTasks, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async initializeSchemas() {
        const schemaInitializationTasks = [
            this.initializeItemDiscountsSchema.bind(this),
            this.initializeCartItemDiscountsSchema.bind(this)
        ];

        return new Promise((resolve, reject) => {
            async.series(schemaInitializationTasks, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async initializeItemDiscountsSchema() {
        const db = this.databases.item_discounts;

        // Ensure index on discount_id (unique)
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "discount_id", unique: true }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Ensure index on product_id
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "product_id", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Ensure index on discount_type
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "discount_type", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Ensure index on status.is_active
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "status.is_active", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('✓ Initialized item_discounts schema');
        this.migrationResults.tables_initialized++;
    }

    async initializeCartItemDiscountsSchema() {
        const db = this.databases.cart_item_discounts;

        // Ensure index on cart_item_discount_id (unique)
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "cart_item_discount_id", unique: true }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Ensure index on transaction_id
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "transaction_id", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Ensure index on product_id
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "product_id", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Ensure index on discount_id
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "discount_id", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('✓ Initialized cart_item_discounts schema');
        this.migrationResults.tables_initialized++;
    }

    async insertDefaultData() {
        const defaultDataTasks = [
            this.insertDefaultItemDiscounts.bind(this)
        ];

        return new Promise((resolve, reject) => {
            async.series(defaultDataTasks, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async insertDefaultItemDiscounts() {
        const db = this.databases.item_discounts;

        const defaultDiscounts = [
            {
                discount_id: "DISC_ITEM_001",
                product_id: "PROD_001",
                discount_type: "percentage",
                discount_value: 10,
                conditions: {
                    minimum_quantity: 1,
                    maximum_quantity: 10,
                    customer_segments: ["vip", "loyal"],
                    valid_from: new Date().toISOString(),
                    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                },
                bulk_rules: null,
                status: {
                    is_active: true,
                    created_at: new Date().toISOString(),
                    created_by: "system"
                },
                analytics: {
                    times_applied: 0,
                    total_discount_given: 0,
                    revenue_impact: 0
                }
            },
            {
                discount_id: "DISC_ITEM_002",
                product_id: "PROD_002",
                discount_type: "bulk",
                discount_value: 25,
                conditions: {
                    minimum_quantity: 3,
                    maximum_quantity: 20,
                    customer_segments: ["all"],
                    valid_from: new Date().toISOString(),
                    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                },
                bulk_rules: {
                    type: "buy_x_get_y_free",
                    buy_quantity: 3,
                    get_quantity: 1,
                    discount_percentage: 25
                },
                status: {
                    is_active: true,
                    created_at: new Date().toISOString(),
                    created_by: "system"
                },
                analytics: {
                    times_applied: 0,
                    total_discount_given: 0,
                    revenue_impact: 0
                }
            },
            {
                discount_id: "DISC_ITEM_003",
                product_id: "PROD_003",
                discount_type: "fixed_amount",
                discount_value: 100,
                conditions: {
                    minimum_quantity: 1,
                    maximum_quantity: 5,
                    customer_segments: ["regular"],
                    valid_from: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                },
                bulk_rules: null,
                status: {
                    is_active: true,
                    created_at: new Date().toISOString(),
                    created_by: "system"
                },
                analytics: {
                    times_applied: 0,
                    total_discount_given: 0,
                    revenue_impact: 0
                }
            }
        ];

        return new Promise((resolve, reject) => {
            db.insert(defaultDiscounts, (err, docs) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✓ Inserted ${defaultDiscounts.length} default item discount rules`);
                    this.migrationResults.default_data_inserted += defaultDiscounts.length;
                    resolve();
                }
            });
        });
    }

    async createIndexes() {
        // Additional compound indexes for performance
        const indexTasks = [
            // Item discounts compound index
            (callback) => {
                this.databases.item_discounts.ensureIndex({
                    fieldName: "product_id,discount_type",
                    unique: false
                }, callback);
            },

            // Cart item discounts compound index
            (callback) => {
                this.databases.cart_item_discounts.ensureIndex({
                    fieldName: "transaction_id,product_id",
                    unique: false
                }, callback);
            }
        ];

        return new Promise((resolve, reject) => {
            async.series(indexTasks, (err) => {
                if (err) {
                    console.warn('Some indexes creation failed:', err);
                } else {
                    console.log('✓ Created compound indexes for performance');
                }
                resolve();
            });
        });
    }

    getMigrationResults() {
        return this.migrationResults;
    }

    async validateMigration() {
        try {
            console.log('Validating Item Discounts Migration...');

            // Check if all databases are accessible
            const validationTasks = Object.keys(this.databases).map(dbName => {
                return new Promise((resolve, reject) => {
                    this.databases[dbName].find({}, { limit: 1 }, (err, docs) => {
                        if (err) {
                            reject(err);
                        } else {
                            console.log(`✓ Database ${dbName} is accessible`);
                            resolve();
                        }
                    });
                });
            });

            await Promise.all(validationTasks);

            console.log('✓ Item Discounts Migration validation completed successfully');
            return true;

        } catch (error) {
            console.error('✗ Item Discounts Migration validation failed:', error);
            return false;
        }
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    const migration = new ItemDiscountsMigration();

    migration.initialize()
        .then(() => {
            console.log('\n🎉 Item Discounts Database Migration Summary:');
            console.log(`   ✓ Databases Created: ${migration.getMigrationResults().databases_created}`);
            console.log(`   ✓ Tables Initialized: ${migration.getMigrationResults().tables_initialized}`);
            console.log(`   ✓ Default Records Inserted: ${migration.getMigrationResults().default_data_inserted}`);
            console.log(`   ✓ Success: ${migration.getMigrationResults().success}`);

            if (migration.getMigrationResults().errors.length > 0) {
                console.log('   ✗ Errors:');
                migration.getMigrationResults().errors.forEach(error => {
                    console.log(`     - ${error}`);
                });
            }

            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Item Discounts Database Migration failed:');
            console.error(error);
            process.exit(1);
        });
}

module.exports = ItemDiscountsMigration;