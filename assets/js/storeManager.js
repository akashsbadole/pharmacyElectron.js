// Browser-compatible Store Manager
// Graceful degradation for Node.js dependencies

let useStore;
if (typeof require !== 'undefined') {
    try {
        useStore = require('./store');
    } catch (e) {
        console.warn('Node.js store not available, using browser fallback');
        useStore = window.useStore;
    }
} else {
    useStore = window.useStore;
}

/**
 * Store Manager - Bridges between vanilla store and existing POS functionality
 */
class StoreManager {
    constructor() {
        this.store = useStore;
        this.subscriptions = new Map();
        this.initializeSubscriptions();
    }

    /**
     * Initialize store subscriptions for automatic UI updates
     */
    initializeSubscriptions() {
        // Subscribe to cart changes to update UI
        this.subscribe('cart', (cart) => {
            this.updateCartUI(cart);
        });

        // Subscribe to products changes to update product list
        this.subscribe('allProducts', (products) => {
            this.updateProductsUI(products);
        });

        // Subscribe to alerts changes
        this.subscribe('alerts', (alerts) => {
            this.updateAlertsUI(alerts);
        });

        // Subscribe to loading state
        this.subscribe('loading', (loading) => {
            this.updateLoadingUI(loading);
        });
    }

    /**
     * Subscribe to store state changes
     */
    subscribe(selector, callback) {
        const unsubscribe = this.store.subscribe(
            (state) => state[selector],
            callback,
            { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
        );

        this.subscriptions.set(selector, unsubscribe);
        return unsubscribe;
    }

    /**
     * Update cart UI when cart state changes
     */
    updateCartUI(cart) {
        if (typeof $ === 'undefined') return;

        const { getCartTotal, getCartItemCount, getCartTotalWithTax } = this.store.getState();

        // Update totals
        const total = getCartTotal();
        const totalWithTax = getCartTotalWithTax();
        const itemCount = getCartItemCount();

        if ($("#total").length) $("#total").text(itemCount);
        if ($("#price").length) $("#price").text(`${this.getCurrencySymbol()}${this.formatMoney(total.toFixed(2))}`);
        if ($("#gross_price").length) $("#gross_price").text(`${this.getCurrencySymbol()}${this.formatMoney(totalWithTax.toFixed(2))}`);
        if ($("#payablePrice").length) $("#payablePrice").val(this.formatMoney(totalWithTax));
    }

    /**
     * Update products UI when products state changes
     */
    updateProductsUI(products) {
        // This can be implemented to update product displays
        console.log('Products updated:', products.length);
    }

    /**
     * Update alerts UI
     */
    updateAlertsUI(alerts) {
        if (typeof $ === 'undefined') return;

        if ($("#alerts-section").length) {
            $("#alerts-section").empty();
            alerts.forEach((alert) => {
                $("#alerts-section").append(`<div class="alert alert-${alert.type || 'danger'}">${alert.message}</div>`);
            });
        }
    }

    /**
     * Update loading UI
     */
    updateLoadingUI(loading) {
        if (typeof $ === 'undefined') return;

        if (loading) {
            $(".loading").show();
        } else {
            $(".loading").hide();
        }
    }

    // Cart management methods
    addProductToCart(productId) {
        const { allProducts, addToCart } = this.store.getState();
        const product = allProducts.find(p => p._id === productId);

        if (!product) return;

        if (this.isExpired(product.expirationDate)) {
            if (typeof notiflix !== 'undefined') {
                notiflix.Report.failure("Expired", `${product.name} is expired! Please restock.`, "Ok");
            }
            return;
        }

        if (product.quantity <= 0 && product.stock === 1) {
            if (typeof notiflix !== 'undefined') {
                notiflix.Report.failure("Out of stock!", `${product.name} is out of stock! Please restock.`, "Ok");
            }
            return;
        }

        const cartItem = {
            id: product._id,
            product_name: product.name,
            sku: product.barcode || product._id,
            price: parseFloat(product.price),
            quantity: 1
        };

        addToCart(cartItem);
    }

    // Utility methods
    getCurrencySymbol() {
        const { settings } = this.store.getState();
        return settings?.symbol || '$';
    }

    formatMoney(amount) {
        // Use existing moneyFormat function if available, otherwise basic formatting
        if (typeof moneyFormat !== 'undefined') {
            return moneyFormat(amount);
        }
        return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 });
    }

    isExpired(expirationDate) {
        if (!expirationDate) return false;
        const today = new Date();
        const expiry = new Date(expirationDate);
        return expiry <= today;
    }

    // Initialize store with existing data
    initializeWithExistingData() {
        const { setAuth, setUser, setAllProducts, setAllCategories, setSettings, setVat } = this.store.getState();

        // Get existing global variables if they exist
        if (typeof auth !== 'undefined') setAuth(auth);
        if (typeof user !== 'undefined') setUser(user);
        if (typeof allProducts !== 'undefined') setAllProducts(allProducts);
        if (typeof allCategories !== 'undefined') setAllCategories(allCategories);
        if (typeof settings !== 'undefined') {
            setSettings(settings);
            if (settings.percentage) {
                setVat(parseFloat(settings.percentage));
            }
        }
        if (typeof cart !== 'undefined') this.store.getState().setCart(cart);
    }

    destroy() {
        this.subscriptions.forEach(unsubscribe => unsubscribe());
        this.subscriptions.clear();
    }
}

// Create and export singleton instance
const storeManager = new StoreManager();

module.exports = storeManager;

// Make it globally available
if (typeof window !== 'undefined') {
    window.storeManager = storeManager;
}