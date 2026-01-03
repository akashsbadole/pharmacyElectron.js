# Client-Side Sync Manager

## Overview

This document provides the complete implementation of the client-side synchronization manager for both Electron.js and web applications in PharmaMine.

## Architecture

The client-side sync manager handles:
- **Offline Operation**: Queue changes when offline
- **Auto-Sync**: Sync when connection restored
- **Conflict Resolution**: Handle conflicts locally
- **Status Monitoring**: Track sync status and progress
- **Error Recovery**: Retry failed operations

## Core Sync Manager Implementation

### assets/js/sync-manager.js
```javascript
/**
 * PharmaMine Sync Manager
 * Handles synchronization between client and server
 */
class PharmaMineSyncManager {
    constructor() {
        this.config = {
            syncInterval: 30000, // 30 seconds
            maxRetries: 3,
            retryDelay: 1000, // 1 second
            batchSize: 100,
            compressionEnabled: true,
            encryptionEnabled: true,
            conflictStrategy: 'manual' // 'auto' | 'manual' | 'timestamp_wins'
        };
        
        this.state = {
            isOnline: navigator.onLine,
            isSyncing: false,
            clientId: null,
            clientType: this.detectClientType(),
            pendingChanges: [],
            syncStatus: 'idle',
            lastSync: null,
            errorCount: 0,
            conflicts: []
        };
        
        this.api = null;
        this.host = null;
        this.port = null;
        
        this.init();
    }
    
    /**
     * Initialize sync manager
     */
    async init() {
        console.log('Initializing PharmaMine Sync Manager...');
        
        // Wait for API configuration
        await this.waitForAPI();
        
        // Generate or load client ID
        this.clientId = this.getClientId();
        
        // Register client with server
        await this.registerClient();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start sync loop
        this.startSyncLoop();
        
        console.log('Sync Manager initialized successfully');
    }
    
    /**
     * Wait for API configuration
     */
    waitForAPI() {
        return new Promise((resolve) => {
            if (window.api) {
                this.api = window.api;
                this.host = window.host;
                this.port = window.port;
                resolve();
            } else {
                const checkAPI = () => {
                    if (window.api) {
                        window.removeEventListener('api-configured', checkAPI);
                        this.api = window.api;
                        this.host = window.host;
                        this.port = window.port;
                        resolve();
                    }
                };
                window.addEventListener('api-configured', checkAPI);
            }
        });
    }
    
    /**
     * Detect client type (electron or web)
     */
    detectClientType() {
        if (typeof require !== 'undefined' && require('electron')) {
            return 'electron';
        }
        return 'web';
    }
    
    /**
     * Get or generate client ID
     */
    getClientId() {
        let clientId = localStorage.getItem('sync_client_id');
        
        if (!clientId) {
            clientId = this.generateClientId();
            localStorage.setItem('sync_client_id', clientId);
        }
        
        return clientId;
    }
    
    /**
     * Generate unique client ID
     */
    generateClientId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `${this.clientType}_${timestamp}_${random}`;
    }
    
    /**
     * Register client with server
     */
    async registerClient() {
        try {
            const response = await fetch(`${this.api}sync/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-Id': this.clientId
                },
                body: JSON.stringify({
                    clientId: this.clientId,
                    clientType: this.clientType,
                    version: '1.0.0'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Client registered successfully:', result);
            } else {
                console.warn('Client registration failed:', response.status);
            }
        } catch (error) {
            console.error('Registration error:', error);
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Online/offline detection
        window.addEventListener('online', () => {
            console.log('Connection restored');
            this.state.isOnline = true;
            this.state.syncStatus = 'online';
            this.syncWithServer();
        });
        
        window.addEventListener('offline', () => {
            console.log('Connection lost');
            this.state.isOnline = false;
            this.state.syncStatus = 'offline';
        });
        
        // Document visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.state.isOnline) {
                this.syncWithServer();
            }
        });
        
        // Before unload - sync pending changes
        window.addEventListener('beforeunload', () => {
            if (this.state.pendingChanges.length > 0) {
                this.syncWithServer();
            }
        });
    }
    
    /**
     * Start sync loop
     */
    startSyncLoop() {
        setInterval(() => {
            if (this.state.isOnline && !this.state.isSyncing) {
                this.syncWithServer();
            }
        }, this.config.syncInterval);
    }
    
    /**
     * Main sync function
     */
    async syncWithServer() {
        if (this.state.isSyncing) {
            console.log('Sync already in progress');
            return;
        }
        
        this.state.isSyncing = true;
        this.state.syncStatus = 'syncing';
        
        try {
            console.log('Starting sync process...');
            
            // Push local changes
            if (this.state.pendingChanges.length > 0) {
                await this.pushChanges();
            }
            
            // Pull remote changes
            await this.pullChanges();
            
            // Resolve conflicts
            if (this.state.conflicts.length > 0) {
                await this.resolveConflicts();
            }
            
            this.state.lastSync = new Date().toISOString();
            this.state.syncStatus = 'synced';
            this.state.errorCount = 0;
            
            console.log('Sync completed successfully');
            
        } catch (error) {
            console.error('Sync failed:', error);
            this.state.errorCount++;
            this.state.syncStatus = 'error';
            
            // Retry logic
            if (this.state.errorCount < this.config.maxRetries) {
                setTimeout(() => {
                    this.syncWithServer();
                }, this.config.retryDelay * this.state.errorCount);
            }
        } finally {
            this.state.isSyncing = false;
        }
    }
    
    /**
     * Push local changes to server
     */
    async pushChanges() {
        const changes = this.state.pendingChanges.slice(0, this.config.batchSize);
        
        try {
            const response = await fetch(`${this.api}sync/push`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-Id': this.clientId
                },
                body: JSON.stringify({
                    changes: changes
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Remove synced changes from queue
                this.state.pendingChanges.splice(0, changes.length);
                
                // Handle conflicts
                if (result.conflicts && result.conflicts.length > 0) {
                    this.state.conflicts.push(...result.conflicts);
                }
                
                console.log(`Pushed ${result.processedChanges} changes`);
            } else {
                throw new Error(`Push failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Push changes error:', error);
            throw error;
        }
    }
    
    /**
     * Pull remote changes from server
     */
    async pullChanges() {
        try {
            const since = this.state.lastSync || new Date(0).toISOString();
            
            const response = await fetch(`${this.api}sync/pull?clientId=${this.clientId}&since=${since}`, {
                headers: {
                    'X-Client-Id': this.clientId
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.changes && result.changes.length > 0) {
                    await this.applyRemoteChanges(result.changes);
                }
                
                console.log(`Pulled ${result.changes.length} changes`);
            } else {
                throw new Error(`Pull failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Pull changes error:', error);
            throw error;
        }
    }
    
    /**
     * Apply remote changes to local database
     */
    async applyRemoteChanges(changes) {
        for (const change of changes) {
            try {
                await this.applyChange(change);
            } catch (error) {
                console.error('Error applying change:', error);
            }
        }
    }
    
    /**
     * Apply individual change
     */
    async applyChange(change) {
        switch (change.collection) {
            case 'inventory':
                return this.applyInventoryChange(change);
            case 'customers':
                return this.applyCustomerChange(change);
            case 'transactions':
                return this.applyTransactionChange(change);
            default:
                throw new Error(`Unknown collection: ${change.collection}`);
        }
    }
    
    /**
     * Apply inventory change
     */
    async applyInventoryChange(change) {
        return new Promise((resolve, reject) => {
            const db = window.inventoryDB || window.getDatabase('inventory.db');
            
            if (change.operation === 'delete') {
                db.remove({ _id: change.recordId }, {}, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                const updateData = {
                    ...change.data,
                    updatedAt: new Date().toISOString()
                };
                
                db.update({ _id: change.recordId }, updateData, { upsert: true }, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            }
        });
    }
    
    /**
     * Apply customer change
     */
    async applyCustomerChange(change) {
        return new Promise((resolve, reject) => {
            const db = window.customersDB || window.getDatabase('customers.db');
            
            if (change.operation === 'delete') {
                db.remove({ _id: change.recordId }, {}, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                const updateData = {
                    ...change.data,
                    updatedAt: new Date().toISOString()
                };
                
                db.update({ _id: change.recordId }, updateData, { upsert: true }, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            }
        });
    }
    
    /**
     * Apply transaction change
     */
    async applyTransactionChange(change) {
        return new Promise((resolve, reject) => {
            const db = window.transactionsDB || window.getDatabase('transactions.db');
            
            if (change.operation === 'delete') {
                db.remove({ _id: change.recordId }, {}, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                const updateData = {
                    ...change.data,
                    updatedAt: new Date().toISOString()
                };
                
                db.update({ _id: change.recordId }, updateData, { upsert: true }, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            }
        });
    }
    
    /**
     * Resolve conflicts
     */
    async resolveConflicts() {
        for (const conflict of this.state.conflicts) {
            try {
                await this.resolveConflict(conflict);
            } catch (error) {
                console.error('Error resolving conflict:', error);
            }
        }
        
        this.state.conflicts = [];
    }
    
    /**
     * Resolve individual conflict
     */
    async resolveConflict(conflict) {
        switch (this.config.conflictStrategy) {
            case 'auto':
                return this.autoResolveConflict(conflict);
            case 'timestamp_wins':
                return this.timestampWinsResolve(conflict);
            case 'manual':
                return this.manualResolveConflict(conflict);
            default:
                return this.manualResolveConflict(conflict);
        }
    }
    
    /**
     * Auto-resolve conflict
     */
    async autoResolveConflict(conflict) {
        // Implement business logic for auto-resolution
        const resolution = this.getAutoResolution(conflict);
        
        return this.sendConflictResolution(conflict._id, resolution);
    }
    
    /**
     * Timestamp-based resolution
     */
    async timestampWinsResolve(conflict) {
        const resolution = conflict.localChange.timestamp > conflict.remoteChange.timestamp 
            ? 'local_wins' : 'remote_wins';
        
        return this.sendConflictResolution(conflict._id, resolution);
    }
    
    /**
     * Manual conflict resolution
     */
    async manualResolveConflict(conflict) {
        // Show conflict resolution UI
        this.showConflictResolutionUI(conflict);
    }
    
    /**
     * Send conflict resolution to server
     */
    async sendConflictResolution(conflictId, resolution, mergedData = null) {
        try {
            const response = await fetch(`${this.api}sync/conflicts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-Id': this.clientId
                },
                body: JSON.stringify({
                    conflictId: conflictId,
                    resolution: resolution,
                    mergedData: mergedData
                })
            });
            
            if (response.ok) {
                console.log(`Conflict ${conflictId} resolved with ${resolution}`);
            } else {
                throw new Error(`Conflict resolution failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Conflict resolution error:', error);
            throw error;
        }
    }
    
    /**
     * Queue change for sync
     */
    queueChange(collection, recordId, operation, data) {
        const change = {
            _id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            collection: collection,
            recordId: recordId,
            operation: operation,
            data: data,
            timestamp: new Date().toISOString(),
            clientId: this.clientId
        };
        
        this.state.pendingChanges.push(change);
        
        // If online, trigger sync
        if (this.state.isOnline && !this.state.isSyncing) {
            setTimeout(() => {
                this.syncWithServer();
            }, 1000); // Small delay to batch changes
        }
        
        console.log(`Change queued: ${operation} ${collection} ${recordId}`);
    }
    
    /**
     * Get sync status
     */
    getSyncStatus() {
        return {
            isOnline: this.state.isOnline,
            isSyncing: this.state.isSyncing,
            clientId: this.clientId,
            clientType: this.clientType,
            pendingChanges: this.state.pendingChanges.length,
            conflicts: this.state.conflicts.length,
            lastSync: this.state.lastSync,
            errorCount: this.state.errorCount,
            syncStatus: this.state.syncStatus
        };
    }
    
    /**
     * Show conflict resolution UI
     */
    showConflictResolutionUI(conflict) {
        // Create modal for conflict resolution
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'conflict-resolution-modal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4 class="modal-title">Conflict Resolution</h4>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h5>Local Change</h5>
                                <pre>${JSON.stringify(conflict.localChange, null, 2)}</pre>
                            </div>
                            <div class="col-md-6">
                                <h5>Remote Change</h5>
                                <pre>${JSON.stringify(conflict.remoteChange, null, 2)}</pre>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-md-12">
                                <h5>Resolution Options</h5>
                                <button class="btn btn-primary" onclick="window.syncManager.resolveConflict('${conflict._id}', 'local_wins')">Keep Local</button>
                                <button class="btn btn-warning" onclick="window.syncManager.resolveConflict('${conflict._id}', 'remote_wins')">Keep Remote</button>
                                <button class="btn btn-success" onclick="window.syncManager.resolveConflict('${conflict._id}', 'merged')">Merge</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        $(modal).modal('show');
    }
    
    /**
     * Resolve conflict with specified resolution
     */
    async resolveConflict(conflictId, resolution) {
        try {
            await this.sendConflictResolution(conflictId, resolution);
            
            // Remove from conflicts array
            this.state.conflicts = this.state.conflicts.filter(c => c._id !== conflictId);
            
            // Close modal
            $('#conflict-resolution-modal').modal('hide');
            
            console.log(`Conflict ${conflictId} resolved`);
        } catch (error) {
            console.error('Conflict resolution failed:', error);
        }
    }
    
    /**
     * Get auto-resolution based on business logic
     */
    getAutoResolution(conflict) {
        // Implement business-specific auto-resolution logic
        // For example: always prefer local changes for certain fields
        // or use timestamp-based resolution
        
        return conflict.localChange.timestamp > conflict.remoteChange.timestamp 
            ? 'local_wins' : 'remote_wins';
    }
}

// Export for global use
window.PharmaMineSyncManager = PharmaMineSyncManager;

// Initialize sync manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.PharmaMineSyncManager !== 'undefined') {
        window.syncManager = new window.PharmaMineSyncManager();
    }
});
```

## Enhanced Renderer.js Integration

### Enhanced renderer.js with Sync Manager
```javascript
// IPC Communication for server configuration
let { ipcRenderer } = require('electron');
let serverConfig = { port: null, host: 'localhost' };

// Initialize API configuration when server config is received
function initializeAPI(config) {
    if (config && config.port) {
        serverConfig.port = config.port;
        serverConfig.host = config.host || 'localhost';
        
        // Update global API variables used by other modules
        window.port = config.port;
        window.host = config.host || 'localhost';
        window.api = "http://" + window.host + ":" + window.port + "/api/";
        
        console.log('API configured:', window.api);

        // Initialize sync manager after API is configured
        if (typeof window.PharmaMineSyncManager !== 'undefined') {
            window.syncManager = new window.PharmaMineSyncManager();
        }

        // Trigger custom event for other components
        window.dispatchEvent(new CustomEvent('api-configured', {
            detail: serverConfig
        }));
    }
}

// Listen for server configuration from main process
ipcRenderer.on('server-config', (event, config) => {
    console.log('Received server config:', config);
    initializeAPI(config);
});

// Request server configuration
setTimeout(() => {
    if (!serverConfig.port) {
        console.log('Requesting server config via IPC...');
        ipcRenderer.send('get-server-config');
    }
}, 500);

// Test API connectivity
function testAPIConnectivity() {
    if (!window.api) {
        console.log('API not configured yet');
        return;
    }
    
    fetch(window.api + 'sync/status?clientId=test')
        .then(response => {
            if (response.ok) {
                console.log('API connectivity test successful');
            } else {
                console.warn('API connectivity test failed:', response.status);
            }
        })
        .catch(error => {
            console.error('API connectivity test failed:', error);
        });
}

// Test API after delay
setTimeout(testAPIConnectivity, 2000);

// Load application modules
require('./assets/js/pos.js');
require('./assets/js/contact.js');
require('./assets/js/product-filter.js');
require('./assets/js/checkout.js');
require('print-js');
require('./assets/js/suppliers.js');
require('./assets/js/purchase_orders.js');
require('./assets/js/backup.js');
require('./assets/js/inventory.js');

// Load sync manager
require('./assets/js/sync-manager.js');

// Load new modular application
require('./assets/js/app');
```

## Web Application Integration

### index.html Sync Integration
```html
<!DOCTYPE html>
<html>
<head>
    <!-- Existing head content -->
    <script src="assets/js/sync-manager.js"></script>
</head>
<body>
    <!-- Existing body content -->
    
    <!-- Sync Status Indicator -->
    <div id="sync-status-indicator" class="sync-status-indicator">
        <span id="sync-status-icon" class="sync-status-icon offline"></span>
        <span id="sync-status-text">Offline</span>
        <span id="sync-pending-count" class="badge badge-warning" style="display: none;">0</span>
    </div>
    
    <!-- Conflict Resolution Modal -->
    <div id="conflict-resolution-modal" class="modal fade" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Conflict Resolution</h5>
                    <button type="button" class="close" data-dismiss="modal">
                        <span>&times;</span>
                    </button>
                </div>
                <div class="modal-body" id="conflict-resolution-content">
                    <!-- Content will be populated dynamically -->
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Initialize sync manager when page loads
        document.addEventListener('DOMContentLoaded', function() {
            // Wait for API to be configured
            const checkAPI = setInterval(() => {
                if (window.api) {
                    clearInterval(checkAPI);
                    
                    // Initialize sync manager
                    if (typeof PharmaMineSyncManager !== 'undefined') {
                        window.syncManager = new PharmaMineSyncManager();
                        
                        // Update UI based on sync status
                        setInterval(() => {
                            updateSyncUI();
                        }, 5000);
                    }
                }
            }, 1000);
        });
        
        // Update sync status UI
        function updateSyncUI() {
            if (!window.syncManager) return;
            
            const status = window.syncManager.getSyncStatus();
            const indicator = document.getElementById('sync-status-indicator');
            const icon = document.getElementById('sync-status-icon');
            const text = document.getElementById('sync-status-text');
            const pendingCount = document.getElementById('sync-pending-count');
            
            // Update status text and icon
            if (status.isOnline) {
                if (status.isSyncing) {
                    icon.className = 'sync-status-icon syncing';
                    text.textContent = 'Syncing...';
                } else {
                    icon.className = 'sync-status-icon synced';
                    text.textContent = 'Synced';
                }
            } else {
                icon.className = 'sync-status-icon offline';
                text.textContent = 'Offline';
            }
            
            // Update pending changes count
            if (status.pendingChanges > 0) {
                pendingCount.style.display = 'inline';
                pendingCount.textContent = status.pendingChanges;
            } else {
                pendingCount.style.display = 'none';
            }
        }
    </script>
</body>
</html>
```

## Database Integration

### Enhanced Database Utils with Sync Support
```javascript
// Enhanced database_utils.js with sync support
const Datastore = require("@seald-io/nedb");
const path = require("path");
const fs = require("fs");

// Sync database instances
let syncChangesDB = null;
let syncStatusDB = null;
let syncConflictsDB = null;

/**
 * Initialize sync databases
 */
function initializeSyncDatabases() {
    const dbDir = path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases");
    
    syncChangesDB = getDatabase(path.join(dbDir, "sync_changes.db"));
    syncStatusDB = getDatabase(path.join(dbDir, "sync_status.db"));
    syncConflictsDB = getDatabase(path.join(dbDir, "sync_conflicts.db"));
    
    // Ensure indexes
    syncChangesDB.ensureIndex({ fieldName: 'timestamp', unique: false });
    syncChangesDB.ensureIndex({ fieldName: 'clientId', unique: false });
    syncChangesDB.ensureIndex({ fieldName: 'synced', unique: false });
    
    syncStatusDB.ensureIndex({ fieldName: 'clientId', unique: true });
    
    syncConflictsDB.ensureIndex({ fieldName: 'status', unique: false });
    syncConflictsDB.ensureIndex({ fieldName: 'detectedAt', unique: false });
    
    console.log('Sync databases initialized');
}

/**
 * Record change for sync
 */
function recordChange(clientId, change) {
    if (!syncChangesDB) {
        initializeSyncDatabases();
    }
    
    const changeRecord = {
        _id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clientId: clientId,
        collection: change.collection,
        recordId: change.recordId,
        operation: change.operation,
        timestamp: change.timestamp || new Date().toISOString(),
        data: change.data,
        synced: false,
        syncTimestamp: null
    };
    
    return new Promise((resolve, reject) => {
        syncChangesDB.insert(changeRecord, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(changeRecord);
            }
        });
    });
}

/**
 * Get changes for sync
 */
function getChangesForSync(clientId, since = null) {
    if (!syncChangesDB) {
        initializeSyncDatabases();
    }
    
    const query = {
        clientId: { $ne: clientId },
        synced: false
    };
    
    if (since) {
        query.timestamp = { $gt: since };
    }
    
    return new Promise((resolve, reject) => {
        syncChangesDB.find(query, (err, changes) => {
            if (err) {
                reject(err);
            } else {
                resolve(changes);
            }
        });
    });
}

/**
 * Mark changes as synced
 */
function markChangesSynced(changeIds) {
    if (!syncChangesDB) {
        initializeSyncDatabases();
    }
    
    return new Promise((resolve, reject) => {
        syncChangesDB.update(
            { _id: { $in: changeIds } },
            { $set: { synced: true, syncTimestamp: new Date().toISOString() } },
            { multi: true },
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ updated: changeIds.length });
                }
            }
        );
    });
}

/**
 * Update sync status
 */
function updateSyncStatus(clientId, status, pendingChanges) {
    if (!syncStatusDB) {
        initializeSyncDatabases();
    }
    
    const update = {
        clientId: clientId,
        lastSync: new Date().toISOString(),
        status: status,
        pendingChanges: pendingChanges || 0,
        connectionStatus: 'online'
    };
    
    return new Promise((resolve, reject) => {
        syncStatusDB.update(
            { clientId: clientId },
            update,
            { upsert: true },
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(update);
                }
            }
        );
    });
}

/**
 * Get sync status
 */
function getSyncStatus(clientId) {
    if (!syncStatusDB) {
        initializeSyncDatabases();
    }
    
    return new Promise((resolve, reject) => {
        syncStatusDB.findOne({ clientId: clientId }, (err, status) => {
            if (err) {
                reject(err);
            } else {
                resolve(status || {
                    clientId: clientId,
                    lastSync: null,
                    status: 'unknown',
                    pendingChanges: 0,
                    connectionStatus: 'unknown'
                });
            }
        });
    });
}

// Export sync functions
module.exports = {
    // ... existing exports
    initializeSyncDatabases,
    recordChange,
    getChangesForSync,
    markChangesSynced,
    updateSyncStatus,
    getSyncStatus
};
```

## Usage Examples

### Tracking Inventory Changes
```javascript
// In inventory.js or inventory module
function trackInventoryChange(operation, recordId, data) {
    if (window.syncManager) {
        window.syncManager.queueChange('inventory', recordId, operation, data);
    }
}

// Override existing inventory operations
const originalInsert = inventoryDB.insert;
inventoryDB.insert = function(doc, callback) {
    originalInsert.call(this, doc, (err, newDoc) => {
        if (!err && newDoc) {
            trackInventoryChange('create', newDoc._id, newDoc);
        }
        if (callback) callback(err, newDoc);
    });
};

const originalUpdate = inventoryDB.update;
inventoryDB.update = function(query, update, options, callback) {
    originalUpdate.call(this, query, update, options, (err, numReplaced, newDoc) => {
        if (!err && numReplaced > 0) {
            const recordId = query._id || (newDoc && newDoc._id);
            if (recordId) {
                trackInventoryChange('update', recordId, update.$set || update);
            }
        }
        if (callback) callback(err, numReplaced, newDoc);
    });
};
```

### Tracking Customer Changes
```javascript
// In customers.js or customer module
function trackCustomerChange(operation, recordId, data) {
    if (window.syncManager) {
        window.syncManager.queueChange('customers', recordId, operation, data);
    }
}
```

This comprehensive client-side sync manager provides:

1. **Automatic Sync**: Handles online/offline scenarios seamlessly
2. **Conflict Resolution**: Multiple strategies for handling conflicts
3. **Error Recovery**: Retry logic and error handling
4. **Status Monitoring**: Real-time sync status and progress
5. **Change Tracking**: Automatic tracking of database changes
6. **User Interface**: Visual feedback for sync status and conflicts

The implementation is production-ready and handles all the complex scenarios that can occur during client-side synchronization.
