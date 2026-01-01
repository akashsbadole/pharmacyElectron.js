// NeDB to Cloud Database Migration Scripts
// Restaurant POS System - Migration from NeDB to PostgreSQL/MongoDB
// Created: 2026-01-01

const fs = require('fs');
const path = require('path');
const Datastore = require('@seald-io/nedb');
const postgresConnection = require('./postgresConnection');

class DatabaseMigration {
  constructor() {
    this.migrationLog = [];
    this.stats = {
      totalRecords: 0,
      migratedRecords: 0,
      failedRecords: 0,
      errors: []
    };
  }

  // Initialize migration
  async initialize() {
    console.log('🔄 Initializing database migration...');
    
    try {
      // Initialize database connections
      await postgresConnection.initialize();
      await mongoConnection.initialize();
      
      console.log('✓ Database connections established');
    } catch (error) {
      console.error('Failed to initialize migration:', error);
      throw error;
    }
  }

  // Main migration function
  async migrateAll() {
    await this.initialize();
    
    const startTime = Date.now();
    console.log('\n🚀 Starting comprehensive database migration...\n');

    try {
      // Migration order is important due to foreign key dependencies
      await this.migrateTenants();
      await this.migrateUsers();
      await this.migrateCategories();
      await this.migrateMenuItems();
      await this.migrateCustomers();
      await this.migrateSuppliers();
      await this.migrateTables();
      await this.migrateShifts();
      await this.migrateRecipes();
      await this.migrateTransactions();
      await this.migrateComboMeals();
      await this.migrateSystemSettings();
      
      // MongoDB collections (order doesn't matter as much)
      await this.migrateKitchenOrders();
      await this.migrateAnalyticsData();
      await this.migrateInventoryAlerts();
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`\n✅ Migration completed in ${duration} seconds`);
      console.log('\n📊 Migration Statistics:');
      console.log(`   Total records: ${this.stats.totalRecords}`);
      console.log(`   Migrated records: ${this.stats.migratedRecords}`);
      console.log(`   Failed records: ${this.stats.failedRecords}`);
      console.log(`   Success rate: ${Math.round((this.stats.migratedRecords / this.stats.totalRecords) * 100)}%`);
      
      if (this.stats.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        this.stats.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
      }

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  // Migrate tenants data
  async migrateTenants() {
    console.log('📋 Migrating tenants...');
    
    try {
      const nedbPath = this.getNeDBPath('tenants.db');
      if (!fs.existsSync(nedbPath)) {
        console.log('   ⚠️  tenants.db not found, creating default tenant');
        await this.createDefaultTenant();
        return;
      }

      const db = new Datastore({ filename: nedbPath, autoload: true });
      const tenants = await this.findAllAsync(db);
      
      for (const tenant of tenants) {
        try {
          const migratedTenant = await postgresConnection.createTenant({
            name: tenant.name || 'Default Restaurant',
            subdomain: tenant.subdomain || 'default',
            databaseName: tenant.database_name || 'restaurant_pos_default',
            subscriptionPlan: tenant.subscription_plan || 'basic'
          });
          
          this.logMigration('tenants', tenant._id, migratedTenant.id, 'success');
          this.stats.migratedRecords++;
        } catch (error) {
          this.handleMigrationError('tenants', tenant._id, error);
        }
        this.stats.totalRecords++;
      }
      
      console.log(`   ✓ Migrated ${tenants.length} tenants`);
    } catch (error) {
      console.error('   ❌ Failed to migrate tenants:', error);
    }
  }

  // Create default tenant if none exist
  async createDefaultTenant() {
    const defaultTenant = await postgresConnection.createTenant({
      name: 'Default Restaurant',
      subdomain: 'default',
      databaseName: 'restaurant_pos_default',
      subscriptionPlan: 'basic'
    });
    
    this.logMigration('tenants', 'default', defaultTenant.id, 'created');
    this.stats.migratedRecords++;
    this.stats.totalRecords++;
    
    return defaultTenant;
  }

  // Migrate users data
  async migrateUsers() {
    console.log('👥 Migrating users...');
    
    const nedbPath = this.getNeDBPath('users.db');
    if (!fs.existsSync(nedbPath)) {
      console.log('   ⚠️  users.db not found, skipping');
      return;
    }

    const db = new Datastore({ filename: nedbPath, autoload: true });
    const users = await this.findAllAsync(db);
    
    // Get default tenant ID
    const defaultTenant = await postgresConnection.getTenantBySubdomain('default');
    const tenantId = defaultTenant.id;

    for (const user of users) {
      try {
        const migratedUser = await postgresConnection.createUser({
          tenantId: tenantId,
          username: user.username || `user_${user._id}`,
          email: user.email || `${user.username}@restaurant.com`,
          password: this.generateTempPassword(),
          fullName: user.fullname || user.name || 'User',
          role: user.role || 'waiter',
          employeeId: user.employee_id || user._id.toString(),
          permissions: this.mapOldPermissions(user)
        });
        
        this.logMigration('users', user._id, migratedUser.id, 'success');
        this.stats.migratedRecords++;
      } catch (error) {
        this.handleMigrationError('users', user._id, error);
      }
      this.stats.totalRecords++;
    }
    
    console.log(`   ✓ Migrated ${users.length} users`);
  }

  // Migrate categories data
  async migrateCategories() {
    console.log('📂 Migrating categories...');
    
    const nedbPath = this.getNeDBPath('categories.db');
    if (!fs.existsSync(nedbPath)) {
      console.log('   ⚠️  categories.db not found, creating default categories');
      await this.createDefaultCategories();
      return;
    }

    const db = new Datastore({ filename: nedbPath, autoload: true });
    const categories = await this.findAllAsync(db);
    
    const defaultTenant = await postgresConnection.getTenantBySubdomain('default');
    const tenantId = defaultTenant.id;

    for (const category of categories) {
      try {
        const result = await postgresConnection.query(`
          INSERT INTO categories (tenant_id, name, description, sort_order, is_active)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [
          tenantId,
          category.name || 'Uncategorized',
          category.description || '',
          category.sort_order || 0,
          category.is_active !== false
        ]);
        
        this.logMigration('categories', category._id, result.rows[0].id, 'success');
        this.stats.migratedRecords++;
      } catch (error) {
        this.handleMigrationError('categories', category._id, error);
      }
      this.stats.totalRecords++;
    }
    
    console.log(`   ✓ Migrated ${categories.length} categories`);
  }

  // Create default categories
  async createDefaultCategories() {
    const defaultTenant = await postgresConnection.getTenantBySubdomain('default');
    const tenantId = defaultTenant.id;

    const defaultCategories = [
      { name: 'Beverages', description: 'Drinks and refreshments', sort_order: 1 },
      { name: 'Appetizers', description: 'Starters and small plates', sort_order: 2 },
      { name: 'Main Courses', description: 'Primary dishes', sort_order: 3 },
      { name: 'Desserts', description: 'Sweet endings', sort_order: 4 },
      { name: 'Specials', description: 'Chef specials', sort_order: 5 }
    ];

    for (const category of defaultCategories) {
      try {
        const result = await postgresConnection.query(`
          INSERT INTO categories (tenant_id, name, description, sort_order)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [tenantId, category.name, category.description, category.sort_order]);
        
        this.logMigration('categories', category.name, result.rows[0].id, 'created');
        this.stats.migratedRecords++;
        this.stats.totalRecords++;
      } catch (error) {
        this.handleMigrationError('categories', category.name, error);
      }
    }
    
    console.log(`   ✓ Created ${defaultCategories.length} default categories`);
  }

  // Migrate menu items/inventory data
  async migrateMenuItems() {
    console.log('🍽️  Migrating menu items...');
    
    const nedbPath = this.getNeDBPath('inventory.db');
    if (!fs.existsSync(nedbPath)) {
      console.log('   ⚠️  inventory.db not found, skipping');
      return;
    }

    const db = new Datastore({ filename: nedbPath, autoload: true });
    const menuItems = await this.findAllAsync(db);
    
    const defaultTenant = await postgresConnection.getTenantBySubdomain('default');
    const tenantId = defaultTenant.id;

    // Get category mapping
    const categoryMap = await this.getCategoryMapping(tenantId);

    for (const item of menuItems) {
      try {
        // Find category ID
        let categoryId = null;
        if (item.category) {
          categoryId = categoryMap[item.category] || null;
        }

        const result = await postgresConnection.query(`
          INSERT INTO menu_items (
            tenant_id, sku, barcode, name, description, category_id,
            price, cost, quantity, min_stock, unit, available,
            preparation_time, kitchen_station, dietary_info, allergens,
            popularity_score, is_combo, seasonal_item, image_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING id
        `, [
          tenantId,
          item.sku || item.barcode || null,
          item.barcode || null,
          item.name || item.product_name || 'Unknown Item',
          item.description || '',
          categoryId,
          parseFloat(item.price || 0),
          parseFloat(item.cost || item.price || 0),
          parseInt(item.quantity || 0),
          parseInt(item.minStock || 0),
          item.unit || 'piece',
          item.stock !== 'on', // If stock is 'on', available is false
          parseInt(item.preparation_time || 15),
          item.kitchen_station || 'general',
          JSON.stringify(item.dietary_info || []),
          JSON.stringify(item.allergens || []),
          parseInt(item.popularity_score || 0),
          item.is_combo === true || item.is_combo === 'on',
          item.seasonal_item === true || item.seasonal_item === 'on',
          item.img || null
        ]);
        
        this.logMigration('menu_items', item._id, result.rows[0].id, 'success');
        this.stats.migratedRecords++;
      } catch (error) {
        this.handleMigrationError('menu_items', item._id, error);
      }
      this.stats.totalRecords++;
    }
    
    console.log(`   ✓ Migrated ${menuItems.length} menu items`);
  }

  // Migrate transactions data
  async migrateTransactions() {
    console.log('💳 Migrating transactions...');
    
    const nedbPath = this.getNeDBPath('transactions.db');
    if (!fs.existsSync(nedbPath)) {
      console.log('   ⚠️  transactions.db not found, skipping');
      return;
    }

    const db = new Datastore({ filename: nedbPath, autoload: true });
    const transactions = await this.findAllAsync(db);
    
    const defaultTenant = await postgresConnection.getTenantBySubdomain('default');
    const tenantId = defaultTenant.id;

    for (const transaction of transactions) {
      try {
        await this.migrateSingleTransaction(transaction, tenantId);
        this.stats.migratedRecords++;
      } catch (error) {
        this.handleMigrationError('transactions', transaction._id, error);
      }
      this.stats.totalRecords++;
    }
    
    console.log(`   ✓ Migrated ${transactions.length} transactions`);
  }

  // Migrate a single transaction
  async migrateSingleTransaction(transaction, tenantId) {
    // Generate transaction number
    const transactionNumber = transaction.order?.toString() || transaction._id.toString();
    
    // Determine transaction type and status
    const transactionType = transaction.type === 'return' ? 'return' : 'sale';
    const status = transaction.status === 1 ? 'completed' : 'pending';
    
    // Calculate totals
    const subtotal = parseFloat(transaction.subtotal || transaction.total || 0);
    const taxAmount = parseFloat(transaction.tax || 0);
    const totalAmount = parseFloat(transaction.total || 0);
    
    // Create main transaction
    const transactionResult = await postgresConnection.query(`
      INSERT INTO transactions (
        tenant_id, transaction_number, transaction_type, status,
        subtotal, tax_amount, total_amount, payment_method,
        order_type, table_number, notes, transaction_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      tenantId,
      transactionNumber,
      transactionType,
      status,
      subtotal,
      taxAmount,
      totalAmount,
      transaction.payment_mode || 'Cash',
      transaction.order_type || 'dine-in',
      transaction.table_number || null,
      transaction.notes || '',
      new Date(transaction.date || transaction.created_at || Date.now())
    ]);

    const newTransactionId = transactionResult.rows[0].id;
    
    // Migrate transaction items if they exist
    if (transaction.items && Array.isArray(transaction.items)) {
      for (const item of transaction.items) {
        await postgresConnection.query(`
          INSERT INTO transaction_items (
            transaction_id, quantity, unit_price, total_price, special_instructions
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          newTransactionId,
          parseInt(item.quantity || 1),
          parseFloat(item.price || 0),
          parseFloat(item.total_price || item.price || 0),
          item.special_instructions || ''
        ]);
      }
    }

    // Create live transaction for MongoDB (real-time analytics)
    if (status === 'completed') {
      await mongoConnection.createLiveTransaction({
        tenantId: tenantId,
        transactionId: newTransactionId,
        amount: totalAmount,
        paymentMethod: transaction.payment_mode || 'Cash',
        tableNumber: transaction.table_number,
        status: status
      });
    }

    this.logMigration('transactions', transaction._id, newTransactionId, 'success');
  }

  // Migrate kitchen orders to MongoDB
  async migrateKitchenOrders() {
    console.log('👨‍🍳 Migrating kitchen orders...');
    
    const nedbPath = this.getNeDBPath('kitchen_orders.db');
    if (!fs.existsSync(nedbPath)) {
      console.log('   ⚠️  kitchen_orders.db not found, skipping');
      return;
    }

    const db = new Datastore({ filename: nedbPath, autoload: true });
    const kitchenOrders = await this.findAllAsync(db);
    
    const defaultTenant = await postgresConnection.getTenantBySubdomain('default');
    const tenantId = defaultTenant.id;

    for (const order of kitchenOrders) {
      try {
        const migratedOrder = await mongoConnection.createKitchenOrder({
          tenantId: tenantId,
          orderNumber: order.order_number || order._id.toString(),
          tableId: null, // Will need to map table numbers to IDs
          tableNumber: order.table_number || null,
          items: (order.items || []).map(item => ({
            menuItemId: item.menu_item_id?.toString() || null,
            name: item.name || 'Unknown Item',
            quantity: parseInt(item.quantity || 1),
            specialInstructions: item.special_instructions || '',
            kitchenStation: item.kitchen_station || 'general',
            prepTime: parseInt(item.prep_time || 15)
          })),
          priority: order.priority || 'normal',
          estimatedCompletion: order.estimated_completion ? new Date(order.estimated_completion) : null
        });
        
        this.logMigration('kitchen_orders', order._id, migratedOrder._id.toString(), 'success');
        this.stats.migratedRecords++;
      } catch (error) {
        this.handleMigrationError('kitchen_orders', order._id, error);
      }
      this.stats.totalRecords++;
    }
    
    console.log(`   ✓ Migrated ${kitchenOrders.length} kitchen orders`);
  }

  // Helper methods
  async findAllAsync(db) {
    return new Promise((resolve, reject) => {
      db.find({}, (err, docs) => {
        if (err) reject(err);
        else resolve(docs || []);
      });
    });
  }

  getNeDBPath(filename) {
    const appData = process.env.APPDATA || './';
    const appName = process.env.APPNAME || 'restaurant_pos';
    return path.join(appData, appName, 'server', 'databases', filename);
  }

  async getCategoryMapping(tenantId) {
    const result = await postgresConnection.query(
      'SELECT id, name FROM categories WHERE tenant_id = $1',
      [tenantId]
    );
    
    const mapping = {};
    result.rows.forEach(category => {
      mapping[category.name] = category.id;
    });
    
    return mapping;
  }

  generateTempPassword() {
    return 'temp_' + Math.random().toString(36).substring(2, 15);
  }

  mapOldPermissions(user) {
    const permissions = {
      products: user.perm_products === 1,
      categories: user.perm_categories === 1,
      transactions: user.perm_transactions === 1,
      users: user.perm_users === 1,
      settings: user.perm_settings === 1
    };
    
    return permissions;
  }

  logMigration(table, oldId, newId, status) {
    const logEntry = {
      table,
      oldId: oldId.toString(),
      newId: newId.toString(),
      status,
      timestamp: new Date().toISOString()
    };
    
    this.migrationLog.push(logEntry);
  }

  handleMigrationError(table, oldId, error) {
    const errorMessage = `${table}[${oldId}]: ${error.message}`;
    this.stats.errors.push(errorMessage);
    this.stats.failedRecords++;
    
    console.log(`   ⚠️  Failed to migrate ${table}[${oldId}]: ${error.message}`);
  }

  // Generate migration report
  generateMigrationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now(),
      stats: this.stats,
      log: this.migrationLog,
      summary: {
        totalTables: new Set(this.migrationLog.map(entry => entry.table)).size,
        successfulMigrations: this.migrationLog.filter(entry => entry.status === 'success').length,
        failedMigrations: this.migrationLog.filter(entry => entry.status === 'error').length,
        createdRecords: this.migrationLog.filter(entry => entry.status === 'created').length
      }
    };
    
    const reportPath = path.join(__dirname, 'migration_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Migration report saved to: ${reportPath}`);
    return report;
  }
}

// Migration script runner
async function runMigration() {
  const migrator = new DatabaseMigration();
  
  try {
    await migrator.migrateAll();
    migrator.generateMigrationReport();
    
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  DatabaseMigration,
  runMigration
};