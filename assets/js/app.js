/**
 * foodMine Main Application Controller
 * Modern tab-based interface with centralized state management
 */

// Browser-compatible EventEmitter implementation
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }

  off(event, listener) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
  }

  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

// Browser-compatible Store implementation using localStorage
// Check if Store class already exists to avoid redeclaration
if (typeof window.AppStore === 'undefined') {
  window.AppStore = class AppStore {
  constructor() {
    this.storage = window.localStorage;
  }

  get(key) {
    try {
      if (!this.storage) return null;
      const item = this.storage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  set(key, value) {
    try {
      if (!this.storage) return;
      this.storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }

  delete(key) {
    try {
      if (!this.storage) return;
      this.storage.removeItem(key);
    } catch (error) {
      console.error('Error deleting from localStorage:', error);
    }
  }

  clear() {
    try {
      if (!this.storage) return;
      this.storage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
  };
}

// Create alias for backward compatibility
const Store = window.AppStore;

// State management class
class AppState extends EventEmitter {
  constructor() {
    super();
    this.state = {
      // Navigation state
      navigation: {
        activeTab: 'dashboard',
        activeSubtab: null,
        sidebarCollapsed: false,
        breadcrumbs: [],
        history: []
      },

      // Global application state
      app: {
        user: {},
        settings: {},
        notifications: [],
        loading: false,
        error: null
      },

      // Module-specific states
      dashboard: {
        metrics: {
          todaySales: 0,
          transactions: 0,
          lowStock: 0,
          salesChange: 0,
          transactionChange: 0,
          stockChange: 0,
          // Removed prescriptionChange for restaurant conversion
          salesData: []
        },
        alerts: [],
        recentActivity: [],
        loading: false
      },

      recipes: {
        recipes: [],
        categories: [],
        menuItems: [],
        selectedRecipe: null,
        selectedRecipes: [],
        filters: {},
        loading: false
      },

      kitchen: {
        orders: [],
        filteredOrders: [],
        stations: {},
        metrics: {},
        currentStation: 'all',
        loading: false,
        lastUpdated: null,
        soundEnabled: true
      },

      tables: {
        tables: [],
        tableOrders: [],
        metrics: {},
        currentView: 'layout',
        layoutMode: false,
        selectedTable: null,
        selectedTableData: null,
        loading: false,
        lastUpdated: null,
        soundEnabled: true
      },

      combos: {
        combos: [],
        categories: [],
        menuItems: [],
        currentCombo: null,
        selectedCombos: [],
        filteredCombos: [],
        filters: {},
        analytics: {},
        loading: false
      },

      analytics: {
        currentView: 'dashboard',
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        data: {},
        loading: false,
        refreshInterval: null
      },

      // Removed prescriptions module for restaurant conversion

      pos: {
        currentSale: {},
        cart: [],
        products: [],
        customers: [],
        paymentStatus: 'idle',
        loading: false
      },

      inventory: {
        products: [],
        categories: [],
        alerts: [],
        filters: {},
        selectedProduct: null,
        loading: false,
        alertCount: 0
      },

      // Removed prescriptions module for restaurant conversion

      customers: {
        list: [],
        current: {},
        history: {},
        loading: false
      },

      suppliers: {
        list: [],
        purchaseOrders: [],
        activeOrder: {},
        loading: false
      },

      reports: {
        dateRange: {},
        filters: {},
        data: {},
        loading: false
      },

      settings: {
        general: {},
        network: {},
        backup: {},
        loading: false
      },

      waste: {
        wasteEntries: [],
        analytics: {},
        products: [],
        loading: false
      },

      shifts: {
        currentShift: null,
        shifts: [],
        selectedShift: null,
        loading: false
      }
    };

    // Initialize storage (localStorage)
    this.storage = (window.localStorage && typeof window.localStorage !== 'undefined') ? new Store() : null;
    this.loadPersistedState();
  }

  // Get current state
  getState() {
    return this.state;
  }

  // Update state and emit change event
  setState(newState, module = null) {
    if (module) {
      this.state[module] = { ...this.state[module], ...newState };
    } else {
      this.state = { ...this.state, ...newState };
    }

    this.emit('stateChanged', this.state, module);
    this.savePersistedState();
  }

  // Update specific module state
  updateModule(module, updates) {
    if (this.state[module]) {
      this.state[module] = { ...this.state[module], ...updates };
      this.emit('stateChanged', this.state, module);
      this.emit(`${module}Changed`, this.state[module]);
      this.savePersistedState();
    }
  }

  // Get specific module state
  getModuleState(module) {
    return this.state[module] || {};
  }

  // Subscribe to state changes
  subscribe(callback) {
    this.on('stateChanged', callback);
    return () => this.off('stateChanged', callback);
  }

  // Subscribe to specific module changes
  subscribeToModule(module, callback) {
    this.on(`${module}Changed`, callback);
    return () => this.off(`${module}Changed`, callback);
  }

  // Persist critical state
  savePersistedState() {
    if (!this.storage) return;

    const persistedState = {
      navigation: {
        sidebarCollapsed: this.state.navigation.sidebarCollapsed,
        activeTab: this.state.navigation.activeTab
      },
      app: {
        user: this.state.app.user,
        settings: this.state.app.settings
      }
    };

    try {
      this.storage.set('appState', persistedState);
    } catch (error) {
      console.warn('Failed to persist state:', error);
    }
  }

  // Load persisted state
  loadPersistedState() {
    if (!this.storage) return;

    try {
      const persisted = this.storage.get('appState');
      if (persisted) {
        this.state.navigation = { ...this.state.navigation, ...persisted.navigation };
        this.state.app = { ...this.state.app, ...persisted.app };
      }
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
    }
  }

  // Reset state
  reset() {
    this.state = {
      ...this.state,
      dashboard: {
        metrics: {
          todaySales: 0,
          transactions: 0,
          lowStock: 0,
          salesChange: 0,
          transactionChange: 0,
          stockChange: 0,
          salesData: []
        },
        alerts: [],
        recentActivity: [],
        loading: false
      },
      pos: {
        currentSale: {},
        cart: [],
        products: [],
        customers: [],
        paymentStatus: 'idle',
        loading: false
      }
    };
    this.emit('stateChanged', this.state);
  }
}

// View Manager for handling DOM switching between modules
class ViewManager {
  constructor() {
    console.log('=== INITIALIZING VIEWMANAGER ===');

    // Check for module containers in DOM (prescriptions removed for restaurant conversion)
    const moduleIds = ['dashboard', 'pos', 'inventory', 'recipes', 'kitchen', 'tables', 'combos', 'analytics', 'customers', 'suppliers', 'reports', 'settings', 'waste', 'shifts'];

    this.modules = new Map();
    moduleIds.forEach(id => {
      const element = document.getElementById(`module-${id}`);
      this.modules.set(id, element);
      if (element) {
        console.log(`✓ Found module container for ${id}:`, element);
      } else {
        console.error(`✗ Missing module container for ${id}: module-${id}`);
      }
    });

    this.moduleTitles = {
      'dashboard': 'Dashboard',
      'pos': 'Point of Sale',
      'inventory': 'Inventory Management',
      'recipes': 'Recipe Management',
      'kitchen': 'Kitchen Display System',
      'tables': 'Table Management',
      'combos': 'Combo Meal Builder',
      'analytics': 'Restaurant Analytics',
      'customers': 'Customer Management',
      'suppliers': 'Supplier Management',
      'reports': 'Reports & Analytics',
      'settings': 'Settings',
      'waste': 'Waste / Spoilage Tracking',
      'shifts': 'Shift Management'
    };

    this.currentModule = 'dashboard';
    console.log('ViewManager initialized with modules:', Array.from(this.modules.keys()));
    console.log('=== VIEWMANAGER INITIALIZATION COMPLETE ===');
  }

  // Switch to a specific module
  switchToModule(moduleId) {
    console.log(`=== SWITCHING TO MODULE: ${moduleId} ===`);

    // Check if module exists in modules Map
    if (!this.modules.has(moduleId)) {
      console.error(`✗ Module '${moduleId}' not found in modules Map`);
      console.log('Available modules:', Array.from(this.modules.keys()));

      // Try to find module container in DOM as fallback
      const container = document.getElementById(`module-${moduleId}`);
      if (!container) {
        console.error(`✗ Module container 'module-${moduleId}' not found in DOM`);
        return;
      }
      console.log(`✓ Found module container in DOM for ${moduleId}`);
    } else {
      console.log(`✓ Module '${moduleId}' found in modules Map`);
    }

    // Hide all modules
    console.log('Hiding all modules...');
    this.modules.forEach((container, id) => {
      if (container) {
        container.classList.add('hidden');
        container.classList.remove('active');
        console.log(`Hidden module: ${id}`);
      }
    });

    // Also hide DOM containers not in modules Map
    document.querySelectorAll('.module-view').forEach(container => {
      container.classList.add('hidden');
      container.classList.remove('active');
    });

    // Show target module
    const targetModule = this.modules.get(moduleId);
    if (targetModule) {
      targetModule.classList.remove('hidden');
      targetModule.classList.add('active');
      console.log(`✓ Switched to module via modules Map: ${moduleId}`);
    } else {
      // Fallback: Show DOM container
      const container = document.getElementById(`module-${moduleId}`);
      if (container) {
        container.classList.remove('hidden');
        container.classList.add('active');
        console.log(`✓ Switched to module via DOM container: ${moduleId}`);
      }
    }

    // Update navigation states
    this.updateNavigationState(moduleId);

    // Update content title
    this.updateContentTitle(moduleId);

    // Store current module
    this.currentModule = moduleId;

    console.log(`=== MODULE SWITCH COMPLETE: ${moduleId} ===`);
  }

  // Update navigation active states
  updateNavigationState(activeModuleId) {
    // Update sidebar navigation
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
      item.classList.remove('active');
    });

    const sidebarItem = document.querySelector(`.sidebar .nav-item[data-tab="${activeModuleId}"]`);
    if (sidebarItem) {
      sidebarItem.classList.add('active');
    }

    // Update bottom navigation
    document.querySelectorAll('.bottom-nav .bottom-nav-item').forEach(item => {
      item.classList.remove('active');
    });

    const bottomNavItem = document.querySelector(`.bottom-nav .bottom-nav-item[data-tab="${activeModuleId}"]`);
    if (bottomNavItem) {
      bottomNavItem.classList.add('active');
    }
  }

  // Update content title
  updateContentTitle(moduleId) {
    const contentTitle = document.getElementById('content-title');
    if (contentTitle) {
      contentTitle.textContent = this.moduleTitles[moduleId] || 'foodMine';
    }
  }

  // Get current active module
  getCurrentModule() {
    return this.currentModule;
  }

  // Initialize navigation event listeners
  initializeNavigationListeners() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const moduleId = item.getAttribute('data-tab');
        if (moduleId) {
          // Dispatch navigation action
          if (window.pharmaApp) {
            window.pharmaApp.dispatch({
              type: 'NAVIGATION_SET_ACTIVE_TAB',
              payload: { tabId: moduleId }
            });
          }
        }
      });
    });

    // Bottom navigation
    document.querySelectorAll('.bottom-nav .bottom-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const moduleId = item.getAttribute('data-tab');
        if (moduleId) {
          // Dispatch navigation action
          if (window.pharmaApp) {
            window.pharmaApp.dispatch({
              type: 'NAVIGATION_SET_ACTIVE_TAB',
              payload: { tabId: moduleId }
            });
          }
        }
      });
    });
  }
}

// Navigation actions
const navigationActions = {
  setActiveTab: (tabId) => (dispatch) => {
    dispatch({
      type: 'NAVIGATION_SET_ACTIVE_TAB',
      payload: { tabId }
    });
  },

  setActiveSubtab: (subtabId) => (dispatch) => {
    dispatch({
      type: 'NAVIGATION_SET_ACTIVE_SUBTAB',
      payload: { subtabId }
    });
  },

  toggleSidebar: () => (dispatch) => {
    dispatch({
      type: 'NAVIGATION_TOGGLE_SIDEBAR'
    });
  },

  setBreadcrumbs: (breadcrumbs) => (dispatch) => {
    dispatch({
      type: 'NAVIGATION_SET_BREADCRUMBS',
      payload: { breadcrumbs }
    });
  },

  navigateBack: () => (dispatch) => {
    dispatch({
      type: 'NAVIGATION_NAVIGATE_BACK'
    });
  }
};

// App actions
const appActions = {
  setUser: (user) => (dispatch) => {
    dispatch({
      type: 'APP_SET_USER',
      payload: { user }
    });
  },

  setSettings: (settings) => (dispatch) => {
    dispatch({
      type: 'APP_SET_SETTINGS',
      payload: { settings }
    });
  },

  addNotification: (notification) => (dispatch) => {
    dispatch({
      type: 'APP_ADD_NOTIFICATION',
      payload: { notification }
    });
  },

  removeNotification: (id) => (dispatch) => {
    dispatch({
      type: 'APP_REMOVE_NOTIFICATION',
      payload: { id }
    });
  },

  setLoading: (loading) => (dispatch) => {
    dispatch({
      type: 'APP_SET_LOADING',
      payload: { loading }
    });
  },

  setError: (error) => (dispatch) => {
    dispatch({
      type: 'APP_SET_ERROR',
      payload: { error }
    });
  },

  setNotifications: (notifications) => (dispatch) => {
    dispatch({
      type: 'APP_SET_NOTIFICATIONS',
      payload: { notifications }
    });
  }
};

// Dashboard actions
const dashboardActions = {
  loadDashboardData: () => async (dispatch) => {
    dispatch({ type: 'DASHBOARD_SET_LOADING', payload: { loading: true } });

    try {
      // Load dashboard metrics
      const [salesData, alertsData, activityData] = await Promise.all([
        fetchDashboardMetrics(),
        loadAlerts(),
        loadRecentActivity()
      ]);

      dispatch({
        type: 'DASHBOARD_SET_METRICS',
        payload: { metrics: salesData }
      });

      dispatch({
        type: 'DASHBOARD_SET_ALERTS',
        payload: { alerts: alertsData }
      });

      dispatch({
        type: 'DASHBOARD_SET_ACTIVITY',
        payload: { recentActivity: activityData }
      });

    } catch (error) {
      dispatch({
        type: 'APP_SET_ERROR',
        payload: { error: error.message }
      });
    } finally {
      dispatch({ type: 'DASHBOARD_SET_LOADING', payload: { loading: false } });
    }
  },

  executeQuickAction: (action) => (dispatch) => {
    dispatch({
      type: 'DASHBOARD_EXECUTE_ACTION',
      payload: { action }
    });
  }
};

// POS actions
const posActions = {
  loadProducts: () => async (dispatch) => {
    dispatch({ type: 'POS_SET_LOADING', payload: { loading: true } });

    try {
      const response = await fetch(window.api + 'inventory/products');
      const products = await response.json();

      dispatch({
        type: 'POS_SET_PRODUCTS',
        payload: { products }
      });
    } catch (error) {
      dispatch({
        type: 'APP_SET_ERROR',
        payload: { error: error.message }
      });
    } finally {
      dispatch({ type: 'POS_SET_LOADING', payload: { loading: false } });
    }
  },

  loadCustomers: () => async (dispatch) => {
    try {
      const response = await fetch(window.api + 'customers/all');
      const customers = await response.json();

      dispatch({
        type: 'POS_SET_CUSTOMERS',
        payload: { customers }
      });
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  },

  addToCart: (product) => (dispatch) => {
    dispatch({
      type: 'POS_ADD_TO_CART',
      payload: { product }
    });
  },

  removeFromCart: (index) => (dispatch) => {
    dispatch({
      type: 'POS_REMOVE_FROM_CART',
      payload: { index }
    });
  },

  updateCartQuantity: (index, quantity) => (dispatch) => {
    dispatch({
      type: 'POS_UPDATE_CART_QUANTITY',
      payload: { index, quantity }
    });
  },

  selectCustomer: (customer) => (dispatch) => {
    dispatch({
      type: 'POS_SELECT_CUSTOMER',
      payload: { customer }
    });
  },

  cancelSale: () => (dispatch) => {
    dispatch({
      type: 'POS_CANCEL_SALE'
    });
  },

  holdSale: () => (dispatch) => {
    dispatch({
      type: 'POS_HOLD_SALE'
    });
  },

  completeSale: (paymentData) => async (dispatch) => {
    dispatch({ type: 'POS_SET_LOADING', payload: { loading: true } });

    try {
      const response = await fetch(window.api + 'new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      dispatch({
        type: 'POS_COMPLETE_SALE',
        payload: { sale: result }
      });

      // Refresh related data
      dispatch(dashboardActions.loadDashboardData());

    } catch (error) {
      dispatch({
        type: 'APP_SET_ERROR',
        payload: { error: error.message }
      });
    } finally {
      dispatch({ type: 'POS_SET_LOADING', payload: { loading: false } });
    }
  }
};

// Kitchen actions
const kitchenActions = {
  loadOrders: () => async (dispatch) => {
    dispatch({ type: 'KITCHEN_SET_LOADING', payload: { loading: true } });

    try {
      const response = await fetch(window.api + 'kitchen/orders');
      const orders = await response.json();

      dispatch({
        type: 'KITCHEN_SET_ORDERS',
        payload: { orders }
      });

    } catch (error) {
      dispatch({
        type: 'APP_SET_ERROR',
        payload: { error: error.message }
      });
    } finally {
      dispatch({ type: 'KITCHEN_SET_LOADING', payload: { loading: false } });
    }
  },

  updateOrderStatus: (orderId, status, itemId = null) => async (dispatch) => {
    try {
      const response = await fetch(`${window.api}kitchen/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, item_id: itemId })
      });

      if (response.ok) {
        dispatch(kitchenActions.loadOrders()); // Refresh orders
      }

    } catch (error) {
      dispatch({
        type: 'APP_SET_ERROR',
        payload: { error: error.message }
      });
    }
  }
};

// Inventory actions
const inventoryActions = {
  loadProducts: () => async (dispatch) => {
    dispatch({ type: 'INVENTORY_SET_LOADING', payload: { loading: true } });

    try {
      const response = await fetch(window.api + 'inventory/products');
      const products = await response.json();

      dispatch({
        type: 'INVENTORY_SET_PRODUCTS',
        payload: { products }
      });

    } catch (error) {
      dispatch({
        type: 'APP_SET_ERROR',
        payload: { error: error.message }
      });
    } finally {
      dispatch({ type: 'INVENTORY_SET_LOADING', payload: { loading: false } });
    }
  },

  loadCategories: () => async (dispatch) => {
    try {
      const response = await fetch(window.api + 'categories/all');
      const categories = await response.json();

      dispatch({
        type: 'INVENTORY_SET_CATEGORIES',
        payload: { categories }
      });
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  },

  updateFilters: (filters) => (dispatch) => {
    dispatch({
      type: 'INVENTORY_UPDATE_FILTERS',
      payload: { filters }
    });
  },

  selectProduct: (product) => (dispatch) => {
    dispatch({
      type: 'INVENTORY_SELECT_PRODUCT',
      payload: { product }
    });
  },

  createProduct: (productData) => async (dispatch) => {
    try {
      const response = await fetch(window.api + 'inventory/product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      const result = await response.json();

      dispatch({
        type: 'INVENTORY_CREATE_PRODUCT',
        payload: { product: result }
      });

    } catch (error) {
      dispatch({
        type: 'APP_SET_ERROR',
        payload: { error: error.message }
      });
    }
  },

  updateProduct: (productData) => async (dispatch) => {
    try {
      const response = await fetch(window.api + 'inventory/product', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      const result = await response.json();

      dispatch({
        type: 'INVENTORY_UPDATE_PRODUCT',
        payload: { product: result }
      });

    } catch (error) {
      dispatch({
        type: 'APP_SET_ERROR',
        payload: { error: error.message }
      });
    }
  },

  deleteProduct: (productId) => async (dispatch) => {
    try {
      await fetch(window.api + 'inventory/product/' + productId, {
        method: 'DELETE'
      });

      dispatch({
        type: 'INVENTORY_DELETE_PRODUCT',
        payload: { productId }
      });

    } catch (error) {
      dispatch({
        type: 'APP_SET_ERROR',
        payload: { error: error.message }
      });
    }
  },

  bulkOperation: (operation, selectedIds) => (dispatch) => {
    dispatch({
      type: 'INVENTORY_BULK_OPERATION',
      payload: { operation, selectedIds }
    });
  },

  clearSelection: () => (dispatch) => {
    dispatch({
      type: 'INVENTORY_CLEAR_SELECTION'
    });
  }
};

// Helper functions for dashboard actions
async function fetchDashboardMetrics() {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Fetch today's sales data
    const salesResponse = await fetch(`${window.api}transactions/by-date?start=${today}T00:00:00Z&end=${today}T23:59:59Z`);
    const salesData = await salesResponse.json();

    // Calculate metrics
    const todaySales = salesData.reduce((sum, transaction) => sum + parseFloat(transaction.total || 0), 0);
    const transactions = salesData.length;

    // Fetch low stock items
    const inventoryResponse = await fetch(`${window.api}inventory/alerts`);
    const lowStockItems = await inventoryResponse.json();

    // Removed pending prescriptions fetch for restaurant conversion

    return {
      todaySales,
      transactions,
      lowStock: lowStockItems.length,
      // Removed pendingPrescriptions for restaurant conversion
      salesChange: 0, // TODO: Calculate change from previous day
      transactionChange: 0,
      stockChange: 0,
      // Removed prescriptionChange for restaurant conversion
      salesData: salesData.slice(0, 10) // Last 10 transactions
    };

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return {
      todaySales: 0,
      transactions: 0,
      lowStock: 0,
      // Removed pendingPrescriptions for restaurant conversion
      salesChange: 0,
      transactionChange: 0,
      stockChange: 0,
      // Removed prescriptionChange for restaurant conversion
      salesData: []
    };
  }
}

async function loadAlerts() {
  try {
    const response = await fetch(`${window.api}inventory/alerts`);
    return await response.json();
  } catch (error) {
    console.error('Error loading alerts:', error);
    return [];
  }
}

async function loadRecentActivity() {
  try {
    // This would typically fetch from an activity log API
    // For now, return mock data
    return [
      {
        type: 'sale_completed',
        message: 'Sale completed - $125.50',
        timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        icon: '💰'
      },
      {
        type: 'stock_updated',
        message: 'Stock updated - Ibuprofen 200mg',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        icon: '📦'
      },
      {
        type: 'customer_registered',
        message: 'New customer registered',
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        icon: '👥'
      },
      // Removed prescription verification activity for restaurant conversion
    ];
  } catch (error) {
    console.error('Error loading recent activity:', error);
    return [];
  }
}

// Main App Controller
class foodMineApp {
  constructor() {
    console.log('=== INITIALIZING foodMine APP ===');
    this.state = new AppState();
    this.modules = new Map();
    this.eventHandlers = new Map();

    console.log('Creating ViewManager...');
    this.viewManager = new ViewManager();

    console.log('Setting up event listeners...');
    this.setupEventListeners();

    console.log('Initializing modules...');
    this.initializeModuleInstances();

    console.log('=== foodMine APP CONSTRUCTION COMPLETE ===');
  }

  // Initialize the application
  async initialize() {
    try {
      // Wait for API configuration
      await this.waitForAPI();

      // Load modules
      await this.loadModules();

      // Load initial data
      await this.loadInitialData();

      // Set up global event handlers
      this.setupGlobalEventHandlers();

      console.log('foodMine app initialized successfully');

    } catch (error) {
      console.error('Failed to initialize foodMine app:', error);
      this.state.setState({ error: error.message }, 'app');
    }
  }

  // Wait for API to be configured
  waitForAPI() {
    return new Promise((resolve) => {
      if (window.api) {
        resolve();
      } else {
        const checkAPI = () => {
          if (window.api) {
            window.removeEventListener('api-configured', checkAPI);
            resolve();
          }
        };
        window.addEventListener('api-configured', checkAPI);
      }
    });
  }

  // Load initial application data
  async loadInitialData() {
    try {
      this.state.setState({ loading: true }, 'app');

      // Wait for API to be configured
      await this.waitForAPI();

      // Load user data if user exists
      const appState = this.state.getModuleState('app');
      if (appState.user && appState.user._id) {
        try {
          const userResponse = await fetch(window.api + 'users/user/' + appState.user._id);
          if (userResponse.ok) {
            const user = await userResponse.json();
            this.state.updateModule('app', { user });
          }
        } catch (error) {
          console.warn('Could not load user data:', error);
        }
      }

      // Load settings
      try {
        const settingsResponse = await fetch(window.api + 'settings/get');
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          this.state.updateModule('app', { settings: settings.settings || {} });
        }
      } catch (error) {
        console.warn('Could not load settings:', error);
        // Set default settings to prevent errors
        this.state.updateModule('app', { settings: { symbol: '$', percentage: '0', charge_tax: false } });
      }

      // Load dashboard data (this will handle its own errors)
      this.dispatch(dashboardActions.loadDashboardData());

    } catch (error) {
      console.error('Error loading initial data:', error);
      this.state.setState({ error: error.message }, 'app');
    } finally {
      this.state.setState({ loading: false }, 'app');
    }
  }

  // Set up global event handlers
  setupGlobalEventHandlers() {
    // Handle navigation changes
    this.state.subscribe((state, module) => {
      if (module === 'navigation' || module === null) {
        const activeTab = state.navigation.activeTab;

        // Update URL
        this.updateURL(activeTab);

        // Update ViewManager
        this.viewManager.switchToModule(activeTab);
      }
    });

    // Handle module loading states
    this.state.subscribe((state, module) => {
      if (module && state[module]?.loading) {
        this.showLoadingIndicator(module);
      } else {
        this.hideLoadingIndicator(module);
      }
    });

    // Handle errors
    this.state.subscribe((state, module) => {
      if (state.app.error) {
        this.showError(state.app.error);
      }
    });

    // Initialize ViewManager navigation listeners
    this.viewManager.initializeNavigationListeners();
  }

  // Update browser URL based on active tab
  updateURL(tabId) {
    if (window.history && window.history.pushState) {
      window.history.pushState(null, null, `#${tabId}`);
    }
  }

  // Update active navigation styling
  updateActiveNavigation(activeTab) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });

    // Add active class to current nav item
    const activeNavItem = document.querySelector(`[data-tab="${activeTab}"]`);
    if (activeNavItem) {
      activeNavItem.classList.add('active');
    }
  }

  // Show loading indicator for module
  showLoadingIndicator(module) {
    const moduleContainer = document.querySelector(`[data-module="${module}"]`);
    if (moduleContainer) {
      moduleContainer.classList.add('loading');
    }
  }

  // Hide loading indicator for module
  hideLoadingIndicator(module) {
    const moduleContainer = document.querySelector(`[data-module="${module}"]`);
    if (moduleContainer) {
      moduleContainer.classList.remove('loading');
    }
  }

  // Show error message
  showError(message) {
    // Use existing notification system or create new one
    if (window.notiflix) {
      window.notiflix.Report.failure('Error', message, 'Ok');
    }
    this.state.setState({ error: null }, 'app');
  }

  // Load modules (now loaded directly in HTML)
  async loadModules() {
    console.log('=== MODULE LOADING SKIPPED (loaded directly in HTML) ===');
    console.log('=== INITIALIZING MODULE INSTANCES ===');
    // Initialize module instances
    this.initializeModuleInstances();
    console.log('=== MODULE LOADING COMPLETE ===');
  }

  // Initialize all modules
  initializeModuleInstances() {
    console.log('=== INITIALIZING MODULE INSTANCES ===');
    console.log('Available classes:', {
      DashboardModule: !!window.DashboardModule,
      POSModule: !!window.POSModule,
      InventoryModule: !!window.InventoryModule,
      RecipesModule: !!window.RecipesModule,
      KitchenModule: !!window.KitchenModule,
      TablesModule: !!window.TablesModule,
      CombosModule: !!window.CombosModule,
      CustomersModule: !!window.CustomersModule,
      SuppliersModule: !!window.SuppliersModule,
      ReportsModule: !!window.ReportsModule,
      SettingsModule: !!window.SettingsModule,
      ShiftsModule: !!window.ShiftsModule
    });

    // Register core modules if classes are available
    const moduleClasses = [
      ['dashboard', window.DashboardModule],
      ['pos', window.POSModule],
      ['inventory', window.InventoryModule],
      ['recipes', window.RecipesModule],
      ['kitchen', window.KitchenModule],
      ['tables', window.TablesModule],
      ['combos', window.CombosModule],
      ['analytics', window.AnalyticsModule],
      // ['prescriptions', window.PrescriptionsModule], // Removed for restaurant conversion
      ['customers', window.CustomersModule],
      ['suppliers', window.SuppliersModule],
      ['reports', window.ReportsModule],
      ['settings', window.SettingsModule],
      ['waste', window.WasteModule],
      ['shifts', window.ShiftsModule]
    ];

    moduleClasses.forEach(([name, ModuleClass]) => {
      if (ModuleClass) {
        console.log(`Registering ${name} module...`);
        this.registerModule(name, new ModuleClass(this));
        console.log(`✓ ${name} module registered successfully`);
      } else {
        console.warn(`✗ ${name} module class not found`);
      }
    });

    console.log('Registered modules:', Array.from(this.modules.keys()));
  }

  // Register a module
  registerModule(name, module) {
    this.modules.set(name, module);
    if (module.initialize) {
      module.initialize();
    }
  }

  // Get module instance
  getModule(name) {
    return this.modules.get(name);
  }

  // Switch to a different module
  switchToModule(moduleName, subtab = null) {
    if (this.modules.has(moduleName)) {
      // Update state first
      this.dispatch(navigationActions.setActiveTab(moduleName));

      if (subtab) {
        this.dispatch(navigationActions.setActiveSubtab(subtab));
      }

      // Update UI via ViewManager
      this.viewManager.switchToModule(moduleName);

      // Initialize module if needed
      const module = this.getModule(moduleName);
      if (module && module.onActivate) {
        module.onActivate();
      }
    }
  }

  // Set up event listeners
  setupEventListeners() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      const hash = window.location.hash.substring(1);
      if (hash && this.modules.has(hash)) {
        this.switchToModule(hash);
      }
    });

    // Handle API configuration
    window.addEventListener('api-configured', () => {
      console.log('API configured, initializing app...');
      this.initialize();
    });
  }

  // Get app state
  getState() {
    return this.state.getState();
  }

  // Subscribe to state changes
  subscribe(callback) {
    return this.state.subscribe(callback);
  }

  // Subscribe to specific module changes
  subscribeToModule(module, callback) {
    return this.state.subscribeToModule(module, callback);
  }

  // Dispatch action
  dispatch(action) {
    // Simple action dispatcher for now
    switch (action.type) {
      case 'NAVIGATION_SET_ACTIVE_TAB':
        this.state.updateModule('navigation', {
          activeTab: action.payload.tabId,
          history: [...this.state.getModuleState('navigation').history, action.payload.tabId]
        });
        // Update UI immediately via ViewManager
        this.viewManager.switchToModule(action.payload.tabId);
        break;

      case 'NAVIGATION_SET_ACTIVE_SUBTAB':
        this.state.updateModule('navigation', {
          activeSubtab: action.payload.subtabId
        });
        break;

      case 'NAVIGATION_TOGGLE_SIDEBAR':
        this.state.updateModule('navigation', {
          sidebarCollapsed: !this.state.getModuleState('navigation').sidebarCollapsed
        });
        break;

      case 'APP_SET_USER':
        this.state.updateModule('app', {
          user: action.payload.user
        });
        break;

      case 'APP_SET_SETTINGS':
        this.state.updateModule('app', {
          settings: action.payload.settings
        });
        break;

      case 'APP_SET_NOTIFICATIONS':
        this.state.updateModule('app', {
          notifications: action.payload.notifications
        });
        break;

      case 'POS_ADD_TO_CART':
        const cart = [...this.state.getModuleState('pos').cart];
        const existingIndex = cart.findIndex(item => item.id === action.payload.product._id);

        if (existingIndex >= 0) {
          cart[existingIndex].quantity += 1;
        } else {
          cart.push({
            id: action.payload.product._id,
            product_name: action.payload.product.name,
            sku: action.payload.product.barcode,
            price: action.payload.product.price,
            quantity: 1
          });
        }

        this.state.updateModule('pos', { cart });
        break;

      case 'POS_REMOVE_FROM_CART':
        const newCart = this.state.getModuleState('pos').cart.filter((_, index) =>
          index !== action.payload.index
        );
        this.state.updateModule('pos', { cart: newCart });
        break;

      case 'POS_UPDATE_CART_QUANTITY':
        const updatedCart = [...this.state.getModuleState('pos').cart];
        if (updatedCart[action.payload.index]) {
          updatedCart[action.payload.index].quantity = action.payload.quantity;
          this.state.updateModule('pos', { cart: updatedCart });
        }
        break;

      case 'KITCHEN_SET_LOADING':
        this.state.updateModule('kitchen', {
          loading: action.payload.loading
        });
        break;

      case 'KITCHEN_SET_ORDERS':
        this.state.updateModule('kitchen', {
          orders: action.payload.orders,
          filteredOrders: action.payload.orders
        });
        break;

      default:
        console.warn('Unknown action type:', action.type);
    }
  }
}

// Make actions available globally
window.appActions = {
  navigation: navigationActions,
  app: appActions,
  dashboard: dashboardActions,
  pos: posActions,
  inventory: inventoryActions,
  kitchen: kitchenActions,
  combos: {
    loadCombos: () => async (dispatch) => {
      dispatch({ type: 'COMBOS_SET_LOADING', payload: { loading: true } });
      try {
        const response = await fetch(window.api + 'combos/combos');
        const combos = await response.json();
        dispatch({ type: 'COMBOS_SET_COMBOS', payload: { combos } });
      } catch (error) {
        dispatch({ type: 'APP_SET_ERROR', payload: { error: error.message } });
      } finally {
        dispatch({ type: 'COMBOS_SET_LOADING', payload: { loading: false } });
      }
    },
    loadMenuItems: () => async (dispatch) => {
      try {
        const response = await fetch(window.api + 'inventory/products');
        const menuItems = await response.json();
        dispatch({ type: 'COMBOS_SET_MENU_ITEMS', payload: { menuItems } });
      } catch (error) {
        console.error('Error loading menu items:', error);
      }
    }
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing foodMine app...');
    window.pharmaApp = new foodMineApp();
    
    // Initialize license management UI
    initializeLicenseManagement();
});

/**
 * Initialize license management UI functionality
 */
function initializeLicenseManagement() {
    // License status display elements
    const licenseStatus = document.getElementById('licenseStatus');
    const licenseStatusText = document.getElementById('licenseStatusText');
    const licenseEmailText = document.getElementById('licenseEmailText');
    const licenseKeyText = document.getElementById('licenseKeyText');
    const licenseExpiryText = document.getElementById('licenseExpiryText');
    
    // License action buttons
    const activateLicenseBtn = document.getElementById('activateLicenseBtn');
    const renewLicenseBtn = document.getElementById('renewLicenseBtn');
    const deactivateLicenseBtn = document.getElementById('deactivateLicenseBtn');
    
    // License input fields and buttons
    const licenseKeyInput = document.getElementById('licenseKeyInput');
    const licenseEmailInput = document.getElementById('licenseEmailInput');
    const manualActivateBtn = document.getElementById('manualActivateBtn');
    const checkLicenseBtn = document.getElementById('checkLicenseBtn');
    const clearLicenseBtn = document.getElementById('clearLicenseBtn');
    
    // Initialize license status display
    updateLicenseStatusDisplay();
    
    // Event listeners for license buttons
    if (manualActivateBtn) {
        manualActivateBtn.addEventListener('click', async () => {
            const licenseKey = licenseKeyInput.value.trim();
            const email = licenseEmailInput.value.trim();
            
            if (!licenseKey || !email) {
                alert('Please enter both license key and email address.');
                return;
            }
            
            manualActivateBtn.disabled = true;
            manualActivateBtn.textContent = 'Activating...';
            
            try {
                const result = await activateLicense(licenseKey, email);
                
                if (result.success) {
                    alert('License activated successfully!');
                    updateLicenseStatusDisplay();
                    licenseKeyInput.value = '';
                    licenseEmailInput.value = '';
                } else {
                    alert('License activation failed: ' + result.error);
                }
            } catch (error) {
                alert('Network error. Please try again.');
                console.error('License activation error:', error);
            } finally {
                manualActivateBtn.disabled = false;
                manualActivateBtn.textContent = 'Activate License';
            }
        });
    }
    
    if (checkLicenseBtn) {
        checkLicenseBtn.addEventListener('click', () => {
            updateLicenseStatusDisplay();
        });
    }
    
    if (clearLicenseBtn) {
        clearLicenseBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the license? This will require reactivation.')) {
                clearLicense();
                updateLicenseStatusDisplay();
            }
        });
    }
    
    // Listen for license status changes
    if (window.addEventListener) {
        window.addEventListener('license-status-changed', (event) => {
            updateLicenseStatusDisplay();
        });
    }
}

/**
 * Update license status display
 */
async function updateLicenseStatusDisplay() {
    const licenseStatus = document.getElementById('licenseStatus');
    const licenseStatusText = document.getElementById('licenseStatusText');
    const licenseEmailText = document.getElementById('licenseEmailText');
    const licenseKeyText = document.getElementById('licenseKeyText');
    const licenseExpiryText = document.getElementById('licenseExpiryText');
    
    const activateLicenseBtn = document.getElementById('activateLicenseBtn');
    const renewLicenseBtn = document.getElementById('renewLicenseBtn');
    const deactivateLicenseBtn = document.getElementById('deactivateLicenseBtn');
    
    try {
        // Try to get license status from main process
        if (window.electron && window.electron.ipcRenderer) {
            const licenseStatusData = await window.electron.ipcRenderer.invoke('get-license-status');
            
            if (licenseStatusData && licenseStatusData.isValid) {
                licenseStatus.className = 'alert alert-success';
                licenseStatus.style.display = 'block';
                licenseStatusText.textContent = licenseStatusData.isGracePeriod ? 'Active (Grace Period)' : 'Active';
                licenseEmailText.textContent = licenseStatusData.license ? licenseStatusData.license.email : '-';
                licenseKeyText.textContent = licenseStatusData.license ? 
                    licenseStatusData.license.license_key.substring(0, 10) + '...' : '-';
                licenseExpiryText.textContent = licenseStatusData.license && licenseStatusData.license.expiry_date ? 
                    new Date(licenseStatusData.license.expiry_date).toLocaleDateString() : '-';
                
                // Show appropriate buttons
                if (activateLicenseBtn) activateLicenseBtn.style.display = 'none';
                if (renewLicenseBtn) renewLicenseBtn.style.display = 'inline-block';
                if (deactivateLicenseBtn) deactivateLicenseBtn.style.display = 'inline-block';
            } else {
                licenseStatus.className = 'alert alert-warning';
                licenseStatus.style.display = 'block';
                licenseStatusText.textContent = 'No Valid License';
                licenseEmailText.textContent = '-';
                licenseKeyText.textContent = '-';
                licenseExpiryText.textContent = '-';
                
                // Show activate button
                if (activateLicenseBtn) activateLicenseBtn.style.display = 'inline-block';
                if (renewLicenseBtn) renewLicenseBtn.style.display = 'none';
                if (deactivateLicenseBtn) deactivateLicenseBtn.style.display = 'none';
            }
        } else {
            // Fallback for web environment
            licenseStatus.className = 'alert alert-info';
            licenseStatus.style.display = 'block';
            licenseStatusText.textContent = 'License checking not available in web environment';
            licenseEmailText.textContent = '-';
            licenseKeyText.textContent = '-';
            licenseExpiryText.textContent = '-';
        }
    } catch (error) {
        console.error('Error updating license status:', error);
        licenseStatus.className = 'alert alert-danger';
        licenseStatus.style.display = 'block';
        licenseStatusText.textContent = 'Error checking license status';
        licenseEmailText.textContent = '-';
        licenseKeyText.textContent = '-';
        licenseExpiryText.textContent = '-';
    }
}

/**
 * Activate a license
 */
async function activateLicense(licenseKey, email) {
    try {
        if (window.electron && window.electron.ipcRenderer) {
            return await window.electron.ipcRenderer.invoke('activate-license', licenseKey, email);
        } else {
            // Fallback for web environment
            return { success: false, error: 'License activation not available in web environment' };
        }
    } catch (error) {
        return { success: false, error: 'Network error. Please try again.' };
    }
}

/**
 * Clear license
 */
function clearLicense() {
    try {
        if (window.electron && window.electron.ipcRenderer) {
            window.electron.ipcRenderer.send('clear-license');
        }
    } catch (error) {
        console.error('Error clearing license:', error);
    }
}

// Export for use in other modules and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    foodMineApp,
    AppState,
    ViewManager,
    navigationActions,
    appActions,
    dashboardActions,
    posActions,
    inventoryActions,
    kitchenActions
  };
}
