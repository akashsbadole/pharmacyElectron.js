# Restaurant POS System - API Documentation

This document provides comprehensive API documentation for the Restaurant POS System, including all endpoints for restaurant-specific modules.

## Table of Contents

1. [Authentication](#authentication)
2. [Recipes API](#recipes-api)
3. [Kitchen Display API](#kitchen-display-api)
4. [Tables API](#tables-api)
5. [Combos API](#combos-api)
6. [Analytics API](#analytics-api)
7. [Common Response Formats](#common-response-formats)
8. [Error Handling](#error-handling)

---

## Authentication

The system uses session-based authentication. All API endpoints require valid session cookies.

### Login
```
POST /api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin"
}

Response:
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

---

## Recipes API

### Base URL: `/api/recipes`

### Recipe Management

#### Get All Recipes
```http
GET /api/recipes/recipes
```

**Query Parameters:**
- `category` - Filter by category (Appetizer, Main, Dessert, etc.)
- `search` - Search in recipe names
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset

**Response:**
```json
{
  "recipes": [
    {
      "_id": "1",
      "name": "Chicken Parmesan",
      "category": "Main",
      "serving_size": 4,
      "cost_per_serving": 8.50,
      "difficulty_level": "Medium",
      "prep_time": 30,
      "cook_time": 25
    }
  ],
  "total": 150
}
```

#### Get Recipe by ID
```http
GET /api/recipes/recipes/:id
```

#### Create Recipe
```http
POST /api/recipes/recipes
Content-Type: application/json

{
  "name": "Chicken Parmesan",
  "category": "Main",
  "ingredients": [
    {
      "ingredient_name": "Chicken Breast",
      "quantity": 500,
      "unit": "grams",
      "cost_per_unit": 2.50,
      "supplier_id": "sup1"
    }
  ],
  "instructions": ["Step 1...", "Step 2..."],
  "prep_time": 30,
  "cook_time": 25,
  "serving_size": 4,
  "difficulty_level": "Medium",
  "allergens": ["Dairy"],
  "dietary_info": ["High Protein"]
}
```

#### Update Recipe
```http
PUT /api/recipes/recipes/:id
```

#### Delete Recipe
```http
DELETE /api/recipes/recipes/:id
```

#### Calculate Cost
```http
POST /api/recipes/recipes/:id/calculate-cost
Content-Type: application/json

{
  "servings": 6
}
```

**Response:**
```json
{
  "total_cost": 51.00,
  "cost_per_serving": 8.50,
  "scaled_ingredients": [...]
}
```

#### Export Recipes
```http
GET /api/recipes/export/csv
```

**Query Parameters:**
- `category` - Filter by category
- `date_from` - Start date
- `date_to` - End date

### Categories and Analytics

#### Get Categories
```http
GET /api/recipes/recipes/categories
```

#### Get Ingredient Usage
```http
GET /api/recipes/recipes/ingredient-usage
```

**Query Parameters:**
- `date_from` - Start date
- `date_to` - End date

**Response:**
```json
{
  "ingredients": [
    {
      "name": "Chicken Breast",
      "total_used": 2500,
      "unit": "grams",
      "total_cost": 625.00
    }
  ]
}
```

#### Get Nutritional Info
```http
GET /api/recipes/:id/nutrition
```

---

## Kitchen Display API

### Base URL: `/api/kitchen`

### Order Management

#### Get All Orders
```http
GET /api/kitchen/orders
```

**Query Parameters:**
- `status` - Filter by status (pending, preparing, ready, served)
- `station` - Filter by kitchen station
- `overdue` - Get only overdue orders (true/false)

#### Get Order by ID
```http
GET /api/kitchen/orders/:orderId
```

#### Create Kitchen Order
```http
POST /api/kitchen/orders
Content-Type: application/json

{
  "order_number": "ORD-001",
  "table_number": "T5",
  "customer_name": "John Doe",
  "items": [
    {
      "menu_item_id": "item1",
      "name": "Chicken Parmesan",
      "quantity": 2,
      "special_instructions": "Extra cheese",
      "kitchen_station": "grill",
      "prep_time": 25,
      "status": "pending"
    }
  ],
  "order_status": "pending",
  "priority": "normal"
}
```

#### Update Order Status
```http
PUT /api/kitchen/orders/:orderId/status
Content-Type: application/json

{
  "status": "preparing"
}
```

#### Update Item Status
```http
PUT /api/kitchen/orders/:orderId/items/:itemId/status
Content-Type: application/json

{
  "status": "ready"
}
```

#### Update Priority
```http
PUT /api/kitchen/orders/:orderId/priority
Content-Type: application/json

{
  "priority": "rush"
}
```

#### Cancel Order
```http
DELETE /api/kitchen/orders/:orderId
```

### Station Management

#### Get Station Status
```http
GET /api/kitchen/stations
```

**Response:**
```json
{
  "stations": {
    "grill": {
      "name": "Grill Station",
      "active_orders": 5,
      "overdue_orders": 1,
      "avg_prep_time": 18
    }
  }
}
```

#### Get Orders by Station
```http
GET /api/kitchen/orders/station/:station
```

### Performance Metrics

#### Get Kitchen Metrics
```http
GET /api/kitchen/metrics
```

**Query Parameters:**
- `date_from` - Start date
- `date_to` - End date

**Response:**
```json
{
  "avg_prep_time": 22,
  "on_time_delivery": 85,
  "total_orders": 150,
  "rush_orders": 12,
  "station_performance": {
    "grill": { "efficiency": 90 },
    "fryer": { "efficiency": 85 }
  }
}
```

---

## Tables API

### Base URL: `/api/tables`

### Table Management

#### Get All Tables
```http
GET /api/tables
```

**Query Parameters:**
- `status` - Filter by status (available, occupied, reserved, cleaning)
- `location` - Filter by location
- `capacity` - Minimum capacity

#### Get Table by ID
```http
GET /api/tables/:tableId
```

#### Create Table
```http
POST /api/tables
Content-Type: application/json

{
  "table_number": "T1",
  "table_name": "Table 1",
  "capacity": 4,
  "location": "Main Dining",
  "position_x": 100,
  "position_y": 150,
  "shape": "square",
  "is_active": true
}
```

#### Update Table
```http
PUT /api/tables/:tableId
```

#### Delete Table
```http
DELETE /api/tables/:tableId
```

#### Update Table Status
```http
PUT /api/tables/:tableId/status
Content-Type: application/json

{
  "status": "occupied"
}
```

### Layout Management

#### Get Table Layout
```http
GET /api/tables/layout
```

#### Update Layout
```http
PUT /api/tables/layout
Content-Type: application/json

{
  "tables": [
    {
      "_id": "1",
      "position_x": 120,
      "position_y": 160
    }
  ]
}
```

### Table Orders

#### Get All Table Orders
```http
GET /api/tables/orders
```

**Query Parameters:**
- `table_id` - Filter by table
- `status` - Filter by status
- `server_id` - Filter by server

#### Create Table Order
```http
POST /api/tables/orders
Content-Type: application/json

{
  "table_id": "1",
  "order_number": "ORD-001",
  "customer_count": 4,
  "server_id": "server1",
  "special_requests": "Window seat preferred"
}
```

#### Update Order Status
```http
PUT /api/tables/orders/:orderId/status
Content-Type: application/json

{
  "status": "eating"
}
```

#### Update Bill
```http
PUT /api/tables/orders/:orderId/bill
Content-Type: application/json

{
  "bill_total": 125.50,
  "bill_status": "open"
}
```

#### Split Bill
```http
POST /api/tables/orders/:orderId/split-bill
Content-Type: application/json

{
  "split_type": "equal",
  "split_data": {
    "num_people": 4
  }
}
```

### Analytics

#### Get Table Metrics
```http
GET /api/tables/metrics
```

**Query Parameters:**
- `start_date` - Start date
- `end_date` - End date

**Response:**
```json
{
  "table_metrics": {
    "total_orders": 45,
    "avg_bill_total": 85.50,
    "avg_service_time": 65
  },
  "utilization": {
    "T1": {
      "table_number": "T1",
      "utilization_percentage": 78
    }
  }
}
```

---

## Combos API

### Base URL: `/api/combos`

### Combo Management

#### Get All Combos
```http
GET /api/combos/combos
```

**Query Parameters:**
- `category` - Filter by category
- `active` - Filter active/inactive
- `search` - Search by name

#### Get Combo by ID
```http
GET /api/combos/combos/:comboId
```

#### Create Combo
```http
POST /api/combos/combos
Content-Type: application/json

{
  "combo_name": "Family Meal Deal",
  "combo_code": "FMD",
  "description": "Perfect for families",
  "category": "Family",
  "pricing_type": "discount_percentage",
  "base_price": 50.00,
  "combo_price": 42.50,
  "discount_percentage": 15,
  "components": [
    {
      "component_type": "main",
      "component_name": "Main Course",
      "menu_item_ids": ["item1", "item2"],
      "quantity": 1,
      "is_required": true
    }
  ],
  "is_active": true
}
```

#### Update Combo
```http
PUT /api/combos/combos/:comboId
```

#### Delete Combo
```http
DELETE /api/combos/combos/:comboId
```

#### Calculate Pricing
```http
POST /api/combos/combos/:comboId/calculate-pricing
```

#### Check Availability
```http
POST /api/combos/combos/:comboId/check-availability
```

#### Get Categories
```http
GET /api/combos/combos/categories
```

#### Get Combos by Category
```http
GET /api/combos/combos/category/:category
```

### Analytics

#### Get Performance Analytics
```http
GET /api/combos/combos/analytics/performance
```

**Query Parameters:**
- `date_from` - Start date
- `date_to` - End date

#### Record Sale
```http
POST /api/combos/combos/:comboId/record-sale
Content-Type: application/json

{
  "quantity": 1,
  "revenue": 42.50
}
```

#### Export Combos
```http
GET /api/combos/export/csv
```

### Inventory Integration

#### Check Component Availability
```http
GET /api/inventory/combos/:comboId/availability
```

#### Process Combo Order
```http
POST /api/inventory/combos/:comboId/process-order
Content-Type: application/json

{
  "selected_items": {
    "main": "item1",
    "side": "item3",
    "drink": "item5"
  },
  "quantity": 2
}
```

---

## Analytics API

### Base URL: `/api/analytics`

### Dashboard Analytics

#### Get Dashboard Overview
```http
GET /api/analytics/dashboard
```

**Response:**
```json
{
  "sales": {
    "total_revenue": 15420.50,
    "total_orders": 234,
    "avg_order_value": 65.90
  },
  "menu_performance": {
    "top_items": [...],
    "categories": {...}
  },
  "operational": {
    "kitchen_efficiency": 87,
    "table_utilization": 72
  }
}
```

### Specialized Analytics

#### Sales Analytics
```http
GET /api/analytics/sales
```

**Query Parameters:**
- `date_from` - Start date
- `date_to` - End date
- `period` - daily/weekly/monthly

#### Menu Performance
```http
GET /api/analytics/menu-performance
```

#### Menu Engineering
```http
GET /api/analytics/menu-engineering
```

#### Menu Engineering Matrix
```http
GET /api/analytics/menu-engineering/matrix
```

#### Kitchen Performance
```http
GET /api/analytics/kitchen-performance
```

#### Table Analytics
```http
GET /api/analytics/table-analytics
```

#### Combo Analytics
```http
GET /api/analytics/combo-analytics
```

#### Customer Analytics
```http
GET /api/analytics/customer-analytics
```

#### Financial Analytics
```http
GET /api/analytics/financial
```

#### Operational Metrics
```http
GET /api/analytics/operational
```

### Custom Reports

#### Generate Custom Report
```http
POST /api/analytics/custom-report
Content-Type: application/json

{
  "metrics": ["revenue", "orders", "efficiency"],
  "date_from": "2025-01-01",
  "date_to": "2025-01-31",
  "group_by": "day"
}
```

### Data Export

#### Export Analytics Data
```http
GET /api/analytics/export
```

**Query Parameters:**
- `format` - csv/json
- `report_type` - sales/menu/kitchen/etc
- `date_from` - Start date
- `date_to` - End date

### Historical Data

#### Get Historical Analytics
```http
GET /api/analytics/history
```

**Query Parameters:**
- `snapshot_date` - Specific date
- `limit` - Number of records

#### Store Analytics Snapshot
```http
POST /api/analytics/snapshot
Content-Type: application/json

{
  "snapshot_date": "2025-01-31",
  "data": {...}
}
```

---

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully"
}
```

### Paginated Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250,
    "pages": 5
  }
}
```

### Error Response
```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": {...}
}
```

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `422` - Unprocessable Entity (business logic error)
- `500` - Internal Server Error

### Common Error Types

#### Validation Errors
```json
{
  "error": "Validation Error",
  "message": "Required field missing",
  "details": {
    "field": "name",
    "issue": "cannot be empty"
  }
}
```

#### Business Logic Errors
```json
{
  "error": "Business Logic Error",
  "message": "Insufficient inventory",
  "details": {
    "item_id": "item1",
    "available": 5,
    "requested": 10
  }
}
```

#### System Errors
```json
{
  "error": "System Error",
  "message": "Database connection failed",
  "details": {
    "retry_after": 30
  }
}
```

### Rate Limiting

- API requests are limited to 1000 per hour per IP
- Exceeding limits returns `429 Too Many Requests`
- Retry after the specified time period

### Authentication Errors

```json
{
  "error": "Authentication Error",
  "message": "Invalid or expired session",
  "details": {
    "login_required": true
  }
}
```

---

For user guides, see [User Guides](USER_GUIDES.md). For technical setup, see [Technical Documentation](TECHNICAL_DOCS.md).