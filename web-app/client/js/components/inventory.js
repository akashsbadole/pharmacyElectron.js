// Inventory Component for PharmaMine Web Application

// Inventory state
const inventoryState = {
    products: [],
    categories: [],
    filteredProducts: [],
    currentFilters: {
        category: null,
        stock: null,
        search: ''
    }
};

// Inventory API endpoints
const inventoryAPI = {
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
            console.error('Inventory products API error:', error);
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
            console.error('Inventory categories API error:', error);
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
            console.error('Inventory search products API error:', error);
            throw error;
        }
    },

    // Create product
    createProduct: async (productData) => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/inventory/products`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Inventory create product API error:', error);
            throw error;
        }
    },

    // Update product
    updateProduct: async (productId, productData) => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/inventory/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Inventory update product API error:', error);
            throw error;
        }
    },

    // Delete product
    deleteProduct: async (productId) => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/inventory/products/${productId}`, {
                method: 'DELETE',
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
            console.error('Inventory delete product API error:', error);
            throw error;
        }
    },

    // Export products
    exportProducts: async () => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/inventory/export/csv`, {
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
            console.error('Inventory export products API error:', error);
            throw error;
        }
    },

    // Import products
    importProducts: async (csvFile, duplicateAction) => {
        try {
            const formData = new FormData();
            formData.append('csvfile', csvFile);
            
            if (duplicateAction) {
                formData.append('duplicate', duplicateAction);
            }

            const response = await fetch(`${apiConfig.baseUrl}/inventory/import/csv`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    // Note: Don't set Content-Type for FormData, let browser set it with boundary
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Inventory import products API error:', error);
            throw error;
        }
    }
};

// Inventory utilities
const inventoryUtils = {
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

    // Get category name
    getCategoryName: (categoryId) => {
        const category = inventoryState.categories.find(c => c.id === categoryId);
        return category ? category.name : 'Unknown';
    },

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
            day: 'numeric'
        });
    }
};

// Inventory handlers
const inventoryHandlers = {
    // Load inventory data
    load: async () => {
        try {
            utils.showLoading();
            
            // Load products and categories
            const [productsResponse, categoriesResponse] = await Promise.all([
                inventoryAPI.getProducts(),
                inventoryAPI.getCategories()
            ]);

            if (productsResponse.success) {
                inventoryState.products = productsResponse.data;
                inventoryState.filteredProducts = productsResponse.data;
                inventoryHandlers.renderProducts();
            }

            if (categoriesResponse.success) {
                inventoryState.categories = categoriesResponse.data;
                inventoryHandlers.renderCategoryFilter();
            }

            // Update dashboard
            inventoryHandlers.updateDashboard();

        } catch (error) {
            console.error('Failed to load inventory data:', error);
            utils.showToast('Failed to load inventory data', 'error');
        } finally {
            utils.hideLoading();
        }
    },

    // Render products table
    renderProducts: () => {
        const tbody = document.getElementById('inventory-table').querySelector('tbody');
        tbody.innerHTML = '';

        inventoryState.filteredProducts.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${product.img || 'assets/images/default.jpg'}" style="width: 50px; height: 50px; object-fit: cover;"></td>
                <td>${product.name}</td>
                <td>${inventoryUtils.getCategoryName(product.category_id)}</td>
                <td>${inventoryUtils.formatCurrency(product.price)}</td>
                <td>${product.quantity}</td>
                <td>
                    <span class="status-badge ${inventoryUtils.getStatusClass(product)}">
                        ${inventoryUtils.getStatusText(product)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="inventoryHandlers.editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="inventoryHandlers.deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // Render category filter
    renderCategoryFilter: () => {
        const select = document.getElementById('inventory-category-filter');
        if (!select) return;

        select.innerHTML = '<option value="">All Categories</option>';
        
        inventoryState.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    },

    // Search products
    searchProducts: async (query) => {
        inventoryState.currentFilters.search = query;
        await inventoryHandlers.applyFilters();
    },

    // Filter by category
    filterByCategory: (categoryId) => {
        inventoryState.currentFilters.category = categoryId;
        inventoryHandlers.applyFilters();
    },

    // Filter by stock status
    filterByStock: (stockStatus) => {
        inventoryState.currentFilters.stock = stockStatus;
        inventoryHandlers.applyFilters();
    },

    // Apply all filters
    applyFilters: async () => {
        let filteredProducts = [...inventoryState.products];

        // Apply search filter
        if (inventoryState.currentFilters.search) {
            try {
                const response = await inventoryAPI.searchProducts(inventoryState.currentFilters.search);
                if (response.success) {
                    filteredProducts = response.data;
                }
            } catch (error) {
                console.error('Search failed:', error);
                // Fall back to client-side filtering
                const searchQuery = inventoryState.currentFilters.search.toLowerCase();
                filteredProducts = filteredProducts.filter(product => 
                    product.name.toLowerCase().includes(searchQuery) ||
                    product.barcode?.toLowerCase().includes(searchQuery)
                );
            }
        }

        // Apply category filter
        if (inventoryState.currentFilters.category) {
            filteredProducts = filteredProducts.filter(p => p.category_id === parseInt(inventoryState.currentFilters.category));
        }

        // Apply stock filter
        if (inventoryState.currentFilters.stock) {
            switch (inventoryState.currentFilters.stock) {
                case 'low':
                    filteredProducts = filteredProducts.filter(p => p.quantity <= p.min_stock && p.quantity > 0);
                    break;
                case 'out':
                    filteredProducts = filteredProducts.filter(p => p.quantity === 0);
                    break;
            }
        }

        inventoryState.filteredProducts = filteredProducts;
        inventoryHandlers.renderProducts();
    },

    // Edit product
    editProduct: (productId) => {
        const product = inventoryState.products.find(p => p.id === productId);
        if (!product) return;

        // Create edit modal if it doesn't exist
        const modal = document.getElementById('edit-product-modal');
        if (!modal) {
            const modalHtml = `
                <div class="modal fade" id="edit-product-modal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Edit Product</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="edit-product-form">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="edit-product-name" class="form-label">Product Name</label>
                                                <input type="text" class="form-control" id="edit-product-name" required>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="edit-product-barcode" class="form-label">Barcode</label>
                                                <input type="text" class="form-control" id="edit-product-barcode">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="edit-product-price" class="form-label">Price</label>
                                                <input type="number" class="form-control" id="edit-product-price" step="0.01" required>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="edit-product-quantity" class="form-label">Quantity</label>
                                                <input type="number" class="form-control" id="edit-product-quantity" min="0" required>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="edit-product-category" class="form-label">Category</label>
                                                <select class="form-select" id="edit-product-category" required>
                                                    <!-- Categories will be loaded here -->
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="edit-product-min-stock" class="form-label">Minimum Stock</label>
                                                <input type="number" class="form-control" id="edit-product-min-stock" min="0" required>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="edit-product-description" class="form-label">Description</label>
                                        <textarea class="form-control" id="edit-product-description" rows="3"></textarea>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="inventoryHandlers.saveProduct()">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        // Populate form with product data
        document.getElementById('edit-product-name').value = product.name;
        document.getElementById('edit-product-barcode').value = product.barcode || '';
        document.getElementById('edit-product-price').value = product.price;
        document.getElementById('edit-product-quantity').value = product.quantity;
        document.getElementById('edit-product-min-stock').value = product.min_stock || 0;
        document.getElementById('edit-product-description').value = product.description || '';

        // Populate category select
        const categorySelect = document.getElementById('edit-product-category');
        categorySelect.innerHTML = '';
        inventoryState.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            option.selected = category.id === product.category_id;
            categorySelect.appendChild(option);
        });

        // Store product ID for saving
        document.getElementById('edit-product-form').dataset.productId = product.id;

        // Show modal
        const modalInstance = new bootstrap.Modal(document.getElementById('edit-product-modal'));
        modalInstance.show();
    },

    // Save product
    saveProduct: async () => {
        const form = document.getElementById('edit-product-form');
        const productId = form.dataset.productId;

        const productData = {
            name: document.getElementById('edit-product-name').value,
            barcode: document.getElementById('edit-product-barcode').value,
            price: parseFloat(document.getElementById('edit-product-price').value),
            quantity: parseInt(document.getElementById('edit-product-quantity').value),
            category_id: parseInt(document.getElementById('edit-product-category').value),
            min_stock: parseInt(document.getElementById('edit-product-min-stock').value),
            description: document.getElementById('edit-product-description').value
        };

        try {
            utils.showLoading();
            
            const response = await inventoryAPI.updateProduct(productId, productData);
            
            if (response.success) {
                // Update local data
                const index = inventoryState.products.findIndex(p => p.id === productId);
                if (index !== -1) {
                    inventoryState.products[index] = { ...inventoryState.products[index], ...productData };
                    inventoryHandlers.applyFilters(); // Re-apply filters to update display
                }
                
                utils.showToast('Product updated successfully', 'success');
                
                // Close modal
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('edit-product-modal'));
                modalInstance.hide();
            } else {
                utils.showToast('Failed to update product', 'error');
            }
        } catch (error) {
            console.error('Failed to update product:', error);
            utils.showToast('Failed to update product', 'error');
        } finally {
            utils.hideLoading();
        }
    },

    // Delete product
    deleteProduct: async (productId) => {
        const product = inventoryState.products.find(p => p.id === productId);
        if (!product) return;

        if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
            return;
        }

        try {
            utils.showLoading();
            
            const response = await inventoryAPI.deleteProduct(productId);
            
            if (response.success) {
                // Remove from local data
                inventoryState.products = inventoryState.products.filter(p => p.id !== productId);
                inventoryHandlers.applyFilters(); // Re-apply filters to update display
                
                utils.showToast('Product deleted successfully', 'success');
            } else {
                utils.showToast('Failed to delete product', 'error');
            }
        } catch (error) {
            console.error('Failed to delete product:', error);
            utils.showToast('Failed to delete product', 'error');
        } finally {
            utils.hideLoading();
        }
    },

    // Export products
    exportProducts: async () => {
        try {
            utils.showLoading();
            
            const response = await inventoryAPI.exportProducts();
            
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
            console.error('Export failed:', error);
            utils.showToast('Export failed', 'error');
        } finally {
            utils.hideLoading();
        }
    },

    // Import products
    importProducts: async (file, duplicateAction) => {
        if (!file) {
            utils.showToast('Please select a CSV file', 'warning');
            return;
        }

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            utils.showToast('Please select a CSV file', 'warning');
            return;
        }

        try {
            utils.showLoading();
            
            const response = await inventoryAPI.importProducts(file, duplicateAction);
            
            if (response.success) {
                utils.showToast('Products imported successfully', 'success');
                inventoryHandlers.load(); // Reload data
            } else {
                utils.showToast(response.message || 'Import failed', 'error');
            }
        } catch (error) {
            console.error('Import failed:', error);
            utils.showToast('Import failed', 'error');
        } finally {
            utils.hideLoading();
        }
    },

    // Update dashboard
    updateDashboard: () => {
        // Update dashboard cards
        const totalProducts = document.getElementById('total-products');
        const lowStockCount = document.getElementById('low-stock-count');

        if (totalProducts) {
            totalProducts.textContent = inventoryState.products.length;
        }

        if (lowStockCount) {
            const lowStockItems = inventoryState.products.filter(p => p.quantity <= p.min_stock && p.quantity > 0);
            lowStockCount.textContent = lowStockItems.length;
        }
    }
};

// Initialize inventory component
const initInventory = () => {
    // Set up event listeners
    const searchInput = document.getElementById('inventory-search');
    const categoryFilter = document.getElementById('inventory-category-filter');
    const stockFilter = document.getElementById('inventory-stock-filter');
    const refreshBtn = document.getElementById('refresh-inventory-btn');
    const exportBtn = document.getElementById('export-products-btn');

    if (searchInput) {
        searchInput.addEventListener('input', utils.debounce((e) => inventoryHandlers.searchProducts(e.target.value), 300));
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => inventoryHandlers.filterByCategory(e.target.value));
    }

    if (stockFilter) {
        stockFilter.addEventListener('change', (e) => inventoryHandlers.filterByStock(e.target.value));
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', inventoryHandlers.load);
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', inventoryHandlers.exportProducts);
    }

    // Set up import modal
    const importModal = document.getElementById('importProductsModal');
    if (importModal) {
        importModal.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const fileInput = document.getElementById('csvFileInput');
            const duplicateAction = document.getElementById('duplicateAction').value;
            
            inventoryHandlers.importProducts(fileInput.files[0], duplicateAction);
            
            // Close modal and reset form
            const modalInstance = bootstrap.Modal.getInstance(importModal);
            modalInstance.hide();
            fileInput.value = '';
        });
    }

    // Load initial data
    inventoryHandlers.load();
};

// Export for global access
window.inventoryState = inventoryState;
window.inventoryAPI = inventoryAPI;
window.inventoryUtils = inventoryUtils;
window.inventoryHandlers = inventoryHandlers;
window.initInventory = initInventory;
