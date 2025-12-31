/**
 * Restaurant Menu Item Validation Schema
 * 
 * This file defines validation rules for the new restaurant menu item schema
 * to ensure data integrity and proper field validation.
 * 
 * Migration Date: 2025-12-30
 * Version: 1.0
 */

// Validation rules for restaurant menu items
const MenuItemValidationSchema = {
    // Core required fields
    required: {
        _id: { type: 'number', required: true },
        name: { type: 'string', required: true, minLength: 1, maxLength: 255 },
        price: { type: 'string', required: true },
        category: { type: 'string', required: true }
    },

    // Optional core fields
    optional: {
        _id: { type: 'number', min: 1 },
        sku: { type: 'string', minLength: 1, maxLength: 100 },
        cost: { type: 'string', pattern: /^\\d+(\\.\\d{1,2})?$/ },
        category: { type: 'string', minLength: 1, maxLength: 100 },
        quantity: { type: 'number', min: 0, max: 999999 },
        stock: { type: 'number', min: 0, max: 1 },
        minStock: { type: 'string', pattern: /^\\d+$/ },
        expirationDate: { type: 'string', pattern: /^\\d{4}-\\d{2}-\\d{2}$/ },
        img: { type: 'string', maxLength: 255 },
        alertHistory: { type: 'array' },
        lastRestocked: { type: 'string' },
        supplierId: { type: 'string', maxLength: 255 },
        reorderQuantity: { type: 'string', pattern: /^\\d+$/ },
        batches: { type: 'array' },
        last_ordered: { type: 'date' }
    },

    // Restaurant-specific validation rules
    restaurant: {
        availability_status: { 
            type: 'string', 
            enum: ['Available', 'Out of Stock', 'Temporarily Unavailable'],
            default: 'Available'
        },
        preparation_time: { 
            type: 'number', 
            min: 1, 
            max: 180, // Max 3 hours preparation time
            default: 15 
        },
        dietary_info: { 
            type: 'array',
            items: { 
                type: 'string',
                enum: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Jain', 'Keto', 'Low-Carb']
            }
        },
        allergens: { 
            type: 'array',
            items: { 
                type: 'string',
                enum: ['Dairy', 'Gluten', 'Nuts', 'Eggs', 'Soy', 'Fish', 'Shellfish', 'Sesame']
            }
        },
        kitchen_station: { 
            type: 'string',
            enum: ['Grill', 'Fryer', 'Salad', 'Dessert', 'Beverage', 'Appetizer', 'General'],
            default: 'General'
        },
        is_combo: { type: 'boolean', default: false },
        combo_items: { 
            type: 'array',
            items: { 
                type: 'object',
                properties: {
                    item_id: { type: 'number' },
                    quantity: { type: 'number', min: 1 },
                    price_modifier: { type: 'number' }
                }
            }
        },
        seasonal_item: { type: 'boolean', default: false },
        popularity_score: { type: 'number', min: 0, max: 100, default: 0 }
    },

    // Field transformations and defaults
    transformations: {
        sku: (value, item) => value || item.barcode || item._id.toString(),
        availability_status: (value) => value || 'Available',
        preparation_time: (value) => parseInt(value) || 15,
        dietary_info: (value) => Array.isArray(value) ? value : [],
        allergens: (value) => Array.isArray(value) ? value : [],
        kitchen_station: (value) => value || 'General',
        is_combo: (value) => Boolean(value),
        combo_items: (value) => Array.isArray(value) ? value : [],
        seasonal_item: (value) => Boolean(value),
        popularity_score: (value) => parseInt(value) || 0,
        last_ordered: (value) => value || null
    },

    // Removed pharmaceutical fields (for reference)
    removed: {
        requires_prescription: { reason: 'Not applicable to restaurant items' },
        generic_name: { reason: 'Not applicable to restaurant items' },
        drug_schedule: { reason: 'Not applicable to restaurant items' },
        hsn_code: { reason: 'Not applicable to restaurant items' }
    }
};

/**
 * Validate menu item against schema
 * @param {Object} menuItem - The menu item to validate
 * @returns {Object} - Validation result { valid: boolean, errors: array, warnings: array }
 */
function validateMenuItem(menuItem) {
    const errors = [];
    const warnings = [];
    
    // Validate required fields
    for (const [field, rules] of Object.entries(MenuItemValidationSchema.required)) {
        if (!menuItem[field]) {
            errors.push(`Missing required field: ${field}`);
        } else if (rules.type !== typeof menuItem[field]) {
            errors.push(`Invalid type for ${field}: expected ${rules.type}, got ${typeof menuItem[field]}`);
        }
    }
    
    // Validate optional fields if present
    for (const [field, value] of Object.entries(menuItem)) {
        if (MenuItemValidationSchema.optional[field]) {
            const rules = MenuItemValidationSchema.optional[field];
            
            if (rules.type && typeof value !== rules.type) {
                errors.push(`Invalid type for ${field}: expected ${rules.type}, got ${typeof value}`);
            }
            
            if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
                errors.push(`Invalid format for ${field}: does not match pattern ${rules.pattern}`);
            }
            
            if (rules.enum && !rules.enum.includes(value)) {
                errors.push(`Invalid value for ${field}: must be one of [${rules.enum.join(', ')}]`);
            }
            
            if (rules.min !== undefined && value < rules.min) {
                errors.push(`Invalid value for ${field}: must be >= ${rules.min}`);
            }
            
            if (rules.max !== undefined && value > rules.max) {
                errors.push(`Invalid value for ${field}: must be <= ${rules.max}`);
            }
        }
        
        // Validate restaurant-specific fields
        if (MenuItemValidationSchema.restaurant[field]) {
            const rules = MenuItemValidationSchema.restaurant[field];
            
            if (rules.enum && !rules.enum.includes(value)) {
                errors.push(`Invalid value for ${field}: must be one of [${rules.enum.join(', ')}]`);
            }
            
            if (rules.min !== undefined && value < rules.min) {
                errors.push(`Invalid value for ${field}: must be >= ${rules.min}`);
            }
            
            if (rules.max !== undefined && value > rules.max) {
                errors.push(`Invalid value for ${field}: must be <= ${rules.max}`);
            }
            
            if (rules.items && Array.isArray(value)) {
                // Validate array items
                value.forEach((item, index) => {
                    if (rules.items.properties) {
                        for (const [subField, subValue] of Object.entries(item)) {
                            if (rules.items.properties[subField]) {
                                const subRules = rules.items.properties[subField];
                                if (subRules.type && typeof subValue !== subRules.type) {
                                    errors.push(`Invalid type for ${field}[${index}].${subField}: expected ${subRules.type}`);
                                }
                            }
                        }
                    }
                });
            }
        }
    }
    
    // Check for pharmaceutical fields that should have been removed
    const pharmaceuticalFields = ['requires_prescription', 'generic_name', 'drug_schedule', 'hsn_code'];
    pharmaceuticalFields.forEach(field => {
        if (menuItem[field] !== undefined) {
            warnings.push(`Legacy pharmaceutical field '${field}' found - should be removed for restaurant use`);
        }
    });
    
    // Validate business rules
    if (menuItem.is_combo && (!menuItem.combo_items || menuItem.combo_items.length === 0)) {
        errors.push('Combo items must be specified when is_combo is true');
    }
    
    if (menuItem.price && menuItem.cost && parseFloat(menuItem.price) < parseFloat(menuItem.cost)) {
        warnings.push('Price is less than cost - negative margin detected');
    }
    
    if (menuItem.preparation_time > 60 && menuItem.category === 'Beverage') {
        warnings.push('Beverage items typically have shorter preparation times');
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Apply schema transformations to menu item
 * @param {Object} menuItem - The menu item to transform
 * @returns {Object} - Transformed menu item
 */
function transformMenuItem(menuItem) {
    const transformed = { ...menuItem };
    
    // Apply transformations
    for (const [field, transformer] of Object.entries(MenuItemValidationSchema.transformations)) {
        if (transformer && (transformed[field] === undefined || transformed[field] === null)) {
            transformed[field] = transformer(transformed[field], menuItem);
        }
    }
    
    // Set defaults for missing fields
    for (const [field, rules] of Object.entries(MenuItemValidationSchema.restaurant)) {
        if (rules.default !== undefined && transformed[field] === undefined) {
            transformed[field] = rules.default;
        }
    }
    
    return transformed;
}

/**
 * Generate validation report for database
 * @param {Array} menuItems - Array of menu items to validate
 * @returns {Object} - Comprehensive validation report
 */
function generateValidationReport(menuItems) {
    const report = {
        timestamp: new Date().toISOString(),
        total_items: menuItems.length,
        validation_summary: {
            valid: 0,
            invalid: 0,
            warnings: 0
        },
        errors_by_field: {},
        warnings_by_field: {},
        common_issues: [],
        recommendations: []
    };
    
    const errorCounts = {};
    const warningCounts = {};
    
    menuItems.forEach((item, index) => {
        const result = validateMenuItem(item);
        
        if (result.valid) {
            report.validation_summary.valid++;
        } else {
            report.validation_summary.invalid++;
        }
        
        if (result.warnings.length > 0) {
            report.validation_summary.warnings++;
        }
        
        // Count errors by field
        result.errors.forEach(error => {
            const fieldMatch = error.match(/^Invalid (?:type|value) for ([^:]+)/);
            if (fieldMatch) {
                const field = fieldMatch[1];
                errorCounts[field] = (errorCounts[field] || 0) + 1;
            }
        });
        
        // Count warnings by field
        result.warnings.forEach(warning => {
            const fieldMatch = warning.match(/^Legacy pharmaceutical field '([^']+)'/);
            if (fieldMatch) {
                const field = fieldMatch[1];
                warningCounts[field] = (warningCounts[field] || 0) + 1;
            }
        });
    });
    
    report.errors_by_field = errorCounts;
    report.warnings_by_field = warningCounts;
    
    // Generate recommendations
    if (errorCounts.sku) {
        report.recommendations.push('Ensure all menu items have valid SKU codes');
    }
    
    if (errorCounts.preparation_time) {
        report.recommendations.push('Review and correct preparation times for menu items');
    }
    
    if (warningCounts.requires_prescription) {
        report.recommendations.push('Remove legacy pharmaceutical prescription fields');
    }
    
    if (report.validation_summary.invalid > report.validation_summary.valid * 0.1) {
        report.common_issues.push('High error rate detected - review data migration process');
    }
    
    return report;
}

/**
 * Clean and normalize menu item data
 * @param {Object} menuItem - Raw menu item data
 * @returns {Object} - Cleaned and normalized menu item
 */
function cleanMenuItem(menuItem) {
    const cleaned = { ...menuItem };
    
    // Remove pharmaceutical fields
    const pharmaceuticalFields = ['requires_prescription', 'generic_name', 'drug_schedule', 'hsn_code'];
    pharmaceuticalFields.forEach(field => {
        delete cleaned[field];
    });
    
    // Normalize string fields
    const stringFields = ['name', 'category', 'kitchen_station', 'availability_status'];
    stringFields.forEach(field => {
        if (cleaned[field]) {
            cleaned[field] = cleaned[field].trim();
        }
    });
    
    // Normalize arrays
    const arrayFields = ['dietary_info', 'allergens', 'combo_items'];
    arrayFields.forEach(field => {
        if (cleaned[field] && !Array.isArray(cleaned[field])) {
            if (typeof cleaned[field] === 'string') {
                cleaned[field] = cleaned[field].split(',').map(item => item.trim()).filter(item => item);
            } else {
                cleaned[field] = [];
            }
        }
    });
    
    // Ensure proper types
    if (cleaned.preparation_time) {
        cleaned.preparation_time = parseInt(cleaned.preparation_time) || 15;
    }
    
    if (cleaned.popularity_score !== undefined) {
        cleaned.popularity_score = parseInt(cleaned.popularity_score) || 0;
    }
    
    if (cleaned.is_combo !== undefined) {
        cleaned.is_combo = Boolean(cleaned.is_combo);
    }
    
    if (cleaned.seasonal_item !== undefined) {
        cleaned.seasonal_item = Boolean(cleaned.seasonal_item);
    }
    
    return cleaned;
}

// Export functions for external use
module.exports = {
    MenuItemValidationSchema,
    validateMenuItem,
    transformMenuItem,
    generateValidationReport,
    cleanMenuItem
};