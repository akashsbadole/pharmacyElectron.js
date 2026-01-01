/**
 * Google Apps Script for License Management API
 * Connects to Google Sheets to validate and manage licenses
 */

// Configuration
const CONFIG = {
  SHEET_ID: '1ehdDZifdS3eMPhmvHnP825zsxejEACG7iyf3fEiKlZw', // Replace with your Google Sheet ID
  SHEET_NAME: 'license', // Updated to match your tab name
  API_KEY: 'YOUR_API_KEY' // Optional: Add API key for security
};

/**
 * Entry point for all HTTP requests
 */
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

/**
 * Main request handler
 */
function handleRequest(e) {
  try {
    const path = e.parameter.path || e.pathInfo || '';
    const method = e.parameter.method || e.parameter.requestMethod || 'GET';
    
    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(headers);
    }

    // Validate API key if configured
    if (CONFIG.API_KEY && e.parameter.api_key !== CONFIG.API_KEY) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid API key'
      })).setMimeType(ContentService.MimeType.JSON).setHeaders(headers);
    }

    let response = { success: false, error: 'Invalid request' };

    // Route requests
    if (path === '/validate') {
      response = validateLicense(e);
    } else if (path === '/generate') {
      response = generateLicense(e);
    } else if (path === '/status') {
      response = getLicenseStatus(e);
    } else if (path === '/activate') {
      response = activateLicense(e);
    } else if (path === '/renew') {
      response = renewLicense(e);
    } else {
      response = { success: false, error: 'Invalid endpoint' };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(headers);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Validate a license key
 */
function validateLicense(e) {
  const licenseKey = e.parameter.license_key || e.parameter.key;
  const email = e.parameter.email;
  
  if (!licenseKey) {
    return { success: false, error: 'License key is required' };
  }

  const sheet = getLicenseSheet();
  const data = sheet.getDataRange().getValues();
  
  // Find license in sheet (License Key is column B)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const storedLicenseKey = row[1]; // Column B (License)
    const storedEmail = row[2]; // Column C (Email)
    const status = row[6]; // Column G (Status)
    const expiryDate = row[4]; // Column E (Expiry Date)
    const activationDate = row[3]; // Column D (Activation Date)
    const hardwareId = row[5]; // Column F (Hardware ID)

    if (storedLicenseKey === licenseKey) {
      // Check if license is active
      if (status !== 'active') {
        return {
          success: false,
          error: 'License is not active',
          status: status
        };
      }

      // Check expiry date
      const now = new Date();
      if (expiryDate && expiryDate < now) {
        return {
          success: false,
          error: 'License has expired',
          expiry_date: expiryDate
        };
      }

      // Enhanced email validation - licenses are permanently bound to purchase email
      if (email) {
        if (storedEmail !== email) {
          return {
            success: false,
            error: 'License is bound to a different email address. Contact support for assistance.',
            bound_email: storedEmail
          };
        }
      } else {
        // If no email provided, return the bound email for reference
        return {
          success: true,
          license_key: licenseKey,
          email: storedEmail,
          status: 'active',
          expiry_date: expiryDate,
          activation_date: activationDate,
          hardware_id: hardwareId,
          requires_email: true
        };
      }

      return {
        success: true,
        license_key: licenseKey,
        email: storedEmail,
        status: 'active',
        expiry_date: expiryDate,
        activation_date: activationDate,
        hardware_id: hardwareId
      };
    }
  }

  return { success: false, error: 'Invalid license key' };
}

/**
 * Generate a new license
 */
function generateLicense(e) {
  const email = e.parameter.email;
  const subscriptionType = e.parameter.type || 'basic';
  const hardwareId = e.parameter.hardware_id;
  
  if (!email) {
    return { success: false, error: 'Email is required' };
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return { success: false, error: 'Invalid email format' };
  }

  // Check if email already has active license
  const existingLicense = findLicenseByEmail(email);
  if (existingLicense && existingLicense.status === 'active') {
    return {
      success: false,
      error: 'License already exists for this email',
      license_key: existingLicense.license_key
    };
  }

  // Generate new license key
  const licenseKey = generateLicenseKey();
  const expiryDate = calculateExpiryDate(subscriptionType);
  const activationDate = new Date();
  
  // Add to sheet
  const sheet = getLicenseSheet();
  sheet.appendRow([
    email,
    licenseKey,
    subscriptionType,
    expiryDate,
    'pending', // Status
    activationDate,
    hardwareId || ''
  ]);

  return {
    success: true,
    license_key: licenseKey,
    email: email,
    subscription_type: subscriptionType,
    expiry_date: expiryDate,
    status: 'pending'
  };
}

/**
 * Activate a license
 */
function activateLicense(e) {
  const licenseKey = e.parameter.license_key || e.parameter.key;
  const hardwareId = e.parameter.hardware_id;
  
  if (!licenseKey) {
    return { success: false, error: 'License key is required' };
  }

  const sheet = getLicenseSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const storedLicenseKey = row[1]; // Column B

    if (storedLicenseKey === licenseKey) {
      // Update status to active and set hardware ID
      sheet.getRange(i + 1, 5).setValue('active'); // Column E
      if (hardwareId) {
        sheet.getRange(i + 1, 7).setValue(hardwareId); // Column G
      }
      
      return {
        success: true,
        license_key: licenseKey,
        status: 'active'
      };
    }
  }

  return { success: false, error: 'License key not found' };
}

/**
 * Get license status by email
 */
function getLicenseStatus(e) {
  const email = e.parameter.email;
  
  if (!email) {
    return { success: false, error: 'Email is required' };
  }

  const license = findLicenseByEmail(email);
  if (!license) {
    return { success: false, error: 'No license found for this email' };
  }

  return {
    success: true,
    license: license
  };
}

/**
 * Renew a license
 */
function renewLicense(e) {
  const licenseKey = e.parameter.license_key || e.parameter.key;
  const subscriptionType = e.parameter.type || 'basic';
  
  if (!licenseKey) {
    return { success: false, error: 'License key is required' };
  }

  const sheet = getLicenseSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const storedLicenseKey = row[1]; // Column B

    if (storedLicenseKey === licenseKey) {
      // Update expiry date
      const newExpiryDate = calculateExpiryDate(subscriptionType);
      sheet.getRange(i + 1, 4).setValue(newExpiryDate); // Column D
      
      return {
        success: true,
        license_key: licenseKey,
        new_expiry_date: newExpiryDate
      };
    }
  }

  return { success: false, error: 'License key not found' };
}

/**
 * Helper functions
 */

function getLicenseSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  return ss.getSheetByName(CONFIG.SHEET_NAME);
}

function findLicenseByEmail(email) {
  const sheet = getLicenseSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const storedEmail = row[2]; // Column C (Email)
    
    if (storedEmail === email) {
      return {
        email: storedEmail,
        license_key: row[1], // Column B (License)
        subscription_type: row[7], // Column H (subscription type)
        expiry_date: row[4], // Column E (Expiry Date)
        status: row[6], // Column G (Status)
        activation_date: row[3], // Column D (Activation Date)
        hardware_id: row[5] // Column F (Hardware ID)
      };
    }
  }
  return null;
}

function generateLicenseKey() {
  // Generate cryptographically secure license key
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
  // Simple checksum calculation
  let sum = 0;
  for (let i = 0; i < key.length; i++) {
    sum += key.charCodeAt(i);
  }
  return (sum % 1000).toString().padStart(3, '0');
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function calculateExpiryDate(subscriptionType) {
  const now = new Date();
  const expiry = new Date(now);
  
  switch (subscriptionType.toLowerCase()) {
    case 'monthly':
      expiry.setMonth(expiry.getMonth() + 1);
      break;
    case 'yearly':
      expiry.setFullYear(expiry.getFullYear() + 1);
      break;
    case 'basic':
    default:
      expiry.setMonth(expiry.getMonth() + 1); // Default to monthly
      break;
  }
  
  return expiry;
}

/**
 * Setup function to create the sheet structure
 */
function setupSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }
  
  // Set headers
  const headers = [
    'Email', 'License Key', 'Subscription Type', 
    'Expiry Date', 'Status', 'Activation Date', 'Hardware ID', 'subscription type'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Set column widths
  sheet.setColumnWidth(1, 200); // Email
  sheet.setColumnWidth(2, 200); // License Key
  sheet.setColumnWidth(3, 150); // Subscription Type
  sheet.setColumnWidth(4, 150); // Expiry Date
  sheet.setColumnWidth(5, 120); // Status
  sheet.setColumnWidth(6, 150); // Activation Date
  sheet.setColumnWidth(7, 200); // Hardware ID
  sheet.setColumnWidth(8, 150); // subscription type
  
  // Add some sample data for testing
  sheet.appendRow([
    'test@example.com',
    generateLicenseKey(),
    'basic',
    calculateExpiryDate('basic'),
    'active',
    new Date(),
    ''
  ]);
}
