// Custom React Hook for Data Service Integration
// Provides easy access to data operations with loading states and error handling

import { useState, useEffect, useCallback } from 'react';
import dataService from '../services/dataService';

export const useDataService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: navigator.onLine,
    lastSync: null
  });

  // Handle async operations with loading and error states
  const executeAsync = useCallback(async (operation, operationName = 'operation') => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err?.message || `Failed to ${operationName}`;
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, []);

  // Authentication
  const login = useCallback(async (credentials) => {
    return await executeAsync(
      () => dataService.login(credentials),
      'login'
    );
  }, [executeAsync]);

  const logout = useCallback(async () => {
    return await executeAsync(
      () => dataService.logout(),
      'logout'
    );
  }, [executeAsync]);

  // Products
  const [products, setProducts] = useState([]);
  
  const loadProducts = useCallback(async () => {
    const result = await executeAsync(
      () => dataService.getProducts(),
      'load products'
    );
    setProducts(result);
    return result;
  }, [executeAsync]);

  const createProduct = useCallback(async (productData) => {
    const result = await executeAsync(
      () => dataService.createProduct(productData),
      'create product'
    );
    // Refresh products list
    await loadProducts();
    return result;
  }, [executeAsync, loadProducts]);

  const updateProduct = useCallback(async (productData) => {
    const result = await executeAsync(
      () => dataService.updateProduct(productData),
      'update product'
    );
    // Refresh products list
    await loadProducts();
    return result;
  }, [executeAsync, loadProducts]);

  const deleteProduct = useCallback(async (productId) => {
    await executeAsync(
      () => dataService.deleteProduct(productId),
      'delete product'
    );
    // Refresh products list
    await loadProducts();
  }, [executeAsync, loadProducts]);

  // Categories
  const [categories, setCategories] = useState([]);
  
  const loadCategories = useCallback(async () => {
    const result = await executeAsync(
      () => dataService.getCategories(),
      'load categories'
    );
    setCategories(result);
    return result;
  }, [executeAsync]);

  // Cart operations
  const [cartItems, setCartItems] = useState([]);
  
  const loadCart = useCallback(async () => {
    const result = await executeAsync(
      () => dataService.getCart(),
      'load cart'
    );
    setCartItems(result);
    return result;
  }, [executeAsync]);

  const saveCart = useCallback(async (items) => {
    const result = await executeAsync(
      () => dataService.saveCart(items),
      'save cart'
    );
    setCartItems(items);
    return result;
  }, [executeAsync]);

  const clearCart = useCallback(async () => {
    const result = await executeAsync(
      () => dataService.clearCart(),
      'clear cart'
    );
    setCartItems([]);
    return result;
  }, [executeAsync]);

  // Transactions
  const createTransaction = useCallback(async (transactionData) => {
    return await executeAsync(
      () => dataService.createTransaction(transactionData),
      'create transaction'
    );
  }, [executeAsync]);

  const getTransactions = useCallback(async (startDate, endDate, userId = 0, till = 0, status = 1) => {
    return await executeAsync(
      () => dataService.getTransactions(startDate, endDate, userId, till, status),
      'get transactions'
    );
  }, [executeAsync]);

  // Customers
  const [customers, setCustomers] = useState([]);
  
  const loadCustomers = useCallback(async () => {
    const result = await executeAsync(
      () => dataService.getCustomers(),
      'load customers'
    );
    setCustomers(result);
    return result;
  }, [executeAsync]);

  // Reports
  const getSalesReport = useCallback(async (startDate, endDate, userId = 0, till = 0, groupBy = 'day') => {
    return await executeAsync(
      () => dataService.getSalesReport(startDate, endDate, userId, till, groupBy),
      'get sales report'
    );
  }, [executeAsync]);

  // Settings
  const [settings, setSettings] = useState({});
  
  const loadSettings = useCallback(async () => {
    const result = await executeAsync(
      () => dataService.getSettings(),
      'load settings'
    );
    setSettings(result);
    return result;
  }, [executeAsync]);

  const updateSettings = useCallback(async (settingsData) => {
    const result = await executeAsync(
      () => dataService.updateSettings(settingsData),
      'update settings'
    );
    setSettings(prev => ({ ...prev, ...settingsData }));
    return result;
  }, [executeAsync]);

  // Sync operations
  const syncOfflineData = useCallback(async () => {
    return await executeAsync(
      () => dataService.syncOfflineData(),
      'sync offline data'
    );
  }, [executeAsync]);

  // Data export/import
  const exportData = useCallback(async () => {
    return await executeAsync(
      () => dataService.exportData(),
      'export data'
    );
  }, [executeAsync]);

  const importData = useCallback(async (data) => {
    return await executeAsync(
      () => dataService.importData(data),
      'import data'
    );
  }, [executeAsync]);

  // Database statistics
  const [stats, setStats] = useState({});
  
  const loadStats = useCallback(async () => {
    const result = await executeAsync(
      () => dataService.getStats(),
      'load stats'
    );
    setStats(result);
    return result;
  }, [executeAsync]);

  // Health check
  const [health, setHealth] = useState({});
  
  const checkHealth = useCallback(async () => {
    const result = await executeAsync(
      () => dataService.healthCheck(),
      'check health'
    );
    setHealth(result);
    return result;
  }, [executeAsync]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: true,
        lastSync: new Date().toISOString()
      }));
    };

    const handleOffline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initial data loading
  useEffect(() => {
    // Load initial data when component mounts
    loadProducts();
    loadCategories();
    loadCart();
    loadCustomers();
    loadSettings();
    loadStats();
    checkHealth();
  }, [loadProducts, loadCategories, loadCart, loadCustomers, loadSettings, loadStats, checkHealth]);

  return {
    // State
    loading,
    error,
    networkStatus,
    products,
    categories,
    cartItems,
    customers,
    settings,
    stats,
    health,

    // Data operations
    login,
    logout,
    loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    loadCategories,
    loadCart,
    saveCart,
    clearCart,
    createTransaction,
    getTransactions,
    loadCustomers,
    getSalesReport,
    loadSettings,
    updateSettings,
    syncOfflineData,
    exportData,
    importData,
    loadStats,
    checkHealth,

    // Utility
    setError,
    setLoading
  };
};
