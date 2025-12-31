# Restaurant POS System - User Guides

Welcome to the Restaurant POS System! This comprehensive guide will help you get started with all the features and workflows for running your restaurant efficiently.

## Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [POS Workflow](#pos-workflow)
3. [Table Management](#table-management)
4. [Kitchen Display System](#kitchen-display-system)
5. [Recipe Management](#recipe-management)
6. [Combo Meal Builder](#combo-meal-builder)
7. [Analytics Dashboard](#analytics-dashboard)
8. [Menu Engineering](#menu-engineering)
9. [Staff Management](#staff-management)
10. [Settings Configuration](#settings-configuration)

---

## Quick Start Guide

### First Time Setup

1. **Install the Application**
   - Download from GitHub releases
   - Unzip to your desired location
   - Run the executable

2. **Initial Login**
   - Username: `admin`
   - Password: `admin`

3. **Basic Configuration**
   - Go to Settings → Restaurant Profile
   - Enter your restaurant name, address, and contact info
   - Configure tax rates and currency

4. **Set Up Your Menu**
   - Create food categories (Appetizers, Main Courses, Desserts, Beverages)
   - Add menu items with prices, descriptions, and categories
   - Set up barcodes for quick scanning

5. **Configure Tables**
   - Define your table layout
   - Set table numbers, capacities, and locations
   - Configure table shapes and positions

6. **Kitchen Setup**
   - Define kitchen stations (Grill, Fryer, Salad, Dessert, Beverage)
   - Assign menu items to appropriate stations
   - Set preparation times

### Daily Operations

1. **Morning Setup**
   - Check inventory levels
   - Review menu availability
   - Set up tables for service

2. **During Service**
   - Take orders at POS or assign to tables
   - Monitor kitchen orders
   - Process payments

3. **End of Day**
   - Close tables and process final payments
   - Review daily analytics
   - Perform backup

---

## POS Workflow

### Taking Orders

1. **Start Transaction**
   - Click "New Order" or select table
   - Search for menu items by name or scan barcode

2. **Add Items**
   - Select items from menu categories
   - Modify quantities and special instructions
   - Apply discounts if applicable

3. **Table Assignment** (Optional)
   - Assign order to specific table
   - Track table status automatically

4. **Payment Processing**
   - Calculate total with tax
   - Process payment (cash, card, etc.)
   - Print receipt

### Order Types

- **Dine-in**: Assign to table, track service progress
- **Takeout**: Standard order processing
- **Delivery**: Include delivery address and fees

### Special Features

- **Combo Meals**: Pre-configured bundles with discounts
- **Split Bills**: Divide payments among multiple parties
- **Customer Loyalty**: Track customer preferences and rewards

---

## Table Management

### Table Setup

1. **Create Tables**
   - Define table number and name
   - Set capacity (number of seats)
   - Choose location (Main Dining, Patio, Bar)
   - Configure shape (round, square, rectangular)

2. **Layout Designer**
   - Drag and drop tables on floor plan
   - Set positions and dimensions
   - Group tables by sections

### Table Operations

1. **Seating Customers**
   - Mark table as occupied
   - Record party size and server
   - Start service timer

2. **Order Management**
   - Link orders to specific tables
   - Track order progress through kitchen
   - Monitor table service time

3. **Table Status Tracking**
   - Available: Ready for customers
   - Occupied: Customers seated
   - Reserved: Held for reservation
   - Cleaning: Being prepared for next party

### Table Analytics

- **Utilization Rates**: Percentage of time tables are occupied
- **Turnover Time**: Average time between parties
- **Revenue per Table**: Sales performance tracking
- **Server Performance**: Individual staff metrics

---

## Kitchen Display System

### Kitchen Station Setup

1. **Define Stations**
   - Grill Station: Burgers, steaks, grilled items
   - Fryer Station: Fried foods, fries, wings
   - Salad Station: Cold items, fresh preparations
   - Dessert Station: Desserts, ice cream, pastries
   - Beverage Station: Drinks, coffee, smoothies

2. **Menu Item Assignment**
   - Link menu items to preparation stations
   - Set standard preparation times
   - Configure special handling requirements

### Order Processing

1. **Order Receipt**
   - New orders appear automatically
   - Items routed to appropriate stations
   - Priority orders highlighted

2. **Status Updates**
   - Mark items as "Preparing"
   - Update to "Ready" when complete
   - Notify when order is fully ready

3. **Time Tracking**
   - Monitor preparation times
   - Alert for overdue items
   - Track station performance

### Kitchen Features

- **Rush Orders**: Priority handling for urgent requests
- **VIP Customers**: Special attention flagging
- **Allergen Alerts**: Highlight dietary restrictions
- **Prep Time Warnings**: Notifications for slow items

---

## Recipe Management

### Creating Recipes

1. **Recipe Basics**
   - Enter recipe name and category
   - Set serving size and preparation time
   - Choose difficulty level

2. **Ingredient Management**
   - Add ingredients with quantities
   - Specify units (grams, cups, pieces, etc.)
   - Link to inventory items for cost tracking

3. **Instructions**
   - Step-by-step cooking directions
   - Preparation and cooking times
   - Special equipment needed

### Cost Analysis

1. **Cost per Serving**
   - Automatic calculation from ingredient costs
   - Real-time updates as prices change
   - Profit margin analysis

2. **Scaling**
   - Adjust recipes for different serving sizes
   - Automatic ingredient quantity scaling
   - Cost recalculation for scaled recipes

### Advanced Features

- **Nutritional Information**: Calorie and nutrient tracking
- **Allergen Management**: Dietary restriction flagging
- **Supplier Integration**: Cost tracking by supplier
- **Waste Reduction**: Portion control optimization

---

## Combo Meal Builder

### Creating Combos

1. **Combo Definition**
   - Set combo name and description
   - Choose pricing strategy (fixed, discount percentage)
   - Set availability (active/inactive, seasonal)

2. **Component Configuration**
   - Define component types (main, side, drink, dessert)
   - Add multiple choices for each component
   - Set quantity requirements

3. **Pricing Strategy**
   - Fixed Price: Set specific combo price
   - Percentage Discount: Calculate savings
   - Custom Pricing: Manual profit optimization

### POS Integration

- **Quick Selection**: Combos appear as single items
- **Component Display**: Show what's included
- **Availability Checking**: Real-time stock verification
- **Upsell Prompts**: Suggest combos to customers

### Analytics

- **Sales Tracking**: Combo performance metrics
- **Popularity Scoring**: Best-selling combo identification
- **Profit Analysis**: Margin tracking by combo
- **Customer Preferences**: Combo recommendation engine

---

## Analytics Dashboard

### Key Metrics

1. **Sales Analytics**
   - Revenue trends and forecasting
   - Average order value
   - Peak hours analysis

2. **Menu Performance**
   - Top-selling items
   - Category performance
   - Profitability analysis

3. **Operational Metrics**
   - Kitchen efficiency
   - Table utilization
   - Service times

### Advanced Analytics

1. **Menu Engineering**
   - Profitability vs popularity matrix
   - Item categorization (stars, plow horses, puzzles, dogs)
   - Optimization recommendations

2. **Customer Insights**
   - Customer segmentation
   - Lifetime value analysis
   - Ordering patterns

3. **Financial Reports**
   - Cost analysis
   - Profit margins
   - Cash flow tracking

### Export Options

- **CSV Export**: Spreadsheet-compatible data
- **JSON Export**: API-ready format
- **Scheduled Reports**: Automated report generation
- **Custom Date Ranges**: Flexible time period selection

---

## Menu Engineering

### Methodology Overview

The system uses the proven 4-quadrant matrix approach:

- **⭐ Stars**: High profit, high popularity - keep and promote
- **🐎 Plow Horses**: High profit, low popularity - promote more
- **❓ Puzzles**: Low profit, high popularity - investigate pricing
- **🐕 Dogs**: Low profit, low popularity - consider removal

### Analysis Process

1. **Data Collection**
   - Sales volume tracking
   - Cost per item analysis
   - Customer preference data

2. **Matrix Calculation**
   - Profitability = (Revenue - Cost) / Revenue × 100
   - Popularity = Total units sold
   - Automatic categorization

3. **Optimization Recommendations**
   - Pricing adjustments
   - Menu placement changes
   - Marketing focus areas
   - Item elimination candidates

### Implementation

1. **Review Matrix**: Analyze current item positions
2. **Apply Changes**: Implement recommended adjustments
3. **Monitor Results**: Track impact of changes
4. **Iterate**: Continuous menu optimization

---

## Staff Management

### User Accounts

1. **Role Configuration**
   - Admin: Full system access
   - Manager: Operational oversight
   - Server: Table and order management
   - Kitchen: Order processing only

2. **Permission Settings**
   - Module access control
   - Transaction limits
   - Reporting capabilities

### Performance Tracking

1. **Server Metrics**
   - Tables served per shift
   - Average service time
   - Customer satisfaction scores

2. **Kitchen Performance**
   - Order completion rates
   - Preparation time accuracy
   - Station efficiency

3. **Manager Dashboard**
   - Staff productivity
   - Sales performance
   - Operational metrics

---

## Settings Configuration

### Restaurant Profile

- Business information
- Tax rates and currency
- Operating hours
- Contact details

### System Configuration

- Printer settings
- Barcode configuration
- Backup schedules
- Network settings

### Module Settings

- Kitchen station configuration
- Table layout preferences
- Menu display options
- Analytics parameters

---

## Best Practices

### Operational Excellence

1. **Consistent Setup**: Follow the same procedures daily
2. **Regular Training**: Keep staff updated on system features
3. **Data Review**: Use analytics to identify improvement areas
4. **Customer Focus**: Leverage customer data for better service

### Maintenance

1. **Daily Backups**: Ensure data safety
2. **Regular Updates**: Keep software current
3. **Performance Monitoring**: Watch system metrics
4. **Issue Reporting**: Document and resolve problems promptly

### Optimization

1. **Menu Engineering**: Regularly review menu performance
2. **Staff Scheduling**: Use analytics for optimal staffing
3. **Inventory Management**: Maintain accurate stock levels
4. **Customer Retention**: Build loyalty through data-driven insights

---

For technical documentation, see [API Documentation](API_DOCUMENTATION.md) and [Technical Docs](TECHNICAL_DOCS.md).

For support, visit [GitHub Issues](https://github.com/akash/Pharmingo/issues) or check the [Troubleshooting Guide](TROUBLESHOOTING.md).