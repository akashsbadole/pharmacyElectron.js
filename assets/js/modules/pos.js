/**
 * POS Module - Point of Sale functionality
 */

class POSModule {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.showPayment = false;
    this.saleType = 'intra'; // intra or inter
  }
  
  initialize() {
    console.log('POS module initialized');
    
    // Bridge legacy submitDueOrder to modular state
    const originalSubmitDueOrder = $.fn.submitDueOrder;
    const self = this;
    
    $.fn.submitDueOrder = function(status) {
      if (self.app.state.getState().activeModule === 'pos') {
        if (status === 0) { // Hold Sale
          const refNumber = $("#refNumber").val();
          self.submitHoldSale(refNumber);
        } else {
          // If status is not 0 (e.g. legacy complete), let it be
          originalSubmitDueOrder.call(this, status);
        }
      } else {
        originalSubmitDueOrder.call(this, status);
      }
    };

    // Attach sharing events to shared modal buttons
    $(document).on('click', '#shareWhatsApp', () => {
        const transId = $("#viewTransaction").attr('data-id');
        if (transId) this.shareWhatsApp(transId);
    });
    $(document).on('click', '#shareEmail', () => {
        const transId = $("#viewTransaction").attr('data-id');
        if (transId) this.shareEmail(transId);
    });
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
  
  selectCustomer(customerId) {
    const customers = this.app.state.getModuleState('pos').customers;
    const customer = customers.find(c => c._id == customerId);
    this.app.state.updateModule('pos', { currentCustomer: customer || null });
  }
  
  cancelSale() {
    this.app.state.updateModule('pos', { 
      cart: [], 
      currentSale: {}, 
      currentCustomer: null 
    });
  }
  
  holdSale() {
    const posState = this.app.state.getModuleState('pos');
    if (posState.cart.length === 0) {
      if (window.notiflix) {
        window.notiflix.Notify.warning('There is nothing to hold!');
      }
      return;
    }
    
    // Clear previous ref number
    $("#refNumber").val("");
    
    // Show the hold order modal
    $("#dueModal").modal("show");
  }

  async submitHoldSale(refNumber) {
    const posState = this.app.state.getModuleState('pos');
    const totals = this.calculateCartTotal();
    
    if (!posState.currentCustomer && !refNumber) {
      if (window.notiflix) {
        window.notiflix.Report.warning(
          "Reference Required!",
          "You either need to select a customer <br> or enter a reference!",
          "Ok"
        );
      }
      return;
    }

    const paymentData = {
      order: Date.now(),
      ref_number: refNumber || '',
      discount: 0,
      customer: posState.currentCustomer || { id: 0, name: 'Walk in customer' },
      status: 0, // 0 for Hold
      subtotal: parseFloat(totals.subtotal),
      tax: parseFloat(totals.tax),
      order_type: 1,
      items: posState.cart,
      date: new Date(),
      total: parseFloat(totals.total),
      paid: 0,
      change: 0,
      user: window.user?.fullname || 'Modular User',
      user_id: window.user?._id || 0
    };
    
    try {
      if (window.notiflix) window.notiflix.Block.standard('#dueModal .modal-content', 'Holding Sale...');
      
      const response = await fetch(`${window.api}new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });
      
      if (!response.ok) throw new Error('Hold sale failed');
      
      const result = await response.json();
      
      if (window.notiflix) window.notiflix.Block.remove('#dueModal .modal-content');
      
      // Clear cart and reset state
      this.cancelSale();
      
      $("#dueModal").modal("hide");
      
      if (window.notiflix) {
        window.notiflix.Report.success('Sale Held', 'Transaction held successfully!', 'Ok');
      }
      
      return result;
      
    } catch (error) {
      console.error('Error holding sale:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('#dueModal .modal-content');
        window.notiflix.Report.failure('Hold Failed', 'Failed to hold transaction', 'Ok');
      }
    }
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
    const appState = this.app.state.getModuleState('app');
    const settings = appState.settings || {};
    const cart = posState.cart;
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = 0; // TODO: Get from form
    
    let cgst = 0, sgst = 0, igst = 0, totalTax = 0;
    
    if (settings.charge_tax) {
        const taxableAmount = subtotal - discount;
        if (this.saleType === 'intra') {
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
    
    const total = subtotal - discount + totalTax;
    
    return {
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      tax: totalTax.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      igst: igst.toFixed(2),
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
            
            <div class="cart-tax-toggle mt-3 flex justify-between items-center p-2 bg-blue-50 rounded">
                <span class="text-sm font-medium">Sale Type:</span>
                <div class="btn-group btn-group-sm">
                    <button class="btn ${this.saleType === 'intra' ? 'btn-primary' : 'btn-default'}" 
                            onclick="window.pharmaApp.getModule('pos').setSaleType('intra')">Intra-state</button>
                    <button class="btn ${this.saleType === 'inter' ? 'btn-primary' : 'btn-default'}" 
                            onclick="window.pharmaApp.getModule('pos').setSaleType('inter')">Inter-state</button>
                </div>
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
        ${totals.cgst > 0 ? `
            <div class="flex justify-between mb-1 text-sm text-gray-600">
                <span>CGST:</span>
                <span>$${totals.cgst}</span>
            </div>
            <div class="flex justify-between mb-1 text-sm text-gray-600">
                <span>SGST:</span>
                <span>$${totals.sgst}</span>
            </div>
        ` : ''}
        ${totals.igst > 0 ? `
            <div class="flex justify-between mb-1 text-sm text-gray-600">
                <span>IGST:</span>
                <span>$${totals.igst}</span>
            </div>
        ` : ''}
        <div class="flex justify-between mb-2 font-medium">
          <span>Total Tax:</span>
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

  setSaleType(type) {
    this.saleType = type;
    this.render();
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
            <label class="form-label">Payment Mode</label>
            <div class="grid grid-cols-2 gap-2" id="paymentModeContainer">
              ${(this.app.state.getModuleState('app').settings?.payment_modes || ['Cash', 'Card', 'UPI', 'Net Banking']).map(mode => `
                <button class="btn btn-outline-secondary payment-method-btn ${mode === 'Cash' ? 'btn-primary active' : ''}" 
                        onclick="window.pharmaApp.getModule('pos').setPaymentMethod('${mode}', this)">
                    ${mode}
                </button>
              `).join('')}
            </div>
            <input type="hidden" id="selectedPaymentMethod" value="Cash">
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
      tax_details: {
          cgst: parseFloat(totals.cgst),
          sgst: parseFloat(totals.sgst),
          igst: parseFloat(totals.igst),
          total_tax: parseFloat(totals.tax)
      },
      order_type: 1,
      items: posState.cart,
      date: new Date(),
      payment_type: $("#selectedPaymentMethod").val() || 'Cash',
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

  setPaymentMethod(method, btn) {
      $("#selectedPaymentMethod").val(method);
      $(".payment-method-btn").removeClass("btn-primary active").addClass("btn-outline-secondary");
      $(btn).removeClass("btn-outline-secondary").addClass("btn-primary active");
  }
  
  // Customer management
  viewCustomerDetails() {
    const posState = this.app.state.getModuleState('pos');
    const customer = posState.currentCustomer;
    
    if (!customer) {
      if (window.notiflix) {
        window.notiflix.Report.warning('No Customer Selected', 'Please select a customer first to view details.', 'Ok');
      }
      return;
    }
    
    // Populate simple info
    $("#customerName").text(customer.name || 'N/A');
    $("#customerPhone").text(customer.phone || 'N/A');
    $("#customerEmail").text(customer.email || 'N/A');
    $("#customerAddress").text(customer.address || 'N/A');
    
    // Set customer ID for uploads/listings
    $("#uploadCustomerId").val(customer._id);
    
    // Reset tabs to Info
    $('#customerDetailsModal a[href="#customerInfoTab"]').tab('show');
    
    // Show modal
    $("#customerDetailsModal").modal("show");
    
    // Setup tab listener for history (lazy load)
    const self = this;
    // Unbind previous listeners to avoid multiple calls
    $('#customerDetailsModal a[data-toggle="tab"]').off('shown.bs.tab').on('shown.bs.tab', function (e) {
      var target = $(e.target).attr("href");
      if (target === "#purchaseHistoryTab") {
        self.loadCustomerPurchaseHistory(customer._id);
      }
    });
  }

  async loadCustomerPurchaseHistory(customerId) {
    const historyList = $("#customerPurchaseHistoryList");
    historyList.html('<tr><td colspan="5" class="text-center">Loading...</td></tr>');
    
    try {
      const response = await fetch(`${window.api}history/customer/${customerId}`);
      const history = await response.json();
      
      if (!history || history.length === 0) {
        historyList.html('<tr><td colspan="5" class="text-center">No purchase history found</td></tr>');
        return;
      }
      
      // Sort by date descending
      history.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const rows = history.map(tx => {
        const date = tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A';
        const orderNum = tx.order || 'N/A';
        const total = parseFloat(tx.total || 0).toFixed(2);
        const status = tx.status === 1 ? '<span class="label label-success">Completed</span>' : '<span class="label label-warning">Pending</span>';
        
        // Format items summary
        const items = tx.items ? tx.items.map(item => `${item.product_name} (x${item.quantity})`).join(', ') : 'No items';
        const itemsTruncated = items.length > 50 ? items.substring(0, 47) + '...' : items;
        
        return `
          <tr>
            <td>${date}</td>
            <td>${orderNum}</td>
            <td title="${items}">${itemsTruncated}</td>
            <td>$${total}</td>
            <td>${status}</td>
          </tr>
        `;
      }).join('');
      
      historyList.html(rows);
      
    } catch (error) {
      console.error('Error loading purchase history:', error);
      historyList.html('<tr><td colspan="5" class="text-center text-danger">Error loading history</td></tr>');
    }
  }
  
  addNewCustomer() {
    // Show the new customer modal
    $("#newCustomer").modal("show");
  }

  async shareWhatsApp(transactionId) {
    try {
        const response = await fetch(`${window.api}${transactionId}`);
        const tx = await response.json();
        const settings = this.app.state.getModuleState('app').settings || {};
        
        let message = `*Invoice from ${settings.store || 'Pharmacy'}*\n`;
        message += `Inv #: ${tx.order}\n`;
        message += `Date: ${new Date(tx.date).toLocaleDateString()}\n`;
        message += `--------------------------\n`;
        tx.items.forEach(item => {
            message += `${item.product_name} x ${item.quantity}: $${(item.price * item.quantity).toFixed(2)}\n`;
        });
        message += `--------------------------\n`;
        message += `*Total: $${parseFloat(tx.total).toFixed(2)}*\n`;
        message += `Payment: ${tx.payment_type || 'Paid'}\n`;
        message += `\nThank you for your business!`;

        const encodedMsg = encodeURIComponent(message);
        const phone = tx.customer?.phone || "";
        window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`, '_blank');
    } catch (e) {
        console.error("WhatsApp share failed", e);
    }
  }

  async shareEmail(transactionId) {
    try {
        const response = await fetch(`${window.api}${transactionId}`);
        const tx = await response.json();
        const settings = this.app.state.getModuleState('app').settings || {};
        
        const subject = `Invoice ${tx.order} from ${settings.store || 'Pharmacy'}`;
        let body = `Hello ${tx.customer?.name || 'Customer'},\n\n`;
        body += `Please find the details of your invoice ${tx.order}:\n\n`;
        tx.items.forEach(item => {
            body += `${item.product_name} x ${item.quantity}: $${(item.price * item.quantity).toFixed(2)}\n`;
        });
        body += `\nTotal Amount: $${parseFloat(tx.total).toFixed(2)}\n`;
        body += `Payment Mode: ${tx.payment_type || 'Paid'}\n\n`;
        body += `Thank you,\n${settings.store || 'Pharmacy'}`;

        const mailto = `mailto:${tx.customer?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
    } catch (e) {
        console.error("Email share failed", e);
    }
  }
}

// Make POSModule available globally
window.POSModule = POSModule;