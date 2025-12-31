# Restaurant POS System - Technical Documentation

This document provides technical details for developers working with the Restaurant POS System, including architecture, database schema, development setup, and deployment procedures.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [API Architecture](#api-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Development Setup](#development-setup)
6. [Testing Procedures](#testing-procedures)
7. [Deployment Guide](#deployment-guide)
8. [Performance Optimization](#performance-optimization)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   Electron App  │    │   Server/API    │
│                 │    │                 │    │                 │
│ - POS Interface │◄──►│ - Main Process  │◄──►│ - Express.js    │
│ - Kitchen Display│    │ - Window Mgmt  │    │ - REST APIs     │
│ - Table Mgmt    │    │ - IPC Comm      │    │ - WebSocket     │
│ - Analytics     │    │                 │    │ - File System   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                            │
┌─────────────────┐    ┌─────────────────┐             ┌─────────────────┐
│   NeDB Database │    │   File System   │             │   Client Apps   │
│                 │    │                 │             │                 │
│ - NoSQL Storage │    │ - Logs          │             │ - Mobile Apps   │
│ - JSON Documents│    │ - Backups       │             │ - Kitchen Disp  │
│ - Auto Indexing │    │ - Config        │             │ - Analytics     │
└─────────────────┘    └─────────────────┘             └─────────────────┘
```

### Technology Stack

#### Backend
- **Runtime**: Node.js 14+
- **Framework**: Express.js
- **Database**: NeDB (Embedded NoSQL)
- **Real-time**: Socket.IO
- **File Processing**: Node.js fs module
- **Authentication**: Session-based
- **Validation**: Custom validation middleware

#### Frontend
- **Framework**: Vanilla JavaScript + jQuery
- **UI Library**: Bootstrap 4.6
- **Charts**: Chart.js 3.x
- **Icons**: Font Awesome 5
- **Styling**: Custom CSS + Bootstrap themes
- **Real-time**: Socket.IO client

#### Desktop Application
- **Framework**: Electron 13+
- **Build Tool**: Electron Forge
- **Packaging**: Electron Builder
- **Auto Updates**: Electron Updater

### Directory Structure

```
restaurant-pos/
├── api/                    # Backend API modules
│   ├── analytics.js       # Analytics API
│   ├── combos.js          # Combo meals API
│   ├── kitchen.js         # Kitchen display API
│   ├── recipes.js         # Recipe management API
│   ├── tables.js          # Table management API
│   └── transactions.js    # Transaction processing API
├── assets/                # Frontend assets
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript modules
│   │   ├── modules/      # Feature modules
│   │   └── app.js        # Main application logic
│   ├── fonts/            # Font files
│   └── images/           # Static images
├── docs/                 # Documentation
├── migration_scripts/    # Data migration utilities
├── public/               # Static web assets
├── screenshots/          # Application screenshots
├── tests/                # Test suites
├── server.js             # Main server file
├── app.js               # Electron main process
├── package.json          # Dependencies and scripts
└── gulpfile.js           # Build automation
```

---

## Database Schema

### Core Database Tables

#### 1. Menu Items (inventory.db)
```javascript
{
  _id: String,                    // Unique item ID
  name: String,                   // Item name
  description: String,            // Item description
  category: String,               // Food category
  price: Number,                  // Selling price
  cost: Number,                   // Purchase cost
  barcode: String,                // Barcode/SKU
  stock_quantity: Number,         // Current stock
  min_stock_level: Number,        // Reorder point
  is_active: Boolean,             // Available for sale
  created_date: Date,
  last_modified: Date,
  kitchen_station: String,        // Assigned cooking station
  allergens: Array,               // Allergen information
  dietary_info: Array             // Dietary restrictions
}
```

#### 2. Recipes (recipes.db)
```javascript
{
  _id: String,                    // Unique recipe ID
  name: String,                   // Recipe name
  menu_item_id: String,           // Linked menu item
  category: String,               // Recipe category
  ingredients: [{
    ingredient_name: String,
    quantity: Number,
    unit: String,
    cost_per_unit: Number,
    supplier_id: String
  }],
  instructions: Array,            // Cooking instructions
  prep_time: Number,              // Preparation time (minutes)
  cook_time: Number,              // Cooking time (minutes)
  serving_size: Number,
  cost_per_serving: Number,       // Calculated cost
  difficulty_level: String,       // Easy, Medium, Hard
  allergens: Array,
  dietary_info: Array,
  nutritional_info: Object,
  created_date: Date,
  last_modified: Date
}
```

#### 3. Tables (tables.db)
```javascript
{
  _id: String,                    // Unique table ID
  table_number: String,           // Table identifier
  table_name: String,             // Display name
  capacity: Number,               // Number of seats
  location: String,               // Dining area
  status: String,                 // available, occupied, reserved, cleaning
  position_x: Number,             // Floor plan X coordinate
  position_y: Number,             // Floor plan Y coordinate
  width: Number,                  // Table width (px)
  height: Number,                 // Table height (px)
  shape: String,                  // square, round, rectangular
  is_active: Boolean,
  created_date: Date,
  last_modified: Date
}
```

#### 4. Table Orders (table_orders.db)
```javascript
{
  _id: String,                    // Unique order ID
  table_id: String,               // Associated table
  order_number: String,           // POS order reference
  customer_count: Number,         // Number of customers
  order_status: String,           // seated, ordering, eating, ready_to_leave, closed
  server_id: String,              // Assigned server
  order_time: Date,
  estimated_service_time: Date,
  actual_service_time: Date,
  bill_total: Number,
  bill_status: String,            // open, partial_payment, paid
  bill_split_info: Array,         // Bill splitting details
  special_requests: String,
  feedback_rating: Number,
  notes: String,
  created_date: Date,
  last_modified: Date
}
```

#### 5. Kitchen Orders (kitchen_orders.db)
```javascript
{
  _id: String,                    // Unique order ID
  order_number: String,           // POS reference
  table_number: String,           // Table identifier
  customer_name: String,
  items: [{
    menu_item_id: String,
    name: String,
    quantity: Number,
    special_instructions: String,
    kitchen_station: String,
    prep_time: Number,
    status: String,               // pending, preparing, ready, served
    started_at: Date,
    completed_at: Date
  }],
  order_status: String,
  total_prep_time: Number,
  priority: String,               // normal, rush, VIP
  order_time: Date,
  estimated_completion: Date,
  actual_completion: Date,
  server_notes: String
}
```

#### 6. Combo Meals (combos.db)
```javascript
{
  _id: String,                    // Unique combo ID
  combo_name: String,             // Combo name
  combo_code: String,             // Short code
  description: String,
  category: String,               // Lunch, Dinner, Family
  pricing_type: String,           // fixed, discount_percentage, custom
  base_price: Number,             // Original price
  combo_price: Number,            // Discounted price
  discount_amount: Number,
  discount_percentage: Number,
  components: [{
    component_type: String,       // main, side, drink, dessert
    component_name: String,
    menu_item_ids: Array,         // Available choices
    quantity: Number,
    is_required: Boolean,
    max_selections: Number,
    default_selection: String
  }],
  popularity_score: Number,
  total_sold: Number,
  revenue_generated: Number,
  is_active: Boolean,
  is_seasonal: Boolean,
  created_date: Date,
  last_modified: Date
}
```

#### 7. Analytics (analytics.db)
```javascript
{
  _id: String,                    // Unique analytics record ID
  date: Date,                     // Analytics date
  report_type: String,            // daily, weekly, monthly
  total_revenue: Number,
  total_orders: Number,
  average_order_value: Number,
  total_customers: Number,
  top_selling_items: Array,
  menu_categories_performance: Array,
  low_performing_items: Array,
  food_cost_percentage: Number,
  labor_cost_percentage: Number,
  profit_margin: Number,
  cost_of_goods_sold: Number,
  average_prep_time: Number,
  kitchen_efficiency: Number,
  table_turnover_rate: Number,
  customer_satisfaction_score: Number,
  combo_sales_percentage: Number,
  top_combo_meals: Array,
  repeat_customer_rate: Number,
  new_customer_acquisition: Number,
  server_performance: Array,
  trend_analysis: String,
  recommendations: Array
}
```

### Database Relationships

```
Menu Items ────┬─── Recipes (1:many)
               │
               ├── Kitchen Orders (many:many via items)
               │
               ├── Transactions (many:many via items)
               │
               └── Combo Components (many:many)

Tables ─────── Table Orders (1:many)

Combo Meals ── Combo Sales (1:many via transactions)

Users ──────── Permissions (1:many)
```

---

## API Architecture

### RESTful API Design

All APIs follow REST principles:

- **Resource-based URLs**: `/api/resource` or `/api/resource/:id`
- **HTTP Methods**: GET, POST, PUT, DELETE
- **JSON responses**: Consistent data format
- **Status codes**: Standard HTTP status codes
- **Error handling**: Structured error responses

### Common API Patterns

#### List Resources
```javascript
app.get('/api/resource', (req, res) => {
  // Query parameters: limit, offset, search, filters
  const query = buildQuery(req.query);
  const options = {
    limit: parseInt(req.query.limit) || 50,
    skip: parseInt(req.query.offset) || 0
  };

  db.find(query).sort({ created_date: -1 }).skip(options.skip).limit(options.limit).exec((err, docs) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ data: docs });
  });
});
```

#### CRUD Operations
```javascript
// Create
app.post('/api/resource', validateInput, (req, res) => {
  const newResource = { ...req.body, _id: generateId() };
  db.insert(newResource, (err, doc) => {
    if (err) return res.status(500).json({ error: 'Insert failed' });
    emitRealTimeUpdate('resource-created', doc);
    res.status(201).json(doc);
  });
});

// Read
app.get('/api/resource/:id', (req, res) => {
  db.findOne({ _id: req.params.id }, (err, doc) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  });
});

// Update
app.put('/api/resource/:id', validateInput, (req, res) => {
  db.update({ _id: req.params.id }, { $set: req.body }, {}, (err, numReplaced) => {
    if (err) return res.status(500).json({ error: 'Update failed' });
    db.findOne({ _id: req.params.id }, (err, updatedDoc) => {
      emitRealTimeUpdate('resource-updated', updatedDoc);
      res.json(updatedDoc);
    });
  });
});

// Delete
app.delete('/api/resource/:id', (req, res) => {
  db.remove({ _id: req.params.id }, {}, (err, numRemoved) => {
    if (err) return res.status(500).json({ error: 'Delete failed' });
    emitRealTimeUpdate('resource-deleted', { id: req.params.id });
    res.sendStatus(204);
  });
});
```

### WebSocket Integration

Real-time features use Socket.IO:

```javascript
const io = require('socket.io')(server);

// Server-side
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('join-room', (room) => {
    socket.join(room);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Emit updates
function emitRealTimeUpdate(event, data) {
  io.emit(event, data);
}
```

### Authentication Middleware

```javascript
function requireAuth(req, res, next) {
  const sessionId = req.cookies.sessionId;
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  validateSession(sessionId, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid session' });
    req.user = user;
    next();
  });
}

// Usage
app.get('/api/protected', requireAuth, (req, res) => {
  // Protected route logic
});
```

---

## Frontend Architecture

### Modular JavaScript Architecture

```javascript
// Main application structure
const App = {
  modules: {},

  init() {
    this.loadModules();
    this.bindEvents();
    this.initRouter();
  },

  loadModules() {
    // Dynamically load feature modules
    this.modules.pos = new POSModule();
    this.modules.kitchen = new KitchenModule();
    this.modules.analytics = new AnalyticsModule();
  },

  bindEvents() {
    // Global event handlers
    $(document).on('click', '[data-action]', this.handleAction.bind(this));
  }
};
```

### Module Pattern

Each feature is encapsulated in a module:

```javascript
class POSModule {
  constructor() {
    this.cart = [];
    this.currentOrder = null;
  }

  init() {
    this.bindEvents();
    this.loadMenuItems();
  }

  bindEvents() {
    $('#add-to-cart').on('click', this.addToCart.bind(this));
    $('#checkout').on('click', this.processCheckout.bind(this));
  }

  addToCart(event) {
    const itemId = $(event.target).data('item-id');
    // Add item logic
  }

  processCheckout() {
    // Checkout logic
  }
}
```

### State Management

Simple state management using events:

```javascript
class StateManager {
  constructor() {
    this.state = {};
    this.listeners = {};
  }

  setState(key, value) {
    this.state[key] = value;
    this.notifyListeners(key, value);
  }

  subscribe(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
  }

  notifyListeners(key, value) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(callback => callback(value));
    }
  }
}
```

### Real-time Updates

WebSocket client integration:

```javascript
class RealTimeManager {
  constructor() {
    this.socket = io();
    this.bindEvents();
  }

  bindEvents() {
    this.socket.on('order-updated', this.handleOrderUpdate.bind(this));
    this.socket.on('table-status-changed', this.handleTableUpdate.bind(this));
  }

  handleOrderUpdate(data) {
    // Update UI with new order data
    App.modules.pos.updateOrder(data);
  }

  handleTableUpdate(data) {
    // Update table status
    App.modules.tables.updateTable(data);
  }
}
```

---

## Development Setup

### Prerequisites

- Node.js 14 or higher
- npm or yarn
- Git
- Modern web browser

### Installation

```bash
# Clone repository
git clone https://github.com/akash/Pharmingo.git restaurant-pos
cd restaurant-pos

# Install dependencies
npm install

# Install development dependencies
npm install -g gulp-cli
```

### Development Workflow

```bash
# Start development server
npm run start

# Build assets (CSS/JS minification)
gulp

# Watch for file changes
gulp watch

# Run tests
npm test

# Lint code
npm run lint
```

### Configuration Files

#### package.json Scripts
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "build": "gulp build",
    "lint": "eslint .",
    "package": "electron-forge package",
    "make": "electron-forge make"
  }
}
```

#### Environment Configuration

Create `.env` file:

```env
NODE_ENV=development
PORT=3000
DB_PATH=./server/databases
SESSION_SECRET=your-secret-key
LOG_LEVEL=debug
```

### Code Style Guidelines

- **JavaScript**: ES6+ features, async/await preferred
- **CSS**: BEM methodology, CSS custom properties
- **HTML**: Semantic markup, accessibility compliant
- **Naming**: camelCase for JS, kebab-case for CSS/HTML

---

## Testing Procedures

### Test Structure

```
tests/
├── unit/                 # Unit tests
│   ├── api/             # API endpoint tests
│   ├── modules/         # Frontend module tests
│   └── utils/           # Utility function tests
├── integration/         # Integration tests
│   ├── workflows/       # End-to-end workflows
│   └── api/             # API integration tests
├── e2e/                 # End-to-end tests
│   ├── pos-workflow.test.js
│   └── kitchen-workflow.test.js
└── fixtures/            # Test data
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/unit/api/recipes.test.js

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Examples

#### API Unit Test
```javascript
const request = require('supertest');
const app = require('../server');

describe('Recipes API', () => {
  test('GET /api/recipes returns recipe list', async () => {
    const response = await request(app)
      .get('/api/recipes/recipes')
      .expect(200);

    expect(Array.isArray(response.body.recipes)).toBe(true);
  });

  test('POST /api/recipes creates new recipe', async () => {
    const newRecipe = {
      name: 'Test Recipe',
      category: 'Main',
      ingredients: []
    };

    const response = await request(app)
      .post('/api/recipes/recipes')
      .send(newRecipe)
      .expect(201);

    expect(response.body.name).toBe('Test Recipe');
  });
});
```

#### Frontend Test
```javascript
import { POSModule } from '../assets/js/modules/pos.js';

describe('POS Module', () => {
  let posModule;

  beforeEach(() => {
    posModule = new POSModule();
    // Set up DOM fixtures
    document.body.innerHTML = `
      <div id="cart"></div>
      <button id="add-item" data-item-id="1"></button>
    `;
  });

  test('adds item to cart', () => {
    posModule.addToCart({ target: document.getElementById('add-item') });
    expect(posModule.cart.length).toBe(1);
  });
});
```

---

## Deployment Guide

### Production Build

```bash
# Build optimized assets
gulp build

# Package Electron app
npm run package

# Create distributables
npm run make
```

### Server Deployment

#### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name "restaurant-pos"

# Save PM2 configuration
pm2 save

# Set up startup script
pm2 startup
```

#### Using Docker

```dockerfile
FROM node:14-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build Docker image
docker build -t restaurant-pos .

# Run container
docker run -p 3000:3000 -v /data:/app/server/databases restaurant-pos
```

### Environment Setup

#### Production Configuration

```javascript
// config/production.js
module.exports = {
  port: process.env.PORT || 80,
  database: {
    path: process.env.DB_PATH || '/var/lib/restaurant-pos/databases'
  },
  logging: {
    level: 'info',
    file: '/var/log/restaurant-pos/app.log'
  },
  security: {
    sessionSecret: process.env.SESSION_SECRET,
    corsOrigins: ['https://yourdomain.com']
  }
};
```

#### Database Backup Script

```bash
#!/bin/bash
# Daily backup script

BACKUP_DIR="/backups/restaurant-pos"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup databases
tar -czf "$BACKUP_DIR/databases_$DATE.tar.gz" server/databases/

# Backup configuration
cp app.config.js "$BACKUP_DIR/config_$DATE.js"

# Clean old backups (keep last 30 days)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.js" -mtime +30 -delete
```

### SSL Configuration

```javascript
// server.js
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(443);
```

---

## Performance Optimization

### Database Optimization

#### Indexing Strategy

```javascript
// Ensure indexes for frequently queried fields
db.ensureIndex({ fieldName: 'category' });
db.ensureIndex({ fieldName: 'status' });
db.ensureIndex({ fieldName: 'created_date' });
db.ensureIndex({ fieldName: '_id', unique: true });
```

#### Query Optimization

```javascript
// Use projections to limit returned fields
db.find({ category: 'Main' }, { name: 1, price: 1, _id: 1 })

// Use pagination for large result sets
db.find(query)
  .sort({ created_date: -1 })
  .skip(page * limit)
  .limit(limit)
```

### Frontend Optimization

#### Asset Optimization

```javascript
// gulpfile.js
const gulp = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');

gulp.task('js', () => {
  return gulp.src('assets/js/**/*.js')
    .pipe(concat('app.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist/js'));
});

gulp.task('css', () => {
  return gulp.src('assets/css/**/*.css')
    .pipe(concat('styles.min.css'))
    .pipe(cleanCSS())
    .pipe(gulp.dest('dist/css'));
});
```

#### Lazy Loading

```javascript
// Load modules on demand
async function loadModule(moduleName) {
  try {
    const module = await import(`./modules/${moduleName}.js`);
    return module.default;
  } catch (error) {
    console.error(`Failed to load module ${moduleName}:`, error);
  }
}

// Usage
const analyticsModule = await loadModule('analytics');
```

### Caching Strategy

#### API Response Caching

```javascript
const cache = new Map();

function getCachedResponse(key, ttl = 300000) { // 5 minutes
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  return null;
}

function setCachedResponse(key, data) {
  cache.set(key, {
    data: data,
    timestamp: Date.now()
  });
}
```

#### Static Asset Caching

```javascript
// Express static middleware with caching
app.use(express.static('public', {
  maxAge: '1d', // Cache for 1 day
  etag: true
}));
```

---

## Security Considerations

### Input Validation

```javascript
const validator = require('validator');

// Sanitize user input
function sanitizeInput(input) {
  return validator.escape(input);
}

// Validate data types
function validateRecipe(recipe) {
  const schema = {
    name: 'string',
    category: 'string',
    ingredients: 'array'
  };

  // Validation logic
}
```

### Authentication & Authorization

```javascript
// Role-based access control
const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SERVER: 'server',
  KITCHEN: 'kitchen'
};

function checkPermission(user, permission) {
  const rolePermissions = {
    [ROLES.ADMIN]: ['read', 'write', 'delete', 'manage_users'],
    [ROLES.MANAGER]: ['read', 'write', 'view_reports'],
    [ROLES.SERVER]: ['read', 'write'],
    [ROLES.KITCHEN]: ['read', 'update_orders']
  };

  return rolePermissions[user.role]?.includes(permission) || false;
}
```

### Data Protection

- **Encryption**: Sensitive data encrypted at rest
- **Sanitization**: All user inputs sanitized
- **Rate Limiting**: API requests limited per IP
- **Audit Logging**: All data changes logged

### Secure Coding Practices

- Use parameterized queries (NeDB handles this automatically)
- Validate file uploads
- Implement CSRF protection
- Regular security updates

---

## Troubleshooting

### Common Issues

#### Database Connection Issues
```
Error: ENOENT: no such file or directory, open 'server/databases/db.db'
Solution: Check database directory permissions and path
```

#### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
Solution: Kill process using port or change port in configuration
```

#### Module Not Found
```
Error: Cannot find module 'express'
Solution: Run npm install to install missing dependencies
```

#### Real-time Updates Not Working
```
Issue: WebSocket connections failing
Solution: Check firewall settings and Socket.IO configuration
```

### Debug Mode

Enable debug logging:

```javascript
// server.js
process.env.DEBUG = 'restaurant-pos:*';

// Or set in environment
DEBUG=restaurant-pos:* npm start
```

### Performance Monitoring

```javascript
// Basic performance monitoring
const startTime = process.hrtime.bigint();

app.use((req, res, next) => {
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds
    console.log(`${req.method} ${req.path} - ${duration}ms`);
  });
  next();
});
```

### Log Analysis

```bash
# View recent logs
tail -f logs/app.log

# Search for errors
grep "ERROR" logs/app.log

# Analyze performance
grep "duration" logs/app.log | sort -n
```

---

## Support Resources

- [GitHub Issues](https://github.com/akash/Pharmingo/issues)
- [API Documentation](API_DOCUMENTATION.md)
- [User Guides](USER_GUIDES.md)
- [Migration Guide](MIGRATION_GUIDE.md)

For additional technical support, please contact the development team or create a detailed issue report with:
- System information
- Error logs
- Steps to reproduce
- Expected vs actual behavior