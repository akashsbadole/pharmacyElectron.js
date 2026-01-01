// API Service Layer for Restaurant POS Web Application
// Integrates with existing PharmaMine backend server

import axios from 'axios';
import serverConfigService from './serverConfig';

class APIService {
  constructor() {
    this.api = null;
    this.isConfigured = false;
    
    // Set up server configuration listener
    this.setupServerConfigListener();
    
    // Set up request/response interceptors
    this.setupInterceptors();
  }

  // Set up server configuration listener
  setupServerConfigListener() {
    serverConfigService.addListener((config) => {
      if (config && config.ready && config.api) {
        this.configureAPI(config.api);
      }
    });
  }

  // Configure API with server URL
  configureAPI(apiBaseURL) {
    this.api = axios.create({
      baseURL: apiBaseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    this.isConfigured = true;
    console.log('API configured with base URL:', apiBaseURL);
  }

  // Set up request/response interceptors
  setupInterceptors() {
    // Request interceptor to add auth token
    if (this.api) {
      this.api.interceptors.request.use(
        (config) => {
          const token = this.getAuthToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        (error) => {
          return Promise.reject(error);
        }
      );

      // Response interceptor for error handling
      this.api.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response?.status === 401) {
            this.handleAuthError();
          }
          return Promise.reject(error);
        }
      );
    }
  }

  // Ensure API is configured before making requests
  async ensureConfigured() {
    if (!this.isConfigured) {
      throw new Error('API not configured. Please wait for server configuration.');
    }
    if (!this.api) {
      throw new Error('API instance not available.');
    }
  }

  // Authentication methods
  async login(credentials) {
    try {
      await this.ensureConfigured();
      const response = await this.api.post('login', credentials);
      if (response.data.token) {
        this.setAuthToken(response.data.token);
      }
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout() {
    try {
      await this.ensureConfigured();
      await this.api.post('logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthToken();
    }
  }

  // User management
  async getUsers() {
    try {
      await this.ensureConfigured();
      const response = await this.api.get('users/all');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUser(userId) {
    try {
      await this.ensureConfigured();
      const response = await this.api.get(`users/user/${userId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createUser(userData) {
    try {
      await this.ensureConfigured();
      const response = await this.api.post('users/new', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateUser(userData) {
    try {
      await this.ensureConfigured();
      const response = await this.api.put('users/new', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Product/Inventory management
  async getProducts() {
    try {
      await this.ensureConfigured();
      const response = await this.api.get('inventory/products');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getProduct(productId) {
    try {
      await this.ensureConfigured();
      const response = await this.api.get(`inventory/product/${productId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createProduct(productData) {
    try {
      await this.ensureConfigured();
      const response = await this.api.post('inventory/product', productData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateProduct(productData) {
    try {
      await this.ensureConfigured();
      const response = await this.api.put('inventory/product', productData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteProduct(productId) {
    try {
      await this.ensureConfigured();
      const response = await this.api.delete(`inventory/product/${productId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getInventoryAlerts() {
    try {
      await this.ensureConfigured();
      const response = await this.api.get('inventory/alerts');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Categories
  async getCategories() {
    try {
      await this.ensureConfigured();
      const response = await this.api.get('categories/all');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createCategory(categoryData) {
    try {
      await this.ensureConfigured();
      const response = await this.api.post('categories/new', categoryData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Transactions
  async getTransactions(startDate, endDate, userId = 0, till = 0, status = 1) {
    try {
      await this.ensureConfigured();
      const params = {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        user: userId,
        till: till,
        status: status
      };
      const response = await this.api.get('transactions/by-date', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTransaction(transactionId) {
    try {
      await this.ensureConfigured();
      const response = await this.api.get(`transactions/${transactionId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createTransaction(transactionData) {
    try {
      await this.ensureConfigured();
      const response = await this.api.post('transactions/new', transactionData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateTransaction(transactionData) {
    try {
      await this.ensureConfigured();
      const response = await this.api.put('transactions/new', transactionData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteTransaction(transactionId) {
    try {
      await this.ensureConfigured();
      const response = await this.api.post('transactions/delete', { orderId: transactionId });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getOnHoldTransactions() {
    try {
      await this.ensureConfigured();
      const response = await this.api.get('transactions/on-hold');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCustomerOrders() {
    try {
      await this.ensureConfigured();
      const response = await this.api.get('transactions/customer-orders');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Sales reports
  async getSalesReport(startDate, endDate, userId = 0, till = 0, groupBy = 'day') {
    try {
      await this.ensureConfigured();
      const params = {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        user: userId,
        till: till,
        groupBy: groupBy
      };
      const response = await this.api.get('transactions/reports/sales', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Inventory turnover report
  async getInventoryTurnoverReport(startDate, endDate) {
    try {
      await this.ensureConfigured();
      const params = {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      };
      const response = await this.api.get('transactions/reports/inventory-turnover', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Staff activity report
  async getStaffActivityReport(startDate, endDate) {
    try {
      await this.ensureConfigured();
      const params = {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      };
      const response = await this.api.get('transactions/reports/staff-activity', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Customers
  async getCustomers() {
    try {
      await this.ensureConfigured();
      const response = await this.api.get('customers/all');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCustomer(customerId) {
    try {
      await this.ensureConfigured();
      const response = await this.api.get(`customers/${customerId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createCustomer(customerData) {
    try {
      await this.ensureConfigured();
      const response = await this.api.post('customers/new', customerData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateCustomer(customerData) {
    try {
      await this.ensureConfigured();
      const response = await this.api.put('customers/new', customerData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteCustomer(customerId) {
    try {
      await this.ensureConfigured();
      const response = await this.api.delete(`customers/${customerId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Settings
  async getSettings() {
    try {
      await this.ensureConfigured();
      const response = await this.api.get('settings/get');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateSettings(settingsData) {
    try {
      await this.ensureConfigured();
      const response = await this.api.post('settings/update', settingsData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Backup and restore
  async createBackup() {
    try {
      await this.ensureConfigured();
      const response = await this.api.post('backup/create');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getBackupFiles() {
    try {
      await this.ensureConfigured();
      const response = await this.api.get('backup/files');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async restoreBackup(backupPath) {
    try {
      await this.ensureConfigured();
      const response = await this.api.post('backup/restore', { backupPath });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Kitchen Display System (if implemented)
  async getKitchenOrders() {
    try {
      await this.ensureConfigured();
      const response = await this.api.get('kitchen/orders');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateKitchenOrderStatus(orderId, status, itemId = null) {
    try {
      await this.ensureConfigured();
      const response = await this.api.put(`kitchen/orders/${orderId}/status`, {
        status,
        item_id: itemId
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Utility methods
  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  setAuthToken(token) {
    localStorage.setItem('authToken', token);
  }

  clearAuthToken() {
    localStorage.removeItem('authToken');
  }

  handleAuthError() {
    this.clearAuthToken();
    // Redirect to login or show login modal
    window.location.href = '/login';
  }

  handleError(error) {
    console.error('API Error:', error);
    
    if (error.response) {
      // Server responded with error status
      return {
        success: false,
        message: error.response.data.message || 'Server error occurred',
        status: error.response.status
      };
    } else if (error.request) {
      // Network error
      return {
        success: false,
        message: 'Network error - please check your internet connection',
        status: 0
      };
    } else {
      // Other error
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
        status: -1
      };
    }
  }

  // Health check
  async healthCheck() {
    try {
      await this.ensureConfigured();
      const response = await this.api.get('health');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }

  // Get current API status
  getStatus() {
    return {
      configured: this.isConfigured,
      ready: this.isConfigured && this.api !== null,
      baseURL: this.isConfigured ? this.api.defaults.baseURL : null
    };
  }
}

// Create singleton instance
const apiService = new APIService();

export default apiService;
