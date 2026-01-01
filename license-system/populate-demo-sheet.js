/**
 * Node.js Utility for Populating Demo License Data
 * 
 * This script provides Node.js functions to populate demo license data
 * for testing purposes. It can be used as a standalone utility or integrated
 * into larger Node.js applications.
 * 
 * Installation Instructions:
 * 1. Ensure you have Node.js installed
 * 2. Install required dependencies: npm install
 * 3. Configure the CONFIG object with your settings
 * 4. Run the script: node populate-demo-sheet.js
 */

// Configuration - Update these values for your setup
const CONFIG = {
  SHEET_ID: '1ehdDZifdS3eMPhmvHnP825zsxejEACG7iyf3fEiKlZw', // Replace with your Google Sheet ID
  SHEET_NAME: 'license', // Sheet name (must match your license sheet)
  API_KEY: 'YOUR_API_KEY' // Optional: Add API key for security
};

/**
 * Main function to populate the demo sheet with sample license data
 * Clears existing data (keeping header) and adds demo licenses
 */
function populateDemoSheet() {
  try {
    // Clear existing demo data first
    clearDemoData();
    
    // Add demo licenses
    addDemoLicense(
      'demo@foodmine.com', 
      'ABC12-DEF34-GHI56-JKL78-MNO90-123', 
      'basic', 
      'active'
    );
    
    addDemoLicense(
      'pro@foodmine.com', 
      'PRO45-67890-ABCDE-FGHIJ-KLMNO-456', 
      'pro', 
      'active'
    );
    
    addDemoLicense(
      'enterprise@foodmine.com', 
      'ENT78-90123-ABCDE-FGHIJ-KLMNO-789', 
      'enterprise', 
      'active'
    );
    
    // Add expired license (15 days ago)
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 15);
    
    addDemoLicense(
      'expired@foodmine.com', 
      'EXP12-34567-ABCDE-FGHIJ-KLMNO-012', 
      'basic', 
      'expired',
      expiredDate
    );
    
    // Add pending license
    addDemoLicense(
      'pending@foodmine.com', 
      'PND45-67890-ABCDE-FGHIJ-KLMNO-345', 
      'basic', 
      'pending'
    );
    
    // Add test license
    addDemoLicense(
      'test@foodmine.com', 
      'TEST1-23456-ABCDE-FGHIJ-KLMNO-678', 
      'basic', 
      'active'
    );
    
    return {
      success: true,
      message: 'Demo sheet populated successfully with 6 sample licenses',
      count: 6
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Add a single demo license to the sheet
 * @param {string} email - License holder email
 * @param {string} licenseKey - License key
 * @param {string} subscriptionType - Subscription type (basic, pro, enterprise)
 * @param {string} status - License status (active, pending, expired)
 * @param {Date} expiryDate - Optional expiry date (if not provided, calculated based on type)
 */
function addDemoLicense(email, licenseKey, subscriptionType, status, expiryDate) {
  try {
    const sheet = getLicenseSheet();
    
    // Calculate expiry date if not provided
    if (!expiryDate) {
      expiryDate = calculateExpiryDate(subscriptionType);
    }
    
    const activationDate = new Date();
    const hardwareId = ''; // Empty for demo
    
    // Add to sheet
    sheet.appendRow([
      email,
      licenseKey,
      subscriptionType,
      expiryDate,
      status,
      activationDate,
      hardwareId,
      subscriptionType // Also store in the subscription type column
    ]);
    
    return {
      success: true,
      license_key: licenseKey,
      email: email,
      status: status
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      license_key: licenseKey
    };
  }
}

/**
 * Clear all demo data from the sheet (keeps header)
 */
function clearDemoData() {
  try {
    const sheet = getLicenseSheet();
    const data = sheet.getDataRange().getValues();
    
    // Keep header row, clear everything else
    if (data.length > 1) {
      sheet.deleteRows(2, data.length - 1);
    }
    
    return {
      success: true,
      message: 'Demo data cleared successfully'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all current demo licenses from the sheet
 * @returns {Array} Array of license objects
 */
function getDemoLicenses() {
  try {
    const sheet = getLicenseSheet();
    const data = sheet.getDataRange().getValues();
    const licenses = [];
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      licenses.push({
        email: row[0] || '',
        license_key: row[1] || '',
        subscription_type: row[2] || '',
        expiry_date: row[3] || '',
        status: row[4] || '',
        activation_date: row[5] || '',
        hardware_id: row[6] || '',
        subscription_type_col: row[7] || ''
      });
    }
    
    return {
      success: true,
      licenses: licenses,
      count: licenses.length
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test all demo licenses by validating them
 * @returns {Array} Array of validation results
 */
function testDemoLicenses() {
  try {
    const licenses = getDemoLicenses();
    if (!licenses.success) {
      return licenses;
    }
    
    const results = [];
    
    for (const license of licenses.licenses) {
      const result = validateLicense({
        parameter: {
          license_key: license.license_key,
          email: license.email
        }
      });
      
      results.push({
        license_key: license.license_key,
        email: license.email,
        expected_status: license.status,
        validation_result: result
      });
    }
    
    return {
      success: true,
      results: results,
      total_licenses: results.length,
      valid_licenses: results.filter(r => r.validation_result.success).length
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Setup function to create the sheet structure if it doesn't exist
 */
function setupSheet() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    }
    
    // Set headers (matching the license-api.gs structure)
    const headers = [
      'Email', 'License Key', 'Subscription Type', 
      'Expiry Date', 'Status', 'Activation Date', 'Hardware ID', 'subscription type'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Set column widths for better readability
    sheet.setColumnWidth(1, 200); // Email
    sheet.setColumnWidth(2, 200); // License Key
    sheet.setColumnWidth(3, 150); // Subscription Type
    sheet.setColumnWidth(4, 150); // Expiry Date
    sheet.setColumnWidth(5, 120); // Status
    sheet.setColumnWidth(6, 150); // Activation Date
    sheet.setColumnWidth(7, 200); // Hardware ID
    sheet.setColumnWidth(8, 150); // subscription type
    
    // Add some basic formatting
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f0f0f0');
    
    return {
      success: true,
      message: 'Sheet structure created successfully'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Helper functions (copied from license-api.gs for consistency)
 */

function getLicenseSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  return ss.getSheetByName(CONFIG.SHEET_NAME);
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
    case 'pro':
    case 'enterprise':
    default:
      expiry.setMonth(expiry.getMonth() + 1); // Default to monthly
      break;
  }
  
  return expiry;
}

/**
 * Validate a license key (copied from license-api.gs)
 * This function is used by testDemoLicenses()
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
    const storedEmail = row[0]; // Column A (Email)
    const status = row[4]; // Column E (Status)
    const expiryDate = row[3]; // Column D (Expiry Date)
    const activationDate = row[5]; // Column F (Activation Date)
    const hardwareId = row[6]; // Column G (Hardware ID)

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
 * Example usage functions for testing
 */

/**
 * Quick test function to populate and test demo data
 */
function quickDemoTest() {
  const setupResult = setupSheet();
  const populateResult = populateDemoSheet();
  const testResult = testDemoLicenses();
  
  return {
    setup: setupResult,
    populate: populateResult,
    test: testResult
  };
}

/**
 * Get a summary of the current sheet status
 */
function getSheetSummary() {
  try {
    const sheet = getLicenseSheet();
    const data = sheet.getDataRange().getValues();
    
    const summary = {
      total_rows: data.length,
      header_row: data[0],
      license_count: data.length - 1,
      active_licenses: 0,
      pending_licenses: 0,
      expired_licenses: 0,
      basic_licenses: 0,
      pro_licenses: 0,
      enterprise_licenses: 0
    };
    
    // Count licenses by status and type
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[4] || '';
      const type = row[2] || '';
      
      switch (status.toLowerCase()) {
        case 'active':
          summary.active_licenses++;
          break;
        case 'pending':
          summary.pending_licenses++;
          break;
        case 'expired':
          summary.expired_licenses++;
          break;
      }
      
      switch (type.toLowerCase()) {
        case 'basic':
          summary.basic_licenses++;
          break;
        case 'pro':
          summary.pro_licenses++;
          break;
        case 'enterprise':
          summary.enterprise_licenses++;
          break;
      }
    }
    
    return {
      success: true,
      summary: summary
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Export functions for use in other modules
module.exports = {
  populateDemoSheet,
  addDemoLicense,
  clearDemoData,
  getDemoLicenses,
  testDemoLicenses,
  setupSheet,
  quickDemoTest,
  getSheetSummary,
  validateLicense,
  calculateExpiryDate
};
