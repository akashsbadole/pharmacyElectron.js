-- Restaurant POS System - PostgreSQL Database Schema
-- Migration from NeDB to Cloud Database
-- Created: 2026-01-01

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Tenants table for multi-tenant architecture
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    database_name VARCHAR(100) UNIQUE,
    status VARCHAR(50) DEFAULT 'active',
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{}'
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_created_at ON tenants(created_at);

-- Users table (enhanced with restaurant-specific fields)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'waiter',
    employee_id VARCHAR(100),
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_username_tenant ON users(username, tenant_id);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
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
CREATE INDEX idx_categories_active ON categories(is_active);

-- Menu Items table (enhanced inventory management)
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
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
CREATE INDEX idx_menu_items_sku ON menu_items(sku);
CREATE INDEX idx_menu_items_barcode ON menu_items(barcode);

-- Composite indexes for common queries
CREATE INDEX idx_menu_items_category_available ON menu_items(category_id, available);
CREATE INDEX idx_menu_items_tenant_active ON menu_items(tenant_id, available);

-- Partial indexes for better performance
CREATE INDEX idx_active_menu_items ON menu_items(id) WHERE available = true;
CREATE INDEX idx_combo_items ON menu_items(id) WHERE is_combo = true;

-- GIN indexes for JSONB columns
CREATE INDEX idx_menu_items_dietary_info ON menu_items USING GIN (dietary_info);
CREATE INDEX idx_menu_items_allergens ON menu_items USING GIN (allergens);

-- ============================================================================
-- TRANSACTION MANAGEMENT
-- ============================================================================

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
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
CREATE INDEX idx_transactions_number ON transactions(transaction_number);

-- Composite indexes for reporting queries
CREATE INDEX idx_transactions_date_status ON transactions(transaction_time, status);
CREATE INDEX idx_transactions_tenant_date ON transactions(tenant_id, transaction_time);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_time);

-- Partial indexes
CREATE INDEX idx_pending_transactions ON transactions(id) WHERE status = 'pending';
CREATE INDEX idx_completed_transactions ON transactions(id) WHERE status = 'completed';

-- Transaction Items table
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- GIN index for special instructions full-text search
CREATE INDEX idx_transaction_items_special_instructions ON transaction_items USING GIN (to_tsvector('english', special_instructions));

-- Return transactions table
CREATE TABLE transaction_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_transaction_id UUID REFERENCES transactions(id),
    return_transaction_id UUID REFERENCES transactions(id),
    return_reason TEXT,
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_method VARCHAR(100),
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX idx_transaction_returns_original ON transaction_returns(original_transaction_id);
CREATE INDEX idx_transaction_returns_return ON transaction_returns(return_transaction_id);

-- ============================================================================
-- CUSTOMER MANAGEMENT
-- ============================================================================

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_code VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    date_of_birth DATE,
    loyalty_points INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    last_visit TIMESTAMP,
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_code ON customers(customer_code);
CREATE INDEX idx_customers_loyalty ON customers(loyalty_points);

-- ============================================================================
-- TABLE MANAGEMENT
-- ============================================================================

-- Tables table
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
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
CREATE INDEX idx_tables_location ON tables(location);

-- Table Orders table
CREATE TABLE table_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
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
CREATE INDEX idx_table_orders_time ON table_orders(order_time);

-- Composite indexes
CREATE INDEX idx_table_orders_status_time ON table_orders(status, order_time);
CREATE INDEX idx_table_orders_tenant_status ON table_orders(tenant_id, status);

-- ============================================================================
-- RECIPE MANAGEMENT
-- ============================================================================

-- Recipes table
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
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
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty_level);

-- Recipe Ingredients table
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    cost_per_unit DECIMAL(10,2) DEFAULT 0,
    supplier_id UUID REFERENCES suppliers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_name ON recipe_ingredients(ingredient_name);

-- ============================================================================
-- STAFF AND OPERATIONS
-- ============================================================================

-- Shifts table
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
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
CREATE INDEX idx_shifts_time ON shifts(start_time);

-- Suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    payment_terms VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suppliers_tenant_id ON suppliers(tenant_id);
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);

-- ============================================================================
-- COMBO MEALS
-- ============================================================================

-- Combo meals table
CREATE TABLE combo_meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    base_price DECIMAL(10,2) NOT NULL,
    combo_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    components JSONB NOT NULL, -- Array of menu item IDs and quantities
    total_sold INTEGER DEFAULT 0,
    revenue_generated DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_combo_meals_tenant_id ON combo_meals(tenant_id);
CREATE INDEX idx_combo_meals_category ON combo_meals(category);
CREATE INDEX idx_combo_meals_active ON combo_meals(is_active);

-- ============================================================================
-- AUDIT AND SECURITY
-- ============================================================================

-- Audit Logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
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

-- Session Logs table
CREATE TABLE session_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    session_data JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_session_logs_tenant_id ON session_logs(tenant_id);
CREATE INDEX idx_session_logs_user ON session_logs(user_id);
CREATE INDEX idx_session_logs_action ON session_logs(action);
CREATE INDEX idx_session_logs_timestamp ON session_logs(timestamp);

-- ============================================================================
-- INVENTORY MANAGEMENT
-- ============================================================================

-- Purchase Orders table
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    po_number VARCHAR(100) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    status VARCHAR(50) DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_delivery DATE,
    actual_delivery TIMESTAMP,
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_orders_tenant_id ON purchase_orders(tenant_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_number ON purchase_orders(po_number);

-- Purchase Order Items table
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    received_quantity INTEGER DEFAULT 0
);

CREATE INDEX idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_purchase_order_items_item ON purchase_order_items(menu_item_id);

-- Waste tracking table
CREATE TABLE inventory_waste (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    waste_reason VARCHAR(100),
    cost_value DECIMAL(10,2) NOT NULL,
    reported_by UUID REFERENCES users(id),
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX idx_inventory_waste_tenant_id ON inventory_waste(tenant_id);
CREATE INDEX idx_inventory_waste_item ON inventory_waste(menu_item_id);
CREATE INDEX idx_inventory_waste_date ON inventory_waste(reported_at);

-- ============================================================================
-- TIME-BASED PRICING
-- ============================================================================

-- Time Pricing Rules table
CREATE TABLE time_pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id),
    name VARCHAR(255) NOT NULL,
    discount_type VARCHAR(20) NOT NULL, -- 'percentage' or 'fixed'
IMAL(10,    discount_value DECIMAL(10,2) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    days_of_week INTEGER[] NOT NULL, -- 0-6, Sunday = 0
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_time_pricing_rules_tenant_item ON time_pricing_rules(tenant_id, menu_item_id, active);
CREATE INDEX idx_time_pricing_rules_active ON time_pricing_rules(active);

-- ============================================================================
-- SETTINGS AND CONFIGURATION
-- ============================================================================

-- System Settings table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, category, key)
);

CREATE INDEX idx_system_settings_tenant_category ON system_settings(tenant_id, category);
CREATE INDEX idx_system_settings_key ON system_settings(key);

-- ============================================================================
-- ANALYTICS AND REPORTING
-- ============================================================================

-- Daily Sales Summary materialized view
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT 
    tenant_id,
    DATE(transaction_time) as sale_date,
    COUNT(*) as transaction_count,
    SUM(total_amount) as total_revenue,
    SUM(tax_amount) as total_tax,
    AVG(total_amount) as avg_order_value,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(DISTINCT table_number) as tables_served
FROM transactions 
WHERE status = 'completed'
GROUP BY tenant_id, DATE(transaction_time);

-- Index for materialized view
CREATE INDEX idx_daily_sales_tenant_date ON daily_sales_summary(tenant_id, sale_date);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_daily_sales_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
END;
$$ LANGUAGE plpgsql;

-- Schedule automatic refresh (if pg_cron extension is available)
-- SELECT cron.schedule('refresh-daily-sales', '0 2 * * *', 'SELECT refresh_daily_sales_summary();');

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_menu_items ON menu_items
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_transactions ON transactions
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_customers ON customers
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_tables ON tables
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_table_orders ON table_orders
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_recipes ON recipes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_shifts ON shifts
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_table_orders_updated_at BEFORE UPDATE ON table_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_combo_meals_updated_at BEFORE UPDATE ON combo_meals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_pricing_rules_updated_at BEFORE UPDATE ON time_pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate transaction numbers
CREATE OR REPLACE FUNCTION generate_transaction_number(tenant_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    date_part TEXT;
    sequence_part TEXT;
    transaction_number TEXT;
BEGIN
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_part
    FROM transactions
    WHERE tenant_id = tenant_uuid
    AND transaction_number LIKE date_part || '%';
    
    transaction_number := date_part || LPAD(sequence_part::TEXT, 4, '0');
    
    RETURN transaction_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default tenant
INSERT INTO tenants (id, name, subdomain, database_name, subscription_plan) 
VALUES (
    uuid_generate_v4(),
    'Default Restaurant',
    'default',
    'restaurant_pos_default',
    'basic'
);

-- Insert admin user for default tenant (password: admin123)
-- Note: In production, use proper password hashing
INSERT INTO users (
    id, tenant_id, username, email, password_hash, full_name, role
) 
SELECT 
    uuid_generate_v4(),
    t.id,
    'admin',
    'admin@restaurant.com',
    '$2b$10$rQZ8G8K8K8K8K8K8K8K8K', -- hashed 'admin123'
    'Administrator',
    'admin'
FROM tenants t WHERE t.subdomain = 'default';

-- Insert default categories
INSERT INTO categories (tenant_id, name, description, sort_order) 
SELECT 
    t.id,
    category.name,
    category.description,
    category.sort_order
FROM tenants t
CROSS JOIN (
    VALUES 
        ('Beverages', 'Drinks and refreshments', 1),
        ('Appetizers', 'Starters and small plates', 2),
        ('Main Courses', 'Primary dishes', 3),
        ('Desserts', 'Sweet endings', 4),
        ('Specials', 'Chef specials', 5)
) AS category(name, description, sort_order)
WHERE t.subdomain = 'default';

-- Create default system settings
INSERT INTO system_settings (tenant_id, category, key, value, description)
SELECT 
    t.id,
    setting.category,
    setting.key,
    setting.value::JSONB,
    setting.description
FROM tenants t
CROSS JOIN (
    VALUES 
        ('general', 'currency', '"USD"', 'Default currency'),
        ('general', 'tax_rate', '0.0875', 'Default tax rate (8.75%)'),
        ('pos', 'receipt_footer', '"Thank you for dining with us!"', 'Footer message for receipts'),
        ('pos', 'auto_logout_minutes', '30', 'Auto logout after minutes of inactivity'),
        ('kitchen', 'default_prep_time', '15', 'Default preparation time in minutes'),
        ('notifications', 'low_stock_threshold', '10', 'Low stock alert threshold')
) AS setting(category, key, value, description)
WHERE t.subdomain = 'default';

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE tenants IS 'Multi-tenant restaurant management';
COMMENT ON TABLE users IS 'User accounts with role-based permissions';
COMMENT ON TABLE menu_items IS 'Restaurant menu items with inventory tracking';
COMMENT ON TABLE transactions IS 'Sales transactions with tax and payment details';
COMMENT ON TABLE customers IS 'Customer management with loyalty tracking';
COMMENT ON TABLE tables IS 'Restaurant table layout and status management';
COMMENT ON TABLE recipes IS 'Recipe management with costing information';
COMMENT ON TABLE audit_logs IS 'System audit trail for compliance';

-- Add comments to key columns
COMMENT ON COLUMN menu_items.preparation_time IS 'Preparation time in minutes for kitchen planning';
COMMENT ON COLUMN menu_items.kitchen_station IS 'Kitchen station assignment (grill, fryer, salad, etc.)';
COMMENT ON COLUMN transactions.transaction_type IS 'Type: sale, return, refund, void';
COMMENT ON COLUMN transactions.order_type IS 'dine-in, takeaway, delivery, online';
COMMENT ON COLUMN table_orders.bill_split_info IS 'JSON array of bill split details';
COMMENT ON COLUMN time_pricing_rules.days_of_week IS 'Array of days 0-6 (Sunday=0) when rule applies';