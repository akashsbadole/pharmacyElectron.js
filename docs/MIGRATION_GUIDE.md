# Restaurant POS System - Migration Guide

This guide provides comprehensive instructions for migrating from PharmaMine (pharmacy POS) to Restaurant POS, including data migration, system reconfiguration, and staff training.

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [Pre-Migration Preparation](#pre-migration-preparation)
3. [Data Backup Procedures](#data-backup-procedures)
4. [System Conversion](#system-conversion)
5. [Data Transformation](#data-transformation)
6. [Post-Migration Setup](#post-migration-setup)
7. [Testing and Validation](#testing-and-validation)
8. [Rollback Procedures](#rollback-procedures)
9. [Troubleshooting](#troubleshooting)

---

## Migration Overview

### What Changes During Migration

The migration transforms PharmaMine from a pharmaceutical POS system to a comprehensive restaurant management system, including:

- **UI Terminology**: Products → Menu Items, Categories → Food Categories
- **Database Schema**: Removal of pharmaceutical fields, addition of restaurant-specific tables
- **New Modules**: Recipes, Kitchen Display, Table Management, Combo Meals, Analytics
- **Workflow Changes**: Pharmacy dispensing → Restaurant service operations

### Migration Process Summary

1. **Phase 1**: Remove pharmaceutical features and update terminology
2. **Phase 2**: Implement restaurant-specific modules (Recipes, Kitchen, Tables, Combos)
3. **Phase 3**: Add advanced analytics and optimization tools
4. **Migration**: Transform existing data and configure new system

### Timeline and Downtime

- **Preparation**: 2-4 hours
- **Migration Execution**: 1-2 hours
- **Testing**: 4-8 hours
- **Staff Training**: 1-2 days
- **System Downtime**: Minimal (30-60 minutes during final migration)

---

## Pre-Migration Preparation

### System Requirements Check

Ensure your system meets the following requirements:

- **Node.js**: Version 14+ installed
- **Database**: NeDB (included) or compatible database
- **Storage**: 2GB free space for database and backups
- **Network**: Stable internet for real-time features
- **Hardware**: Multi-core CPU recommended for analytics

### Software Dependencies

```bash
# Required packages (already included in package.json)
npm install
```

### Data Assessment

1. **Inventory Analysis**
   - Review current product catalog
   - Identify items suitable for restaurant use
   - Plan menu item categorization

2. **Customer Data Review**
   - Assess customer database compatibility
   - Plan customer segmentation for restaurant context

3. **Transaction History**
   - Backup all transaction records
   - Plan data transformation for restaurant analytics

### Staff Preparation

1. **Training Schedule**
   - Identify key staff for migration training
   - Schedule training sessions for new workflows

2. **Access Control**
   - Review user roles and permissions
   - Plan role assignments for restaurant operations

---

## Data Backup Procedures

### Complete System Backup

```bash
# Navigate to application directory
cd /path/to/restaurant-pos

# Create timestamped backup directory
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup all databases
cp -r server/databases "$BACKUP_DIR/"

# Backup configuration files
cp package.json "$BACKUP_DIR/"
cp app.config.js "$BACKUP_DIR/"
cp server.js "$BACKUP_DIR/"

# Backup assets and customizations
cp -r assets "$BACKUP_DIR/"

# Create backup manifest
echo "Backup created on $(date)" > "$BACKUP_DIR/manifest.txt"
echo "Application version: $(node -p 'require(\"./package.json\").version')" >> "$BACKUP_DIR/manifest.txt"
```

### Selective Data Backup

#### Database-Specific Backups

```bash
# Users and permissions
cp server/databases/users.db backup_users.db

# Transaction history
cp server/databases/transactions.db backup_transactions.db

# Customer data
cp server/databases/customers.db backup_customers.db

# Inventory/Products (will be transformed)
cp server/databases/inventory.db backup_inventory.db
```

#### Configuration Backup

```bash
# Application settings
cp app.config.js backup_config.js

# Print templates
cp -r assets/templates backup_templates/

# Custom CSS/JS modifications
cp assets/css/custom.css backup_custom.css 2>/dev/null || true
```

### Backup Verification

```bash
# Verify backup integrity
ls -la backup_*/

# Check database file sizes
du -sh server/databases/*.db

# Validate backup databases
node -e "
const Datastore = require('nedb');
const db = new Datastore({ filename: 'backup_transactions.db', autoload: true });
db.find({}, (err, docs) => {
  console.log('Backup contains', docs.length, 'transaction records');
});
"
```

---

## System Conversion

### Phase 1: Feature Removal

The following pharmaceutical features are automatically removed:

#### Files Removed
- `api/prescriptions.js` - Prescription management system
- `assets/js/prescriptions.js` - Frontend prescription logic
- `assets/js/modules/prescriptions.js` - Prescription module

#### Database Fields Removed
- `requires_prescription` - Prescription requirement flag
- `generic_name` - Pharmaceutical generic names
- `drug_schedule` - Controlled substance classification
- `hsn_code` - Harmonized System codes

#### UI Elements Removed
- Prescription input forms
- Pharmaceutical validation
- Drug information displays

### Phase 2: Restaurant Features

New restaurant modules are activated:

#### Database Tables Created
- `recipes.db` - Recipe storage and management
- `kitchen_orders.db` - Kitchen order tracking
- `tables.db` - Table layout and status
- `table_orders.db` - Table service management
- `combos.db` - Combo meal definitions
- `analytics.db` - Performance metrics and reports

#### API Endpoints Added
- `/api/recipes/*` - Recipe management
- `/api/kitchen/*` - Kitchen display system
- `/api/tables/*` - Table management
- `/api/combos/*` - Combo meal system
- `/api/analytics/*` - Business intelligence

### Phase 3: Advanced Analytics

Analytics capabilities are enabled:

- Real-time dashboard metrics
- Menu engineering tools
- Customer behavior analysis
- Operational performance tracking

---

## Data Transformation

### Inventory to Menu Items Conversion

#### Automated Transformation Script

```javascript
const Datastore = require('nedb');
const inventoryDB = new Datastore({ filename: 'server/databases/inventory.db', autoload: true });
const menuDB = new Datastore({ filename: 'server/databases/menu_items.db', autoload: true });

inventoryDB.find({}, (err, products) => {
  const menuItems = products.map(product => ({
    _id: product._id,
    name: product.name,
    description: product.description || '',
    category: mapCategory(product.category),
    price: product.selling_price,
    cost: product.purchase_price,
    barcode: product.barcode,
    is_active: !product.discontinued,
    stock_quantity: product.quantity || 0,
    min_stock_level: product.min_stock || 0,
    created_date: product.created_date,
    last_modified: new Date().toISOString()
  }));

  menuDB.insert(menuItems, (err, newDocs) => {
    console.log('Transformed', newDocs.length, 'products to menu items');
  });
});

function mapCategory(oldCategory) {
  const categoryMap = {
    'Medicines': 'Main Course',
    'Supplements': 'Beverages',
    'Medical Supplies': 'Sides'
  };
  return categoryMap[oldCategory] || 'General';
}
```

#### Manual Data Mapping

1. **Category Mapping**
   - Review existing product categories
   - Map to restaurant categories:
     - Medicines → Main Courses
     - Supplements → Beverages
     - Medical Supplies → Sides/Appetizers

2. **Price Adjustments**
   - Review pricing structure
   - Adjust prices for restaurant markup
   - Consider portion sizes

3. **Barcode Compatibility**
   - Existing barcodes remain functional
   - Add new barcodes for restaurant items

### Customer Data Migration

Customer data requires minimal transformation:

```javascript
const customerDB = new Datastore({ filename: 'server/databases/customers.db', autoload: true });

customerDB.find({}, (err, customers) => {
  const updatedCustomers = customers.map(customer => ({
    ...customer,
    customer_type: 'regular', // Default customer type
    dietary_restrictions: [], // New field for restaurant
    favorite_items: [], // New field for preferences
    last_visit: customer.last_modified
  }));

  customerDB.update({}, { $set: updatedCustomers }, { multi: true });
});
```

### Transaction History Preservation

Transaction data is preserved with enhanced fields:

```javascript
const transactionDB = new Datastore({ filename: 'server/databases/transactions.db', autoload: true });

transactionDB.find({}, (err, transactions) => {
  const updatedTransactions = transactions.map(transaction => ({
    ...transaction,
    transaction_type: 'sale', // Default type
    payment_method: transaction.payment_method || 'cash',
    table_number: null, // New field for table service
    server_id: null, // New field for staff tracking
    order_type: 'takeout' // dine-in, takeout, delivery
  }));

  transactionDB.update({}, { $set: updatedTransactions }, { multi: true });
});
```

---

## Post-Migration Setup

### Restaurant Configuration

1. **Basic Settings**
   ```
   Settings → Restaurant Profile
   - Restaurant Name
   - Address and Contact Info
   - Tax Rates (GST/VAT)
   - Currency Settings
   ```

2. **Operating Hours**
   ```
   Settings → Business Hours
   - Opening/Closing Times
   - Peak Hours Configuration
   - Holiday Schedules
   ```

3. **Printer Configuration**
   ```
   Settings → Printers
   - Receipt Printer Setup
   - Kitchen Printer Assignment
   - Label Printer (for inventory)
   ```

### Menu Setup

1. **Category Creation**
   ```
   Menu Management → Categories
   - Appetizers
   - Main Courses
   - Sides
   - Desserts
   - Beverages
   ```

2. **Menu Item Entry**
   ```
   Menu Management → Items
   - Import from transformed inventory
   - Add new restaurant-specific items
   - Configure pricing and descriptions
   ```

3. **Recipe Creation**
   ```
   Recipes → Recipe Builder
   - Create recipes for menu items
   - Add ingredients and instructions
   - Calculate cost per serving
   ```

### Table Configuration

1. **Floor Plan Setup**
   ```
   Tables → Layout Designer
   - Create table layout
   - Set table capacities and locations
   - Configure table shapes and positions
   ```

2. **Kitchen Stations**
   ```
   Kitchen → Stations
   - Define cooking stations
   - Assign menu items to stations
   - Set preparation time estimates
   ```

### User Role Configuration

1. **Staff Roles**
   ```
   Users → Roles
   - Administrator: Full access
   - Manager: Operational oversight
   - Server: Table service and orders
   - Kitchen Staff: Order processing
   - Cashier: POS operations only
   ```

2. **Permission Assignment**
   - Assign appropriate permissions per role
   - Configure module access
   - Set transaction limits

---

## Testing and Validation

### Functional Testing

#### POS Operations
- [ ] Create new order
- [ ] Add menu items
- [ ] Process payment
- [ ] Print receipt

#### Table Service
- [ ] Assign order to table
- [ ] Update table status
- [ ] Track service time
- [ ] Process bill payment

#### Kitchen Operations
- [ ] Receive orders in kitchen display
- [ ] Update item status
- [ ] Mark orders complete
- [ ] Handle priority orders

#### Recipe Management
- [ ] Create new recipe
- [ ] Calculate costs
- [ ] Scale recipes
- [ ] Export recipe data

### Data Integrity Testing

#### Database Validation
```bash
# Check record counts
node -e "
const Datastore = require('nedb');
const db = new Datastore({ filename: 'server/databases/menu_items.db', autoload: true });
db.find({}, (err, docs) => {
  console.log('Menu items:', docs.length);
});
"

# Verify data transformation
node -e "
const db = new Datastore({ filename: 'server/databases/menu_items.db', autoload: true });
db.findOne({}, (err, item) => {
  console.log('Sample item:', JSON.stringify(item, null, 2));
});
"
```

#### Integration Testing
- [ ] POS ↔ Kitchen communication
- [ ] Inventory ↔ Recipe integration
- [ ] Table ↔ Order synchronization
- [ ] Analytics data collection

### Performance Testing

#### Load Testing
- Simulate peak hour operations
- Test concurrent user access
- Monitor response times

#### Real-time Features
- WebSocket connections
- Live updates across modules
- Notification delivery

---

## Rollback Procedures

### Emergency Rollback

If critical issues occur during migration:

```bash
# Stop the application
pkill -f "restaurant-pos"

# Restore backup databases
cp -r backup_20251231_143000/databases/* server/databases/

# Restore configuration files
cp backup_20251231_143000/app.config.js .
cp backup_20251231_143000/server.js .

# Restart application
npm start
```

### Partial Rollback

For feature-specific issues:

1. **Disable Problematic Module**
   ```javascript
   // In app.config.js
   module.exports = {
     features: {
       analytics: false,  // Disable if causing issues
       kitchen: true,
       tables: true
     }
   };
   ```

2. **Reverted Data Changes**
   - Restore specific database tables
   - Revert configuration changes
   - Reload application with cached data

### Data Recovery

1. **Transaction Log Recovery**
   - Restore from backup transaction logs
   - Verify data integrity
   - Reconcile with external records

2. **Configuration Recovery**
   - Restore settings from backup
   - Reconfigure network settings
   - Reset user permissions

---

## Troubleshooting

### Common Migration Issues

#### Database Connection Errors
```
Error: Cannot connect to database
Solution: Check file permissions on database directory
```

#### Data Transformation Failures
```
Error: Invalid data format
Solution: Validate backup data integrity before migration
```

#### Module Loading Errors
```
Error: Module not found
Solution: Ensure all dependencies are installed
```

#### Permission Errors
```
Error: Access denied
Solution: Check user permissions and file ownership
```

### Performance Issues

#### Slow Application Startup
- Clear node_modules and reinstall
- Check available system memory
- Optimize database indexes

#### Real-time Update Delays
- Verify WebSocket configuration
- Check network connectivity
- Monitor server resource usage

### Data Issues

#### Missing Records
- Compare record counts between backup and migrated data
- Check transformation logs for errors
- Restore from backup if necessary

#### Inconsistent Data
- Run data validation scripts
- Check foreign key relationships
- Reconcile with external sources

---

## Support and Resources

### Documentation
- [User Guides](USER_GUIDES.md) - Complete usage instructions
- [API Documentation](API_DOCUMENTATION.md) - Technical API reference
- [Technical Docs](TECHNICAL_DOCS.md) - Development and deployment

### Getting Help
- Check [GitHub Issues](https://github.com/akash/Pharmingo/issues)
- Review [Troubleshooting Guide](TROUBLESHOOTING.md)
- Contact development team

### Success Metrics
- [ ] All data successfully migrated
- [ ] System performance meets requirements
- [ ] Staff training completed
- [ ] Business operations resumed
- [ ] Analytics reporting functional

---

**Migration Complete Checklist:**
- [ ] Pre-migration backup completed
- [ ] System requirements verified
- [ ] Data transformation successful
- [ ] Restaurant configuration complete
- [ ] Staff training conducted
- [ ] Testing passed
- [ ] Rollback procedures documented
- [ ] Support resources available