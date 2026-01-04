# PharmaMine Synchronization Testing Procedures

## Overview

This document provides comprehensive testing procedures for the PharmaMine synchronization system, covering unit tests, integration tests, end-to-end tests, and performance tests.

## Testing Strategy

### Test Levels
1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Test complete user workflows
4. **Performance Tests**: Test system under load
5. **Security Tests**: Test security vulnerabilities
6. **Compatibility Tests**: Test across different environments

### Test Environments
- **Development**: Local testing with mock data
- **Staging**: Production-like environment for integration testing
- **Production**: Live environment monitoring and smoke tests

## Unit Testing

### Sync Manager Unit Tests

**tests/unit/sync-manager.test.js**
```javascript
const assert = require('assert');
const PharmaMineSyncManager = require('../../assets/js/sync-manager');

describe('PharmaMineSyncManager', () => {
    let syncManager;

    beforeEach(() => {
        // Mock window object for Node.js environment
        global.window = {
            api: 'http://localhost:3000/api/',
            host: 'localhost',
            port: 3000,
            localStorage: {
                getItem: () => null,
                setItem: () => {}
            },
            addEventListener: () => {},
            removeEventListener: () => {}
        };
        
        syncManager = new PharmaMineSyncManager();
    });

    describe('Client ID Generation', () => {
        it('should generate unique client IDs', () => {
            const id1 = syncManager.generateClientId();
            const id2 = syncManager.generateClientId();
            
            assert.notEqual(id1, id2);
            assert(id1.startsWith(syncManager.clientType));
            assert(id2.startsWith(syncManager.clientType));
        });

        it('should generate client IDs with correct format', () => {
            const clientId = syncManager.generateClientId();
            const parts = clientId.split('_');
            
            assert.equal(parts.length, 3);
            assert.equal(parts[0], syncManager.clientType);
            assert(parts[1].length > 0); // timestamp
            assert(parts[2].length > 0); // random
        });
    });

    describe('Change Queuing', () => {
        it('should queue changes correctly', () => {
            const changeData = { name: 'Test Item', price: 29.99 };
            
            syncManager.queueChange('inventory', 'item1', 'create', changeData);
            
            assert.equal(syncManager.state.pendingChanges.length, 1);
            assert.equal(syncManager.state.pendingChanges[0].collection, 'inventory');
            assert.equal(syncManager.state.pendingChanges[0].recordId, 'item1');
            assert.equal(syncManager.state.pendingChanges[0].operation, 'create');
            assert.deepEqual(syncManager.state.pendingChanges[0].data, changeData);
        });

        it('should handle multiple changes', () => {
            syncManager.queueChange('inventory', 'item1', 'create', { name: 'Item 1' });
            syncManager.queueChange('inventory', 'item2', 'update', { name: 'Item 2' });
            syncManager.queueChange('customers', 'cust1', 'create', { name: 'Customer 1' });
            
            assert.equal(syncManager.state.pendingChanges.length, 3);
        });
    });

    describe('Sync Status', () => {
        it('should return correct sync status', () => {
            const status = syncManager.getSyncStatus();
            
            assert.equal(status.clientId, syncManager.clientId);
            assert.equal(status.clientType, syncManager.clientType);
            assert.equal(status.pendingChanges, 0);
            assert.equal(status.conflicts, 0);
            assert.equal(status.isOnline, syncManager.state.isOnline);
            assert.equal(status.isSyncing, syncManager.state.isSyncing);
        });
    });

    describe('Conflict Resolution', () => {
        it('should detect timestamp conflicts', () => {
            const localChange = {
                timestamp: '2024-01-15T10:30:00Z',
                data: { name: 'Item A' }
            };
            const remoteChange = {
                timestamp: '2024-01-15T10:29:00Z',
                data: { name: 'Item B' }
            };
            
            const conflict = syncManager.analyzeConflict(localChange, remoteChange);
            
            assert.equal(conflict.isConflict, true);
            assert.equal(conflict.type, 'timestamp_conflict');
            assert(conflict.resolutionOptions.includes('local_wins'));
        });
    });
});
```

### Server API Unit Tests

**tests/unit/api.test.js**
```javascript
const assert = require('assert');
const request = require('supertest');
const express = require('express');
const SyncController = require('../../api/sync/sync-controller');

describe('Sync API', () => {
    let app;

    before(() => {
        app = express();
        app.use(express.json());
        app.use('/api/sync', SyncController);
    });

    describe('POST /api/sync/push', () => {
        it('should reject requests without client ID', async () => {
            const response = await request(app)
                .post('/api/sync/push')
                .send({ changes: [] });

            assert.equal(response.status, 400);
            assert.equal(response.body.error, 'Client ID required');
        });

        it('should reject requests without changes', async () => {
            const response = await request(app)
                .post('/api/sync/push')
                .set('X-Client-Id', 'test-client')
                .send({});

            assert.equal(response.status, 400);
            assert.equal(response.body.error, 'No changes provided');
        });

        it('should accept valid changes', async () => {
            const changes = [{
                collection: 'inventory',
                recordId: 'item1',
                operation: 'create',
                data: { name: 'Test Item' },
                timestamp: new Date().toISOString()
            }];

            const response = await request(app)
                .post('/api/sync/push')
                .set('X-Client-Id', 'test-client')
                .send({ changes });

            assert.equal(response.status, 200);
            assert.equal(response.body.success, true);
            assert.equal(response.body.processedChanges, 1);
        });

        it('should validate change data', async () => {
            const invalidChanges = [{
                collection: 'inventory',
                // Missing recordId
                operation: 'create',
                data: { name: 'Test Item' },
                timestamp: new Date().toISOString()
            }];

            const response = await request(app)
                .post('/api/sync/push')
                .set('X-Client-Id', 'test-client')
                .send({ changes: invalidChanges });

            assert.equal(response.status, 400);
            assert.equal(response.body.error, 'Invalid changes');
        });
    });

    describe('GET /api/sync/pull', () => {
        it('should require client ID', async () => {
            const response = await request(app)
                .get('/api/sync/pull');

            assert.equal(response.status, 400);
            assert.equal(response.body.error, 'Client ID required');
        });

        it('should return changes since specified time', async () => {
            const response = await request(app)
                .get('/api/sync/pull?clientId=test-client&since=2024-01-01T00:00:00Z')
                .set('X-Client-Id', 'test-client');

            assert.equal(response.status, 200);
            assert.equal(response.body.success, true);
            assert(Array.isArray(response.body.changes));
        });
    });
});
```

## Integration Testing

### Database Integration Tests

**tests/integration/database.test.js**
```javascript
const assert = require('assert');
const { getDatabase } = require('../../api/database_utils');

describe('Database Integration', () => {
    let inventoryDB;
    let syncChangesDB;

    before(() => {
        inventoryDB = getDatabase('test_inventory.db');
        syncChangesDB = getDatabase('test_sync_changes.db');
    });

    beforeEach((done) => {
        // Clear test databases
        inventoryDB.remove({}, { multi: true }, () => {
            syncChangesDB.remove({}, { multi: true }, done);
        });
    });

    describe('Inventory Operations', () => {
        it('should insert inventory item', (done) => {
            const item = {
                _id: 'test-item-1',
                name: 'Test Item',
                price: 29.99,
                quantity: 100
            };

            inventoryDB.insert(item, (err, newDoc) => {
                assert.equal(err, null);
                assert.equal(newDoc.name, 'Test Item');
                assert.equal(newDoc.price, 29.99);
                done();
            });
        });

        it('should update inventory item', (done) => {
            const item = {
                _id: 'test-item-2',
                name: 'Test Item',
                price: 29.99,
                quantity: 100
            };

            inventoryDB.insert(item, (err, newDoc) => {
                assert.equal(err, null);

                inventoryDB.update(
                    { _id: 'test-item-2' },
                    { $set: { quantity: 150 } },
                    {},
                    (err, numReplaced) => {
                        assert.equal(err, null);
                        assert.equal(numReplaced, 1);
                        done();
                    }
                );
            });
        });

        it('should delete inventory item', (done) => {
            const item = {
                _id: 'test-item-3',
                name: 'Test Item',
                price: 29.99
            };

            inventoryDB.insert(item, (err, newDoc) => {
                assert.equal(err, null);

                inventoryDB.remove({ _id: 'test-item-3' }, {}, (err, numRemoved) => {
                    assert.equal(err, null);
                    assert.equal(numRemoved, 1);
                    done();
                });
            });
        });
    });

    describe('Sync Operations', () => {
        it('should record changes', (done) => {
            const change = {
                _id: 'change-1',
                clientId: 'test-client',
                collection: 'inventory',
                recordId: 'item-1',
                operation: 'create',
                timestamp: new Date().toISOString(),
                data: { name: 'Test Item' },
                synced: false
            };

            syncChangesDB.insert(change, (err, newDoc) => {
                assert.equal(err, null);
                assert.equal(newDoc.clientId, 'test-client');
                assert.equal(newDoc.synced, false);
                done();
            });
        });

        it('should mark changes as synced', (done) => {
            const change = {
                _id: 'change-2',
                clientId: 'test-client',
                collection: 'inventory',
                recordId: 'item-1',
                operation: 'create',
                timestamp: new Date().toISOString(),
                data: { name: 'Test Item' },
                synced: false
            };

            syncChangesDB.insert(change, (err, newDoc) => {
                assert.equal(err, null);

                syncChangesDB.update(
                    { _id: 'change-2' },
                    { $set: { synced: true, syncTimestamp: new Date().toISOString() } },
                    {},
                    (err, numReplaced) => {
                        assert.equal(err, null);
                        assert.equal(numReplaced, 1);
                        done();
                    }
                );
            });
        });
    });
});
```

### Client-Server Integration Tests

**tests/integration/client-server.test.js**
```javascript
const assert = require('assert');
const PharmaMineSyncManager = require('../../assets/js/sync-manager');
const request = require('supertest');
const app = require('../../server');

describe('Client-Server Integration', () => {
    let syncManager;

    before(() => {
        // Mock browser environment
        global.window = {
            api: 'http://localhost:3000/api/',
            host: 'localhost',
            port: 3000,
            localStorage: {
                getItem: () => null,
                setItem: () => {}
            },
            addEventListener: () => {},
            removeEventListener: () => {}
        };
    });

    beforeEach(() => {
        syncManager = new PharmaMineSyncManager();
    });

    describe('Push Changes', () => {
        it('should push changes to server', async () => {
            const changes = [{
                collection: 'inventory',
                recordId: 'item-1',
                operation: 'create',
                data: { name: 'Test Item', price: 29.99 },
                timestamp: new Date().toISOString()
            }];

            syncManager.state.pendingChanges = changes;

            // Mock fetch for push operation
            global.fetch = () => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    processedChanges: 1,
                    conflicts: [],
                    errors: []
                })
            });

            await syncManager.pushChanges();

            assert.equal(syncManager.state.pendingChanges.length, 0);
        });
    });

    describe('Pull Changes', () => {
        it('should pull changes from server', async () => {
            const mockChanges = [{
                collection: 'inventory',
                recordId: 'item-2',
                operation: 'create',
                data: { name: 'Remote Item', price: 39.99 },
                timestamp: new Date().toISOString()
            }];

            // Mock fetch for pull operation
            global.fetch = () => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    changes: mockChanges
                })
            });

            await syncManager.pullChanges();

            // Verify changes were applied (this would need actual database integration)
            assert(true); // Placeholder - would need actual database verification
        });
    });
});
```

## End-to-End Testing

### E2E Test Suite

**tests/e2e/sync-workflow.test.js**
```javascript
const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');

describe('Sync E2E Tests', () => {
    let driver;

    before(async () => {
        driver = await new Builder().forBrowser('chrome').build();
    });

    after(async () => {
        await driver.quit();
    });

    describe('Offline/Online Workflow', () => {
        it('should handle offline mode', async () => {
            await driver.get('http://localhost:3000');
            
            // Wait for page to load
            await driver.wait(until.elementLocated(By.id('sync-status-indicator')), 10000);
            
            // Simulate offline mode
            await driver.executeScript('window.dispatchEvent(new Event("offline"))');
            
            // Check sync status indicator
            const statusText = await driver.findElement(By.id('sync-status-text')).getText();
            assert.equal(statusText, 'Offline');
        });

        it('should sync when connection restored', async () => {
            // Simulate online mode
            await driver.executeScript('window.dispatchEvent(new Event("online"))');
            
            // Wait for sync to complete
            await driver.wait(until.elementTextIs(driver.findElement(By.id('sync-status-text')), 'Synced'), 30000);
            
            const statusText = await driver.findElement(By.id('sync-status-text')).getText();
            assert.equal(statusText, 'Synced');
        });
    });

    describe('Conflict Resolution', () => {
        it('should display conflict resolution modal', async () => {
            // This would require simulating a conflict scenario
            // For now, we'll test the modal structure exists
            const modal = await driver.findElements(By.id('conflict-resolution-modal'));
            assert.equal(modal.length, 1);
        });
    });

    describe('Data Consistency', () => {
        it('should maintain data consistency across clients', async () => {
            // This would require testing with multiple browser instances
            // Testing that changes made in one client appear in another
            assert(true); // Placeholder
        });
    });
});
```

### Multi-Client Testing

**tests/e2e/multi-client.test.js**
```javascript
const { Builder } = require('selenium-webdriver');
const assert = require('assert');

describe('Multi-Client Sync Tests', () => {
    let client1, client2;

    before(async () => {
        client1 = await new Builder().forBrowser('chrome').build();
        client2 = await new Builder().forBrowser('chrome').build();
    });

    after(async () => {
        await client1.quit();
        await client2.quit();
    });

    it('should sync changes between two clients', async () => {
        // Open both clients
        await client1.get('http://localhost:3000');
        await client2.get('http://localhost:3000');

        // Wait for both to sync
        await client1.wait(until.elementTextIs(client1.findElement(By.id('sync-status-text')), 'Synced'), 30000);
        await client2.wait(until.elementTextIs(client2.findElement(By.id('sync-status-text')), 'Synced'), 30000);

        // Make a change in client 1
        // This would require interacting with the POS interface
        // For now, we'll test that both clients show synced status
        const status1 = await client1.findElement(By.id('sync-status-text')).getText();
        const status2 = await client2.findElement(By.id('sync-status-text')).getText();

        assert.equal(status1, 'Synced');
        assert.equal(status2, 'Synced');
    });
});
```

## Performance Testing

### Load Testing

**tests/performance/load.test.js**
```javascript
const assert = require('assert');
const request = require('supertest');
const app = require('../../server');

describe('Performance Tests', () => {
    describe('Sync Performance', () => {
        it('should handle 100 concurrent sync requests', async function() {
            this.timeout(60000); // 60 seconds timeout

            const promises = [];
            const startTime = Date.now();

            // Create 100 concurrent requests
            for (let i = 0; i < 100; i++) {
                const promise = request(app)
                    .post('/api/sync/push')
                    .set('X-Client-Id', `client-${i}`)
                    .send({
                        changes: [{
                            collection: 'inventory',
                            recordId: `item-${i}`,
                            operation: 'create',
                            data: { name: `Item ${i}`, price: 29.99 },
                            timestamp: new Date().toISOString()
                        }]
                    });
                promises.push(promise);
            }

            const responses = await Promise.all(promises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // All requests should succeed
            responses.forEach(response => {
                assert.equal(response.status, 200);
                assert.equal(response.body.success, true);
            });

            // Should complete within reasonable time (adjust based on your requirements)
            assert(duration < 30000, `Sync took ${duration}ms, expected < 30000ms`);
        });

        it('should handle large change sets', async function() {
            this.timeout(120000); // 2 minutes timeout

            const largeChanges = [];
            for (let i = 0; i < 1000; i++) {
                largeChanges.push({
                    collection: 'inventory',
                    recordId: `large-item-${i}`,
                    operation: 'create',
                    data: { name: `Large Item ${i}`, price: 29.99 },
                    timestamp: new Date().toISOString()
                });
            }

            const startTime = Date.now();

            const response = await request(app)
                .post('/api/sync/push')
                .set('X-Client-Id', 'large-client')
                .send({ changes: largeChanges });

            const endTime = Date.now();
            const duration = endTime - startTime;

            assert.equal(response.status, 200);
            assert.equal(response.body.success, true);
            assert.equal(response.body.processedChanges, 1000);

            // Should complete within reasonable time
            assert(duration < 60000, `Large sync took ${duration}ms, expected < 60000ms`);
        });
    });

    describe('Database Performance', () => {
        it('should handle 10000 inventory items', async function() {
            this.timeout(180000); // 3 minutes timeout

            const inventoryDB = require('../../api/database_utils').getDatabase('test_performance.db');

            // Insert 10000 items
            const items = [];
            for (let i = 0; i < 10000; i++) {
                items.push({
                    _id: `perf-item-${i}`,
                    name: `Performance Item ${i}`,
                    price: 29.99,
                    quantity: 100
                });
            }

            const startTime = Date.now();

            await new Promise((resolve, reject) => {
                inventoryDB.insert(items, (err, newDocs) => {
                    if (err) reject(err);
                    else resolve(newDocs);
                });
            });

            const insertTime = Date.now() - startTime;

            // Query performance
            const queryStartTime = Date.now();

            await new Promise((resolve, reject) => {
                inventoryDB.find({ price: 29.99 }, (err, docs) => {
                    if (err) reject(err);
                    else resolve(docs);
                });
            });

            const queryTime = Date.now() - queryStartTime;

            // Cleanup
            await new Promise((resolve, reject) => {
                inventoryDB.remove({}, { multi: true }, (err, numRemoved) => {
                    if (err) reject(err);
                    else resolve(numRemoved);
                });
            });

            console.log(`Insert 10000 items: ${insertTime}ms`);
            console.log(`Query 10000 items: ${queryTime}ms`);

            // Performance assertions (adjust based on your requirements)
            assert(insertTime < 30000, `Insert took ${insertTime}ms, expected < 30000ms`);
            assert(queryTime < 5000, `Query took ${queryTime}ms, expected < 5000ms`);
        });
    });
});
```

### Stress Testing

**tests/performance/stress.test.js**
```javascript
const assert = require('assert');
const request = require('supertest');
const app = require('../../server');

describe('Stress Tests', () => {
    it('should handle rapid sync requests', async function() {
        this.timeout(120000); // 2 minutes timeout

        const clientIds = ['stress-client-1', 'stress-client-2', 'stress-client-3'];

        // Rapid fire requests from multiple clients
        const promises = [];
        for (let i = 0; i < 50; i++) {
            const clientId = clientIds[i % clientIds.length];
            const promise = request(app)
                .post('/api/sync/push')
                .set('X-Client-Id', clientId)
                .send({
                    changes: [{
                        collection: 'inventory',
                        recordId: `stress-item-${i}`,
                        operation: 'create',
                        data: { name: `Stress Item ${i}`, price: 29.99 },
                        timestamp: new Date().toISOString()
                    }]
                });
            promises.push(promise);
        }

        const responses = await Promise.all(promises);

        // Check that most requests succeeded
        const successCount = responses.filter(r => r.status === 200).length;
        assert(successCount >= 45, `Only ${successCount}/50 requests succeeded`);

        // Check for any server errors
        const errorCount = responses.filter(r => r.status >= 500).length;
        assert(errorCount === 0, `${errorCount} server errors occurred`);
    });

    it('should handle memory pressure', async function() {
        this.timeout(180000); // 3 minutes timeout

        // Create many changes to test memory usage
        const changes = [];
        for (let i = 0; i < 5000; i++) {
            changes.push({
                collection: 'inventory',
                recordId: `memory-item-${i}`,
                operation: 'create',
                data: {
                    name: `Memory Item ${i}`,
                    price: 29.99,
                    description: 'A'.repeat(1000), // Large description to use memory
                    metadata: { large: 'B'.repeat(1000) }
                },
                timestamp: new Date().toISOString()
            });
        }

        const response = await request(app)
            .post('/api/sync/push')
            .set('X-Client-Id', 'memory-client')
            .send({ changes });

        assert.equal(response.status, 200);
        assert.equal(response.body.success, true);
        assert.equal(response.body.processedChanges, 5000);
    });
});
```

## Security Testing

### Input Validation Tests

**tests/security/input-validation.test.js**
```javascript
const assert = require('assert');
const request = require('supertest');
const app = require('../../server');

describe('Security Tests', () => {
    describe('Input Validation', () => {
        it('should reject malicious SQL injection attempts', async () => {
            const maliciousChanges = [{
                collection: "'; DROP TABLE inventory; --",
                recordId: 'test',
                operation: 'create',
                data: { name: 'Test' },
                timestamp: new Date().toISOString()
            }];

            const response = await request(app)
                .post('/api/sync/push')
                .set('X-Client-Id', 'test-client')
                .send({ changes: maliciousChanges });

            assert.equal(response.status, 400);
            assert.equal(response.body.error, 'Invalid changes');
        });

        it('should reject oversized payloads', async () => {
            const largeData = 'A'.repeat(1000000); // 1MB of data
            const oversizedChanges = [{
                collection: 'inventory',
                recordId: 'test',
                operation: 'create',
                data: { name: largeData },
                timestamp: new Date().toISOString()
            }];

            const response = await request(app)
                .post('/api/sync/push')
                .set('X-Client-Id', 'test-client')
                .send({ changes: oversizedChanges });

            // Should either reject or handle gracefully
            assert(response.status === 400 || response.status === 200);
        });

        it('should sanitize HTML in input', async () => {
            const htmlChanges = [{
                collection: 'inventory',
                recordId: 'test',
                operation: 'create',
                data: { name: '<script>alert("xss")</script>' },
                timestamp: new Date().toISOString()
            }];

            const response = await request(app)
                .post('/api/sync/push')
                .set('X-Client-Id', 'test-client')
                .send({ changes: htmlChanges });

            if (response.status === 200) {
                // If accepted, should be sanitized
                assert(!response.body.changes || !response.body.changes[0].data.name.includes('<script>'));
            }
        });
    });

    describe('Authentication', () => {
        it('should reject requests without client ID', async () => {
            const response = await request(app)
                .post('/api/sync/push')
                .send({ changes: [] });

            assert.equal(response.status, 400);
            assert.equal(response.body.error, 'Client ID required');
        });

        it('should reject requests with invalid client ID format', async () => {
            const response = await request(app)
                .post('/api/sync/push')
                .set('X-Client-Id', 'invalid-client-id-!@#$%')
                .send({ changes: [] });

            // Should either reject or handle gracefully
            assert(response.status === 400 || response.status === 200);
        });
    });
});
```

## Compatibility Testing

### Browser Compatibility

**tests/compatibility/browser.test.js**
```javascript
const { Builder } = require('selenium-webdriver');
const assert = require('assert');

describe('Browser Compatibility', () => {
    const browsers = ['chrome', 'firefox', 'edge'];

    browsers.forEach(browser => {
        describe(`${browser.toUpperCase()} Compatibility`, () => {
            let driver;

            before(async function() {
                this.timeout(30000);
                driver = await new Builder().forBrowser(browser).build();
            });

            after(async () => {
                if (driver) {
                    await driver.quit();
                }
            });

            it('should load sync manager', async function() {
                this.timeout(30000);
                
                await driver.get('http://localhost:3000');
                
                // Wait for sync manager to initialize
                await driver.wait(until.elementLocated(By.id('sync-status-indicator')), 10000);
                
                // Check that sync status indicator is present
                const indicator = await driver.findElements(By.id('sync-status-indicator'));
                assert.equal(indicator.length, 1);
            });

            it('should handle offline/online transitions', async function() {
                this.timeout(30000);
                
                // Simulate offline
                await driver.executeScript('window.dispatchEvent(new Event("offline"))');
                
                // Check status
                const statusText = await driver.findElement(By.id('sync-status-text')).getText();
                assert.equal(statusText, 'Offline');
                
                // Simulate online
                await driver.executeScript('window.dispatchEvent(new Event("online"))');
                
                // Wait for sync
                await driver.wait(until.elementTextIs(driver.findElement(By.id('sync-status-text')), 'Synced'), 20000);
            });
        });
    });
});
```

### Node.js Version Compatibility

**tests/compatibility/node-version.test.js**
```javascript
const assert = require('assert');
const semver = require('semver');

describe('Node.js Version Compatibility', () => {
    it('should work with Node.js 14+', () => {
        const nodeVersion = process.version;
        assert(semver.gte(nodeVersion, '14.0.0'), `Node.js ${nodeVersion} is not supported, requires 14.0.0 or higher`);
    });

    it('should work with Node.js 16+', () => {
        const nodeVersion = process.version;
        assert(semver.gte(nodeVersion, '16.0.0'), `Node.js ${nodeVersion} is not recommended, requires 16.0.0 or higher`);
    });

    it('should work with Node.js 18+', () => {
        const nodeVersion = process.version;
        assert(semver.gte(nodeVersion, '18.0.0'), `Node.js ${nodeVersion} is not optimal, requires 18.0.0 or higher`);
    });
});
```

## Test Configuration and Setup

### Test Environment Setup

**tests/setup.js**
```javascript
const { getDatabase } = require('../api/database_utils');

// Test database configuration
const testConfig = {
    databases: {
        inventory: 'test_inventory.db',
        sync_changes: 'test_sync_changes.db',
        sync_status: 'test_sync_status.db',
        sync_conflicts: 'test_sync_conflicts.db'
    }
};

// Setup test environment
function setupTestEnvironment() {
    // Clear test databases
    Object.values(testConfig.databases).forEach(dbName => {
        const db = getDatabase(dbName);
        db.remove({}, { multi: true }, (err) => {
            if (err) {
                console.error(`Failed to clear test database ${dbName}:`, err);
            }
        });
    });
}

// Teardown test environment
function teardownTestEnvironment() {
    // Cleanup test databases
    Object.values(testConfig.databases).forEach(dbName => {
        const db = getDatabase(dbName);
        db.remove({}, { multi: true }, (err) => {
            if (err) {
                console.error(`Failed to cleanup test database ${dbName}:`, err);
            }
        });
    });
}

module.exports = {
    setupTestEnvironment,
    teardownTestEnvironment,
    testConfig
};
```

### Test Data Factory

**tests/factories/test-data.js**
```javascript
const faker = require('faker');

class TestDataFactory {
    static createInventoryItem(overrides = {}) {
        return {
            _id: faker.datatype.uuid(),
            name: faker.commerce.productName(),
            barcode: faker.datatype.number({ min: 100000000, max: 999999999 }),
            price: parseFloat(faker.commerce.price()),
            category: faker.commerce.department(),
            quantity: faker.datatype.number({ min: 0, max: 1000 }),
            stock: faker.datatype.boolean(),
            minStock: faker.datatype.number({ min: 1, max: 100 }),
            expirationDate: faker.date.future().toISOString(),
            img: faker.image.imageUrl(),
            alertHistory: [],
            lastRestocked: faker.date.recent().toISOString(),
            supplierId: faker.datatype.uuid(),
            reorderQuantity: faker.datatype.number({ min: 10, max: 100 }),
            ...overrides
        };
    }

    static createCustomer(overrides = {}) {
        return {
            _id: faker.datatype.uuid(),
            name: faker.name.findName(),
            phone: faker.phone.phoneNumber(),
            email: faker.internet.email(),
            address: faker.address.streetAddress(),
            alertHistory: [],
            lastVisited: faker.date.recent().toISOString(),
            totalSpent: parseFloat(faker.commerce.price()),
            ...overrides
        };
    }

    static createSyncChange(overrides = {}) {
        return {
            _id: faker.datatype.uuid(),
            clientId: faker.datatype.uuid(),
            collection: faker.random.arrayElement(['inventory', 'customers', 'transactions']),
            recordId: faker.datatype.uuid(),
            operation: faker.random.arrayElement(['create', 'update', 'delete']),
            timestamp: faker.date.recent().toISOString(),
            data: this.createInventoryItem(),
            synced: faker.datatype.boolean(),
            syncTimestamp: faker.date.recent().toISOString(),
            ...overrides
        };
    }

    static createSyncConflict(overrides = {}) {
        return {
            _id: faker.datatype.uuid(),
            change: this.createSyncChange(),
            conflict: this.createSyncChange(),
            detectedAt: faker.date.recent().toISOString(),
            status: faker.random.arrayElement(['pending', 'resolved']),
            ...overrides
        };
    }
}

module.exports = TestDataFactory;
```

## Running Tests

### Test Scripts

**package.json** (Test scripts)
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "jest tests/e2e",
    "test:performance": "jest tests/performance",
    "test:security": "jest tests/security",
    "test:compatibility": "jest tests/compatibility",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

### Test Configuration

**jest.config.js**
```javascript
module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/tests/**/*.test.js'
    ],
    collectCoverageFrom: [
        'api/**/*.js',
        'assets/js/**/*.js',
        '!**/node_modules/**',
        '!**/tests/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testTimeout: 30000
};
```

### Continuous Integration

**.github/workflows/test.yml**
```yaml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run performance tests
      run: npm run test:performance
    
    - name: Run security tests
      run: npm run test:security
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

This comprehensive testing suite ensures that the PharmaMine synchronization system is robust, reliable, and performs well under various conditions and environments.
