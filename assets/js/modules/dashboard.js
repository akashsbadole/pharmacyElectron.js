/**
 * Dashboard Module - Overview and metrics display
 */

class DashboardModule {
  constructor(app) {
    this.app = app;
    this.container = null;
  }
  
  initialize() {
    console.log('Dashboard module initialized');
  }
  
  onActivate() {
    this.loadDashboardData();
  }
  
  async loadDashboardData() {
    try {
      // Load dashboard metrics
      const metrics = await this.fetchDashboardMetrics();
      const alerts = await this.loadAlerts();
      const activity = await this.loadRecentActivity();
      
      this.app.state.updateModule('dashboard', {
        metrics,
        alerts,
        recentActivity: activity,
        loading: false
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.app.state.setState({ error: error.message }, 'app');
    }
  }
  
  async fetchDashboardMetrics() {
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
      
      // Fetch pending prescriptions
      const prescriptionsResponse = await fetch(`${window.api}prescriptions/pending`);
      const pendingPrescriptions = await prescriptionsResponse.json();
      
      return {
        todaySales,
        transactions,
        lowStock: lowStockItems.length,
        pendingPrescriptions: pendingPrescriptions.length,
        salesChange: 0, // TODO: Calculate change from previous day
        transactionChange: 0,
        stockChange: 0,
        prescriptionChange: 0,
        salesData: salesData.slice(0, 10) // Last 10 transactions
      };
      
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return {
        todaySales: 0,
        transactions: 0,
        lowStock: 0,
        pendingPrescriptions: 0,
        salesChange: 0,
        transactionChange: 0,
        stockChange: 0,
        prescriptionChange: 0,
        salesData: []
      };
    }
  }
  
  async loadAlerts() {
    try {
      const response = await fetch(`${window.api}inventory/alerts`);
      return await response.json();
    } catch (error) {
      console.error('Error loading alerts:', error);
      return [];
    }
  }
  
  async loadRecentActivity() {
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
        {
          type: 'prescription_verified',
          message: 'Prescription verified - John Doe',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          icon: '📋'
        }
      ];
    } catch (error) {
      console.error('Error loading recent activity:', error);
      return [];
    }
  }
  
  executeQuickAction(action) {
    switch (action) {
      case 'new_sale':
        this.app.switchToModule('pos');
        break;
      case 'verify_prescription':
        this.app.switchToModule('prescriptions');
        break;
      case 'add_product':
        this.app.switchToModule('inventory');
        break;
      case 'add_customer':
        this.app.switchToModule('customers');
        break;
      default:
        console.warn('Unknown quick action:', action);
    }
  }
  
  render() {
    const dashboardState = this.app.state.getModuleState('dashboard');
    
    return `
      <div class="module-container dashboard-module" data-module="dashboard">
        <div class="module-header">
          <h1 class="module-title">Dashboard</h1>
          <p class="module-subtitle">Welcome back! Here's what's happening today.</p>
        </div>
        
        ${this.renderAlerts(dashboardState.alerts)}
        ${this.renderQuickActions()}
        ${this.renderMetrics(dashboardState.metrics)}
        ${this.renderRecentActivity(dashboardState.recentActivity)}
      </div>
    `;
  }
  
  renderAlerts(alerts) {
    if (!alerts || alerts.length === 0) {
      return '';
    }
    
    return `
      <div class="alerts-section mb-6">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">⚠️ Alerts</h3>
          </div>
          <div class="card-body">
            ${alerts.map(alert => `
              <div class="alert alert-warning mb-2">
                <strong>${alert.name}</strong> is low on stock (${alert.quantity} <= ${alert.minStock})
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
  
  renderQuickActions() {
    return `
      <div class="quick-actions mb-6">
        <div class="grid grid-cols-4">
          <button class="btn btn-primary" onclick="window.pharmaApp.getModule('dashboard').executeQuickAction('new_sale')">
            <span class="btn-icon">💰</span>
            New Sale
          </button>
          <button class="btn btn-warning" onclick="window.pharmaApp.getModule('dashboard').executeQuickAction('verify_prescription')">
            <span class="btn-icon">📋</span>
            Verify Rx
          </button>
          <button class="btn btn-success" onclick="window.pharmaApp.getModule('dashboard').executeQuickAction('add_product')">
            <span class="btn-icon">📦</span>
            Add Product
          </button>
          <button class="btn btn-info" onclick="window.pharmaApp.getModule('dashboard').executeQuickAction('add_customer')">
            <span class="btn-icon">👥</span>
            Add Customer
          </button>
        </div>
      </div>
    `;
  }
  
  renderMetrics(metrics) {
    return `
      <div class="metrics-section mb-6">
        <div class="grid grid-cols-4">
          <div class="card">
            <div class="card-body text-center">
              <div class="text-3xl font-bold text-success mb-2">
                ${window.settings?.symbol || '$'}${metrics.todaySales?.toFixed(2) || '0.00'}
              </div>
              <div class="text-sm text-gray-600">Today's Sales</div>
              ${metrics.salesChange ? `<div class="text-xs ${metrics.salesChange > 0 ? 'text-success' : 'text-danger'}">${metrics.salesChange > 0 ? '+' : ''}${metrics.salesChange}%</div>` : ''}
            </div>
          </div>
          
          <div class="card">
            <div class="card-body text-center">
              <div class="text-3xl font-bold text-primary mb-2">
                ${metrics.transactions || 0}
              </div>
              <div class="text-sm text-gray-600">Transactions</div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-body text-center">
              <div class="text-3xl font-bold text-warning mb-2">
                ${metrics.lowStock || 0}
              </div>
              <div class="text-sm text-gray-600">Low Stock Items</div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-body text-center">
              <div class="text-3xl font-bold text-info mb-2">
                ${metrics.pendingPrescriptions || 0}
              </div>
              <div class="text-sm text-gray-600">Pending Prescriptions</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderRecentActivity(activity) {
    if (!activity || activity.length === 0) {
      return '';
    }
    
    return `
      <div class="activity-section">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Recent Activity</h3>
          </div>
          <div class="card-body">
            <div class="space-y-3">
              ${activity.map(item => `
                <div class="flex items-center gap-3 p-3 bg-gray-50 rounded">
                  <div class="text-xl">${item.icon}</div>
                  <div class="flex-1">
                    <div class="text-sm font-medium">${item.message}</div>
                    <div class="text-xs text-gray-500">${this.formatTimeAgo(item.timestamp)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
}

// Make DashboardModule available globally
window.DashboardModule = DashboardModule;