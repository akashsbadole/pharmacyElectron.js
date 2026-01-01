// Offline Data Storage using IndexedDB
import { openDB } from 'idb';

class OfflineStorage {
  constructor() {
    this.initDB();
  }

  async initDB() {
    this.db = await openDB('restaurant-pos-offline', 1, {
      upgrade(db) {
        // Products store
        if (!db.objectStoreNames.contains('products')) {
          const productsStore = db.createObjectStore('products', { keyPath: 'id' });
          productsStore.createIndex('category', 'category_id');
          productsStore.createIndex('available', 'available');
        }

        // Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const transactionsStore = db.createObjectStore('transactions', { keyPath: 'id' });
          transactionsStore.createIndex('date', 'date');
          transactionsStore.createIndex('status', 'status');
        }

        // Cart store for offline cart persistence
        if (!db.objectStoreNames.contains('cart')) {
          db.createObjectStore('cart', { keyPath: 'id' });
        }

        // Offline queue for pending sync
        if (!db.objectStoreNames.contains('offline-queue')) {
          db.createObjectStore('offline-queue', { keyPath: 'id', autoIncrement: true });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      }
    });
  }

  // Products operations
  async saveProduct(product) {
    return await this.db.put('products', product);
  }

  async getProducts() {
    return await this.db.getAll('products');
  }

  async getProduct(id) {
    return await this.db.get('products', id);
  }

  async deleteProduct(id) {
    return await this.db.delete('products', id);
  }

  // Transactions operations
  async saveTransaction(transaction) {
    return await this.db.put('transactions', transaction);
  }

  async getTransactions() {
    return await this.db.getAll('transactions');
  }

  async getTransaction(id) {
    return await this.db.get('transactions', id);
  }

  // Cart operations
  async saveCart(cartItems) {
    // Clear existing cart
    await this.db.clear('cart');
    
    // Save new cart items
    for (const item of cartItems) {
      await this.db.put('cart', item);
    }
  }

  async getCart() {
    return await this.db.getAll('cart');
  }

  async clearCart() {
    return await this.db.clear('cart');
  }

  // Offline queue operations
  async addToOfflineQueue(type, data) {
    const queueItem = {
      type,
      data,
      timestamp: new Date().toISOString(),
      synced: false
    };
    
    return await this.db.add('offline-queue', queueItem);
  }

  async getOfflineQueue() {
    return await this.db.getAll('offline-queue');
  }

  async removeOfflineQueueItem(id) {
    return await this.db.delete('offline-queue', id);
  }

  async clearOfflineQueue() {
    return await this.db.clear('offline-queue');
  }

  // Settings operations
  async saveSetting(key, value) {
    return await this.db.put('settings', { key, value });
  }

  async getSetting(key) {
    const result = await this.db.get('settings', key);
    return result ? result.value : null;
  }

  async deleteSetting(key) {
    return await this.db.delete('settings', key);
  }

  // Sync operations
  async syncOfflineData() {
    if (!navigator.onLine) {
      console.log('Device is offline, skipping sync');
      return;
    }

    try {
      const offlineItems = await this.getOfflineQueue();
      
      for (const item of offlineItems) {
        try {
          let response;
          
          if (item.type === 'transaction') {
            response = await fetch('/api/transactions/new', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.data)
            });
          } else if (item.type === 'product') {
            response = await fetch('/api/inventory/product', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.data)
            });
          }

          if (response && response.ok) {
            await this.removeOfflineQueueItem(item.id);
            console.log(`Synced ${item.type}:`, item.data);
          } else {
            console.error(`Failed to sync ${item.type}:`, response);
          }
        } catch (error) {
          console.error(`Error syncing ${item.type}:`, error);
        }
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  // Background sync setup
  setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((sw) => {
        sw.sync.register('sync-offline-data');
      });
    }
  }

  // Export data for backup
  async exportData() {
    const products = await this.getProducts();
    const transactions = await this.getTransactions();
    const cart = await this.getCart();
    const settings = await this.getAllSettings();

    return {
      products,
      transactions,
      cart,
      settings,
      exportDate: new Date().toISOString()
    };
  }

  // Import data for restore
  async importData(data) {
    // Clear existing data
    await this.db.clear('products');
    await this.db.clear('transactions');
    await this.db.clear('cart');
    await this.db.clear('settings');

    // Import new data
    for (const product of data.products || []) {
      await this.saveProduct(product);
    }

    for (const transaction of data.transactions || []) {
      await this.saveTransaction(transaction);
    }

    for (const item of data.cart || []) {
      await this.db.put('cart', item);
    }

    for (const [key, value] of Object.entries(data.settings || {})) {
      await this.saveSetting(key, value);
    }
  }

  async getAllSettings() {
    const settings = await this.db.getAll('settings');
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    return settingsObj;
  }

  // Database statistics
  async getStats() {
    const products = await this.getProducts();
    const transactions = await this.getTransactions();
    const cart = await this.getCart();
    const queue = await this.getOfflineQueue();
    const settings = await this.getAllSettings();

    return {
      productsCount: products.length,
      transactionsCount: transactions.length,
      cartItemsCount: cart.length,
      offlineQueueCount: queue.length,
      settingsCount: Object.keys(settings).length
    };
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorage();

// Auto-sync when coming online
window.addEventListener('online', () => {
  console.log('Device is online, syncing offline data...');
  offlineStorage.syncOfflineData();
});

// Setup background sync
offlineStorage.setupBackgroundSync();

export default offlineStorage;
