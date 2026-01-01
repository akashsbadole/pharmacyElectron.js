# FoodMine License System - Troubleshooting Guide

This comprehensive guide helps you diagnose and fix common license system issues. If your license is "not working," this guide covers the most likely causes and solutions.

## 🚨 Quick Start: License Not Working?

**First, check these common issues:**

1. **Internet Connection**: Is your device online? The license system needs internet access for validation.
2. **License Key Format**: Does your key match the format `XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXX`?
3. **Email Address**: Is the email you're using the same one used to generate the license?
4. **Google Sheet Access**: Is your Google Apps Script deployed and accessible?

**If still having issues, continue reading below.**

---

## 📋 Table of Contents

1. [Common License Issues](#common-license-issues)
2. [Google Apps Script Issues](#google-apps-script-issues)
3. [Google Sheet Issues](#google-sheet-issues)
4. [Application Integration Issues](#application-integration-issues)
5. [Step-by-Step Debugging](#step-by-step-debugging)
6. [Quick Fix Commands](#quick-fix-commands)
7. [Error Code Reference](#error-code-reference)

---

## 🔍 Common License Issues

### License Not Found

**Symptoms:**
- "License key not found" error
- License validation fails
- Application won't start

**Causes & Solutions:**

1. **License key not in Google Sheet**
   - **Fix**: Add the license key to your Google Sheet in the "license" tab
   - **Check**: Verify the license key exists in Column B

2. **Wrong email address**
   - **Fix**: Use the exact email address that was used when generating the license
   - **Check**: Email addresses are case-sensitive

3. **Incorrect Google Sheet tab name**
   - **Fix**: Ensure your tab is named "license" (lowercase)
   - **Check**: Google Apps Script expects tab name "license"

4. **API URL not configured**
   - **Fix**: Update the API URL in your application config files
   - **Check**: Verify deployment URL in Google Apps Script

### Expired Licenses

**Symptoms:**
- "License has expired" error
- Application shows grace period warning
- License validation returns expired status

**Causes & Solutions:**

1. **License past expiry date**
   - **Fix**: Generate a new license or renew subscription
   - **Check**: Verify expiry date in Google Sheet Column E

2. **System clock incorrect**
   - **Fix**: Set correct date/time on your device
   - **Check**: Compare system time with online time

3. **Grace period expired**
   - **Fix**: Activate a new license
   - **Check**: Grace period is 7 days by default

### Hardware Binding Issues

**Symptoms:**
- "Hardware ID mismatch" error
- License works on one device but not another
- Activation fails on different hardware

**Causes & Solutions:**

1. **Different device**
   - **Fix**: Generate new license for the new device
   - **Note**: Licenses are bound to specific hardware

2. **Hardware changes**
   - **Fix**: Contact administrator to update hardware ID in Google Sheet
   - **Check**: Column F contains the hardware ID

3. **Virtual machine or container**
   - **Fix**: Generate license specifically for VM/container environment
   - **Note**: VMs have different hardware IDs than host machines

### Email Validation Problems

**Symptoms:**
- "Email validation failed" error
- License not found for email
- Activation rejected

**Causes & Solutions:**

1. **Typo in email address**
   - **Fix**: Double-check email spelling and case
   - **Check**: Copy-paste email from license generation confirmation

2. **Different email used for activation**
   - **Fix**: Use the same email that was used to generate the license
   - **Note**: Email must match exactly

3. **Email not in Google Sheet**
   - **Fix**: Verify email exists in Column C of your Google Sheet
   - **Check**: License and email must be on the same row

---

## 📡 Google Apps Script Issues

### Deployment Problems

**Symptoms:**
- "Cannot connect to license server" error
- API calls fail
- Script not accessible

**Causes & Solutions:**

1. **Script not deployed**
   - **Fix**: Deploy as Web App in Google Apps Script
   - **Steps**: Deploy → New deployment → Execute as "Me" → Access "Anyone"

2. **Wrong deployment settings**
   - **Fix**: Ensure "Execute as me" and "Anyone" access
   - **Check**: Deployment URL should end with `/exec`

3. **Script ID not updated**
   - **Fix**: Update CONFIG.SHEET_ID in license-api.gs
   - **Check**: Use your actual Google Sheet ID

### CORS Errors

**Symptoms:**
- "CORS policy" errors in browser console
- API calls blocked
- Cross-origin request failed

**Causes & Solutions:**

1. **Missing CORS headers**
   - **Fix**: Google Apps Script should automatically handle CORS
   - **Check**: Ensure deployment is set to "Anyone"

2. **HTTPS vs HTTP mismatch**
   - **Fix**: Use HTTPS for both application and script URL
   - **Check**: Both URLs should start with `https://`

3. **Local development issues**
   - **Fix**: Use proper localhost configuration or test on server
   - **Note**: Some CORS restrictions apply to localhost

### API Configuration Issues

**Symptoms:**
- "API endpoint not found" error
- Wrong response format
- Configuration errors

**Causes & Solutions:**

1. **Wrong API endpoint**
   - **Fix**: Use correct deployment URL format
   - **Format**: `https://script.google.com/macros/s/[SCRIPT_ID]/exec`

2. **Missing CONFIG values**
   - **Fix**: Update CONFIG section in license-api.gs
   - **Required**: SHEET_ID, SHEET_NAME, API_KEY (optional)

3. **Function naming issues**
   - **Fix**: Ensure doGet and doPost functions exist
   - **Check**: Function names are case-sensitive

---

## 📊 Google Sheet Issues

### Data Format Problems

**Symptoms:**
- "Invalid data format" errors
- License validation fails
- Missing information

**Causes & Solutions:**

1. **Wrong column order**
   - **Fix**: Ensure columns are in correct order:
     - A: Sr.No
     - B: License
     - C: Email
     - D: Activation Date
     - E: Expiry Date
     - F: Hardware ID
     - G: Status
     - H: subscription type

2. **Missing required columns**
   - **Fix**: Add all required columns to Google Sheet
   - **Check**: All 8 columns must exist

3. **Incorrect date format**
   - **Fix**: Use ISO date format (YYYY-MM-DD)
   - **Example**: `2024-12-31`

### Missing Columns

**Symptoms:**
- "Column not found" errors
- Script crashes
- Data not saved

**Causes & Solutions:**

1. **Columns not created**
   - **Fix**: Create all required columns in first row
   - **Check**: Row 1 should have headers for all columns

2. **Wrong column names**
   - **Fix**: Use exact column names as expected by script
   - **Note**: Column names are case-sensitive

3. **Extra columns interfering**
   - **Fix**: Remove unnecessary columns or update script
   - **Check**: Script expects specific column structure

### Incorrect Sheet Structure

**Symptoms:**
- "Sheet not found" errors
- Data not accessible
- Script can't find license data

**Causes & Solutions:**

1. **Wrong sheet name**
   - **Fix**: Rename tab to "license" (lowercase)
   - **Check**: CONFIG.SHEET_NAME must match tab name

2. **Multiple sheets confusion**
   - **Fix**: Ensure license data is in correct sheet
   - **Check**: Script only reads from specified sheet

3. **Protected ranges**
   - **Fix**: Remove protection from license data range
   - **Check**: Script needs read/write access

---

## 🔧 Application Integration Issues

### API URL Configuration

**Symptoms:**
- "Cannot connect to server" errors
- License validation fails
- Network timeout

**Causes & Solutions:**

1. **Wrong API URL in application**
   - **Fix**: Update API_URL in all config files:
     - `start.js`
     - `assets/js/license-manager.js`
     - `license-portal.html`

2. **URL not updated after deployment**
   - **Fix**: Replace placeholder URLs with actual deployment URL
   - **Check**: Test URL in browser first

3. **Environment-specific URLs**
   - **Fix**: Use correct URL for development vs production
   - **Note**: Different deployments may have different URLs

### Network Connectivity

**Symptoms:**
- "Network error" messages
- Timeout errors
- Connection refused

**Causes & Solutions:**

1. **No internet connection**
   - **Fix**: Connect to internet and retry
   - **Note**: License system requires internet access

2. **Firewall blocking**
   - **Fix**: Allow connections to script.google.com
   - **Check**: Corporate firewalls may block Google services

3. **Proxy configuration**
   - **Fix**: Configure proxy settings for application
   - **Check**: Proxy may interfere with API calls

### Validation Failures

**Symptoms:**
- "License validation failed" errors
- Invalid license status
- Unexpected error messages

**Causes & Solutions:**

1. **License key format incorrect**
   - **Fix**: Ensure license key matches expected format
   - **Format**: `XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXX`

2. **Hardware ID mismatch**
   - **Fix**: Generate new license for current device
   - **Check**: Hardware ID changes with device changes

3. **Email not matching**
   - **Fix**: Use exact email from license generation
   - **Note**: Email validation is strict

---

## 🔍 Step-by-Step Debugging

### Step 1: Check Basic Connectivity

```bash
# Test if Google Apps Script is accessible
curl "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?path=/status&email=test@example.com"
```

**Expected Response:**
```json
{
  "success": true,
  "licenses": []
}
```

### Step 2: Verify License Data

1. **Check Google Sheet:**
   - Open your Google Sheet
   - Verify license key exists in Column B
   - Check email in Column C
   - Verify expiry date in Column E

2. **Test API Directly:**
   ```bash
   # Test license validation
   curl "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?path=/validate&license_key=YOUR_LICENSE_KEY&email=YOUR_EMAIL"
   ```

### Step 3: Check Application Logs

1. **Browser Console:**
   - Open Developer Tools (F12)
   - Check Console tab for errors
   - Look for network request failures

2. **Application Logs:**
   - Check application log files
   - Look for license-related error messages
   - Verify API URL configuration

### Step 4: Test Hardware ID

```javascript
// In browser console, test hardware ID generation
const licenseManager = new LicenseManager();
licenseManager.generateHardwareId().then(id => {
  console.log('Generated Hardware ID:', id);
});
```

### Step 5: Validate License Manually

1. **Use License Portal:**
   - Open `license-portal.html` in browser
   - Test license validation
   - Check license status

2. **Test with Demo Licenses:**
   - Use sample licenses from `sample-licenses.md`
   - Verify system works with known good data

---

## ⚡ Quick Fix Commands

### Google Apps Script Deployment

```javascript
// 1. Update CONFIG in license-api.gs
const CONFIG = {
  SHEET_ID: 'YOUR_ACTUAL_SHEET_ID',  // Replace this
  SHEET_NAME: 'license',             // Keep as-is
  API_KEY: 'YOUR_API_KEY'            // Optional
};

// 2. Deploy script
// File → Manage versions → Save new version
// Deploy → New deployment → Web app
// Execute as: Me
// Who has access: Anyone
```

### Application Configuration

```javascript
// Update in start.js
const LICENSE_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  GRACE_PERIOD_DAYS: 7,
  STORAGE_KEY: 'foodmine_license'
};

// Update in assets/js/license-manager.js
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  GRACE_PERIOD_DAYS: 7,
  CHECK_INTERVAL: 24 * 60 * 60 * 1000,
  STORAGE_KEY: 'foodmine_license'
};
```

### Google Sheet Setup

```javascript
// Column headers (Row 1):
// A: Sr.No
// B: License
// C: Email
// D: Activation Date
// E: Expiry Date
// F: Hardware ID
// G: Status
// H: subscription type

// Sample data (Row 2):
// A: 1
// B: ABCDE-FGHIJ-KLMNO-PQRST-UVWXY-123
// C: user@example.com
// D: 2024-01-01
// E: 2024-12-31
// F: hardware123
// G: active
// H: basic
```

### Test Commands

```bash
# Test API connectivity
curl "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?path=/status&email=test@example.com"

# Test license validation
curl "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?path=/validate&license_key=ABCDE-FGHIJ-KLMNO-PQRST-UVWXY-123&email=test@example.com"

# Test license activation
curl -X POST -H "Content-Type: application/json" \
  -d '{"license_key":"ABCDE-FGHIJ-KLMNO-PQRST-UVWXY-123","email":"test@example.com","hardware_id":"test123"}' \
  "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?path=/activate"
```

---

## 📋 Error Code Reference

### License Validation Errors

| Error Code | Message | Cause | Solution |
|------------|---------|-------|----------|
| `LICENSE_NOT_FOUND` | "License key not found" | License not in Google Sheet | Add license to sheet |
| `EMAIL_MISMATCH` | "Email does not match" | Wrong email used | Use correct email |
| `EXPIRED_LICENSE` | "License has expired" | Past expiry date | Renew license |
| `HARDWARE_MISMATCH` | "Hardware ID mismatch" | Different device | Generate new license |
| `PENDING_ACTIVATION` | "License pending activation" | Not activated yet | Activate license |

### API Errors

| Error Code | Message | Cause | Solution |
|------------|---------|-------|----------|
| `NETWORK_ERROR` | "Network error" | Connection failed | Check internet |
| `CORS_ERROR` | "CORS policy blocked" | Cross-origin issue | Fix deployment |
| `INVALID_REQUEST` | "Invalid request" | Wrong parameters | Check API format |
| `RATE_LIMITED` | "Too many requests" | API limit exceeded | Wait and retry |
| `SERVER_ERROR` | "Internal server error" | Script error | Check Google Apps Script logs |

### Application Errors

| Error Code | Message | Cause | Solution |
|------------|---------|-------|----------|
| `CONFIG_ERROR` | "Configuration error" | Wrong API URL | Update config |
| `STORAGE_ERROR` | "Storage error" | Local storage failed | Clear cache |
| `VALIDATION_ERROR` | "Validation failed" | License format wrong | Check format |
| `TIMEOUT_ERROR` | "Request timeout" | Server slow | Retry later |
| `GRACE_PERIOD_EXPIRED` | "Grace period expired" | No internet too long | Renew license |

### Google Sheet Errors

| Error Code | Message | Cause | Solution |
|------------|---------|-------|----------|
| `SHEET_NOT_FOUND` | "Sheet not found" | Wrong sheet ID | Update CONFIG |
| `COLUMN_ERROR` | "Column not found" | Missing columns | Add columns |
| `PERMISSION_ERROR` | "Permission denied" | No access | Check sharing |
| `DATA_ERROR` | "Invalid data" | Wrong format | Fix data |
| `RANGE_ERROR` | "Range error" | Wrong range | Check range |

---

## 🆘 Getting Help

### Before Contacting Support

1. **Check this troubleshooting guide** - Most issues are covered here
2. **Review Google Apps Script logs** - Check for script errors
3. **Test with demo licenses** - Verify system works
4. **Check browser console** - Look for JavaScript errors
5. **Verify network connectivity** - Ensure internet access

### Information to Provide

When contacting support, include:

1. **Error messages** - Exact text of any error messages
2. **Browser console logs** - Copy from Developer Tools
3. **Google Apps Script logs** - From Apps Script dashboard
4. **API URL** - Your deployed script URL
5. **Test results** - Results from troubleshooting steps above

### Common Solutions Summary

- ✅ **Check internet connection**
- ✅ **Verify license key format**
- ✅ **Use correct email address**
- ✅ **Ensure Google Apps Script deployed**
- ✅ **Update API URLs in config files**
- ✅ **Check Google Sheet structure**
- ✅ **Test with demo licenses**

---

## 📝 License System Health Check

Run this checklist to verify your license system:

- [ ] Google Apps Script deployed successfully
- [ ] API URL updated in all application files
- [ ] Google Sheet has correct structure
- [ ] License keys added to Google Sheet
- [ ] Test license validation works
- [ ] Application can connect to API
- [ ] Hardware ID generation works
- [ ] Grace period handling works
- [ ] Error handling works correctly

If any items are unchecked, refer to the relevant section above.

---

**Last Updated:** December 2024  
**Version:** 1.0  
**For:** FoodMine License System

For additional support, see [README.md](./README.md) or [SETUP_GUIDE.md](./SETUP_GUIDE.md).