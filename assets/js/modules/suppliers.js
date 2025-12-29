/**
 * Suppliers Module - Supplier management
 */

class SuppliersModule {
  constructor(app) {
    this.app = app;
    this.container = null;
  }
  
  initialize() {
    console.log('Suppliers module initialized');
  }
  
  onActivate() {
    this.loadSuppliers();
  }
  
  async loadSuppliers() {
    try {
      const response = await fetch(`${window.api}suppliers/all`);
      const suppliers = await response.json();
      this.app.state.updateModule('suppliers', { list: suppliers });
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  }
  
  render() {
    return `
      <div class="module-container suppliers-module" data-module="suppliers">
        <div class="module-header">
          <h1 class="module-title">Supplier Management</h1>
          <p class="module-subtitle">Manage suppliers and purchase orders</p>
        </div>
        
        <div class="text-center py-8 text-gray-500">
          <i class="fa fa-building text-4xl mb-4"></i>
          <div>Supplier management feature coming soon...</div>
        </div>
      </div>
    `;
  }
}

// Make SuppliersModule available globally
window.SuppliersModule = SuppliersModule;