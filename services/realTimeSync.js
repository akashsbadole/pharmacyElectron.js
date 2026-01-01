// Real-time Data Synchronization Service
// Restaurant POS System - Cloud Database Implementation
// Integrates Socket.io with PostgreSQL/MongoDB for real-time updates

const EventEmitter = require('events');
const postgresConnection = require('../database/postgresConnection');
const mongoConnection = require('../database/mongoConnection');

class RealTimeSyncService extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;
    this.connectedClients = new Map();
    this.tenantRooms = new Map();
    this.setupEventHandlers();
  }

  // Initialize the real-time sync service
  async initialize() {
    console.log('🔄 Initializing real-time synchronization service...');
    
    try {
      // Set up MongoDB change stream listeners
      await this.setupMongoDBListeners();
      
      // Set up PostgreSQL listeners (if pglogical is available)
      await this.setupPostgreSQLListeners();
      
      console.log('✓ Real-time synchronization service initialized');
    } catch (error) {
      console.error('Failed to initialize real-time sync service:', error);
      throw error;
    }
  }

  // Set up Socket.io connection handling
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔗 Client connected: ${socket.id}`);
      
      // Handle tenant subscription
      socket.on('subscribe-tenant', (data) => {
        this.handleTenantSubscription(socket, data);
      });
      
      // Handle kitchen station subscription
      socket.on('subscribe-kitchen', (data) => {
        this.handleKitchenSubscription(socket, data);
      });
      
      // Handle analytics subscription
      socket.on('subscribe-analytics', (data) => {
        this.handleAnalyticsSubscription(socket, data);
      });
      
      // Handle table subscription
      socket.on('subscribe-tables', (data) => {
        this.handleTableSubscription(socket, data);
      });
      
      // Handle transaction updates
      socket.on('transaction-update', (data) => {
        this.handleTransactionUpdate(socket, data);
      });
      
      // Handle kitchen order status updates
      socket.on('kitchen-status-update', (data) => {
        this.handleKitchenStatusUpdate(socket, data);
      });
      
      // Handle table status updates
      socket.on('table-status-update', (data) => {
        this.handleTableStatusUpdate(socket, data);
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });
    });
  }

  // Handle tenant subscription
  handleTenantSubscription(socket, data) {
    const { tenantId, userId, role } = data;
    
    if (!tenantId) {
      socket.emit('error', { message: 'Tenant ID is required' });
      return;
    }
    
    // Join tenant room
    socket.join(`tenant-${tenantId}`);
    
    // Track connected client
    this.connectedClients.set(socket.id, {
      tenantId,
      userId,
      role,
      joinedAt: new Date(),
      subscriptions: ['tenant']
    });
    
    // Track tenant room
    if (!this.tenantRooms.has(tenantId)) {
      this.tenantRooms.set(tenantId, new Set());
    }
    this.tenantRooms.get(tenantId).add(socket.id);
    
    console.log(`👥 Client ${socket.id} subscribed to tenant ${tenantId}`);
    
    // Send initial data
    socket.emit('subscription-confirmed', {
      tenantId,
      subscriptions: ['tenant'],
      connectedClients: this.tenantRooms.get(tenantId).size
    });
  }

  // Handle kitchen station subscription
  handleKitchenSubscription(socket, data) {
    const { tenantId, stations } = data;
    
    if (!tenantId) {
      socket.emit('error', { message: 'Tenant ID is required' });
      return;
    }
    
    // Join kitchen room
    socket.join(`kitchen-${tenantId}`);
    
    // Join specific station rooms if provided
    if (Array.isArray(stations)) {
      stations.forEach(station => {
        socket.join(`kitchen-station-${tenantId}-${station}`);
      });
    }
    
    // Update client subscriptions
    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.subscriptions.push('kitchen');
      if (stations) client.stations = stations;
    }
    
    console.log(`👨‍🍳 Client ${socket.id} subscribed to kitchen ${tenantId}`);
    
    // Send current kitchen status
    this.sendKitchenStatus(socket, tenantId);
  }

  // Handle analytics subscription
  handleAnalyticsSubscription(socket, data) {
    const { tenantId, reportTypes } = data;
    
    if (!tenantId) {
      socket.emit('error', { message: 'Tenant ID is required' });
      return;
    }
    
    // Join analytics room
    socket.join(`analytics-${tenantId}`);
    
    // Update client subscriptions
    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.subscriptions.push('analytics');
      if (reportTypes) client.reportTypes = reportTypes;
    }
    
    console.log(`📊 Client ${socket.id} subscribed to analytics ${tenantId}`);
    
    // Send current analytics data
    this.sendCurrentAnalytics(socket, tenantId);
  }

  // Handle table subscription
  handleTableSubscription(socket, data) {
    const { tenantId, tableIds } = data;
    
    if (!tenantId) {
      socket.emit('error', { message: 'Tenant ID is required' });
      return;
    }
    
    // Join tables room
    socket.join(`tables-${tenantId}`);
    
    // Join specific table rooms if provided
    if (Array.isArray(tableIds)) {
      tableIds.forEach(tableId => {
        socket.join(`table-${tenantId}-${tableId}`);
      });
    }
    
    // Update client subscriptions
    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.subscriptions.push('tables');
      if (tableIds) client.tableIds = tableIds;
    }
    
    console.log(`🪑 Client ${socket.id} subscribed to tables ${tenantId}`);
    
    // Send current table status
    this.sendTableStatus(socket, tenantId);
  }

  // Handle transaction updates
  async handleTransactionUpdate(socket, data) {
    const { tenantId, transaction } = data;
    
    try {
      // Broadcast to all tenant clients
      this.io.to(`tenant-${tenantId}`).emit('new-transaction', {
        transaction,
        timestamp: new Date(),
        updatedBy: socket.id
      });
      
      // Create live transaction in MongoDB
      await mongoConnection.createLiveTransaction({
        tenantId: tenantId,
        transactionId: transaction.id,
        amount: transaction.totalAmount,
        paymentMethod: transaction.paymentMethod,
        tableNumber: transaction.tableNumber,
        status: transaction.status
      });
      
      // Update analytics in real-time
      await this.updateRealTimeAnalytics(tenantId, transaction);
      
    } catch (error) {
      console.error('Error handling transaction update:', error);
      socket.emit('error', { message: 'Failed to process transaction update' });
    }
  }

  // Handle kitchen status updates
  async handleKitchenStatusUpdate(socket, data) {
    const { tenantId, orderId, status, itemId, station } = data;
    
    try {
      // Update in MongoDB
      const updatedOrder = await mongoConnection.updateKitchenOrderStatus(
        orderId,
        status,
        itemId,
        socket.id
      );
      
      // Broadcast to kitchen displays
      this.io.to(`kitchen-${tenantId}`).emit('kitchen-order-updated', {
        orderId,
        status,
        itemId,
        station,
        updatedOrder,
        timestamp: new Date(),
        updatedBy: socket.id
      });
      
      // Broadcast to specific station
      if (station) {
        this.io.to(`kitchen-station-${tenantId}-${station}`).emit('station-order-updated', {
          orderId,
          status,
          itemId,
          timestamp: new Date()
        });
      }
      
      // If order is ready, notify waiters
      if (status === 'ready') {
        this.io.to(`tenant-${tenantId}`).emit('order-ready', {
          orderId,
          tableNumber: updatedOrder.table_number,
          items: updatedOrder.items.filter(item => item.status === 'ready'),
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      console.error('Error handling kitchen status update:', error);
      socket.emit('error', { message: 'Failed to update kitchen status' });
    }
  }

  // Handle table status updates
  async handleTableStatusUpdate(socket, data) {
    const { tenantId, tableId, status, orderId } = data;
    
    try {
      // Update in PostgreSQL
      await postgresConnection.query(`
        UPDATE tables 
        SET status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2 AND tenant_id = $3
      `, [status, tableId, tenantId]);
      
      // Broadcast to all table clients
      this.io.to(`tables-${tenantId}`).emit('table-status-changed', {
        tableId,
        status,
        orderId,
        timestamp: new Date(),
        updatedBy: socket.id
      });
      
      // Broadcast to specific table room
      this.io.to(`table-${tenantId}-${tableId}`).emit('table-update', {
        tableId,
        status,
        orderId,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('Error handling table status update:', error);
      socket.emit('error', { message: 'Failed to update table status' });
    }
  }

  // Handle client disconnection
  handleDisconnection(socket) {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    
    const client = this.connectedClients.get(socket.id);
    if (client) {
      // Remove from tenant room
      const tenantRoom = this.tenantRooms.get(client.tenantId);
      if (tenantRoom) {
        tenantRoom.delete(socket.id);
        if (tenantRoom.size === 0) {
          this.tenantRooms.delete(client.tenantId);
        }
      }
      
      // Remove from connected clients
      this.connectedClients.delete(socket.id);
    }
  }

  // Set up MongoDB change stream listeners
  async setupMongoDBListeners() {
    // Kitchen orders changes
    mongoConnection.on('kitchen-order-change', async (change) => {
      const { document, tenantId } = change;
      
      if (!tenantId) return;
      
      // Broadcast to kitchen displays
      this.io.to(`kitchen-${tenantId}`).emit('kitchen-order-change', {
        operationType: change.operationType,
        document: document,
        timestamp: new Date()
      });
      
      // If it's a new order, notify all tenant clients
      if (change.operationType === 'insert') {
        this.io.to(`tenant-${tenantId}`).emit('new-kitchen-order', {
          order: document,
          timestamp: new Date()
        });
      }
    });
    
    // Transaction changes
    mongoConnection.on('transaction-change', (change) => {
      const { document, tenantId } = change;
      
      if (!tenantId) return;
      
      // Broadcast to analytics clients
      this.io.to(`analytics-${tenantId}`).emit('transaction-change', {
        transaction: document,
        timestamp: new Date()
      });
    });
    
    // Inventory alerts
    mongoConnection.on('inventory-alert-change', (change) => {
      const { document, tenantId } = change;
      
      if (!tenantId) return;
      
      // Broadcast to all tenant clients
      this.io.to(`tenant-${tenantId}`).emit('inventory-alert', {
        alert: document,
        timestamp: new Date()
      });
    });
  }

  // Set up PostgreSQL listeners (requires pglogical extension)
  async setupPostgreSQLListeners() {
    try {
      // This would require pglogical extension setup
      // For now, we'll rely on application-level triggers
      console.log('📡 PostgreSQL listeners setup (requires pglogical extension)');
    } catch (error) {
      console.log('⚠️  PostgreSQL listeners not available:', error.message);
    }
  }

  // Send current kitchen status to a socket
  async sendKitchenStatus(socket, tenantId) {
    try {
      const kitchenStatus = await mongoConnection.getKitchenStatus(tenantId);
      socket.emit('kitchen-status', {
        tenantId,
        stations: kitchenStatus,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending kitchen status:', error);
    }
  }

  // Send current analytics data to a socket
  async sendCurrentAnalytics(socket, tenantId) {
    try {
      // Get today's sales summary
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const salesSummary = await postgresConnection.getDailySalesSummary(tenantId, today);
      
      socket.emit('analytics-data', {
        tenantId,
        salesSummary: salesSummary || {
          transaction_count: 0,
          total_revenue: 0,
          avg_order_value: 0
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending analytics data:', error);
    }
  }

  // Send current table status to a socket
  async sendTableStatus(socket, tenantId) {
    try {
      const tables = await postgresConnection.query(`
        SELECT id, table_number, status, capacity, location
        FROM tables 
        WHERE tenant_id = $1 AND is_active = true
        ORDER BY table_number
      `, [tenantId]);
      
      socket.emit('table-status', {
        tenantId,
        tables: tables.rows,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending table status:', error);
    }
  }

  // Update real-time analytics
  async updateRealTimeAnalytics(tenantId, transaction) {
    try {
      // Generate hourly sales performance
      await mongoConnection.generateHourlySalesPerformance(tenantId, new Date());
      
      // Create analytics snapshot for significant transactions
      if (transaction.totalAmount > 100) { // Threshold for "significant"
        await mongoConnection.createAnalyticsSnapshot({
          tenantId: tenantId,
          reportType: 'transaction',
          date: new Date(),
          data: {
            transaction: transaction,
            trigger: 'high_value_transaction'
          },
          generatedBy: 'real_time_system'
        });
      }
      
    } catch (error) {
      console.error('Error updating real-time analytics:', error);
    }
  }

  // Broadcast notification to tenant
  broadcastNotification(tenantId, notification) {
    this.io.to(`tenant-${tenantId}`).emit('notification', {
      ...notification,
      timestamp: new Date()
    });
  }

  // Broadcast inventory alert
  broadcastInventoryAlert(tenantId, alert) {
    this.io.to(`tenant-${tenantId}`).emit('inventory-alert', {
      ...alert,
      timestamp: new Date()
    });
  }

  // Get connection statistics
  getConnectionStats() {
    const stats = {
      totalConnections: this.connectedClients.size,
      tenants: this.tenantRooms.size,
      tenantBreakdown: {}
    };
    
    // Breakdown by tenant
    for (const [tenantId, clients] of this.tenantRooms) {
      stats.tenantBreakdown[tenantId] = clients.size;
    }
    
    return stats;
  }

  // Health check
  async healthCheck() {
    return {
      service: 'real-time-sync',
      status: 'healthy',
      timestamp: new Date(),
      connections: this.getConnectionStats(),
      mongoConnection: await mongoConnection.healthCheck(),
      postgresConnection: await postgresConnection.healthCheck()
    };
  }
}

module.exports = RealTimeSyncService;