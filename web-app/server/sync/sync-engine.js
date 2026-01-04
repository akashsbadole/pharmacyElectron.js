const axios = require('axios');
const database = require('../config/database');
const { syncConfig, nedbConfig, postgresConfig, syncStatus, syncStats, syncLogger, performanceMetrics, conflictStrategies, validationRules } = require('../config/sync');

// Get database type from database module
const getDbType = () => {
  // Database type is stored in the database module
  // For now, we'll check environment variable
  return process.env.DB_TYPE || 'sqlite';
};

// Sync engine class
class SyncEngine {
  constructor() {
    this.isRunning = false;
    this.syncTimer = null;
    this.retryCount = 0;
    this.lastSyncTime = null;
  }

  // Initialize sync engine
  async initialize() {
    try {
      syncLogger.info('Initializing sync engine');
      
      // Create sync log table if it doesn't exist
      await this.createSyncLogTable();
      
      // Start periodic sync
      this.startPeriodicSync();
      
      this.isRunning = true;
      syncLogger.info('Sync engine initialized successfully');
      
      return true;
    } catch (error) {
      syncLogger.error('Failed to initialize sync engine', { error: error.message });
      throw error;
    }
  }

  // Create sync log table (only if needed - table is created in database.js)
  async createSyncLogTable() {
    try {
      // Check if table exists first
      const exists = await database.tableExists('sync_log');

      if (!exists) {
        // Table creation is handled by database.js initialization
        syncLogger.info('Sync log table will be created by database initialization');
      } else {
        syncLogger.info('Sync log table already exists');
      }
    } catch (error) {
      syncLogger.warn('Could not verify sync log table existence', { error: error.message });
    }
  }

  // Start periodic sync
  startPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      if (this.isRunning) {
        await this.performSync();
      }
    }, syncConfig.syncInterval);

    syncLogger.info('Periodic sync started', { interval: syncConfig.syncInterval });
  }

  // Stop periodic sync
  stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      syncLogger.info('Periodic sync stopped');
    }
  }

  // Perform sync operation
  async performSync() {
    const timer = performanceMetrics.startTimer('sync-operation');
    
    try {
      syncLogger.info('Starting sync operation');
      syncStats.startTime = new Date();
      syncStats.totalChanges = 0;
      syncStats.processedChanges = 0;
      syncStats.conflictsResolved = 0;
      syncStats.errors = 0;

      // Get changes from NeDB (desktop app)
      const nedbChanges = await this.getNeDBChanges();
      syncStats.totalChanges += nedbChanges.length;

      // Get changes from PostgreSQL (web app)
      const postgresChanges = await this.getPostgresChanges();
      syncStats.totalChanges += postgresChanges.length;

      // Process changes
      if (nedbChanges.length > 0) {
        await this.processNeDBChanges(nedbChanges);
      }

      if (postgresChanges.length > 0) {
        await this.processPostgresChanges(postgresChanges);
      }

      // Update sync status
      this.lastSyncTime = new Date();
      syncStatus.lastSync = this.lastSyncTime;
      syncStatus.nextSync = new Date(Date.now() + syncConfig.syncInterval);

      const duration = timer.end();
      performanceMetrics.updateSyncStats(duration, syncStats.processedChanges);

      syncLogger.info('Sync operation completed', {
        duration,
        changes: syncStats.totalChanges,
        processed: syncStats.processedChanges,
        conflicts: syncStats.conflictsResolved,
        errors: syncStats.errors
      });

      this.retryCount = 0; // Reset retry count on success

    } catch (error) {
      syncLogger.error('Sync operation failed', { error: error.message });
      syncStats.errors++;
      
      // Increment retry count
      this.retryCount++;
      
      if (this.retryCount >= syncConfig.maxRetries) {
        syncLogger.error('Max sync retries exceeded, stopping sync engine');
        this.stop();
      }
    }
  }

// Get changes from NeDB (desktop app)
  async getNeDBChanges() {
    try {
      // For direct NeDB file access, we need to read from the database files
      // Since we can't directly access NeDB files from the web app, we'll use a different approach
      
      // Option 1: Check if there's a sync API available (existing approach)
      try {
        const response = await axios.get(`http://${nedbConfig.host}:${nedbConfig.port}/api/sync/changes`, {
          timeout: 5000
        });
        
        if (response.data && response.data.changes) {
          syncLogger.info('Successfully retrieved changes from NeDB API', { count: response.data.changes.length });
          return response.data.changes;
        }
      } catch (apiError) {
        syncLogger.warn('NeDB API not available, attempting direct file access', { error: apiError.message });
      }

      // Option 2: If API is not available, we need to implement a different sync mechanism
      // For now, return empty array and log the issue
      syncLogger.warn('NeDB synchronization requires desktop application to be running with sync API enabled');
      syncLogger.warn('Please ensure the desktop PharmaMine application is running and accessible at', 
        `http://${nedbConfig.host}:${nedbConfig.port}`);
      
      return [];
    } catch (error) {
      syncLogger.error('Failed to get changes from NeDB', { error: error.message });
      return [];
    }
  }

  // Get changes from database (web app)
  async getPostgresChanges() {
    try {
      const since = syncStatus.lastSync ? syncStatus.lastSync.toISOString() : '1970-01-01T00:00:00Z';

      let query;
      let params;

      if (getDbType() === 'postgres') {
        query = `
          SELECT table_name, record_id, operation, data, created_at as timestamp, source
          FROM sync_log
          WHERE created_at > $1 AND synced = false
          ORDER BY created_at
        `;
        params = [since];
      } else {
        query = `
          SELECT table_name, record_id, operation, data, created_at as timestamp, source
          FROM sync_log
          WHERE created_at > ? AND synced = 0
          ORDER BY created_at
        `;
        params = [since];
      }

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      syncLogger.error('Failed to get changes from database', { error: error.message });
      return [];
    }
  }

  // Process NeDB changes
  async processNeDBChanges(changes) {
    for (const change of changes) {
      try {
        await this.processChange(change, 'nedb');
        syncStats.processedChanges++;
      } catch (error) {
        syncLogger.error('Failed to process NeDB change', { 
          change, 
          error: error.message 
        });
        syncStats.errors++;
      }
    }
  }

  // Process PostgreSQL changes
  async processPostgresChanges(changes) {
    for (const change of changes) {
      try {
        await this.processChange(change, 'postgres');
        syncStats.processedChanges++;
        
        // Mark as synced
        const syncedValue = getDbType() === 'postgres' ? true : 1;
        if (getDbType() === 'postgres') {
          await database.query(
            'UPDATE sync_log SET synced = $1 WHERE id = $2',
            [syncedValue, change.id]
          );
        } else {
          await database.query(
            'UPDATE sync_log SET synced = ? WHERE id = ?',
            [syncedValue, change.id]
          );
        }
      } catch (error) {
        syncLogger.error('Failed to process PostgreSQL change', { 
          change, 
          error: error.message 
        });
        syncStats.errors++;
      }
    }
  }

  // Process individual change
  async processChange(change, source) {
    const { table_name, record_id, operation, data } = change;
    
    try {
      // Validate record
      validationRules.validateRecord(table_name, data);

      // Check for conflicts
      const conflict = await this.checkForConflict(table_name, record_id, data, source);
      
      if (conflict) {
        await this.resolveConflict(table_name, record_id, data, conflict, source);
      } else {
        // Apply change
        await this.applyChange(table_name, record_id, operation, data, source);
      }

    } catch (error) {
      syncLogger.error('Error processing change', { 
        change, 
        source, 
        error: error.message 
      });
      throw error;
    }
  }

  // Check for conflicts
  async checkForConflict(tableName, recordId, newData, source) {
    try {
      // Get current record from target database
      const targetDB = source === 'nedb' ? 'postgres' : 'nedb';
      
      let currentRecord;
      if (getDbType() === 'postgres') {
        const result = await database.query(
          `SELECT * FROM ${tableName} WHERE id = $1`,
          [recordId]
        );
        currentRecord = result.rows[0];
      } else {
        // For NeDB, we would need to make an API call
        const response = await axios.get(
          `http://${nedbConfig.host}:${nedbConfig.port}/api/${tableName}/${recordId}`
        );
        currentRecord = response.data;
      }

      if (!currentRecord) {
        return null; // No conflict, record doesn't exist
      }

      // Check if there are actual differences
      const currentData = this.serializeRecord(currentRecord);
      const newDataSerialized = this.serializeRecord(newData);

      if (JSON.stringify(currentData) === JSON.stringify(newDataSerialized)) {
        return null; // No conflict, data is the same
      }

      return {
        source: targetDB,
        record: currentRecord,
        differences: this.getDifference(currentData, newDataSerialized)
      };

    } catch (error) {
      syncLogger.error('Error checking for conflict', { 
        tableName, 
        recordId, 
        error: error.message 
      });
      return null;
    }
  }

  // Resolve conflict using configured strategy
  async resolveConflict(tableName, recordId, newData, conflict, source) {
    const strategy = syncConfig.conflictResolution.strategy;
    
    try {
      let resolution;
      
      switch (strategy) {
        case 'timestamp':
          resolution = await conflictStrategies.timestamp(
            conflict.record, 
            newData, 
            tableName
          );
          break;
        case 'manual':
          resolution = await conflictStrategies.manual(
            conflict.record, 
            newData, 
            tableName
          );
          break;
        case 'overwrite':
          resolution = await conflictStrategies.overwrite(
            conflict.record, 
            newData, 
            tableName
          );
          break;
        default:
          throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
      }

      if (resolution.resolved) {
        // Apply the resolved record
        await this.applyChange(
          tableName, 
          recordId, 
          'UPDATE', 
          resolution.record, 
          resolution.winner
        );
        
        syncStats.conflictsResolved++;
        syncLogger.info('Conflict resolved', {
          table: tableName,
          recordId,
          strategy,
          winner: resolution.winner
        });
      } else {
        // Manual resolution required
        syncLogger.warn('Manual conflict resolution required', {
          table: tableName,
          recordId,
          conflict: resolution.conflict
        });
      }

    } catch (error) {
      syncLogger.error('Error resolving conflict', { 
        tableName, 
        recordId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Apply change to database
  async applyChange(tableName, recordId, operation, data, source) {
    try {
      switch (operation) {
        case 'INSERT':
          await this.insertRecord(tableName, data, source);
          break;
        case 'UPDATE':
          await this.updateRecord(tableName, recordId, data, source);
          break;
        case 'DELETE':
          await this.deleteRecord(tableName, recordId, source);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      // Log the sync operation
      await this.logSyncOperation(tableName, recordId, operation, data, source);

    } catch (error) {
      syncLogger.error('Error applying change', { 
        tableName, 
        recordId, 
        operation, 
        error: error.message 
      });
      throw error;
    }
  }

  // Insert record
  async insertRecord(tableName, data, source) {
    // Use the database utility function which handles both PostgreSQL and SQLite
    await database.insertWithConflict(tableName, data, ['id']);
  }

  // Update record
  async updateRecord(tableName, recordId, data, source) {
    // Add updated_at timestamp
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };

    const columns = Object.keys(updateData);
    const values = Object.values(updateData);

    let query;
    if (getDbType() === 'postgres') {
      query = `
        UPDATE ${tableName} SET
          ${columns.map((col, i) => `"${col}" = ${i + 1}`).join(', ')}
        WHERE id = ${columns.length + 1}
      `;
    } else {
      query = `
        UPDATE ${tableName} SET
          ${columns.map((col, i) => `"${col}" = ?`).join(', ')}
        WHERE id = ?
      `;
    }

    await database.query(query, [...values, recordId]);
  }

  // Delete record
  async deleteRecord(tableName, recordId, source) {
    const deletedAt = new Date().toISOString();
    if (getDbType() === 'postgres') {
      await database.query(`UPDATE ${tableName} SET deleted_at = $1 WHERE id = $2`, [deletedAt, recordId]);
    } else {
      await database.query(`UPDATE ${tableName} SET deleted_at = ? WHERE id = ?`, [deletedAt, recordId]);
    }
  }

  // Log sync operation
  async logSyncOperation(tableName, recordId, operation, data, source) {
    const synced = getDbType() === 'postgres' ? true : 1; // PostgreSQL uses boolean, SQLite uses integer
    if (getDbType() === 'postgres') {
      await database.query(
        `INSERT INTO sync_log (table_name, record_id, operation, data, source, synced)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tableName, recordId, operation, JSON.stringify(data), source, synced]
      );
    } else {
      await database.query(
        `INSERT INTO sync_log (table_name, record_id, operation, data, source, synced)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tableName, recordId, operation, JSON.stringify(data), source, synced]
      );
    }
  }

  // Utility functions
  serializeRecord(record) {
    const serialized = { ...record };
    // Convert dates to ISO strings
    Object.keys(serialized).forEach(key => {
      if (serialized[key] instanceof Date) {
        serialized[key] = serialized[key].toISOString();
      }
    });
    return serialized;
  }

  getDifference(obj1, obj2) {
    const diff = {};
    const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    
    keys.forEach(key => {
      if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        diff[key] = { old: obj1[key], new: obj2[key] };
      }
    });
    
    return diff;
  }

  // Start sync engine
  async start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.startPeriodicSync();
      syncLogger.info('Sync engine started');
    }
  }

  // Stop sync engine
  async stop() {
    this.isRunning = false;
    this.stopPeriodicSync();
    syncLogger.info('Sync engine stopped');
  }

  // Get sync status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSync: this.lastSyncTime,
      nextSync: syncStatus.nextSync,
      syncErrors: syncStatus.syncErrors,
      conflicts: syncStatus.conflicts,
      performance: syncStatus.performance,
      stats: syncStats
    };
  }

  // Manual sync trigger
  async triggerSync() {
    if (this.isRunning) {
      await this.performSync();
      return this.getStatus();
    } else {
      throw new Error('Sync engine is not running');
    }
  }
}

// Export singleton instance
module.exports = new SyncEngine();
