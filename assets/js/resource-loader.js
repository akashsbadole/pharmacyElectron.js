/**
 * COMPREHENSIVE RESOURCE LOADER FOR StyleMine COMPACT
 * Handles jQuery, QRCode, and other dependencies with fallbacks
 */

class ResourceManager {
    constructor() {
        this.loadedResources = new Set();
        this.failedResources = new Set();
        this.loadingPromises = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    /**
     * Load a script with fallback support
     */
    async loadScript(url, options = {}) {
        const {
            name = url,
            fallbackUrls = [],
            timeout = 10000,
            onLoad = null,
            onError = null
        } = options;

        // Skip if already loaded
        if (this.loadedResources.has(name)) {
            console.log(`Resource already loaded: ${name}`);
            return true;
        }

        // Skip if already failed after max retries
        if (this.failedResources.has(name)) {
            console.warn(`Resource previously failed, skipping: ${name}`);
            return false;
        }

        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;

            let timeoutId;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                script.onload = null;
                script.onerror = null;
            };

            const handleLoad = () => {
                cleanup();
                this.loadedResources.add(name);
                console.log(`✓ Successfully loaded: ${name}`);
                if (onLoad) onLoad();
                resolve(true);
            };

            const handleError = () => {
                cleanup();
                console.warn(`✗ Failed to load: ${name} (${url})`);
                
                // Try fallback URLs
                if (fallbackUrls.length > 0) {
                    const fallbackUrl = fallbackUrls.shift();
                    console.log(`Trying fallback: ${fallbackUrl}`);
                    this.loadScript(fallbackUrl, {
                        ...options,
                        fallbackUrls,
                        name: `${name}_fallback`
                    }).then(resolve);
                } else {
                    this.failedResources.add(name);
                    if (onError) onError();
                    resolve(false);
                }
            };

            script.onload = handleLoad;
            script.onerror = handleError;

            // Set timeout
            timeoutId = setTimeout(() => {
                console.warn(`Timeout loading: ${name}`);
                handleError();
            }, timeout);

            document.head.appendChild(script);
        });
    }

    /**
     * Load jQuery with multiple fallback options
     */
    async loadJQuery() {
        if (typeof jQuery !== 'undefined' || typeof $ !== 'undefined') {
            console.log('jQuery already available');
            return true;
        }

        const jqueryUrls = [
            'https://code.jquery.com/jquery-3.6.0.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js',
            'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js',
            'https://unpkg.com/jquery@3.6.0/dist/jquery.min.js'
        ];

        try {
            const success = await this.loadScript(jqueryUrls[0], {
                name: 'jQuery',
                fallbackUrls: jqueryUrls.slice(1),
                onLoad: () => {
                    // Ensure $ and jQuery are available
                    window.$ = window.jQuery;
                    console.log('jQuery loaded and initialized');
                }
            });

            if (success) {
                // Wait for jQuery to be fully ready
                if (typeof jQuery !== 'undefined') {
                    this.loadedResources.add('jQuery');
                }
            }

            return success;
        } catch (error) {
            console.error('Failed to load jQuery:', error);
            return this.createJQueryFallback();
        }
    }

    /**
     * Create a minimal jQuery fallback for basic operations
     */
    createJQueryFallback() {
        console.warn('Creating jQuery fallback');
        
        window.$ = window.jQuery = function(selector) {
            if (typeof selector === 'string') {
                const elements = document.querySelectorAll(selector);
                return {
                    length: elements.length,
                    0: elements[0],
                    each: function(callback) {
                        elements.forEach(callback);
                        return this;
                    },
                    click: function(callback) {
                        elements.forEach(el => el.addEventListener('click', callback));
                        return this;
                    },
                    addClass: function(className) {
                        elements.forEach(el => el.classList.add(className));
                        return this;
                    },
                    removeClass: function(className) {
                        elements.forEach(el => el.classList.remove(className));
                        return this;
                    },
                    on: function(event, callback) {
                        elements.forEach(el => el.addEventListener(event, callback));
                        return this;
                    },
                    ready: function(callback) {
                        if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', callback);
                        } else {
                            callback();
                        }
                        return this;
                    },
                    val: function(value) {
                        if (value !== undefined) {
                            elements.forEach(el => el.value = value);
                            return this;
                        }
                        return elements[0] ? elements[0].value : '';
                    },
                    text: function(value) {
                        if (value !== undefined) {
                            elements.forEach(el => el.textContent = value);
                            return this;
                        }
                        return elements[0] ? elements[0].textContent : '';
                    },
                    html: function(value) {
                        if (value !== undefined) {
                            elements.forEach(el => el.innerHTML = value);
                            return this;
                        }
                        return elements[0] ? elements[0].innerHTML : '';
                    }
                };
            }
            
            // Handle jQuery objects
            if (selector instanceof Element) {
                return { 0: selector, length: 1 };
            }
            
            return { length: 0 };
        };

        this.loadedResources.add('jQuery-fallback');
        return true;
    }

    /**
     * Load QRCode library with fallbacks
     */
    async loadQRCode() {
        if (typeof QRCode !== 'undefined' || typeof window.qrcode !== 'undefined') {
            console.log('QRCode already available');
            return true;
        }

        const qrcodeUrls = [
            'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
            'https://unpkg.com/qrcode-generator@1.4.4/qrcode.min.js',
            'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'
        ];

        try {
            const success = await this.loadScript(qrcodeUrls[0], {
                name: 'QRCode',
                fallbackUrls: qrcodeUrls.slice(1),
                onLoad: () => {
                    if (typeof window.qrcode !== 'undefined') {
                        window.QRCode = window.qrcode;
                    }
                    console.log('QRCode library loaded and initialized');
                }
            });

            if (success) {
                this.loadedResources.add('QRCode');
            }

            return success;
        } catch (error) {
            console.error('Failed to load QRCode:', error);
            return this.createQRCodeFallback();
        }
    }

    /**
     * Create QRCode fallback
     */
    createQRCodeFallback() {
        console.warn('Creating QRCode fallback');
        
        window.QRCode = {
            toCanvas: function(canvas, text, options, callback) {
                // Simple fallback that shows a message
                const ctx = canvas.getContext('2d');
                canvas.width = options?.width || 200;
                canvas.height = options?.height || 200;
                
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = '#666';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('QR Code', canvas.width / 2, canvas.height / 2);
                ctx.fillText('Generation', canvas.width / 2, canvas.height / 2 + 15);
                ctx.fillText('Unavailable', canvas.width / 2, canvas.height / 2 + 30);
                
                if (callback) callback(new Error('QRCode library not available'));
            }
        };

        this.loadedResources.add('QRCode-fallback');
        return true;
    }

    /**
     * Load all required resources in order
     */
    async loadAll() {
        console.log('Starting comprehensive resource loading...');
        
        try {
            // Load jQuery first
            console.log('Loading jQuery...');
            const jqueryLoaded = await this.loadJQuery();
            if (!jqueryLoaded) {
                console.error('jQuery loading failed, continuing with fallback');
            }

            // Load QRCode
            console.log('Loading QRCode...');
            const qrcodeLoaded = await this.loadQRCode();
            if (!qrcodeLoaded) {
                console.error('QRCode loading failed, continuing with fallback');
            }

            // Load other essential scripts
            console.log('Loading additional scripts...');
            await this.loadScript('assets/js/compact-retail.js', {
                name: 'compact-retail'
            });

            console.log('Resource loading complete');
            console.log('Loaded resources:', Array.from(this.loadedResources));
            console.log('Failed resources:', Array.from(this.failedResources));
            
            return {
                success: true,
                loaded: Array.from(this.loadedResources),
                failed: Array.from(this.failedResources)
            };

        } catch (error) {
            console.error('Resource loading failed:', error);
            return {
                success: false,
                error: error.message,
                loaded: Array.from(this.loadedResources),
                failed: Array.from(this.failedResources)
            };
        }
    }

    /**
     * Check if all required resources are loaded
     */
    isReady() {
        return this.loadedResources.has('jQuery') || this.loadedResources.has('jQuery-fallback');
    }

    /**
     * Get status of all resources
     */
    getStatus() {
        return {
            loaded: Array.from(this.loadedResources),
            failed: Array.from(this.failedResources),
            ready: this.isReady()
        };
    }
}

// Create global instance
window.ResourceManager = new ResourceManager();

// Auto-start loading when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ResourceManager.loadAll();
    });
} else {
    window.ResourceManager.loadAll();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResourceManager;
}