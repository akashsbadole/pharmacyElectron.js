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
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Delegation for dynamic batch rows
    $(document).on('click', '.remove-batch', () => {
      this.calculateBatchTotals();
    });
    
    $(document).on('input', '.batch-qty, .batch-expiry', () => {
      this.calculateBatchTotals();
    });
    
    // Override legacy add_batch_row if in inventory module
    const self = this;
    $(document).on('click', '#add_batch_row', function(e) {
      if (self.app.state.getState().activeModule === 'inventory') {
        e.stopImmediatePropagation(); // Prevent legacy handler
        self.addBatchRow();
      }
    });

    // Handle form submission via modular controller
    $(document).on('submit', '#saveProduct', function(e) {
      if (self.app.state.getState().activeModule === 'inventory') {
        e.preventDefault();
        self.handleProductSubmit(this);
      }
    });
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
          <p class="module-subtitle">Manage products, stock levels, and pharmacy categories</p>
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
                <label class="form-label">Search Menu Items</label>
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
              <i class="fa fa-plus"></i> Add Menu Item
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
            <button class="btn btn-sm btn-primary" onclick="window.pharmaApp.getModule('inventory').editMenuItem('${product._id}')">
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
    // Reset form for a new product
    $("#saveProduct").get(0).reset();
    $("#product_id").val("");
    $("#current_img").text("");
    $("#batch_items").empty();
    $("#batches_input").val("");
    $("#expirationDate").val("");
    $("#quantity").val(0);
    
    // Set title and show modal
    $("#newProduct .modal-title").text("Add New Menu Item");
    $("#newProduct").modal("show");
  }
  
  viewProduct(productId) {
    const inventoryState = this.app.state.getModuleState('inventory');
    const product = inventoryState.products.find(p => p._id.toString() === productId.toString());
    
    if (product) {
      this.populateProductModal(product);
      // Change title and maybe disable submit for viewing
      $("#newProduct .modal-title").text("View Menu Item Details");
      $("#submitProduct").hide();
      $("#newProduct").modal("show");
    }
  }
  
  editMenuItem(productId) {
    const inventoryState = this.app.state.getModuleState('inventory');
    const product = inventoryState.products.find(p => p._id.toString() === productId.toString());
    
    if (product) {
      this.populateProductModal(product);
      // Change title and ensure submit is visible
      $("#newProduct .modal-title").text("Edit Menu Item");
      $("#submitProduct").show();
      $("#newProduct").modal("show");
    }
  }
  
  importProducts() {
    // Show the import CSV modal
    $("#importCSVPModal").modal("show");
  }

  // Private helper to populate the product modal
  populateProductModal(product) {
    $("#product_id").val(product._id);
    $("#category").val(product.category);
    $("#productName").val(product.name);
    $("#barcode").val(product.barcode || "");
    $("#product_price").val(product.price);
    $("#cost_price").val(product.cost || "");
    $("#minStock").val(product.minStock || 1);
    $("#stock").prop("checked", product.stock === 0);
    // Pharmacy-specific inventory management
    $("#quantity").val(product.quantity || 0);
    // HSN code for pharmaceutical products
    $("#expirationDate").val(product.expirationDate || "");
    
    // Batch items
    $("#batch_items").empty();
    if (product.batches && Array.isArray(product.batches)) {
      product.batches.forEach(batch => {
        this.addBatchRow(batch);
      });
    } else if (product.quantity > 0) {
      // Legacy support: create a default batch if quantity exists but no batches
      this.addBatchRow({ 
        batch_number: 'LEGACY', 
        quantity: product.quantity, 
        expirationDate: product.expirationDate 
      });
    }
    
    this.calculateBatchTotals();
    
    // Image preview
    if (product.img) {
      $("#current_img").html(`<img src="uploads/${product.img}" style="max-width: 100px" />`);
    } else {
      $("#current_img").empty();
    }
  }

  addBatchRow(data = {}) {
    let html = `
      <div class="row batch-row m-b-5">
          <div class="col-md-5">
              <input type="text" class="form-control input-sm batch-number" placeholder="No." value="${data.batch_number || ''}">
          </div>
          <div class="col-md-3">
              <input type="number" class="form-control input-sm batch-qty" placeholder="Qty" value="${data.quantity || ''}" min="0">
          </div>
          <div class="col-md-3">
              <input type="date" class="form-control input-sm batch-expiry" value="${data.expirationDate || ''}">
          </div>
          <div class="col-md-1">
              <button type="button" class="btn btn-xs btn-danger remove-batch" onclick="$(this).closest('.batch-row').remove();"><i class="fa fa-times"></i></button>
          </div>
      </div>`;
    $("#batch_items").append(html);
  }

  calculateBatchTotals() {
    let totalQty = 0;
    let earliestExpiry = null;
    let batches = [];

    $('.batch-row').each(function() {
      let qty = parseInt($(this).find('.batch-qty').val()) || 0;
      let expiry = $(this).find('.batch-expiry').val();
      let number = $(this).find('.batch-number').val();

      if (qty > 0 || number) {
        totalQty += qty;
        batches.push({
          batch_number: number,
          quantity: qty,
          expirationDate: expiry
        });

        if (expiry) {
          let expDate = new Date(expiry);
          if (!earliestExpiry || expDate < earliestExpiry) {
            earliestExpiry = expDate;
          }
        }
      }
    });

    $('#quantity').val(totalQty);
    $('#batches_input').val(JSON.stringify(batches));
    
    if (earliestExpiry) {
      const d = earliestExpiry;
      let month = '' + (d.getMonth() + 1);
      let day = '' + d.getDate();
      let year = d.getFullYear();

      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;

      $('#expirationDate').val([year, month, day].join('-'));
    } else {
      $('#expirationDate').val('');
    }
  }

  async handleProductSubmit(form) {
    const formData = new FormData(form);
    const productId = $("#product_id").val();
    const isUpdate = !!productId;
    
    try {
      if (window.notiflix) window.notiflix.Block.standard('#newProduct .modal-content', 'Saving Product...');
      
      const response = await fetch(`${window.api}inventory/product`, {
        method: isUpdate ? 'PUT' : 'POST',
        body: formData // Fetch handles FormData automatically with correct boundary
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to save product');
      }
      
      await response.json();
      
      if (window.notiflix) window.notiflix.Block.remove('#newProduct .modal-content');
      
      $("#newProduct").modal("hide");
      
      if (window.notiflix) {
        window.notiflix.Notify.success('Product saved successfully!');
      }
      
      // Refresh list
      this.loadProducts();
      
    } catch (error) {
      console.error('Error saving product:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('#newProduct .modal-content');
        window.notiflix.Report.failure('Error', error.message, 'Ok');
      }
    }
  }
}

// Make InventoryModule available globally
window.InventoryModule = InventoryModule;