/**
 * Enhanced Visual Grid System for StyleMine
 * Modern visual shopping experience with image-based product grids
 * Optimized for garments and gift store retail
 */

class EnhancedVisualGrid {
  constructor(options = {}) {
    this.options = {
      containerId: 'enhanced-product-grid',
      layout: 'auto-fill', // auto-fill, 2x2, 3x3, 4x4, compact, featured
      itemsPerPage: 12,
      enableInfiniteScroll: true,
      enableDragAndDrop: true,
      enableVariantSelection: true,
      enableQuickActions: true,
      mobileBreakpoint: 768,
      animationDuration: 300,
      ...options
    };

    this.products = [];
    this.filteredProducts = [];
    this.currentPage = 1;
    this.isLoading = false;
    this.gridLayout = 'auto-fill';
    this.activeFilters = new Map();
    this.searchTerm = '';
    this.sortBy = 'name';
    this.sortOrder = 'asc';
    this.draggedElement = null;
    this.cartDropZone = null;

    this.init();
  }

  init() {
    this.createGridContainer();
    this.createControls();
    this.createFilterChips();
    this.createFeaturedCarousel();
    this.setupEventListeners();
    this.setupIntersectionObserver();
    this.setupDragAndDrop();
    this.loadProducts();
  }

  createGridContainer() {
    const container = document.getElementById(this.options.containerId) || 
                    this.createGridContainerElement();
    
    container.className = 'enhanced-product-grid';
    container.innerHTML = `
      <div class="grid-loading">
        <div class="spinner"></div>
        Loading products...
      </div>
    `;

    this.gridContainer = container;
  }

  createGridContainerElement() {
    const container = document.createElement('div');
    container.id = this.options.containerId;
    document.body.appendChild(container);
    return container;
  }

  createControls() {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'grid-controls';
    controlsContainer.innerHTML = `
      <div class="grid-search">
        <i class="fa fa-search search-icon"></i>
        <input type="text" 
               placeholder="Search products..." 
               class="grid-search-input"
               aria-label="Search products">
      </div>
      
      <div class="grid-layout-selector">
        <span class="text-sm text-gray-600">View:</span>
        <button class="layout-btn active" data-layout="auto-fill" title="Auto fit">
          <i class="fa fa-th-large"></i>
        </button>
        <button class="layout-btn" data-layout="2x2" title="2x2 Grid">
          <i class="fa fa-th"></i> 2x2
        </button>
        <button class="layout-btn" data-layout="3x3" title="3x3 Grid">
          <i class="fa fa-th"></i> 3x3
        </button>
        <button class="layout-btn" data-layout="4x4" title="4x4 Grid">
          <i class="fa fa-th"></i> 4x4
        </button>
        <button class="layout-btn" data-layout="compact" title="Compact View">
          <i class="fa fa-th-list"></i>
        </button>
      </div>
    `;

    this.gridContainer.parentNode.insertBefore(controlsContainer, this.gridContainer);
    this.controlsContainer = controlsContainer;
  }

  createFilterChips() {
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-chips';
    filterContainer.innerHTML = `
      <div class="filter-section">
        <h5 class="text-sm font-medium text-gray-700 mb-2">Categories</h5>
        <div class="filter-chips-row" data-filter="category"></div>
      </div>
      <div class="filter-section">
        <h5 class="text-sm font-medium text-gray-700 mb-2">Price Range</h5>
        <div class="filter-chips-row" data-filter="priceRange"></div>
      </div>
      <div class="filter-section">
        <h5 class="text-sm font-medium text-gray-700 mb-2">Size</h5>
        <div class="filter-chips-row" data-filter="size"></div>
      </div>
      <div class="filter-section">
        <h5 class="text-sm font-medium text-gray-700 mb-2">Color</h5>
        <div class="filter-chips-row" data-filter="color"></div>
      </div>
      <div class="filter-section">
        <h5 class="text-sm font-medium text-gray-700 mb-2">Brand</h5>
        <div class="filter-chips-row" data-filter="brand"></div>
      </div>
    `;

    this.gridContainer.parentNode.insertBefore(filterContainer, this.gridContainer);
    this.filterContainer = filterContainer;
  }

  createFeaturedCarousel() {
    const carouselContainer = document.createElement('div');
    carouselContainer.className = 'featured-carousel';
    carouselContainer.innerHTML = `
      <div class="carousel-container">
        <div class="carousel-track" id="featured-carousel-track"></div>
      </div>
      <button class="carousel-nav prev" id="carousel-prev">
        <i class="fa fa-chevron-left"></i>
      </button>
      <button class="carousel-nav next" id="carousel-next">
        <i class="fa fa-chevron-right"></i>
      </button>
    `;

    this.gridContainer.parentNode.insertBefore(carouselContainer, this.gridContainer);
    this.carouselContainer = carouselContainer;
    this.setupCarousel();
  }

  setupEventListeners() {
    // Search functionality
    const searchInput = this.controlsContainer.querySelector('.grid-search-input');
    searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));

    // Layout selector
    this.controlsContainer.querySelectorAll('.layout-btn').forEach(btn => {
      btn.addEventListener('click', this.handleLayoutChange.bind(this));
    });

    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));

    // Resize handler for responsive layout
    window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 250));
  }

  setupIntersectionObserver() {
    if (!this.options.enableInfiniteScroll) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isLoading) {
          this.loadMoreProducts();
        }
      });
    }, {
      rootMargin: '100px'
    });

    this.observer = observer;
  }

  setupDragAndDrop() {
    if (!this.options.enableDragAndDrop) return;

    this.createCartDropZone();
    
    // Make product cards draggable
    this.gridContainer.addEventListener('dragstart', this.handleDragStart.bind(this));
    this.gridContainer.addEventListener('dragend', this.handleDragEnd.bind(this));
  }

  createCartDropZone() {
    const dropZone = document.createElement('div');
    dropZone.className = 'cart-drop-zone';
    dropZone.innerHTML = `
      <i class="fa fa-shopping-cart cart-icon"></i>
      <div>Drag products here to add to cart</div>
    `;

    document.body.appendChild(dropZone);
    this.cartDropZone = dropZone;
  }

  async loadProducts() {
    try {
      this.isLoading = true;
      this.showLoadingState();

      // Simulate API call - replace with actual API endpoint
      const response = await this.fetchProducts();
      this.products = response.products || [];
      this.filteredProducts = [...this.products];

      this.hideLoadingState();
      this.renderProducts();
      this.setupFilterChips();
      this.setupFeaturedCarousel();
      this.initializeIntersectionObserver();

    } catch (error) {
      console.error('Error loading products:', error);
      this.showErrorState();
    } finally {
      this.isLoading = false;
    }
  }

  async fetchProducts() {
    // This would be replaced with actual API call
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          products: this.generateSampleProducts()
        });
      }, 1000);
    });
  }

  generateSampleProducts() {
    const products = [];
    const categories = ['Clothing', 'Accessories', 'Gift Sets', 'Home & Living'];
    const brands = ['StyleMine', 'ComfortWear', 'StylePro', 'GiftCraft'];
    const colors = ['Black', 'White', 'Blue', 'Red', 'Green', 'Yellow', 'Pink', 'Purple'];
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    for (let i = 1; i <= 50; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const brand = brands[Math.floor(Math.random() * brands.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = sizes[Math.floor(Math.random() * sizes.length)];
      const price = (Math.random() * 100 + 10).toFixed(2);

      products.push({
        id: i,
        name: `${category} Item ${i}`,
        brand: brand,
        category: category,
        price: parseFloat(price),
        originalPrice: Math.random() > 0.7 ? (parseFloat(price) * 1.3).toFixed(2) : null,
        discount: Math.random() > 0.7 ? Math.floor(Math.random() * 30 + 10) : 0,
        description: `High-quality ${category.toLowerCase()} item by ${brand}`,
        image: `https://picsum.photos/300/400?random=${i}`,
        stock: Math.floor(Math.random() * 100),
        rating: (Math.random() * 2 + 3).toFixed(1),
        reviewCount: Math.floor(Math.random() * 500),
        colors: [color],
        sizes: [size],
        variants: this.generateVariants(i, colors, sizes),
        isNew: Math.random() > 0.8,
        isBestseller: Math.random() > 0.9,
        isGiftEligible: Math.random() > 0.6,
        giftBundleOptions: Math.random() > 0.7 ? this.generateGiftBundleOptions() : []
      });
    }

    return products;
  }

  generateVariants(productId, colors, sizes) {
    const variants = [];
    colors.slice(0, 3).forEach(color => {
      sizes.slice(0, 4).forEach(size => {
        variants.push({
          id: `${productId}-${color}-${size}`,
          color: color,
          size: size,
          stock: Math.floor(Math.random() * 50),
          price: (Math.random() * 100 + 10).toFixed(2),
          image: `https://picsum.photos/300/400?random=${productId}-${color}-${size}`
        });
      });
    });
    return variants;
  }

  generateGiftBundleOptions() {
    const options = [
      {
        id: 'basic-wrap',
        name: 'Basic Gift Wrap',
        price: 5.99,
        image: 'gift-wrap-1.jpg'
      },
      {
        id: 'premium-wrap',
        name: 'Premium Gift Wrap',
        price: 9.99,
        image: 'gift-wrap-2.jpg'
      },
      {
        id: 'luxury-wrap',
        name: 'Luxury Gift Wrap',
        price: 15.99,
        image: 'gift-wrap-3.jpg'
      }
    ];

    return options.slice(0, Math.floor(Math.random() * 3) + 1);
  }

  showLoadingState() {
    this.gridContainer.innerHTML = `
      <div class="grid-loading">
        <div class="spinner"></div>
        Loading products...
      </div>
    `;
  }

  hideLoadingState() {
    // Loading state will be replaced by renderProducts
  }

  showErrorState() {
    this.gridContainer.innerHTML = `
      <div class="text-center py-12">
        <i class="fa fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Products</h3>
        <p class="text-gray-600">Please try again later.</p>
        <button class="btn btn-primary mt-4" onclick="location.reload()">
          <i class="fa fa-refresh"></i> Retry
        </button>
      </div>
    `;
  }

  renderProducts() {
    const startIndex = 0;
    const endIndex = this.currentPage * this.options.itemsPerPage;
    const productsToRender = this.filteredProducts.slice(startIndex, endIndex);

    if (productsToRender.length === 0) {
      this.gridContainer.innerHTML = this.getEmptyStateHTML();
      return;
    }

    const productsHTML = productsToRender.map(product => 
      this.renderProductCard(product)
    ).join('');

    this.gridContainer.innerHTML = productsHTML;

    // Add animation classes
    requestAnimationFrame(() => {
      this.gridContainer.querySelectorAll('.enhanced-product-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 50}ms`;
        card.classList.add('fade-in');
      });
    });
  }

  renderProductCard(product) {
    const stockStatus = this.getStockStatus(product.stock);
    const badges = this.getProductBadges(product);
    const rating = this.generateStarRating(product.rating);
    
    return `
      <div class="enhanced-product-card" 
           data-product-id="${product.id}"
           tabindex="0"
           role="button"
           aria-label="Product: ${product.name}">
        
        <div class="product-image-container">
          <img src="${product.image}" 
               alt="${product.name}" 
               class="product-image"
               loading="lazy">
          
          <div class="product-badges">
            ${badges}
          </div>
          
          ${this.options.enableQuickActions ? `
            <div class="product-quick-actions">
              <button class="quick-action-btn favorite" 
                      onclick="event.stopPropagation(); toggleFavorite(${product.id})"
                      aria-label="Add to favorites">
                <i class="fa fa-heart"></i>
              </button>
              <button class="quick-action-btn quick-view" 
                      onclick="event.stopPropagation(); showQuickView(${product.id})"
                      aria-label="Quick view">
                <i class="fa fa-eye"></i>
              </button>
              <button class="quick-action-btn compare" 
                      onclick="event.stopPropagation(); addToCompare(${product.id})"
                      aria-label="Add to compare">
                <i class="fa fa-balance-scale"></i>
              </button>
            </div>
          ` : ''}
          
          <div class="stock-indicator ${stockStatus.class}">
            <div class="stock-indicator-dot"></div>
            <span>${stockStatus.text}</span>
          </div>
        </div>
        
        <div class="product-info">
          <div class="product-category">${product.category}</div>
          <h3 class="product-name">${product.name}</h3>
          <div class="product-brand">${product.brand}</div>
          
          <div class="product-rating">
            <div class="stars">${rating}</div>
            <span class="rating-count">(${product.reviewCount})</span>
          </div>
          
          <div class="product-pricing">
            <span class="product-price">$${product.price}</span>
            ${product.originalPrice ? `
              <span class="product-price-original">$${product.originalPrice}</span>
            ` : ''}
            ${product.discount > 0 ? `
              <span class="product-discount">-${product.discount}%</span>
            ` : ''}
          </div>
          
          ${this.options.enableVariantSelection ? this.renderVariantSelection(product) : ''}
          
          <button class="add-to-cart-enhanced" 
                  onclick="event.stopPropagation(); addToCartEnhanced(${product.id})"
                  ${product.stock === 0 ? 'disabled' : ''}>
            <i class="fa fa-shopping-cart"></i>
            ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
        
        ${this.options.enableDragAndDrop ? `
          <div class="drag-handle" draggable="true">
            <i class="fa fa-grip-vertical"></i>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderVariantSelection(product) {
    const colorSwatches = product.colors.map(color => `
      <div class="color-swatch ${this.getColorClass(color)}" 
           data-color="${color}"
           title="${color}"
           style="background-color: ${this.getColorHex(color)}"
           onclick="event.stopPropagation(); selectVariantColor('${product.id}', '${color}')">
      </div>
    `).join('');

    const sizeOptions = product.sizes.map(size => `
      <div class="size-option" 
           data-size="${size}"
           onclick="event.stopPropagation(); selectVariantSize('${product.id}', '${size}')">
        ${size}
      </div>
    `).join('');

    return `
      <div class="variant-selection-container">
        <div class="color-swatches">
          ${colorSwatches}
        </div>
        <div class="size-selector">
          ${sizeOptions}
        </div>
      </div>
    `;
  }

  getStockStatus(stock) {
    if (stock === 0) return { class: 'out', text: 'Out of Stock' };
    if (stock <= 5) return { class: 'low', text: 'Low Stock' };
    if (stock <= 20) return { class: 'medium', text: 'In Stock' };
    return { class: 'high', text: 'In Stock' };
  }

  getProductBadges(product) {
    const badges = [];
    
    if (product.isNew) badges.push('<span class="product-badge new">New</span>');
    if (product.isBestseller) badges.push('<span class="product-badge bestseller">Best Seller</span>');
    if (product.discount > 0) badges.push('<span class="product-badge sale">Sale</span>');
    if (product.stock === 0) badges.push('<span class="product-badge out-of-stock">Out of Stock</span>');
    
    return badges.join('');
  }

  generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
      stars += '<i class="fa fa-star star"></i>';
    }
    
    if (hasHalfStar) {
      stars += '<i class="fa fa-star-half-alt star"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
      stars += '<i class="far fa-star star empty"></i>';
    }
    
    return stars;
  }

  getColorHex(colorName) {
    const colorMap = {
      'Black': '#000000',
      'White': '#FFFFFF',
      'Blue': '#0066CC',
      'Red': '#FF0000',
      'Green': '#00AA00',
      'Yellow': '#FFFF00',
      'Pink': '#FF69B4',
      'Purple': '#800080',
      'Gray': '#808080',
      'Brown': '#A52A2A'
    };
    
    return colorMap[colorName] || '#CCCCCC';
  }

  getColorClass(colorName) {
    return colorName.toLowerCase().replace(/\s+/g, '-');
  }

  setupFilterChips() {
    const filters = this.extractFilterOptions();
    
    Object.entries(filters).forEach(([filterType, options]) => {
      const container = this.filterContainer.querySelector(`[data-filter="${filterType}"]`);
      if (!container) return;

      const chipsHTML = options.map(option => `
        <button class="filter-chip" 
                data-filter-type="${filterType}" 
                data-filter-value="${option.value}"
                onclick="toggleFilter('${filterType}', '${option.value}')">
          ${option.label}
          <span class="filter-count">(${option.count})</span>
        </button>
      `).join('');

      container.innerHTML = chipsHTML;
    });
  }

  extractFilterOptions() {
    const filters = {
      category: new Map(),
      priceRange: new Map(),
      size: new Map(),
      color: new Map(),
      brand: new Map()
    };

    this.products.forEach(product => {
      // Category filter
      const categoryCount = filters.category.get(product.category) || 0;
      filters.category.set(product.category, categoryCount + 1);

      // Price range filter
      const priceRange = this.getPriceRange(product.price);
      const priceCount = filters.priceRange.get(priceRange) || 0;
      filters.priceRange.set(priceRange, priceCount + 1);

      // Size filter
      product.sizes.forEach(size => {
        const sizeCount = filters.size.get(size) || 0;
        filters.size.set(size, sizeCount + 1);
      });

      // Color filter
      product.colors.forEach(color => {
        const colorCount = filters.color.get(color) || 0;
        filters.color.set(color, colorCount + 1);
      });

      // Brand filter
      const brandCount = filters.brand.get(product.brand) || 0;
      filters.brand.set(product.brand, brandCount + 1);
    });

    return {
      category: Array.from(filters.category.entries()).map(([value, count]) => ({ value, label: value, count })),
      priceRange: Array.from(filters.priceRange.entries()).map(([value, count]) => ({ value, label: value, count })),
      size: Array.from(filters.size.entries()).map(([value, count]) => ({ value, label: value, count })),
      color: Array.from(filters.color.entries()).map(([value, count]) => ({ value, label: value, count })),
      brand: Array.from(filters.brand.entries()).map(([value, count]) => ({ value, label: value, count }))
    };
  }

  getPriceRange(price) {
    if (price < 25) return '$0-$25';
    if (price < 50) return '$25-$50';
    if (price < 100) return '$50-$100';
    return '$100+';
  }

  setupFeaturedCarousel() {
    const featuredProducts = this.products.filter(p => p.isNew || p.isBestseller).slice(0, 5);
    const carouselTrack = document.getElementById('featured-carousel-track');
    
    const carouselHTML = featuredProducts.map(product => `
      <div class="carousel-item" style="background-image: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${product.image}')">
        <div class="promotion-banner">
          <h3>${product.isNew ? 'New Arrival' : 'Best Seller'}</h3>
          <p>${product.name}</p>
          <div class="product-pricing">
            <span class="product-price">$${product.price}</span>
            ${product.originalPrice ? `
              <span class="product-price-original">$${product.originalPrice}</span>
            ` : ''}
          </div>
          <button class="btn btn-light" onclick="addToCartEnhanced(${product.id})">
            Shop Now
          </button>
        </div>
      </div>
    `).join('');

    carouselTrack.innerHTML = carouselHTML;
  }

  setupCarousel() {
    const track = document.getElementById('featured-carousel-track');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    
    let currentIndex = 0;
    const itemWidth = 400 + 24; // item width + gap
    const maxIndex = Math.max(0, track.children.length - 1);

    const updateCarousel = () => {
      track.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
    };

    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (currentIndex < maxIndex) {
        currentIndex++;
        updateCarousel();
      }
    });

    // Auto-advance carousel
    setInterval(() => {
      currentIndex = (currentIndex + 1) % track.children.length;
      updateCarousel();
    }, 5000);
  }

  handleSearch(event) {
    this.searchTerm = event.target.value.toLowerCase();
    this.applyFilters();
  }

  handleLayoutChange(event) {
    const layout = event.target.dataset.layout;
    
    // Update active button
    this.controlsContainer.querySelectorAll('.layout-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update grid layout
    this.gridLayout = layout;
    this.updateGridLayout();
  }

  updateGridLayout() {
    this.gridContainer.className = `enhanced-product-grid grid-layout-${this.gridLayout}`;
    
    // Adjust responsive behavior
    if (window.innerWidth <= this.options.mobileBreakpoint) {
      this.gridContainer.className = 'enhanced-product-grid grid-layout-compact';
    }
  }

  handleKeyboardNavigation(event) {
    const focusedCard = document.querySelector('.enhanced-product-card:focus');
    if (!focusedCard) return;

    const cards = Array.from(this.gridContainer.querySelectorAll('.enhanced-product-card'));
    const currentIndex = cards.indexOf(focusedCard);

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, cards.length - 1);
        cards[nextIndex]?.focus();
        break;
      
      case 'ArrowLeft':
        event.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        cards[prevIndex]?.focus();
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        const downIndex = Math.min(currentIndex + this.getGridColumns(), cards.length - 1);
        cards[downIndex]?.focus();
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        const upIndex = Math.max(currentIndex - this.getGridColumns(), 0);
        cards[upIndex]?.focus();
        break;
      
      case 'Enter':
      case ' ':
        event.preventDefault();
        focusedCard.click();
        break;
    }
  }

  getGridColumns() {
    const layoutMap = {
      '2x2': 2,
      '3x3': 3,
      '4x4': 4,
      'compact': 3,
      'featured': 3,
      'auto-fill': Math.floor(this.gridContainer.clientWidth / 280)
    };
    
    return layoutMap[this.gridLayout] || 3;
  }

  handleResize() {
    this.updateGridLayout();
  }

  applyFilters() {
    let filtered = [...this.products];

    // Apply search filter
    if (this.searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(this.searchTerm) ||
        product.brand.toLowerCase().includes(this.searchTerm) ||
        product.category.toLowerCase().includes(this.searchTerm)
      );
    }

    // Apply active filters
    this.activeFilters.forEach((values, filterType) => {
      if (values.size === 0) return;

      filtered = filtered.filter(product => {
        switch (filterType) {
          case 'category':
            return values.has(product.category);
          case 'brand':
            return values.has(product.brand);
          case 'size':
            return product.sizes.some(size => values.has(size));
          case 'color':
            return product.colors.some(color => values.has(color));
          case 'priceRange':
            return values.has(this.getPriceRange(product.price));
          default:
            return true;
        }
      });
    });

    // Apply sorting
    filtered = this.sortProducts(filtered);

    this.filteredProducts = filtered;
    this.currentPage = 1;
    this.renderProducts();
  }

  sortProducts(products) {
    return products.sort((a, b) => {
      let aVal, bVal;

      switch (this.sortBy) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
        case 'rating':
          aVal = a.rating;
          bVal = b.rating;
          break;
        case 'newest':
          aVal = a.isNew ? 1 : 0;
          bVal = b.isNew ? 1 : 0;
          break;
        default:
          aVal = a.name;
          bVal = b.name;
      }

      if (this.sortOrder === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      } else {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
    });
  }

  // Drag and Drop Handlers
  handleDragStart(event) {
    const card = event.target.closest('.enhanced-product-card');
    if (!card) return;

    this.draggedElement = card;
    card.classList.add('product-card-dragging');
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', card.dataset.productId);

    // Show cart drop zone
    this.cartDropZone.classList.add('active');
  }

  handleDragEnd(event) {
    if (this.draggedElement) {
      this.draggedElement.classList.remove('product-card-dragging');
      this.draggedElement = null;
    }

    // Hide cart drop zone
    this.cartDropZone.classList.remove('active');
  }

  setupCartDropZone() {
    if (!this.cartDropZone) return;

    this.cartDropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      this.cartDropZone.classList.add('drag-over');
    });

    this.cartDropZone.addEventListener('dragleave', () => {
      this.cartDropZone.classList.remove('drag-over');
    });

    this.cartDropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      this.cartDropZone.classList.remove('drag-over');

      const productId = event.dataTransfer.getData('text/plain');
      this.addToCart(parseInt(productId));
      
      // Show success animation
      this.showAddToCartAnimation();
    });
  }

  showAddToCartAnimation() {
    this.cartDropZone.innerHTML = `
      <i class="fa fa-check cart-icon"></i>
      <div>Added to cart!</div>
    `;

    setTimeout(() => {
      this.cartDropZone.innerHTML = `
        <i class="fa fa-shopping-cart cart-icon"></i>
        <div>Drag products here to add to cart</div>
      `;
    }, 2000);
  }

  // Public API methods
  toggleFilter(filterType, value) {
    if (!this.activeFilters.has(filterType)) {
      this.activeFilters.set(filterType, new Set());
    }

    const filterSet = this.activeFilters.get(filterType);
    
    if (filterSet.has(value)) {
      filterSet.delete(value);
    } else {
      filterSet.add(value);
    }

    // Update UI
    const chip = this.filterContainer.querySelector(
      `[data-filter-type="${filterType}"][data-filter-value="${value}"]`
    );
    if (chip) {
      chip.classList.toggle('active', filterSet.has(value));
    }

    this.applyFilters();
  }

  clearAllFilters() {
    this.activeFilters.clear();
    this.searchTerm = '';
    
    // Update UI
    this.filterContainer.querySelectorAll('.filter-chip').forEach(chip => {
      chip.classList.remove('active');
    });
    
    this.controlsContainer.querySelector('.grid-search-input').value = '';
    
    this.applyFilters();
  }

  addToCart(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    // Integration with existing POS system
    if (window.pharmaApp && window.pharmaApp.getModule('pos')) {
      const posModule = window.pharmaApp.getModule('pos');
      posModule.addToCart({
        _id: productId,
        name: product.name,
        price: product.price,
        sku: `SKU-${productId}`,
        category: product.category
      });
    }

    // Show success notification
    this.showNotification(`${product.name} added to cart!`, 'success');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fa fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  // Utility methods
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

  getEmptyStateHTML() {
    return `
      <div class="text-center py-12">
        <i class="fa fa-search text-4xl text-gray-400 mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No products found</h3>
        <p class="text-gray-600">Try adjusting your search or filter criteria.</p>
        <button class="btn btn-primary mt-4" onclick="clearAllFilters()">
          Clear Filters
        </button>
      </div>
    `;
  }
}

// Global functions for HTML event handlers
window.toggleFavorite = function(productId) {
  console.log('Toggle favorite for product:', productId);
  // Implementation for favorites
};

window.showQuickView = function(productId) {
  console.log('Show quick view for product:', productId);
  // Implementation for quick view modal
};

window.addToCompare = function(productId) {
  console.log('Add to compare for product:', productId);
  // Implementation for product comparison
};

window.addToCartEnhanced = function(productId) {
  if (window.visualGrid) {
    window.visualGrid.addToCart(productId);
  }
};

window.selectVariantColor = function(productId, color) {
  console.log('Select color:', productId, color);
  // Implementation for color selection
};

window.selectVariantSize = function(productId, size) {
  console.log('Select size:', productId, size);
  // Implementation for size selection
};

window.toggleFilter = function(filterType, value) {
  if (window.visualGrid) {
    window.visualGrid.toggleFilter(filterType, value);
  }
};

window.clearAllFilters = function() {
  if (window.visualGrid) {
    window.visualGrid.clearAllFilters();
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedVisualGrid;
}