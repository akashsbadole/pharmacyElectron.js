// Use window to share modules and avoid redeclaration errors
window.jsPDF = window.jsPDF || require("jspdf");
window.html2canvas = window.html2canvas || require("html2canvas");
window.JsBarcode = window.JsBarcode || require("jsbarcode");
window.QRCode = window.QRCode || require("qrcode");
window.macaddress = window.macaddress || require("macaddress");
window.notiflix = window.notiflix || require("notiflix");
window.validator = window.validator || require("validator");
window.DOMPurify = window.DOMPurify || require("dompurify");
window._ = window._ || require("lodash");
window.fs = window.fs || require("fs");
window.path = window.path || require("path");
window.moment = window.moment || require("moment");

// Create local references
const jsPDF = window.jsPDF;
const html2canvas = window.html2canvas;
const JsBarcode = window.JsBarcode;
const QRCode = window.QRCode;
const macaddress = window.macaddress;
const notiflix = window.notiflix;
const validator = window.validator;
const DOMPurify = window.DOMPurify;
const _ = window._;
let fs = window.fs;
let path = window.path;
// Use global ipcRenderer from window (set by renderer.js)
if (!window.ipcRenderer && typeof require !== 'undefined') {
    window.ipcRenderer = require("electron").ipcRenderer;
}

// Import language support module
let LanguageSupport;
try {
  LanguageSupport = require("./language");
  window.LanguageSupport = LanguageSupport;
  console.log('✅ Language support module loaded successfully');
} catch (error) {
  console.warn('⚠️ Language support module not available:', error.message);
  console.log('📝 Receipts will be generated in English only');
}

// Import vanilla JavaScript store and store manager (with error handling)
let useStore, storeManager;
try {
  useStore = require("./store");
  storeManager = require("./storeManager");

  // Make store available globally
  window.useStore = useStore;
  window.storeManager = storeManager;

  console.log('✅ Vanilla JavaScript store loaded successfully');
} catch (error) {
  console.warn('⚠️ Store files not available:', error.message);
  console.log('📝 Application will continue with traditional state management');
}

let dotInterval = setInterval(function () {
  $(".dot").text(".");
}, 3000);
// Use electron-store with a different name to avoid conflict with app.js Store class
const ElectronStore = require("electron-store");
window.host = "localhost";
window.port = null; // Will be set via IPC
window.api = null; // Will be configured when port is received

// Function to configure API when port is received
function configureAPI() {
  console.log('🔧 DEBUG: configureAPI() called');
  console.log('🔧 DEBUG: window.port =', window.port);
  console.log('🔧 DEBUG: window.host =', window.host);
  
  if (window.port && window.host) {
    window.api = "http://" + window.host + ":" + window.port + "/api/";
    console.log('🔧 DEBUG: API configured:', window.api);

    // Update store with API configuration
    if (typeof useStore !== 'undefined') {
      const { setApiConfig } = useStore.getState();
      setApiConfig(window.api, window.host, window.port);
    }

    // Reinitialize socket connection with correct port
    if (typeof io !== 'undefined') {
      console.log('🔧 DEBUG: Initializing socket connection');
      window.socket = io('http://' + window.host + ':' + window.port);

      // Set up socket event listeners after socket is created
      window.socket.on('low-stock-alert', function (data) {
        notiflix.Notify.warning('Low stock alert: ' + data.name);

        // Add alert to store
        if (typeof useStore !== 'undefined') {
          const { addAlert } = useStore.getState();
          addAlert({
            id: Date.now(),
            type: 'warning',
            message: `Low stock alert: ${data.name}`,
            data: data
          });
        }

        if (typeof loadAlerts === 'function') {
          loadAlerts();
        }
      });
    }

    console.log('✅ DEBUG: API configured successfully in pos.js:', window.api);

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('api-configured', {
      detail: { api: window.api, port: window.port }
    }));
  } else {
    console.error('❌ DEBUG: API configuration failed - missing port or host');
    console.error('❌ DEBUG: window.port:', window.port, 'window.host:', window.host);
  }
}

// Listen for API configuration via IPC
window.ipcRenderer.on('server-config', (event, data) => {
  console.log('API configuration received via IPC:', data);
  window.port = data.port;
  window.host = data.host || 'localhost';
  configureAPI();
});

// Listen for custom event (alternative method)
window.addEventListener('api-configured', (event) => {
  console.log('API configuration event received in pos.js');
  // Don't call configureAPI again to avoid infinite recursion
  // The API is already configured when this event is dispatched
});

// ============================================
// AJAX ERROR HANDLING UTILITIES
// ============================================

/**
 * Generic AJAX error handler that provides user-friendly error messages
 * and prevents JSON parsing errors from unhandled HTTP responses
 */
function handleAjaxError(xhr, status, error, customMessage) {
  console.error('AJAX Error:', error, 'Status:', xhr.status, 'Response:', xhr.responseText);
  
  let errorMessage = customMessage || "An unexpected error occurred";
  
  // Handle different error scenarios
  if (xhr.status === 0) {
    errorMessage = "Network error. Please check your connection and try again.";
  } else if (xhr.status === 400) {
    errorMessage = "Invalid request. Please check your input and try again.";
  } else if (xhr.status === 401) {
    errorMessage = "Authentication failed. Please log in again.";
  } else if (xhr.status === 403) {
    errorMessage = "You don't have permission to perform this action.";
  } else if (xhr.status === 404) {
    errorMessage = "The requested resource was not found.";
  } else if (xhr.status === 422) {
    errorMessage = "Validation error. Please check your input.";
  } else if (xhr.status >= 500) {
    errorMessage = "Server error. Please try again later.";
  } else if (xhr.responseJSON && xhr.responseJSON.message) {
    errorMessage = xhr.responseJSON.message;
  }
  
  return errorMessage;
}

/**
 * Safe AJAX call wrapper that handles JSON parsing errors
 */
function safeAjaxCall(options) {
  return $.ajax(options).fail(function (xhr, status, error) {
    // Prevent unhandled promise rejections
    if (!options.suppressErrorHandling) {
      const errorMessage = handleAjaxError(xhr, status, error);
      console.warn('Request failed:', errorMessage);
    }
  });
}

const io = require('socket.io-client');
const remote = require("@electron/remote");
let cart = [];
let index = 0;
let allUsers = [];
window.allProducts = [];
let allCategories = [];
let allTransactions = [];
let sold = [];
let state = [];
let sold_items = [];
let item;
let auth;
let holdOrder = 0;
let vat = 0;
let perms = null;
let originalOrder = null;
let deleteId = 0;
let paymentType = 0;
let receipt = "";
let totalVat = 0;
let subTotal = 0;
let method = "";
let user_index = 0;
let transaction_index;
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
let img_path = path.join(appData, appName, "uploads", "/");
const bcrypt = require("bcrypt");
let categories = [];
let holdOrderList = [];
let customerOrderList = [];
let ownUserEdit = null;
let totalPrice = 0;
let orderTotal = 0;
let auth_error = "Incorrect username or password";
let auth_empty = "Please enter a username and password";
let holdOrderlocation = $("#renderHoldOrders");
let customerOrderLocation = $("#renderCustomerOrders");
let storage = new ElectronStore();
window.settings;
let platform;
window.user = {};
let start = moment().startOf("month");
let end = moment();
let start_date = moment(start).toDate();
let end_date = moment(end).toDate();
let by_till = 0;
let by_user = 0;
let by_status = 1;
const default_item_img = path.join("assets", "images", "default.jpg");
const permissions = [
  "perm_products",
  "perm_categories",
  "perm_transactions",
  "perm_users",
  "perm_settings",
];
notiflix.Notify.init({
  position: "right-top",
  cssAnimationDuration: 600,
  messageMaxLength: 150,
  clickToClose: true,
  closeButton: true
});
// Try to load utils module with fallback
let utils;
try {
  utils = require("./utils");
} catch (e) {
  console.warn('Could not load utils module, using fallback values:', e.message);
  utils = {
    DATE_FORMAT: "DD-MMM-YYYY",
    moneyFormat: (amount) => amount.toString(),
    isExpired: () => false,
    daysToExpire: () => 0,
    getStockStatus: () => 1,
    checkFileExists: () => false,
    setContentSecurityPolicy: () => {}
  };
}

const {
  DATE_FORMAT,
  moneyFormat,
  isExpired,
  daysToExpire,
  getStockStatus,
  checkFileExists,
  setContentSecurityPolicy,
} = utils;

//set the content security policy of the app
setContentSecurityPolicy();

// Safe function to handle validator.unescape with null checks
function safeUnescape(value) {
  if (value === undefined || value === null) {
    return '';
  }
  try {
    return validator.unescape(value);
  } catch (error) {
    console.warn('Error unescaping value:', value, error);
    return value || '';
  }
}

// Safe function to get currency symbol
function getCurrencySymbol() {
  if (settings && settings.symbol) {
    return safeUnescape(settings.symbol);
  }
  return '$'; // Default currency
}

$(function () {
  function cb(start, end) {
    $("#reportrange span").html(
      start.format("MMMM D, YYYY") + "  -  " + end.format("MMMM D, YYYY"),
    );
  }

  $("#reportrange").daterangepicker(
    {
      startDate: start,
      endDate: end,
      autoApply: true,
      timePicker: true,
      timePicker24Hour: true,
      timePickerIncrement: 10,
      timePickerSeconds: true,
      // minDate: '',
      ranges: {
        Today: [moment().startOf("day"), moment()],
        Yesterday: [
          moment().subtract(1, "days").startOf("day"),
          moment().subtract(1, "days").endOf("day"),
        ],
        "Last 7 Days": [
          moment().subtract(6, "days").startOf("day"),
          moment().endOf("day"),
        ],
        "Last 30 Days": [
          moment().subtract(29, "days").startOf("day"),
          moment().endOf("day"),
        ],
        "This Month": [moment().startOf("month"), moment().endOf("month")],
        "This Month": [moment().startOf("month"), moment()],
        "Last Month": [
          moment().subtract(1, "month").startOf("month"),
          moment().subtract(1, "month").endOf("month"),
        ],
      },
    },
    cb,
  );

  cb(start, end);

  $("#expirationDate").daterangepicker({
    singleDatePicker: true,
    locale: {
      format: DATE_FORMAT,
    },
  });
});

//Allow only numbers in input field
$.fn.allowOnlyNumbers = function () {
  return this.on('keydown', function (e) {
    // Allow: backspace, delete, tab, escape, enter, ., ctrl/cmd+A, ctrl/cmd+C, ctrl/cmd+X, ctrl/cmd+V, end, home, left, right, down, up
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Period', 'NumpadDecimal', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

    if (allowedKeys.includes(e.key) ||
      (e.key >= '0' && e.key <= '9') ||
      (e.ctrlKey && ['a', 'c', 'x', 'v'].includes(e.key.toLowerCase()))) {
      return;
    }

    // Prevent all other keys
    e.preventDefault();
  });
};
$('.number-input').allowOnlyNumbers();

//Serialize Object
$.fn.serializeObject = function () {
  var o = {};
  var a = this.serializeArray();
  $.each(a, function () {
    if (o[this.name]) {
      if (!o[this.name].push) {
        o[this.name] = [o[this.name]];
      }
      o[this.name].push(this.value || "");
    } else {
      o[this.name] = this.value || "";
    }
  });
  return o;
};

auth = storage.get("auth");
user = storage.get("user");

// Initialize store with existing data if available
if (typeof useStore !== 'undefined') {
  const { setAuth, setUser } = useStore.getState();
  setAuth(auth);
  setUser(user);
}

$("#main_app").hide();

// Wait for API to be configured before making requests
function initializeApp() {
  console.log('🚀 DEBUG: initializeApp() called');
  console.log('🚀 DEBUG: Current window.api =', window.api);
  console.log('🚀 DEBUG: Current window.port =', window.port);
  console.log('🚀 DEBUG: Current window.host =', window.host);
  
  if (!window.api) {
    console.log('⏳ DEBUG: API not yet configured, retrying in 500ms...');

    // Request server config from main process as fallback
    window.ipcRenderer.send('get-server-config');

    setTimeout(initializeApp, 500);
    return;
  }
  
  console.log('✅ DEBUG: API is configured, proceeding with initialization');
  console.log('✅ DEBUG: API URL:', window.api);

  if (auth == undefined) {
    console.log('🔐 DEBUG: No auth found, checking API connection');
    $.get(window.api + "users/check/")
      .done(function () {
        console.log('🔐 DEBUG: API check completed successfully');
        // API check completed
      })
      .fail(function (xhr, status, error) {
        console.warn('⚠️ DEBUG: API check failed:', error);
        console.warn('⚠️ DEBUG: XHR status:', xhr.status);
        console.warn('⚠️ DEBUG: XHR response:', xhr.responseText);
        // Continue with authentication even if API check fails
      });

    authenticate();
  } else {
    $("#login").hide();
    $("#main_app").show();
    platform = storage.get("settings");

    if (platform != undefined) {
      if (platform.app == "Network Point of Sale Terminal") {
        window.api = "http://" + platform.ip + ":" + window.port + "/api/";
        perms = true;
      }
    }

    $.get(window.api + "users/user/" + user._id)
      .done(function (data) {
        user = data;

        // Update store if available
        if (typeof useStore !== 'undefined') {
          const { setUser } = useStore.getState();
          setUser(user);
        }

        $("#loggedin-user").text(user.fullname);
      })
      .fail(function (xhr, status, error) {
        console.error('Failed to load user data:', error);
        notiflix.Report.failure('Error', 'Failed to load user information', 'Ok');
      });

    $.get(window.api + "settings/get")
      .done(function (data) {
        settings = data.settings;

        // Update store if available
        if (typeof useStore !== 'undefined') {
          const { setSettings, setVat } = useStore.getState();
          setSettings(settings);
          if (settings && settings.percentage) {
            setVat(parseFloat(safeUnescape(settings.percentage)));
          }
        }

        // Update title after settings are loaded
        updateAppTitle();

        // Update currency symbols after settings load
        if (settings && settings.symbol) {
          $("#price_curr, #payment_curr, #change_curr").text(getCurrencySymbol());
        }

        // Update tax info after settings load
        if (settings) {
          vat = parseFloat(safeUnescape(settings.percentage));
          $("#taxInfo").text(settings.charge_tax ? vat : 0);
        }
      })
      .fail(function (xhr, status, error) {
        console.error('Failed to load settings:', error);
        notiflix.Report.failure('Error', 'Failed to load application settings', 'Ok');
      });

    $.get(window.api + "users/all")
      .done(function (users) {
        allUsers = [...users];
      })
      .fail(function (xhr, status, error) {
        console.error('Failed to load users:', error);
      });

    // Define updateAppTitle function in accessible scope
    function updateAppTitle() {
      if (settings && settings.store) {
        let appTitle = `${safeUnescape(settings.store)} - ${appName}`;
        $("title").text(appTitle);
      } else {
        $("title").text(appName);
      }
    }

    $(function () {
      // Initial title update
      updateAppTitle();

      console.log('🎨 DEBUG: jQuery document ready function called');
      console.log('🎨 DEBUG: Current window.api =', window.api);
      console.log('🎨 DEBUG: Loading interface components...');

      $(".loading").hide();

      // Show POS view by default
      console.log('🎨 DEBUG: Showing POS view and hiding transactions view');
      $("#pos_view").show();
      $("#transactions").show();
      $("#transactions_view").hide();
      $("#pointofsale").hide();
      
      console.log('🎨 DEBUG: About to call loadCategories()');
      loadCategories();
      console.log('🎨 DEBUG: About to call loadProducts()');
      loadProducts();
      console.log('🎨 DEBUG: About to call loadCustomers()');
      loadCustomers();
      console.log('🎨 DEBUG: About to call loadAlerts()');
      loadAlerts();

      setTimeout(function () {
        if (settings == undefined && auth != undefined) {
          $("#settingsModal").modal("show");
        }
      }, 1500);

      $("#settingsModal").on("hide.bs.modal", function () {
        setTimeout(function () {
          if (settings == undefined && auth != undefined) {
            $("#settingsModal").modal("show");
          }
        }, 1000);
      });

      if (0 == user.perm_products) {
        $(".p_one").hide();
      }
      if (0 == user.perm_categories) {
        $(".p_two").hide();
      }
      if (0 == user.perm_transactions) {
        $(".p_three").hide();
      }
      if (0 == user.perm_users) {
        $(".p_four").hide();
      }
      if (0 == user.perm_settings) {
        $(".p_five").hide();
      }

      function loadProducts() {
        console.log('🔍 DEBUG: loadProducts() function called');
        console.log('🔍 DEBUG: window.api =', window.api);
        console.log('🔍 DEBUG: window.api is configured?', window.api ? 'YES' : 'NO');
        
        // Update store if available
        if (typeof useStore !== 'undefined') {
          const { setLoading } = useStore.getState();
          setLoading(true);
        }

        const apiUrl = window.api + "inventory/products";
        console.log('🔍 DEBUG: Making API call to:', apiUrl);
        
        $.get(apiUrl)
          .done(function (data) {
            console.log('🔍 DEBUG: API call successful');
            console.log('🔍 DEBUG: Received data:', data);
            console.log('🔍 DEBUG: Data type:', typeof data);
            console.log('🔍 DEBUG: Data length:', Array.isArray(data) ? data.length : 'not an array');
            
            if (!data || data.length === 0) {
              console.log('⚠️ DEBUG: No products received from API');
              $('#parent').html('<div class="col-md-12"><div class="alert alert-warning">No products found in inventory.</div></div>');
              return;
            }
            
            // Filter out unavailable items from display
            data = data.filter(item => item.available !== false);

            data.forEach((item) => {
              item.price = parseFloat(item.price).toFixed(2);
            });

            allProducts = [...data];

            // Update store if available
            if (typeof useStore !== 'undefined') {
              const { setAllProducts, setLoading } = useStore.getState();
              setAllProducts(data);
              setLoading(false);
            }

            loadProductList();

            let expiredCount = 0;
            allProducts.forEach((product) => {
              let expiryDate = moment(product.expirationDate, DATE_FORMAT);

              if (!isExpired(expiryDate)) {
                const diffDays = daysToExpire(expiryDate);

                if (diffDays > 0 && diffDays <= 30) {
                  var days_noun = diffDays > 1 ? "days" : "day";
                  notiflix.Notify.warning(
                    `${product.name} has only ${diffDays} ${days_noun} left to expiry`,
                  );
                }
              } else {
                expiredCount++;
              }
            });

            //Show notification if there are any expired goods.
            if (expiredCount > 0) {
              notiflix.Notify.failure(
                `${expiredCount} ${expiredCount > 0 ? "products" : "product"
                } expired. Please restock!`,
              );
            }


            console.log('🔍 DEBUG: DOM manipulation: Clearing #parent');
            $("#parent").text("");
            console.log('🔍 DEBUG: #parent cleared, starting product rendering');

            let productCount = 0;
            data.forEach((item) => {
              productCount++;
              console.log('🔍 DEBUG: Processing product', productCount, ':', item.name);
              
              if (!categories.includes(item.category)) {
                categories.push(item.category);
              }
              let item_isExpired = isExpired(item.expirationDate);
              let item_stockStatus = getStockStatus(item.quantity, item.minStock);
              if (item.img === "") {
                item_img = default_item_img;
              }
              else {
                item_img = path.join(img_path, item.img);
                item_img = checkFileExists(item_img) ? item_img : default_item_img;
              }

              let item_info = `<div class="col-lg-2 box ${item.category}">
                             <div class="widget-panel widget-style-2 " title="${item.name}">                    
                            <div id="image" onclick="$(this).addToCart(${item._id}, ${item.quantity}, ${item.stock})"><img src="${item_img}" id="product_img" alt=""></div>                    
                                         <div class="text-muted m-t-5 text-center">
                                         <div class="name" id="product_name"><span class="${item_isExpired ? "text-danger" : ""}">${item.name}</span></div> 
                                         <span class="sku">${item.barcode || item._id}</span>
                                         <span class="${item_stockStatus < 1 ? 'text-danger' : ''}"><span class="stock">STOCK </span><span class="count">${item.stock == 1
                   ? item.quantity
                  : "N/A"}</span></span>
                                        <br>
                                        </div>
                                         <span class="text-success text-center"><b data-plugin="counterup">${getCurrencySymbol() +
                 moneyFormat(item.price)
                 }</b> </span>
                             </div>
                         </div>`;
                        
              console.log('🔍 DEBUG: Appending product to DOM:', item.name);
              $("#parent").append(item_info);
            });
            
            console.log('🔍 DEBUG: Completed rendering', productCount, 'products');
            console.log('🔍 DEBUG: Checking if products are visible in DOM');
            console.log('🔍 DEBUG: #parent innerHTML length:', $("#parent").html().length);
            console.log('🔍 DEBUG: #parent children count:', $("#parent").children().length);
          })
          .fail(function (xhr, status, error) {
            console.error('🔍 DEBUG: API call FAILED');
            console.error('🔍 DEBUG: Error details:', error);
            console.error('🔍 DEBUG: Status:', status);
            console.error('🔍 DEBUG: XHR response:', xhr.responseText);
            console.error('🔍 DEBUG: XHR status:', xhr.status);
            console.error('🔍 DEBUG: window.api value:', window.api);
            console.error('🔍 DEBUG: Full API URL attempted:', apiUrl);
            
            notiflix.Report.failure('Error', 'Failed to load products', 'Ok');
            
            // Update store if available
            if (typeof useStore !== 'undefined') {
              const { setLoading } = useStore.getState();
              setLoading(false);
            }
          });
      }

      function loadCategories() {
        console.log('📁 DEBUG: loadCategories() function called');
        console.log('📁 DEBUG: window.api =', window.api);
        
        const apiUrl = window.api + "categories/all";
        console.log('📁 DEBUG: Making API call to:', apiUrl);
        
        $.get(apiUrl)
          .done(function (data) {
            console.log('📁 DEBUG: Categories API call successful');
            console.log('📁 DEBUG: Categories data:', data);
            allCategories = data;

            // Update store if available
            if (typeof useStore !== 'undefined') {
              const { setAllCategories } = useStore.getState();
              setAllCategories(data);
            }

            loadCategoryList();
            $("#category,#categories").html(`<option value="0">Select</option>`);
            allCategories.forEach((category) => {
              $("#category,#categories").append(
                `<option value="${category._id}">${category.name}</option>`,
              );
            });
          })
          .fail(function (xhr, status, error) {
            console.error('📁 DEBUG: Categories API call FAILED');
            console.error('📁 DEBUG: Error details:', error);
            console.error('📁 DEBUG: Status:', status);
            console.error('📁 DEBUG: XHR status:', xhr.status);
            console.error('📁 DEBUG: XHR response:', xhr.responseText);
            notiflix.Report.failure('Error', 'Failed to load categories', 'Ok');
          });
      }

      function loadCustomers() {
        $.get(window.api + "customers/all")
          .done(function (customers) {
            $("#customer").html(
              `<option value="0" selected="selected">Walk in customer</option>`,
            );

            customers.forEach((cust) => {
              let customerValue = JSON.stringify({ id: cust._id, name: cust.name });
              let customer = `<option value='${customerValue}'>${cust.name}</option>`;
              $("#customer").append(customer);
            });
          })
          .fail(function (xhr, status, error) {
            console.error('Failed to load customers:', error);
            notiflix.Report.failure('Error', 'Failed to load customers', 'Ok');
          });
      }

      function loadAlerts() {
        $.get(window.api + "inventory/alerts")
          .done(function (data) {
            $("#alerts-section").empty();
            data.forEach(function (alert) {
              $("#alerts-section").append('<div class="alert alert-danger">' + alert.name + ' is low on stock (' + alert.quantity + ' <= ' + alert.minStock + ')</div>');
            });
          })
          .fail(function (xhr, status, error) {
            console.error('Failed to load alerts:', error);
            // Don't show error for alerts as it's not critical
          });
      }

      $.fn.reorder = function (id) {
        $.post(window.api + "inventory/reorder", { productId: id })
          .done(function () {
            loadProducts();
            loadAlerts();
            notiflix.Notify.success('Reordered product');
          })
          .fail(function (xhr, status, error) {
            console.error('Failed to reorder product:', error);
            notiflix.Report.failure('Error', 'Failed to reorder product', 'Ok');
          });
      }

      $.fn.addToCart = function (id, count, stock, bypassPrescription = false) {
        $.get(window.api + "inventory/product/" + id)
          .done(function (product) {

            // Check if product is available
            if (product.available === false) {
              notiflix.Report.warning(
                "Unavailable",
                `${product.name} is currently unavailable.`,
                "Ok",
              );
              return;
            }

            // Removed prescription check for restaurant conversion

            if (isExpired(product.expirationDate)) {
              notiflix.Report.failure(
                "Expired",
                `${product.name} is expired! Please restock.`,
                "Ok",
              );
            } else {
              if (count > 0) {
                $(this).showModifiersModal(product);
              } else {
                if (stock == 1) {
                  notiflix.Report.failure(
                    "Out of stock!",
                    `${product.name} is out of stock! Please restock.`,
                    "Ok",
                  );
                }
              }
            }
          })
          .fail(function (xhr, status, error) {
            console.error('Failed to load product:', error);
            notiflix.Report.failure('Error', 'Failed to load product details', 'Ok');
          });
      };

      function barcodeSearch(e) {
        e.preventDefault();
        let searchBarCodeIcon = $(".search-barcode-btn").html();
        $(".search-barcode-btn").empty();
        $(".search-barcode-btn").append(
          $("<i>", { class: "fa fa-spinner fa-spin" }),
        );

        let req = {
          skuCode: $("#skuCode").val(),
        };

        $.ajax({
          url: window.api + "inventory/product/sku",
          type: "POST",
          data: JSON.stringify(req),
          contentType: "application/json; charset=utf-8",
          cache: false,
          processData: false,
          success: function (product) {
            $(".search-barcode-btn").html(searchBarCodeIcon);
            const expired = isExpired(product.expirationDate);
            if (product._id != undefined && product.quantity >= 1 && !expired) {
              $(this).showModifiersModal(product);
              $("#searchBarCode").get(0).reset();
              $("#basic-addon2").empty();
              $("#basic-addon2").append(
                $("<i>", { class: "glyphicon glyphicon-ok" }),
              );
            } else if (expired) {
              notiflix.Report.failure(
                "Expired!",
                `${product.name} is expired`,
                "Ok",
              );
            } else if (product.quantity < 1) {
              notiflix.Report.info(
                "Out of stock!",
                "This item is currently unavailable",
                "Ok",
              );
            } else {
              notiflix.Report.warning(
                "Not Found!",
                "<b>" + $("#skuCode").val() + "</b> is not a valid barcode!",
                "Ok",
              );

              $("#searchBarCode").get(0).reset();
              $("#basic-addon2").empty();
              $("#basic-addon2").append(
                $("<i>", { class: "glyphicon glyphicon-ok" }),
              );
            }
          },
          error: function (xhr, status, error) {
            $(".search-barcode-btn").html(searchBarCodeIcon);
            console.error('Barcode search failed:', error);
            
            if (xhr.status === 422) {
              // Handle validation errors
              $("#basic-addon2").append(
                $("<i>", { class: "glyphicon glyphicon-remove" }),
              );
            } else if (xhr.status === 404) {
              // Handle not found
              $("#basic-addon2").empty();
              $("#basic-addon2").append(
                $("<i>", { class: "glyphicon glyphicon-remove" }),
              );
              notiflix.Report.warning(
                "Not Found!",
                "<b>" + $("#skuCode").val() + "</b> is not a valid barcode!",
                "Ok",
              );
            } else {
              // Handle other errors
              $("#basic-addon2").empty();
              $("#basic-addon2").append(
                $("<i>", { class: "glyphicon glyphicon-warning-sign" }),
              );
              notiflix.Report.failure(
                "Error!",
                "Failed to search for product. Please try again.",
                "Ok",
              );
            }
          },
        });
      }

      $("#searchBarCode").on("submit", function (e) {
        barcodeSearch(e);
      });

      $("body").on("click", "#jq-keyboard button", function (e) {
        let pressed = $(this)[0].className.split(" ");
        if ($("#skuCode").val() != "" && pressed[2] == "enter") {
          barcodeSearch(e);
        }
      });

      // Define default modifiers with categories
      const defaultModifiers = [
        {
          category: 'Spice Level',
          options: [
            { name: 'Less spicy', price: 0 },
            { name: 'Extra spicy', price: 0 },
            { name: 'No spice', price: 0 }
          ]
        },
        {
          category: 'Ingredients',
          options: [
            { name: 'No onion', price: 0 },
            { name: 'No garlic', price: 0 },
            { name: 'Extra cheese', price: 1.0 },
            { name: 'No cheese', price: 0 }
          ]
        },
        {
          category: 'Preparation',
          options: [
            { name: 'Extra ice', price: 0.5 },
            { name: 'No ice', price: 0 },
            { name: 'Well done', price: 0 },
            { name: 'Medium rare', price: 0 }
          ]
        },
        {
          category: 'Extras',
          options: [
            { name: 'Add cheese', price: 1.0 },
            { name: 'Add bacon', price: 1.5 },
            { name: 'Add avocado', price: 2.0 },
            { name: 'Extra sauce', price: 0.5 }
          ]
        }
      ];

      $.fn.showModifiersModal = function (product) {
        // Create modal HTML with categorized modifiers
        const modalHtml = `
          <div class="modal fade" id="modifiersModal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-lg" role="document">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Select Modifiers for ${product.name}</h5>
                  <button type="button" class="close" data-dismiss="modal">
                    <span>&times;</span>
                  </button>
                </div>
                <div class="modal-body">
                  <div id="modifiers-list" class="row">
                    ${defaultModifiers.map((category, catIndex) => `
                      <div class="col-md-6 mb-3">
                        <h6>${category.category}</h6>
                        ${category.options.map((option, optIndex) => `
                          <div class="form-check">
                            <input class="form-check-input" type="checkbox"
                                   id="mod-${catIndex}-${optIndex}"
                                   value="${catIndex}-${optIndex}"
                                   data-category="${catIndex}"
                                   data-option="${optIndex}">
                            <label class="form-check-label" for="mod-${catIndex}-${optIndex}">
                              ${option.name} ${option.price > 0 ? `(+${getCurrencySymbol()}${option.price})` : ''}
                            </label>
                          </div>
                        `).join('')}
                      </div>
                    `).join('')}
                  </div>
                  <div class="form-group mt-3">
                    <label for="specialInstructions">Special Instructions:</label>
                    <textarea class="form-control" id="specialInstructions" rows="2" placeholder="Add any special instructions..."></textarea>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                  <button type="button" class="btn btn-primary" id="addWithModifiers">Add to Cart</button>
                </div>
              </div>
            </div>
          </div>
        `;

        // Remove existing modal if any
        $('#modifiersModal').remove();

        // Append modal to body
        $('body').append(modalHtml);

        // Show modal
        $('#modifiersModal').modal('show');

        // Handle add button click
        $('#addWithModifiers').on('click', function() {
          const selectedModifiers = [];
          const specialInstructions = $('#specialInstructions').val().trim();

          $('#modifiers-list input:checked').each(function() {
            const [catIndex, optIndex] = $(this).val().split('-').map(Number);
            const modifier = defaultModifiers[catIndex].options[optIndex];
            selectedModifiers.push({
              ...modifier,
              category: defaultModifiers[catIndex].category
            });
          });

          // Add special instructions as a modifier if provided
          if (specialInstructions) {
            selectedModifiers.push({
              name: `Special: ${specialInstructions}`,
              price: 0,
              category: 'Special Instructions'
            });
          }

          $(this).addProductToCart(product, selectedModifiers);
          $('#modifiersModal').modal('hide');
        });
      };

      $.fn.addProductToCart = function (data, modifiers = []) {
        item = {
          id: data._id,
          product_name: data.name,
          sku: data.sku,
          price: data.price,
          quantity: 1,
          modifiers: modifiers,
        };

        if ($(this).isExist(item)) {
          $(this).qtIncrement(index);
        } else {
          cart.push(item);
          $(this).renderTable(cart);
        }
      };

      $.fn.isExist = function (data) {
        let toReturn = false;
        $.each(cart, function (index, value) {
          if (value.id == data.id && JSON.stringify(value.modifiers) == JSON.stringify(data.modifiers)) {
            $(this).setIndex(index);
            toReturn = true;
          }
        });
        return toReturn;
      };

      $.fn.setIndex = function (value) {
        index = value;
      };

      $.fn.calculateCart = function () {
        let total = 0;
        let grossTotal;
        let total_items = 0;
        $.each(cart, function (_, data) {
          const modifierPrice = data.modifiers ? data.modifiers.reduce((sum, mod) => sum + mod.price, 0) : 0;
          total += data.quantity * (data.price + modifierPrice);
          total_items += parseInt(data.quantity);
        });
        $("#total").text(total_items);
        total = total - $("#inputDiscount").val();
        $("#price").text(getCurrencySymbol() + moneyFormat(total.toFixed(2)));

        subTotal = total;

        if ($("#inputDiscount").val() >= total) {
          $("#inputDiscount").val(0);
        }

        // Calculate packaging fee for takeaway orders
        let packagingFee = 0;
        if (window.orderType === "2" && settings.enable_packaging_charge && settings.packaging_charge_amount) {
          packagingFee = parseFloat(settings.packaging_charge_amount);
          total += packagingFee;
        }
        window.packagingFee = packagingFee;

        // Calculate service charge if enabled
        let serviceCharge = 0;
        if (settings.charge_service_charge && settings.service_charge) {
          serviceCharge = (total * parseFloat(settings.service_charge)) / 100;
          total += serviceCharge;
        }

        if (settings.charge_tax) {
          totalVat = (total * vat) / 100;
          grossTotal = total + totalVat;
        } else {
          grossTotal = total;
        }

        orderTotal = grossTotal.toFixed(2);

        $("#gross_price").text(getCurrencySymbol() + moneyFormat(orderTotal));
        $("#payablePrice").val(moneyFormat(grossTotal));

        // Update service charge display in cart
        if (settings.charge_service_charge && settings.service_charge) {
          $("#service_charge_amount").text(getCurrencySymbol() + moneyFormat(serviceCharge.toFixed(2)));
          $("#service_charge_row").show();
        } else {
          $("#service_charge_row").hide();
        }

        // Update packaging fee display in cart
        if (packagingFee > 0) {
          $("#packaging_charge_amount").text(getCurrencySymbol() + moneyFormat(packagingFee.toFixed(2)));
          $("#packagingChargeRow").show();
        } else {
          $("#packagingChargeRow").hide();
        }
      };

      $.fn.renderTable = function (cartList) {
        $("#cartTable .card-body").empty();
        $(this).calculateCart();
        $.each(cartList, function (index, data) {
          const modifierPrice = data.modifiers ? data.modifiers.reduce((sum, mod) => sum + mod.price, 0) : 0;
          const modifierText = data.modifiers && data.modifiers.length > 0 ? ` (${data.modifiers.map(m => m.name).join(', ')})` : '';
          $("#cartTable .card-body").append(
            $("<div>", { class: "row m-t-10" }).append(
              $("<div>", { class: "col-md-1", text: index + 1 }),
              $("<div>", { class: "col-md-3", text: data.product_name + modifierText }),
              $("<div>", { class: "col-md-3" }).append(
                $("<div>", { class: "input-group" }).append(
                  $("<span>", { class: "input-group-btn" }).append(
                    $("<button>", {
                      class: "btn btn-light",
                      onclick: "$(this).qtDecrement(" + index + ")",
                    }).append($("<i>", { class: "fa fa-minus" })),
                  ),
                  $("<input>", {
                    class: "form-control",
                    type: "text",
                    readonly: "",
                    value: data.quantity,
                    min: "1",
                    onInput: "$(this).qtInput(" + index + ")",
                  }),
                  $("<span>", { class: "input-group-btn" }).append(
                    $("<button>", {
                      class: "btn btn-light",
                      onclick: "$(this).qtIncrement(" + index + ")",
                    }).append($("<i>", { class: "fa fa-plus" })),
                  ),
                ),
              ),
              $("<div>", {
                class: "col-md-3",
                text:
                  getCurrencySymbol() +
                  moneyFormat(((data.price + modifierPrice) * data.quantity).toFixed(2)),
              }),
              $("<div>", { class: "col-md-1" }).append(
                $("<button>", {
                  class: "btn btn-info btn-xs m-r-5",
                  title: "View Alternatives",
                  onclick: "$(this).viewSubstitutes(" + data.id + ", '" + data.product_name + "')",
                }).append($("<i>", { class: "fa fa-exchange" })),
                $("<button>", {
                  class: "btn btn-success btn-xs m-r-5",
                  title: "Make Complimentary",
                  onclick: "$(this).makeComplimentary(" + index + ")",
                }).append($("<i>", { class: "fa fa-gift" })),
                $("<button>", {
                  class: "btn btn-warning btn-xs m-r-5",
                  title: "Void Item",
                  onclick: "$(this).voidItem(" + index + ")",
                }).append($("<i>", { class: "fa fa-ban" })),
                $("<button>", {
                  class: "btn btn-light btn-xs",
                  onclick: "$(this).deleteFromCart(" + index + ")",
                }).append($("<i>", { class: "fa fa-times" })),
              ),
            ),
          );
        });
      };

      $.fn.deleteFromCart = function (index) {
        cart.splice(index, 1);
        $(this).renderTable(cart);
      };

      $.fn.makeComplimentary = function (index) {
        cart[index].price = 0;
        $(this).renderTable(cart);

        // Log the complimentary action
        $.post(window.api + 'audit-logs/log', {
          action: 'item_complimentary',
          user: user.fullname,
          details: {
            item_name: cart[index].product_name,
            item_id: cart[index].id,
            quantity: cart[index].quantity,
            timestamp: moment().toISOString()
          },
          severity: 'info'
        });
      };

      $.fn.voidItem = function (index) {
        // Show void modal
        $('#voidModal').remove();
        const modalHtml = `
          <div class="modal fade" id="voidModal" tabindex="-1" role="dialog">
            <div class="modal-dialog" role="document">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Void Item: ${cart[index].product_name}</h5>
                  <button type="button" class="close" data-dismiss="modal">
                    <span>&times;</span>
                  </button>
                </div>
                <div class="modal-body">
                  <form id="voidForm">
                    <div class="form-group">
                      <label for="managerUsername">Manager Username:</label>
                      <input type="text" class="form-control" id="managerUsername" required>
                    </div>
                    <div class="form-group">
                      <label for="managerPIN">Manager PIN/Password:</label>
                      <input type="password" class="form-control" id="managerPIN" required>
                    </div>
                    <div class="form-group">
                      <label for="voidReason">Reason for Void:</label>
                      <select class="form-control" id="voidReason" required>
                        <option value="">Select Reason</option>
                        <option value="Customer request">Customer request</option>
                        <option value="Wrong item">Wrong item</option>
                        <option value="Damaged item">Damaged item</option>
                        <option value="Expired item">Expired item</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </form>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                  <button type="button" class="btn btn-danger" id="confirmVoid">Confirm Void</button>
                </div>
              </div>
            </div>
          </div>
        `;
        $('body').append(modalHtml);
        $('#voidModal').modal('show');

        $('#confirmVoid').on('click', function() {
          const username = $('#managerUsername').val();
          const pin = $('#managerPIN').val();
          const reason = $('#voidReason').val();

          if (!username || !pin || !reason) {
            notiflix.Report.warning('Incomplete', 'Please fill all fields', 'Ok');
            return;
          }

          // Verify manager credentials
          $.post(window.api + 'users/verify-manager', { username, password: pin })
            .done(function(response) {
              if (response.valid) {
                const item = cart.splice(index, 1)[0];
                $(this).renderTable(cart);

                // Log the void action
                $.post(window.api + 'audit-logs/log', {
                  action: 'item_void',
                  user: user.fullname,
                  details: {
                    item_name: item.product_name,
                    item_id: item.id,
                    quantity: item.quantity,
                    reason: reason,
                    timestamp: moment().toISOString()
                  },
                  severity: 'warning'
                });

                $('#voidModal').modal('hide');
                notiflix.Notify.success('Item voided successfully');
              } else {
                notiflix.Report.failure('Invalid Credentials', 'Manager credentials are incorrect', 'Ok');
              }
            })
            .fail(function() {
              notiflix.Report.failure('Error', 'Failed to verify credentials', 'Ok');
            });
        });
      };

      $.fn.qtIncrement = function (i) {
        item = cart[i];
        let product = allProducts.filter(function (selected) {
          return selected._id == parseInt(item.id);
        });

        if (product[0].stock == 1) {
          if (item.quantity < product[0].quantity) {
            item.quantity = parseInt(item.quantity) + 1;
            $(this).renderTable(cart);
          } else {
            notiflix.Report.info(
              "No more stock!",
              "You have already added all the available stock.",
              "Ok",
            );
          }
        } else {
          item.quantity = parseInt(item.quantity) + 1;
          $(this).renderTable(cart);
        }
      };

      $.fn.qtDecrement = function (i) {
        if (item.quantity > 1) {
          item = cart[i];
          item.quantity = parseInt(item.quantity) - 1;
          $(this).renderTable(cart);
        }
      };

      $.fn.qtInput = function (i) {
        item = cart[i];
        item.quantity = $(this).val();
        $(this).renderTable(cart);
      };

      $.fn.cancelOrder = function () {
        if (cart.length > 0) {
          const diagOptions = {
            title: "Are you sure?",
            text: "You are about to remove all items from the cart.",
            icon: "warning",
            showCancelButton: true,
            okButtonText: "Yes, clear it!",
            cancelButtonText: "Cancel",
            options: {
              // okButtonBackground: "#3085d6",
              cancelButtonBackground: "#d33",
            },
          };

          notiflix.Confirm.show(
            diagOptions.title,
            diagOptions.text,
            diagOptions.okButtonText,
            diagOptions.cancelButtonText,
            () => {
              cart = [];
              $(this).renderTable(cart);
              holdOrder = 0;
              notiflix.Report.success(
                "Cleared!",
                "All items have been removed.",
                "Ok",
              );
            },
            "",
            diagOptions.options,
          );
        }
      };

      $("#payButton").on("click", function () {
        if (cart.length != 0) {
          $("#paymentModel").modal("toggle");
        } else {
          notiflix.Report.warning("Oops!", "There is nothing to pay!", "Ok");
        }
      });

      $("#hold").on("click", function () {
        if (cart.length != 0) {
          // Add order notes textarea if not already added
          if ($('#orderNotes').length === 0) {
            $('#dueModal .modal-body').append('<div class="form-group"><label for="orderNotes">Order Notes:</label><textarea class="form-control" id="orderNotes" rows="3" placeholder="Add captain or order notes here..."></textarea></div>');
          }
          $("#dueModal").modal("toggle");
        } else {
          notiflix.Report.warning("Oops!", "There is nothing to hold!", "Ok");
        }
      });

      function printJobComplete() {
        notiflix.Report.success("Done", "print job complete", "Ok");
      }

      // Make printJobComplete available globally
      window.printJobComplete = printJobComplete;

      function getOrderChanges(originalItems, newItems) {
      const changes = [];
      const origMap = new Map();
      originalItems.forEach(item => origMap.set(item.id + JSON.stringify(item.modifiers), item));

      const newMap = new Map();
      newItems.forEach(item => newMap.set(item.id + JSON.stringify(item.modifiers), item));

      // Added
      newMap.forEach((item, key) => {
        if (!origMap.has(key)) {
          changes.push({ type: 'added', item: item.product_name, quantity: item.quantity });
        } else if (origMap.get(key).quantity !== item.quantity) {
          changes.push({ type: 'modified', item: item.product_name, oldQty: origMap.get(key).quantity, newQty: item.quantity });
        }
      });

      // Removed
      origMap.forEach((item, key) => {
        if (!newMap.has(key)) {
          changes.push({ type: 'removed', item: item.product_name, quantity: item.quantity });
        }
      });

      return changes;
    }

    $.fn.submitDueOrder = function (status) {
        let items = "";
        let payment = "";
        let paymentType = $('.list-group-item.active').data('payment-type');
        cart.forEach((item) => {
          const modifierPrice = item.modifiers ? item.modifiers.reduce((sum, mod) => sum + mod.price, 0) : 0;
          const modifierText = item.modifiers && item.modifiers.length > 0 ? ` (${item.modifiers.map(m => m.name).join(', ')})` : '';
          items += `<tr><td>${DOMPurify.sanitize(item.product_name + modifierText)}</td><td>${DOMPurify.sanitize(item.quantity)
            } </td><td class="text-right"> ${DOMPurify.sanitize(getCurrencySymbol())} ${moneyFormat(
              DOMPurify.sanitize(Math.abs((item.price + modifierPrice) * item.quantity).toFixed(2)),
            )} </td></tr>`;
        });

        let currentTime = new Date(moment());
        let discount = $("#inputDiscount").val();
        let customer = JSON.parse($("#customer").val());
        let date = moment(currentTime).format("YYYY-MM-DD HH:mm:ss");
        let paymentAmount = $("#payment").val().replace(",", "");
        let changeAmount = $("#change").text().replace(",", "");
        let paid =
          $("#payment").val() == "" ? "" : parseFloat(paymentAmount).toFixed(2);
        let change =
          $("#change").text() == "" ? "" : parseFloat(changeAmount).toFixed(2);
        let refNumber = $("#refNumber").val();
        let orderNotes = $("#orderNotes").val() || "";
        let orderNumber = holdOrder;
        let type = "";
        let tax_row = "";
        switch (paymentType) {
          case 1:
            type = "Cash";
            break;
          case 3:
            type = "Card";
            break;
        }

        if (paid != "") {
          payment = `<tr>
                            <td>Paid</td>
                            <td>:</td>
                            <td class="text-right">${getCurrencySymbol()} ${moneyFormat(
            Math.abs(paid).toFixed(2),
          )}</td>
                        </tr>
                        <tr>
                            <td>Change</td>
                            <td>:</td>
                            <td class="text-right">${getCurrencySymbol()} ${moneyFormat(
            Math.abs(change).toFixed(2),
          )}</td>
                        </tr>
                        <tr>
                            <td>Method</td>
                            <td>:</td>
                            <td class="text-right">${type}</td>
                        </tr>`;
        }

        // Variables already calculated above for data object
        // serviceCharge, tipAmount, tipPercentage, splitTipAmongStaff are already defined

        let receipt_tax_row = "";
        if (settings.charge_tax) {
          receipt_tax_row = `<tr>
                        <td>Tax Details</td>
                        <td>:</td>
                        <td class="text-right">${getCurrencySymbol()} ${moneyFormat(parseFloat(totalVat).toFixed(2))} (${safeUnescape(settings.percentage)}%)</td>
                    </tr>`;
        }

        let receipt_packaging_fee_row = "";
        const packagingFee = window.packagingFee || 0;
        if (packagingFee > 0) {
          receipt_packaging_fee_row = `<tr>
                        <td>Packaging Fee</td>
                        <td>:</td>
                        <td class="text-right">${getCurrencySymbol()} ${moneyFormat(packagingFee.toFixed(2))}</td>
                    </tr>`;
        }

        let receipt_service_charge_row = "";
        if (serviceCharge > 0) {
          receipt_service_charge_row = `<tr>
                        <td>Service Charge (${settings.service_charge}%)</td>
                        <td>:</td>
                        <td class="text-right">${getCurrencySymbol()} ${moneyFormat(serviceCharge.toFixed(2))}</td>
                    </tr>`;
        }

        let receipt_tip_row = "";
        if (tipAmount > 0) {
          receipt_tip_row = `<tr>
                        <td>Tip (${tipPercentage}%)</td>
                        <td>:</td>
                        <td class="text-right">${getCurrencySymbol()} ${moneyFormat(tipAmount.toFixed(2))}</td>
                    </tr>`;
        }

        let receipt_tip_split_rows = "";
        if (splitTipAmongStaff && tipAmount > 0) {
          $("#staffList input:checked").each(function() {
            const staffName = $(this).siblings("label").text().trim();
            const staffTipAmount = parseFloat($(this).siblings(".staff-tip-amount").val()) || 0;
            if (staffTipAmount > 0) {
              receipt_tip_split_rows += `<tr>
                        <td>Tip - ${staffName}</td>
                        <td>:</td>
                        <td class="text-right">${getCurrencySymbol()} ${moneyFormat(staffTipAmount.toFixed(2))}</td>
                    </tr>`;
            }
          });
        }

        if (status == 0) {
          if ($("#customer").val() == 0 && $("#refNumber").val() == "") {
            notiflix.Report.warning(
              "Reference Required!",
              "You either need to select a customer <br> or enter a reference!",
              "Ok",
            );
            return;
          }
        }

        $(".loading").show();

        if (holdOrder != 0) {
          orderNumber = holdOrder;
          method = "PUT";
        } else {
          orderNumber = Math.floor(Date.now() / 1000);
          method = "POST";
        }

        let logo = path.join(img_path, safeUnescape(settings.img));

        // Generate multilingual receipt
        if (LanguageSupport && LanguageSupport.generateMultilingualReceipt) {
          const receiptData = {
            orderNumber: orderNumber,
            refNumber: refNumber,
            customer: customer == 0 ? "Walk in customer" : _.escape(customer.name),
            cashier: user.fullname,
            date: date,
            items: cart.map(item => {
              const modifierPrice = item.modifiers ? item.modifiers.reduce((sum, mod) => sum + mod.price, 0) : 0;
              return {
                product_name: item.product_name,
                quantity: item.quantity,
                price: item.price + modifierPrice,
                modifiers: item.modifiers
              };
            }),
            subtotal: subTotal,
            discount: discount,
            tax: totalVat,
            taxRate: safeUnescape(settings.percentage),
            serviceCharge: serviceCharge,
            serviceChargeRate: settings.service_charge || 0,
            tipAmount: tipAmount,
            tipPercentage: tipPercentage,
            total: orderTotal,
            paid: paid,
            change: change,
            paymentType: type,
            currencySymbol: getCurrencySymbol(),
            storeName: safeUnescape(settings.store),
            addressOne: safeUnescape(settings.address_one),
            addressTwo: safeUnescape(settings.address_two),
            contact: safeUnescape(settings.contact),
            taxNumber: safeUnescape(settings.tax),
            footer: safeUnescape(settings.footer),
            logo: checkFileExists(logo) ? logo : ''
          };
          receipt = LanguageSupport.generateMultilingualReceipt(receiptData);
        } else {
          // Fallback to original receipt generation
          receipt = this.generateOriginalReceipt(receiptData);
        }

        if (status == 3) {
          if (cart.length > 0) {
            printJS({ printable: receipt, type: "raw-html" });

            $(".loading").hide();
            return;
          } else {
            $(".loading").hide();
            return;
          }
        }

        // Variables already calculated above: serviceCharge, tipAmount, tipPercentage, splitTipAmongStaff
        
        // Collect tip splitting data if enabled
        let tipSplitData = [];
        if (splitTipAmongStaff) {
          $("#staffList input:checked").each(function() {
            const staffId = $(this).val();
            const staffName = $(this).siblings("label").text().trim();
            const staffTipAmount = parseFloat($(this).siblings(".staff-tip-amount").val()) || 0;
            if (staffTipAmount > 0) {
              tipSplitData.push({
                staff_id: staffId,
                staff_name: staffName,
                tip_amount: staffTipAmount
              });
            }
          });
        }

        let data = {
          order: orderNumber,
          ref_number: refNumber,
          notes: orderNotes,
          discount: discount,
          customer: customer,
          status: status,
          subtotal: parseFloat(subTotal).toFixed(2),
          packaging_fee: parseFloat(packagingFee || 0),
          service_charge: serviceCharge,
          service_charge_rate: settings.service_charge || 0,
          tip_amount: tipAmount,
          tip_percentage: tipPercentage,
          split_tip_among_staff: splitTipAmongStaff,
          tip_split_data: tipSplitData,
          tax: totalVat,
          order_type: window.orderType || "1",
          items: cart,
          date: currentTime,
          payment_type: type,
          payment_info: $("#paymentInfo").val(),
          total: parseFloat(orderTotal).toFixed(2),
          paid: paid,
          change: change,
          _id: orderNumber,
          till: platform.till,
          mac: platform.mac,
          user: user.fullname,
          user_id: user._id,
          delivery_partner: $("#deliveryPartner").val(),
          tax_details: {
            total: totalVat,
            rate: safeUnescape(settings.percentage),
            type: 'VAT'
          },
          payment_mode: type
        };

        $.ajax({
          url: window.api + "new",
          type: method,
          data: JSON.stringify(data),
          contentType: "application/json; charset=utf-8",
          cache: false,
          processData: false,
          success: function (response) {
            cart = [];
            receipt = DOMPurify.sanitize(receipt, { ALLOW_UNKNOWN_PROTOCOLS: true });

        // Fallback function for original receipt generation
        function generateOriginalReceipt(data, receiptData) {
          let logo = path.join(img_path, safeUnescape(settings.img));
          
          let items = "";
          let payment = "";
          receiptData.items.forEach((item) => {
            const modifierPrice = item.modifiers ? item.modifiers.reduce((sum, mod) => sum + mod.price, 0) : 0;
            const modifierText = item.modifiers && item.modifiers.length > 0 ? ` (${item.modifiers.map(m => m.name).join(', ')})` : '';
            items += `<tr><td>${DOMPurify.sanitize(item.product_name + modifierText)}</td><td>${DOMPurify.sanitize(item.quantity)}
            </td><td class="text-right"> ${DOMPurify.sanitize(getCurrencySymbol())} ${moneyFormat(
              DOMPurify.sanitize(Math.abs((item.price) * item.quantity).toFixed(2)),
            )} </td></tr>`;
          });

          let receipt_tax_row = "";
          if (settings.charge_tax) {
            receipt_tax_row = `<tr>
                        <td>Tax Details</td>
                        <td>:</td>
                        <td class="text-right">${getCurrencySymbol()} ${moneyFormat(parseFloat(totalVat).toFixed(2))} (${safeUnescape(settings.percentage)}%)</td>
                    </tr>`;
          }

          let receipt_service_charge_row = "";
          if (serviceCharge > 0) {
            receipt_service_charge_row = `<tr>
                        <td>Service Charge (${settings.service_charge}%)</td>
                        <td>:</td>
                        <td class="text-right">${getCurrencySymbol()} ${moneyFormat(serviceCharge.toFixed(2))}</td>
                    </tr>`;
          }

          let receipt_tip_row = "";
          if (tipAmount > 0) {
            receipt_tip_row = `<tr>
                        <td>Tip (${tipPercentage}%)</td>
                        <td>:</td>
                        <td class="text-right">${getCurrencySymbol()} ${moneyFormat(tipAmount.toFixed(2))}</td>
                    </tr>`;
          }

          if (receiptData.paid && parseFloat(receiptData.paid) > 0) {
            payment = `<tr>
                            <td>Paid</td>
                            <td>:</td>
                            <td class="text-right">${getCurrencySymbol()} ${moneyFormat(Math.abs(receiptData.paid).toFixed(2))}</td>
                        </tr>
                        <tr>
                            <td>Change</td>
                            <td>:</td>
                            <td class="text-right">${getCurrencySymbol()} ${moneyFormat(Math.abs(receiptData.change).toFixed(2))}</td>
                        </tr>
                        <tr>
                            <td>Method</td>
                            <td>:</td>
                            <td class="text-right">${receiptData.paymentType}</td>
                        </tr>`;
          }

          return `<div style="font-size: 10px">                            
          <p style="text-align: center;">
          ${checkFileExists(logo) ? `<img style='max-width: 50px' src='${logo}' /><br>` : ``}
            <span style="font-size: 22px;">${safeUnescape(settings.store)}</span> <br>
            ${safeUnescape(settings.address_one)} <br>
            ${safeUnescape(settings.address_two)} <br>
            ${safeUnescape(settings.contact) != "" ? "Tel: " + safeUnescape(settings.contact) + "<br>" : ""
          } 
            ${safeUnescape(settings.tax) != "" ? "Vat No: " + safeUnescape(settings.tax) + "<br>" : ""} 
          </p>
          <hr>
          <left>
              <p>
              Order No : ${receiptData.orderNumber} <br>
              Ref No : ${receiptData.refNumber == "" ? receiptData.orderNumber : _.escape(receiptData.refNumber)} <br>
              Customer : ${receiptData.customer} <br>
              Cashier : ${receiptData.cashier} <br>
              Date : ${receiptData.date}<br>
              </p>

          </left>
          <hr>
          <table width="90%">
              <thead>
              <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th class="text-right">Price</th>
              </tr>
              </thead>
              <tbody>
               ${items}                
              <tr><td colspan="3"><hr></td></tr>
              <tr>                        
                  <td><b>Subtotal</b></td>
                  <td>:</td>
                  <td class="text-right"><b>${getCurrencySymbol()}${moneyFormat(
              receiptData.subtotal.toFixed(2),
            )}</b></td>
              </tr>
              <tr>
                  <td>Discount</td>
                  <td>:</td>
                  <td class="text-right">${receiptData.discount > 0
              ? getCurrencySymbol() +
              moneyFormat(parseFloat(receiptData.discount).toFixed(2))
              : ""
            }</td>
              </tr>
              ${receipt_service_charge_row}
              ${receipt_tip_row}
              ${receipt_tax_row}
              <tr>
                  <td><h5>Total</h5></td>
                  <td><h5>:</h5></td>
                  <td class="text-right">
                      <h5>${getCurrencySymbol()} ${moneyFormat(
              parseFloat(receiptData.total).toFixed(2),
            )}</h5>
                  </td>
              </tr>
              ${payment == 0 ? "" : payment}
              </tbody>
              </table>
              <br>
              <hr>
              <br>
              <p style="text-align: center;">
               ${safeUnescape(settings.footer)}
               </p>
              </div>`;
        }
            $("#viewTransaction").html("");
            $("#viewTransaction").html(receipt);
            $("#orderModal").modal("show");
            loadProducts();
            loadCustomers();
            $(".loading").hide();
            $("#dueModal").modal("hide");
            $("#paymentModel").modal("hide");
            $(this).getHoldOrders();
            $(this).getCustomerOrders();
            $(this).renderTable(cart);

            // Log order edits
            if (originalOrder && originalOrder.items) {
              const newItems = cart.map(item => ({ id: item.id, product_name: item.product_name, quantity: item.quantity, modifiers: item.modifiers }));
              const changes = getOrderChanges(originalOrder.items, newItems);
              if (changes.length > 0) {
                const logData = {
                  order_id: originalOrder.orderId,
                  user_id: user._id,
                  timestamp: moment().toISOString(),
                  changes: JSON.stringify(changes),
                  action: 'order_edit'
                };
                $.post(window.api + "audit-logs", JSON.stringify(logData), "application/json");
              }
            }
            originalOrder = null;
          },
          error: function (xhr, status, error) {
            $(".loading").hide();
            $("#dueModal").modal("toggle");
            console.error('Transaction submission failed:', error);
            
            let errorMessage = "Something went wrong! Please refresh this page and try again";
            
            // Try to extract meaningful error message from response
            if (xhr.responseJSON && xhr.responseJSON.message) {
              errorMessage = xhr.responseJSON.message;
            } else if (xhr.status === 0) {
              errorMessage = "Network error. Please check your connection and try again.";
            } else if (xhr.status >= 500) {
              errorMessage = "Server error. Please try again later.";
            }
            
            notiflix.Report.failure(
              "Transaction Failed",
              errorMessage,
              "Ok"
            );
          },
        });

        $("#refNumber").val("");
        $("#change").text("");
        $("#payment,#paymentText").val("");
      };

      $.get(window.api + "on-hold")
        .done(function (data) {
          holdOrderList = data;
          holdOrderlocation.empty();
          // clearInterval(dotInterval);
          $(this).renderHoldOrders(holdOrderList, holdOrderlocation, 1);
        })
        .fail(function (xhr, status, error) {
          console.error('Failed to load hold orders:', error);
          // Don't show error for hold orders as it's not critical
        });

      $.fn.getHoldOrders = function () {
        $.get(window.api + "on-hold")
          .done(function (data) {
            holdOrderList = data;
            clearInterval(dotInterval);
            holdOrderlocation.empty();
            $(this).renderHoldOrders(holdOrderList, holdOrderlocation, 1);
          })
          .fail(function (xhr, status, error) {
            console.error('Failed to refresh hold orders:', error);
          });
      };

      $.fn.renderHoldOrders = function (data, renderLocation, orderType) {
        $.each(data, function (index, order) {
          $(this).calculatePrice(order);
          renderLocation.append(
            $("<div>", {
              class:
                orderType == 1 ? "col-md-3 order" : "col-md-3 customer-order",
            }).append(
              $("<a>").append(
                $("<div>", { class: "card-box order-box" }).append(
                  $("<p>").append(
                    $("<b>", { text: "Ref :" }),
                    $("<span>", { text: order.ref_number, class: "ref_number" }),
                    $("<br>"),
                    $("<b>", { text: "Price :" }),
                    $("<span>", {
                      text: order.total,
                      class: "label label-info",
                      style: "font-size:14px;",
                    }),
                    $("<br>"),
                    $("<b>", { text: "Items :" }),
                    $("<span>", { text: order.items.length }),
                    $("<br>"),
                    $("<b>", { text: "Customer :" }),
                    $("<span>", {
                      text:
                        order.customer != 0
                          ? order.customer.name
                          : "Walk in customer",
                      class: "customer_name",
                    }),
                  ),
                  $("<button>", {
                    class: "btn btn-danger del",
                    onclick:
                      "$(this).deleteOrder(" + index + "," + orderType + ")",
                  }).append($("<i>", { class: "fa fa-trash" })),

                  $("<button>", {
                    class: "btn btn-default",
                    onclick:
                      "$(this).orderDetails(" + index + "," + orderType + ")",
                  }).append($("<span>", { class: "fa fa-shopping-basket" })),
                ),
              ),
            ),
          );
        });
      };

      $.fn.calculatePrice = function (data) {
        totalPrice = 0;
        $.each(data.products, function (_, product) {
          totalPrice += product.price * product.quantity;
        });

        let vat = (totalPrice * data.vat) / 100;
        totalPrice = (totalPrice + vat - data.discount).toFixed(0);

        return totalPrice;
      };

      $.fn.orderDetails = function (index, orderType) {
        $("#refNumber").val("");

        if (orderType == 1) {
          $("#refNumber").val(holdOrderList[index].ref_number);

          $("#customer option:selected").removeAttr("selected");

          $("#customer option")
            .filter(function () {
              return $(this).text() == "Walk in customer";
            })
            .prop("selected", true);

          holdOrder = holdOrderList[index]._id;
          cart = [];
          $.each(holdOrderList[index].items, function (_, product) {
            item = {
              id: product.id,
              product_name: product.product_name,
              sku: product.sku,
              price: product.price,
              quantity: product.quantity,
            };
            cart.push(item);
          });
        } else if (orderType == 2) {
          $("#refNumber").val("");

          $("#customer option:selected").removeAttr("selected");

          $("#customer option")
            .filter(function () {
              return $(this).text() == customerOrderList[index].customer.name;
            })
            .prop("selected", true);

          holdOrder = customerOrderList[index]._id;
          cart = [];
          $.each(customerOrderList[index].items, function (_, product) {
            item = {
              id: product.id,
              product_name: product.product_name,
              sku: product.sku,
              price: product.price,
              quantity: product.quantity,
            };
            cart.push(item);
          });
        }
        $(this).renderTable(cart);
        $("#holdOrdersModal").modal("hide");
        $("#customerModal").modal("hide");

        // Store original order for edit logging
        originalOrder = {
          orderId: holdOrder || orderNumber,
          items: [...cart],
          user: user.fullname,
          timestamp: moment().toISOString()
        };
      };

      $.fn.deleteOrder = function (index, type) {
        switch (type) {
          case 1:
            deleteId = holdOrderList[index]._id;
            break;
          case 2:
            deleteId = customerOrderList[index]._id;
        }

        let data = {
          orderId: deleteId,
        };
        let diagOptions = {
          title: "Delete order?",
          text: "This will delete the order. Are you sure you want to delete!",
          icon: "warning",
          showCancelButton: true,
          okButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          okButtonText: "Yes, delete it!",
          cancelButtonText: "Cancel",
        };

        notiflix.Confirm.show(
          diagOptions.title,
          diagOptions.text,
          diagOptions.okButtonText,
          diagOptions.cancelButtonText,
          () => {
            $.ajax({
              url: window.api + "delete",
              type: "POST",
              data: JSON.stringify(data),
              contentType: "application/json; charset=utf-8",
              cache: false,
              success: function () {
                $(this).getHoldOrders();
                $(this).getCustomerOrders();

                notiflix.Report.success(
                  "Deleted!",
                  "You have deleted the order!",
                  "Ok",
                );
              },
              error: function (xhr, status, error) {
                $(".loading").hide();
                const errorMessage = handleAjaxError(xhr, status, error, "Failed to delete order");
                notiflix.Report.failure("Delete Failed", errorMessage, "Ok");
              },
            });
          },
        );
      };

      $.fn.getCustomerOrders = function () {
        $.get(window.api + "customer-orders")
          .done(function (data) {
            //clearInterval(dotInterval);
            customerOrderList = data;
            customerOrderLocation.empty();
            $(this).renderHoldOrders(customerOrderList, customerOrderLocation, 2);
          })
          .fail(function (xhr, status, error) {
            console.error('Failed to load customer orders:', error);
          });
      };

      $("#saveCustomer").on("submit", function (e) {
        e.preventDefault();

        let custData = {
          _id: Date.now() + Math.floor(Math.random() * 1000),
          name: $("#userName").val(),
          phone: $("#phoneNumber").val(),
          email: $("#emailAddress").val(),
          address: $("#userAddress").val(),
        };

        $.ajax({
          url: window.api + "customers/customer",
          type: "POST",
          data: JSON.stringify(custData),
          contentType: "application/json; charset=utf-8",
          cache: false,
          processData: false,
          success: function () {
            $("#newCustomer").modal("hide");
            notiflix.Report.success(
              "Customer added!",
              "Customer added successfully!",
              "Ok",
            );
            $("#customer option:selected").removeAttr("selected");
            $("#customer").append(
              $("<option>", {
                text: custData.name,
                value: JSON.stringify({ id: custData._id, name: custData.name }),
                selected: "selected",
              }),
            );

            $("#customer")
              .val(JSON.stringify({ id: custData._id, name: custData.name }))
              .trigger("chosen:updated");
          },
          error: function (xhr, status, error) {
            $("#newCustomer").modal("hide");
            const errorMessage = handleAjaxError(xhr, status, error, "Failed to add customer");
            notiflix.Report.failure(
              "Error",
              errorMessage,
              "Ok",
            );
          },
        });
      });

      $("#confirmPayment").hide();

      $("#cardInfo").hide();

      $("#payment").on("input", function () {
        $(this).calculateChange();
      });

      // Tip functionality
      $("#tipAmount").on("input", function () {
        const tipAmount = parseFloat($(this).val()) || 0;
        const totalWithService = parseFloat($("#payablePrice").val()) || 0;
        const tipPercentage = totalWithService > 0 ? (tipAmount / totalWithService * 100).toFixed(1) : 0;
        $("#tipPercentage").val(tipPercentage);
        updatePaymentSummary();
      });

      $("#tipPercentage").on("input", function () {
        const tipPercentage = parseFloat($(this).val()) || 0;
        const totalWithService = parseFloat($("#payablePrice").val()) || 0;
        const tipAmount = (totalWithService * tipPercentage / 100).toFixed(2);
        $("#tipAmount").val(tipAmount);
        updatePaymentSummary();
      });

      // Quick tip percentage buttons
      $('.quick-tip-btn').on('click', function() {
        const percentage = parseFloat($(this).data('percentage'));
        const totalWithService = parseFloat($("#payablePrice").val()) || 0;
        const tipAmount = (totalWithService * percentage / 100).toFixed(2);
        
        $("#tipPercentage").val(percentage);
        $("#tipAmount").val(tipAmount);
        updatePaymentSummary();
      });

      // Tip splitting functionality
      $("#splitTipCheckbox").on("change", function() {
        if ($(this).is(":checked")) {
          $("#tipSplitSection").show();
          loadStaffForTipSplitting();
        } else {
          $("#tipSplitSection").hide();
        }
        updatePaymentSummary();
      });

      $("#splitEquallyBtn").on("click", function() {
        const checkedStaff = $("#staffList input:checked");
        if (checkedStaff.length === 0) {
          notiflix.Report.warning('No Staff Selected', 'Please select staff members to split tip with', 'Ok');
          return;
        }
        
        const tipAmount = parseFloat($("#tipAmount").val()) || 0;
        const equalShare = (tipAmount / checkedStaff.length).toFixed(2);
        
        checkedStaff.each(function() {
          $(this).siblings(".staff-tip-amount").val(equalShare);
        });
        
        updatePaymentSummary();
      });

      $("#clearTipSplitBtn").on("click", function() {
        $("#staffList input[type='number']").val('');
        updatePaymentSummary();
      });

      // Update payment summary when staff tip amounts change
      $(document).on("input", ".staff-tip-amount", function() {
        updatePaymentSummary();
      });

      // Handle order type change
      $("#orderType").on("change", function() {
        window.orderType = $(this).val();
        $(this).calculateCart();
      });

      // Set default order type
      window.orderType = "1";
      window.packagingFee = 0;

      function updatePaymentSummary() {
        const subtotal = parseFloat($("#price").text().replace(/[^\d.-]/g, '')) || 0;
        const serviceCharge = parseFloat($("#service_charge_amount").text().replace(/[^\d.-]/g, '')) || 0;
        const tipAmount = parseFloat($("#tipAmount").val()) || 0;
        const taxAmount = parseFloat($("#taxInfo").text()) || 0;
        
        const totalWithTip = subtotal + serviceCharge + tipAmount + (subtotal + serviceCharge) * taxAmount / 100;
        
        $("#total_with_service").text(getCurrencySymbol() + moneyFormat(totalWithTip.toFixed(2)));
        $("#final_total").text(getCurrencySymbol() + moneyFormat(totalWithTip.toFixed(2)));
        
        // Update service charge display
        if (serviceCharge > 0) {
          $("#payment_service_charge").text(getCurrencySymbol() + moneyFormat(serviceCharge.toFixed(2))).parent().show();
        } else {
          $("#payment_service_charge").parent().hide();
        }
        
        // Update tip display
        if (tipAmount > 0) {
          $("#payment_tip_amount").text(getCurrencySymbol() + moneyFormat(tipAmount.toFixed(2))).parent().show();
          $("#tip_percentage_display").text($("#tipPercentage").val() + '%').parent().show();
        } else {
          $("#payment_tip_amount").parent().hide();
          $("#tip_percentage_display").parent().hide();
        }
      }

      function loadStaffForTipSplitting() {
        $("#staffList").empty();
        if (allUsers && allUsers.length > 0) {
          allUsers.forEach(function(user) {
            const staffItem = $(`
              <div class="form-check mb-2">
                <input class="form-check-input" type="checkbox" id="staff_${user._id}" value="${user._id}">
                <label class="form-check-label" for="staff_${user._id}">
                  ${user.fullname}
                </label>
                <input type="number" class="form-control form-control-sm staff-tip-amount" 
                       placeholder="Tip amount" step="0.01" min="0" style="width: 100px; display: inline-block; margin-left: 10px;">
              </div>
            `);
            $("#staffList").append(staffItem);
          });
        }
      }
      $("#confirmPayment").on("click", function () {
        if ($("#payment").val() == "") {
          notiflix.Report.warning(
            "Nope!",
            "Please enter the amount that was paid!",
            "Ok",
          );
        } else {
          $(this).submitDueOrder(1);
        }
      });

      $("#transactions").on("click", function () {
        loadTransactions();
        loadUserList();

        // Show transactions view, hide POS view
        $("#pos_view").hide();
        $("#transactions_view").show();
      });

      $("#pointofsale").on("click", function () {
        // Show POS view, hide transactions view
        $("#pos_view").show();
        $("#transactions_view").hide();
      });

      $("#viewRefOrders").on("click", function () {
        setTimeout(function () {
          $("#holdOrderInput")[0].focus();
        }, 500);
      });

      $("#viewCustomerOrders").on("click", function () {
        setTimeout(function () {
          $("#holdCustomerOrderInput")[0].focus();
        }, 500);
      });

      $("#newProductModal").on("click", function () {
        $("#saveProduct").get(0).reset();
        $("#current_img").text("");
      });

      // Removed prescription modal logic for restaurant conversion

      $("#saveProduct").on("submit", function (e) {
        e.preventDefault();

        $(this).attr("action", window.api + "inventory/product");
        $(this).attr("method", "POST");

        $(this).ajaxSubmit({
          contentType: "application/json",
          success: function (response) {
            $("#saveProduct").get(0).reset();
            $("#current_img").text("");

            loadProducts();
            diagOptions = {
              title: "Product Saved",
              text: "Select an option below to continue.",
              okButtonText: "Add another",
              cancelButtonText: "Close",
            };

            notiflix.Confirm.show(
              diagOptions.title,
              diagOptions.text,
              diagOptions.okButtonText,
              diagOptions.cancelButtonText,
              () => { },
              () => {
                $("#newProduct").modal("hide");
              },
            );
          },
          //error for product
          error: function (jqXHR, textStatus, errorThrown) {
            console.error(jqXHR.responseJSON.message);
            notiflix.Report.failure(
              jqXHR.responseJSON.error,
              jqXHR.responseJSON.message,
              "Ok",
            );
          }

        });
      });

      $("#saveCategory").on("submit", function (e) {
        e.preventDefault();

        if ($("#category_id").val() == "") {
          method = "POST";
        } else {
          method = "PUT";
        }

        $.ajax({
          type: method,
          url: window.api + "categories/category",
          data: $(this).serialize(),
          success: function () {
            $("#saveCategory").get(0).reset();
            loadCategories();
            loadProducts();
            diagOptions = {
              title: "Category Saved",
              text: "Select an option below to continue.",
              okButtonText: "Add another",
              cancelButtonText: "Close",
            };

            notiflix.Confirm.show(
              diagOptions.title,
              diagOptions.text,
              diagOptions.okButtonText,
              diagOptions.cancelButtonText,
              () => { },

              () => {
                $("#newCategory").modal("hide");
              },
            );
          },
          error: function (xhr, status, error) {
            const errorMessage = handleAjaxError(xhr, status, error, "Failed to save category");
            notiflix.Report.failure("Error", errorMessage, "Ok");
          },
        });
      });

      $.fn.editProduct = function (index) {
        $("#Products").modal("hide");

        $("#category option")
          .filter(function () {
            return $(this).val() == allProducts[index].category;
          })
          .prop("selected", true);

        $("#productName").val(allProducts[index].name);
        $("#product_price").val(allProducts[index].price);
        $("#quantity").val(allProducts[index].quantity);
        $("#barcode").val(allProducts[index].barcode || allProducts[index]._id);
        $("#expirationDate").val(allProducts[index].expirationDate);
        $("#minStock").val(allProducts[index].minStock || 1);
        $("#product_id").val(allProducts[index]._id);
        $("#img").val(allProducts[index].img);

        if (allProducts[index].img != "") {
          $("#imagename").hide();
          $("#current_img").html(
            `<img src="${img_path + allProducts[index].img}" alt="">`,
          );
          $("#rmv_img").show();
        }

        if (allProducts[index].stock == 0) {
          $("#stock").prop("checked", true);
        }

        $("#newProduct").modal("show");
      };

      $("#userModal").on("hide.bs.modal", function () {
        $(".perms").hide();
      });

      $.fn.editUser = function (index) {
        user_index = index;

        $("#Users").modal("hide");

        $(".perms").show();

        $("#user_id").val(allUsers[index]._id);
        $("#fullname").val(allUsers[index].fullname);
        $("#username").val(safeUnescape(allUsers[index].username));
        $("#password").attr("placeholder", "New Password");


        for (perm of permissions) {
          var el = "#" + perm;
          if (allUsers[index][perm] == 1) {
            $(el).prop("checked", true);
          } else {
            $(el).prop("checked", false);
          }
        }

        $("#userModal").modal("show");
      };

      $.fn.editCategory = function (index) {
        $("#Categories").modal("hide");
        $("#categoryName").val(allCategories[index].name);
        $("#category_id").val(allCategories[index]._id);
        $("#newCategory").modal("show");
      };

      $.fn.deleteProduct = function (id) {
        diagOptions = {
          title: "Are you sure?",
          text: "You are about to delete this product.",
          okButtonText: "Yes, delete it!",
          cancelButtonText: "Cancel",
        };

        notiflix.Confirm.show(
          diagOptions.title,
          diagOptions.text,
          diagOptions.okButtonText,
          diagOptions.cancelButtonText,
          () => {
            $.ajax({
              url: window.api + "inventory/product/" + id,
              type: "DELETE",
              success: function () {
                loadProducts();
                notiflix.Report.success("Done!", "Product deleted", "Ok");
              },
              error: function (xhr, status, error) {
                const errorMessage = handleAjaxError(xhr, status, error, "Failed to delete product");
                notiflix.Report.failure("Delete Failed", errorMessage, "Ok");
              },
            });
          },
        );
      };

      $.fn.deleteUser = function (id) {
        diagOptions = {
          title: "Are you sure?",
          text: "You are about to delete this user.",
          cancelButtonColor: "#d33",
          okButtonText: "Yes, delete!",
        };

        notiflix.Confirm.show(
          diagOptions.title,
          diagOptions.text,
          diagOptions.okButtonText,
          diagOptions.cancelButtonText,
          () => {
            $.ajax({
              url: window.api + "users/user/" + id,
              type: "DELETE",
              success: function () {
                loadUserList();
                notiflix.Report.success("Done!", "User deleted", "Ok");
              },
              error: function (xhr, status, error) {
                const errorMessage = handleAjaxError(xhr, status, error, "Failed to delete user");
                notiflix.Report.failure("Delete Failed", errorMessage, "Ok");
              },
            });
          },
        );
      };

      $.fn.deleteCategory = function (id) {
        diagOptions = {
          title: "Are you sure?",
          text: "You are about to delete this category.",
          okButtonText: "Yes, delete it!",
        };

        notiflix.Confirm.show(
          diagOptions.title,
          diagOptions.text,
          diagOptions.okButtonText,
          diagOptions.cancelButtonText,
          () => {
            $.ajax({
              url: window.api + "categories/category/" + id,
              type: "DELETE",
              success: function () {
                loadCategories();
                notiflix.Report.success("Done!", "Category deleted", "Ok");
              },
              error: function (xhr, status, error) {
                const errorMessage = handleAjaxError(xhr, status, error, "Failed to delete category");
                notiflix.Report.failure("Delete Failed", errorMessage, "Ok");
              },
            });
          },
        );
      };

      $("#productModal").on("click", function () {
        loadProductList();
      });

      $("#usersModal").on("click", function () {
        loadUserList();
      });

      $("#categoryModal").on("click", function () {
        loadCategoryList();
      });

      function loadUserList() {
        let counter = 0;
        let user_list = "";
        $("#user_list").empty();
        $("#userList").DataTable().destroy();

        $.get(window.api + "users/all")
          .done(function (users) {
            allUsers = [...users];

            users.forEach((user, index) => {
              state = [];
              let class_name = "";

              if (user.status != "") {
                state = user.status.split("_");
                login_status = state[0];
                login_time = state[1];

                switch (login) {
                  case "Logged In":
                    class_name = "btn-default";

                    break;
                  case "Logged Out":
                    class_name = "btn-light";
                    break;
                }
              }

              counter++;
              user_list += `<tr>
              <td>${user.fullname}</td>
              <td>${user.username}</td>
              <td class="${class_name}">${state.length > 0 ? login_status : ""
                } <br><small> ${state.length > 0 ? login_time : ""}</small></td>
              <td>${user._id == 1
                  ? '<span class="btn-group"><button class="btn btn-dark"><i class="fa fa-edit"></i></button><button class="btn btn-dark"><i class="fa fa-trash"></i></button></span>'
                  : '<span class="btn-group"><button onClick="$(this).editUser(' +
                  index +
                  ')" class="btn btn-warning"><i class="fa fa-edit"></i></button><button onClick="$(this).deleteUser(' +
                  user._id +
                  ')" class="btn btn-danger"><i class="fa fa-trash"></i></button></span>'
                }</td></tr>`;

              if (counter == users.length) {
                $("#user_list").html(user_list);

                $("#userList").DataTable({
                  order: [[1, "desc"]],
                  autoWidth: false,
                  info: true,
                  JQueryUI: true,
                  ordering: true,
                  paging: false,
                });
              }
            });
          })
          .fail(function (xhr, status, error) {
            console.error('Failed to load users list:', error);
            notiflix.Report.failure('Error', 'Failed to load users list', 'Ok');
          });
      }

      function loadProductList() {
        let products = [...allProducts];
        let product_list = "";
        let counter = 0;
        let category = [];
        let product_img = "";
        let icon = "";
        $("#product_list").empty();
        $("#productList").DataTable().destroy();

        products.forEach((product, index) => {
          counter++;

          let category = allCategories.filter(function (category) {
            return category._id == product.category;
          });

          product.stockAlert = "";
          const expiryDate = moment(product.expirationDate, DATE_FORMAT);
          let icon = "";

          //show stock status indicator
          const stockStatus = getStockStatus(product.quantity, product.minStock);
          if (stockStatus <= 0) {
            if (stockStatus === 0) {
              product.stockStatus = "No Stock";
              icon = "fa fa-exclamation-triangle";
            }
            if (stockStatus === -1) {
              product.stockStatus = "Low Stock";
              icon = "fa fa-caret-down";
            }

            product.stockAlert = `<p class="text-danger"><small><i class="${icon}"></i> ${product.stockStatus}</small></p>`;
          }
          //calculate days to expiry
          product.expiryAlert = "";
          if (!isExpired(expiryDate)) {
            const diffDays = daysToExpire(expiryDate);

            if (diffDays > 0 && diffDays <= 30) {
              var days_noun = diffDays > 1 ? "days" : "day";
              icon = "fa fa-clock-o";
              product.expiryStatus = `${diffDays} ${days_noun} left`;
              product.expiryAlert = `<p class="text-danger"><small><i class="${icon}"></i> ${product.expiryStatus}</small></p>`;
            }
          } else {
            icon = "fa fa-exclamation-triangle";
            product.expiryStatus = "Expired";
            product.expiryAlert = `<p class="text-danger"><small><i class="${icon}"></i> ${product.expiryStatus}</small></p>`;
          }

          let product_img = "";
          if (product.img === "") {
            product_img = default_item_img;
          }
          else {
            product_img = img_path + product.img;
            product_img = checkFileExists(product_img)
              ? product_img
              : default_item_img;
          }

          //render product list
          product_list +=
            `<tr>
            <td><img id="` +
            product._id +
            `"></td>
            <td><img style="max-height: 50px; max-width: 50px; border: 1px solid #ddd;" src="${product_img}" id="product_img"></td>
            <td>${product.name}
            ${product.expiryAlert}</td>
            <td>${getCurrencySymbol()}${product.price}</td>
            <td>${product.stock == 1 ? product.quantity : "N/A"}
            ${product.stockAlert}
            </td>
            <td>${product.expirationDate}</td>
            <td>${category.length > 0 ? category[0].name : ""}</td>
            <td class="noop"><span class="btn-group"><button onClick="$(this).editProduct(${index})" class="btn btn-warning btn-sm"><i class="fa fa-edit"></i></button><button onClick="$(this).deleteProduct(${product._id
            })" class="btn btn-danger btn-sm"><i class="fa fa-trash"></i></button><button onClick="$(this).reorder(${product._id
            })" class="btn btn-info btn-sm"><i class="fa fa-refresh"></i></button></span></td></tr>`;

          if (counter == allProducts.length) {
            $("#product_list").html(product_list);

            products.forEach((product) => {
              let bcode = product.barcode || product._id;
              $("#" + product._id + "").JsBarcode(bcode, {
                width: 2,
                height: 25,
                fontSize: 14,
              });
            });
          }
        });

        $("#productList").DataTable({
          order: [[1, "desc"]],
          autoWidth: false,
          info: true,
          JQueryUI: true,
          ordering: true,
          paging: false,
          dom: "Bfrtip",
          buttons: [
            {
              extend: "pdfHtml5",
              className: "btn btn-light", // Custom class name
              text: " Download PDF", // Custom text
              filename: "product_list.pdf", // Default filename
            },
          ],
        });
      }

      function loadCategoryList() {
        let category_list = "";
        let counter = 0;
        $("#category_list").empty();
        $("#categoryList").DataTable().destroy();

        allCategories.forEach((category, index) => {
          counter++;

          category_list += `<tr>
     
            <td>${category.name}</td>
            <td><span class="btn-group"><button onClick="$(this).editCategory(${index})" class="btn btn-warning"><i class="fa fa-edit"></i></button><button onClick="$(this).deleteCategory(${category._id})" class="btn btn-danger"><i class="fa fa-trash"></i></button></span></td></tr>`;
        });

        if (counter == allCategories.length) {
          $("#category_list").html(category_list);
          $("#categoryList").DataTable({
            autoWidth: false,
            info: true,
            JQueryUI: true,
            ordering: true,
            paging: false,
          });
        }
      }


      $("#log-out").on("click", function () {
        const diagOptions = {
          title: "Are you sure?",
          text: "You are about to log out.",
          cancelButtonColor: "#3085d6",
          okButtonText: "Logout",
        };

        notiflix.Confirm.show(
          diagOptions.title,
          diagOptions.text,
          diagOptions.okButtonText,
          diagOptions.cancelButtonText,
          () => {
            $.get(window.api + "users/logout/" + user._id)
              .done(function () {
                storage.delete("auth");
                storage.delete("user");
                window.ipcRenderer.send("app-reload", "");
              })
              .fail(function (xhr, status, error) {
                console.error('Logout failed:', error);
                // Even if logout fails, clear local storage and reload
                storage.delete("auth");
                storage.delete("user");
                window.ipcRenderer.send("app-reload", "");
              });
          },
        );
      });

      $("#settings_form").on("submit", function (e) {
        e.preventDefault();
        let formData = $(this).serializeObject();
        let mac_address;

        window.api = "http://" + window.host + ":" + window.port + "/api/";

        macaddress.one(function (err, mac) {
          if (err) {
            console.error('Error getting MAC address:', err);
            mac_address = 'unknown';
          } else {
            mac_address = mac;
          }
        });
        const appChoice = $("#app").find("option:selected").text();

        formData["app"] = appChoice;
        formData["mac"] = mac_address;
        formData["till"] = 1;

        // Update application field in settings form
        let $appField = $("#settings_form input[name='app']");
        let $hiddenAppField = $('<input>', {
          type: 'hidden',
          name: 'app',
          value: formData.app
        });
        $appField.length
          ? $appField.val(formData.app)
          : $("#settings_form").append(`<input type="hidden" name="app" value="${$hiddenAppField}" />`);


        if (formData.percentage != "" && typeof formData.percentage === 'number') {
          notiflix.Report.warning(
            "Oops!",
            "Please make sure the tax value is a number",
            "Ok",
          );
        } else {
          storage.set("settings", formData);

          $(this).attr("action", window.api + "settings/post");
          $(this).attr("method", "POST");

          $(this).ajaxSubmit({
            contentType: "application/json",
            success: function () {
              window.ipcRenderer.send("app-reload", "");
            },
            error: function (jqXHR) {
              console.error(jqXHR.responseJSON.message);
              notiflix.Report.failure(
                jqXHR.responseJSON.error,
                jqXHR.responseJSON.message,
                "Ok",
              );
            }
          });
        }
      });

      $("#net_settings_form").on("submit", function (e) {
        e.preventDefault();
        let formData = $(this).serializeObject();

        if (formData.till == 0 || formData.till == 1) {
          notiflix.Report.warning(
            "Oops!",
            "Please enter a number greater than 1.",
            "Ok",
          );
        } else {
          if (isNumeric(formData.till)) {
            formData["app"] = $("#app").find("option:selected").text();
            storage.set("settings", formData);
            window.ipcRenderer.send("app-reload", "");
          } else {
            notiflix.Report.warning(
              "Oops!",
              "Till number must be a number!",
              "Ok",
            );
          }
        }
      });

      $("#saveUser").on("submit", function (e) {
        e.preventDefault();
        let formData = $(this).serializeObject();

        if (formData.password != formData.pass) {
          notiflix.Report.warning("Oops!", "Passwords do not match!", "Ok");
        }

        if (
          bcrypt.compare(formData.password, user.password) ||
          bcrypt.compare(formData.password, allUsers[user_index].password)
        ) {
          $.ajax({
            url: window.api + "users/post",
            type: "POST",
            data: JSON.stringify(formData),
            contentType: "application/json; charset=utf-8",
            cache: false,
            processData: false,
            success: function () {
              if (ownUserEdit) {
                window.ipcRenderer.send("app-reload", "");
              } else {
                $("#userModal").modal("hide");

                loadUserList();

                $("#Users").modal("show");
                notiflix.Report.success("Great!", "User details saved!", "Ok");
              }
            },
            error: function (xhr, status, error) {
              const errorMessage = handleAjaxError(xhr, status, error, "Failed to save user details");
              notiflix.Report.failure("Error", errorMessage, "Ok");
            },
          });
        }
      });

      $("#app").on("change", function () {
        if (
          $(this).find("option:selected").text() ==
          "Network Point of Sale Terminal"
        ) {
          $("#net_settings_form").show(500);
          $("#settings_form").hide(500);
          macaddress.one(function (err, mac) {
            if (err) {
              console.error('Error getting MAC address:', err);
              $("#mac").val('unknown');
            } else {
              $("#mac").val(mac);
            }
          });
        } else {
          $("#net_settings_form").hide(500);
          $("#settings_form").show(500);
        }
      });

      $("#cashier").on("click", function () {
        ownUserEdit = true;

        $("#userModal").modal("show");

        $("#user_id").val(user._id);
        $("#fullname").val(user.fullname);
        $("#username").val(user.username);
        $("#password").attr("placeholder", "New Password");

        for (perm of permissions) {
          var el = "#" + perm;
          if (allUsers[index][perm] == 1) {
            $(el).prop("checked", true);
          } else {
            $(el).prop("checked", false);
          }
        }
      });

      $("#add-user").on("click", function () {
        if (platform.app != "Network Point of Sale Terminal") {
          $(".perms").show();
        }

        $("#saveUser").get(0).reset();
        $("#userModal").modal("show");
      });

      $("#settings").on("click", function () {
        if (platform.app == "Network Point of Sale Terminal") {
          $("#net_settings_form").show(500);
          $("#settings_form").hide(500);

          $("#ip").val(platform.ip);
          $("#till").val(platform.till);

          macaddress.one(function (err, mac) {
            if (err) {
              console.error('Error getting MAC address:', err);
              $("#mac").val('unknown');
            } else {
              $("#mac").val(mac);
            }
          });

          $("#app option")
            .filter(function () {
              return $(this).text() == platform.app;
            })
            .prop("selected", true);
        } else {
          $("#net_settings_form").hide(500);
          $("#settings_form").show(500);

          $("#settings_id").val("1");
          $("#store").val(safeUnescape(settings.store));
          $("#address_one").val(safeUnescape(settings.address_one));
          $("#address_two").val(safeUnescape(settings.address_two));
          $("#contact").val(safeUnescape(settings.contact));
          $("#tax").val(safeUnescape(settings.tax));
          $("#symbol").val(safeUnescape(settings.symbol));
          $("#percentage").val(safeUnescape(settings.percentage));
          $("#footer").val(safeUnescape(settings.footer));
          $("#logo_img").val(safeUnescape(settings.img));
          if (settings.charge_tax) {
            $("#charge_tax").prop("checked", true);
          }
          if (safeUnescape(settings.img) != "") {
            $("#logoname").hide();
            $("#current_logo").html(
              `<img src="${img_path + safeUnescape(settings.img)}" alt="">`,
            );
            $("#rmv_logo").show();
          }

          $("#app option")
            .filter(function () {
              return $(this).text() == safeUnescape(settings.app);
            })
            .prop("selected", true);
        }
      });

      // Display toggle event handlers
      $("#toggleCustomerDisplay").on("click", function () {
        window.ipcRenderer.send("toggle-customer-display");
      });

      $("#toggleKOTDisplay").on("click", function () {
        window.ipcRenderer.send("toggle-kot-display");
      });

      // Update displays when cart changes
      $.fn.updateCustomerDisplay = function () {
        if (cart.length > 0) {
          const orderData = {
            orderNumber: Math.floor(Date.now() / 1000),
            items: cart.map(item => ({
              name: item.product_name,
              quantity: item.quantity,
              price: item.price + (item.modifiers ? item.modifiers.reduce((sum, mod) => sum + mod.price, 0) : 0)
            })),
            taxRate: settings && settings.charge_tax ? parseFloat(safeUnescape(settings.percentage)) / 100 : 0,
            serviceChargeRate: settings && settings.charge_service_charge ? parseFloat(settings.service_charge) / 100 : 0,
            discount: $("#inputDiscount").val() || 0,
            status: 'pending'
          };
          window.ipcRenderer.send("update-customer-display", orderData);
        } else {
          // Send empty order data to clear display
          window.ipcRenderer.send("update-customer-display", null);
        }
      };

      // Update KOT display when orders are submitted
      $.fn.updateKOTDisplay = function (orderData) {
        const kotOrder = {
          id: orderData._id || orderData.order,
          number: orderData.order,
          items: orderData.items.map(item => ({
            name: item.product_name,
            quantity: item.quantity,
            notes: item.modifiers ? item.modifiers.map(m => m.name).join(', ') : ''
          })),
          type: 'dine-in', // Default, could be expanded based on order data
          status: 'new',
          timestamp: orderData.date || new Date().toISOString(),
          storeName: safeUnescape(settings.store)
        };
        
        // Send to KOT display
        window.ipcRenderer.send("update-kot-display", [kotOrder]);
      };

      // Hook into cart changes to update displays
      const originalRenderTable = $.fn.renderTable;
      $.fn.renderTable = function(cartList) {
        originalRenderTable.call(this, cartList);
        // Update customer display when cart changes
        $(this).updateCustomerDisplay();
      };

      // Hook into order submission to update KOT display
      const originalSubmitDueOrder = $.fn.submitDueOrder;
      $.fn.submitDueOrder = function(status) {
        // Call original function
        const result = originalSubmitDueOrder.call(this, status);

        // If this is a new order (status 1 = paid), update KOT display
        if (status === 1) {
          const orderData = {
            order: orderNumber,
            items: cart,
            date: currentTime,
            _id: orderNumber
          };
          $(this).updateKOTDisplay(orderData);
        }

        return result;
      };

    });
  }
}

// Start initialization - will wait for API configuration
initializeApp();

// Simple API connectivity test
function testApiConnectivity() {
  console.log('🔍 DEBUG: Testing API connectivity...');
  console.log('🔍 DEBUG: Testing URL:', window.api + 'users/check/');
  
  if (!window.api) {
    console.log('❌ DEBUG: window.api not configured yet');
    return;
  }
  
  $.ajax({
    url: window.api + 'users/check/',
    method: 'GET',
    timeout: 5000,
    success: function(response) {
      console.log('✅ DEBUG: API connectivity test successful');
      console.log('✅ DEBUG: Response:', response);
    },
    error: function(xhr, status, error) {
      // console.error('❌ DEBUG: API connectivity test failed');
      // console.error('❌ DEBUG: Status:', status);
      // console.error('❌ DEBUG: Error:', error);
      // console.error('❌ DEBUG: XHR status:', xhr.status);
      // console.error('❌ DEBUG: XHR response:', xhr.responseText);
      
      // Show user-friendly error message
      // if (xhr.status === 0) {
      //   notiflix.Report.failure(
      //     'Server Connection Error', 
      //     'Cannot connect to the server. Please check if the server is running.', 
      //     'Ok'
      //   );
      // }
    }
  });
}

// Test API connectivity after a short delay
setTimeout(testApiConnectivity, 2000);

$("#rmv_logo").on("click", function () {
  $("#remove_logo").val("1");
  // $("#logo_img").val('');
  $("#current_logo").hide(500);
  $(this).hide(500);
  $("#logoname").show(500);
});

$("#rmv_img").on("click", function () {
  $("#remove_img").val("1");
  // $("#img").val('');
  $("#current_img").hide(500);
  $(this).hide(500);
  $("#imagename").show(500);
});

$.fn.print = function () {
  printJS({ printable: receipt, type: "raw-html" });
};

/**
 * Print KOT (Kitchen Order Ticket)
 */
$.fn.printKOT = function (order) {
  const kotHtml = generateKOT(order);
  printJS({ printable: kotHtml, type: "raw-html" });
};

/**
 * Generate KOT HTML
 */
function generateKOT(order) {
  // Use language support for multilingual KOT generation
  if (LanguageSupport && LanguageSupport.generateMultilingualKOT) {
    const kotData = {
      orderNumber: order.order || order._id,
      tableNumber: order.table_number || 'N/A',
      customerName: order.customer_name || 'Walk-in',
      time: moment(order.date || order.order_time).format('HH:mm'),
      priority: order.priority || 'normal',
      storeName: safeUnescape(settings.store),
      items: order.items.map(item => ({
        product_name: item.product_name,
        quantity: item.quantity,
        modifiers: item.modifiers,
        special_instructions: item.special_instructions || ''
      }))
    };
    return LanguageSupport.generateMultilingualKOT(kotData);
  }
  
  // Fallback to original KOT generation
  const logo = path.join(img_path, safeUnescape(settings.img));
  const items = order.items.map(item => {
    const modifierText = item.modifiers && item.modifiers.length > 0 ? ` (${item.modifiers.map(m => m.name).join(', ')})` : '';
    return `<tr><td>${item.product_name}${modifierText}</td><td>${item.quantity}</td><td>${item.special_instructions || ''}</td></tr>`;
  }).join('');

  return `<div style="font-size: 12px; width: 300px;">
    <p style="text-align: center;">
      ${checkFileExists(logo) ? `<img style='max-width: 50px' src='${logo}' /><br>` : ''}
      <span style="font-size: 18px;">${safeUnescape(settings.store)}</span><br>
      KITCHEN ORDER TICKET
    </p>
    <hr>
    <p>Order #: ${order.order || order._id}</p>
    <p>Table: ${order.table_number || 'N/A'}</p>
    <p>Customer: ${order.customer_name || 'Walk-in'}</p>
    <p>Time: ${moment(order.date || order.order_time).format('HH:mm')}</p>
    <table style="width: 100%;">
      <thead>
        <tr><th>Item</th><th>Qty</th><th>Notes</th></tr>
      </thead>
      <tbody>${items}</tbody>
    </table>
    <hr>
    <p style="text-align: center;">Priority: ${order.priority || 'Normal'}</p>
  </div>`;
}


function loadSupplierCount() {
  $.get(window.api + "suppliers/all")
    .done(function (data) {
      $("#total_suppliers #counter").text(data.length);
    })
    .fail(function (xhr, status, error) {
      console.error('Failed to load supplier count:', error);
    });
}

function loadTransactions() {
  let tills = [];
  let users = [];
  let transact = 0;
  let sales = 0;

  sold_items = [];
  sold = [];

  let counter = 0;
  let transaction_list = "";
  let query = `by-date?start=${start_date}&end=${end_date}&user=${by_user}&status=${by_status}&till=${by_till}`;

  $.get(window.api + query)
    .done(function (transactions) {
      if (transactions.length > 0) {
        $("#transaction_list").empty();
        $("#transactionList").DataTable().destroy();

        allTransactions = [...transactions];

        $.fn.shareInvoice = function (id) {
            notiflix.Confirm.show(
                'Share Invoice',
                'Share this invoice via email/SMS?',
                'Yes, Share',
                'Cancel',
                function() {
                    $.ajax({
                        url: window.api + 'transactions/share',
                        type: 'POST',
                        data: JSON.stringify({ transactionId: id }),
                        contentType: 'application/json',
                        success: function() {
                            notiflix.Report.success('Sent!', 'Invoice shared successfully.', 'Ok');
                        },
                        error: function(xhr) {
                             notiflix.Report.failure('Error', 'Failed to share invoice.', 'Ok');
                        }
                    });
                }
            );
        };

        $.fn.reprintKOT = function (index) {
            const order = allTransactions[index];

            // Log the KOT reprint action
            $.post(window.api + 'audit-logs/log', {
                action: 'kot_reprint',
                user: user.fullname,
                details: {
                    order_id: order._id || order.order,
                    order_number: order.order,
                    items_count: order.items.length,
                    timestamp: moment().toISOString()
                },
                severity: 'info'
            });

            const kotHtml = generateKOT(order);
            printJS({ printable: kotHtml, type: "raw-html" });

            notiflix.Notify.success('KOT reprinted successfully');
        };

        transactions.forEach((trans, index) => {
          sales += parseFloat(trans.total);
          transact++;

          trans.items.forEach((item) => {
            sold_items.push(item);
          });

          if (!tills.includes(trans.till)) {
            tills.push(trans.till);
          }

          if (!users.includes(trans.user_id)) {
            users.push(trans.user_id);
          }

          counter++;
          transaction_list += `<tr>
                                  <td>${trans.order}</td>
                                  <td class="nowrap">${moment(trans.date).format(
            "DD-MMM-YYYY HH:mm:ss",
          )}</td>
                                  <td>${getCurrencySymbol() + moneyFormat(trans.total)
            }</td>
                                  <td>${trans.paid == ""
            ? ""
            : getCurrencySymbol() + moneyFormat(trans.paid)
          }</td>
                                  <td>${trans.change
            ? getCurrencySymbol() +
            moneyFormat(
              Math.abs(trans.change).toFixed(2),
            )
            : ""
          }</td>
                                  <td>${trans.paid == ""
            ? ""
            : trans.payment_type
          }</td>
                                  <td>${trans.till}</td>
                                  <td>${trans.user}</td>
                                  <td>${trans.paid == ""
            ? '<button class="btn btn-dark"><i class="fa fa-search-plus"></i></button>'
            : '<button onClick="$(this).viewTransaction(' +
            index +
            ')" class="btn btn-info"><i class="fa fa-search-plus"></i></button>' +
            '<button onClick="$(this).reprintKOT(' +
            index +
            ')" class="btn btn-success"><i class="fa fa-print"></i> KOT</button>' +
            '<button onClick="$(this).shareInvoice(' + (trans._id || trans.order) + ')" class="btn btn-warning"><i class="fa fa-share-alt"></i></button>' +
            '<button onClick="$(this).returnTransaction(' + (trans._id || trans.order) + ')" class="btn btn-danger"><i class="fa fa-undo"></i> Return</button></td>'
          }</tr>
                    `;

          if (counter == transactions.length) {
            $("#total_sales #counter").text(
              getCurrencySymbol() + moneyFormat(parseFloat(sales).toFixed(2)),
            );

            // Calculate Sales Change (Today vs Yesterday)
            // Only calculate if the selected range is "Today"
            const today = moment().startOf('day');
            const selectedStart = moment(start_date);
            
            if (selectedStart.isSame(today, 'day')) {
                const yesterdayStart = moment().subtract(1, 'days').startOf('day').toISOString();
                const yesterdayEnd = moment().subtract(1, 'days').endOf('day').toISOString();
                
                 $.get(window.api + `by-date?start=${yesterdayStart}&end=${yesterdayEnd}&user=${by_user}&status=${by_status}&till=${by_till}`)
                    .done(function(yData) {
                        let ySales = 0;
                        yData.forEach(t => ySales += parseFloat(t.total));
                        
                        let change = 0;
                        if (ySales > 0) {
                            change = ((sales - ySales) / ySales) * 100;
                        } else if (sales > 0) {
                            change = 100; // If yesterday was 0 and today is > 0, it's 100% increase (or technically infinite)
                        }
                        
                        const icon = change >= 0 ? '<i class="fa fa-arrow-up"></i>' : '<i class="fa fa-arrow-down"></i>';
                        const color = change >= 0 ? '#fff' : '#ffabad'; // White for up, light red for down (on green bg)
                        
                        $("#sales_change").html(`${icon} ${Math.abs(change).toFixed(1)}%`);
                        $("#sales_change").css('color', color);
                    });
            } else {
                $("#sales_change").empty();
            }

            loadSupplierCount();

            $("#total_transactions #counter").text(transact);

            const result = {};

            for (const { product_name, price, quantity, id } of sold_items) {
              if (!result[product_name]) result[product_name] = [];
              result[product_name].push({ id, price, quantity });
            }

            for (item in result) {
              let price = 0;
              let quantity = 0;
              let id = 0;

              result[item].forEach((i) => {
                id = i.id;
                price = i.price;
                quantity = quantity + parseInt(i.quantity);
              });

              sold.push({
                id: id,
                product: item,
                qty: quantity,
                price: price,
              });
            }

            loadSoldProducts();

            if (by_user == 0 && by_till == 0) {
              userFilter(users);
              tillFilter(tills);
            }

            $("#transaction_list").html(transaction_list);
            $("#transactionList").DataTable({
              order: [[1, "desc"]],
              autoWidth: false,
              info: true,
              JQueryUI: true,
              ordering: true,
              paging: true,
              dom: "Bfrtip",
              buttons: ["csv", "excel", "pdf"],
            });
          }
        });
      } else {
        notiflix.Report.warning(
          "No data!",
          "No transactions available within the selected criteria",
          "Ok",
        );
      }
    })
    .fail(function (xhr, status, error) {
      console.error('Failed to load transactions:', error);
      notiflix.Report.failure('Error', 'Failed to load transactions', 'Ok');
    });
}

function sortDesc(a, b) {
  if (a.qty > b.qty) {
    return -1;
  }
  if (a.qty < b.qty) {
    return 1;
  }
  return 0;
}

function loadSoldProducts() {
  sold.sort(sortDesc);

  let counter = 0;
  let sold_list = "";
  let items = 0;
  let products = 0;
  $("#product_sales").empty();

  sold.forEach((item) => {
    items = items + parseInt(item.qty);
    products++;

    let product = allProducts.filter(function (selected) {
      return selected._id == item.id;
    });

    counter++;

    sold_list += `<tr>
            <td>${item.product}</td>
            <td>${item.qty}</td>
            <td>${product[0].stock == 1
        ? product.length > 0
          ? product[0].quantity
          : ""
        : "N/A"
      }</td>
            <td>${getCurrencySymbol() +
      moneyFormat((item.qty * parseFloat(item.price)).toFixed(2))
      }</td>
            </tr>`;

    if (counter == sold.length) {
      $("#total_items #counter").text(items);
      $("#total_products #counter").text(products);
      $("#product_sales").html(sold_list);
    }
  });
}

function userFilter(users) {
  $("#users").empty();
  $("#users").append(`<option value="0">All</option>`);

  users.forEach((user) => {
    let u = allUsers.filter(function (usr) {
      return usr._id == user;
    });

    $("#users").append(`<option value="${user}">${u[0].fullname}</option>`);
  });
}

function tillFilter(tills) {
  $("#tills").empty();
  $("#tills").append(`<option value="0">All</option>`);
  tills.forEach((till) => {
    $("#tills").append(`<option value="${till}">${till}</option>`);
  });
}

$.fn.viewTransaction = function (index) {
  transaction_index = index;

  let discount = allTransactions[index].discount;
  let refNumber =
    allTransactions[index].ref_number != ""
      ? allTransactions[index].ref_number
      : allTransactions[index].order;
  let orderNumber = allTransactions[index].order;
  let paymentMethod = "";
  let tax_row = "";
  let items = "";
  let products = allTransactions[index].items;

  products.forEach((item) => {
    items += `<tr><td>${item.product_name}</td><td>${item.quantity
      } </td><td class="text-right"> ${getCurrencySymbol()} ${moneyFormat(
        Math.abs(item.price).toFixed(2),
      )} </td></tr>`;
  });

  paymentMethod = allTransactions[index].payment_type;


  let payment = "";
  if (allTransactions[index].paid != "") {
    payment = `<tr>
                    <td>Paid</td>
                    <td>:</td>
                    <td class="text-right">${getCurrencySymbol()} ${moneyFormat(
      Math.abs(allTransactions[index].paid).toFixed(2),
    )}</td>
                </tr>
                <tr>
                    <td>Change</td>
                    <td>:</td>
                    <td class="text-right">${getCurrencySymbol()} ${moneyFormat(
      Math.abs(allTransactions[index].change).toFixed(2),
    )}</td>
                </tr>
                <tr>
                    <td>Method</td>
                    <td>:</td>
                    <td class="text-right">${paymentMethod}</td>
                </tr>`;
  }

  // Calculate service charge and tip for transaction display
  let serviceChargeRow = "";
  let tipRow = "";
  let tipSplitRows = "";
  
  if (allTransactions[index].service_charge && allTransactions[index].service_charge > 0) {
    serviceChargeRow = `<tr>
                <td>Service Charge (${allTransactions[index].service_charge_rate}%)</td>
                <td>:</td>
                <td class="text-right">${getCurrencySymbol()}${parseFloat(allTransactions[index].service_charge).toFixed(2)}</td>
            </tr>`;
  }
  
  if (allTransactions[index].tip_amount && allTransactions[index].tip_amount > 0) {
    tipRow = `<tr>
                <td>Tip (${allTransactions[index].tip_percentage}%)</td>
                <td>:</td>
                <td class="text-right">${getCurrencySymbol()}${parseFloat(allTransactions[index].tip_amount).toFixed(2)}</td>
            </tr>`;
  }
  
  if (allTransactions[index].split_tip_among_staff && allTransactions[index].tip_split_data) {
    allTransactions[index].tip_split_data.forEach(function(tipData) {
      tipSplitRows += `<tr>
                <td>Tip - ${tipData.staff_name}</td>
                <td>:</td>
                <td class="text-right">${getCurrencySymbol()}${parseFloat(tipData.tip_amount).toFixed(2)}</td>
            </tr>`;
    });
  }

  if (settings.charge_tax) {
    tax_row = `<tr>
                <td>Vat(${safeUnescape(settings.percentage)})% </td>
                <td>:</td>
                <td class="text-right">${getCurrencySymbol()}${parseFloat(
      allTransactions[index].tax,
    ).toFixed(2)}</td>
            </tr>`;
  }

  let logo = path.join(img_path, safeUnescape(settings.img));

  receipt = `<div style="font-size: 10px">                            
        <p style="text-align: center;">
        ${checkFileExists(logo)
      ? `<img style='max-width: 50px' src='${logo}' /><br>`
      : ``
    }
            <span style="font-size: 22px;">${safeUnescape(settings.store)}</span> <br>
            ${safeUnescape(settings.address_one)} <br>
            ${safeUnescape(settings.address_two)} <br>
            ${safeUnescape(settings.contact) != "" ? "Tel: " + safeUnescape(settings.contact) + "<br>" : ""
    } 
            ${safeUnescape(settings.tax) != "" ? "Vat No: " + safeUnescape(settings.tax) + "<br>" : ""} 
    </p>
    <hr>
    <left>
        <p>
        Invoice : ${orderNumber} <br>
        Ref No : ${refNumber} <br>
        Customer : ${allTransactions[index].customer == 0
      ? "Walk in Customer"
      : allTransactions[index].customer.name
    } <br>
        ${allTransactions[index].delivery_partner ? `Delivery Partner : ${_.escape(allTransactions[index].delivery_partner)} <br>` : ''}
        Cashier : ${allTransactions[index].user} <br>
        Date : ${moment(allTransactions[index].date).format(
      "DD MMM YYYY HH:mm:ss",
    )}<br>
        </p>

    </left>
    <hr>
    <table width="90%">
        <thead>
        <tr>
            <th>Item</th>
            <th>Qty</th>
            <th class="text-right">Price</th>
        </tr>
        </thead>
        <tbody>
        ${items}                
        <tr><td colspan="3"><hr></td></tr>
        <tr>                        
            <td><b>Subtotal</b></td>
            <td>:</td>
            <td class="text-right"><b>${getCurrencySymbol()}${moneyFormat(
      allTransactions[index].subtotal,
    )}</b></td>
        </tr>
        <tr>
            <td>Discount</td>
            <td>:</td>
            <td class="text-right">${discount > 0
      ? getCurrencySymbol() +
      moneyFormat(
        parseFloat(allTransactions[index].discount).toFixed(2),
      )
      : ""
    }</td>
        </tr>
        
        ${serviceChargeRow}
        ${tipRow}
        ${tipSplitRows}
        ${tax_row}
    
        <tr>
            <td><h5>Total</h5></td>
            <td><h5>:</h5></td>
            <td class="text-right">
                <h5>${getCurrencySymbol()}${moneyFormat(
      allTransactions[index].total,
    )}</h5>
            </td>
        </tr>
        ${payment == 0 ? "" : payment}
        </tbody>
        </table>
        <br>
        <hr>
        <br>
        <p style="text-align: center;">
         ${safeUnescape(settings.footer)}
         </p>
        </div>`;

  //prevent DOM XSS; allow windows paths in img src
  receipt = DOMPurify.sanitize(receipt, { ALLOW_UNKNOWN_PROTOCOLS: true });

  $("#viewTransaction").html("");
  $("#viewTransaction").html(receipt);

  $("#orderModal").modal("show");
};

$.fn.returnTransaction = function (transactionId) {
    // Initialize returns module if not already available
    if (typeof window.ReturnsModule !== 'undefined') {
        const returnsModule = new window.ReturnsModule();
        returnsModule.openReturnModal(transactionId);
    } else {
        // Load the returns module dynamically if not loaded
        const script = document.createElement('script');
        script.src = 'assets/js/modules/returns.js';
        script.onload = function() {
            const returnsModule = new window.ReturnsModule();
            returnsModule.openReturnModal(transactionId);
        };
        document.head.appendChild(script);
    }
};

$("#status").on("change", function () {
  by_status = $(this).find("option:selected").val();
  loadTransactions();
});

$("#tills").on("change", function () {
  by_till = $(this).find("option:selected").val();
  loadTransactions();
});

$("#users").on("change", function () {
  by_user = $(this).find("option:selected").val();
  loadTransactions();
});

$("#reportrange").on("apply.daterangepicker", function (ev, picker) {
  start = picker.startDate.format("DD MMM YYYY hh:mm A");
  end = picker.endDate.format("DD MMM YYYY hh:mm A");

  start_date = picker.startDate.toDate().toJSON();
  end_date = picker.endDate.toDate().toJSON();

  loadTransactions();
});

function authenticate() {
  $(".loading").hide();
  $("body").attr("class", "login-page");
  $("#login").show();
}

$("body").on("submit", "#account", function (e) {
  e.preventDefault();
  let formData = $(this).serializeObject();

  if (formData.username == "" || formData.password == "") {
    notiflix.Report.warning("Incomplete form!", auth_empty, "Ok");
  } else {
    $.ajax({
      url: window.api + "users/login",
      type: "POST",
      data: JSON.stringify(formData),
      contentType: "application/json; charset=utf-8",
      cache: false,
      processData: false,
      success: function (data) {
        if (data.auth === true) {
          storage.set("auth", { auth: true });
          storage.set("user", data);
          window.ipcRenderer.send("app-reload", "");
          $("#login").hide();
        } else {
          notiflix.Report.warning("Oops!", auth_error, "Ok");
        }
      },
      error: function (xhr, status, error) {
        console.error('Login failed:', error);
        
        let errorMessage = auth_error;
        
        // Try to extract meaningful error message from response
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMessage = xhr.responseJSON.message;
        } else if (xhr.status === 0) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (xhr.status === 401) {
          errorMessage = "Invalid username or password.";
        } else if (xhr.status >= 500) {
          errorMessage = "Server error. Please try again later.";
        }
        
        notiflix.Report.warning("Login Failed", errorMessage, "Ok");
      },
    });
  }
});

$("#quit").on("click", function () {
  const diagOptions = {
    title: "Are you sure?",
    text: "You are about to close the application.",
    icon: "warning",
    okButtonText: "Close Application",
    cancelButtonText: "Cancel"
  };

  notiflix.Confirm.show(
    diagOptions.title,
    diagOptions.text,
    diagOptions.okButtonText,
    diagOptions.cancelButtonText,
    () => {
      window.ipcRenderer.send("app-quit", "");
    },
  );
});

window.ipcRenderer.on("click-element", (event, elementId) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.click();
  }
});

// ============================================
// CSV IMPORT/EXPORT FUNCTIONS
// ============================================

/**
 * Export all products to CSV file
 */
$.fn.exportProductsToCSV = function () {
  notiflix.Loading.dots('Exporting products...');

  $.ajax({
    url: window.api + "inventory/export/csv",
    type: "GET",
    xhrFields: {
      responseType: 'blob'
    },
    success: function (data) {
      notiflix.Loading.remove();

      // Create download link
      const blob = new Blob([data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Generate filename with current date
      const today = new Date().toISOString().split('T')[0];
      link.download = `products_export_${today}.csv`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      notiflix.Notify.success('Products exported successfully!');
    },
    error: function (xhr, status, error) {
      notiflix.Loading.remove();
      console.error('Export error:', error);

      const errorMessage = handleAjaxError(xhr, status, error, 'Failed to export products');
      notiflix.Report.failure('Export Failed', errorMessage, 'Ok');
    }
  });
};

/**
 * Import products from CSV file
 */
$.fn.importProductsFromCSV = function (csvFile, duplicateAction) {
  if (!csvFile) {
    notiflix.Report.warning('No File Selected', 'Please select a CSV file to import.', 'Ok');
    return;
  }

  // Validate file type
  if (!csvFile.name.toLowerCase().endsWith('.csv')) {
    notiflix.Report.warning('Invalid File Type', 'Please select a CSV file.', 'Ok');
    return;
  }

  // Validate file size (5MB limit)
  if (csvFile.size > 5 * 1024 * 1024) {
    notiflix.Report.warning('File Too Large', 'Please select a CSV file smaller than 5MB.', 'Ok');
    return;
  }

  const formData = new FormData();
  formData.append('csvfile', csvFile);

  // Build URL with duplicate action as query parameter
  let url = window.api + "inventory/import/csv";
  if (duplicateAction && duplicateAction !== 'skip') {
    url += '?duplicate=' + encodeURIComponent(duplicateAction);
  }

  notiflix.Loading.dots('Importing products...');

  $.ajax({
    url: url,
    type: "POST",
    data: formData,
    processData: false,
    contentType: false,
    success: function (response) {
      notiflix.Loading.remove();

      const { summary } = response;

      // Show import results
      let message = `Import completed!\n\n`;
      message += `Total rows processed: ${summary.totalRows}\n`;
      message += `Successfully imported: ${summary.successful}\n`;
      message += `Duplicates handled: ${summary.duplicates}\n`;
      message += `Errors: ${summary.errors}`;

      notiflix.Report.success('Import Complete', message, 'Ok', function () {
        // Reload products after successful import
        loadProducts();
      });

      // Close import modal
      $('#importCSVPModal').modal('hide');
      $('#csvFileInput').val('');

    },
    error: function (xhr, status, error) {
      notiflix.Loading.remove();
      console.error('Import error:', error);

      const errorMessage = handleAjaxError(xhr, status, error, 'Failed to import products');
      notiflix.Report.failure('Import Failed', errorMessage, 'Ok');
    }
  });
};

/**
 * Download CSV import template
 */
$.fn.downloadCSVTemplate = function () {
  notiflix.Loading.dots('Downloading template...');

  $.ajax({
    url: window.api + "inventory/import/template",
    type: "GET",
    xhrFields: {
      responseType: 'blob'
    },
    success: function (data) {
      notiflix.Loading.remove();

      // Create download link
      const blob = new Blob([data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'product_import_template.csv';

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      notiflix.Notify.success('Template downloaded successfully!');
    },
    error: function (xhr, status, error) {
      notiflix.Loading.remove();
      console.error('Template download error:', error);

      const errorMessage = handleAjaxError(xhr, status, error, 'Failed to download template file');
      notiflix.Report.failure('Download Failed', errorMessage, 'Ok');
    }
  });
};

// ============================================
// REPORTING FUNCTIONS
// ============================================

/**
 * Load and display sales report
 */
function loadSalesReport() {
  const startDate = start_date.toISOString();
  const endDate = end_date.toISOString();
  const user = by_user || 0;
  const till = by_till || 0;
  const groupBy = $('#groupBy').val() || 'day';

  const queryParams = `start=${startDate}&end=${endDate}&user=${user}&till=${till}&groupBy=${groupBy}`;

  $.get(window.api + `transactions/reports/sales?${queryParams}`)
    .done(function (data) {
      // Update summary widgets
      $('#totalRevenue').text(getCurrencySymbol() + moneyFormat(data.totalRevenue.toFixed(2)));
      $('#totalProfit').text(getCurrencySymbol() + moneyFormat(data.totalProfit.toFixed(2)));

      // Clear and populate table
      $('#sales_report_data').empty();

      if (data.trends && data.trends.length > 0) {
        data.trends.forEach(function (trend) {
          const row = `<tr>
            <td>${trend.date}</td>
            <td>${getCurrencySymbol() + moneyFormat(trend.revenue.toFixed(2))}</td>
            <td>${getCurrencySymbol() + moneyFormat(trend.profit.toFixed(2))}</td>
          </tr>`;
          $('#sales_report_data').append(row);
        });

        // Initialize DataTable with export buttons
        if ($.fn.DataTable.isDataTable('#salesReportTable')) {
          $('#salesReportTable').DataTable().destroy();
        }

        $('#salesReportTable').DataTable({
          order: [[0, 'desc']],
          autoWidth: false,
          info: true,
          JQueryUI: true,
          ordering: true,
          paging: true,
          dom: 'Bfrtip',
          buttons: ['csv', 'excel', 'pdf']
        });
      } else {
        $('#sales_report_data').append('<tr><td colspan="3" class="text-center">No data available</td></tr>');
      }
    })
    .fail(function (xhr, status, error) {
      console.error('Failed to load sales report:', error);
      const errorMessage = handleAjaxError(xhr, status, error, 'Failed to load sales report');
      notiflix.Report.failure('Error', errorMessage, 'Ok');
    });
}

/**
 * Load and display inventory turnover report
 */
function loadInventoryReport() {
  const startDate = start_date.toISOString();
  const endDate = end_date.toISOString();

  const queryParams = `start=${startDate}&end=${endDate}`;

  $.get(window.api + `transactions/reports/inventory-turnover?${queryParams}`)
    .done(function (data) {
      // Update summary widgets
      $('#turnoverRate').text(data.turnoverRate);
      $('#daysInStock').text(data.daysInStock);
      $('#totalCOGS').text(getCurrencySymbol() + moneyFormat(data.totalCOGS.toFixed(2)));
      $('#averageInventoryValue').text(getCurrencySymbol() + moneyFormat(data.averageInventoryValue.toFixed(2)));
    })
    .fail(function (xhr, status, error) {
      console.error('Failed to load inventory turnover report:', error);
      const errorMessage = handleAjaxError(xhr, status, error, 'Failed to load inventory turnover report');
      notiflix.Report.failure('Error', errorMessage, 'Ok');
    });
}

/**
 * Load and display staff activity report
 */
function loadStaffReport() {
  const startDate = start_date.toISOString();
  const endDate = end_date.toISOString();

  const queryParams = `start=${startDate}&end=${endDate}`;

  $.get(window.api + `transactions/reports/staff-activity?${queryParams}`)
    .done(function (data) {
      // Clear and populate table
      $('#staff_activity_data').empty();

      if (data.staff && data.staff.length > 0) {
        data.staff.forEach(function (staff) {
          const lastLogin = staff.lastLogin ? moment(staff.lastLogin).format('DD MMM YYYY HH:mm') : 'N/A';
          const row = `<tr>
            <td>${staff.name}</td>
            <td>${staff.loginCount}</td>
            <td>${lastLogin}</td>
            <td>${getCurrencySymbol() + moneyFormat(staff.totalSales.toFixed(2))}</td>
            <td>${staff.transactionCount}</td>
          </tr>`;
          $('#staff_activity_data').append(row);
        });

        // Initialize DataTable with export buttons
        if ($.fn.DataTable.isDataTable('#staffActivityTable')) {
          $('#staffActivityTable').DataTable().destroy();
        }

        $('#staffActivityTable').DataTable({
          order: [[3, 'desc']],
          autoWidth: false,
          info: true,
          JQueryUI: true,
          ordering: true,
          paging: true,
          dom: 'Bfrtip',
          buttons: ['csv', 'excel', 'pdf']
        });
      } else {
        $('#staff_activity_data').append('<tr><td colspan="5" class="text-center">No data available</td></tr>');
      }
    })
    .fail(function (xhr, status, error) {
      console.error('Failed to load staff activity report:', error);
      const errorMessage = handleAjaxError(xhr, status, error, 'Failed to load staff activity report');
      notiflix.Report.failure('Error', errorMessage, 'Ok');
    });
}

/**
 * Handle tab switching for reports
 */
$(document).on('shown.bs.tab', 'a[data-toggle="tab"]', function (e) {
  const target = $(e.target).attr('href');

  switch (target) {
    case '#sales-tab':
      loadSalesReport();
      break;
    case '#inventory-tab':
      loadInventoryReport();
      break;
    case '#staff-tab':
      loadStaffReport();
      break;
  }
});

/**
 * Handle report filter changes
 */
$('#groupBy').on('change', function () {
  if ($('#sales-tab').hasClass('active')) {
    loadSalesReport();
  }
});

// Override the existing reportrange apply handler to also reload reports
$('#reportrange').on('apply.daterangepicker', function (ev, picker) {
  start = picker.startDate.format('DD MMM YYYY hh:mm A');
  end = picker.endDate.format('DD MMM YYYY hh:mm A');

  start_date = picker.startDate.toDate().toJSON();
  end_date = picker.endDate.toDate().toJSON();

  // Reload current view (transactions or reports)
  if ($('#transactions_view').is(':visible')) {
    if ($('#transactions-tab').hasClass('active')) {
      loadTransactions();
    } else if ($('#sales-tab').hasClass('active')) {
      loadSalesReport();
    } else if ($('#inventory-tab').hasClass('active')) {
      loadInventoryReport();
    } else if ($('#staff-tab').hasClass('active')) {
      loadStaffReport();
    }
  }
});

// Make functions globally available
window.loadSalesReport = loadSalesReport;
window.loadInventoryReport = loadInventoryReport;
window.loadStaffReport = loadStaffReport;

// ============================================
// CSV IMPORT EVENT HANDLERS
// ============================================

/**
 * Handle CSV import button click
 */
$(document).on('click', '#startImport', function () {
  const csvFile = document.getElementById('csvFileInput').files[0];
  const duplicateAction = $('#duplicateAction').val();

  $(this).importProductsFromCSV(csvFile, duplicateAction);
});

/**
 * Handle CSV export button click
 */
$(document).on('click', '#exportCSV', function () {
  $(this).exportProductsToCSV();
});

/**
 * Handle download template button click
 */
$(document).on('click', '#downloadTemplate', function () {
  $(this).downloadCSVTemplate();
});
