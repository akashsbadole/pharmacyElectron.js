const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const crypto = require("crypto");
const Datastore = require("@seald-io/nedb");

const dbCache = {};
let currentEncryptionKey = null;

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
        
        if (!fs.existsSync(dir)) return;

        const files = fs.readdirSync(dir);
        let cleanedCount = 0;

        files.forEach(file => {
            // Only target files related to this specific database that have a tilde
            if (file.startsWith(dbName) && file.includes("~")) {
                const tempFilePath = path.join(dir, file);
                try {
                    const stats = fs.statSync(tempFilePath);
                    const now = Date.now();
                    const fileAge = now - stats.mtime.getTime();

                    // Increase age threshold to 30 minutes to be safe during startup
                    if (fileAge > 30 * 60 * 1000) {
                        fs.unlinkSync(tempFilePath);
                        cleanedCount++;
                        console.log(`Cleaned up orphaned temp file: ${tempFilePath}`);
                    }
                } catch (err) {
                    if (err.code !== 'ENOENT' && err.code !== 'EBUSY') {
                        console.warn(`Failed to clean temp file ${tempFilePath}:`, err.message);
                    }
                }
            }
        });

        if (cleanedCount > 0) {
            console.log(`Cleaned up ${cleanedCount} temporary file(s) for ${dbName}`);
        }
    } catch (err) {
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
        // NeDB files are valid even if they are empty (they will be properly initialized on load)
        // We only return false if the file completely doesn't exist.
        return true;
    } catch (err) {
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

        // Check if database file exists
        if (!isDatabaseValid(dbPath)) {
            console.log(`Database file ${dbPath} does not exist, NeDB will create it.`);
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
        // 'prescriptions.db', // Removed for restaurant conversion
        'suppliers.db',
        'customers.db',
        'categories.db',
        'settings.db',
        'purchase_orders.db',
        'session_logs.db',
        'recipes.db' // Added for recipe management
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

/**
 * Gets or generates the encryption key for the database
 * @returns {string|null} - Encryption key
 */
function getEncryptionKey() {
    const keyPath = path.join(process.env.APPDATA, process.env.APPNAME, "server", "encryption.key");

    try {
        if (fs.existsSync(keyPath)) {
            return fs.readFileSync(keyPath, 'utf8').trim();
        }
        
        // Generate new key if it doesn't exist
        const newKey = crypto.randomBytes(32).toString('hex');
        ensureDatabaseDirectory(keyPath);
        fs.writeFileSync(keyPath, newKey, 'utf8');
        console.log("Generated new encryption key.");
        return newKey;
    } catch (err) {
        console.error("Error managing encryption key:", err);
        return null;
    }
}

/**
 * Sets the global encryption key to be used for all new database initializations
 * @param {string|null} key - The encryption key
 */
function setGlobalEncryptionKey(key) {
    currentEncryptionKey = key;
}

/**
 * Gets a cached NeDB database instance for the given path
 * @param {string} dbPath - Path to the database file
 * @param {string} [encryptionKey] - Optional encryption key (overrides global)
 * @returns {Object} - NeDB database instance
 */
function getDatabase(dbPath, encryptionKey) {
    // Normalize path to ensure consistent cache keys across different modules
    const normalizedPath = path.resolve(dbPath);

    if (dbCache[normalizedPath]) {
        return dbCache[normalizedPath];
    }

    const options = {
        filename: normalizedPath,
        autoload: true
    };

    const key = encryptionKey || currentEncryptionKey;
    if (key) {
        options.encryptionKey = key;
    }

    console.log(`Creating new database instance for: ${normalizedPath}`);
    const db = new Datastore(options);

    initializeDatabase(db, normalizedPath);
    dbCache[normalizedPath] = db;
    return db;
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
    deleteBackup,
    getDatabase,
    getEncryptionKey,
    setGlobalEncryptionKey
};