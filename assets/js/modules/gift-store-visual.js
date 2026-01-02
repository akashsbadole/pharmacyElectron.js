/**
 * Visual Gift Store Experience for StyleMine
 * Enhanced gift store with visual bundle selection and occasion-based recommendations
 * Optimized for gift shopping and presentation
 */

class GiftStoreVisual {
  constructor(options = {}) {
    this.options = {
      containerId: 'gift-store-container',
      enableWrappingPreview: true,
      enableMessageTemplates: true,
      enableCardDesigns: true,
      enableRecommendations: true,
      autoSaveSelections: true,
      ...options
    };

    this.currentOccasion = 'birthday';
    this.giftBundles = [];
    this.selectedWrapping = null;
    this.giftMessage = '';
    this.selectedCardDesign = null;
    this.recipientInfo = {};
    this.giftCart = [];
    this.wrappingOptions = [];
    this.cardDesigns = [];
    this.messageTemplates = [];

    this.init();
  }

  init() {
    this.createGiftStoreInterface();
    this.loadGiftData();
    this.setupEventListeners();
    this.renderOccasionTabs();
    this.renderGiftBundles();
    this.showGiftCartSummary();
    console.log('Gift Store Visual initialized');
  }

  createGiftStoreInterface() {
    const container = document.getElementById(this.options.containerId) || 
                    this.createGiftStoreContainer();

    container.className = 'gift-store-container';
    container.innerHTML = `
      <div class="gift-store-header">
        <h1 class="gift-store-title">Gift Store</h1>
        <p class="gift-store-subtitle">Create the perfect gift with our curated bundles and beautiful presentation</p>
      </div>
      
      <div class="occasion-navigation">
        <div class="occasion-tabs" id="occasion-tabs">
          <!-- Dynamically populated -->
        </div>
      </div>
      
      <div class="gift-bundles-grid" id="gift-bundles-grid">
        <!-- Dynamically populated -->
      </div>
      
      <div class="gift-recommendations" id="gift-recommendations">
        <!-- Dynamically populated -->
      </div>
      
      <div class="gift-cart-summary" id="gift-cart-summary">
        <!-- Dynamically populated -->
      </div>
    `;

    this.container = container;
  }

  createGiftStoreContainer() {
    const container = document.createElement('div');
    container.id = this.options.containerId;
    
    // Insert before the main content area
    const mainContent = document.querySelector('.main-content') || document.body;
    mainContent.insertBefore(container, mainContent.firstChild);
    
    return container;
  }

  async loadGiftData() {
    try {
      // Load gift bundles, wrapping options, and card designs
      await Promise.all([
        this.loadGiftBundles(),
        this.loadWrappingOptions(),
        this.loadCardDesigns(),
        this.loadMessageTemplates()
      ]);
      
      // Auto-render after data is loaded
      this.renderGiftBundles();
      this.renderRecommendations();
      
    } catch (error) {
      console.error('Error loading gift store data:', error);
      this.showErrorState();
    }
  }

  async loadGiftBundles() {
    // Simulate API call - replace with actual endpoint
    this.giftBundles = [
      {
        id: 'birthday-bundle-1',
        title: 'Birthday Celebration Box',
        description: 'A perfect birthday celebration with premium treats and personalized message',
        occasion: 'birthday',
        image: 'https://picsum.photos/400/300?random=1',
        components: ['Premium Chocolates', 'Birthday Card', 'Wrapping Paper', 'Ribbon'],
        currentPrice: 899,
        originalPrice: 1199,
        savings: 300,
        rating: 4.8,
        reviewCount: 156
      },
      {
        id: 'anniversary-bundle-1',
        title: 'Anniversary Romance Pack',
        description: 'Elegant anniversary gift with romantic touches and premium presentation',
        occasion: 'anniversary',
        image: 'https://picsum.photos/400/300?random=2',
        components: ['Luxury Chocolates', 'Rose Bouquet', 'Anniversary Card', 'Premium Wrap'],
        currentPrice: 1299,
        originalPrice: 1699,
        savings: 400,
        rating: 4.9,
        reviewCount: 89
      },
      {
        id: 'corporate-bundle-1',
        title: 'Corporate Appreciation Gift',
        description: 'Professional corporate gift with elegant presentation',
        occasion: 'corporate',
        image: 'https://picsum.photos/400/300?random=3',
        components: ['Premium Coffee Set', 'Business Card', 'Corporate Wrap', 'Thank You Note'],
        currentPrice: 699,
        originalPrice: 899,
        savings: 200,
        rating: 4.6,
        reviewCount: 234
      },
      {
        id: 'holiday-bundle-1',
        title: 'Holiday Festive Collection',
        description: 'Celebrate the season with this festive holiday gift collection',
        occasion: 'holiday',
        image: 'https://picsum.photos/400/300?random=4',
        components: ['Holiday Sweets', 'Festive Card', 'Holiday Wrap', 'Decoration'],
        currentPrice: 999,
        originalPrice: 1299,
        savings: 300,
        rating: 4.7,
        reviewCount: 178
      }
    ];
  }

  async loadWrappingOptions() {
    this.wrappingOptions = [
      {
        id: 'classic-birthday',
        name: 'Classic Birthday',
        description: 'Bright and colorful birthday wrapping',
        price: 50,
        preview: 'https://picsum.photos/300/200?random=11',
        style: 'birthday',
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1']
      },
      {
        id: 'elegant-anniversary',
        name: 'Elegant Anniversary',
        description: 'Sophisticated anniversary presentation',
        price: 75,
        preview: 'https://picsum.photos/300/200?random=12',
        style: 'anniversary',
        colors: ['#667eea', '#764ba2', '#f093fb']
      },
      {
        id: 'corporate-professional',
        name: 'Corporate Professional',
        description: 'Clean and professional business presentation',
        price: 60,
        preview: 'https://picsum.photos/300/200?random=13',
        style: 'corporate',
        colors: ['#2c3e50', '#34495e', '#7f8c8d']
      },
      {
        id: 'holiday-festive',
        name: 'Holiday Festive',
        description: 'Festive holiday celebration wrapping',
        price: 80,
        preview: 'https://picsum.photos/300/200?random=14',
        style: 'holiday',
        colors: ['#e74c3c', '#27ae60', '#f39c12']
      },
      {
        id: 'luxury-premium',
        name: 'Luxury Premium',
        description: 'Premium quality wrapping with ribbons',
        price: 120,
        preview: 'https://picsum.photos/300/200?random=15',
        style: 'luxury',
        colors: ['#8e44ad', '#2c3e50', '#d4af37']
      }
    ];
  }

  async loadCardDesigns() {
    this.cardDesigns = [
      {
        id: 'birthday-card-1',
        name: 'Happy Birthday',
        category: 'birthday',
        preview: 'https://picsum.photos/300/200?random=21',
        isAnimated: true
      },
      {
        id: 'anniversary-card-1',
        name: 'Anniversary Wishes',
        category: 'anniversary',
        preview: 'https://picsum.photos/300/200?random=22',
        isAnimated: false
      },
      {
        id: 'congratulations-card-1',
        name: 'Congratulations',
        category: 'congratulations',
        preview: 'https://picsum.photos/300/200?random=23',
        isAnimated: true
      },
      {
        id: 'thank-you-card-1',
        name: 'Thank You',
        category: 'thankyou',
        preview: 'https://picsum.photos/300/200?random=24',
        isAnimated: false
      }
    ];
  }

  async loadMessageTemplates() {
    this.messageTemplates = {
      birthday: [
        "Happy Birthday! Hope your special day is filled with joy and wonderful surprises!",
        "Wishing you a birthday that's as amazing as you are!",
        "Another year older, another year wiser, another year more fabulous! Happy Birthday!",
        "May your birthday be the start of a year filled with good luck, good health, and much happiness!"
      ],
      anniversary: [
        "Happy Anniversary! Wishing you both many more years of love and happiness together.",
        "Another year of beautiful memories together. Happy Anniversary!",
        "Love is not just looking at each other, it's looking in the same direction. Happy Anniversary!",
        "Here's to the couple who makes love look easy. Happy Anniversary!"
      ],
      congratulations: [
        "Congratulations on this amazing achievement! You deserve all the success!",
        "So proud of you! This is just the beginning of your incredible journey.",
        "Congratulations! Your hard work and dedication have truly paid off.",
        "Celebrating your success! Wishing you even more achievements ahead."
      ],
      thankyou: [
        "Thank you so much for your kindness and generosity. It means the world to us.",
        "Your thoughtfulness made our day extra special. Thank you!",
        "We appreciate everything you do. Thank you for being such an important part of our lives.",
        "Thank you for your support and encouragement. It makes all the difference."
      ]
    };
  }

  setupEventListeners() {
    // Occasion tab selection
    document.addEventListener('click', (e) => {
      if (e.target.closest('.occasion-tab')) {
        const occasion = e.target.closest('.occasion-tab').dataset.occasion;
        this.selectOccasion(occasion);
      }
    });

    // Gift bundle actions
    document.addEventListener('click', (e) => {
      if (e.target.closest('.add-bundle-btn')) {
        const bundleId = e.target.closest('.gift-bundle-card').dataset.bundleId;
        this.addBundleToGiftCart(bundleId);
      }
      
      if (e.target.closest('.bundle-overlay')) {
        const bundleId = e.target.closest('.gift-bundle-card').dataset.bundleId;
        this.showBundlePreview(bundleId);
      }
    });

    // Wrapping interface
    document.addEventListener('click', (e) => {
      if (e.target.closest('.wrapping-option')) {
        const wrappingId = e.target.closest('.wrapping-option').dataset.wrappingId;
        this.selectWrappingOption(wrappingId);
      }
      
      if (e.target.closest('.gift-card-design')) {
        const designId = e.target.closest('.gift-card-design').dataset.designId;
        this.selectCardDesign(designId);
      }
    });

    // Gift message editor
    document.addEventListener('click', (e) => {
      if (e.target.closest('.message-template')) {
        const template = e.target.closest('.message-template').dataset.template;
        this.selectMessageTemplate(template);
      }
    });

    // Cart actions
    document.addEventListener('click', (e) => {
      if (e.target.closest('.proceed-gift-btn')) {
        this.proceedToCheckout();
      }
    });

    // Modal close events
    document.addEventListener('click', (e) => {
      if (e.target.closest('.wrapping-close') || e.target.closest('.size-guide-close')) {
        this.closeModal(e.target.closest('[class*="-modal"]'));
      }
    });
  }

  renderOccasionTabs() {
    const occasions = [
      { id: 'birthday', name: 'Birthday', icon: 'fa-birthday-cake' },
      { id: 'anniversary', name: 'Anniversary', icon: 'fa-heart' },
      { id: 'congratulations', name: 'Congratulations', icon: 'fa-trophy' },
      { id: 'thankyou', name: 'Thank You', icon: 'fa-handshake' },
      { id: 'corporate', name: 'Corporate', icon: 'fa-briefcase' },
      { id: 'holiday', name: 'Holiday', icon: 'fa-gift' }
    ];

    const tabsHTML = occasions.map(occasion => `
      <div class="occasion-tab ${occasion.id === this.currentOccasion ? 'active' : ''}" 
           data-occasion="${occasion.id}">
        <div class="occasion-icon">
          <i class="fa ${occasion.icon}"></i>
        </div>
        <div class="occasion-name">${occasion.name}</div>
      </div>
    `).join('');

    document.getElementById('occasion-tabs').innerHTML = tabsHTML;
  }

  renderGiftBundles() {
    const filteredBundles = this.giftBundles.filter(bundle => 
      bundle.occasion === this.currentOccasion
    );

    const bundlesHTML = filteredBundles.map(bundle => `
      <div class="gift-bundle-card" data-bundle-id="${bundle.id}">
        <div class="gift-bundle-image">
          <img src="${bundle.image}" alt="${bundle.title}" loading="lazy">
          <div class="bundle-overlay">
            <div class="bundle-preview-icon">
              <i class="fa fa-eye"></i>
            </div>
          </div>
        </div>
        
        <div class="gift-bundle-content">
          <h3 class="gift-bundle-title">${bundle.title}</h3>
          <p class="gift-bundle-description">${bundle.description}</p>
          
          <div class="bundle-components">
            <div class="components-title">Includes:</div>
            <div class="components-list">
              ${bundle.components.map(component => `
                <span class="component-item">${component}</span>
              `).join('')}
            </div>
          </div>
          
          <div class="bundle-pricing">
            <div class="bundle-price">
              <span class="current-price">₹${bundle.currentPrice}</span>
              <span class="original-price">₹${bundle.originalPrice}</span>
            </div>
            <div class="bundle-savings">Save ₹${bundle.savings}</div>
          </div>
          
          <button class="add-bundle-btn" onclick="giftStoreVisual.addBundleToGiftCart('${bundle.id}')">
            <i class="fa fa-plus"></i>
            Add to Gift Cart
          </button>
        </div>
      </div>
    `).join('');

    document.getElementById('gift-bundles-grid').innerHTML = bundlesHTML;
  }

  renderRecommendations() {
    const recommendations = this.getPersonalizedRecommendations();
    
    const recommendationsHTML = `
      <h2 class="recommendations-title">You Might Also Like</h2>
      <div class="recommendations-grid">
        ${recommendations.map(rec => `
          <div class="recommendation-card" onclick="giftStoreVisual.selectRecommendation('${rec.id}')">
            <div class="recommendation-icon">
              <i class="fa ${rec.icon}"></i>
            </div>
            <h3 class="recommendation-title">${rec.title}</h3>
            <p class="recommendation-description">${rec.description}</p>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('gift-recommendations').innerHTML = recommendationsHTML;
  }

  getPersonalizedRecommendations() {
    // AI-powered recommendation logic would go here
    return [
      {
        id: 'personalized-wrap',
        title: 'Personalized Wrapping',
        description: 'Add a personal touch with custom wrapping options',
        icon: 'fa-palette'
      },
      {
        id: 'premium-upgrade',
        title: 'Premium Upgrade',
        description: 'Enhance your gift with premium packaging',
        icon: 'fa-crown'
      },
      {
        id: 'express-delivery',
        title: 'Express Delivery',
        description: 'Get your gift delivered same day',
        icon: 'fa-shipping-fast'
      },
      {
        id: 'gift-insurance',
        title: 'Gift Protection',
        description: 'Protect your gift with our premium packaging',
        icon: 'fa-shield-alt'
      }
    ];
  }

  selectOccasion(occasion) {
    this.currentOccasion = occasion;
    
    // Update active tab
    document.querySelectorAll('.occasion-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-occasion="${occasion}"]`).classList.add('active');
    
    // Re-render bundles for selected occasion
    this.renderGiftBundles();
    
    // Update message templates
    this.updateMessageTemplates(occasion);
  }

  updateMessageTemplates(occasion) {
    if (!this.options.enableMessageTemplates) return;
    
    // This would update the message templates in the wrapping interface
    console.log('Updated message templates for:', occasion);
  }

  async addBundleToGiftCart(bundleId) {
    const bundle = this.giftBundles.find(b => b.id === bundleId);
    if (!bundle) return;

    const existingItem = this.giftCart.find(item => item.bundleId === bundleId);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.giftCart.push({
        bundleId: bundle.id,
        bundle: bundle,
        quantity: 1,
        wrapping: null,
        message: '',
        cardDesign: null
      });
    }

    this.showAddToCartFeedback(bundle);
    this.updateGiftCartSummary();
    this.saveGiftCartState();
    
    // Analytics
    this.trackBundleAddToCart(bundle);
  }

  showAddToCartFeedback(bundle) {
    const feedback = document.createElement('div');
    feedback.className = 'mobile-notification success';
    feedback.innerHTML = `
      <div class="notification-header">
        <i class="fa fa-gift"></i>
        <span class="notification-title">Added to Gift Cart</span>
      </div>
      <div class="notification-message">${bundle.title} added to your gift cart</div>
    `;

    this.container.appendChild(feedback);
    
    setTimeout(() => feedback.classList.add('show'), 100);
    setTimeout(() => {
      feedback.classList.remove('show');
      setTimeout(() => feedback.remove(), 300);
    }, 3000);
  }

  updateGiftCartSummary() {
    const summary = document.getElementById('gift-cart-summary');
    const totalItems = this.giftCart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = this.giftCart.reduce((sum, item) => sum + (item.bundle.currentPrice * item.quantity), 0);

    summary.innerHTML = `
      <div class="cart-summary-info">
        <h3 class="cart-summary-title">Gift Cart</h3>
        <p class="cart-summary-items">${totalItems} gift${totalItems !== 1 ? 's' : ''} • ₹${totalPrice}</p>
      </div>
      <div class="cart-summary-total">₹${totalPrice}</div>
      <button class="proceed-gift-btn" onclick="giftStoreVisual.showWrappingInterface()">
        <i class="fa fa-gift"></i> Personalize & Checkout
      </button>
    `;

    summary.classList.add('show');
  }

  showGiftCartSummary() {
    if (this.giftCart.length > 0) {
      this.updateGiftCartSummary();
    }
  }

  showWrappingInterface() {
    const modal = document.createElement('div');
    modal.className = 'gift-wrapping-interface show';
    modal.innerHTML = `
      <div class="wrapping-modal">
        <div class="wrapping-header">
          <h2 class="wrapping-title">Personalize Your Gift</h2>
          <button class="wrapping-close" onclick="giftStoreVisual.closeModal(this.closest('.gift-wrapping-interface'))">
            <i class="fa fa-times"></i>
          </button>
        </div>
        
        <div class="wrapping-content">
          ${this.renderWrappingOptions()}
          ${this.renderGiftMessageEditor()}
          ${this.renderCardDesignSelection()}
          
          <div class="wrapping-actions mt-6 flex justify-end gap-4">
            <button class="btn btn-secondary" onclick="giftStoreVisual.closeModal(this.closest('.gift-wrapping-interface'))">
              Cancel
            </button>
            <button class="btn btn-primary" onclick="giftStoreVisual.completeGiftPersonalization()">
              Add to Cart & Continue
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  renderWrappingOptions() {
    return `
      <div class="wrapping-options">
        <h3 class="text-lg font-semibold mb-4">Choose Wrapping Style</h3>
        <div class="wrapping-options-grid">
          ${this.wrappingOptions.map(option => `
            <div class="wrapping-option" data-wrapping-id="${option.id}">
              <div class="wrapping-preview">
                <img src="${option.preview}" alt="${option.name}">
              </div>
              <div class="wrapping-info">
                <h4 class="wrapping-name">${option.name}</h4>
                <p class="wrapping-description">${option.description}</p>
                <div class="wrapping-price">₹${option.price}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderGiftMessageEditor() {
    if (!this.options.enableMessageTemplates) return '';

    const templates = this.messageTemplates[this.currentOccasion] || [];
    
    return `
      <div class="gift-message-editor">
        <div class="message-editor-header">
          <i class="fa fa-envelope text-purple-600"></i>
          <h3 class="message-editor-title">Add a Personal Message</h3>
        </div>
        
        <div class="message-templates">
          ${templates.map((template, index) => `
            <button class="message-template" data-template="${index}">
              ${template.substring(0, 30)}...
            </button>
          `).join('')}
        </div>
        
        <textarea class="message-textarea" 
                  id="gift-message" 
                  placeholder="Write your personal message here..." 
                  maxlength="500"></textarea>
        <div class="message-counter">
          <span id="message-char-count">0</span>/500 characters
        </div>
      </div>
    `;
  }

  renderCardDesignSelection() {
    if (!this.options.enableCardDesigns) return '';

    const designs = this.cardDesigns.filter(design => 
      design.category === this.currentOccasion || design.category === 'general'
    );

    return `
      <div class="gift-card-designs">
        <h3 class="text-lg font-semibold mb-4">Choose Card Design</h3>
        <div class="designs-grid">
          ${designs.map(design => `
            <div class="gift-card-design" data-design-id="${design.id}">
              <img src="${design.preview}" alt="${design.name}">
              <div class="design-overlay">
                <i class="fa fa-check design-checkmark"></i>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  selectWrappingOption(wrappingId) {
    // Update UI
    document.querySelectorAll('.wrapping-option').forEach(option => {
      option.classList.remove('selected');
    });
    document.querySelector(`[data-wrapping-id="${wrappingId}"]`).classList.add('selected');

    // Save selection
    this.selectedWrapping = this.wrappingOptions.find(w => w.id === wrappingId);
  }

  selectCardDesign(designId) {
    // Update UI
    document.querySelectorAll('.gift-card-design').forEach(design => {
      design.classList.remove('selected');
    });
    document.querySelector(`[data-design-id="${designId}"]`).classList.add('selected');

    // Save selection
    this.selectedCardDesign = this.cardDesigns.find(d => d.id === designId);
  }

  selectMessageTemplate(templateIndex) {
    const templates = this.messageTemplates[this.currentOccasion] || [];
    const template = templates[parseInt(templateIndex)];
    
    if (template) {
      const textarea = document.getElementById('gift-message');
      if (textarea) {
        textarea.value = template;
        this.updateMessageCounter();
      }
    }
  }

  updateMessageCounter() {
    const textarea = document.getElementById('gift-message');
    const counter = document.getElementById('message-char-count');
    
    if (textarea && counter) {
      counter.textContent = textarea.value.length;
    }
  }

  completeGiftPersonalization() {
    // Collect all personalization data
    const message = document.getElementById('gift-message')?.value || '';
    
    // Update gift cart items with personalization
    this.giftCart.forEach(item => {
      item.wrapping = this.selectedWrapping;
      item.message = message;
      item.cardDesign = this.selectedCardDesign;
    });

    this.closeModal(document.querySelector('.gift-wrapping-interface'));
    
    // Proceed to checkout
    this.proceedToCheckout();
  }

  showSizeGuide() {
    const modal = document.createElement('div');
    modal.className = 'size-guide-modal show';
    modal.innerHTML = `
      <div class="size-guide-content">
        <div class="size-guide-header">
          <h2 class="size-guide-title">Size Guide & Measurements</h2>
          <button class="size-guide-close" onclick="giftStoreVisual.closeModal(this.closest('.size-guide-modal'))">
            <i class="fa fa-times"></i>
          </button>
        </div>
        
        <div class="size-guide-body">
          ${this.renderSizeGuideContent()}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  renderSizeGuideContent() {
    return `
      <div class="measurement-guide">
        <div class="measurement-item">
          <div class="measurement-diagram">
            <i class="fa fa-ruler text-4xl text-gray-400"></i>
          </div>
          <h4 class="measurement-label">Length</h4>
          <p class="measurement-description">Measure from shoulder to desired length</p>
        </div>
        
        <div class="measurement-item">
          <div class="measurement-diagram">
            <i class="fa fa-arrows-alt-h text-4xl text-gray-400"></i>
          </div>
          <h4 class="measurement-label">Width</h4>
          <p class="measurement-description">Measure across the chest at fullest point</p>
        </div>
        
        <div class="measurement-item">
          <div class="measurement-diagram">
            <i class="fa fa-arrows-alt-v text-4xl text-gray-400"></i>
          </div>
          <h4 class="measurement-label">Height</h4>
          <p class="measurement-description">Measure from top to bottom</p>
        </div>
        
        <div class="measurement-item">
          <div class="measurement-diagram">
            <i class="fa fa-circle text-4xl text-gray-400"></i>
          </div>
          <h4 class="measurement-label">Circumference</h4>
          <p class="measurement-description">Measure around the widest part</p>
        </div>
      </div>
      
      <div class="size-chart-table">
        <h3 class="text-lg font-semibold mb-4">Size Chart</h3>
        <table class="size-chart">
          <thead>
            <tr>
              <th>Size</th>
              <th>Length (cm)</th>
              <th>Width (cm)</th>
              <th>Height (cm)</th>
              <th>Best For</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Small</td>
              <td>25-30</td>
              <td>20-25</td>
              <td>8-10</td>
              <td>Small items, accessories</td>
            </tr>
            <tr>
              <td>Medium</td>
              <td>30-40</td>
              <td>25-30</td>
              <td>10-15</td>
              <td>Clothing, books</td>
            </tr>
            <tr>
              <td>Large</td>
              <td>40-50</td>
              <td>30-40</td>
              <td>15-20</td>
              <td>Large items, multiple products</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  closeModal(modal) {
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    }
  }

  proceedToCheckout() {
    // Integrate with main POS checkout
    if (window.pharmaApp && window.pharmaApp.getModule('pos')) {
      const posModule = window.pharmaApp.getModule('pos');
      
      // Convert gift cart to POS cart items
      this.giftCart.forEach(item => {
        const product = {
          _id: item.bundleId,
          name: item.bundle.title,
          price: item.bundle.currentPrice,
          sku: `GIFT-${item.bundleId}`,
          category: 'gift_bundle',
          is_gift: true,
          gift_wrapping: item.wrapping,
          gift_message: item.message,
          gift_card_design: item.cardDesign
        };
        
        posModule.addToCart(product);
      });
      
      // Switch to payment step
      posModule.showPaymentInterface();
    }
    
    this.hideGiftStore();
  }

  hideGiftStore() {
    this.container.style.display = 'none';
  }

  showGiftStore() {
    this.container.style.display = 'flex';
  }

  showBundlePreview(bundleId) {
    const bundle = this.giftBundles.find(b => b.id === bundleId);
    if (!bundle) return;

    // Create preview modal
    const preview = document.createElement('div');
    preview.className = 'bundle-preview-modal';
    preview.innerHTML = `
      <div class="preview-content">
        <div class="preview-image">
          <img src="${bundle.image}" alt="${bundle.title}">
        </div>
        <div class="preview-details">
          <h3>${bundle.title}</h3>
          <p>${bundle.description}</p>
          <div class="preview-components">
            <h4>What's Included:</h4>
            <ul>
              ${bundle.components.map(comp => `<li>${comp}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;

    // This would be a more elaborate preview implementation
    console.log('Bundle preview for:', bundle.title);
  }

  selectRecommendation(recommendationId) {
    console.log('Selected recommendation:', recommendationId);
    
    switch (recommendationId) {
      case 'personalized-wrap':
        this.showWrappingInterface();
        break;
      case 'premium-upgrade':
        this.showPremiumUpgradeOptions();
        break;
      case 'express-delivery':
        this.showExpressDeliveryOptions();
        break;
      case 'gift-insurance':
        this.showGiftProtectionOptions();
        break;
    }
  }

  showPremiumUpgradeOptions() {
    // Show premium upgrade options
    console.log('Premium upgrade options');
  }

  showExpressDeliveryOptions() {
    // Show express delivery options
    console.log('Express delivery options');
  }

  showGiftProtectionOptions() {
    // Show gift protection options
    console.log('Gift protection options');
  }

  showErrorState() {
    document.getElementById('gift-bundles-grid').innerHTML = `
      <div class="text-center py-12">
        <i class="fa fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Gift Store</h3>
        <p class="text-gray-600">Please try again later.</p>
        <button class="btn btn-primary mt-4" onclick="location.reload()">
          <i class="fa fa-refresh"></i> Retry
        </button>
      </div>
    `;
  }

  // Persistence methods
  saveGiftCartState() {
    if (!this.options.autoSaveSelections) return;
    
    try {
      localStorage.setItem('gift_store_cart', JSON.stringify({
        giftCart: this.giftCart,
        selectedWrapping: this.selectedWrapping,
        selectedCardDesign: this.selectedCardDesign,
        giftMessage: this.giftMessage
      }));
    } catch (error) {
      console.error('Error saving gift cart state:', error);
    }
  }

  loadGiftCartState() {
    try {
      const saved = localStorage.getItem('gift_store_cart');
      if (saved) {
        const state = JSON.parse(saved);
        this.giftCart = state.giftCart || [];
        this.selectedWrapping = state.selectedWrapping || null;
        this.selectedCardDesign = state.selectedCardDesign || null;
        this.giftMessage = state.giftMessage || '';
        
        this.updateGiftCartSummary();
      }
    } catch (error) {
      console.error('Error loading gift cart state:', error);
    }
  }

  // Analytics methods
  trackBundleAddToCart(bundle) {
    // Track analytics for gift bundle additions
    if (typeof gtag !== 'undefined') {
      gtag('event', 'add_to_cart', {
        currency: 'INR',
        value: bundle.currentPrice,
        items: [{
          item_id: bundle.id,
          item_name: bundle.title,
          category: 'gift_bundle',
          occasion: bundle.occasion,
          price: bundle.currentPrice,
          quantity: 1
        }]
      });
    }
  }

  // Public API methods
  initialize() {
    this.init();
  }

  getGiftCartItems() {
    return [...this.giftCart];
  }

  getTotalGiftCartValue() {
    return this.giftCart.reduce((total, item) => 
      total + (item.bundle.currentPrice * item.quantity), 0
    );
  }

  clearGiftCart() {
    this.giftCart = [];
    this.selectedWrapping = null;
    this.selectedCardDesign = null;
    this.giftMessage = '';
    this.updateGiftCartSummary();
    this.saveGiftCartState();
  }

  updateQuantity(bundleId, quantity) {
    const item = this.giftCart.find(item => item.bundleId === bundleId);
    if (item) {
      if (quantity <= 0) {
        this.giftCart = this.giftCart.filter(item => item.bundleId !== bundleId);
      } else {
        item.quantity = quantity;
      }
      this.updateGiftCartSummary();
      this.saveGiftCartState();
    }
  }
}

// Global gift store instance
let giftStoreVisual;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  giftStoreVisual = new GiftStoreVisual();
  giftStoreVisual.loadGiftCartState();
});

// Make gift store globally accessible
window.giftStoreVisual = giftStoreVisual;

// Integration with main POS system
if (typeof window.pharmaApp !== 'undefined') {
  // Register gift store as a module in the main app
  window.pharmaApp.registerModule('gift-store', {
    initialize: () => giftStoreVisual.initialize(),
    show: () => giftStoreVisual.showGiftStore(),
    hide: () => giftStoreVisual.hideGiftStore(),
    getCartItems: () => giftStoreVisual.getGiftCartItems(),
    getTotalValue: () => giftStoreVisual.getTotalGiftCartValue()
  });
}