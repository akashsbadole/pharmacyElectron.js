/**
 * Table Management Module - Visual table layout and restaurant table operations
 */

class TableModule {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.tables = [];
    this.tableOrders = [];
    this.layoutMode = false;
    this.selectedTable = null;
    this.refreshInterval = null;
    this.draggedElement = null;
    this.soundEnabled = true;
    this.currentView = 'layout'; // layout, list, metrics
  }
  
  initialize() {
    console.log('Table Management module initialized');
    this.setupEventListeners();
    this.initializeSocketListeners();
    this.initializeDragAndDrop();
  }
  
  setupEventListeners() {
    // Handle table status updates
    $(document).on('click', '.table-status-btn', (e) => {
      const tableId = $(e.target).data('table-id');
      const status = $(e.target).data('status');
      this.updateTableStatus(tableId, status);
    });

    // Handle table selection
    $(document).on('click', '.table-item', (e) => {
      const tableId = $(e.currentTarget).data('table-id');
      this.selectTable(tableId);
    });

    // Handle order status updates
    $(document).on('click', '.order-status-btn', (e) => {
      const orderId = $(e.target).data('order-id');
      const status = $(e.target).data('status');
      this.updateOrderStatus(orderId, status);
    });

    // Handle view switching
    $(document).on('click', '.view-switch-btn', (e) => {
      const view = $(e.target).data('view');
      this.switchView(view);
    });

    // Handle layout mode toggle
    $(document).on('click', '#toggleLayoutMode', (e) => {
      this.toggleLayoutMode();
    });

    // Handle table creation
    $(document).on('click', '#createTableBtn', (e) => {
      this.showCreateTableModal();
    });

    // Handle table editing
    $(document).on('click', '.edit-table-btn', (e) => {
      const tableId = $(e.target).data('table-id');
      this.showEditTableModal(tableId);
    });

    // Handle bill splitting
    $(document).on('click', '.split-bill-btn', (e) => {
      const orderId = $(e.target).data('order-id');
      this.showBillSplitModal(orderId);
    });

    // Handle bill payment
    $(document).on('click', '.mark-paid-btn', (e) => {
      const orderId = $(e.target).data('order-id');
      this.markBillPaid(orderId);
    });

    // Handle manual refresh
    $(document).on('click', '#manualRefresh', () => {
      this.loadTables();
    });

    // Handle auto-refresh toggle
    $(document).on('change', '#autoRefresh', (e) => {
      if (e.target.checked) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    });

    // Handle sound toggle
    $(document).on('click', '#toggleSound', (e) => {
      this.soundEnabled = !this.soundEnabled;
      $(e.target).find('i').toggleClass('fa-volume-up fa-volume-mute');
    });
  }

  initializeSocketListeners() {
    // Initialize WebSocket listeners for real-time updates
    if (typeof io !== 'undefined' && window.pharmaApp) {
      const socket = io();
      
      socket.on('table-created', (table) => {
        console.log('New table created:', table);
        this.handleTableCreated(table);
      });

      socket.on('table-updated', (data) => {
        console.log('Table updated:', data);
        this.handleTableUpdated(data);
      });

      socket.on('table-status-updated', (data) => {
        console.log('Table status updated:', data);
        this.handleTableStatusUpdate(data);
      });

      socket.on('table-deleted', (data) => {
        console.log('Table deleted:', data);
        this.handleTableDeleted(data);
      });

      socket.on('table-order-created', (order) => {
        console.log('New table order:', order);
        this.handleTableOrderCreated(order);
      });

      socket.on('table-order-updated', (data) => {
        console.log('Table order updated:', data);
        this.handleTableOrderUpdated(data);
      });

      socket.on('table-bill-updated', (data) => {
        console.log('Table bill updated:', data);
        this.handleBillUpdate(data);
      });

      socket.on('bill-split-updated', (data) => {
        console.log('Bill split updated:', data);
        this.handleBillSplitUpdate(data);
      });

      socket.on('layout-updated', (data) => {
        console.log('Layout updated:', data);
        this.handleLayoutUpdate(data);
      });
    }
  }

  initializeDragAndDrop() {
    // Initialize drag and drop for layout mode
    $(document).on('dragstart', '.draggable-table', (e) => {
      if (!this.layoutMode) return;
      
      this.draggedElement = $(e.target);
      this.draggedElement.addClass('dragging');
      e.originalEvent.dataTransfer.effectAllowed = 'move';
    });

    $(document).on('dragend', '.draggable-table', (e) => {
      if (this.draggedElement) {
        this.draggedElement.removeClass('dragging');
        this.draggedElement = null;
      }
    });

    $(document).on('dragover', '.layout-container', (e) => {
      if (!this.layoutMode) return;
      e.preventDefault();
      e.originalEvent.dataTransfer.dropEffect = 'move';
    });

    $(document).on('drop', '.layout-container', (e) => {
      if (!this.layoutMode || !this.draggedElement) return;
      
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      this.updateTablePosition(this.draggedElement.data('table-id'), x, y);
    });
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
      this.loadTables(),
      this.loadTableOrders(),
      this.loadMetrics()
    ]);
  }
  
  async loadTables() {
    try {
      this.app.state.updateModule('tables', { loading: true });
      
      const params = new URLSearchParams();
      if (this.selectedTable) {
        params.append('search', this.selectedTable);
      }
      
      const response = await fetch(`${window.api}tables/tables?${params}`);
      const tables = await response.json();
      
      this.tables = tables;
      
      this.app.state.updateModule('tables', { 
        tables,
        loading: false,
        lastUpdated: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error loading tables:', error);
      this.app.state.updateModule('tables', { loading: false });
    }
  }
  
  async loadTableOrders() {
    try {
      const response = await fetch(`${window.api}tables/orders`);
      const orders = await response.json();
      
      this.tableOrders = orders;
      
      this.app.state.updateModule('tables', { tableOrders: orders });
      
    } catch (error) {
      console.error('Error loading table orders:', error);
    }
  }
  
  async loadMetrics() {
    try {
      const response = await fetch(`${window.api}tables/metrics`);
      const metrics = await response.json();
      
      this.app.state.updateModule('tables', { metrics });
      
    } catch (error) {
      console.error('Error loading table metrics:', error);
    }
  }
  
  async updateTableStatus(tableId, status) {
    try {
      const response = await fetch(`${window.api}tables/tables/${tableId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Play sound for status changes
        if (this.soundEnabled && (status === 'available' || status === 'cleaning')) {
          this.playNotificationSound();
        }
        
        await this.loadTables(); // Refresh tables
        
        if (window.notiflix) {
          window.notiflix.Notify.success('Table status updated');
        }
      } else {
        throw new Error(result.message || 'Failed to update status');
      }
      
    } catch (error) {
      console.error('Error updating table status:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to update table status', 'Ok');
      }
    }
  }
  
  async updateOrderStatus(orderId, status) {
    try {
      const response = await fetch(`${window.api}tables/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        await this.loadTableOrders(); // Refresh orders
        await this.loadTables(); // Refresh tables (status may have changed)
        
        if (window.notiflix) {
          window.notiflix.Notify.success('Order status updated');
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
  
  async updateTablePosition(tableId, x, y) {
    try {
      // Update local state immediately for smooth UX
      const table = this.tables.find(t => t._id === tableId);
      if (table) {
        table.position_x = x;
        table.position_y = y;
        this.app.state.updateModule('tables', { tables: this.tables });
      }
      
      // Send update to server
      const response = await fetch(`${window.api}tables/layout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          tables: [{ _id: tableId, position_x: x, position_y: y }] 
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update table position');
      }
      
    } catch (error) {
      console.error('Error updating table position:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to update table position', 'Ok');
      }
    }
  }
  
  async markBillPaid(orderId) {
    try {
      const response = await fetch(`${window.api}tables/orders/${orderId}/bill`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bill_status: 'paid' })
      });
      
      if (response.ok) {
        await this.loadTableOrders();
        
        if (window.notiflix) {
          window.notiflix.Notify.success('Bill marked as paid');
        }
      } else {
        throw new Error('Failed to mark bill as paid');
      }
      
    } catch (error) {
      console.error('Error marking bill as paid:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to mark bill as paid', 'Ok');
      }
    }
  }
  
  async splitBill(orderId, splitType, splitData) {
    try {
      const response = await fetch(`${window.api}tables/orders/${orderId}/split-bill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ split_type: splitType, split_data: splitData })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        await this.loadTableOrders();
        
        if (window.notiflix) {
          window.notiflix.Notify.success('Bill split successfully');
        }
        
        return result;
      } else {
        throw new Error(result.message || 'Failed to split bill');
      }
      
    } catch (error) {
      console.error('Error splitting bill:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to split bill', 'Ok');
      }
      throw error;
    }
  }
  
  switchView(view) {
    this.currentView = view;
    this.app.state.updateModule('tables', { currentView: view });
  }
  
  toggleLayoutMode() {
    this.layoutMode = !this.layoutMode;
    this.app.state.updateModule('tables', { layoutMode: this.layoutMode });
    
    if (window.notiflix) {
      const message = this.layoutMode ? 'Layout mode enabled' : 'Layout mode disabled';
      window.notiflix.Notify.info(message);
    }
  }
  
  selectTable(tableId) {
    this.selectedTable = tableId;
    const table = this.tables.find(t => t._id === tableId);
    const order = this.tableOrders.find(o => o.table_id === tableId && 
      ['seated', 'ordering', 'eating', 'ready_to_leave'].includes(o.order_status));
    
    this.app.state.updateModule('tables', { 
      selectedTable: tableId,
      selectedTableData: { table, order }
    });
  }
  
  startAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(() => {
      this.loadTables();
      this.loadTableOrders();
    }, 10000); // Refresh every 10 seconds
  }
  
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
  
  playNotificationSound() {
    // Create a simple notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }
  
  // WebSocket event handlers
  handleTableCreated(table) {
    this.tables.unshift(table);
    this.app.state.updateModule('tables', { tables: this.tables });
    
    if (window.notiflix) {
      window.notiflix.Notify.info(`New table ${table.table_number} created`);
    }
  }
  
  handleTableUpdated(data) {
    const index = this.tables.findIndex(t => t._id === data.table_id);
    if (index !== -1) {
      Object.assign(this.tables[index], data);
      this.app.state.updateModule('tables', { tables: this.tables });
    }
  }
  
  handleTableStatusUpdate(data) {
    const table = this.tables.find(t => t._id === data.table_id);
    if (table) {
      table.status = data.status;
      this.app.state.updateModule('tables', { tables: this.tables });
      
      if (window.notiflix) {
        const message = `Table ${table.table_number} is now ${data.status}`;
        window.notiflix.Notify.info(message);
      }
    }
  }
  
  handleTableDeleted(data) {
    this.tables = this.tables.filter(t => t._id !== data.table_id);
    this.app.state.updateModule('tables', { tables: this.tables });
  }
  
  handleTableOrderCreated(order) {
    this.tableOrders.unshift(order);
    this.app.state.updateModule('tables', { tableOrders: this.tableOrders });
    
    // Update table status
    this.loadTables();
    
    if (window.notiflix) {
      window.notiflix.Notify.info(`Order started for table ${order.table_number}`);
    }
  }
  
  handleTableOrderUpdated(data) {
    const order = this.tableOrders.find(o => o._id === data.order_id);
    if (order) {
      order.order_status = data.status;
      this.app.state.updateModule('tables', { tableOrders: this.tableOrders });
      
      // Refresh tables to update status
      this.loadTables();
    }
  }
  
  handleBillUpdate(data) {
    const order = this.tableOrders.find(o => o._id === data.order_id);
    if (order) {
      order.bill_total = data.bill_total;
      order.bill_status = data.bill_status;
      this.app.state.updateModule('tables', { tableOrders: this.tableOrders });
    }
  }
  
  handleBillSplitUpdate(data) {
    const order = this.tableOrders.find(o => o._id === data.order_id);
    if (order) {
      order.bill_split_info = data.split_info;
      this.app.state.updateModule('tables', { tableOrders: this.tableOrders });
    }
  }
  
  handleLayoutUpdate(data) {
    // Refresh layout
    this.loadTables();
  }
  
  // Modal functions
  showCreateTableModal() {
    // Implementation for create table modal
    console.log('Show create table modal');
  }
  
  showEditTableModal(tableId) {
    // Implementation for edit table modal
    console.log('Show edit table modal for table:', tableId);
  }
  
  showBillSplitModal(orderId) {
    // Implementation for bill split modal
    console.log('Show bill split modal for order:', orderId);
  }
  
  render() {
    const tablesState = this.app.state.getModuleState('tables');
    const tables = tablesState.tables || [];
    const tableOrders = tablesState.tableOrders || [];
    const metrics = tablesState.metrics || {};
    const currentView = tablesState.currentView || 'layout';
    const layoutMode = tablesState.layoutMode || false;
    
    return `
      <div class="module-container table-module" data-module="tables">
        <div class="module-header">
          <h1 class="module-title">Table Management</h1>
          <p class="module-subtitle">Visual table layout and restaurant operations</p>
        </div>
        
        ${this.renderControls(currentView, layoutMode)}
        ${this.renderMetrics(metrics)}
        ${currentView === 'layout' ? this.renderLayoutView(tables, tableOrders, layoutMode) : ''}
        ${currentView === 'list' ? this.renderListView(tables, tableOrders) : ''}
        ${currentView === 'metrics' ? this.renderMetricsView(metrics) : ''}
        ${this.renderSelectedTablePanel()}
      </div>
    `;
  }
  
  renderControls(currentView, layoutMode) {
    return `
      <div class="table-controls mb-6">
        <div class="card">
          <div class="card-body">
            <div class="grid grid-cols-6 gap-4">
              <div class="form-group">
                <label class="form-label">View</label>
                <div class="btn-group" role="group">
                  <button class="btn ${currentView === 'layout' ? 'btn-primary' : 'btn-secondary'} view-switch-btn" data-view="layout">
                    <i class="fa fa-th"></i> Layout
                  </button>
                  <button class="btn ${currentView === 'list' ? 'btn-primary' : 'btn-secondary'} view-switch-btn" data-view="list">
                    <i class="fa fa-list"></i> List
                  </button>
                  <button class="btn ${currentView === 'metrics' ? 'btn-primary' : 'btn-secondary'} view-switch-btn" data-view="metrics">
                    <i class="fa fa-chart-bar"></i> Metrics
                  </button>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">&nbsp;</label>
                <button id="toggleLayoutMode" class="btn ${layoutMode ? 'btn-warning' : 'btn-info'}">
                  <i class="fa ${layoutMode ? 'fa-save' : 'fa-edit'}"></i> 
                  ${layoutMode ? 'Save Layout' : 'Edit Layout'}
                </button>
              </div>
              
              <div class="form-group">
                <label class="form-label">&nbsp;</label>
                <button id="createTableBtn" class="btn btn-success">
                  <i class="fa fa-plus"></i> Add Table
                </button>
              </div>
              
              <div class="form-group">
                <label class="form-label">&nbsp;</label>
                <button id="manualRefresh" class="btn btn-info">
                  <i class="fa fa-refresh"></i> Refresh
                </button>
              </div>
              
              <div class="form-group">
                <label class="form-label">Auto Refresh</label>
                <div class="flex items-center gap-2">
                  <input type="checkbox" id="autoRefresh" checked>
                  <span class="text-sm">Every 10s</span>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Sound</label>
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
    if (!metrics || !metrics.table_metrics) return '';
    
    return `
      <div class="table-metrics mb-6">
        <div class="grid grid-cols-4 gap-4">
          <div class="metric-card">
            <div class="metric-value">${metrics.table_metrics.total_orders || 0}</div>
            <div class="metric-label">Total Orders</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">$${(metrics.table_metrics.total_revenue || 0).toFixed(2)}</div>
            <div class="metric-label">Total Revenue</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${metrics.table_metrics.average_service_time || 0} min</div>
            <div class="metric-label">Avg Service Time</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">$${(metrics.table_metrics.average_bill_total || 0).toFixed(2)}</div>
            <div class="metric-label">Avg Bill Total</div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderLayoutView(tables, tableOrders, layoutMode) {
    if (tables.length === 0) {
      return `
        <div class="table-layout">
          <div class="text-center py-8 text-gray-500">
            <i class="fa fa-table text-4xl mb-4"></i>
            <div>No tables configured</div>
            <div class="text-sm mt-2">Add tables to start managing your restaurant</div>
          </div>
        </div>
      `;
    }
    
    const tableElements = tables.map(table => {
      const activeOrder = tableOrders.find(o => o.table_id === table._id && 
        ['seated', 'ordering', 'eating', 'ready_to_leave'].includes(o.order_status));
      
      const statusClass = `status-${table.status}`;
      const isSelected = this.selectedTable === table._id;
      
      return `
        <div class="table-item ${statusClass} ${isSelected ? 'selected' : ''} ${layoutMode ? 'draggable-table' : ''}" 
             data-table-id="${table._id}" 
             style="left: ${table.position_x}px; top: ${table.position_y}px; width: ${table.width}px; height: ${table.height}px;"
             ${layoutMode ? 'draggable="true"' : ''}>
          <div class="table-header">
            <div class="table-number">${table.table_number}</div>
            <div class="table-capacity">${table.capacity} seats</div>
          </div>
          <div class="table-body">
            <div class="table-status">${this.formatStatus(table.status)}</div>
            ${activeOrder ? `
              <div class="table-order-info">
                <div class="order-number">#${activeOrder.order_number}</div>
                <div class="order-status">${this.formatStatus(activeOrder.order_status)}</div>
                <div class="bill-total">$${activeOrder.bill_total.toFixed(2)}</div>
              </div>
            ` : ''}
          </div>
          <div class="table-footer">
            <div class="table-location">${table.location}</div>
            ${layoutMode ? '<button class="edit-table-btn" data-table-id="' + table._id + '"><i class="fa fa-edit"></i></button>' : ''}
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <div class="table-layout mb-6">
        <div class="layout-container ${layoutMode ? 'layout-mode' : ''}">
          ${tableElements}
        </div>
        ${layoutMode ? '<div class="layout-hint"><i class="fa fa-info-circle"></i> Drag tables to reposition them. Click "Save Layout" when done.</div>' : ''}
      </div>
    `;
  }
  
  renderListView(tables, tableOrders) {
    const tableRows = tables.map(table => {
      const activeOrder = tableOrders.find(o => o.table_id === table._id && 
        ['seated', 'ordering', 'eating', 'ready_to_leave'].includes(o.order_status));
      
      return `
        <tr class="${this.selectedTable === table._id ? 'selected' : ''}" data-table-id="${table._id}">
          <td>${table.table_number}</td>
          <td>${table.table_name || table.table_number}</td>
          <td>${table.capacity}</td>
          <td>${table.location}</td>
          <td>
            <span class="status-badge status-${table.status}">${this.formatStatus(table.status)}</span>
          </td>
          <td>
            ${activeOrder ? `
              <div class="order-info">
                <div>#${activeOrder.order_number}</div>
                <div class="text-sm text-muted">${this.formatStatus(activeOrder.order_status)}</div>
              </div>
            ` : '<span class="text-muted">No active order</span>'}
          </td>
          <td>
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-primary table-status-btn" data-table-id="${table._id}" data-status="available">
                Available
              </button>
              <button class="btn btn-sm btn-outline-warning table-status-btn" data-table-id="${table._id}" data-status="reserved">
                Reserve
              </button>
              <button class="btn btn-sm btn-outline-secondary edit-table-btn" data-table-id="${table._id}">
                <i class="fa fa-edit"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    return `
      <div class="table-list mb-6">
        <div class="card">
          <div class="card-header">
            <h3>Tables Overview</h3>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Table #</th>
                    <th>Name</th>
                    <th>Capacity</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Active Order</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderMetricsView(metrics) {
    if (!metrics) {
      return `
        <div class="metrics-view">
          <div class="text-center py-8 text-gray-500">
            <i class="fa fa-chart-bar text-4xl mb-4"></i>
            <div>No metrics available</div>
            <div class="text-sm mt-2">Metrics will appear here after some activity</div>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="metrics-view mb-6">
        <div class="grid grid-cols-2 gap-6">
          <div class="card">
            <div class="card-header">
              <h3>Table Utilization</h3>
            </div>
            <div class="card-body">
              ${this.renderUtilizationChart(metrics.utilization || {})}
            </div>
          </div>
          
          <div class="card">
            <div class="card-header">
              <h3>Service Performance</h3>
            </div>
            <div class="card-body">
              ${this.renderServicePerformance(metrics.service_metrics || {})}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderUtilizationChart(utilization) {
    const utilizationItems = Object.entries(utilization).map(([tableId, data]) => `
      <div class="utilization-item">
        <div class="utilization-header">
          <span class="table-name">${data.table_number}</span>
          <span class="utilization-percentage">${data.utilization_percentage}%</span>
        </div>
        <div class="progress">
          <div class="progress-bar" style="width: ${data.utilization_percentage}%"></div>
        </div>
        <div class="utilization-details">
          <span class="orders-count">${data.total_orders} orders</span>
          <span class="occupied-time">${data.occupied_hours.toFixed(1)}h occupied</span>
        </div>
      </div>
    `).join('');
    
    return utilizationItems || '<div class="text-muted">No utilization data available</div>';
  }
  
  renderServicePerformance(serviceMetrics) {
    const serverItems = Object.entries(serviceMetrics.server_performance || {}).map(([serverId, data]) => `
      <div class="server-performance-item">
        <div class="server-header">
          <span class="server-name">Server ${serverId}</span>
          <span class="server-orders">${data.total_orders} orders</span>
        </div>
        <div class="server-stats">
          <div class="stat">
            <span class="stat-value">$${data.average_bill.toFixed(2)}</span>
            <span class="stat-label">Avg Bill</span>
          </div>
          <div class="stat">
            <span class="stat-value">${data.average_service_time}m</span>
            <span class="stat-label">Avg Service</span>
          </div>
          <div class="stat">
            <span class="stat-value">$${data.total_revenue.toFixed(2)}</span>
            <span class="stat-label">Revenue</span>
          </div>
        </div>
      </div>
    `).join('');
    
    return serverItems || '<div class="text-muted">No server performance data available</div>';
  }
  
  renderSelectedTablePanel() {
    const tablesState = this.app.state.getModuleState('tables');
    const selectedData = tablesState.selectedTableData;
    
    if (!selectedData) return '';
    
    const { table, order } = selectedData;
    
    return `
      <div class="selected-table-panel">
        <div class="card">
          <div class="card-header">
            <h3>Table ${table.table_number} Details</h3>
          </div>
          <div class="card-body">
            <div class="table-details">
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">${this.formatStatus(table.status)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Capacity:</span>
                <span class="detail-value">${table.capacity} seats</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${table.location}</span>
              </div>
            </div>
            
            ${order ? this.renderOrderDetails(order) : '<div class="no-order">No active order</div>'}
          </div>
        </div>
      </div>
    `;
  }
  
  renderOrderDetails(order) {
    return `
      <div class="order-details mt-4">
        <h4>Active Order</h4>
        <div class="detail-row">
          <span class="detail-label">Order #:</span>
          <span class="detail-value">${order.order_number}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status:</span>
          <span class="detail-value">${this.formatStatus(order.order_status)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Customers:</span>
          <span class="detail-value">${order.customer_count}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Bill Total:</span>
          <span class="detail-value">$${order.bill_total.toFixed(2)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Bill Status:</span>
          <span class="detail-value">${this.formatBillStatus(order.bill_status)}</span>
        </div>
        
        <div class="order-actions mt-4">
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-primary order-status-btn" data-order-id="${order._id}" data-status="ordering">
              Taking Orders
            </button>
            <button class="btn btn-sm btn-outline-info order-status-btn" data-order-id="${order._id}" data-status="eating">
              Eating
            </button>
            <button class="btn btn-sm btn-outline-warning order-status-btn" data-order-id="${order._id}" data-status="ready_to_leave">
              Ready to Leave
            </button>
            <button class="btn btn-sm btn-outline-success order-status-btn" data-order-id="${order._id}" data-status="closed">
              Close
            </button>
          </div>
          
          <div class="btn-group mt-2">
            <button class="btn btn-sm btn-outline-secondary split-bill-btn" data-order-id="${order._id}">
              <i class="fa fa-cut"></i> Split Bill
            </button>
            ${order.bill_status !== 'paid' ? `
              <button class="btn btn-sm btn-success mark-paid-btn" data-order-id="${order._id}">
                <i class="fa fa-check"></i> Mark Paid
              </button>
            ` : ''}
          </div>
        </div>
        
        ${order.bill_split_info && order.bill_split_info.length > 0 ? this.renderBillSplitInfo(order.bill_split_info) : ''}
      </div>
    `;
  }
  
  renderBillSplitInfo(splitInfo) {
    const splitItems = splitInfo.map(split => `
      <div class="split-item">
        <div class="split-description">${split.description || `Split ${split.split_id}`}</div>
        <div class="split-amount">$${split.amount.toFixed(2)}</div>
        ${split.percentage ? `<div class="split-percentage">${split.percentage}%</div>` : ''}
      </div>
    `).join('');
    
    return `
      <div class="bill-split-info mt-4">
        <h5>Bill Split</h5>
        <div class="split-list">
          ${splitItems}
        </div>
      </div>
    `;
  }
  
  formatStatus(status) {
    const statusMap = {
      'available': 'Available',
      'occupied': 'Occupied',
      'reserved': 'Reserved',
      'cleaning': 'Cleaning',
      'out_of_service': 'Out of Service',
      'seated': 'Seated',
      'ordering': 'Ordering',
      'eating': 'Eating',
      'ready_to_leave': 'Ready to Leave',
      'closed': 'Closed'
    };
    
    return statusMap[status] || status;
  }
  
  formatBillStatus(status) {
    const statusMap = {
      'open': 'Open',
      'partial_payment': 'Partial Payment',
      'paid': 'Paid'
    };
    
    return statusMap[status] || status;
  }
}

// Make TableModule available globally
window.TableModule = TableModule;