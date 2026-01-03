# PharmaMine Synchronization Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the synchronization system between your Electron.js offline application and the jQuery-based full-stack web application.

## Prerequisites

### Required Knowledge
- Node.js and Express.js
- NeDB database management
- RESTful API development
- JavaScript/jQuery frontend development
- Basic understanding of conflict resolution

### Required Tools
- Node.js (v14+ recommended)
- npm or yarn
- Git for version control
- Text editor or IDE

## Implementation Steps

### Phase 1: Database Schema Migration

#### Step 1.1: Backup Existing Data
```bash
# Create backup of existing databases
mkdir -p backup/$(date +%Y-%m-%d)
cp -r server/databases/* backup/$(date +%Y-%m-%d)/
```

#### Step 1.2: Update Database Schemas
Create enhanced schema files:

**database_schemas/enhanced_inventory_schema.js**
```javascript
const { getDatabase } = require('../api/database_utils');

function createEnhancedInventorySchema() {
    const inventoryDB = getDatabase('inventory.db');
    
    // Add sync fields to existing records
    inventoryDB.update(
        { sync: { $exists: false } },
        { $set: { 
            sync: {
                lastModified: new Date().toISOString(),
                version: 1,
                source: 'migration',
                clientId: 'migration',
                conflictResolved: false
            },
            deleted: false
        }},
        { multi: true },
        (err, numReplaced) => {
            if (err) {
                console.error('Schema migration failed:', err);
            } else {
                console.log(`Enhanced ${numReplaced} inventory records with sync fields`);
            }
        }
    );
}

module.exports = { createEnhancedInventorySchema };
```

**database_schemas/sync_databases_schema.js**
```javascript
const { getDatabase } = require('../api/database_utils');

function createSyncDatabases() {
    // Sync Changes Database
    const syncChangesDB = getDatabase('sync_changes.db');
    syncChangesDB.ensureIndex({ fieldName: 'timestamp', unique: false });
    syncChangesDB.ensureIndex({ fieldName: 'clientId', unique: false });
    syncChangesDB.ensureIndex({ fieldName: 'synced', unique: false });
    
    // Sync Status Database
    const syncStatusDB = getDatabase('sync_status.db');
    syncStatusDB.ensureIndex({ fieldName: 'clientId', unique: true });
    
    // Sync Conflicts Database
    const syncConflictsDB = getDatabase('sync_conflicts.db');
    syncConflictsDB.ensureIndex({ fieldName: 'status', unique: false });
    syncConflictsDB.ensureIndex({ fieldName: 'detectedAt', unique: false });
    
    console.log('Sync databases created with indexes');
}

module.exports = { createSyncDatabases };
```

#### Step 1.3: Run Schema Migration
```javascript
// migration_scripts/sync_schema_migration.js
const { createEnhancedInventorySchema } = require('../database_schemas/enhanced_inventory_schema');
const { createSyncDatabases } = require('../database_schemas/sync_databases_schema');

console.log('Starting sync schema migration...');

// Create sync databases
createSyncDatabases();

// Enhance existing inventory schema
createEnhancedInventorySchema();

console.log('Schema migration completed');
```

### Phase 2: Server-Side Implementation

#### Step 2.1: Create Sync API Endpoints
Create the sync API files in the `api/` directory:

```bash
mkdir -p api/sync
```

**api/sync/index.js** (Main router)
```javascript
const express = require('express');
const router = express.Router();

// Import sync modules
const SyncController = require('./sync-controller');
const ConflictResolver = require('./conflict-resolver');
const ChangeTracker = require('./change-tracker');
const SyncValidator = require('./sync-validator');

// Mount sync routes
router.use('/', SyncController);
router.use('/conflicts', ConflictResolver);
router.use('/changes', ChangeTracker);
router.use('/validate', SyncValidator);

module.exports = router;
```

**api/sync/sync-controller.js**
```javascript
const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database_utils');
const ConflictResolver = require('./conflict-resolver');
const ChangeTracker = require('./change-tracker');
const SyncValidator = require('./sync-validator');

// Database instances
const syncChangesDB = getDatabase('sync_changes.db');
const syncStatusDB = getDatabase('sync_status.db');

// Initialize databases
syncChangesDB.ensureIndex({ fieldName: 'timestamp', unique: false });
syncChangesDB.ensureIndex({ fieldName: 'clientId', unique: false });
syncChangesDB.ensureIndex({ fieldName: 'synced', unique: false });
syncStatusDB.ensureIndex({ fieldName: 'clientId', unique: true });

/**
 * POST /api/sync/push
 * Push local changes to server
 */
router.post('/push', async (req, res) => {
    try {
        const clientId = req.headers['x-client-id'];
        const changes = req.body.changes || [];
        
        if (!clientId) {
            return res.status(400).json({
                error: 'Client ID required',
                message: 'x-client-id header is required'
            });
        }
        
        if (!Array.isArray(changes) || changes.length === 0) {
            return res.status(400).json({
                error: 'No changes provided',
                message: 'Changes array is required'
            });
        }
        
        // Validate changes
        const validation = SyncValidator.validateChanges(changes);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Invalid changes',
                message: validation.message,
                invalidChanges: validation.invalidChanges
            });
        }
        
        // Process changes
        const result = await processPushChanges(clientId, changes);
        
        // Update sync status
        await updateSyncStatus(clientId, 'synced', result.processedChanges);
        
        res.json({
            success: true,
            processedChanges: result.processedChanges,
            conflicts: result.conflicts,
            errors: result.errors
        });
        
    } catch (error) {
        console.error('Push sync error:', error);
        res.status(500).json({
            error: 'Sync failed',
            message: error.message
        });
    }
});

// Helper functions (same as in sync-server-implementation.md)
async function processPushChanges(clientId, changes) {
    // Implementation from sync-server-implementation.md
}

async function updateSyncStatus(clientId, status, pendingChanges) {
    // Implementation from sync-server-implementation.md
}

module.exports = router;
```

#### Step 2.2: Update Main Server File
Update `server.js` to include sync endpoints:

```javascript
// Add sync imports
const SyncController = require('./api/sync');

// Add sync endpoints
express.use("/api/sync", require("./api/sync"));

// Add sync databases to cleanup list
const dbPaths = [
    // ... existing paths
    require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "sync_changes.db"),
    require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "sync_status.db"),
    require('path').join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "sync_conflicts.db")
];
```

#### Step 2.3: Add Rate Limiting for Sync
Add sync-specific rate limiting to prevent abuse:

```javascript
const syncLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 sync requests per minute
    message: {
        error: "Too many sync requests",
        message: "Please wait before making another sync request"
    }
});

// Apply to sync endpoints
express.use("/api/sync", syncLimiter);
```

### Phase 3: Client-Side Implementation

#### Step 3.1: Create Sync Manager
Create the client-side sync manager:

**assets/js/sync-manager.js**
```javascript
// Implementation from client-sync-manager.md
class PharmaMineSyncManager {
    // Complete implementation from client-sync-manager.md
}

window.PharmaMineSyncManager = PharmaMineSyncManager;
```

#### Step 3.2: Integrate with Existing Modules
Update existing modules to use the sync manager:

**assets/js/inventory.js** (Add sync tracking)
```javascript
// Add sync tracking to inventory operations
function trackInventoryChange(operation, recordId, data) {
    if (window.syncManager) {
        window.syncManager.queueChange('inventory', recordId, operation, data);
    }
}

// Override existing operations to track changes
const originalInsert = inventoryDB.insert;
inventoryDB.insert = function(doc, callback) {
    originalInsert.call(this, doc, (err, newDoc) => {
        if (!err && newDoc) {
            trackInventoryChange('create', newDoc._id, newDoc);
        }
        if (callback) callback(err, newDoc);
    });
};
```

**assets/js/customers.js** (Add sync tracking)
```javascript
// Add sync tracking to customer operations
function trackCustomerChange(operation, recordId, data) {
    if (window.syncManager) {
        window.syncManager.queueChange('customers', recordId, operation, data);
    }
}
```

#### Step 3.3: Update Renderer.js
Update `renderer.js` to initialize the sync manager:

```javascript
// Add sync manager initialization
function initializeAPI(config) {
    // ... existing code
    
    // Initialize sync manager after API is configured
    if (typeof window.PharmaMineSyncManager !== 'undefined') {
        window.syncManager = new window.PharmaMineSyncManager();
    }
    
    // ... rest of existing code
}
```

#### Step 3.4: Update HTML Interface
Update `index.html` to include sync status indicators:

```html
<!-- Add sync status indicator -->
<div id="sync-status-indicator" class="sync-status-indicator">
    <span id="sync-status-icon" class="sync-status-icon offline"></span>
    <span id="sync-status-text">Offline</span>
    <span id="sync-pending-count" class="badge badge-warning" style="display: none;">0</span>
</div>

<!-- Add conflict resolution modal -->
<div id="conflict-resolution-modal" class="modal fade" tabindex="-1" role="dialog">
    <!-- Modal content from client-sync-manager.md -->
</div>
```

### Phase 4: Web Application Deployment

#### Step 4.1: Create Web Build Configuration
Create a separate build configuration for the web application:

**package.json** (Add web scripts)
```json
{
  "scripts": {
    "build:web": "gulp && npm run build:frontend",
    "build:frontend": "node build-frontend.js",
    "start:web": "node server.js",
    "deploy:web": "npm run build:web && npm run deploy:heroku"
  }
}
```

**build-frontend.js**
```javascript
const fs = require('fs');
const path = require('path');

// Copy frontend files to web directory
const sourceDir = 'assets';
const targetDir = 'web/assets';

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        entry.isDirectory() ? copyDir(srcPath, destPath) : fs.copyFileSync(srcPath, destPath);
    }
}

// Copy assets
copyDir(sourceDir, targetDir);

// Copy HTML
fs.copyFileSync('index.html', 'web/index.html');

console.log('Frontend build completed');
```

#### Step 4.2: Create Web Server Configuration
Create a web-specific server configuration:

**server/web-server.js**
```javascript
const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'web')));

// API routes
app.use('/api', require('../api'));

// Serve index.html for all routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
});
```

#### Step 4.3: Environment Configuration
Create environment-specific configurations:

**config/web.env**
```env
NODE_ENV=production
PORT=3000
DB_PATH=./databases/
SYNC_ENABLED=true
```

**config/electron.env**
```env
NODE_ENV=development
PORT=0
DB_PATH=./server/databases/
SYNC_ENABLED=true
```

### Phase 5: Testing and Validation

#### Step 5.1: Unit Testing
Create unit tests for sync functionality:

**tests/sync-unit-tests.js**
```javascript
const assert = require('assert');
const PharmaMineSyncManager = require('../assets/js/sync-manager');

describe('Sync Manager', () => {
    let syncManager;
    
    beforeEach(() => {
        syncManager = new PharmaMineSyncManager();
    });
    
    describe('Client ID Generation', () => {
        it('should generate unique client IDs', () => {
            const id1 = syncManager.generateClientId();
            const id2 = syncManager.generateClientId();
            assert.notEqual(id1, id2);
        });
    });
    
    describe('Change Queuing', () => {
        it('should queue changes correctly', () => {
            syncManager.queueChange('inventory', 'item1', 'create', { name: 'Test Item' });
            assert.equal(syncManager.state.pendingChanges.length, 1);
        });
    });
});
```

#### Step 5.2: Integration Testing
Create integration tests for sync scenarios:

**tests/sync-integration-tests.js**
```javascript
const request = require('supertest');
const app = require('../server');

describe('Sync API', () => {
    describe('POST /api/sync/push', () => {
        it('should accept valid changes', async () => {
            const response = await request(app)
                .post('/api/sync/push')
                .set('X-Client-Id', 'test-client')
                .send({
                    changes: [{
                        collection: 'inventory',
                        recordId: 'item1',
                        operation: 'create',
                        data: { name: 'Test Item' },
                        timestamp: new Date().toISOString()
                    }]
                });
            
            assert.equal(response.status, 200);
            assert.equal(response.body.success, true);
        });
    });
});
```

#### Step 5.3: End-to-End Testing
Create E2E tests for sync scenarios:

**tests/sync-e2e-tests.js**
```javascript
const { Builder, By, until } = require('selenium-webdriver');

describe('Sync E2E Tests', () => {
    let driver;
    
    before(async () => {
        driver = await new Builder().forBrowser('chrome').build();
    });
    
    after(async () => {
        await driver.quit();
    });
    
    it('should sync changes between clients', async () => {
        // Test offline/online scenarios
        // Test conflict resolution
        // Test status indicators
    });
});
```

### Phase 6: Deployment

#### Step 6.1: Deploy Backend Server
Deploy the sync-enabled backend server:

**Heroku Deployment**
```bash
# Create Heroku app
heroku create pharmamine-sync

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set SYNC_ENABLED=true

# Deploy
git push heroku main

# Open app
heroku open
```

**AWS Deployment**
```bash
# Create EC2 instance
aws ec2 run-instances --image-id ami-12345678 --count 1 --instance-type t2.micro

# SSH and deploy
ssh -i key.pem ec2-user@public-dns
git clone your-repo.git
cd your-repo
npm install
npm run start:web
```

#### Step 6.2: Deploy Frontend
Deploy the web frontend:

**Netlify Deployment**
```bash
# Build frontend
npm run build:web

# Deploy to Netlify
netlify deploy --dir=web
```

**GitHub Pages Deployment**
```bash
# Build and deploy
npm run build:web
git subtree push --prefix web origin gh-pages
```

#### Step 6.3: Configure CORS
Update server to allow cross-origin requests:

```javascript
// In server.js
express.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Accept,X-Access-Token,X-Key,X-Client-Id');
    next();
});
```

### Phase 7: Monitoring and Maintenance

#### Step 7.1: Add Logging
Implement comprehensive logging:

**api/middleware/logging.js**
```javascript
const fs = require('fs');
const path = require('path');

function createLogger() {
    const logDir = path.join(process.env.APPDATA, process.env.APPNAME, 'logs');
    
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    return {
        info: (message) => log('INFO', message),
        warn: (message) => log('WARN', message),
        error: (message) => log('ERROR', message),
        debug: (message) => log('DEBUG', message)
    };
    
    function log(level, message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${level}: ${message}\n`;
        
        fs.appendFileSync(path.join(logDir, 'sync.log'), logEntry);
        
        // Also log to console
        console.log(logEntry.trim());
    }
}

module.exports = createLogger();
```

#### Step 7.2: Add Health Checks
Implement health check endpoints:

**api/health.js**
```javascript
const express = require('express');
const router = express.Router();
const { getDatabase } = require('./database_utils');

router.get('/health', (req, res) => {
    const syncChangesDB = getDatabase('sync_changes.db');
    
    syncChangesDB.count({}, (err, count) => {
        if (err) {
            res.status(500).json({
                status: 'error',
                message: 'Database connection failed',
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                status: 'healthy',
                syncChangesCount: count,
                timestamp: new Date().toISOString()
            });
        }
    });
});

module.exports = router;
```

#### Step 7.3: Performance Monitoring
Add performance monitoring:

**api/middleware/performance.js**
```javascript
function performanceMiddleware(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        if (duration > 1000) {
            console.warn(`Slow request: ${req.method} ${req.url} - ${duration}ms`);
        }
    });
    
    next();
}

module.exports = performanceMiddleware;
```

## Troubleshooting

### Common Issues

#### Issue 1: Sync Not Starting
**Problem**: Sync manager doesn't initialize
**Solution**: 
- Check API configuration
- Verify client ID generation
- Check network connectivity

#### Issue 2: Conflicts Not Resolved
**Problem**: Conflicts remain unresolved
**Solution**:
- Check conflict resolution strategy
- Verify manual resolution UI
- Check server-side conflict handling

#### Issue 3: Performance Issues
**Problem**: Sync is slow or times out
**Solution**:
- Implement batching
- Add compression
- Optimize database queries

#### Issue 4: Data Loss
**Problem**: Changes are lost during sync
**Solution**:
- Check change tracking
- Verify queue persistence
- Add backup mechanisms

### Debug Commands

```bash
# Check sync status
curl http://localhost:3000/api/sync/status?clientId=test

# View sync logs
tail -f logs/sync.log

# Check database integrity
node -e "const db = require('./api/database_utils').getDatabase('sync_changes.db'); db.find({}, (err, docs) => console.log(docs.length))"

# Test sync manually
curl -X POST http://localhost:3000/api/sync/push -H "Content-Type: application/json" -H "X-Client-Id: test" -d '{"changes": []}'
```

## Best Practices

### 1. Security
- Use HTTPS in production
- Implement proper authentication
- Validate all inputs
- Sanitize all outputs

### 2. Performance
- Use batching for large datasets
- Implement compression
- Optimize database queries
- Use caching where appropriate

### 3. Reliability
- Implement retry logic
- Add error handling
- Use transactional operations
- Monitor sync health

### 4. User Experience
- Provide clear status indicators
- Handle conflicts gracefully
- Show progress during sync
- Allow manual sync triggers

This implementation guide provides a comprehensive roadmap for implementing the synchronization system. Follow each phase carefully and test thoroughly at each step to ensure a robust and reliable sync implementation.
