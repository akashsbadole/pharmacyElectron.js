/**
 * Language Support Module for PharmaMine Restaurant POS
 * Provides multilingual support for printouts and displays
 */

// Language constants and translations
const LanguageSupport = {
  // English to Hindi translations for common receipt/bill terms
  translations: {
    en: {
      // Receipt headers
      'store_name': 'Store Name',
      'address': 'Address',
      'contact': 'Contact',
      'tax_number': 'Tax Number',
      'gstin': 'GSTIN',
      
      // Order information
      'order_no': 'Order No',
      'ref_no': 'Ref No',
      'customer': 'Customer',
      'cashier': 'Cashier',
      'date': 'Date',
      'time': 'Time',
      
      // Table headers
      'item': 'Item',
      'quantity': 'Qty',
      'price': 'Price',
      'subtotal': 'Subtotal',
      'discount': 'Discount',
      'tax': 'Tax',
      'service_charge': 'Service Charge',
      'tip': 'Tip',
      'total': 'Total',
      'paid': 'Paid',
      'change': 'Change',
      'method': 'Method',
      
      // Payment methods
      'cash': 'Cash',
      'card': 'Card',
      'upi': 'UPI',
      'net_banking': 'Net Banking',
      
      // KOT specific terms
      'kitchen_order_ticket': 'KITCHEN ORDER TICKET',
      'table': 'Table',
      'notes': 'Notes',
      'priority': 'Priority',
      'normal': 'Normal',
      'urgent': 'Urgent',
      
      // Status terms
      'new': 'NEW',
      'preparing': 'PREPARING',
      'ready': 'READY',
      
      // Order types
      'dine_in': 'Dine-in',
      'takeaway': 'Takeaway',
      'delivery': 'Delivery',
      
      // Customer terms
      'walk_in_customer': 'Walk in customer',
      
      // Footer
      'thank_you': 'Thank You',
      'visit_again': 'Visit Again',
      
      // Additional terms
      'packaging_fee': 'Packaging Fee',
      'vat': 'VAT',
      'service_tax': 'Service Tax'
    },
    
    hi: {
      // Receipt headers (Hindi translations)
      'store_name': 'दुकान का नाम',
      'address': 'पता',
      'contact': 'संपर्क',
      'tax_number': 'कर संख्या',
      'gstin': 'जीएसटीआईएन',
      
      // Order information
      'order_no': 'ऑर्डर नंबर',
      'ref_no': 'रेफ नंबर',
      'customer': 'ग्राहक',
      'cashier': 'कैशियर',
      'date': 'दिनांक',
      'time': 'समय',
      
      // Table headers
      'item': 'वस्तु',
      'quantity': 'मात्रा',
      'price': 'कीमत',
      'subtotal': 'उप-योग',
      'discount': 'छूट',
      'tax': 'कर',
      'service_charge': 'सेवा शुल्क',
      'tip': 'टिप',
      'total': 'कुल',
      'paid': 'भुगतान',
      'change': 'बचत',
      'method': 'तरीका',
      
      // Payment methods
      'cash': 'नकद',
      'card': 'कार्ड',
      'upi': 'यूपीआई',
      'net_banking': 'नेट बैंकिंग',
      
      // KOT specific terms
      'kitchen_order_ticket': 'रसोई ऑर्डर टिकट',
      'table': 'टेबल',
      'notes': 'नोट्स',
      'priority': 'प्राथमिकता',
      'normal': 'सामान्य',
      'urgent': 'तत्काल',
      
      // Status terms
      'new': 'नया',
      'preparing': 'तैयार हो रहा',
      'ready': 'तैयार',
      
      // Order types
      'dine_in': 'डाइन-इन',
      'takeaway': 'टेकअवे',
      'delivery': 'डिलीवरी',
      
      // Customer terms
      'walk_in_customer': 'वॉक-इन ग्राहक',
      
      // Footer
      'thank_you': 'धन्यवाद',
      'visit_again': 'फिर मिलें',
      
      // Additional terms
      'packaging_fee': 'पैकेजिंग शुल्क',
      'vat': 'वैट',
      'service_tax': 'सेवा कर'
    }
  },

  /**
   * Get translated text based on current language setting
   * @param {string} key - Translation key
   * @param {string} language - Target language (en/hi)
   * @returns {string} Translated text
   */
  getText: function(key, language = 'en') {
    if (!this.translations[language] || !this.translations[language][key]) {
      // Fallback to English if translation not found
      return this.translations.en[key] || key;
    }
    return this.translations[language][key];
  },

  /**
   * Get bilingual text (English + Hindi)
   * @param {string} key - Translation key
   * @returns {string} Bilingual text
   */
  getBilingualText: function(key) {
    const english = this.getText(key, 'en');
    const hindi = this.getText(key, 'hi');
    return `${english} (${hindi})`;
  },

  /**
   * Format currency amount with proper locale
   * @param {number} amount - Amount to format
   * @param {string} symbol - Currency symbol
   * @returns {string} Formatted amount
   */
  formatCurrency: function(amount, symbol = '₹') {
    return `${symbol}${parseFloat(amount).toFixed(2)}`;
  },

  /**
   * Get current language preference from settings
   * @returns {string} Current language setting
   */
  getCurrentPrintLanguage: function() {
    if (window.settings && window.settings.print_language) {
      return window.settings.print_language;
    }
    return 'english'; // Default to English
  },

  /**
   * Get current KOT display language from settings
   * @returns {string} Current KOT display language
   */
  getCurrentKOTLanguage: function() {
    if (window.settings && window.settings.kot_display_language) {
      return window.settings.kot_display_language;
    }
    return 'english'; // Default to English
  },

  /**
   * Generate multilingual receipt content
   * @param {Object} receiptData - Receipt data object
   * @returns {string} Multilingual HTML content
   */
  generateMultilingualReceipt: function(receiptData) {
    const printLanguage = this.getCurrentPrintLanguage();
    const lang = printLanguage === 'bilingual' ? 'en' : printLanguage;
    
    const getTrans = (key) => {
      if (printLanguage === 'bilingual') {
        return this.getBilingualText(key);
      }
      return this.getText(key, lang);
    };

    // Generate receipt based on language preference
    return this.buildReceiptHTML(receiptData, getTrans, printLanguage);
  },

  /**
   * Build receipt HTML with multilingual support
   * @param {Object} data - Receipt data
   * @param {Function} getTrans - Translation function
   * @param {string} printLanguage - Current print language setting
   * @returns {string} HTML content
   */
  buildReceiptHTML: function(data, getTrans, printLanguage) {
    const currencySymbol = data.currencySymbol || '₹';
    const logo = data.logo || '';
    
    // Build items table
    let itemsHtml = '';
    data.items.forEach(item => {
      const modifierText = item.modifiers && item.modifiers.length > 0 ? 
        ` (${item.modifiers.map(m => m.name).join(', ')})` : '';
      
      const itemName = printLanguage === 'bilingual' && item.hindi_name ? 
        `${item.product_name} (${item.hindi_name})` : item.product_name;
      
      itemsHtml += `<tr><td>${itemName}${modifierText}</td><td>${item.quantity}</td><td class="text-right">${this.formatCurrency(item.price * item.quantity, currencySymbol)}</td></tr>`;
    });

    // Build tax and charge rows
    let taxRow = '';
    if (data.tax > 0) {
      taxRow = `<tr><td>${getTrans('tax')} (${data.taxRate}%)</td><td>:</td><td class="text-right">${this.formatCurrency(data.tax, currencySymbol)}</td></tr>`;
    }

    let serviceChargeRow = '';
    if (data.serviceCharge > 0) {
      serviceChargeRow = `<tr><td>${getTrans('service_charge')} (${data.serviceChargeRate}%)</td><td>:</td><td class="text-right">${this.formatCurrency(data.serviceCharge, currencySymbol)}</td></tr>`;
    }

    let tipRow = '';
    if (data.tipAmount > 0) {
      tipRow = `<tr><td>${getTrans('tip')} (${data.tipPercentage}%)</td><td>:</td><td class="text-right">${this.formatCurrency(data.tipAmount, currencySymbol)}</td></tr>`;
    }

    // Build payment section
    let paymentHtml = '';
    if (data.paid && parseFloat(data.paid) > 0) {
      paymentHtml = `
        <tr><td>${getTrans('paid')}</td><td>:</td><td class="text-right">${this.formatCurrency(data.paid, currencySymbol)}</td></tr>
        <tr><td>${getTrans('change')}</td><td>:</td><td class="text-right">${this.formatCurrency(data.change, currencySymbol)}</td></tr>
        <tr><td>${getTrans('method')}</td><td>:</td><td class="text-right">${getTrans(data.paymentType.toLowerCase())}</td></tr>
      `;
    }

    // Apply font family for Hindi text if needed
    const fontFamily = printLanguage === 'bilingual' || printLanguage === 'hindi' ? 
      "font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, 'Devanagari Sangam MN';" : 
      "font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;";

    return `
      <div style="font-size: 10px; ${fontFamily}">
        <p style="text-align: center;">
          ${logo ? `<img style='max-width: 50px' src='${logo}' /><br>` : ''}
          <span style="font-size: 22px;">${data.storeName}</span> <br>
          ${data.addressOne} <br>
          ${data.addressTwo} <br>
          ${data.contact ? `Tel: ${data.contact}<br>` : ''}
          ${data.taxNumber ? `${getTrans('tax_number')}: ${data.taxNumber}<br>` : ''}
        </p>
        <hr>
        <left>
          <p>
            ${getTrans('order_no')}: ${data.orderNumber} <br>
            ${getTrans('ref_no')}: ${data.refNumber || data.orderNumber} <br>
            ${getTrans('customer')}: ${data.customer || getTrans('walk_in_customer')} <br>
            ${getTrans('cashier')}: ${data.cashier} <br>
            ${getTrans('date')}: ${data.date}<br>
          </p>
        </left>
        <hr>
        <table width="90%">
          <thead>
            <tr>
              <th>${getTrans('item')}</th>
              <th>${getTrans('quantity')}</th>
              <th class="text-right">${getTrans('price')}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr><td colspan="3"><hr></td></tr>
            <tr>
              <td><b>${getTrans('subtotal')}</b></td>
              <td>:</td>
              <td class="text-right"><b>${this.formatCurrency(data.subtotal, currencySymbol)}</b></td>
            </tr>
            <tr>
              <td>${getTrans('discount')}</td>
              <td>:</td>
              <td class="text-right">${data.discount > 0 ? this.formatCurrency(data.discount, currencySymbol) : ''}</td>
            </tr>
            ${serviceChargeRow}
            ${tipRow}
            ${taxRow}
            <tr>
              <td><h5>${getTrans('total')}</h5></td>
              <td><h5>:</h5></td>
              <td class="text-right"><h5>${this.formatCurrency(data.total, currencySymbol)}</h5></td>
            </tr>
            ${paymentHtml}
          </tbody>
        </table>
        <br>
        <hr>
        <br>
        <p style="text-align: center;">
          ${data.footer || `${getTrans('thank_you')}! ${getTrans('visit_again')}!`}
        </p>
      </div>
    `;
  },

  /**
   * Generate multilingual KOT content
   * @param {Object} orderData - KOT order data
   * @returns {string} Multilingual HTML content
   */
  generateMultilingualKOT: function(orderData) {
    const kotLanguage = this.getCurrentKOTLanguage();
    
    const getTrans = (key) => {
      if (kotLanguage === 'bilingual') {
        return this.getBilingualText(key);
      }
      return this.getText(key, kotLanguage);
    };

    // Build items with Hindi names if available
    let itemsHtml = '';
    orderData.items.forEach(item => {
      const modifierText = item.modifiers && item.modifiers.length > 0 ? 
        ` (${item.modifiers.map(m => m.name).join(', ')})` : '';
      
      const itemName = (kotLanguage === 'hindi' || kotLanguage === 'bilingual') && item.hindi_name ? 
        `${item.product_name} (${item.hindi_name})` : item.product_name;
      
      itemsHtml += `<tr><td>${itemName}${modifierText}</td><td>${item.quantity}</td><td>${item.special_instructions || ''}</td></tr>`;
    });

    // Apply font family for Hindi text
    const fontFamily = kotLanguage === 'hindi' || kotLanguage === 'bilingual' ? 
      "font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, 'Devanagari Sangam MN';" : 
      "font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;";

    return `
      <div style="font-size: 12px; width: 300px; ${fontFamily}">
        <p style="text-align: center;">
          <span style="font-size: 18px;">${orderData.storeName || 'Restaurant'}</span><br>
          ${getTrans('kitchen_order_ticket')}
        </p>
        <hr>
        <p>${getTrans('order_no')}: ${orderData.orderNumber}</p>
        <p>${getTrans('table')}: ${orderData.tableNumber || 'N/A'}</p>
        <p>${getTrans('customer')}: ${orderData.customerName || getTrans('walk_in_customer')}</p>
        <p>${getTrans('time')}: ${orderData.time}</p>
        <table style="width: 100%;">
          <thead>
            <tr><th>${getTrans('item')}</th><th>${getTrans('quantity')}</th><th>${getTrans('notes')}</th></tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <hr>
        <p style="text-align: center;">${getTrans('priority')}: ${getTrans(orderData.priority || 'normal')}</p>
      </div>
    `;
  }
};

// Make LanguageSupport available globally
window.LanguageSupport = LanguageSupport;

module.exports = LanguageSupport;