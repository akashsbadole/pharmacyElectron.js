// Sync Module for PharmaMine Web Application

// Sync state
const syncState = {
    isRunning: false,
    status: 'offline',
    lastSync: null,
    nextSync: null,
    changes: 0,
    conflicts: [],
    errors: [],
    performance: {
        lastSyncDuration: 0,
        averageSyncDuration: 0,
        totalRecordsSynced: 0
    }
};

// Sync API endpoints
const syncAPI = {
    // Get sync status
    getStatus: async () => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/sync/status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Sync status API error:', error);
            throw error;
        }
    },

    // Trigger manual sync
    triggerSync: async () => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/sync/trigger`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Sync trigger API error:', error);
            throw error;
        }
    },

    // Start sync engine
    startSync: async () => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/sync/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Start sync API error:', error);
            throw error;
        }
    },

    // Stop sync engine
    stopSync: async () => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/sync/stop`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Stop sync API error:', error);
            throw error;
        }
    },

    // Get sync history
    getHistory: async (limit = 100, offset = 0) => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/sync/history?limit=${limit}&offset=${offset}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Sync history API error:', error);
            throw error;
        }
    },

    // Get conflicts
    getConflicts: async () => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/sync/conflicts`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Sync conflicts API error:', error);
            throw error;
        }
    },

    // Resolve conflict
    resolveConflict: async (conflictId, resolution) => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/sync/resolve-conflict`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ conflictId, resolution })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Sync resolve conflict API error:', error);
            throw error;
        }
    },

    // Get sync statistics
    getStats: async () => {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/sync/stats`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Sync stats API error:', error);
            throw error;
        }
    }
};

// Sync utilities
const syncUtils = {
    // Format sync status for display
    formatStatus: (status) => {
        switch (status) {
            case 'syncing':
                return 'Syncing...';
            case 'synced':
                return 'Synced';
            case 'error':
                return 'Sync Error';
            case 'offline':
                return 'Offline';
            default:
                return 'Unknown';
        }
    },

    // Format duration
    formatDuration: (milliseconds) => {
        if (milliseconds < 1000) {
            return `${milliseconds}ms`;
        } else if (milliseconds < 60000) {
            return `${Math.round(milliseconds / 1000)}s`;
        } else {
            const minutes = Math.floor(milliseconds / 60000);
            const seconds = Math.round((milliseconds % 60000) / 1000);
            return `${minutes}m ${seconds}s`;
        }
    },

    // Format file size
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Get sync status class
    getStatusClass: (status) => {
        switch (status) {
            case 'syncing':
                return 'syncing';
            case 'synced':
                return 'synced';
            case 'error':
                return 'error';
            case 'offline':
                return 'offline';
            default:
                return 'offline';
        }
    }
};

// Sync handlers
const syncHandlers = {
    // Update sync status display
    updateStatusDisplay: () => {
        const statusContainer = document.getElementById('sync-status');
        const indicator = document.getElementById('sync-indicator');
        const text = document.getElementById('sync-text');
        
        if (!statusContainer || !indicator || !text) return;

        // Update status text
        text.textContent = syncUtils.formatStatus(syncState.status);
        
        // Update container class
        statusContainer.className = `sync-status ${syncUtils.getStatusClass(syncState.status)}`;
        
        // Update indicator
        if (syncState.status === 'syncing') {
            indicator.innerHTML = '<i class="fas fa-circle"></i>';
        } else if (syncState.status === 'synced') {
            indicator.innerHTML = '<i class="fas fa-check-circle"></i>';
        } else if (syncState.status === 'error') {
            indicator.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
        } else {
            indicator.innerHTML = '<i class="fas fa-circle"></i>';
        }

        // Update sync details if available
        const details = document.querySelector('.sync-details');
        if (details) {
            details.innerHTML = `
                <div class="sync-detail-item">
                    <span class="sync-detail-label">Status:</span>
                    <span class="sync-detail-value">${syncUtils.formatStatus(syncState.status)}</span>
                </div>
                <div class="sync-detail-item">
                    <span class="sync-detail-label">Last Sync:</span>
                    <span class="sync-detail-value">${syncState.lastSync ? utils.formatDate(syncState.lastSync) : 'Never'}</span>
                </div>
                <div class="sync-detail-item">
                    <span class="sync-detail-label">Changes:</span>
                    <span class="sync-detail-value">${syncState.changes}</span>
                </div>
                <div class="sync-detail-item">
                    <span class="sync-detail-label">Conflicts:</span>
                    <span class="sync-detail-value">${syncState.conflicts.length}</span>
                </div>
                <div class="sync-detail-item">
                    <span class="sync-detail-label">Errors:</span>
                    <span class="sync-detail-value">${syncState.errors.length}</span>
                </div>
                <div class="sync-detail-item">
                    <span class="sync-detail-label">Avg Duration:</span>
                    <span class="sync-detail-value">${syncUtils.formatDuration(syncState.performance.averageSyncDuration)}</span>
                </div>
            `;
        }
    },

    // Handle manual sync trigger
    handleManualSync: async () => {
        try {
            utils.showLoading();
            
            const response = await syncAPI.triggerSync();
            
            if (response.success) {
                utils.showToast('Sync completed successfully', 'success');
                syncHandlers.updateSyncState(response.data);
            } else {
                utils.showToast('Sync failed', 'error');
            }
        } catch (error) {
            console.error('Manual sync failed:', error);
            utils.showToast('Sync failed', 'error');
        } finally {
            utils.hideLoading();
        }
    },

    // Handle start sync
    handleStartSync: async () => {
        try {
            const response = await syncAPI.startSync();
            
            if (response.success) {
                utils.showToast('Sync engine started', 'success');
                syncState.isRunning = true;
                syncState.status = 'syncing';
                syncHandlers.updateStatusDisplay();
            } else {
                utils.showToast('Failed to start sync engine', 'error');
            }
        } catch (error) {
            console.error('Start sync failed:', error);
            utils.showToast('Failed to start sync engine', 'error');
        }
    },

    // Handle stop sync
    handleStopSync: async () => {
        try {
            const response = await syncAPI.stopSync();
            
            if (response.success) {
                utils.showToast('Sync engine stopped', 'success');
                syncState.isRunning = false;
                syncState.status = 'offline';
                syncHandlers.updateStatusDisplay();
            } else {
                utils.showToast('Failed to stop sync engine', 'error');
            }
        } catch (error) {
            console.error('Stop sync failed:', error);
            utils.showToast('Failed to stop sync engine', 'error');
        }
    },

    // Update sync state from API response
    updateSyncState: (statusData) => {
        syncState.isRunning = statusData.isRunning;
        syncState.status = statusData.status || 'offline';
        syncState.lastSync = statusData.lastSync;
        syncState.nextSync = statusData.nextSync;
        syncState.changes = statusData.changes || 0;
        syncState.conflicts = statusData.conflicts || [];
        syncState.errors = statusData.errors || [];
        syncState.performance = statusData.performance || syncState.performance;
        
        syncHandlers.updateStatusDisplay();
    },

    // Show sync history modal
    showSyncHistory: async () => {
        try {
            const response = await syncAPI.getHistory();
            
            if (response.success) {
                const modal = document.getElementById('sync-history-modal');
                if (!modal) {
                    // Create modal if it doesn't exist
                    const modalHtml = `
                        <div class="modal fade" id="sync-history-modal" tabindex="-1">
                            <div class="modal-dialog modal-lg">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title">Sync History</h5>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                    </div>
                                    <div class="modal-body">
                                        <div class="table-responsive">
                                            <table class="table table-hover">
                                                <thead>
                                                    <tr>
                                                        <th>Table</th>
                                                        <th>Operation</th>
                                                        <th>Timestamp</th>
                                                        <th>Source</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="sync-history-body">
                                                    <!-- History items will be loaded here -->
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    document.body.insertAdjacentHTML('beforeend', modalHtml);
                }

                const tbody = document.getElementById('sync-history-body');
                tbody.innerHTML = '';

                response.data.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.table_name}</td>
                        <td>${item.operation}</td>
                        <td>${utils.formatDate(item.timestamp)}</td>
                        <td>${item.source}</td>
                        <td>
                            <span class="badge bg-${item.synced ? 'success' : 'warning'}">
                                ${item.synced ? 'Synced' : 'Pending'}
                            </span>
                        </td>
                    `;
                    tbody.appendChild(row);
                });

                // Show modal
                const modalInstance = new bootstrap.Modal(document.getElementById('sync-history-modal'));
                modalInstance.show();
            }
        } catch (error) {
            console.error('Failed to load sync history:', error);
            utils.showToast('Failed to load sync history', 'error');
        }
    },

    // Show conflicts modal
    showConflicts: async () => {
        try {
            const response = await syncAPI.getConflicts();
            
            if (response.success) {
                const conflicts = response.data;
                
                if (conflicts.length === 0) {
                    utils.showToast('No conflicts found', 'info');
                    return;
                }

                const modal = document.getElementById('sync-conflicts-modal');
                if (!modal) {
                    // Create modal if it doesn't exist
                    const modalHtml = `
                        <div class="modal fade" id="sync-conflicts-modal" tabindex="-1">
                            <div class="modal-dialog modal-lg">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title">Sync Conflicts</h5>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                    </div>
                                    <div class="modal-body">
                                        <div class="alert alert-warning">
                                            <i class="fas fa-exclamation-triangle me-2"></i>
                                            Found ${conflicts.length} conflict(s) that need resolution.
                                        </div>
                                        <div id="conflicts-list">
                                            <!-- Conflicts will be loaded here -->
                                        </div>
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    document.body.insertAdjacentHTML('beforeend', modalHtml);
                }

                const conflictsList = document.getElementById('conflicts-list');
                conflictsList.innerHTML = '';

                conflicts.forEach((conflict, index) => {
                    const conflictCard = document.createElement('div');
                    conflictCard.className = 'card mb-3';
                    conflictCard.innerHTML = `
                        <div class="card-body">
                            <h6 class="card-title">Conflict ${index + 1}: ${conflict.table}</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <h7>Local Version:</h7>
                                    <pre class="bg-light p-2">${JSON.stringify(conflict.localRecord, null, 2)}</pre>
                                </div>
                                <div class="col-md-6">
                                    <h7>Remote Version:</h7>
                                    <pre class="bg-light p-2">${JSON.stringify(conflict.remoteRecord, null, 2)}</pre>
                                </div>
                            </div>
                            <div class="mt-3">
                                <button class="btn btn-success btn-sm" onclick="syncHandlers.resolveConflict('${conflict.id}', 'accept-local')">
                                    Accept Local
                                </button>
                                <button class="btn btn-primary btn-sm" onclick="syncHandlers.resolveConflict('${conflict.id}', 'accept-remote')">
                                    Accept Remote
                                </button>
                            </div>
                        </div>
                    `;
                    conflictsList.appendChild(conflictCard);
                });

                // Show modal
                const modalInstance = new bootstrap.Modal(document.getElementById('sync-conflicts-modal'));
                modalInstance.show();
            }
        } catch (error) {
            console.error('Failed to load conflicts:', error);
            utils.showToast('Failed to load conflicts', 'error');
        }
    },

    // Resolve conflict
    resolveConflict: async (conflictId, resolution) => {
        try {
            const response = await syncAPI.resolveConflict(conflictId, resolution);
            
            if (response.success) {
                utils.showToast('Conflict resolved successfully', 'success');
                
                // Refresh conflicts list
                syncHandlers.showConflicts();
            } else {
                utils.showToast('Failed to resolve conflict', 'error');
            }
        } catch (error) {
            console.error('Failed to resolve conflict:', error);
            utils.showToast('Failed to resolve conflict', 'error');
        }
    }
};

// Sync monitoring
const syncMonitor = {
    // Start sync monitoring
    startMonitoring: () => {
        // Poll sync status every 5 seconds
        setInterval(async () => {
            if (syncState.isRunning) {
                try {
                    const response = await syncAPI.getStatus();
                    if (response.success) {
                        syncHandlers.updateSyncState(response.data);
                    }
                } catch (error) {
                    console.error('Failed to update sync status:', error);
                }
            }
        }, 5000);

        // Initial status update
        syncHandlers.updateSyncState(syncState);
    },

    // Stop sync monitoring
    stopMonitoring: () => {
        // Clear interval (would need to store interval ID)
        console.log('Sync monitoring stopped');
    }
};

// Initialize sync module
const initSync = () => {
    // Set up event listeners for sync controls
    const syncTriggerBtn = document.getElementById('sync-trigger-btn');
    const syncStartBtn = document.getElementById('sync-start-btn');
    const syncStopBtn = document.getElementById('sync-stop-btn');
    const syncHistoryBtn = document.getElementById('sync-history-btn');
    const syncConflictsBtn = document.getElementById('sync-conflicts-btn');

    if (syncTriggerBtn) {
        syncTriggerBtn.addEventListener('click', syncHandlers.handleManualSync);
    }

    if (syncStartBtn) {
        syncStartBtn.addEventListener('click', syncHandlers.handleStartSync);
    }

    if (syncStopBtn) {
        syncStopBtn.addEventListener('click', syncHandlers.handleStopSync);
    }

    if (syncHistoryBtn) {
        syncHistoryBtn.addEventListener('click', syncHandlers.showSyncHistory);
    }

    if (syncConflictsBtn) {
        syncConflictsBtn.addEventListener('click', syncHandlers.showConflicts);
    }

    // Start monitoring
    syncMonitor.startMonitoring();
};

// Export for global access
window.syncState = syncState;
window.syncAPI = syncAPI;
window.syncUtils = syncUtils;
window.syncHandlers = syncHandlers;
window.syncMonitor = syncMonitor;
window.initSync = initSync;
