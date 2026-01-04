// Sync configuration for PharmaMine Web Application
const winston = require('winston');

// Sync configuration
const syncConfig = {
  // Sync intervals (in milliseconds)
  syncInterval: process.env.SYNC_INTERVAL || 30000, // 30 seconds
  retryInterval: process.env.RETRY_INTERVAL || 5000,  // 5 seconds
  maxRetries: process.env.MAX_RETRIES || 3,
  
  // Conflict resolution strategy
  conflictResolution: {
    strategy: process.env.CONFLICT_STRATEGY || 'timestamp', // 'timestamp', 'manual', 'overwrite'
    preferSource: process.env.PREFERRED_SOURCE || 'postgres', // 'postgres' or 'nedb'
    timestampField: 'updated_at'
  },
  
  // Sync scope
  tables: [
    'products',
    'categories', 
    'customers',
    'transactions',
    'inventory_matrix',
    'gift_receipts',
    'gift_cards',
    'gift_bundles',
    'users',
    'settings',
    'suppliers',
    'purchase_orders'
  ],
  
  // Batch processing
  batchSize: process.env.BATCH_SIZE || 100,
  parallelBatches: process.env.PARALLEL_BATCHES || 3,
  
  // Change detection
  changeDetection: {
    enabled: true,
    method: 'timestamp', // 'timestamp' or 'trigger'
    timestampField: 'updated_at'
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logChanges: true,
    logConflicts: true,
    logPerformance: true
  }
};

// NeDB connection configuration (for desktop app sync)
const nedbConfig = {
  host: process.env.NEDB_HOST || 'localhost',
  port: process.env.NEDB_PORT || 49499, // Default PharmaMine port
  path: process.env.NEDB_PATH || './data/databases', // Default NeDB path
  collections: [
    'inventory.db',
    'categories.db',
    'customers.db',
    'transactions.db',
    'inventory_matrix.db',
    'gift_store.db',
    'users.db',
    'settings.db',
    'suppliers.db',
    'purchase_orders.db'
  ]
};

// PostgreSQL connection configuration
const postgresConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'garmentpos',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
};

// Sync status tracking
const syncStatus = {
  isRunning: false,
  lastSync: null,
  nextSync: null,
  syncErrors: [],
  conflicts: [],
  performance: {
    lastSyncDuration: 0,
    averageSyncDuration: 0,
    totalRecordsSynced: 0,
    syncHistory: []
  }
};

// Sync statistics
const syncStats = {
  totalChanges: 0,
  processedChanges: 0,
  conflictsResolved: 0,
  errors: 0,
  startTime: null,
  endTime: null
};

// Logger configuration
const syncLogger = winston.createLogger({
  level: syncConfig.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'sync-engine' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/sync-error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/sync.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Sync performance metrics
const performanceMetrics = {
  startTimer: function(operation) {
    return {
      operation,
      startTime: Date.now(),
      end: () => {
        const duration = Date.now() - this.startTime;
        syncLogger.debug('Performance metric', {
          operation: this.operation,
          duration
        });
        return duration;
      }
    };
  },
  
  updateSyncStats: function(duration, recordsProcessed) {
    syncStatus.performance.lastSyncDuration = duration;
    syncStatus.performance.totalRecordsSynced += recordsProcessed;
    syncStatus.performance.syncHistory.push({
      timestamp: new Date().toISOString(),
      duration,
      records: recordsProcessed
    });
    
    // Keep only last 100 sync operations
    if (syncStatus.performance.syncHistory.length > 100) {
      syncStatus.performance.syncHistory = syncStatus.performance.syncHistory.slice(-100);
    }
    
    // Calculate average sync duration
    const totalDuration = syncStatus.performance.syncHistory.reduce((sum, entry) => sum + entry.duration, 0);
    syncStatus.performance.averageSyncDuration = totalDuration / syncStatus.performance.syncHistory.length;
  }
};

// Conflict resolution strategies
const conflictStrategies = {
  // Timestamp-based resolution (newer wins)
  timestamp: async function(localRecord, remoteRecord, tableName) {
    const localTime = new Date(localRecord[syncConfig.conflictResolution.timestampField]);
    const remoteTime = new Date(remoteRecord[syncConfig.conflictResolution.timestampField]);
    
    if (remoteTime > localTime) {
      return { resolved: true, winner: 'remote', record: remoteRecord };
    } else {
      return { resolved: true, winner: 'local', record: localRecord };
    }
  },
  
  // Manual resolution (requires user intervention)
  manual: async function(localRecord, remoteRecord, tableName) {
    const conflict = {
      table: tableName,
      localRecord,
      remoteRecord,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    syncStatus.conflicts.push(conflict);
    syncLogger.warn('Manual conflict detected', conflict);
    
    return { resolved: false, conflict };
  },
  
  // Overwrite strategy (always prefer one source)
  overwrite: async function(localRecord, remoteRecord, tableName) {
    const preferredSource = syncConfig.conflictResolution.preferSource;
    
    if (preferredSource === 'postgres') {
      return { resolved: true, winner: 'remote', record: remoteRecord };
    } else {
      return { resolved: true, winner: 'local', record: localRecord };
    }
  }
};

// Sync validation rules
const validationRules = {
  // Required fields for each table
  requiredFields: {
    products: ['name', 'price'],
    categories: ['name'],
    customers: ['name'],
    transactions: ['order_number', 'total'],
    users: ['username', 'fullname'],
    settings: ['store_name']
  },
  
  // Data type validation
  validateRecord: function(tableName, record) {
    const required = this.requiredFields[tableName] || [];
    const missing = required.filter(field => !record[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    // Additional table-specific validation
    switch (tableName) {
      case 'products':
        if (record.price < 0) throw new Error('Price cannot be negative');
        if (record.quantity < 0) throw new Error('Quantity cannot be negative');
        break;
      case 'customers':
        if (record.loyalty_points < 0) throw new Error('Loyalty points cannot be negative');
        break;
      case 'transactions':
        if (record.total < 0) throw new Error('Total cannot be negative');
        break;
    }
    
    return true;
  }
};

// Export configuration and utilities
module.exports = {
  syncConfig,
  nedbConfig,
  postgresConfig,
  syncStatus,
  syncStats,
  syncLogger,
  performanceMetrics,
  conflictStrategies,
  validationRules
};
