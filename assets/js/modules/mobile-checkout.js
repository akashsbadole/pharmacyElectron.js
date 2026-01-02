/**
 * Mobile-Optimized Checkout Experience for StyleMine
 * Touch-friendly interface for mobile devices
 * Optimized for one-handed operation and quick transactions
 */

class MobileCheckout {
  constructor(options = {}) {
    this.options = {
      containerId: 'mobile-checkout-container',
      steps: ['products', 'cart', 'payment', 'confirmation'],
      enableSwipeGestures: true,
      enableVoiceInput: false,
      enableBiometricAuth: false,
      hapticFeedback: true,
      autoAdvanceDelay: 3000,
      ...options
    };

    this.currentStep = 0;
    this.isInitialized = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.cartItems = [];
    this.checkoutData = {};
    this.isProcessing = false;

    this.init();
  }

  init() {
    this.createMobileContainer();
    this.setupEventListeners();
    this.setupSwipeGestures();
    this.setupTouchOptimizations();
    this.loadCheckoutState();
    this.isInitialized = true;
    console.log('Mobile Checkout initialized');
  }

  createMobileContainer() {
    let container = document.getElementById(this.options.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.options.containerId;
      container.className = 'mobile-checkout-container hidden';
      document.body.appendChild(container);
    }

    this.container = container;
  }

  setupEventListeners() {
    // Back button
    document.addEventListener('click', (e) => {
      if (e.target.closest('.mobile-back-btn')) {
        this.handleBackNavigation();
      }
    });

    // Add to cart buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('.mobile-add-to-cart')) {
        const productCard = e.target.closest('.mobile-product-card');
        if (productCard) {
          const productId = productCard.dataset.productId;
          this.addToCartMobile(productId);
        }
      }
    });

    // Quantity controls
    document.addEventListener('click', (e) => {
      if (e.target.closest('.mobile-quantity-btn')) {
        const btn = e.target.closest('.mobile-quantity-btn');
        const action = btn.dataset.action;
        const productId = btn.dataset.productId;
        this.updateQuantityMobile(productId, action);
      }
    });

    // Remove items
    document.addEventListener('click', (e) => {
      if (e.target.closest('.mobile-remove-item')) {
        const productId = e.target.closest('.mobile-remove-item').dataset.productId;
        this.removeFromCartMobile(productId);
      }
    });

    // Payment method selection
    document.addEventListener('click', (e) => {
      if (e.target.closest('.payment-method-btn')) {
        const method = e.target.closest('.payment-method-btn').dataset.method;
        this.selectPaymentMethod(method);
      }
    });

    // Checkout action buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('.mobile-primary-action')) {
        this.handlePrimaryAction();
      }
    });

    // Form submissions
    document.addEventListener('submit', (e) => {
      if (e.target.closest('.mobile-checkout-form')) {
        e.preventDefault();
        this.handleFormSubmission(e.target);
      }
    });

    // Resize handler
    window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 250));
  }

  setupSwipeGestures() {
    if (!this.options.enableSwipeGestures) return;

    this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
  }

  handleTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  }

  handleTouchEnd(e) {
    if (!this.touchStartX || !this.touchStartY) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = this.touchStartX - touchEndX;
    const diffY = this.touchStartY - touchEndY;

    // Only process horizontal swipes
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Swipe left - next step
        this.navigateToStep(this.currentStep + 1);
      } else {
        // Swipe right - previous step
        this.navigateToStep(this.currentStep - 1);
      }
    }

    this.touchStartX = 0;
    this.touchStartY = 0;
  }

  handleTouchMove(e) {
    // Prevent default scrolling on horizontal swipes
    const diffX = Math.abs(this.touchStartX - e.touches[0].clientX);
    const diffY = Math.abs(this.touchStartY - e.touches[0].clientY);
    
    if (diffX > diffY) {
      e.preventDefault();
    }
  }

  setupTouchOptimizations() {
    // Optimize for touch interactions
    this.enableHapticFeedback();
    this.optimizeForOneHandedUse();
    this.setupReachabilityAreas();
  }

  enableHapticFeedback() {
    if (!this.options.hapticFeedback || !('vibrate' in navigator)) return;

    // Add haptic feedback for important interactions
    document.addEventListener('click', (e) => {
      if (e.target.closest('.mobile-add-to-cart, .mobile-primary-action, .payment-method-btn')) {
        navigator.vibrate(50); // Short vibration
      }
    });
  }

  optimizeForOneHandedUse() {
    // Position important actions in thumb-friendly zones
    this.thumbZones = {
      primary: { x: 0.8, y: 0.8 }, // Bottom right
      secondary: { x: 0.2, y: 0.8 }, // Bottom left
      back: { x: 0.1, y: 0.1 } // Top left
    };
  }

  setupReachabilityAreas() {
    // Mark important interactive elements for accessibility
    const importantElements = document.querySelectorAll(
      '.mobile-add-to-cart, .mobile-primary-action, .mobile-back-btn'
    );
    
    importantElements.forEach(el => {
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', el.textContent.trim());
      el.style.touchAction = 'manipulation';
    });
  }

  loadCheckoutState() {
    try {
      const saved = localStorage.getItem('mobile_checkout_state');
      if (saved) {
        const state = JSON.parse(saved);
        this.cartItems = state.cartItems || [];
        this.currentStep = state.currentStep || 0;
        this.checkoutData = state.checkoutData || {};
      }
    } catch (error) {
      console.error('Error loading checkout state:', error);
    }
  }

  saveCheckoutState() {
    try {
      const state = {
        cartItems: this.cartItems,
        currentStep: this.currentStep,
        checkoutData: this.checkoutData,
        timestamp: Date.now()
      };
      localStorage.setItem('mobile_checkout_state', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving checkout state:', error);
    }
  }

  showMobileCheckout() {
    this.container.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Load current step content
    this.renderCurrentStep();
    this.updateProgressIndicator();
    
    // Add entrance animation
    this.container.style.animation = 'slideUp 0.3s ease-out';
    
    // Show swipe indicators
    this.showSwipeIndicators();
  }

  hideMobileCheckout() {
    this.container.classList.add('hidden');
    document.body.style.overflow = '';
    
    // Save state before hiding
    this.saveCheckoutState();
  }

  renderCurrentStep() {
    const stepContent = this.getStepContent(this.options.steps[this.currentStep]);
    this.container.innerHTML = stepContent;
  }

  getStepContent(step) {
    switch (step) {
      case 'products':
        return this.renderProductsStep();
      case 'cart':
        return this.renderCartStep();
      case 'payment':
        return this.renderPaymentStep();
      case 'confirmation':
        return this.renderConfirmationStep();
      default:
        return this.renderProductsStep();
    }
  }

  renderProductsStep() {
    const products = this.getAvailableProducts();
    
    return `
      <div class="mobile-checkout-header">
        <button class="mobile-back-btn" aria-label="Close checkout">
          <i class="fa fa-times"></i>
        </button>
        <h1 class="mobile-checkout-title">Select Products</h1>
        <div style="width: 32px;"></div>
      </div>

      <div class="mobile-checkout-content">
        <!-- Quick Search -->
        <div class="mobile-search-container mb-4">
          <input type="text" 
                 class="mobile-form-input" 
                 placeholder="Search products..."
                 id="mobile-product-search"
                 autocomplete="off">
        </div>

        <!-- Category Filters -->
        <div class="category-filters mb-4">
          <div class="flex gap-2 overflow-x-auto pb-2">
            <button class="category-filter-btn active" data-category="all">All</button>
            <button class="category-filter-btn" data-category="clothing">Clothing</button>
            <button class="category-filter-btn" data-category="accessories">Accessories</button>
            <button class="category-filter-btn" data-category="gifts">Gifts</button>
            <button class="category-filter-btn" data-category="home">Home</button>
          </div>
        </div>

        <!-- Mobile Product Grid -->
        <div class="mobile-product-grid" id="mobile-product-grid">
          ${products.map(product => this.renderMobileProductCard(product)).join('')}
        </div>

        <!-- Recently Viewed -->
        ${this.renderRecentlyViewedProducts()}
      </div>

      <div class="mobile-checkout-actions">
        <button class="mobile-primary-action" onclick="mobileCheckout.navigateToStep(1)">
          <i class="fa fa-shopping-cart"></i>
          View Cart (${this.cartItems.length})
        </button>
      </div>
    `;
  }

  renderMobileProductCard(product) {
    const inCart = this.cartItems.find(item => item.id === product.id);
    const cartQuantity = inCart ? inCart.quantity : 0;
    
    return `
      <div class="mobile-product-card" data-product-id="${product.id}">
        <img src="${product.image}" 
             alt="${product.name}" 
             class="mobile-product-image"
             loading="lazy">
        
        <div class="mobile-product-info">
          <h3 class="mobile-product-name">${product.name}</h3>
          <div class="mobile-product-price">₹${product.price.toFixed(2)}</div>
          
          ${product.rating ? `
            <div class="mobile-product-rating">
              <i class="fa fa-star text-yellow-400"></i>
              <span>${product.rating}</span>
              <span class="text-gray-500">(${product.reviewCount || 0})</span>
            </div>
          ` : ''}
          
          <button class="mobile-add-to-cart" 
                  data-product-id="${product.id}"
                  ${product.stock === 0 ? 'disabled' : ''}>
            <i class="fa ${cartQuantity > 0 ? 'fa-check' : 'fa-plus'}"></i>
            ${cartQuantity > 0 ? `In Cart (${cartQuantity})` : 'Add to Cart'}
          </button>
        </div>
      </div>
    `;
  }

  renderCartStep() {
    const totals = this.calculateCartTotals();
    
    return `
      <div class="mobile-checkout-header">
        <button class="mobile-back-btn" onclick="mobileCheckout.navigateToStep(0)">
          <i class="fa fa-chevron-left"></i>
        </button>
        <h1 class="mobile-checkout-title">Your Cart</h1>
        <div style="width: 32px;"></div>
      </div>

      <div class="mobile-checkout-content">
        ${this.cartItems.length === 0 ? this.renderEmptyCart() : this.renderCartItems()}
        
        <!-- Cart Summary -->
        <div class="mobile-cart-summary">
          <div class="cart-summary-row">
            <span>Subtotal (${this.cartItems.length} items)</span>
            <span>₹${totals.subtotal.toFixed(2)}</span>
          </div>
          <div class="cart-summary-row">
            <span>Tax</span>
            <span>₹${totals.tax.toFixed(2)}</span>
          </div>
          <div class="cart-summary-row total">
            <span>Total</span>
            <span>₹${totals.total.toFixed(2)}</span>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-cart-actions mb-4">
          <button class="btn btn-outline-secondary w-full mb-2" onclick="mobileCheckout.clearCart()">
            <i class="fa fa-trash"></i> Clear Cart
          </button>
          <button class="btn btn-outline-secondary w-full" onclick="mobileCheckout.applyPromoCode()">
            <i class="fa fa-tag"></i> Apply Promo Code
          </button>
        </div>
      </div>

      <div class="mobile-checkout-actions">
        <button class="mobile-primary-action" onclick="mobileCheckout.navigateToStep(2)">
          <i class="fa fa-credit-card"></i>
          Continue to Payment (₹${totals.total.toFixed(2)})
        </button>
      </div>
    `;
  }

  renderCartItems() {
    return `
      <div class="mobile-cart-interface">
        <div class="mobile-cart-header">
          <h2 class="mobile-cart-title">Items in Cart</h2>
          <span class="mobile-cart-count">${this.cartItems.length}</span>
        </div>
        
        <div class="mobile-cart-items">
          ${this.cartItems.map(item => this.renderCartItem(item)).join('')}
        </div>
      </div>
    `;
  }

  renderCartItem(item) {
    return `
      <div class="mobile-cart-item" data-product-id="${item.id}">
        <img src="${item.image}" 
             alt="${item.name}" 
             class="mobile-cart-item-image"
             loading="lazy">
        
        <div class="mobile-cart-item-details">
          <div class="mobile-cart-item-name">${item.name}</div>
          ${item.variant ? `
            <div class="mobile-cart-item-variant">${item.variant}</div>
          ` : ''}
          <div class="mobile-cart-item-price">₹${item.price.toFixed(2)} each</div>
        </div>
        
        <div class="mobile-cart-item-controls">
          <button class="mobile-quantity-btn" 
                  data-action="decrease" 
                  data-product-id="${item.id}"
                  ${item.quantity <= 1 ? 'disabled' : ''}>
            <i class="fa fa-minus"></i>
          </button>
          
          <span class="mobile-quantity-display">${item.quantity}</span>
          
          <button class="mobile-quantity-btn" 
                  data-action="increase" 
                  data-product-id="${item.id}">
            <i class="fa fa-plus"></i>
          </button>
          
          <button class="mobile-remove-item" 
                  data-product-id="${item.id}"
                  aria-label="Remove item">
            <i class="fa fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }

  renderEmptyCart() {
    return `
      <div class="empty-cart-state text-center py-12">
        <i class="fa fa-shopping-cart text-4xl text-gray-400 mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
        <p class="text-gray-600 mb-4">Add some products to get started</p>
        <button class="btn btn-primary" onclick="mobileCheckout.navigateToStep(0)">
          <i class="fa fa-arrow-left"></i> Continue Shopping
        </button>
      </div>
    `;
  }

  renderPaymentStep() {
    return `
      <div class="mobile-checkout-header">
        <button class="mobile-back-btn" onclick="mobileCheckout.navigateToStep(1)">
          <i class="fa fa-chevron-left"></i>
        </button>
        <h1 class="mobile-checkout-title">Payment</h1>
        <div style="width: 32px;"></div>
      </div>

      <div class="mobile-checkout-content">
        <!-- Order Summary -->
        <div class="order-summary-card mb-4">
          <h3 class="font-medium mb-2">Order Summary</h3>
          <div class="text-sm text-gray-600">
            <div class="flex justify-between">
              <span>${this.cartItems.length} items</span>
              <span>₹${this.calculateCartTotals().subtotal.toFixed(2)}</span>
            </div>
            <div class="flex justify-between">
              <span>Tax</span>
              <span>₹${this.calculateCartTotals().tax.toFixed(2)}</span>
            </div>
            <div class="flex justify-between font-medium border-t pt-2 mt-2">
              <span>Total</span>
              <span>₹${this.calculateCartTotals().total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <!-- Payment Methods -->
        <div class="mobile-payment-interface">
          <h3 class="font-medium mb-3">Payment Method</h3>
          
          <div class="payment-method-selector">
            <button class="payment-method-btn active" data-method="card">
              <i class="fa fa-credit-card payment-method-icon"></i>
              <span class="payment-method-name">Card</span>
            </button>
            <button class="payment-method-btn" data-method="upi">
              <i class="fa fa-mobile payment-method-icon"></i>
              <span class="payment-method-name">UPI</span>
            </button>
            <button class="payment-method-btn" data-method="wallet">
              <i class="fa fa-google-wallet payment-method-icon"></i>
              <span class="payment-method-name">Wallet</span>
            </button>
            <button class="payment-method-btn" data-method="cod">
              <i class="fa fa-money payment-method-icon"></i>
              <span class="payment-method-name">COD</span>
            </button>
          </div>
        </div>

        <!-- Payment Form -->
        <form class="mobile-checkout-form" id="payment-form">
          <!-- Card Payment Fields -->
          <div class="payment-method-content" id="card-payment" style="display: block;">
            <div class="mobile-form-group">
              <label class="mobile-form-label">Card Number</label>
              <input type="text" 
                     class="mobile-form-input" 
                     placeholder="1234 5678 9012 3456"
                     id="card-number"
                     maxlength="19">
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              <div class="mobile-form-group">
                <label class="mobile-form-label">Expiry</label>
                <input type="text" 
                       class="mobile-form-input" 
                       placeholder="MM/YY"
                       id="card-expiry"
                       maxlength="5">
              </div>
              <div class="mobile-form-group">
                <label class="mobile-form-label">CVV</label>
                <input type="text" 
                       class="mobile-form-input" 
                       placeholder="123"
                       id="card-cvv"
                       maxlength="4">
              </div>
            </div>
          </div>

          <!-- UPI Payment Fields -->
          <div class="payment-method-content" id="upi-payment" style="display: none;">
            <div class="mobile-form-group">
              <label class="mobile-form-label">UPI ID</label>
              <input type="text" 
                     class="mobile-form-input" 
                     placeholder="username@bank"
                     id="upi-id">
            </div>
          </div>

          <!-- Additional Fields -->
          <div class="mobile-form-group">
            <label class="mobile-form-label">
              <input type="checkbox" id="save-payment-method"> 
              Save payment method for future use
            </label>
          </div>
        </form>
      </div>

      <div class="mobile-checkout-actions">
        <button class="mobile-primary-action" onclick="mobileCheckout.processPayment()">
          <i class="fa fa-lock"></i>
          Pay Securely ₹${this.calculateCartTotals().total.toFixed(2)}
        </button>
      </div>
    `;
  }

  renderConfirmationStep() {
    const orderNumber = this.generateOrderNumber();
    
    return `
      <div class="mobile-checkout-header">
        <button class="mobile-back-btn" onclick="mobileCheckout.closeCheckout()">
          <i class="fa fa-times"></i>
        </button>
        <h1 class="mobile-checkout-title">Order Confirmed!</h1>
        <div style="width: 32px;"></div>
      </div>

      <div class="mobile-checkout-content">
        <!-- Success Animation -->
        <div class="success-animation text-center py-8">
          <div class="success-icon mx-auto mb-4">
            <i class="fa fa-check-circle text-green-500" style="font-size: 4rem;"></i>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h2>
          <p class="text-gray-600">Order #${orderNumber}</p>
        </div>

        <!-- Order Details -->
        <div class="order-details-card mb-4">
          <h3 class="font-medium mb-3">Order Details</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span>Order Number:</span>
              <span class="font-medium">#${orderNumber}</span>
            </div>
            <div class="flex justify-between">
              <span>Total Amount:</span>
              <span class="font-medium">₹${this.calculateCartTotals().total.toFixed(2)}</span>
            </div>
            <div class="flex justify-between">
              <span>Payment Method:</span>
              <span class="font-medium" id="confirmation-payment-method">Card</span>
            </div>
            <div class="flex justify-between">
              <span>Estimated Delivery:</span>
              <span class="font-medium">2-3 business days</span>
            </div>
          </div>
        </div>

        <!-- Next Steps -->
        <div class="next-steps-card mb-4">
          <h3 class="font-medium mb-3">What's Next?</h3>
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <i class="fa fa-envelope text-blue-500"></i>
              <div>
                <div class="font-medium">Order confirmation sent</div>
                <div class="text-sm text-gray-600">Check your email for details</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <i class="fa fa-truck text-green-500"></i>
              <div>
                <div class="font-medium">Order processing</div>
                <div class="text-sm text-gray-600">We'll notify you when shipped</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="confirmation-actions">
          <button class="btn btn-outline-secondary w-full mb-3" onclick="mobileCheckout.trackOrder('${orderNumber}')">
            <i class="fa fa-map-marker"></i> Track Order
          </button>
          <button class="btn btn-primary w-full mb-3" onclick="mobileCheckout.reorderItems()">
            <i class="fa fa-repeat"></i> Reorder Items
          </button>
          <button class="btn btn-success w-full" onclick="mobileCheckout.continueShopping()">
            <i class="fa fa-arrow-right"></i> Continue Shopping
          </button>
        </div>
      </div>
    `;
  }

  updateProgressIndicator() {
    const progressHTML = `
      <div class="mobile-checkout-progress">
        <div class="progress-steps">
          ${this.options.steps.map((step, index) => `
            <div class="progress-step ${index < this.currentStep ? 'completed' : index === this.currentStep ? 'active' : ''}">
              <div class="step-number">${index < this.currentStep ? '<i class="fa fa-check"></i>' : index + 1}</div>
              <div class="step-label">${this.getStepLabel(step)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Insert progress indicator after header
    const header = this.container.querySelector('.mobile-checkout-header');
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(this.createElementFromHTML(progressHTML), header.nextSibling);
    }
  }

  getStepLabel(step) {
    const labels = {
      'products': 'Products',
      'cart': 'Cart',
      'payment': 'Payment',
      'confirmation': 'Done'
    };
    return labels[step] || step;
  }

  navigateToStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.options.steps.length) return;
    
    // Validate step transitions
    if (!this.canNavigateToStep(stepIndex)) {
      this.showNotification('Please complete current step first', 'warning');
      return;
    }

    // Haptic feedback for step navigation
    if (this.options.hapticFeedback) {
      navigator.vibrate(30);
    }

    // Animate transition
    this.animateStepTransition(stepIndex);
    
    this.currentStep = stepIndex;
    this.renderCurrentStep();
    this.updateProgressIndicator();
    this.showSwipeIndicators();
    this.saveCheckoutState();
  }

  canNavigateToStep(stepIndex) {
    // Business logic for step validation
    switch (stepIndex) {
      case 1: // Cart
        return true; // Always can go to cart
      case 2: // Payment
        return this.cartItems.length > 0;
      case 3: // Confirmation
        return this.checkoutData.paymentProcessed === true;
      default:
        return true;
    }
  }

  animateStepTransition(stepIndex) {
    const content = this.container.querySelector('.mobile-checkout-content');
    if (content) {
      content.style.animation = 'slideOut 0.2s ease-in forwards';
      
      setTimeout(() => {
        content.style.animation = 'slideIn 0.3s ease-out forwards';
      }, 200);
    }
  }

  showSwipeIndicators() {
    // Remove existing indicators
    document.querySelectorAll('.swipe-indicator').forEach(el => el.remove());

    if (this.currentStep > 0) {
      const leftIndicator = this.createSwipeIndicator('left', 'Swipe right to go back');
      this.container.appendChild(leftIndicator);
      setTimeout(() => leftIndicator.classList.add('show'), 500);
    }

    if (this.currentStep < this.options.steps.length - 1) {
      const rightIndicator = this.createSwipeIndicator('right', 'Swipe left to continue');
      this.container.appendChild(rightIndicator);
      setTimeout(() => rightIndicator.classList.add('show'), 500);
    }

    // Hide indicators after delay
    setTimeout(() => {
      document.querySelectorAll('.swipe-indicator').forEach(el => el.classList.remove('show'));
    }, 3000);
  }

  createSwipeIndicator(direction, text) {
    const indicator = document.createElement('div');
    indicator.className = `swipe-indicator ${direction}`;
    indicator.innerHTML = `
      <i class="fa fa-chevron-${direction}"></i>
      <span>${text}</span>
    `;
    return indicator;
  }

  // Mobile-specific cart operations
  addToCartMobile(productId) {
    const product = this.getProductById(productId);
    if (!product) return;

    const existingItem = this.cartItems.find(item => item.id === productId);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.cartItems.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
        variant: product.variant || null
      });
    }

    this.showAddToCartFeedback(product);
    this.updateCartBadge();
    this.saveCheckoutState();

    // Analytics
    this.trackAddToCart(product);
  }

  updateQuantityMobile(productId, action) {
    const item = this.cartItems.find(item => item.id === productId);
    if (!item) return;

    if (action === 'increase') {
      item.quantity += 1;
    } else if (action === 'decrease' && item.quantity > 1) {
      item.quantity -= 1;
    }

    this.renderCurrentStep(); // Re-render cart
    this.saveCheckoutState();
    
    // Haptic feedback
    if (this.options.hapticFeedback) {
      navigator.vibrate(20);
    }
  }

  removeFromCartMobile(productId) {
    this.cartItems = this.cartItems.filter(item => item.id !== productId);
    
    if (this.cartItems.length === 0) {
      this.showNotification('Cart is empty', 'info');
    }
    
    this.renderCurrentStep();
    this.updateCartBadge();
    this.saveCheckoutState();
  }

  showAddToCartFeedback(product) {
    const feedback = document.createElement('div');
    feedback.className = 'mobile-notification success';
    feedback.innerHTML = `
      <div class="notification-header">
        <i class="fa fa-check-circle"></i>
        <span class="notification-title">Added to Cart</span>
      </div>
      <div class="notification-message">${product.name} added to your cart</div>
    `;

    this.container.appendChild(feedback);
    
    setTimeout(() => feedback.classList.add('show'), 100);
    setTimeout(() => {
      feedback.classList.remove('show');
      setTimeout(() => feedback.remove(), 300);
    }, 2000);

    // Haptic feedback
    if (this.options.hapticFeedback) {
      navigator.vibrate(50);
    }
  }

  updateCartBadge() {
    // Update cart badge in header or elsewhere
    const badge = document.querySelector('.mobile-cart-count');
    if (badge) {
      badge.textContent = this.cartItems.length;
      badge.style.display = this.cartItems.length > 0 ? 'inline-block' : 'none';
    }
  }

  // Payment processing
  async processPayment() {
    if (this.isProcessing) return;

    const form = document.getElementById('payment-form');
    const formData = new FormData(form);
    
    // Validate payment form
    if (!this.validatePaymentForm(formData)) {
      this.showNotification('Please fill all required fields', 'error');
      return;
    }

    this.isProcessing = true;
    this.showPaymentProcessing();

    try {
      // Simulate payment processing
      await this.simulatePaymentProcessing(formData);
      
      this.checkoutData.paymentProcessed = true;
      this.checkoutData.paymentMethod = this.getSelectedPaymentMethod();
      this.checkoutData.paymentData = Object.fromEntries(formData);
      
      this.navigateToStep(3); // Go to confirmation
      
    } catch (error) {
      console.error('Payment processing failed:', error);
      this.showNotification('Payment failed. Please try again.', 'error');
    } finally {
      this.isProcessing = false;
      this.hidePaymentProcessing();
    }
  }

  showPaymentProcessing() {
    const button = this.container.querySelector('.mobile-primary-action');
    if (button) {
      button.innerHTML = `
        <div class="mobile-spinner"></div>
        Processing Payment...
      `;
      button.disabled = true;
    }
  }

  hidePaymentProcessing() {
    const button = this.container.querySelector('.mobile-primary-action');
    if (button) {
      button.innerHTML = `
        <i class="fa fa-lock"></i>
        Pay Securely ₹${this.calculateCartTotals().total.toFixed(2)}
      `;
      button.disabled = false;
    }
  }

  async simulatePaymentProcessing(formData) {
    // Simulate API call delay
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate random success/failure
        if (Math.random() > 0.1) { // 90% success rate
          resolve({ success: true, transactionId: this.generateOrderNumber() });
        } else {
          reject(new Error('Payment declined'));
        }
      }, 2000);
    });
  }

  validatePaymentForm(formData) {
    const selectedMethod = this.getSelectedPaymentMethod();
    
    switch (selectedMethod) {
      case 'card':
        return formData.get('card-number') && formData.get('card-expiry') && formData.get('card-cvv');
      case 'upi':
        return formData.get('upi-id');
      case 'cod':
        return true; // No validation needed for COD
      default:
        return false;
    }
  }

  getSelectedPaymentMethod() {
    const activeMethod = this.container.querySelector('.payment-method-btn.active');
    return activeMethod ? activeMethod.dataset.method : 'card';
  }

  selectPaymentMethod(method) {
    // Update UI
    this.container.querySelectorAll('.payment-method-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    this.container.querySelector(`[data-method="${method}"]`).classList.add('active');

    // Show/hide payment fields
    this.container.querySelectorAll('.payment-method-content').forEach(content => {
      content.style.display = 'none';
    });
    this.container.querySelector(`#${method}-payment`).style.display = 'block';
  }

  // Utility methods
  getAvailableProducts() {
    // This would normally fetch from API
    return [
      {
        id: 1,
        name: 'Premium Cotton T-Shirt',
        price: 599,
        image: 'https://picsum.photos/300/300?random=1',
        category: 'clothing',
        rating: 4.5,
        reviewCount: 128,
        stock: 15
      },
      {
        id: 2,
        name: 'Designer Handbag',
        price: 1299,
        image: 'https://picsum.photos/300/300?random=2',
        category: 'accessories',
        rating: 4.8,
        reviewCount: 89,
        stock: 8
      },
      // Add more sample products...
    ];
  }

  getProductById(id) {
    return this.getAvailableProducts().find(p => p.id == id);
  }

  calculateCartTotals() {
    const subtotal = this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;
    
    return {
      subtotal,
      tax,
      total
    };
  }

  generateOrderNumber() {
    return 'ORD' + Date.now().toString().slice(-8);
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `mobile-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-header">
        <i class="fa fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>
        <span class="notification-title">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
      </div>
      <div class="notification-message">${message}</div>
    `;

    this.container.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  handleBackNavigation() {
    if (this.currentStep === 0) {
      this.hideMobileCheckout();
    } else {
      this.navigateToStep(this.currentStep - 1);
    }
  }

  handlePrimaryAction() {
    switch (this.currentStep) {
      case 0: // Products
        this.navigateToStep(1);
        break;
      case 1: // Cart
        this.navigateToStep(2);
        break;
      case 2: // Payment
        this.processPayment();
        break;
    }
  }

  handleFormSubmission(form) {
    // Handle form submissions
    console.log('Form submitted:', form);
  }

  handleResize() {
    // Handle responsive adjustments
    console.log('Window resized');
  }

  // Public API methods
  closeCheckout() {
    this.hideMobileCheckout();
  }

  continueShopping() {
    this.hideMobileCheckout();
    // Navigate back to main POS interface
    if (window.pharmaApp) {
      window.pharmaApp.navigateToModule('pos');
    }
  }

  reorderItems() {
    // Add current cart items back to cart
    this.cartItems.forEach(item => {
      this.addToCartMobile(item.id);
    });
    this.navigateToStep(1);
  }

  trackOrder(orderNumber) {
    // Open order tracking
    console.log('Track order:', orderNumber);
    this.showNotification('Order tracking feature coming soon!', 'info');
  }

  clearCart() {
    this.cartItems = [];
    this.renderCurrentStep();
    this.updateCartBadge();
    this.saveCheckoutState();
    this.showNotification('Cart cleared', 'info');
  }

  applyPromoCode() {
    // Show promo code input
    const promoCode = prompt('Enter promo code:');
    if (promoCode) {
      // Validate promo code
      this.showNotification('Promo code applied!', 'success');
    }
  }

  trackAddToCart(product) {
    // Analytics tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', 'add_to_cart', {
        currency: 'INR',
        value: product.price,
        items: [{
          item_id: product.id,
          item_name: product.name,
          category: product.category,
          price: product.price,
          quantity: 1
        }]
      });
    }
  }

  // Utility functions
  createElementFromHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Global mobile checkout instance
let mobileCheckout;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  mobileCheckout = new MobileCheckout();
});

// Make mobile checkout globally accessible
window.mobileCheckout = mobileCheckout;

// CSS animations for mobile checkout
const mobileCheckoutStyles = `
  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(-100%);
      opacity: 0;
    }
  }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = mobileCheckoutStyles;
document.head.appendChild(styleSheet);