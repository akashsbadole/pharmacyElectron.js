/**
 * POS Pricing Integration - Enhanced POS with dynamic pricing and MRP compliance
 * Integrates with the PricingModule for real-time price calculations
 */

class POSPricingIntegration {
    constructor(posModule, pricingModule) {
        this.posModule = posModule;
        this.pricingModule = pricingModule;
        this.appliedPricing = new Map();
        this.mrpCompliance = new Map();
        this.dynamicPricingActive = true;
    }
    
    /**
     * Enhanced addToCart with dynamic pricing
     */
    addToCart(product, options = {}) {
        const posState = this.posModule.app.state.getModuleState('pos');
        const cart = [...posState.cart];
        
        // Check if product/variant already exists in cart
        const existingIndex = product.is_variant ? 
            cart.findIndex(item => item.id === product.id) :
            cart.findIndex(item => item.id === product._id);
        
        let finalPrice = parseFloat(product.price);
        let pricingBreakdown = null;
        let mrpCompliance = true;
        
        // Apply dynamic pricing if enabled
        if (this.dynamicPricingActive && !options.skipDynamicPricing) {
            this.calculateDynamicPrice(product).then(pricingResult => {
                finalPrice = pricingResult.final_price;
                pricingBreakdown = pricingResult.price_breakdown;
                
                // Update cart item with pricing details
                const cartItem = this.createCartItem(product, finalPrice, pricingBreakdown);
                
                if (existingIndex >= 0) {
                    cart[existingIndex] = cartItem;
                } else {
                    cart.push(cartItem);
                }
                
                this.posModule.app.state.updateModule('pos', { cart });
                this.renderPricingNotification(pricingBreakdown);
            }).catch(error => {
                console.error('Dynamic pricing calculation failed:', error);
                // Fallback to regular pricing
                this.addToCart(product, { skipDynamicPricing: true });
            });
            
            return; // Early return as async operation
        }
        
        // Check MRP compliance
        this.validateMRPCompliance(product, finalPrice).then(complianceResult => {
            mrpCompliance = complianceResult.compliant;
            this.mrpCompliance.set(product._id || product.id, complianceResult);
            
            if (!complianceResult.compliant) {
                this.showMRPWarning(complianceResult);
            }
        });
        
        // Create cart item with pricing information
        const cartItem = this.createCartItem(product, finalPrice, pricingBreakdown, mrpCompliance);
        
        if (existingIndex >= 0) {
            cart[existingIndex].quantity += 1;
        } else {
            cart.push(cartItem);
        }
        
        this.posModule.app.state.updateModule('pos', { cart });
        
        // Store applied pricing for later reference
        const cartKey = product._id || product.id;
        this.appliedPricing.set(cartKey, {
            originalPrice: parseFloat(product.price),
            finalPrice: finalPrice,
            pricingBreakdown: pricingBreakdown,
            appliedAt: new Date().toISOString()
        });
    }
    
    /**
     * Calculate dynamic price for a product
     */
    async calculateDynamicPrice(product) {
        const posState = this.posModule.app.state.getModuleState('pos');
        const currentCustomer = posState.currentCustomer;
        const cart = posState.cart || [];
        
        const requestBody = {
            product_id: product._id || product.id,
            base_price: parseFloat(product.price),
            customer_id: currentCustomer?._id,
            location: 'store', // This could be determined dynamically
            quantity: 1,
            timestamp: new Date().toISOString()
        };
        
        const response = await fetch(`${window.api}pricing/calculate-dynamic`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`Dynamic pricing request failed: ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    /**
     * Validate MRP compliance for a product
     */
    async validateMRPCompliance(product, sellingPrice) {
        // Check if product has MRP defined
        if (!product.mrp) {
            return {
                compliant: true,
                message: 'No MRP defined for this product'
            };
        }
        
        const mrp = parseFloat(product.mrp);
        const variance = sellingPrice - mrp;
        const variancePercentage = (variance / mrp) * 100;
        
        if (variance > 0) {
            // Log MRP violation
            try {
                await fetch(`${window.api}pricing/mrp/validate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        product_id: product._id || product.id,
                        selling_price: sellingPrice,
                        mrp: mrp,
                        category: product.category || 'general',
                        user_id: window.user?._id || 'pos_system'
                    })
                });
            } catch (error) {
                console.error('Failed to log MRP violation:', error);
            }
            
            return {
                compliant: false,
                violation: {
                    mrp: mrp,
                    selling_price: sellingPrice,
                    variance_amount: variance,
                    variance_percentage: variancePercentage,
                    severity: Math.abs(variancePercentage) > 10 ? 'critical' : 'warning'
                },
                message: `MRP violation: Selling price exceeds MRP by ₹${variance.toFixed(2)}`
            };
        }
        
        return {
            compliant: true,
            message: 'MRP compliance validated'
        };
    }
    
    /**
     * Create cart item with pricing information
     */
    createCartItem(product, finalPrice, pricingBreakdown = null, mrpCompliant = true) {
        return {
            id: product.is_variant ? product.id : product._id,
            product_id: product.is_variant ? product.product_id : product._id,
            product_name: product.name || product.product_name,
            sku: product.sku || product.barcode || product._id,
            price: finalPrice,
            original_price: parseFloat(product.price),
            quantity: 1,
            category: product.category || 'general',
            is_variant: product.is_variant || false,
            variant_data: product.variant_data || null,
            mrp: product.mrp || null,
            mrp_compliant: mrpCompliant,
            pricing_breakdown: pricingBreakdown,
            pricing_applied: !!pricingBreakdown,
            pricing_type: this.determinePricingType(pricingBreakdown),
            added_at: new Date().toISOString()
        };
    }
    
    /**
     * Determine pricing type based on breakdown
     */
    determinePricingType(pricingBreakdown) {
        if (!pricingBreakdown || !pricingBreakdown.applied_rules) {
            return 'regular';
        }
        
        const rules = pricingBreakdown.applied_rules;
        if (rules.length === 0) return 'regular';
        
        const primaryRule = rules[0];
        switch (primaryRule.rule_name.toLowerCase()) {
            case 'demand':
                return 'dynamic_demand';
            case 'competitor':
                return 'dynamic_competitor';
            case 'inventory':
                return 'dynamic_inventory';
            case 'time':
                return 'dynamic_time';
            default:
                return 'dynamic_custom';
        }
    }
    
    /**
     * Enhanced calculateCartTotal with pricing analytics
     */
    calculateCartTotal() {
        const posState = this.posModule.app.state.getModuleState('pos');
        const appState = this.posModule.app.state.getModuleState('app');
        const settings = appState.settings || {};
        const cart = posState.cart;
        
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Calculate pricing insights
        const pricingInsights = this.calculatePricingInsights(cart);
        
        // Apply promotions (existing logic)
        this.posModule.calculatePromotions().then(promoResult => {
            const totalDiscount = parseFloat(promoResult.total_discount || 0);
            
            // Apply tax calculation
            let cgst = 0, sgst = 0, igst = 0, totalTax = 0;
            
            if (settings.charge_tax) {
                const taxableAmount = subtotal - totalDiscount;
                if (this.posModule.saleType === 'intra') {
                    const cgstRate = parseFloat(settings.cgst || 0) / 100;
                    const sgstRate = parseFloat(settings.sgst || 0) / 100;
                    cgst = taxableAmount * cgstRate;
                    sgst = taxableAmount * sgstRate;
                } else {
                    const igstRate = parseFloat(settings.igst || 0) / 100;
                    igst = taxableAmount * igstRate;
                }
                totalTax = cgst + sgst + igst;
            }
            
            const total = subtotal - totalDiscount + totalTax;
            
            this.posModule.app.state.updateModule('pos', {
                cartTotals: {
                    subtotal: subtotal.toFixed(2),
                    discount: totalDiscount.toFixed(2),
                    tax: totalTax.toFixed(2),
                    cgst: cgst.toFixed(2),
                    sgst: sgst.toFixed(2),
                    igst: igst.toFixed(2),
                    total: total.toFixed(2),
                    items: cart.length,
                    promotions: promoResult,
                    pricing_insights: pricingInsights
                }
            });
            
            this.posModule.render(); // Re-render to show updated totals
        });
        
        // Return current totals while promotions are being calculated
        const currentDiscount = posState.cartTotals?.discount || 0;
        const currentTotal = subtotal - currentDiscount;
        
        return {
            subtotal: subtotal.toFixed(2),
            discount: currentDiscount.toFixed(2),
            tax: '0.00',
            cgst: '0.00',
            sgst: '0.00',
            igst: '0.00',
            total: currentTotal.toFixed(2),
            items: cart.length
        };
    }
    
    /**
     * Calculate pricing insights for the cart
     */
    calculatePricingInsights(cart) {
        let regularPrice = 0;
        let dynamicPrice = 0;
        let mrpSavings = 0;
        let dynamicSavings = 0;
        
        cart.forEach(item => {
            regularPrice += item.original_price * item.quantity;
            dynamicPrice += item.price * item.quantity;
            
            // Calculate MRP savings
            if (item.mrp && item.price < item.mrp) {
                mrpSavings += (item.mrp - item.price) * item.quantity;
            }
            
            // Calculate dynamic pricing savings
            if (item.price < item.original_price) {
                dynamicSavings += (item.original_price - item.price) * item.quantity;
            }
        });
        
        return {
            regular_price_total: regularPrice,
            dynamic_price_total: dynamicPrice,
            total_savings: mrpSavings + dynamicSavings,
            mrp_savings: mrpSavings,
            dynamic_savings: dynamicSavings,
            price_optimization_applied: dynamicPrice !== regularPrice,
            average_discount_percentage: regularPrice > 0 ? 
                ((regularPrice - dynamicPrice) / regularPrice * 100) : 0
        };
    }
    
    /**
     * Enhanced payment processing with pricing audit trail
     */
    async processPayment() {
        const posState = this.posModule.app.state.getModuleState('pos');
        const cart = posState.cart;
        const totals = this.posModule.calculateCartTotal();
        
        // Log pricing audit trail
        await this.logPricingAuditTrail(cart, totals);
        
        // Continue with regular payment processing
        return this.posModule.processPayment();
    }
    
    /**
     * Log pricing audit trail for compliance and analytics
     */
    async logPricingAuditTrail(cart, totals) {
        const auditTrail = {
            transaction_id: `AUDIT_${Date.now()}`,
            timestamp: new Date().toISOString(),
            cart_items: cart.map(item => ({
                product_id: item.product_id,
                original_price: item.original_price,
                final_price: item.price,
                quantity: item.quantity,
                mrp: item.mrp,
                mrp_compliant: item.mrp_compliant,
                pricing_type: item.pricing_type,
                pricing_breakdown: item.pricing_breakdown
            })),
            totals: totals,
            pricing_insights: this.calculatePricingInsights(cart),
            cashier_id: window.user?._id || 'unknown',
            customer_id: posState.currentCustomer?._id,
            payment_method: $("#selectedPaymentMethod").val() || 'Cash'
        };
        
        try {
            // This would be stored in a pricing audit trail database
            // For now, just log to console for demonstration
            console.log('Pricing Audit Trail:', auditTrail);
        } catch (error) {
            console.error('Failed to log pricing audit trail:', error);
        }
    }
    
    /**
     * Render pricing notification for dynamic pricing
     */
    renderPricingNotification(pricingBreakdown) {
        if (!pricingBreakdown || pricingBreakdown.applied_rules.length === 0) {
            return;
        }
        
        const rule = pricingBreakdown.applied_rules[0];
        const notification = `
            <div class="pricing-notification fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 p-4 rounded shadow-lg z-50">
                <div class="flex items-center">
                    <i class="fa fa-tags text-green-600 mr-2"></i>
                    <div>
                        <div class="text-green-800 font-medium">Dynamic Pricing Applied</div>
                        <div class="text-green-700 text-sm">${rule.rule_name}: ${rule.adjustment.description}</div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', notification);
        
        // Auto-remove notification after 5 seconds
        setTimeout(() => {
            const notificationElement = document.querySelector('.pricing-notification');
            if (notificationElement) {
                notificationElement.remove();
            }
        }, 5000);
    }
    
    /**
     * Show MRP compliance warning
     */
    showMRPWarning(complianceResult) {
        if (window.notiflix) {
            window.notiflix.Report.warning(
                'MRP Compliance Warning',
                complianceResult.message,
                'Ok'
            );
        }
    }
    
    /**
     * Toggle dynamic pricing on/off
     */
    toggleDynamicPricing() {
        this.dynamicPricingActive = !this.dynamicPricingActive;
        
        const status = this.dynamicPricingActive ? 'enabled' : 'disabled';
        if (window.notiflix) {
            window.notiflix.Notify.info(
                'Dynamic Pricing',
                `Dynamic pricing ${status}`,
                'Ok'
            );
        }
        
        // Update UI to reflect status
        this.updateDynamicPricingStatus();
    }
    
    /**
     * Update dynamic pricing status in UI
     */
    updateDynamicPricingStatus() {
        const statusElement = document.getElementById('dynamicPricingStatus');
        if (statusElement) {
            statusElement.textContent = this.dynamicPricingActive ? 'Active' : 'Inactive';
            statusElement.className = this.dynamicPricingActive ? 
                'text-green-600 font-medium' : 'text-gray-500 font-medium';
        }
    }
    
    /**
     * Get pricing analytics for the current cart
     */
    getPricingAnalytics() {
        const posState = this.posModule.app.state.getModuleState('pos');
        const cart = posState.cart || [];
        
        return {
            item_count: cart.length,
            regular_price_total: cart.reduce((sum, item) => sum + (item.original_price * item.quantity), 0),
            final_price_total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            total_savings: cart.reduce((sum, item) => sum + ((item.original_price - item.price) * item.quantity), 0),
            items_with_dynamic_pricing: cart.filter(item => item.pricing_applied).length,
            mrp_violations: cart.filter(item => !item.mrp_compliant).length,
            average_discount: this.calculatePricingInsights(cart).average_discount_percentage
        };
    }
    
    /**
     * Export pricing data for analysis
     */
    exportPricingData() {
        const posState = this.posModule.app.state.getModuleState('pos');
        const cart = posState.cart || [];
        
        const exportData = {
            export_timestamp: new Date().toISOString(),
            cart_items: cart.map(item => ({
                product_id: item.product_id,
                product_name: item.product_name,
                sku: item.sku,
                original_price: item.original_price,
                final_price: item.price,
                quantity: item.quantity,
                mrp: item.mrp,
                mrp_compliant: item.mrp_compliant,
                pricing_type: item.pricing_type,
                category: item.category
            })),
            pricing_analytics: this.getPricingAnalytics()
        };
        
        // Convert to CSV format
        const csvContent = this.convertToCSV(exportData.cart_items);
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pricing-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
    
    /**
     * Convert pricing data to CSV format
     */
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
}

// Make POSPricingIntegration available globally
window.POSPricingIntegration = POSPricingIntegration;