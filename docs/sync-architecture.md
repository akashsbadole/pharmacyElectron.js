# PharmaMine Synchronization Architecture

## Overview

This document describes the synchronization architecture between the Electron.js offline application and the jQuery-based full-stack web application for PharmaMine.

## Architecture Components

### 1. Database Schema Enhancements

#### Enhanced Inventory Schema
```javascript
{
  "_id": "unique_id",
  "data": {
    "name": "Product Name",
    "barcode": "123456789",
    "price": "29.99",
    "category": "General",
    "quantity": 100,
    "stock": 1,
    "minStock": 10
  },
  "sync": {
    "lastModified": "2024-01-15T10:30:00Z",
    "version": 1,
    "source": "electron" | "web",
    "clientId": "client_001",
    "conflictResolved": false
  },
  "deleted": false,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### Changes Tracking Schema
```javascript
{
  "_id": "change_001",
  "collection": "inventory",
  "recordId": "product_123",
  "operation": "update" | "create" | "delete",
  "timestamp": "2024-01-15T10:30:00Z",
  "clientId": "electron_client_001" | "web_client_002",
  "data": {
    "before": { /* previous state */ },
    "after": { /* new state */ }
  },
  "synced": false,
  "syncTimestamp": null
}
```

#### Sync Status Schema
```javascript
{
  "_id": "sync_status_001",
  "clientId": "client_001",
  "lastSync": "2024-01-15T10:30:00Z",
  "status": "synced" | "pending" | "conflict" | "error",
  "pendingChanges": 5,
  "lastError": null,
  "connectionStatus": "online" | "offline"
}
```

### 2. Sync Server Endpoints

#### Core Sync Endpoints
```javascript
// Push local changes to server
POST /api/sync/push
Headers: { 'x-client-id': 'client_001' }
Body: {
  "changes": [
    {
      "operation": "update",
      "collection": "inventory",
      "recordId": "product_123",
      "data": { /* change data */ },
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}

// Pull remote changes from server
GET /api/sync/pull?since=2024-01-15T10:30:00Z&clientId=client_001

// Resolve conflicts
POST /api/sync/conflicts
Body: {
  "conflictId": "conflict_001",
  "resolution": "local_wins" | "remote_wins" | "merged",
  "mergedData": { /* merged data */ }
}

// Get sync status
GET /api/sync/status?clientId=client_001

// Register client
POST /api/sync/register
Body: {
  "clientId": "client_001",
  "clientType": "electron" | "web",
  "version": "1.0.0"
}
```

### 3. Sync Algorithms

#### Conflict Detection Algorithm
```javascript
function detectConflicts(localChange, remoteChange) {
  // Same record, different timestamps
  if (localChange.recordId === remoteChange.recordId) {
    if (localChange.timestamp > remoteChange.timestamp) {
      return 'local_wins';
    } else if (remoteChange.timestamp > localChange.timestamp) {
      return 'remote_wins';
    } else {
      // Same timestamp - true conflict
      return 'timestamp_conflict';
    }
  }
  
  // Different records - no conflict
  return 'no_conflict';
}
```

#### Data Merge Algorithm
```javascript
function mergeData(localData, remoteData, conflictFields) {
  const merged = { ...localData };
  
  Object.keys(remoteData).forEach(field => {
    if (!conflictFields.includes(field)) {
      // Non-conflicting field - take remote value
      merged[field] = remoteData[field];
    } else {
      // Conflicting field - implement business logic
      merged[field] = resolveFieldConflict(
        localData[field], 
        remoteData[field], 
        field
      );
    }
  });
  
  return merged;
}
```

### 4. Sync States and Transitions

#### Client States
```javascript
const SyncStates = {
  OFFLINE: 'offline',
  ONLINE: 'online',
  SYNCING: 'syncing',
  CONFLICT: 'conflict',
  ERROR: 'error'
};
```

#### State Transitions
```
OFFLINE → ONLINE (when connection restored)
ONLINE → SYNCING (when sync triggered)
SYNCING → ONLINE (sync completed successfully)
SYNCING → CONFLICT (conflict detected)
CONFLICT → SYNCING (conflict resolved)
SYNCING → ERROR (sync failed)
ERROR → ONLINE (error resolved)
```

### 5. Error Handling and Recovery

#### Error Types
```javascript
const ErrorTypes = {
  NETWORK_ERROR: 'network_error',
  AUTHENTICATION_ERROR: 'auth_error',
  CONFLICT_ERROR: 'conflict_error',
  VALIDATION_ERROR: 'validation_error',
  TIMEOUT_ERROR: 'timeout_error'
};
```

#### Recovery Strategies
- **Network Errors**: Retry with exponential backoff
- **Authentication Errors**: Re-authenticate and retry
- **Conflict Errors**: Manual resolution or automatic strategy
- **Validation Errors**: Log and skip invalid changes
- **Timeout Errors**: Retry with longer timeout

### 6. Performance Optimization

#### Bandwidth Optimization
- **Delta Sync**: Only sync changed data
- **Compression**: Compress sync payloads
- **Batching**: Group multiple changes
- **Pagination**: Handle large datasets efficiently

#### Database Optimization
- **Indexing**: Optimize sync queries
- **Caching**: Cache frequently accessed data
- **Connection Pooling**: Reuse database connections

### 7. Security Considerations

#### Authentication
- **Client Authentication**: Each client has unique ID
- **Change Attribution**: Track who made each change
- **Access Control**: Limit sync permissions

#### Data Integrity
- **Checksums**: Verify data integrity during sync
- **Encryption**: Encrypt sensitive sync data
- **Audit Logs**: Track all sync operations

### 8. Monitoring and Logging

#### Sync Metrics
```javascript
const SyncMetrics = {
  syncDuration: 0,
  changesPushed: 0,
  changesPulled: 0,
  conflictsDetected: 0,
  errors: 0,
  bandwidthUsed: 0
};
```

#### Log Levels
- **DEBUG**: Detailed sync operations
- **INFO**: Sync start/completion
- **WARN**: Sync warnings and conflicts
- **ERROR**: Sync failures and errors

### 9. Configuration Options

#### Sync Configuration
```javascript
const SyncConfig = {
  syncInterval: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  batchSize: 100,
  compressionEnabled: true,
  encryptionEnabled: true,
  conflictStrategy: 'manual' // 'auto' | 'manual' | 'timestamp_wins'
};
```

### 10. Testing Strategy

#### Unit Tests
- Sync algorithm testing
- Conflict resolution testing
- Error handling testing

#### Integration Tests
- End-to-end sync testing
- Multi-client sync testing
- Network failure simulation

#### Performance Tests
- Large dataset sync testing
- Concurrent sync testing
- Bandwidth usage testing

This architecture provides a robust foundation for synchronizing data between the Electron.js offline application and the web application while maintaining data consistency and handling various edge cases.
