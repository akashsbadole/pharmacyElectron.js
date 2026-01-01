// Enhanced Inventory API v2.0 - PostgreSQL/MongoDB
// Restaurant POS System - Cloud Database Implementation

const express = require('express');
const router = express.Router();
const postgresConnection = require('../../database/postgresConnection');

// ============================================================================
// MENU ITEMS MANAGEMENT ENDPOINTS
// ============================================================================

// Get all menu items with advanced filtering
router.get('/menu-items', async (req, res) => {
  try {
    const {
      tenantId,
      categoryId,
      available,
      search,
      kitchenStation,
      dietaryInfo,
      allergens,
      lowStock,
      page = 1,
      limit = 50,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    await postgresConnection.setTenantContext(tenantId);

    // Build dynamic query based on filters
    let query = `
      SELECT mi.*, 
             c.name as category_name,
             c.id as category_id
      FROM menu_items mi
      LEFT JOIN categories c ON mi.category_id = c.id
      WHERE mi.tenant_id = $1
    `;
    
    const params = [tenantId];
    let paramCount = 1;

    // Apply filters
    if (categoryId) {
      paramCount++;
      query += ` AND mi.category_id = $${paramCount}`;
      params.push(categoryId);
    }

    if (available !== undefined) {
      paramCount++;
      query += ` AND mi.available = $${paramCount}`;
      params.push(available === 'true');
    }

    if (kitchenStation) {
      paramCount++;
      query += ` AND mi.kitchen_station = $${paramCount}`;
      params.push(kitchenStation);
    }

    if (search) {
      paramCount++;
      query += ` AND (mi.name ILIKE $${paramCount} OR mi.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (dietaryInfo) {
      paramCount++;
      query += ` AND $${paramCount} = ANY(mi.dietary_info)`;
      params.push(dietaryInfo);
    }

    if (allergens) {
      paramCount++;
      query += ` AND $${paramCount} = ANY(mi.allergens)`;
      params.push(allergens);
    }

    if (lowStock === 'true') {
      paramCount++;
      query += ` AND mi.quantity <= mi.min_stock`;
      params.push(tenantId);
    }

    // Add ordering
    paramCount++;
    query += ` ORDER BY mi.${sortBy} ${sortOrder.toUpperCase()}`;

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await postgresConnection.query(query, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM menu_items mi
      WHERE mi.tenant_id = $1
      ${categoryId ? 'AND mi.category_id = $2' : ''}
      ${available !== undefined ? `AND mi.available = $${categoryId ? 3 : 2}` : ''}
      ${kitchenStation ? `AND mi.kitchen_station = $${categoryId ? (available !== undefined ? 4 : 3) : (available !== undefined ? 3 : 2)}` : ''}
      ${search ? `AND (mi.name ILIKE $${categoryId ? (available !== undefined ? (kitchenStation ? 5 : 4) : (kitchenStation ? 4 : 3)) : (available !== undefined ? (kitchenStation ? 4 : 3) : (kitchenStation ? 3 : 2))} OR mi.description ILIKE $${categoryId ? (available !== undefined ? (kitchenStation ? 5 : 4) : (kitchenStation ? 4 : 3)) : (available !== undefined ? (kitchenStation ? 4 : 3) : (kitchenStation ? 3 : 2))})` : ''}
      ${lowStock === 'true' ? `AND mi.quantity <= mi.min_stock` : ''}
    `;
    
    const countParams = [tenantId];
    if (categoryId) countParams.push(categoryId);
    if (available !== undefined) countParams.push(available === 'true');
    if (kitchenStation) countParams.push(kitchenStation);
    if (search) countParams.push(`%${search}%`);
    
    const countResult = await postgresConnection.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    await postgresConnection.clearTenantContext();

    // Process results to parse JSON fields
    const menuItems = result.rows.map(item => ({
      ...item,
      dietary_info: JSON.parse(item.dietary_info || '[]'),
      allergens: JSON.parse(item.allergens || '[]'),
      combo_items: JSON.parse(item.combo_items || '[]')
    }));

    res.json({
      menu_items: menuItems,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Create new menu item
router.post('/menu-items', async (req, res) => {
  try {
    const {
      tenantId,
      sku,
      barcode,
      name,
      description,
      categoryId,
      price,
      cost,
      quantity,
      minStock,
      unit = 'piece',
      available = true,
      preparationTime = 15,
      kitchenStation = 'general',
      dietaryInfo = [],
      allergens = [],
      isCombo = false,
      comboItems = [],
      seasonalItem = false,
      imageUrl,
      createdBy
    } = req.body;

    if (!tenantId || !name || price === undefined) {
      return res.status(400).json({
        error: 'Tenant ID, name, and price are required'
      });
    }

    await postgresConnection.setTenantContext(tenantId);

    const result = await postgresConnection.query(`
      INSERT INTO menu_items (
        tenant_id, sku, barcode, name, description, category_id,
        price, cost, quantity, min_stock, unit, available,
        preparation_time, kitchen_station, dietary_info, allergens,
        is_combo, combo_items, seasonal_item, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `, [
      tenantId, sku, barcode, name, description, categoryId,
      parseFloat(price), parseFloat(cost || price), parseInt(quantity || 0),
      parseInt(minStock || 0), unit, available, parseInt(preparationTime),
      kitchenStation, JSON.stringify(dietaryInfo), JSON.stringify(allergens),
      isCombo, JSON.stringify(comboItems), seasonalItem, imageUrl
    ]);

    const menuItem = result.rows[0];

    // Check for low stock and create alert if necessary
    if (menuItem.quantity <= menuItem.min_stock) {
      await createLowStockAlert(tenantId, menuItem);
    }

    // Emit real-time update
    if (global.io) {
      global.io.to(`tenant-${tenantId}`).emit('menu-item-created', {
        menuItem: {
          ...menuItem,
          dietary_info: JSON.parse(menuItem.dietary_info || '[]'),
          allergens: JSON.parse(menuItem.allergens || '[]'),
          combo_items: JSON.parse(menuItem.combo_items || '[]')
        },
        timestamp: new Date()
      });
    }

    await postgresConnection.clearTenantContext();

    res.status(201).json({
      menu_item: {
        ...menuItem,
        dietary_info: JSON.parse(menuItem.dietary_info || '[]'),
        allergens: JSON.parse(menuItem.allergens || '[]'),
        combo_items: JSON.parse(menuItem.combo_items || '[]')
      },
      message: 'Menu item created successfully'
    });

  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({
      error: 'Failed to create menu item',
      message: error.message
    });
  }
});

// Update menu item
router.put('/menu-items/:menuItemId', async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const {
      tenantId,
      ...updateData
    } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    await postgresConnection.setTenantContext(tenantId);

    // Get current menu item for comparison
    const currentResult = await postgresConnection.query(
      'SELECT * FROM menu_items WHERE id = $1 AND tenant_id = $2',
      [menuItemId, tenantId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const currentItem = currentResult.rows[0];

    // Prepare update fields
    const fields = [];
    const values = [];
    let paramCount = 0;

    const updatableFields = [
      'sku', 'barcode', 'name', 'description', 'category_id',
      'price', 'cost', 'quantity', 'min_stock', 'unit', 'available',
      'preparation_time', 'kitchen_station', 'dietary_info', 'allergens',
      'is_combo', 'combo_items', 'seasonal_item', 'image_url'
    ];

    updatableFields.forEach(field => {
      if (updateData[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        
        let value = updateData[field];
        if (field === 'dietary_info' || field === 'allergens' || field === 'combo_items') {
          value = JSON.stringify(Array.isArray(value) ? value : []);
        } else if (['price', 'cost'].includes(field)) {
          value = parseFloat(value);
        } else if (['quantity', 'min_stock', 'preparation_time'].includes(field)) {
          value = parseInt(value);
        } else if (field === 'available' || field === 'is_combo' || field === 'seasonal_item') {
          value = Boolean(value);
        }
        
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    paramCount++;
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(menuItemId);
    values.push(tenantId);

    const query = `
      UPDATE menu_items 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount + 1} AND tenant_id = $${paramCount + 2}
      RETURNING *
    `;

    const result = await postgresConnection.query(query, values);
    const updatedItem = result.rows[0];

    // Check for low stock change and create alert if needed
    if (updatedItem.quantity <= updatedItem.min_stock && 
        currentItem.quantity > currentItem.min_stock) {
      await createLowStockAlert(tenantId, updatedItem);
    }

    // Emit real-time update
    if (global.io) {
      global.io.to(`tenant-${tenantId}`).emit('menu-item-updated', {
        menuItem: {
          ...updatedItem,
          dietary_info: JSON.parse(updatedItem.dietary_info || '[]'),
          allergens: JSON.parse(updatedItem.allergens || '[]'),
          combo_items: JSON.parse(updatedItem.combo_items || '[]')
        },
        changes: updateData,
        timestamp: new Date()
      });
    }

    await postgresConnection.clearTenantContext();

    res.json({
      menu_item: {
        ...updatedItem,
        dietary_info: JSON.parse(updatedItem.dietary_info || '[]'),
        allergens: JSON.parse(updatedItem.allergens || '[]'),
        combo_items: JSON.parse(updatedItem.combo_items || '[]')
      },
      message: 'Menu item updated successfully'
    });

  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({
      error: 'Failed to update menu item',
      message: error.message
    });
  }
});

// Get current effective price (including time-based pricing)
router.get('/menu-items/:menuItemId/price', async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    await postgresConnection.setTenantContext(tenantId);

    // Get menu item
    const itemResult = await postgresConnection.query(
      'SELECT * FROM menu_items WHERE id = $1 AND tenant_id = $2',
      [menuItemId, tenantId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const menuItem = itemResult.rows[0];
    const originalPrice = parseFloat(menuItem.price);

    // Check for time-based pricing rules
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentDay = now.getDay(); // 0 = Sunday

    const pricingRulesResult = await postgresConnection.query(`
      SELECT * FROM time_pricing_rules 
      WHERE menu_item_id = $1 AND active = true
    `, [menuItemId]);

    let currentPrice = originalPrice;
    let discountApplied = false;
    let discountInfo = null;

    if (pricingRulesResult.rows.length > 0) {
      // Find applicable rules
      const applicableRules = pricingRulesResult.rows.filter(rule => {
        const daysOfWeek = rule.days_of_week || [];
        const startTime = rule.start_time;
        const endTime = rule.end_time;
        
        // Check if current day is included
        if (!daysOfWeek.includes(currentDay)) {
          return false;
        }

        // Check if current time is within range
        return currentTime >= startTime && currentTime <= endTime;
      });

      if (applicableRules.length > 0) {
        // Apply the first applicable rule (could be extended for priority handling)
        const rule = applicableRules[0];
        let discountedPrice = originalPrice;

        if (rule.discount_type === 'percentage') {
          discountedPrice = originalPrice * (1 - rule.discount_value / 100);
        } else if (rule.discount_type === 'fixed') {
          discountedPrice = Math.max(0, originalPrice - rule.discount_value);
        }

        currentPrice = discountedPrice;
        discountApplied = true;
        discountInfo = {
          rule_id: rule.id,
          rule_name: rule.name,
          discount_type: rule.discount_type,
          discount_value: rule.discount_value,
          start_time: rule.start_time,
          end_time: rule.end_time
        };
      }
    }

    await postgresConnection.clearTenantContext();

    res.json({
      menu_item_id: menuItemId,
      menu_item_name: menuItem.name,
      original_price: originalPrice,
      current_price: currentPrice,
      discount_applied: discountApplied,
      discount_info: discountInfo,
      price_difference: currentPrice - originalPrice
    });

  } catch (error) {
    console.error('Error getting menu item price:', error);
    res.status(500).json({ error: 'Failed to get menu item price' });
  }
});

// Update inventory quantity
router.patch('/menu-items/:menuItemId/quantity', async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const { tenantId, quantity, reason, userId } = req.body;

    if (!tenantId || quantity === undefined) {
      return res.status(400).json({ error: 'Tenant ID and quantity are required' });
    }

    await postgresConnection.setTenantContext(tenantId);

    // Get current menu item
    const currentResult = await postgresConnection.query(
      'SELECT * FROM menu_items WHERE id = $1 AND tenant_id = $2',
      [menuItemId, tenantId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const currentItem = currentResult.rows[0];
    const oldQuantity = currentItem.quantity;
    const newQuantity = parseInt(quantity);

    // Update quantity
    const result = await postgresConnection.query(`
      UPDATE menu_items 
      SET quantity = $1, last_restocked = CASE WHEN $1 > $2 THEN CURRENT_TIMESTAMP ELSE last_restocked END, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `, [newQuantity, oldQuantity, menuItemId, tenantId]);

    const updatedItem = result.rows[0];

    // Log inventory change if reason provided
    if (reason) {
      await postgresConnection.query(`
        INSERT INTO inventory_waste (
          tenant_id, menu_item_id, quantity, waste_reason, cost_value, reported_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        tenantId,
        menuItemId,
        Math.abs(newQuantity - oldQuantity),
        reason,
        Math.abs(newQuantity - oldQuantity) * parseFloat(currentItem.cost || 0),
        userId
      ]);
    }

    // Check for low stock alert
    if (newQuantity <= updatedItem.min_stock && oldQuantity > updatedItem.min_stock) {
      await createLowStockAlert(tenantId, updatedItem);
    }

    // Emit real-time update
    if (global.io) {
      global.io.to(`tenant-${tenantId}`).emit('inventory-updated', {
        menuItemId,
        oldQuantity,
        newQuantity,
        reason,
        timestamp: new Date()
      });
    }

    await postgresConnection.clearTenantContext();

    res.json({
      menu_item: updatedItem,
      quantity_change: newQuantity - oldQuantity,
      message: 'Inventory updated successfully'
    });

  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({
      error: 'Failed to update inventory',
      message: error.message
    });
  }
});

// Get inventory alerts
router.get('/alerts', async (req, res) => {
  try {
    const { tenantId, type = 'low_stock', acknowledged } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Get alerts from MongoDB
    const alerts = await mongoConnection.getInventoryAlerts(
      tenantId, 
      acknowledged === 'true' ? true : (acknowledged === 'false' ? false : null)
    );

    // Filter by type if specified
    const filteredAlerts = type !== 'all' 
      ? alerts.filter(alert => alert.alert_type === type)
      : alerts;

    res.json({
      alerts: filteredAlerts,
      count: filteredAlerts.length,
      unacknowledged_count: alerts.filter(alert => !alert.acknowledged).length
    });

  } catch (error) {
    console.error('Error fetching inventory alerts:', error);
    res.status(500).json({ error: 'Failed to fetch inventory alerts' });
  }
});

// Acknowledge inventory alert
router.patch('/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { tenantId, userId } = req.body;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Tenant ID and user ID are required' });
    }

    await mongoConnection.acknowledgeInventoryAlert(alertId, userId);

    // Emit real-time update
    if (global.io) {
      global.io.to(`tenant-${tenantId}`).emit('alert-acknowledged', {
        alertId,
        acknowledgedBy: userId,
        timestamp: new Date()
      });
    }

    res.json({ message: 'Alert acknowledged successfully' });

  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    await postgresConnection.setTenantContext(tenantId);

    const result = await postgresConnection.query(`
      SELECT *, 
             (SELECT COUNT(*) FROM menu_items mi WHERE mi.category_id = c.id AND mi.tenant_id = $1) as item_count
      FROM categories c
      WHERE c.tenant_id = $1 AND c.is_active = true
      ORDER BY c.sort_order, c.name
    `, [tenantId]);

    await postgresConnection.clearTenantContext();

    res.json({ categories: result.rows });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Create low stock alert
async function createLowStockAlert(tenantId, menuItem) {
  try {
    await mongoConnection.createInventoryAlert({
      tenantId: tenantId,
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      alertType: menuItem.quantity === 0 ? 'out_of_stock' : 'low_stock',
      currentQuantity: menuItem.quantity,
      threshold: menuItem.min_stock,
      severity: menuItem.quantity === 0 ? 'critical' : 'high'
    });

    // Emit real-time alert
    if (global.io) {
      global.io.to(`tenant-${tenantId}`).emit('low-stock-alert', {
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        currentQuantity: menuItem.quantity,
        minStock: menuItem.min_stock,
        severity: menuItem.quantity === 0 ? 'critical' : 'high',
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error('Error creating low stock alert:', error);
  }
}

module.exports = router;