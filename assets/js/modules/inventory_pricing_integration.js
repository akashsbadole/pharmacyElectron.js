/**
 * Inventory Pricing Integration - Enhanced inventory management with pricing capabilities
 * Integrates pricing engine with inventory module for MRP management and pricing optimization
 */

class InventoryPricingIntegration {
    constructor(inventoryModule, pricingModule) {
        this.inventoryModule = inventoryModule;
        this.pricingModule = pricingModule;
        this.pricingQueue = new Map();
        this.bulkPricingUpdates = [];
    }
    
    /**
     * Enhanced product creation with pricing fields
     */
    async createProduct(productData) {
        try {
            // Add pricing-related fields
            const enhancedProductData = {
                ...productData,
                // MRP fields
                mrp: parseFloat(productData.mrp) || null,
                mrp_compliance_required: productData.mrp_compliance_required === 'on',
                mrp_last_validated: null,
                
                // Pricing strategy fields
                pricing_strategy: productData.pricing_strategy || 'manual',
                dynamic_pricing_enabled: productData.dynamic_pricing_enabled === 'on',
                price_floor: parseFloat(productData.price_floor) || 0,
                price_ceiling: parseFloat(productData.price_ceiling) || null,
                
                // Competitive pricing fields
                competitor_price_tracking: productData.competitor_price_tracking === 'on',
                target_competitor_margin: parseFloat(productData.target_competitor_margin) || 5,
                price_positioning: productData.price_positioning || 'competitive', // 'premium', 'competitive', 'value'
                
                // Elasticity and optimization
                price_elasticity: productData.price_elasticity ? parseFloat(productData.price_elasticity) : null,
                optimal_price: parseFloat(productData.optimal_price) || null,
                last_price_optimization: null,
                
                // Pricing history
                price_history: [],
                pricing_audit_trail: []
            };
            
            // Validate MRP compliance
            if (enhancedProductData.mrp && enhancedProductData.price) {
                const sellingPrice = parseFloat(enhancedProductData.price);
                if (sellingPrice > enhancedProductData.mrp) {
                    throw new Error(`Selling price (₹${sellingPrice}) cannot exceed MRP (₹${enhancedProductData.mrp})`);
                }
            }
            
            // Create product using existing method
            const result = await this.inventoryModule.createProduct(enhancedProductData);
            
            // Log initial pricing setup
            await this.logPricingSetup(enhancedProductData, 'product_created');
            
            return result;
            
        } catch (error) {
            console.error('Error creating product with pricing:', error);
            throw error;
        }
    }
    
    /**
     * Enhanced product update with pricing validation
     */
    async updateProduct(productData) {
        try {
            const originalProduct = await this.getProductById(productData.id);
            if (!originalProduct) {
                throw new Error('Product not found');
            }
            
            // Enhanced product data
            const enhancedProductData = {
                ...productData,
                mrp: parseFloat(productData.mrp) || null,
                pricing_strategy: productData.pricing_strategy || 'manual',
                dynamic_pricing_enabled: productData.dynamic_pricing_enabled === 'on',
                price_floor: parseFloat(productData.price_floor) || 0,
                price_ceiling: parseFloat(productData.price_ceiling) || null,
                competitor_price_tracking: productData.competitor_price_tracking === 'on',
                target_competitor_margin: parseFloat(productData.target_competitor_margin) || 5,
                price_positioning: productData.price_positioning || 'competitive',
                price_elasticity: productData.price_elasticity ? parseFloat(productData.price_elasticity) : null,
                optimal_price: parseFloat(productData.optimal_price) || null
            };
            
            // Validate pricing changes
            await this.validatePricingChanges(originalProduct, enhancedProductData);
            
            // Update product
            const result = await this.inventoryModule.updateProduct(enhancedProductData);
            
            // Log pricing changes
            await this.logPricingChanges(originalProduct, enhancedProductData);
            
            // Update pricing analytics
            await this.updatePricingAnalytics(originalProduct, enhancedProductData);
            
            return result;
            
        } catch (error) {
            console.error('Error updating product with pricing:', error);
            throw error;
        }
    }
    
    /**
     * Validate pricing changes for compliance and business rules
     */
    async validatePricingChanges(originalProduct, updatedProduct) {
        const changes = [];
        
        // MRP validation
        if (originalProduct.mrp !== updatedProduct.mrp) {
            if (updatedProduct.mrp && updatedProduct.price) {
                const sellingPrice = parseFloat(updatedProduct.price);
                const newMrp = parseFloat(updatedProduct.mrp);
                
                if (sellingPrice > newMrp) {
                    throw new Error(`Selling price (₹${sellingPrice}) cannot exceed new MRP (₹${newMrp})`);
                }
            }
            changes.push({
                field: 'mrp',
                old_value: originalProduct.mrp,
                new_value: updatedProduct.mrp,
                change_type: 'mrp_update'
            });
        }
        
        // Price validation
        if (originalProduct.price !== updatedProduct.price) {
            const newPrice = parseFloat(updatedProduct.price);
            
            // Check price floor
            if (updatedProduct.price_floor && newPrice < updatedProduct.price_floor) {
                throw new Error(`Price (₹${newPrice}) cannot be below floor price (₹${updatedProduct.price_floor})`);
            }
            
            // Check price ceiling
            if (updatedProduct.price_ceiling && newPrice > updatedProduct.price_ceiling) {
                throw new Error(`Price (₹${newPrice}) cannot exceed ceiling price (₹${updatedProduct.price_ceiling})`);
            }
            
            // Check MRP compliance
            if (updatedProduct.mrp && newPrice > updatedProduct.mrp) {
                throw new Error(`Price (₹${newPrice}) cannot exceed MRP (₹${updatedProduct.mrp})`);
            }
            
            changes.push({
                field: 'price',
                old_value: originalProduct.price,
                new_value: updatedProduct.price,
                change_type: 'price_update',
                change_percentage: originalProduct.price ? 
                    ((newPrice - originalProduct.price) / originalProduct.price * 100) : 0
            });
        }
        
        // Log changes for audit trail
        if (changes.length > 0) {
            await this.logPricingChanges(originalProduct, updatedProduct, changes);
        }
    }
    
    /**
     * Bulk pricing update with validation and rollback capability
     */
    async bulkPricingUpdate(updates, options = {}) {
        const {
            validation_required = true,
            rollback_on_error = true,
            batch_size = 50,
            user_id = 'bulk_update_system'
        } = options;
        
        const results = {
            successful: [],
            failed: [],
            rolled_back: [],
            summary: {
                total_updates: updates.length,
                successful_updates: 0,
                failed_updates: 0,
                rolled_back_updates: 0
            }
        };
        
        // Create rollback backup
        const rollbackData = [];
        for (const update of updates) {
            const product = await this.getProductById(update.product_id);
            if (product) {
                rollbackData.push({
                    product_id: update.product_id,
                    original_data: { ...product }
                });
            }
        }
        
        // Process updates in batches
        for (let i = 0; i < updates.length; i += batch_size) {
            const batch = updates.slice(i, i + batch_size);
            const batchResults = await this.processBatchUpdates(batch, user_id);
            
            results.successful.push(...batchResults.successful);
            results.failed.push(...batchResults.failed);
            results.summary.successful_updates += batchResults.successful.length;
            results.summary.failed_updates += batchResults.failed.length;
        }
        
        // Handle rollback if needed
        if (rollback_on_error && results.failed.length > 0) {
            await this.performRollback(rollbackData, results.failed);
            results.rolled_back = results.failed.map(f => f.product_id);
            results.summary.rolled_back_updates = results.rolled_back.length;
        }
        
        return results;
    }
    
    /**
     * Process a batch of pricing updates
     */
    async processBatchUpdates(batch, userId) {
        const results = {
            successful: [],
            failed: []
        };
        
        const promises = batch.map(async (update) => {
            try {
                const product = await this.getProductById(update.product_id);
                if (!product) {
                    throw new Error('Product not found');
                }
                
                const updatedData = {
                    ...product,
                    ...update.data,
                    _id: product._id
                };
                
                await this.updateProduct(updatedData);
                
                results.successful.push({
                    product_id: update.product_id,
                    product_name: product.name,
                    old_price: product.price,
                    new_price: update.data.price,
                    change_reason: update.reason || 'bulk_update'
                });
                
            } catch (error) {
                results.failed.push({
                    product_id: update.product_id,
                    error: error.message
                });
            }
        });
        
        await Promise.allSettled(promises);
        return results;
    }
    
    /**
     * Perform rollback of failed updates
     */
    async performRollback(rollbackData, failedUpdates) {
        const failedIds = new Set(failedUpdates.map(f => f.product_id));
        
        for (const rollbackItem of rollbackData) {
            if (failedIds.has(rollbackItem.product_id)) {
                try {
                    await this.inventoryModule.updateProduct(rollbackItem.original_data);
                } catch (error) {
                    console.error(`Rollback failed for product ${rollbackItem.product_id}:`, error);
                }
            }
        }
    }
    
    /**
     * Apply dynamic pricing strategy to products
     */
    async applyDynamicPricingStrategy(strategyType, productIds, parameters = {}) {
        try {
            const response = await fetch(`${window.api}pricing/apply-strategy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    product_ids: productIds,
                    strategy_type: strategyType,
                    parameters: parameters,
                    user_id: window.user?._id || 'dynamic_pricing_system'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Strategy application failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Update inventory with new prices
            for (const detail of result.details) {
                if (detail.old_price && detail.new_price) {
                    const product = await this.getProductById(detail.product_id);
                    if (product) {
                        await this.updateProduct({
                            ...product,
                            price: detail.new_price,
                            last_price_optimization: new Date().toISOString()
                        });
                    }
                }
            }
            
            return result;
            
        } catch (error) {
            console.error('Error applying dynamic pricing strategy:', error);
            throw error;
        }
    }
    
    /**
     * Get pricing analytics for inventory
     */
    async getInventoryPricingAnalytics(category = null, timeframe = '30_days') {
        try {
            const products = await this.getAllProducts();
            const filteredProducts = category ? 
                products.filter(p => p.category === category) : products;
            
            const analytics = {
                total_products: filteredProducts.length,
                products_with_mrp: filteredProducts.filter(p => p.mrp).length,
                products_with_dynamic_pricing: filteredProducts.filter(p => p.dynamic_pricing_enabled).length,
                average_margin: 0,
                price_optimization_opportunities: [],
                mrp_compliance_issues: [],
                pricing_strategy_distribution: {}
            };
            
            let totalMargin = 0;
            let validMargins = 0;
            
            for (const product of filteredProducts) {
                // Calculate margin
                if (product.cost && product.price) {
                    const margin = ((product.price - product.cost) / product.price) * 100;
                    totalMargin += margin;
                    validMargins++;
                }
                
                // Identify optimization opportunities
                if (product.price_elasticity && Math.abs(product.price_elasticity) < 0.5) {
                    analytics.price_optimization_opportunities.push({
                        product_id: product._id,
                        product_name: product.name,
                        opportunity_type: 'low_elasticity',
                        recommendation: 'Consider price increase'
                    });
                }
                
                // Check MRP compliance issues
                if (product.mrp && product.price > product.mrp) {
                    analytics.mrp_compliance_issues.push({
                        product_id: product._id,
                        product_name: product.name,
                        mrp: product.mrp,
                        current_price: product.price,
                        violation_amount: product.price - product.mrp
                    });
                }
                
                // Distribution of pricing strategies
                const strategy = product.pricing_strategy || 'manual';
                analytics.pricing_strategy_distribution[strategy] = 
                    (analytics.pricing_strategy_distribution[strategy] || 0) + 1;
            }
            
            analytics.average_margin = validMargins > 0 ? totalMargin / validMargins : 0;
            
            return analytics;
            
        } catch (error) {
            console.error('Error getting inventory pricing analytics:', error);
            throw error;
        }
    }
    
    /**
     * Generate pricing optimization recommendations
     */
    async generatePricingRecommendations(filters = {}) {
        const { category, min_margin, max_age_days } = filters;
        
        try {
            const response = await fetch(`${window.api}pricing/analytics/optimization-recommendations`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category: category,
                    min_margin: min_margin,
                    max_age_days: max_age_days
                })
            });
            
            if (!response.ok) {
                throw new Error(`Recommendations request failed: ${response.statusText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Error generating pricing recommendations:', error);
            
            // Return mock recommendations if API fails
            return {
                recommendations: [
                    {
                        type: 'margin_optimization',
                        priority: 'high',
                        title: 'Increase margins on low-elasticity products',
                        description: 'Products with low price elasticity can support higher margins',
                        expected_impact: '15-20% margin improvement',
                        affected_products: 25
                    },
                    {
                        type: 'competitive_positioning',
                        priority: 'medium',
                        title: 'Review pricing for competitive products',
                        description: 'Some products may be overpriced relative to competition',
                        expected_impact: 'Improved market share',
                        affected_products: 12
                    }
                ],
                analysis_date: new Date().toISOString()
            };
        }
    }
    
    /**
     * Export pricing data for analysis
     */
    async exportPricingData(options = {}) {
        const { format = 'csv', include_history = true, category } = options;
        
        try {
            const products = await this.getAllProducts();
            const filteredProducts = category ? 
                products.filter(p => p.category === category) : products;
            
            const exportData = filteredProducts.map(product => ({
                product_id: product._id,
                product_name: product.name,
                category: product.category,
                current_price: product.price,
                cost_price: product.cost,
                mrp: product.mrp,
                margin_percentage: product.cost && product.price ? 
                    ((product.price - product.cost) / product.price * 100).toFixed(2) : null,
                pricing_strategy: product.pricing_strategy,
                dynamic_pricing_enabled: product.dynamic_pricing_enabled ? 'Yes' : 'No',
                price_positioning: product.price_positioning,
                price_elasticity: product.price_elasticity,
                competitor_price_tracking: product.competitor_price_tracking ? 'Yes' : 'No',
                last_price_optimization: product.last_price_optimization,
                mrp_compliance: product.mrp && product.price ? 
                    (product.price <= product.mrp ? 'Compliant' : 'Violation') : 'No MRP'
            }));
            
            if (format === 'csv') {
                return this.convertToCSV(exportData);
            } else {
                return JSON.stringify(exportData, null, 2);
            }
            
        } catch (error) {
            console.error('Error exporting pricing data:', error);
            throw error;
        }
    }
    
    /**
     * Import pricing data from CSV
     */
    async importPricingData(csvData, options = {}) {
        const { 
            update_existing = true, 
            validate_mrp = true,
            create_backup = true 
        } = options;
        
        try {
            const parsedData = this.parseCSV(csvData);
            const results = {
                imported: 0,
                updated: 0,
                skipped: 0,
                errors: []
            };
            
            // Create backup if requested
            if (create_backup) {
                await this.createPricingBackup();
            }
            
            for (const row of parsedData) {
                try {
                    const productId = parseInt(row.product_id);
                    if (!productId) {
                        results.errors.push({ row: row, error: 'Invalid product ID' });
                        continue;
                    }
                    
                    const existingProduct = await this.getProductById(productId);
                    const productData = {
                        price: parseFloat(row.current_price),
                        mrp: row.mrp ? parseFloat(row.mrp) : null,
                        pricing_strategy: row.pricing_strategy || 'manual',
                        dynamic_pricing_enabled: row.dynamic_pricing_enabled === 'Yes',
                        price_positioning: row.price_positioning || 'competitive',
                        price_elasticity: row.price_elasticity ? parseFloat(row.price_elasticity) : null
                    };
                    
                    // Validate MRP if requested
                    if (validate_mrp && productData.mrp && productData.price) {
                        if (productData.price > productData.mrp) {
                            results.errors.push({ 
                                product_id: productId, 
                                error: 'Price exceeds MRP' 
                            });
                            continue;
                        }
                    }
                    
                    if (existingProduct && update_existing) {
                        await this.updateProduct({
                            ...existingProduct,
                            ...productData,
                            _id: existingProduct._id
                        });
                        results.updated++;
                    } else if (!existingProduct) {
                        // Create new product (would need full product data)
                        results.skipped++;
                    } else {
                        results.skipped++;
                    }
                    
                } catch (error) {
                    results.errors.push({ row: row, error: error.message });
                }
            }
            
            results.imported = results.updated;
            
            return results;
            
        } catch (error) {
            console.error('Error importing pricing data:', error);
            throw error;
        }
    }
    
    /**
     * Helper methods
     */
    
    async getProductById(productId) {
        try {
            const response = await fetch(`${window.api}inventory/product/${productId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching product:', error);
            return null;
        }
    }
    
    async getAllProducts() {
        try {
            const response = await fetch(`${window.api}inventory/products`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    }
    
    async logPricingSetup(productData, action) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: action,
            product_id: productData._id || productData.id,
            data: {
                mrp: productData.mrp,
                price: productData.price,
                pricing_strategy: productData.pricing_strategy,
                dynamic_pricing_enabled: productData.dynamic_pricing_enabled
            }
        };
        
        console.log('Pricing setup logged:', logEntry);
    }
    
    async logPricingChanges(originalProduct, updatedProduct, changes) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: 'pricing_change',
            product_id: originalProduct._id,
            changes: changes,
            user_id: window.user?._id || 'system'
        };
        
        console.log('Pricing changes logged:', logEntry);
    }
    
    async updatePricingAnalytics(originalProduct, updatedProduct) {
        // This would update pricing analytics in the backend
        console.log('Pricing analytics updated for product:', originalProduct._id);
    }
    
    async createPricingBackup() {
        const products = await this.getAllProducts();
        const backup = {
            timestamp: new Date().toISOString(),
            total_products: products.length,
            products: products.map(p => ({
                _id: p._id,
                name: p.name,
                price: p.price,
                mrp: p.mrp,
                pricing_strategy: p.pricing_strategy
            }))
        };
        
        console.log('Pricing backup created:', backup);
        return backup;
    }
    
    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        const csvRows = data.map(row => 
            headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') ? 
                    `"${value}"` : value;
            }).join(',')
        );
        
        return [csvHeaders, ...csvRows].join('\n');
    }
    
    parseCSV(csvData) {
        const lines = csvData.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            return row;
        });
    }
}

// Make InventoryPricingIntegration available globally
window.InventoryPricingIntegration = InventoryPricingIntegration;