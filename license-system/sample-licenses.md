# Sample Licenses for Demo Purposes

This file contains sample license keys and data for testing and demonstration purposes.

## License Key Format

License keys are generated in the format: `XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXX`

Where:
- Each X is a random alphanumeric character
- The final XXX is a checksum for validation
- Total length: 32 characters

## Demo License Keys

### Basic Subscription (1 month)
- **License Key**: `ABC12-DEF34-GHI56-JKL78-MNO90-123`
- **Email**: `demo@foodmine.com`
- **Status**: `active`
- **Expiry Date**: 30 days from activation
- **Hardware ID**: `DEMO-HW-ID-001`

### Pro Subscription (1 month)
- **License Key**: `PRO45-67890-ABCDE-FGHIJ-KLMNO-456`
- **Email**: `pro@foodmine.com`
- **Status**: `active`
- **Expiry Date**: 30 days from activation
- **Hardware ID**: `DEMO-HW-ID-002`

### Enterprise Subscription (1 month)
- **License Key**: `ENT78-90123-ABCDE-FGHIJ-KLMNO-789`
- **Email**: `enterprise@foodmine.com`
- **Status**: `active`
- **Expiry Date**: 30 days from activation
- **Hardware ID**: `DEMO-HW-ID-003`

### Expired License (for testing grace period)
- **License Key**: `EXP12-34567-ABCDE-FGHIJ-KLMNO-012`
- **Email**: `expired@foodmine.com`
- **Status**: `active`
- **Expiry Date**: 15 days ago
- **Hardware ID**: `DEMO-HW-ID-004`

### Pending Activation License
- **License Key**: `PND45-67890-ABCDE-FGHIJ-KLMNO-345`
- **Email**: `pending@foodmine.com`
- **Status**: `pending`
- **Expiry Date**: 30 days from activation
- **Hardware ID**: `DEMO-HW-ID-005`

## Google Sheet Data Format

To use these sample licenses, add them to your Google Sheet with the following column structure:

| Email | License Key | Subscription Type | Expiry Date | Status | Activation Date | Hardware ID | subscription type |
|-------|-------------|-------------------|-------------|--------|-----------------|-------------|-------------------|
| demo@foodmine.com | ABC12-DEF34-GHI56-JKL78-MNO90-123 | basic | [30 days from today] | active | [today's date] | DEMO-HW-ID-001 | basic |
| pro@foodmine.com | PRO45-67890-ABCDE-FGHIJ-KLMNO-456 | pro | [30 days from today] | active | [today's date] | DEMO-HW-ID-002 | pro |
| enterprise@foodmine.com | ENT78-90123-ABCDE-FGHIJ-KLMNO-789 | enterprise | [30 days from today] | active | [today's date] | DEMO-HW-ID-003 | enterprise |
| expired@foodmine.com | EXP12-34567-ABCDE-FGHIJ-KLMNO-012 | basic | [15 days ago] | active | [15 days ago] | DEMO-HW-ID-004 | basic |
| pending@foodmine.com | PND45-67890-ABCDE-FGHIJ-KLMNO-345 | basic | [30 days from today] | pending | [today's date] | DEMO-HW-ID-005 | basic |

## Test Scenarios

### 1. Valid License Test
Use any of the active licenses (demo@foodmine.com, pro@foodmine.com, enterprise@foodmine.com) to test successful license validation.

### 2. Expired License Test
Use the expired license (expired@foodmine.com) to test:
- License expiry handling
- Grace period functionality (7 days)
- License renewal process

### 3. Pending License Test
Use the pending license (pending@foodmine.com) to test:
- License activation workflow
- Hardware binding process

### 4. Invalid License Test
Use any random license key to test error handling for invalid licenses.

## License Generation Script

To generate additional demo licenses, you can use this JavaScript function:

```javascript
function generateDemoLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    
    // Generate 5 groups of 5 characters each
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (i < 4) key += '-';
    }
    
    // Add checksum for validation
    const checksum = calculateChecksum(key);
    key += '-' + checksum;
    
    return key;
}

function calculateChecksum(key) {
    let sum = 0;
    for (let i = 0; i < key.length; i++) {
        sum += key.charCodeAt(i);
    }
    return (sum % 1000).toString().padStart(3, '0');
}
```

## Important Notes

1. **Demo licenses are for testing only** - Do not use these in production
2. **Hardware binding** - Each license is bound to a specific hardware ID
3. **Email binding** - Licenses are permanently bound to the purchase email
4. **Grace period** - Expired licenses have 7 days of grace period
5. **Subscription types** - Basic, Pro, and Enterprise have different feature sets

## Testing License API

You can test the license API endpoints with these sample licenses:

### Validate License
```
GET /?path=/validate&license_key=ABC12-DEF34-GHI56-JKL78-MNO90-123&email=demo@foodmine.com
```

### Activate License
```
POST /?path=/activate
{
  "license_key": "PND45-67890-ABCDE-FGHIJ-KLMNO-345",
  "email": "pending@foodmine.com",
  "hardware_id": "DEMO-HW-ID-005"
}
```

### Check License Status
```
GET /?path=/status&email=demo@foodmine.com
```

## Resetting Demo Data

To reset the demo data, you can:

1. Clear all rows in your Google Sheet except the header
2. Re-run the `setupSheet()` function in the Google Apps Script
3. Add the sample licenses from this file to test specific scenarios

## Security Reminder

These sample licenses are for demonstration and testing purposes only. In a production environment:

1. Use cryptographically secure license generation
2. Implement proper API key authentication
3. Add rate limiting to prevent abuse
4. Monitor license usage and suspicious activity
5. Regularly backup your license database