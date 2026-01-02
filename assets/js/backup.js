/**
 * Backup and Restore functionality for foodMine
 * Handles database backup creation, restoration, and file management
 */

class BackupManager {
    constructor() {
        this.selectedBackup = null;
        this.backupProgress = null;
        this.restoreProgress = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadBackupStatistics();
        this.loadBackupHistory();
        this.setupModalHandlers();
    }

    bindEvents() {
        // Backup creation button
        $('#createBackupBtn').on('click', () => this.createBackup());

        // Restore button
        $('#restoreBackupBtn').on('click', () => this.openRestoreModal());

        // Confirm restore button
        $('#confirmRestoreBtn').on('click', () => this.confirmRestore());

        // Automated Backup Save
        $('#saveAutoBackupBtn').on('click', () => this.saveAutoBackup());

        // Security Settings Save
        $('#saveSecurityBtn').on('click', () => this.saveSecurity());

        // Settings modal tab change - reload backup data when tab becomes active
        $('a[href="#backupRestoreTab"]').on('shown.bs.tab', (e) => {
            this.loadBackupStatistics();
            this.loadBackupHistory();
        });
    }

    setupModalHandlers() {
        // Settings modal shown event
        $('#settingsModal').on('shown.bs.modal', () => {
            this.loadBackupStatistics();
            this.loadSecuritySettings();
        });
    }

    /**
     * Load and display backup statistics
     */
    async loadBackupStatistics() {
        try {
            const response = await fetch(window.api + 'backup/stats');
            const data = await response.json();

            if (data.success) {
                const stats = data.statistics;
                $('#totalBackupsCount').text(stats.totalBackups);
                $('#totalBackupSize').text(this.formatFileSize(stats.totalBackupSize));
                $('#totalDbSize').text(this.formatFileSize(stats.totalDatabaseSize));
                $('#lastBackupDate').text(stats.newestBackup ? this.formatDate(stats.newestBackup) : 'Never');

                // Update backup location
                $('#backupLocation').val(stats.backupDirectory);
            }
        } catch (error) {
            console.error('Error loading backup statistics:', error);
            this.showNotification('Error loading backup statistics', 'error');
        }
    }

    /**
     * Load and display security and automated backup settings
     */
    async loadSecuritySettings() {
        try {
            const response = await fetch(window.api + 'settings/get');
            const data = await response.json();
            
            // Handle different possible response structures
            let settings = {};
            if (data && data.settings) {
                settings = data.settings;
            } else if (data && typeof data === 'object' && !Array.isArray(data)) {
                // If the response is an object but doesn't have a 'settings' property,
                // it might be the settings object itself
                settings = data;
            }

            $('#backupFrequency').val(settings.backup_frequency || 'off');
            $('#backupTime').val(settings.backup_time || '00:00');
            $('#enableEncryption').prop('checked', !!settings.enable_encryption);

            if (settings.enable_encryption) {
                $('#encryptionStatus').show();
            } else {
                $('#encryptionStatus').hide();
            }
        } catch (error) {
            console.error('Error loading security settings:', error);
            console.error('Response status:', response ? response.status : 'unknown');
            console.error('Response text:', response ? await response.text() : 'unknown');
        }
    }

    /**
     * Save automated backup schedule
     */
    async saveAutoBackup() {
        const frequency = $('#backupFrequency').val();
        const time = $('#backupTime').val();

        if (window.notiflix) {
            window.notiflix.Notify.info('Saving schedule...');
        }

        try {
            const response = await fetch(window.api + 'settings/get');
            const data = await response.json();
            const settings = data.settings || {};

            settings.backup_frequency = frequency;
            settings.backup_time = time;

            const saveResp = await fetch(window.api + 'settings/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (saveResp.ok) {
                this.showNotification('Backup schedule saved successfully', 'success');
            } else {
                throw new Error('Failed to save schedule');
            }
        } catch (error) {
            this.showNotification('Error saving schedule: ' + error.message, 'error');
        }
    }

    /**
     * Save security settings
     */
    async saveSecurity() {
        const enableEncryption = $('#enableEncryption').is(':checked');

        if (window.notiflix) {
            window.notiflix.Notify.info('Saving security settings...');
        }

        try {
            const response = await fetch(window.api + 'settings/get');
            const data = await response.json();
            const settings = data.settings || {};

            const oldEncryption = !!settings.enable_encryption;
            settings.enable_encryption = enableEncryption;

            const saveResp = await fetch(window.api + 'settings/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (saveResp.ok) {
                if (oldEncryption !== enableEncryption) {
                    this.showNotification('Security settings saved. Application will restart to apply changes.', 'success');
                    setTimeout(() => {
                        ipcRenderer.send("app-reload", "");
                    }, 3000);
                } else {
                    this.showNotification('Security settings saved', 'success');
                    this.loadSecuritySettings();
                }
            } else {
                throw new Error('Failed to save security settings');
            }
        } catch (error) {
            this.showNotification('Error saving security settings: ' + error.message, 'error');
        }
    }

    /**
     * Load and display backup history
     */
    async loadBackupHistory() {
        try {
            const response = await fetch(window.api + 'backup/list');
            const data = await response.json();

            if (data.success) {
                this.renderBackupHistory(data.backups);
            }
        } catch (error) {
            console.error('Error loading backup history:', error);
            $('#backupHistoryBody').html('<tr><td colspan="4" class="text-center text-danger">Error loading backup history</td></tr>');
        }
    }

    /**
     * Render backup history table
     */
    renderBackupHistory(backups) {
        if (!backups || backups.length === 0) {
            $('#backupHistoryBody').html('<tr><td colspan="4" class="text-center text-muted">No backups found</td></tr>');
            return;
        }

        const rows = backups.map(backup => `
            <tr>
                <td>${this.formatDate(backup.created)}</td>
                <td><code>${backup.filename}</code></td>
                <td>${this.formatFileSize(backup.size)}</td>
                <td>
                    <button class="btn btn-xs btn-info" onclick="backupManager.validateBackup('${backup.path}')" title="Validate">
                        <i class="fa fa-check"></i>
                    </button>
                    <button class="btn btn-xs btn-warning" onclick="backupManager.restoreFromBackup('${backup.path}')" title="Restore">
                        <i class="fa fa-upload"></i>
                    </button>
                    <button class="btn btn-xs btn-danger" onclick="backupManager.deleteBackup('${backup.path}', '${backup.filename}')" title="Delete">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        $('#backupHistoryBody').html(rows);
    }

    /**
     * Create a new backup
     */
    async createBackup() {
        try {
            this.showBackupProgress('Creating Backup', 0, 'Initializing backup process...');

            const response = await fetch(window.api + 'backup/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle streaming response for progress updates
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep the last incomplete line

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const data = JSON.parse(line);
                            if (data.progress !== undefined) {
                                this.updateBackupProgress(data.progress, data.message);
                            }
                            if (data.success) {
                                this.hideBackupProgress();
                                this.showNotification('Backup created successfully!', 'success');
                                this.loadBackupStatistics();
                                this.loadBackupHistory();
                            }
                            if (data.error) {
                                throw new Error(data.message || 'Backup failed');
                            }
                        } catch (parseError) {
                            console.warn('Could not parse progress line:', line);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Backup creation error:', error);
            this.hideBackupProgress();
            this.showNotification('Backup failed: ' + error.message, 'error');
        }
    }

    /**
     * Show backup progress modal
     */
    showBackupProgress(title, progress, message) {
        $('#backupProgressTitle').text(title);
        this.updateBackupProgress(progress, message);
        $('#backupProgressContainer').show();
    }

    /**
     * Update backup progress
     */
    updateBackupProgress(progress, message) {
        $('#backupProgressBar').css('width', progress + '%').text(Math.round(progress) + '%');
        $('#backupProgressMessage').text(message || '');
    }

    /**
     * Hide backup progress modal
     */
    hideBackupProgress() {
        $('#backupProgressContainer').hide();
    }

    /**
     * Open restore modal and load available backups
     */
    async openRestoreModal() {
        try {
            const response = await fetch(window.api + 'backup/list');
            const data = await response.json();

            if (data.success) {
                this.renderAvailableBackups(data.backups);
                $('#restoreBackupModal').modal('show');
            }
        } catch (error) {
            console.error('Error loading available backups:', error);
            this.showNotification('Error loading available backups', 'error');
        }
    }

    /**
     * Render available backups for restore
     */
    renderAvailableBackups(backups) {
        if (!backups || backups.length === 0) {
            $('#availableBackupsBody').html('<tr><td colspan="6" class="text-center text-muted">No backups available</td></tr>');
            $('#confirmRestoreBtn').prop('disabled', true);
            return;
        }

        const rows = backups.map(backup => `
            <tr>
                <td class="text-center">
                    <input type="radio" name="backupSelection" value="${backup.path}" onchange="backupManager.selectBackup('${backup.path}')">
                </td>
                <td>${this.formatDate(backup.created)}</td>
                <td><code>${backup.filename}</code></td>
                <td>${this.formatFileSize(backup.size)}</td>
                <td>
                    <button class="btn btn-xs btn-info" onclick="backupManager.validateBackup('${backup.path}', this)">
                        <i class="fa fa-check"></i> Validate
                    </button>
                </td>
                <td>
                    <button class="btn btn-xs btn-danger" onclick="backupManager.deleteBackup('${backup.path}', '${backup.filename}')">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        $('#availableBackupsBody').html(rows);
        $('#confirmRestoreBtn').prop('disabled', true);
    }

    /**
     * Select backup for restore
     */
    selectBackup(backupPath) {
        this.selectedBackup = backupPath;
        $('#confirmRestoreBtn').prop('disabled', false);
    }

    /**
     * Confirm and start restore operation
     */
    async confirmRestore() {
        if (!this.selectedBackup) {
            this.showNotification('Please select a backup to restore', 'warning');
            return;
        }

        try {
            this.showRestoreProgress('Restoring Backup', 0, 'Initializing restore process...');

            const response = await fetch(window.api + 'backup/restore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    backupPath: this.selectedBackup,
                    createBackupBeforeRestore: true
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle streaming response for progress updates
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const data = JSON.parse(line);
                            if (data.progress !== undefined) {
                                this.updateRestoreProgress(data.progress, data.message);
                            }
                            if (data.success) {
                                this.hideRestoreProgress();
                                $('#restoreBackupModal').modal('hide');
                                this.showNotification('Database restored successfully! Please restart the application.', 'success');
                                setTimeout(() => {
                                    if (typeof window.electronAPI !== 'undefined' && window.electronAPI.relaunch) {
                                        window.electronAPI.relaunch();
                                    } else {
                                        location.reload();
                                    }
                                }, 3000);
                            }
                            if (data.error) {
                                throw new Error(data.message || 'Restore failed');
                            }
                        } catch (parseError) {
                            console.warn('Could not parse progress line:', line);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Restore error:', error);
            this.hideRestoreProgress();
            this.showNotification('Restore failed: ' + error.message, 'error');
        }
    }

    /**
     * Show restore progress modal
     */
    showRestoreProgress(title, progress, message) {
        $('#restoreProgressTitle').text(title);
        this.updateRestoreProgress(progress, message);
        $('#restoreProgressContainer').show();
    }

    /**
     * Update restore progress
     */
    updateRestoreProgress(progress, message) {
        $('#restoreProgressBar').css('width', progress + '%').text(Math.round(progress) + '%');
        $('#restoreProgressMessage').text(message || '');
    }

    /**
     * Hide restore progress modal
     */
    hideRestoreProgress() {
        $('#restoreProgressContainer').hide();
    }

    /**
     * Validate backup file
     */
    async validateBackup(backupPath, button = null) {
        try {
            if (button) {
                const originalText = button.innerHTML;
                button.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
                button.disabled = true;

                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 3000);
            }

            const response = await fetch(`${window.api}backup/validate?file=${encodeURIComponent(backupPath)}`);
            const data = await response.json();

            if (data.success) {
                if (data.valid) {
                    this.showNotification('Backup file is valid and ready for restore', 'success');
                } else {
                    this.showNotification('Backup file validation failed: ' + (data.error || 'Unknown error'), 'error');
                }
            }
        } catch (error) {
            console.error('Validation error:', error);
            this.showNotification('Validation failed: ' + error.message, 'error');
        }
    }

    /**
     * Restore from specific backup (called from history table)
     */
    async restoreFromBackup(backupPath) {
        if (confirm('Are you sure you want to restore this backup? This will replace all current data.')) {
            this.selectedBackup = backupPath;
            await this.confirmRestore();
        }
    }

    /**
     * Delete backup file
     */
    async deleteBackup(backupPath, filename) {
        if (confirm(`Are you sure you want to delete the backup file: ${filename}?`)) {
            try {
                const response = await fetch(`${window.api}backup/file?file=${encodeURIComponent(backupPath)}`, {
                    method: 'DELETE'
                });
                const data = await response.json();

                if (data.success) {
                    this.showNotification('Backup file deleted successfully', 'success');
                    this.loadBackupStatistics();
                    this.loadBackupHistory();

                    // Refresh available backups if restore modal is open
                    if ($('#restoreBackupModal').hasClass('show')) {
                        this.openRestoreModal();
                    }
                } else {
                    this.showNotification('Failed to delete backup file: ' + data.message, 'error');
                }
            } catch (error) {
                console.error('Delete error:', error);
                this.showNotification('Failed to delete backup file: ' + error.message, 'error');
            }
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Use Notiflix if available, otherwise use alert
        if (typeof Notiflix !== 'undefined') {
            switch (type) {
                case 'success':
                    Notiflix.Notify.success(message);
                    break;
                case 'error':
                    Notiflix.Notify.failure(message);
                    break;
                case 'warning':
                    Notiflix.Notify.warning(message);
                    break;
                default:
                    Notiflix.Notify.info(message);
            }
        } else {
            alert(message);
        }
    }

    /**
     * Format file size in human readable format
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
}

// Initialize backup manager when DOM is ready
$(document).ready(function () {
    window.backupManager = new BackupManager();
});
