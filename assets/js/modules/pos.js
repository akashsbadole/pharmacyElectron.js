/**
 * POS Module - Point of Sale functionality
 */

class POSModule {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.showPayment = false;
  }
  
  initialize() {
    console.log('POS module initialized');
  }
  
  onActivate() {
    this.loadInitialData();
  }
  
  async loadInitialData() {
    // Load products and customers
    await Promise.all([
      this.loadProducts(),
      this.loadCustomers()
    ]);
  }
  
  async loadProducts() {
    try {
      const response = await fetch(`${window.api}inventory/products`);
      const products = await response.json();
      
      this.app.state.updateModule('pos', { 
        products: products.map(p => ({
          ...p,
          price: parseFloat(p.price).toFixed(2)
        }))
      });
      
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }
  
  async loadCustomers() {
    try {
      const response = await fetch(`${window.api}customers/all`);
      const customers = await response.json();
      
      this.app.state.updateModule('pos', { customers });
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }
  
  addToCart(product) {
    const posState = this.app.state.getModuleState('pos');
    const cart = [...posState.cart];
    
    // Check if product already exists in cart
    const existingIndex = cart.findIndex(item => item.id === product._id);
    
    if (existingIndex >= 0) {
      // Increase quantity
      cart[existingIndex].quantity += 1;
    } else {
      // Add new item
      cart.push({
        id: product._id,
        product_name: product.name,
        sku: product.barcode || product._id,
        price: parseFloat(product.price),
        quantity: 1
      });
    }
    
    this.app.state.updateModule('pos', { cart });
  }
  
  removeFromCart(index) {
    const posState = this.app.state.getModuleState('pos');
    const cart = posState.cart.filter((_, i) => i !== index);
    this.app.state.updateModule('pos', { cart });
  }
  
  updateCartQuantity(index, quantity) {
    const posState = this.app.state.getModuleState('pos');
    const cart = [...posState.cart];
    
    if (cart[index]) {
      cart[index].quantity = parseInt(quantity) || 1;
      this.app.state.updateModule('pos', { cart });
    }
  }
  
  selectCustomer(customer) {
    this.app.state.updateModule('pos', { currentCustomer: customer });
  }
  
  cancelSale() {
    this.app.state.updateModule('pos', { 
      cart: [], 
      currentSale: {}, 
      currentCustomer: null 
    });
  }
  
  holdSale() {
    // TODO: Implement hold sale functionality
    console.log('Hold sale functionality not yet implemented');
  }
  
  async completeSale(paymentData) {
    try {
      this.app.state.updateModule('pos', { paymentStatus: 'processing' });
      
      const response = await fetch(`${window.api}new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });
      
      const result = await response.json();
      
      // Clear cart and reset state
      this.app.state.updateModule('pos', { 
        cart: [], 
        currentSale: result,
        paymentStatus: 'completed'
      });
      
      // Refresh dashboard data
      const dashboard = this.app.getModule('dashboard');
      if (dashboard) {
        dashboard.loadDashboardData();
      }
      
      // Show success message
      if (window.notiflix) {
        window.notiflix.Report.success('Sale Completed', 'Transaction completed successfully!', 'Ok');
      }
      
      return result;
      
    } catch (error) {
      console.error('Error completing sale:', error);
      this.app.state.updateModule('pos', { paymentStatus: 'error' });
      
      if (window.notiflix) {
        window.notiflix.Report.failure('Sale Failed', 'Failed to complete transaction', 'Ok');
      }
      
      throw error;
    }
  }
  
  calculateCartTotal() {
    const posState = this.app.state.getModuleState('pos');
    const cart = posState.cart;
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = 0; // TODO: Get from form
    const taxRate = window.settings?.charge_tax ? parseFloat(window.settings.percentage) / 100 : 0;
    const tax = (subtotal - discount) * taxRate;
    const total = subtotal - discount + tax;
    
    return {
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      items: cart.length
    };
  }
  
  async searchProduct(barcode) {
    try {
      const response = await fetch(`${window.api}inventory/product/sku`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ skuCode: barcode })
      });
      
      const product = await response.json();
      return product;
    } catch (error) {
      console.error('Product search failed:', error);
      return null;
    }
  }
  
  render() {
    const posState = this.app.state.getModuleState('pos');
    const totals = this.calculateCartTotal();
    
    return `
      <div class="module-container pos-module" data-module="pos">
        <div class="module-header">
          <h1 class="module-title">Point of Sale</h1>
          <p class="module-subtitle">Process sales transactions</p>
        </div>
        
        <div class="pos-layout grid grid-cols-2 gap-6">
          <div class="pos-left-panel">
            ${this.renderCustomerSelector(posState.currentCustomer)}
            ${this.renderProductSearch()}
            ${this.renderBarcodeScanner()}
          </div>
          
          <div class="pos-right-panel">
            ${this.renderShoppingCart(posState.cart, totals)}
            ${this.renderPOSActions(totals)}
          </div>
        </div>
        
        ${this.showPayment ? this.renderPaymentInterface(totals) : ''}
      </div>
    `;
  }
  
  renderCustomerSelector(currentCustomer) {
    const customers = this.app.state.getModuleState('pos').customers;
    
    return `
      <div class="customer-selector mb-6">
        <div class="card">
          <div class="card-body">
            <label class="form-label">Customer</label>
            <div class="input-group">
              <select class="form-select" onchange="window.pharmaApp.getModule('pos').selectCustomer(this.value)">
                <option value="">Walk in customer</option>
                ${customers.map(customer => 
                  `<option value="${customer._id}" ${currentCustomer?._id === customer._id ? 'selected' : ''}>
                    ${customer.name}
                  </option>`
                ).join('')}
              </select>
              <button class="btn btn-info" onclick="window.pharmaApp.getModule('pos').viewCustomerDetails()">
                <i class="fa fa-eye"></i>
              </button>
              <button class="btn btn-success" onclick="window.pharmaApp.getModule('pos').addNewCustomer()">
                <i class="fa fa-plus"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderProductSearch() {
    return `
      <div class="product-search mb-6">
        <div class="card">
          <div class="card-body">
            <label class="form-label">Search Products</label>
            <input type="text" class="form-input" placeholder="Search by name or SKU" 
                   onkeyup="window.pharmaApp.getModule('pos').filterProducts(this.value)">
            <div id="product-search-results" class="mt-3"></div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderBarcodeScanner() {
    return `
      <div class="barcode-scanner mb-6">
        <div class="card">
          <div class="card-body">
            <label class="form-label">Scan Barcode</label>
            <form id="barcodeForm" onsubmit="window.pharmaApp.getModule('pos').handleBarcodeSubmit(event)">
              <div class="input-group">
                <input type="text" id="barcodeInput" class="form-input" 
                       placeholder="Scan barcode or type number" autofocus>
                <button type="submit" class="btn btn-primary">
                  <i class="glyphicon glyphicon-ok"></i>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }
  
  renderShoppingCart(cart, totals) {
    return `
      <div class="shopping-cart">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Cart Items (${cart.length})</h3>
          </div>
          <div class="card-body">
            <div class="cart-items" style="max-height: 400px; overflow-y: auto;">
              ${cart.length === 0 ? 
                '<div class="text-center text-gray-500 py-8">Cart is empty</div>' :
                cart.map((item, index) => `
                  <div class="cart-item flex items-center gap-3 p-3 border-b">
                    <div class="flex-1">
                      <div class="font-medium">${item.product_name}</div>
                      <div class="text-sm text-gray-500">${item.sku}</div>
                    </div>
                    <div class="flex items-center gap-2">
                      <button class="btn btn-sm btn-secondary" 
                              onclick="window.pharmaApp.getModule('pos').updateCartQuantity(${index}, ${item.quantity - 1})">-</button>
                      <input type="number" class="form-input" style="width: 60px" 
                             value="${item.quantity}" min="1"
                             onchange="window.pharmaApp.getModule('pos').updateCartQuantity(${index}, this.value)">
                      <button class="btn btn-sm btn-secondary" 
                              onclick="window.pharmaApp.getModule('pos').updateCartQuantity(${index}, ${item.quantity + 1})">+</button>
                    </div>
                    <div class="text-right">
                      <div class="font-medium">$${(item.price * item.quantity).toFixed(2)}</div>
                      <div class="text-sm text-gray-500">$${item.price.toFixed(2)} each</div>
                    </div>
                    <button class="btn btn-sm btn-danger" 
                            onclick="window.pharmaApp.getModule('pos').removeFromCart(${index})">
                      <i class="fa fa-times"></i>
                    </button>
                  </div>
                `).join('')
              }
            </div>
            
            ${cart.length > 0 ? this.renderCartTotals(totals) : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  renderCartTotals(totals) {
    return `
      <div class="cart-totals mt-4 p-4 bg-gray-50 rounded">
        <div class="flex justify-between mb-2">
          <span>Total Items:</span>
          <span>${totals.items}</span>
        </div>
        <div class="flex justify-between mb-2">
          <span>Subtotal:</span>
          <span>$${totals.subtotal}</span>
        </div>
        <div class="flex justify-between mb-2">
          <span>Discount:</span>
          <span>$${totals.discount}</span>
        </div>
        <div class="flex justify-between mb-2">
          <span>Tax:</span>
          <span>$${totals.tax}</span>
        </div>
        <div class="flex justify-between font-bold text-lg border-t pt-2">
          <span>TOTAL:</span>
          <span>$${totals.total}</span>
        </div>
      </div>
    `;
  }
  
  renderPOSActions(totals) {
    return `
      <div class="pos-actions mt-6">
        <div class="grid grid-cols-2 gap-3">
          <button class="btn btn-danger" onclick="window.pharmaApp.getModule('pos').cancelSale()">
            <i class="fa fa-ban"></i> Cancel
          </button>
          <button class="btn btn-warning" onclick="window.pharmaApp.getModule('pos').holdSale()">
            <i class="fa fa-hand-paper-o"></i> Hold
          </button>
        </div>
        <button class="btn btn-success btn-lg w-full mt-3" 
                onclick="window.pharmaApp.getModule('pos').showPaymentInterface()"
                ${totals.items === 0 ? 'disabled' : ''}>
          <i class="fa fa-money"></i> Pay $${totals.total}
        </button>
      </div>
    `;
  }
  
  renderPaymentInterface(totals) {
    return `
      <div class="payment-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Payment</h3>
            <button onclick="window.pharmaApp.getModule('pos').hidePaymentInterface()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="payment-methods mb-4">
            <div class="grid grid-cols-2 gap-2">
              <button class="btn btn-primary payment-method" data-method="cash">Cash</button>
              <button class="btn btn-secondary payment-method" data-method="card">Card</button>
            </div>
          </div>
          
          <div class="payment-amount mb-4">
            <label class="form-label">Amount Paid</label>
            <input type="number" class="form-input" id="paymentAmount" step="0.01" 
                   placeholder="0.00" onchange="window.pharmaApp.getModule('pos').calculateChange()">
          </div>
          
          <div class="payment-calculation mb-4">
            <div class="flex justify-between mb-2">
              <span>Total:</span>
              <span>$${totals.total}</span>
            </div>
            <div class="flex justify-between mb-2">
              <span>Paid:</span>
              <span id="amountPaid">$0.00</span>
            </div>
            <div class="flex justify-between font-bold">
              <span>Change:</span>
              <span id="changeAmount">$0.00</span>
            </div>
          </div>
          
          <div class="flex gap-3">
            <button class="btn btn-secondary flex-1" onclick="window.pharmaApp.getModule('pos').hidePaymentInterface()">
              Cancel
            </button>
            <button class="btn btn-success flex-1" onclick="window.pharmaApp.getModule('pos').processPayment()">
              Confirm Payment
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  // Event handlers
  async handleBarcodeSubmit(event) {
    event.preventDefault();
    const barcode = document.getElementById('barcodeInput').value.trim();
    
    if (barcode) {
      const product = await this.searchProduct(barcode);
      if (product) {
        this.addToCart(product);
        document.getElementById('barcodeInput').value = '';
      } else {
        if (window.notiflix) {
          window.notiflix.Report.warning('Not Found', 'Product not found', 'Ok');
        }
      }
    }
  }
  
  filterProducts(searchTerm) {
    const products = this.app.state.getModuleState('pos').products;
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchTerm))
    );
    
    const resultsContainer = document.getElementById('product-search-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = filtered.slice(0, 5).map(product => `
        <div class="product-result p-2 border-b cursor-pointer hover:bg-gray-50" 
             onclick="window.pharmaApp.getModule('pos').addToCartFromSearch('${product._id}')">
          <div class="font-medium">${product.name}</div>
          <div class="text-sm text-gray-500">$${parseFloat(product.price).toFixed(2)}</div>
        </div>
      `).join('');
    }
  }
  
  addToCartFromSearch(productId) {
    const products = this.app.state.getModuleState('pos').products;
    const product = products.find(p => p._id === productId);
    if (product) {
      this.addToCart(product);
    }
  }
  
  showPaymentInterface() {
    this.showPayment = true;
    this.render();
  }
  
  hidePaymentInterface() {
    this.showPayment = false;
    this.render();
  }
  
  calculateChange() {
    const paid = parseFloat(document.getElementById('paymentAmount').value) || 0;
    const totals = this.calculateCartTotal();
    const total = parseFloat(totals.total);
    const change = Math.max(0, paid - total);
    
    document.getElementById('amountPaid').textContent = `$${paid.toFixed(2)}`;
    document.getElementById('changeAmount').textContent = `$${change.toFixed(2)}`;
  }
  
  async processPayment() {
    const paid = parseFloat(document.getElementById('paymentAmount').value);
    const totals = this.calculateCartTotal();
    const total = parseFloat(totals.total);
    
    if (paid < total) {
      if (window.notiflix) {
        window.notiflix.Report.warning('Insufficient Payment', 'Amount paid is less than total', 'Ok');
      }
      return;
    }
    
    const posState = this.app.state.getModuleState('pos');
    const paymentData = {
      // Build payment data structure similar to original POS
      order: Date.now(),
      ref_number: '',
      discount: 0,
      customer: posState.currentCustomer || { id: 0, name: 'Walk in customer' },
      status: 1,
      subtotal: parseFloat(totals.subtotal),
      tax: parseFloat(totals.tax),
      order_type: 1,
      items: posState.cart,
      date: new Date(),
      payment_type: 'Cash', // TODO: Get from selected method
      total: total,
      paid: paid,
      change: paid - total
    };
    
    try {
      await this.completeSale(paymentData);
      this.hidePaymentInterface();
    } catch (error) {
      console.error('Payment processing failed:', error);
    }
  }
  
  // Customer management
  viewCustomerDetails() {
    // TODO: Implement customer details view
    console.log('View customer details not yet implemented');
  }
  
  addNewCustomer() {
    // TODO: Implement add new customer modal
    console.log('Add new customer not yet implemented');
  }
}

// Make POSModule available globally
window.POSModule = POSModule;