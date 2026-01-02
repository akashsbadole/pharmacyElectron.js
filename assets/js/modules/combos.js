/**
 * Combo Meal Builder Module - Comprehensive combo management interface
 */

class CombosModule {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.selectedCombos = new Set();
    this.activeFilters = {};
    this.currentCombo = null;
    this.availableMenuItems = [];
    this.draggedComponent = null;
  }
  
  initialize() {
    console.log('Combos module initialized');
    this.setupEventListeners();
    this.initializeDragAndDrop();
  }
  
  setupEventListeners() {
    // Handle form submission
    $(document).on('submit', '#saveCombo', (e) => {
      if (this.app.state.getState().activeModule === 'combos') {
        e.preventDefault();
        this.handleComboSubmit(e.target);
      }
    });
    
    // Component type change handler
    $(document).on('change', '.component-type', () => {
      this.updateComponentOptions();
    });
    
    // Pricing type change handler
    $(document).on('change', '#pricingType', () => {
      this.updatePricingFields();
    });
    
    // Real-time price calculation
    $(document).on('input', '.combo-price-input', () => {
      this.calculatePricing();
    });
    
    // Drag and drop events
    $(document).on('dragstart', '.menu-item-draggable', (e) => {
      this.handleDragStart(e);
    });
    
    $(document).on('dragover', '.component-drop-zone', (e) => {
      e.preventDefault();
      $(e.target).addClass('drag-over');
    });
    
    $(document).on('dragleave', '.component-drop-zone', (e) => {
      $(e.target).removeClass('drag-over');
    });
    
    $(document).on('drop', '.component-drop-zone', (e) => {
      e.preventDefault();
      $(e.target).removeClass('drag-over');
      this.handleDrop(e);
    });
  }
  
  initializeDragAndDrop() {
    // Initialize sortable components
    if ($.fn.sortable) {
      $('.components-container').sortable({
        handle: '.component-handle',
        placeholder: 'component-placeholder',
        tolerance: 'pointer'
      });
    }
  }
  
  onActivate() {
    this.loadInitialData();
  }
  
  async loadInitialData() {
    await Promise.all([
      this.loadCombos(),
      this.loadMenuItems(),
      this.loadCategories()
    ]);
  }
  
  async loadCombos() {
    try {
      this.app.state.updateModule('combos', { loading: true });
      
      const response = await fetch(`${window.api}combos/combos`);
      const combos = await response.json();
      
      this.app.state.updateModule('combos', { 
        combos,
        loading: false
      });
      
    } catch (error) {
      console.error('Error loading combos:', error);
      this.app.state.updateModule('combos', { loading: false });
    }
  }
  
  async loadMenuItems() {
    try {
      const response = await fetch(`${window.api}inventory/products`);
      const menuItems = await response.json();
      
      this.availableMenuItems = menuItems;
      this.app.state.updateModule('combos', { menuItems });
      
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  }
  
  async loadCategories() {
    try {
      const response = await fetch(`${window.api}categories/all`);
      const categories = await response.json();
      
      this.app.state.updateModule('combos', { categories });
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }
  
  filterCombos(filters) {
    this.activeFilters = { ...this.activeFilters, ...filters };
    const combosState = this.app.state.getModuleState('combos');
    let filteredCombos = [...combosState.combos];
    
    // Apply category filter
    if (this.activeFilters.category) {
      filteredCombos = filteredCombos.filter(c => c.category === this.activeFilters.category);
    }
    
    // Apply search filter
    if (this.activeFilters.search) {
      const searchTerm = this.activeFilters.search.toLowerCase();
      filteredCombos = filteredCombos.filter(c => 
        c.combo_name.toLowerCase().includes(searchTerm) ||
        c.combo_code?.toLowerCase().includes(searchTerm) ||
        c.description?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply availability filter
    if (this.activeFilters.availability === 'active') {
      filteredCombos = filteredCombos.filter(c => c.is_active);
    } else if (this.activeFilters.availability === 'inactive') {
      filteredCombos = filteredCombos.filter(c => !c.is_active);
    }
    
    // Apply seasonal filter
    if (this.activeFilters.seasonal === 'seasonal') {
      filteredCombos = filteredCombos.filter(c => c.is_seasonal);
    } else if (this.activeFilters.seasonal === 'regular') {
      filteredCombos = filteredCombos.filter(c => !c.is_seasonal);
    }
    
    this.app.state.updateModule('combos', { filteredCombos });
  }
  
  selectCombo(combo) {
    this.app.state.updateModule('combos', { selectedCombo: combo });
  }
  
  toggleComboSelection(comboId) {
    const combosState = this.app.state.getModuleState('combos');
    const selected = new Set(combosState.selectedCombos || []);
    
    if (selected.has(comboId)) {
      selected.delete(comboId);
    } else {
      selected.add(comboId);
    }
    
    this.app.state.updateModule('combos', { selectedCombos: Array.from(selected) });
  }
  
  async createCombo(comboData) {
    try {
      const response = await fetch(`${window.api}combos/combos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(comboData)
      });
      
      const result = await response.json();
      
      // Refresh combos list
      await this.loadCombos();
      
      if (window.notiflix) {
        window.notiflix.Report.success('Success', 'Combo meal created successfully', 'Ok');
      }
      
      return result;
    } catch (error) {
      console.error('Error creating combo:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to create combo meal', 'Ok');
      }
      throw error;
    }
  }
  
  async updateCombo(comboData) {
    try {
      const response = await fetch(`${window.api}combos/combos/${comboData._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(comboData)
      });
      
      const result = await response.json();
      
      // Refresh combos list
      await this.loadCombos();
      
      if (window.notiflix) {
        window.notiflix.Report.success('Success', 'Combo meal updated successfully', 'Ok');
      }
      
      return result;
    } catch (error) {
      console.error('Error updating combo:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to update combo meal', 'Ok');
      }
      throw error;
    }
  }
  
  async deleteCombo(comboId) {
    try {
      await fetch(`${window.api}combos/combos/${comboId}`, {
        method: 'DELETE'
      });
      
      // Refresh combos list
      await this.loadCombos();
      
      if (window.notiflix) {
        window.notiflix.Report.success('Success', 'Combo meal deleted successfully', 'Ok');
      }
      
    } catch (error) {
      console.error('Error deleting combo:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to delete combo meal', 'Ok');
      }
      throw error;
    }
  }
  
  async checkComboAvailability(comboId, quantity = 1) {
    try {
      const response = await fetch(`${window.api}combos/combos/${comboId}/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }
  
  // Drag and Drop Handlers
  handleDragStart(e) {
    const menuItemId = $(e.target).data('menu-item-id');
    const menuItemName = $(e.target).data('menu-item-name');
    const menuItemPrice = $(e.target).data('menu-item-price');
    
    this.draggedComponent = {
      id: menuItemId,
      name: menuItemName,
      price: menuItemPrice
    };
    
    e.originalEvent.dataTransfer.effectAllowed = 'copy';
  }
  
  handleDrop(e) {
    const targetComponent = $(e.target).closest('.component-drop-zone');
    const componentIndex = targetComponent.data('component-index');
    
    if (this.draggedComponent && componentIndex !== undefined) {
      this.addMenuItemToComponent(componentIndex, this.draggedComponent);
      this.draggedComponent = null;
    }
  }
  
  addMenuItemToComponent(componentIndex, menuItem) {
    const combosState = this.app.state.getModuleState('combos');
    const currentCombo = combosState.currentCombo || { components: [] };
    
    if (!currentCombo.components[componentIndex]) {
      currentCombo.components[componentIndex] = {
        component_type: 'main',
        component_name: 'Component',
        menu_item_ids: [],
        quantity: 1,
        is_required: true,
        max_selections: 1
      };
    }
    
    const component = currentCombo.components[componentIndex];
    if (!component.menu_item_ids.includes(menuItem.id)) {
      component.menu_item_ids.push(menuItem.id);
      component.menu_item_ids = [...new Set(component.menu_item_ids)]; // Remove duplicates
      
      this.app.state.updateModule('combos', { currentCombo });
      this.calculatePricing();
      this.renderComponentMenuItems(componentIndex);
    }
  }
  
  removeMenuItemFromComponent(componentIndex, menuItemId) {
    const combosState = this.app.state.getModuleState('combos');
    const currentCombo = combosState.currentCombo;
    
    if (currentCombo && currentCombo.components[componentIndex]) {
      const component = currentCombo.components[componentIndex];
      component.menu_item_ids = component.menu_item_ids.filter(id => id !== menuItemId);
      
      this.app.state.updateModule('combos', { currentCombo });
      this.calculatePricing();
      this.renderComponentMenuItems(componentIndex);
    }
  }
  
  // Pricing Calculator
  calculatePricing() {
    const combosState = this.app.state.getModuleState('combos');
    const currentCombo = combosState.currentCombo;
    
    if (!currentCombo) return;
    
    let basePrice = 0;
    const componentDetails = [];
    
    currentCombo.components.forEach((component, index) => {
      if (component.menu_item_ids && component.menu_item_ids.length > 0) {
        let componentPrice = 0;
        const menuItems = component.menu_item_ids.map(id => 
          this.availableMenuItems.find(item => item._id === id)
        ).filter(Boolean);
        
        if (menuItems.length > 0) {
          // Use average price for component
          componentPrice = menuItems.reduce((sum, item) => sum + parseFloat(item.price || 0), 0) / menuItems.length;
          componentPrice *= component.quantity || 1;
        }
        
        basePrice += componentPrice;
        componentDetails.push({
          index,
          name: component.component_name,
          type: component.component_type,
          price: componentPrice,
          items: menuItems.length
        });
      }
    });
    
    let comboPrice = basePrice;
    let discountAmount = 0;
    let discountPercentage = 0;
    
    // Apply pricing strategy
    const pricingType = $('#pricingType').val() || 'fixed';
    
    if (pricingType === 'fixed') {
      comboPrice = parseFloat($('#comboPrice').val()) || basePrice;
    } else if (pricingType === 'discount_percentage') {
      const discount = parseFloat($('#discountPercentage').val()) || 0;
      discountAmount = basePrice * (discount / 100);
      comboPrice = basePrice - discountAmount;
      discountPercentage = discount;
    } else if (pricingType === 'custom') {
      comboPrice = parseFloat($('#comboPrice').val()) || basePrice;
      discountAmount = basePrice - comboPrice;
      discountPercentage = basePrice > 0 ? (discountAmount / basePrice) * 100 : 0;
    }
    
    // Update display
    $('#basePrice').text(`$${basePrice.toFixed(2)}`);
    $('#comboPriceDisplay').text(`$${comboPrice.toFixed(2)}`);
    $('#discountAmount').text(`$${discountAmount.toFixed(2)}`);
    $('#discountPercentageDisplay').text(`${discountPercentage.toFixed(1)}%`);
    
    // Update hidden fields
    $('#basePriceInput').val(basePrice);
    $('#comboPriceInput').val(comboPrice);
    $('#discountAmountInput').val(discountAmount);
    $('#discountPercentageInput').val(discountPercentage);
    
    // Update component details in pricing breakdown
    this.renderPricingBreakdown(componentDetails, basePrice, comboPrice);
  }
  
  renderPricingBreakdown(componentDetails, basePrice, comboPrice) {
    let html = '<div class="pricing-breakdown">';
    html += '<h5>Pricing Breakdown</h5>';
    
    componentDetails.forEach(detail => {
      html += `
        <div class="component-price-item">
          <span class="component-name">${detail.name} (${detail.type})</span>
          <span class="component-price">$${detail.price.toFixed(2)}</span>
          <span class="component-items">${detail.items} items</span>
        </div>
      `;
    });
    
    html += `
      <div class="pricing-totals">
        <div class="total-line">
          <span>Base Price:</span>
          <span>$${basePrice.toFixed(2)}</span>
        </div>
        <div class="total-line final">
          <span>Combo Price:</span>
          <span>$${comboPrice.toFixed(2)}</span>
        </div>
      </div>
    `;
    html += '</div>';
    
    $('#pricingBreakdown').html(html);
  }
  
  // Component Management
  addComponent() {
    const componentTypes = [
      { value: 'main', label: 'Main Course' },
      { value: 'side', label: 'Side Dish' },
      { value: 'drink', label: 'Beverage' },
      { value: 'dessert', label: 'Dessert' },
      { value: 'appetizer', label: 'Appetizer' }
    ];
    
    const newComponent = {
      component_type: 'main',
      component_name: 'New Component',
      menu_item_ids: [],
      quantity: 1,
      is_required: true,
      max_selections: 1
    };
    
    const combosState = this.app.state.getModuleState('combos');
    const currentCombo = combosState.currentCombo || { components: [] };
    currentCombo.components.push(newComponent);
    
    this.app.state.updateModule('combos', { currentCombo });
    this.renderComponentsList();
  }
  
  removeComponent(index) {
    const combosState = this.app.state.getModuleState('combos');
    const currentCombo = combosState.currentCombo;
    
    if (currentCombo && currentCombo.components[index]) {
      currentCombo.components.splice(index, 1);
      this.app.state.updateModule('combos', { currentCombo });
      this.renderComponentsList();
      this.calculatePricing();
    }
  }
  
  updateComponentField(index, field, value) {
    const combosState = this.app.state.getModuleState('combos');
    const currentCombo = combosState.currentCombo;
    
    if (currentCombo && currentCombo.components[index]) {
      currentCombo.components[index][field] = value;
      this.app.state.updateModule('combos', { currentCombo });
      
      if (field === 'component_type') {
        this.updateComponentOptions();
      }
    }
  }
  
  updateComponentOptions() {
    // Update available menu items based on component type
    const componentType = $('#componentType').val();
    // This would filter menu items based on category or type
    this.renderAvailableMenuItems();
  }
  
  renderAvailableMenuItems() {
    const combosState = this.app.state.getModuleState('combos');
    const menuItems = combosState.menuItems || [];
    const componentType = $('#componentType').val();
    
    // Filter menu items by component type (simplified)
    const filteredItems = menuItems.filter(item => {
      // In real implementation, this would check category/type matching
      return true;
    });
    
    let html = '<div class="available-menu-items">';
    html += '<h6>Available Menu Items</h6>';
    
    filteredItems.forEach(item => {
      html += `
        <div class="menu-item-draggable" draggable="true" 
             data-menu-item-id="${item._id}" 
             data-menu-item-name="${item.name}"
             data-menu-item-price="${item.price}">
          <div class="menu-item-info">
            <div class="menu-item-name">${item.name}</div>
            <div class="menu-item-price">$${parseFloat(item.price).toFixed(2)}</div>
            <div class="menu-item-category">${item.category || 'General'}</div>
          </div>
          <div class="drag-handle">⋮⋮</div>
        </div>
      `;
    });
    
    html += '</div>';
    $('#availableMenuItems').html(html);
  }
  
  renderComponentMenuItems(componentIndex) {
    const combosState = this.app.state.getModuleState('combos');
    const currentCombo = combosState.currentCombo;
    
    if (!currentCombo || !currentCombo.components[componentIndex]) return;
    
    const component = currentCombo.components[componentIndex];
    const menuItems = component.menu_item_ids.map(id => 
      this.availableMenuItems.find(item => item._id === id)
    ).filter(Boolean);
    
    let html = '<div class="component-menu-items">';
    html += '<h6>Selected Items:</h6>';
    
    menuItems.forEach(item => {
      html += `
        <div class="selected-menu-item">
          <span class="item-name">${item.name}</span>
          <span class="item-price">$${parseFloat(item.price).toFixed(2)}</span>
          <button class="btn btn-xs btn-danger" onclick="window.pharmaApp.getModule('combos').removeMenuItemFromComponent(${componentIndex}, ${item._id})">
            ×
          </button>
        </div>
      `;
    });
    
    html += '</div>';
    
    $(`.component-items-list[data-component-index="${componentIndex}"]`).html(html);
  }
  
  // UI Rendering
  render() {
    const combosState = this.app.state.getModuleState('combos');
    const combos = combosState.filteredCombos || combosState.combos || [];
    
    return `
      <div class="module-container combos-module" data-module="combos">
        <div class="module-header">
          <h1 class="module-title">Prescriptions</h1>
          <p class="module-subtitle">Manage prescription verification and processing</p>
        </div>
        
        ${this.renderFilters()}
        ${this.renderComboActions()}
        ${this.renderCombosList(combos)}
        ${this.renderComboBuilder()}
      </div>
    `;
  }
  
  renderFilters() {
    const combosState = this.app.state.getModuleState('combos');
    const categories = combosState.categories || [];
    
    return `
      <div class="filters-section mb-6">
        <div class="card">
          <div class="card-body">
            <div class="grid grid-cols-5 gap-4">
              <div class="form-group">
                <label class="form-label">Search Combos</label>
                <input type="text" class="form-input" placeholder="Search by name, code..." 
                       onkeyup="window.pharmaApp.getModule('combos').filterCombos({search: this.value})">
              </div>
              
              <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" onchange="window.pharmaApp.getModule('combos').filterCombos({category: this.value})">
                  <option value="">All Categories</option>
                  ${categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('')}
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Status</label>
                <select class="form-select" onchange="window.pharmaApp.getModule('combos').filterCombos({availability: this.value})">
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Type</label>
                <select class="form-select" onchange="window.pharmaApp.getModule('combos').filterCombos({seasonal: this.value})">
                  <option value="">All Types</option>
                  <option value="regular">Regular</option>
                  <option value="seasonal">Seasonal</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">&nbsp;</label>
                <button class="btn btn-secondary w-full" onclick="window.pharmaApp.getModule('combos').clearFilters()">
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderComboActions() {
    const combosState = this.app.state.getModuleState('combos');
    const selectedCount = combosState.selectedCombos?.length || 0;
    
    return `
      <div class="actions-section mb-6">
        <div class="flex justify-between items-center">
          <div class="flex gap-3">
            <button class="btn btn-success" onclick="window.pharmaApp.getModule('combos').showCreateComboModal()">
              <i class="fa fa-plus"></i> Create Combo
            </button>
            <button class="btn btn-info" onclick="window.pharmaApp.getModule('combos').showComboWizard()">
              <i class="fa fa-magic"></i> Combo Wizard
            </button>
            <button class="btn btn-warning" onclick="window.pharmaApp.getModule('combos').exportCombos()" ${selectedCount === 0 ? 'disabled' : ''}>
              <i class="fa fa-download"></i> Export Selected (${selectedCount})
            </button>
            <button class="btn btn-purple" onclick="window.pharmaApp.getModule('combos').showAnalytics()">
              <i class="fa fa-chart-bar"></i> Analytics
            </button>
          </div>
          
          <div class="text-sm text-gray-500">
            ${combosState.combos?.length || 0} prescriptions total
          </div>
        </div>
      </div>
    `;
  }
  
  renderCombosList(combos) {
    const combosState = this.app.state.getModuleState('combos');
    
    if (combosState.loading) {
      return `
        <div class="loading">
          <div class="spinner"></div>
          <div class="mt-2">Loading prescriptions...</div>
        </div>
      `;
    }
    
    if (!combos || combos.length === 0) {
      return `
        <div class="text-center py-8 text-gray-500">
          <i class="fa fa-prescription text-4xl mb-4"></i>
          <div>No prescriptions found</div>
          <button class="btn btn-success mt-4" onclick="window.pharmaApp.getModule('combos').showCreateComboModal()">
            Create Your First Combo
          </button>
        </div>
      `;
    }
    
    return `
      <div class="combos-list">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${combos.map(combo => this.renderComboCard(combo)).join('')}
        </div>
      </div>
    `;
  }
  
  renderComboCard(combo) {
    const combosState = this.app.state.getModuleState('combos');
    const isSelected = combosState.selectedCombos?.includes(combo._id) || false;
    const availabilityClass = combo.is_currently_available ? 'available' : 'unavailable';
    
    return `
      <div class="combo-card card ${isSelected ? 'selected' : ''} ${availabilityClass}" 
           data-combo-id="${combo._id}"
           onclick="window.pharmaApp.getModule('combos').selectCombo(${JSON.stringify(combo).replace(/"/g, '"')})">
        <div class="card-body">
          <div class="combo-header">
            <div class="combo-title">${combo.combo_name}</div>
            <div class="combo-code">${combo.combo_code}</div>
          </div>
          
          <div class="combo-image">
            ${combo.image_url ? 
              `<img src="${combo.image_url}" alt="${combo.combo_name}" style="width: 100%; height: 150px; object-fit: cover;">` :
              '<div class="no-image">No Image</div>'
            }
          </div>
          
          <div class="combo-description">
            ${combo.description || 'No description available'}
          </div>
          
          <div class="combo-components">
            <div class="components-count">
              <i class="fa fa-layer-group"></i> ${combo.components?.length || 0} components
            </div>
            <div class="component-types">
              ${this.renderComponentTypes(combo.components)}
            </div>
          </div>
          
          <div class="combo-pricing">
            <div class="price-info">
              <span class="combo-price">$${parseFloat(combo.combo_price).toFixed(2)}</span>
              ${combo.discount_amount > 0 ? 
                `<span class="original-price">$${parseFloat(combo.base_price).toFixed(2)}</span>` : 
                ''
              }
            </div>
            ${combo.discount_percentage > 0 ? 
              `<div class="discount-badge">${combo.discount_percentage.toFixed(0)}% OFF</div>` : 
              ''
            }
          </div>
          
          <div class="combo-stats">
            <div class="stat">
              <span class="stat-label">Sold:</span>
              <span class="stat-value">${combo.total_sold || 0}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Revenue:</span>
              <span class="stat-value">$${parseFloat(combo.revenue_generated || 0).toFixed(2)}</span>
            </div>
          </div>
          
          <div class="combo-status">
            <span class="status-badge ${combo.is_active ? 'active' : 'inactive'}">
              ${combo.is_active ? 'Active' : 'Inactive'}
            </span>
            ${combo.is_seasonal ? '<span class="seasonal-badge">Seasonal</span>' : ''}
            ${!combo.is_currently_available ? '<span class="unavailable-badge">Unavailable</span>' : ''}
          </div>
          
          <div class="combo-actions">
            <button class="btn btn-sm btn-info" onclick="event.stopPropagation(); window.pharmaApp.getModule('combos').viewCombo('${combo._id}')">
              <i class="fa fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); window.pharmaApp.getModule('combos').editCombo('${combo._id}')">
              <i class="fa fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-success" onclick="event.stopPropagation(); window.pharmaApp.getModule('combos').duplicateCombo('${combo._id}')">
              <i class="fa fa-copy"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); window.pharmaApp.getModule('combos').deleteCombo('${combo._id}')">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  renderComponentTypes(components) {
    if (!components || components.length === 0) return '';
    
    const typeCounts = {};
    components.forEach(comp => {
      typeCounts[comp.component_type] = (typeCounts[comp.component_type] || 0) + 1;
    });
    
    return Object.entries(typeCounts).map(([type, count]) => 
      `<span class="component-type-badge ${type}">${type} ${count > 1 ? `(${count})` : ''}</span>`
    ).join('');
  }
  
  renderComboBuilder() {
    const combosState = this.app.state.getModuleState('combos');
    const currentCombo = combosState.currentCombo;
    
    if (!currentCombo) return '';
    
    return `
      <div class="combo-builder mt-8">
        <div class="card">
          <div class="card-header">
            <h3>Prescription Management</h3>
            <p>Process and manage pharmacy prescriptions</p>
          </div>
          <div class="card-body">
            <div class="builder-layout">
              <div class="builder-left">
                ${this.renderAvailableMenuItems()}
              </div>
              <div class="builder-center">
                ${this.renderComponentsList()}
                ${this.renderComboPreview()}
              </div>
              <div class="builder-right">
                ${this.renderPricingPanel()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderComponentsList() {
    const combosState = this.app.state.getModuleState('combos');
    const currentCombo = combosState.currentCombo;
    
    if (!currentCombo || !currentCombo.components) return '';
    
    let html = '<div class="components-container">';
    html += '<h4>Combo Components</h4>';
    
    currentCombo.components.forEach((component, index) => {
      html += this.renderComponentEditor(component, index);
    });
    
    html += `
      <button class="btn btn-outline" onclick="window.pharmaApp.getModule('combos').addComponent()">
        <i class="fa fa-plus"></i> Add Component
      </button>
    `;
    
    html += '</div>';
    return html;
  }
  
  renderComponentEditor(component, index) {
    const componentTypes = [
      { value: 'main', label: 'Main Course' },
      { value: 'side', label: 'Side Dish' },
      { value: 'drink', label: 'Beverage' },
      { value: 'dessert', label: 'Dessert' },
      { value: 'appetizer', label: 'Appetizer' }
    ];
    
    return `
      <div class="component-editor" data-component-index="${index}">
        <div class="component-header">
          <span class="component-handle">⋮⋮</span>
          <input type="text" class="form-input component-name" 
                 value="${component.component_name}" 
                 onchange="window.pharmaApp.getModule('combos').updateComponentField(${index}, 'component_name', this.value)">
          <button class="btn btn-xs btn-danger" onclick="window.pharmaApp.getModule('combos').removeComponent(${index})">
            <i class="fa fa-times"></i>
          </button>
        </div>
        
        <div class="component-settings">
          <div class="form-group">
            <label>Type:</label>
            <select class="form-select component-type" 
                    onchange="window.pharmaApp.getModule('combos').updateComponentField(${index}, 'component_type', this.value)">
              ${componentTypes.map(type => 
                `<option value="${type.value}" ${component.component_type === type.value ? 'selected' : ''}>${type.label}</option>`
              ).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label>Quantity:</label>
            <input type="number" class="form-input component-quantity" 
                   value="${component.quantity || 1}" min="1"
                   onchange="window.pharmaApp.getModule('combos').updateComponentField(${index}, 'quantity', parseInt(this.value))">
          </div>
          
          <div class="form-group">
            <label>Required:</label>
            <input type="checkbox" class="component-required" ${component.is_required ? 'checked' : ''}
                   onchange="window.pharmaApp.getModule('combos').updateComponentField(${index}, 'is_required', this.checked)">
          </div>
          
          <div class="form-group">
            <label>Max Selections:</label>
            <input type="number" class="form-input component-max-selections" 
                   value="${component.max_selections || 1}" min="1"
                   onchange="window.pharmaApp.getModule('combos').updateComponentField(${index}, 'max_selections', parseInt(this.value))">
          </div>
        </div>
        
        <div class="component-drop-zone" data-component-index="${index}">
          <div class="drop-hint">
            <i class="fa fa-arrow-down"></i>
            Add prescription details here
          </div>
          <div class="component-items-list" data-component-index="${index}">
            ${this.renderComponentMenuItems(index)}
          </div>
        </div>
      </div>
    `;
  }
  
  renderComboPreview() {
    const combosState = this.app.state.getModuleState('combos');
    const currentCombo = combosState.currentCombo;
    
    if (!currentCombo) return '';
    
    return `
      <div class="combo-preview">
        <h4>Combo Preview</h4>
        <div class="preview-content">
          <div class="preview-image">
            ${currentCombo.image_url ? 
              `<img src="${currentCombo.image_url}" alt="Combo Preview">` :
              '<div class="no-preview">No Image</div>'
            }
          </div>
          <div class="preview-details">
            <h5>${currentCombo.combo_name || 'Unnamed Combo'}</h5>
            <p>${currentCombo.description || 'No description'}</p>
            <div class="preview-components">
              ${currentCombo.components?.map(comp => 
                `<div class="preview-component">
                  <span class="component-type">${comp.component_type}</span>
                  <span class="component-name">${comp.component_name}</span>
                  <span class="component-quantity">x${comp.quantity || 1}</span>
                </div>`
              ).join('') || '<p>No components added</p>'}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderPricingPanel() {
    return `
      <div class="pricing-panel">
        <h4>Pricing</h4>
        <div class="pricing-form">
          <div class="form-group">
            <label>Pricing Type:</label>
            <select class="form-select" id="pricingType" onchange="window.pharmaApp.getModule('combos').updatePricingFields()">
              <option value="fixed">Fixed Price</option>
              <option value="discount_percentage">Percentage Discount</option>
              <option value="custom">Custom Pricing</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Base Price:</label>
            <div class="price-display" id="basePrice">$0.00</div>
            <input type="hidden" id="basePriceInput">
          </div>
          
          <div class="form-group pricing-fields" id="pricingFields">
            <!-- Dynamic pricing fields will be inserted here -->
          </div>
          
          <div class="pricing-summary">
            <div class="summary-line">
              <span>Combo Price:</span>
              <span id="comboPriceDisplay">$0.00</span>
            </div>
            <div class="summary-line discount">
              <span>You Save:</span>
              <span id="discountAmount">$0.00</span>
            </div>
            <div class="summary-line discount">
              <span>Discount:</span>
              <span id="discountPercentageDisplay">0%</span>
            </div>
          </div>
        </div>
        
        <div id="pricingBreakdown">
          <!-- Pricing breakdown will be inserted here -->
        </div>
      </div>
    `;
  }
  
  updatePricingFields() {
    const pricingType = $('#pricingType').val();
    let html = '';
    
    if (pricingType === 'fixed' || pricingType === 'custom') {
      html = `
        <div class="form-group">
          <label>Combo Price:</label>
          <input type="number" class="form-input combo-price-input" id="comboPrice" step="0.01" min="0">
          <input type="hidden" id="comboPriceInput">
        </div>
      `;
    } else if (pricingType === 'discount_percentage') {
      html = `
        <div class="form-group">
          <label>Discount Percentage:</label>
          <input type="number" class="form-input combo-price-input" id="discountPercentage" step="0.1" min="0" max="100">
          <input type="hidden" id="discountAmountInput">
          <input type="hidden" id="discountPercentageInput">
        </div>
      `;
    }
    
    $('#pricingFields').html(html);
    this.calculatePricing();
  }
  
  // Modal and Wizard Methods
  showCreateComboModal() {
    // Reset form for new combo
    this.currentCombo = {
      combo_name: '',
      description: '',
      category: '',
      components: [],
      is_active: true,
      is_seasonal: false
    };
    
    this.app.state.updateModule('combos', { currentCombo: this.currentCombo });
    
    // Show modal
    $('#createComboModal').modal('show');
    this.renderComboBuilder();
  }
  
  showComboWizard() {
    // Implement step-by-step combo creation wizard
    $('#comboWizardModal').modal('show');
    this.initializeComboWizard();
  }
  
  initializeComboWizard() {
    // Wizard steps:
    // 1. Basic Info (name, description, category)
    // 2. Component Selection
    // 3. Pricing Strategy
    // 4. Availability Settings
    // 5. Review and Create
    
    let wizardStep = 1;
    this.showWizardStep(wizardStep);
  }
  
  showWizardStep(step) {
    const steps = {
      1: this.renderWizardStep1(),
      2: this.renderWizardStep2(),
      3: this.renderWizardStep3(),
      4: this.renderWizardStep4(),
      5: this.renderWizardStep5()
    };
    
    $('#wizardContent').html(steps[step]);
    this.updateWizardNavigation(step);
  }
  
  renderWizardStep1() {
    return `
      <div class="wizard-step">
        <h4>Basic Information</h4>
        <div class="form-group">
          <label>Combo Name:</label>
          <input type="text" class="form-input" id="wizardComboName" placeholder="Enter combo name">
        </div>
        <div class="form-group">
          <label>Notes:</label>
          <textarea class="form-input" id="wizardComboDescription" placeholder="Add prescription notes"></textarea>
        </div>
        <div class="form-group">
          <label>Category:</label>
          <select class="form-select" id="wizardComboCategory">
            <option value="">Select category</option>
            <option value="Lunch Combo">Lunch Combo</option>
            <option value="Dinner Combo">Dinner Combo</option>
            <option value="Family Combo">Family Combo</option>
            <option value="Kids Combo">Kids Combo</option>
            <option value="Value Combo">Value Combo</option>
          </select>
        </div>
      </div>
    `;
  }
  
  renderWizardStep2() {
    return `
      <div class="wizard-step">
        <h4>Prescription Details</h4>
        <p>Enter prescription information:</p>
        <div class="component-selector">
          <div class="component-option" onclick="window.pharmaApp.getModule('combos').addWizardComponent('main')">
            <i class="fa fa-utensils"></i>
            <span>Main Course</span>
          </div>
          <div class="component-option" onclick="window.pharmaApp.getModule('combos').addWizardComponent('side')">
            <i class="fa fa-circle"></i>
            <span>Side Dish</span>
          </div>
          <div class="component-option" onclick="window.pharmaApp.getModule('combos').addWizardComponent('drink')">
            <i class="fa fa-glass-water"></i>
            <span>Drink</span>
          </div>
          <div class="component-option" onclick="window.pharmaApp.getModule('combos').addWizardComponent('dessert')">
            <i class="fa fa-birthday-cake"></i>
            <span>Dessert</span>
          </div>
        </div>
        <div id="wizardComponents">
          <!-- Selected components will appear here -->
        </div>
      </div>
    `;
  }
  
  renderWizardStep3() {
    return `
      <div class="wizard-step">
        <h4>Pricing Strategy</h4>
        <div class="pricing-strategy-selector">
          <div class="strategy-option" onclick="window.pharmaApp.getModule('combos').selectPricingStrategy('fixed')">
            <h5>Fixed Price</h5>
            <p>Set a specific price for the combo</p>
          </div>
          <div class="strategy-option" onclick="window.pharmaApp.getModule('combos').selectPricingStrategy('discount_percentage')">
            <h5>Percentage Discount</h5>
            <p>Offer a discount off the total price</p>
          </div>
          <div class="strategy-option" onclick="window.pharmaApp.getModule('combos').selectPricingStrategy('custom')">
            <h5>Custom Pricing</h5>
            <p>Manually set combo price</p>
          </div>
        </div>
        <div id="wizardPricingFields">
          <!-- Dynamic pricing fields -->
        </div>
      </div>
    `;
  }
  
  renderWizardStep4() {
    return `
      <div class="wizard-step">
        <h4>Availability Settings</h4>
        <div class="form-group">
          <label>
            <input type="checkbox" id="wizardIsActive" checked> 
            Active (available for ordering)
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="wizardIsSeasonal"> 
            Seasonal item (limited time offer)
          </label>
        </div>
        <div class="form-group seasonal-fields" style="display: none;">
          <label>Available From:</label>
          <input type="date" class="form-input" id="wizardAvailabilityStart">
          <label>Available Until:</label>
          <input type="date" class="form-input" id="wizardAvailabilityEnd">
        </div>
      </div>
    `;
  }
  
  renderWizardStep5() {
    const combosState = this.app.state.getModuleState('combos');
    const currentCombo = combosState.currentCombo;
    
    return `
      <div class="wizard-step">
        <h4>Review and Create</h4>
        <div class="combo-review">
          <div class="review-section">
            <h5>Basic Information</h5>
            <p><strong>Name:</strong> ${currentCombo.combo_name}</p>
            <p><strong>Description:</strong> ${currentCombo.description}</p>
            <p><strong>Category:</strong> ${currentCombo.category}</p>
          </div>
          
          <div class="review-section">
            <h5>Components (${currentCombo.components?.length || 0})</h5>
            ${currentCombo.components?.map(comp => 
              `<p>${comp.component_type}: ${comp.component_name} (${comp.quantity}x)</p>`
            ).join('') || '<p>No components selected</p>'}
          </div>
          
          <div class="review-section">
            <h5>Pricing</h5>
            <p><strong>Base Price:</strong> $${currentCombo.base_price?.toFixed(2) || '0.00'}</p>
            <p><strong>Combo Price:</strong> $${currentCombo.combo_price?.toFixed(2) || '0.00'}</p>
            ${currentCombo.discount_amount > 0 ? 
              `<p><strong>Discount:</strong> $${currentCombo.discount_amount.toFixed(2)} (${currentCombo.discount_percentage.toFixed(1)}%)</p>` 
              : ''
            }
          </div>
          
          <div class="review-section">
            <h5>Availability</h5>
            <p><strong>Status:</strong> ${currentCombo.is_active ? 'Active' : 'Inactive'}</p>
            <p><strong>Type:</strong> ${currentCombo.is_seasonal ? 'Seasonal' : 'Regular'}</p>
          </div>
        </div>
      </div>
    `;
  }
  
  updateWizardNavigation(step) {
    const totalSteps = 5;
    let navigation = '';
    
    if (step > 1) {
      navigation += `<button class="btn btn-secondary" onclick="window.pharmaApp.getModule('combos').showWizardStep(${step - 1})">Previous</button>`;
    }
    
    if (step < totalSteps) {
      navigation += `<button class="btn btn-primary" onclick="window.pharmaApp.getModule('combos').showWizardStep(${step + 1})">Next</button>`;
    } else {
      navigation += `<button class="btn btn-success" onclick="window.pharmaApp.getModule('combos').createComboFromWizard()">Create Combo</button>`;
    }
    
    $('#wizardNavigation').html(navigation);
  }
  
  // Analytics and Performance
  async showAnalytics() {
    try {
      const response = await fetch(`${window.api}combos/combos/analytics/performance`);
      const analytics = await response.json();
      
      this.renderAnalyticsModal(analytics);
      $('#analyticsModal').modal('show');
      
    } catch (error) {
      console.error('Error loading analytics:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to load analytics data', 'Ok');
      }
    }
  }
  
  renderAnalyticsModal(analytics) {
    let html = `
      <div class="analytics-dashboard">
        <div class="analytics-grid">
          <div class="analytics-card">
            <h4>Total Combos</h4>
            <div class="analytics-number">${analytics.total_combos}</div>
            <div class="analytics-detail">${analytics.active_combos} active</div>
          </div>
          
          <div class="analytics-card">
            <h4>Total Revenue</h4>
            <div class="analytics-number">$${analytics.total_revenue.toFixed(2)}</div>
            <div class="analytics-detail">From all combos</div>
          </div>
          
          <div class="analytics-card">
            <h4>Average Popularity</h4>
            <div class="analytics-number">${analytics.average_popularity.toFixed(1)}</div>
            <div class="analytics-detail">Popularity score</div>
          </div>
        </div>
        
        <div class="top-performers mt-6">
          <h4>Top Performing Combos</h4>
          <div class="performance-list">
            ${analytics.top_performing.map((combo, index) => `
              <div class="performance-item">
                <div class="rank">#${index + 1}</div>
                <div class="combo-info">
                  <div class="combo-name">${combo.combo_name}</div>
                  <div class="combo-code">${combo.combo_code}</div>
                </div>
                <div class="performance-stats">
                  <div>Sold: ${combo.total_sold}</div>
                  <div>Revenue: $${combo.revenue_generated.toFixed(2)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="category-performance mt-6">
          <h4>Category Performance</h4>
          <div class="category-grid">
            ${Object.entries(analytics.category_performance).map(([category, stats]) => `
              <div class="category-card">
                <h5>${category}</h5>
                <div class="category-stats">
                  <div>Combos: ${stats.count}</div>
                  <div>Sold: ${stats.total_sold}</div>
                  <div>Revenue: $${stats.revenue.toFixed(2)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    $('#analyticsContent').html(html);
  }
  
  // Helper Methods
  clearFilters() {
    this.activeFilters = {};
    this.app.state.updateModule('combos', { filteredCombos: null });
  }
  
  async viewCombo(comboId) {
    try {
      const response = await fetch(`${window.api}combos/combos/${comboId}`);
      const combo = await response.json();
      
      this.renderComboDetailsModal(combo);
      $('#comboDetailsModal').modal('show');
      
    } catch (error) {
      console.error('Error loading combo details:', error);
    }
  }
  
  renderComboDetailsModal(combo) {
    let html = `
      <div class="combo-details">
        <div class="combo-header">
          <h3>${combo.combo_name}</h3>
          <p class="combo-code">Code: ${combo.combo_code}</p>
        </div>
        
        <div class="combo-info-grid">
          <div class="info-section">
            <h4>Basic Information</h4>
            <p><strong>Description:</strong> ${combo.description || 'No description'}</p>
            <p><strong>Category:</strong> ${combo.category}</p>
            <p><strong>Status:</strong> ${combo.is_active ? 'Active' : 'Inactive'}</p>
            <p><strong>Type:</strong> ${combo.is_seasonal ? 'Seasonal' : 'Regular'}</p>
          </div>
          
          <div class="info-section">
            <h4>Pricing</h4>
            <p><strong>Base Price:</strong> $${combo.base_price?.toFixed(2) || '0.00'}</p>
            <p><strong>Combo Price:</strong> $${combo.combo_price?.toFixed(2) || '0.00'}</p>
            <p><strong>Discount:</strong> ${combo.discount_percentage?.toFixed(1) || '0'}%</p>
          </div>
          
          <div class="info-section">
            <h4>Performance</h4>
            <p><strong>Total Sold:</strong> ${combo.total_sold || 0}</p>
            <p><strong>Revenue:</strong> $${combo.revenue_generated?.toFixed(2) || '0.00'}</p>
            <p><strong>Popularity Score:</strong> ${combo.popularity_score || 0}</p>
          </div>
        </div>
        
        <div class="components-details">
          <h4>Components (${combo.components?.length || 0})</h4>
          <div class="components-list">
            ${combo.components?.map(comp => `
              <div class="component-detail">
                <div class="component-header">
                  <span class="component-type">${comp.component_type}</span>
                  <span class="component-name">${comp.component_name}</span>
                  <span class="component-quantity">${comp.quantity}x</span>
                </div>
                <div class="component-options">
                  ${comp.menu_item_ids?.length || 0} prescription items
                </div>
              </div>
            `).join('') || '<p>No components defined</p>'}
          </div>
        </div>
      </div>
    `;
    
    $('#comboDetailsContent').html(html);
  }
  
  async editCombo(comboId) {
    try {
      const response = await fetch(`${window.api}combos/combos/${comboId}`);
      const combo = await response.json();
      
      this.currentCombo = combo;
      this.app.state.updateModule('combos', { currentCombo: this.currentCombo });
      
      this.populateComboForm(combo);
      $('#createComboModal .modal-title').text('Edit Combo Meal');
      $('#createComboModal').modal('show');
      
    } catch (error) {
      console.error('Error loading combo for editing:', error);
    }
  }
  
  populateComboForm(combo) {
    // Populate basic fields
    $('#comboName').val(combo.combo_name);
    $('#comboDescription').val(combo.description);
    $('#comboCategory').val(combo.category);
    $('#isActive').prop('checked', combo.is_active);
    $('#isSeasonal').prop('checked', combo.is_seasonal);
    
    // Set pricing fields
    $('#pricingType').val(combo.pricing_type || 'fixed');
    $('#basePrice').text(`$${combo.base_price?.toFixed(2) || '0.00'}`);
    $('#comboPrice').val(combo.combo_price);
    $('#discountPercentage').val(combo.discount_percentage);
    
    // Update pricing fields display
    this.updatePricingFields();
    
    // Render components
    this.renderComponentsList();
    this.calculatePricing();
  }
  
  async duplicateCombo(comboId) {
    try {
      const response = await fetch(`${window.api}combos/combos/${comboId}`);
      const combo = await response.json();
      
      // Create duplicate with modified name
      const duplicateData = {
        ...combo,
        _id: undefined, // Let server generate new ID
        combo_name: `${combo.combo_name} (Copy)`,
        combo_code: undefined, // Let server generate new code
        created_date: undefined,
        last_modified: undefined,
        total_sold: 0,
        revenue_generated: 0,
        popularity_score: 0
      };
      
      const result = await this.createCombo(duplicateData);
      
      if (window.notiflix) {
        window.notiflix.Report.success('Success', 'Combo duplicated successfully', 'Ok');
      }
      
    } catch (error) {
      console.error('Error duplicating combo:', error);
    }
  }
  
  exportCombos() {
    const combosState = this.app.state.getModuleState('combos');
    const selectedCombos = combosState.combos.filter(c => 
      combosState.selectedCombos?.includes(c._id)
    );
    
    if (selectedCombos.length === 0) {
      if (window.notiflix) {
        window.notiflix.Report.warning('Warning', 'Please select combos to export', 'Ok');
      }
      return;
    }
    
    // Create CSV content
    const csvContent = [
      ['Combo Name', 'Code', 'Category', 'Base Price', 'Combo Price', 'Discount %', 'Total Sold', 'Revenue'].join(','),
      ...selectedCombos.map(combo => [
        combo.combo_name,
        combo.combo_code,
        combo.category,
        combo.base_price?.toFixed(2) || '0.00',
        combo.combo_price?.toFixed(2) || '0.00',
        combo.discount_percentage?.toFixed(1) || '0',
        combo.total_sold || 0,
        combo.revenue_generated?.toFixed(2) || '0.00'
      ].join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `combos-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  
  async handleComboSubmit(form) {
    const formData = new FormData(form);
    const combosState = this.app.state.getModuleState('combos');
    const currentCombo = combosState.currentCombo;
    
    try {
      if (window.notiflix) window.notiflix.Block.standard('#createComboModal .modal-content', 'Saving Combo...');
      
      // Prepare combo data
      const comboData = {
        ...currentCombo,
        combo_name: $('#comboName').val(),
        description: $('#comboDescription').val(),
        category: $('#comboCategory').val(),
        is_active: $('#isActive').is(':checked'),
        is_seasonal: $('#isSeasonal').is(':checked'),
        pricing_type: $('#pricingType').val(),
        combo_price: parseFloat($('#comboPriceInput').val()) || 0,
        base_price: parseFloat($('#basePriceInput').val()) || 0,
        discount_amount: parseFloat($('#discountAmountInput').val()) || 0,
        discount_percentage: parseFloat($('#discountPercentageInput').val()) || 0
      };
      
      let response;
      if (currentCombo._id) {
        // Update existing combo
        comboData._id = currentCombo._id;
        response = await fetch(`${window.api}combos/combos/${currentCombo._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(comboData)
        });
      } else {
        // Create new combo
        response = await fetch(`${window.api}combos/combos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(comboData)
        });
      }
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to save combo');
      }
      
      const result = await response.json();
      
      if (window.notiflix) window.notiflix.Block.remove('#createComboModal .modal-content');
      
      $('#createComboModal').modal('hide');
      
      if (window.notiflix) {
        window.notiflix.Notify.success('Combo saved successfully!');
      }
      
      // Refresh list
      this.loadCombos();
      
    } catch (error) {
      console.error('Error saving combo:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('#createComboModal .modal-content');
        window.notiflix.Report.failure('Error', error.message, 'Ok');
      }
    }
  }
}

// Make CombosModule available globally
window.CombosModule = CombosModule;