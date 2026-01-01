# Cloud Database Schema and Infrastructure Design
## Restaurant POS System - Migration from NeDB to Cloud

### Executive Summary

This document outlines a comprehensive cloud database schema and infrastructure design to replace the current 15+ NeDB databases with a modern, scalable cloud database solution. The new architecture will support multi-tenant restaurant operations, real-time synchronization, AI integration, and web application compatibility.

### Current System Analysis

**Current NeDB Databases Identified:**
1. `analytics.db` - Dashboard and reporting data
2. `audit_logs.db` - System audit trail
3. `backup.db` - Backup operations
4. `categories.db` - Product categories
5. `combos.db` - Combo meal configurations
6. `customers.db` - Customer management
7. `day_close.db` - End-of-day operations
8. `delivery_partners.db` - Third-party delivery services
9. `inventory.db` - Menu items and inventory (with batches)
10. `kitchen_orders.db` - Kitchen order management
11. `purchase_orders.db` - Inventory purchasing
12. `recipes.db` - Recipe management with costing
13. `session_logs.db` - User session tracking
14. `settings.db` - System configuration
15. `shifts.db` - Staff shift management
16. `suppliers.db` - Supplier management
17. `table_orders.db` - Table service orders
18. `table_reservations.db` - Reservation system
19. `tables.db` - Table management
20. `time_pricing_rules.db` - Dynamic pricing rules
21. `transactions.db` - Sales transactions (with returns)
22. `transactions_backup.db` - Transaction backups
23. `users.db` - User management
24. `waste.db` - Inventory waste tracking

---

## 1. Database Selection & Architecture

### 1.1 Recommended Architecture: Hybrid PostgreSQL + MongoDB

**Primary Database: PostgreSQL (Relational Data)**
- **Rationale**: ACID compliance for financial transactions, complex queries, data integrity
- **Use Cases**: Transactions, users, inventory, recipes, tables, shifts, audit logs
- **Advantages**: Strong consistency, complex joins, financial compliance, rich indexing

**Secondary Database: MongoDB (Document Data)**
- **Rationale**: Flexible schema for analytics, real-time data, AI features
- **Use Cases**: Analytics data, kitchen orders, real-time notifications, AI features
- **Advantages**: Flexible schema, real-time processing, aggregation pipeline, easy scaling

### 1.2 Multi-Tenant Architecture

```mermaid
graph TD
    A[Restaurant Chain] --> B[Primary Region]
    A --> C[Secondary Region]
    B --> D[PostgreSQL Primary]
    B --> E[MongoDB Primary]
    C --> F[PostgreSQL Replica]
    C --> G[MongoDB Replica]
    D --> H[Tenant Isolation]
    E --> I[Analytics Cluster]
```

**Tenant Isolation Strategy:**
- **Database-Level**: Separate databases per restaurant chain
- **Schema-Level**: Shared database with tenant_id columns
- **Row-Level Security**: PostgreSQL RLS for fine-grained access control

---

## 2. Database Schema Design

### 2.1 PostgreSQL Schema (Primary Database)

#### 2.1.1 Core Entities

**Tenants Table**
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    database_name VARCHAR(100) UNIQUE,
    status VARCHAR(50) DEFAULT 'active',
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSONB
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(status);
```

**Users Table (Enhanced)**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'waiter',
    employee_id VARCHAR(100),
    permissions JSONB,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_username_tenant ON users(username, tenant_id);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);
```

**Inventory/Menu Items Table**
```sql
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    sku VARCHAR(100),
    barcode VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id),
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'piece',
    available BOOLEAN DEFAULT true,
    preparation_time INTEGER DEFAULT 15, -- minutes
    kitchen_station VARCHAR(100) DEFAULT 'general',
    dietary_info JSONB DEFAULT '[]',
    allergens JSONB DEFAULT '[]',
    popularity_score INTEGER DEFAULT 0,
    is_combo BOOLEAN DEFAULT false,
    combo_items JSONB DEFAULT '[]',
    seasonal_item BOOLEAN DEFAULT false,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_items_tenant_id ON menu_items(tenant_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(available);
CREATE INDEX idx_menu_items_kitchen_station ON menu_items(kitchen_station);
```

**Categories Table**
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_tenant_id ON categories(tenant_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
```

#### 2.1.2 Transaction Management

**Transactions Table**
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    transaction_number VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id),
    customer_id UUID REFERENCES customers(id),
    shift_id UUID REFERENCES shifts(id),
    transaction_type VARCHAR(50) DEFAULT 'sale',
    status VARCHAR(50) DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    change_amount DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(100),
    tax_details JSONB DEFAULT '{}',
    order_type VARCHAR(50) DEFAULT 'dine-in',
    table_number VARCHAR(20),
    customer_count INTEGER DEFAULT 1,
    notes TEXT,
    transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_tenant_id ON transactions(tenant_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_time);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_table ON transactions(table_number);
```

**Transaction Items Table**
```sql
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_menu_item ON transaction_items(menu_item_id);
```

#### 2.1.3 Kitchen and Table Management

**Tables Table**
```sql
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    table_number VARCHAR(20) NOT NULL,
    table_name VARCHAR(100),
    capacity INTEGER DEFAULT 4,
    location VARCHAR(100) DEFAULT 'main',
    status VARCHAR(50) DEFAULT 'available',
    position_x DECIMAL(10,2) DEFAULT 0,
    position_y DECIMAL(10,2) DEFAULT 0,
    width INTEGER DEFAULT 100,
    height INTEGER DEFAULT 100,
    shape VARCHAR(50) DEFAULT 'square',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_tables_number_tenant ON tables(table_number, tenant_id);
CREATE INDEX idx_tables_tenant_id ON tables(tenant_id);
CREATE INDEX idx_tables_status ON tables(status);
```

**Table Orders Table**
```sql
CREATE TABLE table_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    table_id UUID REFERENCES tables(id),
    order_number VARCHAR(100) NOT NULL,
    customer_count INTEGER DEFAULT 1,
    server_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'seated',
    order_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estimated_service_time TIMESTAMP,
    actual_service_time TIMESTAMP,
    bill_total DECIMAL(10,2) DEFAULT 0,
    bill_status VARCHAR(50) DEFAULT 'open',
    bill_split_info JSONB DEFAULT '[]',
    special_requests TEXT,
    feedback_rating INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_table_orders_tenant_id ON table_orders(tenant_id);
CREATE INDEX idx_table_orders_table ON table_orders(table_id);
CREATE INDEX idx_table_orders_server ON table_orders(server_id);
CREATE INDEX idx_table_orders_status ON table_orders(status);
```

#### 2.1.4 Recipe Management

**Recipes Table**
```sql
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    menu_item_id UUID REFERENCES menu_items(id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    instructions JSONB DEFAULT '[]',
    prep_time INTEGER DEFAULT 0,
    cook_time INTEGER DEFAULT 0,
    serving_size INTEGER DEFAULT 1,
    cost_per_serving DECIMAL(10,2) DEFAULT 0,
    yield_percentage DECIMAL(5,2) DEFAULT 100,
    difficulty_level VARCHAR(50) DEFAULT 'medium',
    allergens JSONB DEFAULT '[]',
    dietary_info JSONB DEFAULT '[]',
    nutritional_info JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recipes_tenant_id ON recipes(tenant_id);
CREATE INDEX idx_recipes_menu_item ON recipes(menu_item_id);
CREATE INDEX idx_recipes_category ON recipes(category);
```

**Recipe Ingredients Table**
```sql
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    cost_per_unit DECIMAL(10,2) DEFAULT 0,
    supplier_id UUID REFERENCES suppliers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
```

#### 2.1.5 Staff and Operations

**Shifts Table**
```sql
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    shift_id VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(50) DEFAULT 'open',
    expected_cash DECIMAL(10,2) DEFAULT 0,
    actual_cash DECIMAL(10,2) DEFAULT 0,
    cash_sales DECIMAL(10,2) DEFAULT 0,
    card_sales DECIMAL(10,2) DEFAULT 0,
    transactions_count INTEGER DEFAULT 0,
    returns DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shifts_tenant_id ON shifts(tenant_id);
CREATE INDEX idx_shifts_user ON shifts(user_id);
CREATE INDEX idx_shifts_status ON shifts(status);
```

#### 2.1.6 Audit and Security

**Audit Logs Table**
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### 2.2 MongoDB Schema (Analytics and Real-time Data)

#### 2.2.1 Real-time Kitchen Orders Collection
```javascript
// kitchen_orders collection
{
  _id: ObjectId,
  tenant_id: String,
  order_number: String,
  table_id: String,
  items: [{
    menu_item_id: String,
    name: String,
    quantity: Number,
    special_instructions: String,
    kitchen_station: String,
    prep_time: Number,
    status: String,
    started_at: Date,
    completed_at: Date
  }],
  order_status: String,
  priority: String,
  order_time: Date,
  estimated_completion: Date,
  actual_completion: Date,
  server_notes: String,
  real_time_updates: [{
    timestamp: Date,
    status: String,
    updated_by: String
  }]
}

// Indexes
db.kitchen_orders.createIndex({ "tenant_id": 1, "order_status": 1 });
db.kitchen_orders.createIndex({ "tenant_id": 1, "order_time": -1 });
db.kitchen_orders.createIndex({ "items.kitchen_station": 1, "order_status": 1 });
```

#### 2.2.2 Analytics Data Collection
```javascript
// analytics_snapshots collection
{
  _id: ObjectId,
  tenant_id: String,
  report_type: String,
  date: Date,
  data: {
    sales: {
      total_revenue: Number,
      total_orders: Number,
      average_order_value: Number,
      hourly_patterns: Object,
      daily_patterns: Object,
      growth_metrics: Object
    },
    menu_performance: {
      top_selling_items: Array,
      category_performance: Object,
      menu_engineering: Object
    },
    kitchen: {
      average_prep_time:_performance: Object Number,
      station,
      efficiency_metrics: Object
    },
    financial: {
      revenue_analytics: Object,
      cost_analysis: Object,
      profitability_metrics: Object
    }
  },
  created_at: Date,
  generated_by: String
}

// Indexes
db.analytics_snapshots.createIndex({ "tenant_id": 1, "report_type": 1, "date": -1 });
db.analytics_snapshots.createIndex({ "tenant_id": 1, "date": -1 });
```

#### 2.2.3 Time-based Pricing Rules
```javascript
// time_pricing_rules collection
{
  _id: ObjectId,
  tenant_id: String,
  menu_item_id: String,
  name: String,
  discount_type: String, // 'percentage' or 'fixed'
  discount_value: Number,
  start_time: String, // 'HH:MM' format
  end_time: String,   // 'HH:MM' format
  days_of_week: [Number], // 0-6, Sunday = 0
  active: Boolean,
  created_at: Date,
  updated_at: Date
}

// Indexes
db.time_pricing_rules.createIndex({ "tenant_id": 1, "menu_item_id": 1, "active": 1 });
```

---

## 3. Data Migration Strategy

### 3.1 Migration Phases

**Phase 1: Data Analysis and Preparation**
1. **Data Audit**
   - Analyze all 24 NeDB databases
   - Identify data relationships and constraints
   - Document data quality issues
   - Create data mapping documentation

2. **Data Cleansing**
   - Remove duplicate records
   - Standardize data formats
   - Fix inconsistent data types
   - Validate referential integrity

**Phase 2: Schema Migration**
1. **Database Creation**
   - Set up PostgreSQL database with proper schema
   - Create MongoDB collections with indexes
   - Implement row-level security policies
   - Set up tenant isolation

2. **Data Transformation**
   - Create ETL scripts for each data entity
   - Transform nested NeDB documents to relational structure
   - Handle many-to-many relationships
   - Generate UUIDs for all records

**Phase 3: Application Migration**
1. **API Layer Updates**
   - Update all API endpoints to use new database connections
   - Implement connection pooling
   - Add transaction management
   - Update authentication and authorization

2. **Real-time Features**
   - Implement Socket.io with MongoDB change streams
   - Set up Redis for real-time data caching
   - Configure WebSocket connections

### 3.2 Migration Scripts

**NeDB to PostgreSQL Migration Script**
```javascript
// migration_scripts/ nedb_to_postgresql.js
const { Client } = require('pg');
const Datastore = require('@seald-io/nedb');
const path = require('path');

async function migrateInventory() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  await client.connect();

  const inventoryDB = new Datastore({
    filename: path.join(process.env.APPDATA, process.env.APPNAME, 'server/databases/inventory.db'),
    autoload: true
  });

  return new Promise((resolve, reject) => {
    inventoryDB.find({}, async (err, docs) => {
      if (err) return reject(err);

      try {
        for (const doc of docs) {
          const category = await getOrCreateCategory(client, doc.category);
          
          const query = `
            INSERT INTO menu_items (
              id, tenant_id, sku, barcode, name, description, category_id,
              price, cost, quantity, min_stock, available, kitchen_station,
              dietary_info, allergens, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              price = EXCLUDED.price,
              updated_at = EXCLUDED.updated_at
          `;

          await client.query(query, [
            doc._id.toString(),
            doc.tenant_id || 'default-tenant',
            doc.sku || doc.barcode,
            doc.barcode,
            doc.name,
            doc.description || null,
            category,
            parseFloat(doc.price || 0),
            parseFloat(doc.cost || 0),
            parseInt(doc.quantity || 0),
            parseInt(doc.minStock || 0),
            doc.stock === 'on' ? false : true,
            doc.kitchen_station || 'general',
            JSON.stringify(doc.dietary_info || []),
            JSON.stringify(doc.allergens || []),
            doc.created_date || new Date(),
            doc.last_modified || new Date()
          ]);
        }

        console.log(`Migrated ${docs.length} inventory items`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function getOrCreateCategory(client, categoryName) {
  if (!categoryName) return null;
  
  const query = 'SELECT id FROM categories WHERE name = $1 AND tenant_id = $2';
  const result = await client.query(query, [categoryName, 'default-tenant']);
  
  if (result.rows.length > 0) {
    return result.rows[0].id;
  }
  
  const insertQuery = 'INSERT INTO categories (name, tenant_id) VALUES ($1, $2) RETURNING id';
  const insertResult = await client.query(insertQuery, [categoryName, 'default-tenant']);
  return insertResult.rows[0].id;
}

module.exports = { migrateInventory };
```

### 3.3 Rollback Procedures

1. **Database Snapshots**
   - Create full database snapshots before migration
   - Maintain incremental backups during migration
   - Test rollback procedures on staging environment

2. **Application Rollback**
   - Maintain current NeDB system in parallel
   - Implement feature flags for gradual migration
   - Quick rollback to NeDB if issues arise

---

## 4. Real-time Data Management

### 4.1 Change Data Capture (CDC)

**PostgreSQL CDC with pglogical**
```sql
-- Install pglogical extension
CREATE EXTENSION IF NOT EXISTS pglogical;

-- Create replication set
SELECT pglogical.create_replication_set('restaurant_changes');

-- Add tables to replication set
SELECT pglogical.replication_set_add_table('restaurant_changes', 'transactions', true);
SELECT pglogical.replication_set_add_table('restaurant_changes', 'table_orders', true);
SELECT pglogical.replication_set_add_table('restaurant_changes', 'kitchen_orders', true);

-- Enable row-level replication
ALTER TABLE transactions REPLICA IDENTITY FULL;
ALTER TABLE table_orders REPLICA IDENTITY FULL;
ALTER TABLE kitchen_orders REPLICA IDENTITY FULL;
```

**MongoDB Change Streams**
```javascript
// Real-time data synchronization
const MongoClient = require('mongodb').MongoClient;

class RealTimeSync {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URL);
  }

  async startKitchenOrderTracking() {
    await this.client.connect();
    const db = this.client.db('restaurant_analytics');
    
    const changeStream = db.collection('kitchen_orders').watch([
      { $match: { operationType: { $in: ['insert', 'update', 'replace'] } } }
    ]);

    changeStream.on('change', (change) => {
      // Emit to Socket.io
      global.io.emit('kitchen-update', {
        type: change.operationType,
        data: change.fullDocument,
        timestamp: new Date()
      });
    });

    return changeStream;
  }

  async trackTransactionUpdates() {
    const db = this.client.db('restaurant_analytics');
    
    // Set up change stream for transactions
    const changeStream = db.collection('transactions').watch([
      { $match: { operationType: 'insert' } }
    ]);

    changeStream.on('change', async (change) => {
      const transaction = change.fullDocument;
      
      // Update analytics in real-time
      await this.updateAnalyticsRealtime(transaction);
      
      // Emit to connected clients
      global.io.emit('transaction-update', {
        transaction_id: transaction._id,
        amount: transaction.total_amount,
        timestamp: transaction.transaction_time
      });
    });

    return changeStream;
  }
}

module.exports = RealTimeSync;
```

### 4.2 Event-Driven Architecture

```mermaid
graph LR
    A[Transaction Event] --> B[Event Bus]
    B --> C[Inventory Service]
    B --> D[Analytics Service]
    B --> E[Notification Service]
    C --> F[Inventory Updated]
    D --> G[Analytics Updated]
    E --> H[Kitchen Display]
    E --> I[Mobile App]
```

**Event Bus Implementation**
```javascript
// services/eventBus.js
const EventEmitter = require('events');

class RestaurantEventBus extends EventEmitter {
  constructor() {
    super();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.on('transaction.created', this.handleTransactionCreated.bind(this));
    this.on('order.status.changed', this.handleOrderStatusChanged.bind(this));
    this.on('inventory.low_stock', this.handleLowStockAlert.bind(this));
    this.on('table.occupied', this.handleTableOccupied.bind(this));
  }

  async handleTransactionCreated(transaction) {
    // Update inventory
    await this.updateInventoryFromTransaction(transaction);
    
    // Update analytics
    await this.updateAnalyticsFromTransaction(transaction);
    
    // Create kitchen order if needed
    if (transaction.order_type === 'dine-in') {
      await this.createKitchenOrder(transaction);
    }
  }

  async handleOrderStatusChanged(orderUpdate) {
    // Update table status
    await this.updateTableStatus(orderUpdate.table_id, orderUpdate.status);
    
    // Send notifications
    await this.sendOrderNotifications(orderUpdate);
    
    // Update kitchen display
    global.io.emit('order-status-update', orderUpdate);
  }
}

module.exports = RestaurantEventBus;
```

---

## 5. Security & Compliance

### 5.1 Data Encryption

**At Rest Encryption**
```sql
-- PostgreSQL encryption
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = 'server.crt';
ALTER SYSTEM SET ssl_key_file = 'server.key';

-- Enable pgcrypto extension for field-level encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive customer data
CREATE OR REPLACE FUNCTION encrypt_customer_data(data text)
RETURNS text AS $$
BEGIN
  RETURN encode(encrypt(data::bytea, 'encryption_key', 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql;
```

**In Transit Encryption**
- TLS 1.3 for all connections
- Certificate pinning for mobile apps
- End-to-end encryption for sensitive data

### 5.2 Access Control

**Row-Level Security (RLS)**
```sql
-- Enable RLS on all tables
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy
CREATE POLICY tenant_isolation ON menu_items
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Role-based access control
CREATE ROLE restaurant_admin;
CREATE ROLE restaurant_manager;
CREATE ROLE waiter;
CREATE ROLE kitchen_staff;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO restaurant_admin;
GRANT SELECT, INSERT, UPDATE ON transactions TO restaurant_manager;
GRANT SELECT ON menu_items TO waiter;
GRANT SELECT, UPDATE ON kitchen_orders TO kitchen_staff;
```

### 5.3 Audit Logging

**Comprehensive Audit Trail**
```sql
-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    tenant_id, user_id, action, entity_type, entity_id,
    old_values, new_values, created_at
  ) VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    current_setting('app.current_user_id')::uuid,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    CURRENT_TIMESTAMP
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers
CREATE TRIGGER audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### 5.4 GDPR Compliance

**Data Privacy Features**
```javascript
// services/privacy.js
class PrivacyManager {
  async anonymizeCustomerData(customerId) {
    // Replace PII with anonymized data
    const anonymizedData = {
      name: 'Anonymous Customer',
      email: `anonymous_${customerId}@deleted.local`,
      phone: null,
      address: null,
      date_of_birth: null
    };

    await this.updateCustomerRecord(customerId, anonymizedData);
  }

  async exportCustomerData(customerId) {
    // Export all customer data for GDPR requests
    const customerData = await this.getAllCustomerData(customerId);
    return {
      customer_info: customerData.customer,
      transactions: customerData.transactions,
      preferences: customerData.preferences,
      export_date: new Date().toISOString()
    };
  }

  async deleteCustomerData(customerId) {
    // Permanently delete customer data
    await this.anonymizeCustomerData(customerId);
    
    // Schedule permanent deletion after retention period
    await this.schedulePermanentDeletion(customerId, 30); // 30 days
  }
}
```

---

## 6. Performance & Optimization

### 6.1 Database Indexing Strategy

**PostgreSQL Indexes**
```sql
-- Composite indexes for common queries
CREATE INDEX idx_transactions_date_status ON transactions(transaction_time, status);
CREATE INDEX idx_menu_items_category_available ON menu_items(category_id, available);
CREATE INDEX idx_table_orders_status_time ON table_orders(status, order_time);

-- Partial indexes for better performance
CREATE INDEX idx_active_menu_items ON menu_items(id) WHERE available = true;
CREATE INDEX idx_pending_transactions ON transactions(id) WHERE status = 'pending';

-- GIN indexes for JSONB columns
CREATE INDEX idx_menu_items_dietary_info ON menu_items USING GIN (dietary_info);
CREATE INDEX idx_transaction_items_special_instructions ON transaction_items USING GIN (to_tsvector('english', special_instructions));
```

**MongoDB Indexes**
```javascript
// Analytics collection indexes
db.analytics_snapshots.createIndex(
  { "tenant_id": 1, "report_type": 1, "date": -1 },
  { name: "analytics_tenant_report_date" }
);

// Kitchen orders indexes
db.kitchen_orders.createIndex(
  { "tenant_id": 1, "order_status": 1, "order_time": -1 },
  { name: "kitchen_orders_status_time" }
);

// Compound indexes for real-time queries
db.kitchen_orders.createIndex(
  { "items.kitchen_station": 1, "order_status": 1, "priority": -1 },
  { name: "kitchen_station_efficiency" }
);
```

### 6.2 Query Optimization

**Optimized Transaction Queries**
```sql
-- Efficient transaction reporting query
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  DATE(transaction_time) as date,
  COUNT(*) as transaction_count,
  SUM(total_amount) as daily_revenue,
  AVG(total_amount) as average_order_value
FROM transactions 
WHERE tenant_id = $1 
  AND transaction_time >= $2 
  AND transaction_time < $3
  AND status = 'completed'
GROUP BY DATE(transaction_time)
ORDER BY date DESC;

-- Use materialized views for complex analytics
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT 
  tenant_id,
  DATE(transaction_time) as sale_date,
  COUNT(*) as transaction_count,
  SUM(total_amount) as total_revenue,
  SUM(tax_amount) as total_tax,
  AVG(total_amount) as avg_order_value
FROM transactions 
WHERE status = 'completed'
GROUP BY tenant_id, DATE(transaction_time);

-- Refresh materialized view hourly
CREATE OR REPLACE FUNCTION refresh_daily_sales_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
END;
$$ LANGUAGE plpgsql;
```

### 6.3 Connection Pooling

**PostgreSQL Connection Pool**
```javascript
// database/postgresPool.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
```

**MongoDB Connection Pool**
```javascript
// database/mongoPool.js
const { MongoClient } = require('mongodb');

class MongoDBConnectionPool {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URL, {
      maxPoolSize: 50,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  }

  async connect() {
    if (!this.client.topology) {
      await this.client.connect();
    }
    return this.client.db();
  }

  async getDatabase() {
    return await this.connect();
  }

  async close() {
    await this.client.close();
  }
}

module.exports = new MongoDBConnectionPool();
```

---

## 7. Integration & APIs

### 7.1 API Layer Design

**GraphQL Schema for Complex Queries**
```graphql
# schema.graphql
type Query {
  transactions(
    tenantId: ID!
    startDate: DateTime
    endDate: DateTime
    status: TransactionStatus
    limit: Int
    offset: Int
  ): TransactionConnection!
  
  menuItem(id: ID!): MenuItem
  menuItems(
    tenantId: ID!
    category: String
    available: Boolean
  ): [MenuItem!]!
  
  analytics(
    tenantId: ID!
    type: AnalyticsType!
    dateRange: DateRange!
  ): AnalyticsData!
}

type Mutation {
  createTransaction(input: CreateTransactionInput!): Transaction!
  updateOrderStatus(orderId: ID!, status: OrderStatus!): Order!
  
  createMenuItem(input: CreateMenuItemInput!): MenuItem!
  updateInventory(menuItemId: ID!, quantity: Int!): MenuItem!
}

type Subscription {
  transactionCreated(tenantId: ID!): Transaction!
  kitchenOrderUpdated(tenantId: ID!): KitchenOrderUpdate!
  tableStatusChanged(tenantId: ID!): TableStatusUpdate!
}

type Transaction {
  id: ID!
  transactionNumber: String!
  totalAmount: Float!
  status: TransactionStatus!
  items: [TransactionItem!]!
  customer: Customer
  table: Table
  createdAt: DateTime!
}

type TransactionItem {
  id: ID!
  menuItem: MenuItem!
  quantity: Int!
  unitPrice: Float!
  totalPrice: Float!
  specialInstructions: String
}
```

### 7.2 REST API Updates

**Enhanced Transaction API**
```javascript
// api/v2/transactions.js
const express = require('express');
const router = express.Router();
const pool = require('../../database/postgresPool');

router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create transaction with items in a single transaction
    const transactionResult = await client.query(`
      INSERT INTO transactions (
        tenant_id, transaction_number, user_id, customer_id,
        subtotal, tax_amount, total_amount, payment_method,
        transaction_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      req.body.tenantId,
      req.body.transactionNumber,
      req.body.userId,
      req.body.customerId,
      req.body.subtotal,
      req.body.taxAmount,
      req.body.totalAmount,
      req.body.paymentMethod,
      new Date()
    ]);
    
    const transaction = transactionResult.rows[0];
    
    // Insert transaction items
    for (const item of req.body.items) {
      await client.query(`
        INSERT INTO transaction_items (
          transaction_id, menu_item_id, quantity,
          unit_price, total_price, special_instructions
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
      `, [item.quantity, item.menuItemId, req.body.tenantId]);
    }
    
    await client.query('COMMIT');
    
    // Emit real-time event
    global.io.to(req.body.tenantId).emit('transaction-created', transaction);
    
    res.status(201).json(transaction);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction creation error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  } finally {
    client.release();
  }
});

module.exports = router;
```

### 7.3 External API Integration

**Payment Gateway Integration**
```javascript
// services/paymentGateway.js
class PaymentGatewayService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  async processPayment(paymentData) {
    const {
      amount,
      currency,
      receipt,
      notes,
      customerId,
      tenantId
    } = paymentData;

    try {
      const order = await this.razorpay.orders.create({
        amount: amount * 100, // Convert to paise
        currency,
        receipt,
        notes
      });

      // Store payment intent in database
      await this.storePaymentIntent({
        razorpay_order_id: order.id,
        amount,
        currency,
        customer_id: customerId,
        tenant_id: tenantId,
        status: 'pending'
      });

      return {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID
      };
    } catch (error) {
      console.error('Payment gateway error:', error);
      throw new Error('Payment processing failed');
    }
  }

  async verifyPayment(paymentData) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      tenantId
    } = paymentData;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      await this.updatePaymentStatus(razorpay_payment_id, 'completed', tenantId);
      return true;
    }

    return false;
  }
}
```

---

## 8. Cloud Infrastructure

### 8.1 Recommended Cloud Platform: AWS

**Infrastructure Architecture**
```yaml
# terraform/infrastructure.tf
resource "aws_rds_cluster" "postgres_cluster" {
  cluster_identifier      = "restaurant-pos-postgres"
  engine                 = "aurora-postgresql"
  engine_version         = "13.7"
  database_name          = "restaurant_pos"
  master_username        = var.db_username
  master_password        = var.db_password
  backup_retention_period = 7
  preferred_backup_window = "07:00-09:00"
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.postgres_subnet.name
  storage_encrypted      = true
  kms_key_id            = aws_kms_key.rds_key.arn
  enable_http_endpoint   = true
}

resource "aws_documentdb_cluster" "mongo_cluster" {
  cluster_identifier      = "restaurant-pos-mongo"
  engine                 = "docdb"
  engine_version         = "4.0"
  master_username        = var.mongo_username
  master_password        = var.mongo_password
  backup_retention_period = 7
  preferred_backup_window = "03:00-05:00"
  vpc_security_group_ids = [aws_security_group.docdb_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.docdb_subnet.name
  storage_encrypted      = true
  kms_key_id            = aws_kms_key.docdb_key.arn
}

resource "aws_elasticache_cluster" "redis_cache" {
  cluster_id           = "restaurant-pos-redis"
  engine              = "redis"
  node_type           = "cache.r6g.large"
  num_cache_nodes     = 1
  parameter_group_name = "default.redis7"
  port               = 6379
  subnet_group_name   = aws_elasticache_subnet_group.redis_subnet.name
  security_group_ids = [aws_security_group.redis_sg.id]
}

resource "aws_ecs_cluster" "restaurant_cluster" {
  name = "restaurant-pos-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_lb" "application_lb" {
  name               = "restaurant-pos-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets           = var.public_subnet_ids

  enable_deletion_protection = false
}
```

### 8.2 Container Orchestration

**Docker Compose for Development**
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: restaurant_pos
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  mongodb:
    image: mongo:6.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: restaurant_analytics
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/restaurant_pos
      MONGODB_URL: mongodb://admin:password@mongodb:27017/restaurant_analytics?authSource=admin
      REDIS_URL: redis://redis:6379
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - mongodb
      - redis
    volumes:
      - .:/app
      - /app/node_modules

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api

volumes:
  postgres_data:
  mongodb_data:
```

### 8.3 CI/CD Pipeline

**GitHub Actions Workflow**
```yaml
# .github/workflows/deploy.yml
name: Deploy Restaurant POS

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      mongodb:
        image: mongo:6.0
        env:
          MONGO_INITDB_ROOT_PASSWORD: password
        options: >-
          --health-cmd "mongo --eval 'db.adminCommand({ping: 1})'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run database migrations
      run: npm run migrate:test
      env:
        DATABASE_URL: postgresql://postgres:password@localhost:5432/test_db
    
    - name: Run tests
      run: npm test
      env:
        DATABASE_URL: postgresql://postgres:password@localhost:5432/test_db
        MONGODB_URL: mongodb://admin:password@localhost:27017/test_db

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-west-2
    
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build, tag, and push image to Amazon ECR
      id: build-image
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        ECR_REPOSITORY: restaurant-pos-api
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
        echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT
    
    - name: Update kube deployment
      run: |
        aws eks update-kubeconfig --region us-west-2 --name restaurant-pos-cluster
        kubectl set image deployment/api api=${{ steps.build-image.outputs.image }} -n restaurant-pos
        kubectl rollout status deployment/api -n restaurant-pos
```

---

## 9. Backup & Recovery

### 9.1 Automated Backup Strategy

**PostgreSQL Backup Script**
```bash
#!/bin/bash
# scripts/backup_postgres.sh

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="restaurant-pos-backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform database backup
pg_dump $DATABASE_URL \
  --format=custom \
  --compress=6 \
  --verbose \
  --file="$BACKUP_DIR/restaurant_pos_$DATE.dump"

# Compress backup
gzip "$BACKUP_DIR/restaurant_pos_$DATE.dump"

# Upload to S3
aws s3 cp "$BACKUP_DIR/restaurant_pos_$DATE.dump.gz" \
  "s3://$S3_BUCKET/postgres/$(date +%Y/%m/%d)/"

# Keep only last 30 days of local backups
find $BACKUP_DIR -name "restaurant_pos_*.dump.gz" -mtime +30 -delete

echo "PostgreSQL backup completed: restaurant_pos_$DATE.dump.gz"
```

**MongoDB Backup Script**
```bash
#!/bin/bash
# scripts/backup_mongodb.sh

BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="restaurant-pos-backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform MongoDB backup
mongodump $MONGODB_URL \
  --out="$BACKUP_DIR/mongodb_$DATE" \
  --gzip \
  --verbose

# Create archive
tar -czf "$BACKUP_DIR/mongodb_$DATE.tar.gz" -C "$BACKUP_DIR" "mongodb_$DATE"
rm -rf "$BACKUP_DIR/mongodb_$DATE"

# Upload to S3
aws s3 cp "$BACKUP_DIR/mongodb_$DATE.tar.gz" \
  "s3://$S3_BUCKET/mongodb/$(date +%Y/%m/%d)/"

# Keep only last 30 days of local backups
find $BACKUP_DIR -name "mongodb_*.tar.gz" -mtime +30 -delete

echo "MongoDB backup completed: mongodb_$DATE.tar.gz"
```

### 9.2 Point-in-Time Recovery

**Recovery Procedures**
```bash
#!/bin/bash
# scripts/restore_postgres.sh

BACKUP_FILE=$1
TARGET_TIME=$2
S3_BUCKET="restaurant-pos-backups"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file> [target_time]"
  echo "Example: $0 restaurant_pos_20231201_120000.dump.gz '2023-12-01 12:30:00'"
  exit 1
fi

# Download backup from S3 if not local
if [[ $BACKUP_FILE == s3://* ]]; then
  aws s3 cp "$BACKUP_FILE" "/tmp/$(basename $BACKUP_FILE)"
  BACKUP_FILE="/tmp/$(basename $BACKUP_FILE)"
fi

# Decompress backup
gunzip -c "$BACKUP_FILE" > "/tmp/restore_$(basename $BACKUP_FILE .dump.gz)"

# Restore to temporary database
pg_restore \
  --clean \
  --if-exists \
  --create \
  --verbose \
  --host=$PGHOST \
  --port=$PGPORT \
  --username=$PGUSER \
  --dbname=postgres \
  "/tmp/restore_$(basename $BACKUP_FILE .dump.gz)"

# If target time specified, use PITR
if [ ! -z "$TARGET_TIME" ]; then
  echo "Setting up point-in-time recovery to: $TARGET_TIME"
  # Configure recovery.conf for PITR
  cat > /var/lib/postgresql/data/recovery.conf << EOF
restore_command = 'aws s3 cp s3://$S3_BUCKET/wal/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
EOF
  
  # Restart PostgreSQL
  sudo systemctl restart postgresql
fi

echo "PostgreSQL restore completed"
```

### 9.3 Disaster Recovery Plan

**RTO/RPO Objectives**
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 1 hour
- **Data Retention**: 7 years for financial data

**Recovery Procedures**
```yaml
# disaster_recovery_plan.yml
phases:
  detection:
    - Monitor database connectivity
    - Alert on failed health checks
    - Check backup completion status
  
  assessment:
    - Determine scope of failure
    - Identify affected services
    - Estimate recovery time
  
  recovery:
    - Activate standby database
    - Restore from latest backup
    - Apply transaction logs
    - Verify data integrity
  
  validation:
    - Test application connectivity
    - Verify data consistency
    - Run integration tests
    - Update DNS if needed
  
  communication:
    - Notify stakeholders
    - Update status page
    - Document incident
```

---

## 10. Development & Deployment

### 10.1 Environment Management

**Environment Configuration**
```javascript
// config/environments.js
module.exports = {
  development: {
    database: {
      postgres: {
        host: 'localhost',
        port: 5432,
        database: 'restaurant_pos_dev',
        username: 'postgres',
        password: 'password',
        ssl: false
      },
      mongodb: {
        url: 'mongodb://admin:password@localhost:27017/restaurant_analytics_dev',
        options: { authSource: 'admin' }
      }
    },
    redis: {
      url: 'redis://localhost:6379'
    },
    logging: {
      level: 'debug',
      format: 'dev'
    }
  },
  
  staging: {
    database: {
      postgres: {
        host: process.env.STAGING_PG_HOST,
        port: process.env.STAGING_PG_PORT,
        database: process.env.STAGING_PG_DATABASE,
        username: process.env.STAGING_PG_USER,
        password: process.env.STAGING_PG_PASSWORD,
        ssl: true,
        pool: { min: 2, max: 10 }
      },
      mongodb: {
        url: process.env.STAGING_MONGO_URL,
        options: {
          maxPoolSize: 20,
          serverSelectionTimeoutMS: 5000
        }
      }
    },
    redis: {
      url: process.env.STAGING_REDIS_URL
    },
    logging: {
      level: 'info',
      format: 'json'
    }
  },
  
  production: {
    database: {
      postgres: {
        host: process.env.PROD_PG_HOST,
        port: process.env.PROD_PG_PORT,
        database: process.env.PROD_PG_DATABASE,
        username: process.env.PROD_PG_USER,
        password: process.env.PROD_PG_PASSWORD,
        ssl: true,
        pool: { min: 10, max: 50 }
      },
      mongodb: {
        url: process.env.PROD_MONGO_URL,
        options: {
          maxPoolSize: 50,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000
        }
      }
    },
    redis: {
      url: process.env.PROD_REDIS_URL,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('The Redis server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          return new Error('Retry attempts exhausted');
        }
        return Math.min(options.attempt * 100, 3000);
      }
    },
    logging: {
      level: 'warn',
      format: 'json'
    }
  }
};
```

### 10.2 Database Migration Management

**Migration Framework**
```javascript
// database/migrator.js
const fs = require('fs');
const path = require('path');
const pool = require('./postgresPool');

class DatabaseMigrator {
  constructor() {
    this.migrationsPath = path.join(__dirname, '../migrations');
    this.migrationsTable = 'schema_migrations';
  }

  async createMigrationTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pool.query(query);
  }

  async getExecutedMigrations() {
    const result = await pool.query(
      `SELECT filename FROM ${this.migrationsTable} ORDER BY executed_at`
    );
    return result.rows.map(row => row.filename);
  }

  async getPendingMigrations() {
    const executed = await this.getExecutedMigrations();
    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    return files.filter(file => !executed.includes(file));
  }

  async executeMigration(filename) {
    const filepath = path.join(this.migrationsPath, filename);
    const sql = fs.readFileSync(filepath, 'utf8');
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query(sql);
      
      await client.query(
        `INSERT INTO ${this.migrationsTable} (filename) VALUES ($1)`,
        [filename]
      );
      
      await client.query('COMMIT');
      console.log(`✓ Executed migration: ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`✗ Failed migration: ${filename}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async migrate() {
    await this.createMigrationTable();
    const pending = await this.getPendingMigrations();
    
    console.log(`Found ${pending.length} pending migrations`);
    
    for (const migration of pending) {
      await this.executeMigration(migration);
    }
    
    console.log('All migrations completed');
  }

  async rollback(migrationName) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute rollback SQL
      const rollbackFile = path.join(
        this.migrationsPath,
        `rollback_${migrationName}`
      );
      
      if (fs.existsSync(rollbackFile)) {
        const rollbackSQL = fs.readFileSync(rollbackFile, 'utf8');
        await client.query(rollbackSQL);
      }
      
      // Remove from migrations table
      await client.query(
        `DELETE FROM ${this.migrationsTable} WHERE filename = $1`,
        [migrationName]
      );
      
      await client.query('COMMIT');
      console.log(`✓ Rolled back migration: ${migrationName}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`✗ Failed rollback: ${migrationName}`, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = DatabaseMigrator;
```

### 10.3 Testing Strategy

**Database Testing Setup**
```javascript
// tests/testDatabase.js
const { Client } = require('pg');
const { MongoClient } = require('mongodb');

class TestDatabase {
  constructor() {
    this.postgresClient = null;
    this.mongodbClient = null;
    this.testDbName = `restaurant_pos_test_${Date.now()}`;
  }

  async setup() {
    // Setup PostgreSQL test database
    this.postgresClient = new Client({
      host: process.env.TEST_PG_HOST || 'localhost',
      port: process.env.TEST_PG_PORT || 5432,
      database: 'postgres',
      user: process.env.TEST_PG_USER || 'postgres',
      password: process.env.TEST_PG_PASSWORD || 'password'
    });

    await this.postgresClient.connect();
    
    // Create test database
    await this.postgresClient.query(`DROP DATABASE IF EXISTS ${this.testDbName}`);
    await this.postgresClient.query(`CREATE DATABASE ${this.testDbName}`);
    await this.postgresClient.end();

    // Connect to test database
    this.postgresClient = new Client({
      host: process.env.TEST_PG_HOST || 'localhost',
      port: process.env.TEST_PG_PORT || 5432,
      database: this.testDbName,
      user: process.env.TEST_PG_USER || 'postgres',
      password: process.env.TEST_PG_PASSWORD || 'password'
    });

    await this.postgresClient.connect();

    // Setup MongoDB test database
    const mongoUrl = process.env.TEST_MONGO_URL || 'mongodb://admin:password@localhost:27017';
    this.mongodbClient = new MongoClient(mongoUrl, {
      authSource: 'admin',
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    await this.mongodbClient.connect();
    this.testMongoDb = this.mongodbClient.db(this.testDbName);

    // Run migrations
    await this.runTestMigrations();
  }

  async runTestMigrations() {
    const migrator = new DatabaseMigrator();
    // Override the pool connection for testing
    migrator.pool = this.postgresClient;
    await migrator.migrate();
  }

  async cleanup() {
    if (this.postgresClient) {
      await this.postgresClient.end();
    }
    if (this.mongodbClient) {
      await this.mongodbClient.close();
    }
  }

  // Helper methods for tests
  async createTestTenant() {
    const result = await this.postgresClient.query(`
      INSERT INTO tenants (id, name, subdomain, database_name)
      VALUES (gen_random_uuid(), 'Test Restaurant', 'test', 'test_restaurant')
      RETURNING id
    `);
    return result.rows[0].id;
  }

  async createTestUser(tenantId, role = 'waiter') {
    const result = await this.postgresClient.query(`
      INSERT INTO users (tenant_id, username, email, password_hash, role, full_name)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      tenantId,
      `testuser_${Date.now()}`,
      `test${Date.now()}@example.com`,
      '$2b$10$rQZ8G8K8K8K8K8K8K8K8K.', // hashed 'password'
      role,
      'Test User'
    ]);
    return result.rows[0].id;
  }

  async createTestMenuItem(tenantId) {
    const result = await this.postgresClient.query(`
      INSERT INTO menu_items (tenant_id, name, price, cost, quantity, available)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id
    `, [
      tenantId,
      'Test Item',
      10.99,
      5.50,
      100
    ]);
    return result.rows[0].id;
  }
}

module.exports = TestDatabase;
```

---

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up cloud infrastructure (AWS/other provider)
- [ ] Deploy PostgreSQL and MongoDB clusters
- [ ] Implement basic tenant isolation
- [ ] Create core database schemas
- [ ] Set up connection pooling

### Phase 2: Migration (Weeks 3-4)
- [ ] Develop ETL scripts for data migration
- [ ] Migrate core entities (users, menu items, transactions)
- [ ] Implement audit logging
- [ ] Test data integrity and performance
- [ ] Create rollback procedures

### Phase 3: Real-time Features (Weeks 5-6)
- [ ] Implement change data capture
- [ ] Set up Socket.io with real-time updates
- [ ] Create event-driven architecture
- [ ] Implement Redis caching layer
- [ ] Test real-time synchronization

### Phase 4: Security & Compliance (Weeks 7-8)
- [ ] Implement row-level security
- [ ] Set up audit logging
- [ ] Configure encryption at rest and in transit
- [ ] Implement GDPR compliance features
- [ ] Security testing and penetration testing

### Phase 5: Optimization & Monitoring (Weeks 9-10)
- [ ] Implement comprehensive indexing
- [ ] Set up monitoring and alerting
- [ ] Configure backup and recovery
- [ ] Performance testing and optimization
- [ ] Load testing

### Phase 6: Deployment & Training (Weeks 11-12)
- [ ] Deploy to production environment
- [ ] Train development team on new architecture
- [ ] Create documentation and runbooks
- [ ] Monitor production performance
- [ ] Address any issues and optimizations

---

## Cost Estimation

### Monthly Infrastructure Costs (AWS)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| Aurora PostgreSQL | db.r5.large (2 vCPU, 16GB RAM) | $150-200 |
| DocumentDB | db.r5.large (2 vCPU, 16GB RAM) | $120-160 |
| ElastiCache Redis | cache.r5.large (2 vCPU, 13.07GB RAM) | $80-120 |
| ECS Fargate | 2 tasks (1 vCPU, 2GB RAM each) | $40-60 |
| Application Load Balancer | Standard ALB | $20-30 |
| S3 Storage | 100GB for backups | $3-5 |
| Data Transfer | 1TB/month | $90-100 |
| CloudWatch Monitoring | Custom metrics and logs | $30-50 |
| **Total Estimated Monthly Cost** | | **$533-725** |

### Development and Migration Costs

| Phase | Duration | Team Size | Estimated Cost |
|-------|----------|-----------|----------------|
| Phase 1: Foundation | 2 weeks | 2 developers | $20,000 |
| Phase 2: Migration | 2 weeks | 2 developers + 1 DBA | $25,000 |
| Phase 3: Real-time | 2 weeks | 2 developers | $20,000 |
| Phase 4: Security | 2 weeks | 2 developers + 1 security | $25,000 |
| Phase 5: Optimization | 2 weeks | 2 developers | $20,000 |
| Phase 6: Deployment | 2 weeks | 2 developers | $20,000 |
| **Total Estimated Development Cost** | **12 weeks** | | **$130,000** |

---

## Risk Mitigation

### Technical Risks

1. **Data Loss During Migration**
   - **Mitigation**: Multiple backup points, incremental migration, rollback procedures
   - **Impact**: Low (with proper backup strategy)

2. **Performance Degradation**
   - **Mitigation**: Load testing, performance monitoring, gradual rollout
   - **Impact**: Medium (can be optimized post-deployment)

3. **Security Vulnerabilities**
   - **Mitigation**: Security audits, penetration testing, encryption
   - **Impact**: High (requires immediate attention)

### Business Risks

1. **Extended Downtime**
   - **Mitigation**: Blue-green deployment, parallel systems during transition
   - **Impact**: High (affects restaurant operations)

2. **Integration Issues**
   - **Mitigation**: Comprehensive testing, API compatibility layer
   - **Impact**: Medium (may require development work)

3. **Cost Overruns**
   - **Mitigation**: Detailed cost monitoring, resource optimization
   - **Impact**: Medium (affects project budget)

---

## Conclusion

This comprehensive cloud database schema and infrastructure design provides a robust, scalable foundation for your restaurant POS system migration from NeDB to a modern cloud-based architecture. The hybrid PostgreSQL + MongoDB approach offers the best of both worlds: relational data integrity for financial transactions and flexible document storage for analytics and real-time features.

Key benefits of this architecture:
- **Scalability**: Multi-tenant support for multiple restaurant locations
- **Reliability**: High availability with automated failover
- **Performance**: Optimized queries and caching layers
- **Security**: Enterprise-grade security and compliance features
- **Real-time**: Live updates for kitchen orders and analytics
- **Future-proof**: AI-ready data structure and processing capabilities

The phased implementation approach ensures minimal disruption to current operations while providing a clear path to enhanced functionality and scalability. Regular monitoring and optimization will ensure the system continues to meet the evolving needs of your restaurant operations.