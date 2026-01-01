// Enhanced Transactions API v2.0 - PostgreSQL/MongoDB
// Restaurant POS System - Cloud Database Implementation

const express = require('express');
const router = express.Router();
const postgresConnection = require('../../database/postgresConnection');
const RealTimeSyncService = require('../../services/realTimeSync');

// Initialize real-time service
const realTimeSync = new RealTimeSyncService();

// ============================================================================
// TRANSACTION MANAGEMENT ENDPOINTS
// ============================================================================

// Get all transactions with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      tenantId,
      startDate,
      endDate,
      status,
      userId,
      tableNumber,
      limit = 50,
      offset = 0,
      sortBy = 'transaction_time',
      sortOrder = 'desc'
    } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Set tenant context for RLS
    await postgresConnection.setTenantContext(tenantId);

    let query = `
      SELECT t.*, 
             u.username as user_name, 
             u.full_name as user_full_name,
             c.name as customer_name,
             s.shift_id as shift_identifier
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN shifts s ON t.shift_id = s.id
      WHERE t.tenant_id = $1
    `;
    
    const params = [tenantId];
    let paramCount = 1;

    // Apply filters
    if (startDate) {
      paramCount++;
      query += ` AND t.transaction_time >= $${paramCount}`;
      params.push(new Date(startDate));
    }

    if (endDate) {
      paramCount++;
      query += ` AND t.transaction_time <= $${paramCount}`;
      params.push(new Date(endDate));
    }

    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (userId) {
      paramCount++;
      query += ` AND t.user_id = $${paramCount}`;
      params.push(userId);
    }

    if (tableNumber) {
      paramCount++;
      query += ` AND t.table_number = $${paramCount}`;
      params.push(tableNumber);
    }

    // Add ordering
    paramCount++;
    query += ` ORDER BY t.${sortBy} ${sortOrder.toUpperCase()}`;

    // Add pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await postgresConnection.query(query, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM transactions t 
      WHERE t.tenant_id = $1
      ${startDate ? 'AND t.transaction_time >= $2' : ''}
      ${endDate ? `AND t.transaction_time <= $${startDate ? 3 : 2}` : ''}
      ${status ? `AND t.status = $${startDate ? (endDate ? 4 : 3) : (endDate ? 3 : 2)}` : ''}
      ${userId ? `AND t.user_id = $${startDate ? (endDate ? (status ? 5 : 4) : (status ? 4 : 3)) : (endDate ? (status ? 4 : 3) : (status ? 3 : 2))}` : ''}
    `;
    
    const countParams = [tenantId];
    if (startDate) countParams.push(new Date(startDate));
    if (endDate) countParams.push(new Date(endDate));
    if (status) countParams.push(status);
    if (userId) countParams.push(userId);
    
    const countResult = await postgresConnection.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // Clear tenant context
    await postgresConnection.clearTenantContext();

    res.json({
      transactions: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Create new transaction
router.post('/', async (req, res) => {
  const client = await postgresConnection.getClient();
  
  try {
    const {
      tenantId,
      userId,
      customerId,
      shiftId,
      items,
      paymentMethod,
      orderType = 'dine-in',
      tableNumber,
      notes,
      customerCount = 1
    } = req.body;

    // Validate required fields
    if (!tenantId || !userId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: tenantId, userId, items'
      });
    }

    await client.query('BEGIN');

    // Set tenant context for RLS
    await client.query('SET LOCAL app.current_tenant_id = $1', [tenantId]);

    // Generate transaction number
    const transactionNumber = await generateTransactionNumber(client, tenantId);

    // Calculate totals
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      if (!item.menuItemId || !item.quantity || !item.unitPrice) {
        throw new Error('Each item must have menuItemId, quantity, and unitPrice');
      }

      const totalPrice = item.quantity * item.unitPrice;
      subtotal += totalPrice;

      processedItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: totalPrice,
        specialInstructions: item.specialInstructions || ''
      });
    }

    // Calculate tax (8.75% default)
    const taxRate = 0.0875;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    // Create main transaction
    const transactionResult = await client.query(`
      INSERT INTO transactions (
        tenant_id, transaction_number, user_id, customer_id, shift_id,
        subtotal, tax_amount, total_amount, payment_method,
        order_type, table_number, customer_count, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      tenantId, transactionNumber, userId, customerId, shiftId,
      subtotal, taxAmount, totalAmount, paymentMethod || 'Cash',
      orderType, tableNumber, customerCount, notes
    ]);

    const transaction = transactionResult.rows[0];

    // Insert transaction items
    for (const item of processedItems) {
      await client.query(`
        INSERT INTO transaction_items (
          transaction_id, menu_item_id, quantity, unit_price, total_price, special_instructions
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        transaction.id,
        item.menuItemId,
        item.quantity,
        item.unitPrice,
        item.totalPrice,
        item.specialInstructions
      ]);

      // Update inventory
      await client.query(`
        UPDATE menu_items 
        SET quantity = quantity - $1 
        WHERE id = $2 AND tenant_id = $3
      `, [item.quantity, item.menuItemId, tenantId]);
    }

    await client.query('COMMIT');

    // Create live transaction for real-time analytics
    await mongoConnection.createLiveTransaction({
      tenantId: tenantId,
      transactionId: transaction.id,
      amount: totalAmount,
      paymentMethod: paymentMethod || 'Cash',
      tableNumber: tableNumber,
      status: 'completed'
    });

    // Emit real-time update
    if (global.io) {
      global.io.to(`tenant-${tenantId}`).emit('new-transaction', {
        transaction: transaction,
        items: processedItems,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      transaction: transaction,
      items: processedItems,
      message: 'Transaction created successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction creation error:', error);
    res.status(500).json({
      error: 'Failed to create transaction',
      message: error.message
    });
  } finally {
    client.release();
    await postgresConnection.clearTenantContext();
  }
});

// Get transaction by ID
router.get('/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    await postgresConnection.setTenantContext(tenantId);

    const result = await postgresConnection.query(`
      SELECT t.*, 
             u.username as user_name, 
             u.full_name as user_full_name,
             c.name as customer_name,
             s.shift_id as shift_identifier,
             ti.*,
             mi.name as item_name,
             mi.category_id
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN shifts s ON t.shift_id = s.id
      LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
      LEFT JOIN menu_items mi ON ti.menu_item_id = mi.id
      WHERE t.id = $1 AND t.tenant_id = $2
    `, [transactionId, tenantId]);

    await postgresConnection.clearTenantContext();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Group items with transaction data
    const transaction = result.rows[0];
    const items = result.rows
      .filter(row => row.transaction_id)
      .map(row => ({
        id: row.transaction_id,
        menu_item_id: row.menu_item_id,
        name: row.item_name,
        quantity: row.quantity,
        unit_price: row.unit_price,
        total_price: row.total_price,
        special_instructions: row.special_instructions
      }));

    delete transaction.transaction_id;
    delete transaction.menu_item_id;
    delete transaction.item_name;
    delete transaction.quantity;
    delete transaction.unit_price;
    delete transaction.total_price;
    delete transaction.special_instructions;

    res.json({
      transaction: transaction,
      items: items
    });

  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Update transaction status
router.patch('/:transactionId/status', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { tenantId, status, notes } = req.body;

    if (!tenantId || !status) {
      return res.status(400).json({ error: 'Tenant ID and status are required' });
    }

    const validStatuses = ['pending', 'completed', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await postgresConnection.setTenantContext(tenantId);

    const result = await postgresConnection.query(`
      UPDATE transactions 
      SET status = $1, notes = COALESCE($2, notes), updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [status, notes, transactionId, tenantId]);

    await postgresConnection.clearTenantContext();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Emit real-time update
    if (global.io) {
      global.io.to(`tenant-${tenantId}`).emit('transaction-status-updated', {
        transactionId,
        status,
        notes,
        timestamp: new Date()
      });
    }

    res.json({
      transaction: result.rows[0],
      message: 'Transaction status updated successfully'
    });

  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ error: 'Failed to update transaction status' });
  }
});

// Process return/refund
router.post('/:transactionId/return', async (req, res) => {
  const client = await postgresConnection.getClient();
  
  try {
    const { transactionId } = req.params;
    const {
      tenantId,
      userId,
      items,
      returnReason,
      refundMethod = 'Cash',
      notes
    } = req.body;

    if (!tenantId || !userId || !items || !Array.isArray(items)) {
      return res.status(400).json({
        error: 'Missing required fields: tenantId, userId, items'
      });
    }

    await client.query('BEGIN');

    // Set tenant context
    await client.query('SET LOCAL app.current_tenant_id = $1', [tenantId]);

    // Get original transaction
    const originalResult = await client.query(
      'SELECT * FROM transactions WHERE id = $1 AND tenant_id = $2',
      [transactionId, tenantId]
    );

    if (originalResult.rows.length === 0) {
      throw new Error('Original transaction not found');
    }

    const originalTransaction = originalResult.rows[0];

    if (originalTransaction.status !== 'completed') {
      throw new Error('Can only return completed transactions');
    }

    // Calculate return amount
    let returnAmount = 0;
    for (const item of items) {
      returnAmount += item.quantity * item.unitPrice;
    }

    // Create return transaction
    const returnTransactionNumber = await generateTransactionNumber(client, tenantId);
    
    const returnResult = await client.query(`
      INSERT INTO transactions (
        tenant_id, transaction_number, user_id, customer_id,
        transaction_type, status, subtotal, tax_amount, total_amount,
        paid_amount, payment_method, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      tenantId,
      returnTransactionNumber,
      userId,
      originalTransaction.customer_id,
      'return',
      'completed',
      -returnAmount,
      0,
      -returnAmount,
      -returnAmount,
      refundMethod,
      notes || `Return for transaction ${originalTransaction.transaction_number}`
    ]);

    const returnTransaction = returnResult.rows[0];

    // Insert return items and update inventory
    for (const item of items) {
      await client.query(`
        INSERT INTO transaction_items (
          transaction_id, menu_item_id, quantity, unit_price, total_price
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        returnTransaction.id,
        item.menuItemId,
        -item.quantity, // Negative quantity for returns
        item.unitPrice,
        -(item.quantity * item.unitPrice)
      ]);

      // Restore inventory
      await client.query(`
        UPDATE menu_items 
        SET quantity = quantity + $1 
        WHERE id = $2 AND tenant_id = $3
      `, [item.quantity, item.menuItemId, tenantId]);
    }

    await client.query('COMMIT');

    // Create live transaction for analytics
    await mongoConnection.createLiveTransaction({
      tenantId: tenantId,
      transactionId: returnTransaction.id,
      amount: -returnAmount,
      paymentMethod: refundMethod,
      status: 'completed'
    });

    // Emit real-time update
    if (global.io) {
      global.io.to(`tenant-${tenantId}`).emit('transaction-returned', {
        originalTransactionId: transactionId,
        returnTransaction: returnTransaction,
        returnAmount: returnAmount,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      returnTransaction: returnTransaction,
      returnAmount: returnAmount,
      message: 'Return processed successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Return processing error:', error);
    res.status(500).json({
      error: 'Failed to process return',
      message: error.message
    });
  } finally {
    client.release();
    await postgresConnection.clearTenantContext();
  }
});

// Get sales report
router.get('/reports/sales', async (req, res) => {
  try {
    const {
      tenantId,
      startDate,
      endDate,
      groupBy = 'day', // day, week, month
      userId,
      includeReturns = false
    } = req.query;

    if (!tenantId || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Tenant ID, start date, and end date are required'
      });
    }

    await postgresConnection.setTenantContext(tenantId);

    let dateFormat;
    switch (groupBy) {
      case 'week':
        dateFormat = "DATE_TRUNC('week', transaction_time)";
        break;
      case 'month':
        dateFormat = "DATE_TRUNC('month', transaction_time)";
        break;
      default:
        dateFormat = "DATE(transaction_time)";
    }

    let query = `
      SELECT 
        ${dateFormat} as period,
        COUNT(*) as transaction_count,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value,
        SUM(CASE WHEN transaction_type = 'sale' THEN total_amount ELSE 0 END) as gross_sales,
        SUM(CASE WHEN transaction_type = 'return' THEN ABS(total_amount) ELSE 0 END) as returns
      FROM transactions 
      WHERE tenant_id = $1 
        AND transaction_time >= $2 
        AND transaction_time <= $3
        AND status = 'completed'
    `;

    const params = [tenantId, new Date(startDate), new Date(endDate)];

    if (userId) {
      query += ' AND user_id = $4';
      params.push(userId);
    }

    if (!includeReturns) {
      query += ' AND transaction_type = \'sale\'';
    }

    query += ` GROUP BY ${dateFormat} ORDER BY period`;

    const result = await postgresConnection.query(query, params);

    // Calculate totals
    const totals = result.rows.reduce((acc, row) => ({
      transaction_count: acc.transaction_count + parseInt(row.transaction_count),
      total_revenue: acc.total_revenue + parseFloat(row.total_revenue),
      returns: acc.returns + parseFloat(row.returns),
      gross_sales: acc.gross_sales + parseFloat(row.gross_sales)
    }), {
      transaction_count: 0,
      total_revenue: 0,
      returns: 0,
      gross_sales: 0
    });

    totals.net_sales = totals.gross_sales - totals.returns;
    totals.return_rate = totals.gross_sales > 0 ? (totals.returns / totals.gross_sales * 100) : 0;

    await postgresConnection.clearTenantContext();

    res.json({
      period: {
        start: startDate,
        end: endDate,
        groupBy: groupBy
      },
      summary: totals,
      data: result.rows,
      generated_at: new Date()
    });

  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Generate unique transaction number
async function generateTransactionNumber(client, tenantId) {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  
  const result = await client.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 9) AS INTEGER)), 0) + 1 as next_sequence
    FROM transactions
    WHERE tenant_id = $1 AND transaction_number LIKE $2
  `, [tenantId, `${datePart}%`]);
  
  const nextSequence = result.rows[0].next_sequence;
  return `${datePart}${nextSequence.toString().padStart(4, '0')}`;
}

module.exports = router;