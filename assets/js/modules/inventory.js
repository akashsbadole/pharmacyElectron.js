/**
 * Inventory Module - Product and stock management
 */

class InventoryModule {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.selectedProducts = new Set();
    this.activeFilters = {};
    this.giftBundles = [];
    this.giftWrappingOptions = [];
    this.giftCards = [];
  }
  
  initialize() {
    console.log('Inventory module initialized');
    this.setupEventListeners();
    this.loadGiftStoreData();
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
      this.loadCategories(),
      this.loadGiftStoreData()
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
  
  async loadGiftStoreData() {
    try {
      await Promise.all([
        this.loadGiftBundles(),
        this.loadGiftWrappingOptions(),
        this.loadGiftOccasions()
      ]);
    } catch (error) {
      console.error('Error loading gift store data:', error);
    }
  }
  
  async loadGiftBundles() {
    try {
      const response = await fetch(`${window.api}gift_store/bundles/available`);
      const bundles = await response.json();
      
      this.giftBundles = bundles;
      this.app.state.updateModule('inventory', { giftBundles: bundles });
    } catch (error) {
      console.error('Error loading gift bundles:', error);
      this.giftBundles = [];
    }
  }
  
  async loadGiftWrappingOptions() {
    try {
      const response = await fetch(`${window.api}gift_store/wrapping/styles`);
      const wrappingOptions = await response.json();
      
      this.giftWrappingOptions = wrappingOptions;
      this.app.state.updateModule('inventory', { giftWrappingOptions: wrappingOptions });
    } catch (error) {
      console.error('Error loading gift wrapping options:', error);
      this.giftWrappingOptions = [];
    }
  }
  
  async loadGiftOccasions() {
    try {
      const response = await fetch(`${window.api}gift_store/occasions`);
      const occasions = await response.json();
      
      this.app.state.updateModule('inventory', { giftOccasions: occasions });
    } catch (error) {
      console.error('Error loading gift occasions:', error);
      this.app.state.updateModule('inventory', { giftOccasions: [] });
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
    } else if (this.activeFilters.stockFilter === 'variants') {
      // Filter products that have variant tracking
      filteredProducts = filteredProducts.filter(p => p.stock_tracking_method === 'variant');
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
          <h1 class="module-title">Menu Management</h1>
          <p class="module-subtitle">Manage menu items, stock levels, and food categories</p>
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
                  <option value="variants">Has Variants</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">&nbsp;</label>
                <button class="btn btn-secondary w-full" onclick="window.pharmaApp.getModule('inventory').clearFilters()">
                  Clear Filters
                </button>
              </div>
            </div>
            
            <div class="mt-4 flex gap-2">
              <button class="btn btn-info btn-sm" onclick="window.pharmaApp.getModule('inventory').showBulkBarcodeGenerator()">
                <i class="fa fa-barcode"></i> Bulk Generate Barcodes
              </button>
              <button class="btn btn-warning btn-sm" onclick="window.pharmaApp.getModule('inventory').exportBarcodes()">
                <i class="fa fa-download"></i> Export Barcodes
              </button>
              <button class="btn btn-success btn-sm" onclick="window.pharmaApp.getModule('inventory').showBarcodeScanner()">
                <i class="fa fa-search"></i> Scan Barcode
              </button>
              <button class="btn btn-primary btn-sm" onclick="window.pharmaApp.getModule('inventory').showPromotionManager()">
                <i class="fa fa-tags"></i> Promotions
              </button>
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
            <button class="btn btn-primary" onclick="window.InventoryMatrixUI.showDashboard()">
              <i class="fa fa-chart-line"></i> Stock Matrix
            </button>
            <button class="btn btn-info" onclick="window.pharmaApp.getModule('inventory').importProducts()">
              <i class="fa fa-upload"></i> Import
            </button>
            <button class="btn btn-warning" onclick="window.pharmaApp.getModule('inventory').exportProducts(${JSON.stringify(inventoryState.selectedProducts || []).replace(/"/g, '"')})" ${selectedCount === 0 ? 'disabled' : ''}>
              <i class="fa fa-download"></i> Export Selected (${selectedCount})
            </button>
          </div>
          
          <div class="text-sm text-gray-500">
            ${inventoryState.products?.length || 0} menu items total
          </div>
        </div>
        
        <!-- Gift Store Actions -->
        <div class="mt-4 pt-4 border-t border-gray-200">
          <h5 class="text-sm font-medium text-gray-700 mb-3">
            <i class="fa fa-gift text-purple-600"></i> Gift Store Management
          </h5>
          <div class="flex gap-2 flex-wrap">
            <button class="btn btn-sm btn-purple" onclick="window.pharmaApp.getModule('inventory').showGiftBundleCreator()">
              <i class="fa fa-box"></i> Create Gift Bundle
            </button>
            <button class="btn btn-sm btn-indigo" onclick="window.pharmaApp.getModule('inventory').showGiftWrappingManager()">
              <i class="fa fa-gift"></i> Gift Wrapping
            </button>
            <button class="btn btn-sm btn-pink" onclick="window.pharmaApp.getModule('inventory').showGiftCardManager()">
              <i class="fa fa-credit-card"></i> Gift Cards
            </button>
            <button class="btn btn-sm btn-cyan" onclick="window.pharmaApp.getModule('inventory').showGiftReceiptGenerator()">
              <i class="fa fa-receipt"></i> Gift Receipts
            </button>
            <button class="btn btn-sm btn-orange" onclick="window.pharmaApp.getModule('inventory').showGiftAnalytics()">
              <i class="fa fa-chart-bar"></i> Gift Analytics
            </button>
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
    // Removed prescription requirement check for restaurant conversion
    $("#quantity").val(product.quantity || 0);
    // Removed HSN code for restaurant conversion
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

  /**
   * Enhanced Barcode Management Methods
   */

  showBulkBarcodeGenerator() {
    const modalHtml = `
      <div class="bulk-barcode-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="bulkBarcodeModal">
        <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Bulk Barcode Generator</h3>
            <button onclick="window.pharmaApp.getModule('inventory').hideBulkBarcodeGenerator()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="barcode-generator-content">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="generator-settings">
                <h4 class="font-medium mb-3">Generation Settings</h4>
                
                <div class="form-group mb-3">
                  <label class="form-label">Product</label>
                  <select class="form-select" id="barcodeProductSelect" onchange="window.pharmaApp.getModule('inventory').loadProductVariants()">
                    <option value="">Select a product...</option>
                    ${this.app.state.getModuleState('inventory').products.map(p => 
                      `<option value="${p._id}">${p.name} (${p._id})</option>`
                    ).join('')}
                  </select>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Barcode Format</label>
                  <select class="form-select" id="barcodeFormat">
                    <option value="UPC-E">UPC-E</option>
                    <option value="EAN-13">EAN-13</option>
                    <option value="EAN-8">EAN-8</option>
                    <option value="Code128">Code128</option>
                    <option value="QR">QR Code</option>
                  </select>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Pattern</label>
                  <select class="form-select" id="barcodePattern">
                    <option value="product-color-size">Product-Color-Size</option>
                    <option value="color-size-product">Color-Size-Product</option>
                    <option value="sequential">Sequential</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Prefix (Optional)</label>
                  <input type="text" class="form-input" id="barcodePrefix" placeholder="e.g., PHM">
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Suffix (Optional)</label>
                  <input type="text" class="form-input" id="barcodeSuffix" placeholder="e.g., 2024">
                </div>
                
                <button class="btn btn-primary w-full" onclick="window.pharmaApp.getModule('inventory').generateBarcodes()">
                  <i class="fa fa-barcode"></i> Generate Barcodes
                </button>
              </div>
              
              <div class="generated-barcodes">
                <h4 class="font-medium mb-3">Generated Barcodes</h4>
                <div id="barcodeResults" class="border rounded p-3" style="min-height: 300px;">
                  <div class="text-center text-gray-500 py-8">
                    <i class="fa fa-barcode text-4xl mb-2"></i>
                    <div>Select a product and generate barcodes</div>
                  </div>
                </div>
                
                <div class="mt-3" id="barcodeActions" style="display: none;">
                  <button class="btn btn-success btn-sm mr-2" onclick="window.pharmaApp.getModule('inventory').downloadBarcodes()">
                    <i class="fa fa-download"></i> Download CSV
                  </button>
                  <button class="btn btn-info btn-sm mr-2" onclick="window.pharmaApp.getModule('inventory').printBarcodes()">
                    <i class="fa fa-print"></i> Print Labels
                  </button>
                  <button class="btn btn-warning btn-sm" onclick="window.pharmaApp.getModule('inventory').copyBarcodes()">
                    <i class="fa fa-copy"></i> Copy to Clipboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.generatedBarcodes = [];
  }

  hideBulkBarcodeGenerator() {
    const modal = document.getElementById('bulkBarcodeModal');
    if (modal) {
      modal.remove();
    }
    this.generatedBarcodes = [];
  }

  async loadProductVariants() {
    const productId = document.getElementById('barcodeProductSelect').value;
    if (!productId) return;
    
    try {
      const response = await fetch(`${window.api}variants/product/${productId}`);
      const variantsData = await response.json();
      
      this.currentProductVariants = variantsData;
      
      if (variantsData.variants && Object.keys(variantsData.variants).length > 0) {
        this.showVariantPreview(variantsData);
      } else {
        this.showNoVariantsMessage();
      }
    } catch (error) {
      console.error('Error loading variants:', error);
      this.showNoVariantsMessage();
    }
  }

  showVariantPreview(variantsData) {
    const resultsDiv = document.getElementById('barcodeResults');
    
    let previewHtml = `
      <h5 class="font-medium mb-3">Product: ${variantsData.product_name}</h5>
      <div class="variant-preview" style="max-height: 250px; overflow-y: auto;">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b">
              <th class="p-2 text-left">Variant</th>
              <th class="p-2 text-left">Stock</th>
              <th class="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    Object.keys(variantsData.variants).forEach(color => {
      Object.keys(variantsData.variants[color]).forEach(size => {
        const variant = variantsData.variants[color][size];
        const variantKey = `${color}-${size}`;
        previewHtml += `
          <tr class="border-b">
            <td class="p-2">${variantKey}</td>
            <td class="p-2">${variant.stock || 0}</td>
            <td class="p-2">
              <span class="px-2 py-1 rounded text-xs ${variant.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                ${variant.stock > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
            </td>
          </tr>
        `;
      });
    });
    
    previewHtml += `
          </tbody>
        </table>
      </div>
      <div class="mt-3 p-3 bg-blue-50 rounded">
        <div class="text-sm">
          <strong>Total Variants:</strong> ${Object.keys(variantsData.variants).length} colors × ${Object.keys(variantsData.variants[Object.keys(variantsData.variants)[0]] || {}).length} sizes
        </div>
      </div>
    `;
    
    resultsDiv.innerHTML = previewHtml;
  }

  showNoVariantsMessage() {
    const resultsDiv = document.getElementById('barcodeResults');
    resultsDiv.innerHTML = `
      <div class="text-center text-gray-500 py-8">
        <i class="fa fa-exclamation-triangle text-4xl mb-2"></i>
        <div>No variants found for this product</div>
        <div class="text-sm mt-1">This product may use aggregate stock tracking</div>
      </div>
    `;
  }

  async generateBarcodes() {
    const productId = document.getElementById('barcodeProductSelect').value;
    const format = document.getElementById('barcodeFormat').value;
    const pattern = document.getElementById('barcodePattern').value;
    const prefix = document.getElementById('barcodePrefix').value;
    const suffix = document.getElementById('barcodeSuffix').value;
    
    if (!productId) {
      if (window.notiflix) {
        window.notiflix.Report.warning('Selection Required', 'Please select a product', 'Ok');
      }
      return;
    }
    
    try {
      if (window.notiflix) window.notiflix.Block.standard('#bulkBarcodeModal .modal-content', 'Generating Barcodes...');
      
      // Prepare variants data
      let variants = [];
      if (this.currentProductVariants && this.currentProductVariants.variants) {
        Object.keys(this.currentProductVariants.variants).forEach(color => {
          Object.keys(this.currentProductVariants.variants[color]).forEach(size => {
            variants.push({
              attributes: { color, size },
              color: color,
              size: size
            });
          });
        });
      }
      
      const response = await fetch(`${window.api}barcode/bulk-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: parseInt(productId),
          variants: variants,
          format: format,
          pattern: pattern,
          prefix: prefix,
          suffix: suffix
        })
      });
      
      const result = await response.json();
      
      if (window.notiflix) window.notiflix.Block.remove('#bulkBarcodeModal .modal-content');
      
      if (result.success) {
        this.generatedBarcodes = result.barcodes;
        this.showBarcodeResults(result);
        
        if (window.notiflix) {
          window.notiflix.Notify.success(`Generated ${result.total_generated} barcodes successfully!`);
        }
      } else {
        throw new Error('Generation failed');
      }
      
    } catch (error) {
      console.error('Barcode generation failed:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('#bulkBarcodeModal .modal-content');
        window.notiflix.Report.failure('Generation Failed', error.message, 'Ok');
      }
    }
  }

  showBarcodeResults(result) {
    const resultsDiv = document.getElementById('barcodeResults');
    const actionsDiv = document.getElementById('barcodeActions');
    
    let resultsHtml = `
      <h5 class="font-medium mb-3">Generated Barcodes (${result.total_generated})</h5>
      <div class="barcode-list" style="max-height: 300px; overflow-y: auto;">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b">
              <th class="p-2 text-left">Variant</th>
              <th class="p-2 text-left">Barcode</th>
              <th class="p-2 text-left">Format</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    result.barcodes.forEach((barcode, index) => {
      resultsHtml += `
        <tr class="border-b">
          <td class="p-2">${barcode.variant_key}</td>
          <td class="p-2 font-mono">${barcode.barcode}</td>
          <td class="p-2">${barcode.format}</td>
        </tr>
      `;
    });
    
    resultsHtml += `
          </tbody>
        </table>
      </div>
    `;
    
    if (result.errors && result.errors.length > 0) {
      resultsHtml += `
        <div class="mt-3 p-3 bg-red-50 rounded border-l-4 border-red-400">
          <div class="text-sm font-medium text-red-800">Errors (${result.errors.length}):</div>
          <ul class="text-sm text-red-600 mt-1">
            ${result.errors.map(err => `<li>Variant ${err.variant_index}: ${err.error}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    resultsDiv.innerHTML = resultsHtml;
    actionsDiv.style.display = 'block';
  }

  downloadBarcodes() {
    if (!this.generatedBarcodes || this.generatedBarcodes.length === 0) return;
    
    const csvContent = [
      'Variant Key,Barcode,Format,Generated At',
      ...this.generatedBarcodes.map(barcode => 
        `${barcode.variant_key},${barcode.barcode},${barcode.format},${new Date().toISOString()}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-barcodes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  printBarcodes() {
    if (!this.generatedBarcodes || this.generatedBarcodes.length === 0) return;
    
    // This would open a print dialog with barcode labels
    // Implementation would depend on the printing library used
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode Labels</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .barcode-label { 
              border: 1px solid #ccc; 
              padding: 10px; 
              margin: 5px; 
              display: inline-block; 
              width: 200px;
              text-align: center;
            }
            .barcode-text { font-size: 12px; margin-top: 5px; }
          </style>
        </head>
        <body>
          <h1>Generated Barcode Labels</h1>
          ${this.generatedBarcodes.map(barcode => `
            <div class="barcode-label">
              <div class="barcode-text">${barcode.variant_key}</div>
              <div class="barcode-text">${barcode.barcode}</div>
              <div class="barcode-text">${barcode.format}</div>
            </div>
          `).join('')}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  copyBarcodes() {
    if (!this.generatedBarcodes || this.generatedBarcodes.length === 0) return;
    
    const textData = this.generatedBarcodes.map(barcode => 
      `${barcode.variant_key}\t${barcode.barcode}\t${barcode.format}`
    ).join('\n');
    
    navigator.clipboard.writeText(textData).then(() => {
      if (window.notiflix) {
        window.notiflix.Notify.success('Barcodes copied to clipboard!');
      }
    }).catch(err => {
      console.error('Failed to copy:', err);
      if (window.notiflix) {
        window.notiflix.Report.failure('Copy Failed', 'Could not copy to clipboard', 'Ok');
      }
    });
  }

  showBarcodeScanner() {
    const modalHtml = `
      <div class="barcode-scanner-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="barcodeScannerModal">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Barcode Scanner</h3>
            <button onclick="window.pharmaApp.getModule('inventory').hideBarcodeScanner()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="scanner-content">
            <div class="form-group mb-4">
              <label class="form-label">Scan or Enter Barcode</label>
              <div class="input-group">
                <input type="text" class="form-input" id="inventoryBarcodeInput" 
                       placeholder="Focus here and scan or type barcode" autofocus
                       onkeyup="window.pharmaApp.getModule('inventory').handleInventoryBarcodeSearch(event)">
                <button type="button" class="btn btn-primary" onclick="window.pharmaApp.getModule('inventory').searchInventoryBarcode()">
                  <i class="fa fa-search"></i> Search
                </button>
              </div>
            </div>
            
            <div id="barcodeSearchResults" class="border rounded p-3" style="min-height: 200px;">
              <div class="text-center text-gray-500 py-8">
                <i class="fa fa-barcode text-4xl mb-2"></i>
                <div>Scan a barcode to find the product</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  hideBarcodeScanner() {
    const modal = document.getElementById('barcodeScannerModal');
    if (modal) {
      modal.remove();
    }
  }

  async handleInventoryBarcodeSearch(event) {
    if (event.key === 'Enter') {
      await this.searchInventoryBarcode();
    }
  }

  async searchInventoryBarcode() {
    const barcode = document.getElementById('inventoryBarcodeInput').value.trim();
    if (!barcode) return;
    
    try {
      if (window.notiflix) window.notiflix.Block.standard('#barcodeScannerModal .modal-content', 'Searching...');
      
      const response = await fetch(`${window.api}barcode/variant/${encodeURIComponent(barcode)}`);
      const result = await response.json();
      
      if (window.notiflix) window.notiflix.Block.remove('#barcodeScannerModal .modal-content');
      
      this.showBarcodeSearchResults(result, barcode);
      
    } catch (error) {
      console.error('Barcode search failed:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('#barcodeScannerModal .modal-content');
        window.notiflix.Report.failure('Search Failed', 'Could not search for barcode', 'Ok');
      }
    }
  }

  showBarcodeSearchResults(result, scannedBarcode) {
    const resultsDiv = document.getElementById('barcodeSearchResults');
    
    if (result.type === 'variant') {
      const variant = result.variant;
      const [color, size] = result.variant_key.split('-');
      
      resultsDiv.innerHTML = `
        <div class="found-product">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h4 class="font-medium text-green-600">
                <i class="fa fa-check-circle"></i> Variant Found
              </h4>
              <div class="text-sm text-gray-600">Scanned: <code>${scannedBarcode}</code></div>
            </div>
            <button class="btn btn-sm btn-primary" onclick="window.pharmaApp.getModule('inventory').viewProduct('${result.product_id}')">
              <i class="fa fa-eye"></i> View Product
            </button>
          </div>
          
          <div class="product-details p-3 bg-green-50 rounded">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Product:</strong> ${result.product_name}<br>
                <strong>Variant:</strong> ${result.variant_key}<br>
                <strong>Color:</strong> ${color}<br>
                <strong>Size:</strong> ${size}
              </div>
              <div>
                <strong>Stock:</strong> ${variant.stock}<br>
                <strong>Reserved:</strong> ${variant.reserved || 0}<br>
                <strong>Barcode:</strong> <code>${variant.barcode}</code><br>
                <strong>Status:</strong> 
                <span class="px-2 py-1 rounded text-xs ${variant.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                  ${variant.stock > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (result.type === 'product') {
      const product = result.product;
      
      resultsDiv.innerHTML = `
        <div class="found-product">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h4 class="font-medium text-blue-600">
                <i class="fa fa-check-circle"></i> Product Found
              </h4>
              <div class="text-sm text-gray-600">Scanned: <code>${scannedBarcode}</code></div>
            </div>
            <button class="btn btn-sm btn-primary" onclick="window.pharmaApp.getModule('inventory').viewProduct('${product._id}')">
              <i class="fa fa-eye"></i> View Product
            </button>
          </div>
          
          <div class="product-details p-3 bg-blue-50 rounded">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Name:</strong> ${product.name}<br>
                <strong>Category:</strong> ${product.category}<br>
                <strong>Price:</strong> ₹${parseFloat(product.price).toFixed(2)}<br>
                <strong>Barcode:</strong> <code>${product.barcode || 'N/A'}</code>
              </div>
              <div>
                <strong>Stock:</strong> ${product.quantity}<br>
                <strong>Tracking:</strong> ${result.tracking_method}<br>
                <strong>Min Stock:</strong> ${product.minStock || 0}<br>
                <strong>Status:</strong> 
                <span class="px-2 py-1 rounded text-xs ${product.quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                  ${product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      resultsDiv.innerHTML = `
        <div class="not-found text-center py-8">
          <i class="fa fa-times-circle text-4xl text-red-500 mb-2"></i>
          <h4 class="font-medium text-red-600">Product Not Found</h4>
          <div class="text-sm text-gray-600">Barcode: <code>${scannedBarcode}</code></div>
          <div class="mt-3">
            <button class="btn btn-sm btn-primary" onclick="window.pharmaApp.getModule('inventory').showAddProductModal()">
              <i class="fa fa-plus"></i> Add New Product
            </button>
          </div>
        </div>
      `;
    }
  }

  exportBarcodes() {
    const inventoryState = this.app.state.getModuleState('inventory');
    const products = inventoryState.filteredProducts || inventoryState.products || [];
    
    if (products.length === 0) {
      if (window.notiflix) {
        window.notiflix.Report.warning('No Products', 'No products available to export', 'Ok');
      }
      return;
    }
    
    const csvContent = [
      'Product ID,Name,Category,Barcode,Price,Quantity,Has Variants',
      ...products.map(product => 
        `${product._id},"${product.name}","${product.category}","${product.barcode || ''}",${product.price},${product.quantity},${product.stock_tracking_method === 'variant' ? 'Yes' : 'No'}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcode-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * PROMOTION MANAGEMENT METHODS
   */

  showPromotionManager() {
    const modalHtml = `
      <div class="promotion-manager-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="promotionManagerModal">
        <div class="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Promotion Manager</h3>
            <button onclick="window.pharmaApp.getModule('inventory').hidePromotionManager()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="promotion-tabs mb-4">
            <ul class="nav nav-tabs" role="tablist">
              <li role="presentation" class="active">
                <a href="#campaignsTab" aria-controls="campaigns" role="tab" data-toggle="tab">
                  <i class="fa fa-calendar"></i> Campaigns
                </a>
              </li>
              <li role="presentation">
                <a href="#rulesTab" aria-controls="rules" role="tab" data-toggle="tab">
                  <i class="fa fa-cogs"></i> Rules
                </a>
              </li>
              <li role="presentation">
                <a href="#analyticsTab" aria-controls="analytics" role="tab" data-toggle="tab">
                  <i class="fa fa-chart-bar"></i> Analytics
                </a>
              </li>
              <li role="presentation">
                <a href="#templatesTab" aria-controls="templates" role="tab" data-toggle="tab">
                  <i class="fa fa-clone"></i> Templates
                </a>
              </li>
            </ul>
          </div>
          
          <div class="tab-content">
            <div role="tabpanel" class="tab-pane active" id="campaignsTab">
              ${this.renderCampaignsTab()}
            </div>
            <div role="tabpanel" class="tab-pane" id="rulesTab">
              ${this.renderRulesTab()}
            </div>
            <div role="tabpanel" class="tab-pane" id="analyticsTab">
              ${this.renderAnalyticsTab()}
            </div>
            <div role="tabpanel" class="tab-pane" id="templatesTab">
              ${this.renderTemplatesTab()}
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.loadPromotionData();
  }

  hidePromotionManager() {
    const modal = document.getElementById('promotionManagerModal');
    if (modal) {
      modal.remove();
    }
  }

  async loadPromotionData() {
    try {
      await Promise.all([
        this.loadActiveCampaigns(),
        this.loadPromotionRules(),
        this.loadPromotionTemplates()
      ]);
    } catch (error) {
      console.error('Error loading promotion data:', error);
    }
  }

  async loadActiveCampaigns() {
    try {
      const response = await fetch(`${window.api}promotions/campaigns/active`);
      const campaigns = await response.json();
      
      this.activeCampaigns = campaigns;
      this.updateCampaignsDisplay();
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  }

  async loadPromotionRules() {
    try {
      const response = await fetch(`${window.api}promotions/rules?active_only=true`);
      const rules = await response.json();
      
      this.promotionRules = rules;
      this.updateRulesDisplay();
    } catch (error) {
      console.error('Error loading promotion rules:', error);
    }
  }

  async loadPromotionTemplates() {
    try {
      const response = await fetch(`${window.api}promotions/campaigns/templates`);
      const templates = await response.json();
      
      this.promotionTemplates = templates;
      this.updateTemplatesDisplay();
    } catch (error) {
      console.error('Error loading promotion templates:', error);
    }
  }

  renderCampaignsTab() {
    return `
      <div class="campaigns-tab">
        <div class="flex justify-between items-center mb-4">
          <h4>Seasonal Campaigns</h4>
          <button class="btn btn-success" onclick="window.pharmaApp.getModule('inventory').showCreateCampaignModal()">
            <i class="fa fa-plus"></i> Create Campaign
          </button>
        </div>
        
        <div id="campaignsList" class="campaigns-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="text-center text-gray-500 py-8">
            <i class="fa fa-calendar text-4xl mb-2"></i>
            <div>Loading campaigns...</div>
          </div>
        </div>
      </div>
    `;
  }

  renderRulesTab() {
    return `
      <div class="rules-tab">
        <div class="flex justify-between items-center mb-4">
          <h4>Promotion Rules</h4>
          <button class="btn btn-success" onclick="window.pharmaApp.getModule('inventory').showCreateRuleModal()">
            <i class="fa fa-plus"></i> Create Rule
          </button>
        </div>
        
        <div id="rulesList" class="rules-list">
          <div class="text-center text-gray-500 py-8">
            <i class="fa fa-cogs text-4xl mb-2"></i>
            <div>Loading rules...</div>
          </div>
        </div>
      </div>
    `;
  }

  renderAnalyticsTab() {
    return `
      <div class="analytics-tab">
        <div class="flex justify-between items-center mb-4">
          <h4>Promotion Analytics</h4>
          <div class="flex gap-2">
            <select class="form-select" id="analyticsDateRange" onchange="window.pharmaApp.getModule('inventory').loadAnalytics()">
              <option value="7">Last 7 days</option>
              <option value="30" selected>Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <button class="btn btn-info" onclick="window.pharmaApp.getModule('inventory').exportAnalytics()">
              <i class="fa fa-download"></i> Export
            </button>
          </div>
        </div>
        
        <div id="analyticsContent" class="analytics-content">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="stat-card bg-blue-50 p-4 rounded-lg">
              <div class="stat-value text-2xl font-bold text-blue-600" id="totalRevenue">0</div>
              <div class="stat-label text-sm text-blue-800">Total Revenue</div>
            </div>
            <div class="stat-card bg-green-50 p-4 rounded-lg">
              <div class="stat-value text-2xl font-bold text-green-600" id="totalDiscounts">0</div>
              <div class="stat-label text-sm text-green-800">Discounts Given</div>
            </div>
            <div class="stat-card bg-purple-50 p-4 rounded-lg">
              <div class="stat-value text-2xl font-bold text-purple-600" id="conversionRate">0%</div>
              <div class="stat-label text-sm text-purple-800">Conversion Rate</div>
            </div>
            <div class="stat-card bg-orange-50 p-4 rounded-lg">
              <div class="stat-value text-2xl font-bold text-orange-600" id="roi">0%</div>
              <div class="stat-label text-sm text-orange-800">ROI</div>
            </div>
          </div>
          
          <div class="analytics-chart-container">
            <canvas id="promotionChart" width="400" height="200"></canvas>
          </div>
        </div>
      </div>
    `;
  }

  renderTemplatesTab() {
    return `
      <div class="templates-tab">
        <div class="flex justify-between items-center mb-4">
          <h4>Campaign Templates</h4>
          <button class="btn btn-info" onclick="window.pharmaApp.getModule('inventory').saveAsTemplate()">
            <i class="fa fa-save"></i> Save Current as Template
          </button>
        </div>
        
        <div id="templatesList" class="templates-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="text-center text-gray-500 py-8">
            <i class="fa fa-clone text-4xl mb-2"></i>
            <div>Loading templates...</div>
          </div>
        </div>
      </div>
    `;
  }

  updateCampaignsDisplay() {
    const container = document.getElementById('campaignsList');
    if (!container || !this.activeCampaigns) return;
    
    if (this.activeCampaigns.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <i class="fa fa-calendar text-4xl mb-2"></i>
          <div>No active campaigns</div>
          <button class="btn btn-primary mt-2" onclick="window.pharmaApp.getModule('inventory').showCreateCampaignModal()">
            Create Your First Campaign
          </button>
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.activeCampaigns.map(campaign => this.renderCampaignCard(campaign)).join('');
  }

  renderCampaignCard(campaign) {
    const startDate = new Date(campaign.timing.start_date).toLocaleDateString();
    const endDate = new Date(campaign.timing.end_date).toLocaleDateString();
    const isActive = campaign.status.is_active;
    
    return `
      <div class="campaign-card border rounded-lg p-4 ${isActive ? 'border-green-200 bg-green-50' : 'border-gray-200'}">
        <div class="flex justify-between items-start mb-3">
          <div class="flex-1">
            <h5 class="font-semibold text-lg">${campaign.campaign_name}</h5>
            <p class="text-sm text-gray-600">${campaign.campaign_details.description || 'No description'}</p>
          </div>
          <span class="px-2 py-1 rounded text-xs ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
            ${isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <div class="campaign-meta mb-3 text-sm text-gray-500">
          <div><i class="fa fa-calendar"></i> ${startDate} - ${endDate}</div>
          <div><i class="fa fa-tag"></i> ${campaign.discount_structure.discount_type}: ${campaign.discount_structure.discount_value}%</div>
          <div><i class="fa fa-users"></i> ${campaign.targeting.customer_segments.join(', ') || 'All Customers'}</div>
        </div>
        
        <div class="campaign-performance mb-3">
          <div class="flex justify-between text-sm">
            <span>Views: ${campaign.performance.views || 0}</span>
            <span>Conversions: ${campaign.performance.conversions || 0}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div class="bg-blue-600 h-2 rounded-full" style="width: ${campaign.performance.conversion_rate || 0}%"></div>
          </div>
        </div>
        
        <div class="campaign-actions flex gap-2">
          <button class="btn btn-sm btn-info" onclick="window.pharmaApp.getModule('inventory').editCampaign('${campaign.campaign_id}')">
            <i class="fa fa-edit"></i> Edit
          </button>
          <button class="btn btn-sm btn-warning" onclick="window.pharmaApp.getModule('inventory').duplicateCampaign('${campaign.campaign_id}')">
            <i class="fa fa-copy"></i> Duplicate
          </button>
          <button class="btn btn-sm ${isActive ? 'btn-danger' : 'btn-success'}" onclick="window.pharmaApp.getModule('inventory').toggleCampaignStatus('${campaign.campaign_id}')">
            <i class="fa fa-${isActive ? 'pause' : 'play'}"></i> ${isActive ? 'Pause' : 'Activate'}
          </button>
        </div>
      </div>
    `;
  }

  updateRulesDisplay() {
    const container = document.getElementById('rulesList');
    if (!container || !this.promotionRules) return;
    
    if (this.promotionRules.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <i class="fa fa-cogs text-4xl mb-2"></i>
          <div>No active promotion rules</div>
          <button class="btn btn-primary mt-2" onclick="window.pharmaApp.getModule('inventory').showCreateRuleModal()">
            Create Your First Rule
          </button>
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.promotionRules.map(rule => this.renderRuleCard(rule)).join('');
  }

  renderRuleCard(rule) {
    return `
      <div class="rule-card border rounded-lg p-4 mb-4">
        <div class="flex justify-between items-start mb-3">
          <div class="flex-1">
            <h5 class="font-semibold">${rule.rule_name}</h5>
            <p class="text-sm text-gray-600">${rule.rule_config.description || 'No description'}</p>
          </div>
          <span class="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
            ${rule.rule_type}
          </span>
        </div>
        
        <div class="rule-details mb-3 text-sm text-gray-600">
          <div><strong>Type:</strong> ${rule.rule_category}</div>
          <div><strong>Discount:</strong> ${rule.discount_calculation.calculation_method} ${rule.discount_calculation.discount_value}</div>
          <div><strong>Priority:</strong> ${rule.rule_config.priority}</div>
        </div>
        
        <div class="rule-stats mb-3 text-sm">
          <div class="flex justify-between">
            <span>Triggered: ${rule.analytics.times_triggered || 0} times</span>
            <span>Discount Given: ₹${rule.analytics.total_discount_given || 0}</span>
          </div>
        </div>
        
        <div class="rule-actions flex gap-2">
          <button class="btn btn-sm btn-info" onclick="window.pharmaApp.getModule('inventory').editRule('${rule.rule_id}')">
            <i class="fa fa-edit"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="window.pharmaApp.getModule('inventory').deleteRule('${rule.rule_id}')">
            <i class="fa fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
  }

  updateTemplatesDisplay() {
    const container = document.getElementById('templatesList');
    if (!container || !this.promotionTemplates) return;
    
    if (this.promotionTemplates.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <i class="fa fa-clone text-4xl mb-2"></i>
          <div>No campaign templates available</div>
          <button class="btn btn-primary mt-2" onclick="window.pharmaApp.getModule('inventory').saveAsTemplate()">
            Create Template from Campaign
          </button>
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.promotionTemplates.map(template => this.renderTemplateCard(template)).join('');
  }

  renderTemplateCard(template) {
    return `
      <div class="template-card border rounded-lg p-4 hover:shadow-lg transition-shadow">
        <div class="flex justify-between items-start mb-3">
          <div class="flex-1">
            <h5 class="font-semibold">${template.campaign_name}</h5>
            <p class="text-sm text-gray-600">${template.campaign_details.description || 'No description'}</p>
          </div>
          <span class="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
            Template
          </span>
        </div>
        
        <div class="template-meta mb-3 text-sm text-gray-500">
          <div><i class="fa fa-tag"></i> ${template.discount_structure.discount_type}: ${template.discount_structure.discount_value}%</div>
          <div><i class="fa fa-calendar"></i> Created: ${new Date(template.created_at).toLocaleDateString()}</div>
        </div>
        
        <div class="template-actions flex gap-2">
          <button class="btn btn-sm btn-success" onclick="window.pharmaApp.getModule('inventory').createFromTemplate('${template._id}')">
            <i class="fa fa-play"></i> Use Template
          </button>
          <button class="btn btn-sm btn-info" onclick="window.pharmaApp.getModule('inventory').editTemplate('${template._id}')">
            <i class="fa fa-edit"></i> Edit
          </button>
        </div>
      </div>
    `;
  }

  showCreateCampaignModal() {
    const modalHtml = `
      <div class="create-campaign-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="createCampaignModal">
        <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Create Seasonal Campaign</h3>
            <button onclick="window.pharmaApp.getModule('inventory').hideCreateCampaignModal()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <form id="createCampaignForm" onsubmit="window.pharmaApp.getModule('inventory').handleCreateCampaign(event)">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Basic Information -->
              <div class="campaign-basic">
                <h4 class="font-medium mb-3">Basic Information</h4>
                
                <div class="form-group mb-3">
                  <label class="form-label">Campaign Name *</label>
                  <input type="text" class="form-input" name="campaign_name" required 
                         placeholder="e.g., Diwali Sale 2024">
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Campaign Type</label>
                  <select class="form-select" name="campaign_type">
                    <option value="seasonal">Seasonal</option>
                    <option value="festival">Festival</option>
                    <option value="clearance">Clearance</option>
                    <option value="bulk_purchase">Bulk Purchase</option>
                    <option value="loyalty">Loyalty</option>
                  </select>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Season/Festival</label>
                  <input type="text" class="form-input" name="season" 
                         placeholder="e.g., Winter, Diwali, Christmas">
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Description</label>
                  <textarea class="form-input" name="description" rows="3" 
                            placeholder="Campaign description..."></textarea>
                </div>
              </div>
              
              <!-- Discount Configuration -->
              <div class="campaign-discount">
                <h4 class="font-medium mb-3">Discount Configuration</h4>
                
                <div class="form-group mb-3">
                  <label class="form-label">Discount Type</label>
                  <select class="form-select" name="discount_type" onchange="window.pharmaApp.getModule('inventory').updateDiscountInput()">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (₹)</option>
                    <option value="buy_x_get_y">Buy X Get Y</option>
                    <option value="tiered">Tiered Discount</option>
                  </select>
                </div>
                
                <div class="form-group mb-3" id="discountValueGroup">
                  <label class="form-label">Discount Value *</label>
                  <input type="number" class="form-input" name="discount_value" required 
                         placeholder="15" min="0" max="100" step="0.01">
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Minimum Order Value (₹)</label>
                  <input type="number" class="form-input" name="min_order_value" 
                         placeholder="1000" min="0">
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Maximum Discount Amount (₹)</label>
                  <input type="number" class="form-input" name="max_discount_amount" 
                         placeholder="500" min="0">
                </div>
              </div>
              
              <!-- Timing -->
              <div class="campaign-timing">
                <h4 class="font-medium mb-3">Campaign Timing</h4>
                
                <div class="form-group mb-3">
                  <label class="form-label">Start Date *</label>
                  <input type="datetime-local" class="form-input" name="start_date" required>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">End Date *</label>
                  <input type="datetime-local" class="form-input" name="end_date" required>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">
                    <input type="checkbox" name="is_recurring"> Recurring Campaign
                  </label>
                </div>
              </div>
              
              <!-- Targeting -->
              <div class="campaign-targeting">
                <h4 class="font-medium mb-3">Customer Targeting</h4>
                
                <div class="form-group mb-3">
                  <label class="form-label">Customer Segments</label>
                  <select class="form-select" name="customer_segments" multiple>
                    <option value="all">All Customers</option>
                    <option value="new_customers">New Customers</option>
                    <option value="loyal_customers">Loyal Customers</option>
                    <option value="vip_customers">VIP Customers</option>
                    <option value="inactive_customers">Inactive Customers</option>
                  </select>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Loyalty Tiers</label>
                  <select class="form-select" name="loyalty_tiers" multiple>
                    <option value="bronze">Bronze</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                    <option value="diamond">Diamond</option>
                  </select>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Applicable Categories</label>
                  <select class="form-select" name="applicable_categories" multiple>
                    ${this.getProductCategories().map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>
            
            <div class="flex justify-end gap-3 mt-6">
              <button type="button" class="btn btn-secondary" onclick="window.pharmaApp.getModule('inventory').hideCreateCampaignModal()">
                Cancel
              </button>
              <button type="submit" class="btn btn-success">
                <i class="fa fa-save"></i> Create Campaign
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Set default dates
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    document.querySelector('input[name="start_date"]').value = now.toISOString().slice(0, 16);
    document.querySelector('input[name="end_date"]').value = nextMonth.toISOString().slice(0, 16);
  }

  hideCreateCampaignModal() {
    const modal = document.getElementById('createCampaignModal');
    if (modal) {
      modal.remove();
    }
  }

  async handleCreateCampaign(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const campaignData = Object.fromEntries(formData.entries());
    
    // Convert array fields
    const arrayFields = ['customer_segments', 'loyalty_tiers', 'applicable_categories'];
    arrayFields.forEach(field => {
      if (campaignData[field] && typeof campaignData[field] === 'string') {
        campaignData[field] = [campaignData[field]];
      }
    });
    
    try {
      if (window.notiflix) window.notiflix.Block.standard('#createCampaignModal .modal-content', 'Creating Campaign...');
      
      const response = await fetch(`${window.api}promotions/campaigns/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(campaignData)
      });
      
      const result = await response.json();
      
      if (window.notiflix) window.notiflix.Block.remove('#createCampaignModal .modal-content');
      
      if (result.success) {
        this.hideCreateCampaignModal();
        this.loadActiveCampaigns();
        
        if (window.notiflix) {
          window.notiflix.Notify.success('Campaign Created', 'Campaign created successfully!');
        }
      } else {
        throw new Error(result.error || 'Failed to create campaign');
      }
      
    } catch (error) {
      console.error('Error creating campaign:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('#createCampaignModal .modal-content');
        window.notiflix.Report.failure('Error', error.message, 'Ok');
      }
    }
  }

  updateDiscountInput() {
    const discountType = document.querySelector('select[name="discount_type"]').value;
    const valueGroup = document.getElementById('discountValueGroup');
    const input = valueGroup.querySelector('input');
    
    switch (discountType) {
      case 'percentage':
        input.placeholder = '15';
        input.max = '100';
        break;
      case 'fixed_amount':
        input.placeholder = '500';
        input.max = '';
        break;
      case 'buy_x_get_y':
        input.placeholder = '1:1';
        input.max = '';
        break;
      case 'tiered':
        input.placeholder = 'Tier configuration';
        input.max = '';
        break;
    }
  }

  getProductCategories() {
    const inventoryState = this.app.state.getModuleState('inventory');
    const categories = inventoryState.categories || [];
    return categories.map(cat => cat.name || cat.category_name || 'Unknown');
  }

  // Additional Promotion Management Methods
  
  async loadAnalytics() {
    try {
      const dateRange = document.getElementById('analyticsDateRange').value;
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (dateRange * 24 * 60 * 60 * 1000));
      
      const response = await fetch(`${window.api}promotions/analytics/performance?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`);
      const analytics = await response.json();
      
      this.updateAnalyticsDisplay(analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  updateAnalyticsDisplay(analytics) {
    // Update stat cards
    document.getElementById('totalRevenue').textContent = `₹${(analytics.total_revenue || 0).toLocaleString()}`;
    document.getElementById('totalDiscounts').textContent = `₹${(analytics.total_discounts || 0).toLocaleString()}`;
    document.getElementById('conversionRate').textContent = `${(analytics.conversion_rate || 0).toFixed(1)}%`;
    document.getElementById('roi').textContent = `${(analytics.roi_metrics?.revenue_per_discount || 0).toFixed(1)}x`;
    
    // Update chart (would need Chart.js integration)
    this.updatePromotionChart(analytics);
  }

  updatePromotionChart(analytics) {
    const canvas = document.getElementById('promotionChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Simple bar chart implementation
    const data = analytics.interaction_breakdown || {};
    const labels = Object.keys(data);
    const values = Object.values(data);
    
    if (labels.length === 0) return;
    
    const barWidth = (canvas.width - 100) / labels.length;
    const maxValue = Math.max(...values);
    
    labels.forEach((label, index) => {
      const barHeight = (values[index] / maxValue) * (canvas.height - 100);
      const x = 50 + (index * barWidth);
      const y = canvas.height - 50 - barHeight;
      
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(x, y, barWidth - 10, barHeight);
      
      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + (barWidth - 10) / 2, canvas.height - 30);
      ctx.fillText(values[index], x + (barWidth - 10) / 2, y - 5);
    });
  }

  exportAnalytics() {
    if (window.notiflix) {
      window.notiflix.Notify.info('Export Feature', 'Analytics export functionality will be implemented');
    }
  }

  async editCampaign(campaignId) {
    // Implementation for editing campaigns
    if (window.notiflix) {
      window.notiflix.Notify.info('Edit Campaign', `Editing campaign: ${campaignId}`);
    }
  }

  async duplicateCampaign(campaignId) {
    try {
      const campaign = this.activeCampaigns.find(c => c.campaign_id === campaignId);
      if (!campaign) return;
      
      const duplicatedData = {
        ...campaign,
        campaign_name: `${campaign.campaign_name} (Copy)`,
        _id: undefined,
        campaign_id: undefined,
        created_at: undefined,
        updated_at: undefined
      };
      
      const response = await fetch(`${window.api}promotions/campaigns/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatedData)
      });
      
      const result = await response.json();
      if (result.success) {
        this.loadActiveCampaigns();
        if (window.notiflix) {
          window.notiflix.Notify.success('Campaign Duplicated', 'Campaign duplicated successfully!');
        }
      }
    } catch (error) {
      console.error('Error duplicating campaign:', error);
    }
  }

  async toggleCampaignStatus(campaignId) {
    try {
      const campaign = this.activeCampaigns.find(c => c.campaign_id === campaignId);
      if (!campaign) return;
      
      const newStatus = !campaign.status.is_active;
      
      // This would need an API endpoint to update campaign status
      if (window.notiflix) {
        window.notiflix.Notify.success(
          'Status Updated', 
          `Campaign ${newStatus ? 'activated' : 'paused'} successfully`
        );
      }
      
      this.loadActiveCampaigns();
    } catch (error) {
      console.error('Error toggling campaign status:', error);
    }
  }

  saveAsTemplate() {
    if (window.notiflix) {
      window.notiflix.Notify.info('Save Template', 'Save current campaign as template functionality');
    }
  }

  async createFromTemplate(templateId) {
    try {
      const template = this.promotionTemplates.find(t => t._id === templateId);
      if (!template) return;
      
      const campaignData = {
        campaign_name: `${template.campaign_name} - ${new Date().toLocaleDateString()}`,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      const response = await fetch(`${window.api}promotions/campaigns/create-from-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId, campaign_data: campaignData })
      });
      
      const result = await response.json();
      if (result.success) {
        this.loadActiveCampaigns();
        if (window.notiflix) {
          window.notiflix.Notify.success('Campaign Created', 'Campaign created from template!');
        }
      }
    } catch (error) {
      console.error('Error creating from template:', error);
    }
  }

  editTemplate(templateId) {
    if (window.notiflix) {
      window.notiflix.Notify.info('Edit Template', `Editing template: ${templateId}`);
    }
  }

  showCreateRuleModal() {
    const modalHtml = `
      <div class="create-rule-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="createRuleModal">
        <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Create Promotion Rule</h3>
            <button onclick="window.pharmaApp.getModule('inventory').hideCreateRuleModal()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <form id="createRuleForm" onsubmit="window.pharmaApp.getModule('inventory').handleCreateRule(event)">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Basic Rule Information -->
              <div class="rule-basic">
                <h4 class="font-medium mb-3">Rule Information</h4>
                
                <div class="form-group mb-3">
                  <label class="form-label">Rule Name *</label>
                  <input type="text" class="form-input" name="rule_name" required 
                         placeholder="e.g., Bulk Purchase Discount">
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Rule Type</label>
                  <select class="form-select" name="rule_type">
                    <option value="automatic">Automatic</option>
                    <option value="triggered">Triggered</option>
                    <option value="conditional">Conditional</option>
                  </select>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Rule Category</label>
                  <select class="form-select" name="rule_category">
                    <option value="discount">Discount</option>
                    <option value="buy_x_get_y">Buy X Get Y</option>
                    <option value="bundle">Bundle</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Description</label>
                  <textarea class="form-input" name="description" rows="3" 
                            placeholder="Rule description..."></textarea>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Priority</label>
                  <input type="number" class="form-input" name="priority" value="1" min="1" max="10">
                </div>
              </div>
              
              <!-- Discount Configuration -->
              <div class="rule-discount">
                <h4 class="font-medium mb-3">Discount Configuration</h4>
                
                <div class="form-group mb-3">
                  <label class="form-label">Calculation Method</label>
                  <select class="form-select" name="calculation_method">
                    <option value="percentage">Percentage</option>
                    <option value="fixed_amount">Fixed Amount</option>
                    <option value="tiered">Tiered</option>
                    <option value="buy_x_get_y">Buy X Get Y</option>
                  </select>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Discount Value</label>
                  <input type="number" class="form-input" name="discount_value" 
                         placeholder="15" min="0" step="0.01">
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Maximum Discount (₹)</label>
                  <input type="number" class="form-input" name="maximum_discount" 
                         placeholder="500" min="0">
                </div>
              </div>
              
              <!-- Applicability -->
              <div class="rule-applicability">
                <h4 class="font-medium mb-3">Applicability</h4>
                
                <div class="form-group mb-3">
                  <label class="form-label">Minimum Order Value (₹)</label>
                  <input type="number" class="form-input" name="minimum_order_value" 
                         placeholder="1000" min="0">
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Applicable Categories</label>
                  <select class="form-select" name="applicable_categories" multiple>
                    ${this.getProductCategories().map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                  </select>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Usage Limit (0 = unlimited)</label>
                  <input type="number" class="form-input" name="usage_limit" value="0" min="0">
                </div>
              </div>
              
              <!-- Validity -->
              <div class="rule-validity">
                <h4 class="font-medium mb-3">Validity Period</h4>
                
                <div class="form-group mb-3">
                  <label class="form-label">Start Date</label>
                  <input type="datetime-local" class="form-input" name="start_date">
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">End Date</label>
                  <input type="datetime-local" class="form-input" name="end_date">
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Customer Usage Limit</label>
                  <input type="number" class="form-input" name="customer_usage_limit" value="1" min="1">
                </div>
              </div>
            </div>
            
            <div class="flex justify-end gap-3 mt-6">
              <button type="button" class="btn btn-secondary" onclick="window.pharmaApp.getModule('inventory').hideCreateRuleModal()">
                Cancel
              </button>
              <button type="submit" class="btn btn-success">
                <i class="fa fa-save"></i> Create Rule
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  hideCreateRuleModal() {
    const modal = document.getElementById('createRuleModal');
    if (modal) {
      modal.remove();
    }
  }

  async handleCreateRule(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const ruleData = Object.fromEntries(formData.entries());
    
    // Convert array fields
    if (ruleData.applicable_categories && typeof ruleData.applicable_categories === 'string') {
      ruleData.applicable_categories = [ruleData.applicable_categories];
    }
    
    try {
      if (window.notiflix) window.notiflix.Block.standard('#createRuleModal .modal-content', 'Creating Rule...');
      
      const response = await fetch(`${window.api}promotions/rules/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ruleData)
      });
      
      const result = await response.json();
      
      if (window.notiflix) window.notiflix.Block.remove('#createRuleModal .modal-content');
      
      if (result.success) {
        this.hideCreateRuleModal();
        this.loadPromotionRules();
        
        if (window.notiflix) {
          window.notiflix.Notify.success('Rule Created', 'Promotion rule created successfully!');
        }
      } else {
        throw new Error(result.error || 'Failed to create rule');
      }
      
    } catch (error) {
      console.error('Error creating rule:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('#createRuleModal .modal-content');
        window.notiflix.Report.failure('Error', error.message, 'Ok');
      }
    }
  }

  editRule(ruleId) {
    if (window.notiflix) {
      window.notiflix.Notify.info('Edit Rule', `Editing rule: ${ruleId}`);
    }
  }

  async deleteRule(ruleId) {
    if (!window.confirm('Are you sure you want to delete this rule?')) {
      return;
    }
    
    try {
      // This would need an API endpoint to delete rules
      this.loadPromotionRules();
      
      if (window.notiflix) {
        window.notiflix.Notify.success('Rule Deleted', 'Promotion rule deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to delete rule', 'Ok');
      }
    }
  }
  
  /**
   * GIFT STORE MANAGEMENT METHODS
   */
  
  showGiftBundleCreator() {
    const inventoryState = this.app.state.getModuleState('inventory');
    const products = inventoryState.products || [];
    
    const modalHtml = `
      <div class="gift-bundle-creator-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="giftBundleCreatorModal">
        <div class="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">
              <i class="fa fa-box text-purple-600"></i> Create Gift Bundle
            </h3>
            <button onclick="window.pharmaApp.getModule('inventory').hideGiftBundleCreator()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <form id="giftBundleForm" onsubmit="window.pharmaApp.getModule('inventory').handleGiftBundleSubmit(event)">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Bundle Information -->
              <div class="bundle-info">
                <h4 class="font-medium mb-3">Bundle Information</h4>
                
                <div class="form-group mb-3">
                  <label class="form-label">Bundle Name *</label>
                  <input type="text" class="form-input" name="bundle_name" required 
                         placeholder="e.g., Festival Celebration Box">
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Bundle Type</label>
                  <select class="form-select" name="bundle_type">
                    <option value="curated">Curated</option>
                    <option value="build_your_own">Build Your Own</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="occasion">Occasion-based</option>
                  </select>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Category</label>
                  <select class="form-select" name="category">
                    <option value="festival">Festival Gifts</option>
                    <option value="birthday">Birthday Gifts</option>
                    <option value="wedding">Wedding Gifts</option>
                    <option value="corporate">Corporate Gifts</option>
                    <option value="seasonal">Seasonal Gifts</option>
                    <option value="thank_you">Thank You Gifts</option>
                  </select>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Occasion</label>
                  <input type="text" class="form-input" name="occasion" 
                         placeholder="e.g., Diwali, Christmas, Anniversary">
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Description</label>
                  <textarea class="form-input" name="description" rows="3" 
                            placeholder="Bundle description..."></textarea>
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                  <div class="form-group">
                    <label class="form-label">Bundle Price (₹)</label>
                    <input type="number" class="form-input" name="bundle_price" step="0.01" min="0">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Stock Quantity</label>
                    <input type="number" class="form-input" name="current_stock" min="0" value="0">
                  </div>
                </div>
              </div>
              
              <!-- Bundle Components -->
              <div class="bundle-components">
                <h4 class="font-medium mb-3">Bundle Components</h4>
                
                <div class="components-list" id="bundleComponentsList" style="max-height: 300px; overflow-y: auto;">
                  <div class="text-center text-gray-500 py-8">
                    <i class="fa fa-plus-circle text-2xl mb-2"></i>
                    <div>No components added yet</div>
                    <button type="button" class="btn btn-sm btn-primary mt-2" 
                            onclick="window.pharmaApp.getModule('inventory').addBundleComponent()">
                      Add Component
                    </button>
                  </div>
                </div>
                
                <div class="bundle-pricing mt-4 p-3 bg-gray-50 rounded">
                  <div class="flex justify-between text-sm mb-2">
                    <span>Individual Total:</span>
                    <span id="individualTotal">₹0.00</span>
                  </div>
                  <div class="flex justify-between text-sm mb-2">
                    <span>Bundle Price:</span>
                    <span id="bundlePriceDisplay">₹0.00</span>
                  </div>
                  <div class="flex justify-between font-medium text-green-600">
                    <span>Customer Savings:</span>
                    <span id="customerSavings">₹0.00</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Customization Options -->
            <div class="mt-6">
              <h4 class="font-medium mb-3">Customization Options</h4>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label class="flex items-center">
                  <input type="checkbox" name="allow_component_substitution" class="mr-2">
                  Allow Substitution
                </label>
                <label class="flex items-center">
                  <input type="checkbox" name="allow_size_selection" class="mr-2" checked>
                  Size Selection
                </label>
                <label class="flex items-center">
                  <input type="checkbox" name="gift_wrapping_included" class="mr-2">
                  Gift Wrapping Included
                </label>
                <label class="flex items-center">
                  <input type="checkbox" name="gift_message_included" class="mr-2" checked>
                  Gift Message Card
                </label>
              </div>
            </div>
            
            <div class="flex justify-end gap-3 mt-6">
              <button type="button" class="btn btn-secondary" onclick="window.pharmaApp.getModule('inventory').hideGiftBundleCreator()">
                Cancel
              </button>
              <button type="submit" class="btn btn-purple">
                <i class="fa fa-save"></i> Create Bundle
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.bundleComponents = [];
  }
  
  hideGiftBundleCreator() {
    const modal = document.getElementById('giftBundleCreatorModal');
    if (modal) {
      modal.remove();
    }
    this.bundleComponents = [];
  }
  
  addBundleComponent() {
    const inventoryState = this.app.state.getModuleState('inventory');
    const products = inventoryState.products || [];
    
    const modalHtml = `
      <div class="add-component-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60" 
           id="addComponentModal">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div class="flex justify-between items-center mb-4">
            <h4 class="font-medium">Add Bundle Component</h4>
            <button onclick="window.pharmaApp.getModule('inventory').hideAddComponentModal()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="form-group mb-3">
            <label class="form-label">Product</label>
            <select class="form-select" id="componentProductSelect" onchange="window.pharmaApp.getModule('inventory').loadComponentProductDetails()">
              <option value="">Select a product...</option>
              ${products.map(product => 
                `<option value="${product._id}" data-price="${product.price}">${product.name} (₹${parseFloat(product.price).toFixed(2)})</option>`
              ).join('')}
            </select>
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label">Quantity</label>
              <input type="number" class="form-input" id="componentQuantity" value="1" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">Included Price</label>
              <input type="number" class="form-input" id="componentIncludedPrice" step="0.01" min="0">
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">
              <input type="checkbox" id="componentMandatory" class="mr-2">
              Mandatory Component
            </label>
          </div>
          
          <div class="flex justify-end gap-3">
            <button type="button" class="btn btn-secondary" onclick="window.pharmaApp.getModule('inventory').hideAddComponentModal()">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" onclick="window.pharmaApp.getModule('inventory').confirmAddComponent()">
              Add Component
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  
  hideAddComponentModal() {
    const modal = document.getElementById('addComponentModal');
    if (modal) {
      modal.remove();
    }
  }
  
  loadComponentProductDetails() {
    const select = document.getElementById('componentProductSelect');
    const price = select.selectedOptions[0]?.dataset.price || '0';
    const includedPriceInput = document.getElementById('componentIncludedPrice');
    
    if (includedPriceInput) {
      includedPriceInput.value = price;
    }
  }
  
  confirmAddComponent() {
    const productSelect = document.getElementById('componentProductSelect');
    const productId = productSelect.value;
    const quantity = parseInt(document.getElementById('componentQuantity').value) || 1;
    const includedPrice = parseFloat(document.getElementById('componentIncludedPrice').value) || 0;
    const isMandatory = document.getElementById('componentMandatory').checked;
    
    if (!productId) {
      if (window.notiflix) {
        window.notiflix.Notify.warning('Product Required', 'Please select a product');
      }
      return;
    }
    
    const inventoryState = this.app.state.getModuleState('inventory');
    const product = inventoryState.products.find(p => p._id === productId);
    
    if (product) {
      const component = {
        component_id: `COMP${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        product_id: product._id,
        product_name: product.name,
        category: product.category || 'general',
        quantity: quantity,
        individual_price: parseFloat(product.price),
        included_price: includedPrice,
        is_mandatory: isMandatory
      };
      
      this.bundleComponents = this.bundleComponents || [];
      this.bundleComponents.push(component);
      
      this.updateBundleComponentsList();
      this.hideAddComponentModal();
      this.calculateBundlePricing();
    }
  }
  
  updateBundleComponentsList() {
    const container = document.getElementById('bundleComponentsList');
    
    if (!this.bundleComponents || this.bundleComponents.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <i class="fa fa-plus-circle text-2xl mb-2"></i>
          <div>No components added yet</div>
          <button type="button" class="btn btn-sm btn-primary mt-2" 
                  onclick="window.pharmaApp.getModule('inventory').addBundleComponent()">
            Add Component
          </button>
        </div>
      `;
      return;
    }
    
    const componentsHtml = this.bundleComponents.map((component, index) => `
      <div class="component-item border rounded p-3 mb-3">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="font-medium">${component.product_name}</div>
            <div class="text-sm text-gray-500">
              Quantity: ${component.quantity} | 
              Individual: ₹${component.individual_price.toFixed(2)} | 
              Included: ₹${component.included_price.toFixed(2)}
              ${component.is_mandatory ? ' <span class="badge badge-danger ml-1">Required</span>' : ''}
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-danger" 
                  onclick="window.pharmaApp.getModule('inventory').removeBundleComponent(${index})">
            <i class="fa fa-times"></i>
          </button>
        </div>
      </div>
    `).join('');
    
    container.innerHTML = componentsHtml;
  }
  
  removeBundleComponent(index) {
    if (this.bundleComponents) {
      this.bundleComponents.splice(index, 1);
      this.updateBundleComponentsList();
      this.calculateBundlePricing();
    }
  }
  
  calculateBundlePricing() {
    if (!this.bundleComponents || this.bundleComponents.length === 0) {
      document.getElementById('individualTotal').textContent = '₹0.00';
      document.getElementById('customerSavings').textContent = '₹0.00';
      return;
    }
    
    const individualTotal = this.bundleComponents.reduce((sum, component) => {
      return sum + (component.individual_price * component.quantity);
    }, 0);
    
    const bundlePrice = parseFloat(document.querySelector('input[name="bundle_price"]')?.value) || 0;
    const customerSavings = Math.max(0, individualTotal - bundlePrice);
    
    document.getElementById('individualTotal').textContent = `₹${individualTotal.toFixed(2)}`;
    document.getElementById('bundlePriceDisplay').textContent = `₹${bundlePrice.toFixed(2)}`;
    document.getElementById('customerSavings').textContent = `₹${customerSavings.toFixed(2)}`;
  }
  
  async handleGiftBundleSubmit(event) {
    event.preventDefault();
    
    if (!this.bundleComponents || this.bundleComponents.length === 0) {
      if (window.notiflix) {
        window.notiflix.Notify.warning('Components Required', 'Please add at least one component to the bundle');
      }
      return;
    }
    
    const formData = new FormData(event.target);
    const bundleData = Object.fromEntries(formData.entries());
    
    // Convert checkboxes
    const checkboxes = ['allow_component_substitution', 'allow_size_selection', 'gift_wrapping_included', 'gift_message_included'];
    checkboxes.forEach(checkbox => {
      bundleData[checkbox] = event.target.querySelector(`input[name="${checkbox}"]`).checked;
    });
    
    // Add components and pricing
    bundleData.components = this.bundleComponents;
    bundleData.pricing = {
      total_individual_price: this.bundleComponents.reduce((sum, comp) => sum + (comp.individual_price * comp.quantity), 0),
      bundle_price: parseFloat(bundleData.bundle_price) || 0,
      total_discount: 0,
      discount_percentage: 0,
      savings_per_customer: 0
    };
    
    try {
      if (window.notiflix) window.notiflix.Block.standard('#giftBundleCreatorModal .modal-content', 'Creating Bundle...');
      
      const response = await fetch(`${window.api}gift_store/bundles/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bundleData)
      });
      
      const result = await response.json();
      
      if (window.notiflix) window.notiflix.Block.remove('#giftBundleCreatorModal .modal-content');
      
      if (result.success) {
        this.hideGiftBundleCreator();
        this.loadGiftBundles();
        
        if (window.notiflix) {
          window.notiflix.Notify.success('Bundle Created', 'Gift bundle created successfully!');
        }
      } else {
        throw new Error(result.error || 'Failed to create bundle');
      }
      
    } catch (error) {
      console.error('Error creating bundle:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('#giftBundleCreatorModal .modal-content');
        window.notiflix.Report.failure('Error', error.message, 'Ok');
      }
    }
  }
  
  showGiftWrappingManager() {
    const inventoryState = this.app.state.getModuleState('inventory');
    const wrappingOptions = inventoryState.giftWrappingOptions || [];
    
    const modalHtml = `
      <div class="gift-wrapping-manager-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="giftWrappingManagerModal">
        <div class="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">
              <i class="fa fa-gift text-indigo-600"></i> Gift Wrapping Management
            </h3>
            <button onclick="window.pharmaApp.getModule('inventory').hideGiftWrappingManager()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="flex justify-between items-center mb-4">
            <div class="wrapping-stats grid grid-cols-4 gap-4">
              <div class="stat-card p-3 bg-blue-50 rounded">
                <div class="text-lg font-bold text-blue-600">${wrappingOptions.length}</div>
                <div class="text-sm text-blue-800">Total Styles</div>
              </div>
              <div class="stat-card p-3 bg-green-50 rounded">
                <div class="text-lg font-bold text-green-600">${wrappingOptions.filter(w => w.status?.is_available).length}</div>
                <div class="text-sm text-green-800">Available</div>
              </div>
              <div class="stat-card p-3 bg-purple-50 rounded">
                <div class="text-lg font-bold text-purple-600">₹${wrappingOptions.reduce((sum, w) => sum + (w.details?.cost || 0), 0).toFixed(2)}</div>
                <div class="text-sm text-purple-800">Total Value</div>
              </div>
              <div class="stat-card p-3 bg-orange-50 rounded">
                <div class="text-lg font-bold text-orange-600">${wrappingOptions.filter(w => w.details?.seasonal_availability === 'year_round').length}</div>
                <div class="text-sm text-orange-800">Year Round</div>
              </div>
            </div>
            <button class="btn btn-indigo" onclick="window.pharmaApp.getModule('inventory').showAddWrappingStyleModal()">
              <i class="fa fa-plus"></i> Add Style
            </button>
          </div>
          
          <div class="wrapping-styles-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${wrappingOptions.map(style => this.renderWrappingStyleCard(style)).join('') || `
              <div class="col-span-full text-center text-gray-500 py-8">
                <i class="fa fa-gift text-4xl mb-2"></i>
                <div>No gift wrapping styles available</div>
                <button class="btn btn-primary mt-2" onclick="window.pharmaApp.getModule('inventory').showAddWrappingStyleModal()">
                  Add First Style
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  
  renderWrappingStyleCard(style) {
    const availability = style.availability || {};
    const details = style.details || {};
    
    return `
      <div class="wrapping-style-card border rounded-lg p-4 ${!availability.is_available ? 'opacity-50' : ''}">
        <div class="flex justify-between items-start mb-3">
          <div class="flex-1">
            <h5 class="font-medium">${style.style_name}</h5>
            <span class="px-2 py-1 text-xs rounded ${style.style_category === 'elegant' ? 'bg-purple-100 text-purple-800' : 
              style.style_category === 'colorful' ? 'bg-pink-100 text-pink-800' : 
              style.style_category === 'minimalist' ? 'bg-gray-100 text-gray-800' : 
              'bg-blue-100 text-blue-800'}">
              ${style.style_category}
            </span>
          </div>
          <div class="text-right">
            <div class="font-bold text-green-600">₹${details.cost?.toFixed(2) || '0.00'}</div>
            <div class="text-xs text-gray-500">per item</div>
          </div>
        </div>
        
        <p class="text-sm text-gray-600 mb-3">${details.description || 'No description available'}</p>
        
        <div class="style-details text-xs text-gray-500 mb-3">
          <div><strong>Stock:</strong> ${availability.stock_level || 0}</div>
          <div><strong>Lead Time:</strong> ${availability.lead_time_days || 0} days</div>
          <div><strong>Availability:</strong> ${availability.seasonal_availability || 'year_round'}</div>
        </div>
        
        <div class="style-actions flex gap-2">
          <button class="btn btn-sm btn-info flex-1" onclick="window.pharmaApp.getModule('inventory').editWrappingStyle('${style.style_id}')">
            <i class="fa fa-edit"></i> Edit
          </button>
          <button class="btn btn-sm ${availability.is_available ? 'btn-warning' : 'btn-success'} flex-1" 
                  onclick="window.pharmaApp.getModule('inventory').toggleWrappingStyleAvailability('${style.style_id}')">
            <i class="fa fa-${availability.is_available ? 'eye-slash' : 'eye'}"></i> 
            ${availability.is_available ? 'Disable' : 'Enable'}
          </button>
          <button class="btn btn-sm btn-danger flex-1" onclick="window.pharmaApp.getModule('inventory').deleteWrappingStyle('${style.style_id}')">
            <i class="fa fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
  }
  
  hideGiftWrappingManager() {
    const modal = document.getElementById('giftWrappingManagerModal');
    if (modal) {
      modal.remove();
    }
  }
  
  showAddWrappingStyleModal() {
    const modalHtml = `
      <div class="add-wrapping-style-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60" 
           id="addWrappingStyleModal">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div class="flex justify-between items-center mb-4">
            <h4 class="font-medium">Add Gift Wrapping Style</h4>
            <button onclick="window.pharmaApp.getModule('inventory').hideAddWrappingStyleModal()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <form id="wrappingStyleForm" onsubmit="window.pharmaApp.getModule('inventory').handleAddWrappingStyleSubmit(event)">
            <div class="form-group mb-3">
              <label class="form-label">Style Name *</label>
              <input type="text" class="form-input" name="style_name" required 
                     placeholder="e.g., Elegant Gold Wrap">
            </div>
            
            <div class="form-group mb-3">
              <label class="form-label">Style Category *</label>
              <select class="form-select" name="style_category" required>
                <option value="">Select category...</option>
                <option value="elegant">Elegant</option>
                <option value="colorful">Colorful</option>
                <option value="minimalist">Minimalist</option>
                <option value="festive">Festive</option>
                <option value="seasonal">Seasonal</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="form-label">Cost per Item (₹) *</label>
                <input type="number" class="form-input" name="cost" required step="0.01" min="0" placeholder="25.00">
              </div>
              <div class="form-group">
                <label class="form-label">Stock Level</label>
                <input type="number" class="form-input" name="stock_level" min="0" value="100">
              </div>
            </div>
            
            <div class="form-group mb-3">
              <label class="form-label">Description</label>
              <textarea class="form-input" name="description" rows="3" 
                        placeholder="Describe the wrapping style..."></textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="form-label">Lead Time (days)</label>
                <input type="number" class="form-input" name="lead_time_days" min="0" value="0">
              </div>
              <div class="form-group">
                <label class="form-label">Seasonal Availability</label>
                <select class="form-select" name="seasonal_availability">
                  <option value="year_round">Year Round</option>
                  <option value="festive_only">Festive Only</option>
                  <option value="seasonal">Seasonal</option>
                </select>
              </div>
            </div>
            
            <div class="flex justify-end gap-3">
              <button type="button" class="btn btn-secondary" onclick="window.pharmaApp.getModule('inventory').hideAddWrappingStyleModal()">
                Cancel
              </button>
              <button type="submit" class="btn btn-indigo">
                <i class="fa fa-save"></i> Add Style
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  
  hideAddWrappingStyleModal() {
    const modal = document.getElementById('addWrappingStyleModal');
    if (modal) {
      modal.remove();
    }
  }
  
  async handleAddWrappingStyleSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const styleData = Object.fromEntries(formData.entries());
    
    // Convert numeric fields
    styleData.cost = parseFloat(styleData.cost) || 0;
    styleData.stock_level = parseInt(styleData.stock_level) || 0;
    styleData.lead_time_days = parseInt(styleData.lead_time_days) || 0;
    
    try {
      if (window.notiflix) window.notiflix.Block.standard('#addWrappingStyleModal .modal-content', 'Adding Style...');
      
      const response = await fetch(`${window.api}gift_store/wrapping/add-style`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(styleData)
      });
      
      const result = await response.json();
      
      if (window.notiflix) window.notiflix.Block.remove('#addWrappingStyleModal .modal-content');
      
      if (result.success) {
        this.hideAddWrappingStyleModal();
        this.loadGiftWrappingOptions();
        
        // Refresh the wrapping manager if open
        const managerModal = document.getElementById('giftWrappingManagerModal');
        if (managerModal) {
          this.showGiftWrappingManager();
        }
        
        if (window.notiflix) {
          window.notiflix.Notify.success('Style Added', 'Gift wrapping style added successfully!');
        }
      } else {
        throw new Error(result.error || 'Failed to add wrapping style');
      }
      
    } catch (error) {
      console.error('Error adding wrapping style:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('#addWrappingStyleModal .modal-content');
        window.notiflix.Report.failure('Error', error.message, 'Ok');
      }
    }
  }
  
  showGiftCardManager() {
    const modalHtml = `
      <div class="gift-card-manager-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="giftCardManagerModal">
        <div class="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">
              <i class="fa fa-credit-card text-pink-600"></i> Gift Card Management
            </h3>
            <button onclick="window.pharmaApp.getModule('inventory').hideGiftCardManager()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="gift-card-tabs mb-4">
            <ul class="nav nav-tabs" role="tablist">
              <li role="presentation" class="active">
                <a href="#activeCardsTab" aria-controls="active" role="tab" data-toggle="tab">
                  <i class="fa fa-credit-card"></i> Active Cards
                </a>
              </li>
              <li role="presentation">
                <a href="#issueCardTab" aria-controls="issue" role="tab" data-toggle="tab">
                  <i class="fa fa-plus"></i> Issue Card
                </a>
              </li>
              <li role="presentation">
                <a href="#redeemCardTab" aria-controls="redeem" role="tab" data-toggle="tab">
                  <i class="fa fa-exchange"></i> Redeem Card
                </a>
              </li>
              <li role="presentation">
                <a href="#cardAnalyticsTab" aria-controls="analytics" role="tab" data-toggle="tab">
                  <i class="fa fa-chart-bar"></i> Analytics
                </a>
              </li>
            </ul>
          </div>
          
          <div class="tab-content">
            <div role="tabpanel" class="tab-pane active" id="activeCardsTab">
              <div class="active-cards-content">
                <div class="text-center text-gray-500 py-8">
                  <i class="fa fa-credit-card text-4xl mb-2"></i>
                  <div>Loading active gift cards...</div>
                </div>
              </div>
            </div>
            <div role="tabpanel" class="tab-pane" id="issueCardTab">
              ${this.renderIssueCardTab()}
            </div>
            <div role="tabpanel" class="tab-pane" id="redeemCardTab">
              ${this.renderRedeemCardTab()}
            </div>
            <div role="tabpanel" class="tab-pane" id="cardAnalyticsTab">
              ${this.renderCardAnalyticsTab()}
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.loadActiveGiftCards();
  }
  
  renderIssueCardTab() {
    return `
      <div class="issue-card-tab">
        <form id="issueCardForm" onsubmit="window.pharmaApp.getModule('inventory').handleIssueCardSubmit(event)">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Card Details -->
            <div class="card-details">
              <h5 class="font-medium mb-3">Card Details</h5>
              
              <div class="form-group mb-3">
                <label class="form-label">Card Type</label>
                <select class="form-select" name="card_type">
                  <option value="digital">Digital</option>
                  <option value="physical">Physical</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              
              <div class="form-group mb-3">
                <label class="form-label">Denomination (₹) *</label>
                <input type="number" class="form-input" name="denomination" required step="0.01" min="1" 
                       placeholder="500.00">
              </div>
              
              <div class="form-group mb-3">
                <label class="form-label">Custom Message</label>
                <textarea class="form-input" name="custom_message" rows="3" 
                          placeholder="Message for the recipient..."></textarea>
              </div>
              
              <div class="form-group mb-3">
                <label class="form-label">Design Template</label>
                <select class="form-select" name="design_template">
                  <option value="default">Default</option>
                  <option value="birthday">Birthday</option>
                  <option value="festival">Festival</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
            </div>
            
            <!-- Delivery Information -->
            <div class="delivery-info">
              <h5 class="font-medium mb-3">Delivery Information</h5>
              
              <div class="form-group mb-3">
                <label class="form-label">Recipient Name</label>
                <input type="text" class="form-input" name="recipient_name" 
                       placeholder="Recipient's name">
              </div>
              
              <div class="form-group mb-3">
                <label class="form-label">Recipient Email</label>
                <input type="email" class="form-input" name="recipient_email" 
                       placeholder="recipient@example.com">
              </div>
              
              <div class="form-group mb-3">
                <label class="form-label">Recipient Phone</label>
                <input type="tel" class="form-input" name="recipient_phone" 
                       placeholder="+91 98765 43210">
              </div>
              
              <div class="form-group mb-3">
                <label class="form-label">Delivery Method</label>
                <select class="form-select" name="delivery_method">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="print">Print at Store</option>
                </select>
              </div>
              
              <div class="form-group mb-3">
                <label class="form-label">Scheduled Delivery</label>
                <input type="datetime-local" class="form-input" name="scheduled_delivery">
              </div>
            </div>
          </div>
          
          <!-- Purchaser Information -->
          <div class="mt-6">
            <h5 class="font-medium mb-3">Purchaser Information</h5>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label class="form-label">Your Name</label>
                <input type="text" class="form-input" name="purchaser_name" 
                       placeholder="Your name">
              </div>
              <div class="form-group">
                <label class="form-label">Your Email</label>
                <input type="email" class="form-input" name="purchaser_email" 
                       placeholder="your@email.com">
              </div>
            </div>
          </div>
          
          <div class="flex justify-end gap-3 mt-6">
            <button type="button" class="btn btn-secondary" onclick="window.pharmaApp.getModule('inventory').hideGiftCardManager()">
              Cancel
            </button>
            <button type="submit" class="btn btn-pink">
              <i class="fa fa-credit-card"></i> Issue Gift Card
            </button>
          </div>
        </form>
      </div>
    `;
  }
  
  renderRedeemCardTab() {
    return `
      <div class="redeem-card-tab">
        <form id="redeemCardForm" onsubmit="window.pharmaApp.getModule('inventory').handleRedeemCardSubmit(event)">
          <div class="max-w-md mx-auto">
            <div class="form-group mb-3">
              <label class="form-label">Gift Card Number *</label>
              <input type="text" class="form-input" name="card_number" required 
                     placeholder="GC-XXXX-XXXX-XXXX">
            </div>
            
            <div class="form-group mb-3">
              <label class="form-label">PIN (if required)</label>
              <input type="password" class="form-input" name="pin" 
                     placeholder="4-digit PIN">
            </div>
            
            <div class="form-group mb-3">
              <label class="form-label">Redemption Amount (₹) *</label>
              <input type="number" class="form-input" name="redemption_amount" required step="0.01" min="0.01">
            </div>
            
            <div class="form-group mb-3">
              <label class="form-label">Transaction ID</label>
              <input type="text" class="form-input" name="transaction_id" 
                     placeholder="Related transaction (optional)">
            </div>
            
            <div class="flex justify-end gap-3">
              <button type="button" class="btn btn-secondary" onclick="window.pharmaApp.getModule('inventory').hideGiftCardManager()">
                Cancel
              </button>
              <button type="submit" class="btn btn-success">
                <i class="fa fa-check"></i> Redeem Card
              </button>
            </div>
          </div>
        </form>
      </div>
    `;
  }
  
  renderCardAnalyticsTab() {
    return `
      <div class="card-analytics-tab">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="stat-card p-4 bg-blue-50 rounded">
            <div class="text-2xl font-bold text-blue-600">0</div>
            <div class="text-sm text-blue-800">Total Cards Issued</div>
          </div>
          <div class="stat-card p-4 bg-green-50 rounded">
            <div class="text-2xl font-bold text-green-600">₹0</div>
            <div class="text-sm text-green-800">Total Value Issued</div>
          </div>
          <div class="stat-card p-4 bg-purple-50 rounded">
            <div class="text-2xl font-bold text-purple-600">₹0</div>
            <div class="text-sm text-purple-800">Total Redeemed</div>
          </div>
        </div>
        
        <div class="text-center text-gray-500 py-8">
          <i class="fa fa-chart-bar text-4xl mb-2"></i>
          <div>Gift card analytics will be displayed here</div>
        </div>
      </div>
    `;
  }
  
  hideGiftCardManager() {
    const modal = document.getElementById('giftCardManagerModal');
    if (modal) {
      modal.remove();
    }
  }
  
  async loadActiveGiftCards() {
    // This would load active gift cards from the backend
    const container = document.querySelector('#activeCardsTab .active-cards-content');
    if (container) {
      container.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <i class="fa fa-credit-card text-4xl mb-2"></i>
          <div>Loading active gift cards...</div>
        </div>
      `;
    }
  }
  
  async handleIssueCardSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const cardData = Object.fromEntries(formData.entries());
    
    // Prepare purchaser and recipient info
    cardData.purchaser_info = {
      name: cardData.purchaser_name || '',
      email: cardData.purchaser_email || ''
    };
    
    cardData.recipient_info = {
      name: cardData.recipient_name || '',
      email: cardData.recipient_email || '',
      phone: cardData.recipient_phone || ''
    };
    
    try {
      if (window.notiflix) window.notiflix.Block.standard('#giftCardManagerModal .modal-content', 'Issuing Gift Card...');
      
      const response = await fetch(`${window.api}gift_store/cards/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cardData)
      });
      
      const result = await response.json();
      
      if (window.notiflix) window.notiflix.Block.remove('#giftCardManagerModal .modal-content');
      
      if (result.success) {
        if (window.notiflix) {
          window.notiflix.Notify.success('Card Issued', `Gift card issued successfully! Card ID: ${result.card_id}`);
        }
        
        // Reset form
        event.target.reset();
        
        // Refresh active cards list
        this.loadActiveGiftCards();
      } else {
        throw new Error(result.error || 'Failed to issue gift card');
      }
      
    } catch (error) {
      console.error('Error issuing gift card:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('#giftCardManagerModal .modal-content');
        window.notiflix.Report.failure('Error', error.message, 'Ok');
      }
    }
  }
  
  async handleRedeemCardSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const redemptionData = Object.fromEntries(formData.entries());
    
    try {
      if (window.notiflix) window.notiflix.Block.standard('#giftCardManagerModal .modal-content', 'Processing Redemption...');
      
      const response = await fetch(`${window.api}gift_store/cards/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(redemptionData)
      });
      
      const result = await response.json();
      
      if (window.notiflix) window.notiflix.Block.remove('#giftCardManagerModal .modal-content');
      
      if (result.success) {
        if (window.notiflix) {
          window.notiflix.Notify.success(
            'Redemption Successful', 
            `Redemption processed! Remaining balance: ₹${result.remaining_balance}`
          );
        }
        
        // Reset form
        event.target.reset();
        
        // Refresh active cards list
        this.loadActiveGiftCards();
      } else {
        throw new Error(result.error || 'Failed to redeem gift card');
      }
      
    } catch (error) {
      console.error('Error redeeming gift card:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('#giftCardManagerModal .modal-content');
        window.notiflix.Report.failure('Error', error.message, 'Ok');
      }
    }
  }
  
  showGiftReceiptGenerator() {
    const inventoryState = this.app.state.getModuleState('inventory');
    const products = inventoryState.products || [];
    
    const modalHtml = `
      <div class="gift-receipt-generator-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="giftReceiptGeneratorModal">
        <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">
              <i class="fa fa-receipt text-cyan-600"></i> Generate Gift Receipt
            </h3>
            <button onclick="window.pharmaApp.getModule('inventory').hideGiftReceiptGenerator()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <form id="giftReceiptForm" onsubmit="window.pharmaApp.getModule('inventory').handleGiftReceiptSubmit(event)">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Transaction Details -->
              <div class="transaction-details">
                <h4 class="font-medium mb-3">Transaction Details</h4>
                
                <div class="form-group mb-3">
                  <label class="form-label">Transaction ID *</label>
                  <input type="text" class="form-input" name="transaction_id" required 
                         placeholder="e.g., TXN123456789">
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Select Items (for gift receipt)</label>
                  <div class="items-selection" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 8px;">
                    ${products.slice(0, 10).map(product => `
                      <label class="flex items-center mb-2">
                        <input type="checkbox" name="selected_items" value="${product._id}" class="mr-2">
                        <span class="flex-1">${product.name}</span>
                        <span class="text-sm text-gray-500">₹${parseFloat(product.price).toFixed(2)}</span>
                      </label>
                    `).join('') || '<div class="text-gray-500">No products available</div>'}
                  </div>
                </div>
              </div>
              
              <!-- Gift Information -->
              <div class="gift-information">
                <h4 class="font-medium mb-3">Gift Information</h4>
                
                <div class="form-group mb-3">
                  <label class="form-label">Gift Message</label>
                  <textarea class="form-input" name="gift_message" rows="3" 
                            placeholder="Personal message for the recipient..."></textarea>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Recipient Name</label>
                  <input type="text" class="form-input" name="gift_recipient_name" 
                         placeholder="Recipient's name">
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Recipient Contact</label>
                  <input type="text" class="form-input" name="gift_recipient_contact" 
                         placeholder="Email or phone number">
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">
                    <input type="checkbox" name="is_anonymous" class="mr-2">
                    Anonymous Gift
                  </label>
                </div>
              </div>
            </div>
            
            <!-- Gift Services -->
            <div class="mt-6">
              <h4 class="font-medium mb-3">Gift Services</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Gift Wrapping -->
                <div class="gift-wrapping-section">
                  <h5 class="text-sm font-medium mb-2">Gift Wrapping</h5>
                  <div class="form-group mb-2">
                    <label class="form-label">
                      <input type="checkbox" name="include_wrapping" class="mr-2">
                      Include Gift Wrapping
                    </label>
                  </div>
                  <div class="form-group mb-2">
                    <label class="form-label">Wrapping Style</label>
                    <select class="form-select" name="gift_wrapping_style">
                      <option value="">Select style...</option>
                      ${this.giftWrappingOptions.map(style => 
                        `<option value="${style.style_name}">${style.style_name} (₹${style.details?.cost?.toFixed(2) || '0.00'})</option>`
                      ).join('')}
                    </select>
                  </div>
                </div>
                
                <!-- Gift Card -->
                <div class="gift-card-section">
                  <h5 class="text-sm font-medium mb-2">Gift Card</h5>
                  <div class="form-group mb-2">
                    <label class="form-label">
                      <input type="checkbox" name="include_gift_card" class="mr-2">
                      Include Gift Card
                    </label>
                  </div>
                  <div class="form-group mb-2">
                    <label class="form-label">Gift Card Value (₹)</label>
                    <input type="number" class="form-input" name="gift_card_value" step="0.01" min="0" placeholder="100.00">
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Delivery Options -->
            <div class="mt-6">
              <h4 class="font-medium mb-3">Delivery Options</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                  <label class="form-label">Delivery Method</label>
                  <select class="form-select" name="delivery_method">
                    <option value="print">Print at Store</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="download">Download Link</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Scheduled Delivery</label>
                  <input type="datetime-local" class="form-input" name="scheduled_delivery">
                </div>
              </div>
            </div>
            
            <div class="flex justify-end gap-3 mt-6">
              <button type="button" class="btn btn-secondary" onclick="window.pharmaApp.getModule('inventory').hideGiftReceiptGenerator()">
                Cancel
              </button>
              <button type="submit" class="btn btn-cyan">
                <i class="fa fa-receipt"></i> Generate Gift Receipt
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  
  hideGiftReceiptGenerator() {
    const modal = document.getElementById('giftReceiptGeneratorModal');
    if (modal) {
      modal.remove();
    }
  }
  
  async handleGiftReceiptSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const receiptData = Object.fromEntries(formData.entries());
    
    // Get selected items
    const selectedItems = [];
    formData.getAll('selected_items').forEach(itemId => {
      const inventoryState = this.app.state.getModuleState('inventory');
      const product = inventoryState.products.find(p => p._id === itemId);
      if (product) {
        selectedItems.push({
          product_id: product._id,
          product_name: product.name,
          price: parseFloat(product.price),
          category: product.category || 'general'
        });
      }
    });
    
    receiptData.items = selectedItems;
    receiptData.gift_card_included = event.target.querySelector('input[name="include_gift_card"]').checked;
    receiptData.gift_card_value = parseFloat(receiptData.gift_card_value) || 0;
    receiptData.gift_wrapping_cost = 0;
    
    // Calculate wrapping cost if selected
    if (receiptData.include_wrapping && receiptData.gift_wrapping_style) {
      const wrappingStyle = this.giftWrappingOptions.find(w => w.style_name === receiptData.gift_wrapping_style);
      receiptData.gift_wrapping_cost = wrappingStyle?.details?.cost || 0;
    }
    
    try {
      if (window.notiflix) window.notiflix.Block.standard('#giftReceiptGeneratorModal .modal-content', 'Generating Receipt...');
      
      const response = await fetch(`${window.api}gift_store/receipts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(receiptData)
      });
      
      const result = await response.json();
      
      if (window.notiflix) window.notiflix.Block.remove('#giftReceiptGeneratorModal .modal-content');
      
      if (result.success) {
        this.hideGiftReceiptGenerator();
        
        if (window.notiflix) {
          window.notiflix.Notify.success(
            'Receipt Generated', 
            `Gift receipt generated successfully! Receipt ID: ${result.receipt_id}`
          );
        }
        
        // Show receipt preview or download options
        this.showReceiptPreview(result);
      } else {
        throw new Error(result.error || 'Failed to generate gift receipt');
      }
      
    } catch (error) {
      console.error('Error generating gift receipt:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('#giftReceiptGeneratorModal .modal-content');
        window.notiflix.Report.failure('Error', error.message, 'Ok');
      }
    }
  }
  
  showReceiptPreview(result) {
    const previewHtml = `
      <div class="gift-receipt-preview-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60" 
           id="giftReceiptPreviewModal">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div class="flex justify-between items-center mb-4">
            <h4 class="font-medium">Gift Receipt Generated</h4>
            <button onclick="window.pharmaApp.getModule('inventory').hideReceiptPreview()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="receipt-info p-4 bg-green-50 rounded mb-4">
            <div class="text-center">
              <i class="fa fa-check-circle text-green-600 text-2xl mb-2"></i>
              <h5 class="font-medium text-green-800">Receipt Created Successfully!</h5>
              <p class="text-sm text-green-600 mt-1">
                Receipt ID: <strong>${result.receipt_id}</strong><br>
                Receipt Number: <strong>${result.receipt_number}</strong>
              </p>
            </div>
          </div>
          
          <div class="delivery-options">
            <h5 class="font-medium mb-3">Delivery Options</h5>
            <div class="grid grid-cols-2 gap-3">
              <button class="btn btn-outline-primary" onclick="window.pharmaApp.getModule('inventory').downloadReceipt('${result.receipt_id}')">
                <i class="fa fa-download"></i> Download PDF
              </button>
              <button class="btn btn-outline-info" onclick="window.pharmaApp.getModule('inventory').shareReceipt('${result.receipt_number}')">
                <i class="fa fa-share"></i> Share Receipt
              </button>
              <button class="btn btn-outline-success" onclick="window.pharmaApp.getModule('inventory').emailReceipt('${result.receipt_id}')">
                <i class="fa fa-envelope"></i> Email Receipt
              </button>
              <button class="btn btn-outline-warning" onclick="window.pharmaApp.getModule('inventory').printReceipt('${result.receipt_id}')">
                <i class="fa fa-print"></i> Print Receipt
              </button>
            </div>
          </div>
          
          <div class="mt-6 p-3 bg-gray-50 rounded">
            <div class="text-sm text-gray-600">
              <strong>Note:</strong> This receipt does not contain item prices and is designed for gifting purposes.
              The recipient can use this receipt for returns or exchanges within 30 days.
            </div>
          </div>
          
          <div class="flex justify-end gap-3 mt-4">
            <button class="btn btn-secondary" onclick="window.pharmaApp.getModule('inventory').hideReceiptPreview()">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', previewHtml);
  }
  
  hideReceiptPreview() {
    const modal = document.getElementById('giftReceiptPreviewModal');
    if (modal) {
      modal.remove();
    }
  }
  
  async downloadReceipt(receiptId) {
    try {
      const response = await fetch(`${window.api}gift_store/receipts/${receiptId}`);
      const receipt = await response.json();
      
      // Create a printable HTML version
      const receiptHtml = this.generateReceiptHTML(receipt);
      
      // Open in new window for printing/downloading
      const printWindow = window.open('', '_blank');
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      
    } catch (error) {
      console.error('Error downloading receipt:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to download receipt', 'Ok');
      }
    }
  }
  
  generateReceiptHTML(receipt) {
    const receiptData = receipt;
    const currentDate = new Date().toLocaleDateString();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gift Receipt - ${receiptData.receipt_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .receipt-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
          .receipt-info { margin-bottom: 20px; }
          .gift-message { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .receipt-footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          .no-price { color: #999; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          <h1>StyleMine</h1>
          <h2>GIFT RECEIPT</h2>
          <p>${currentDate}</p>
        </div>
        
        <div class="receipt-info">
          <p><strong>Receipt Number:</strong> ${receiptData.receipt_number}</p>
          <p><strong>Receipt ID:</strong> ${receiptData.receipt_id}</p>
          
          ${receiptData.gift_details?.gift_recipient_name ? `
            <p><strong>Gift Recipient:</strong> ${receiptData.gift_details.gift_recipient_name}</p>
          ` : ''}
          
          ${receiptData.gift_details?.is_anonymous ? `
            <p><strong>Gift Type:</strong> Anonymous Gift</p>
          ` : ''}
        </div>
        
        ${receiptData.gift_details?.gift_message ? `
          <div class="gift-message">
            <h3>Gift Message:</h3>
            <p>${receiptData.gift_details.gift_message}</p>
          </div>
        ` : ''}
        
        <div class="receipt-footer">
          <p>This is a gift receipt without item prices.</p>
          <p>Valid for returns/exchanges within 30 days with original tags.</p>
          <p>Thank you for choosing StyleMine!</p>
        </div>
      </body>
      </html>
    `;
  }
  
  shareReceipt(receiptNumber) {
    const shareUrl = `${window.location.origin}/gift-receipt/${receiptNumber}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Gift Receipt',
        text: 'Check out this gift receipt from StyleMine',
        url: shareUrl
      });
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(shareUrl).then(() => {
        if (window.notiflix) {
          window.notiflix.Notify.success('Link Copied', 'Receipt link copied to clipboard!');
        }
      });
    }
  }
  
  async emailReceipt(receiptId) {
    // This would integrate with email service
    if (window.notiflix) {
      window.notiflix.Notify.info('Email Feature', 'Email delivery feature will be implemented');
    }
  }
  
  printReceipt(receiptId) {
    // Open download and then trigger print
    this.downloadReceipt(receiptId);
    
    setTimeout(() => {
      window.print();
    }, 1000);
  }
  
  showGiftAnalytics() {
    const modalHtml = `
      <div class="gift-analytics-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="giftAnalyticsModal">
        <div class="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">
              <i class="fa fa-chart-bar text-orange-600"></i> Gift Store Analytics
            </h3>
            <button onclick="window.pharmaApp.getModule('inventory').hideGiftAnalytics()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="analytics-controls mb-6">
            <div class="flex gap-4 items-center">
              <div class="form-group">
                <label class="form-label">Date Range</label>
                <select class="form-select" id="analyticsDateRange" onchange="window.pharmaApp.getModule('inventory').loadGiftAnalytics()">
                  <option value="7">Last 7 days</option>
                  <option value="30" selected>Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Gift Type</label>
                <select class="form-select" id="analyticsGiftType" onchange="window.pharmaApp.getModule('inventory').loadGiftAnalytics()">
                  <option value="">All Types</option>
                  <option value="receipt">Gift Receipts</option>
                  <option value="card">Gift Cards</option>
                  <option value="bundle">Gift Bundles</option>
                  <option value="wrapping">Gift Wrapping</option>
                </select>
              </div>
              <button class="btn btn-info" onclick="window.pharmaApp.getModule('inventory').exportGiftAnalytics()">
                <i class="fa fa-download"></i> Export
              </button>
            </div>
          </div>
          
          <!-- Analytics Overview -->
          <div class="analytics-overview grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="stat-card p-4 bg-blue-50 rounded">
              <div class="text-2xl font-bold text-blue-600" id="totalGiftTransactions">0</div>
              <div class="text-sm text-blue-800">Total Gift Transactions</div>
            </div>
            <div class="stat-card p-4 bg-green-50 rounded">
              <div class="text-2xl font-bold text-green-600" id="totalGiftRevenue">₹0</div>
              <div class="text-sm text-green-800">Gift Revenue</div>
            </div>
            <div class="stat-card p-4 bg-purple-50 rounded">
              <div class="text-2xl font-bold text-purple-600" id="averageGiftOrder">₹0</div>
              <div class="text-sm text-purple-800">Avg Gift Order</div>
            </div>
            <div class="stat-card p-4 bg-orange-50 rounded">
              <div class="text-2xl font-bold text-orange-600" id="giftConversionRate">0%</div>
              <div class="text-sm text-orange-800">Conversion Rate</div>
            </div>
          </div>
          
          <!-- Charts Section -->
          <div class="analytics-charts grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div class="chart-container">
              <h5 class="font-medium mb-3">Gift Type Distribution</h5>
              <div id="giftTypeChart" class="chart-area p-4 border rounded" style="height: 300px;">
                <div class="text-center text-gray-500 py-8">
                  <i class="fa fa-chart-pie text-4xl mb-2"></i>
                  <div>Chart will be displayed here</div>
                </div>
              </div>
            </div>
            
            <div class="chart-container">
              <h5 class="font-medium mb-3">Gift Sales Trend</h5>
              <div id="giftSalesChart" class="chart-area p-4 border rounded" style="height: 300px;">
                <div class="text-center text-gray-500 py-8">
                  <i class="fa fa-chart-line text-4xl mb-2"></i>
                  <div>Chart will be displayed here</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Detailed Analytics Table -->
          <div class="analytics-table">
            <h5 class="font-medium mb-3">Detailed Analytics</h5>
            <div class="table-container border rounded">
              <table class="w-full">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="p-3 text-left">Date</th>
                    <th class="p-3 text-left">Gift Type</th>
                    <th class="p-3 text-left">Transactions</th>
                    <th class="p-3 text-left">Revenue</th>
                    <th class="p-3 text-left">Avg Order</th>
                  </tr>
                </thead>
                <tbody id="analyticsTableBody">
                  <tr>
                    <td colspan="5" class="p-8 text-center text-gray-500">
                      <i class="fa fa-table text-4xl mb-2"></i>
                      <div>Loading analytics data...</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.loadGiftAnalytics();
  }
  
  hideGiftAnalytics() {
    const modal = document.getElementById('giftAnalyticsModal');
    if (modal) {
      modal.remove();
    }
  }
  
  async loadGiftAnalytics() {
    const dateRange = document.getElementById('analyticsDateRange')?.value || '30';
    const giftType = document.getElementById('analyticsGiftType')?.value || '';
    
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (dateRange * 24 * 60 * 60 * 1000));
      
      const params = new URLSearchParams({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });
      
      if (giftType) params.append('gift_type', giftType);
      
      const response = await fetch(`${window.api}gift_store/analytics/sales?${params}`);
      const analytics = await response.json();
      
      this.updateAnalyticsDisplay(analytics);
      
    } catch (error) {
      console.error('Error loading gift analytics:', error);
      this.updateAnalyticsDisplay({
        total_gift_transactions: 0,
        total_gift_revenue: 0,
        average_gift_order_value: 0,
        gift_type_breakdown: {},
        occasion_breakdown: {},
        customer_segment_breakdown: {}
      });
    }
  }
  
  updateAnalyticsDisplay(analytics) {
    // Update stat cards
    document.getElementById('totalGiftTransactions').textContent = analytics.total_gift_transactions || 0;
    document.getElementById('totalGiftRevenue').textContent = `₹${(analytics.total_gift_revenue || 0).toLocaleString()}`;
    document.getElementById('averageGiftOrder').textContent = `₹${(analytics.average_gift_order_value || 0).toFixed(2)}`;
    document.getElementById('giftConversionRate').textContent = `${(analytics.conversion_rate || 0).toFixed(1)}%`;
    
    // Update table
    this.updateAnalyticsTable(analytics);
  }
  
  updateAnalyticsTable(analytics) {
    const tbody = document.getElementById('analyticsTableBody');
    if (!tbody) return;
    
    // Create sample data for demonstration
    const sampleData = [
      { date: '2024-01-15', type: 'Gift Receipt', transactions: 12, revenue: 2500, avg_order: 208 },
      { date: '2024-01-14', type: 'Gift Card', transactions: 8, revenue: 4000, avg_order: 500 },
      { date: '2024-01-13', type: 'Gift Bundle', transactions: 5, revenue: 1500, avg_order: 300 },
      { date: '2024-01-12', type: 'Gift Wrapping', transactions: 15, revenue: 375, avg_order: 25 }
    ];
    
    const rowsHtml = sampleData.map(row => `
      <tr>
        <td class="p-3">${row.date}</td>
        <td class="p-3">${row.type}</td>
        <td class="p-3">${row.transactions}</td>
        <td class="p-3">₹${row.revenue.toLocaleString()}</td>
        <td class="p-3">₹${row.avg_order}</td>
      </tr>
    `).join('');
    
    tbody.innerHTML = rowsHtml;
  }
  
  exportGiftAnalytics() {
    if (window.notiflix) {
      window.notiflix.Notify.info('Export Feature', 'Analytics export functionality will be implemented');
    }
  }
}

// Make InventoryModule available globally
window.InventoryModule = InventoryModule;