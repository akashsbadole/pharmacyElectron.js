/**
 * POS Module - Point of Sale functionality
 */

class POSModule {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.showPayment = false;
    this.saleType = 'intra'; // intra or inter
    this.currentLoyaltyProfile = null;
    this.loyaltyDiscount = 0;
    this.pointsToEarn = 0;
    this.availableRedemptions = [];

    // Item-level discount features
    this.itemDiscounts = {}; // Track discounts per cart item
    this.showItemDiscountModal = false;
    this.currentDiscountItemIndex = null;

    this.giftStoreEnabled = false;
    this.giftWrappingOptions = [];
    this.giftBundles = [];
    this.selectedGiftServices = {};

    // Sound and feedback settings
    this.soundEnabled = true;
    this.scanSuccessCount = 0;

    // Enhanced Visual Grid Integration
    this.visualGridEnabled = true;
    this.currentViewMode = 'visual'; // 'visual' or 'traditional'
    this.mobileView = false;
    this.productDisplayMode = 'grid'; // 'grid', 'list', 'compact'
    this.enableDragAndDrop = true;
    this.recentlyViewedProducts = this.loadRecentlyViewedProducts();
    this.wishlist = this.loadWishlist();
  }
  
  initialize() {
    console.log('POS module initialized');
    
    // Initialize audit trail system
    this.initializeAuditTrailSystem();
    
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
 
    // Initialize keyboard accessibility features
    this.initializeKeyboardAccessibility();

    // Initialize gift store features
    this.initializeGiftStore();
     
    // Initialize Enhanced Visual Grid System
    this.initializeEnhancedVisualGrid();
     
    // Setup mobile detection and responsive behavior
    this.setupMobileOptimization();
     
    // Initialize customer experience features
    this.initializeCustomerExperience();
  }

  /**
   * Initialize audit trail system
   */
  initializeAuditTrailSystem() {
    try {
      // Load existing audit logs
      const existingLogs = this.getDiscountAuditLogs();
      console.log('Loaded', existingLogs.length, 'existing discount audit logs');
      
      // Clean up old logs
      this.cleanupOldAuditLogs();
      
      // Set up periodic cleanup
      setInterval(() => {
        this.cleanupOldAuditLogs();
      }, 24 * 60 * 60 * 1000); // Clean up daily
      
      console.log('Discount audit trail system initialized');
    } catch (error) {
      console.error('Error initializing audit trail system:', error);
    }
  }

  /**
   * Test the discount functionality
   */
  testDiscountFunctionality() {
    try {
      console.log('=== Testing Discount Functionality ===');
      
      // Test 1: Valid percentage discount
      const testItem1 = { price: 100, quantity: 2 };
      const testDiscount1 = { type: 'percentage', value: 10 };
      const result1 = this.calculateItemDiscountAmount(testItem1, testDiscount1);
      console.log('Test 1 - Percentage discount (10% of 200):', result1, '(expected: 20)');
      
      // Test 2: Valid fixed discount
      const testItem2 = { price: 50, quantity: 1 };
      const testDiscount2 = { type: 'fixed', value: 15 };
      const result2 = this.calculateItemDiscountAmount(testItem2, testDiscount2);
      console.log('Test 2 - Fixed discount (15 from 50):', result2, '(expected: 15)');
      
      // Test 3: Percentage discount capped at 100%
      const testItem3 = { price: 75, quantity: 1 };
      const testDiscount3 = { type: 'percentage', value: 150 };
      const result3 = this.calculateItemDiscountAmount(testItem3, testDiscount3);
      console.log('Test 3 - Percentage discount capped (150% of 75):', result3, '(expected: 75)');
      
      // Test 4: Fixed discount capped at item price
      const testItem4 = { price: 30, quantity: 1 };
      const testDiscount4 = { type: 'fixed', value: 50 };
      const result4 = this.calculateItemDiscountAmount(testItem4, testDiscount4);
      console.log('Test 4 - Fixed discount capped (50 from 30):', result4, '(expected: 30)');
      
      // Test 5: Invalid discount type
      const testItem5 = { price: 100, quantity: 1 };
      const testDiscount5 = { type: 'invalid', value: 10 };
      const result5 = this.calculateItemDiscountAmount(testItem5, testDiscount5);
      console.log('Test 5 - Invalid discount type:', result5, '(expected: 0)');
      
      // Test 6: No discount
      const testItem6 = { price: 200, quantity: 1 };
      const testDiscount6 = { type: 'none', value: 0 };
      const result6 = this.calculateItemDiscountAmount(testItem6, testDiscount6);
      console.log('Test 6 - No discount:', result6, '(expected: 0)');
      
      // Test 7: Validation function
      const validation1 = this.validateDiscountForItem(testItem1, testDiscount1);
      console.log('Test 7 - Valid discount validation:', validation1.valid, '(expected: true)');
      
      const validation2 = this.validateDiscountForItem(testItem1, { type: 'percentage', value: 150 });
      console.log('Test 8 - Invalid percentage validation:', validation2.valid, '(expected: false)');
      
      console.log('=== Discount Tests Complete ===');
      
      return true;
    } catch (error) {
      console.error('Error running discount tests:', error);
      return false;
    }
  }

  initializeKeyboardAccessibility() {
    // Add global keyboard event listener for POS shortcuts
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));

    // Initialize navigation state
    this.currentFocusSection = 'barcode'; // barcode, customer, products, cart, actions
    this.productGridIndex = 0;
    this.cartItemIndex = 0;

    // Inject accessibility CSS
    this.injectAccessibilityCSS();

    console.log('POS keyboard accessibility initialized');
  }

  injectAccessibilityCSS() {
    const css = `
      <style>
        /* Focus indicators for keyboard accessibility */
        .focusable:focus {
          outline: 2px solid #007acc;
          outline-offset: 2px;
          box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.3);
        }

        .cart-item.focused {
          background-color: rgba(0, 122, 204, 0.1);
          border-left: 4px solid #007acc;
        }

        /* Screen reader only content */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        /* High contrast focus for better visibility */
        @media (prefers-contrast: high) {
          .focusable:focus {
            outline: 3px solid #000;
            outline-offset: 1px;
          }
        }

        /* Reduced motion for users who prefer it */
        @media (prefers-reduced-motion: reduce) {
          .focusable:focus {
            transition: none;
          }
        }
      </style>
    `;

    // Inject CSS into head if not already present
    if (!document.querySelector('#pos-accessibility-css')) {
      document.head.insertAdjacentHTML('beforeend', css);
    }
  }

  handleGlobalKeydown(e) {
    console.log('POS Module: Key pressed:', e.key, 'Active element:', document.activeElement.tagName);

    // Skip if user is typing in input fields (except for specific shortcuts)
    const activeElement = document.activeElement;
    const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName);

    // Allow certain keys even in input fields for specific shortcuts
    if (isInputField && !['F2', 'F3', 'Escape'].includes(e.key)) {
      return;
    }

    switch(e.key) {
      case 'Enter':
        if (this.showPayment) {
          e.preventDefault();
          this.processPayment();
        } else if (this.currentFocusSection === 'products') {
          e.preventDefault();
          this.selectCurrentProduct();
        }
        break;

      case 'F2':
        e.preventDefault();
        this.clearBarcodeInput();
        break;

      case 'F3':
        e.preventDefault();
        this.focusBarcodeScanner();
        break;

      case 'Escape':
        e.preventDefault();
        this.handleEscapeKey();
        break;

      default:
        if (e.ctrlKey && e.key === 'h') {
          e.preventDefault();
          this.holdSale();
        } else {
          // Handle navigation keys
          this.handleNavigationKeys(e);
        }
        break;
    }
  }

  handleNavigationKeys(e) {
    const { key } = e;
    const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);
    const isTabKey = key === 'Tab';

    if (!isArrowKey && !isTabKey) return;

    e.preventDefault();

    switch(this.currentFocusSection) {
      case 'products':
        this.handleProductGridNavigation(key);
        break;
      case 'cart':
        this.handleCartNavigation(key);
        break;
      default:
        this.handleSectionNavigation(key);
        break;
    }
  }

  handleProductGridNavigation(key) {
    const productCards = document.querySelectorAll('.product-card, .widget-panel');
    if (productCards.length === 0) return;

    // Calculate grid dimensions (assuming 3 columns for medium screens)
    const columnsPerRow = 3;
    const totalRows = Math.ceil(productCards.length / columnsPerRow);

    switch(key) {
      case 'ArrowUp':
        if (this.productGridIndex >= columnsPerRow) {
          this.productGridIndex -= columnsPerRow;
        }
        break;
      case 'ArrowDown':
        if (this.productGridIndex < productCards.length - columnsPerRow) {
          this.productGridIndex += columnsPerRow;
        }
        break;
      case 'ArrowLeft':
        if (this.productGridIndex % columnsPerRow > 0) {
          this.productGridIndex -= 1;
        }
        break;
      case 'ArrowRight':
        if (this.productGridIndex % columnsPerRow < columnsPerRow - 1 && this.productGridIndex < productCards.length - 1) {
          this.productGridIndex += 1;
        }
        break;
    }

    this.focusProductCard(this.productGridIndex);
  }

  focusProductCard(index) {
    const productCards = document.querySelectorAll('.product-card, .widget-panel');
    if (productCards[index]) {
      productCards[index].focus();
      productCards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  handleCartNavigation(key) {
    const cartItems = document.querySelectorAll('.cart-item');
    if (cartItems.length === 0) return;

    switch(key) {
      case 'ArrowUp':
        this.cartItemIndex = Math.max(0, this.cartItemIndex - 1);
        break;
      case 'ArrowDown':
        this.cartItemIndex = Math.min(cartItems.length - 1, this.cartItemIndex + 1);
        break;
      case 'Delete':
        this.removeFromCart(this.cartItemIndex);
        this.cartItemIndex = Math.min(this.cartItemIndex, cartItems.length - 1);
        break;
    }

    this.focusCartItem(this.cartItemIndex);
  }

  handleSectionNavigation(key) {
    const sections = ['barcode', 'customer', 'products', 'cart', 'actions'];
    let currentIndex = sections.indexOf(this.currentFocusSection);

    switch(key) {
      case 'ArrowRight':
      case 'Tab':
        currentIndex = (currentIndex + 1) % sections.length;
        break;
      case 'ArrowLeft':
        if (key === 'ArrowLeft' || (key === 'Tab' && e.shiftKey)) {
          currentIndex = currentIndex > 0 ? currentIndex - 1 : sections.length - 1;
        }
        break;
    }

    this.currentFocusSection = sections[currentIndex];
    this.focusSection(this.currentFocusSection);
  }

  focusSection(section) {
    const focusMap = {
      barcode: '#barcodeInput',
      customer: 'select[name="customer"]',
      products: '.product-card:first',
      cart: '.cart-item:first .quantity-input',
      actions: '.pos-actions button:first'
    };

    const selector = focusMap[section];
    if (selector) {
      const element = document.querySelector(selector);
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  focusCartItem(index) {
    const cartItems = document.querySelectorAll('.cart-item');
    if (cartItems[index]) {
      const quantityInput = cartItems[index].querySelector('.quantity-input');
      if (quantityInput) {
        quantityInput.focus();
        quantityInput.select();
        cartItems[index].classList.add('focused');
      }
    }

    // Remove focus from other items
    cartItems.forEach((item, i) => {
      if (i !== index) {
        item.classList.remove('focused');
      }
    });
  }

  clearBarcodeInput() {
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) {
      barcodeInput.value = '';
      barcodeInput.focus();
      this.showBarcodeFeedback('info', 'Barcode input cleared');
    }
  }

  focusBarcodeScanner() {
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) {
      barcodeInput.focus();
      barcodeInput.select();
    }
  }

  handleEscapeKey() {
    if (this.showPayment) {
      this.hidePaymentInterface();
    } else {
      // Close any open modals
      const openModal = document.querySelector('.modal.show');
      if (openModal) {
        const closeBtn = openModal.querySelector('.close, [data-dismiss="modal"]');
        if (closeBtn) closeBtn.click();
      }
    }
  }

  selectCurrentProduct() {
    // This will be implemented when we have product grid navigation
    console.log('Select current product');
  }

  showBarcodeFeedback(status, message) {
    // Use existing method if available
    if (typeof this.showBarcodeFeedback === 'function') {
      this.showBarcodeFeedback(status, message);
    } else {
      console.log('Barcode feedback:', status, message);
    }
  }
  
  async initializeGiftStore() {
    try {
      // Enable gift store features
      this.giftStoreEnabled = true;
      
      // Load gift store data
      await Promise.all([
        this.loadGiftWrappingOptions(),
        this.loadGiftBundles()
      ]);
      
      console.log('Gift store features initialized successfully');
    } catch (error) {
      console.error('Error initializing gift store features:', error);
      this.giftStoreEnabled = false;
    }
  }
  
  async loadGiftWrappingOptions() {
    try {
      const response = await fetch(`${window.api}gift_store/wrapping/styles`);
      const wrappingOptions = await response.json();
      
      this.giftWrappingOptions = wrappingOptions.filter(w => w.availability?.is_available);
    } catch (error) {
      console.error('Error loading gift wrapping options:', error);
      this.giftWrappingOptions = [];
    }
  }
  
  async loadGiftBundles() {
    try {
      const response = await fetch(`${window.api}gift_store/bundles/available`);
      const bundles = await response.json();
      
      this.giftBundles = bundles.filter(b => b.availability?.is_available);
    } catch (error) {
      console.error('Error loading gift bundles:', error);
      this.giftBundles = [];
    }
  }
  
  onActivate() {
    this.loadInitialData();
    
    // Load enhanced visual grid if enabled
    if (this.visualGridEnabled) {
      this.renderEnhancedVisualInterface();
    }
    
    // Setup mobile-optimized interface if needed
    this.setupMobileInterface();
  }
  
  async loadInitialData() {
    // Load products, customers, and combos
    await Promise.all([
      this.loadProducts(),
      this.loadCustomers(),
      this.loadCombos()
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
  
  async loadCombos() {
    try {
      const response = await fetch(`${window.api}combos/combos`);
      const combos = await response.json();
      
      this.app.state.updateModule('pos', { combos });
    } catch (error) {
      console.error('Error loading combos:', error);
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
  
  async selectCustomer(customerId) {
    const customers = this.app.state.getModuleState('pos').customers;
    const customer = customers.find(c => c._id == customerId);
    
    // Load loyalty profile if customer is selected
    if (customer && customerId) {
      await this.loadCustomerLoyaltyProfile(customerId);
    } else {
      this.currentLoyaltyProfile = null;
      this.loyaltyDiscount = 0;
      this.pointsToEarn = 0;
      this.availableRedemptions = [];
    }
    
    this.app.state.updateModule('pos', { currentCustomer: customer || null });
    this.render();
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

      const response = await fetch(`${window.api}transactions/new`, {
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

      const response = await fetch(`${window.api}transactions/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      // Award loyalty points if customer is selected
      if (paymentData.customer && paymentData.customer._id && this.pointsToEarn > 0) {
        await this.awardLoyaltyPoints(paymentData.customer._id, this.pointsToEarn, 'Purchase', paymentData.total);
      }

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

      // Auto-save receipt after successful transaction
      try {
        await this.autoSaveReceipt(result);
      } catch (receiptError) {
        console.warn('Receipt auto-save failed, but transaction was successful:', receiptError);
        // Don't fail the transaction for receipt save errors
      }

      // Show success message with loyalty info
      const loyaltyMessage = this.pointsToEarn > 0 ?
        `Transaction completed! You earned ${this.pointsToEarn} loyalty points.` :
        'Transaction completed successfully!';

      if (window.notiflix) {
        window.notiflix.Report.success('Sale Completed', loyaltyMessage, 'Ok');
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
    
    // Calculate automatic promotions
    this.calculatePromotions().then(promoResult => {
      const totalDiscount = parseFloat(promoResult.total_discount || 0);
      this.updateCartDisplayWithPromotions(promoResult);
      
      let cgst = 0, sgst = 0, igst = 0, totalTax = 0;
      
      if (settings.charge_tax) {
          const taxableAmount = subtotal - totalDiscount;
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
      
      const total = subtotal - totalDiscount + totalTax;
      
      this.app.state.updateModule('pos', {
        cartTotals: {
          subtotal: subtotal.toFixed(2),
          discount: totalDiscount.toFixed(2),
          tax: totalTax.toFixed(2),
          cgst: cgst.toFixed(2),
          sgst: sgst.toFixed(2),
          igst: igst.toFixed(2),
          total: total.toFixed(2),
          items: cart.length,
          promotions: promoResult
        }
      });
      
      this.render(); // Re-render to show updated totals
    });
    
    // Return current totals while promotions are being calculated
    const currentDiscount = posState.cartTotals?.discount || 0;
    const currentTotal = subtotal - currentDiscount;
    
    return {
      subtotal: subtotal.toFixed(2),
      discount: currentDiscount.toFixed(2),
      tax: '0.00',
      cgst: '0.00',
      sgst: '0.00',
      igst: '0.00',
      total: currentTotal.toFixed(2),
      items: cart.length
    };
  }
  
  async searchProduct(barcode) {
    try {
      // First try variant barcode lookup
      const variantResponse = await fetch(`${window.api}barcode/variant/${encodeURIComponent(barcode)}`);
      
      if (variantResponse.ok) {
        const variantData = await variantResponse.json();
        
        if (variantData.type === 'variant') {
          // Found a variant - show variant selection modal
          return {
            ...variantData,
            is_variant: true,
            needs_variant_selection: true
          };
        } else if (variantData.type === 'product') {
          // Found a regular product
          return {
            ...variantData.product,
            is_variant: false,
            tracking_method: 'aggregate'
          };
        }
      }
      
      // Fallback to regular product search
      const response = await fetch(`${window.api}inventory/product/sku`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ skuCode: barcode })
      });
      
      const product = await response.json();
      return {
        ...product,
        is_variant: false,
        tracking_method: 'aggregate'
      };
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
          ${this.renderComboSelector()}
        </div>
         
        <div class="pos-right-panel">
          ${this.renderShoppingCart(posState.cart, totals)}
          ${this.renderPOSActions(totals)}
        </div>
      </div>
      
      ${this.showPayment ? this.renderPaymentInterface(totals) : ''}
      
      <!-- Appivo.in POS Footer -->
    </div>
  `;
  }
  
  /**
   * Search customers by phone number - called on keyup with debounce
   */
  async searchCustomersByPhone(phoneInput) {
    const phone = phoneInput.value.trim();
    const resultsContainer = document.getElementById('customer-search-results');
    
    // Clear results if less than 3 characters
    if (phone.length < 3) {
      if (resultsContainer) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
      }
      return;
    }
    
    // Show loading indicator
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="p-3 text-center text-muted">
          <i class="fa fa-spinner fa-spin"></i> Searching...
        </div>
      `;
      resultsContainer.style.display = 'block';
    }
    
    try {
      const response = await fetch(`${window.api}customers/search/phone/${encodeURIComponent(phone)}`);
      const customers = await response.json();
      
      this.displayCustomerSearchResults(customers, phone);
    } catch (error) {
      console.error('Error searching customers by phone:', error);
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="p-3 text-center text-danger">
            <i class="fa fa-exclamation-triangle"></i> Search failed. Please try again.
          </div>
        `;
      }
    }
  }
  
  /**
   * Display customer search results in dropdown
   */
  displayCustomerSearchResults(customers, searchPhone) {
    const resultsContainer = document.getElementById('customer-search-results');
    if (!resultsContainer) return;
    
    if (!customers || customers.length === 0) {
      // No customers found - show create new option
      resultsContainer.innerHTML = `
        <div class="customer-search-no-results p-3">
          <div class="text-center text-muted mb-2">
            <i class="fa fa-user-plus"></i> No customer found with this number
          </div>
          <button class="btn btn-success btn-sm btn-block" 
                  onclick="window.pharmaApp.getModule('pos').createNewCustomerWithPhone('${searchPhone}')">
            <i class="fa fa-plus"></i> Create new customer with ${searchPhone}
          </button>
        </div>
      `;
      resultsContainer.style.display = 'block';
      return;
    }
    
    if (customers.length === 1) {
      // Single customer found - auto-select
      this.selectCustomerByData(customers[0]);
      resultsContainer.innerHTML = '';
      resultsContainer.style.display = 'none';
      
      // Clear search input
      const searchInput = document.getElementById('customer-phone-search');
      if (searchInput) searchInput.value = '';
      
      if (window.notiflix) {
        window.notiflix.Notify.success(`Customer "${customers[0].name}" selected`);
      }
      return;
    }
    
    // Multiple customers found - show list for selection
    const currentCustomerId = this.app.state.getModuleState('pos').currentCustomer?._id;
    
    resultsContainer.innerHTML = `
      <div class="customer-search-results-list">
        <div class="p-2 bg-light border-bottom">
          <small class="text-muted">${customers.length} customers found</small>
        </div>
        ${customers.map(customer => `
          <div class="customer-search-result-item p-3 border-bottom cursor-pointer hover-bg-light ${currentCustomerId === customer._id ? 'bg-success-light' : ''}" 
               onclick="window.pharmaApp.getModule('pos').selectCustomerByData(${JSON.stringify(customer).replace(/"/g, '&quot;')})">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <div class="font-medium">${customer.name}</div>
                <div class="text-sm text-muted">
                  <i class="fa fa-phone"></i> ${customer.phone || 'N/A'}
                  ${customer.email ? `<span class="ml-2"><i class="fa fa-envelope"></i> ${customer.email}</span>` : ''}
                </div>
              </div>
              <div class="text-right">
                ${customer.loyalty_program?.tier ? 
                  `<span class="badge badge-warning"><i class="fa fa-star"></i> ${customer.loyalty_program.tier}</span>` : ''
                }
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    resultsContainer.style.display = 'block';
  }
  
  /**
   * Select customer from search results and update state
   */
  async selectCustomerByData(customerData) {
    // Store selected customer data
    this.app.state.updateModule('pos', { currentCustomer: customerData });
    
    // Load loyalty profile if customer is selected
    if (customerData && customerData._id) {
      await this.loadCustomerLoyaltyProfile(customerData._id);
    } else {
      this.currentLoyaltyProfile = null;
      this.loyaltyDiscount = 0;
      this.pointsToEarn = 0;
      this.availableRedemptions = [];
    }
    
    // Clear search results
    const resultsContainer = document.getElementById('customer-search-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = '';
      resultsContainer.style.display = 'none';
    }
    
    // Clear search input
    const searchInput = document.getElementById('customer-phone-search');
    if (searchInput) searchInput.value = '';
    
    // Re-render to show updated selection
    this.render();
    
    if (window.notiflix) {
      window.notiflix.Notify.success(`Customer "${customerData.name}" selected`);
    }
  }
  
  /**
   * Create new customer with phone number from search
   */
  async createNewCustomerWithPhone(phone) {
    try {
      if (window.notiflix) {
        window.notiflix.Notify.info('Creating new customer...', `Phone: ${phone}`);
      }
      
      // Show the new customer modal with phone pre-filled
      const customerModalHtml = `
        <div class="customer-quick-create-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
             id="customerQuickCreateModal">
          <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold">
                <i class="fa fa-user-plus text-success"></i> Create New Customer
              </h3>
              <button onclick="window.pharmaApp.getModule('pos').hideCustomerQuickCreateModal()" class="text-gray-500">
                <i class="fa fa-times"></i>
              </button>
            </div>
            
            <form id="quickCreateCustomerForm" onsubmit="window.pharmaApp.getModule('pos').handleQuickCreateCustomer(event)">
              <input type="hidden" id="quickCustomerPhone" value="${phone}">
              
              <div class="form-group mb-3">
                <label class="form-label">Customer Name *</label>
                <input type="text" class="form-input" id="quickCustomerName" required 
                       placeholder="Enter customer name">
              </div>
              
              <div class="form-group mb-3">
                <label class="form-label">Phone Number *</label>
                <input type="text" class="form-input" id="quickCustomerPhoneDisplay" 
                       value="${phone}" readonly>
              </div>
              
              <div class="form-group mb-3">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" id="quickCustomerEmail" 
                       placeholder="Enter email (optional)">
              </div>
              
              <div class="form-group mb-3">
                <label class="form-label">Address</label>
                <textarea class="form-input" id="quickCustomerAddress" rows="2" 
                          placeholder="Enter address (optional)"></textarea>
              </div>
              
              <div class="flex gap-3 mt-4">
                <button type="button" class="btn btn-secondary flex-1" 
                        onclick="window.pharmaApp.getModule('pos').hideCustomerQuickCreateModal()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-success flex-1">
                  <i class="fa fa-check"></i> Create Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', customerModalHtml);
      
      // Clear search results
      const resultsContainer = document.getElementById('customer-search-results');
      if (resultsContainer) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
      }
      
      // Focus on name input
      setTimeout(() => {
        document.getElementById('quickCustomerName')?.focus();
      }, 100);
      
    } catch (error) {
      console.error('Error creating customer modal:', error);
    }
  }
  
  /**
   * Hide the quick customer create modal
   */
  hideCustomerQuickCreateModal() {
    const modal = document.getElementById('customerQuickCreateModal');
    if (modal) {
      modal.remove();
    }
  }
  
  /**
   * Handle quick customer creation form submission
   */
  async handleQuickCreateCustomer(event) {
    event.preventDefault();
    
    const name = document.getElementById('quickCustomerName').value.trim();
    const phone = document.getElementById('quickCustomerPhone').value.trim();
    const email = document.getElementById('quickCustomerEmail').value.trim();
    const address = document.getElementById('quickCustomerAddress').value.trim();
    
    if (!name || !phone) {
      if (window.notiflix) {
        window.notiflix.Report.warning('Missing Information', 'Name and phone are required', 'Ok');
      }
      return;
    }
    
    try {
      if (window.notiflix) {
        window.notiflix.Block.standard('#customerQuickCreateModal .modal-content', 'Creating customer...');
      }
      
      const response = await fetch(`${window.api}customers/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          phone: phone,
          email: email,
          address: address
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create customer');
      }
      
      const newCustomer = await response.json();
      
      if (window.notiflix) {
        window.notiflix.Block.remove('#customerQuickCreateModal .modal-content');
      }
      
      // Hide modal
      this.hideCustomerQuickCreateModal();
      
      // Select the newly created customer
      await this.selectCustomerByData(newCustomer);
      
      // Refresh customer list
      await this.loadCustomers();
      
      if (window.notiflix) {
        window.notiflix.Notify.success('Customer Created', `"${newCustomer.name}" has been added successfully`);
      }
      
    } catch (error) {
      console.error('Error creating customer:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('#customerQuickCreateModal .modal-content');
        window.notiflix.Report.failure('Error', 'Failed to create customer: ' + error.message, 'Ok');
      }
    }
  }
  
  /**
   * Close search results when clicking outside
   */
  closeCustomerSearchResults() {
    const resultsContainer = document.getElementById('customer-search-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = '';
      resultsContainer.style.display = 'none';
    }
  }
  
  renderCustomerSelector(currentCustomer) {
    const customers = this.app.state.getModuleState('pos').customers;
    
    return `
      <div class="customer-selector mb-6">
        <div class="card">
          <div class="card-body">
            <label class="form-label">Customer</label>
            
            <!-- Phone Search Input -->
            <div class="customer-phone-search mb-3 position-relative">
              <div class="input-group input-group-sm">
                <span class="input-group-addon"><i class="fa fa-phone"></i></span>
                <input type="text" 
                       id="customer-phone-search"
                       class="form-control" 
                       placeholder="Search by mobile number..."
                       onkeyup="window.pharmaApp.getModule('pos').handlePhoneSearchKeyup(event)"
                       onblur="window.pharmaApp.getModule('pos').handlePhoneSearchBlur()"
                       autocomplete="off">
                <span class="input-group-addon bg-light">
                  <i class="fa fa-search text-muted"></i>
                </span>
              </div>
              
              <!-- Search Results Dropdown -->
              <div id="customer-search-results" 
                   class="customer-search-results-dropdown position-absolute w-100 bg-white border rounded shadow-lg mt-1" 
                   style="display: none; z-index: 1000; max-height: 300px; overflow-y: auto;">
              </div>
            </div>
            
            <!-- Customer Selection Dropdown -->
            <div class="input-group">
              <select class="form-select" id="customer-select" onchange="window.pharmaApp.getModule('pos').selectCustomer(this.value)">
                <option value="">Walk in customer</option>
                ${customers.map(customer => 
                  `<option value="${customer._id}" ${currentCustomer?._id === customer._id ? 'selected' : ''}>
                    ${customer.name} ${customer.phone ? `(${customer.phone})` : ''}
                  </option>`
                ).join('')}
              </select>
              <button class="btn btn-info" onclick="window.pharmaApp.getModule('pos').viewCustomerDetails()" title="View Details">
                <i class="fa fa-eye"></i>
              </button>
              <button class="btn btn-success" onclick="window.pharmaApp.getModule('pos').addNewCustomer()" title="Add New Customer">
                <i class="fa fa-plus"></i>
              </button>
            </div>
            
            <!-- Selected Customer Info -->
            ${currentCustomer ? `
              <div class="selected-customer-info mt-3 p-2 bg-success-light rounded">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <strong><i class="fa fa-user"></i> ${currentCustomer.name}</strong>
                    ${currentCustomer.phone ? `<span class="text-muted ml-2"><i class="fa fa-phone"></i> ${currentCustomer.phone}</span>` : ''}
                  </div>
                  <button class="btn btn-sm btn-outline-danger" onclick="window.pharmaApp.getModule('pos').clearCustomerSelection()">
                    <i class="fa fa-times"></i> Clear
                  </button>
                </div>
              </div>
            ` : ''}
            
            ${this.renderLoyaltyInfo()}
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Handle phone search keyup with debounce
   */
  handlePhoneSearchKeyup(event) {
    // Clear previous debounce
    if (this.phoneSearchDebounce) {
      clearTimeout(this.phoneSearchDebounce);
    }
    
    const input = event.target;
    
    // Debounce search - wait 300ms after typing stops
    this.phoneSearchDebounce = setTimeout(() => {
      this.searchCustomersByPhone(input);
    }, 300);
  }
  
  /**
   * Handle blur - close results if not clicking on them
   */
  handlePhoneSearchBlur() {
    // Small delay to allow click events on results
    setTimeout(() => {
      this.closeCustomerSearchResults();
    }, 200);
  }
  
  /**
   * Clear customer selection
   */
  clearCustomerSelection() {
    this.app.state.updateModule('pos', { currentCustomer: null });
    this.currentLoyaltyProfile = null;
    this.loyaltyDiscount = 0;
    this.pointsToEarn = 0;
    this.availableRedemptions = [];
    
    // Reset select dropdown
    const select = document.getElementById('customer-select');
    if (select) select.value = '';
    
    this.render();
    
    if (window.notiflix) {
      window.notiflix.Notify.info('Customer Cleared', 'Customer selection has been cleared');
    }
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
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0" id="barcode-scanner-heading">
              <i class="fa fa-barcode"></i> Barcode Scanner
            </h5>
            <div class="scanner-controls d-flex gap-2">
              <button class="btn btn-sm ${this.soundEnabled ? 'btn-success' : 'btn-secondary'}"
                      onclick="window.pharmaApp.getModule('pos').toggleSound()"
                      title="${this.soundEnabled ? 'Disable sound notifications' : 'Enable sound notifications'}"
                      aria-label="${this.soundEnabled ? 'Disable sound notifications' : 'Enable sound notifications'}">
                <i class="fa ${this.soundEnabled ? 'fa-volume-up' : 'fa-volume-off'}"></i>
              </button>
              <button class="btn btn-sm btn-info"
                      onclick="window.pharmaApp.getModule('pos').showScannerHelp()"
                      title="Scanner help and tips"
                      aria-label="Scanner help and tips">
                <i class="fa fa-question-circle"></i>
              </button>
            </div>
          </div>
          <div class="card-body">
            <form id="barcodeForm" onsubmit="window.pharmaApp.getModule('pos').handleBarcodeSubmit(event)" role="search" aria-labelledby="barcode-scanner-heading">
              <div class="input-group">
                <div class="input-group-prepend">
                  <span class="input-group-text" aria-hidden="true">
                    <i class="fa fa-barcode"></i>
                  </span>
                </div>
                <input type="text" id="barcodeInput" class="form-control form-control-lg"
                       placeholder="Scan barcode or type number"
                       autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
                       aria-label="Barcode scanner input"
                       aria-describedby="barcode-help">
                <div class="input-group-append">
                  <button type="submit" class="btn btn-primary btn-lg" aria-label="Scan barcode">
                    <i class="fa fa-search"></i>
                    <span class="d-none d-sm-inline ml-1">Scan</span>
                  </button>
                </div>
              </div>
              <div id="barcode-help" class="sr-only">Press F2 to clear input, F3 to focus scanner, Enter to scan</div>
            </form>

            <!-- Enhanced feedback display -->
            <div id="barcodeFeedback" class="barcode-feedback mt-3" style="display: none;" role="status" aria-live="polite">
              <!-- Dynamic feedback content will be inserted here -->
            </div>

            <!-- Scan statistics (hidden by default, can be shown in help) -->
            <div class="scan-stats mt-2 text-muted small" id="scanStats" style="display: none;" aria-hidden="true">
              <i class="fa fa-chart-bar"></i> Today's scans: <span id="scanCount">${this.scanSuccessCount}</span>
            </div>

            <!-- Quick actions -->
            <div class="mt-3 d-flex flex-wrap gap-2">
              <button class="btn btn-outline-secondary btn-sm"
                      onclick="window.pharmaApp.getModule('pos').clearBarcodeInput()"
                      aria-label="Clear barcode input (F2)">
                <i class="fa fa-times"></i> Clear
              </button>
              <button class="btn btn-outline-info btn-sm"
                      onclick="window.pharmaApp.getModule('pos').showRecentScans()"
                      aria-label="Show recent scans">
                <i class="fa fa-history"></i> Recent
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderComboSelector() {
    const posState = this.app.state.getModuleState('pos');
    const combos = posState.combos || [];
    const availableCombos = combos.filter(combo => combo.is_active && combo.is_currently_available);
    
    return `
      <div class="combo-selector mb-6">
        <div class="card">
          <div class="card-body">
            <label class="form-label">Combo Meals</label>
            <button class="btn btn-success w-full" 
                    onclick="window.pharmaApp.getModule('pos').showComboSelector()"
                    ${availableCombos.length === 0 ? 'disabled' : ''}>
              <i class="fa fa-utensils"></i> 
              Select Combo (${availableCombos.length} available)
            </button>
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
            <h3 class="card-title" id="cart-heading">Cart Items (${cart.length})</h3>
          </div>
          <div class="card-body">
            <div class="cart-items" style="max-height: 400px; overflow-y: auto;" role="list" aria-labelledby="cart-heading">
              ${cart.length === 0 ?
                '<div class="text-center text-gray-500 py-8" role="status" aria-live="polite">Cart is empty</div>' :
                cart.map((item, index) => `
                  <div class="cart-item flex items-center gap-3 p-3 border-b focusable" tabindex="0"
                       role="listitem"
                       aria-label="${item.product_name}, quantity ${item.quantity}, price ${(item.price * item.quantity).toFixed(2)}. Use arrow keys to navigate, Delete to remove"
                       data-cart-index="${index}">
                    <div class="flex-1">
                      <div class="font-medium">${item.product_name}</div>
                      <div class="text-sm text-gray-500">${item.sku}</div>
                    </div>
                    <div class="flex items-center gap-2">
                      <button class="btn btn-sm btn-secondary"
                              onclick="window.pharmaApp.getModule('pos').updateCartQuantity(${index}, ${item.quantity - 1})"
                              aria-label="Decrease quantity for ${item.product_name}">-</button>
                      <input type="number" class="form-input quantity-input" style="width: 60px"
                             value="${item.quantity}" min="1"
                             onchange="window.pharmaApp.getModule('pos').updateCartQuantity(${index}, this.value)"
                             aria-label="Quantity for ${item.product_name}">
                      <button class="btn btn-sm btn-secondary"
                              onclick="window.pharmaApp.getModule('pos').updateCartQuantity(${index}, ${item.quantity + 1})"
                              aria-label="Increase quantity for ${item.product_name}">+</button>
                    </div>
                    <div class="text-right">
                      <div class="font-medium">${(item.price * item.quantity).toFixed(2)}</div>
                      <div class="text-sm text-gray-500">${item.price.toFixed(2)} each</div>
                    </div>
                    <button class="btn btn-sm btn-danger"
                            onclick="window.pharmaApp.getModule('pos').removeFromCart(${index})"
                            aria-label="Remove ${item.product_name} from cart">
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
            
            <!-- Promotion Controls -->
            <div class="promotion-controls mt-3 flex gap-2">
                <button class="btn btn-info btn-sm" onclick="window.pharmaApp.getModule('pos').showPromotionCodeEntry()">
                    <i class="fa fa-ticket"></i> Apply Code
                </button>
                <button class="btn btn-success btn-sm" onclick="window.pharmaApp.getModule('pos').showPromotionDetails()">
                    <i class="fa fa-tags"></i> View Promotions
                </button>
            </div>
            
            <!-- Promotion Badge -->
            <div class="promotion-badge mt-2 p-2 bg-green-50 rounded border-l-4 border-green-400" style="display: none;">
                <i class="fa fa-tags text-success"></i>
                <span class="text-success font-medium"></span>
            </div>
            
            ${cart.length > 0 ? this.renderCartTotals(totals) : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  renderCartTotals(totals) {
    const posState = this.app.state.getModuleState('pos');
    const cartTotals = posState.cartTotals;
    const promotions = cartTotals?.promotions;
    
    const totalDiscount = (parseFloat(totals.discount) + this.loyaltyDiscount).toFixed(2);
    const finalTotal = (parseFloat(totals.total) - this.loyaltyDiscount).toFixed(2);
    
    return `
      <div class="cart-totals mt-4 p-4 bg-gray-50 rounded">
        <div class="flex justify-between mb-2">
          <span>Total Items:</span>
          <span>${totals.items}</span>
        </div>
        <div class="flex justify-between mb-2">
          <span>Subtotal:</span>
          <span>₹${totals.subtotal}</span>
        </div>
        
        ${totals.cgst > 0 ? `
            <div class="flex justify-between mb-1 text-sm text-gray-600">
                <span>CGST:</span>
                <span>₹${totals.cgst}</span>
            </div>
            <div class="flex justify-between mb-1 text-sm text-gray-600">
                <span>SGST:</span>
                <span>₹${totals.sgst}</span>
            </div>
        ` : ''}
        ${totals.igst > 0 ? `
            <div class="flex justify-between mb-1 text-sm text-gray-600">
                <span>IGST:</span>
                <span>₹${totals.igst}</span>
            </div>
        ` : ''}
        
        ${promotions && promotions.applicable_promotions.length > 0 ? `
            <div class="discount-breakdown mb-2">
                <div class="flex justify-between text-sm text-green-600">
                    <span>Promotions Applied:</span>
                    <span>-₹${totals.discount}</span>
                </div>
                <div class="text-xs text-gray-500 mt-1">
                    ${promotions.applicable_promotions.map(promo => 
                        `${promo.rule_name || promo.campaign_name}: ₹${promo.discount_amount.toFixed(2)}`
                    ).join(', ')}
                </div>
            </div>
        ` : ''}
        
        ${this.loyaltyDiscount > 0 ? `
            <div class="loyalty-discount mb-2">
                <div class="flex justify-between text-sm text-primary">
                    <span><i class="fa fa-star"></i> Loyalty Discount:</span>
                    <span>-₹${this.loyaltyDiscount.toFixed(2)}</span>
                </div>
                <div class="text-xs text-muted mt-1">
                    ${this.currentLoyaltyProfile?.tier?.tier?.toUpperCase() || 'BRONZE'} Member Benefit
                </div>
            </div>
        ` : ''}
        
        <div class="flex justify-between mb-2 font-medium">
          <span>Total Tax:</span>
          <span>₹${totals.tax}</span>
        </div>
        
        <div class="flex justify-between font-bold text-lg border-t pt-2">
          <span>TOTAL:</span>
          <span class="${totalDiscount > 0 ? 'text-green-600' : ''}">₹${finalTotal}</span>
        </div>
        
        ${(totalDiscount > 0 || this.loyaltyDiscount > 0) ? `
            <div class="text-center text-sm text-green-600 mt-2">
                <i class="fa fa-check-circle"></i> You saved ₹${totalDiscount}!
            </div>
        ` : ''}
        
        ${this.pointsToEarn > 0 ? `
            <div class="loyalty-points-info mt-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                <div class="text-sm text-blue-800">
                    <i class="fa fa-gift"></i> You'll earn <strong>${this.pointsToEarn}</strong> loyalty points with this purchase!
                </div>
            </div>
        ` : ''}
        
        ${this.availableRedemptions.length > 0 ? `
            <div class="available-rewards mt-2">
                <button class="btn btn-outline-primary btn-sm w-100" onclick="window.pharmaApp.getModule('pos').showLoyaltyRewardsModal()">
                    <i class="fa fa-star"></i> Redeem Points (${this.currentLoyaltyProfile?.points?.balance || 0} available)
                </button>
            </div>
        ` : ''}
      </div>
    `;
  }
  
  renderPOSActions(totals) {
    return `
      <div class="pos-actions mt-6" role="toolbar" aria-label="POS actions">
        <div class="grid grid-cols-2 gap-3">
          <button class="btn btn-danger focusable" onclick="window.pharmaApp.getModule('pos').cancelSale()"
                  aria-label="Cancel current sale">
            <i class="fa fa-ban"></i> Cancel
          </button>
          <button class="btn btn-warning focusable" onclick="window.pharmaApp.getModule('pos').holdSale()"
                  aria-label="Hold current sale (Ctrl+H)">
            <i class="fa fa-hand-paper-o"></i> Hold
          </button>
        </div>

        <!-- Gift Store Actions -->
        ${this.giftStoreEnabled ? `
          <div class="gift-actions mt-3 pt-3 border-t border-gray-200">
            <div class="flex gap-2 mb-3">
              <button class="btn btn-sm btn-purple focusable" onclick="window.pharmaApp.getModule('pos').showGiftServicesModal()"
                      ${totals.items === 0 ? 'disabled' : ''}
                      aria-label="Add gift services to order">
                <i class="fa fa-gift"></i> Add Gift Services
              </button>
              <button class="btn btn-sm btn-cyan focusable" onclick="window.pharmaApp.getModule('pos').showGiftBundleSelector()"
                      ${this.giftBundles.length === 0 ? 'disabled' : ''}
                      aria-label="Select gift bundle">
                <i class="fa fa-box"></i> Add Gift Bundle
              </button>
            </div>

            ${Object.keys(this.selectedGiftServices).length > 0 ? `
              <div class="selected-gift-services p-2 bg-purple-50 rounded border border-purple-200" role="status" aria-live="polite">
                <div class="text-xs text-purple-800 font-medium mb-1">Selected Gift Services:</div>
                <div class="text-xs text-purple-600">
                  ${this.selectedGiftServices.gift_wrapping ? `Gift Wrapping (₹${this.selectedGiftServices.gift_wrapping.cost})` : ''}
                  ${this.selectedGiftServices.gift_receipt ? ' | Gift Receipt' : ''}
                  ${this.selectedGiftServices.gift_card ? ` | Gift Card (₹${this.selectedGiftServices.gift_card.value})` : ''}
                </div>
                <div class="text-xs text-purple-600 mt-1">
                  Total Gift Services: ₹${this.calculateGiftServicesTotal().toFixed(2)}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <button class="btn btn-success btn-lg w-full mt-3 focusable"
                onclick="window.pharmaApp.getModule('pos').showPaymentInterface()"
                ${totals.items === 0 ? 'disabled' : ''}
                aria-label="Proceed to payment (Enter)">
          <i class="fa fa-money"></i> Pay ₹${totals.total}
        </button>
      </div>
    `;
  }

  setSaleType(type) {
    this.saleType = type;
    this.render();
  }
  
  renderPaymentInterface(totals) {
    const giftServicesTotal = this.calculateGiftServicesTotal();
    const finalTotal = parseFloat(totals.total) + giftServicesTotal;

    return `
      <div class="payment-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
        <div class="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 id="payment-modal-title" class="text-lg font-semibold">Payment</h3>
            <button onclick="window.pharmaApp.getModule('pos').hidePaymentInterface()" class="text-gray-500" aria-label="Close payment modal (Escape)">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          ${giftServicesTotal > 0 ? `
            <div class="gift-services-summary mb-4 p-3 bg-purple-50 rounded border border-purple-200">
              <h5 class="font-medium mb-2 text-purple-800">Gift Services Selected</h5>
              <div class="text-sm text-purple-600">
                ${this.selectedGiftServices.gift_wrapping ? `Gift Wrapping: ₹${this.selectedGiftServices.gift_wrapping.cost.toFixed(2)}` : ''}
                ${this.selectedGiftServices.gift_receipt ? '<br>Gift Receipt: Free' : ''}
                ${this.selectedGiftServices.gift_card ? `<br>Gift Card: ₹${this.selectedGiftServices.gift_card.value.toFixed(2)}` : ''}
              </div>
              <div class="text-sm font-medium text-purple-800 mt-1">
                Gift Services Total: ₹${giftServicesTotal.toFixed(2)}
              </div>
            </div>
          ` : ''}
          
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
          
          <!-- Gift Card Payment Option -->
          ${this.selectedGiftServices.gift_card ? `
            <div class="gift-card-payment mb-4 p-3 bg-pink-50 rounded border border-pink-200">
              <h5 class="font-medium mb-2 text-pink-800">Gift Card Payment</h5>
              <div class="form-group mb-2">
                <label class="form-label">Gift Card Number</label>
                <input type="text" class="form-input" id="giftCardNumber" placeholder="GC-XXXX-XXXX-XXXX">
              </div>
              <div class="form-group mb-2">
                <label class="form-label">PIN (if required)</label>
                <input type="password" class="form-input" id="giftCardPIN" placeholder="4-digit PIN">
              </div>
              <div class="text-sm text-pink-600">
                Available: ₹${this.selectedGiftServices.gift_card.value.toFixed(2)}
              </div>
            </div>
          ` : ''}
          
          <div class="payment-amount mb-4">
            <label class="form-label">Amount Paid</label>
            <input type="number" class="form-input" id="paymentAmount" step="0.01" 
                   placeholder="${finalTotal.toFixed(2)}" value="${finalTotal.toFixed(2)}"
                   onchange="window.pharmaApp.getModule('pos').calculateChange()">
          </div>
          
          <div class="payment-calculation mb-4">
            <div class="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>₹${totals.subtotal}</span>
            </div>
            ${totals.discount > 0 ? `
                <div class="flex justify-between mb-2 text-sm text-green-600">
                    <span>Promotions:</span>
                    <span>-₹${totals.discount}</span>
                </div>
            ` : ''}
            <div class="flex justify-between mb-2">
              <span>Tax:</span>
              <span>₹${totals.tax}</span>
            </div>
            ${giftServicesTotal > 0 ? `
              <div class="flex justify-between mb-2 text-sm text-purple-600">
                <span>Gift Services:</span>
                <span>₹${giftServicesTotal.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="flex justify-between mb-2 font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>₹${finalTotal.toFixed(2)}</span>
            </div>
            <div class="flex justify-between mb-2">
              <span>Paid:</span>
              <span id="amountPaid">₹${finalTotal.toFixed(2)}</span>
            </div>
            <div class="flex justify-between font-bold">
              <span>Change:</span>
              <span id="changeAmount">₹0.00</span>
            </div>
            ${totals.discount > 0 ? `
                <div class="text-center text-sm text-green-600 mt-2 p-2 bg-green-50 rounded">
                    <i class="fa fa-tags"></i> You saved ₹${totals.discount} with promotions!
                </div>
            ` : ''}
          </div>
          
          <!-- Gift Receipt Options -->
          ${this.selectedGiftServices.gift_receipt ? `
            <div class="gift-receipt-options mb-4 p-3 bg-cyan-50 rounded border border-cyan-200">
              <h5 class="font-medium mb-2 text-cyan-800">Gift Receipt Options</h5>
              <div class="grid grid-cols-2 gap-2">
                <button class="btn btn-sm btn-outline-cyan" onclick="window.pharmaApp.getModule('pos').previewGiftReceipt()">
                  <i class="fa fa-eye"></i> Preview
                </button>
                <button class="btn btn-sm btn-outline-cyan" onclick="window.pharmaApp.getModule('pos').emailGiftReceipt()">
                  <i class="fa fa-envelope"></i> Email
                </button>
                <button class="btn btn-sm btn-outline-cyan" onclick="window.pharmaApp.getModule('pos').downloadGiftReceipt()">
                  <i class="fa fa-download"></i> Download
                </button>
                <button class="btn btn-sm btn-outline-cyan" onclick="window.pharmaApp.getModule('pos').printGiftReceipt()">
                  <i class="fa fa-print"></i> Print
                </button>
              </div>
            </div>
          ` : ''}
          
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
  
  // Enhanced event handlers with improved barcode scanning
  async handleBarcodeSubmit(event) {
    event.preventDefault();
    const barcodeInput = document.getElementById('barcodeInput');
    const barcode = barcodeInput.value.trim();

    if (barcode) {
      this.showBarcodeFeedback('scanning', 'Scanning barcode...');

      try {
        const product = await this.searchProduct(barcode);

        if (product) {
          if (product.is_variant && product.needs_variant_selection) {
            // Show variant selection modal
            this.showVariantSelectionModal(product);
            this.showBarcodeFeedback('success', 'Variant found - select specific variant', {
              productId: product._id,
              productName: product.product_name || product.name,
              barcode: barcode
            });
          } else {
            // Direct product add to cart
            this.addToCart(product);
            this.showBarcodeFeedback('success', `Product added to cart`, {
              productId: product._id,
              productName: product.name,
              barcode: barcode
            });
            barcodeInput.value = '';
            barcodeInput.focus(); // Keep focus for continuous scanning
          }
        } else {
          this.showBarcodeFeedback('error', 'Product not found', {
            barcode: barcode
          });
          if (window.notiflix) {
            window.notiflix.Report.warning('Not Found', 'Product or variant not found', 'Ok');
          }
          // Don't clear input on error - allow user to correct
        }
      } catch (error) {
        console.error('Barcode scan error:', error);
        this.showBarcodeFeedback('error', 'Scan failed - please try again', {
          barcode: barcode,
          error: error.message
        });
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
             onclick="window.pharmaApp.getModule('pos').addToCartFromSearch('${product._id.replace(/'/g, "\\'")}')">
          <div class="font-medium">${product.name}</div>
          <div class="text-sm text-gray-500">${parseFloat(product.price).toFixed(2)}</div>
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
  
  addComboToCart(combo) {
    const posState = this.app.state.getModuleState('pos');
    const cart = [...posState.cart];
    
    // Check if combo already exists in cart
    const existingIndex = cart.findIndex(item => item.combo_id === combo._id);
    
    if (existingIndex >= 0) {
      // Increase quantity
      cart[existingIndex].quantity += 1;
    } else {
      // Add new combo item
      cart.push({
        combo_id: combo._id,
        product_name: combo.combo_name,
        sku: combo.combo_code,
        price: parseFloat(combo.combo_price),
        quantity: 1,
        is_combo: true,
        combo_components: combo.components
      });
    }
    
    this.app.state.updateModule('pos', { cart });
  }
  
  async checkComboAvailability(comboId, quantity = 1) {
    try {
      const response = await fetch(`${window.api}combos/combos/${comboId}/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error checking combo availability:', error);
      return { is_available: false, error: error.message };
    }
  }
  
  showComboSelector() {
    const posState = this.app.state.getModuleState('pos');
    const combos = posState.combos || [];
    const availableCombos = combos.filter(combo => combo.is_active && combo.is_currently_available);
    
    let html = `
      <div class="combo-selector-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Select Combo Meal</h3>
            <button onclick="window.pharmaApp.getModule('pos').hideComboSelector()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="combo-categories mb-4">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-primary active" onclick="window.pharmaApp.getModule('pos').filterCombosByCategory('all')">All</button>
              ${[...new Set(availableCombos.map(c => c.category))].map(category => `
                <button class="btn btn-outline-secondary" onclick="window.pharmaApp.getModule('pos').filterCombosByCategory('${category}')">${category}</button>
              `).join('')}
            </div>
          </div>
          
          <div class="combo-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="comboGrid">
            ${availableCombos.map(combo => this.renderComboCard(combo)).join('')}
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
  }
  
  hideComboSelector() {
    const modal = document.querySelector('.combo-selector-modal');
    if (modal) {
      modal.remove();
    }
  }
  
  renderComboCard(combo) {
    return `
      <div class="combo-card border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow" 
           onclick="window.pharmaApp.getModule('pos').selectCombo('${combo._id}')">
        <div class="combo-image mb-3">
          ${combo.image_url ? 
            `<img src="${combo.image_url}" alt="${combo.combo_name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;">` :
            '<div class="bg-gray-200 h-30 rounded flex items-center justify-center"><i class="fa fa-utensils text-gray-400"></i></div>'
          }
        </div>
        
        <div class="combo-info">
          <h4 class="font-semibold text-lg mb-1">${combo.combo_name}</h4>
          <p class="text-sm text-gray-600 mb-2">${combo.description || 'No description'}</p>
          
          <div class="combo-components mb-3">
            <div class="text-xs text-gray-500">
              <i class="fa fa-layer-group"></i> ${combo.components?.length || 0} components
            </div>
            <div class="flex flex-wrap gap-1 mt-1">
              ${(combo.components || []).slice(0, 3).map(comp => 
                `<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">${comp.component_type}</span>`
              ).join('')}
              ${(combo.components?.length || 0) > 3 ? `<span class="text-xs text-gray-500">+${combo.components.length - 3} more</span>` : ''}
            </div>
          </div>
          
          <div class="combo-pricing flex justify-between items-center">
            <div class="price-info">
              <span class="text-lg font-bold text-green-600">${parseFloat(combo.combo_price).toFixed(2)}</span>
              ${combo.discount_amount > 0 ? 
                `<span class="text-sm text-gray-500 line-through ml-2">${parseFloat(combo.base_price).toFixed(2)}</span>` : 
                ''
              }
            </div>
            ${combo.discount_percentage > 0 ? 
              `<span class="bg-red-100 text-red-800 px-2 py-1 text-xs rounded">${combo.discount_percentage.toFixed(0)}% OFF</span>` : 
              ''
            }
          </div>
        </div>
      </div>
    `;
  }
  
  async selectCombo(comboId) {
    const posState = this.app.state.getModuleState('pos');
    const combo = posState.combos.find(c => c._id === comboId);
    
    if (!combo) {
      if (window.notiflix) {
        window.notiflix.Report.warning('Combo Not Found', 'The selected combo could not be found', 'Ok');
      }
      return;
    }
    
    // Check availability
    const availability = await this.checkComboAvailability(comboId, 1);
    
    if (!availability.is_available) {
      if (window.notiflix) {
        window.notiflix.Report.warning('Combo Unavailable', 'This combo is currently not available', 'Ok');
      }
      return;
    }
    
    this.addComboToCart(combo);
    this.hideComboSelector();
    
    if (window.notiflix) {
      window.notiflix.Notify.success('Combo Added', `${combo.combo_name} added to cart`);
    }
  }
  
  filterCombosByCategory(category) {
    const posState = this.app.state.getModuleState('pos');
    const combos = posState.combos || [];
    
    // Update active button
    document.querySelectorAll('.combo-categories .btn').forEach(btn => {
      btn.classList.remove('btn-primary', 'active');
      btn.classList.add('btn-outline-secondary');
    });
    event.target.classList.remove('btn-outline-secondary');
    event.target.classList.add('btn-primary', 'active');
    
    // Filter and render combos
    const filteredCombos = category === 'all' ? 
      combos.filter(combo => combo.is_active && combo.is_currently_available) :
      combos.filter(combo => combo.is_active && combo.is_currently_available && combo.category === category);
    
    const comboGrid = document.getElementById('comboGrid');
    if (comboGrid) {
      comboGrid.innerHTML = filteredCombos.map(combo => this.renderComboCard(combo)).join('');
    }
  }
  
  showPaymentInterface() {
    this.showPayment = true;
    this.render();

    // Set up focus trapping for the modal
    setTimeout(() => {
      this.setupPaymentModalFocus();
    }, 100);
  }

  hidePaymentInterface() {
    this.showPayment = false;
    this.render();

    // Restore focus to the element that opened the modal
    this.restoreFocus();
  }

  setupPaymentModalFocus() {
    const modal = document.querySelector('.payment-modal');
    if (!modal) return;

    // Save current focus
    this.previousFocusElement = document.activeElement;

    // Get all focusable elements in the modal
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    this.focusableElements = Array.from(focusableElements);
    this.firstFocusable = this.focusableElements[0];
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];

    // Focus first element
    if (this.firstFocusable) {
      this.firstFocusable.focus();
    }

    // Add event listener for focus trapping
    modal.addEventListener('keydown', this.handleModalKeydown.bind(this));
  }

  handleModalKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.hidePaymentInterface();
    } else if (e.key === 'Tab') {
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === this.firstFocusable) {
          e.preventDefault();
          this.lastFocusable.focus();
        }
      } else {
        // Tab
        if (document.activeElement === this.lastFocusable) {
          e.preventDefault();
          this.firstFocusable.focus();
        }
      }
    }
  }

  restoreFocus() {
    if (this.previousFocusElement && typeof this.previousFocusElement.focus === 'function') {
      this.previousFocusElement.focus();
    }
    this.previousFocusElement = null;
  }
  
  calculateChange() {
    const paid = parseFloat(document.getElementById('paymentAmount').value) || 0;
    const totals = this.calculateCartTotal();
    const total = parseFloat(totals.total);
    const change = Math.max(0, paid - total);
    
    document.getElementById('amountPaid').textContent = `${paid.toFixed(2)}`;
    document.getElementById('changeAmount').textContent = `${change.toFixed(2)}`;
  }
  
  /**
   * GIFT STORE INTEGRATION METHODS
   */
  
  calculateGiftServicesTotal() {
    let total = 0;
    
    if (this.selectedGiftServices.gift_wrapping) {
      total += this.selectedGiftServices.gift_wrapping.cost;
    }
    
    if (this.selectedGiftServices.gift_card) {
      total += this.selectedGiftServices.gift_card.value;
    }
    
    return total;
  }
  
  showGiftServicesModal() {
    const posState = this.app.state.getModuleState('pos');
    const cart = posState.cart || [];
    
    const modalHtml = `
      <div class="gift-services-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="giftServicesModal">
        <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">
              <i class="fa fa-gift text-purple-600"></i> Gift Services
            </h3>
            <button onclick="window.pharmaApp.getModule('pos').hideGiftServicesModal()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="gift-services-content">
            <!-- Cart Items Overview -->
            <div class="cart-overview mb-6 p-4 bg-gray-50 rounded">
              <h5 class="font-medium mb-3">Current Order (${cart.length} items)</h5>
              <div class="max-h-32 overflow-y-auto">
                ${cart.map(item => `
                  <div class="flex justify-between text-sm py-1">
                    <span>${item.product_name} x ${item.quantity}</span>
                    <span>₹${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <!-- Gift Services Tabs -->
            <div class="gift-services-tabs mb-4">
              <ul class="nav nav-tabs" role="tablist">
                <li role="presentation" class="active">
                  <a href="#giftWrappingTab" aria-controls="wrapping" role="tab" data-toggle="tab">
                    <i class="fa fa-gift"></i> Gift Wrapping
                  </a>
                </li>
                <li role="presentation">
                  <a href="#giftReceiptTab" aria-controls="receipt" role="tab" data-toggle="tab">
                    <i class="fa fa-receipt"></i> Gift Receipt
                  </a>
                </li>
                <li role="presentation">
                  <a href="#giftCardTab" aria-controls="card" role="tab" data-toggle="tab">
                    <i class="fa fa-credit-card"></i> Gift Card
                  </a>
                </li>
              </ul>
            </div>
            
            <div class="tab-content">
              <!-- Gift Wrapping Tab -->
              <div role="tabpanel" class="tab-pane active" id="giftWrappingTab">
                ${this.renderGiftWrappingTab()}
              </div>
              
              <!-- Gift Receipt Tab -->
              <div role="tabpanel" class="tab-pane" id="giftReceiptTab">
                ${this.renderGiftReceiptTab()}
              </div>
              
              <!-- Gift Card Tab -->
              <div role="tabpanel" class="tab-pane" id="giftCardTab">
                ${this.renderGiftCardTab()}
              </div>
            </div>
            
            <!-- Summary -->
            <div class="gift-services-summary mt-6 p-4 bg-purple-50 rounded border border-purple-200">
              <h5 class="font-medium mb-3">Selected Services Summary</h5>
              <div id="servicesSummary">
                ${this.renderServicesSummary()}
              </div>
            </div>
            
            <div class="flex justify-end gap-3 mt-6">
              <button class="btn btn-secondary" onclick="window.pharmaApp.getModule('pos').hideGiftServicesModal()">
                Cancel
              </button>
              <button class="btn btn-purple" onclick="window.pharmaApp.getModule('pos').applyGiftServices()">
                <i class="fa fa-check"></i> Apply Services
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  
  renderGiftWrappingTab() {
    if (this.giftWrappingOptions.length === 0) {
      return `
        <div class="text-center text-gray-500 py-8">
          <i class="fa fa-gift text-4xl mb-2"></i>
          <div>No gift wrapping options available</div>
        </div>
      `;
    }
    
    return `
      <div class="gift-wrapping-tab">
        <div class="form-group mb-4">
          <label class="form-label">
            <input type="checkbox" id="includeGiftWrapping" class="mr-2" 
                   ${this.selectedGiftServices.gift_wrapping ? 'checked' : ''}
                   onchange="window.pharmaApp.getModule('pos').toggleGiftWrapping(this.checked)">
            Include Gift Wrapping
          </label>
        </div>
        
        <div class="wrapping-options" id="wrappingOptions">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${this.giftWrappingOptions.map(style => `
              <div class="wrapping-option border rounded p-3 cursor-pointer ${
                this.selectedGiftServices.gift_wrapping?.style_id === style.style_id ? 'border-purple-500 bg-purple-50' : 'hover:border-gray-300'
              }" 
                   onclick="window.pharmaApp.getModule('pos').selectGiftWrapping('${style.style_id}')">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="font-medium">${style.style_name}</div>
                    <div class="text-sm text-gray-600">${style.details?.description || ''}</div>
                    <div class="text-xs text-gray-500 mt-1">
                      <i class="fa fa-tag"></i> ${style.style_category}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-green-600">₹${style.details?.cost?.toFixed(2) || '0.00'}</div>
                    <div class="text-xs text-gray-500">per item</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="wrapping-cost mt-4 p-3 bg-gray-50 rounded">
          <div class="flex justify-between">
            <span>Gift Wrapping Cost:</span>
            <span id="wrappingCost" class="font-medium">₹${(this.selectedGiftServices.gift_wrapping?.cost || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  renderGiftReceiptTab() {
    return `
      <div class="gift-receipt-tab">
        <div class="form-group mb-4">
          <label class="form-label">
            <input type="checkbox" id="includeGiftReceipt" class="mr-2"
                   ${this.selectedGiftServices.gift_receipt ? 'checked' : ''}
                   onchange="window.pharmaApp.getModule('pos').toggleGiftReceipt(this.checked)">
            Generate Gift Receipt (no prices)
          </label>
        </div>
        
        <div id="giftReceiptOptions" style="${this.selectedGiftServices.gift_receipt ? '' : 'display: none;'}">
          <div class="form-group mb-3">
            <label class="form-label">Gift Message</label>
            <textarea class="form-input" id="giftMessage" rows="3" 
                      placeholder="Personal message for the recipient...">${this.selectedGiftServices.gift_receipt?.message || ''}</textarea>
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label">Recipient Name</label>
              <input type="text" class="form-input" id="giftRecipientName" 
                     value="${this.selectedGiftServices.gift_receipt?.recipient_name || ''}"
                     placeholder="Recipient's name">
            </div>
            <div class="form-group">
              <label class="form-label">Recipient Contact</label>
              <input type="text" class="form-input" id="giftRecipientContact" 
                     value="${this.selectedGiftServices.gift_receipt?.recipient_contact || ''}"
                     placeholder="Email or phone">
            </div>
          </div>
          
          <div class="form-group mb-3">
            <label class="form-label">
              <input type="checkbox" id="anonymousGift" class="mr-2"
                     ${this.selectedGiftServices.gift_receipt?.anonymous ? 'checked' : ''}>
              Anonymous Gift
            </label>
          </div>
        </div>
      </div>
    `;
  }
  
  renderGiftCardTab() {
    return `
      <div class="gift-card-tab">
        <div class="form-group mb-4">
          <label class="form-label">
            <input type="checkbox" id="includeGiftCard" class="mr-2"
                   ${this.selectedGiftServices.gift_card ? 'checked' : ''}
                   onchange="window.pharmaApp.getModule('pos').toggleGiftCard(this.checked)">
            Include Gift Card
          </label>
        </div>
        
        <div id="giftCardOptions" style="${this.selectedGiftServices.gift_card ? '' : 'display: none;'}">
          <div class="form-group mb-3">
            <label class="form-label">Gift Card Value (₹)</label>
            <input type="number" class="form-input" id="giftCardValue" min="1" step="1"
                   value="${this.selectedGiftServices.gift_card?.value || ''}"
                   placeholder="100"
                   onchange="window.pharmaApp.getModule('pos').updateGiftCardValue(this.value)">
          </div>
          
          <div class="form-group mb-3">
            <label class="form-label">Gift Card Message</label>
            <textarea class="form-input" id="giftCardMessage" rows="2" 
                      placeholder="Message on the gift card...">${this.selectedGiftServices.gift_card?.message || ''}</textarea>
          </div>
          
          <div class="gift-card-preview mt-4 p-3 border rounded">
            <h6 class="font-medium mb-2">Gift Card Preview</h6>
            <div class="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded">
              <div class="text-center">
                <div class="text-sm opacity-75">Gift Card</div>
                <div class="text-2xl font-bold">₹<span id="previewGiftCardValue">${this.selectedGiftServices.gift_card?.value || '0'}</span></div>
                <div class="text-xs opacity-75 mt-1" id="previewGiftCardMessage">
                  ${this.selectedGiftServices.gift_card?.message || 'Your gift message here'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderServicesSummary() {
    const services = this.selectedGiftServices;
    const hasServices = Object.keys(services).length > 0;
    
    if (!hasServices) {
      return `<div class="text-gray-500">No gift services selected</div>`;
    }
    
    return `
      <div class="space-y-2">
        ${services.gift_wrapping ? `
          <div class="flex justify-between text-sm">
            <span><i class="fa fa-gift text-purple-600"></i> Gift Wrapping</span>
            <span>₹${services.gift_wrapping.cost.toFixed(2)}</span>
          </div>
        ` : ''}
        ${services.gift_receipt ? `
          <div class="flex justify-between text-sm">
            <span><i class="fa fa-receipt text-cyan-600"></i> Gift Receipt</span>
            <span>Free</span>
          </div>
        ` : ''}
        ${services.gift_card ? `
          <div class="flex justify-between text-sm">
            <span><i class="fa fa-credit-card text-pink-600"></i> Gift Card (₹${services.gift_card.value})</span>
            <span>₹${services.gift_card.value.toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="border-t pt-2 mt-2">
          <div class="flex justify-between font-medium">
            <span>Total Gift Services:</span>
            <span class="text-purple-600">₹${this.calculateGiftServicesTotal().toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  hideGiftServicesModal() {
    const modal = document.getElementById('giftServicesModal');
    if (modal) {
      modal.remove();
    }
  }
  
  toggleGiftWrapping(checked) {
    const wrappingOptions = document.getElementById('wrappingOptions');
    if (wrappingOptions) {
      wrappingOptions.style.display = checked ? 'block' : 'none';
    }
    
    if (!checked) {
      delete this.selectedGiftServices.gift_wrapping;
      document.getElementById('wrappingCost').textContent = '₹0.00';
    } else if (this.giftWrappingOptions.length > 0 && !this.selectedGiftServices.gift_wrapping) {
      // Auto-select first option
      this.selectGiftWrapping(this.giftWrappingOptions[0].style_id);
    }
    
    this.updateServicesSummary();
  }
  
  selectGiftWrapping(styleId) {
    const style = this.giftWrappingOptions.find(s => s.style_id === styleId);
    if (style) {
      this.selectedGiftServices.gift_wrapping = {
        style_id: style.style_id,
        style_name: style.style_name,
        cost: style.details?.cost || 0
      };
      
      document.getElementById('wrappingCost').textContent = `₹${style.details?.cost?.toFixed(2) || '0.00'}`;
      
      // Update visual selection
      document.querySelectorAll('.wrapping-option').forEach(option => {
        option.classList.remove('border-purple-500', 'bg-purple-50');
        option.classList.add('hover:border-gray-300');
      });
      
      event?.target?.closest('.wrapping-option')?.classList.add('border-purple-500', 'bg-purple-50');
      
      this.updateServicesSummary();
    }
  }
  
  toggleGiftReceipt(checked) {
    const options = document.getElementById('giftReceiptOptions');
    if (options) {
      options.style.display = checked ? 'block' : 'none';
    }
    
    if (checked) {
      this.selectedGiftServices.gift_receipt = {
        message: '',
        recipient_name: '',
        recipient_contact: '',
        anonymous: false
      };
    } else {
      delete this.selectedGiftServices.gift_receipt;
    }
    
    this.updateServicesSummary();
  }
  
  toggleGiftCard(checked) {
    const options = document.getElementById('giftCardOptions');
    if (options) {
      options.style.display = checked ? 'block' : 'none';
    }
    
    if (checked) {
      this.selectedGiftServices.gift_card = {
        value: 100,
        message: ''
      };
      document.getElementById('giftCardValue').value = '100';
    } else {
      delete this.selectedGiftServices.gift_card;
    }
    
    this.updateServicesSummary();
  }
  
  updateGiftCardValue(value) {
    const numValue = parseFloat(value) || 0;
    
    if (this.selectedGiftServices.gift_card) {
      this.selectedGiftServices.gift_card.value = numValue;
    }
    
    // Update preview
    const previewElement = document.getElementById('previewGiftCardValue');
    if (previewElement) {
      previewElement.textContent = numValue.toString();
    }
    
    this.updateServicesSummary();
  }
  
  updateServicesSummary() {
    const summaryContainer = document.getElementById('servicesSummary');
    if (summaryContainer) {
      summaryContainer.innerHTML = this.renderServicesSummary();
    }
  }
  
  applyGiftServices() {
    // Update gift receipt data if enabled
    if (this.selectedGiftServices.gift_receipt) {
      const message = document.getElementById('giftMessage')?.value || '';
      const recipientName = document.getElementById('giftRecipientName')?.value || '';
      const recipientContact = document.getElementById('giftRecipientContact')?.value || '';
      const anonymous = document.getElementById('anonymousGift')?.checked || false;
      
      this.selectedGiftServices.gift_receipt.message = message;
      this.selectedGiftServices.gift_receipt.recipient_name = recipientName;
      this.selectedGiftServices.gift_receipt.recipient_contact = recipientContact;
      this.selectedGiftServices.gift_receipt.anonymous = anonymous;
    }
    
    // Update gift card data if enabled
    if (this.selectedGiftServices.gift_card) {
      const message = document.getElementById('giftCardMessage')?.value || '';
      this.selectedGiftServices.gift_card.message = message;
    }
    
    this.hideGiftServicesModal();
    this.render(); // Refresh to show updated totals
    
    if (window.notiflix) {
      window.notiflix.Notify.success('Gift Services Applied', 'Gift services added to order successfully!');
    }
  }
  
  showGiftBundleSelector() {
    if (this.giftBundles.length === 0) {
      if (window.notiflix) {
        window.notiflix.Notify.info('No Bundles', 'No gift bundles available');
      }
      return;
    }
    
    const modalHtml = `
      <div class="gift-bundle-selector-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="giftBundleSelectorModal">
        <div class="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">
              <i class="fa fa-box text-purple-600"></i> Select Gift Bundle
            </h3>
            <button onclick="window.pharmaApp.getModule('pos').hideGiftBundleSelector()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="bundle-categories mb-4">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-primary active" onclick="window.pharmaApp.getModule('pos').filterBundlesByCategory('all')">All</button>
              ${[...new Set(this.giftBundles.map(b => b.bundle_details?.category))].map(category => `
                <button class="btn btn-outline-secondary" onclick="window.pharmaApp.getModule('pos').filterBundlesByCategory('${category}')">${category}</button>
              `).join('')}
            </div>
          </div>
          
          <div class="bundle-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="bundleGrid">
            ${this.giftBundles.map(bundle => this.renderBundleCard(bundle)).join('')}
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  
  renderBundleCard(bundle) {
    const details = bundle.bundle_details || {};
    const pricing = bundle.pricing || {};
    const availability = bundle.availability || {};
    
    return `
      <div class="bundle-card border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow" 
           onclick="window.pharmaApp.getModule('pos').selectGiftBundle('${bundle.bundle_id}')">
        <div class="bundle-info">
          <h5 class="font-semibold text-lg mb-2">${bundle.bundle_name}</h5>
          <p class="text-sm text-gray-600 mb-3">${details.description || 'No description available'}</p>
          
          <div class="bundle-meta mb-3 text-xs text-gray-500">
            <div><i class="fa fa-tag"></i> ${details.category || 'general'}</div>
            <div><i class="fa fa-layer-group"></i> ${bundle.components?.length || 0} components</div>
            <div><i class="fa fa-cube"></i> ${availability.current_stock || 0} in stock</div>
          </div>
          
          <div class="bundle-components mb-3">
            <div class="text-xs text-gray-500 mb-1">Includes:</div>
            <div class="flex flex-wrap gap-1">
              ${(bundle.components || []).slice(0, 3).map(comp => 
                `<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">${comp.product_name}</span>`
              ).join('')}
              ${(bundle.components?.length || 0) > 3 ? `<span class="text-xs text-gray-500">+${bundle.components.length - 3} more</span>` : ''}
            </div>
          </div>
          
          <div class="bundle-pricing flex justify-between items-center">
            <div class="price-info">
              <span class="text-lg font-bold text-green-600">₹${pricing.bundle_price?.toFixed(2) || '0.00'}</span>
              ${pricing.total_individual_price > pricing.bundle_price ? 
                `<span class="text-sm text-gray-500 line-through ml-2">₹${pricing.total_individual_price?.toFixed(2)}</span>` : 
                ''
              }
            </div>
            ${pricing.savings_per_customer > 0 ? 
              `<span class="bg-red-100 text-red-800 px-2 py-1 text-xs rounded">
                Save ₹${pricing.savings_per_customer.toFixed(2)}
              </span>` : 
              ''
            }
          </div>
        </div>
      </div>
    `;
  }
  
  hideGiftBundleSelector() {
    const modal = document.getElementById('giftBundleSelectorModal');
    if (modal) {
      modal.remove();
    }
  }
  
  async selectGiftBundle(bundleId) {
    const bundle = this.giftBundles.find(b => b.bundle_id === bundleId);
    if (!bundle) return;
    
    try {
      // Check availability
      const availability = await this.checkBundleAvailability(bundleId, 1);
      if (!availability.is_available) {
        if (window.notiflix) {
          window.notiflix.Report.warning('Bundle Unavailable', 'This bundle is currently not available');
        }
        return;
      }
      
      // Add bundle to cart
      this.addBundleToCart(bundle);
      this.hideGiftBundleSelector();
      
      if (window.notiflix) {
        window.notiflix.Notify.success('Bundle Added', `${bundle.bundle_name} added to cart`);
      }
      
    } catch (error) {
      console.error('Error selecting bundle:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to add bundle to cart');
      }
    }
  }
  
  async checkBundleAvailability(bundleId, quantity = 1) {
    try {
      const response = await fetch(`${window.api}gift_store/bundles/${bundleId}/process-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity, customer_id: null })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error checking bundle availability:', error);
      return { is_available: false, error: error.message };
    }
  }
  
  addBundleToCart(bundle) {
    const posState = this.app.state.getModuleState('pos');
    const cart = [...posState.cart];
    
    // Check if bundle already exists in cart
    const existingIndex = cart.findIndex(item => item.bundle_id === bundle.bundle_id);
    
    if (existingIndex >= 0) {
      // Increase quantity
      cart[existingIndex].quantity += 1;
    } else {
      // Add new bundle item
      cart.push({
        bundle_id: bundle.bundle_id,
        product_name: bundle.bundle_name,
        sku: bundle.bundle_id,
        price: parseFloat(bundle.pricing?.bundle_price || 0),
        quantity: 1,
        is_bundle: true,
        bundle_components: bundle.components || [],
        category: bundle.bundle_details?.category || 'gift_bundle'
      });
    }
    
    this.app.state.updateModule('pos', { cart });
    
    // Recalculate totals
    setTimeout(() => {
      this.calculateCartTotal();
    }, 100);
  }
  
  filterBundlesByCategory(category) {
    // Update active button
    document.querySelectorAll('.bundle-categories .btn').forEach(btn => {
      btn.classList.remove('btn-primary', 'active');
      btn.classList.add('btn-outline-secondary');
    });
    event.target.classList.remove('btn-outline-secondary');
    event.target.classList.add('btn-primary', 'active');
    
    // Filter and render bundles
    const filteredBundles = category === 'all' ? 
      this.giftBundles :
      this.giftBundles.filter(bundle => bundle.bundle_details?.category === category);
    
    const bundleGrid = document.getElementById('bundleGrid');
    if (bundleGrid) {
      bundleGrid.innerHTML = filteredBundles.map(bundle => this.renderBundleCard(bundle)).join('');
    }
  }
  
  /**
   * GIFT RECEIPT MANAGEMENT METHODS
   */
  
  async previewGiftReceipt() {
    const posState = this.app.state.getModuleState('pos');
    const cart = posState.cart || [];
    
    if (!this.selectedGiftServices.gift_receipt) {
      if (window.notiflix) {
        window.notiflix.Notify.warning('No Gift Receipt', 'Please select gift receipt service first');
      }
      return;
    }
    
    try {
      // Generate a temporary receipt for preview
      const receiptData = {
        transaction_id: 'PREVIEW-' + Date.now(),
        items: cart,
        gift_message: this.selectedGiftServices.gift_receipt.message,
        gift_recipient_name: this.selectedGiftServices.gift_receipt.recipient_name,
        gift_recipient_contact: this.selectedGiftServices.gift_receipt.recipient_contact,
        is_anonymous: this.selectedGiftServices.gift_receipt.anonymous
      };
      
      const previewHtml = this.generateReceiptPreviewHTML(receiptData);
      
      // Show in modal
      const modalHtml = `
        <div class="gift-receipt-preview-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60" 
             id="giftReceiptPreviewModal">
          <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
              <h4 class="font-medium">Gift Receipt Preview</h4>
              <button onclick="window.pharmaApp.getModule('pos').hideGiftReceiptPreview()" class="text-gray-500">
                <i class="fa fa-times"></i>
              </button>
            </div>
            <div class="receipt-preview" id="receiptPreviewContent">
              ${previewHtml}
            </div>
            <div class="flex justify-end gap-3 mt-4">
              <button class="btn btn-secondary" onclick="window.pharmaApp.getModule('pos').hideGiftReceiptPreview()">
                Close
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      
    } catch (error) {
      console.error('Error previewing gift receipt:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to generate receipt preview');
      }
    }
  }
  
  generateReceiptPreviewHTML(receiptData) {
    const currentDate = new Date().toLocaleDateString();
    
    return `
      <div class="receipt-preview-content border rounded p-6" style="font-family: monospace;">
        <div class="text-center border-b-2 border-black pb-4 mb-4">
          <h2 class="text-xl font-bold">StyleMine</h2>
          <h3 class="text-lg">GIFT RECEIPT</h3>
          <p>${currentDate}</p>
        </div>
        
        <div class="mb-4">
          <p><strong>Receipt ID:</strong> ${receiptData.transaction_id}</p>
          ${receiptData.gift_recipient_name ? `<p><strong>Gift Recipient:</strong> ${receiptData.gift_recipient_name}</p>` : ''}
          ${receiptData.is_anonymous ? `<p><strong>Type:</strong> Anonymous Gift</p>` : ''}
        </div>
        
        ${receiptData.gift_message ? `
          <div class="mb-4 p-3 bg-gray-100 rounded">
            <h4 class="font-medium mb-2">Gift Message:</h4>
            <p class="italic">"${receiptData.gift_message}"</p>
          </div>
        ` : ''}
        
        <div class="mb-4">
          <h4 class="font-medium mb-2">Items:</h4>
          ${receiptData.items.map(item => `
            <div class="flex justify-between py-1">
              <span>${item.product_name} x ${item.quantity}</span>
              <span class="no-price text-gray-500">(price not shown)</span>
            </div>
          `).join('')}
        </div>
        
        <div class="border-t pt-4 text-sm text-gray-600">
          <p class="mb-1">* This is a gift receipt without item prices</p>
          <p class="mb-1">* Valid for returns/exchanges within 30 days</p>
          <p class="mb-1">* Original tags must be attached</p>
          <p class="text-center mt-4 font-medium">Thank you for choosing StyleMine!</p>
        </div>
      </div>
    `;
  }
  
  hideGiftReceiptPreview() {
    const modal = document.getElementById('giftReceiptPreviewModal');
    if (modal) {
      modal.remove();
    }
  }
  
  emailGiftReceipt() {
    if (window.notiflix) {
      window.notiflix.Notify.info('Email Feature', 'Email delivery will be implemented with SMTP integration');
    }
  }
  
  downloadGiftReceipt() {
    // Generate and download receipt as HTML
    const posState = this.app.state.getModuleState('pos');
    const cart = posState.cart || [];
    
    const receiptData = {
      transaction_id: 'TEMP-' + Date.now(),
      items: cart,
      gift_message: this.selectedGiftServices.gift_receipt?.message || '',
      gift_recipient_name: this.selectedGiftServices.gift_receipt?.recipient_name || '',
      gift_recipient_contact: this.selectedGiftServices.gift_receipt?.recipient_contact || '',
      is_anonymous: this.selectedGiftServices.gift_receipt?.anonymous || false
    };
    
    const receiptHtml = this.generateGiftReceiptHTML(receiptData);
    
    const blob = new Blob([receiptHtml], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gift-receipt-${receiptData.transaction_id}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  
  generateGiftReceiptHTML(receiptData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gift Receipt - ${receiptData.transaction_id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .receipt-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
          .receipt-info { margin-bottom: 20px; }
          .gift-message { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .receipt-footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          .no-price { color: #999; font-style: italic; }
          .item-list { margin: 20px 0; }
          .item-row { display: flex; justify-content: space-between; padding: 5px 0; }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          <h1>StyleMine</h1>
          <h2>GIFT RECEIPT</h2>
          <p>${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="receipt-info">
          <p><strong>Receipt ID:</strong> ${receiptData.transaction_id}</p>
          ${receiptData.gift_recipient_name ? `<p><strong>Gift Recipient:</strong> ${receiptData.gift_recipient_name}</p>` : ''}
          ${receiptData.is_anonymous ? `<p><strong>Type:</strong> Anonymous Gift</p>` : ''}
        </div>
        
        ${receiptData.gift_message ? `
          <div class="gift-message">
            <h3>Gift Message:</h3>
            <p>"${receiptData.gift_message}"</p>
          </div>
        ` : ''}
        
        <div class="item-list">
          <h3>Items:</h3>
          ${receiptData.items.map(item => `
            <div class="item-row">
              <span>${item.product_name} x ${item.quantity}</span>
              <span class="no-price">(price not shown - gift receipt)</span>
            </div>
          `).join('')}
        </div>
        
        <div class="receipt-footer">
          <p>This is a gift receipt without item prices.</p>
          <p>Valid for returns/exchanges within 30 days with original tags.</p>
          <p>Thank you for choosing StyleMine!</p>
        </div>
      </body>
      </html>
    `;
  }
  
  printGiftReceipt() {
    this.downloadGiftReceipt();
    
    setTimeout(() => {
      window.print();
    }, 1000);
  }
  
  /**
   * ENHANCED PAYMENT PROCESSING WITH GIFT SERVICES
   */
  
  async processPayment() {
    const paid = parseFloat(document.getElementById('paymentAmount').value);
    const posState = this.app.state.getModuleState('pos');
    const totals = this.calculateCartTotal();
    const giftServicesTotal = this.calculateGiftServicesTotal();
    const total = parseFloat(totals.total) + giftServicesTotal;
    
    if (paid < total) {
      if (window.notiflix) {
        window.notiflix.Report.warning('Insufficient Payment', 'Amount paid is less than total');
      }
      return;
    }
    
    try {
      // Process gift card payment if applicable
      if (this.selectedGiftServices.gift_card) {
        await this.processGiftCardPayment();
      }
      
      // Build payment data
      const paymentData = {
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
        change: paid - total,
        
        // Gift Services Data
        gift_services: this.selectedGiftServices,
        gift_services_total: giftServicesTotal
      };
      
      // Process the main payment
      await this.completeSale(paymentData);
      
      // Generate gift receipt if requested
      if (this.selectedGiftServices.gift_receipt) {
        await this.generateGiftReceiptAfterSale(paymentData);
      }
      
      // Issue gift card if requested
      if (this.selectedGiftServices.gift_card) {
        await this.issueGiftCardAfterSale(paymentData);
      }
      
      this.hidePaymentInterface();
      
      // Show success message with gift services info
      let successMessage = 'Transaction completed successfully!';
      if (giftServicesTotal > 0) {
        successMessage += ` Gift services worth ₹${giftServicesTotal.toFixed(2)} added.`;
      }
      
      if (window.notiflix) {
        window.notiflix.Notify.success('Sale Completed', successMessage);
      }
      
    } catch (error) {
      console.error('Payment processing failed:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Payment Failed', error.message);
      }
    }
  }
  
  async processGiftCardPayment() {
    const giftCardNumber = document.getElementById('giftCardNumber')?.value;
    const giftCardPIN = document.getElementById('giftCardPIN')?.value;
    const cardValue = this.selectedGiftServices.gift_card?.value || 0;
    
    if (!giftCardNumber) {
      throw new Error('Gift card number is required');
    }
    
    try {
      const response = await fetch(`${window.api}gift_store/cards/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          card_number: giftCardNumber,
          pin: giftCardPIN,
          redemption_amount: cardValue,
          transaction_id: Date.now().toString()
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Gift card redemption failed');
      }
      
      return result;
    } catch (error) {
      console.error('Gift card payment failed:', error);
      throw new Error(`Gift card payment failed: ${error.message}`);
    }
  }
  
  async generateGiftReceiptAfterSale(paymentData) {
    try {
      const receiptData = {
        transaction_id: paymentData.order.toString(),
        items: paymentData.items,
        gift_message: this.selectedGiftServices.gift_receipt.message,
        gift_recipient_name: this.selectedGiftServices.gift_receipt.recipient_name,
        gift_recipient_contact: this.selectedGiftServices.gift_receipt.recipient_contact,
        is_anonymous: this.selectedGiftServices.gift_receipt.anonymous,
        gift_wrapping_style: this.selectedGiftServices.gift_wrapping?.style_name,
        gift_wrapping_cost: this.selectedGiftServices.gift_wrapping?.cost || 0,
        gift_card_included: !!this.selectedGiftServices.gift_card,
        gift_card_value: this.selectedGiftServices.gift_card?.value || 0
      };
      
      const response = await fetch(`${window.api}gift_store/receipts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(receiptData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Gift receipt generated:', result.receipt_id);
        
        // Optionally show receipt details to user
        if (window.notiflix) {
          window.notiflix.Notify.success(
            'Gift Receipt Created', 
            `Receipt ID: ${result.receipt_id}`
          );
        }
      }
      
    } catch (error) {
      console.error('Error generating gift receipt:', error);
      // Don't fail the entire transaction for receipt generation errors
    }
  }
  
  async issueGiftCardAfterSale(paymentData) {
    try {
      const cardData = {
        card_type: 'digital',
        denomination: this.selectedGiftServices.gift_card.value,
        purchaser_info: {
          name: paymentData.customer.name,
          email: paymentData.customer.email || '',
          phone: paymentData.customer.phone || ''
        },
        recipient_info: {
          name: this.selectedGiftServices.gift_receipt?.recipient_name || paymentData.customer.name,
          email: this.selectedGiftServices.gift_receipt?.recipient_contact || '',
          phone: ''
        },
        custom_message: this.selectedGiftServices.gift_card.message,
        delivery_method: 'email',
        design_template: 'default'
      };
      
      const response = await fetch(`${window.api}gift_store/cards/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cardData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Gift card issued:', result.card_id);
        
        if (window.notiflix) {
          window.notiflix.Notify.success(
            'Gift Card Issued', 
            `Card ID: ${result.card_id}`
          );
        }
      }
      
    } catch (error) {
      console.error('Error issuing gift card:', error);
      // Don't fail the entire transaction for card issuance errors
    }
  }

  /**
   * Enhanced Barcode Scanning Methods
   */

  // Sound notification methods
  playScanSound(type = 'success') {
    if (!this.soundEnabled) return;

    try {
      // Create audio context if not exists
      if (!this.audioContext && window.AudioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (this.audioContext) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Configure sound based on type
        switch (type) {
          case 'success':
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.3);
            break;

          case 'error':
            oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5);
            break;

          case 'warning':
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(500, this.audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.25, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.4);
            break;
        }
      } else {
        // Fallback to simple beep using console (for browsers without AudioContext support)
        console.log(`%c🔊 BEEP (${type})`, 'font-size: 20px; color: green;');
      }
    } catch (error) {
      console.warn('Audio playback failed:', error);
      // Fallback: visual feedback only
    }
  }

  // Enhanced barcode feedback with sound and visual improvements
  showBarcodeFeedback(status, message, extraData = {}) {
    const feedbackElement = document.getElementById('barcodeFeedback') || this.createFeedbackElement();

    // Clear previous classes
    feedbackElement.className = 'barcode-feedback';

    // Play sound notification
    this.playScanSound(status);

    // Add vibration feedback for mobile devices (if supported)
    if ('vibrate' in navigator && this.mobileView) {
      switch (status) {
        case 'success':
          navigator.vibrate(100);
          break;
        case 'error':
          navigator.vibrate([100, 50, 100]);
          break;
        case 'warning':
          navigator.vibrate(200);
          break;
      }
    }

    // Add status-specific classes and content
    switch (status) {
      case 'scanning':
        feedbackElement.classList.add('scanning');
        feedbackElement.innerHTML = `
          <div class="flex items-center gap-2">
            <i class="fa fa-spinner fa-spin text-blue-500"></i>
            <span>${message}</span>
          </div>
        `;
        break;

      case 'success':
        this.scanSuccessCount++;
        feedbackElement.classList.add('success');
        feedbackElement.innerHTML = `
          <div class="flex items-center gap-2">
            <i class="fa fa-check-circle text-green-500"></i>
            <span>${message}</span>
            ${extraData.productName ? `<small class="text-gray-600">(${extraData.productName})</small>` : ''}
          </div>
        `;
        // Auto-hide success messages after 2 seconds
        setTimeout(() => {
          feedbackElement.style.display = 'none';
        }, 2000);
        break;

      case 'error':
        feedbackElement.classList.add('error');
        feedbackElement.innerHTML = `
          <div class="flex items-center gap-2">
            <i class="fa fa-times-circle text-red-500"></i>
            <span>${message}</span>
          </div>
        `;
        // Keep error messages visible longer
        setTimeout(() => {
          feedbackElement.style.display = 'none';
        }, 4000);
        break;

      case 'warning':
        feedbackElement.classList.add('warning');
        feedbackElement.innerHTML = `
          <div class="flex items-center gap-2">
            <i class="fa fa-exclamation-triangle text-yellow-500"></i>
            <span>${message}</span>
          </div>
        `;
        // Medium duration for warnings
        setTimeout(() => {
          feedbackElement.style.display = 'none';
        }, 3000);
        break;
    }

    feedbackElement.style.display = 'block';

    // Add to scan history for debugging/analytics
    this.logScanEvent(status, message, extraData);
  }

  // Log scan events for analytics
  logScanEvent(status, message, extraData = {}) {
    const scanEvent = {
      timestamp: new Date().toISOString(),
      status: status,
      message: message,
      productId: extraData.productId,
      productName: extraData.productName,
      barcode: extraData.barcode,
      session: this.scanSuccessCount
    };

    // Store in local storage for debugging (can be sent to server later)
    const scanHistory = JSON.parse(localStorage.getItem('barcodeScanHistory') || '[]');
    scanHistory.push(scanEvent);

    // Keep only last 100 scans
    if (scanHistory.length > 100) {
      scanHistory.shift();
    }

    localStorage.setItem('barcodeScanHistory', JSON.stringify(scanHistory));
  }

  // Scanner control methods
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.render(); // Re-render to update button state

    if (window.notiflix) {
      const status = this.soundEnabled ? 'enabled' : 'disabled';
      window.notiflix.Notify.info('Sound Notifications', `Sound notifications ${status}`);
    }
  }

  showScannerHelp() {
    const helpModal = `
      <div class="scanner-help-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
           id="scannerHelpModal">
        <div class="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">
              <i class="fa fa-barcode text-blue-600"></i> Scanner Help & Tips
            </h3>
            <button onclick="window.pharmaApp.getModule('pos').hideScannerHelp()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>

          <div class="help-content space-y-4">
            <div>
              <h5 class="font-medium text-gray-800 mb-2">
                <i class="fa fa-lightbulb text-yellow-500"></i> Scanning Tips
              </h5>
              <ul class="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Ensure good lighting for better scan accuracy</li>
                <li>• Hold the scanner steady and at appropriate distance</li>
                <li>• Clean the scanner window regularly</li>
                <li>• Check scanner settings for optimal performance</li>
              </ul>
            </div>

            <div>
              <h5 class="font-medium text-gray-800 mb-2">
                <i class="fa fa-volume-up text-green-500"></i> Sound Feedback
              </h5>
              <ul class="text-sm text-gray-600 space-y-1 ml-4">
                <li>• <strong>Success:</strong> High beep + green checkmark</li>
                <li>• <strong>Error:</strong> Low beep sequence + red X</li>
                <li>• <strong>Warning:</strong> Medium beep + yellow warning</li>
                <li>• Toggle sound on/off with the volume button</li>
              </ul>
            </div>

            <div>
              <h5 class="font-medium text-gray-800 mb-2">
                <i class="fa fa-chart-bar text-blue-500"></i> Session Statistics
              </h5>
              <div class="bg-gray-50 p-3 rounded">
                <div class="text-sm">
                  <div>Successful scans today: <strong>${this.scanSuccessCount}</strong></div>
                  <div class="mt-1">
                    <small class="text-gray-500">Session started: ${new Date().toLocaleDateString()}</small>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h5 class="font-medium text-gray-800 mb-2">
                <i class="fa fa-keyboard text-purple-500"></i> Keyboard Shortcuts
              </h5>
              <ul class="text-sm text-gray-600 space-y-1 ml-4">
                <li>• <kbd class="px-1 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd> Process barcode</li>
                <li>• <kbd class="px-1 py-0.5 bg-gray-200 rounded text-xs">F2</kbd> Clear input</li>
                <li>• <kbd class="px-1 py-0.5 bg-gray-200 rounded text-xs">F3</kbd> Focus scanner</li>
              </ul>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button class="btn btn-secondary" onclick="window.pharmaApp.getModule('pos').hideScannerHelp()">
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', helpModal);
  }

  hideScannerHelp() {
    const modal = document.getElementById('scannerHelpModal');
    if (modal) {
      modal.remove();
    }
  }

  clearBarcodeInput() {
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) {
      barcodeInput.value = '';
      barcodeInput.focus();
    }
    this.showBarcodeFeedback('info', 'Input cleared');
  }

  showRecentScans() {
    const scanHistory = JSON.parse(localStorage.getItem('barcodeScanHistory') || '[]');
    const recentScans = scanHistory.slice(-10).reverse(); // Last 10 scans, most recent first

    if (recentScans.length === 0) {
      if (window.notiflix) {
        window.notiflix.Notify.info('No Recent Scans', 'No scan history found');
      }
      return;
    }

    const historyModal = `
      <div class="scan-history-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
           id="scanHistoryModal">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">
              <i class="fa fa-history text-blue-600"></i> Recent Scan History
            </h3>
            <button onclick="window.pharmaApp.getModule('pos').hideRecentScans()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>

          <div class="scan-history-list">
            ${recentScans.map((scan, index) => `
              <div class="scan-item flex items-center justify-between p-3 border-b border-gray-100
                          ${scan.status === 'success' ? 'bg-green-50' : scan.status === 'error' ? 'bg-red-50' : 'bg-gray-50'}">
                <div class="flex items-center gap-3">
                  <div class="status-icon">
                    ${scan.status === 'success' ?
                      '<i class="fa fa-check-circle text-green-500"></i>' :
                      scan.status === 'error' ?
                      '<i class="fa fa-times-circle text-red-500"></i>' :
                      '<i class="fa fa-info-circle text-blue-500"></i>'
                    }
                  </div>
                  <div>
                    <div class="font-medium text-sm">${scan.productName || 'Unknown Product'}</div>
                    <div class="text-xs text-gray-500">
                      ${new Date(scan.timestamp).toLocaleTimeString()} • ${scan.barcode || 'N/A'}
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-xs text-gray-500 capitalize">${scan.status}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="flex justify-between items-center mt-4 pt-3 border-t">
            <div class="text-sm text-gray-600">
              Showing last ${recentScans.length} scans
            </div>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-outline-danger"
                      onclick="window.pharmaApp.getModule('pos').clearScanHistory()">
                <i class="fa fa-trash"></i> Clear History
              </button>
              <button class="btn btn-secondary" onclick="window.pharmaApp.getModule('pos').hideRecentScans()">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', historyModal);
  }

  hideRecentScans() {
    const modal = document.getElementById('scanHistoryModal');
    if (modal) {
      modal.remove();
    }
  }

  clearScanHistory() {
    if (confirm('Are you sure you want to clear all scan history?')) {
      localStorage.removeItem('barcodeScanHistory');
      this.hideRecentScans();
      if (window.notiflix) {
        window.notiflix.Notify.success('History Cleared', 'Scan history has been cleared');
      }
    }
  }

  createFeedbackElement() {
    const feedbackElement = document.createElement('div');
    feedbackElement.id = 'barcodeFeedback';
    feedbackElement.className = 'barcode-feedback';
    
    const scannerSection = document.querySelector('.barcode-scanner .card-body');
    if (scannerSection) {
      scannerSection.appendChild(feedbackElement);
    }
    
    return feedbackElement;
  }

  showVariantSelectionModal(variantData) {
    const modalHtml = `
      <div class="variant-selection-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="variantSelectionModal">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Select Variant</h3>
            <button onclick="window.pharmaApp.getModule('pos').hideVariantSelectionModal()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="variant-info mb-4 p-4 bg-gray-50 rounded">
            <h4 class="font-medium">${variantData.product_name}</h4>
            <p class="text-sm text-gray-600">Scanned barcode: <code>${variantData.variant.barcode}</code></p>
            <p class="text-sm text-gray-600">Found variant: <strong>${variantData.variant_key}</strong></p>
          </div>
          
          <div class="variant-options mb-4">
            <h5 class="font-medium mb-2">Available Variants:</h5>
            <div id="variantOptionsContainer" class="grid grid-cols-1 gap-2">
              ${this.renderVariantOptions(variantData)}
            </div>
          </div>
          
          <div class="variant-details mb-4" id="variantDetailsContainer">
            <div class="text-center text-gray-500 py-4">
              <i class="fa fa-info-circle"></i>
              Select a variant to view details
            </div>
          </div>
          
          <div class="flex gap-3">
            <button class="btn btn-secondary flex-1" onclick="window.pharmaApp.getModule('pos').hideVariantSelectionModal()">
              Cancel
            </button>
            <button class="btn btn-success flex-1" id="addVariantToCart" onclick="window.pharmaApp.getModule('pos').addSelectedVariantToCart()" disabled>
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Store variant data for selection
    this.selectedVariantData = variantData;
    this.selectedVariantKey = null;
  }

  hideVariantSelectionModal() {
    const modal = document.getElementById('variantSelectionModal');
    if (modal) {
      modal.remove();
    }
    this.selectedVariantData = null;
    this.selectedVariantKey = null;
  }

  renderVariantOptions(variantData) {
    // This would need to be enhanced to fetch all variants from the matrix
    // For now, show the scanned variant as primary option
    const variant = variantData.variant;
    
    return `
      <div class="variant-option border rounded p-3 cursor-pointer hover:bg-blue-50 ${variantData.variant_key === variantData.variant_key ? 'border-blue-500 bg-blue-50' : ''}" 
           onclick="window.pharmaApp.getModule('pos').selectVariant('${variantData.variant_key}', this)">
        <div class="flex justify-between items-center">
          <div>
            <div class="font-medium">${variantData.variant_key}</div>
            <div class="text-sm text-gray-500">Barcode: ${variant.barcode}</div>
          </div>
          <div class="text-right">
            <div class="font-medium ${variant.stock > 0 ? 'text-green-600' : 'text-red-600'}">
              ${variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
            </div>
            <div class="text-xs text-gray-500">Min: ${variant.min_stock || 0}</div>
          </div>
        </div>
      </div>
    `;
  }

  selectVariant(variantKey, element) {
    // Remove previous selection
    document.querySelectorAll('.variant-option').forEach(opt => {
      opt.classList.remove('border-blue-500', 'bg-blue-50');
    });
    
    // Add selection to clicked element
    element.classList.add('border-blue-500', 'bg-blue-50');
    
    this.selectedVariantKey = variantKey;
    
    // Enable add to cart button
    const addButton = document.getElementById('addVariantToCart');
    if (addButton) {
      addButton.disabled = false;
    }
    
    // Show variant details
    this.showVariantDetails();
  }

  showVariantDetails() {
    if (!this.selectedVariantData || !this.selectedVariantKey) return;
    
    const variantData = this.selectedVariantData;
    const variantKey = this.selectedVariantKey;
    const [color, size] = variantKey.split('-');
    const variant = variantData.variant;
    
    const detailsHtml = `
      <div class="variant-details-content">
        <h5 class="font-medium mb-3">Variant Details</h5>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Color:</strong> ${color}<br>
            <strong>Size:</strong> ${size}<br>
            <strong>Barcode:</strong> <code>${variant.barcode}</code>
          </div>
          <div>
            <strong>Stock:</strong> ${variant.stock}<br>
            <strong>Reserved:</strong> ${variant.reserved || 0}<br>
            <strong>Min Stock:</strong> ${variant.min_stock || 0}
          </div>
        </div>
        <div class="mt-3 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
          <div class="text-sm">
            <strong>Status:</strong> 
            <span class="${variant.stock > 0 ? 'text-green-600' : 'text-red-600'}">
              ${variant.stock > 0 ? 'Available' : 'Out of Stock'}
            </span>
          </div>
        </div>
      </div>
    `;
    
    const container = document.getElementById('variantDetailsContainer');
    if (container) {
      container.innerHTML = detailsHtml;
    }
  }

  addSelectedVariantToCart() {
    if (!this.selectedVariantData || !this.selectedVariantKey) return;
    
    const variantData = this.selectedVariantData;
    const variant = variantData.variant;
    
    // Check stock availability
    if (variant.stock <= 0) {
      if (window.notiflix) {
        window.notiflix.Report.warning('Out of Stock', 'This variant is currently out of stock', 'Ok');
      }
      return;
    }
    
    // Create cart item for variant
    const cartItem = {
      id: `${variantData.product_id}_${this.selectedVariantKey}`,
      product_id: variantData.product_id,
      variant_key: this.selectedVariantKey,
      product_name: `${variantData.product_name} (${this.selectedVariantKey})`,
      sku: variant.barcode,
      price: parseFloat(variantData.product?.price || 0), // This would need to be fetched
      quantity: 1,
      is_variant: true,
      variant_data: {
        matrix_id: variantData.matrix_id,
        variant_key: this.selectedVariantKey,
        color: this.selectedVariantKey.split('-')[0],
        size: this.selectedVariantKey.split('-')[1],
        barcode: variant.barcode
      }
    };
    
    this.addToCart(cartItem);
    this.hideVariantSelectionModal();
    
    // Clear barcode input
    document.getElementById('barcodeInput').value = '';
    
    if (window.notiflix) {
      window.notiflix.Notify.success('Variant Added', `${cartItem.product_name} added to cart`);
    }
  }

  async validateBarcode(barcode) {
    try {
      const response = await fetch(`${window.api}barcode/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ barcode })
      });
      
      const validation = await response.json();
      return validation;
    } catch (error) {
      console.error('Barcode validation failed:', error);
      return { is_valid: false, errors: ['Validation failed'] };
    }
  }

  // Enhanced addToCart to handle variants
  addToCart(product) {
    const posState = this.app.state.getModuleState('pos');
    const cart = [...posState.cart];
    
    // Check if product/variant already exists in cart
    const existingIndex = product.is_variant ? 
      cart.findIndex(item => item.id === product.id) :
      cart.findIndex(item => item.id === product._id);
    
    if (existingIndex >= 0) {
      // Increase quantity
      cart[existingIndex].quantity += 1;
    } else {
      // Add new item
      cart.push({
        id: product.is_variant ? product.id : product._id,
        product_id: product.is_variant ? product.product_id : product._id,
        product_name: product.name || product.product_name,
        sku: product.sku || product.barcode || product._id,
        price: parseFloat(product.price),
        quantity: 1,
        is_variant: product.is_variant || false,
        variant_data: product.variant_data || null
      });
    }
    
    this.app.state.updateModule('pos', { cart });
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
        const response = await fetch(`${window.api}transactions/${transactionId}`);
        const tx = await response.json();
        const settings = this.app.state.getModuleState('app').settings || {};

        let message = `*Invoice from ${settings.store || 'garmentMine'}*\n`;
        message += `Inv #: ${tx.order}\n`;
        message += `Date: ${new Date(tx.date).toLocaleDateString()}\n`;
        message += `--------------------------\n`;
        tx.items.forEach(item => {
            message += `${item.product_name} x ${item.quantity}: ${(item.price * item.quantity).toFixed(2)}\n`;
        });
        message += `--------------------------\n`;
        message += `*Total: ${parseFloat(tx.total).toFixed(2)}*\n`;
        message += `Payment: ${tx.payment_type || 'Paid'}\n`;
        message += `\nThank you for your business!`;

        const encodedMsg = encodeURIComponent(message);
        const phone = tx.customer?.phone || "";

        // Use Electron shell.openExternal for proper Electron compatibility
        if (window.electronAPI && window.electronAPI.openExternal) {
            await window.electronAPI.openExternal(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`);
        } else if (typeof require !== 'undefined') {
            // Fallback for direct Electron context
            const { shell } = require('electron');
            await shell.openExternal(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`);
        } else {
            // Fallback for web context (though this won't work in Electron)
            window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`, '_blank');
        }

        if (window.notiflix) {
            window.notiflix.Notify.success('WhatsApp', 'Invoice shared via WhatsApp');
        }
    } catch (e) {
        console.error("WhatsApp share failed", e);
        if (window.notiflix) {
            window.notiflix.Notify.failure('WhatsApp Share Failed', 'Failed to open WhatsApp');
        }
    }
  }

  async shareEmail(transactionId) {
    try {
        const response = await fetch(`${window.api}transactions/${transactionId}`);
        const tx = await response.json();
        const settings = this.app.state.getModuleState('app').settings || {};

        // Check if real email backend is enabled, otherwise use mailto
        const emailConfig = settings.email_sharing || {};

        if (emailConfig.enabled && emailConfig.smtp_host) {
            // Use real backend email sending
            const subject = `Invoice ${tx.order} from ${settings.store || 'garmentMine'}`;
            let htmlBody = `<html><body>`;
            htmlBody += `<h2>Invoice ${tx.order}</h2>`;
            htmlBody += `<p>Hello ${tx.customer?.name || 'Customer'},</p>`;
            htmlBody += `<p>Please find the details of your invoice:</p>`;
            htmlBody += `<table border="1" cellpadding="5" style="border-collapse: collapse;">`;
            htmlBody += `<tr><th>Item</th><th>Quantity</th><th>Price</th><th>Total</th></tr>`;
            tx.items.forEach(item => {
                const itemTotal = item.quantity * parseFloat(item.price);
                htmlBody += `<tr>`;
                htmlBody += `<td>${item.product_name}</td>`;
                htmlBody += `<td>${item.quantity}</td>`;
                htmlBody += `<td>${parseFloat(item.price).toFixed(2)}</td>`;
                htmlBody += `<td>${itemTotal.toFixed(2)}</td>`;
                htmlBody += `</tr>`;
            });
            htmlBody += `</table>`;
            htmlBody += `<p><strong>Total Amount: ${parseFloat(tx.total).toFixed(2)}</strong></p>`;
            htmlBody += `<p><strong>Payment Mode:</strong> ${tx.payment_type || 'Paid'}</p>`;
            htmlBody += `<p>Thank you for your business!</p>`;
            htmlBody += `<p>Best regards,<br>${settings.store || 'garmentMine'}</p>`;
            htmlBody += `</body></html>`;

            // Send via backend API
            const emailResponse = await fetch(`${window.api}share/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subject: subject,
                    body: htmlBody,
                    to: tx.customer?.email || '',
                    from: emailConfig.from_email || emailConfig.smtp_username
                })
            });

            const result = await emailResponse.json();

            if (result.success) {
                if (window.notiflix) {
                    window.notiflix.Notify.success('Email Sent', 'Invoice sent successfully via email');
                }
            } else {
                throw new Error(result.error || 'Email sending failed');
            }
        } else {
            // Fallback to mailto link
            const subject = `Invoice ${tx.order} from ${settings.store || 'garmentMine'}`;
            let body = `Hello ${tx.customer?.name || 'Customer'},\n\n`;
            body += `Please find the details of your invoice ${tx.order}:\n\n`;
            tx.items.forEach(item => {
                body += `${item.product_name} x ${item.quantity}: ${(item.price * item.quantity).toFixed(2)}\n`;
            });
            body += `\nTotal Amount: ${parseFloat(tx.total).toFixed(2)}\n`;
            body += `Payment Mode: ${tx.payment_type || 'Paid'}\n\n`;
            body += `Thank you,\n${settings.store || 'garmentMine'}`;

            const mailto = `mailto:${tx.customer?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

            // Use Electron shell.openExternal for proper compatibility
            if (window.electronAPI && window.electronAPI.openExternal) {
                await window.electronAPI.openExternal(mailto);
            } else if (typeof require !== 'undefined') {
                const { shell } = require('electron');
                await shell.openExternal(mailto);
            } else {
                window.location.href = mailto;
            }

            if (window.notiflix) {
                window.notiflix.Notify.info('Email Client', 'Opening email client to send invoice');
            }
        }
    } catch (e) {
        console.error("Email share failed", e);
        if (window.notiflix) {
            window.notiflix.Notify.failure('Email Share Failed', e.message || 'Failed to send email');
        }
    }
  }

  /**
   * RECEIPT AUTO-SAVE METHODS
   */

  async autoSaveReceipt(transactionResult) {
    try {
      // Initialize ReceiptManager if not already done
      if (!window.ReceiptManager) {
        console.warn('ReceiptManager not available, skipping auto-save');
        return;
      }

      // Generate receipt HTML for saving
      const receiptHtml = this.generateReceiptHTML(transactionResult);

      // Call ReceiptManager to auto-save
      await window.ReceiptManager.autoSaveReceipt(transactionResult, receiptHtml);

    } catch (error) {
      console.error('Error in auto-save receipt:', error);
      // Don't throw - this shouldn't block the transaction
    }
  }

  generateReceiptHTML(transactionResult) {
    const date = transactionResult.date ? new Date(transactionResult.date).toLocaleDateString() : new Date().toLocaleDateString();
    const time = transactionResult.date ? new Date(transactionResult.date).toLocaleTimeString() : new Date().toLocaleTimeString();

    return `
      <div style="font-family: monospace; max-width: 300px; margin: 0 auto; padding: 10px;">
        <div style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 10px;">
          <h2 style="margin: 0; font-size: 18px;">RECEIPT</h2>
          <p style="margin: 5px 0;">Transaction #${transactionResult.order || transactionResult._id}</p>
          <p style="margin: 5px 0;">${date} ${time}</p>
        </div>

        <div style="margin-bottom: 10px;">
          ${transactionResult.customer && transactionResult.customer.name ?
            `<p><strong>Customer:</strong> ${transactionResult.customer.name}</p>` : ''
          }
        </div>

        <div style="border-bottom: 1px solid #000; margin-bottom: 10px;">
          ${transactionResult.items.map(item => `
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span>${item.product_name}</span>
              <span>${item.quantity} x ${parseFloat(item.price).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>

        <div style="text-align: right; margin-bottom: 10px;">
          <p><strong>Total: ${parseFloat(transactionResult.total || 0).toFixed(2)}</strong></p>
          ${transactionResult.payment_type ? `<p>Payment: ${transactionResult.payment_type}</p>` : ''}
          ${transactionResult.paid ? `<p>Paid: ${parseFloat(transactionResult.paid).toFixed(2)}</p>` : ''}
          ${transactionResult.change ? `<p>Change: ${parseFloat(transactionResult.change).toFixed(2)}</p>` : ''}
        </div>

        <div style="text-align: center; font-size: 12px; color: #666;">
          <p>Thank you for your business!</p>
        </div>
      </div>
    `;
  }

  /**
   * PROMOTION INTEGRATION METHODS
   */

  async calculatePromotions() {
    const posState = this.app.state.getModuleState('pos');
    const cart = posState.cart || [];
    const currentCustomer = posState.currentCustomer;
    
    if (cart.length === 0) {
      return {
        applicable_promotions: [],
        total_discount: 0,
        discount_breakdown: {}
      };
    }
    
    try {
      const cartItems = cart.map(item => ({
        id: item.id,
        product_name: item.product_name,
        category: item.category || 'general',
        price: item.price,
        quantity: item.quantity
      }));
      
      const orderValue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const customerId = currentCustomer?._id || null;
      const loyaltyTier = currentCustomer?.loyalty_program?.tier || 'bronze';
      
      const response = await fetch(`${window.api}promotions/rules/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cart_items: cartItems,
          customer_id: customerId,
          order_value: orderValue,
          customer_loyalty_tier: loyaltyTier
        })
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('Error calculating promotions:', error);
      return {
        applicable_promotions: [],
        total_discount: 0,
        discount_breakdown: {}
      };
    }
  }

  updateCartDisplayWithPromotions(promoResult) {
    // Update the cart display to show applied promotions
    const promoBadge = document.querySelector('.promotion-badge');
    if (promoBadge) {
      if (promoResult.total_discount > 0) {
        promoBadge.innerHTML = `
          <i class="fa fa-tags text-success"></i>
          <span class="text-success">₹${promoResult.total_discount.toFixed(2)} saved!</span>
        `;
        promoBadge.style.display = 'block';
      } else {
        promoBadge.style.display = 'none';
      }
    }
  }

  showPromotionDetails() {
    const posState = this.app.state.getModuleState('pos');
    const cartTotals = posState.cartTotals;
    const promotions = cartTotals?.promotions;
    
    if (!promotions || promotions.applicable_promotions.length === 0) {
      if (window.notiflix) {
        window.notiflix.Notify.info('No Promotions', 'No promotions applicable to current cart');
      }
      return;
    }
    
    const modalHtml = `
      <div class="promotion-details-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="promotionDetailsModal">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Applied Promotions</h3>
            <button onclick="window.pharmaApp.getModule('pos').hidePromotionDetails()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="promotions-list">
            ${promotions.applicable_promotions.map(promo => `
              <div class="promotion-item border rounded p-3 mb-3 bg-green-50">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <h5 class="font-medium text-green-800">${promo.rule_name || promo.campaign_name}</h5>
                    <p class="text-sm text-green-600">
                      ${promo.discount_type} discount applied
                    </p>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-green-800">₹${promo.discount_amount.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="promotion-summary mt-4 p-3 bg-gray-50 rounded">
            <div class="flex justify-between items-center">
              <span class="font-medium">Total Savings:</span>
              <span class="font-bold text-green-600">₹${promotions.total_discount.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="flex justify-end gap-3 mt-6">
            <button class="btn btn-secondary" onclick="window.pharmaApp.getModule('pos').hidePromotionDetails()">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  hidePromotionDetails() {
    const modal = document.getElementById('promotionDetailsModal');
    if (modal) {
      modal.remove();
    }
  }

  /**
   * ITEM-LEVEL DISCOUNT METHODS
   */

  renderShoppingCartWithItemDiscounts(cart, totals) {
    return `
      <div class="shopping-cart">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title" id="cart-heading">Cart Items (${cart.length})</h3>
          </div>
          <div class="card-body">
            <div class="cart-items" style="max-height: 400px; overflow-y: auto;" role="list" aria-labelledby="cart-heading">
              ${cart.length === 0 ?
                '<div class="text-center text-gray-500 py-8" role="status" aria-live="polite">Cart is empty</div>' :
                cart.map((item, index) => this.renderCartItemWithDiscount(item, index)).join('')
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

            <!-- Promotion Controls -->
            <div class="promotion-controls mt-3 flex gap-2">
                <button class="btn btn-info btn-sm" onclick="window.pharmaApp.getModule('pos').showPromotionCodeEntry()">
                    <i class="fa fa-ticket"></i> Apply Code
                </button>
                <button class="btn btn-success btn-sm" onclick="window.pharmaApp.getModule('pos').showPromotionDetails()">
                    <i class="fa fa-tags"></i> View Promotions
                </button>
            </div>

            <!-- Promotion Badge -->
            <div class="promotion-badge mt-2 p-2 bg-green-50 rounded border-l-4 border-green-400" style="display: none;">
                <i class="fa fa-tags text-success"></i>
                <span class="text-success font-medium"></span>
            </div>

            ${cart.length > 0 ? this.renderCartTotals(totals) : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderCartItemWithDiscount(item, index) {
    const itemKey = `${item.id}_${index}`;
    const itemDiscount = this.itemDiscounts[itemKey] || { type: 'none', value: 0 };
    const originalPrice = item.price * item.quantity;
    const discountAmount = this.calculateItemDiscountAmount(item, itemDiscount);
    const discountedPrice = originalPrice - discountAmount;

    return `
      <div class="cart-item flex items-center gap-3 p-3 border-b focusable" tabindex="0"
           role="listitem"
           aria-label="${item.product_name}, quantity ${item.quantity}, price ${(discountedPrice).toFixed(2)}. Use arrow keys to navigate, Delete to remove"
           data-cart-index="${index}">
        <div class="flex-1">
          <div class="font-medium">${item.product_name}</div>
          <div class="text-sm text-gray-500">${item.sku}</div>
          ${itemDiscount.type !== 'none' ? `
            <div class="text-sm text-green-600">
              <i class="fa fa-percent"></i> ${this.formatDiscountDisplay(itemDiscount)}
            </div>
          ` : ''}
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-sm btn-secondary"
                  onclick="window.pharmaApp.getModule('pos').updateCartQuantity(${index}, ${item.quantity - 1})"
                  aria-label="Decrease quantity for ${item.product_name}">-</button>
          <input type="number" class="form-input quantity-input" style="width: 60px"
                 value="${item.quantity}" min="1"
                 onchange="window.pharmaApp.getModule('pos').updateCartQuantity(${index}, this.value)"
                 aria-label="Quantity for ${item.product_name}">
          <button class="btn btn-sm btn-secondary"
                  onclick="window.pharmaApp.getModule('pos').updateCartQuantity(${index}, ${item.quantity + 1})"
                  aria-label="Increase quantity for ${item.product_name}">+</button>
        </div>
        <div class="text-right">
          ${itemDiscount.type !== 'none' ? `
            <div class="text-sm text-gray-500 line-through">₹${originalPrice.toFixed(2)}</div>
          ` : ''}
          <div class="font-medium ${itemDiscount.type !== 'none' ? 'text-green-600' : ''}">₹${discountedPrice.toFixed(2)}</div>
          <div class="text-sm text-gray-500">₹${item.price.toFixed(2)} each</div>
        </div>
        <div class="flex flex-col gap-1">
          <button class="btn btn-sm btn-danger"
                  onclick="window.pharmaApp.getModule('pos').removeFromCart(${index})"
                  aria-label="Remove ${item.product_name} from cart">
            <i class="fa fa-times"></i>
          </button>
          <button class="btn btn-sm btn-info"
                  onclick="window.pharmaApp.getModule('pos').showItemDiscountModal(${index})"
                  aria-label="Apply discount to ${item.product_name}">
            <i class="fa fa-percent"></i>
          </button>
        </div>
      </div>
    `;
  }

  showItemDiscountModal(index) {
    const posState = this.app.state.getModuleState('pos');
    const item = posState.cart[index];
    if (!item) return;

    this.currentDiscountItemIndex = index;
    const itemKey = `${item.id}_${index}`;
    const currentDiscount = this.itemDiscounts[itemKey] || { type: 'none', value: 0 };

    const modalHtml = `
      <div class="item-discount-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
           id="itemDiscountModal">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">
              <i class="fa fa-percent text-primary"></i> Apply Discount to ${item.product_name}
            </h3>
            <button onclick="window.pharmaApp.getModule('pos').hideItemDiscountModal()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>

          <div class="item-details mb-4 p-3 bg-gray-50 rounded">
            <div class="flex justify-between mb-2">
              <span>Original Price:</span>
              <span>₹${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            <div class="flex justify-between">
              <span>Quantity:</span>
              <span>${item.quantity}</span>
            </div>
          </div>

          <div class="discount-options mb-4">
            <label class="form-label">Discount Type</label>
            <div class="discount-type-options grid grid-cols-1 gap-2">
              <label class="discount-option flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-blue-50">
                <input type="radio" name="discountType" value="none"
                       ${currentDiscount.type === 'none' ? 'checked' : ''}
                       onchange="window.pharmaApp.getModule('pos').selectDiscountType('none')">
                <div class="flex-1">
                  <div class="font-medium">No Discount</div>
                  <div class="text-sm text-gray-600">Remove any applied discount</div>
                </div>
              </label>

              <label class="discount-option flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-blue-50">
                <input type="radio" name="discountType" value="percentage"
                       ${currentDiscount.type === 'percentage' ? 'checked' : ''}
                       onchange="window.pharmaApp.getModule('pos').selectDiscountType('percentage')">
                <div class="flex-1">
                  <div class="font-medium">Percentage Discount</div>
                  <div class="text-sm text-gray-600">Discount by percentage (e.g., 10%)</div>
                </div>
              </label>

              <label class="discount-option flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-blue-50">
                <input type="radio" name="discountType" value="fixed"
                       ${currentDiscount.type === 'fixed' ? 'checked' : ''}
                       onchange="window.pharmaApp.getModule('pos').selectDiscountType('fixed')">
                <div class="flex-1">
                  <div class="font-medium">Fixed Amount Discount</div>
                  <div class="text-sm text-gray-600">Discount by fixed amount (e.g., ₹50)</div>
                </div>
              </label>
            </div>
          </div>

          <div class="discount-value mb-4" id="discountValueSection"
               style="${currentDiscount.type === 'none' ? 'display: none;' : ''}">
            <label class="form-label" id="discountValueLabel">
              ${currentDiscount.type === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
            </label>
            <input type="number" class="form-input" id="discountValueInput"
                   value="${currentDiscount.value}"
                   min="0" step="${currentDiscount.type === 'percentage' ? '0.1' : '0.01'}"
                   max="${currentDiscount.type === 'percentage' ? '100' : (item.price * item.quantity)}"
                   onchange="window.pharmaApp.getModule('pos').updateDiscountValue(this.value)"
                   oninput="window.pharmaApp.getModule('pos').previewItemDiscount()">
            <div class="text-sm text-gray-600 mt-1">
              Max discount: ${currentDiscount.type === 'percentage' ? '100%' : '₹' + (item.price * item.quantity).toFixed(2)}
            </div>
          </div>

          <div class="discount-preview mb-4 p-3 bg-green-50 rounded border border-green-200">
            <h6 class="font-medium mb-2 text-green-800">Discount Preview</h6>
            <div id="discountPreview">
              ${this.renderDiscountPreview(item, currentDiscount)}
            </div>
          </div>

          <div class="flex gap-3">
            <button class="btn btn-secondary flex-1" onclick="window.pharmaApp.getModule('pos').hideItemDiscountModal()">
              Cancel
            </button>
            <button class="btn btn-success flex-1" onclick="window.pharmaApp.getModule('pos').applyItemDiscount()">
              Apply Discount
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.updateDiscountPreview();
  }

  hideItemDiscountModal() {
    const modal = document.getElementById('itemDiscountModal');
    if (modal) {
      modal.remove();
    }
    this.currentDiscountItemIndex = null;
  }

  selectDiscountType(type) {
    const valueSection = document.getElementById('discountValueSection');
    const valueInput = document.getElementById('discountValueInput');
    const valueLabel = document.getElementById('discountValueLabel');

    if (type === 'none') {
      if (valueSection) valueSection.style.display = 'none';
      if (valueInput) valueInput.value = '0';
    } else {
      if (valueSection) valueSection.style.display = 'block';
      if (valueLabel) {
        valueLabel.textContent = type === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (₹)';
      }
      if (valueInput) {
        valueInput.step = type === 'percentage' ? '0.1' : '0.01';
        valueInput.value = '0';
      }
    }

    this.updateDiscountPreview();
  }

  updateDiscountValue(value) {
    // Value is updated in real-time through oninput event
    this.updateDiscountPreview();
  }

  previewItemDiscount() {
    // Called from oninput event to update preview in real-time
    this.updateDiscountPreview();
  }

  updateDiscountPreview() {
    const posState = this.app.state.getModuleState('pos');
    const item = posState.cart[this.currentDiscountItemIndex];
    if (!item) return;

    const discountType = document.querySelector('input[name="discountType"]:checked')?.value || 'none';
    const discountValue = parseFloat(document.getElementById('discountValueInput')?.value || 0);

    const discount = { type: discountType, value: discountValue };
    const previewHtml = this.renderDiscountPreview(item, discount);

    const previewElement = document.getElementById('discountPreview');
    if (previewElement) {
      previewElement.innerHTML = previewHtml;
    }
  }

  renderDiscountPreview(item, discount) {
    const originalPrice = item.price * item.quantity;
    const discountAmount = this.calculateItemDiscountAmount(item, discount);
    const discountedPrice = Math.max(0, originalPrice - discountAmount);
    const savings = originalPrice - discountedPrice;

    return `
      <div class="space-y-1 text-sm">
        <div class="flex justify-between">
          <span>Original Total:</span>
          <span>₹${originalPrice.toFixed(2)}</span>
        </div>
        ${discount.type !== 'none' ? `
          <div class="flex justify-between text-red-600">
            <span>Discount (${this.formatDiscountDisplay(discount)}):</span>
            <span>-₹${discountAmount.toFixed(2)}</span>
          </div>
          <div class="flex justify-between font-medium text-green-600 border-t pt-1">
            <span>New Total:</span>
            <span>₹${discountedPrice.toFixed(2)}</span>
          </div>
          <div class="text-center text-green-600 font-medium">
            You save ₹${savings.toFixed(2)}!
          </div>
        ` : `
          <div class="text-gray-600 text-center">
            No discount applied
          </div>
        `}
      </div>
    `;
  }

  applyItemDiscount() {
    const posState = this.app.state.getModuleState('pos');
    const item = posState.cart[this.currentDiscountItemIndex];
    if (!item) {
      console.error('No item found at index:', this.currentDiscountItemIndex);
      return;
    }

    const discountType = document.querySelector('input[name="discountType"]:checked')?.value || 'none';
    const discountValueInput = document.getElementById('discountValueInput');
    const discountValue = parseFloat(discountValueInput?.value || 0);

    // Validate discount value
    if (discountType !== 'none' && (isNaN(discountValue) || discountValue < 0)) {
      if (window.notiflix) {
        window.notiflix.Notify.warning('Invalid Discount', 'Please enter a valid positive number');
      }
      return;
    }

    const itemKey = item.id + '_' + this.currentDiscountItemIndex;

    // Validate maximum discount limits
    const originalPrice = item.price * item.quantity;
    let validatedDiscountValue = discountValue;

    if (discountType === 'percentage' && discountValue > 100) {
      validatedDiscountValue = 100;
      console.warn('Percentage discount capped at 100%');
    } else if (discountType === 'fixed' && discountValue > originalPrice) {
      validatedDiscountValue = originalPrice;
      console.warn('Fixed discount cannot exceed item price');
    }

    if (discountType === 'none') {
      delete this.itemDiscounts[itemKey];
      this.logDiscountChange(itemKey, 'removed', null);
    } else {
      this.itemDiscounts[itemKey] = {
        type: discountType,
        value: validatedDiscountValue,
        appliedAt: new Date().toISOString(),
        appliedBy: window.user?.fullname || 'POS User',
        originalPrice: originalPrice,
        itemId: item.id,
        itemName: item.product_name
      };
      this.logDiscountChange(itemKey, 'applied', this.itemDiscounts[itemKey]);
    }

    this.hideItemDiscountModal();
    this.render(); // Refresh cart display

    if (window.notiflix) {
      if (discountType === 'none') {
        window.notiflix.Notify.info('Discount Removed', 'Item discount has been removed');
      } else {
        window.notiflix.Notify.success('Discount Applied', 'Discount applied to ' + item.product_name);
      }
    }
  }

  /**
   * Log discount changes for audit trail
   */
  logDiscountChange(itemKey, action, discountData) {
    try {
      const auditLog = {
        timestamp: new Date().toISOString(),
        action: action,
        itemKey: itemKey,
        discountType: discountData?.type || 'none',
        discountValue: discountData?.value || 0,
        appliedBy: discountData?.appliedBy || 'system',
        originalPrice: discountData?.originalPrice || 0,
        itemName: discountData?.itemName || 'unknown',
        userId: window.user?._id || 0,
        sessionId: this.generateSessionId()
      };

      // Store in local storage for immediate audit trail
      const discountAuditLogs = JSON.parse(localStorage.getItem('discountAuditLogs') || '[]');
      discountAuditLogs.push(auditLog);
      localStorage.setItem('discountAuditLogs', JSON.stringify(discountAuditLogs));

      // Send to server for permanent storage
      this.sendAuditLogToServer(auditLog);

      console.log('Discount audit logged:', auditLog);
    } catch (error) {
      console.error('Error logging discount change:', error);
    }
  }

  /**
   * Send audit log to server
   */
  async sendAuditLogToServer(auditLog) {
    try {
      if (!window.api) {
        console.warn('API endpoint not available, audit log will be stored locally only');
        return;
      }

      const response = await fetch(window.api + 'audit/discount-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(auditLog)
      });

      if (!response.ok) {
        console.error('Failed to send audit log to server:', response.status);
      }
    } catch (error) {
      console.error('Network error sending audit log:', error);
    }
  }

  /**
   * Generate session ID for audit trail
   */
  generateSessionId() {
    return 'pos-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
  }

  /**
   * Get discount audit logs for reporting
   */
  getDiscountAuditLogs() {
    try {
      return JSON.parse(localStorage.getItem('discountAuditLogs') || '[]');
    } catch (error) {
      console.error('Error retrieving discount audit logs:', error);
      return [];
    }
  }

  /**
   * Clear old audit logs (older than 30 days)
   */
  cleanupOldAuditLogs() {
    try {
      const logs = this.getDiscountAuditLogs();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentLogs = logs.filter(log => {
        try {
          const logDate = new Date(log.timestamp);
          return logDate >= thirtyDaysAgo;
        } catch (e) {
          return true; // Keep logs with invalid dates
        }
      });

      if (recentLogs.length < logs.length) {
        localStorage.setItem('discountAuditLogs', JSON.stringify(recentLogs));
        console.log('Cleaned up old discount audit logs:', logs.length - recentLogs.length, 'removed');
      }
    } catch (error) {
      console.error('Error cleaning up audit logs:', error);
    }
  }

  calculateItemDiscountAmount(item, discount) {
    try {
      // Validate item exists and has valid price
      if (!item || isNaN(item.price) || item.price < 0 || isNaN(item.quantity) || item.quantity <= 0) {
        console.error('Invalid item data for discount calculation:', item);
        return 0;
      }

      const originalPrice = item.price * item.quantity;

      // Validate discount exists and is valid
      if (!discount || !discount.type || discount.type === 'none') {
        return 0;
      }

      // Validate discount value is a number
      const discountValue = parseFloat(discount.value);
      if (isNaN(discountValue) || discountValue < 0) {
        console.warn('Invalid discount value:', discount.value);
        return 0;
      }

      // Optimized discount calculation based on type
      switch (discount.type) {
        case 'percentage':
          // Validate percentage is within bounds (0-100)
          const percentage = Math.min(100, Math.max(0, discountValue));
          return this.calculatePercentageDiscount(originalPrice, percentage);
        case 'fixed':
          // Validate fixed amount doesn't exceed original price
          return this.calculateFixedDiscount(discountValue, originalPrice);
        default:
          console.warn('Unknown discount type:', discount.type);
          return 0;
      }
    } catch (error) {
      console.error('Error calculating item discount:', error);
      return 0;
    }
  }

  /**
   * Calculate percentage discount with precision handling
   */
  calculatePercentageDiscount(originalPrice, percentage) {
    // Use precise calculation to avoid floating point issues
    const discountAmount = (originalPrice * percentage) / 100;
    // Round to 2 decimal places for currency
    return Math.round(discountAmount * 100) / 100;
  }

  /**
   * Calculate fixed discount with validation
   */
  calculateFixedDiscount(discountValue, originalPrice) {
    // Ensure discount doesn't exceed original price
    const cappedDiscount = Math.min(discountValue, originalPrice);
    // Round to 2 decimal places for currency
    return Math.round(cappedDiscount * 100) / 100;
  }

  /**
   * Validate discount can be applied to item
   */
  validateDiscountForItem(item, discount) {
    try {
      // Check if item exists
      if (!item) {
        return { valid: false, error: 'Item not found' };
      }

      // Check if discount is valid
      if (!discount || !discount.type || discount.type === 'none') {
        return { valid: true, error: null }; // No discount is valid
      }

      // Validate discount value
      const discountValue = parseFloat(discount.value);
      if (isNaN(discountValue) || discountValue < 0) {
        return { valid: false, error: 'Invalid discount value' };
      }

      // Validate discount type
      if (discount.type !== 'percentage' && discount.type !== 'fixed') {
        return { valid: false, error: 'Invalid discount type' };
      }

      // Validate percentage bounds
      if (discount.type === 'percentage' && discountValue > 100) {
        return { valid: false, error: 'Percentage discount cannot exceed 100%' };
      }

      // Validate fixed amount doesn't exceed item price
      const originalPrice = item.price * item.quantity;
      if (discount.type === 'fixed' && discountValue > originalPrice) {
        return { valid: false, error: 'Fixed discount cannot exceed item price' };
      }

      return { valid: true, error: null };
    } catch (error) {
      console.error('Error validating discount:', error);
      return { valid: false, error: 'Validation error: ' + error.message };
    }
  }

  formatDiscountDisplay(discount) {
    switch (discount.type) {
      case 'percentage':
        return discount.value + '%';
      case 'fixed':
        return '₹' + discount.value.toFixed(2);
      default:
        return 'None';
    }
  }

  calculateCartTotalWithItemDiscounts() {
    const posState = this.app.state.getModuleState('pos');
    const appState = this.app.state.getModuleState('app');
    const settings = appState.settings || {};
    const cart = posState.cart;

    // Calculate subtotal with item discounts
    let subtotal = 0;
    cart.forEach((item, index) => {
      const itemKey = `${item.id}_${index}`;
      const discount = this.itemDiscounts[itemKey] || { type: 'none', value: 0 };
      const originalPrice = item.price * item.quantity;
      const discountAmount = this.calculateItemDiscountAmount(item, discount);
      subtotal += (originalPrice - discountAmount);
    });

    // Calculate automatic promotions on discounted subtotal
    this.calculatePromotions().then(promoResult => {
      const totalDiscount = parseFloat(promoResult.total_discount || 0);
      this.updateCartDisplayWithPromotions(promoResult);

      let cgst = 0, sgst = 0, igst = 0, totalTax = 0;

      if (settings.charge_tax) {
        const taxableAmount = subtotal - totalDiscount;
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

      const total = subtotal - totalDiscount + totalTax;

      this.app.state.updateModule('pos', {
        cartTotals: {
          subtotal: subtotal.toFixed(2),
          discount: totalDiscount.toFixed(2),
          tax: totalTax.toFixed(2),
          cgst: cgst.toFixed(2),
          sgst: sgst.toFixed(2),
          igst: igst.toFixed(2),
          total: total.toFixed(2),
          items: cart.length,
          promotions: promoResult,
          itemDiscounts: this.calculateTotalItemDiscounts()
        }
      });

      this.render(); // Re-render to show updated totals
    });

    // Return current totals while promotions are being calculated
    const currentDiscount = posState.cartTotals?.discount || 0;
    const currentTotal = subtotal - currentDiscount;

    return {
      subtotal: subtotal.toFixed(2),
      discount: currentDiscount.toFixed(2),
      tax: '0.00',
      cgst: '0.00',
      sgst: '0.00',
      igst: '0.00',
      total: currentTotal.toFixed(2),
      items: cart.length
    };
  }

  calculateTotalItemDiscounts() {
    const posState = this.app.state.getModuleState('pos');
    const cart = posState.cart;
    let totalItemDiscount = 0;

    cart.forEach((item, index) => {
      const itemKey = `${item.id}_${index}`;
      const discount = this.itemDiscounts[itemKey];
      if (discount && discount.type !== 'none') {
        totalItemDiscount += this.calculateItemDiscountAmount(item, discount);
      }
    });

    return {
      totalAmount: totalItemDiscount,
      formatted: totalItemDiscount.toFixed(2),
      items: Object.keys(this.itemDiscounts).length
    };
  }

  clearAllItemDiscounts() {
    this.itemDiscounts = {};
    this.render();

    if (window.notiflix) {
      window.notiflix.Notify.info('Discounts Cleared', 'All item-level discounts have been removed');
    }
  }

  showPromotionCodeEntry() {
    const modalHtml = `
      <div class="promotion-code-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="promotionCodeModal">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Enter Promotion Code</h3>
            <button onclick="window.pharmaApp.getModule('pos').hidePromotionCodeEntry()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <form onsubmit="window.pharmaApp.getModule('pos').handlePromotionCodeSubmit(event)">
            <div class="form-group mb-4">
              <label class="form-label">Promotion Code</label>
              <input type="text" class="form-input" id="promotionCodeInput" 
                     placeholder="Enter code (e.g., WINTER20)" autofocus>
            </div>
            
            <div class="flex gap-3">
              <button type="button" class="btn btn-secondary flex-1" onclick="window.pharmaApp.getModule('pos').hidePromotionCodeEntry()">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary flex-1">
                Apply Code
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  hidePromotionCodeEntry() {
    const modal = document.getElementById('promotionCodeModal');
    if (modal) {
      modal.remove();
    }
  }

  async handlePromotionCodeSubmit(event) {
    event.preventDefault();
    
    const code = document.getElementById('promotionCodeInput').value.trim();
    if (!code) return;
    
    try {
      if (window.notiflix) window.notiflix.Block.standard('#promotionCodeModal .modal-content', 'Validating Code...');
      
      const posState = this.app.state.getModuleState('pos');
      const cart = posState.cart || [];
      const currentCustomer = posState.currentCustomer;
      const orderValue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const response = await fetch(`${window.api}promotions/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          promotion_code: code,
          customer_id: currentCustomer?._id,
          order_value: orderValue,
          items: cart
        })
      });
      
      const result = await response.json();
      
      if (window.notiflix) window.notiflix.Block.remove('#promotionCodeModal .modal-content');
      
      if (result.valid) {
        this.hidePromotionCodeEntry();
        
        // Add manual promotion to cart
        const manualPromo = {
          promotion_id: result.promotion.promotion_id,
          rule_name: result.promotion.promotion_name,
          discount_amount: result.discount_amount,
          discount_type: 'manual_code',
          priority: 0
        };
        
        // Update cart totals with manual promotion
        const currentTotals = this.calculateCartTotal();
        const newDiscount = parseFloat(currentTotals.discount) + result.discount_amount;
        
        this.app.state.updateModule('pos', {
          cartTotals: {
            ...currentTotals,
            discount: newDiscount.toFixed(2),
            total: (parseFloat(currentTotals.subtotal) - newDiscount).toFixed(2),
            manual_promotion: manualPromo
          }
        });
        
        this.render();
        
        if (window.notiflix) {
          window.notiflix.Notify.success(
            'Code Applied', 
            `Promotion code applied! You saved ₹${result.discount_amount.toFixed(2)}`
          );
        }
      } else {
        if (window.notiflix) {
          window.notiflix.Report.warning('Invalid Code', result.error || 'Promotion code is not valid');
        }
      }
      
    } catch (error) {
      console.error('Error validating promotion code:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('#promotionCodeModal .modal-content');
        window.notiflix.Report.failure('Error', 'Failed to validate promotion code', 'Ok');
      }
    }
  }

  async trackPromotionInteraction(interactionType, campaignId, discountAmount) {
    try {
      const posState = this.app.state.getModuleState('pos');
      const currentCustomer = posState.currentCustomer;
      const cartTotals = posState.cartTotals;
      
      await fetch(`${window.api}promotions/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          interaction_type: interactionType,
          customer_id: currentCustomer?._id,
          order_value: parseFloat(cartTotals?.subtotal || 0),
          discount_applied: discountAmount,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error tracking promotion interaction:', error);
    }
  }

  /**
   * LOYALTY SYSTEM INTEGRATION METHODS
   */

  async loadCustomerLoyaltyProfile(customerId) {
    try {
      const response = await fetch(`${window.api}loyalty/customer/${customerId}`);
      this.currentLoyaltyProfile = await response.json();
      
      // Calculate loyalty benefits for current cart
      await this.calculateLoyaltyBenefits();
      
      // Load available redemptions
      await this.loadAvailableRedemptions();
      
    } catch (error) {
      console.error('Error loading loyalty profile:', error);
      this.currentLoyaltyProfile = null;
      this.loyaltyDiscount = 0;
      this.pointsToEarn = 0;
    }
  }

  async calculateLoyaltyBenefits() {
    if (!this.currentLoyaltyProfile) {
      this.loyaltyDiscount = 0;
      this.pointsToEarn = 0;
      return;
    }

    const posState = this.app.state.getModuleState('pos');
    const cart = posState.cart || [];
    const orderValue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    try {
      // Get loyalty discount
      const discountResponse = await fetch(`${window.api}loyalty/discount/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: this.currentLoyaltyProfile.customer._id,
          orderValue: orderValue,
          category: 'general'
        })
      });
      
      const discountData = await discountResponse.json();
      this.loyaltyDiscount = discountData.discountAmount || 0;
      
      // Calculate points to earn
      const tier = this.currentLoyaltyProfile.tier?.tier || 'bronze';
      const multiplier = this.currentLoyaltyProfile.benefits?.pointsMultiplier || 1;
      this.pointsToEarn = Math.floor(orderValue * multiplier);
      
    } catch (error) {
      console.error('Error calculating loyalty benefits:', error);
      this.loyaltyDiscount = 0;
      this.pointsToEarn = Math.floor(orderValue);
    }
  }

  async loadAvailableRedemptions() {
    if (!this.currentLoyaltyProfile) {
      this.availableRedemptions = [];
      return;
    }

    try {
      const tier = this.currentLoyaltyProfile.tier?.tier || 'bronze';
      const customerId = this.currentLoyaltyProfile.customer._id;
      
      const response = await fetch(`${window.api}loyalty/rewards?customerId=${customerId}&tier=${tier}`);
      this.availableRedemptions = await response.json();
      
    } catch (error) {
      console.error('Error loading available redemptions:', error);
      this.availableRedemptions = [];
    }
  }

  async awardLoyaltyPoints(customerId, points, reason, orderValue) {
    try {
      await fetch(`${window.api}loyalty/points/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId,
          points: points,
          reason: reason,
          orderValue: orderValue,
          metadata: {
            timestamp: new Date(),
            source: 'pos_system'
          }
        })
      });
    } catch (error) {
      console.error('Error awarding loyalty points:', error);
    }
  }

  /**
   * ENHANCED VISUAL GRID INTEGRATION METHODS
   */

  initializeEnhancedVisualGrid() {
    try {
      // Load the enhanced visual grid CSS if not already loaded
      if (!document.querySelector('link[href*="enhanced-visual-grid.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'assets/css/enhanced-visual-grid.css';
        document.head.appendChild(link);
      }
      
      // Load the enhanced visual grid JavaScript if not already loaded
      if (typeof EnhancedVisualGrid === 'undefined') {
        const script = document.createElement('script');
        script.src = 'assets/js/modules/enhanced-visual-grid.js';
        script.onload = () => this.setupVisualGrid();
        document.head.appendChild(script);
      } else {
        this.setupVisualGrid();
      }
      
      console.log('Enhanced Visual Grid system initialized');
    } catch (error) {
      console.error('Error initializing enhanced visual grid:', error);
    }
  }

  setupVisualGrid() {
    try {
      // Create the visual grid instance
      this.visualGrid = new EnhancedVisualGrid({
        containerId: 'enhanced-product-grid',
        layout: this.productDisplayMode,
        enableDragAndDrop: this.enableDragAndDrop,
        enableVariantSelection: true,
        enableQuickActions: true,
        mobileBreakpoint: 768
      });
      
      // Make it globally accessible for event handlers
      window.visualGrid = this.visualGrid;
      
      // Override the addToCart method to integrate with POS cart
      this.visualGrid.addToCart = this.addToCartEnhanced.bind(this);
      
    } catch (error) {
      console.error('Error setting up visual grid:', error);
    }
  }

  renderEnhancedVisualInterface() {
    const posState = this.app.state.getModuleState('pos');
    const totals = this.calculateCartTotal();
    
    return `
      <div class="module-container pos-module enhanced-pos-interface" data-module="pos">
        <div class="module-header">
          <div class="flex justify-between items-center">
            <div>
              <h1 class="module-title">Enhanced Point of Sale</h1>
              <p class="module-subtitle">Visual shopping experience with image-based product selection</p>
            </div>
            <div class="view-mode-selector">
              <button class="btn btn-sm ${this.currentViewMode === 'visual' ? 'btn-primary' : 'btn-secondary'}" 
                      onclick="window.pharmaApp.getModule('pos').setViewMode('visual')">
                <i class="fa fa-th-large"></i> Visual Grid
              </button>
              <button class="btn btn-sm ${this.currentViewMode === 'traditional' ? 'btn-primary' : 'btn-secondary'}" 
                      onclick="window.pharmaApp.getModule('pos').setViewMode('traditional')">
                <i class="fa fa-list"></i> Traditional
              </button>
            </div>
          </div>
        </div>
        
        ${this.currentViewMode === 'visual' ? this.renderVisualGridInterface() : this.renderTraditionalInterface(posState, totals)}
      </div>
    `;
  }

  renderVisualGridInterface() {
    return `
      <div class="visual-grid-layout">
        <!-- Customer and Search Section -->
        <div class="visual-controls-section mb-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1">
              ${this.renderCustomerSelector(this.app.state.getModuleState('pos').currentCustomer)}
            </div>
            <div class="lg:col-span-2">
              ${this.renderEnhancedSearchAndFilters()}
            </div>
          </div>
        </div>
        
        <!-- Enhanced Product Grid -->
        <div class="enhanced-product-section">
          <div id="enhanced-product-grid"></div>
        </div>
        
        <!-- Mobile Cart Summary -->
        ${this.mobileView ? this.renderMobileCartSummary() : ''}
      </div>
    `;
  }

  renderEnhancedSearchAndFilters() {
    return `
      <div class="enhanced-search-container">
        <div class="search-and-layout-controls mb-4">
          <div class="flex flex-col sm:flex-row gap-4">
            <!-- Enhanced Search Bar -->
            <div class="flex-1">
              <div class="relative">
                <input type="text" 
                       class="enhanced-search-input w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                       placeholder="Search products, brands, or categories..."
                       id="enhanced-product-search"
                       autocomplete="off">
                <i class="fa fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <button class="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
                        onclick="clearEnhancedSearch()"
                        id="clear-search-btn" style="display: none;">
                  <i class="fa fa-times"></i>
                </button>
              </div>
            </div>
            
            <!-- Layout Selector -->
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600">View:</span>
              <div class="flex rounded-lg border border-gray-200 overflow-hidden">
                <button class="layout-toggle-btn active" data-layout="grid" title="Grid View">
                  <i class="fa fa-th-large"></i>
                </button>
                <button class="layout-toggle-btn" data-layout="list" title="List View">
                  <i class="fa fa-list"></i>
                </button>
                <button class="layout-toggle-btn" data-layout="compact" title="Compact View">
                  <i class="fa fa-th"></i>
                </button>
              </div>
            </div>
            
            <!-- Filter Toggle -->
            <button class="filter-toggle-btn btn btn-outline-secondary"
                    onclick="toggleAdvancedFilters()">
              <i class="fa fa-filter"></i> Filters
              <span class="filter-count-badge" id="active-filter-count" style="display: none;">0</span>
            </button>
          </div>
        </div>
        
        <!-- Quick Filter Chips -->
        <div class="quick-filters-container" id="quick-filters">
          <div class="flex flex-wrap gap-2">
            <button class="quick-filter-chip active" data-filter="all">
              <i class="fa fa-star"></i> All Products
            </button>
            <button class="quick-filter-chip" data-filter="new-arrivals">
              <i class="fa fa-sparkles"></i> New Arrivals
            </button>
            <button class="quick-filter-chip" data-filter="bestsellers">
              <i class="fa fa-fire"></i> Best Sellers
            </button>
            <button class="quick-filter-chip" data-filter="sale">
              <i class="fa fa-percentage"></i> On Sale
            </button>
            <button class="quick-filter-chip" data-filter="gift-eligible">
              <i class="fa fa-gift"></i> Gift Eligible
            </button>
            <button class="quick-filter-chip" data-filter="in-stock">
              <i class="fa fa-check-circle"></i> In Stock
            </button>
          </div>
        </div>
        
        <!-- Advanced Filters Panel (Hidden by default) -->
        <div class="advanced-filters-panel hidden" id="advanced-filters">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <!-- Category Filter -->
            <div class="filter-section">
              <h4 class="filter-section-title">Category</h4>
              <div class="filter-options" id="category-filters">
                <!-- Dynamically populated -->
              </div>
            </div>
            
            <!-- Price Range Filter -->
            <div class="filter-section">
              <h4 class="filter-section-title">Price Range</h4>
              <div class="price-range-container">
                <input type="range" min="0" max="500" value="500" class="price-range-slider" id="price-range-slider">
                <div class="price-range-display">
                  <span>$0</span> - <span id="max-price-display">$500</span>
                </div>
              </div>
            </div>
            
            <!-- Brand Filter -->
            <div class="filter-section">
              <h4 class="filter-section-title">Brand</h4>
              <div class="filter-options" id="brand-filters">
                <!-- Dynamically populated -->
              </div>
            </div>
            
            <!-- Size Filter -->
            <div class="filter-section">
              <h4 class="filter-section-title">Size</h4>
              <div class="size-filter-options" id="size-filters">
                <!-- Dynamically populated -->
              </div>
            </div>
          </div>
          
          <div class="filter-actions mt-4 flex justify-between">
            <button class="btn btn-outline-secondary" onclick="clearAllAdvancedFilters()">
              <i class="fa fa-times"></i> Clear All
            </button>
            <button class="btn btn-primary" onclick="applyAdvancedFilters()">
              <i class="fa fa-check"></i> Apply Filters
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderMobileCartSummary() {
    const posState = this.app.state.getModuleState('pos');
    const cart = posState.cart || [];
    const totals = this.calculateCartTotal();
    
    if (cart.length === 0) return '';
    
    return `
      <div class="mobile-cart-summary fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div class="flex items-center justify-between">
          <div class="cart-summary-info">
            <div class="text-sm text-gray-600">${cart.length} items</div>
            <div class="text-lg font-bold text-green-600">₹${totals.total}</div>
          </div>
          <button class="btn btn-primary px-6" onclick="window.pharmaApp.getModule('pos').showMobileCart()">
            <i class="fa fa-shopping-cart"></i> View Cart
          </button>
        </div>
      </div>
    `;
  }

  setViewMode(mode) {
    this.currentViewMode = mode;
    this.render();
  }

  setupMobileOptimization() {
    // Detect mobile device
    this.mobileView = window.innerWidth <= 768;
    
    // Listen for resize events
    window.addEventListener('resize', this.debounce(() => {
      this.mobileView = window.innerWidth <= 768;
      if (this.currentViewMode === 'visual') {
        this.render();
      }
    }, 250));
  }

  setupMobileInterface() {
    if (!this.mobileView) return;
    
    // Add mobile-specific event listeners
    this.setupTouchGestures();
    this.setupMobileSearch();
  }

  setupTouchGestures() {
    // Implement swipe gestures for mobile product browsing
    let startX = 0;
    let startY = 0;
    
    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchend', (e) => {
      if (!startX || !startY) return;
      
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const diffX = startX - endX;
      const diffY = startY - endY;
      
      // Horizontal swipe detection
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
          // Swipe left - next products
          this.navigateProductGrid('next');
        } else {
          // Swipe right - previous products
          this.navigateProductGrid('prev');
        }
      }
      
      startX = 0;
      startY = 0;
    });
  }

  setupMobileSearch() {
    const searchInput = document.getElementById('enhanced-product-search');
    if (searchInput) {
      // Add mobile-specific search features
      searchInput.addEventListener('focus', () => {
        // Expand search bar on mobile
        searchInput.parentElement.classList.add('search-focused');
      });
      
      searchInput.addEventListener('blur', () => {
        // Collapse search bar when focus is lost
        searchInput.parentElement.classList.remove('search-focused');
      });
    }
  }

  navigateProductGrid(direction) {
    // Implement navigation between product pages/sections
    console.log('Navigate product grid:', direction);
  }

  addToCartEnhanced(productData) {
    // Enhanced addToCart method that integrates with visual grid
    const product = {
      _id: productData.id || productData._id,
      name: productData.name || productData.product_name,
      price: parseFloat(productData.price),
      sku: productData.sku || `SKU-${productData.id}`,
      category: productData.category || 'general',
      image: productData.image,
      variant_data: productData.variant_data
    };
    
    // Add to cart using the existing POS method
    this.addToCart(product);
    
    // Show visual feedback
    this.showAddToCartFeedback(product);
    
    // Track analytics
    this.trackProductAddToCart(productData);
  }

  showAddToCartFeedback(product) {
    // Create visual feedback for successful cart addition
    const feedback = document.createElement('div');
    feedback.className = 'add-to-cart-feedback fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    feedback.innerHTML = `
      <div class="flex items-center gap-2">
        <i class="fa fa-check"></i>
        <span>${product.name} added to cart!</span>
      </div>
    `;
    
    document.body.appendChild(feedback);
    
    // Animate in
    setTimeout(() => feedback.classList.add('show'), 100);
    
    // Remove after delay
    setTimeout(() => {
      feedback.classList.remove('show');
      setTimeout(() => document.body.removeChild(feedback), 300);
    }, 3000);
  }

  trackProductAddToCart(productData) {
    // Track analytics for product additions from visual grid
    console.log('Product added to cart:', productData);
    
    // Could integrate with analytics service
    if (typeof gtag !== 'undefined') {
      gtag('event', 'add_to_cart', {
        currency: 'INR',
        value: productData.price,
        items: [{
          item_id: productData.id,
          item_name: productData.name,
          category: productData.category,
          price: productData.price,
          quantity: 1
        }]
      });
    }
  }

  /**
   * CUSTOMER EXPERIENCE ENHANCEMENT METHODS
   */

  initializeCustomerExperience() {
    // Load customer preferences and history
    this.loadCustomerPreferences();
    this.loadRecentlyViewedProducts();
    this.loadWishlist();
    this.setupProductRecommendations();
  }

  loadRecentlyViewedProducts() {
    try {
      const stored = localStorage.getItem('pharma_recently_viewed');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading recently viewed products:', error);
      return [];
    }
  }

  saveRecentlyViewedProduct(productId) {
    try {
      let recentlyViewed = this.recentlyViewedProducts;
      
      // Remove if already exists
      recentlyViewed = recentlyViewed.filter(id => id !== productId);
      
      // Add to beginning
      recentlyViewed.unshift(productId);
      
      // Keep only last 20 products
      recentlyViewed = recentlyViewed.slice(0, 20);
      
      this.recentlyViewedProducts = recentlyViewed;
      localStorage.setItem('pharma_recently_viewed', JSON.stringify(recentlyViewed));
    } catch (error) {
      console.error('Error saving recently viewed product:', error);
    }
  }

  loadWishlist() {
    try {
      const stored = localStorage.getItem('pharma_wishlist');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading wishlist:', error);
      return [];
    }
  }

  toggleWishlist(productId) {
    try {
      let wishlist = this.wishlist;
      
      if (wishlist.includes(productId)) {
        wishlist = wishlist.filter(id => id !== productId);
      } else {
        wishlist.push(productId);
      }
      
      this.wishlist = wishlist;
      localStorage.setItem('pharma_wishlist', JSON.stringify(wishlist));
      
      // Update UI
      this.updateWishlistUI(productId, wishlist.includes(productId));
      
      return wishlist.includes(productId);
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      return false;
    }
  }

  updateWishlistUI(productId, isInWishlist) {
    // Update wishlist button UI across the application
    const wishlistBtns = document.querySelectorAll(`[data-product-id="${productId}"] .wishlist-btn`);
    wishlistBtns.forEach(btn => {
      btn.classList.toggle('active', isInWishlist);
      btn.innerHTML = `<i class="fa ${isInWishlist ? 'fa-heart' : 'fa-heart-o'}"></i>`;
    });
  }

  setupProductRecommendations() {
    // Setup AI-powered product recommendations
    this.recommendationEngine = {
      basedOn: 'recently_viewed', // recently_viewed, purchase_history, similar_customers
      algorithm: 'collaborative_filtering', // collaborative_filtering, content_based, hybrid
      maxRecommendations: 10
    };
  }







  /**
   * LOYALTY UI RENDERING METHODS
   */

  renderLoyaltyInfo() {
    if (!this.currentLoyaltyProfile) {
      return `
        <div class="loyalty-info mt-3 p-2 bg-light rounded">
          <small class="text-muted">
            <i class="fa fa-info-circle"></i> Select a customer to view loyalty benefits and earn points
          </small>
        </div>
      `;
    }

    const tier = this.currentLoyaltyProfile.tier?.tier || 'bronze';
    const points = this.currentLoyaltyProfile.points?.balance || 0;
    const benefits = this.currentLoyaltyProfile.benefits || {};
    
    const tierColors = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      platinum: '#E5E4E2',
      diamond: '#B9F2FF'
    };
    
    const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
    const color = tierColors[tier] || '#CD7F32';
    
    return `
      <div class="loyalty-info mt-3 p-3 rounded" style="background: linear-gradient(135deg, ${color}15, ${color}05); border: 1px solid ${color}30;">
        <div class="row align-items-center">
          <div class="col-auto">
            <div class="loyalty-tier-badge" style="color: ${color};">
              <i class="fa fa-star"></i>
              <span class="badge badge-sm" style="background-color: ${color}20; color: ${color}; border: 1px solid ${color}40;">
                ${tierName}
              </span>
            </div>
          </div>
          <div class="col-auto">
            <div class="points-balance">
              <strong class="text-primary">${points.toLocaleString()}</strong>
              <small class="text-muted d-block">points</small>
            </div>
          </div>
          <div class="col">
            <div class="loyalty-benefits">
              ${benefits.pointsMultiplier > 1 ? 
                `<small class="text-success"><i class="fa fa-plus"></i> ${benefits.pointsMultiplier}x points</small>` : ''
              }
              ${benefits.discountPercentage > 0 ? 
                ` <small class="text-info"><i class="fa fa-percent"></i> ${benefits.discountPercentage}% off</small>` : ''
              }
              ${benefits.freeShipping ? 
                ` <small class="text-warning"><i class="fa fa-truck"></i> Free shipping</small>` : ''
              }
            </div>
          </div>
          <div class="col-auto">
            <button class="btn btn-sm btn-outline-primary" onclick="window.pharmaApp.getModule('pos').showLoyaltyDetailsModal()">
              <i class="fa fa-eye"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  showLoyaltyDetailsModal() {
    if (!this.currentLoyaltyProfile) return;
    
    const loyaltyProfile = this.currentLoyaltyProfile;
    const tier = loyaltyProfile.tier?.tier || 'bronze';
    const benefits = loyaltyProfile.benefits || {};
    const giftBenefits = loyaltyProfile.giftBenefits || {};
    
    const modalHtml = `
      <div class="loyalty-details-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="loyaltyDetailsModal">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">
              <i class="fa fa-star text-primary"></i> Loyalty Program Details
            </h3>
            <button onclick="window.pharmaApp.getModule('pos').hideLoyaltyDetailsModal()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="loyalty-details-content">
            <div class="tier-overview mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded">
              <h5 class="mb-2">
                <i class="fa fa-crown"></i> ${tier.charAt(0).toUpperCase() + tier.slice(1)} Member
              </h5>
              <p class="text-muted mb-0">You're enjoying exclusive benefits as a ${tier} tier member!</p>
            </div>
            
            <div class="row">
              <div class="col-md-6">
                <h6 class="mb-3"><i class="fa fa-gift"></i> Current Benefits</h6>
                <div class="benefits-list">
                  ${benefits.pointsMultiplier > 1 ? `
                    <div class="benefit-item mb-2">
                      <i class="fa fa-times-circle text-success"></i>
                      <span>${benefits.pointsMultiplier}x Points Multiplier</span>
                    </div>
                  ` : ''}
                  ${benefits.discountPercentage > 0 ? `
                    <div class="benefit-item mb-2">
                      <i class="fa fa-percent text-primary"></i>
                      <span>${benefits.discountPercentage}% Purchase Discount</span>
                    </div>
                  ` : ''}
                  ${benefits.freeShipping ? `
                    <div class="benefit-item mb-2">
                      <i class="fa fa-truck text-info"></i>
                      <span>Free Shipping</span>
                    </div>
                  ` : ''}
                  ${benefits.earlyAccess ? `
                    <div class="benefit-item mb-2">
                      <i class="fa fa-clock text-warning"></i>
                      <span>Early Access to Sales</span>
                    </div>
                  ` : ''}
                  ${benefits.birthdayBonus ? `
                    <div class="benefit-item mb-2">
                      <i class="fa fa-gift text-danger"></i>
                      <span>${benefits.birthdayBonus} Birthday Bonus Points</span>
                    </div>
                  ` : ''}
                </div>
              </div>
              
              <div class="col-md-6">
                <h6 class="mb-3"><i class="fa fa-box"></i> Gift Store Benefits</h6>
                <div class="gift-benefits-list">
                  ${giftBenefits.wrappingDiscount > 0 ? `
                    <div class="benefit-item mb-2">
                      <i class="fa fa-gift text-purple"></i>
                      <span>${giftBenefits.wrappingDiscount}% Gift Wrapping Discount</span>
                    </div>
                  ` : ''}
                  ${giftBenefits.giftCardBonus > 0 ? `
                    <div class="benefit-item mb-2">
                      <i class="fa fa-credit-card text-green"></i>
                      <span>${giftBenefits.giftCardBonus}% Gift Card Bonus</span>
                    </div>
                  ` : ''}
                  ${giftBenefits.bulkDiscount > 0 ? `
                    <div class="benefit-item mb-2">
                      <i class="fa fa-users text-blue"></i>
                      <span>${giftBenefits.bulkDiscount}% Bulk Purchase Discount</span>
                    </div>
                  ` : ''}
                  ${giftBenefits.exclusiveWrapping ? `
                    <div class="benefit-item mb-2">
                      <i class="fa fa-crown text-warning"></i>
                      <span>Exclusive Gift Wrapping Options</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
            
            <div class="tier-progress mt-4">
              ${this.renderTierProgressForModal(loyaltyProfile.tier)}
            </div>
          </div>
          
          <div class="flex justify-end gap-3 mt-6">
            <button class="btn btn-secondary" onclick="window.pharmaApp.getModule('pos').hideLoyaltyDetailsModal()">
              Close
            </button>
            <button class="btn btn-primary" onclick="window.pharmaApp.getModule('pos').showLoyaltyRewardsModal()">
              <i class="fa fa-star"></i> Redeem Points
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  hideLoyaltyDetailsModal() {
    const modal = document.getElementById('loyaltyDetailsModal');
    if (modal) {
      modal.remove();
    }
  }

  showLoyaltyRewardsModal() {
    if (!this.availableRedemptions.length) {
      if (window.notiflix) {
        window.notiflix.Notify.info('No Rewards', 'No rewards available for redemption at this time');
      }
      return;
    }
    
    const currentBalance = this.currentLoyaltyProfile?.points?.balance || 0;
    
    const modalHtml = `
      <div class="loyalty-rewards-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="loyaltyRewardsModal">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">
              <i class="fa fa-star text-warning"></i> Redeem Loyalty Points
            </h3>
            <button onclick="window.pharmaApp.getModule('pos').hideLoyaltyRewardsModal()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="current-balance mb-4 p-3 bg-blue-50 rounded">
            <h6>Your Points Balance: <span class="text-primary font-bold">${currentBalance.toLocaleString()}</span></h6>
          </div>
          
          <div class="rewards-list">
            <h6 class="mb-3">Available Rewards</h6>
            ${this.availableRedemptions.map(reward => {
              const canRedeem = currentBalance >= reward.pointsCost;
              return `
                <div class="reward-item border rounded p-3 mb-3 ${!canRedeem ? 'opacity-50' : ''}">
                  <div class="row align-items-center">
                    <div class="col-md-8">
                      <h6 class="mb-1">${reward.name}</h6>
                      <p class="text-muted mb-2">${reward.description}</p>
                      <span class="badge badge-primary">${reward.pointsCost} points</span>
                      ${reward.automatic ? '<span class="badge badge-success ml-2">Automatic</span>' : ''}
                    </div>
                    <div class="col-md-4 text-right">
                      <button class="btn ${canRedeem ? 'btn-success' : 'btn-secondary'}" 
                              ${!canRedeem ? 'disabled' : ''}
                              onclick="window.pharmaApp.getModule('pos').redeemReward('${reward.id}')">
                        ${canRedeem ? 'Redeem' : `Need ${reward.pointsCost - currentBalance} more`}
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="flex justify-end gap-3 mt-6">
            <button class="btn btn-secondary" onclick="window.pharmaApp.getModule('pos').hideLoyaltyRewardsModal()">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  hideLoyaltyRewardsModal() {
    const modal = document.getElementById('loyaltyRewardsModal');
    if (modal) {
      modal.remove();
    }
  }

  renderTierProgressForModal(tierData) {
    const tier = tierData?.tier || 'bronze';
    const progress = tierData?.progress || 0;
    const nextTier = tierData?.nextTier;
    
    if (!nextTier) {
      return `
        <div class="tier-complete text-center p-4 bg-success text-white rounded">
          <i class="fa fa-trophy" style="font-size: 2rem;"></i>
          <h5 class="mt-2">Highest Tier Achieved!</h5>
          <p>Congratulations! You've reached the pinnacle of our loyalty program</p>
        </div>
      `;
    }
    
    const nextTierName = nextTier.charAt(0).toUpperCase() + nextTier.slice(1);
    
    return `
      <div class="tier-progress-info">
        <h6 class="mb-2">Progress to ${nextTierName}</h6>
        <div class="progress mb-2" style="height: 10px;">
          <div class="progress-bar bg-primary" style="width: ${progress}%" role="progressbar"></div>
        </div>
        <div class="d-flex justify-content-between">
          <small class="text-muted">Current: ${tier.charAt(0).toUpperCase() + tier.slice(1)}</small>
          <small class="text-muted">${progress.toFixed(1)}% to ${nextTierName}</small>
        </div>
      </div>
    `;
  }

  async redeemReward(rewardId) {
    try {
      if (window.notiflix) {
        window.notiflix.Block.standard('#loyaltyRewardsModal .modal-content', 'Processing redemption...');
      }
      
      // Find the reward details
      const reward = this.availableRedemptions.find(r => r.id === rewardId);
      if (!reward) {
        throw new Error('Reward not found');
      }
      
      const response = await fetch(`${window.api}loyalty/points/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: this.currentLoyaltyProfile.customer._id,
          points: reward.pointsCost,
          rewardType: reward.type,
          rewardId: rewardId
        })
      });
      
      const result = await response.json();
      
      if (window.notiflix) {
        window.notiflix.Block.remove('#loyaltyRewardsModal .modal-content');
      }
      
      if (result.success) {
        this.hideLoyaltyRewardsModal();
        
        if (window.notiflix) {
          window.notiflix.Notify.success(
            'Reward Redeemed!', 
            `Successfully redeemed ${reward.name}. Your new balance: ${result.newBalance} points`
          );
        }
        
        // Refresh loyalty data
        await this.loadCustomerLoyaltyProfile(this.currentLoyaltyProfile.customer._id);
        this.render();
        
        // Apply discount to current cart if applicable
        if (reward.type === 'discount') {
          this.loyaltyDiscount += (result.discountAmount || 0);
          this.render();
        }
      } else {
        throw new Error(result.error || 'Redemption failed');
      }
      
    } catch (error) {
      console.error('Error redeeming reward:', error);
      
      if (window.notiflix) {
        window.notiflix.Block.remove('#loyaltyRewardsModal .modal-content');
        window.notiflix.Notify.failure('Redemption Failed', error.message);
      }
    }
  }
}

// Make POSModule available globally
window.POSModule = POSModule;
