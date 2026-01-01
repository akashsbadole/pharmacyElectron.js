const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const path = require("path");
const fs = require("fs");
const { getDatabase } = require('./database_utils');
const cron = require("node-crn");

const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "cloud_backup_logs.db",
);

app.use(bodyParser.json());

module.exports = app;

// Initialize backup logs database
let backupLogsDB = getDatabase(dbPath);
backupLogsDB.ensureIndex({ fieldName: "_id", unique: true });
backupLogsDB.ensureIndex({ fieldName: "backup_date" });
backupLogsDB.ensureIndex({ fieldName: "backup_type" });
backupLogsDB.ensureIndex({ fieldName: "status" });

/**
 * GET endpoint: Get the welcome message for the Cloud Backup API.
 */
app.get("/", function (req, res) {
    res.send("Local Cloud Backup API - Automated Data Backup System");
});

/**
 * POST endpoint: Configure cloud backup settings
 */
app.post("/configure", function (req, res) {
    const {
        cloud_provider, // 'dropbox', 'google_drive', 'onedrive', 'box'
        credentials,
        backup_schedule,
        backup_path,
        compression_enabled = true,
        encryption_enabled = true,
        retention_days = 30,
        notification_email,
        backup_types = ['database', 'files', 'config']
    } = req.body;

    // Validation
    if (!cloud_provider || !credentials) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Cloud provider and credentials are required"
        });
    }

    const backupConfig = {
        _id: `backup_config_${Date.now()}`,
        cloud_provider: cloud_provider,
        credentials: credentials,
        backup_schedule: backup_schedule || "0 2 * * *", // Daily at 2 AM
        backup_path: backup_path || "/backups",
        compression_enabled: compression_enabled,
        encryption_enabled: encryption_enabled,
        retention_days: parseInt(retention_days),
        notification_email: notification_email,
        backup_types: backup_types,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
    };

    // Save configuration
    const configPath = path.join(appData, appName, "server", "databases", "cloud_backup_config.json");
    
    fs.writeFile(configPath, JSON.stringify(backupConfig, null, 2), function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to save backup configuration"
            });
        }

        // Schedule automatic backups
        scheduleBackup(backupConfig);

        res.status(201).json({
            message: "Cloud backup configuration saved successfully",
            config: backupConfig
        });
    });
});

/**
 * POST endpoint: Execute immediate backup
 */
app.post("/backup-now", function (req, res) {
    const {
        backup_type = 'full', // 'full', 'incremental', 'database_only'
        include_files = true,
        include_database = true,
        compress = true
    } = req.body;

    // Load configuration
    loadBackupConfig(function (err, config) {
        if (err || !config) {
            return res.status(404).json({
                error: "Not Found",
                message: "Backup configuration not found"
            });
        }

        // Create backup record
        const backupRecord = {
            _id: `backup_${Date.now()}`,
            backup_type: backup_type,
            backup_date: new Date().toISOString(),
            backup_provider: config.cloud_provider,
            status: 'in_progress',
            started_at: new Date().toISOString(),
            backup_size: 0,
            files_backed_up: 0,
            database_backed_up: false,
            errors: [],
            warnings: [],
            location_url: null,
            checksum: null
        };

        backupLogsDB.insert(backupRecord, function (err, newBackup) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to create backup record"
                });
            }

            // Start backup process asynchronously
            executeBackup(newBackup, config, {
                include_files,
                include_database,
                compress
            }).then(result => {
                // Update backup record with results
                backupLogsDB.update(
                    { _id: newBackup._id },
                    { $set: result },
                    {},
                    function (err) {
                        if (err) console.error("Failed to update backup record:", err);
                    }
                );
            }).catch(error => {
                console.error("Backup process failed:", error);
                
                // Update record with error
                backupLogsDB.update(
                    { _id: newBackup._id },
                    { 
                        $set: {
                            status: 'failed',
                            errors: [{ step: 'general', message: error.message }],
                            completed_at: new Date().toISOString()
                        }
                    },
                    {},
                    function (err) {
                        if (err) console.error("Failed to update backup record with error:", err);
                    }
                );
            });

            res.status(202).json({
                message: "Backup process initiated",
                backup_id: newBackup._id,
                status: "in_progress",
                estimated_completion: "5-10 minutes"
            });
        });
    });
});

/**
 * GET endpoint: Get backup history
 */
app.get("/history", function (req, res) {
    const {
        start_date,
        end_date,
        status,
        backup_type,
        limit = 50,
        page = 1
    } = req.query;

    let query = {};
    
    if (start_date || end_date) {
        query.backup_date = {};
        if (start_date) query.backup_date.$gte = start_date;
        if (end_date) query.backup_date.$lte = end_date;
    }
    
    if (status) query.status = status;
    if (backup_type) query.backup_type = backup_type;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    backupLogsDB.find(query)
        .sort({ backup_date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .exec(function (err, backups) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to retrieve backup history"
                });
            }

            res.send({
                backups: backups,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: backups.length
                }
            });
        });
});

/**
 * GET endpoint: Get backup status
 */
app.get("/status", function (req, res) {
    // Get latest backup
    backupLogsDB.findOne({})
        .sort({ backup_date: -1 })
        .exec(function (err, latestBackup) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to retrieve backup status"
                });
            }

            // Get backup statistics
            backupLogsDB.find({}, function (err, allBackups) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({
                        error: "Internal Server Error",
                        message: "Failed to retrieve backup statistics"
                    });
                }

                const successfulBackups = allBackups.filter(b => b.status === 'completed');
                const failedBackups = allBackups.filter(b => b.status === 'failed');
                const totalSize = successfulBackups.reduce((sum, b) => sum + (b.backup_size || 0), 0);

                const status = {
                    latest_backup: latestBackup,
                    total_backups: allBackups.length,
                    successful_backups: successfulBackups.length,
                    failed_backups: failedBackups.length,
                    success_rate: allBackups.length > 0 ? (successfulBackups.length / allBackups.length) * 100 : 0,
                    total_backup_size: totalSize,
                    auto_backup_enabled: true,
                    next_scheduled_backup: getNextScheduledBackup()
                };

                res.send(status);
            });
        });
});

/**
 * POST endpoint: Restore from backup
 */
app.post("/restore", function (req, res) {
    const {
        backup_id,
        restore_options = {
            restore_database: true,
            restore_files: true,
            overwrite_existing: false
        }
    } = req.body;

    if (!backup_id) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Backup ID is required"
        });
    }

    // Find backup record
    backupLogsDB.findOne({ _id: backup_id }, function (err, backup) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve backup record"
            });
        }

        if (!backup) {
            return res.status(404).json({
                error: "Not Found",
                message: "Backup not found"
            });
        }

        if (backup.status !== 'completed') {
            return res.status(400).json({
                error: "Bad Request",
                message: "Can only restore from completed backups"
            });
        }

        // Create restore record
        const restoreRecord = {
            _id: `restore_${Date.now()}`,
            backup_id: backup_id,
            restore_date: new Date().toISOString(),
            restore_provider: backup.backup_provider,
            status: 'in_progress',
            started_at: new Date().toISOString(),
            restore_options: restore_options,
            restored_files: 0,
            restored_database: false,
            errors: [],
            warnings: []
        };

        backupLogsDB.insert(restoreRecord, function (err, newRestore) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to create restore record"
                });
            }

            // Start restore process asynchronously
            executeRestore(newRestore, backup, restore_options)
                .then(result => {
                    backupLogsDB.update(
                        { _id: newRestore._id },
                        { $set: result },
                        {},
                        function (err) {
                            if (err) console.error("Failed to update restore record:", err);
                        }
                    );
                })
                .catch(error => {
                    console.error("Restore process failed:", error);
                    
                    backupLogsDB.update(
                        { _id: newRestore._id },
                        { 
                            $set: {
                                status: 'failed',
                                errors: [{ step: 'general', message: error.message }],
                                completed_at: new Date().toISOString()
                            }
                        },
                        {},
                        function (err) {
                            if (err) console.error("Failed to update restore record with error:", err);
                        }
                    );
                });

            res.status(202).json({
                message: "Restore process initiated",
                restore_id: newRestore._id,
                status: "in_progress",
                estimated_completion: "10-15 minutes"
            });
        });
    });
});

/**
 * GET endpoint: Get backup analytics
 */
app.get("/analytics", function (req, res) {
    const {
        start_date,
        end_date
    } = req.query;

    let query = {};
    if (start_date || end_date) {
        query.backup_date = {};
        if (start_date) query.backup_date.$gte = start_date;
        if (end_date) query.backup_date.$lte = end_date;
    }

    backupLogsDB.find(query, function (err, backups) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve backup analytics"
            });
        }

        const analytics = {
            total_backups: backups.length,
            success_rate: 0,
            average_backup_size: 0,
            backup_frequency: {},
            storage_trends: {},
            error_patterns: {},
            performance_metrics: {}
        };

        if (backups.length === 0) {
            res.send(analytics);
            return;
        }

