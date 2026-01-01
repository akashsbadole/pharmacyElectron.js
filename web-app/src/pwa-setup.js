// PWA Setup and Installation Logic

class PWASetup {
  constructor() {
    this.installPrompt = null;
    this.isInstalled = false;
    this.init();
  }

  init() {
    // Check if app is already installed
    this.checkInstallationStatus();
    
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e;
      this.showInstallBanner();
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.hideInstallBanner();
      console.log('PWA was installed');
    });

    // Register service worker
    this.registerServiceWorker();
  }

  checkInstallationStatus() {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      this.hideInstallBanner();
    }
  }

  showInstallBanner() {
    const banner = document.createElement('div');
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="banner-content">
        <div class="banner-text">
          <h3>Install Restaurant POS</h3>
          <p>Add to your home screen for a better experience</p>
        </div>
        <div class="banner-actions">
          <button class="install-btn">Install</button>
          <button class="dismiss-btn">Later</button>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .pwa-install-banner {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1001;
        max-width: 300px;
        animation: slideIn 0.3s ease;
      }
      
      .banner-content {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .banner-text h3 {
        margin: 0;
        font-size: 1rem;
      }
      
      .banner-text p {
        margin: 0;
        font-size: 0.9rem;
        color: #666;
      }
      
      .banner-actions {
        display: flex;
        gap: 8px;
      }
      
      .install-btn {
        flex: 1;
        padding: 8px 12px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
      }
      
      .install-btn:hover {
        background: #45a049;
      }
      
      .dismiss-btn {
        padding: 8px 12px;
        background: none;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
      }
      
      .dismiss-btn:hover {
        background: #f0f0f0;
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(banner);

    // Add event listeners
    banner.querySelector('.install-btn').addEventListener('click', () => {
      this.installApp();
    });

    banner.querySelector('.dismiss-btn').addEventListener('click', () => {
      banner.remove();
      style.remove();
    });
  }

  hideInstallBanner() {
    const banner = document.querySelector('.pwa-install-banner');
    if (banner) {
      banner.remove();
    }
    const style = document.querySelector('style[textContent*="pwa-install-banner"]');
    if (style) {
      style.remove();
    }
  }

  async installApp() {
    if (!this.installPrompt) return;

    try {
      const result = await this.installPrompt.prompt();
      console.log('Install prompt result:', result.outcome);
      
      if (result.outcome === 'accepted') {
        this.isInstalled = true;
        this.hideInstallBanner();
        this.installPrompt = null;
      }
    } catch (error) {
      console.error('Install failed:', error);
    }
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('SW registered:', registration);

        // Check for updates
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Listen for update found
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateNotification();
            }
          });
        });

      } catch (error) {
        console.error('SW registration failed:', error);
      }
    }
  }

  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'pwa-update-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <p>Update available! Click to refresh.</p>
        <button class="update-btn">Update</button>
        <button class="dismiss-btn">Later</button>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .pwa-update-notification {
        position: fixed;
        top: 80px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1002;
        animation: slideInRight 0.3s ease;
      }
      
      .notification-content {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      
      .update-btn, .dismiss-btn {
        background: none;
        border: 1px solid white;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
      }
      
      .update-btn:hover {
        background: white;
        color: #4CAF50;
      }
      
      .dismiss-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(notification);

    // Add event listeners
    notification.querySelector('.update-btn').addEventListener('click', () => {
      window.location.reload();
    });

    notification.querySelector('.dismiss-btn').addEventListener('click', () => {
      notification.remove();
      style.remove();
    });
  }
}

// Initialize PWA setup
const pwaSetup = new PWASetup();

// Export for use in other modules
window.pwaSetup = pwaSetup;
