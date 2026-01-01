// Data Service - Abstraction layer for API and Offline Storage
// Provides unified interface for data operations with offline support

import apiService from './api';
import offlineStorage from './offlineStorage';

class DataService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.setupNetworkListeners();
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Network: Online');
      // Trigger sync when coming online
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Network: Offline');
    });
  }

  // Authentication
  async login(credentials) {
    try {
      const result = await apiService.login(credentials);
      return result;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Products with offline support
  async getProducts() {
    try {
      if (this.isOnline) {
        const products = await apiService.getProducts();
        // Cache products locally
        for (const product of products) {
          await offlineStorage.saveProduct(product);
        }
        return products;
      } else {
        // Return cached products
        return await offlineStorage.getProducts();
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      // Fallback to cached data
      return await offlineStorage.getProducts();
    }
  }

  async getProduct(productId) {
    try {
      if (this.isOnline) {
        const product = await apiService.getProduct(productId);
        await offlineStorage.saveProduct(product);
        return product;
      } else {
        return await offlineStorage.getProduct(productId);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      return await offlineStorage.getProduct(productId);
    }
  }

  async createProduct(productData) {
    try {
      if (this.isOnline) {
        const result = await apiService.createProduct(productData);
        await offlineStorage.saveProduct(result);
        return result;
      } else {
        // Save to offline queue for later sync
        await offlineStorage.addToOfflineQueue('product', productData);
        // Also save to local storage for immediate access
        await offlineStorage.saveProduct(productData);
        return { ...productData, id: Date.now().toString() };
      }
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async updateProduct(productData) {
    try {
      if (this.isOnline) {
        const result = await apiService.updateProduct(productData);
        await offlineStorage.saveProduct(result);
        return result;
      } else {
        // Save to offline queue for later sync
        await offlineStorage.addToOfflineQueue('product', productData);
        // Update local storage immediately
        await offlineStorage.saveProduct(productData);
        return productData;
      }
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(productId) {
    try {
      if (this.isOnline) {
        await apiService.deleteProduct(productId);
        await offlineStorage.deleteProduct(productId);
      } else {
        // Mark for deletion in offline queue
        await offlineStorage.addToOfflineQueue('product_delete', { id: productId });
        await offlineStorage.deleteProduct(productId);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Transactions with offline support
  async getTransactions(startDate, endDate, userId = 0, till = 0, status = 1) {
    try {
      if (this.isOnline) {
        const transactions = await apiService.getTransactions(startDate, endDate, userId, till, status);
        // Cache transactions locally
        for (const transaction of transactions) {
          await offlineStorage.saveTransaction(transaction);
        }
        return transactions;
      } else {
        // Return cached transactions
        return await offlineStorage.getTransactions();
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return await offlineStorage.getTransactions();
    }
  }

  async createTransaction(transactionData) {
    try {
      if (this.isOnline) {
        const result = await apiService.createTransaction(transactionData);
        await offlineStorage.saveTransaction(result);
        return result;
      } else {
        // Save to offline queue for later sync
        await offlineStorage.addToOfflineQueue('transaction', transactionData);
        // Save locally for immediate access
        const localTransaction = {
          ...transactionData,
          id: Date.now().toString(),
          status: 'pending'
        };
        await offlineStorage.saveTransaction(localTransaction);
        return localTransaction;
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  // Cart operations with offline persistence
  async saveCart(cartItems) {
    try {
      await offlineStorage.saveCart(cartItems);
      return true;
    } catch (error) {
      console.error('Error saving cart:', error);
      return false;
    }
  }

  async getCart() {
    try {
      return await offlineStorage.getCart();
    } catch (error) {
      console.error('Error loading cart:', error);
      return [];
    }
  }

  async clearCart() {
    try {
      await offlineStorage.clearCart();
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  }

  // Categories
  async getCategories() {
    try {
      if (this.isOnline) {
        const categories = await apiService.getCategories();
        // Cache categories locally if needed
        return categories;
      } else {
        // Return default categories or cached ones
        return [
          { id: '1', name: 'Pizzas', description: 'Pizza items' },
          { id: '2', name: 'Salads', description: 'Salad items' },
          { id: '3', name: 'Main Courses', description: 'Main dishes' },
          { id: '4', name: 'Desserts', description: 'Sweet treats' },
          { id: '5', name: 'Beverages', description: 'Drinks' }
        ];
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  // Customers
  async getCustomers() {
    try {
      if (this.isOnline) {
        const customers = await apiService.getCustomers();
        return customers;
      } else {
        // Return cached customers if available
        return [];
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  }

  // Reports
  async getSalesReport(startDate, endDate, userId = 0, till = 0, groupBy = 'day') {
    try {
      if (this.isOnline) {
        return await apiService.getSalesReport(startDate, endDate, userId, till, groupBy);
      } else {
        // Return cached report data or mock data
        return {
          totalRevenue: 0,
          totalProfit: 0,
          trends: []
        };
      }
    } catch (error) {
      console.error('Error fetching sales report:', error);
      return {
        totalRevenue: 0,
        totalProfit: 0,
        trends: []
      };
    }
  }

  // Settings
  async getSettings() {
    try {
      if (this.isOnline) {
        const settings = await apiService.getSettings();
        // Cache settings locally
        for (const [key, value] of Object.entries(settings)) {
          await offlineStorage.saveSetting(key, value);
        }
        return settings;
      } else {
        // Return cached settings
        return await offlineStorage.getAllSettings();
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      return await offlineStorage.getAllSettings();
    }
  }

  async updateSettings(settingsData) {
    try {
      if (this.isOnline) {
        const result = await apiService.updateSettings(settingsData);
        // Update local cache
        for (const [key, value] of Object.entries(settingsData)) {
          await offlineStorage.saveSetting(key, value);
        }
        return result;
      } else {
        // Save to local cache immediately
        for (const [key, value] of Object.entries(settingsData)) {
          await offlineStorage.saveSetting(key, value);
        }
        return settingsData;
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // Sync operations
  async syncOfflineData() {
    try {
      if (!this.isOnline) {
        console.log('Cannot sync: Device is offline');
        return false;
      }

      console.log('Starting offline data sync...');
      await offlineStorage.syncOfflineData();
      console.log('Sync completed successfully');
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    }
  }

  // Data export/import
  async exportData() {
    try {
      return await offlineStorage.exportData();
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  async importData(data) {
    try {
      await offlineStorage.importData(data);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  // Database statistics
  async getStats() {
    try {
      return await offlineStorage.getStats();
    } catch (error) {
      console.error('Error getting stats:', error);
      return {};
    }
  }

  // Health check
  async healthCheck() {
    try {
      const apiHealth = await apiService.healthCheck();
      const networkStatus = {
        isOnline: this.isOnline,
        lastSync: new Date().toISOString()
      };
      
      return {
        api: apiHealth,
        network: networkStatus,
        offlineStorage: await this.getStats()
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        api: { success: false, error },
        network: { isOnline: this.isOnline },
        offlineStorage: {}
      };
    }
  }
}

// Create singleton instance
const dataService = new DataService();

export default dataService;
