// Vanilla JavaScript implementation of state management
// This provides reactive state management without external dependencies

/**
 * Simple state store implementation
 */
function createStore(storeFunction) {
    let state = {};
    const listeners = new Set();
    const selectorListeners = new Map();

    const setState = (partial) => {
        const nextState = typeof partial === 'function' ? partial(state) : partial;
        const previousState = state;
        state = Object.assign({}, state, nextState);

        // Notify all listeners
        listeners.forEach(listener => listener(state, previousState));

        // Notify selector listeners
        selectorListeners.forEach((callbacks, selector) => {
            const newValue = selector(state);
            const oldValue = selector(previousState);

            if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
                callbacks.forEach(callback => callback(newValue, oldValue));
            }
        });
    };

    const getState = () => state;

    const subscribe = (selectorOrListener, callback) => {
        if (typeof selectorOrListener === 'function' && callback) {
            // Selector-based subscription
            const selector = selectorOrListener;

            if (!selectorListeners.has(selector)) {
                selectorListeners.set(selector, new Set());
            }

            selectorListeners.get(selector).add(callback);

            // Return unsubscribe function
            return () => {
                const callbacks = selectorListeners.get(selector);
                if (callbacks) {
                    callbacks.delete(callback);
                    if (callbacks.size === 0) {
                        selectorListeners.delete(selector);
                    }
                }
            };
        } else {
            // General subscription
            const listener = selectorOrListener;
            listeners.add(listener);

            // Return unsubscribe function
            return () => listeners.delete(listener);
        }
    };

    const destroy = () => {
        listeners.clear();
        selectorListeners.clear();
    };

    // Initialize state
    const api = { setState, getState, subscribe, destroy };
    state = storeFunction(setState, getState, api);

    return api;
}

/**
 * Main application store for POS system
 */
const useStore = createStore((set, get) => ({
    // Authentication & User State
    auth: null,
    user: {},
    allUsers: [],

    // Product & Inventory State
    allProducts: [],
    allCategories: [],
    categories: [],

    // Cart & Transaction State
    cart: [],
    holdOrderList: [],
    customerOrderList: [],
    allTransactions: [],

    // Settings & Configuration
    settings: null,
    vat: 0,
    perms: null,

    // UI State
    loading: false,
    alerts: [],

    // API Configuration
    api: null,
    host: 'localhost',
    port: null,

    // Actions for Authentication
    setAuth: (auth) => set({ auth }),
    setUser: (user) => set({ user }),
    setAllUsers: (users) => set({ allUsers: users }),

    // Actions for Products & Inventory
    setAllProducts: (products) => set({ allProducts: products }),
    setAllCategories: (categories) => set({ allCategories: categories }),
    setCategories: (categories) => set({ categories }),

    addProduct: (product) => set((state) => ({
        allProducts: [...state.allProducts, product]
    })),

    updateProduct: (productId, updatedProduct) => set((state) => ({
        allProducts: state.allProducts.map(product =>
            product._id === productId ? { ...product, ...updatedProduct } : product
        )
    })),

    removeProduct: (productId) => set((state) => ({
        allProducts: state.allProducts.filter(product => product._id !== productId)
    })),

    // Actions for Cart Management
    setCart: (cart) => set({ cart }),

    addToCart: (item) => set((state) => {
        const existingItemIndex = state.cart.findIndex(cartItem => cartItem.id === item.id);

        if (existingItemIndex >= 0) {
            // Update quantity if item exists
            const updatedCart = [...state.cart];
            updatedCart[existingItemIndex].quantity += item.quantity || 1;
            return { cart: updatedCart };
        } else {
            // Add new item to cart
            return { cart: [...state.cart, { ...item, quantity: item.quantity || 1 }] };
        }
    }),

    removeFromCart: (index) => set((state) => ({
        cart: state.cart.filter((_, i) => i !== index)
    })),

    updateCartItemQuantity: (index, quantity) => set((state) => {
        const updatedCart = [...state.cart];
        if (updatedCart[index]) {
            updatedCart[index].quantity = quantity;
        }
        return { cart: updatedCart };
    }),

    clearCart: () => set({ cart: [] }),

    // Actions for Hold Orders
    setHoldOrderList: (orders) => set({ holdOrderList: orders }),
    addHoldOrder: (order) => set((state) => ({
        holdOrderList: [...state.holdOrderList, order]
    })),

    // Actions for Customer Orders
    setCustomerOrderList: (orders) => set({ customerOrderList: orders }),

    // Actions for Transactions
    setAllTransactions: (transactions) => set({ allTransactions: transactions }),
    addTransaction: (transaction) => set((state) => ({
        allTransactions: [...state.allTransactions, transaction]
    })),

    // Actions for Settings & Configuration
    setSettings: (settings) => set({ settings }),
    setVat: (vat) => set({ vat }),
    setPerms: (perms) => set({ perms }),

    // Actions for API Configuration
    setApiConfig: (api, host, port) => set({ api, host, port }),

    // Actions for UI State
    setLoading: (loading) => set({ loading }),
    setAlerts: (alerts) => set({ alerts }),
    addAlert: (alert) => set((state) => ({
        alerts: [...state.alerts, alert]
    })),
    removeAlert: (alertId) => set((state) => ({
        alerts: state.alerts.filter(alert => alert.id !== alertId)
    })),

    // Computed values (getters)
    getCartTotal: () => {
        const { cart } = get();
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    getCartItemCount: () => {
        const { cart } = get();
        return cart.reduce((count, item) => count + item.quantity, 0);
    },

    getCartTotalWithTax: () => {
        const { cart, settings, vat } = get();
        const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

        if (settings && settings.charge_tax) {
            const taxAmount = (subtotal * vat) / 100;
            return subtotal + taxAmount;
        }

        return subtotal;
    },

    getLowStockProducts: () => {
        const { allProducts } = get();
        return allProducts.filter(product =>
            parseInt(product.quantity) <= parseInt(product.minStock)
        );
    },

    getExpiredProducts: () => {
        const { allProducts } = get();
        const today = new Date();
        return allProducts.filter(product => {
            if (!product.expirationDate) return false;
            const expiryDate = new Date(product.expirationDate);
            return expiryDate <= today;
        });
    },

    // Utility actions
    resetStore: () => set({
        auth: null,
        user: {},
        allUsers: [],
        allProducts: [],
        allCategories: [],
        categories: [],
        cart: [],
        holdOrderList: [],
        customerOrderList: [],
        allTransactions: [],
        settings: null,
        vat: 0,
        perms: null,
        loading: false,
        alerts: [],
        api: null,
        host: 'localhost',
        port: null
    })
}));

// Export the store
module.exports = useStore;

// Make it globally available for browser usage
if (typeof window !== 'undefined') {
    window.useStore = useStore;
}