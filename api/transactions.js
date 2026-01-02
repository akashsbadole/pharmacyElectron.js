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

// Middleware to log all requests to transactions routes
app.use((req, res, next) => {
  console.log(`Transactions request: ${req.method} ${req.path} at ${new Date().toISOString()}`);
  next();
});

console.log("Transactions API module loaded.");

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
  console.log("Transactions API root accessed");
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
  console.log("Transactions /all endpoint accessed");
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
    { $and: [{ ref_number: { $exists: true, $ne: "" } }, { status: 0 }] },
    function (err, docs) {
      if (err) {
        console.error("Error in /on-hold query:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.send(docs || []);
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

        // Removed pharmaceutical audit logging for restaurant conversion
      }
    }
  });
});

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
  let startDate = new Date(req.query.start);
  let endDate = new Date(req.query.end);

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
    
    // Get transaction details
    transactionsDB.find({ _id: transactionId }, function (err, docs) {
        if (err || !docs || docs.length === 0) {
            console.error("Transaction not found:", err);
            res.status(404).json({ success: false, message: "Transaction not found" });
            return;
        }
        
        const transaction = docs[0];
        
        if (method === 'whatsapp') {
            // Implement WhatsApp sharing logic
            const whatsappMessage = formatInvoiceForWhatsApp(transaction);
            console.log(`WhatsApp message prepared: ${whatsappMessage}`);
            
            // For actual WhatsApp sharing, you would use a WhatsApp API here
            // This is a placeholder that would be replaced with actual API integration
            res.json({
                success: true,
                message: `Invoice shared via WhatsApp to ${recipient}`,
                whatsappMessage: whatsappMessage
            });
        }
        else if (method === 'email') {
            // Implement email sharing logic
            const emailSubject = `Invoice #${transactionId} from PharmaMine`;
            const emailBody = formatInvoiceForEmail(transaction);
            
            // For actual email sending, you would use nodemailer or similar here
            // This is a placeholder that would be replaced with actual email integration
            console.log(`Email prepared - Subject: ${emailSubject}`);
            console.log(`Email body: ${emailBody}`);
            
            res.json({
                success: true,
                message: `Invoice shared via Email to ${recipient}`,
                emailSubject: emailSubject,
                emailBody: emailBody
            });
        }
        else {
            res.status(400).json({ success: false, message: "Invalid sharing method" });
        }
    });
});

/**
 * Format invoice data for WhatsApp sharing
 * @param {Object} transaction - Transaction object
 * @returns {string} Formatted WhatsApp message
 */
function formatInvoiceForWhatsApp(transaction) {
    let message = `📄 *INVOICE #${transaction._id}* \n`;
    message += `📅 *Date:* ${new Date(transaction.date).toLocaleString()}\n`;
    message += `🛒 *Items:*\n`;
    
    if (transaction.items && transaction.items.length > 0) {
        transaction.items.forEach(item => {
            message += `  • ${item.name} - ${item.quantity} x ₹${parseFloat(item.price).toFixed(2)} = ₹${(item.quantity * parseFloat(item.price)).toFixed(2)}\n`;
        });
    }
    
    message += `\n💰 *Total:* ₹${parseFloat(transaction.total).toFixed(2)}\n`;
    message += `💳 *Paid:* ₹${parseFloat(transaction.paid).toFixed(2)}\n`;
    message += `🔄 *Change:* ₹${(parseFloat(transaction.paid) - parseFloat(transaction.total)).toFixed(2)}\n`;
    message += `📝 *Payment Method:* ${transaction.payment_mode}\n`;
    message += `👤 *Customer:* ${transaction.customer_name || 'Walk-in Customer'}\n`;
    message += `🏪 *Thank you for shopping with us!*`;
    
    return message;
}

/**
 * Format invoice data for Email sharing
 * @param {Object} transaction - Transaction object
 * @returns {string} Formatted Email body
 */
function formatInvoiceForEmail(transaction) {
    let body = `<html><body>`;
    body += `<h2>Invoice #${transaction._id}</h2>`;
    body += `<p><strong>Date:</strong> ${new Date(transaction.date).toLocaleString()}</p>`;
    body += `<p><strong>Customer:</strong> ${transaction.customer_name || 'Walk-in Customer'}</p>`;
    body += `<p><strong>Payment Method:</strong> ${transaction.payment_mode}</p>`;
    body += `<h3>Items:</h3>`;
    body += `<table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">`;
    body += `<tr><th>Item</th><th>Quantity</th><th>Price</th><th>Total</th></tr>`;
    
    if (transaction.items && transaction.items.length > 0) {
        transaction.items.forEach(item => {
            const itemTotal = item.quantity * parseFloat(item.price);
            body += `<tr>`;
            body += `<td>${item.name}</td>`;
            body += `<td>${item.quantity}</td>`;
            body += `<td>₹${parseFloat(item.price).toFixed(2)}</td>`;
            body += `<td>₹${itemTotal.toFixed(2)}</td>`;
            body += `</tr>`;
        });
    }
    
    body += `</table>`;
    body += `<p style="text-align: right; margin-top: 20px;">`;
    body += `<strong>Subtotal:</strong> ₹${parseFloat(transaction.subtotal || transaction.total).toFixed(2)}<br/>`;
    body += `<strong>Total:</strong> ₹${parseFloat(transaction.total).toFixed(2)}<br/>`;
    body += `<strong>Paid:</strong> ₹${parseFloat(transaction.paid).toFixed(2)}<br/>`;
    body += `<strong>Change:</strong> ₹${(parseFloat(transaction.paid) - parseFloat(transaction.total)).toFixed(2)}`;
    body += `</p>`;
    body += `<p>Thank you for shopping with us!</p>`;
    body += `</body></html>`;
    
    return body;
}
