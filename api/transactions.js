let app = require("express")();
let server = require("http").Server(app);
let bodyParser = require("body-parser");
let Datastore = require("@seald-io/nedb");
let Inventory = require("./inventory");
const AuditLogs = require("./audit_logs");
const path = require("path");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
const dbPath = path.join(
  appData,
  appName,
  "server",
  "databases",
  "transactions.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

let transactionsDB = getDatabase(dbPath);
transactionsDB.ensureIndex({ fieldName: "_id", unique: true });

/**
 * GET endpoint: Get the welcome message for the Transactions API.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/", function (req, res) {
  res.send("Transactions API");
});

/**
 * GET endpoint: Get details of all transactions.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/all", function (req, res) {
  transactionsDB.find({}, function (err, docs) {
    res.send(docs);
  });
});

/**
 * GET endpoint: Get on-hold transactions.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/on-hold", function (req, res) {
  transactionsDB.find(
    { $and: [{ ref_number: { $ne: "" } }, { status: 0 }] },
    function (err, docs) {
      if (docs) res.send(docs);
    },
  );
});

/**
 * GET endpoint: Get customer orders with a status of 0 and an empty reference number.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/customer-orders", function (req, res) {
  transactionsDB.find(
    { $and: [{ customer: { $ne: "0" } }, { status: 0 }, { ref_number: "" }] },
    function (err, docs) {
      if (docs) res.send(docs);
    },
  );
});

/**
 * GET endpoint: Get transactions based on date, user, and till parameters.
 *
 * @param {Object} req request object with query parameters.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/by-date", function (req, res) {
  let startDate = new Date(req.query.start);
  let endDate = new Date(req.query.end);

  if (req.query.user == 0 && req.query.till == 0) {
    transactionsDB.find(
      {
        $and: [
          { date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() } },
          { status: parseInt(req.query.status) },
        ],
      },
      function (err, docs) {
        if (docs) res.send(docs);
      },
    );
  }

  if (req.query.user != 0 && req.query.till == 0) {
    transactionsDB.find(
      {
        $and: [
          { date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() } },
          { status: parseInt(req.query.status) },
          { user_id: parseInt(req.query.user) },
        ],
      },
      function (err, docs) {
        if (docs) res.send(docs);
      },
    );
  }

  if (req.query.user == 0 && req.query.till != 0) {
    transactionsDB.find(
      {
        $and: [
          { date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() } },
          { status: parseInt(req.query.status) },
          { till: parseInt(req.query.till) },
        ],
      },
      function (err, docs) {
        if (docs) res.send(docs);
      },
    );
  }

  if (req.query.user != 0 && req.query.till != 0) {
    transactionsDB.find(
      {
        $and: [
          { date: { $gte: startDate.toJSON(), $lte: endDate.toJSON() } },
          { status: parseInt(req.query.status) },
          { till: parseInt(req.query.till) },
          { user_id: parseInt(req.query.user) },
        ],
      },
      function (err, docs) {
        if (docs) res.send(docs);
      },
    );
  }
});

/**
 * POST endpoint: Create a new transaction.
 *
 * @param {Object} req request object with transaction data in the body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.post("/new", function (req, res) {
  let newTransaction = req.body;

  // Ensure tax details structure exist (Default to 0 if not provided)
  newTransaction.tax_details = newTransaction.tax_details || {
      cgst: 0,
      sgst: 0,
      igst: 0,
      total_tax: 0
  };

  // Ensure payment mode exists (Default to Cash)
  newTransaction.payment_mode = newTransaction.payment_mode || "Cash";

  // Find current open shift for this user/till combination
  if (newTransaction.user_id && newTransaction.till) {
    // Use the shifts database directly instead of HTTP call
    const shiftsDB = getDatabase(path.join(
      appData,
      appName,
      "server",
      "databases",
      "shifts.db",
    ));

    shiftsDB.findOne({
      user_id: parseInt(newTransaction.user_id),
      till_id: parseInt(newTransaction.till),
      status: 'open'
    }, function (err, currentShift) {
      if (!err && currentShift && currentShift.shift_id) {
        newTransaction.shift_id = currentShift.shift_id;
      }

      // Proceed with transaction creation
      createTransaction();
    });
  } else {
    // No user_id or till, proceed normally
    createTransaction();
  }

  function createTransaction() {
    transactionsDB.insert(newTransaction, function (err, transaction) {
      if (err) {
        console.error(err);
        res.status(500).json({
          error: "Internal Server Error",
          message: "An unexpected error occurred.",
        });
      } else {
        res.sendStatus(200);

        if (newTransaction.paid >= newTransaction.total) {
          Inventory.decrementInventory(newTransaction.items);

          // Update shift expected cash if we have a shift_id
          if (newTransaction.shift_id) {
            updateShiftExpectedCash(newTransaction);
          }

          // Removed pharmaceutical audit logging for restaurant conversion
        }
      }
    });
  }
});

/**
 * Helper function to update shift expected cash when a transaction occurs
 */
function updateShiftExpectedCash(transaction) {
  const shiftsDB = getDatabase(path.join(
    appData,
    appName,
    "server",
    "databases",
    "shifts.db",
  ));

  const transactionAmount = parseFloat(transaction.total) || 0;
  const transactionType = transaction.status === 1 ? 'sale' : 'pending';
  const paymentMode = transaction.payment_mode || 'Cash';

  shiftsDB.findOne({ shift_id: transaction.shift_id }, function (err, shift) {
    if (err) {
      console.error('Error finding shift for update:', err);
      return;
    }

    if (!shift || shift.status !== 'open') {
      console.log('Shift not found or not open');
      return;
    }

    const updateData = {
      transactions_count: (shift.transactions_count || 0) + 1
    };

    // Update expected cash based on transaction type
    if (transactionType === 'sale' || transactionType === 'payment') {
      updateData.expected_cash = (shift.expected_cash || 0) + transactionAmount;
      if (paymentMode === 'Cash') {
        updateData.cash_sales = (shift.cash_sales || 0) + transactionAmount;
      } else {
        updateData.card_sales = (shift.card_sales || 0) + transactionAmount;
      }
    } else if (transactionType === 'return' || transactionType === 'refund') {
      updateData.expected_cash = (shift.expected_cash || 0) - transactionAmount;
      updateData.returns = (shift.returns || 0) + transactionAmount;
    }

    shiftsDB.update(
      { shift_id: transaction.shift_id },
      { $set: updateData },
      {},
      function (err, numReplaced) {
        if (err) {
          console.error('Error updating shift expected cash:', err);
        } else {
          console.log('Shift expected cash updated successfully');
        }
      }
    );
  });
}

/**
 * PUT endpoint: Update an existing transaction.
 *
 * @param {Object} req request object with transaction data in the body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.put("/new", function (req, res) {
  let oderId = req.body._id;
  transactionsDB.update(
    {
      _id: oderId,
    },
    req.body,
    {},
    function (err, numReplaced, order) {
      if (err) {
        console.error(err);
        res.status(500).json({
          error: "Internal Server Error",
          message: "An unexpected error occurred.",
        });
      } else {
        res.sendStatus(200);
      }
    },
  );
});

/**
 * POST endpoint: Delete a transaction.
 *
 * @param {Object} req request object with transaction data in the body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.post("/delete", function (req, res) {
  let transaction = req.body;
  transactionsDB.remove(
    {
      _id: transaction.orderId,
    },
    function (err, numRemoved) {
      if (err) {
        console.error(err);
        res.status(500).json({
          error: "Internal Server Error",
          message: "An unexpected error occurred.",
        });
      } else {
        res.sendStatus(200);
      }
    },
  );
});

/**
 * GET endpoint: Get details of a specific transaction by transaction ID.
 *
 * @param {Object} req request object with transaction ID as a parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/:transactionId", function (req, res) {
  transactionsDB.find({ _id: req.params.transactionId }, function (err, doc) {
    if (doc) res.send(doc[0]);
  });
});

/**
 * GET endpoint: Get sales report with revenue, profit, and trends.
 * Query parameters: start, end, user, till, groupBy
 */
app.get("/reports/sales", function (req, res) {
  let startDate = new Date(req.query.start);
  let endDate = new Date(req.query.end);
  let userFilter = req.query.user && req.query.user != 0 ? parseInt(req.query.user) : null;
  let tillFilter = req.query.till && req.query.till != 0 ? parseInt(req.query.till) : null;
  let groupBy = req.query.groupBy || 'day';

  let query = {
    $and: [
      { date: { $gte: startDate.toISOString(), $lte: endDate.toISOString() } },
      { status: 1 }
    ]
  };

  if (userFilter) query.$and.push({ user_id: userFilter });
  if (tillFilter) query.$and.push({ till: tillFilter });

  transactionsDB.find(query, function (err, transactions) {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    // Calculate total revenue and profit
    let totalRevenue = 0;
    let totalProfit = 0;
    let trends = {};

    // Get inventory data for profit calculation
    Inventory.getInventory(function(inventory) {
      const inventoryMap = {};
      inventory.forEach(item => {
        inventoryMap[item._id] = item;
      });

      transactions.forEach(transaction => {
        let revenue = parseFloat(transaction.total) || 0;
        totalRevenue += revenue;

        // Calculate profit if cost data available
        if (transaction.items && Array.isArray(transaction.items)) {
          transaction.items.forEach(item => {
            const inventoryItem = inventoryMap[item.id];
            if (inventoryItem && inventoryItem.cost) {
              const cost = parseFloat(inventoryItem.cost) || 0;
              const price = parseFloat(item.price) || 0;
              const quantity = parseInt(item.quantity) || 0;
              totalProfit += (price - cost) * quantity;
            }
          });
        }

        // Group trends by date
        let dateKey;
        let transactionDate = new Date(transaction.date);
        
        switch(groupBy) {
          case 'month':
            dateKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
            break;
          case 'year':
            dateKey = `${transactionDate.getFullYear()}`;
            break;
          default: // day
            dateKey = transactionDate.toISOString().split('T')[0];
        }

        if (!trends[dateKey]) {
          trends[dateKey] = { date: dateKey, revenue: 0, profit: 0 };
        }
        trends[dateKey].revenue += revenue;
        
        // Calculate profit for this trend entry
        if (transaction.items && Array.isArray(transaction.items)) {
          transaction.items.forEach(item => {
            const inventoryItem = inventoryMap[item.id];
            if (inventoryItem && inventoryItem.cost) {
              const cost = parseFloat(inventoryItem.cost) || 0;
              const price = parseFloat(item.price) || 0;
              const quantity = parseInt(item.quantity) || 0;
              trends[dateKey].profit += (price - cost) * quantity;
            }
          });
        }
      });

      res.json({
        totalRevenue: totalRevenue,
        totalProfit: totalProfit,
        trends: Object.values(trends)
      });
    });
  });
});

/**
 * GET endpoint: Get inventory turnover report.
 * Query parameters: start, end
 */
app.get("/reports/inventory-turnover", function (req, res) {
  // Validate query parameters
  if (!req.query.start || !req.query.end) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Both start and end parameters are required"
    });
  }

  // Parse dates with validation
  let startDate, endDate;
  try {
    startDate = new Date(req.query.start);
    endDate = new Date(req.query.end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid date format for start or end parameter"
      });
    }
  } catch (error) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Invalid date format"
    });
  }

  transactionsDB.find({
    $and: [
      { date: { $gte: startDate.toISOString(), $lte: endDate.toISOString() } },
      { status: 1 }
    ]
  }, function (err, transactions) {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    // Calculate total COGS
    let totalCOGS = 0;

    // Get inventory data for cost calculation
    Inventory.getInventory(function(inventory) {
      const inventoryMap = {};
      inventory.forEach(item => {
        inventoryMap[item._id] = item;
      });

      transactions.forEach(transaction => {
        if (transaction.items && Array.isArray(transaction.items)) {
          transaction.items.forEach(item => {
            const inventoryItem = inventoryMap[item.id];
            if (inventoryItem && inventoryItem.cost) {
              const cost = parseFloat(inventoryItem.cost) || 0;
              const quantity = parseInt(item.quantity) || 0;
              totalCOGS += cost * quantity;
            }
          });
        }
      });

      // Calculate average inventory value
      let totalInventoryValue = 0;
      inventory.forEach(item => {
        const quantity = parseInt(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        totalInventoryValue += quantity * price;
      });

      let averageInventoryValue = inventory.length > 0 ? totalInventoryValue / inventory.length : 0;
      let turnoverRate = averageInventoryValue > 0 ? totalCOGS / averageInventoryValue : 0;
      let daysInStock = turnoverRate > 0 ? 365 / turnoverRate : 0;

      res.json({
        turnoverRate: parseFloat(turnoverRate.toFixed(2)),
        daysInStock: parseFloat(daysInStock.toFixed(1)),
        totalCOGS: parseFloat(totalCOGS.toFixed(2)),
        averageInventoryValue: parseFloat(averageInventoryValue.toFixed(2))
      });
    });
  });
});

/**
 * GET endpoint: Get staff activity report.
 * Query parameters: start, end
 */
app.get("/reports/staff-activity", function (req, res) {
  let startDate = new Date(req.query.start);
  let endDate = new Date(req.query.end);

  // Get transaction data for staff performance
  transactionsDB.find({
    $and: [
      { date: { $gte: startDate.toISOString(), $lte: endDate.toISOString() } },
      { status: 1 }
    ]
  }, function (err, transactions) {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    // Group by user_id
    let staffData = {};
    
    transactions.forEach(transaction => {
      const userId = transaction.user_id;
      if (!staffData[userId]) {
        staffData[userId] = {
          userId: userId,
          name: `User ${userId}`, // Will be updated with actual names
          loginCount: 0,
          lastLogin: null,
          totalSales: 0,
          transactionCount: 0
        };
      }
      
      staffData[userId].totalSales += parseFloat(transaction.total) || 0;
      staffData[userId].transactionCount += 1;
    });

    // Get user names from users database
    const Users = require("./users");
    Users.getUsers(function(users) {
      users.forEach(user => {
        if (staffData[user._id]) {
          staffData[user._id].name = user.name || user.username || `User ${user._id}`;
        }
      });

      // For now, set loginCount to 0 as session logging integration will be handled separately
      // In a full implementation, we would query session_logs here
      const staffArray = Object.values(staffData).map(staff => ({
        ...staff,
        loginCount: 0, // Placeholder - will be populated with session log data
        lastLogin: null // Placeholder - will be populated with session log data
      }));

      res.json({ staff: staffArray });
    });
  });
});

/**
 * GET endpoint: Get purchase history for a specific customer.
 */
app.get("/history/customer/:customerId", function (req, res) {
    const customerId = req.params.customerId; // Assuming customerId in transaction matches this
    // Note: In transactions.js, customer field stores ID or "0".
    
    transactionsDB.find({ customer: customerId }, function(err, docs) {
         if(err) {
             console.error(err);
             res.status(500).json({ error: "Internal Server Error" });
         } else {
             res.send(docs);
         }
    });
});

/**
 * GET endpoint: Removed regulatory report for restricted drugs (restaurant conversion)
 */

/**
 * POST endpoint: Share invoice (E-Invoicing stub).
 */
app.post("/share", function (req, res) {
    const { transactionId, method, recipient } = req.body;
    console.log(`Sharing invoice ${transactionId} via ${method} to ${recipient}`);
    // Future integration with Email/WhatsApp API goes here.
    res.json({ success: true, message: `Invoice shared via ${method}` });
});

/**
 * POST endpoint: Process item return/refund.
 */
app.post("/return", function (req, res) {
    const { transactionId, items, reason, refundAmount, refundMethod, notes } = req.body;

    // Validate input
    if (!transactionId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Transaction ID and items are required for return."
        });
    }

    // Find the original transaction
    transactionsDB.findOne({ _id: transactionId }, function (err, transaction) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Database error occurred."
            });
        }

        if (!transaction) {
            return res.status(404).json({
                error: "Transaction Not Found",
                message: "The specified transaction could not be found."
            });
        }

        // Check if transaction is eligible for return (completed sales only)
        if (transaction.status !== 1) {
            return res.status(400).json({
                error: "Invalid Transaction",
                message: "Only completed transactions can be returned."
            });
        }

        // Validate items to be returned
        const validItems = [];
        const invalidItems = [];

        items.forEach(returnItem => {
            const originalItem = transaction.items.find(item =>
                item.id === returnItem.id || item.product_id === returnItem.id
            );

            if (originalItem) {
                const returnQuantity = parseInt(returnItem.quantity) || 0;
                const originalQuantity = parseInt(originalItem.quantity) || 0;

                if (returnQuantity > 0 && returnQuantity <= originalQuantity) {
                    validItems.push({
                        ...originalItem,
                        returnQuantity: returnQuantity,
                        returnReason: returnItem.reason || 'General Return',
                        returnNotes: returnItem.notes || ''
                    });
                } else {
                    invalidItems.push({
                        id: returnItem.id,
                        requestedQuantity: returnQuantity,
                        availableQuantity: originalQuantity,
                        reason: 'Invalid quantity'
                    });
                }
            } else {
                invalidItems.push({
                    id: returnItem.id,
                    reason: 'Item not found in transaction'
                });
            }
        });

        if (invalidItems.length > 0) {
            return res.status(400).json({
                error: "Invalid Items",
                message: "Some items cannot be returned.",
                invalidItems: invalidItems
            });
        }

        // Calculate refund amount
        const calculatedRefundAmount = validItems.reduce((total, item) => {
            return total + (parseFloat(item.price) * item.returnQuantity);
        }, 0);

        const finalRefundAmount = refundAmount || calculatedRefundAmount;

        // Create return transaction record
        const returnTransaction = {
            _id: Math.floor(Date.now() / 1000),
            originalTransactionId: transactionId,
            type: 'return',
            order: Date.now(),
            ref_number: `RTN-${transaction.order}`,
            customer: transaction.customer,
            status: 1, // Completed return
            subtotal: -finalRefundAmount,
            tax: 0, // Tax adjustments handled separately
            order_type: transaction.order_type,
            items: validItems.map(item => ({
                id: item.id,
                product_id: item.product_id,
                product_name: item.product_name,
                sku: item.sku,
                price: item.price,
                quantity: -item.returnQuantity, // Negative quantity for return
                returnReason: item.returnReason,
                returnNotes: item.returnNotes
            })),
            date: new Date(),
            total: -finalRefundAmount,
            paid: -finalRefundAmount,
            change: 0,
            refund_method: refundMethod || 'Cash',
            return_reason: reason,
            return_notes: notes || '',
            user: req.body.user || 'System',
            user_id: req.body.user_id || transaction.user_id || 0,
            till: req.body.till || transaction.till || 0,
            return_date: new Date(),
            shift_id: transaction.shift_id // Inherit shift_id from original transaction
        };

        // Insert return transaction
        transactionsDB.insert(returnTransaction, function (err, savedReturn) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to create return transaction."
                });
            }

            // Adjust inventory - increment stock for returned items
            const returnItemsForInventory = validItems.map(item => ({
                id: item.id,
                quantity: item.returnQuantity
            }));

            Inventory.incrementInventory(returnItemsForInventory);

            // Update shift expected cash for the return
            if (returnTransaction.shift_id) {
                updateShiftExpectedCashForReturn(returnTransaction);
            }

            // Update original transaction to track returns
            const updatedItems = [...transaction.items];
            validItems.forEach(returnItem => {
                const itemIndex = updatedItems.findIndex(item =>
                    item.id === returnItem.id || item.product_id === returnItem.id
                );
                if (itemIndex >= 0) {
                    if (!updatedItems[itemIndex].returns) {
                        updatedItems[itemIndex].returns = [];
                    }
                    updatedItems[itemIndex].returns.push({
                        date: new Date(),
                        quantity: returnItem.returnQuantity,
                        reason: returnItem.returnReason,
                        notes: returnItem.returnNotes,
                        refundAmount: parseFloat(returnItem.price) * returnItem.returnQuantity
                    });
                }
            });

            transactionsDB.update(
                { _id: transactionId },
                { $set: { items: updatedItems } },
                {},
                function (err) {
                    if (err) {
                        console.error('Error updating original transaction:', err);
                        // Don't fail the whole operation for this
                    }

                    res.json({
                        success: true,
                        message: "Return processed successfully",
                        returnTransaction: savedReturn,
                        refundAmount: finalRefundAmount,
                        returnedItems: validItems.length
                    });
                }
            );
        });
    });
});

/**
 * Helper function to update shift expected cash for returns
 */
function updateShiftExpectedCashForReturn(returnTransaction) {
  const shiftsDB = getDatabase(path.join(
    appData,
    appName,
    "server",
    "databases",
    "shifts.db",
  ));

  const refundAmount = Math.abs(parseFloat(returnTransaction.total) || 0);

  shiftsDB.findOne({ shift_id: returnTransaction.shift_id }, function (err, shift) {
    if (err) {
      console.error('Error finding shift for return update:', err);
      return;
    }

    if (!shift || shift.status !== 'open') {
      console.log('Shift not found or not open for return update');
      return;
    }

    const updateData = {
      transactions_count: (shift.transactions_count || 0) + 1,
      expected_cash: (shift.expected_cash || 0) - refundAmount,
      returns: (shift.returns || 0) + refundAmount
    };

    shiftsDB.update(
      { shift_id: returnTransaction.shift_id },
      { $set: updateData },
      {},
      function (err, numReplaced) {
        if (err) {
          console.error('Error updating shift expected cash for return:', err);
        } else {
          console.log('Shift expected cash updated for return successfully');
        }
      }
    );
  });
}

/**
 * GET endpoint: Get return history for a transaction.
 */
app.get("/returns/:transactionId", function (req, res) {
    const transactionId = req.params.transactionId;
    
    transactionsDB.find({
        $or: [
            { _id: transactionId },
            { originalTransactionId: transactionId }
        ]
    }, function (err, transactions) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Database error occurred."
            });
        }
        
        const originalTransaction = transactions.find(t => t._id == transactionId);
        const returnTransactions = transactions.filter(t => t.originalTransactionId == transactionId && t.type === 'return');
        
        res.json({
            originalTransaction: originalTransaction,
            returnTransactions: returnTransactions,
            totalReturned: returnTransactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0),
            returnCount: returnTransactions.length
        });
    });
});

/**
 * GET endpoint: Get all return transactions.
 */
app.get("/returns", function (req, res) {
    const { startDate, endDate, reason } = req.query;
    
    let query = { type: 'return', status: 1 };
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        query.date = { $gte: start.toISOString(), $lte: end.toISOString() };
    }
    
    if (reason) {
        query.return_reason = reason;
    }
    
    transactionsDB.find(query, function (err, returns) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Database error occurred."
            });
        }
        
        res.send(returns);
    });
});

/**
 * POST endpoint: Generate return receipt.
 */
app.post("/return-receipt", function (req, res) {
    const { returnTransactionId } = req.body;
    
    if (!returnTransactionId) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Return transaction ID is required."
        });
    }
    
    transactionsDB.findOne({ _id: returnTransactionId, type: 'return' }, function (err, returnTransaction) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Database error occurred."
            });
        }
        
        if (!returnTransaction) {
            return res.status(404).json({
                error: "Return Transaction Not Found",
                message: "The specified return transaction could not be found."
            });
        }
        
        // Find original transaction for reference
        transactionsDB.findOne({ _id: returnTransaction.originalTransactionId }, function (err, originalTransaction) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Database error occurred."
                });
            }
            
            const receipt = {
                returnTransaction: returnTransaction,
                originalTransaction: originalTransaction,
                receiptNumber: `R-${returnTransaction._id}`,
                generatedDate: new Date(),
                refundAmount: Math.abs(parseFloat(returnTransaction.total)),
                refundMethod: returnTransaction.refund_method,
                returnReason: returnTransaction.return_reason,
                returnNotes: returnTransaction.return_notes,
                storeInfo: {
                    name: "Restaurant POS", // This should come from settings
                    address: "Store Address",
                    phone: "Store Phone"
                }
            };
            
            res.json(receipt);
        });
    });
});
