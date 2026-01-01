# FoodMine License System

A comprehensive subscription-based license management system for the FoodMine POS application using Google Sheets as the backend database.

## Overview

This license system provides:
- **Google Sheets-based license database** for easy management
- **Cryptographically secure license keys** with hardware binding
- **Grace period support** for internet connectivity issues
- **Offline caching** for improved user experience
- **Simple license generation portal** for administrators
- **Desktop application integration** with automatic validation

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   License       │    │   Google Apps    │    │   Desktop App   │
│   Portal        │───▶│   Script API     │───▶│   (Electron)    │
│   (HTML/JS)     │    │   (Google Sheets)│    │   License Check │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components

### 1. Google Apps Script API (`license-api.gs`)
- REST API endpoints for license validation and management
- Connects to Google Sheets for data storage
- Handles license generation, activation, and status checks
- CORS-enabled for web and desktop app access

### 2. License Portal (`license-portal.html`)
- Web-based interface for license management
- Generate new licenses
- Check license status
- Admin panel for Google Sheet access
- Simple, responsive design

### 3. Desktop License Manager (`assets/js/license-manager.js`)
- Handles license validation in the desktop application
- Hardware fingerprinting for device binding
- Grace period management
- Integration with application state

### 4. Main Process Integration (`start.js`)
- License checking before application startup
- License activation dialog
- Periodic license validation
- Graceful handling of license failures

### 5. Settings UI Integration (`index.html` + `assets/js/app.js`)
- License management interface in application settings
- Real-time license status display
- Manual license activation and management

## Setup Instructions

### Step 1: Create Google Sheet

1. Create a new Google Sheet
2. Name it "FoodMine Licenses" (or any name you prefer)
3. Set up the following columns in the first row:
   - A: Sr.No
   - B: License
   - C: Email
   - D: Activation Date
   - E: Expiry Date
   - F: Hardware ID
   - G: Status
   - H: subscription type

4. **Important**: Rename the tab to "license" (lowercase) to match the API configuration

### Step 2: Deploy Google Apps Script

1. Go to [Google Apps Script](https://script.google.com/)
2. Create a new project
3. Copy the contents of `license-api.gs` into the script editor
4. Update the `CONFIG.SHEET_ID` with your Google Sheet ID
5. Deploy as Web App:
   - Click "Deploy" → "New deployment"
   - Set "Execute as" to "Me"
   - Set "Who has access" to "Anyone"
   - Copy the deployment URL

### Step 3: Configure Application

1. Update `license-api.gs` CONFIG section:
   ```javascript
   const CONFIG = {
     SHEET_ID: 'YOUR_GOOGLE_SHEET_ID', // Replace with your sheet ID
     SHEET_NAME: 'license', // Updated to match your tab name
     API_KEY: 'YOUR_API_KEY' // Optional: Add API key for security
   };
   ```

2. Update `start.js` LICENSE_CONFIG section:
   ```javascript
   const LICENSE_CONFIG = {
     API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
     GRACE_PERIOD_DAYS: 7,
     STORAGE_KEY: 'foodmine_license'
   };
   ```

3. Update `assets/js/license-manager.js` config:
   ```javascript
   const CONFIG = {
     API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
     GRACE_PERIOD_DAYS: 7,
     CHECK_INTERVAL: 24 * 60 * 60 * 1000,
     STORAGE_KEY: 'foodmine_license'
   };
   ```

### Step 4: Test the System

1. Open the license portal (`license-portal.html`) in a browser
2. Generate a test license
3. Test license validation using the portal
4. Test the desktop application license checking

## API Endpoints

### License Validation
```
GET /?path=/validate&license_key=XXXXX&email=user@example.com
```
Returns license status, expiry date, and activation information.

### License Generation
```
POST /?path=/generate
{
  "email": "user@example.com",
  "type": "basic",
  "send_email": true
}
```
Generates a new license key and stores it in Google Sheets.

### License Activation
```
POST /?path=/activate
{
  "license_key": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXX",
  "email": "user@example.com",
  "hardware_id": "ABC123"
}
```
Activates a license for a specific device.

### License Status Check
```
GET /?path=/status&email=user@example.com
```
Returns all licenses for a specific email address.

## License Key Format

License keys are generated in the format:
```
XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXX
```

Where:
- Each X is a random alphanumeric character
- The final XXX is a checksum for validation
- Total length: 32 characters

## Security Features

1. **Hardware Binding**: Licenses are tied to specific devices
2. **Grace Period**: 7 days of offline access after expiry
3. **Cryptographic Validation**: Secure license key generation
4. **Online/Offline Support**: Caches license status locally
5. **Email Verification**: Prevents license sharing

## License Types

- **Basic**: 1-month subscription
- **Pro**: 1-month subscription with advanced features
- **Enterprise**: 1-month subscription with all features

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the Google Apps Script is deployed correctly
2. **License Not Found**: Check email and license key spelling
3. **Hardware ID Mismatch**: License bound to different device
4. **Grace Period Expired**: License needs renewal

### Debug Mode

Enable debug logging in the desktop application:
```javascript
// In license-manager.js
console.log('License check details:', licenseStatus);
```

## Security Best Practices

1. **Use HTTPS**: Always serve the license portal over HTTPS
2. **API Keys**: Consider adding API keys for additional security
3. **Regular Backups**: Backup your Google Sheet regularly
4. **Monitor Usage**: Track license usage and suspicious activity

## Future Enhancements

- **License Renewal**: Automatic renewal system
- **Multi-Device Support**: Allow licenses on multiple devices
- **Usage Analytics**: Track application usage metrics
- **License Transfer**: Allow license transfers between devices
- **Mobile App**: Mobile license management interface

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the Google Apps Script logs
3. Verify network connectivity
4. Contact support with error details and logs

## License

This license system is part of the FoodMine POS application and follows the same licensing terms.
