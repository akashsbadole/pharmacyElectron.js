/**
 * Pricing Engine Database Migration Script
 * Creates and initializes all pricing-related database tables for StyleMine
 */

const Datastore = require("@seald-io/nedb");
const path = require("path");
const async = require("async");

const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

// Database paths for pricing system
const dbPaths = {
    pricing_history: path.join(appData, appName, "server", "databases", "pricing_history.db"),
    competitor_prices: path.join(appData, appName, "server", "databases", "competitor_prices.db"),
    pricing_rules: path.join(appData, appName, "server", "databases", "pricing_rules.db"),
    pricing_analytics: path.join(appData, appName, "server", "databases", "pricing_analytics.db"),
    mrp_compliance: path.join(appData, appName, "server", "databases", "mrp_compliance.db"),
    price_elasticity: path.join(appData, appName, "server", "databases", "price_elasticity.db"),
    dynamic_pricing: path.join(appData, appName, "server", "databases", "dynamic_pricing.db")
};

class PricingEngineMigration {
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
            console.log('Starting Pricing Engine Database Migration...');
            
            // Create all pricing databases
            await this.createDatabases();
            
            // Initialize database schemas
            await this.initializeSchemas();
            
            // Insert default data
            await this.insertDefaultData();
            
            // Create indexes
            await this.createIndexes();
            
            console.log('Pricing Engine Database Migration completed successfully!');
            console.log('Migration Results:', this.migrationResults);
            
            return this.migrationResults;
            
        } catch (error) {
            console.error('Pricing Engine Database Migration failed:', error);
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
            this.initializePricingHistorySchema.bind(this),
            this.initializeCompetitorPricesSchema.bind(this),
            this.initializePricingRulesSchema.bind(this),
            this.initializePricingAnalyticsSchema.bind(this),
            this.initializeMRPComplianceSchema.bind(this),
            this.initializePriceElasticitySchema.bind(this),
            this.initializeDynamicPricingSchema.bind(this)
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

    async initializePricingHistorySchema() {
        const db = this.databases.pricing_history;
        
        // Ensure index on product_id
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "product_id", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Ensure index on timestamp
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "timestamp", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('✓ Initialized pricing_history schema');
        this.migrationResults.tables_initialized++;
    }

    async initializeCompetitorPricesSchema() {
        const db = this.databases.competitor_prices;
        
        // Ensure index on product_id
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "product_id", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Ensure index on competitor_name
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "competitor_name", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Ensure index on scrape_date
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "scrape_date", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('✓ Initialized competitor_prices schema');
        this.migrationResults.tables_initialized++;
    }

    async initializePricingRulesSchema() {
        const db = this.databases.pricing_rules;
        
        // Ensure index on rule_id
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "rule_id", unique: true }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Ensure index on rule_type
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "rule_type", unique: false }, (err) => {
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

        console.log('✓ Initialized pricing_rules schema');
        this.migrationResults.tables_initialized++;
    }

    async initializePricingAnalyticsSchema() {
        const db = this.databases.pricing_analytics;
        
        // Ensure index on timestamp
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "timestamp", unique: false }, (err) => {
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

        console.log('✓ Initialized pricing_analytics schema');
        this.migrationResults.tables_initialized++;
    }

    async initializeMRPComplianceSchema() {
        const db = this.databases.mrp_compliance;
        
        // Ensure index on product_id
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "product_id", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Ensure index on timestamp
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "timestamp", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Ensure index on severity_level
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "severity_level", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('✓ Initialized mrp_compliance schema');
        this.migrationResults.tables_initialized++;
    }

    async initializePriceElasticitySchema() {
        const db = this.databases.price_elasticity;
        
        // Ensure index on product_id
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "product_id", unique: true }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Ensure index on status
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "status", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('✓ Initialized price_elasticity schema');
        this.migrationResults.tables_initialized++;
    }

    async initializeDynamicPricingSchema() {
        const db = this.databases.dynamic_pricing;
        
        // Ensure index on product_id
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "product_id", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Ensure index on timestamp
        await new Promise((resolve, reject) => {
            db.ensureIndex({ fieldName: "timestamp", unique: false }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('✓ Initialized dynamic_pricing schema');
        this.migrationResults.tables_initialized++;
    }

    async insertDefaultData() {
        const defaultDataTasks = [
            this.insertDefaultPricingRules.bind(this),
            this.insertDefaultCompetitorData.bind(this),
            this.insertDefaultPricingAnalytics.bind(this)
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

    async insertDefaultPricingRules() {
        const db = this.databases.pricing_rules;
        
        const defaultRules = [
            {
                rule_id: "DEMAND_BASED_001",
                rule_name: "High Demand Premium",
                rule_type: "dynamic",
                rule_config: {
                    description: "Apply premium pricing when demand is high",
                    trigger_conditions: {
                        demand_threshold: 0.8,
                        inventory_level: "low"
                    },
                    pricing_formula: {
                        base_multiplier: 1.05,
                        demand_multiplier: 1.15
                    },
                    priority: 1,
                    is_stackable: false
                },
                applicability: {
                    product_ids: [],
                    categories: ["formal_shirts", "casual_pants"],
                    customer_segments: ["all"],
                    geographic_regions: ["all"],
                    time_restrictions: {}
                },
                pricing_parameters: {
                    base_price_modifier: 0,
                    percentage_adjustment: 5,
                    fixed_amount_adjustment: 0,
                    minimum_price: 0,
                    maximum_price: 0,
                    floor_margin_percentage: 15
                },
                dynamic_factors: {
                    demand_based: true,
                    competitor_based: false,
                    inventory_based: true,
                    time_based: false,
                    customer_based: false
                },
                validity: {
                    start_date: new Date().toISOString(),
                    end_date: null,
                    usage_limit: 0,
                    is_active: true
                },
                status: {
                    is_active: true,
                    created_by: "system",
                    created_at: new Date().toISOString()
                }
            },
            {
                rule_id: "COMPETITOR_MATCH_001",
                rule_name: "Competitor Price Matching",
                rule_type: "competitor_based",
                rule_config: {
                    description: "Match competitor prices within acceptable margin",
                    trigger_conditions: {
                        price_gap_threshold: 0.05,
                        competitor_count: 2
                    },
                    pricing_formula: {
                        match_percentage: 0.98,
                        margin_floor: 0.12
                    },
                    priority: 2,
                    is_stackable: true
                },
                applicability: {
                    product_ids: [],
                    categories: ["formal_shirts", "casual_pants", "accessories"],
                    customer_segments: ["all"],
                    geographic_regions: ["all"],
                    time_restrictions: {}
                },
                pricing_parameters: {
                    base_price_modifier: 0,
                    percentage_adjustment: -2,
                    fixed_amount_adjustment: 0,
                    minimum_price: 0,
                    maximum_price: 0,
                    floor_margin_percentage: 12
                },
                dynamic_factors: {
                    demand_based: false,
                    competitor_based: true,
                    inventory_based: false,
                    time_based: false,
                    customer_based: false
                },
                validity: {
                    start_date: new Date().toISOString(),
                    end_date: null,
                    usage_limit: 0,
                    is_active: true
                },
                status: {
                    is_active: true,
                    created_by: "system",
                    created_at: new Date().toISOString()
                }
            },
            {
                rule_id: "CLEARANCE_001",
                rule_name: "Clearance Sale",
                rule_type: "time_based",
                rule_config: {
                    description: "Apply clearance pricing for slow-moving inventory",
                    trigger_conditions: {
                        inventory_age_days: 90,
                        sales_velocity: "low"
                    },
                    pricing_formula: {
                        clearance_discount: 0.25,
                        minimum_margin: 0.05
                    },
                    priority: 3,
                    is_stackable: false
                },
                applicability: {
                    product_ids: [],
                    categories: ["all"],
                    customer_segments: ["all"],
                    geographic_regions: ["all"],
                    time_restrictions: {
                        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                        end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
                    }
                },
                pricing_parameters: {
                    base_price_modifier: 0,
                    percentage_adjustment: -25,
                    fixed_amount_adjustment: 0,
                    minimum_price: 0,
                    maximum_price: 0,
                    floor_margin_percentage: 5
                },
                dynamic_factors: {
                    demand_based: false,
                    competitor_based: false,
                    inventory_based: true,
                    time_based: true,
                    customer_based: false
                },
                validity: {
                    start_date: new Date().toISOString(),
                    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                    usage_limit: 0,
                    is_active: true
                },
                status: {
                    is_active: true,
                    created_by: "system",
                    created_at: new Date().toISOString()
                }
            }
        ];

        return new Promise((resolve, reject) => {
            db.insert(defaultRules, (err, docs) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✓ Inserted ${defaultRules.length} default pricing rules`);
                    this.migrationResults.default_data_inserted += defaultRules.length;
                    resolve();
                }
            });
        });
    }

    async insertDefaultCompetitorData() {
        const db = this.databases.competitor_prices;
        
        const defaultCompetitors = [
            {
                product_id: 1,
                competitor_name: "Amazon",
                competitor_price: 1299,
                product_url: "https://amazon.in/product-1",
                scrape_date: new Date().toISOString(),
                notes: "Initial competitor price data",
                created_at: new Date().toISOString()
            },
            {
                product_id: 1,
                competitor_name: "Flipkart",
                competitor_price: 1279,
                product_url: "https://flipkart.com/product-1",
                scrape_date: new Date().toISOString(),
                notes: "Initial competitor price data",
                created_at: new Date().toISOString()
            },
            {
                product_id: 2,
                competitor_name: "Myntra",
                competitor_price: 1899,
                product_url: "https://myntra.com/product-2",
                scrape_date: new Date().toISOString(),
                notes: "Initial competitor price data",
                created_at: new Date().toISOString()
            }
        ];

        return new Promise((resolve, reject) => {
            db.insert(defaultCompetitors, (err, docs) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✓ Inserted ${defaultCompetitors.length} default competitor prices`);
                    this.migrationResults.default_data_inserted += defaultCompetitors.length;
                    resolve();
                }
            });
        });
    }

    async insertDefaultPricingAnalytics() {
        const db = this.databases.pricing_analytics;
        
        const defaultAnalytics = [
            {
                timestamp: new Date().toISOString(),
                product_id: 1,
                final_price: 1299,
                price_change: 0,
                adjustment_type: "base_price",
                adjustment_amount: 0,
                applied_rules: ["DEMAND_BASED_001"],
                margin_percentage: 28.5,
                elasticity_factor: -1.2,
                competitiveness_score: 7.8,
                generated_at: new Date().toISOString()
            },
            {
                timestamp: new Date().toISOString(),
                product_id: 2,
                final_price: 1950,
                price_change: -50,
                adjustment_type: "competitor_based",
                adjustment_amount: -50,
                applied_rules: ["COMPETITOR_MATCH_001"],
                margin_percentage: 25.0,
                elasticity_factor: -0.8,
                competitiveness_score: 8.2,
                generated_at: new Date().toISOString()
            }
        ];

        return new Promise((resolve, reject) => {
            db.insert(defaultAnalytics, (err, docs) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✓ Inserted ${defaultAnalytics.length} default pricing analytics records`);
                    this.migrationResults.default_data_inserted += defaultAnalytics.length;
                    resolve();
                }
            });
        });
    }

    async createIndexes() {
        // Additional compound indexes for performance
        const indexTasks = [
            // Pricing history compound index
            (callback) => {
                this.databases.pricing_history.ensureIndex({ 
                    fieldName: "product_id,timestamp", 
                    unique: false 
                }, callback);
            },
            
            // Competitor prices compound index
            (callback) => {
                this.databases.competitor_prices.ensureIndex({ 
                    fieldName: "product_id,competitor_name", 
                    unique: false 
                }, callback);
            },
            
            // MRP compliance compound index
            (callback) => {
                this.databases.mrp_compliance.ensureIndex({ 
                    fieldName: "severity_level,timestamp", 
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
            console.log('Validating Pricing Engine Migration...');
            
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
            
            console.log('✓ Pricing Engine Migration validation completed successfully');
            return true;
            
        } catch (error) {
            console.error('✗ Pricing Engine Migration validation failed:', error);
            return false;
        }
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    const migration = new PricingEngineMigration();
    
    migration.initialize()
        .then(() => {
            console.log('\n🎉 Pricing Engine Database Migration Summary:');
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
            console.error('\n❌ Pricing Engine Database Migration failed:');
            console.error(error);
            process.exit(1);
        });
}

module.exports = PricingEngineMigration;