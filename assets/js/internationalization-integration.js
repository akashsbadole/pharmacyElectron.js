/**
 * Internationalization Integration Script
 * Integrates the i18n system with the existing POS application
 */

(function() {
    'use strict';

    // Initialize internationalization when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize the internationalization system
        window.i18n = new Internationalization();
        
        // Initialize settings manager
        window.settingsManager = new SettingsManager();
        
        // Set up event listeners for internationalization controls
        setupI18nControls();
        
        // Apply saved settings on load
        applySavedSettings();
        
        // Update UI with current settings
        updateSettingsUI();
    });

    /**
     * Set up event listeners for internationalization controls
     */
    function setupI18nControls() {
        // Country selection
        const countrySelect = document.getElementById('countrySelect');
        if (countrySelect) {
            countrySelect.addEventListener('change', function() {
                const country = this.value;
                const settings = window.settingsManager.getSettings();
                settings.country = country;
                window.settingsManager.saveSettings(settings);
                
                // Update language and currency options based on country
                updateLanguageOptions(country);
                updateCurrencyOptions(country);
                
                // Apply the changes
                applyCountrySettings(country);
            });
        }

        // Language selection
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.addEventListener('change', function() {
                const language = this.value;
                window.i18n.setLanguage(language);
                
                const settings = window.settingsManager.getSettings();
                settings.language = language;
                window.settingsManager.saveSettings(settings);
                
                // Update UI text
                updateUIText();
            });
        }

        // Currency selection
        const currencySelect = document.getElementById('currencySelect');
        if (currencySelect) {
            currencySelect.addEventListener('change', function() {
                const currency = this.value;
                window.i18n.setCurrency(currency);
                
                const settings = window.settingsManager.getSettings();
                settings.currency = currency;
                window.settingsManager.saveSettings(settings);
                
                // Update currency displays throughout the application
                updateCurrencyDisplays();
            });
        }

        // Apply settings button
        const applySettingsBtn = document.getElementById('applySettingsBtn');
        if (applySettingsBtn) {
            applySettingsBtn.addEventListener('click', function() {
                const country = document.getElementById('countrySelect').value;
                const language = document.getElementById('languageSelect').value;
                const currency = document.getElementById('currencySelect').value;
                
                // Save all settings
                const settings = {
                    country: country,
                    language: language,
                    currency: currency
                };
                window.settingsManager.saveSettings(settings);
                
                // Apply all settings
                window.i18n.setLanguage(language);
                window.i18n.setCurrency(currency);
                applyCountrySettings(country);
                
                // Update UI
                updateUIText();
                updateCurrencyDisplays();
                
                // Show success message
                showSuccessMessage('Settings applied successfully!');
            });
        }
    }

    /**
     * Update language options based on selected country
     */
    function updateLanguageOptions(country) {
        const languageSelect = document.getElementById('languageSelect');
        if (!languageSelect) return;

        // Clear existing options
        languageSelect.innerHTML = '';

        // Add appropriate language options based on country
        const languageOptions = {
            'IN': [
                { value: 'en', label: '🇺🇸 English' },
                { value: 'hi', label: '🇮🇳 Hindi' }
            ],
            'US': [
                { value: 'en', label: '🇺🇸 English' },
                { value: 'es', label: '🇪🇸 Spanish' }
            ],
            'UK': [
                { value: 'en', label: '🇺🇸 English' }
            ],
            'DE': [
                { value: 'de', label: '🇩🇪 German' },
                { value: 'en', label: '🇺🇸 English' }
            ],
            'FR': [
                { value: 'fr', label: '🇫🇷 French' },
                { value: 'en', label: '🇺🇸 English' }
            ],
            'JP': [
                { value: 'ja', label: '🇯🇵 Japanese' },
                { value: 'en', label: '🇺🇸 English' }
            ],
            'CA': [
                { value: 'en', label: '🇺🇸 English' },
                { value: 'fr', label: '🇫🇷 French' }
            ],
            'AU': [
                { value: 'en', label: '🇺🇸 English' }
            ]
        };

        const options = languageOptions[country] || languageOptions['US'];
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            languageSelect.appendChild(optionElement);
        });

        // Set default language for the country
        const defaultLanguage = options[0].value;
        languageSelect.value = defaultLanguage;
    }

    /**
     * Update currency options based on selected country
     */
    function updateCurrencyOptions(country) {
        const currencySelect = document.getElementById('currencySelect');
        if (!currencySelect) return;

        // Clear existing options
        currencySelect.innerHTML = '';

        // Add appropriate currency options based on country
        const currencyOptions = {
            'IN': [
                { value: 'INR', label: '₹ INR - Indian Rupee' }
            ],
            'US': [
                { value: 'USD', label: '$ USD - US Dollar' }
            ],
            'UK': [
                { value: 'GBP', label: '£ GBP - British Pound' }
            ],
            'DE': [
                { value: 'EUR', label: '€ EUR - Euro' }
            ],
            'FR': [
                { value: 'EUR', label: '€ EUR - Euro' }
            ],
            'JP': [
                { value: 'JPY', label: '¥ JPY - Japanese Yen' }
            ],
            'CA': [
                { value: 'CAD', label: 'C$ CAD - Canadian Dollar' }
            ],
            'AU': [
                { value: 'AUD', label: 'A$ AUD - Australian Dollar' }
            ]
        };

        const options = currencyOptions[country] || currencyOptions['US'];
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            currencySelect.appendChild(optionElement);
        });

        // Set default currency for the country
        const defaultCurrency = options[0].value;
        currencySelect.value = defaultCurrency;
    }

    /**
     * Apply country-specific settings
     */
    function applyCountrySettings(country) {
        // Update tax fields visibility
        const gstFields = document.getElementById('gst_fields');
        const vatFields = document.getElementById('vat_fields');
        const salesTaxFields = document.getElementById('sales_tax_fields');
        const gstHstFields = document.getElementById('gst_hst_fields');

        // Hide all tax fields first
        if (gstFields) gstFields.style.display = 'none';
        if (vatFields) vatFields.style.display = 'none';
        if (salesTaxFields) salesTaxFields.style.display = 'none';
        if (gstHstFields) gstHstFields.style.display = 'none';

        // Show appropriate tax fields based on country
        switch(country) {
            case 'IN':
                if (gstFields) gstFields.style.display = 'block';
                break;
            case 'UK':
            case 'DE':
            case 'FR':
                if (vatFields) vatFields.style.display = 'block';
                break;
            case 'US':
                if (salesTaxFields) salesTaxFields.style.display = 'block';
                break;
            case 'CA':
                if (gstHstFields) gstHstFields.style.display = 'block';
                break;
            default:
                if (gstFields) gstFields.style.display = 'block';
        }

        // Update date format in date inputs
        updateDateFormat(country);
        
        // Update address format
        updateAddressFormat(country);
    }

    /**
     * Update date format based on country
     */
    function updateDateFormat(country) {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            // Date inputs are handled by browser, but we can update labels
            const label = input.previousElementSibling;
            if (label && label.tagName === 'LABEL') {
                switch(country) {
                    case 'US':
                        label.textContent = label.textContent.replace('(DD/MM/YYYY)', '(MM/DD/YYYY)');
                        break;
                    default:
                        label.textContent = label.textContent.replace('(MM/DD/YYYY)', '(DD/MM/YYYY)');
                }
            }
        });
    }

    /**
     * Update address format based on country
     */
    function updateAddressFormat(country) {
        const addressLabels = document.querySelectorAll('label[for*="address"]');
        addressLabels.forEach(label => {
            switch(country) {
                case 'US':
                    if (label.textContent.includes('Line 1')) {
                        label.textContent = label.textContent.replace('Line 1', 'Street Address');
                    }
                    if (label.textContent.includes('Line 2')) {
                        label.textContent = label.textContent.replace('Line 2', 'City, State, ZIP');
                    }
                    break;
                default:
                    if (label.textContent.includes('Street Address')) {
                        label.textContent = label.textContent.replace('Street Address', 'Line 1');
                    }
                    if (label.textContent.includes('City, State, ZIP')) {
                        label.textContent = label.textContent.replace('City, State, ZIP', 'Line 2');
                    }
            }
        });
    }

    /**
     * Apply saved settings on application load
     */
    function applySavedSettings() {
        const settings = window.settingsManager.getSettings();
        
        if (settings.country) {
            document.getElementById('countrySelect').value = settings.country;
            applyCountrySettings(settings.country);
        }
        
        if (settings.language) {
            document.getElementById('languageSelect').value = settings.language;
            window.i18n.setLanguage(settings.language);
        }
        
        if (settings.currency) {
            document.getElementById('currencySelect').value = settings.currency;
            window.i18n.setCurrency(settings.currency);
        }
    }

    /**
     * Update settings UI to reflect current values
     */
    function updateSettingsUI() {
        const settings = window.settingsManager.getSettings();
        
        if (settings.country) {
            updateLanguageOptions(settings.country);
            updateCurrencyOptions(settings.country);
        }
    }

    /**
     * Update UI text with current language
     */
    function updateUIText() {
        // This would update all text elements in the UI
        // For now, we'll trigger a page refresh to ensure all text is updated
        // In a production app, you'd want to update specific elements
        console.log('UI text updated to:', window.i18n.getCurrentLanguage());
    }

    /**
     * Update currency displays throughout the application
     */
    function updateCurrencyDisplays() {
        const currency = window.i18n.getCurrentCurrency();
        const currencySymbol = window.i18n.getCurrencySymbol();
        
        // Update currency symbols in the POS interface
        const currencyElements = document.querySelectorAll('[id*="curr"], [class*="currency"]');
        currencyElements.forEach(element => {
            element.textContent = currencySymbol;
        });
        
        console.log('Currency displays updated to:', currencySymbol);
    }

    /**
     * Show success message
     */
    function showSuccessMessage(message) {
        // Create a temporary success message
        const messageDiv = document.createElement('div');
        messageDiv.className = 'alert alert-success';
        messageDiv.textContent = message;
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.zIndex = '9999';
        messageDiv.style.opacity = '0';
        messageDiv.style.transition = 'opacity 0.3s';
        
        document.body.appendChild(messageDiv);
        
        // Fade in
        setTimeout(() => {
            messageDiv.style.opacity = '1';
        }, 10);
        
        // Fade out and remove
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(messageDiv);
            }, 300);
        }, 2000);
    }

    /**
     * Export functions for external use
     */
    window.i18nIntegration = {
        setupI18nControls: setupI18nControls,
        applyCountrySettings: applyCountrySettings,
        updateUIText: updateUIText,
        updateCurrencyDisplays: updateCurrencyDisplays,
        showSuccessMessage: showSuccessMessage
    };

})();