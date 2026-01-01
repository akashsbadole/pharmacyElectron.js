/**
 * License Manager for FoodMine POS System
 * Handles license validation, activation, and management
 */

class LicenseManager {
    constructor() {
        this.config = {
            // Replace with your deployed Google Apps Script URL
            API_URL: 'https://script.google.com/macros/s/AKfycbzNlKVx4WQOOxRjNaukds8LH9iu__Xw-qzQ-7eGO9YK4HfoN_sWfE73VbDbymCHNK7W/exec',
            GRACE_PERIOD_DAYS: 7,
            CHECK_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
            STORAGE_KEY: 'foodmine_license'
        };

        this.state = {
            license: null,
            isValid: false,
            isExpired: false,
            isGracePeriod: false,
            lastCheck: null,
            hardwareId: null
        };

        this.init();
    }

    async init() {
        console.log('Initializing License Manager...');
        
        // Generate hardware ID
        this.state.hardwareId = await this.generateHardwareId();
        
        // Load stored license
        this.loadLicense();
        
        // Check license status
        await this.checkLicense();
        
        // Set up periodic checks
        this.setupPeriodicChecks();
        
        console.log('License Manager initialized');
    }

    /**
     * Generate hardware fingerprint for device binding
     */
    async generateHardwareId() {
        try {
            // Try to get system information
            const systemInfo = await this.getSystemInfo();
            
            // Create hash from system info
            const hashInput = JSON.stringify(systemInfo);
            const hash = await this.hashString(hashInput);
            
            return hash.substring(0, 16); // Use first 16 characters
        } catch (error) {
            console.warn('Could not generate hardware ID:', error);
            // Fallback to random ID
            return this.generateRandomId();
        }
    }

    async getSystemInfo() {
        return new Promise((resolve) => {
            if (window.require) {
                try {
                    const { app } = window.require('electron');
                    const os = window.require('os');
                    
                    const info = {
                        platform: os.platform(),
                        arch: os.arch(),
                        release: os.release(),
                        hostname: os.hostname(),
                        totalmem: os.totalmem(),
                        freemem: os.freemem(),
                        cpus: os.cpus().length,
                        appVersion: app.getVersion(),
                        appName: app.getName()
                    };
                    
                    resolve(info);
                } catch (error) {
                    resolve({
                        platform: navigator.platform,
                        userAgent: navigator.userAgent,
                        language: navigator.language,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    });
                }
            } else {
                resolve({
                    platform: navigator.platform,
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                });
            }
        });
    }

    async hashString(str) {
        if (window.crypto && window.crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } else {
            // Simple fallback hash
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return Math.abs(hash).toString(16);
        }
    }

    generateRandomId() {
        return Math.random().toString(36).substring(2, 18);
    }

    /**
     * Load license from local storage
     */
    loadLicense() {
        try {
            if (window.localStorage) {
                const stored = localStorage.getItem(this.config.STORAGE_KEY);
                if (stored) {
                    this.state.license = JSON.parse(stored);
                    console.log('Loaded license from storage:', this.state.license);
                }
            }
        } catch (error) {
            console.warn('Could not load license from storage:', error);
        }
    }

    /**
     * Save license to local storage
     */
    saveLicense() {
        try {
            if (window.localStorage && this.state.license) {
                localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(this.state.license));
            }
        } catch (error) {
            console.warn('Could not save license to storage:', error);
        }
    }

    /**
     * Check license status
     */
    async checkLicense() {
        console.log('Checking license status...');
        
        if (!this.state.license || !this.state.license.license_key) {
            console.log('No license found');
            this.state.isValid = false;
            this.state.isExpired = false;
            this.state.isGracePeriod = false;
            this.updateAppState();
            return false;
        }

        try {
            const response = await fetch(`${this.config.API_URL}?path=/validate&license_key=${encodeURIComponent(this.state.license.license_key)}&email=${encodeURIComponent(this.state.license.email)}&hardware_id=${encodeURIComponent(this.state.hardwareId)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                // Update license info
                this.state.license.status = data.status;
                this.state.license.expiry_date = data.expiry_date;
                this.state.license.activation_date = data.activation_date;
                this.state.license.hardware_id = data.hardware_id;
                
                this.saveLicense();
                
                // Check expiry
                const now = new Date();
                const expiryDate = new Date(data.expiry_date);
                
                if (expiryDate > now) {
                    this.state.isValid = true;
                    this.state.isExpired = false;
                    this.state.isGracePeriod = false;
                    console.log('License is valid');
                } else {
                    // Check grace period
                    const graceEndDate = new Date(expiryDate.getTime() + (this.config.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000));
                    
                    if (now <= graceEndDate) {
                        this.state.isValid = true;
                        this.state.isExpired = true;
                        this.state.isGracePeriod = true;
                        console.log('License expired but in grace period');
                    } else {
                        this.state.isValid = false;
                        this.state.isExpired = true;
                        this.state.isGracePeriod = false;
                        console.log('License has expired');
                    }
                }
            } else {
                this.state.isValid = false;
                this.state.isExpired = true;
                this.state.isGracePeriod = false;
                console.log('License validation failed:', data.error);
            }
            
            this.state.lastCheck = new Date();
            this.updateAppState();
            
            return this.state.isValid;
            
        } catch (error) {
            console.error('License check failed:', error);
            
            // If online check fails, check if we have a cached valid license
            if (this.state.license && this.state.license.status === 'active') {
                const expiryDate = new Date(this.state.license.expiry_date);
                const now = new Date();
                
                if (expiryDate > now) {
                    // Use cached license
                    this.state.isValid = true;
                    this.state.isExpired = false;
                    this.state.isGracePeriod = false;
                    console.log('Using cached license (online check failed)');
                    this.updateAppState();
                    return true;
                }
            }
            
            this.state.isValid = false;
            this.state.isExpired = true;
            this.state.isGracePeriod = false;
            this.updateAppState();
            return false;
        }
    }

    /**
     * Activate a license
     */
    async activateLicense(licenseKey, email) {
        console.log('Activating license...');
        
        try {
            const response = await fetch(`${this.config.API_URL}?path=/activate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    license_key: licenseKey,
                    email: email,
                    hardware_id: this.state.hardwareId
                })
            });

            const data = await response.json();
            
            if (data.success) {
                // Store license info
                this.state.license = {
                    license_key: licenseKey,
                    email: email,
                    status: data.status,
                    activation_date: new Date().toISOString()
                };
                
                this.saveLicense();
                await this.checkLicense();
                
                return { success: true, message: 'License activated successfully' };
            } else {
                return { success: false, error: data.error };
            }
            
        } catch (error) {
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    /**
     * Get license status
     */
    getLicenseStatus() {
        return {
            isValid: this.state.isValid,
            isExpired: this.state.isExpired,
            isGracePeriod: this.state.isGracePeriod,
            license: this.state.license,
            lastCheck: this.state.lastCheck,
            hardwareId: this.state.hardwareId
        };
    }

    /**
     * Setup periodic license checks
     */
    setupPeriodicChecks() {
        setInterval(async () => {
            console.log('Running periodic license check...');
            await this.checkLicense();
        }, this.config.CHECK_INTERVAL);
    }

    /**
     * Update application state with license information
     */
    updateAppState() {
        // Update global app state if available
        if (window.pharmaApp && window.pharmaApp.state) {
            window.pharmaApp.state.updateModule('app', {
                license: {
                    ...this.state,
                    status: this.state.isValid ? 'active' : 'inactive'
                }
            });
        }

        // Dispatch custom event for license status changes
        window.dispatchEvent(new CustomEvent('license-status-changed', {
            detail: {
                isValid: this.state.isValid,
                isExpired: this.state.isExpired,
                isGracePeriod: this.state.isGracePeriod,
                license: this.state.license
            }
        }));

        // Show notifications for license issues
        if (!this.state.isValid) {
            this.showLicenseNotification('error', 'License Required', 'Please activate a valid license to use this application.');
        } else if (this.state.isGracePeriod) {
            this.showLicenseNotification('warning', 'License Expired', `Your license has expired but you have ${this.config.GRACE_PERIOD_DAYS} days remaining in the grace period.`);
        }
    }

    /**
     * Show license notification
     */
    showLicenseNotification(type, title, message) {
        if (window.notiflix) {
            switch (type) {
                case 'error':
                    window.notiflix.Report.failure(title, message, 'Activate License', () => {
                        this.showLicenseDialog();
                    });
                    break;
                case 'warning':
                    window.notiflix.Report.warning(title, message, 'OK');
                    break;
                case 'success':
                    window.notiflix.Report.success(title, message, 'OK');
                    break;
            }
        } else {
            alert(`${title}: ${message}`);
        }
    }

    /**
     * Show license activation dialog
     */
    showLicenseDialog() {
        // Create modal dialog
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 8px;
                width: 400px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            ">
                <h3 style="margin-top: 0; color: #333;">License Activation Required</h3>
                <p style="color: #666; margin-bottom: 20px;">Please enter your license key to activate the application.</p>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Email Address</label>
                    <input type="email" id="licenseEmail" style="
                        width: 100%;
                        padding: 8px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        box-sizing: border-box;
                    " placeholder="Enter your email">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">License Key</label>
                    <input type="text" id="licenseKey" style="
                        width: 100%;
                        padding: 8px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        box-sizing: border-box;
                        font-family: monospace;
                    " placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXX">
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancelBtn" style="
                        padding: 8px 16px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        background: white;
                        cursor: pointer;
                    ">Cancel</button>
                    <button id="activateBtn" style="
                        padding: 8px 16px;
                        border: none;
                        border-radius: 4px;
                        background: #007bff;
                        color: white;
                        cursor: pointer;
                    ">Activate</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const emailInput = modal.querySelector('#licenseEmail');
        const keyInput = modal.querySelector('#licenseKey');
        const activateBtn = modal.querySelector('#activateBtn');
        const cancelBtn = modal.querySelector('#cancelBtn');

        activateBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const key = keyInput.value.trim();

            if (!email || !key) {
                alert('Please enter both email and license key.');
                return;
            }

            activateBtn.disabled = true;
            activateBtn.textContent = 'Activating...';

            const result = await this.activateLicense(key, email);

            if (result.success) {
                modal.remove();
                this.showLicenseNotification('success', 'License Activated', 'Your license has been activated successfully.');
            } else {
                alert(result.error);
                activateBtn.disabled = false;
                activateBtn.textContent = 'Activate';
            }
        });

        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
    }
}

// Initialize license manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.licenseManager = new LicenseManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LicenseManager;
}
