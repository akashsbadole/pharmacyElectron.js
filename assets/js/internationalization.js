/**
 * Internationalization Module for Restaurant POS System
 * Provides multi-currency, multi-language, and regional support
 */

// Currency configurations for different countries
const CURRENCY_CONFIGS = {
  'USD': {
    symbol: '$',
    name: 'US Dollar',
    code: 'USD',
    decimal_places: 2,
    thousands_separator: ',',
    decimal_separator: '.',
    position: 'prefix'
  },
  'EUR': {
    symbol: '€',
    name: 'Euro',
    code: 'EUR',
    decimal_places: 2,
    thousands_separator: '.',
    decimal_separator: ',',
    position: 'suffix'
  },
  'GBP': {
    symbol: '£',
    name: 'British Pound',
    code: 'GBP',
    decimal_places: 2,
    thousands_separator: ',',
    decimal_separator: '.',
    position: 'prefix'
  },
  'JPY': {
    symbol: '¥',
    name: 'Japanese Yen',
    code: 'JPY',
    decimal_places: 0,
    thousands_separator: ',',
    decimal_separator: '.',
    position: 'prefix'
  },
  'INR': {
    symbol: '₹',
    name: 'Indian Rupee',
    code: 'INR',
    decimal_places: 2,
    thousands_separator: ',',
    decimal_separator: '.',
    position: 'prefix'
  },
  'CAD': {
    symbol: 'C$',
    name: 'Canadian Dollar',
    code: 'CAD',
    decimal_places: 2,
    thousands_separator: ',',
    decimal_separator: '.',
    position: 'prefix'
  },
  'AUD': {
    symbol: 'A$',
    name: 'Australian Dollar',
    code: 'AUD',
    decimal_places: 2,
    thousands_separator: ',',
    decimal_separator: '.',
    position: 'prefix'
  },
  'CHF': {
    symbol: 'CHF',
    name: 'Swiss Franc',
    code: 'CHF',
    decimal_places: 2,
    thousands_separator: "'",
    decimal_separator: '.',
    position: 'suffix'
  },
  'CNY': {
    symbol: '¥',
    name: 'Chinese Yuan',
    code: 'CNY',
    decimal_places: 2,
    thousands_separator: ',',
    decimal_separator: '.',
    position: 'prefix'
  },
  'AED': {
    symbol: 'د.إ',
    name: 'UAE Dirham',
    code: 'AED',
    decimal_places: 2,
    thousands_separator: ',',
    decimal_separator: '.',
    position: 'prefix'
  }
};

// Country configurations with tax and regional settings
const COUNTRY_CONFIGS = {
  'US': {
    name: 'United States',
    currency: 'USD',
    tax_system: 'sales_tax',
    tax_label: 'Sales Tax',
    tax_rate_field: 'sales_tax_rate',
    tax_registration_field: 'sales_tax_id',
    date_format: 'MM/DD/YYYY',
    time_format: 'HH:mm:ss',
    decimal_separator: '.',
    thousands_separator: ',',
    address_format: ['street', 'city', 'state', 'zip', 'country'],
    phone_format: '(XXX) XXX-XXXX',
    business_hours: '9:00 AM - 6:00 PM'
  },
  'UK': {
    name: 'United Kingdom',
    currency: 'GBP',
    tax_system: 'vat',
    tax_label: 'VAT',
    tax_rate_field: 'vat_rate',
    tax_registration_field: 'vat_number',
    date_format: 'DD/MM/YYYY',
    time_format: 'HH:mm:ss',
    decimal_separator: '.',
    thousands_separator: ',',
    address_format: ['street', 'city', 'county', 'postcode', 'country'],
    phone_format: '+44 XXXX XXXXXX',
    business_hours: '9:00 AM - 5:30 PM'
  },
  'DE': {
    name: 'Germany',
    currency: 'EUR',
    tax_system: 'vat',
    tax_label: 'MwSt',
    tax_rate_field: 'vat_rate',
    tax_registration_field: 'vat_id',
    date_format: 'DD.MM.YYYY',
    time_format: 'HH:mm:ss',
    decimal_separator: ',',
    thousands_separator: '.',
    address_format: ['street', 'city', 'state', 'zip', 'country'],
    phone_format: '+49 XXX XXXXXXX',
    business_hours: '9:00 - 18:00'
  },
  'FR': {
    name: 'France',
    currency: 'EUR',
    tax_system: 'vat',
    tax_label: 'TVA',
    tax_rate_field: 'vat_rate',
    tax_registration_field: 'tva_intra',
    date_format: 'DD/MM/YYYY',
    time_format: 'HH:mm:ss',
    decimal_separator: ',',
    thousands_separator: ' ',
    address_format: ['street', 'zip', 'city', 'country'],
    phone_format: '+33 X XX XX XX XX',
    business_hours: '9:00 - 19:00'
  },
  'JP': {
    name: 'Japan',
    currency: 'JPY',
    tax_system: 'vat',
    tax_label: '消費税',
    tax_rate_field: 'vat_rate',
    tax_registration_field: 'tax_id',
    date_format: 'YYYY/MM/DD',
    time_format: 'HH:mm:ss',
    decimal_separator: '.',
    thousands_separator: ',',
    address_format: ['postal_code', 'prefecture', 'city', 'street', 'country'],
    phone_format: '+81 XX-XXXX-XXXX',
    business_hours: '9:00 - 18:00'
  },
  'IN': {
    name: 'India',
    currency: 'INR',
    tax_system: 'gst',
    tax_label: 'GST',
    tax_rate_field: 'gst_rate',
    tax_registration_field: 'gst_number',
    date_format: 'DD/MM/YYYY',
    time_format: 'HH:mm:ss',
    decimal_separator: '.',
    thousands_separator: ',',
    address_format: ['street', 'city', 'state', 'pincode', 'country'],
    phone_format: '+91 XXXXX XXXXX',
    business_hours: '10:00 AM - 10:00 PM'
  },
  'CA': {
    name: 'Canada',
    currency: 'CAD',
    tax_system: 'gst_hst',
    tax_label: 'GST/HST',
    tax_rate_field: 'gst_hst_rate',
    tax_registration_field: 'gst_hst_number',
    date_format: 'DD/MM/YYYY',
    time_format: 'HH:mm:ss',
    decimal_separator: '.',
    thousands_separator: ',',
    address_format: ['street', 'city', 'province', 'postal_code', 'country'],
    phone_format: '(XXX) XXX-XXXX',
    business_hours: '9:00 AM - 6:00 PM'
  },
  'AU': {
    name: 'Australia',
    currency: 'AUD',
    tax_system: 'gst',
    tax_label: 'GST',
    tax_rate_field: 'gst_rate',
    tax_registration_field: 'abn',
    date_format: 'DD/MM/YYYY',
    time_format: 'HH:mm:ss',
    decimal_separator: '.',
    thousands_separator: ',',
    address_format: ['street', 'suburb', 'state', 'postcode', 'country'],
    phone_format: '+61 X XXXX XXXX',
    business_hours: '9:00 AM - 5:00 PM'
  }
};

// Language configurations
const LANGUAGES = {
  'en': {
    code: 'en',
    name: 'English',
    native_name: 'English',
    flag: '🇺🇸',
    translations: {
      // Common UI elements
      'app_title': 'Restaurant POS System',
      'point_of_sale': 'Point of Sale',
      'menu_items': 'Menu Items',
      'categories': 'Categories',
      'open_tabs': 'Open Tabs',
      'orders': 'Orders',
      'transactions': 'Transactions',
      'users': 'Users',
      'suppliers': 'Suppliers',
      'recipes': 'Recipes',
      'purchase_orders': 'Purchase Orders',
      'customer_display': 'Customer Display',
      'kitchen_display': 'Kitchen Display',
      'settings': 'Settings',
      'logout': 'Logout',
      
      // POS interface
      'search_product': 'Search Product',
      'add_to_cart': 'Add to Cart',
      'quantity': 'Quantity',
      'price': 'Price',
      'total': 'Total',
      'discount': 'Discount',
      'subtotal': 'Subtotal',
      'tax': 'Tax',
      'service_charge': 'Service Charge',
      'tip': 'Tip',
      'grand_total': 'Grand Total',
      'payment': 'Payment',
      'change': 'Change',
      'cash': 'Cash',
      'card': 'Card',
      'card_info': 'Card Info',
      'confirm_payment': 'Confirm Payment',
      'cancel': 'Cancel',
      'hold': 'Hold',
      'pay': 'Pay',
      'print': 'Print',
      
      // Forms and dialogs
      'save': 'Save',
      'edit': 'Edit',
      'delete': 'Delete',
      'add_new': 'Add New',
      'name': 'Name',
      'description': 'Description',
      'category': 'Category',
      'barcode': 'Barcode',
      'cost': 'Cost',
      'stock': 'Stock',
      'available': 'Available',
      'unavailable': 'Unavailable',
      'expiration_date': 'Expiration Date',
      'minimum_stock': 'Minimum Stock',
      
      // Messages
      'success': 'Success',
      'error': 'Error',
      'warning': 'Warning',
      'info': 'Information',
      'loading': 'Loading...',
      'no_data': 'No data available',
      'search_placeholder': 'Search...',
      'select_option': 'Select an option',
      
      // Reports
      'sales_report': 'Sales Report',
      'inventory_report': 'Inventory Report',
      'staff_report': 'Staff Report',
      'revenue': 'Revenue',
      'profit': 'Profit',
      'items_sold': 'Items Sold',
      'products': 'Products',
      'suppliers': 'Suppliers'
    }
  },
  'hi': {
    code: 'hi',
    name: 'Hindi',
    native_name: 'हिन्दी',
    flag: '🇮🇳',
    translations: {
      'app_title': 'रेस्तरां POS सिस्टम',
      'point_of_sale': 'पॉइंट ऑफ सेल',
      'menu_items': 'मेनू आइटम',
      'categories': 'श्रेणियाँ',
      'open_tabs': 'खुले टैब',
      'orders': 'आदेश',
      'transactions': 'लेनदेन',
      'users': 'उपयोगकर्ता',
      'suppliers': 'आपूर्तिकर्ता',
      'recipes': 'नुस्खे',
      'purchase_orders': 'खरीद आदेश',
      'customer_display': 'ग्राहक प्रदर्शन',
      'kitchen_display': 'रसोई प्रदर्शन',
      'settings': 'सेटिंग्स',
      'logout': 'लॉग आउट',
      
      'search_product': 'उत्पाद खोजें',
      'add_to_cart': 'कार्ट में जोड़ें',
      'quantity': 'मात्रा',
      'price': 'मूल्य',
      'total': 'कुल',
      'discount': 'छूट',
      'subtotal': 'उपयोग',
      'tax': 'कर',
      'service_charge': 'सेवा शुल्क',
      'tip': 'टिप',
      'grand_total': 'कुल योग',
      'payment': 'भुगतान',
      'change': 'परिवर्तन',
      'cash': 'नकद',
      'card': 'कार्ड',
      'card_info': 'कार्ड जानकारी',
      'confirm_payment': 'भुगतान की पुष्टि करें',
      'cancel': 'रद्द करें',
      'hold': 'पकड़ें',
      'pay': 'भुगतान करें',
      'print': 'छापें',
      
      'save': 'सहेजें',
      'edit': 'संपादित करें',
      'delete': 'हटाएं',
      'add_new': 'नया जोड़ें',
      'name': 'नाम',
      'description': 'विवरण',
      'category': 'श्रेणी',
      'barcode': 'बारकोड',
      'cost': 'लागत',
      'stock': 'स्टॉक',
      'available': 'उपलब्ध',
      'unavailable': 'अनुपलब्ध',
      'expiration_date': 'समाप्ति तिथि',
      'minimum_stock': 'न्यूनतम स्टॉक',
      
      'success': 'सफलता',
      'error': 'त्रुटि',
      'warning': 'चेतावनी',
      'info': 'जानकारी',
      'loading': 'लोड हो रहा है...',
      'no_data': 'कोई डेटा उपलब्ध नहीं',
      'search_placeholder': 'खोजें...',
      'select_option': 'एक विकल्प चुनें',
      
      'sales_report': 'बिक्री रिपोर्ट',
      'inventory_report': 'इन्वेंटरी रिपोर्ट',
      'staff_report': 'स्टाफ रिपोर्ट',
      'revenue': 'राजस्व',
      'profit': 'लाभ',
      'items_sold': 'बेचे गए आइटम',
      'products': 'उत्पाद',
      'suppliers': 'आपूर्तिकर्ता'
    }
  },
  'es': {
    code: 'es',
    name: 'Spanish',
    native_name: 'Español',
    flag: '🇪🇸',
    translations: {
      'app_title': 'Sistema POS de Restaurante',
      'point_of_sale': 'Punto de Venta',
      'menu_items': 'Artículos del Menú',
      'categories': 'Categorías',
      'open_tabs': 'Pestañas Abiertas',
      'orders': 'Pedidos',
      'transactions': 'Transacciones',
      'users': 'Usuarios',
      'suppliers': 'Proveedores',
      'recipes': 'Recetas',
      'purchase_orders': 'Órdenes de Compra',
      'customer_display': 'Pantalla de Cliente',
      'kitchen_display': 'Pantalla de Cocina',
      'settings': 'Configuración',
      'logout': 'Cerrar Sesión',
      
      'search_product': 'Buscar Producto',
      'add_to_cart': 'Añadir al Carrito',
      'quantity': 'Cantidad',
      'price': 'Precio',
      'total': 'Total',
      'discount': 'Descuento',
      'subtotal': 'Subtotal',
      'tax': 'Impuesto',
      'service_charge': 'Cargo por Servicio',
      'tip': 'Propina',
      'grand_total': 'Total General',
      'payment': 'Pago',
      'change': 'Cambio',
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'card_info': 'Información de Tarjeta',
      'confirm_payment': 'Confirmar Pago',
      'cancel': 'Cancelar',
      'hold': 'Sostener',
      'pay': 'Pagar',
      'print': 'Imprimir',
      
      'save': 'Guardar',
      'edit': 'Editar',
      'delete': 'Eliminar',
      'add_new': 'Añadir Nuevo',
      'name': 'Nombre',
      'description': 'Descripción',
      'category': 'Categoría',
      'barcode': 'Código de Barras',
      'cost': 'Costo',
      'stock': 'Stock',
      'available': 'Disponible',
      'unavailable': 'No Disponible',
      'expiration_date': 'Fecha de Caducidad',
      'minimum_stock': 'Stock Mínimo',
      
      'success': 'Éxito',
      'error': 'Error',
      'warning': 'Advertencia',
      'info': 'Información',
      'loading': 'Cargando...',
      'no_data': 'No hay datos disponibles',
      'search_placeholder': 'Buscar...',
      'select_option': 'Seleccione una opción',
      
      'sales_report': 'Reporte de Ventas',
      'inventory_report': 'Reporte de Inventario',
      'staff_report': 'Reporte de Personal',
      'revenue': 'Ingresos',
      'profit': 'Beneficio',
      'items_sold': 'Artículos Vendidos',
      'products': 'Productos',
      'suppliers': 'Proveedores'
    }
  },
  'fr': {
    code: 'fr',
    name: 'French',
    native_name: 'Français',
    flag: '🇫🇷',
    translations: {
      'app_title': 'Système POS de Restaurant',
      'point_of_sale': 'Point de Vente',
      'menu_items': 'Articles du Menu',
      'categories': 'Catégories',
      'open_tabs': 'Onglets Ouverts',
      'orders': 'Commandes',
      'transactions': 'Transactions',
      'users': 'Utilisateurs',
      'suppliers': 'Fournisseurs',
      'recipes': 'Recettes',
      'purchase_orders': 'Bon de Commande',
      'customer_display': 'Affichage Client',
      'kitchen_display': 'Affichage Cuisine',
      'settings': 'Paramètres',
      'logout': 'Déconnexion',
      
      'search_product': 'Rechercher Produit',
      'add_to_cart': 'Ajouter au Panier',
      'quantity': 'Quantité',
      'price': 'Prix',
      'total': 'Total',
      'discount': 'Remise',
      'subtotal': 'Sous-total',
      'tax': 'Taxe',
      'service_charge': 'Frais de Service',
      'tip': 'Pourboire',
      'grand_total': 'Total Général',
      'payment': 'Paiement',
      'change': 'Monnaie',
      'cash': 'Espèces',
      'card': 'Carte',
      'card_info': 'Informations Carte',
      'confirm_payment': 'Confirmer Paiement',
      'cancel': 'Annuler',
      'hold': 'Maintenir',
      'pay': 'Payer',
      'print': 'Imprimer',
      
      'save': 'Enregistrer',
      'edit': 'Modifier',
      'delete': 'Supprimer',
      'add_new': 'Ajouter Nouveau',
      'name': 'Nom',
      'description': 'Description',
      'category': 'Catégorie',
      'barcode': 'Code-barres',
      'cost': 'Coût',
      'stock': 'Stock',
      'available': 'Disponible',
      'unavailable': 'Indisponible',
      'expiration_date': 'Date d\'Expiration',
      'minimum_stock': 'Stock Minimum',
      
      'success': 'Succès',
      'error': 'Erreur',
      'warning': 'Avertissement',
      'info': 'Information',
      'loading': 'Chargement...',
      'no_data': 'Aucune donnée disponible',
      'search_placeholder': 'Rechercher...',
      'select_option': 'Sélectionner une option',
      
      'sales_report': 'Rapport de Ventes',
      'inventory_report': 'Rapport d\'Inventaire',
      'staff_report': 'Rapport du Personnel',
      'revenue': 'Revenu',
      'profit': 'Profit',
      'items_sold': 'Articles Vendus',
      'products': 'Produits',
      'suppliers': 'Fournisseurs'
    }
  }
};

// Internationalization class
class Internationalization {
  constructor() {
    this.currentLanguage = 'en';
    this.currentCountry = 'IN'; // Default to India for backward compatibility
    this.currentCurrency = 'INR';
    this.currentConfig = null;
    
    this.init();
  }
  
  init() {
    // Load saved preferences
    this.loadPreferences();
    
    // Set initial configuration
    this.setCountry(this.currentCountry);
    
    // Apply translations
    this.applyTranslations();
    
    // Apply currency formatting
    this.applyCurrencyFormatting();
  }
  
  loadPreferences() {
    try {
      const storage = require('electron-store');
      const store = new storage();
      
      const savedLang = store.get('i18n.language');
      const savedCountry = store.get('i18n.country');
      const savedCurrency = store.get('i18n.currency');
      
      if (savedLang && LANGUAGES[savedLang]) {
        this.currentLanguage = savedLang;
      }
      
      if (savedCountry && COUNTRY_CONFIGS[savedCountry]) {
        this.currentCountry = savedCountry;
      }
      
      if (savedCurrency && CURRENCY_CONFIGS[savedCurrency]) {
        this.currentCurrency = savedCurrency;
      }
    } catch (error) {
      console.warn('Could not load i18n preferences:', error);
    }
  }
  
  savePreferences() {
    try {
      const storage = require('electron-store');
      const store = new storage();
      
      store.set('i18n.language', this.currentLanguage);
      store.set('i18n.country', this.currentCountry);
      store.set('i18n.currency', this.currentCurrency);
    } catch (error) {
      console.warn('Could not save i18n preferences:', error);
    }
  }
  
  setLanguage(languageCode) {
    if (LANGUAGES[languageCode]) {
      this.currentLanguage = languageCode;
      this.savePreferences();
      this.applyTranslations();
      return true;
    }
    return false;
  }
  
  setCountry(countryCode) {
    if (COUNTRY_CONFIGS[countryCode]) {
      this.currentCountry = countryCode;
      this.currentConfig = COUNTRY_CONFIGS[countryCode];
      
      // Set default currency for country
      this.currentCurrency = this.currentConfig.currency;
      
      this.savePreferences();
      this.applyCurrencyFormatting();
      this.updateTaxFields();
      return true;
    }
    return false;
  }
  
  setCurrency(currencyCode) {
    if (CURRENCY_CONFIGS[currencyCode]) {
      this.currentCurrency = currencyCode;
      this.savePreferences();
      this.applyCurrencyFormatting();
      return true;
    }
    return false;
  }
  
  getTranslation(key) {
    const lang = LANGUAGES[this.currentLanguage];
    if (lang && lang.translations[key]) {
      return lang.translations[key];
    }
    return key; // Return key if translation not found
  }
  
  formatCurrency(amount) {
    const config = CURRENCY_CONFIGS[this.currentCurrency];
    if (!config) return amount;
    
    // Handle JPY special case (no decimal places)
    if (config.decimal_places === 0) {
      amount = Math.round(amount);
    }
    
    const formattedAmount = amount.toLocaleString(undefined, {
      minimumFractionDigits: config.decimal_places,
      maximumFractionDigits: config.decimal_places
    });
    
    if (config.position === 'prefix') {
      return config.symbol + formattedAmount;
    } else {
      return formattedAmount + ' ' + config.symbol;
    }
  }
  
  parseCurrency(formattedAmount) {
    const config = CURRENCY_CONFIGS[this.currentCurrency];
    if (!config) return parseFloat(formattedAmount);
    
    // Remove currency symbol and format separators
    let cleanAmount = formattedAmount.replace(config.symbol, '').trim();
    
    // Replace thousands separator with nothing and decimal separator with dot
    cleanAmount = cleanAmount.replace(new RegExp('\\' + config.thousands_separator, 'g'), '');
    cleanAmount = cleanAmount.replace(config.decimal_separator, '.');
    
    return parseFloat(cleanAmount);
  }
  
  formatDate(date) {
    if (!date) return '';
    
    const config = this.currentConfig;
    if (!config) return date;
    
    // Use moment.js for date formatting
    if (typeof window !== 'undefined' && window.moment) {
      return window.moment(date).format(config.date_format);
    }
    
    // Fallback to basic formatting
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    switch (config.date_format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY/MM/DD':
        return `${year}/${month}/${day}`;
      case 'DD.MM.YYYY':
        return `${day}.${month}.${year}`;
      default:
        return `${day}/${month}/${year}`;
    }
  }
  
  applyTranslations() {
    // Update all translatable elements
    const translateElements = document.querySelectorAll('[data-i18n]');
    
    translateElements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.getTranslation(key);
      
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    });
    
    // Update button text
    this.updateButtonTitles();
  }
  
  applyCurrencyFormatting() {
    // Update currency symbols in the UI
    const currencyElements = document.querySelectorAll('[data-currency]');
    currencyElements.forEach(element => {
      element.textContent = CURRENCY_CONFIGS[this.currentCurrency].symbol;
    });
    
    // Update any existing price displays
    const priceElements = document.querySelectorAll('[data-price]');
    priceElements.forEach(element => {
      const amount = parseFloat(element.getAttribute('data-price'));
      if (!isNaN(amount)) {
        element.textContent = this.formatCurrency(amount);
      }
    });
  }
  
  updateTaxFields() {
    if (!this.currentConfig) return;
    
    // Update tax field labels
    const taxLabel = document.querySelector('[data-tax-label]');
    if (taxLabel) {
      taxLabel.textContent = this.currentConfig.tax_label;
    }
    
    // Show/hide appropriate tax fields based on tax system
    const taxSystem = this.currentConfig.tax_system;
    
    // Hide all tax field containers
    const allTaxFields = document.querySelectorAll('.tax-field');
    allTaxFields.forEach(field => field.style.display = 'none');
    
    // Show relevant tax fields
    switch (taxSystem) {
      case 'gst':
        document.getElementById('gst_fields')?.style.display = 'block';
        break;
      case 'vat':
        document.getElementById('vat_fields')?.style.display = 'block';
        break;
      case 'sales_tax':
        document.getElementById('sales_tax_fields')?.style.display = 'block';
        break;
      case 'gst_hst':
        document.getElementById('gst_hst_fields')?.style.display = 'block';
        break;
    }
  }
  
  updateButtonTitles() {
    // Update common button titles
    const buttons = [
      { selector: '#pointofsale', key: 'point_of_sale' },
      { selector: '#productModal', key: 'menu_items' },
      { selector: '#categoryModal', key: 'categories' },
      { selector: '#viewRefOrders', key: 'open_tabs' },
      { selector: '#viewCustomerOrders', key: 'orders' },
      { selector: '#transactions', key: 'transactions' },
      { selector: '#usersModal', key: 'users' },
      { selector: '#suppliersModal', key: 'suppliers' },
      { selector: '#recipesModal', key: 'recipes' },
      { selector: '#purchaseOrdersModal', key: 'purchase_orders' },
      { selector: '#toggleCustomerDisplay', key: 'customer_display' },
      { selector: '#toggleKOTDisplay', key: 'kitchen_display' },
      { selector: '#settings', key: 'settings' },
      { selector: '#log-out', key: 'logout' }
    ];
    
    buttons.forEach(btn => {
      const element = document.querySelector(btn.selector);
      if (element) {
        element.textContent = this.getTranslation(btn.key);
      }
    });
  }
  
  // Utility methods for external use
  static getAvailableLanguages() {
    return Object.keys(LANGUAGES).map(code => ({
      code: code,
      name: LANGUAGES[code].name,
      native_name: LANGUAGES[code].native_name,
      flag: LANGUAGES[code].flag
    }));
  }
  
  static getAvailableCountries() {
    return Object.keys(COUNTRY_CONFIGS).map(code => ({
      code: code,
      name: COUNTRY_CONFIGS[code].name,
      currency: COUNTRY_CONFIGS[code].currency,
      tax_system: COUNTRY_CONFIGS[code].tax_system
    }));
  }
  
  static getAvailableCurrencies() {
    return Object.keys(CURRENCY_CONFIGS).map(code => ({
      code: code,
      name: CURRENCY_CONFIGS[code].name,
      symbol: CURRENCY_CONFIGS[code].symbol
    }));
  }
}

// Make Internationalization available globally
if (typeof window !== 'undefined') {
  window.Internationalization = Internationalization;
  window.i18n = new Internationalization();
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Internationalization,
    CURRENCY_CONFIGS,
    COUNTRY_CONFIGS,
    LANGUAGES
  };
}