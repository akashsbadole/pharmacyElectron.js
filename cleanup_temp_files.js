const fs = require("fs");
const path = require("path");
const { cleanupTempFiles } = require("./api/database_utils");

/**
 * Script to clean up orphaned temporary database files
 * This helps prevent ENOENT errors during NeDB operations
 */

function cleanupOrphanedFiles() {
    const appData = process.env.APPDATA;
    const appName = process.env.APPNAME;
    
    if (!appData || !appName) {
        console.error("APPDATA or APPNAME environment variables not set");
        return;
    }

    const dbDir = path.join(appData, appName, "server", "databases");
    
    if (!fs.existsSync(dbDir)) {
        console.log("Database directory does not exist, nothing to clean up");
        return;
    }

    console.log(`Cleaning up orphaned temporary files in: ${dbDir}`);

    // List of database files to check
    const databaseFiles = [
        'inventory.db',
        'transactions.db',
        'users.db',
        'suppliers.db',
        'customers.db',
        'categories.db',
        'settings.db',
        'purchase_orders.db',
        'session_logs.db',
        'audit_logs.db',
        'contact.db'
    ];

    let totalCleaned = 0;

    // Clean up each database's temporary files
    databaseFiles.forEach(dbFile => {
        const dbPath = path.join(dbDir, dbFile);
        try {
            const cleanedCount = cleanupTempFiles(dbPath);
            totalCleaned += cleanedCount;
        } catch (error) {
            console.warn(`Failed to clean ${dbFile}:`, error.message);
        }
    });

    // Also check for any other temporary files in the databases directory
    try {
        const files = fs.readdirSync(dbDir);
        const tempFiles = files.filter(file => 
            file.includes("~") || 
            file.endsWith(".tmp") || 
            file.endsWith(".bak") ||
            file.endsWith(".swp")
        );

        tempFiles.forEach(tempFile => {
            const tempFilePath = path.join(dbDir, tempFile);
            try {
                fs.unlinkSync(tempFilePath);
                console.log(`Removed orphaned temp file: ${tempFile}`);
                totalCleaned++;
            } catch (error) {
                if (error.code !== 'ENOENT' && error.code !== 'EBUSY') {
                    console.warn(`Failed to remove ${tempFile}:`, error.message);
                }
            }
        });
    } catch (error) {
        console.warn("Error scanning database directory:", error.message);
    }

    console.log(`Cleanup completed. Total files cleaned: ${totalCleaned}`);
}

// Run cleanup if this script is executed directly
if (require.main === module) {
    cleanupOrphanedFiles();
}

module.exports = { cleanupOrphanedFiles };