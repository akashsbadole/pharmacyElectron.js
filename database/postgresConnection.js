// PostgreSQL Database Connection and Pool Management
// Restaurant POS System - Cloud Database Implementation

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

class PostgreSQLConnection {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
  }

  // Initialize connection pool
  async initialize() {
    if (this.isInitialized) return;

    const config = this.getConnectionConfig();
    
    this.pool = new Pool({
      connectionString: config.connectionString,
      ssl: config.ssl,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
      statement_timeout: config.statementTimeout || 30000,
      query_timeout: config.queryTimeout || 30000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err);
      process.exit(-1);
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✓ PostgreSQL connection established successfully');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  // Get database configuration based on environment
  getConnectionConfig() {
    const env = process.env.NODE_ENV || 'development';
    
    const configs = {
      development: {
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/restaurant_pos_dev',
        ssl: false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      },
      test: {
        connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/restaurant_pos_test',
        ssl: false,
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 3000
      },
      staging: {
        connectionString: process.env.STAGING_DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 15,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      },
      production: {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 50,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 10000,
        statementTimeout: 60000,
        queryTimeout: 30000
      }
    };

    return configs[env] || configs.development;
  }

  // Get a database client from the pool
  async getClient() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return await this.pool.connect();
  }

  // Execute a query
  async query(text, params = []) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Query executed in ${duration}ms:`, text.substring(0, 100) + (text.length > 100 ? '...' : ''));
      }
      
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Execute multiple queries in a transaction
  async transaction(queries) {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const { text, params } of queries) {
        const result = await client.query(text, params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Execute a single query in a transaction
  async transactionQuery(text, params = []) {
    return this.transaction([{ text, params }]);
  }

  // Check if a tenant exists
  async tenantExists(tenantId) {
    const result = await this.query('SELECT id FROM tenants WHERE id = $1', [tenantId]);
    return result.rows.length > 0;
  }

  // Get tenant by subdomain
  async getTenantBySubdomain(subdomain) {
    const result = await this.query(
      'SELECT * FROM tenants WHERE subdomain = $1 AND status = $2',
      [subdomain, 'active']
    );
    return result.rows[0] || null;
  }

  // Set current tenant context for RLS
  async setTenantContext(tenantId) {
    await this.query('SET LOCAL app.current_tenant_id = $1', [tenantId]);
  }

  // Clear tenant context
  async clearTenantContext() {
    await this.query('RESET app.current_tenant_id');
  }

  // Create a new tenant
  async createTenant(tenantData) {
    const {
      name,
      subdomain,
      databaseName,
      subscriptionPlan = 'basic'
    } = tenantData;

    const result = await this.query(`
      INSERT INTO tenants (name, subdomain, database_name, subscription_plan)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, subdomain, databaseName, subscriptionPlan]);

    return result.rows[0];
  }

  // Create a new user
  async createUser(userData) {
    const {
      tenantId,
      username,
      email,
      password,
      fullName,
      role = 'waiter',
      employeeId,
      permissions = {}
    } = userData;

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await this.query(`
      INSERT INTO users (
        tenant_id, username, email, password_hash, full_name, 
        role, employee_id, permissions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, tenant_id, username, email, full_name, role, is_active, created_at
    `, [
      tenantId, username, email, passwordHash, fullName, 
      role, employeeId, JSON.stringify(permissions)
    ]);

    return result.rows[0];
  }

  // Authenticate user
  async authenticateUser(username, password, tenantId) {
    const result = await this.query(`
      SELECT id, tenant_id, username, email, password_hash, full_name, 
             role, permissions, is_active
      FROM users 
      WHERE username = $1 AND tenant_id = $2
    `, [username, tenantId]);

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new Error('User account is disabled');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return null;
    }

    // Remove password hash from returned user object
    delete user.password_hash;

    // Update last login
    await this.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    return user;
  }

  // Get menu items for a tenant
  async getMenuItems(tenantId, filters = {}) {
    let query = `
      SELECT mi.*, c.name as category_name
      FROM menu_items mi
      LEFT JOIN categories c ON mi.category_id = c.id
      WHERE mi.tenant_id = $1
    `;
    
    const params = [tenantId];
    let paramCount = 1;

    // Apply filters
    if (filters.available !== undefined) {
      paramCount++;
      query += ` AND mi.available = $${paramCount}`;
      params.push(filters.available);
    }

    if (filters.categoryId) {
      paramCount++;
      query += ` AND mi.category_id = $${paramCount}`;
      params.push(filters.categoryId);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (mi.name ILIKE $${paramCount} OR mi.description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    // Add ordering
    query += ' ORDER BY c.sort_order, mi.name';

    // Add pagination
    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);

      if (filters.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(filters.offset);
      }
    }

    const result = await this.query(query, params);
    return result.rows;
  }

  // Create a new transaction
  async createTransaction(transactionData) {
    const {
      tenantId,
      transactionNumber,
      userId,
      customerId,
      shiftId,
      items,
      paymentMethod,
      orderType = 'dine-in',
      tableNumber,
      notes
    } = transactionData;

    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.totalPrice), 0);
      const taxRate = 0.0875; // 8.75% tax rate
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      // Insert main transaction
      const transactionResult = await client.query(`
        INSERT INTO transactions (
          tenant_id, transaction_number, user_id, customer_id, shift_id,
          subtotal, tax_amount, total_amount, payment_method, order_type,
          table_number, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        tenantId, transactionNumber, userId, customerId, shiftId,
        subtotal, taxAmount, totalAmount, paymentMethod, orderType,
        tableNumber, notes
      ]);

      const transaction = transactionResult.rows[0];

      // Insert transaction items
      for (const item of items) {
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
      
      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get daily sales summary
  async getDailySalesSummary(tenantId, date) {
    const result = await this.query(`
      SELECT * FROM daily_sales_summary 
      WHERE tenant_id = $1 AND sale_date = $2
    `, [tenantId, date]);

    return result.rows[0] || null;
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as current_time, version() as version');
      return {
        status: 'healthy',
        timestamp: result.rows[0].current_time,
        version: result.rows[0].version,
        pool_stats: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Graceful shutdown
  async shutdown() {
    if (this.pool) {
      await this.pool.end();
      console.log('✓ PostgreSQL connection pool closed');
    }
  }
}

// Create singleton instance
const postgresConnection = new PostgreSQLConnection();

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Shutting down PostgreSQL connection...');
  await postgresConnection.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down PostgreSQL connection...');
  await postgresConnection.shutdown();
  process.exit(0);
});

module.exports = postgresConnection;