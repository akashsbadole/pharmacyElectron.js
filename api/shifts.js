let app = require("express")();
let bodyParser = require("body-parser");
const path = require("path");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
const dbPath = path.join(
  appData,
  appName,
  "server",
  "databases",
  "shifts.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

let shiftsDB = getDatabase(dbPath);
shiftsDB.ensureIndex({ fieldName: "_id", unique: true });
shiftsDB.ensureIndex({ fieldName: "shift_id", unique: true });
shiftsDB.ensureIndex({ fieldName: "user_id" });
shiftsDB.ensureIndex({ fieldName: "till_id" });
shiftsDB.ensureIndex({ fieldName: "status" });

/**
 * GET endpoint: Get welcome message for Shifts API
 */
app.get("/", function (req, res) {
  res.send("Shifts API");
});

/**
 * GET endpoint: Get all shifts
 */
app.get("/all", function (req, res) {
  shiftsDB.find({}, function (err, docs) {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.send(docs);
    }
  });
});

/**
 * GET endpoint: Get current open shift for a user/till
 */
app.get("/current", function (req, res) {
  const { user_id, till_id } = req.query;

  if (!user_id || !till_id) {
    return res.status(400).json({
      error: "Bad Request",
      message: "user_id and till_id are required"
    });
  }

  shiftsDB.findOne({
    user_id: parseInt(user_id),
    till_id: parseInt(till_id),
    status: 'open'
  }, function (err, shift) {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json(shift || null);
    }
  });
});

/**
 * POST endpoint: Start a new shift
 */
app.post("/start", function (req, res) {
  const { user_id, till_id, opening_balance, notes } = req.body;

  if (!user_id || !till_id || opening_balance === undefined) {
    return res.status(400).json({
      error: "Bad Request",
      message: "user_id, till_id, and opening_balance are required"
    });
  }

  // Check if there's already an open shift for this user/till
  shiftsDB.findOne({
    user_id: parseInt(user_id),
    till_id: parseInt(till_id),
    status: 'open'
  }, function (err, existingShift) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (existingShift) {
      return res.status(409).json({
        error: "Conflict",
        message: "An open shift already exists for this user/till combination"
      });
    }

    // Generate shift ID: YYYYMMDD_USERID_TILLID_SEQUENCE
    const now = new Date();
    const dateStr = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');

    // Find the next sequence number for this date/user/till
    shiftsDB.count({
      shift_id: new RegExp(`^${dateStr}_${user_id}_${till_id}_`)
    }, function (err, count) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      const sequence = count + 1;
      const shift_id = `${dateStr}_${user_id}_${till_id}_${sequence}`;

      const newShift = {
        shift_id: shift_id,
        user_id: parseInt(user_id),
        till_id: parseInt(till_id),
        start_time: new Date(),
        status: 'open',
        opening_balance: parseFloat(opening_balance),
        notes: notes || '',
        expected_cash: parseFloat(opening_balance), // Start with opening balance
        transactions_count: 0,
        cash_sales: 0,
        card_sales: 0,
        returns: 0
      };

      shiftsDB.insert(newShift, function (err, shift) {
        if (err) {
          console.error(err);
          res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to create shift"
          });
        } else {
          res.status(201).json(shift);
        }
      });
    });
  });
});

/**
 * PUT endpoint: End a shift
 */
app.put("/end", function (req, res) {
  const { shift_id, closing_balance, notes } = req.body;

  if (!shift_id || closing_balance === undefined) {
    return res.status(400).json({
      error: "Bad Request",
      message: "shift_id and closing_balance are required"
    });
  }

  shiftsDB.findOne({ shift_id: shift_id }, function (err, shift) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (!shift) {
      return res.status(404).json({
        error: "Not Found",
        message: "Shift not found"
      });
    }

    if (shift.status !== 'open') {
      return res.status(400).json({
        error: "Bad Request",
        message: "Shift is not open"
      });
    }

    // Calculate cash difference
    const closingBalanceNum = parseFloat(closing_balance);
    const expectedCash = parseFloat(shift.expected_cash || 0);
    const cashDifference = closingBalanceNum - expectedCash;

    const updateData = {
      end_time: new Date(),
      status: 'closed',
      closing_balance: closingBalanceNum,
      cash_difference: cashDifference,
      closing_notes: notes || ''
    };

    shiftsDB.update(
      { shift_id: shift_id },
      { $set: updateData },
      {},
      function (err, numReplaced) {
        if (err) {
          console.error(err);
          res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to close shift"
          });
        } else {
          // Return the updated shift
          shiftsDB.findOne({ shift_id: shift_id }, function (err, updatedShift) {
            if (err) {
              console.error(err);
              res.status(500).json({ error: "Internal Server Error" });
            } else {
              res.json(updatedShift);
            }
          });
        }
      }
    );
  });
});

/**
 * PUT endpoint: Update shift expected cash (called when transactions occur)
 */
app.put("/update-expected-cash", function (req, res) {
  const { shift_id, transaction_amount, transaction_type, payment_mode } = req.body;

  if (!shift_id || transaction_amount === undefined || !transaction_type) {
    return res.status(400).json({
      error: "Bad Request",
      message: "shift_id, transaction_amount, transaction_type are required"
    });
  }

  shiftsDB.findOne({ shift_id: shift_id }, function (err, shift) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (!shift || shift.status !== 'open') {
      return res.status(404).json({
        error: "Not Found",
        message: "Open shift not found"
      });
    }

    const amount = parseFloat(transaction_amount);
    const updateData = {
      transactions_count: (shift.transactions_count || 0) + 1
    };

    // Update expected cash based on transaction type
    if (transaction_type === 'sale' || transaction_type === 'payment') {
      updateData.expected_cash = (shift.expected_cash || 0) + amount;
      if (payment_mode === 'Cash') {
        updateData.cash_sales = (shift.cash_sales || 0) + amount;
      } else {
        updateData.card_sales = (shift.card_sales || 0) + amount;
      }
    } else if (transaction_type === 'return' || transaction_type === 'refund') {
      updateData.expected_cash = (shift.expected_cash || 0) - amount;
      updateData.returns = (shift.returns || 0) + amount;
    }

    shiftsDB.update(
      { shift_id: shift_id },
      { $set: updateData },
      {},
      function (err, numReplaced) {
        if (err) {
          console.error(err);
          res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to update shift"
          });
        } else {
          res.json({ success: true });
        }
      }
    );
  });
});

/**
 * GET endpoint: Get shift report
 */
app.get("/report/:shift_id", function (req, res) {
  const { shift_id } = req.params;

  shiftsDB.findOne({ shift_id: shift_id }, function (err, shift) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (!shift) {
      return res.status(404).json({
        error: "Not Found",
        message: "Shift not found"
      });
    }

    // Get transactions for this shift
    const transactionsDB = getDatabase(path.join(
      appData,
      appName,
      "server",
      "databases",
      "transactions.db",
    ));

    transactionsDB.find({ shift_id: shift_id }, function (err, transactions) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      const report = {
        shift: shift,
        transactions: transactions,
        summary: {
          total_transactions: transactions.length,
          total_sales: transactions.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0),
          cash_transactions: transactions.filter(t => t.payment_mode === 'Cash').length,
          card_transactions: transactions.filter(t => t.payment_mode !== 'Cash').length,
          cash_amount: transactions
            .filter(t => t.payment_mode === 'Cash')
            .reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0),
          card_amount: transactions
            .filter(t => t.payment_mode !== 'Cash')
            .reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0)
        }
      };

      res.json(report);
    });
  });
});

/**
 * GET endpoint: Get shifts by date range
 */
app.get("/by-date", function (req, res) {
  let startDate = new Date(req.query.start);
  let endDate = new Date(req.query.end);
  let userFilter = req.query.user ? parseInt(req.query.user) : null;
  let tillFilter = req.query.till ? parseInt(req.query.till) : null;

  let query = {
    start_time: { $gte: startDate.toISOString(), $lte: endDate.toISOString() }
  };

  if (userFilter) query.user_id = userFilter;
  if (tillFilter) query.till_id = tillFilter;

  shiftsDB.find(query).sort({ start_time: -1 }, function (err, shifts) {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json(shifts);
    }
  });
});

/**
 * GET endpoint: Get shift by ID
 */
app.get("/:shift_id", function (req, res) {
  const { shift_id } = req.params;

  shiftsDB.findOne({ shift_id: shift_id }, function (err, shift) {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    } else if (!shift) {
      res.status(404).json({ error: "Not Found", message: "Shift not found" });
    } else {
      res.json(shift);
    }
  });
});