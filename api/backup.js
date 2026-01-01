const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const unzipper = require("unzipper");
const {
    createBackup,
    validateBackup,
    restoreBackup,
    getBackupFiles,
    deleteBackup,
    getDatabaseFiles
} = require('./database_utils');

// Get settings database
const Datastore = require("@seald-io/nedb");
const dbPath = path.join(
    process.env.APPDATA,
    process.env.APPNAME,
    "server",
    "databases",
    "settings.db",
);
const settingsDB = new Datastore({ filename: dbPath });
settingsDB.loadDatabase();

app.use(bodyParser.json());

module.exports = app;

// Get default backup directory
const getBackupDirectory = () => {
    const appData = process.env.APPDATA;
    const appName = process.env.APPNAME;
    return path.join(appData, appName, "backups");
};

/**
 * GET endpoint: Get the welcome message for the Backup API.
 */
app.get("/", function (req, res) {
    res.send("Backup API");
});

/**
 * GET endpoint: Get list of all databases
 */
app.get("/databases", function (req, res) {
    try {
        const dbFiles = getDatabaseFiles(process.env.APPDATA, process.env.APPNAME);
        res.json({
            success: true,
            databases: dbFiles
        });
    } catch (error) {
        console.error('Error getting database files:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get database files'
        });
    }
});

/**
 * POST endpoint: Create a new backup
 * Body: { backupLocation?: string }
 */
app.post("/create", async function (req, res) {
    try {
        const backupDir = req.body.backupLocation || getBackupDirectory();
        const backupLocation = path.resolve(backupDir);

        // Validate backup location
        try {
            const pathParts = backupLocation.split(path.sep);
            const homeDir = pathParts[0]; // Get first part to validate
            if (backupLocation.includes('..') || backupLocation.includes('~')) {
                return res.status(400).json({
                    error: 'Invalid backup location',
                    message: 'Backup location cannot contain .. or ~ characters'
                });
            }
        } catch (err) {
            return res.status(400).json({
                error: 'Invalid backup location',
                message: 'Invalid backup location path'
            });
        }

        // Set headers for progress tracking
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Transfer-Encoding': 'chunked'
        });

        // Send initial response
        res.write(JSON.stringify({
            message: 'Backup started',
            status: 'in_progress'
        }));

        // Create backup with progress callback
        const backupInfo = await createBackup(backupLocation, (progress, message) => {
            res.write(JSON.stringify({
                progress: progress,
                message: message
            }) + '\n');
        });

        // Send final result
        res.write(JSON.stringify({
            success: true,
            backup: backupInfo,
            message: 'Backup completed successfully'
        }) + '\n');

        res.end();

    } catch (error) {
        console.error('Backup creation error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Backup Failed',
                message: error.message
            });
        } else {
            res.write(JSON.stringify({
                error: 'Backup Failed',
                message: error.message
            }) + '\n');
            res.end();
        }
    }
});

/**
 * POST endpoint: Create backup to configured local folder
 */
app.post("/create-local", async function (req, res) {
    try {
        // Get settings to retrieve local backup folder path
        const settings = await new Promise((resolve, reject) => {
            settingsDB.findOne({ _id: 1 }, function (err, docs) {
                if (err) reject(err);
                else resolve(docs);
            });
        });

        if (!settings || !settings.settings || !settings.settings.local_backup_folder) {
            return res.status(400).json({
                error: 'Configuration Error',
                message: 'Local backup folder path is not configured. Please set it in Settings > Backup & Restore.'
            });
        }

        const backupDir = settings.settings.local_backup_folder;
        const backupLocation = path.resolve(backupDir);

        // Validate backup location exists and is writable
        if (!fs.existsSync(backupDir)) {
            return res.status(400).json({
                error: 'Invalid backup location',
                message: 'Configured backup folder does not exist: ' + backupDir
            });
        }

        // Test write permissions
        try {
            const testFile = path.join(backupDir, 'test_write.tmp');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
        } catch (err) {
            return res.status(400).json({
                error: 'Permission denied',
                message: 'Cannot write to backup folder: ' + backupDir
            });
        }

        // Validate path for security
        try {
            const pathParts = backupLocation.split(path.sep);
            if (backupLocation.includes('..') || backupLocation.includes('~')) {
                return res.status(400).json({
                    error: 'Invalid backup location',
                    message: 'Backup location cannot contain .. or ~ characters'
                });
            }
        } catch (err) {
            return res.status(400).json({
                error: 'Invalid backup location',
                message: 'Invalid backup location path'
            });
        }

        // Set headers for progress tracking
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Transfer-Encoding': 'chunked'
        });

        // Send initial response
        res.write(JSON.stringify({
            message: 'Local folder backup started',
            status: 'in_progress'
        }));

        // Create backup with progress callback
        const backupInfo = await createBackup(backupLocation, (progress, message) => {
            res.write(JSON.stringify({
                progress: progress,
                message: message
            }) + '\n');
        });

        // Send final result
        res.write(JSON.stringify({
            success: true,
            backup: backupInfo,
            message: 'Backup to local folder completed successfully'
        }) + '\n');

        res.end();

    } catch (error) {
        console.error('Local backup creation error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Backup Failed',
                message: error.message
            });
        } else {
            res.write(JSON.stringify({
                error: 'Backup Failed',
                message: error.message
            }) + '\n');
            res.end();
        }
    }
});

/**
 * GET endpoint: Get list of available backup files
 */
app.get("/list", function (req, res) {
    try {
        const backupDir = getBackupDirectory();
        const backups = getBackupFiles(backupDir);
        
        res.json({
            success: true,
            backups: backups,
            backupDirectory: backupDir
        });
    } catch (error) {
        console.error('Error getting backup files:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get backup files'
        });
    }
});

/**
 * GET endpoint: Validate a backup file
 * Query parameter: file - path to backup file
 */
app.get("/validate", async function (req, res) {
    try {
        const backupPath = req.query.file;
        
        if (!backupPath) {
            return res.status(400).json({
                error: 'Missing parameter',
                message: 'Backup file path is required'
            });
        }

        // Validate file path to prevent directory traversal
        const resolvedPath = path.resolve(backupPath);
        const backupDir = getBackupDirectory();
        
        if (!resolvedPath.startsWith(backupDir)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied: file must be within backup directory'
            });
        }

        const validation = await validateBackup(resolvedPath);
        
        res.json({
            success: true,
            valid: validation.valid,
            ...validation
        });

    } catch (error) {
        console.error('Backup validation error:', error);
        res.status(500).json({
            error: 'Validation Failed',
            message: error.message
        });
    }
});

/**
 * POST endpoint: Restore from backup
 * Body: { backupPath: string, createBackupBeforeRestore?: boolean }
 */
app.post("/restore", async function (req, res) {
    try {
        const { backupPath, createBackupBeforeRestore = true } = req.body;
        
        if (!backupPath) {
            return res.status(400).json({
                error: 'Missing parameter',
                message: 'Backup file path is required'
            });
        }

        // Validate file path
        const resolvedPath = path.resolve(backupPath);
        const backupDir = getBackupDirectory();
        
        if (!resolvedPath.startsWith(backupDir)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied: file must be within backup directory'
            });
        }

        // Set headers for progress tracking
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Transfer-Encoding': 'chunked'
        });

        // Send initial response
        res.write(JSON.stringify({ 
            message: 'Restore started', 
            status: 'in_progress' 
        }));

        // Optionally create backup before restore
        if (createBackupBeforeRestore) {
            res.write(JSON.stringify({ 
                progress: 10, 
                message: 'Creating safety backup before restore...' 
            }));
            
            try {
                await createBackup(backupDir, (progress, message) => {
                    res.write(JSON.stringify({
                        progress: 5 + (progress * 0.1), // 5-15% range
                        message: `Safety backup: ${message}`
                    }) + '\n');
                });
            } catch (backupError) {
                res.write(JSON.stringify({
                    warning: 'Failed to create safety backup',
                    message: backupError.message
                }) + '\n');
            }
        }

        // Restore from backup
        const restoreInfo = await restoreBackup(resolvedPath, (progress, message) => {
            const startProgress = createBackupBeforeRestore ? 20 : 10;
            const adjustedProgress = startProgress + (progress * 0.8); // 80% of remaining progress
            res.write(JSON.stringify({
                progress: adjustedProgress,
                message: message
            }) + '\n');
        });

        // Send final result
        res.write(JSON.stringify({
            success: true,
            restore: restoreInfo,
            message: 'Restore completed successfully'
        }) + '\n');

        res.end();

    } catch (error) {
        console.error('Backup restore error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Restore Failed',
                message: error.message
            });
        } else {
            res.write(JSON.stringify({
                error: 'Restore Failed',
                message: error.message
            }) + '\n');
            res.end();
        }
    }
});

/**
 * DELETE endpoint: Delete a backup file
 * Query parameter: file - path to backup file
 */
app.delete("/file", async function (req, res) {
    try {
        const backupPath = req.query.file;
        
        if (!backupPath) {
            return res.status(400).json({
                error: 'Missing parameter',
                message: 'Backup file path is required'
            });
        }

        // Validate file path
        const resolvedPath = path.resolve(backupPath);
        const backupDir = getBackupDirectory();
        
        if (!resolvedPath.startsWith(backupDir)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied: file must be within backup directory'
            });
        }

        await deleteBackup(resolvedPath);
        
        res.json({
            success: true,
            message: 'Backup file deleted successfully'
        });

    } catch (error) {
        console.error('Backup deletion error:', error);
        res.status(500).json({
            error: 'Deletion Failed',
            message: error.message
        });
    }
});

/**
 * GET endpoint: Get backup directory information
 */
app.get("/directory", function (req, res) {
    try {
        const backupDir = getBackupDirectory();
        const stats = fs.existsSync(backupDir) ? fs.statSync(backupDir) : null;
        
        res.json({
            success: true,
            directory: backupDir,
            exists: fs.existsSync(backupDir),
            created: stats ? stats.ctime : null,
            accessible: true
        });
    } catch (error) {
        console.error('Error getting backup directory:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get backup directory information'
        });
    }
});

/**
 * POST endpoint: Test backup directory write permissions
 * Body: { directory?: string }
 */
app.post("/test-permissions", function (req, res) {
    try {
        const testDir = req.body.directory || getBackupDirectory();
        const testFile = path.join(testDir, 'test_write_permissions.tmp');
        
        // Ensure directory exists
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        
        // Test write permissions
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        
        res.json({
            success: true,
            directory: testDir,
            writable: true,
            message: 'Write permissions confirmed'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            writable: false,
            error: 'Write permission test failed',
            message: error.message
        });
    }
});

/**
 * GET endpoint: Get backup statistics
 */
app.get("/stats", function (req, res) {
    try {
        const backupDir = getBackupDirectory();
        const backups = getBackupFiles(backupDir);
        
        const totalBackups = backups.length;
        const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
        const oldestBackup = backups.length > 0 ? backups[backups.length - 1].created : null;
        const newestBackup = backups.length > 0 ? backups[0].created : null;
        
        // Get current database size
        const dbFiles = getDatabaseFiles(process.env.APPDATA, process.env.APPNAME);
        const totalDbSize = dbFiles.reduce((sum, db) => sum + db.size, 0);
        
        res.json({
            success: true,
            statistics: {
                totalBackups,
                totalBackupSize: totalSize,
                averageBackupSize: totalBackups > 0 ? Math.round(totalSize / totalBackups) : 0,
                oldestBackup,
                newestBackup,
                totalDatabaseSize: totalDbSize,
                backupDirectory: backupDir
            }
        });
    } catch (error) {
        console.error('Error getting backup statistics:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get backup statistics'
        });
    }
});