/**
 * Settings Management Module for Internationalized Restaurant POS
 * Handles country-specific configurations, tax settings, and regional preferences
 */

const fs = require('fs');
const path = require('path');

class SettingsManager {
  constructor() {
    this.appName = process.env.APPNAME;
    this.appData = process.env.APPDATA;
    this.settingsPath = path.join(this.appData, this.appName, 'server', 'databases', 'settings.db');
    
    // Default settings with internationalization support
    this.defaultSettings = {
      app: 'Standalone Point of Sale',
      store: 'Restaurant POS',
      address_one: '',
      address_two: '',
      contact: '',
      currency: 'INR',
      currency_symbol: '₹',
      currency_position: 'prefix',
      currency_decimal_places: 2,
      currency_thousands_separator: ',',
      currency_decimal_separator: '.',
      
      // Tax configuration
      tax_system: 'gst', // gst, vat, sales_tax, gst_hst
      tax_label: 'GST',
      tax_rate: 0,
      charge_tax: false,
      
      // Country-specific tax fields
      gstin: '',
      cgst: 0,
      sgst: 0,
      igst: 0,
      vat_number: '',
      sales_tax_id: '',
      gst_hst_number: '',
      abn: '',
      
      // Date and time formats
      date_format: 'DD/MM/YYYY',
      time_format: 'HH:mm:ss',
      
      // Business settings
      business_hours: '10:00 AM - 10:00 PM',
      default_language: 'en',
      supported_languages: ['en', 'hi', 'es', 'fr'],
      
      // Payment settings
      payment_modes: ['Cash', 'Card', 'UPI', 'Net Banking'],
      enable_tip: true,
      enable_service_charge: false,
      service_charge_rate: 0,
      enable_packaging_charge: false,
      packaging_charge_amount: 0,
      
      // Receipt settings
      receipt_footer: 'Thank you for dining with us!',
      print_language: 'english',
      kot_display_language: 'english',
      
      // Inventory settings
      enable_expiry_tracking: true,
      enable_batch_tracking: true,
      low_stock_threshold: 5,
      
      // Regional compliance
      country: 'IN',
      region: '',
      business_registration_number: '',
      
      // UPI settings (for India)
      upi_merchant_id: '',
      upi_merchant_name: '',
      
      // Backup settings
      backup_frequency: 'off',
      backup_time: '00:00',
      local_backup_folder: '',
      enable_encryption: false,
      
      // Happy hour settings
      happy_hours: [],
      
      // Print settings
      print_logo: true,
      print_tax_details: true,
      print_item_notes: true,
      
      // Kitchen display settings
      kot_display_timeout: 300, // seconds
      auto_refresh_kot: true,
      
      // Customer display settings
      customer_display_timeout: 60, // seconds
      show_prices: true,
      show_discounts: true
    };
  }
  
  /**
   * Initialize settings with country-specific defaults
   */
  async initializeSettings(countryCode = 'IN') {
    try {
      // Load country-specific defaults
      const countryDefaults = this.getCountryDefaults(countryCode);
      
      // Merge with base defaults
      const settings = { ...this.defaultSettings, ...countryDefaults };
      
      // Save to database
      await this.saveSettings(settings);
      
      return settings;
    } catch (error) {
      console.error('Error initializing settings:', error);
      throw error;
    }
  }
  
  /**
   * Get country-specific default settings
   */
  getCountryDefaults(countryCode) {
    const countryConfigs = {
      'US': {
        country: 'US',
        currency: 'USD',
        currency_symbol: '$',
        currency_position: 'prefix',
        tax_system: 'sales_tax',
        tax_label: 'Sales Tax',
        date_format: 'MM/DD/YYYY',
        business_hours: '9:00 AM - 6:00 PM',
        payment_modes: ['Cash', 'Card', 'Check', 'Gift Card'],
        supported_languages: ['en'],
        business_registration_number: 'EIN'
      },
      'UK': {
        country: 'UK',
        currency: 'GBP',
        currency_symbol: '£',
        currency_position: 'prefix',
        tax_system: 'vat',
        tax_label: 'VAT',
        date_format: 'DD/MM/YYYY',
        business_hours: '9:00 AM - 5:30 PM',
        payment_modes: ['Cash', 'Card', 'Contactless', 'Gift Card'],
        supported_languages: ['en'],
        business_registration_number: 'Company Number'
      },
      'DE': {
        country: 'DE',
        currency: 'EUR',
        currency_symbol: '€',
        currency_position: 'suffix',
        tax_system: 'vat',
        tax_label: 'MwSt',
        date_format: 'DD.MM.YYYY',
        business_hours: '9:00 - 18:00',
        payment_modes: ['Cash', 'Card', 'EC Card', 'Gift Card'],
        supported_languages: ['de', 'en'],
        business_registration_number: 'Steuernummer'
      },
      'FR': {
        country: 'FR',
        currency: 'EUR',
        currency_symbol: '€',
        currency_position: 'suffix',
        tax_system: 'vat',
        tax_label: 'TVA',
        date_format: 'DD/MM/YYYY',
        business_hours: '9:00 - 19:00',
        payment_modes: ['Cash', 'Card', 'Check', 'Gift Card'],
        supported_languages: ['fr', 'en'],
        business_registration_number: 'SIRET'
      },
      'JP': {
        country: 'JP',
        currency: 'JPY',
        currency_symbol: '¥',
        currency_position: 'prefix',
        tax_system: 'vat',
        tax_label: '消費税',
        date_format: 'YYYY/MM/DD',
        business_hours: '9:00 - 18:00',
        payment_modes: ['Cash', 'Card', 'IC Card', 'Gift Card'],
        supported_languages: ['ja', 'en'],
        business_registration_number: 'Tax ID'
      },
      'IN': {
        country: 'IN',
        currency: 'INR',
        currency_symbol: '₹',
        currency_position: 'prefix',
        tax_system: 'gst',
        tax_label: 'GST',
        date_format: 'DD/MM/YYYY',
        business_hours: '10:00 AM - 10:00 PM',
        payment_modes: ['Cash', 'Card', 'UPI', 'Net Banking'],
        supported_languages: ['en', 'hi'],
        business_registration_number: 'GSTIN'
      },
      'CA': {
        country: 'CA',
        currency: 'CAD',
        currency_symbol: 'C$',
        currency_position: 'prefix',
        tax_system: 'gst_hst',
        tax_label: 'GST/HST',
        date_format: 'DD/MM/YYYY',
        business_hours: '9:00 AM - 6:00 PM',
        payment_modes: ['Cash', 'Card', 'Interac', 'Gift Card'],
        supported_languages: ['en', 'fr'],
        business_registration_number: 'GST/HST Number'
      },
      'AU': {
        country: 'AU',
        currency: 'AUD',
        currency_symbol: 'A$',
        currency_position: 'prefix',
        tax_system: 'gst',
        tax_label: 'GST',
        date_format: 'DD/MM/YYYY',
        business_hours: '9:00 AM - 5:00 PM',
        payment_modes: ['Cash', 'Card', 'EFTPOS', 'Gift Card'],
        supported_languages: ['en'],
        business_registration_number: 'ABN'
      }
    };
    
    return countryConfigs[countryCode] || countryConfigs['IN'];
  }
  
  /**
   * Save settings to database
   */
  async saveSettings(settings) {
    try {
      const Datastore = require('@seald-io/nedb');
      const settingsDB = new Datastore({ filename: this.settingsPath, autoload: true });
      
      return new Promise((resolve, reject) => {
        settingsDB.update(
          { _id: 1 },
          { $set: { settings: settings } },
          { upsert: true },
          (err, numReplaced) => {
            if (err) {
              reject(err);
            } else {
              resolve(numReplaced);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }
  
  /**
   * Load settings from database
   */
  async loadSettings() {
    try {
      const Datastore = require('@seald-io/nedb');
      const settingsDB = new Datastore({ filename: this.settingsPath, autoload: true });
      
      return new Promise((resolve, reject) => {
        settingsDB.findOne({ _id: 1 }, (err, doc) => {
          if (err) {
            reject(err);
          } else {
            const settings = doc ? doc.settings : this.defaultSettings;
            resolve(settings);
          }
        });
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      throw error;
    }
  }
  
  /**
   * Update specific settings
   */
  async updateSettings(updates) {
    try {
      const settings = await this.loadSettings();
      const updatedSettings = { ...settings, ...updates };
      await this.saveSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }
  
  /**
   * Get currency configuration
   */
  getCurrencyConfig(currencyCode) {
    const currencyConfigs = {
      'USD': { symbol: '$', position: 'prefix', decimal_places: 2, thousands_separator: ',', decimal_separator: '.' },
      'EUR': { symbol: '€', position: 'suffix', decimal_places: 2, thousands_separator: '.', decimal_separator: ',' },
      'GBP': { symbol: '£', position: 'prefix', decimal_places: 2, thousands_separator: ',', decimal_separator: '.' },
      'JPY': { symbol: '¥', position: 'prefix', decimal_places: 0, thousands_separator: ',', decimal_separator: '.' },
      'INR': { symbol: '₹', position: 'prefix', decimal_places: 2, thousands_separator: ',', decimal_separator: '.' },
      'CAD': { symbol: 'C$', position: 'prefix', decimal_places: 2, thousands_separator: ',', decimal_separator: '.' },
      'AUD': { symbol: 'A$', position: 'prefix', decimal_places: 2, thousands_separator: ',', decimal_separator: '.' },
      'CHF': { symbol: 'CHF', position: 'suffix', decimal_places: 2, thousands_separator: "'", decimal_separator: '.' },
      'CNY': { symbol: '¥', position: 'prefix', decimal_places: 2, thousands_separator: ',', decimal_separator: '.' },
      'AED': { symbol: 'د.إ', position: 'prefix', decimal_places: 2, thousands_separator: ',', decimal_separator: '.' }
    };
    
    return currencyConfigs[currencyCode] || currencyConfigs['INR'];
  }
  
  /**
   * Get tax configuration for country
   */
  getTaxConfig(countryCode) {
    const taxConfigs = {
      'US': { system: 'sales_tax', label: 'Sales Tax', has_state_tax: true },
      'UK': { system: 'vat', label: 'VAT', standard_rate: 20 },
      'DE': { system: 'vat', label: 'MwSt', standard_rate: 19 },
      'FR': { system: 'vat', label: 'TVA', standard_rate: 20 },
      'JP': { system: 'vat', label: '消費税', standard_rate: 10 },
      'IN': { system: 'gst', label: 'GST', has_cgst_sgst: true, has_igst: true },
      'CA': { system: 'gst_hst', label: 'GST/HST', has_provincial_tax: true },
      'AU': { system: 'gst', label: 'GST', standard_rate: 10 }
    };
    
    return taxConfigs[countryCode] || taxConfigs['IN'];
  }
  
  /**
   * Validate settings
   */
  validateSettings(settings) {
    const errors = [];
    
    // Validate required fields
    if (!settings.store || settings.store.trim() === '') {
      errors.push('Store name is required');
    }
    
    if (!settings.country) {
      errors.push('Country is required');
    }
    
    if (!settings.currency) {
      errors.push('Currency is required');
    }
    
    // Validate tax settings based on tax system
    if (settings.charge_tax) {
      if (settings.tax_system === 'gst' && !settings.gstin) {
        errors.push('GSTIN is required when GST is enabled');
      }
      
      if (settings.tax_system === 'vat' && !settings.vat_number) {
        errors.push('VAT Number is required when VAT is enabled');
      }
      
      if (settings.tax_system === 'sales_tax' && settings.tax_rate <= 0) {
        errors.push('Sales tax rate must be greater than 0');
      }
    }
    
    // Validate currency settings
    if (settings.currency_decimal_places < 0 || settings.currency_decimal_places > 4) {
      errors.push('Currency decimal places must be between 0 and 4');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * Get available countries
   */
  getAvailableCountries() {
    return [
      { code: 'US', name: 'United States', currency: 'USD', tax_system: 'sales_tax' },
      { code: 'UK', name: 'United Kingdom', currency: 'GBP', tax_system: 'vat' },
      { code: 'DE', name: 'Germany', currency: 'EUR', tax_system: 'vat' },
      { code: 'FR', name: 'France', currency: 'EUR', tax_system: 'vat' },
      { code: 'JP', name: 'Japan', currency: 'JPY', tax_system: 'vat' },
      { code: 'IN', name: 'India', currency: 'INR', tax_system: 'gst' },
      { code: 'CA', name: 'Canada', currency: 'CAD', tax_system: 'gst_hst' },
      { code: 'AU', name: 'Australia', currency: 'AUD', tax_system: 'gst' }
    ];
  }
  
  /**
   * Get available currencies
   */
  getAvailableCurrencies() {
    return [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' }
    ];
  }
  
  /**
   * Get available languages
   */
  getAvailableLanguages() {
    return [
      { code: 'en', name: 'English', native_name: 'English' },
      { code: 'hi', name: 'Hindi', native_name: 'हिन्दी' },
      { code: 'es', name: 'Spanish', native_name: 'Español' },
      { code: 'fr', name: 'French', native_name: 'Français' },
      { code: 'de', name: 'German', native_name: 'Deutsch' },
      { code: 'ja', name: 'Japanese', native_name: '日本語' },
      { code: 'zh', name: 'Chinese', native_name: '中文' },
      { code: 'ar', name: 'Arabic', native_name: 'العربية' }
    ];
  }
  
  /**
   * Format currency based on settings
   */
  formatCurrency(amount, settings = null) {
    if (!settings) {
      settings = this.defaultSettings;
    }
    
    const config = this.getCurrencyConfig(settings.currency);
    const decimalPlaces = settings.currency_decimal_places || config.decimal_places;
    
    // Handle JPY special case (no decimal places)
    if (settings.currency === 'JPY') {
      amount = Math.round(amount);
    }
    
    const formattedAmount = amount.toLocaleString(undefined, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });
    
    if (config.position === 'prefix') {
      return config.symbol + formattedAmount;
    } else {
      return formattedAmount + ' ' + config.symbol;
    }
  }
  
  /**
   * Parse currency string to number
   */
  parseCurrency(formattedAmount, settings = null) {
    if (!settings) {
      settings = this.defaultSettings;
    }
    
    const config = this.getCurrencyConfig(settings.currency);
    
    // Remove currency symbol and format separators
    let cleanAmount = formattedAmount.replace(config.symbol, '').trim();
    
    // Replace thousands separator with nothing and decimal separator with dot
    cleanAmount = cleanAmount.replace(new RegExp('\\' + config.thousands_separator, 'g'), '');
    cleanAmount = cleanAmount.replace(config.decimal_separator, '.');
    
    return parseFloat(cleanAmount);
  }
}

// Export for use in other modules
module.exports = SettingsManager;