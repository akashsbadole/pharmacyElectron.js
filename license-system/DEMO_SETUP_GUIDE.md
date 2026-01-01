# FoodMine Demo License System - Comprehensive Setup Guide

This guide provides step-by-step instructions to set up and configure the complete demo license system for FoodMine POS application.

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Google Account** with access to Google Sheets and Google Apps Script
- [ ] **Node.js** installed (for running demo scripts)
- [ ] **Web browser** (Chrome, Firefox, or Edge recommended)
- [ ] **Text editor** (VS Code, Sublime Text, or similar)
- [ ] **Internet connection** for Google services
- [ ] **Basic understanding** of Google Sheets and web APIs

## 🚀 Quick Start Overview

1. **Setup Google Sheet** (5 minutes)
2. **Deploy Google Apps Script API** (10 minutes)
3. **Populate Demo Data** (2 minutes)
4. **Configure Application** (5 minutes)
5. **Test System** (10 minutes)

**Total Setup Time: ~30 minutes**

---

## Step 1: Setup Google Sheet Structure

### 1.1 Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **Blank** to create a new spreadsheet
3. Name it: `FoodMine Demo Licenses`
4. Note the **Sheet ID** from the URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`

### 1.2 Configure Sheet Structure

1. **Rename the first tab** to: `license` (lowercase, exactly as shown)
2. **Set up column headers** in Row 1:

| Column | Header | Purpose |
|--------|--------|---------|
| A | Email | License holder email address |
| B | License Key | Generated license key |
| C | Subscription Type | basic/pro/enterprise |
| D | Expiry Date | License expiration date |
| E | Status | active/pending/expired |
| F | Activation Date | When license was activated |
| G | Hardware ID | Device binding identifier |
| H | subscription type | Duplicate for API compatibility |

3. **Set column widths** for better visibility:
   - Email: 200px
   - License Key: 200px
   - Subscription Type: 150px
   - Expiry Date: 150px
   - Status: 120px
   - Activation Date: 150px
   - Hardware ID: 200px
   - subscription type: 150px

### 1.3 Format Date Columns

1. Select columns D (Expiry Date) and F (Activation Date)
2. Format → Number → Date time
3. Choose format: `Dec 31, 2023 12:00:00 PM`

---

## Step 2: Deploy Google Apps Script API

### 2.1 Create Google Apps Script Project

1. Go to [Google Apps Script](https://script.google.com)
2. Click **New project**
3. Delete the default `Code.gs` content

### 2.2 Configure the API Script

1. Copy the contents of [`license-system/license-api.gs`](./license-api.gs)
2. Paste into the Apps Script editor
3. **Update Configuration** (Lines 7-11):

```javascript
const CONFIG = {
  SHEET_ID: 'YOUR_ACTUAL_SHEET_ID_HERE', // Replace with your Sheet ID
  SHEET_NAME: 'license', // This is correct
  API_KEY: 'YOUR_API_KEY' // Optional: Add security key
};
```

### 2.3 Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click **Select type** → **Web app**
3. Set **Execute as**: `Me`
4. Set **Who has access**: `Anyone`
5. Click **Deploy**
6. **Copy the deployment URL** (format: `https://script.google.com/macros/s/[SCRIPT_ID]/exec`)

### 2.4 Test the API

1. Open your browser
2. Visit: `YOUR_DEPLOYMENT_URL?path=/status&email=test@example.com`
3. Should return: `{"success":false,"error":"No license found for this email"}`

---

## Step 3: Populate Demo Data

### 3.1 Option A: Use Google Apps Script (Recommended)

1. In your Google Apps Script project, create a new file: `populate-demo.gs`
2. Copy contents from [`license-system/populate-demo-sheet.gs`](./populate-demo-sheet.gs)
3. Update the SHEET_ID in the script to match your sheet
4. Run the `setupSheet()` function first
5. Then run the `populateDemoSheet()` function

### 3.2 Option B: Manual Population

Add these demo licenses manually to your Google Sheet:

| Email | License Key | Subscription Type | Expiry Date | Status | Activation Date | Hardware ID | subscription type |
|-------|-------------|-------------------|-------------|--------|-----------------|-------------|-------------------|
| demo@foodmine.com | ABC12-DEF34-GHI56-JKL78-MNO90-123 | basic | [1 month from today] | active | [today] | | basic |
| pro@foodmine.com | PRO45-67890-ABCDE-FGHIJ-KLMNO-456 | pro | [1 month from today] | active | [today] | | pro |
| enterprise@foodmine.com | ENT78-90123-ABCDE-FGHIJ-KLMNO-789 | enterprise | [1 month from today] | active | [today] | | enterprise |
| expired@foodmine.com | EXP12-34567-ABCDE-FGHIJ-KLMNO-012 | basic | [15 days ago] | expired | [15 days ago] | | basic |
| pending@foodmine.com | PND45-67890-ABCDE-FGHIJ-KLMNO-345 | basic | [1 month from today] | pending | [today] | | basic |

### 3.3 Verify Demo Data

1. Run the `getDemoLicenses()` function in Apps Script
2. Should return 5 demo licenses
3. Run `testDemoLicenses()` to verify all work correctly

---

## Step 4: Configure Application

### 4.1 Update Desktop Application

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

### 4.2 Test License Portal

1. Open [`license-system/license-portal.html`](./license-portal.html) in your browser
2. Update the API URL in the JavaScript (around line 20)
3. Test license generation and validation

### 4.3 Test Demo License Tester

1. Open [`license-system/demo-license-tester.html`](./demo-license-tester.html)
2. Update the API URL field with your deployment URL
3. Test with sample licenses from [`sample-licenses.md`](./sample-licenses.md)

---

## Step 5: Test System End-to-End

### 5.1 Basic License Validation Test

1. **Test Active License**:
   ```
   API Call: ?path=/validate&license_key=ABC12-DEF34-GHI56-JKL78-MNO90-123&email=demo@foodmine.com
   Expected: {"success":true,"status":"active",...}
   ```

2. **Test Expired License**:
   ```
   API Call: ?path=/validate&license_key=EXP12-34567-ABCDE-FGHIJ-KLMNO-012&email=expired@foodmine.com
   Expected: {"success":false,"error":"License has expired"}
   ```

3. **Test Invalid License**:
   ```
   API Call: ?path=/validate&license_key=INVALID-KEY-123&email=test@example.com
   Expected: {"success":false,"error":"Invalid license key"}
   ```

### 5.2 Desktop Application Test

1. **Start the application** with a valid demo license
2. **Verify license status** shows as "Active" in settings
3. **Test grace period** by disconnecting internet and restarting
4. **Test license activation** using the settings interface

### 5.3 License Management Test

1. **Generate new license** via license portal
2. **Activate license** in desktop application
3. **Check status** via API or portal
4. **Test renewal** process

---

## 🔧 Configuration Examples

### Complete API URL Examples

```javascript
// Production URL format
API_URL: 'https://script.google.com/macros/s/AKfycbxABC123def456ghi789jkl/exec'

// Development URL format  
API_URL: 'https://script.google.com/macros/s/AKfycbyXYZ987abc654def321/exec'
```

### Sample License Objects

```javascript
// Basic License
{
  "email": "demo@foodmine.com",
  "license_key": "ABC12-DEF34-GHI56-JKL78-MNO90-123",
  "subscription_type": "basic",
  "expiry_date": "2024-02-01T10:30:00.000Z",
  "status": "active",
  "activation_date": "2024-01-01T10:30:00.000Z",
  "hardware_id": ""
}

// Pro License
{
  "email": "pro@foodmine.com", 
  "license_key": "PRO45-67890-ABCDE-FGHIJ-KLMNO-456",
  "subscription_type": "pro",
  "expiry_date": "2024-02-01T10:30:00.000Z",
  "status": "active",
  "activation_date": "2024-01-01T10:30:00.000Z",
  "hardware_id": "DEMO-HW-ID-123"
}
```

---

## 🛠️ Troubleshooting Common Issues

### Issue 1: "License key not found"

**Symptoms**: API returns "Invalid license key" for valid demo keys

**Solutions**:
- ✅ Verify Google Sheet tab name is exactly "license" (lowercase)
- ✅ Check license key is in Column B (License Key)
- ✅ Ensure API URL is correct in application config
- ✅ Verify Google Apps Script is deployed with "Anyone" access

### Issue 2: CORS Errors

**Symptoms**: Browser console shows CORS errors when calling API

**Solutions**:
- ✅ Ensure Google Apps Script deployment has CORS headers
- ✅ Check deployment URL is correct (ends with `/exec`)
- ✅ Verify "Who has access" is set to "Anyone"

### Issue 3: Email Validation Failures

**Symptoms**: "License is bound to a different email address"

**Solutions**:
- ✅ Use exact email from demo data (case-sensitive)
- ✅ Check email is in Column C (Email)
- ✅ Verify email format is valid

### Issue 4: Expired License Issues

**Symptoms**: License shows as expired even when it should be active

**Solutions**:
- ✅ Check date format in Google Sheet (use Date format)
- ✅ Verify expiry dates are in future
- ✅ Check system timezone matches Google Sheet timezone

### Issue 5: Google Apps Script Errors

**Symptoms**: API returns error messages or doesn't respond

**Solutions**:
- ✅ Check Apps Script execution logs
- ✅ Verify SHEET_ID is correct in CONFIG
- ✅ Ensure Google Sheet sharing is set to "Anyone with link can view"
- ✅ Check quota limits aren't exceeded

---

## 🧪 Testing Procedures

### Automated Testing Script

Use [`license-system/generate-demo-licenses.js`](./generate-demo-licenses.js) for programmatic testing:

```javascript
// Generate test licenses
const { generateDemoLicense, generateExpiredLicense } = require('./generate-demo-licenses.js');

const activeLicense = generateDemoLicense('pro', 'test@example.com');
const expiredLicense = generateExpiredLicense('basic', 'expired@example.com');

console.log('Active License:', activeLicense);
console.log('Expired License:', expiredLicense);
```

### Manual Testing Checklist

- [ ] **API Endpoints**: All endpoints respond correctly
- [ ] **License Validation**: Active, expired, and invalid licenses work
- [ ] **Email Binding**: Licenses bound to correct emails
- [ ] **Grace Period**: Offline access works for 7 days
- [ ] **Desktop Integration**: License checking in main app
- [ ] **Settings UI**: License management interface works
- [ ] **Error Handling**: Proper error messages displayed

### Performance Testing

- [ ] **Response Time**: API responds within 2-3 seconds
- [ ] **Concurrent Users**: Multiple simultaneous requests work
- [ ] **Large Dataset**: Test with 100+ licenses
- [ ] **Memory Usage**: No memory leaks in long-running tests

---

## 📋 Quick Start Commands

### Essential Commands

```bash
# Generate demo licenses (Node.js)
node license-system/generate-demo-licenses.js

# Test license validation
curl "YOUR_API_URL?path=/validate&license_key=ABC12-DEF34-GHI56-JKL78-MNO90-123&email=demo@foodmine.com"

# Check license status
curl "YOUR_API_URL?path=/status&email=demo@foodmine.com"

# Generate new license
curl -X POST "YOUR_API_URL?path=/generate" \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","type":"pro"}'
```

### Google Apps Script Commands

```javascript
// In Apps Script editor console:
setupSheet();           // Create sheet structure
populateDemoSheet();    // Add demo data
testDemoLicenses();     // Test all licenses
getSheetSummary();      // Get sheet statistics
```

### Application Commands

```bash
# Start desktop application
npm start

# Build application
npm run build

# Test license system
node test-license-system.js
```

---

## 📞 Support and Resources

### Documentation Links

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Google Sheets API Reference](https://developers.google.com/sheets/api)
- [CORS Configuration Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

### Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 401 | Invalid API key | Check API_KEY configuration |
| 403 | Access denied | Verify Google Sheet sharing settings |
| 404 | Sheet not found | Check SHEET_ID in CONFIG |
| 500 | Internal error | Check Apps Script execution logs |
| 503 | Service unavailable | Check Google Apps Script quotas |

### Getting Help

1. **Check Logs**: Google Apps Script → Executions
2. **Verify Configuration**: Double-check all URLs and IDs
3. **Test Incrementally**: Test each component separately
4. **Community Support**: Google Apps Script community forums

---

## ✅ Final Verification Checklist

- [ ] Google Sheet created with correct structure
- [ ] Google Apps Script deployed successfully
- [ ] Demo data populated in sheet
- [ ] API URL configured in application files
- [ ] License portal working correctly
- [ ] Desktop application license checking functional
- [ ] All test scenarios pass
- [ ] Error handling verified
- [ ] Performance acceptable
- [ ] Documentation complete

## 🎉 You're Ready!

Your FoodMine demo license system is now fully configured and ready for use. The system provides:

- ✅ **Secure license validation** with hardware binding
- ✅ **Grace period support** for offline access
- ✅ **Easy management** through web portal
- ✅ **Comprehensive testing** with demo data
- ✅ **Production-ready** architecture

For production deployment, consider adding:
- API key authentication
- Rate limiting
- Enhanced security measures
- Backup and monitoring systems

**Happy licensing! 🚀**