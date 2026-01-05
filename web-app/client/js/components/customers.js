// Customers Component for PharmaMine Web Application

// Customers state
const customersState = {
    customers: [],
    filteredCustomers: [],
    currentFilters: {
        tier: null,
        search: ''
    }
};

// Customers API endpoints
const customersAPI = {
    // Get all customers
    getAll: async () => {
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
            console.error('Customers API error:', error);
            throw error;
        }
    },

    // Search customers
    search: async (query) => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/customers/search?q=${encodeURIComponent(query)}`, {
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
            console.error('Customers search API error:', error);
            throw error;
        }
    },

    // Create customer
    create: async (customerData) => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/customers/customer`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(customerData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Customers create API error:', error);
            throw error;
        }
    },

    // Update customer
    update: async (customerId, customerData) => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/customers/customer/${customerId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(customerData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Customers update API error:', error);
            throw error;
        }
    },

    // Delete customer
    delete: async (customerId) => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/customers/customer/${customerId}`, {
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
            console.error('Customers delete API error:', error);
            throw error;
        }
    }
};

// Customers utilities
const customersUtils = {
    // Get tier color
    getTierColor: (tier) => {
        switch(tier) {
            case 'bronze': return 'secondary';
            case 'silver': return 'secondary';
            case 'gold': return 'warning';
            case 'platinum': return 'primary';
            case 'diamond': return 'info';
            default: return 'secondary';
        }
    },

    // Get tier display name
    getTierDisplayName: (tier) => {
        switch(tier) {
            case 'bronze': return 'Bronze';
            case 'silver': return 'Silver';
            case 'gold': return 'Gold';
            case 'platinum': return 'Platinum';
            case 'diamond': return 'Diamond';
            default: return 'Unknown';
        }
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
    },

    // Calculate days since last purchase
    daysSinceLastPurchase: (lastPurchaseDate) => {
        if (!lastPurchaseDate) return 'Never';
        
        const lastPurchase = new Date(lastPurchaseDate);
        const today = new Date();
        const diffTime = Math.abs(today - lastPurchase);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return `${diffDays} days ago`;
    }
};

// Customers handlers
const customersHandlers = {
    // Load customers data
    load: async () => {
        try {
            utils.showLoading();
            
            const response = await customersAPI.getAll();
            
            if (response.success) {
                customersState.customers = response.data;
                customersState.filteredCustomers = response.data;
                customersHandlers.renderCustomers();
                customersHandlers.updateDashboard();
            }

        } catch (error) {
            console.error('Failed to load customers data:', error);
            utils.showToast('Failed to load customers data', 'error');
        } finally {
            utils.hideLoading();
        }
    },

    // Render customers table
    renderCustomers: () => {
        const tbody = document.getElementById('customers-table').querySelector('tbody');
        tbody.innerHTML = '';

        customersState.filteredCustomers.forEach(customer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${customer.name}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>${customer.phone || 'N/A'}</td>
                <td>
                    <span class="badge bg-${customersUtils.getTierColor(customer.loyalty_tier)}">
                        ${customersUtils.getTierDisplayName(customer.loyalty_tier)}
                    </span>
                </td>
                <td>${customer.loyalty_points || 0}</td>
                <td>${customer.last_purchase ? customersUtils.daysSinceLastPurchase(customer.last_purchase) : 'Never'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="customersHandlers.editCustomer(${customer.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="customersHandlers.viewHistory(${customer.id})">
                        <i class="fas fa-history"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="customersHandlers.deleteCustomer(${customer.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // Search customers
    searchCustomers: async (query) => {
        customersState.currentFilters.search = query;
        await customersHandlers.applyFilters();
    },

    // Filter by tier
    filterByTier: (tier) => {
        customersState.currentFilters.tier = tier;
        customersHandlers.applyFilters();
    },

    // Apply all filters
    applyFilters: async () => {
        let filteredCustomers = [...customersState.customers];

        // Apply search filter
        if (customersState.currentFilters.search) {
            try {
                const response = await customersAPI.search(customersState.currentFilters.search);
                if (response.success) {
                    filteredCustomers = response.data;
                }
            } catch (error) {
                console.error('Search failed:', error);
                // Fall back to client-side filtering
                const searchQuery = customersState.currentFilters.search.toLowerCase();
                filteredCustomers = filteredCustomers.filter(customer => 
                    customer.name.toLowerCase().includes(searchQuery) ||
                    customer.email?.toLowerCase().includes(searchQuery) ||
                    customer.phone?.toLowerCase().includes(searchQuery)
                );
            }
        }

        // Apply tier filter
        if (customersState.currentFilters.tier) {
            filteredCustomers = filteredCustomers.filter(c => c.loyalty_tier === customersState.currentFilters.tier);
        }

        customersState.filteredCustomers = filteredCustomers;
        customersHandlers.renderCustomers();
    },

    // Edit customer
    editCustomer: (customerId) => {
        const customer = customersState.customers.find(c => c.id === customerId);
        if (!customer) return;

        // Create edit modal if it doesn't exist
        const modal = document.getElementById('edit-customer-modal');
        if (!modal) {
            const modalHtml = `
                <div class="modal fade" id="edit-customer-modal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Edit Customer</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="edit-customer-form">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="edit-customer-name" class="form-label">Full Name</label>
                                                <input type="text" class="form-control" id="edit-customer-name" required>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="edit-customer-email" class="form-label">Email</label>
                                                <input type="email" class="form-control" id="edit-customer-email">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="edit-customer-phone" class="form-label">Phone</label>
                                                <input type="tel" class="form-control" id="edit-customer-phone">
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="edit-customer-address" class="form-label">Address</label>
                                                <input type="text" class="form-control" id="edit-customer-address">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="edit-customer-tier" class="form-label">Loyalty Tier</label>
                                                <select class="form-select" id="edit-customer-tier">
                                                    <option value="bronze">Bronze</option>
                                                    <option value="silver">Silver</option>
                                                    <option value="gold">Gold</option>
                                                    <option value="platinum">Platinum</option>
                                                    <option value="diamond">Diamond</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="edit-customer-points" class="form-label">Loyalty Points</label>
                                                <input type="number" class="form-control" id="edit-customer-points" min="0">
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="customersHandlers.saveCustomer()">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        // Populate form with customer data
        document.getElementById('edit-customer-name').value = customer.name;
        document.getElementById('edit-customer-email').value = customer.email || '';
        document.getElementById('edit-customer-phone').value = customer.phone || '';
        document.getElementById('edit-customer-address').value = customer.address || '';
        document.getElementById('edit-customer-tier').value = customer.loyalty_tier || 'bronze';
        document.getElementById('edit-customer-points').value = customer.loyalty_points || 0;

        // Store customer ID for saving
        document.getElementById('edit-customer-form').dataset.customerId = customer.id;

        // Show modal
        const modalInstance = new bootstrap.Modal(document.getElementById('edit-customer-modal'));
        modalInstance.show();
    },

    // Save customer
    saveCustomer: async () => {
        const form = document.getElementById('edit-customer-form');
        const customerId = form.dataset.customerId;

        const customerData = {
            name: document.getElementById('edit-customer-name').value,
            email: document.getElementById('edit-customer-email').value,
            phone: document.getElementById('edit-customer-phone').value,
            address: document.getElementById('edit-customer-address').value,
            loyalty_tier: document.getElementById('edit-customer-tier').value,
            loyalty_points: parseInt(document.getElementById('edit-customer-points').value) || 0
        };

        try {
            utils.showLoading();
            
            const response = await customersAPI.update(customerId, customerData);
            
            if (response.success) {
                // Update local data
                const index = customersState.customers.findIndex(c => c.id === customerId);
                if (index !== -1) {
                    customersState.customers[index] = { ...customersState.customers[index], ...customerData };
                    customersHandlers.applyFilters(); // Re-apply filters to update display
                }
                
                utils.showToast('Customer updated successfully', 'success');
                
                // Close modal
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('edit-customer-modal'));
                modalInstance.hide();
            } else {
                utils.showToast('Failed to update customer', 'error');
            }
        } catch (error) {
            console.error('Failed to update customer:', error);
            utils.showToast('Failed to update customer', 'error');
        } finally {
            utils.hideLoading();
        }
    },

    // Delete customer
    deleteCustomer: async (customerId) => {
        const customer = customersState.customers.find(c => c.id === customerId);
        if (!customer) return;

        if (!confirm(`Are you sure you want to delete "${customer.name}"?`)) {
            return;
        }

        try {
            utils.showLoading();
            
            const response = await customersAPI.delete(customerId);
            
            if (response.success) {
                // Remove from local data
                customersState.customers = customersState.customers.filter(c => c.id !== customerId);
                customersHandlers.applyFilters(); // Re-apply filters to update display
                
                utils.showToast('Customer deleted successfully', 'success');
            } else {
                utils.showToast('Failed to delete customer', 'error');
            }
        } catch (error) {
            console.error('Failed to delete customer:', error);
            utils.showToast('Failed to delete customer', 'error');
        } finally {
            utils.hideLoading();
        }
    },

    // View customer history
    viewHistory: (customerId) => {
        const customer = customersState.customers.find(c => c.id === customerId);
        if (!customer) return;

        // Create history modal if it doesn't exist
        const modal = document.getElementById('customer-history-modal');
        if (!modal) {
            const modalHtml = `
                <div class="modal fade" id="customer-history-modal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Customer History</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-md-4">
                                        <div class="card">
                                            <div class="card-body text-center">
                                                <h6 class="card-title">Total Orders</h6>
                                                <h3 class="text-primary" id="customer-total-orders">0</h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="card">
                                            <div class="card-body text-center">
                                                <h6 class="card-title">Total Spent</h6>
                                                <h3 class="text-success" id="customer-total-spent">$0.00</h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="card">
                                            <div class="card-body text-center">
                                                <h6 class="card-title">Avg Order Value</h6>
                                                <h3 class="text-info" id="customer-avg-order">$0.00</h3>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Order #</th>
                                                <th>Date</th>
                                                <th>Total</th>
                                                <th>Payment Type</th>
                                            </tr>
                                        </thead>
                                        <tbody id="customer-history-table">
                                            <!-- History items will be loaded here -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        // Populate customer info
        document.getElementById('customer-total-orders').textContent = customer.total_orders || 0;
        document.getElementById('customer-total-spent').textContent = customersUtils.formatCurrency(customer.total_spent || 0);
        document.getElementById('customer-avg-order').textContent = customersUtils.formatCurrency(customer.average_order_value || 0);

        // Note: In a real implementation, we would fetch the actual transaction history
        // For now, we'll show a placeholder
        const historyTable = document.getElementById('customer-history-table');
        historyTable.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">
                    Customer transaction history would be loaded here.<br>
                    <small>This feature requires integration with the transactions API.</small>
                </td>
            </tr>
        `;

        // Show modal
        const modalInstance = new bootstrap.Modal(document.getElementById('customer-history-modal'));
        modalInstance.show();
    },

    // Add new customer
    addCustomer: async (customerData) => {
        try {
            utils.showLoading();
            
            const response = await customersAPI.create(customerData);
            
            if (response.success) {
                // Add to local data
                customersState.customers.push(response.data);
                customersHandlers.applyFilters(); // Re-apply filters to update display
                
                utils.showToast('Customer added successfully', 'success');
                
                // Close modal
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('addCustomerModal'));
                modalInstance.hide();
                
                // Reset form
                document.getElementById('addCustomerForm').reset();
            } else {
                utils.showToast('Failed to add customer', 'error');
            }
        } catch (error) {
            console.error('Failed to add customer:', error);
            utils.showToast('Failed to add customer', 'error');
        } finally {
            utils.hideLoading();
        }
    },

    // Update dashboard
    updateDashboard: () => {
        // Update dashboard cards
        const totalCustomers = document.getElementById('total-customers');

        if (totalCustomers) {
            totalCustomers.textContent = customersState.customers.length;
        }
    }
};

// Initialize customers component
const initCustomers = () => {
    // Set up event listeners
    const searchInput = document.getElementById('customer-search');
    const tierFilter = document.getElementById('customer-tier-filter');
    const refreshBtn = document.getElementById('refresh-customers-btn');

    if (searchInput) {
        searchInput.addEventListener('input', utils.debounce((e) => customersHandlers.searchCustomers(e.target.value), 300));
    }

    if (tierFilter) {
        tierFilter.addEventListener('change', (e) => customersHandlers.filterByTier(e.target.value));
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', customersHandlers.load);
    }

    // Set up add customer modal
    const addCustomerModal = document.getElementById('addCustomerModal');
    if (addCustomerModal) {
        addCustomerModal.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const customerData = {
                name: document.getElementById('registerFullname').value,
                email: document.getElementById('registerEmail').value,
                phone: document.getElementById('registerPhone').value,
                address: document.getElementById('registerAddress').value,
                loyalty_tier: 'bronze',
                loyalty_points: 0
            };
            
            customersHandlers.addCustomer(customerData);
        });
    }

    // Load initial data (removed - will be called manually after authentication)
    // customersHandlers.load();
};

// Export for global access
window.customersState = customersState;
window.customersAPI = customersAPI;
window.customersUtils = customersUtils;
window.customersHandlers = customersHandlers;
window.initCustomers = initCustomers;
