/**
 * Migration Script for Extending Inventory Database Schema
 * Extends existing inventory.db with garment and gift store specific fields
 */

const path = require('path');
const Datastore = require('@seald-io/nedb');
const fs = require('fs');

class InventorySchemaMigration {
    constructor(appData, appName) {
        this.appData = appData;
        this.appName = appName;
        this.dbPath = path.join(appData, appName, "server", "databases", "inventory.db");
        this.backupPath = path.join(appData, appName, "server", "databases", "backup_inventory.db");
        this.inventoryDB = null;
    }

    /**
     * Initialize database connection
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            this.inventoryDB = new Datastore({ filename: this.dbPath, autoload: true });
            this.inventoryDB.loadDatabase((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Create backup of existing data
     */
    async createBackup() {
        return new Promise((resolve, reject) => {
            try {
                fs.copyFile(this.dbPath, this.backupPath, (err) => {
                    if (err) reject(err);
                    else {
                        console.log('Inventory backup created successfully');
                        resolve();
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get existing inventory structure
     */
    async getExistingStructure() {
        return new Promise((resolve, reject) => {
            this.inventoryDB.find({}).limit(1).exec((err, docs) => {
                if (err) reject(err);
                else {
                    const existingDoc = docs[0] || {};
                    resolve({
                        hasData: docs.length > 0,
                        fieldCount: Object.keys(existingDoc).length,
                        existingFields: Object.keys(existingDoc)
                    });
                }
            });
        });
    }

    /**
     * Extended garment and gift store fields
     */
    getExtendedFields() {
        return {
            // Product Classification
            product_type: "product", // "product", "garment", "gift", "accessory"
            garment_category: null, // "clothing", "footwear", "accessories"
            sub_category: null, // "formal_shirts", "casual_pants", etc.
            
            // Garment Variants (Size/Color/Style Matrix)
            variants: {
                sizes: [], // Available sizes
                colors: [], // Available colors
                styles: [], // Fit styles
                materials: [], // Fabric materials
                patterns: [] // Design patterns
            },
            
            // Size Chart and Fit Information
            size_chart: {
                measurement_unit: "cm", // "cm" or "inches"
                chest: {},
                waist: {},
                length: {},
                sleeve_length: {}
            },
            
            // Gift-Specific Fields
            gift_category: null, // "birthday", "anniversary", "wedding", "festive", "corporate"
            gift_occasion: null, // "casual_gifts", "formal_gifts", "luxury_gifts"
            gift_recipient: null, // "men", "women", "kids", "unisex"
            gift_price_range: null, // "budget", "mid_range", "premium", "luxury"
            gift_wrapping: {
                available: false,
                cost: 0,
                styles: []
            },
            
            // Inventory Management
            stock_tracking_method: "aggregate", // "variant" or "aggregate"
            reorder_alerts: {
                low_stock_threshold: 5,
                critical_stock_threshold: 2,
                overstock_threshold: 100
            },
            
            // Seasonal and Trend Information
            season: "all_season", // "spring_summer", "fall_winter", "all_season", "festive"
            trend_status: "classic", // "trending", "classic", "discontinued", "new_arrival"
            launch_date: new Date().toISOString().split('T')[0],
            seasonal_discount_eligible: true,
            
            // Care Instructions
            care_instructions: {
                washing: null,
                drying: null,
                ironing: null,
                dry_cleaning: false,
                special_notes: null
            },
            
            // Supplier and Quality Information
            supplier_details: {
                manufacturer: null,
                country_of_origin: null,
                quality_grade: null,
                certification: []
            },
            
            // E-commerce Fields
            online_exclusive: false,
            store_pickup_available: true,
            shipping_weight: 0, // in kg
            dimensions: {
                length: 0,
                width: 0,
                height: 0
            },
            
            // Return and Exchange Policy
            return_policy: {
                days_valid: 30,
                condition_requirement: "original_tags",
                exchange_only: false,
                restocking_fee: 0
            },
            
            // Performance Metrics
            analytics: {
                views: 0,
                favorites: 0,
                conversion_rate: 0,
                return_rate: 0,
                last_sold_date: null
            },

            // Migration tracking
            migration_info: {
                migrated_date: new Date().toISOString(),
                migrated_version: "1.0",
                fields_added: []
            }
        };
    }

    /**
     * Apply schema extension to existing documents
     */
    async applySchemaExtension() {
        return new Promise((resolve, reject) => {
            const extendedFields = this.getExtendedFields();
            
            this.inventoryDB.find({}, (err, docs) => {
                if (err) {
                    reject(err);
                    return;
                }

                console.log(`Found ${docs.length} documents to migrate`);

                let processed = 0;
                const total = docs.length;

                if (total === 0) {
                    resolve({ migrated: 0, errors: 0 });
                    return;
                }

                docs.forEach((doc, index) => {
                    // Check if document already has extended fields
                    const hasExtendedFields = extendedFields.product_type in doc;
                    
                    if (hasExtendedFields) {
                        processed++;
                        if (processed === total) {
                            resolve({ migrated: 0, skipped: total, errors: 0 });
                        }
                        return;
                    }

                    // Create updated document with extended fields
                    const updatedDoc = {
                        ...doc,
                        ...extendedFields
                    };

                    // Update migration info
                    updatedDoc.migration_info.fields_added = Object.keys(extendedFields);

                    // Update the document
                    this.inventoryDB.update(
                        { _id: doc._id },
                        updatedDoc,
                        {},
                        (updateErr, numReplaced) => {
                            processed++;
                            
                            if (updateErr) {
                                console.error(`Error updating document ${doc._id}:`, updateErr);
                            } else {
                                console.log(`Migrated document ${doc._id} (${index + 1}/${total})`);
                            }

                            if (processed === total) {
                                resolve({ 
                                    migrated: total, 
                                    errors: docs.filter((_, i) => updateErr).length,
                                    skipped: 0
                                });
                            }
                        }
                    );
                });
            });
        });
    }

    /**
     * Validate migrated data
     */
    async validateMigration() {
        return new Promise((resolve, reject) => {
            const validationResults = {
                totalDocuments: 0,
                validDocuments: 0,
                invalidDocuments: 0,
                errors: []
            };

            this.inventoryDB.find({}, (err, docs) => {
                if (err) {
                    reject(err);
                    return;
                }

                validationResults.totalDocuments = docs.length;
                const extendedFields = this.getExtendedFields();
                const requiredFields = Object.keys(extendedFields);

                docs.forEach((doc, index) => {
                    const missingFields = requiredFields.filter(field => !(field in doc));
                    
                    if (missingFields.length > 0) {
                        validationResults.invalidDocuments++;
                        validationResults.errors.push({
                            documentId: doc._id,
                            missingFields: missingFields
                        });
                    } else {
                        validationResults.validDocuments++;
                    }
                });

                resolve(validationResults);
            });
        });
    }

    /**
     * Create indexes for new fields
     */
    async createIndexes() {
        return new Promise((resolve, reject) => {
            const indexes = [
                { fieldName: "product_type", unique: false },
                { fieldName: "garment_category", unique: false },
                { fieldName: "sub_category", unique: false },
                { fieldName: "season", unique: false },
                { fieldName: "trend_status", unique: false },
                { fieldName: "gift_category", unique: false },
                { fieldName: "online_exclusive", unique: false }
            ];

            let completed = 0;
            const total = indexes.length;

            indexes.forEach(index => {
                this.inventoryDB.ensureIndex(index, (err) => {
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
     * Main migration process
     */
    async runMigration() {
        try {
            console.log('Starting Inventory Schema Migration...');
            
            // Initialize database
            await this.initialize();
            console.log('Database initialized');

            // Create backup
            await this.createBackup();
            console.log('Backup created');

            // Check existing structure
            const existingStructure = await this.getExistingStructure();
            console.log('Existing structure:', existingStructure);

            // Apply schema extension
            const migrationResult = await this.applySchemaExtension();
            console.log('Migration completed:', migrationResult);

            // Validate migration
            const validationResult = await this.validateMigration();
            console.log('Validation completed:', validationResult);

            // Create indexes
            await this.createIndexes();
            console.log('Indexes created');

            // Generate migration report
            const report = {
                timestamp: new Date().toISOString(),
                status: 'completed',
                backup_created: true,
                migration_result: migrationResult,
                validation_result: validationResult,
                indexes_created: true
            };

            console.log('Migration Report:', JSON.stringify(report, null, 2));
            return report;

        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }
}

// Export for use in other modules
module.exports = InventorySchemaMigration;

// CLI usage
if (require.main === module) {
    const appData = process.env.APPDATA || 'C:\\Users\\akash\\AppData\\Roaming\\garmentpos';
    const appName = process.env.APPNAME || 'garmentpos';
    
    const migration = new InventorySchemaMigration(appData, appName);
    
    migration.runMigration()
        .then(report => {
            console.log('Migration completed successfully:', report);
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}
