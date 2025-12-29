/**
 * Customers Module - Customer management
 */

class CustomersModule {
  constructor(app) {
    this.app = app;
    this.container = null;
  }
  
  initialize() {
    console.log('Customers module initialized');
  }
  
  onActivate() {
    this.loadCustomers();
  }
  
  async loadCustomers() {
    try {
      const response = await fetch(`${window.api}customers/all`);
      const customers = await response.json();
      this.app.state.updateModule('customers', { list: customers });
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }
  
  render() {
    const customersState = this.app.state.getModuleState('customers');
    
    return `
      <div class="module-container customers-module" data-module="customers">
        <div class="module-header">
          <h1 class="module-title">Customer Management</h1>
          <p class="module-subtitle">Manage customer information and history</p>
        </div>
        
        <div class="text-center py-8 text-gray-500">
          <i class="fa fa-users text-4xl mb-4"></i>
          <div>Customer management feature coming soon...</div>
        </div>
      </div>
    `;
  }
}

// Make CustomersModule available globally
window.CustomersModule = CustomersModule;