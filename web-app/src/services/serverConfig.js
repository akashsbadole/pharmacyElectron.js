// Server Configuration Service for Web Application
// Handles dynamic server configuration and API endpoint setup

class ServerConfigService {
  constructor() {
    this.config = {
      port: null,
      host: 'localhost',
      api: null,
      ready: false
    };
    
    this.listeners = [];
    this.retryAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000;
  }

  // Initialize server configuration
  async initialize() {
    console.log('Initializing server configuration...');
    
    // Try to get server config from various sources
    const config = await this.discoverServerConfig();
    
    if (config) {
      this.setConfig(config);
      return true;
    } else {
      console.warn('Server configuration not found, will retry...');
      return false;
    }
  }

  // Discover server configuration
  async discoverServerConfig() {
    // Method 1: Try to get config from parent window (if embedded)
    if (window.parent && window.parent !== window) {
      try {
        const config = await this.getConfigFromParent();
        if (config) return config;
      } catch (error) {
        console.warn('Could not get config from parent:', error);
      }
    }

    // Method 2: Try common ports and localhost
    const commonPorts = [3000, 8080, 8081, 52554, 4000, 5000];
    
    for (const port of commonPorts) {
      try {
        const config = await this.testServerPort(port);
        if (config) {
          console.log(`Server found on port ${port}`);
          return config;
        }
      } catch (error) {
        // Continue to next port
      }
    }

    // Method 3: Check for environment variables or config files
    try {
      const envConfig = await this.getEnvironmentConfig();
      if (envConfig) return envConfig;
    } catch (error) {
      console.warn('Could not get environment config:', error);
    }

    return null;
  }

  // Get config from parent window (for embedded scenarios)
  async getConfigFromParent() {
    return new Promise((resolve) => {
      // Listen for config message from parent
      const messageHandler = (event) => {
        if (event.data && event.data.type === 'SERVER_CONFIG') {
          window.removeEventListener('message', messageHandler);
          resolve({
            port: event.data.port,
            host: event.data.host || 'localhost',
            api: `http://${event.data.host || 'localhost'}:${event.data.port}/api/`
          });
        }
      };

      window.addEventListener('message', messageHandler);

      // Request config from parent
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'REQUEST_SERVER_CONFIG' }, '*');
      }

      // Timeout after 3 seconds
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        resolve(null);
      }, 3000);
    });
  }

  // Test if server is running on specific port
  async testServerPort(port) {
    try {
      const response = await fetch(`http://localhost:${port}/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(2000)
      });

      if (response.ok) {
        const config = await response.json();
        return {
          port: config.port,
          host: config.host || 'localhost',
          api: `http://${config.host || 'localhost'}:${config.port}/api/`
        };
      }
    } catch (error) {
      // Server not available on this port
    }
    return null;
  }

  // Get environment configuration
  async getEnvironmentConfig() {
    // Check for environment variables (browser-compatible)
    const envPort = window.env?.REACT_APP_API_PORT || window.env?.API_PORT;
    const envHost = window.env?.REACT_APP_API_HOST || window.env?.API_HOST || 'localhost';
    
    if (envPort) {
      return {
        port: parseInt(envPort),
        host: envHost,
        api: `http://${envHost}:${envPort}/api/`
      };
    }

    // Check for config file
    try {
      const configResponse = await fetch('/config.json');
      if (configResponse.ok) {
        const config = await configResponse.json();
        return {
          port: config.port,
          host: config.host || 'localhost',
          api: `http://${config.host || 'localhost'}:${config.port}/api/`
        };
      }
    } catch (error) {
      // No config file
    }

    return null;
  }

  // Set server configuration
  setConfig(config) {
    this.config = {
      port: config.port,
      host: config.host || 'localhost',
      api: config.api || `http://${config.host || 'localhost'}:${config.port}/api/`,
      ready: true
    };

    console.log('Server configuration set:', this.config);
    
    // Notify listeners
    this.notifyListeners();
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem('serverConfig', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Could not save server config to localStorage:', error);
    }
  }

  // Get current configuration
  getConfig() {
    return this.config;
  }

  // Check if server is ready
  isReady() {
    return this.config.ready;
  }

  // Get API base URL
  getAPIBase() {
    return this.config.api;
  }

  // Add listener for config changes
  addListener(callback) {
    this.listeners.push(callback);
    
    // Call immediately if already configured
    if (this.config.ready) {
      callback(this.config);
    }

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    });
  }

  // Retry configuration discovery
  async retry() {
    if (this.retryAttempts >= this.maxRetries) {
      console.error('Max retry attempts reached for server configuration');
      return false;
    }

    this.retryAttempts++;
    console.log(`Retrying server configuration discovery (${this.retryAttempts}/${this.maxRetries})`);
    
    await new Promise(resolve => setTimeout(resolve, this.retryDelay * this.retryAttempts));
    
    const success = await this.initialize();
    
    if (!success && this.retryAttempts < this.maxRetries) {
      return this.retry();
    }
    
    return success;
  }

  // Manual configuration (for user input)
  setManualConfig(host, port) {
    const config = {
      port: parseInt(port),
      host: host,
      api: `http://${host}:${port}/api/`
    };
    
    this.setConfig(config);
    return true;
  }

  // Load persisted configuration
  loadPersistedConfig() {
    try {
      const savedConfig = localStorage.getItem('serverConfig');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        this.setConfig(config);
        return true;
      }
    } catch (error) {
      console.warn('Could not load persisted server config:', error);
    }
    return false;
  }

  // Clear configuration
  clearConfig() {
    this.config = {
      port: null,
      host: 'localhost',
      api: null,
      ready: false
    };
    
    try {
      localStorage.removeItem('serverConfig');
    } catch (error) {
      console.warn('Could not clear server config from localStorage:', error);
    }
    
    this.notifyListeners();
  }
}

// Create singleton instance
const serverConfigService = new ServerConfigService();

// Auto-initialize when module loads
serverConfigService.initialize().then(success => {
  if (!success) {
    // Retry after a delay
    setTimeout(() => serverConfigService.retry(), 3000);
  }
});

// Load persisted config if available
serverConfigService.loadPersistedConfig();

export default serverConfigService;
