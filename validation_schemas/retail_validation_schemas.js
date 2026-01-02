/**
 * Retail Validation Schemas
 * Data validation schemas for garments and gift store features
 * Ensures data integrity and consistency
 across the extended database */

const validator = require('validator');

class RetailValidationSchemas {
    
    /**
     * Inventory Product Validation
     */
    static validateInventoryProduct(product) {
        const errors = [];
        
        // Required fields validation
        if (!product.name || product.name.trim().length === 0) {
            errors.push("Product name is required");
        }
        
        if (!product.price || isNaN(parseFloat(product.price)) || parseFloat(product.price) < 0) {
            errors.push("Valid price is required");
        }
        
        if (!product.category || product.category.trim().length === 0) {
            errors.push("Category is required");
        }
        
        // Product type validation
        const validProductTypes = ['product', 'garment', 'gift', 'accessory'];
        if (product.product_type && !validProductTypes.includes(product.product_type)) {
            errors.push("Invalid product type");
        }
        
        // Garment-specific validations
        if (product.product_type === 'garment') {
            if (product.garment_category) {
                const validGarmentCategories = ['clothing', 'footwear', 'accessories'];
                if (!validGarmentCategories.includes(product.garment_category)) {
                    errors.push("Invalid garment category");
                }
            }
            
            // Variant validation
            if (product.variants) {
                const variant = product.variants;
                
                if (variant.sizes && !Array.isArray(variant.sizes)) {
                    errors.push("Sizes must be an array");
                }
                
                if (variant.colors && !Array.isArray(variant.colors)) {
                    errors.push("Colors must be an array");
                }
                
                if (variant.styles && !Array.isArray(variant.styles)) {
                    errors.push("Styles must be an array");
                }
            }
            
            // Size chart validation
            if (product.size_chart) {
                const sizeChart = product.size_chart;
                if (sizeChart.measurement_unit && !['cm', 'inches'].includes(sizeChart.measurement_unit)) {
                    errors.push("Size chart measurement unit must be 'cm' or 'inches'");
                }
            }
        }
        
        // Gift-specific validations
        if (product.product_type === 'gift') {
            if (product.gift_category) {
                const validGiftCategories = ['birthday', 'anniversary', 'wedding', 'festive', 'corporate'];
                if (!validGiftCategories.includes(product.gift_category)) {
                    errors.push("Invalid gift category");
                }
            }
            
            if (product.gift_price_range) {
                const validPriceRanges = ['budget', 'mid_range', 'premium', 'luxury'];
                if (!validPriceRanges.includes(product.gift_price_range)) {
                    errors.push("Invalid gift price range");
                }
            }
        }
        
        // Stock validation
        if (product.quantity !== undefined) {
            if (isNaN(parseInt(product.quantity)) || parseInt(product.quantity) < 0) {
                errors.push("Valid quantity is required");
            }
        }
        
        // Dimensions validation
        if (product.dimensions) {
            const { length, width, height } = product.dimensions;
            if (length !== undefined && (isNaN(length) || length < 0)) {
                errors.push("Length must be a positive number");
            }
            if (width !== undefined && (isNaN(width) || width < 0)) {
                errors.push("Width must be a positive number");
            }
            if (height !== undefined && (isNaN(height) || height < 0)) {
                errors.push("Height must be a positive number");
            }
        }
        
        // Shipping weight validation
        if (product.shipping_weight !== undefined) {
            if (isNaN(product.shipping_weight) || product.shipping_weight < 0) {
                errors.push("Shipping weight must be a positive number");
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Customer Validation
     */
    static validateCustomer(customer) {
        const errors = [];
        
        // Required fields
        if (!customer.first_name || customer.first_name.trim().length === 0) {
            errors.push("First name is required");
        }
        
        if (!customer.last_name || customer.last_name.trim().length === 0) {
            errors.push("Last name is required");
        }
        
        // Email validation
        if (customer.email && !validator.isEmail(customer.email)) {
            errors.push("Invalid email format");
        }
        
        // Phone validation
        if (customer.phone_primary) {
            const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
            if (!phoneRegex.test(customer.phone_primary)) {
                errors.push("Invalid phone number format");
            }
        }
        
        // Date of birth validation
        if (customer.date_of_birth) {
            const dob = new Date(customer.date_of_birth);
            const now = new Date();
            if (dob > now) {
                errors.push("Date of birth cannot be in the future");
            }
            if (now.getFullYear() - dob.getFullYear() > 150) {
                errors.push("Invalid date of birth");
            }
        }
        
        // Loyalty tier validation
        if (customer.loyalty_program && customer.loyalty_program.tier) {
            const validTiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
            if (!validTiers.includes(customer.loyalty_program.tier)) {
                errors.push("Invalid loyalty tier");
            }
        }
        
        // Address validation
        if (customer.addresses) {
            Object.keys(customer.addresses).forEach(addrType => {
                const address = customer.addresses[addrType];
                if (address.line1 && address.line1.length > 255) {
                    errors.push(`Address line 1 for ${addrType} is too long`);
                }
                if (address.city && address.city.length > 100) {
                    errors.push(`City for ${addrType} is too long`);
                }
                if (address.postal_code && !validator.isPostalCode(address.postal_code, 'IN')) {
                    errors.push(`Invalid postal code for ${addrType}`);
                }
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Transaction Validation
     */
    static validateTransaction(transaction) {
        const errors = [];
        
        // Required fields
        if (!transaction.items || !Array.isArray(transaction.items) || transaction.items.length === 0) {
            errors.push("Transaction must contain at least one item");
        }
        
        if (!transaction.total || isNaN(parseFloat(transaction.total)) || parseFloat(transaction.total) <= 0) {
            errors.push("Valid transaction total is required");
        }
        
        // Items validation
        if (transaction.items) {
            transaction.items.forEach((item, index) => {
                if (!item.id || isNaN(parseInt(item.id))) {
                    errors.push(`Item ${index + 1}: Valid product ID is required`);
                }
                
                if (!item.quantity || isNaN(parseInt(item.quantity)) || parseInt(item.quantity) <= 0) {
                    errors.push(`Item ${index + 1}: Valid quantity is required`);
                }
                
                if (!item.price || isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0) {
                    errors.push(`Item ${index + 1}: Valid price is required`);
                }
            });
        }
        
        // Gift receipt validation
        if (transaction.gift_receipt && transaction.gift_receipt.is_gift) {
            const giftReceipt = transaction.gift_receipt;
            
            if (giftReceipt.gift_recipient_name && giftReceipt.gift_recipient_name.length > 100) {
                errors.push("Gift recipient name is too long");
            }
            
            if (giftReceipt.gift_message && giftReceipt.gift_message.length > 500) {
                errors.push("Gift message is too long");
            }
            
            if (giftReceipt.gift_wrapping_cost !== undefined) {
                if (isNaN(giftReceipt.gift_wrapping_cost) || giftReceipt.gift_wrapping_cost < 0) {
                    errors.push("Invalid gift wrapping cost");
                }
            }
        }
        
        // Loyalty points validation
        if (transaction.loyalty_transaction) {
            const loyaltyTx = transaction.loyalty_transaction;
            
            if (loyaltyTx.points_earned !== undefined) {
                if (isNaN(parseInt(loyaltyTx.points_earned)) || parseInt(loyaltyTx.points_earned) < 0) {
                    errors.push("Invalid points earned");
                }
            }
            
            if (loyaltyTx.points_redeemed !== undefined) {
                if (isNaN(parseInt(loyaltyTx.points_redeemed)) || parseInt(loyaltyTx.points_redeemed) < 0) {
                    errors.push("Invalid points redeemed");
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Promotion Validation
     */
    static validatePromotion(promotion) {
        const errors = [];
        
        // Required fields
        if (!promotion.promotion_name || promotion.promotion_name.trim().length === 0) {
            errors.push("Promotion name is required");
        }
        
        if (!promotion.promotion_type) {
            errors.push("Promotion type is required");
        }
        
        // Discount structure validation
        if (promotion.discount_structure) {
            const discount = promotion.discount_structure;
            
            if (!discount.discount_type || !['percentage', 'fixed_amount', 'buy_x_get_y', 'tiered'].includes(discount.discount_type)) {
                errors.push("Invalid discount type");
            }
            
            if (discount.discount_value !== undefined) {
                if (isNaN(parseFloat(discount.discount_value)) || parseFloat(discount.discount_value) < 0) {
                    errors.push("Valid discount value is required");
                }
                
                if (discount.discount_type === 'percentage' && parseFloat(discount.discount_value) > 100) {
                    errors.push("Percentage discount cannot exceed 100%");
                }
            }
        }
        
        // Timing validation
        if (promotion.timing) {
            const timing = promotion.timing;
            
            if (timing.start_date) {
                const startDate = new Date(timing.start_date);
                if (isNaN(startDate.getTime())) {
                    errors.push("Invalid start date");
                }
            }
            
            if (timing.end_date) {
                const endDate = new Date(timing.end_date);
                if (isNaN(endDate.getTime())) {
                    errors.push("Invalid end date");
                }
                
                if (timing.start_date && endDate <= new Date(timing.start_date)) {
                    errors.push("End date must be after start date");
                }
            }
        }
        
        // Minimum order value validation
        if (promotion.promotion_details && promotion.promotion_details.min_order_value !== undefined) {
            if (isNaN(parseFloat(promotion.promotion_details.min_order_value)) || parseFloat(promotion.promotion_details.min_order_value) < 0) {
                errors.push("Invalid minimum order value");
            }
        }
        
        // Usage limits validation
        if (promotion.promotion_details) {
            const details = promotion.promotion_details;
            
            if (details.usage_limit_per_customer !== undefined) {
                if (isNaN(parseInt(details.usage_limit_per_customer)) || parseInt(details.usage_limit_per_customer) < 1) {
                    errors.push("Usage limit per customer must be at least 1");
                }
            }
            
            if (details.total_usage_limit !== undefined) {
                if (isNaN(parseInt(details.total_usage_limit)) || parseInt(details.total_usage_limit) < 1) {
                    errors.push("Total usage limit must be at least 1");
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Gift Card Validation
     */
    static validateGiftCard(giftCard) {
        const errors = [];
        
        // Required fields
        if (!giftCard.gift_card_number || giftCard.gift_card_number.trim().length === 0) {
            errors.push("Gift card number is required");
        }
        
        if (!giftCard.card_details || !giftCard.card_details.denomination) {
            errors.push("Gift card denomination is required");
        }
        
        // Denomination validation
        if (giftCard.card_details && giftCard.card_details.denomination) {
            const denomination = parseFloat(giftCard.card_details.denomination);
            if (isNaN(denomination) || denomination <= 0) {
                errors.push("Valid denomination is required");
            }
        }
        
        // PIN validation
        if (giftCard.gift_card_pin) {
            const pinRegex = /^\d{4}$/;
            if (!pinRegex.test(giftCard.gift_card_pin)) {
                errors.push("PIN must be 4 digits");
            }
        }
        
        // Recipient validation
        if (giftCard.purchase_info && giftCard.purchase_info.recipient_email) {
            if (!validator.isEmail(giftCard.purchase_info.recipient_email)) {
                errors.push("Invalid recipient email");
            }
        }
        
        // Expiry date validation
        if (giftCard.validity && giftCard.validity.expiry_date) {
            const expiryDate = new Date(giftCard.validity.expiry_date);
            if (isNaN(expiryDate.getTime())) {
                errors.push("Invalid expiry date");
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Bundle Validation
     */
    static validateBundle(bundle) {
        const errors = [];
        
        // Required fields
        if (!bundle.bundle_name || bundle.bundle_name.trim().length === 0) {
            errors.push("Bundle name is required");
        }
        
        if (!bundle.components || !Array.isArray(bundle.components) || bundle.components.length === 0) {
            errors.push("Bundle must have at least one component");
        }
        
        // Components validation
        if (bundle.components) {
            bundle.components.forEach((component, index) => {
                if (!component.product_id || isNaN(parseInt(component.product_id))) {
                    errors.push(`Component ${index + 1}: Valid product ID is required`);
                }
                
                if (!component.quantity || isNaN(parseInt(component.quantity)) || parseInt(component.quantity) <= 0) {
                    errors.push(`Component ${index + 1}: Valid quantity is required`);
                }
                
                if (component.individual_price !== undefined) {
                    if (isNaN(parseFloat(component.individual_price)) || parseFloat(component.individual_price) < 0) {
                        errors.push(`Component ${index + 1}: Valid individual price is required`);
                    }
                }
                
                if (component.included_price !== undefined) {
                    if (isNaN(parseFloat(component.included_price)) || parseFloat(component.included_price) < 0) {
                        errors.push(`Component ${index + 1}: Valid included price is required`);
                    }
                }
            });
        }
        
        // Pricing validation
        if (bundle.pricing) {
            const pricing = bundle.pricing;
            
            if (pricing.total_individual_price !== undefined) {
                if (isNaN(parseFloat(pricing.total_individual_price)) || parseFloat(pricing.total_individual_price) < 0) {
                    errors.push("Valid total individual price is required");
                }
            }
            
            if (pricing.bundle_price !== undefined) {
                if (isNaN(parseFloat(pricing.bundle_price)) || parseFloat(pricing.bundle_price) < 0) {
                    errors.push("Valid bundle price is required");
                }
            }
            
            if (pricing.discount_percentage !== undefined) {
                if (isNaN(parseFloat(pricing.discount_percentage)) || parseFloat(pricing.discount_percentage) < 0 || parseFloat(pricing.discount_percentage) > 100) {
                    errors.push("Discount percentage must be between 0 and 100");
                }
            }
        }
        
        // Stock validation
        if (bundle.inventory && bundle.inventory.current_stock !== undefined) {
            if (isNaN(parseInt(bundle.inventory.current_stock)) || parseInt(bundle.inventory.current_stock) < 0) {
                errors.push("Valid current stock is required");
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Customer Preferences Validation
     */
    static validateCustomerPreferences(preferences) {
        const errors = [];
        
        // Required fields
        if (!preferences.customer_id || preferences.customer_id.trim().length === 0) {
            errors.push("Customer ID is required");
        }
        
        // Size preferences validation
        if (preferences.preferred_sizes) {
            const sizes = preferences.preferred_sizes;
            Object.keys(sizes).forEach(category => {
                if (!Array.isArray(sizes[category])) {
                    errors.push(`Preferred sizes for ${category} must be an array`);
                }
            });
        }
        
        // Budget range validation
        if (preferences.preferences && preferences.preferences.budget_range) {
            const budget = preferences.preferences.budget_range;
            
            if (budget.min !== undefined) {
                if (isNaN(parseFloat(budget.min)) || parseFloat(budget.min) < 0) {
                    errors.push("Valid minimum budget is required");
                }
            }
            
            if (budget.max !== undefined) {
                if (isNaN(parseFloat(budget.max)) || parseFloat(budget.max) < 0) {
                    errors.push("Valid maximum budget is required");
                }
            }
            
            if (budget.min && budget.max && parseFloat(budget.min) > parseFloat(budget.max)) {
                errors.push("Minimum budget cannot exceed maximum budget");
            }
        }
        
        // Loyalty score validation
        if (preferences.engagement_metrics && preferences.engagement_metrics.loyalty_score !== undefined) {
            const score = parseFloat(preferences.engagement_metrics.loyalty_score);
            if (isNaN(score) || score < 0 || score > 100) {
                errors.push("Loyalty score must be between 0 and 100");
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Inventory Matrix Validation
     */
    static validateInventoryMatrix(matrix) {
        const errors = [];
        
        // Required fields
        if (!matrix.product_id || isNaN(parseInt(matrix.product_id))) {
            errors.push("Valid product ID is required");
        }
        
        if (!matrix.product_name || matrix.product_name.trim().length === 0) {
            errors.push("Product name is required");
        }
        
        // Matrix configuration validation
        if (matrix.matrix_config) {
            const config = matrix.matrix_config;
            
            if (!config.tracking_type) {
                errors.push("Tracking type is required");
            } else {
                const validTypes = ['size', 'color', 'size_color', 'size_color_style'];
                if (!validTypes.includes(config.tracking_type)) {
                    errors.push("Invalid tracking type");
                }
            }
            
            if (config.dimensions) {
                const dimensions = config.dimensions;
                
                if (dimensions.sizes && !Array.isArray(dimensions.sizes)) {
                    errors.push("Sizes must be an array");
                }
                
                if (dimensions.colors && !Array.isArray(dimensions.colors)) {
                    errors.push("Colors must be an array");
                }
            }
        }
        
        // Stock matrix validation
        if (matrix.stock_matrix) {
            Object.keys(matrix.stock_matrix).forEach(color => {
                const colorStock = matrix.stock_matrix[color];
                Object.keys(colorStock).forEach(size => {
                    const variantStock = colorStock[size];
                    
                    if (variantStock.stock !== undefined) {
                        if (isNaN(parseInt(variantStock.stock)) || parseInt(variantStock.stock) < 0) {
                            errors.push(`Invalid stock for ${color}-${size}`);
                        }
                    }
                    
                    if (variantStock.reserved !== undefined) {
                        if (isNaN(parseInt(variantStock.reserved)) || parseInt(variantStock.reserved) < 0) {
                            errors.push(`Invalid reserved stock for ${color}-${size}`);
                        }
                    }
                    
                    if (variantStock.min_stock !== undefined) {
                        if (isNaN(parseInt(variantStock.min_stock)) || parseInt(variantStock.min_stock) < 0) {
                            errors.push(`Invalid min stock for ${color}-${size}`);
                        }
                    }
                });
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Occasion Validation
     */
    static validateOccasion(occasion) {
        const errors = [];
        
        // Required fields
        if (!occasion.occasion_name || occasion.occasion_name.trim().length === 0) {
            errors.push("Occasion name is required");
        }
        
        if (!occasion.occasion_type) {
            errors.push("Occasion type is required");
        } else {
            const validTypes = ['festival', 'birthday', 'anniversary', 'wedding', 'corporate', 'seasonal'];
            if (!validTypes.includes(occasion.occasion_type)) {
                errors.push("Invalid occasion type");
            }
        }
        
        // Timing validation
        if (occasion.timing) {
            const timing = occasion.timing;
            
            if (timing.primary_date) {
                const primaryDate = new Date(timing.primary_date);
                if (isNaN(primaryDate.getTime())) {
                    errors.push("Invalid primary date");
                }
            }
            
            if (timing.start_date && timing.end_date) {
                const startDate = new Date(timing.start_date);
                const endDate = new Date(timing.end_date);
                
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    errors.push("Invalid start or end date");
                } else if (startDate >= endDate) {
                    errors.push("End date must be after start date");
                }
            }
        }
        
        // Duration validation
        if (occasion.timing && occasion.timing.duration_days !== undefined) {
            if (isNaN(parseInt(occasion.timing.duration_days)) || parseInt(occasion.timing.duration_days) < 1) {
                errors.push("Duration must be at least 1 day");
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Generic validation helper
     */
    static validateData(data, schemaType) {
        switch (schemaType) {
            case 'inventory':
                return this.validateInventoryProduct(data);
            case 'customer':
                return this.validateCustomer(data);
            case 'transaction':
                return this.validateTransaction(data);
            case 'promotion':
                return this.validatePromotion(data);
            case 'gift_card':
                return this.validateGiftCard(data);
            case 'bundle':
                return this.validateBundle(data);
            case 'customer_preferences':
                return this.validateCustomerPreferences(data);
            case 'inventory_matrix':
                return this.validateInventoryMatrix(data);
            case 'occasion':
                return this.validateOccasion(data);
            default:
                return {
                    isValid: false,
                    errors: [`Unknown schema type: ${schemaType}`]
                };
        }
    }
    
    /**
     * Batch validation for multiple records
     */
    static validateBatch(records, schemaType) {
        const results = [];
        let validCount = 0;
        let invalidCount = 0;
        
        records.forEach((record, index) => {
            const validation = this.validateData(record, schemaType);
            results.push({
                index: index,
                record: record,
                isValid: validation.isValid,
                errors: validation.errors
            });
            
            if (validation.isValid) {
                validCount++;
            } else {
                invalidCount++;
            }
        });
        
        return {
            totalRecords: records.length,
            validCount: validCount,
            invalidCount: invalidCount,
            results: results
        };
    }
}

module.exports = RetailValidationSchemas;
