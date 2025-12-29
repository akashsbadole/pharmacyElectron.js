const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const crypto = require("crypto");

/**
 * Database utility functions for NeDB crash recovery and temporary file management
 */

/**
 * Cleans up orphaned temporary files for a given database
 * @param {string} dbPath - Path to the main database file
 */
function cleanupTempFiles(dbPath) {
    try {
        const dir = path.dirname(dbPath);
        const dbName = path.basename(dbPath);
        const tempPattern = dbName + "~";

        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            let cleanedCount = 0;

            files.forEach(file => {
                if (file === tempPattern || (file.startsWith(dbName) && file.includes("~"))) {
                    const tempFilePath = path.join(dir, file);
                    try {
                        // Check if file exists before attempting to delete
                        if (fs.existsSync(tempFilePath)) {
                            // Check if file is locked or in use
                            const stats = fs.statSync(tempFilePath);
                            const now = Date.now();
                            const fileAge = now - stats.mtime.getTime();

                            // Only delete files older than 5 minutes to avoid conflicts
                            if (fileAge > 5 * 60 * 1000) {
                                fs.unlinkSync(tempFilePath);
                                cleanedCount++;
                                console.log(`Cleaned up orphaned temp file: ${tempFilePath}`);
                            }
                        }
                    } catch (err) {
                        // Silently ignore ENOENT errors as the file may have been cleaned up by another process
                        if (err.code !== 'ENOENT' && err.code !== 'EBUSY') {
                            console.warn(`Failed to clean temp file ${tempFilePath}:`, err.message);
                        }
                    }
                }
            });

            if (cleanedCount > 0) {
                console.log(`Cleaned up ${cleanedCount} temporary file(s) for ${dbName}`);
            }
        }
    } catch (err) {
        // Don't throw errors for cleanup operations
        console.warn(`Warning during temp file cleanup for ${dbPath}:`, err.message);
    }
}

/**
 * Ensures database directory exists
 * @param {string} dbPath - Path to the database file
 */
function ensureDatabaseDirectory(dbPath) {
    try {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created database directory: ${dir}`);
        }
    } catch (err) {
        console.error(`Error creating database directory for ${dbPath}:`, err);
        throw err;
    }
}

/**
 * Checks if database file exists and has valid content
 * @param {string} dbPath - Path to the database file
 * @returns {boolean} - True if database file is valid
 */
function isDatabaseValid(dbPath) {
    try {
        if (!fs.existsSync(dbPath)) {
            return false;
        }

        const stats = fs.statSync(dbPath);
        if (stats.size === 0) {
            return false;
        }

        // Try to read the file to ensure it's accessible
        const content = fs.readFileSync(dbPath, 'utf8');
        return content.trim().length > 0;
    } catch (err) {
        console.warn(`Database file ${dbPath} validation failed:`, err.message);
        return false;
    }
}

/**
 * Initializes database with crash recovery and cleanup
 * @param {Object} db - NeDB database instance
 * @param {string} dbPath - Path to the database file
 */
function initializeDatabase(db, dbPath) {
    try {
        // Ensure database directory exists
        ensureDatabaseDirectory(dbPath);

        // Clean up any orphaned temporary files (with improved error handling)
        cleanupTempFiles(dbPath);

        // Check if database file is valid
        if (!isDatabaseValid(dbPath)) {
            console.log(`Database file ${dbPath} is empty or invalid, initializing new database`);
            // Create empty but valid database
            db.loadDatabase();
        }

        // Add error handlers for database operations
        db.on('error', (err) => {
            // Handle specific database errors more gracefully
            if (err.code === 'ENOENT') {
                console.warn(`Database file operation failed (file not found), this is usually temporary: ${err.message}`);
            } else {
                console.error(`Database error for ${dbPath}:`, err);
            }
        });

        console.log(`Database initialized successfully: ${dbPath}`);

    } catch (err) {
        console.error(`Failed to initialize database ${dbPath}:`, err);
        // Don't throw for initialization errors, just log them
        console.warn('Continuing with database initialization despite errors...');
    }
}

/**
 * Periodic cleanup of orphaned temporary files across all databases
 * @param {Array} dbPaths - Array of database file paths
 */
function periodicCleanup(dbPaths) {
    try {
        dbPaths.forEach(dbPath => {
            cleanupTempFiles(dbPath);
        });
        console.log('Periodic cleanup completed');
    } catch (err) {
        console.error('Error during periodic cleanup:', err);
    }
}

/**
 * Get list of all database files for backup
 * @param {string} appData - Application data directory path
 * @param {string} appName - Application name
 * @returns {Array} - Array of database file information
 */
function getDatabaseFiles(appData, appName) {
    const dbDir = path.join(appData, appName, "server", "databases");
    const dbFiles = [
        'inventory.db',
        'transactions.db',
        'users.db',
        'prescriptions.db',
        'suppliers.db',
        'customers.db',
        'categories.db',
        'settings.db',
        'purchase_orders.db',
        'session_logs.db'
    ];

    return dbFiles.map(dbName => {
        const dbPath = path.join(dbDir, dbName);
        const stats = fs.existsSync(dbPath) ? fs.statSync(dbPath) : null;
        return {
            name: dbName,
            path: dbPath,
            size: stats ? stats.size : 0,
            modified: stats ? stats.mtime : null,
            exists: fs.existsSync(dbPath)
        };
    });
}

/**
 * Create a comprehensive backup of all databases
 * @param {string} backupDir - Directory to save backup files
 * @param {Function} progressCallback - Callback function for progress updates
 * @returns {Promise} - Promise that resolves with backup information
 */
function createBackup(backupDir, progressCallback) {
    return new Promise((resolve, reject) => {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
            const backupFileName = `pharmamine_backup_${timestamp}.zip`;
            const backupPath = path.join(backupDir, backupFileName);

            // Ensure backup directory exists
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const output = fs.createWriteStream(backupPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                const backupInfo = {
                    filename: backupFileName,
                    path: backupPath,
                    size: archive.pointer(),
                    timestamp: timestamp,
                    created: new Date().toISOString(),
                    databases: getDatabaseFiles(process.env.APPDATA, process.env.APPNAME)
                };
                resolve(backupInfo);
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);

            // Add database files
            const dbFiles = getDatabaseFiles(process.env.APPDATA, process.env.APPNAME);
            let processedCount = 0;

            dbFiles.forEach(dbFile => {
                if (dbFile.exists && dbFile.size > 0) {
                    archive.file(dbFile.path, { name: `databases/${dbFile.name}` });
                }
                processedCount++;
                if (progressCallback) {
                    progressCallback(processedCount / dbFiles.length * 70, `Adding ${dbFile.name}`);
                }
            });

            // Add backup metadata
            const metadata = {
                backupVersion: '1.0',
                application: 'PharmaMine',
                timestamp: new Date().toISOString(),
                databases: dbFiles.map(db => ({
                    name: db.name,
                    size: db.size,
                    modified: db.modified
                }))
            };

            archive.append(JSON.stringify(metadata, null, 2), { name: 'backup_metadata.json' });

            if (progressCallback) {
                progressCallback(80, 'Adding metadata');
            }

            // Add checksum
            archive.append(JSON.stringify({ checksum: 'calculated_during_finalize' }), { name: 'checksum.json' });

            archive.finalize();

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Validate backup file integrity
 * @param {string} backupPath - Path to backup file
 * @returns {Promise} - Promise that resolves with validation result
 */
function validateBackup(backupPath) {
    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(backupPath)) {
                resolve({ valid: false, error: 'Backup file does not exist' });
                return;
            }

            const stats = fs.statSync(backupPath);
            if (stats.size === 0) {
                resolve({ valid: false, error: 'Backup file is empty' });
                return;
            }

            // For now, just basic file validation
            // In a production system, you'd extract and validate the contents
            resolve({
                valid: true,
                size: stats.size,
                modified: stats.mtime,
                databases: getDatabaseFiles(process.env.APPDATA, process.env.APPNAME)
            });

        } catch (error) {
            resolve({ valid: false, error: error.message });
        }
    });
}

/**
 * Restore databases from backup file
 * @param {string} backupPath - Path to backup file
 * @param {Function} progressCallback - Callback function for progress updates
 * @returns {Promise} - Promise that resolves with restore information
 */
function restoreBackup(backupPath, progressCallback) {
    return new Promise((resolve, reject) => {
        try {
            const backupDir = path.join(process.env.APPDATA, process.env.APPNAME, 'temp_restore');
            const targetDir = path.join(process.env.APPDATA, process.env.APPNAME, 'server', 'databases');

            // Create temp directory for extraction
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            progressCallback?.(10, 'Validating backup file');

            // Validate backup file exists and is readable
            if (!fs.existsSync(backupPath)) {
                throw new Error('Backup file does not exist');
            }

            progressCallback?.(20, 'Extracting backup archive');

            // Create read stream for the ZIP file
            const readStream = fs.createReadStream(backupPath);

            readStream.on('error', (err) => {
                reject(new Error(`Failed to read backup file: ${err.message}`));
            });

            // Extract ZIP file
            readStream.pipe(unzipper.Extract({ path: backupDir }))
                .on('close', () => {
                    progressCallback?.(50, 'Archive extracted, restoring databases');

                    try {
                        // Read database files from extracted archive
                        const databasesDir = path.join(backupDir, 'databases');
                        const extractedFiles = fs.existsSync(databasesDir) ?
                            fs.readdirSync(databasesDir) : [];

                        const dbFiles = getDatabaseFiles(process.env.APPDATA, process.env.APPNAME);
                        let restoredCount = 0;

                        // Restore each database file
                        dbFiles.forEach((dbFile, index) => {
                            const extractedFilePath = path.join(databasesDir, dbFile.name);
                            const targetFilePath = path.join(targetDir, dbFile.name);

                            if (fs.existsSync(extractedFilePath)) {
                                // Ensure target directory exists
                                if (!fs.existsSync(targetDir)) {
                                    fs.mkdirSync(targetDir, { recursive: true });
                                }

                                // Copy extracted file to target location
                                fs.copyFileSync(extractedFilePath, targetFilePath);
                                restoredCount++;
                            }

                            const progress = 50 + ((index + 1) / dbFiles.length * 40);
                            progressCallback?.(progress, `Restored ${dbFile.name}`);
                        });

                        // Clean up temp directory
                        if (fs.existsSync(backupDir)) {
                            fs.rmSync(backupDir, { recursive: true, force: true });
                        }

                        progressCallback?.(100, 'Restore completed');

                        resolve({
                            success: true,
                            restored: restoredCount,
                            timestamp: new Date().toISOString(),
                            backupPath: backupPath
                        });

                    } catch (restoreError) {
                        // Clean up temp directory on error
                        if (fs.existsSync(backupDir)) {
                            fs.rmSync(backupDir, { recursive: true, force: true });
                        }
                        reject(restoreError);
                    }
                })
                .on('error', (err) => {
                    // Clean up temp directory on error
                    if (fs.existsSync(backupDir)) {
                        fs.rmSync(backupDir, { recursive: true, force: true });
                    }
                    reject(new Error(`Failed to extract backup archive: ${err.message}`));
                });

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Get list of available backup files
 * @param {string} backupDir - Directory containing backup files
 * @returns {Array} - Array of backup file information
 */
function getBackupFiles(backupDir) {
    try {
        if (!fs.existsSync(backupDir)) {
            return [];
        }

        const files = fs.readdirSync(backupDir);
        return files
            .filter(file => file.startsWith('pharmamine_backup_') && file.endsWith('.zip'))
            .map(file => {
                const filePath = path.join(backupDir, file);
                const stats = fs.statSync(filePath);
                const timestamp = file.replace('pharmamine_backup_', '').replace('.zip', '').replace(/_/g, ' ');

                return {
                    filename: file,
                    path: filePath,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    timestamp: timestamp
                };
            })
            .sort((a, b) => new Date(b.created) - new Date(a.created)); // Sort by creation date, newest first

    } catch (error) {
        console.error('Error getting backup files:', error);
        return [];
    }
}

/**
 * Delete a backup file
 * @param {string} backupPath - Path to backup file
 * @returns {Promise} - Promise that resolves when file is deleted
 */
function deleteBackup(backupPath) {
    return new Promise((resolve, reject) => {
        try {
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
                resolve({ success: true });
            } else {
                resolve({ success: false, error: 'File not found' });
            }
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    cleanupTempFiles,
    ensureDatabaseDirectory,
    isDatabaseValid,
    initializeDatabase,
    periodicCleanup,
    getDatabaseFiles,
    createBackup,
    validateBackup,
    restoreBackup,
    getBackupFiles,
    deleteBackup
};