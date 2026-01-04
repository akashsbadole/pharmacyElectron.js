# NeDB to PostgreSQL Synchronization Guide

## Overview

This guide explains the NeDB synchronization issue and provides solutions for ensuring proper data synchronization between the desktop PharmaMine application (using NeDB) and the web application (using PostgreSQL).

## Problem Description

The web application's sync engine is designed to synchronize data between:
- **Desktop Application**: Uses NeDB (NeDB) database files
- **Web Application**: Uses PostgreSQL database

The synchronization was failing because the web application cannot directly access NeDB database files and needs to communicate with the desktop application via an API.

## Current Implementation

### Sync Architecture

1. **Sync Engine**: Located at `web-app/server/sync/sync-engine.js`
2. **Sync Configuration**: Located at `web-app/server/config/sync.js`
3. **Sync API Endpoints**: Located at `web-app/server/api/sync.js`

### How Sync Works

1. **Change Detection**: Both databases track changes via sync_log tables
2. **Periodic Sync**: Every 30 seconds (configurable)
3. **Conflict Resolution**: Timestamp-based, manual, or overwrite strategies
4. **API Communication**: Web app communicates with desktop app via HTTP API

## NeDB Connection Configuration

The sync engine is configured to connect to the desktop application at:
- **Host**: `localhost` (configurable via `NEDB_HOST`)
- **Port**: `49499` (default PharmaMine port, configurable via `NEDB_PORT`)
- **API Endpoint**: `http://localhost:49499/api/sync/changes`

## Troubleshooting NeDB Synchronization

### 1. Check Desktop Application Status

**Issue**: Desktop application is not running or not accessible.

**Solution**:
```bash
# Check if desktop application is running
# Default port is 49499
curl http://localhost:49499/api/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-04T12:00:00.000Z",
  "database": "connected",
  "sync": "enabled"
}
```

### 2. Verify Sync API Availability

**Issue**: Desktop application is running but sync API is not enabled.

**Solution**:
- Ensure the desktop application has sync API enabled
- Check desktop application configuration
- Verify firewall is not blocking port 49499

### 3. Check Network Connectivity

**Issue**: Network issues preventing communication.

**Solution**:
```bash
# Test connectivity
ping localhost
telnet localhost 49499
```

### 4. Verify Database Paths

**Issue**: NeDB database files are in different location.

**Solution**: Update `NEDB_PATH` in environment variables:
```bash
export NEDB_PATH="/path/to/your/nedb/databases"
```

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the `web-app` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pharmamine_web
DB_USER=postgres
DB_PASSWORD=your_password
DB_TYPE=postgres

# Sync Configuration
SYNC_INTERVAL=30000
MAX_RETRIES=3
CONFLICT_STRATEGY=timestamp
PREFERRED_SOURCE=postgres

# NeDB Configuration
NEDB_HOST=localhost
NEDB_PORT=49499
NEDB_PATH=./data/databases

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Server Configuration
PORT=3001
```

## API Endpoints for Sync Management

### Sync Status
```bash
GET /api/sync/status
Authorization: Bearer <your-jwt-token>
```

### Trigger Manual Sync
```bash
POST /api/sync/trigger
Authorization: Bearer <your-jwt-token>
```

### Test NeDB Connection
```bash
GET /api/sync/test-nedb
Authorization: Bearer <your-jwt-token>
```

### Sync Troubleshooting
```bash
GET /api/sync/troubleshoot
Authorization: Bearer <your-jwt-token>
```

## Common Issues and Solutions

### Issue 1: "NeDB API not accessible"

**Cause**: Desktop application is not running or sync API is disabled.

**Solution**:
1. Start the desktop PharmaMine application
2. Ensure sync API is enabled in desktop app settings
3. Verify the desktop app is accessible at the configured port

### Issue 2: "Failed to get changes from NeDB"

**Cause**: Network connectivity issues or incorrect configuration.

**Solution**:
1. Check network connectivity to desktop application
2. Verify `NEDB_HOST` and `NEDB_PORT` in environment variables
3. Check firewall settings

### Issue 3: Sync conflicts

**Cause**: Same record modified in both applications.

**Solution**:
1. Review conflict resolution strategy in sync configuration
2. Use manual conflict resolution if needed
3. Consider implementing better change detection

## Best Practices

### 1. Ensure Desktop Application is Always Running

For proper synchronization, the desktop application should be running when the web application needs to sync data.

### 2. Monitor Sync Status

Regularly check sync status using the API endpoints:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/sync/status
```

### 3. Handle Conflicts Proactively

Set up proper conflict resolution strategies:
- **Timestamp-based**: Newer changes win
- **Manual**: Require user intervention
- **Overwrite**: Always prefer one source

### 4. Monitor Logs

Check sync logs for errors and issues:
```bash
# Check sync logs
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/sync/logs
```

### 5. Regular Maintenance

- Monitor sync performance metrics
- Clean up old sync logs periodically
- Verify database connections regularly

## Testing Synchronization

### 1. Start Desktop Application
```bash
# Start the desktop PharmaMine application
npm start
```

### 2. Start Web Application
```bash
cd web-app
npm install
node server/server.js
```

### 3. Test Sync
```bash
# Test NeDB connection
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/sync/test-nedb

# Trigger manual sync
curl -X POST -H "Authorization: Bearer <token>" http://localhost:3001/api/sync/trigger

# Check sync status
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/sync/status
```

## Advanced Configuration

### Custom Sync Intervals
```env
SYNC_INTERVAL=60000  # Sync every 60 seconds
```

### Custom Conflict Resolution
```env
CONFLICT_STRATEGY=manual  # Require manual resolution
PREFERRED_SOURCE=postgres  # Always prefer web app changes
```

### Debug Logging
```env
LOG_LEVEL=debug  # Enable debug logging
```

## Support

If you continue to experience synchronization issues:

1. Check the sync logs in `web-app/logs/sync.log`
2. Verify desktop application is running and accessible
3. Check network connectivity between applications
4. Review environment configuration
5. Contact support with detailed error logs

## Next Steps

1. **Implement Direct NeDB File Access**: Future versions could implement direct NeDB file reading
2. **Real-time Sync**: Implement WebSocket-based real-time synchronization
3. **Enhanced Conflict Resolution**: Add more sophisticated conflict resolution strategies
4. **Monitoring Dashboard**: Create a web-based dashboard for monitoring sync status

This synchronization system ensures data consistency between the desktop and web applications, providing a seamless experience for users working across both platforms.
