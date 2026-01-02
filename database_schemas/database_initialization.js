/**
 * Database Initialization Script
 * Sets up all new retail databases with proper indexes and initial data
 * Compatible with StyleMine's NeDB architecture
 */

const Datastore = require('@seald-io/nedb');
const path = require('path');
const fs = require('fs');

class RetailDatabaseInitializer {
    constructor(appData, appName) {
        this.appData = appData;
        this.appName = appName;
        this.dbPath = path.join(appData, appName, "server", "databases");
        this.databases = {};
        this.initializationResults = [];
    }

    /**
     * Initialize all retail databases
     */
    async initializeAllDatabases() {
        try {
            console.log('Initializing Retail Database Collections...');
            
            // Ensure database directory exists
            if (!fs.existsSync(this.dbPath)) {
                fs.mkdirSync(this.dbPath, { recursive: true });
            }

            // Initialize each database
            await this.initializePromotionsDB();
            await this.initializeLoyaltyRulesDB();
            await this.initializeGiftCardsDB();
            await this.initializeBundlesDB();
            await this.initializeCustomerPreferencesDB();
            await this.initializeInventoryMatrixDB();
            await this.initializeOccasionsDB();

            // Create compound indexes
            await this.createCompoundIndexes();

            // Seed initial data
            await this.seedInitialData();

            console.log('All retail databases initialized successfully');
            return this.generateInitializationReport();

        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize Promotions Database
     */
    async initializePromotionsDB() {
        const dbPath = path.join(this.dbPath, 'promotions.db');
        this.databases.promotions = new Datastore({ filename: dbPath, autoload: true });

        return new Promise((resolve, reject) => {
            this.databases.promotions.loadDatabase(async (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Create indexes
                await this.createPromotionsIndexes();
                this.initializationResults.push({ database: 'promotions', status: 'initialized' });
                resolve();
            });
        });
    }

    /**
     * Initialize Loyalty Rules Database
     */
    async initializeLoyaltyRulesDB() {
        const dbPath = path.join(this.dbPath, 'loyalty_rules.db');
        this.databases.loyalty_rules = new Datastore({ filename: dbPath, autoload: true });

        return new Promise((resolve, reject) => {
            this.databases.loyalty_rules.loadDatabase(async (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                await this.createLoyaltyRulesIndexes();
                this.initializationResults.push({ database: 'loyalty_rules', status: 'initialized' });
                resolve();
            });
        });
    }

    /**
     * Initialize Gift Cards Database
     */
    async initializeGiftCardsDB() {
        const dbPath = path.join(this.dbPath, 'gift_cards.db');
        this.databases.gift_cards = new Datastore({ filename: dbPath, autoload: true });

        return new Promise((resolve, reject) => {
            this.databases.gift_cards.loadDatabase(async (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                await this.createGiftCardsIndexes();
                this.initializationResults.push({ database: 'gift_cards', status: 'initialized' });
                resolve();
            });
        });
    }

    /**
     * Initialize Bundles Database
     */
    async initializeBundlesDB() {
        const dbPath = path.join(this.dbPath, 'bundles.db');
        this.databases.bundles = new Datastore({ filename: dbPath, autoload: true });

        return new Promise((resolve, reject) => {
            this.databases.bundles.loadDatabase(async (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                await this.createBundlesIndexes();
                this.initializationResults.push({ database: 'bundles', status: 'initialized' });
                resolve();
            });
        });
    }

    /**
     * Initialize Customer Preferences Database
     */
    async initializeCustomerPreferencesDB() {
        const dbPath = path.join(this.dbPath, 'customer_preferences.db');
        this.databases.customer_preferences = new Datastore({ filename: dbPath, autoload: true });

        return new Promise((resolve, reject) => {
            this.databases.customer_preferences.loadDatabase(async (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                await this.createCustomerPreferencesIndexes();
                this.initializationResults.push({ database: 'customer_preferences', status: 'initialized' });
                resolve();
            });
        });
    }

    /**
     * Initialize Inventory Matrix Database
     */
    async initializeInventoryMatrixDB() {
        const dbPath = path.join(this.dbPath, 'inventory_matrix.db');
        this.databases.inventory_matrix = new Datastore({ filename: dbPath, autoload: true });

        return new Promise((resolve, reject) => {
            this.databases.inventory_matrix.loadDatabase(async (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                await this.createInventoryMatrixIndexes();
                this.initializationResults.push({ database: 'inventory_matrix', status: 'initialized' });
                resolve();
            });
        });
    }

    /**
     * Initialize Occasions Database
     */
    async initializeOccasionsDB() {
        const dbPath = path.join(this.dbPath, 'occasions.db');
        this.databases.occasions = new Datastore({ filename: dbPath, autoload: true });

        return new Promise((resolve, reject) => {
            this.databases.occasions.loadDatabase(async (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                await this.createOccasionsIndexes();
                this.initializationResults.push({ database: 'occasions', status: 'initialized' });
                resolve();
            });
        });
    }

    /**
     * Create individual database indexes
     */
    async createPromotionsIndexes() {
        const indexes = [
            { fieldName: "promotion_code", unique: true },
            { fieldName: "promotion_type", unique: false },
            { fieldName: "timing.start_date", unique: false },
            { fieldName: "timing.end_date", unique: false },
            { fieldName: "approval.approval_status", unique: false },
            { fieldName: "timing.is_active", unique: false }
        ];

        await this.createIndexes(this.databases.promotions, indexes);
    }

    async createLoyaltyRulesIndexes() {
        const indexes = [
            { fieldName: "rule_type", unique: false },
            { fieldName: "status.is_active", unique: false },
            { fieldName: "validity.effective_date", unique: false }
        ];

        await this.createIndexes(this.databases.loyalty_rules, indexes);
    }

    async createGiftCardsIndexes() {
        const indexes = [
            { fieldName: "gift_card_number", unique: true },
            { fieldName: "purchase_info.purchased_by", unique: false },
            { fieldName: "validity.expiry_date", unique: false },
            { fieldName: "status.is_active", unique: false }
        ];

        await this.createIndexes(this.databases.gift_cards, indexes);
    }

    async createBundlesIndexes() {
        const indexes = [
            { fieldName: "bundle_type", unique: false },
            { fieldName: "bundle_details.category", unique: false },
            { fieldName: "bundle_details.occasion", unique: false },
            { fieldName: "inventory.is_available", unique: false },
            { fieldName: "validity.start_date", unique: false },
            { fieldName: "validity.end_date", unique: false }
        ];

        await this.createIndexes(this.databases.bundles, indexes);
    }

    async createCustomerPreferencesIndexes() {
        const indexes = [
            { fieldName: "customer_id", unique: true },
            { fieldName: "engagement_metrics.loyalty_score", unique: false },
            { fieldName: "engagement_metrics.churn_risk", unique: false }
        ];

        await this.createIndexes(this.databases.customer_preferences, indexes);
    }

    async createInventoryMatrixIndexes() {
        const indexes = [
            { fieldName: "product_id", unique: true },
            { fieldName: "matrix_config.tracking_type", unique: false }
        ];

        await this.createIndexes(this.databases.inventory_matrix, indexes);
    }

    async createOccasionsIndexes() {
        const indexes = [
            { fieldName: "occasion_type", unique: false },
            { fieldName: "timing.primary_date", unique: false },
            { fieldName: "timing.next_occurrence", unique: false }
        ];

        await this.createIndexes(this.databases.occasions, indexes);
    }

    /**
     * Create compound indexes for performance
     */
    async createCompoundIndexes() {
        // Note: NeDB doesn't support compound indexes natively
        // We'll document the required compound indexes for future PostgreSQL migration
        console.log('Compound indexes documented for PostgreSQL migration:');
        console.log('- promotions: (promotion_type, timing.is_active)');
        console.log('- gift_cards: (status.is_active, validity.expiry_date)');
        console.log('- bundles: (bundle_details.category, inventory.is_available)');
    }

    /**
     * Helper method to create indexes
     */
    async createIndexes(database, indexes) {
        return new Promise((resolve) => {
            let completed = 0;
            const total = indexes.length;

            indexes.forEach(index => {
                database.ensureIndex(index, (err) => {
                    completed++;
                    if (err) {
                        console.error(`Error creating index for ${index.fieldName}:`, err);
                    } else {
                        console.log(`Created index for ${index.fieldName}`);
                    }
                    
                    if (completed === total) {
                        resolve();
                    }
                });
            });
        });
    }

    /**
     * Seed initial data for retail features
     */
    async seedInitialData() {
        console.log('Seeding initial retail data...');

        // Seed loyalty rules
        await this.seedLoyaltyRules();

        // Seed sample occasions
        await this.seedOccasions();

        // Seed sample promotions
        await this.seedPromotions();

        console.log('Initial data seeding completed');
    }

    /**
     * Seed default loyalty rules
     */
    async seedLoyaltyRules() {
        const defaultRules = [
            {
                rule_id: "LOYALTY_EARN_001",
                rule_name: "Standard Points Earning",
                rule_type: "earning",
                rule_config: {
                    description: "Earn points on every purchase",
                    applicable_to: "all_purchases",
                    min_purchase_amount: 0,
                    max_points_per_transaction: 10000
                },
                points_calculation: {
                    points_per_rupee: 1,
                    bonus_multipliers: {
                        birthday_month: 2,
                        festival_days: 1.5,
                        first_purchase: 500,
                        referral_success: 250
                    },
                    tier_bonuses: {
                        bronze: 0,
                        silver: 0.1,
                        gold: 0.2,
                        platinum: 0.3,
                        diamond: 0.5
                    },
                    category_bonuses: {
                        formal_wear: 1.5,
                        festive_wear: 2.0,
                        accessories: 1.2
                    }
                },
                redemption_rules: {
                    min_redemption_points: 100,
                    max_redemption_percentage: 50,
                    redemption_rates: {
                        points_per_rupee: 0.01,
                        min_order_value_for_redemption: 500
                    }
                },
                tier_progression: {
                    bronze: { min_points: 0, benefits: ["Basic rewards"] },
                    silver: { min_points: 1000, benefits: ["5% discount", "Free shipping"] },
                    gold: { min_points: 5000, benefits: ["10% discount", "Priority support"] },
                    platinum: { min_points: 15000, benefits: ["15% discount", "VIP events"] },
                    diamond: { min_points: 50000, benefits: ["20% discount", "Concierge service"] }
                },
                validity: {
                    points_expiry_months: 24,
                    tier_maintenance_required: true
                },
                status: {
                    is_active: true,
                    effective_date: "2024-01-01T00:00:00Z",
                    end_date: null,
                    created_by: "system",
                    last_modified: new Date().toISOString(),
                    version: "1.0"
                }
            }
        ];

        return new Promise((resolve, reject) => {
            this.databases.loyalty_rules.insert(defaultRules, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Seeded default loyalty rules');
                    resolve();
                }
            });
        });
    }

    /**
     * Seed sample occasions
     */
    async seedOccasions() {
        const sampleOccasions = [
            {
                occasion_id: "OCC_DIWALI_2024",
                occasion_name: "Diwali",
                occasion_type: "festival",
                occasion_details: {
                    description: "Festival of Lights - celebration of good over evil",
                    category: "hindu_festival",
                    significance: "religious_cultural",
                    origin: "India"
                },
                timing: {
                    primary_date: "2024-11-12",
                    celebration_period: {
                        start_date: "2024-11-10",
                        end_date: "2024-11-15"
                    },
                    duration_days: 5,
                    recurrence: "annual",
                    next_occurrence: "2025-10-20"
                },
                target_demographics: {
                    age_groups: ["all_ages"],
                    genders: ["male", "female"],
                    income_brackets: ["all_income_levels"]
                },
                gift_preferences: {
                    traditional_gifts: {
                        categories: ["ethnic_wear", "jewelry", "sweet_boxes", "decorative_items"],
                        price_ranges: {
                            budget: { min: 500, max: 2000 },
                            mid_range: { min: 2000, max: 5000 },
                            premium: { min: 5000, max: 15000 }
                        }
                    }
                }
            },
            {
                occasion_id: "OCC_CHRISTMAS_2024",
                occasion_name: "Christmas",
                occasion_type: "festival",
                occasion_details: {
                    description: "Christmas festival - celebration of birth of Jesus Christ",
                    category: "christian_festival",
                    significance: "religious_cultural",
                    origin: "Christian"
                },
                timing: {
                    primary_date: "2024-12-25",
                    celebration_period: {
                        start_date: "2024-12-20",
                        end_date: "2024-12-26"
                    },
                    duration_days: 7,
                    recurrence: "annual",
                    next_occurrence: "2025-12-25"
                },
                target_demographics: {
                    age_groups: ["all_ages"],
                    genders: ["male", "female"],
                    income_brackets: ["all_income_levels"]
                },
                gift_preferences: {
                    traditional_gifts: {
                        categories: ["winter_wear", "electronics", "home_decor", "accessories"],
                        price_ranges: {
                            budget: { min: 300, max: 1500 },
                            mid_range: { min: 1500, max: 4000 },
                            premium: { min: 4000, max: 12000 }
                        }
                    }
                }
            }
        ];

        return new Promise((resolve, reject) => {
            this.databases.occasions.insert(sampleOccasions, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Seeded sample occasions');
                    resolve();
                }
            });
        });
    }

    /**
     * Seed sample promotions
     */
    async seedPromotions() {
        const samplePromotions = [
            {
                promotion_id: "PROMO_WELCOME_2024",
                promotion_name: "Welcome Bonus for New Customers",
                promotion_type: "new_customer",
                promotion_code: "WELCOME100",
                promotion_details: {
                    description: "₹100 discount on first purchase",
                    banner_image: "/images/promotions/welcome-bonus.jpg",
                    terms_conditions: "Valid for new customers only",
                    min_order_value: 500,
                    max_discount_amount: 100,
                    usage_limit_per_customer: 1,
                    total_usage_limit: 10000
                },
                discount_structure: {
                    discount_type: "fixed_amount",
                    discount_value: 100,
                    applicable_categories: ["all"],
                    applicable_products: [],
                    excluded_products: [],
                    minimum_quantity: 1
                },
                timing: {
                    start_date: "2024-01-01T00:00:00Z",
                    end_date: "2024-12-31T23:59:59Z",
                    timezone: "Asia/Kolkata",
                    is_active: true
                },
                targeting: {
                    customer_segments: ["new_customers"],
                    specific_customers: [],
                    new_customers_only: true,
                    loyalty_tiers: ["bronze"],
                    first_purchase_only: true
                },
                approval: {
                    created_by: "system",
                    approved_by: "admin",
                    approval_status: "approved",
                    approval_date: "2024-01-01T00:00:00Z"
                },
                analytics: {
                    views: 0,
                    clicks: 0,
                    conversions: 0
                }
            }
        ];

        return new Promise((resolve, reject) => {
            this.databases.promotions.insert(samplePromotions, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Seeded sample promotions');
                    resolve();
                }
            });
        });
    }

    /**
     * Generate initialization report
     */
    generateInitializationReport() {
        const report = {
            timestamp: new Date().toISOString(),
            databases_initialized: this.initializationResults.length,
            databases: this.initializationResults,
            features_enabled: [
                "Loyalty Program Management",
                "Promotional Campaigns",
                "Gift Card System",
                "Product Bundling",
                "Customer Preferences",
                "Inventory Matrix Tracking",
                "Occasion-based Marketing"
            ],
            indexes_created: [
                "Promotions: promotion_code, promotion_type, timing fields",
                "Loyalty Rules: rule_type, status fields",
                "Gift Cards: card_number, customer, expiry fields",
                "Bundles: category, availability, validity fields",
                "Customer Preferences: customer_id, engagement metrics",
                "Inventory Matrix: product_id, tracking_type",
                "Occasions: type, date fields"
            ],
            sample_data_seeded: [
                "Default loyalty rules",
                "Sample festivals (Diwali, Christmas)",
                "Welcome promotion for new customers"
            ],
            migration_status: "completed",
            next_steps: [
                "Run inventory schema migration",
                "Configure retail settings",
                "Import existing customer data",
                "Set up promotional campaigns",
                "Train staff on new features"
            ]
        };

        console.log('Database Initialization Report:', JSON.stringify(report, null, 2));
        return report;
    }
}

module.exports = RetailDatabaseInitializer;

// CLI usage
if (require.main === module) {
    const appData = process.env.APPDATA || 'C:\\Users\\akash\\AppData\\Roaming\\pharmingo';
    const appName = process.env.APPNAME || 'pharmingo';
    
    const initializer = new RetailDatabaseInitializer(appData, appName);
    
    initializer.initializeAllDatabases()
        .then(report => {
            console.log('Retail database initialization completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Database initialization failed:', error);
            process.exit(1);
        });
}
