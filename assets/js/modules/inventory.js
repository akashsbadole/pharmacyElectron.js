/**
 * Inventory Module - Product and stock management
 */

class InventoryModule {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.selectedProducts = new Set();
    this.activeFilters = {};
  }
  
  initialize() {
    console.log('Inventory module initialized');
  }
  
  onActivate() {
    this.loadInitialData();
  }
  
  async loadInitialData() {
    await Promise.all([
      this.loadProducts(),
      this.loadCategories()
    ]);
  }
  
  async loadProducts() {
    try {
      this.app.state.updateModule('inventory', { loading: true });
      
      const response = await fetch(`${window.api}inventory/products`);
      const products = await response.json();
      
      this.app.state.updateModule('inventory', { 
        products,
        loading: false
      });
      
      // Update low stock badge in navigation
      this.updateLowStockBadge(products);
      
    } catch (error) {
      console.error('Error loading products:', error);
      this.app.state.updateModule('inventory', { loading: false });
    }
  }
  
  async loadCategories() {
    try {
      const response = await fetch(`${window.api}categories/all`);
      const categories = await response.json();
      
      this.app.state.updateModule('inventory', { categories });
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }
  
  updateLowStockBadge(products) {
    const lowStockCount = products.filter(product => 
      product.quantity <= (product.minStock || 10)
    ).length;
    
    const badge = document.getElementById('low-stock-badge');
    if (badge) {
      if (lowStockCount > 0) {
        badge.textContent = lowStockCount;
        badge.style.display = 'inline';
      } else {
        badge.style.display = 'none';
      }
    }
  }
  
  filterProducts(filters) {
    this.activeFilters = { ...this.activeFilters, ...filters };
    const inventoryState = this.app.state.getModuleState('inventory');
    let filteredProducts = [...inventoryState.products];
    
    // Apply category filter
    if (this.activeFilters.category) {
      filteredProducts = filteredProducts.filter(p => p.category === this.activeFilters.category);
    }
    
    // Apply search filter
    if (this.activeFilters.search) {
      const searchTerm = this.activeFilters.search.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.barcode?.includes(searchTerm) ||
        p.category?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply stock filter
    if (this.activeFilters.stockFilter === 'low') {
      filteredProducts = filteredProducts.filter(p => p.quantity <= (p.minStock || 10));
    } else if (this.activeFilters.stockFilter === 'out') {
      filteredProducts = filteredProducts.filter(p => p.quantity === 0);
    }
    
    this.app.state.updateModule('inventory', { filteredProducts });
  }
  
  selectProduct(product) {
    this.app.state.updateModule('inventory', { selectedProduct: product });
  }
  
  toggleProductSelection(productId) {
    const inventoryState = this.app.state.getModuleState('inventory');
    const selected = new Set(inventoryState.selectedProducts || []);
    
    if (selected.has(productId)) {
      selected.delete(productId);
    } else {
      selected.add(productId);
    }
    
    this.app.state.updateModule('inventory', { selectedProducts: Array.from(selected) });
  }
  
  async createProduct(productData) {
    try {
      const response = await fetch(`${window.api}inventory/product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });
      
      const result = await response.json();
      
      // Refresh products list
      await this.loadProducts();
      
      if (window.notiflix) {
        window.notiflix.Report.success('Success', 'Product created successfully', 'Ok');
      }
      
      return result;
    } catch (error) {
      console.error('Error creating product:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to create product', 'Ok');
      }
      throw error;
    }
  }
  
  async updateProduct(productData) {
    try {
      const response = await fetch(`${window.api}inventory/product`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });
      
      const result = await response.json();
      
      // Refresh products list
      await this.loadProducts();
      
      if (window.notiflix) {
        window.notiflix.Report.success('Success', 'Product updated successfully', 'Ok');
      }
      
      return result;
    } catch (error) {
      console.error('Error updating product:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to update product', 'Ok');
      }
      throw error;
    }
  }
  
  async deleteProduct(productId) {
    try {
      await fetch(`${window.api}inventory/product/${productId}`, {
        method: 'DELETE'
      });
      
      // Refresh products list
      await this.loadProducts();
      
      if (window.notiflix) {
        window.notiflix.Report.success('Success', 'Product deleted successfully', 'Ok');
      }
      
    } catch (error) {
      console.error('Error deleting product:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to delete product', 'Ok');
      }
      throw error;
    }
  }
  
  bulkOperation(operation, productIds) {
    switch (operation) {
      case 'delete':
        productIds.forEach(id => this.deleteProduct(id));
        break;
      case 'export':
        this.exportProducts(productIds);
        break;
      default:
        console.warn('Unknown bulk operation:', operation);
    }
  }
  
  exportProducts(productIds) {
    const inventoryState = this.app.state.getModuleState('inventory');
    const products = inventoryState.products.filter(p => productIds.includes(p._id));
    
    // Create CSV content
    const csvContent = [
      ['Name', 'Barcode', 'Price', 'Quantity', 'Category', 'Expiry Date'].join(','),
      ...products.map(p => [
        p.name,
        p.barcode || '',
        p.price,
        p.quantity,
        p.category || '',
        p.expiryDate || ''
      ].join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  
  render() {
    const inventoryState = this.app.state.getModuleState('inventory');
    const products = inventoryState.filteredProducts || inventoryState.products || [];
    
    return `
      <div class="module-container inventory-module" data-module="inventory">
        <div class="module-header">
          <h1 class="module-title">Inventory Management</h1>
          <p class="module-subtitle">Manage products, stock levels, and categories</p>
        </div>
        
        ${this.renderFilters()}
        ${this.renderProductActions()}
        ${this.renderProductsList(products)}
      </div>
    `;
  }
  
  renderFilters() {
    const inventoryState = this.app.state.getModuleState('inventory');
    const categories = inventoryState.categories || [];
    
    return `
      <div class="filters-section mb-6">
        <div class="card">
          <div class="card-body">
            <div class="grid grid-cols-4 gap-4">
              <div class="form-group">
                <label class="form-label">Search Products</label>
                <input type="text" class="form-input" placeholder="Search by name, barcode..." 
                       onkeyup="window.pharmaApp.getModule('inventory').filterProducts({search: this.value})">
              </div>
              
              <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" onchange="window.pharmaApp.getModule('inventory').filterProducts({category: this.value})">
                  <option value="">All Categories</option>
                  ${categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('')}
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Stock Status</label>
                <select class="form-select" onchange="window.pharmaApp.getModule('inventory').filterProducts({stockFilter: this.value})">
                  <option value="">All Products</option>
                  <option value="low">Low Stock</option>
                  <option value="out">Out of Stock</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">&nbsp;</label>
                <button class="btn btn-secondary w-full" onclick="window.pharmaApp.getModule('inventory').clearFilters()">
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderProductActions() {
    const inventoryState = this.app.state.getModuleState('inventory');
    const selectedCount = inventoryState.selectedProducts?.length || 0;
    
    return `
      <div class="actions-section mb-6">
        <div class="flex justify-between items-center">
          <div class="flex gap-3">
            <button class="btn btn-success" onclick="window.pharmaApp.getModule('inventory').showAddProductModal()">
              <i class="fa fa-plus"></i> Add Product
            </button>
            <button class="btn btn-info" onclick="window.pharmaApp.getModule('inventory').importProducts()">
              <i class="fa fa-upload"></i> Import
            </button>
            <button class="btn btn-warning" onclick="window.pharmaApp.getModule('inventory').exportProducts(${JSON.stringify(inventoryState.selectedProducts || []).replace(/"/g, '"')})" ${selectedCount === 0 ? 'disabled' : ''}>
              <i class="fa fa-download"></i> Export Selected (${selectedCount})
            </button>
          </div>
          
          <div class="text-sm text-gray-500">
            ${inventoryState.products?.length || 0} products total
          </div>
        </div>
      </div>
    `;
  }
  
  renderProductsList(products) {
    const inventoryState = this.app.state.getModuleState('inventory');
    
    if (inventoryState.loading) {
      return `
        <div class="loading">
          <div class="spinner"></div>
          <div class="mt-2">Loading products...</div>
        </div>
      `;
    }
    
    if (!products || products.length === 0) {
      return `
        <div class="text-center py-8 text-gray-500">
          <i class="fa fa-box text-4xl mb-4"></i>
          <div>No products found</div>
        </div>
      `;
    }
    
    return `
      <div class="products-list">
        <div class="card">
          <div class="card-body p-0">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="p-4 text-left">
                      <input type="checkbox" onchange="window.pharmaApp.getModule('inventory').toggleAllProducts(this.checked)">
                    </th>
                    <th class="p-4 text-left">Product</th>
                    <th class="p-4 text-left">Barcode</th>
                    <th class="p-4 text-left">Category</th>
                    <th class="p-4 text-left">Price</th>
                    <th class="p-4 text-left">Stock</th>
                    <th class="p-4 text-left">Expiry</th>
                    <th class="p-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${products.map(product => this.renderProductRow(product)).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderProductRow(product) {
    const inventoryState = this.app.state.getModuleState('inventory');
    const isSelected = inventoryState.selectedProducts?.includes(product._id) || false;
    const isLowStock = product.quantity <= (product.minStock || 10);
    const isOutOfStock = product.quantity === 0;
    
    return `
      <tr class="${isSelected ? 'bg-blue-50' : ''} ${isLowStock ? 'bg-yellow-50' : ''} ${isOutOfStock ? 'bg-red-50' : ''}">
        <td class="p-4">
          <input type="checkbox" ${isSelected ? 'checked' : ''} 
                 onchange="window.pharmaApp.getModule('inventory').toggleProductSelection('${product._id}')">
        </td>
        <td class="p-4">
          <div class="font-medium">${product.name}</div>
          ${isLowStock ? '<div class="text-xs text-yellow-600">Low Stock</div>' : ''}
          ${isOutOfStock ? '<div class="text-xs text-red-600">Out of Stock</div>' : ''}
        </td>
        <td class="p-4 text-sm text-gray-500">${product.barcode || '-'}</td>
        <td class="p-4 text-sm">${product.category || '-'}</td>
        <td class="p-4 font-medium">$${parseFloat(product.price).toFixed(2)}</td>
        <td class="p-4">
          <span class="font-medium ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-green-600'}">
            ${product.quantity}
          </span>
        </td>
        <td class="p-4 text-sm text-gray-500">${product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : '-'}</td>
        <td class="p-4">
          <div class="flex gap-2">
            <button class="btn btn-sm btn-info" onclick="window.pharmaApp.getModule('inventory').viewProduct('${product._id}')">
              <i class="fa fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-primary" onclick="window.pharmaApp.getModule('inventory').editProduct('${product._id}')">
              <i class="fa fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="window.pharmaApp.getModule('inventory').deleteProduct('${product._id}')">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }
  
  // Helper methods
  clearFilters() {
    this.activeFilters = {};
    this.app.state.updateModule('inventory', { filteredProducts: null });
  }
  
  toggleAllProducts(checked) {
    const inventoryState = this.app.state.getModuleState('inventory');
    const products = inventoryState.filteredProducts || inventoryState.products || [];
    
    if (checked) {
      this.app.state.updateModule('inventory', { 
        selectedProducts: products.map(p => p._id) 
      });
    } else {
      this.app.state.updateModule('inventory', { selectedProducts: [] });
    }
  }
  
  showAddProductModal() {
    // TODO: Implement add product modal
    console.log('Add product modal not yet implemented');
  }
  
  viewProduct(productId) {
    // TODO: Implement product details view
    console.log('View product not yet implemented');
  }
  
  editProduct(productId) {
    // TODO: Implement edit product modal
    console.log('Edit product not yet implemented');
  }
  
  importProducts() {
    // TODO: Implement product import
    console.log('Import products not yet implemented');
  }
}

// Make InventoryModule available globally
window.InventoryModule = InventoryModule;