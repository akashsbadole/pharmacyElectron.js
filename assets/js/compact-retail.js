/**
 * COMPACT RETAIL MODULE - Unified Garments & Gift Store Interface
 * Streamlined JavaScript for efficient retail operations
 */

class CompactRetailApp {
    constructor() {
        this.api = window.api || 'http://localhost:3000/api';
        this.currentUser = null;
        this.currentCart = [];
        this.currentCustomer = null;
        this.products = [];
        this.customers = [];
        this.dashboardData = null;
        this.promotionDiscount = 0;
        this.giftWrapEnabled = false;
        this.giftMessage = '';
        
        this.init();
    }

    async init() {
        try {
            // Initialize UI components
            this.setupEventListeners();
            this.initializeComponents();
            await this.loadInitialData();
            this.startPeriodicUpdates();
            
            console.log('Compact Retail App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Compact Retail App:', error);
            this.showNotification('Failed to initialize application', 'error');
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.target.dataset.tab;
                this.switchTab(target);
            });
        });

        // Search functionality
        const searchInputs = document.querySelectorAll('.search-input');
        searchInputs.forEach(input => {
            let searchTimeout;
            input.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performSearch(e.target.value, e.target.dataset.searchType);
                }, 300);
            });
        });

        // Product interactions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('product-card')) {
                this.addProductToCart(JSON.parse(e.target.dataset.product));
            }
        });

        // Cart management
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quantity-btn')) {
                const action = e.target.dataset.action;
                const index = parseInt(e.target.dataset.index);
                this.updateCartQuantity(index, action);
            }
        });

        // Quick actions
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.executeQuickAction(action);
            });
        });

        // Mobile navigation
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.currentTarget.dataset.tab;
                this.switchTab(target);
            });
        });
    }

    initializeComponents() {
        // Initialize dashboard metrics
        this.updateDashboardMetrics();
        
        // Set up real-time updates
        this.setupRealtimeUpdates();
        
        // Initialize mobile optimizations
        this.initializeMobileOptimizations();
        
        // Initialize additional methods that might be called from HTML
        this.initializeCustomerSelection();
    }
    
    initializeCustomerSelection() {
        // Add customer selection method for HTML onclick handlers
        if (typeof window !== 'undefined') {
            window.app = this;
        }
    }

    async loadInitialData() {
        try {
            // Load dashboard data
            await this.loadDashboardData();
            
            // Load products
            await this.loadProducts();
            
            // Load customers
            await this.loadCustomers();
            
            // Initialize POS if on that tab
            if (document.querySelector('.nav-tab.active')?.dataset.tab === 'pos') {
                this.initializePOS();
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    // DASHBOARD METHODS
    async loadDashboardData() {
        try {
            const response = await fetch(`${this.api}/analytics/dashboard`);
            const data = await response.json();
            
            if (data.success) {
                this.dashboardData = data.data;
                this.updateDashboardMetrics();
                this.updateRecentActivity();
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    updateDashboardMetrics() {
        if (!this.dashboardData) return;

        // Update metric cards
        const metrics = [
            { key: 'today_sales', element: 'today-sales-value', format: 'currency' },
            { key: 'transaction_count', element: 'transaction-count-value', format: 'number' },
            { key: 'low_stock_alerts', element: 'low-stock-value', format: 'number' },
            { key: 'total_customers', element: 'total-customers-value', format: 'number' }
        ];

        metrics.forEach(metric => {
            const element = document.getElementById(metric.element);
            if (element && this.dashboardData[metric.key] !== undefined) {
                element.textContent = this.formatValue(this.dashboardData[metric.key], metric.format);
            }
        });

        // Update change indicators
        const changes = [
            { key: 'sales_change', element: 'sales-change' },
            { key: 'transaction_change', element: 'transaction-change' }
        ];

        changes.forEach(change => {
            const element = document.getElementById(change.element);
            if (element && this.dashboardData[change.key] !== undefined) {
                const value = this.dashboardData[change.key];
                element.textContent = `${value > 0 ? '+' : ''}${value}%`;
                element.className = `metric-change ${value >= 0 ? 'positive' : 'negative'}`;
            }
        });
    }

    updateRecentActivity() {
        const activityContainer = document.getElementById('recent-activity');
        if (!activityContainer) return;

        // Mock recent activity data
        const activities = [
            { type: 'sale', message: 'Sale completed - ₹1,250.00', time: '2 min ago', icon: '💰' },
            { type: 'stock', message: 'Stock updated - Formal Shirt Blue M', time: '5 min ago', icon: '📦' },
            { type: 'customer', message: 'New customer registered', time: '12 min ago', icon: '👥' },
            { type: 'promotion', message: 'Winter sale promotion activated', time: '15 min ago', icon: '🏷️' }
        ];

        activityContainer.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <span class="activity-icon">${activity.icon}</span>
                <div class="activity-content">
                    <div class="activity-message">${activity.message}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');
    }

    // PRODUCT METHODS
    async loadProducts() {
        try {
            const response = await fetch(`${this.api}/products?limit=100`);
            const data = await response.json();
            
            if (data.success) {
                this.products = data.data;
                this.renderProductGrid();
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    renderProductGrid() {
        const productGrid = document.getElementById('product-grid');
        if (!productGrid) return;

        productGrid.innerHTML = this.products.map(product => `
            <div class="product-card" data-product='${JSON.stringify(product)}'>
                <img src="${product.image || '/assets/images/default.jpg'}" 
                     alt="${product.name}" class="product-image">
                <div class="product-name">${product.name}</div>
                <div class="product-price">₹${product.price}</div>
                ${product.variants?.sizes?.length ? `
                    <div class="product-variants">
                        Sizes: ${product.variants.sizes.slice(0, 3).join(', ')}${product.variants.sizes.length > 3 ? '...' : ''}
                    </div>
                ` : ''}
                ${product.stock?.total <= product.stock?.min_stock ? `
                    <div class="low-stock-indicator">Low Stock</div>
                ` : ''}
            </div>
        `).join('');
    }

    addProductToCart(product) {
        const existingItem = this.currentCart.find(item => item.id === product._id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.currentCart.push({
                id: product._id,
                name: product.name,
                price: product.price,
                quantity: 1,
                variant: null // Can be enhanced for size/color selection
            });
        }
        
        this.renderCart();
        this.showNotification(`${product.name} added to cart`, 'success');
    }

    updateCartQuantity(index, action) {
        const item = this.currentCart[index];
        if (!item) return;

        if (action === 'increase') {
            item.quantity += 1;
        } else if (action === 'decrease' && item.quantity > 1) {
            item.quantity -= 1;
        } else if (action === 'remove' || (action === 'decrease' && item.quantity === 1)) {
            this.currentCart.splice(index, 1);
        }

        this.renderCart();
    }

    renderCart() {
        const cartItems = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        
        if (!cartItems || !cartTotal) return;

        cartItems.innerHTML = this.currentCart.map((item, index) => `
            <div class="cart-item">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-price">₹${item.price} × ${item.quantity}</div>
                </div>
                <div class="item-controls">
                    <button class="quantity-btn" data-action="decrease" data-index="${index}">-</button>
                    <span class="item-quantity">${item.quantity}</span>
                    <button class="quantity-btn" data-action="increase" data-index="${index}">+</button>
                    <button class="quantity-btn btn-danger btn-sm" data-action="remove" data-index="${index}">×</button>
                </div>
            </div>
        `).join('');

        const total = this.currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotal.textContent = `₹${total.toFixed(2)}`;
    }

    // CUSTOMER METHODS
    async loadCustomers() {
        try {
            const response = await fetch(`${this.api}/customers?limit=50`);
            const data = await response.json();
            
            if (data.success) {
                this.customers = data.data;
                this.renderCustomerList();
            }
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    renderCustomerList() {
        const customerList = document.getElementById('customer-list');
        if (!customerList) return;

        customerList.innerHTML = this.customers.map(customer => `
            <tr>
                <td>${customer.customer_id}</td>
                <td>${customer.name}</td>
                <td>${customer.phone || 'N/A'}</td>
                <td>${customer.loyalty?.tier || 'bronze'}</td>
                <td>${customer.loyalty?.points || 0}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="app.selectCustomer(${customer._id})">
                        Select
                    </button>
                </td>
            </tr>
        `).join('');
    }

    selectCustomer(customerId) {
        const customer = this.customers.find(c => c._id === customerId);
        if (customer) {
            this.currentCustomer = customer;
            this.updateCustomerDisplay();
            this.showNotification(`Customer selected: ${customer.name}`, 'success');
        }
    }

    updateCustomerDisplay() {
        const display = document.getElementById('selected-customer');
        if (display && this.currentCustomer) {
            display.innerHTML = `
                <div class="customer-info">
                    <strong>${this.currentCustomer.name}</strong><br>
                    <small>${this.currentCustomer.loyalty.tier} | ${this.currentCustomer.loyalty.points} points</small>
                </div>
            `;
        }
    }

    // CHECKOUT METHODS
    async processCheckout() {
        if (this.currentCart.length === 0) {
            this.showNotification('Cart is empty', 'warning');
            return;
        }

        const checkoutData = {
            customer_id: this.currentCustomer?._id,
            items: this.currentCart,
            promotion_code: document.getElementById('promotion-code')?.value,
            payment_method: document.querySelector('input[name="payment-method"]:checked')?.value,
            gift_options: this.getGiftOptions()
        };

        try {
            const response = await fetch(`${this.api}/checkout/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(checkoutData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Checkout completed successfully!', 'success');
                this.currentCart = [];
                this.renderCart();
                await this.loadDashboardData(); // Refresh metrics
            } else {
                this.showNotification(result.error || 'Checkout failed', 'error');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            this.showNotification('Checkout failed', 'error');
        }
    }

    getGiftOptions() {
        const giftWrap = document.getElementById('gift-wrap')?.checked;
        const giftMessage = document.getElementById('gift-message')?.value;
        
        if (giftWrap) {
            return {
                style: document.getElementById('gift-wrap-style')?.value,
                message: giftMessage,
                recipient: document.getElementById('gift-recipient')?.value
            };
        }
        return null;
    }

    // SEARCH & FILTER
    async performSearch(query, type) {
        if (!query.trim()) {
            if (type === 'products') this.renderProductGrid();
            return;
        }

        try {
            let url = '';
            if (type === 'products') {
                url = `${this.api}/products?search=${encodeURIComponent(query)}`;
            } else if (type === 'customers') {
                url = `${this.api}/customers?search=${encodeURIComponent(query)}`;
            }

            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                if (type === 'products') {
                    this.products = data.data;
                    this.renderProductGrid();
                } else if (type === 'customers') {
                    this.customers = data.data;
                    this.renderCustomerList();
                }
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    // Filter products by category
    filterProductsByCategory(category) {
        if (!this.products.length) return;
        
        let filteredProducts;
        if (category === 'all') {
            filteredProducts = this.products;
        } else {
            filteredProducts = this.products.filter(product => {
                return product.category && product.category.toLowerCase().includes(category.toLowerCase());
            });
        }
        
        this.renderFilteredProducts(filteredProducts);
    }

    renderFilteredProducts(products) {
        const productGrid = document.getElementById('product-grid');
        if (!productGrid) return;

        productGrid.innerHTML = products.map(product => `
            <div class="product-card" data-product='${JSON.stringify(product)}'>
                <img src="${product.image || '/assets/images/default.jpg'}" 
                     alt="${product.name}" class="product-image">
                <div class="product-name">${product.name}</div>
                <div class="product-price">₹${product.price}</div>
                ${product.variants?.sizes?.length ? `
                    <div class="product-variants">
                        Sizes: ${product.variants.sizes.slice(0, 3).join(', ')}${product.variants.sizes.length > 3 ? '...' : ''}
                    </div>
                ` : ''}
                ${product.stock?.total <= product.stock?.min_stock ? `
                    <div class="low-stock-indicator">Low Stock</div>
                ` : ''}
            </div>
        `).join('');
    }

    // Validate promotion code
    async validatePromotionCode(code) {
        if (!code.trim()) return;
        
        try {
            const response = await fetch(`${this.api}/promotions/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, cart: this.currentCart })
            });
            
            const result = await response.json();
            
            if (result.success && result.data.valid) {
                this.showNotification(`Promotion applied! ${result.data.discount}% discount`, 'success');
                this.promotionDiscount = result.data.discount;
                this.updateCartTotals();
            } else {
                this.showNotification('Invalid promotion code', 'error');
                this.promotionDiscount = 0;
                this.updateCartTotals();
            }
        } catch (error) {
            console.error('Promotion validation error:', error);
            this.showNotification('Error validating promotion code', 'error');
        }
    }

    // Show customer selection modal/interface
    showCustomerSelection() {
        // Switch to customers tab for easy selection
        this.switchTab('customers');
        
        // Focus on search input
        setTimeout(() => {
            const customerSearch = document.querySelector('input[data-search-type="customers"]');
            if (customerSearch) {
                customerSearch.focus();
            }
        }, 300);
        
        this.showNotification('Select a customer from the list', 'info');
    }
    
    // Cancel current action
    cancelCurrentAction() {
        // Clear any active inputs
        const activeInput = document.querySelector('input:focus, textarea:focus');
        if (activeInput) {
            activeInput.blur();
        }
        
        // Cancel search if active
        const searchInputs = document.querySelectorAll('.search-input');
        searchInputs.forEach(input => {
            if (input.value) {
                input.value = '';
                input.dispatchEvent(new Event('input'));
            }
        });
        
        // Reset category filter
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('.category-btn[data-category="all"]')?.classList.add('active');
        
        // Show notification
        this.showNotification('Action cancelled', 'info');
    }

    // QUICK ACTIONS
    async executeQuickAction(action) {
        try {
            switch (action) {
                case 'new-sale':
                    this.switchTab('pos');
                    break;
                case 'add-product':
                    this.showProductModal();
                    break;
                case 'view-reports':
                    this.switchTab('reports');
                    break;
                case 'manage-customers':
                    this.switchTab('customers');
                    break;
                case 'view-inventory':
                    this.switchTab('inventory');
                    break;
                default:
                    console.log('Unknown quick action:', action);
            }
        } catch (error) {
            console.error('Quick action error:', error);
        }
    }

    // UI METHODS
    switchTab(tabId) {
        // Update navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const targetContent = document.getElementById(`${tabId}-content`);
        if (targetContent) {
            targetContent.classList.add('active');
        }

        // Initialize tab-specific functionality
        this.initializeTab(tabId);
    }

    initializeTab(tabId) {
        switch (tabId) {
            case 'pos':
                this.initializePOS();
                break;
            case 'inventory':
                this.initializeInventory();
                break;
            case 'customers':
                this.initializeCustomers();
                break;
            case 'reports':
                this.initializeReports();
                break;
        }
    }

    initializePOS() {
        // POS is already initialized through loadProducts and renderProductGrid
        this.updateCartTotals();
    }

    updateCartTotals() {
        const subtotal = this.currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discount = 0; // Can be calculated based on promotions
        const giftWrap = document.getElementById('gift-wrap')?.checked ? 25 : 0;
        const tax = (subtotal - discount + giftWrap) * 0.18; // 18% GST
        const total = subtotal - discount + giftWrap + tax;

        document.getElementById('cart-subtotal').textContent = `₹${subtotal.toFixed(2)}`;
        document.getElementById('cart-discount').textContent = `-₹${discount.toFixed(2)}`;
        document.getElementById('cart-gift-wrap').textContent = giftWrap > 0 ? `₹${giftWrap.toFixed(2)}` : '₹0.00';
        document.getElementById('cart-tax').textContent = `₹${tax.toFixed(2)}`;
        document.getElementById('cart-total').textContent = `₹${total.toFixed(2)}`;
    }

    // MOBILE OPTIMIZATIONS
    initializeMobileOptimizations() {
        // Add touch event listeners for better mobile experience
        document.addEventListener('touchstart', () => {}, { passive: true });
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 100);
        });

        // Optimize scrolling
        this.optimizeScrolling();
    }

    handleOrientationChange() {
        // Re-render components based on new orientation
        this.renderProductGrid();
        this.renderCart();
    }

    optimizeScrolling() {
        // Implement virtual scrolling for large lists
        const scrollableElements = document.querySelectorAll('.scrollable');
        scrollableElements.forEach(element => {
            element.addEventListener('scroll', this.throttle(() => {
                this.handleScroll(element);
            }, 100));
        });
    }

    handleScroll(element) {
        // Implement lazy loading or virtual scrolling logic
        const { scrollTop, scrollHeight, clientHeight } = element;
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            // Load more content if available
            this.loadMoreContent(element);
        }
    }

    // REAL-TIME UPDATES
    setupRealtimeUpdates() {
        // Set up WebSocket connection for real-time updates
        if (window.io) {
            this.socket = window.io();
            
            this.socket.on('inventory:update', (data) => {
                this.handleInventoryUpdate(data);
            });
            
            this.socket.on('sale:completed', (data) => {
                this.handleSaleUpdate(data);
            });
        }
    }

    handleInventoryUpdate(data) {
        // Update product stock in real-time
        const product = this.products.find(p => p._id === data.product_id);
        if (product) {
            product.stock.total = data.new_stock;
            this.renderProductGrid();
        }
    }

    handleSaleUpdate(data) {
        // Refresh dashboard metrics
        this.loadDashboardData();
        this.showNotification('New sale completed', 'info');
    }

    // UTILITY METHODS
    formatValue(value, format) {
        switch (format) {
            case 'currency':
                return `₹${value.toLocaleString('en-IN')}`;
            case 'number':
                return value.toLocaleString('en-IN');
            case 'percentage':
                return `${value}%`;
            default:
                return value;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    startPeriodicUpdates() {
        // Update dashboard every 30 seconds
        setInterval(() => {
            this.loadDashboardData();
        }, 30000);

        // Update products every 2 minutes
        setInterval(() => {
            this.loadProducts();
        }, 120000);
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CompactRetailApp();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CompactRetailApp;
}