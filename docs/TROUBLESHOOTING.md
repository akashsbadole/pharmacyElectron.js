# Restaurant POS System - Troubleshooting Guide

This guide provides solutions to common issues and problems that may occur when using the Restaurant POS System.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Startup Problems](#startup-problems)
3. [Database Issues](#database-issues)
4. [POS System Problems](#pos-system-problems)
5. [Kitchen Display Issues](#kitchen-display-issues)
6. [Table Management Problems](#table-management-problems)
7. [Recipe Management Issues](#recipe-management-issues)
8. [Analytics Problems](#analytics-problems)
9. [Performance Issues](#performance-issues)
10. [Network and Connectivity](#network-and-connectivity)
11. [Printer Issues](#printer-issues)
12. [Backup and Restore](#backup-and-restore)
13. [Error Messages](#error-messages)
14. [Getting Help](#getting-help)

---

## Installation Issues

### Application Won't Start After Installation

**Symptoms:**
- Double-clicking executable does nothing
- Error messages about missing files
- Application closes immediately

**Solutions:**

1. **Check System Requirements**
   ```bash
   # Windows
   systeminfo | findstr /C:"OS Version"

   # Check available memory
   systeminfo | findstr /C:"Total Physical Memory"
   ```

2. **Verify Installation Directory**
   - Ensure extracted to a folder with write permissions
   - Check antivirus isn't blocking the executable
   - Try running as administrator

3. **Check Dependencies**
   ```bash
   # Navigate to installation directory
   cd "C:\Program Files\Restaurant POS"

   # Check if executable exists
   dir RestaurantPOS.exe
   ```

4. **Reinstall Application**
   - Download fresh copy from releases
   - Extract to new directory
   - Run installer again

### Node.js Dependencies Missing

**Symptoms:**
- "Cannot find module" errors
- Application crashes on startup

**Solutions:**

```bash
# Reinstall dependencies
npm install

# Clear cache and reinstall
npm cache clean --force
npm install

# Check Node.js version
node --version
npm --version
```

---

## Startup Problems

### Application Hangs on Loading

**Symptoms:**
- Loading screen appears but never completes
- Progress bar stops at specific point

**Solutions:**

1. **Check Database Files**
   ```bash
   # Check if database files exist
   ls -la server/databases/*.db

   # Check file permissions
   ls -l server/databases/
   ```

2. **Clear Application Cache**
   ```javascript
   // In browser console (F12)
   localStorage.clear();
   sessionStorage.clear();
   ```

3. **Start in Safe Mode**
   ```bash
   # Windows: Hold Shift while clicking executable
   # Or run from command line
   npm start -- --safe-mode
   ```

4. **Check Log Files**
   ```bash
   # View recent logs
   tail -f logs/app.log

   # Search for errors
   grep "ERROR" logs/app.log
   ```

### Port Already in Use

**Symptoms:**
- "Port 3000 already in use" error
- Cannot start server

**Solutions:**

```bash
# Find process using port
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Change port in configuration
# Edit app.config.js
module.exports = {
  port: 3001  // Change from 3000
};
```

---

## Database Issues

### Database Corruption

**Symptoms:**
- Application crashes when accessing data
- Inconsistent data display
- "Database corruption" errors

**Solutions:**

1. **Automatic Repair**
   ```bash
   # Run database repair script
   node scripts/repair-database.js
   ```

2. **Manual Database Check**
   ```javascript
   const Datastore = require('nedb');
   const db = new Datastore({ filename: 'server/databases/inventory.db' });

   db.loadDatabase((err) => {
   if (err) {
     console.log('Database corrupted:', err);
     // Attempt repair or restore from backup
   }
   });
   ```

3. **Restore from Backup**
   ```bash
   # Restore latest backup
   cp backup/latest/inventory.db server/databases/
   ```

### Data Not Saving

**Symptoms:**
- Changes not persisted after restart
- New records disappear

**Solutions:**

1. **Check Write Permissions**
   ```bash
   # Check directory permissions
   ls -ld server/databases/

   # Fix permissions (Linux/Mac)
   chmod 755 server/databases/
   chmod 644 server/databases/*.db
   ```

2. **Disk Space Check**
   ```bash
   # Check available disk space
   df -h

   # Windows
   wmic logicaldisk get size,freespace,caption
   ```

3. **Database Path Configuration**
   ```javascript
   // Check app.config.js
   module.exports = {
     database: {
       path: './server/databases'  // Ensure correct path
     }
   };
   ```

---

## POS System Problems

### Items Not Adding to Cart

**Symptoms:**
- Clicking "Add to Cart" does nothing
- Items appear and disappear

**Solutions:**

1. **Check Item Availability**
   - Verify item is marked as active
   - Check stock levels
   - Ensure item has valid price

2. **JavaScript Console Errors**
   ```javascript
   // Open browser dev tools (F12)
   // Check for JavaScript errors
   console.log('Cart items:', cartItems);
   ```

3. **Session Issues**
   - Clear browser cache
   - Restart application
   - Check session timeout settings

### Payment Processing Fails

**Symptoms:**
- Payment methods not working
- Transaction errors

**Solutions:**

1. **Verify Payment Configuration**
   ```javascript
   // Check payment settings
   const paymentConfig = {
     cash: true,
     card: false,  // Enable if card reader available
     digital: false
   };
   ```

2. **Receipt Printer Issues**
   - Check printer connection
   - Verify printer drivers
   - Test printer with other applications

3. **Transaction Logging**
   ```bash
   # Check transaction logs
   grep "payment" logs/app.log
   ```

---

## Kitchen Display Issues

### Orders Not Appearing

**Symptoms:**
- Orders sent from POS don't show in kitchen
- Kitchen display shows blank screen

**Solutions:**

1. **Check Network Connection**
   ```bash
   # Test connectivity
   ping localhost

   # Check if server is running
   curl http://localhost:3000/api/kitchen/orders
   ```

2. **WebSocket Connection**
   ```javascript
   // In browser console
   const socket = io();
   socket.on('connect', () => console.log('Connected'));
   socket.on('connect_error', (err) => console.log('Connection error:', err));
   ```

3. **Kitchen Station Configuration**
   - Verify stations are properly configured
   - Check menu item assignments to stations
   - Ensure kitchen display is accessing correct URL

### Order Status Not Updating

**Symptoms:**
- Status changes in kitchen don't reflect in POS
- Orders stuck in "pending" status

**Solutions:**

1. **Real-time Sync Issues**
   - Check WebSocket connection stability
   - Verify event emission from kitchen updates
   - Monitor network latency

2. **Permission Issues**
   - Ensure kitchen staff have update permissions
   - Check user roles and access levels

3. **Database Sync**
   ```javascript
   // Force sync check
   db.find({ status: 'pending' }, (err, orders) => {
     console.log('Pending orders:', orders.length);
   });
   ```

### Kitchen Display Layout Problems

**Symptoms:**
- Interface not displaying correctly
- Buttons not responsive

**Solutions:**

1. **Screen Resolution**
   - Check display resolution settings
   - Adjust zoom level in browser
   - Test on different screen sizes

2. **Browser Compatibility**
   - Use supported browsers (Chrome, Firefox, Edge)
   - Disable browser extensions
   - Clear browser cache

---

## Table Management Problems

### Tables Not Loading

**Symptoms:**
- Table layout doesn't display
- Floor plan appears blank

**Solutions:**

1. **Table Data Check**
   ```javascript
   // Verify table data exists
   db.find({ is_active: true }, (err, tables) => {
     console.log('Active tables:', tables.length);
   });
   ```

2. **Layout Configuration**
   - Check table position coordinates
   - Verify layout dimensions
   - Ensure tables are within visible area

### Table Status Not Updating

**Symptoms:**
- Table status changes don't save
- Inconsistent status display

**Solutions:**

1. **Real-time Updates**
   - Check WebSocket connections
   - Verify event broadcasting
   - Monitor network issues

2. **Concurrent Access**
   - Ensure only one user updates table status at a time
   - Implement optimistic locking if needed

### Table Assignment Issues

**Symptoms:**
- Cannot assign orders to tables
- Table capacity conflicts

**Solutions:**

1. **Order-Table Linking**
   ```javascript
   // Check table availability
   const availableTables = tables.filter(t =>
     t.status === 'available' && t.capacity >= partySize
   );
   ```

2. **Capacity Validation**
   - Verify party size doesn't exceed table capacity
   - Check for table reservation conflicts

---

## Recipe Management Issues

### Recipe Cost Calculations Wrong

**Symptoms:**
- Cost per serving incorrect
- Ingredient costs not updating

**Solutions:**

1. **Ingredient Data Verification**
   ```javascript
   // Check ingredient costs
   db.find({ _id: recipe.ingredients[0].ingredient_id }, (err, ingredient) => {
     console.log('Ingredient cost:', ingredient.cost_per_unit);
   });
   ```

2. **Unit Conversion Issues**
   - Verify unit conversions (grams, cups, etc.)
   - Check supplier cost updates
   - Validate recipe scaling calculations

3. **Formula Recalculation**
   ```javascript
   // Manual cost recalculation
   const totalCost = ingredients.reduce((sum, ing) =>
     sum + (ing.quantity * ing.cost_per_unit), 0
   );
   const costPerServing = totalCost / recipe.serving_size;
   ```

### Recipe Scaling Problems

**Symptoms:**
- Scaled recipes have wrong ingredient amounts
- Cost calculations don't scale properly

**Solutions:**

1. **Scaling Algorithm Check**
   ```javascript
   // Verify scaling logic
   function scaleRecipe(recipe, newServings) {
     const scaleFactor = newServings / recipe.serving_size;
     return recipe.ingredients.map(ing => ({
       ...ing,
       quantity: ing.quantity * scaleFactor
     }));
   }
   ```

2. **Rounding Issues**
   - Check for proper decimal handling
   - Implement appropriate rounding rules

---

## Analytics Problems

### Reports Not Loading

**Symptoms:**
- Analytics dashboard blank
- Charts not displaying data

**Solutions:**

1. **Data Availability Check**
   ```javascript
   // Check analytics data
   db.find({ report_type: 'daily' })
     .sort({ date: -1 })
     .limit(1)
     .exec((err, records) => {
       console.log('Latest analytics:', records[0]);
     });
   ```

2. **Chart Library Issues**
   - Verify Chart.js library loaded
   - Check for JavaScript errors in console
   - Test chart rendering with sample data

3. **Date Range Issues**
   - Verify date format compatibility
   - Check timezone settings
   - Validate date range calculations

### Performance Metrics Incorrect

**Symptoms:**
- Wrong calculations in reports
- Inconsistent numbers across views

**Solutions:**

1. **Data Aggregation Verification**
   ```javascript
   // Test aggregation queries
   const pipeline = [
     { $match: { date: { $gte: startDate, $lte: endDate } } },
     { $group: { _id: null, total: { $sum: '$revenue' } } }
   ];
   ```

2. **Calculation Formula Check**
   - Verify profit margin formulas
   - Check average calculations
   - Validate percentage computations

### Export Functionality Failing

**Symptoms:**
- CSV/JSON downloads not working
- Export files corrupted

**Solutions:**

1. **File Generation Issues**
   ```javascript
   // Test CSV generation
   const csvContent = [
     ['Date', 'Revenue', 'Orders'],
     ['2025-01-01', '1500.00', '45']
   ].map(row => row.join(',')).join('\n');
   ```

2. **Download Handling**
   - Check browser download settings
   - Verify file permissions
   - Test with different browsers

---

## Performance Issues

### Application Running Slow

**Symptoms:**
- Interface lag and delays
- Database queries taking long time

**Solutions:**

1. **Database Optimization**
   ```javascript
   // Add missing indexes
   db.ensureIndex({ fieldName: 'created_date' });
   db.ensureIndex({ fieldName: 'status' });
   ```

2. **Memory Usage Check**
   ```bash
   # Monitor memory usage
   top -p $(pgrep -f restaurant-pos)

   # Windows Task Manager
   # Check memory usage in Processes tab
   ```

3. **Cache Clearing**
   ```javascript
   // Clear application cache
   localStorage.clear();
   sessionStorage.clear();
   ```

### High CPU Usage

**Symptoms:**
- System becomes unresponsive
- High processor utilization

**Solutions:**

1. **Process Monitoring**
   ```bash
   # Find high CPU processes
   ps aux --sort=-%cpu | head

   # Windows
   tasklist /FI "IMAGENAME eq RestaurantPOS.exe"
   ```

2. **Background Task Issues**
   - Check for infinite loops in code
   - Monitor real-time update frequency
   - Reduce polling intervals

3. **Resource Cleanup**
   ```javascript
   // Implement proper cleanup
   process.on('exit', () => {
     // Close database connections
     // Clean up timers
     // Close WebSocket connections
   });
   ```

---

## Network and Connectivity

### Real-time Updates Not Working

**Symptoms:**
- Changes not reflecting across terminals
- WebSocket connection errors

**Solutions:**

1. **Connection Testing**
   ```bash
   # Test WebSocket connection
   wscat -c ws://localhost:3000

   # Check server logs
   grep "websocket" logs/app.log
   ```

2. **Firewall Configuration**
   ```bash
   # Check firewall rules
   # Windows Firewall
   # Linux: ufw status
   ```

3. **Network Configuration**
   - Verify all terminals on same network
   - Check proxy settings
   - Disable VPN if interfering

### Multi-terminal Sync Issues

**Symptoms:**
- Data inconsistent across terminals
- Updates not propagating

**Solutions:**

1. **Server Configuration**
   ```javascript
   // Check CORS settings
   const corsOptions = {
     origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
     credentials: true
   };
   ```

2. **Session Management**
   - Verify session sharing across terminals
   - Check authentication consistency
   - Monitor session timeouts

---

## Printer Issues

### Receipt Printer Not Working

**Symptoms:**
- Receipts not printing
- Printer errors

**Solutions:**

1. **Printer Configuration**
   ```javascript
   // Check printer settings
   const printerConfig = {
     name: 'EPSON TM-T88V',
     type: 'thermal',
     width: 80,
     encoding: 'utf8'
   };
   ```

2. **Driver Issues**
   - Update printer drivers
   - Test printer with other applications
   - Check printer queue

3. **Print Command Testing**
   ```javascript
   // Test print functionality
   const { exec } = require('child_process');
   exec('echo "Test Print" > /dev/usb/lp0', (err) => {
     if (err) console.log('Print error:', err);
   });
   ```

### Kitchen Printer Problems

**Symptoms:**
- Order tickets not printing
- Wrong printer receiving jobs

**Solutions:**

1. **Printer Assignment**
   - Verify station-to-printer mapping
   - Check printer availability
   - Test printer connectivity

2. **Print Queue Issues**
   ```bash
   # Check print queue
   lpq -P printer_name

   # Clear stuck jobs
   lprm -P printer_name -
   ```

---

## Backup and Restore

### Backup Creation Failing

**Symptoms:**
- Backup process errors
- Incomplete backup files

**Solutions:**

1. **Permission Issues**
   ```bash
   # Check backup directory permissions
   ls -ld /backup/directory/

   # Fix permissions
   chmod 755 /backup/directory/
   ```

2. **Disk Space Issues**
   ```bash
   # Check available space
   df -h /backup/directory/

   # Clean old backups
   find /backup/directory/ -name "*.bak" -mtime +30 -delete
   ```

3. **Database Locking**
   ```bash
   # Ensure no active connections during backup
   # Stop application before backup
   # Or use hot backup if supported
   ```

### Restore Process Failing

**Symptoms:**
- Restore operation errors
- Data corruption after restore

**Solutions:**

1. **File Integrity Check**
   ```bash
   # Verify backup file integrity
   tar -tzf backup.tar.gz > /dev/null

   # Check file sizes
   ls -lh backup.tar.gz
   ```

2. **Version Compatibility**
   - Ensure backup from compatible version
   - Check database schema versions
   - Verify application version match

3. **Restore Process Monitoring**
   ```bash
   # Monitor restore progress
   tail -f logs/restore.log

   # Check for errors
   grep "ERROR" logs/restore.log
   ```

---

## Error Messages

### Common Error Messages and Solutions

#### "Cannot connect to database"
```
Error: Cannot connect to database server/databases/inventory.db
Solution: Check file permissions and database file existence
```

#### "Module not found: express"
```
Error: Cannot find module 'express'
Solution: Run npm install to install missing dependencies
```

#### "Port already in use"
```
Error: listen EADDRINUSE :::3000
Solution: Change port in configuration or kill process using port
```

#### "WebSocket connection failed"
```
Error: WebSocket connection to 'ws://localhost:3000' failed
Solution: Check server running and firewall settings
```

#### "Insufficient permissions"
```
Error: User does not have permission to perform this action
Solution: Check user roles and permissions configuration
```

#### "Data validation failed"
```
Error: Input validation failed for field 'price'
Solution: Check input data format and required fields
```

---

## Getting Help

### Diagnostic Information

When reporting issues, please include:

```bash
# System information
uname -a  # Linux/Mac
systeminfo  # Windows

# Application version
node -p "require('./package.json').version"

# Node.js version
node --version

# Recent logs
tail -n 50 logs/app.log
```

### Support Channels

1. **GitHub Issues**
   - [Create New Issue](https://github.com/akash/Pharmingo/issues)
   - Include system info and error logs
   - Provide steps to reproduce

2. **Documentation**
   - [User Guides](USER_GUIDES.md)
   - [API Documentation](API_DOCUMENTATION.md)
   - [Technical Docs](TECHNICAL_DOCS.md)

3. **Community Support**
   - Check existing issues for similar problems
   - Search documentation for solutions

### Emergency Procedures

For critical system failures:

1. **Stop the Application**
   ```bash
   # Graceful shutdown
   curl -X POST http://localhost:3000/api/shutdown

   # Force kill if needed
   pkill -f restaurant-pos
   ```

2. **Restore from Backup**
   ```bash
   # Restore latest working backup
   cp backup/last_good/* server/databases/
   ```

3. **Contact Support**
   - Provide detailed error information
   - Include system logs and configuration
   - Describe steps leading to failure

---

**Remember:** Most issues can be resolved by checking logs, verifying configurations, and following the troubleshooting steps above. For persistent problems, gather detailed diagnostic information before contacting support.