/**
 * Demo License Generator for FoodMine License System
 * Generates sample license keys for testing and demonstration purposes
 */

/**
 * Generate a cryptographically secure license key
 */
function generateLicenseKey() {
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

/**
 * Calculate checksum for license key validation
 */
function calculateChecksum(key) {
    let sum = 0;
    for (let i = 0; i < key.length; i++) {
        sum += key.charCodeAt(i);
    }
    return (sum % 1000).toString().padStart(3, '0');
}

/**
 * Calculate expiry date based on subscription type
 */
function calculateExpiryDate(subscriptionType = 'basic') {
    const now = new Date();
    const expiry = new Date(now);
    
    switch (subscriptionType.toLowerCase()) {
        case 'monthly':
        case 'basic':
        case 'pro':
        case 'enterprise':
            expiry.setMonth(expiry.getMonth() + 1);
            break;
        case 'yearly':
            expiry.setFullYear(expiry.getFullYear() + 1);
            break;
        default:
            expiry.setMonth(expiry.getMonth() + 1);
            break;
    }
    
    return expiry;
}

/**
 * Generate a demo license object
 */
function generateDemoLicense(subscriptionType = 'basic', email = null) {
    const licenseKey = generateLicenseKey();
    const expiryDate = calculateExpiryDate(subscriptionType);
    const activationDate = new Date();
    
    return {
        email: email || `demo-${subscriptionType}@foodmine.com`,
        license_key: licenseKey,
        subscription_type: subscriptionType,
        expiry_date: expiryDate,
        status: 'active',
        activation_date: activationDate,
        hardware_id: `DEMO-HW-ID-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
    };
}

/**
 * Generate multiple demo licenses
 */
function generateDemoLicenses(count = 5) {
    const licenses = [];
    const types = ['basic', 'pro', 'enterprise'];
    
    for (let i = 0; i < count; i++) {
        const type = types[i % types.length];
        const email = `demo-${type}-${i + 1}@foodmine.com`;
        licenses.push(generateDemoLicense(type, email));
    }
    
    return licenses;
}

/**
 * Generate expired license for testing
 */
function generateExpiredLicense(subscriptionType = 'basic') {
    const license = generateDemoLicense(subscriptionType);
    // Set expiry date to 15 days ago
    license.expiry_date = new Date();
    license.expiry_date.setDate(license.expiry_date.getDate() - 15);
    return license;
}

/**
 * Generate pending license for testing
 */
function generatePendingLicense(subscriptionType = 'basic') {
    const license = generateDemoLicense(subscriptionType);
    license.status = 'pending';
    return license;
}

/**
 * Export functions for use in other modules
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateLicenseKey,
        calculateChecksum,
        calculateExpiryDate,
        generateDemoLicense,
        generateDemoLicenses,
        generateExpiredLicense,
        generatePendingLicense
    };
}

// Example usage:
// const demoLicense = generateDemoLicense('pro', 'test@example.com');
// console.log('Generated License:', demoLicense);

// const multipleLicenses = generateDemoLicenses(10);
// console.log('Generated 10 licenses:', multipleLicenses);

// const expiredLicense = generateExpiredLicense('basic');
// console.log('Expired license for testing:', expiredLicense);

// const pendingLicense = generatePendingLicense('enterprise');
// console.log('Pending license for testing:', pendingLicense);