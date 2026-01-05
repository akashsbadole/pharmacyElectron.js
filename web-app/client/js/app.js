// PharmaMine Web Application Main JavaScript

// Application State
const appState = {
    user: null,
    isAuthenticated: false,
    isDemoMode: false,
    cart: [],
    products: [],
    categories: [],
    customers: [],
    transactions: [],
    syncStatus: {
        isRunning: false,
        status: 'offline',
        lastSync: null,
        nextSync: null,
        changes: 0
    }
};

// API Configuration
const apiConfig = {
    baseUrl: (window.API_BASE_URL) || 'http://localhost:3001/api',
    timeout: 10000
};

// Demo Mode Initialization
const initDemoMode = () => {
    if (demoMode && demoMode.isEnabled()) {
        appState.isDemoMode = true;
        appState.isAuthenticated = true;
        appState.user = mockData.user;
        
        // Setup demo API override
        if (window.demoApi) {
            window.demoApi.setup();
        }
        
        console.log('Demo mode enabled');
        return true;
    }
    return false;
};

// Utility Functions
const utils = {
    // Format currency
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },

    // Format date
    formatDate: (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Show notification toast
    showToast: (message, type = 'info') => {
        const toastEl = document.getElementById('notification-toast');
        const toastBody = document.getElementById('toast-message');
        const toastHeader = toastEl.querySelector('.toast-header');
        
        // Set message
        toastBody.textContent = message;
        
        // Set type styling
        toastHeader.className = 'toast-header';
        toastEl.className = 'toast';
        
        switch(type) {
            case 'success':
                toastHeader.querySelector('i').className = 'fas fa-check-circle text-success me-2';
                toastHeader.querySelector('strong').textContent = 'Success';
                break;
            case 'error':
                toastHeader.querySelector('i').className = 'fas fa-exclamation-circle text-danger me-2';
                toastHeader.querySelector('strong').textContent = 'Error';
                break;
            case 'warning':
                toastHeader.querySelector('i').className = 'fas fa-exclamation-triangle text-warning me-2';
                toastHeader.querySelector('strong').textContent = 'Warning';
                break;
            default:
                toastHeader.querySelector('i').className = 'fas fa-info-circle text-primary me-2';
                toastHeader.querySelector('strong').textContent = 'Notification';
        }
        
        // Show toast
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    },

    // Show loading overlay
    showLoading: () => {
        let loadingOverlay = document.getElementById('loading-overlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            `;
            document.body.appendChild(loadingOverlay);
        }
        loadingOverlay.style.display = 'flex';
    },

    // Hide loading overlay
    hideLoading: () => {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    },

    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // API Request wrapper
    apiRequest: async (endpoint, options = {}) => {
        const url = `${apiConfig.baseUrl}/${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log(`🔑 Using auth token for ${endpoint}`);
        } else {
            console.warn(`⚠️ No auth token available for ${endpoint} - this may cause 401 errors`);
        }

        console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error(`🔒 401 Unauthorized error for ${endpoint}`);
                    console.error('💡 This indicates missing or invalid authentication token');
                    
                    // If we're in demo mode, provide demo data instead
                    if (appState.isDemoMode) {
                        console.log('🎭 Using demo data fallback for', endpoint);
                        return demoApi.getFallbackData(endpoint);
                    }
                    
                    // Show user-friendly error message
                    utils.showToast('Please login to access this feature', 'warning');
                    
                    // Store the failed request to retry after login
                    if (!window.failedRequests) window.failedRequests = [];
                    window.failedRequests.push({ endpoint, options });
                    
                    throw new Error('Authentication required');
                } else if (response.status === 403) {
                    console.error(`🚫 403 Forbidden error for ${endpoint}`);
                    console.error('💡 This indicates valid token but insufficient permissions');
                    utils.showToast('You do not have permission to access this resource', 'error');
                    throw new Error('Insufficient permissions');
                } else {
                    console.error(`❌ HTTP error! status: ${response.status} for ${endpoint}`);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            
            const data = await response.json();
            console.log(`✅ API Response success for ${endpoint}:`, data);
            return data;
        } catch (error) {
            console.error(`💥 API Request failed for ${endpoint}:`, error);
            
            // If we're in demo mode and the error is auth-related, try demo fallback
            if (appState.isDemoMode && (error.message.includes('Authentication') || error.message.includes('401'))) {
                console.log('🎭 Attempting demo fallback for failed request:', endpoint);
                return demoApi.getFallbackData(endpoint);
            }
            
            throw error;
        }
    }
};

// Authentication Module
const auth = {
    // Check if user is authenticated
    checkAuth: async () => {
        // If demo mode is enabled, skip authentication
        if (initDemoMode()) {
            return true;
        }
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            return false;
        }

        try {
            const response = await utils.apiRequest('auth/me');
            if (response.success) {
                appState.user = response.data;
                appState.isAuthenticated = true;
                return true;
            }
        } catch (error) {
            localStorage.removeItem('authToken');
            return false;
        }
    },

    // Login user
    login: async (username, password) => {
        try {
            const response = await utils.apiRequest('auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (response.success) {
                localStorage.setItem('authToken', response.data.token);
                appState.user = response.data.user;
                appState.isAuthenticated = true;
                utils.showToast('Login successful!', 'success');
                return true;
            } else {
                utils.showToast(response.message || 'Login failed', 'error');
                return false;
            }
        } catch (error) {
            utils.showToast('Network error. Please try again.', 'error');
            return false;
        }
    },

    // Register user
    register: async (userData) => {
        try {
            const response = await utils.apiRequest('auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response.success) {
                utils.showToast('Registration successful! Please login.', 'success');
                return true;
            } else {
                utils.showToast(response.message || 'Registration failed', 'error');
                return false;
            }
        } catch (error) {
            utils.showToast('Network error. Please try again.', 'error');
            return false;
        }
    },

    // Logout user
    logout: () => {
        if (appState.isDemoMode) {
            demoMode.disable();
            utils.showToast('Exited demo mode', 'info');
        } else {
            localStorage.removeItem('authToken');
            utils.showToast('Logged out successfully', 'info');
        }
        
        appState.user = null;
        appState.isAuthenticated = false;
        appState.isDemoMode = false;
        window.location.reload();
    }
};

// Sync Module
const sync = {
    // Initialize sync monitoring
    init: () => {
        // Note: sync polling is started after authentication check
        // to prevent 401 errors
    },

    // Start sync monitoring (called after authentication)
    startMonitoring: () => {
        // Start sync status polling only after authentication
        setInterval(sync.updateStatus, 5000);
        
        // Initial status update
        sync.updateStatus();
    },

    // Update sync status
    updateStatus: async () => {
        try {
            const response = await utils.apiRequest('sync/status');
            if (response.success) {
                appState.syncStatus = response.data;
                sync.renderStatus();
            }
        } catch (error) {
            console.error('Failed to update sync status:', error);
        }
    },

    // Render sync status in UI
    renderStatus: () => {
        const statusContainer = document.getElementById('sync-status');
        const indicator = document.getElementById('sync-indicator');
        const text = document.getElementById('sync-text');
        
        if (!statusContainer || !indicator || !text) return;

        // Update status text
        if (appState.syncStatus.isRunning) {
            text.textContent = 'Syncing...';
            statusContainer.className = 'sync-status syncing';
            indicator.innerHTML = '<i class="fas fa-circle"></i>';
        } else {
            if (appState.syncStatus.lastSync) {
                text.textContent = `Last sync: ${utils.formatDate(appState.syncStatus.lastSync)}`;
                statusContainer.className = 'sync-status synced';
                indicator.innerHTML = '<i class="fas fa-check-circle"></i>';
            } else {
                text.textContent = 'Not synced';
                statusContainer.className = 'sync-status offline';
                indicator.innerHTML = '<i class="fas fa-circle"></i>';
            }
        }
    },

    // Trigger manual sync
    triggerSync: async () => {
        try {
            utils.showLoading();
            const response = await utils.apiRequest('sync/trigger', {
                method: 'POST'
            });
            
            if (response.success) {
                utils.showToast('Sync completed successfully', 'success');
                sync.updateStatus();
            } else {
                utils.showToast('Sync failed', 'error');
            }
        } catch (error) {
            utils.showToast('Sync failed', 'error');
        } finally {
            utils.hideLoading();
        }
    }
};

// Navigation Module
const navigation = {
    // Initialize navigation
    init: () => {
        // Set up navigation event listeners
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigation.switchSection(link.getAttribute('href').substring(1));
            });
        });

        // Set up section switching
        document.querySelectorAll('section[id$="-section"]').forEach(section => {
            section.style.display = 'none';
        });

        // Note: Default section loading is delayed until after authentication
    },

    // Switch between sections
    switchSection: (sectionId) => {
        // Hide all sections
        document.querySelectorAll('section[id$="-section"]').forEach(section => {
            section.style.display = 'none';
        });

        // Show selected section
        const section = document.getElementById(`${sectionId}-section`);
        if (section) {
            section.style.display = 'block';
        }

        // Update active navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.getElementById(`nav-${sectionId}`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Check authentication before loading section data
        const isAuthenticated = appState.isAuthenticated || appState.isDemoMode;
        
        if (!isAuthenticated) {
            console.log(`⚠️ Cannot load ${sectionId} data - not authenticated`);
            utils.showToast('Please login to access this section', 'warning');
            return;
        }

        // Load section data only if authenticated
        console.log(`🔄 Loading section data for: ${sectionId}`);
        switch(sectionId) {
            case 'pos':
                console.log('📦 Loading POS data...');
                pos.load().then(() => {
                    console.log('✅ POS data loaded successfully');
                    pos.renderProducts();
                }).catch(error => {
                    console.error('❌ Failed to load POS data:', error);
                    utils.showToast('Failed to load POS data', 'error');
                });
                break;
            case 'inventory':
                console.log('📊 Loading inventory data...');
                inventory.load().then(() => {
                    console.log('✅ Inventory data loaded successfully');
                    inventory.renderProducts();
                }).catch(error => {
                    console.error('❌ Failed to load inventory data:', error);
                    utils.showToast('Failed to load inventory data', 'error');
                });
                break;
            case 'customers':
                console.log('👥 Loading customers data...');
                customers.load().then(() => {
                    console.log('✅ Customers data loaded successfully');
                    customers.renderCustomers();
                }).catch(error => {
                    console.error('❌ Failed to load customers data:', error);
                    utils.showToast('Failed to load customers data', 'error');
                });
                break;
            case 'transactions':
                console.log('💳 Loading transactions data...');
                transactions.load().then(() => {
                    console.log('✅ Transactions data loaded successfully');
                    transactions.renderTransactions();
                }).catch(error => {
                    console.error('❌ Failed to load transactions data:', error);
                    utils.showToast('Failed to load transactions data', 'error');
                });
                break;
        }
    }
};

// POS Module
const pos = {
    // Initialize POS
    init: () => {
        // Set up event listeners only - don't load data yet
        document.getElementById('new-sale-btn')?.addEventListener('click', pos.newSale);
        document.getElementById('hold-sale-btn')?.addEventListener('click', pos.holdSale);
        document.getElementById('checkout-btn')?.addEventListener('click', pos.checkout);
        document.getElementById('product-search')?.addEventListener('input', 
            utils.debounce(pos.searchProducts, 300)
        );
    },

    // Load POS data (called after authentication)
    load: async () => {
        try {
            // Load products and categories
            await Promise.all([
                pos.loadProducts(),
                pos.loadCategories(),
                pos.loadCustomers()
            ]);
        } catch (error) {
            console.error('Failed to load POS data:', error);
        }
    },

    // Load products
    loadProducts: async () => {
        try {
            const response = await utils.apiRequest('inventory/products');
            if (response.success) {
                appState.products = response.data;
                pos.renderProducts();
            }
        } catch (error) {
            console.error('Failed to load products:', error);
        }
    },

    // Load categories
    loadCategories: async () => {
        try {
            const response = await utils.apiRequest('inventory/categories');
            if (response.success) {
                appState.categories = response.data;
                pos.renderCategories();
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    },

    // Load customers
    loadCustomers: async () => {
        try {
            const response = await utils.apiRequest('customers/all');
            if (response.success) {
                appState.customers = response.data;
                pos.renderCustomers();
            }
        } catch (error) {
            console.error('Failed to load customers:', error);
        }
    },

    // Render products
    renderProducts: () => {
        const container = document.getElementById('product-grid');
        if (!container) return;

        container.innerHTML = '';

        appState.products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'col-md-4 mb-3';
            card.innerHTML = `
                <div class="product-card" data-product-id="${product.id}">
                    <div class="product-image">
                        <img src="${product.img || 'assets/images/default.jpg'}" alt="${product.name}">
                    </div>
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-details">
                            <span class="product-price">${utils.formatCurrency(product.price)}</span>
                            <span class="product-stock ${product.quantity <= product.min_stock ? 'stock-low' : ''}">
                                ${product.quantity} in stock
                            </span>
                        </div>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => pos.addToCart(product));
            container.appendChild(card);
        });
    },

    // Render categories
    renderCategories: () => {
        const container = document.getElementById('category-filters');
        if (!container) return;

        container.innerHTML = '';
        
        const allBtn = document.createElement('button');
        allBtn.className = 'btn btn-outline-secondary category-filter-btn active';
        allBtn.textContent = 'All Categories';
        allBtn.onclick = () => pos.filterProducts(null);
        container.appendChild(allBtn);

        appState.categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-secondary category-filter-btn';
            btn.textContent = category.name;
            btn.onclick = () => pos.filterProducts(category.id);
            container.appendChild(btn);
        });
    },

    // Render customers
    renderCustomers: () => {
        const select = document.getElementById('customer-select');
        if (!select) return;

        select.innerHTML = '<option value="0">Walk-in Customer</option>';
        
        appState.customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            select.appendChild(option);
        });
    },

    // Filter products by category
    filterProducts: (categoryId) => {
        const container = document.getElementById('product-grid');
        if (!container) return;

        container.innerHTML = '';

        const filteredProducts = categoryId 
            ? appState.products.filter(p => p.category_id === categoryId)
            : appState.products;

        filteredProducts.forEach(product => {
            const card = document.createElement('div');
            card.className = 'col-md-4 mb-3';
            card.innerHTML = `
                <div class="product-card" data-product-id="${product.id}">
                    <div class="product-image">
                        <img src="${product.img || 'assets/images/default.jpg'}" alt="${product.name}">
                    </div>
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-details">
                            <span class="product-price">${utils.formatCurrency(product.price)}</span>
                            <span class="product-stock ${product.quantity <= product.min_stock ? 'stock-low' : ''}">
                                ${product.quantity} in stock
                            </span>
                        </div>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => pos.addToCart(product));
            container.appendChild(card);
        });
    },

    // Search products
    searchProducts: async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            pos.renderProducts();
            return;
        }

        try {
            const response = await utils.apiRequest(`inventory/search?q=${encodeURIComponent(query)}`);
            if (response.success) {
                const container = document.getElementById('product-grid');
                container.innerHTML = '';

                response.data.forEach(product => {
                    const card = document.createElement('div');
                    card.className = 'col-md-4 mb-3';
                    card.innerHTML = `
                        <div class="product-card" data-product-id="${product.id}">
                            <div class="product-image">
                                <img src="${product.img || 'assets/images/default.jpg'}" alt="${product.name}">
                            </div>
                            <div class="product-info">
                                <div class="product-name">${product.name}</div>
                                <div class="product-details">
                                    <span class="product-price">${utils.formatCurrency(product.price)}</span>
                                    <span class="product-stock ${product.quantity <= product.min_stock ? 'stock-low' : ''}">
                                        ${product.quantity} in stock
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    card.addEventListener('click', () => pos.addToCart(product));
                    container.appendChild(card);
                });
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    },

    // Add product to cart
    addToCart: (product) => {
        const existingItem = appState.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            appState.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                total: product.price
            });
        }

        pos.renderCart();
        utils.showToast(`${product.name} added to cart`, 'success');
    },

    // Render cart
    renderCart: () => {
        const tbody = document.getElementById('cart-table').querySelector('tbody');
        const subtotalEl = document.getElementById('cart-subtotal');
        const totalEl = document.getElementById('cart-total');

        tbody.innerHTML = '';

        let subtotal = 0;

        appState.cart.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>
                    <div class="input-group cart-quantity-input">
                        <button class="btn btn-outline-secondary" onclick="pos.updateQuantity(${index}, -1)">-</button>
                        <input type="number" class="form-control text-center" value="${item.quantity}" min="1" onchange="pos.setQuantity(${index}, this.value)">
                        <button class="btn btn-outline-secondary" onclick="pos.updateQuantity(${index}, 1)">+</button>
                    </div>
                </td>
                <td>${utils.formatCurrency(item.price)}</td>
                <td>${utils.formatCurrency(item.total)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="pos.removeFromCart(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
            subtotal += item.total;
        });

        subtotalEl.textContent = utils.formatCurrency(subtotal);
        totalEl.textContent = utils.formatCurrency(subtotal);
    },

    // Update quantity
    updateQuantity: (index, change) => {
        const item = appState.cart[index];
        item.quantity = Math.max(1, item.quantity + change);
        item.total = item.price * item.quantity;
        pos.renderCart();
    },

    // Set quantity
    setQuantity: (index, value) => {
        const item = appState.cart[index];
        item.quantity = Math.max(1, parseInt(value) || 1);
        item.total = item.price * item.quantity;
        pos.renderCart();
    },

    // Remove from cart
    removeFromCart: (index) => {
        appState.cart.splice(index, 1);
        pos.renderCart();
    },

    // New sale
    newSale: () => {
        appState.cart = [];
        pos.renderCart();
        utils.showToast('New sale started', 'info');
    },

    // Hold sale
    holdSale: () => {
        if (appState.cart.length === 0) {
            utils.showToast('Cart is empty', 'warning');
            return;
        }
        utils.showToast('Sale held', 'info');
    },

    // Checkout
    checkout: () => {
        if (appState.cart.length === 0) {
            utils.showToast('Cart is empty', 'warning');
            return;
        }
        utils.showToast('Checkout completed', 'success');
        pos.newSale();
    }
};

// Inventory Module
const inventory = {
    // Initialize inventory
    init: () => {
        // Set up event listeners only - don't load data yet
        document.getElementById('inventory-search')?.addEventListener('input', 
            utils.debounce(inventory.searchProducts, 300)
        );
        document.getElementById('inventory-category-filter')?.addEventListener('change', inventory.filterProducts);
        document.getElementById('inventory-stock-filter')?.addEventListener('change', inventory.filterProducts);
        document.getElementById('refresh-inventory-btn')?.addEventListener('click', inventory.load);
        document.getElementById('export-products-btn')?.addEventListener('click', inventory.exportProducts);
    },

    // Load inventory data (called after authentication)
    load: async () => {
        try {
            await inventory.loadProducts();
        } catch (error) {
            console.error('Failed to load inventory:', error);
        }
    },

    // Load products
    loadProducts: async () => {
        try {
            const response = await utils.apiRequest('inventory/products');
            if (response.success) {
                appState.products = response.data;
                inventory.renderProducts();
            }
        } catch (error) {
            console.error('Failed to load products:', error);
        }
    },

    // Render products table
    renderProducts: () => {
        const tbody = document.getElementById('inventory-table').querySelector('tbody');
        tbody.innerHTML = '';

        appState.products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${product.img || 'assets/images/default.jpg'}" style="width: 50px; height: 50px; object-fit: cover;"></td>
                <td>${product.name}</td>
                <td>${product.category_name || 'N/A'}</td>
                <td>${utils.formatCurrency(product.price)}</td>
                <td>${product.quantity}</td>
                <td>
                    <span class="status-badge ${inventory.getStatusClass(product)}">
                        ${inventory.getStatusText(product)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="inventory.editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="inventory.deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // Get status class
    getStatusClass: (product) => {
        if (product.quantity === 0) return 'status-out-of-stock';
        if (product.quantity <= product.min_stock) return 'status-low-stock';
        return 'status-in-stock';
    },

    // Get status text
    getStatusText: (product) => {
        if (product.quantity === 0) return 'Out of Stock';
        if (product.quantity <= product.min_stock) return 'Low Stock';
        return 'In Stock';
    },

    // Search products
    searchProducts: async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            inventory.renderProducts();
            return;
        }

        try {
            const response = await utils.apiRequest(`inventory/search?q=${encodeURIComponent(query)}`);
            if (response.success) {
                const tbody = document.getElementById('inventory-table').querySelector('tbody');
                tbody.innerHTML = '';

                response.data.forEach(product => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><img src="${product.img || 'assets/images/default.jpg'}" style="width: 50px; height: 50px; object-fit: cover;"></td>
                        <td>${product.name}</td>
                        <td>${product.category_name || 'N/A'}</td>
                        <td>${utils.formatCurrency(product.price)}</td>
                        <td>${product.quantity}</td>
                        <td>
                            <span class="status-badge ${inventory.getStatusClass(product)}">
                                ${inventory.getStatusText(product)}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="inventory.editProduct(${product.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="inventory.deleteProduct(${product.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    },

    // Filter products
    filterProducts: () => {
        const categoryFilter = document.getElementById('inventory-category-filter').value;
        const stockFilter = document.getElementById('inventory-stock-filter').value;

        let filteredProducts = appState.products;

        if (categoryFilter) {
            filteredProducts = filteredProducts.filter(p => p.category_id === parseInt(categoryFilter));
        }

        if (stockFilter === 'low') {
            filteredProducts = filteredProducts.filter(p => p.quantity <= p.min_stock && p.quantity > 0);
        } else if (stockFilter === 'out') {
            filteredProducts = filteredProducts.filter(p => p.quantity === 0);
        }

        const tbody = document.getElementById('inventory-table').querySelector('tbody');
        tbody.innerHTML = '';

        filteredProducts.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${product.img || 'assets/images/default.jpg'}" style="width: 50px; height: 50px; object-fit: cover;"></td>
                <td>${product.name}</td>
                <td>${product.category_name || 'N/A'}</td>
                <td>${utils.formatCurrency(product.price)}</td>
                <td>${product.quantity}</td>
                <td>
                    <span class="status-badge ${inventory.getStatusClass(product)}">
                        ${inventory.getStatusText(product)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="inventory.editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="inventory.deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // Edit product
    editProduct: (productId) => {
        const product = appState.products.find(p => p.id === productId);
        if (!product) return;

        // This would open an edit modal in a real implementation
        utils.showToast(`Edit product: ${product.name}`, 'info');
    },

    // Delete product
    deleteProduct: async (productId) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const response = await utils.apiRequest(`inventory/products/${productId}`, {
                method: 'DELETE'
            });

            if (response.success) {
                appState.products = appState.products.filter(p => p.id !== productId);
                inventory.renderProducts();
                utils.showToast('Product deleted successfully', 'success');
            } else {
                utils.showToast('Failed to delete product', 'error');
            }
        } catch (error) {
            utils.showToast('Network error. Please try again.', 'error');
        }
    },

    // Export products
    exportProducts: async () => {
        try {
            utils.showLoading();
            const response = await utils.apiRequest('inventory/export/csv');
            
            if (response.success) {
                // Create download link
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'products.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                utils.showToast('Products exported successfully', 'success');
            }
        } catch (error) {
            utils.showToast('Export failed', 'error');
        } finally {
            utils.hideLoading();
        }
    }
};

// Customers Module
const customers = {
    // Initialize customers
    init: () => {
        // Set up event listeners only - don't load data yet
        document.getElementById('customer-search')?.addEventListener('input', 
            utils.debounce(customers.searchCustomers, 300)
        );
        document.getElementById('customer-tier-filter')?.addEventListener('change', customers.filterCustomers);
        document.getElementById('refresh-customers-btn')?.addEventListener('click', customers.load);
    },

    // Load customers data (called after authentication)
    load: async () => {
        try {
            await customers.loadCustomers();
        } catch (error) {
            console.error('Failed to load customers:', error);
        }
    },

    // Load customers
    loadCustomers: async () => {
        try {
            const response = await utils.apiRequest('customers/all');
            if (response.success) {
                appState.customers = response.data;
                customers.renderCustomers();
            }
        } catch (error) {
            console.error('Failed to load customers:', error);
        }
    },

    // Render customers table
    renderCustomers: () => {
        const tbody = document.getElementById('customers-table').querySelector('tbody');
        tbody.innerHTML = '';

        appState.customers.forEach(customer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${customer.name}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>${customer.phone || 'N/A'}</td>
                <td>
                    <span class="badge bg-${customers.getTierColor(customer.loyalty_tier)}">
                        ${customer.loyalty_tier}
                    </span>
                </td>
                <td>${customer.loyalty_points || 0}</td>
                <td>${customer.last_purchase ? utils.formatDate(customer.last_purchase) : 'Never'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="customers.editCustomer(${customer.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="customers.viewHistory(${customer.id})">
                        <i class="fas fa-history"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // Get tier color
    getTierColor: (tier) => {
        switch(tier) {
            case 'bronze': return 'secondary';
            case 'silver': return 'secondary';
            case 'gold': return 'warning';
            case 'platinum': return 'primary';
            default: return 'secondary';
        }
    },

    // Search customers
    searchCustomers: async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            customers.renderCustomers();
            return;
        }

        try {
            const response = await utils.apiRequest(`customers/search?q=${encodeURIComponent(query)}`);
            if (response.success) {
                const tbody = document.getElementById('customers-table').querySelector('tbody');
                tbody.innerHTML = '';

                response.data.forEach(customer => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${customer.name}</td>
                        <td>${customer.email || 'N/A'}</td>
                        <td>${customer.phone || 'N/A'}</td>
                        <td>
                            <span class="badge bg-${customers.getTierColor(customer.loyalty_tier)}">
                                ${customer.loyalty_tier}
                            </span>
                        </td>
                        <td>${customer.loyalty_points || 0}</td>
                        <td>${customer.last_purchase ? utils.formatDate(customer.last_purchase) : 'Never'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="customers.editCustomer(${customer.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="customers.viewHistory(${customer.id})">
                                <i class="fas fa-history"></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    },

    // Filter customers
    filterCustomers: () => {
        const tierFilter = document.getElementById('customer-tier-filter').value;

        let filteredCustomers = appState.customers;

        if (tierFilter) {
            filteredCustomers = filteredCustomers.filter(c => c.loyalty_tier === tierFilter);
        }

        const tbody = document.getElementById('customers-table').querySelector('tbody');
        tbody.innerHTML = '';

        filteredCustomers.forEach(customer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${customer.name}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>${customer.phone || 'N/A'}</td>
                <td>
                    <span class="badge bg-${customers.getTierColor(customer.loyalty_tier)}">
                        ${customer.loyalty_tier}
                    </span>
                </td>
                <td>${customer.loyalty_points || 0}</td>
                <td>${customer.last_purchase ? utils.formatDate(customer.last_purchase) : 'Never'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="customers.editCustomer(${customer.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="customers.viewHistory(${customer.id})">
                        <i class="fas fa-history"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // Edit customer
    editCustomer: (customerId) => {
        const customer = appState.customers.find(c => c.id === customerId);
        if (!customer) return;

        // This would open an edit modal in a real implementation
        utils.showToast(`Edit customer: ${customer.name}`, 'info');
    },

    // View customer history
    viewHistory: (customerId) => {
        utils.showToast('Customer history feature coming soon', 'info');
    }
};

// Transactions Module
const transactions = {
    // Initialize transactions
    init: () => {
        // Set up event listeners only - don't load data yet
        document.getElementById('refresh-transactions-btn')?.addEventListener('click', transactions.load);
        document.getElementById('export-transactions-btn')?.addEventListener('click', transactions.exportTransactions);
        document.getElementById('filter-transactions-btn')?.addEventListener('click', transactions.filterTransactions);
    },

    // Load transactions data (called after authentication)
    load: async () => {
        try {
            await transactions.loadTransactions();
        } catch (error) {
            console.error('Failed to load transactions:', error);
        }
    },

    // Load transactions
    loadTransactions: async () => {
        try {
            const response = await utils.apiRequest('transactions/all');
            if (response.success) {
                appState.transactions = response.data;
                transactions.renderTransactions();
            }
        } catch (error) {
            console.error('Failed to load transactions:', error);
        }
    },

    // Render transactions table
    renderTransactions: () => {
        const tbody = document.getElementById('transactions-table').querySelector('tbody');
        tbody.innerHTML = '';

        appState.transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.order_number}</td>
                <td>${utils.formatDate(transaction.date)}</td>
                <td>${transaction.customer_name || 'Walk-in Customer'}</td>
                <td>${utils.formatCurrency(transaction.total)}</td>
                <td>
                    <span class="badge bg-${transaction.status === 1 ? 'success' : 'warning'}">
                        ${transaction.status === 1 ? 'Completed' : 'On Hold'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="transactions.viewDetails(${transaction.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="transactions.printReceipt(${transaction.id})">
                        <i class="fas fa-print"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // Filter transactions
    filterTransactions: async () => {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const status = document.getElementById('transaction-status-filter').value;

        try {
            let url = 'transactions/all';
            const params = [];

            if (startDate) params.push(`start=${startDate}`);
            if (endDate) params.push(`end=${endDate}`);
            if (status) params.push(`status=${status}`);

            if (params.length > 0) {
                url += '?' + params.join('&');
            }

            const response = await utils.apiRequest(url);
            if (response.success) {
                appState.transactions = response.data;
                transactions.renderTransactions();
            }
        } catch (error) {
            console.error('Filter failed:', error);
        }
    },

    // View transaction details
    viewDetails: (transactionId) => {
        const transaction = appState.transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        // This would open a details modal in a real implementation
        utils.showToast(`View details for transaction: ${transaction.order_number}`, 'info');
    },

    // Print receipt
    printReceipt: (transactionId) => {
        utils.showToast('Print receipt feature coming soon', 'info');
    },

    // Export transactions
    exportTransactions: async () => {
        try {
            utils.showLoading();
            const response = await utils.apiRequest('transactions/export/csv');
            
            if (response.success) {
                // Create download link
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'transactions.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                utils.showToast('Transactions exported successfully', 'success');
            }
        } catch (error) {
            utils.showToast('Export failed', 'error');
        } finally {
            utils.hideLoading();
        }
    }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 PharmaMine Web Application Starting...');
        
        // Initialize demo mode if enabled
        const isDemoMode = initDemoMode();
        console.log('🎭 Demo mode:', isDemoMode);
        
        // Check authentication (skipped if demo mode)
        console.log('🔐 Checking authentication...');
        const isAuthenticated = await auth.checkAuth();
        console.log('✅ Authentication status:', isAuthenticated);
        
        if (!isAuthenticated && !isDemoMode) {
            console.log('🔓 User not authenticated, showing auth buttons');
            // Show auth buttons for non-demo mode
            document.getElementById('auth-buttons').style.display = 'flex';
        } else {
            console.log('🔒 User authenticated, hiding auth buttons');
            // Hide auth buttons and show user info
            document.getElementById('auth-buttons').style.display = 'none';
            const usernameDisplay = document.getElementById('username-display');
            if (usernameDisplay) {
                usernameDisplay.textContent = isDemoMode ? 'Demo User' : appState.user.fullname;
            }
            
            // Show demo mode indicator if applicable
            if (isDemoMode) {
                const userDropdown = document.getElementById('userDropdown');
                if (userDropdown) {
                    const badge = document.createElement('span');
                    badge.className = 'badge bg-warning ms-2';
                    badge.textContent = 'DEMO';
                    userDropdown.appendChild(badge);
                }
            }
        }

        // Initialize modules
        console.log('🔧 Initializing modules...');
        sync.init();
        navigation.init();
        pos.init();
        inventory.init();
        customers.init();
        transactions.init();
        console.log('✅ All modules initialized');
        
        // Start sync monitoring only after authentication is confirmed
        if (isAuthenticated || isDemoMode) {
            console.log('📡 Starting sync monitoring...');
            sync.startMonitoring();
            
            // Load default section after authentication
            console.log('🧭 Loading default section (pos)...');
            navigation.switchSection('pos');
        } else {
            console.log('⚠️  Skipping sync monitoring and section loading - not authenticated');
        }

        // Set up global event listeners
        document.getElementById('logout-link')?.addEventListener('click', auth.logout);
        
        // Add demo mode toggle button if not in demo mode
        if (!isDemoMode) {
            addDemoModeButton();
        }

        utils.showToast(isDemoMode ? 'Demo mode activated!' : 'Application loaded successfully', 'success');
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        utils.showToast('Failed to load application', 'error');
    }
});

// Add demo mode toggle button
const addDemoModeButton = () => {
    const authButtons = document.getElementById('auth-buttons');
    if (authButtons) {
        const demoButton = document.createElement('button');
        demoButton.className = 'btn btn-warning ms-2';
        demoButton.innerHTML = '<i class="fas fa-play me-1"></i>Try Demo';
        demoButton.onclick = () => {
            demoMode.enable();
            window.location.reload();
        };
        authButtons.appendChild(demoButton);
    }
};

// Make functions globally available for onclick handlers
window.pos = pos;
window.inventory = inventory;
window.customers = customers;
window.transactions = transactions;
