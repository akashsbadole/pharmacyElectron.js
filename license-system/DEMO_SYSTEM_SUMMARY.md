# FoodMine Demo License System - Complete Overview

## 📋 System Overview

The FoodMine Demo License System is a comprehensive, production-ready license management solution designed for testing, demonstration, and development purposes. Built on Google Sheets and Google Apps Script, it provides a secure, scalable, and easy-to-manage licensing infrastructure for the FoodMine POS application.

### Key Features

- **Google Sheets Backend**: Simple, accessible database management
- **Cryptographically Secure License Keys**: 32-character keys with checksum validation
- **Hardware Binding**: Licenses tied to specific devices for security
- **Grace Period Support**: 7 days of offline access after expiry
- **Multi-Subscription Types**: Basic, Pro, and Enterprise tiers
- **Web-Based Management Portal**: Easy license generation and status checking
- **API Integration**: RESTful endpoints for application integration
- **Comprehensive Testing**: Demo licenses and testing utilities

### Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Demo License  │    │   Google Apps    │    │   Desktop App   │
│   Tester        │───▶│   Script API     │───▶│   (Electron)    │
│   (HTML/JS)     │    │   (Google Sheets)│    │   License Check │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   License       │    │   Demo License   │    │   Application   │
│   Portal        │    │   Generator      │    │   Integration   │
│   (HTML/JS)     │    │   (JavaScript)   │    │   (Node.js)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📁 File Inventory

### Core System Files

| File | Purpose | Type |
|------|---------|------|
| `license-api.gs` | Google Apps Script API backend | Google Apps Script |
| `license-portal.html` | Web-based license management interface | HTML/JavaScript |
| `demo-license-tester.html` | Interactive testing interface | HTML/JavaScript |
| `generate-demo-licenses.js` | License generation utility | JavaScript |
| `populate-demo-sheet.gs` | Google Sheets data population | Google Apps Script |
| `populate-demo-sheet.js` | Node.js data population utility | JavaScript |

### Documentation Files

| File | Purpose | Type |
|------|---------|------|
| `README.md` | Main system documentation | Markdown |
| `DEMO_SETUP_GUIDE.md` | Step-by-step setup instructions | Markdown |
| `sample-licenses.md` | Test license examples and scenarios | Markdown |
| `SETUP_GUIDE.md` | Production deployment guide | Markdown |

### Integration Files

| File | Purpose | Location |
|------|---------|----------|
| `assets/js/license-manager.js` | Desktop application license checking | `/assets/js/` |
| `start.js` | Main application license validation | Root |
| `index.html` | Settings UI license management | Root |

## ✅ Quick Start Checklist

### 5-Step Setup Process

1. **Setup Google Sheet** (5 minutes)
   - Create Google Sheet named "FoodMine Demo Licenses"
   - Set up column headers: Email, License Key, Subscription Type, Expiry Date, Status, Activation Date, Hardware ID
   - Rename tab to "license" (lowercase)

2. **Deploy Google Apps Script** (10 minutes)
   - Create new Google Apps Script project
   - Copy `license-api.gs` content
   - Update SHEET_ID configuration
   - Deploy as web app with "Anyone" access

3. **Populate Demo Data** (2 minutes)
   - Run `populate-demo-sheet.gs` or manually add sample licenses
   - Verify 5 demo licenses are created (basic, pro, enterprise, expired, pending)

4. **Configure Application** (5 minutes)
   - Update API URLs in `start.js` and `assets/js/license-manager.js`
   - Test license portal with updated API URL
   - Verify demo license tester works

5. **Test System** (10 minutes)
   - Test license validation with sample licenses
   - Verify desktop application license checking
   - Test all scenarios: active, expired, pending, invalid

**Total Setup Time: ~30 minutes**

## 🔗 File Relationships

### Data Flow Architecture

```
User Input → License Portal → Google Apps Script → Google Sheets
     ↓              ↓                ↓                 ↓
License Key → Validation API → Database Query → Status Response
     ↓              ↓                ↓                 ↓
Desktop App → License Manager → API Call → Application State
```

### Component Dependencies

1. **Google Apps Script API** (`license-api.gs`)
   - **Depends on**: Google Sheets structure
   - **Used by**: License Portal, Demo Tester, Desktop Application
   - **Provides**: REST API endpoints for license operations

2. **License Portal** (`license-portal.html`)
   - **Depends on**: Google Apps Script API
   - **Uses**: Configuration from `CONFIG` object
   - **Provides**: Web interface for license management

3. **Demo License Tester** (`demo-license-tester.html`)
   - **Depends on**: Google Apps Script API
   - **Uses**: Sample licenses from `sample-licenses.md`
   - **Provides**: Interactive testing environment

4. **License Generator** (`generate-demo-licenses.js`)
   - **Independent**: No external dependencies
   - **Used by**: Testing and development
   - **Provides**: Cryptographically secure license keys

5. **Desktop Integration**
   - **Depends on**: Google Apps Script API
   - **Uses**: License Manager for validation
   - **Provides**: Application license checking

### Configuration Flow

```
Google Sheet ID → license-api.gs → Application Files → Demo Interfaces
       ↓              ↓                ↓                 ↓
SHEET_ID Config → API Deployment → URL Updates → Testing Setup
```

## 🧪 Usage Examples

### Common Scenarios

#### 1. Generate New License
```javascript
// Via License Portal
POST /?path=/generate
{
  "email": "customer@example.com",
  "type": "pro",
  "send_email": true
}

// Via Demo Generator
const license = generateDemoLicense('enterprise', 'demo@example.com');
```

#### 2. Validate License
```javascript
// API Call
GET /?path=/validate&license_key=ABC12-DEF34-GHI56-JKL78-MNO90-123&email=demo@foodmine.com

// Desktop Application
const isValid = await licenseManager.validateLicense(licenseKey, email);
```

#### 3. Activate License
```javascript
// API Call
POST /?path=/activate
{
  "license_key": "PND45-67890-ABCDE-FGHIJ-KLMNO-345",
  "hardware_id": "DEVICE-HW-ID-123"
}

// Desktop Application
await licenseManager.activateLicense(licenseKey, hardwareId);
```

#### 4. Check License Status
```javascript
// API Call
GET /?path=/status&email=user@example.com

// License Portal
// Navigate to "Check License Status" section
```

### Testing Workflows

#### Basic License Test
1. Use demo@foodmine.com license key
2. Validate via demo tester
3. Verify status shows as "active"
4. Test application startup with license

#### Expired License Test
1. Use expired@foodmine.com license key
2. Verify validation fails with "expired" error
3. Test grace period functionality
4. Verify application shows appropriate error messages

#### Pending License Test
1. Use pending@foodmine.com license key
2. Attempt activation with hardware ID
3. Verify status changes to "active"
4. Test application recognizes activated license

#### Invalid License Test
1. Use random invalid license key
2. Verify validation fails with "invalid" error
3. Test error handling in application

### API Endpoints Reference

| Endpoint | Method | Parameters | Description |
|----------|--------|------------|-------------|
| `/validate` | GET | `license_key`, `email` | Validate license key |
| `/generate` | POST | `email`, `type`, `send_email` | Generate new license |
| `/activate` | POST | `license_key`, `hardware_id` | Activate pending license |
| `/status` | GET | `email` | Get license status by email |
| `/renew` | POST | `license_key`, `type` | Renew existing license |

## 🔧 Maintenance Guide

### Regular Maintenance Tasks

#### 1. Monitor License Usage
- **Frequency**: Weekly
- **Action**: Review Google Sheet for license status
- **Tools**: Google Sheets dashboard
- **Check**: Active licenses, expiring soon, expired licenses

#### 2. Backup License Data
- **Frequency**: Daily (automated)
- **Action**: Export Google Sheet data
- **Tools**: Google Sheets export functionality
- **Storage**: Secure cloud storage

#### 3. Update Demo Data
- **Frequency**: As needed
- **Action**: Refresh demo licenses for testing
- **Tools**: `populate-demo-sheet.gs` script
- **Check**: All license types available

#### 4. Monitor API Performance
- **Frequency**: Daily
- **Action**: Check Google Apps Script execution logs
- **Tools**: Google Apps Script dashboard
- **Check**: Response times, error rates, quota usage

### Updating the System

#### License Key Format Changes
1. Update `generateLicenseKey()` function in `license-api.gs`
2. Update `generateDemoLicense()` function in `generate-demo-licenses.js`
3. Update sample licenses in `sample-licenses.md`
4. Test with demo license tester

#### Subscription Type Changes
1. Update subscription type options in `license-portal.html`
2. Update validation logic in `license-api.gs`
3. Update demo generator in `generate-demo-licenses.js`
4. Update sample licenses and documentation

#### API Endpoint Changes
1. Update API URL in all application files
2. Update demo tester configuration
3. Update license portal configuration
4. Test all integration points

### Troubleshooting Common Issues

#### Google Apps Script Errors
- **Symptom**: API returns 500 errors
- **Solution**: Check execution logs, verify SHEET_ID, check quotas
- **Prevention**: Monitor usage, implement error handling

#### CORS Issues
- **Symptom**: Browser console shows CORS errors
- **Solution**: Verify deployment with "Anyone" access, check CORS headers
- **Prevention**: Test deployment before production use

#### License Validation Failures
- **Symptom**: Valid licenses show as invalid
- **Solution**: Check Google Sheet data, verify email matching, check expiry dates
- **Prevention**: Regular data validation, automated testing

#### Performance Issues
- **Symptom**: Slow API responses
- **Solution**: Optimize Google Sheets queries, implement caching
- **Prevention**: Monitor response times, optimize data structure

### Security Best Practices

#### API Security
- Use API keys for production deployments
- Implement rate limiting
- Monitor for suspicious activity
- Regular security audits

#### Data Security
- Limit Google Sheet access permissions
- Regular backup verification
- Secure API URL distribution
- Monitor data access logs

#### License Security
- Use cryptographically secure key generation
- Implement hardware binding
- Regular key rotation for demo licenses
- Monitor for license sharing

### Development and Testing

#### Adding New Features
1. Create feature branch
2. Update relevant files
3. Add test cases
4. Update documentation
5. Test with demo system
6. Deploy and verify

#### Testing New Releases
1. Set up isolated test environment
2. Run comprehensive test suite
3. Test all license scenarios
4. Verify API compatibility
5. Update demo data if needed

#### Performance Testing
1. Load test API endpoints
2. Test with large license datasets
3. Monitor Google Apps Script quotas
4. Optimize slow operations
5. Implement caching where appropriate

### Documentation Maintenance

#### Keep Documentation Current
- Update setup guides after any changes
- Maintain sample licenses accuracy
- Document new features and APIs
- Update troubleshooting sections

#### Version Control
- Track changes to all configuration files
- Maintain changelog
- Document breaking changes
- Provide migration guides

---

## 🚀 Getting Started

For detailed setup instructions, see [`DEMO_SETUP_GUIDE.md`](./DEMO_SETUP_GUIDE.md).

For production deployment guidance, see [`SETUP_GUIDE.md`](./SETUP_GUIDE.md).

For sample licenses and testing scenarios, see [`sample-licenses.md`](./sample-licenses.md).

---

**Last Updated**: January 2024  
**Version**: 1.0  
**Maintainer**: FoodMine Development Team