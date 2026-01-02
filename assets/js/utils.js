/**
 * Browser-compatible utility functions for StyleMine Compact
 * No Node.js dependencies required
 */

// Date formatting constants
const DATE_FORMAT = "DD-MMM-YYYY";

// Money formatting function
const moneyFormat = (amount, locale = "en-IN") => {
  if (typeof amount === 'string') {
    amount = parseFloat(amount.replace(/[^\d.-]/g, ''));
  }
  
  if (isNaN(amount)) {
    return '0';
  }
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/** Date functions **/
const isExpired = (dueDate) => {
  try {
    const todayDate = new Date();
    const expiryDate = new Date(dueDate);
    return todayDate >= expiryDate;
  } catch (error) {
    console.warn('Invalid date for expiration check:', dueDate);
    return false;
  }
};

const daysToExpire = (dueDate) => {
  try {
    const todayDate = new Date();
    const expiryDate = new Date(dueDate);
    
    if (expiryDate <= todayDate) {
      return 0;
    }
    
    const timeDiff = expiryDate.getTime() - todayDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  } catch (error) {
    console.warn('Invalid date for days to expire calculation:', dueDate);
    return 0;
  }
};

/** Inventory functions **/
/**
 * Determines the stock status based on current stock and minimum stock levels.
 *
 * @param {number} currentStock - The current quantity of stock.
 * @param {number} minimumStock - The minimum required quantity of stock.
 * @returns {number} - Returns 0 if there is no stock, -1 if the stock is low, and 1 if the stock level is normal.
 */
const getStockStatus = (currentStock, minimumStock) => {
  currentStock = Number(currentStock);
  minimumStock = Number(minimumStock);

  if (isNaN(currentStock) || isNaN(minimumStock)) {
    console.warn("Invalid stock input: both currentStock and minimumStock should be numbers.");
    return 0;
  }

  if (currentStock <= 0) {
    return 0; // No stock
  }

  if (currentStock <= minimumStock) {
    return -1; // Low stock
  }
  return 1; // Normal stock
};

/** File utilities (browser-compatible) **/
const checkFileExists = (filePath) => {
  // In browser environment, we can't check file existence like Node.js
  // This is a placeholder that always returns true
  return true;
};

const checkFileType = (fileType, validFileTypes) => {
  return validFileTypes.includes(fileType);
};

const getFileHash = (filePath) => {
  // Browser-compatible hash calculation
  // This is a simplified version for browser use
  console.warn('File hashing not implemented in browser environment');
  return 'browser-hash-placeholder';
};

// Filter file function (for file uploads)
const filterFile = (req, file, callback) => {
  try {
    const validFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const isValidFile = checkFileType(file.mimetype, validFileTypes);
    if (isValidFile) {
      return callback(null, true);
    } else {
      return callback(new Error(`Invalid file type. Only JPEG, PNG, GIF, and WEBP files are allowed.`), false);
    }
  } catch (err) {
    return callback(new Error(`An error occurred: ${err}`), false);
  }
};

/** Security functions **/
const setContentSecurityPolicy = () => {
  try {
    // Browser-compatible CSP setting for pharmacy app
    const content = `default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://code.jquery.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:; connect-src 'self' http://localhost:49499 http://localhost:* https: wss: ws:; media-src 'self' data: blob:; frame-src 'none'; object-src 'none';`;
    
    let metaTag = document.createElement("meta");
    metaTag.setAttribute("http-equiv", "Content-Security-Policy");
    metaTag.setAttribute("content", content);
    
    // Remove existing CSP if any
    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (existingCSP) {
      existingCSP.remove();
    }
    
    document.head.appendChild(metaTag);
    console.log('Content Security Policy set successfully');
  } catch (error) {
    console.warn('Failed to set Content Security Policy:', error);
  }
};

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    DATE_FORMAT,
    moneyFormat,
    isExpired,
    getStockStatus,
    getFileHash,
    daysToExpire,
    checkFileExists,
    checkFileType,
    setContentSecurityPolicy
  };
} else {
  // Browser environment
  window.utils = {
    DATE_FORMAT,
    moneyFormat,
    isExpired,
    getStockStatus,
    getFileHash,
    daysToExpire,
    checkFileExists,
    checkFileType,
    setContentSecurityPolicy
  };
}
