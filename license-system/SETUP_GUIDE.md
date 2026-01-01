# FoodMine License System - Setup Guide

This guide will help you complete the setup of your license system with your Google Sheet.

## 🎯 **What's Been Done**

✅ **Google Apps Script Updated**: The `license-api.gs` file has been updated to work with your Google Sheet structure:
- Tab name: "license"
- Columns: Sr.No, License, Email, Activation Date, Expiry Date, Hardware ID, Status, subscription type

✅ **Column Mappings Fixed**: All functions now correctly reference your column structure:
- License Key: Column B
- Email: Column C  
- Activation Date: Column D
- Expiry Date: Column E
- Hardware ID: Column F
- Status: Column G
- Subscription Type: Column H

## 📋 **Next Steps to Complete Setup**

### Step 1: Get Your Google Sheet ID

1. Open your Google Sheet in your browser
2. Look at the URL: `https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_SHEET_ID]/edit`
3. Copy the part between `/d/` and `/edit` - this is your **Google Sheet ID**

### Step 2: Deploy Google Apps Script

1. Go to [Google Apps Script](https://script.google.com/)
2. Create a new project
3. Copy the contents of `license-system/license-api.gs` into the script editor
4. **IMPORTANT**: Update the CONFIG section with your Google Sheet ID:
   ```javascript
   const CONFIG = {
     SHEET_ID: 'YOUR_GOOGLE_SHEET_ID', // Replace with your actual sheet ID
     SHEET_NAME: 'license', // This is already correct
     API_KEY: 'YOUR_API_KEY' // Optional: Add API key for security
   };
   ```
5. Click "Deploy" → "New deployment"
6. Set "Execute as" to "Me"
7. Set "Who has access" to "Anyone"
8. Click "Deploy"
9. Copy the deployment URL (it will look like: `https://script.google.com/macros/s/[SCRIPT_ID]/exec`)

### Step 3: Configure Your Application

You need to update the API URLs in your application files with the deployment URL from Step 2:

#### Update `start.js`:
```javascript
const LICENSE_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec', // Replace with your URL
  GRACE_PERIOD_DAYS: 7,
  STORAGE_KEY: 'foodmine_license'
};
```

#### Update `assets/js/license-manager.js`:
```javascript
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec', // Replace with your URL
  GRACE_PERIOD_DAYS: 7,
  CHECK_INTERVAL: 24 * 60 * 60 * 1000,
  STORAGE_KEY: 'foodmine_license'
};
```

### Step 4: Test Your Setup

1. **Test the License Portal**:
   - Open `license-system/license-portal.html` in your browser
   - Try generating a test license
   - Check if it appears in your Google Sheet

2. **Test License Validation**:
   - Use the "Check License Status" feature in the portal
   - Verify the API is working correctly

3. **Test Desktop Application**:
   - Start your FoodMine application
   - Try activating a license
   - Verify the license status shows correctly in settings

## 🔧 **Troubleshooting**

### Common Issues:

1. **"License key not found"**:
   - Check that your Google Sheet tab is named "license" (lowercase)
   - Verify the license key exists in Column B
   - Ensure the API URL is correct

2. **CORS Errors**:
   - Make sure the Google Apps Script is deployed with "Anyone" access
   - Check that the deployment URL is correct

3. **Column Mismatch**:
   - Verify your Google Sheet has all the required columns
   - Check that the tab name is "license"

### Debug Mode:

Enable debug logging in your application:
```javascript
// In license-manager.js, add this line to see detailed logs
console.log('License check details:', licenseStatus);
```

## 📞 **Need Help?**

If you encounter issues:

1. **Check the Google Apps Script logs**:
   - In Google Apps Script, go to "Executions" to see any errors

2. **Verify your Google Sheet structure**:
   - Make sure all columns are in the correct order
   - Ensure the tab name is "license"

3. **Test the API directly**:
   - Visit your deployment URL with `?path=/status&email=test@example.com` to test

## ✅ **Success Checklist**

- [ ] Google Sheet created with correct columns
- [ ] Google Apps Script deployed with correct Sheet ID
- [ ] Application configuration updated with deployment URL
- [ ] License portal working
- [ ] Desktop application license checking working
- [ ] Test license generated and activated successfully

Once you complete these steps, your license system will be fully functional! 🎉
