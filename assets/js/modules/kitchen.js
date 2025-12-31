/**
 * Kitchen Display System Module - Real-time order management and kitchen communication
 */

class KitchenModule {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.activeOrders = [];
    this.filteredOrders = [];
    this.currentStation = 'all';
    this.refreshInterval = null;
    this.soundEnabled = true;
  }
  
  initialize() {
    console.log('Kitchen Display System module initialized');
    this.setupEventListeners();
    this.initializeSocketListeners();
  }
  
  setupEventListeners() {
    // Handle order status updates
    $(document).on('click', '.order-status-btn', (e) => {
      const orderId = $(e.target).data('order-id');
      const status = $(e.target).data('status');
      const itemId = $(e.target).data('item-id');
      
      this.updateOrderStatus(orderId, status, itemId);
    });

    // Handle station filtering
    $(document).on('change', '#stationFilter', (e) => {
      this.filterByStation(e.target.value);
    });

    // Handle order priority updates
    $(document).on('click', '.priority-btn', (e) => {
      const orderId = $(e.target).data('order-id');
      const priority = $(e.target).data('priority');
      
      this.updateOrderPriority(orderId, priority);
    });

    // Handle order cancellation
    $(document).on('click', '.cancel-order-btn', (e) => {
      const orderId = $(e.target).data('order-id');
      
      if (confirm('Are you sure you want to cancel this order?')) {
        this.cancelOrder(orderId);
      }
    });

    // Handle sound toggle
    $(document).on('click', '#toggleSound', (e) => {
      this.soundEnabled = !this.soundEnabled;
      $(e.target).find('i').toggleClass('fa-volume-up fa-volume-mute');
    });

    // Handle auto-refresh toggle
    $(document).on('change', '#autoRefresh', (e) => {
      if (e.target.checked) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    });

    // Handle manual refresh
    $(document).on('click', '#manualRefresh', () => {
      this.loadOrders();
    });
  }

  initializeSocketListeners() {
    // Initialize WebSocket listeners for real-time updates
    if (typeof io !== 'undefined' && window.pharmaApp) {
      const socket = io();
      
      socket.on('new-order', (order) => {
        console.log('New order received:', order);
        this.handleNewOrder(order);
      });

      socket.on('order-updated', (data) => {
        console.log('Order updated:', data);
        this.handleOrderUpdate(data);
      });

      socket.on('priority-updated', (data) => {
        console.log('Priority updated:', data);
        this.handlePriorityUpdate(data);
      });

      socket.on('order-cancelled', (data) => {
        console.log('Order cancelled:', data);
        this.handleOrderCancellation(data);
      });
    }
  }
  
  onActivate() {
    this.loadInitialData();
    this.startAutoRefresh();
  }
  
  onDeactivate() {
    this.stopAutoRefresh();
  }
  
  async loadInitialData() {
    await Promise.all([
      this.loadOrders(),
      this.loadStations(),
      this.loadMetrics()
    ]);
  }
  
  async loadOrders() {
    try {
      this.app.state.updateModule('kitchen', { loading: true });
      
      const params = new URLSearchParams();
      if (this.currentStation !== 'all') {
        params.append('station', this.currentStation);
      }
      
      const response = await fetch(`${window.api}kitchen/orders?${params}`);
      const orders = await response.json();
      
      this.activeOrders = orders;
      this.filteredOrders = orders;
      
      this.app.state.updateModule('kitchen', { 
        orders,
        loading: false,
        lastUpdated: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error loading kitchen orders:', error);
      this.app.state.updateModule('kitchen', { loading: false });
    }
  }
  
  async loadStations() {
    try {
      const response = await fetch(`${window.api}kitchen/stations`);
      const stations = await response.json();
      
      this.app.state.updateModule('kitchen', { stations });
      
    } catch (error) {
      console.error('Error loading kitchen stations:', error);
    }
  }
  
  async loadMetrics() {
    try {
      const response = await fetch(`${window.api}kitchen/metrics`);
      const metrics = await response.json();
      
      this.app.state.updateModule('kitchen', { metrics });
      
    } catch (error) {
      console.error('Error loading kitchen metrics:', error);
    }
  }
  
  async updateOrderStatus(orderId, status, itemId = null) {
    try {
      const response = await fetch(`${window.api}kitchen/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, item_id: itemId })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Play sound for status changes
        if (this.soundEnabled && (status === 'ready' || status === 'served')) {
          this.playNotificationSound();
        }
        
        await this.loadOrders(); // Refresh orders
        await this.loadMetrics(); // Update metrics
        
        if (window.notiflix) {
          const message = itemId ? 'Item status updated' : 'Order status updated';
          window.notiflix.Notify.success(message);
        }
      } else {
        throw new Error(result.message || 'Failed to update status');
      }
      
    } catch (error) {
      console.error('Error updating order status:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to update order status', 'Ok');
      }
    }
  }
  
  async updateOrderPriority(orderId, priority) {
    try {
      const response = await fetch(`${window.api}kitchen/orders/${orderId}/priority`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ priority })
      });
      
      if (response.ok) {
        await this.loadOrders();
        
        if (window.notiflix) {
          window.notiflix.Notify.success('Order priority updated');
        }
      } else {
        const result = await response.json();
        throw new Error(result.message || 'Failed to update priority');
      }
      
    } catch (error) {
      console.error('Error updating order priority:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to update order priority', 'Ok');
      }
    }
  }
  
  async cancelOrder(orderId) {
    try {
      const response = await fetch(`${window.api}kitchen/orders/${orderId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await this.loadOrders();
        
        if (window.notiflix) {
          window.notiflix.Notify.success('Order cancelled');
        }
      } else {
        throw new Error('Failed to cancel order');
      }
      
    } catch (error) {
      console.error('Error cancelling order:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to cancel order', 'Ok');
      }
    }
  }
  
  filterByStation(station) {
    this.currentStation = station;
    
    if (station === 'all') {
      this.filteredOrders = this.activeOrders;
    } else {
      this.filteredOrders = this.activeOrders.filter(order => 
        order.items.some(item => item.kitchen_station === station)
      );
    }
    
    this.app.state.updateModule('kitchen', { 
      filteredOrders: this.filteredOrders 
    });
  }
  
  startAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(() => {
      this.loadOrders();
    }, 5000); // Refresh every 5 seconds
  }
  
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
  
  playNotificationSound() {
    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }
  
  handleNewOrder(order) {
    console.log('Processing new order:', order);
    this.activeOrders.unshift(order);
    this.filterOrders();
    
    // Play notification sound for new orders
    if (this.soundEnabled) {
      this.playNotificationSound();
    }
    
    // Show notification
    if (window.notiflix) {
      window.notiflix.Notify.info(`New order #${order.order_number} received`);
    }
    
    this.app.state.updateModule('kitchen', {
      orders: this.activeOrders,
      filteredOrders: this.filteredOrders
    });
  }
  
  handleOrderUpdate(data) {
    console.log('Processing order update:', data);
    
    // Find and update the order
    const orderIndex = this.activeOrders.findIndex(order => order._id === data.order_id);
    if (orderIndex !== -1) {
      // Reload orders to get updated data
      this.loadOrders();
    }
    
    this.app.state.updateModule('kitchen', {
      lastUpdate: new Date().toISOString()
    });
  }
  
  handlePriorityUpdate(data) {
    console.log('Processing priority update:', data);
    
    const orderIndex = this.activeOrders.findIndex(order => order._id === data.order_id);
    if (orderIndex !== -1) {
      this.activeOrders[orderIndex].priority = data.priority;
      this.filterOrders();
      
      this.app.state.updateModule('kitchen', {
        orders: this.activeOrders,
        filteredOrders: this.filteredOrders
      });
    }
  }
  
  handleOrderCancellation(data) {
    console.log('Processing order cancellation:', data);
    
    // Remove cancelled order from active orders
    this.activeOrders = this.activeOrders.filter(order => order._id !== data.order_id);
    this.filterOrders();
    
    this.app.state.updateModule('kitchen', {
      orders: this.activeOrders,
      filteredOrders: this.filteredOrders
    });
  }
  
  filterOrders() {
    if (this.currentStation === 'all') {
      this.filteredOrders = this.activeOrders;
    } else {
      this.filteredOrders = this.activeOrders.filter(order => 
        order.items.some(item => item.kitchen_station === this.currentStation)
      );
    }
  }
  
  render() {
    const kitchenState = this.app.state.getModuleState('kitchen');
    const orders = kitchenState.filteredOrders || [];
    const stations = kitchenState.stations || {};
    const metrics = kitchenState.metrics || {};
    
    return `
      <div class="module-container kitchen-module" data-module="kitchen">
        <div class="module-header">
          <h1 class="module-title">Kitchen Display System</h1>
          <p class="module-subtitle">Real-time order management and kitchen communication</p>
        </div>
        
        ${this.renderControls()}
        ${this.renderMetrics(metrics)}
        ${this.renderStations(stations)}
        ${this.renderOrdersQueue(orders)}
      </div>
    `;
  }
  
  renderControls() {
    const kitchenState = this.app.state.getModuleState('kitchen');
    
    return `
      <div class="kitchen-controls mb-6">
        <div class="card">
          <div class="card-body">
            <div class="grid grid-cols-4 gap-4">
              <div class="form-group">
                <label class="form-label">Kitchen Station</label>
                <select id="stationFilter" class="form-select">
                  <option value="all">All Stations</option>
                  <option value="grill">Grill Station</option>
                  <option value="fryer">Fryer Station</option>
                  <option value="salad">Salad Station</option>
                  <option value="dessert">Dessert Station</option>
                  <option value="beverage">Beverage Station</option>
                  <option value="general">General Station</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">&nbsp;</label>
                <div class="flex gap-2">
                  <button id="manualRefresh" class="btn btn-info">
                    <i class="fa fa-refresh"></i> Refresh
                  </button>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Auto Refresh</label>
                <div class="flex items-center gap-2">
                  <input type="checkbox" id="autoRefresh" checked>
                  <span class="text-sm">Every 5 seconds</span>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Sound Notifications</label>
                <button id="toggleSound" class="btn btn-secondary">
                  <i class="fa fa-volume-up"></i> On
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderMetrics(metrics) {
    return `
      <div class="kitchen-metrics mb-6">
        <div class="grid grid-cols-4 gap-4">
          <div class="metric-card">
            <div class="metric-value">${metrics.total_orders || 0}</div>
            <div class="metric-label">Total Orders</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${metrics.completed_orders || 0}</div>
            <div class="metric-label">Completed</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${metrics.average_prep_time || 0} min</div>
            <div class="metric-label">Avg Prep Time</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${metrics.on_time_delivery || 0}%</div>
            <div class="metric-label">On-Time Delivery</div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderStations(stations) {
    const stationCards = Object.entries(stations).map(([key, station]) => `
      <div class="station-card" style="border-left: 4px solid ${station.color}">
        <div class="station-header">
          <h3>${station.name}</h3>
          <span class="station-status ${station.active_orders > 0 ? 'active' : 'idle'}">
            ${station.active_orders > 0 ? 'Active' : 'Idle'}
          </span>
        </div>
        <div class="station-stats">
          <div class="stat">
            <span class="stat-value">${station.active_orders}</span>
            <span class="stat-label">Active Orders</span>
          </div>
          <div class="stat">
            <span class="stat-value">${station.pending_orders}</span>
            <span class="stat-label">Pending</span>
          </div>
          <div class="stat">
            <span class="stat-value">${station.preparing_orders}</span>
            <span class="stat-label">Preparing</span>
          </div>
        </div>
      </div>
    `).join('');
    
    return `
      <div class="kitchen-stations mb-6">
        <h2 class="section-title">Kitchen Stations</h2>
        <div class="stations-grid">
          ${stationCards}
        </div>
      </div>
    `;
  }
  
  renderOrdersQueue(orders) {
    const kitchenState = this.app.state.getModuleState('kitchen');
    
    if (kitchenState.loading) {
      return `
        <div class="loading">
          <div class="spinner"></div>
          <div class="mt-2">Loading kitchen orders...</div>
        </div>
      `;
    }
    
    if (!orders || orders.length === 0) {
      return `
        <div class="kitchen-queue">
          <div class="text-center py-8 text-gray-500">
            <i class="fa fa-utensils text-4xl mb-4"></i>
            <div>No active orders</div>
            <div class="text-sm mt-2">Orders will appear here when they are received</div>
          </div>
        </div>
      `;
    }
    
    const orderCards = orders.map(order => this.renderOrderCard(order)).join('');
    
    return `
      <div class="kitchen-queue">
        <h2 class="section-title">Order Queue (${orders.length})</h2>
        <div class="orders-grid">
          ${orderCards}
        </div>
      </div>
    `;
  }
  
  renderOrderCard(order) {
    const isOverdue = new Date() > new Date(order.estimated_completion);
    const priorityClass = order.priority === 'rush' ? 'priority-rush' : 
                         order.priority === 'vip' ? 'priority-vip' : 'priority-normal';
    
    const itemsHtml = order.items.map(item => `
      <div class="order-item ${item.status}">
        <div class="item-details">
          <span class="item-name">${item.name}</span>
          <span class="item-quantity">x${item.quantity}</span>
          ${item.special_instructions ? `<div class="item-instructions">${item.special_instructions}</div>` : ''}
        </div>
        <div class="item-controls">
          <span class="kitchen-station-badge station-${item.kitchen_station}">${item.kitchen_station}</span>
          <div class="status-controls">
            ${this.renderStatusButtons(order._id, item.menu_item_id, item.status)}
          </div>
        </div>
      </div>
    `).join('');
    
    return `
      <div class="order-card ${priorityClass} ${isOverdue ? 'overdue' : ''}" data-order-id="${order._id}">
        <div class="order-header">
          <div class="order-info">
            <h3 class="order-number">Order #${order.order_number}</h3>
            <div class="order-meta">
              ${order.table_number ? `<span class="table-number">Table ${order.table_number}</span>` : ''}
              ${order.customer_name ? `<span class="customer-name">${order.customer_name}</span>` : ''}
            </div>
          </div>
          <div class="order-timing">
            <div class="order-time">${this.formatTime(order.order_time)}</div>
            <div class="estimated-time ${isOverdue ? 'overdue' : ''}">
              ${isOverdue ? 'OVERDUE' : `ETA: ${this.formatTime(order.estimated_completion)}`}
            </div>
          </div>
        </div>
        
        <div class="order-items">
          ${itemsHtml}
        </div>
        
        <div class="order-actions">
          <div class="priority-controls">
            <button class="priority-btn ${order.priority === 'normal' ? 'active' : ''}" 
                    data-order-id="${order._id}" data-priority="normal">Normal</button>
            <button class="priority-btn ${order.priority === 'rush' ? 'active' : ''}" 
                    data-order-id="${order._id}" data-priority="rush">Rush</button>
            <button class="priority-btn ${order.priority === 'vip' ? 'active' : ''}" 
                    data-order-id="${order._id}" data-priority="vip">VIP</button>
          </div>
          
          <div class="order-controls">
            <button class="order-status-btn" data-order-id="${order._id}" data-status="ready">
              Mark Ready
            </button>
            <button class="order-status-btn btn-success" data-order-id="${order._id}" data-status="served">
              Served
            </button>
            <button class="cancel-order-btn btn-danger" data-order-id="${order._id}">
              Cancel
            </button>
          </div>
        </div>
        
        ${order.server_notes ? `<div class="server-notes"><i class="fa fa-sticky-note"></i> ${order.server_notes}</div>` : ''}
      </div>
    `;
  }
  
  renderStatusButtons(orderId, itemId, currentStatus) {
    const statuses = ['pending', 'preparing', 'ready'];
    return statuses.map(status => `
      <button class="status-btn ${currentStatus === status ? 'active' : ''}" 
              data-order-id="${orderId}" 
              data-item-id="${itemId}" 
              data-status="${status}">
        ${status.charAt(0).toUpperCase() + status.slice(1)}
      </button>
    `).join('');
  }
  
  formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }
}

// Make KitchenModule available globally
window.KitchenModule = KitchenModule;