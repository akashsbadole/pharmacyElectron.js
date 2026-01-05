// POS Component for PharmaMine Web Application

// POS state
const posState = {
    cart: [],
    products: [],
    categories: [],
    customers: [],
    selectedCustomer: null,
    discount: 0,
    taxRate: 0,
    paymentType: 'cash',
    paymentAmount: 0
};

// POS API endpoints
const posAPI = {
    // Get products
    getProducts: async () => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/inventory/products`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('POS products API error:', error);
            throw error;
        }
    },

    // Get categories
    getCategories: async () => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/inventory/categories`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('POS categories API error:', error);
            throw error;
        }
    },

    // Get customers
    getCustomers: async () => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/customers/all`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('POS customers API error:', error);
            throw error;
        }
    },

    // Search products
    searchProducts: async (query) => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/inventory/search?q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('POS search products API error:', error);
            throw error;
        }
    },

    // Create transaction
    createTransaction: async (transactionData) => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/transactions/new`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transactionData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('POS create transaction API error:', error);
            throw error;
        }
    },

    // Get settings
    getSettings: async () => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/settings/get`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('POS settings API error:', error);
            throw error;
        }
    }
};

// POS utilities
const posUtils = {
    // Calculate totals
    calculateTotals: () => {
        let subtotal = 0;
        
        posState.cart.forEach(item => {
            subtotal += item.price * item.quantity;
        });

        const discountAmount = posState.discount;
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = taxableAmount * (posState.taxRate / 100);
        const total = taxableAmount + taxAmount;

        return {
            subtotal,
            discount: discountAmount,
            tax: taxAmount,
            total
        };
    },

    // Format currency for POS
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },

    // Get stock status class
    getStockStatusClass: (product) => {
        if (product.quantity === 0) return 'stock-out';
        if (product.quantity <= product.min_stock) return 'stock-low';
        return 'stock-ok';
    },

    // Get stock status text
    getStockStatusText: (product) => {
        if (product.quantity === 0) return 'Out of Stock';
        if (product.quantity <= product.min_stock) return 'Low Stock';
        return 'In Stock';
    }
};

// POS handlers
const posHandlers = {
    // Load POS data
    load: async () => {
        try {
            utils.showLoading();
            
            // Load all required data
            const [productsResponse, categoriesResponse, customersResponse, settingsResponse] = await Promise.all([
                posAPI.getProducts(),
                posAPI.getCategories(),
                posAPI.getCustomers(),
                posAPI.getSettings()
            ]);

            if (productsResponse.success) {
                posState.products = productsResponse.data;
                posHandlers.renderProducts();
            }

            if (categoriesResponse.success) {
                posState.categories = categoriesResponse.data;
                posHandlers.renderCategories();
            }

            if (customersResponse.success) {
                posState.customers = customersResponse.data;
                posHandlers.renderCustomers();
            }

            if (settingsResponse.success && settingsResponse.data.settings) {
                posState.taxRate = parseFloat(settingsResponse.data.settings.percentage || 0);
            }

            // Update dashboard
            posHandlers.updateDashboard();

        } catch (error) {
            console.error('Failed to load POS data:', error);
            utils.showToast('Failed to load POS data', 'error');
        } finally {
            utils.hideLoading();
        }
    },

    // Render products grid
    renderProducts: () => {
        const container = document.getElementById('product-grid');
        if (!container) return;

        container.innerHTML = '';

        posState.products.forEach(product => {
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
                            <span class="product-price">${posUtils.formatCurrency(product.price)}</span>
                            <span class="product-stock ${posUtils.getStockStatusClass(product)}">
                                ${product.quantity} in stock
                            </span>
                        </div>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => posHandlers.addToCart(product));
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
        allBtn.onclick = () => posHandlers.filterProducts(null);
        container.appendChild(allBtn);

        posState.categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-secondary category-filter-btn';
            btn.textContent = category.name;
            btn.onclick = () => posHandlers.filterProducts(category.id);
            container.appendChild(btn);
        });
    },

    // Render customers
    renderCustomers: () => {
        const select = document.getElementById('customer-select');
        if (!select) return;

        select.innerHTML = '<option value="0">Walk-in Customer</option>';
        
        posState.customers.forEach(customer => {
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
            ? posState.products.filter(p => p.category_id === categoryId)
            : posState.products;

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
                            <span class="product-price">${posUtils.formatCurrency(product.price)}</span>
                            <span class="product-stock ${posUtils.getStockStatusClass(product)}">
                                ${product.quantity} in stock
                            </span>
                        </div>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => posHandlers.addToCart(product));
            container.appendChild(card);
        });
    },

    // Search products
    searchProducts: async (query) => {
        if (query.length < 2) {
            posHandlers.renderProducts();
            return;
        }

        try {
            const response = await posAPI.searchProducts(query);
            
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
                                    <span class="product-price">${posUtils.formatCurrency(product.price)}</span>
                                    <span class="product-stock ${posUtils.getStockStatusClass(product)}">
                                        ${product.quantity} in stock
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    card.addEventListener('click', () => posHandlers.addToCart(product));
                    container.appendChild(card);
                });
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    },

    // Add product to cart
    addToCart: (product) => {
        // Check stock
        if (product.quantity <= 0) {
            utils.showToast('Product is out of stock', 'warning');
            return;
        }

        const existingItem = posState.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            posState.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                total: product.price
            });
        }

        posHandlers.renderCart();
        posHandlers.updateTotals();
        utils.showToast(`${product.name} added to cart`, 'success');
    },

    // Render cart
    renderCart: () => {
        const tbody = document.getElementById('cart-table').querySelector('tbody');
        tbody.innerHTML = '';

        posState.cart.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>
                    <div class="input-group cart-quantity-input">
                        <button class="btn btn-outline-secondary" onclick="posHandlers.updateQuantity(${index}, -1)">-</button>
                        <input type="number" class="form-control text-center" value="${item.quantity}" min="1" onchange="posHandlers.setQuantity(${index}, this.value)">
                        <button class="btn btn-outline-secondary" onclick="posHandlers.updateQuantity(${index}, 1)">+</button>
                    </div>
                </td>
                <td>${posUtils.formatCurrency(item.price)}</td>
                <td>${posUtils.formatCurrency(item.total)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="posHandlers.removeFromCart(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // Update quantity
    updateQuantity: (index, change) => {
        const item = posState.cart[index];
        const newQuantity = Math.max(1, item.quantity + change);
        
        // Find product to check stock
        const product = posState.products.find(p => p.id === item.id);
        
        if (product && newQuantity > product.quantity) {
            utils.showToast('Not enough stock available', 'warning');
            return;
        }

        item.quantity = newQuantity;
        item.total = item.price * item.quantity;
        posHandlers.renderCart();
        posHandlers.updateTotals();
    },

    // Set quantity
    setQuantity: (index, value) => {
        const item = posState.cart[index];
        const newQuantity = Math.max(1, parseInt(value) || 1);
        
        // Find product to check stock
        const product = posState.products.find(p => p.id === item.id);
        
        if (product && newQuantity > product.quantity) {
            utils.showToast('Not enough stock available', 'warning');
            return;
        }

        item.quantity = newQuantity;
        item.total = item.price * item.quantity;
        posHandlers.renderCart();
        posHandlers.updateTotals();
    },

    // Remove from cart
    removeFromCart: (index) => {
        posState.cart.splice(index, 1);
        posHandlers.renderCart();
        posHandlers.updateTotals();
    },

    // Update totals
    updateTotals: () => {
        const totals = posUtils.calculateTotals();
        
        document.getElementById('cart-subtotal').textContent = posUtils.formatCurrency(totals.subtotal);
        document.getElementById('cart-discount').textContent = posUtils.formatCurrency(totals.discount);
        document.getElementById('cart-tax').textContent = posUtils.formatCurrency(totals.tax);
        document.getElementById('cart-total').textContent = posUtils.formatCurrency(totals.total);
    },

    // Set customer
    setCustomer: (customerId) => {
        if (customerId === '0') {
            posState.selectedCustomer = null;
        } else {
            posState.selectedCustomer = posState.customers.find(c => c.id === parseInt(customerId));
        }
    },

    // Set discount
    setDiscount: (discount) => {
        posState.discount = parseFloat(discount) || 0;
        posHandlers.updateTotals();
    },

    // Set payment type
    setPaymentType: (paymentType) => {
        posState.paymentType = paymentType;
    },

    // Set payment amount
    setPaymentAmount: (amount) => {
        posState.paymentAmount = parseFloat(amount) || 0;
        posHandlers.calculateChange();
    },

    // Calculate change
    calculateChange: () => {
        const totals = posUtils.calculateTotals();
        const change = posState.paymentAmount - totals.total;
        
        const changeEl = document.getElementById('change');
        if (changeEl) {
            changeEl.textContent = posUtils.formatCurrency(Math.max(0, change));
        }
    },

    // New sale
    newSale: () => {
        posState.cart = [];
        posState.discount = 0;
        posState.paymentAmount = 0;
        posState.selectedCustomer = null;
        
        // Reset UI
        document.getElementById('customer-select').value = '0';
        document.getElementById('discount-input').value = '';
        document.getElementById('payment-input').value = '';
        document.getElementById('change').textContent = posUtils.formatCurrency(0);
        
        posHandlers.renderCart();
        posHandlers.updateTotals();
        utils.showToast('New sale started', 'info');
    },

    // Hold sale
    holdSale: () => {
        if (posState.cart.length === 0) {
            utils.showToast('Cart is empty', 'warning');
            return;
        }
        
        // In a real implementation, this would save the cart to the database
        utils.showToast('Sale held', 'info');
    },

    // Checkout
    checkout: async () => {
        if (posState.cart.length === 0) {
            utils.showToast('Cart is empty', 'warning');
            return;
        }

        const totals = posUtils.calculateTotals();
        
        if (posState.paymentAmount < totals.total) {
            utils.showToast('Insufficient payment amount', 'warning');
            return;
        }

        try {
            utils.showLoading();
            
            const transactionData = {
                order_number: `ORD-${Date.now()}`,
                customer_id: posState.selectedCustomer ? posState.selectedCustomer.id : null,
                items: posState.cart,
                subtotal: totals.subtotal,
                discount: totals.discount,
                tax: totals.tax,
                total: totals.total,
                payment_type: posState.paymentType,
                payment_amount: posState.paymentAmount,
                change: posState.paymentAmount - totals.total
            };

            const response = await posAPI.createTransaction(transactionData);
            
            if (response.success) {
                utils.showToast('Checkout completed successfully', 'success');
                posHandlers.newSale();
                
                // Show receipt modal
                posHandlers.showReceipt(response.data);
            } else {
                utils.showToast('Checkout failed', 'error');
            }
        } catch (error) {
            console.error('Checkout failed:', error);
            utils.showToast('Checkout failed', 'error');
        } finally {
            utils.hideLoading();
        }
    },

    // Show receipt
    showReceipt: (transaction) => {
        const modal = document.getElementById('receipt-modal');
        if (!modal) {
            const modalHtml = `
                <div class="modal fade" id="receipt-modal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Receipt</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div id="receipt-content">
                                    <!-- Receipt content will be loaded here -->
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" onclick="posHandlers.printReceipt()">Print</button>
                                <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        const receiptContent = document.getElementById('receipt-content');
        receiptContent.innerHTML = `
            <div style="font-family: monospace; font-size: 14px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h4>PharmaMine</h4>
                    <p>Thank you for your purchase!</p>
                    <p>Order #${transaction.order_number}</p>
                    <p>${new Date(transaction.date).toLocaleString()}</p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="text-align: left; border-bottom: 1px solid #000;">Item</th>
                            <th style="text-align: right; border-bottom: 1px solid #000;">Qty</th>
                            <th style="text-align: right; border-bottom: 1px solid #000;">Price</th>
                            <th style="text-align: right; border-bottom: 1px solid #000;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transaction.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td style="text-align: right;">${item.quantity}</td>
                                <td style="text-align: right;">${posUtils.formatCurrency(item.price)}</td>
                                <td style="text-align: right;">${posUtils.formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div style="margin-top: 20px; border-top: 1px solid #000; padding-top: 10px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>Subtotal:</span>
                        <span>${posUtils.formatCurrency(transaction.subtotal)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Discount:</span>
                        <span>- ${posUtils.formatCurrency(transaction.discount)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Tax:</span>
                        <span>${posUtils.formatCurrency(transaction.tax)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 10px;">
                        <span>Total:</span>
                        <span>${posUtils.formatCurrency(transaction.total)}</span>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>Payment:</span>
                            <span>${transaction.payment_type}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Amount Paid:</span>
                            <span>${posUtils.formatCurrency(transaction.payment_amount)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Change:</span>
                            <span>${posUtils.formatCurrency(transaction.change)}</span>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
                        Thank you for shopping with us!
                        <br>
                        Please keep this receipt for your records.
                    </div>
                </div>
            </div>
        `;

        // Show modal
        const modalInstance = new bootstrap.Modal(document.getElementById('receipt-modal'));
        modalInstance.show();
    },

    // Print receipt
    printReceipt: () => {
        const receiptContent = document.getElementById('receipt-content');
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Receipt</title>
                    <style>
                        body { font-family: monospace; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { padding: 5px; }
                        .total { font-weight: bold; font-size: 18px; }
                    </style>
                </head>
                <body>
                    ${receiptContent.innerHTML}
                    <script>window.print();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    },

    // Update dashboard
    updateDashboard: () => {
        // Update dashboard cards
        const totalProducts = document.getElementById('total-products');
        const totalCustomers = document.getElementById('total-customers');
        const todaySales = document.getElementById('today-sales');
        const lowStockCount = document.getElementById('low-stock-count');

        if (totalProducts) {
            totalProducts.textContent = posState.products.length;
        }

        if (totalCustomers) {
            totalCustomers.textContent = posState.customers.length;
        }

        if (todaySales) {
            // Calculate today's sales (would need API call in real implementation)
            todaySales.textContent = posUtils.formatCurrency(0);
        }

        if (lowStockCount) {
            const lowStockItems = posState.products.filter(p => p.quantity <= p.min_stock && p.quantity > 0);
            lowStockCount.textContent = lowStockItems.length;
        }
    }
};

// Initialize POS component
const initPOS = () => {
    // Set up event listeners
    const productSearch = document.getElementById('product-search');
    const newSaleBtn = document.getElementById('new-sale-btn');
    const holdSaleBtn = document.getElementById('hold-sale-btn');
    const checkoutBtn = document.getElementById('checkout-btn');
    const customerSelect = document.getElementById('customer-select');
    const discountInput = document.getElementById('discount-input');
    const paymentInput = document.getElementById('payment-input');

    if (productSearch) {
        productSearch.addEventListener('input', utils.debounce((e) => posHandlers.searchProducts(e.target.value), 300));
    }

    if (newSaleBtn) {
        newSaleBtn.addEventListener('click', posHandlers.newSale);
    }

    if (holdSaleBtn) {
        holdSaleBtn.addEventListener('click', posHandlers.holdSale);
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', posHandlers.checkout);
    }

    if (customerSelect) {
        customerSelect.addEventListener('change', (e) => posHandlers.setCustomer(e.target.value));
    }

    if (discountInput) {
        discountInput.addEventListener('input', (e) => posHandlers.setDiscount(e.target.value));
    }

    if (paymentInput) {
        paymentInput.addEventListener('input', (e) => {
            posHandlers.setPaymentAmount(e.target.value);
            posHandlers.calculateChange();
        });
    }

    // Load initial data (removed - will be called manually after authentication)
    // posHandlers.load();
};

// Export for global access
window.posState = posState;
window.posAPI = posAPI;
window.posUtils = posUtils;
window.posHandlers = posHandlers;
window.initPOS = initPOS;
