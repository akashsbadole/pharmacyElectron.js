const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const path = require("path");
const appName = process.env.APPNAME || "PharmaMine";
const appData = process.env.APPDATA || process.env.HOME || process.env.USERPROFILE || __dirname;
const { getDatabase, createBackup } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

// Database paths
const dbPaths = {
    transactions: path.join(appData, appName, "server", "databases", "transactions.db"),
    settings: path.join(appData, appName, "server", "databases", "settings.db"),
    shifts: path.join(appData, appName, "server", "databases", "shifts.db"),
    waste: path.join(appData, appName, "server", "databases", "waste.db"),
    inventory: path.join(appData, appName, "server", "databases", "inventory.db")
};

// Initialize databases
let transactionsDB = getDatabase(dbPaths.transactions);
let settingsDB = getDatabase(dbPaths.settings);
let shiftsDB = getDatabase(dbPaths.shifts);
let wasteDB = getDatabase(dbPaths.waste);
let inventoryDB = getDatabase(dbPaths.inventory);

/**
 * GET endpoint: Get the welcome message for the Day Close API.
 */
app.get("/", function (req, res) {
    res.send("Day Close API");
});

/**
 * POST endpoint: Trigger day close operation
 * Body: { date?: string, force?: boolean, generateReport?: boolean, backup?: boolean }
 */
app.post("/close-day", async function (req, res) {
    try {
        const { date, force, generateReport, backup } = req.body;
        const closeDate = date ? new Date(date) : new Date();
        const closeDateStr = closeDate.toISOString().split('T')[0];
        
        console.log(`Starting day close for date: ${closeDateStr}`);
        
        // Initialize day close result
        const dayCloseResult = {
            date: closeDateStr,
            timestamp: new Date(),
            success: false,
            operations: {},
            errors: [],
            report: null,
            backup: null
        };
        
        try {
            // 1. Generate comprehensive day-end report
            if (generateReport !== false) { // Default to true
                dayCloseResult.report = await generateDayEndReport(closeDate);
                dayCloseResult.operations.reportGenerated = true;
            }
            
            // 2. Reset daily counters and create summary
            const resetResult = await resetDailyCounters(closeDate);
            dayCloseResult.operations = { ...dayCloseResult.operations, ...resetResult };
            
            // 3. Trigger backup if requested
            if (backup === true) {
                const backupDir = path.join(appData, appName, 'server', 'backups');
                const backupInfo = await createBackup(backupDir, (progress, status) => {
                    console.log(`Day close backup progress: ${progress}% - ${status}`);
                });
                dayCloseResult.backup = backupInfo;
                dayCloseResult.operations.backupCreated = true;
            }
            
            // 4. Update day close status in settings
            await updateDayCloseStatus(closeDateStr, true);
            
            dayCloseResult.success = true;
            dayCloseResult.message = `Day close completed successfully for ${closeDateStr}`;
            
            console.log(`Day close completed for ${closeDateStr}:`, dayCloseResult.message);
            res.json(dayCloseResult);
            
        } catch (error) {
            console.error('Day close operation failed:', error);
            dayCloseResult.success = false;
            dayCloseResult.errors.push(error.message);
            dayCloseResult.message = `Day close failed: ${error.message}`;
            res.status(500).json(dayCloseResult);
        }
        
    } catch (error) {
        console.error('Day close request failed:', error);
        res.status(500).json({
            error: "Internal Server Error",
            message: error.message
        });
    }
});

/**
 * GET endpoint: Get day close status and history
 */
app.get("/status", function (req, res) {
    const { startDate, endDate } = req.query;
    
    settingsDB.findOne({ _id: 1 }, function (err, settings) {
        if (err) {
            res.status(500).json({ error: "Database error" });
            return;
        }
        
        const dayCloseHistory = settings?.settings?.dayCloseHistory || [];
        
        let filteredHistory = dayCloseHistory;
        if (startDate && endDate) {
            const start = new Date(startDate).toISOString().split('T')[0];
            const end = new Date(endDate).toISOString().split('T')[0];
            filteredHistory = dayCloseHistory.filter(entry => entry.date >= start && entry.date <= end);
        }
        
        res.json({
            history: filteredHistory,
            settings: {
                autoDayClose: settings?.settings?.autoDayClose || false,
                dayCloseTime: settings?.settings?.dayCloseTime || "23:59",
                dayCloseDay: settings?.settings?.dayCloseDay || "everyday"
            }
        });
    });
});

/**
 * POST endpoint: Schedule automatic day close
 * Body: { time: "HH:mm", day: "everyday|friday|saturday|weekly", enabled: boolean }
 */
app.post("/schedule", function (req, res) {
    const { time, day, enabled } = req.body;
    
    if (!time || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
        return res.status(400).json({
            error: "Invalid time format",
            message: "Time must be in HH:mm format (e.g., 23:59)"
        });
    }
    
    if (!day || !["everyday", "friday", "saturday", "weekly"].includes(day)) {
        return res.status(400).json({
            error: "Invalid day setting",
            message: "Day must be 'everyday', 'friday', 'saturday', or 'weekly'"
        });
    }
    
    settingsDB.update(
        { _id: 1 },
        {
            $set: {
                "settings.autoDayClose": enabled === true,
                "settings.dayCloseTime": time,
                "settings.dayCloseDay": day
            }
        },
        {},
        function (err, numReplaced) {
            if (err) {
                res.status(500).json({
                    error: "Database error",
                    message: "Failed to update day close schedule"
                });
            } else {
                res.json({
                    success: true,
                    message: "Day close schedule updated successfully",
                    schedule: {
                        enabled: enabled === true,
                        time: time,
                        day: day
                    }
                });
            }
        }
    );
});

/**
 * GET endpoint: Get day close report for specific date
 * Query: date (required), format (json|pdf|html)
 */
app.get("/report", function (req, res) {
    const { date, format } = req.query;
    
    if (!date) {
        return res.status(400).json({
            error: "Date parameter is required",
            message: "Please provide a date in YYYY-MM-DD format"
        });
    }
    
    const reportDate = new Date(date);
    if (isNaN(reportDate.getTime())) {
        return res.status(400).json({
            error: "Invalid date format",
            message: "Please provide a valid date in YYYY-MM-DD format"
        });
    }
    
    generateDayEndReport(reportDate)
        .then(report => {
            if (format === 'pdf' || format === 'html') {
                // For now, return JSON - PDF/HTML generation can be added later
                res.json({
                    ...report,
                    note: `PDF/HTML format requested (${format}) but returning JSON. Can be enhanced later.`
                });
            } else {
                res.json(report);
            }
        })
        .catch(error => {
            res.status(500).json({
                error: "Failed to generate report",
                message: error.message
            });
        });
});

/**
 * Generate comprehensive day-end report
 */
async function generateDayEndReport(date) {
    return new Promise((resolve, reject) => {
        try {
            const dateStr = date.toISOString().split('T')[0];
            const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
            const endOfDay = new Date(dateStr + 'T23:59:59.999Z');
            
            console.log(`Generating day-end report for ${dateStr}`);
            
            // Get all transactions for the day
            transactionsDB.find({
                date: { $gte: startOfDay.toISOString(), $lte: endOfDay.toISOString() },
                status: 1
            }, function (err, transactions) {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Calculate summary statistics
                const report = {
                    date: dateStr,
                    generatedAt: new Date(),
                    summary: {
                        totalSales: 0,
                        totalTransactions: transactions.length,
                        averageTransactionValue: 0,
                        totalTax: 0,
                        totalDiscount: 0,
                        paymentMethods: {},
                        topSellingItems: [],
                        staffPerformance: {}
                    },
                    transactions: transactions.map(t => ({
                        id: t._id,
                        order: t.order,
                        total: parseFloat(t.total) || 0,
                        payment_mode: t.payment_mode || 'Cash',
                        user: t.user || 'Unknown',
                        date: t.date
                    }))
                };
                
                // Process transactions for summary
                let totalSales = 0;
                let totalTax = 0;
                let totalDiscount = 0;
                let itemSales = {};
                let staffSales = {};
                let paymentMethods = {};
                
                transactions.forEach(transaction => {
                    const total = parseFloat(transaction.total) || 0;
                    const tax = parseFloat(transaction.tax) || 0;
                    const discount = parseFloat(transaction.discount) || 0;
                    
                    totalSales += total;
                    totalTax += tax;
                    totalDiscount += discount;
                    
                    // Track payment methods
                    const paymentMethod = transaction.payment_mode || 'Cash';
                    paymentMethods[paymentMethod] = (paymentMethods[paymentMethod] || 0) + total;
                    
                    // Track item sales
                    if (transaction.items && Array.isArray(transaction.items)) {
                        transaction.items.forEach(item => {
                            const itemId = item.id || item.product_id;
                            const itemName = item.product_name || item.name || 'Unknown Item';
                            const itemTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0);
                            
                            if (!itemSales[itemId]) {
                                itemSales[itemId] = {
                                    name: itemName,
                                    quantity: 0,
                                    revenue: 0
                                };
                            }
                            
                            itemSales[itemId].quantity += parseInt(item.quantity) || 0;
                            itemSales[itemId].revenue += itemTotal;
                        });
                    }
                    
                    // Track staff performance
                    const staffName = transaction.user || 'Unknown';
                    if (!staffSales[staffName]) {
                        staffSales[staffName] = {
                            name: staffName,
                            transactionCount: 0,
                            totalSales: 0
                        };
                    }
                    
                    staffSales[staffName].transactionCount += 1;
                    staffSales[staffName].totalSales += total;
                });
                
                // Calculate averages
                report.summary.totalSales = totalSales;
                report.summary.totalTax = totalTax;
                report.summary.totalDiscount = totalDiscount;
                report.summary.averageTransactionValue = transactions.length > 0 ? totalSales / transactions.length : 0;
                report.summary.paymentMethods = paymentMethods;
                
                // Get top selling items (top 10)
                report.summary.topSellingItems = Object.entries(itemSales)
                    .map(([id, data]) => ({ id, ...data }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 10);
                
                // Staff performance summary
                report.summary.staffPerformance = Object.entries(staffSales)
                    .map(([name, data]) => data)
                    .sort((a, b) => b.totalSales - a.totalSales);
                
                // Get inventory changes (if available)
                inventoryDB.find({}, function (err, inventory) {
                    if (err) {
                        console.warn('Could not fetch inventory for report:', err);
                        resolve(report);
                        return;
                    }
                    
                    report.inventorySummary = {
                        totalItems: inventory.length,
                        lowStockItems: inventory.filter(item => 
                            (parseInt(item.quantity) || 0) <= (parseInt(item.reorder_level) || 0)
                        ).length,
                        totalInventoryValue: inventory.reduce((sum, item) => {
                            const quantity = parseInt(item.quantity) || 0;
                            const price = parseFloat(item.price) || 0;
                            return sum + (quantity * price);
                        }, 0)
                    };
                    
                    // Get waste data (if available)
                    wasteDB.find({
                        date: { $gte: startOfDay.toISOString(), $lte: endOfDay.toISOString() }
                    }, function (err, wasteEntries) {
                        if (err) {
                            console.warn('Could not fetch waste data for report:', err);
                            resolve(report);
                            return;
                        }
                        
                        report.wasteSummary = {
                            totalWasteEntries: wasteEntries.length,
                            totalWasteValue: wasteEntries.reduce((sum, entry) => {
                                return sum + (parseFloat(entry.value) || 0);
                            }, 0),
                            wasteReasons: wasteEntries.reduce((acc, entry) => {
                                const reason = entry.reason || 'Unknown';
                                acc[reason] = (acc[reason] || 0) + 1;
                                return acc;
                            }, {})
                        };
                        
                        console.log(`Day-end report generated for ${dateStr}: ${transactions.length} transactions, ₹${totalSales.toFixed(2)} total sales`);
                        resolve(report);
                    });
                });
            });
            
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Reset daily counters and create summary
 */
async function resetDailyCounters(date) {
    return new Promise((resolve, reject) => {
        try {
            const dateStr = date.toISOString().split('T')[0];
            console.log(`Resetting daily counters for ${dateStr}`);
            
            // Get current settings
            settingsDB.findOne({ _id: 1 }, function (err, settings) {
                if (err) {
                    reject(err);
                    return;
                }
                
                const settingsData = settings || { settings: {} };
                const dayCloseHistory = settingsData.settings.dayCloseHistory || [];
                
                // Create day close summary
                const daySummary = {
                    date: dateStr,
                    closedAt: new Date(),
                    summary: {
                        totalTransactions: 0,
                        totalSales: 0,
                        activeShifts: 0,
                        operations: []
                    }
                };
                
                // Count transactions for the day
                const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
                const endOfDay = new Date(dateStr + 'T23:59:59.999Z');
                
                transactionsDB.find({
                    date: { $gte: startOfDay.toISOString(), $lte: endOfDay.toISOString() },
                    status: 1
                }, function (err, transactions) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    daySummary.summary.totalTransactions = transactions.length;
                    daySummary.summary.totalSales = transactions.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
                    
                    // Count active shifts
                    shiftsDB.find({ status: 'open' }, function (err, openShifts) {
                        if (err) {
                            console.warn('Could not fetch open shifts:', err);
                        }
                        
                        daySummary.summary.activeShifts = openShifts ? openShifts.length : 0;
                        daySummary.summary.operations.push('Transaction summary created');
                        
                        // Close all open shifts for the day
                        if (openShifts && openShifts.length > 0) {
                            let closedShifts = 0;
                            openShifts.forEach(shift => {
                                shiftsDB.update(
                                    { shift_id: shift.shift_id },
                                    { 
                                        $set: { 
                                            status: 'closed',
                                            closed_at: new Date()
                                        }
                                    },
                                    {},
                                    function (err) {
                                        if (!err) {
                                            closedShifts++;
                                            if (closedShifts === openShifts.length) {
                                                daySummary.summary.operations.push(`${closedShifts} shifts closed`);
                                                completeReset();
                                            }
                                        }
                                    }
                                );
                            });
                        } else {
                            completeReset();
                        }
                        
                        function completeReset() {
                            // Add to history
                            dayCloseHistory.push(daySummary);
                            
                            // Keep only last 30 days of history
                            if (dayCloseHistory.length > 30) {
                                dayCloseHistory.splice(0, dayCloseHistory.length - 30);
                            }
                            
                            // Update settings with new history and reset daily counters
                            settingsDB.update(
                                { _id: 1 },
                                {
                                    $set: {
                                        "settings.dayCloseHistory": dayCloseHistory,
                                        "settings.lastDayCloseDate": dateStr,
                                        "settings.dailyTransactionCount": 0,
                                        "settings.dailySalesTotal": 0,
                                        "settings.dailyShiftCount": 0
                                    }
                                },
                                {},
                                function (err) {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        console.log(`Daily counters reset for ${dateStr}`);
                                        resolve({
                                            transactionsProcessed: daySummary.summary.totalTransactions,
                                            salesTotal: daySummary.summary.totalSales,
                                            shiftsClosed: daySummary.summary.activeShifts,
                                            operations: daySummary.summary.operations
                                        });
                                    }
                                }
                            );
                        }
                    });
                });
            });
            
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Update day close status in settings
 */
function updateDayCloseStatus(dateStr, completed) {
    return new Promise((resolve, reject) => {
        settingsDB.update(
            { _id: 1 },
            { $set: { "settings.lastDayCloseDate": dateStr } },
            {},
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}

/**
 * Check if day close should be triggered automatically
 */
function checkAutoDayClose() {
    settingsDB.findOne({ _id: 1 }, function (err, settings) {
        if (err || !settings || !settings.settings) return;
        
        const { autoDayClose, dayCloseTime, dayCloseDay, lastDayCloseDate } = settings.settings;
        
        if (!autoDayClose) return;
        
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
        const currentDayStr = now.toISOString().split('T')[0];
        
        // Check if we already did day close today
        if (lastDayCloseDate === currentDayStr) {
            return;
        }
        
        // Check if it's time for day close
        if (currentTime === dayCloseTime) {
            // Check day of week condition
            let shouldClose = false;
            const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
            
            switch (dayCloseDay) {
                case 'everyday':
                    shouldClose = true;
                    break;
                case 'friday':
                    shouldClose = dayOfWeek === 5; // Friday
                    break;
                case 'saturday':
                    shouldClose = dayOfWeek === 6; // Saturday
                    break;
                case 'weekly':
                    shouldClose = dayOfWeek === 0; // Sunday
                    break;
            }
            
            if (shouldClose) {
                console.log('Triggering automatic day close...');
                app.post('/close-day', { 
                    body: { 
                        date: currentDayStr, 
                        generateReport: true, 
                        backup: true 
                    } 
                });
            }
        }
    });
}

// Export function for external use
module.exports.checkAutoDayClose = checkAutoDayClose;