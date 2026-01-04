/**
 * Settings Module - System configuration
 */

class SettingsModule {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.activeTab = 'general';
  }
  
  initialize() {
    console.log('Settings module initialized');
  }
  
  onActivate() {
    this.loadSettings();
  }
  
  async loadSettings() {
    try {
      const response = await fetch(`${window.api}settings/get`);
      const settings = await response.json();
      this.app.state.updateModule('app', { settings: settings.settings });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  setActiveTab(tab) {
    this.activeTab = tab;
    this.render();
  }
  
  render() {
    const appState = this.app.state.getModuleState('app');
    const settings = appState.settings || {};
    
    return `
      <div class="module-container settings-module" data-module="settings">
        <div class="module-header">
          <h1 class="module-title">Settings</h1>
          <p class="module-subtitle">Configure system settings and preferences</p>
        </div>
        
        ${this.renderTabs()}
        ${this.renderTabContent(settings)}
      </div>
    `;
  }
  
  renderTabs() {
    return `
      <div class="tabs mb-6">
        <div class="flex border-b">
          <button class="tab-button ${this.activeTab === 'general' ? 'active' : ''}"
                  onclick="window.pharmaApp.getModule('settings').setActiveTab('general')">
            General
          </button>
          <button class="tab-button ${this.activeTab === 'receipts' ? 'active' : ''}"
                  onclick="window.pharmaApp.getModule('settings').setActiveTab('receipts')">
            Receipts
          </button>
          <button class="tab-button ${this.activeTab === 'network' ? 'active' : ''}"
                  onclick="window.pharmaApp.getModule('settings').setActiveTab('network')">
            Network
          </button>
          <button class="tab-button ${this.activeTab === 'backup' ? 'active' : ''}"
                  onclick="window.pharmaApp.getModule('settings').setActiveTab('backup')">
            Backup & Restore
          </button>
        </div>
      </div>
    `;
  }
  
  renderTabContent(settings) {
    switch (this.activeTab) {
      case 'general':
        return this.renderGeneralSettings(settings);
      case 'receipts':
        return this.renderReceiptSettings(settings);
      case 'network':
        return this.renderNetworkSettings(settings);
      case 'backup':
        return this.renderBackupSettings();
      default:
        return '';
    }
  }
  
  renderGeneralSettings(settings) {
    return `
      <div class="general-settings">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">General Settings</h3>
          </div>
          <div class="card-body">
            <form id="generalSettingsForm" onsubmit="window.pharmaApp.getModule('settings').saveGeneralSettings(event)">
              <div class="grid grid-cols-2 gap-4">
                <div class="form-group">
                  <label class="form-label">Store Name</label>
                  <input type="text" name="store" class="form-input" 
                         value="${settings.store || ''}" required>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Currency Symbol</label>
                  <input type="text" name="symbol" class="form-input" 
                         value="${settings.symbol || '$'}" required>
                </div>
                
                <div class="form-group">
                  <label class="form-label">GST Percentage (Legacy)</label>
                  <input type="number" name="percentage" class="form-input" 
                         value="${settings.percentage || '0'}" min="0" max="100">
                </div>
                
                <div class="form-group">
                  <label class="form-label">GSTIN</label>
                  <input type="text" name="gstin" class="form-input" 
                         value="${settings.gstin || ''}" placeholder="27AAAAA0000A1Z5">
                </div>

                <div class="form-group">
                  <label class="form-label">CGST (%)</label>
                  <input type="number" name="cgst" class="form-input" 
                         value="${settings.cgst || '0'}" step="0.01">
                </div>

                <div class="form-group">
                  <label class="form-label">SGST (%)</label>
                  <input type="number" name="sgst" class="form-input" 
                         value="${settings.sgst || '0'}" step="0.01">
                </div>

                <div class="form-group">
                  <label class="form-label">IGST (%)</label>
                  <input type="number" name="igst" class="form-input" 
                         value="${settings.igst || '0'}" step="0.01">
                </div>
              </div>

              <div class="form-group mt-4">
                <label class="form-label">Enabled Payment Modes</label>
                <div class="flex gap-4">
                  ${['Cash', 'Card', 'UPI', 'Net Banking'].map(mode => `
                    <label class="flex items-center gap-2">
                        <input type="checkbox" name="payment_modes[]" value="${mode}" 
                               ${(settings.payment_modes || ['Cash', 'Card', 'UPI', 'Net Banking']).includes(mode) ? 'checked' : ''}>
                        <span class="text-sm">${mode}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
              
              <div class="form-group mt-4">
                <label class="flex items-center gap-2">
                  <input type="checkbox" name="charge_tax" ${settings.charge_tax ? 'checked' : ''}>
                  <span class="text-sm">Enable GST Calculation</span>
                </label>
              </div>
              
              <button type="submit" class="btn btn-success mt-4">
                Save Settings
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  }
  
  renderNetworkSettings(settings) {
    return `
      <div class="network-settings">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Network Settings</h3>
          </div>
          <div class="card-body">
            <p class="text-gray-500 mb-4">Configure network and terminal settings</p>
            
            <div class="text-center py-8 text-gray-500">
              <div>Network settings feature coming soon...</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderBackupSettings() {
    return `
      <div class="backup-settings">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Backup & Restore</h3>
          </div>
          <div class="card-body">
            <p class="text-gray-500 mb-4">Create and restore database backups</p>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="backup-section">
                <h4 class="font-medium mb-2">Create Backup</h4>
                <button class="btn btn-primary w-full" onclick="window.pharmaApp.getModule('settings').createBackup()">
                  <i class="fa fa-download"></i> Create Backup
                </button>
              </div>
              
              <div class="restore-section">
                <h4 class="font-medium mb-2">Restore Backup</h4>
                <button class="btn btn-warning w-full" onclick="window.pharmaApp.getModule('settings').restoreBackup()">
                  <i class="fa fa-upload"></i> Restore Backup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // Event handlers
  async saveGeneralSettings(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const settingsData = {};
    formData.forEach((value, key) => {
        if (key === 'payment_modes[]') {
            if (!settingsData.payment_modes) settingsData.payment_modes = [];
            settingsData.payment_modes.push(value);
        } else {
            settingsData[key] = value;
        }
    });
    
    // Convert checkboxes
    settingsData.charge_tax = formData.get('charge_tax') ? 'on' : 'off';
    
    try {
      const response = await fetch(`${window.api}settings/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsData)
      });
      
      if (response.ok) {
        if (window.notiflix) {
          window.notiflix.Report.success('Success', 'Settings saved successfully', 'Ok');
        }
        await this.loadSettings();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to save settings', 'Ok');
      }
    }
  }
  
  createBackup() {
    if (window.notiflix) {
      window.notiflix.Notify.info('Creating backup...', 'Please wait while we create your backup.');
    }
    // TODO: Implement backup functionality
  }
  
  restoreBackup() {
    if (window.notiflix) {
      window.notiflix.Notify.info('Restore functionality', 'Backup restore feature coming soon.');
    }
    // TODO: Implement restore functionality
  }

  renderReceiptSettings(settings) {
    const receiptSettings = settings.receipt_auto_save || {};
    return `
      <div class="receipt-settings">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Receipt Auto-Save Settings</h3>
            <p class="text-sm text-gray-600 mt-1">Configure automatic saving of receipts after successful transactions</p>
          </div>
          <div class="card-body">
            <form id="receiptSettingsForm" onsubmit="window.pharmaApp.getModule('settings').saveReceiptSettings(event)">
              <div class="mb-6">
                <div class="form-group">
                  <label class="flex items-center gap-2">
                    <input type="checkbox" name="receipt_auto_save_enabled"
                           ${receiptSettings.enabled ? 'checked' : ''}>
                    <span class="text-sm font-medium">Enable Receipt Auto-Save</span>
                  </label>
                  <p class="text-xs text-gray-500 mt-1">Automatically save receipts as PDF and/or image after successful transactions</p>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="save-options">
                  <h4 class="font-medium mb-3">Save Options</h4>

                  <div class="form-group mb-3">
                    <label class="flex items-center gap-2">
                      <input type="checkbox" name="receipt_save_pdf"
                             ${receiptSettings.save_pdf !== false ? 'checked' : ''}>
                      <span class="text-sm">Save as PDF</span>
                    </label>
                  </div>

                  <div class="form-group mb-3">
                    <label class="flex items-center gap-2">
                      <input type="checkbox" name="receipt_save_image"
                             ${receiptSettings.save_image !== false ? 'checked' : ''}>
                      <span class="text-sm">Save as Image</span>
                    </label>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Image Format</label>
                    <select name="receipt_image_format" class="form-input">
                      <option value="png" ${receiptSettings.image_format === 'png' ? 'selected' : ''}>PNG</option>
                      <option value="jpeg" ${receiptSettings.image_format === 'jpeg' ? 'selected' : ''}>JPEG</option>
                      <option value="webp" ${receiptSettings.image_format === 'webp' ? 'selected' : ''}>WebP</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Image Quality (0.1 - 1.0)</label>
                    <input type="number" name="receipt_image_quality" class="form-input"
                           value="${receiptSettings.image_quality || 0.95}" min="0.1" max="1.0" step="0.05">
                  </div>
                </div>

                <div class="file-organization">
                  <h4 class="font-medium mb-3">File Organization</h4>

                  <div class="form-group mb-3">
                    <label class="form-label">Folder Structure</label>
                    <input type="text" name="receipt_folder_structure" class="form-input"
                           value="${receiptSettings.folder_structure || 'receipts/{YYYY}/{MM}/{DD}'}"
                           placeholder="receipts/{YYYY}/{MM}/{DD}">
                    <p class="text-xs text-gray-500 mt-1">
                      Use {YYYY}, {MM}, {DD} for date placeholders
                    </p>
                  </div>

                  <div class="form-group mb-3">
                    <label class="form-label">Filename Pattern</label>
                    <input type="text" name="receipt_filename_pattern" class="form-input"
                           value="${receiptSettings.filename_pattern || 'receipt-{transaction_id}'}"
                           placeholder="receipt-{transaction_id}">
                    <p class="text-xs text-gray-500 mt-1">
                      Use {transaction_id} and {timestamp} placeholders
                    </p>
                  </div>

                  <div class="form-group mb-3">
                    <label class="form-label">PDF Format</label>
                    <select name="receipt_pdf_format" class="form-input">
                      <option value="a4" ${receiptSettings.pdf_format === 'a4' ? 'selected' : ''}>A4</option>
                      <option value="letter" ${receiptSettings.pdf_format === 'letter' ? 'selected' : ''}>Letter</option>
                      <option value="receipt" ${receiptSettings.pdf_format === 'receipt' ? 'selected' : ''}>Thermal Receipt (80mm)</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="flex items-center gap-2">
                      <input type="checkbox" name="receipt_include_timestamp"
                             ${receiptSettings.include_timestamp !== false ? 'checked' : ''}>
                      <span class="text-sm">Include timestamp in filename</span>
                    </label>
                  </div>
                </div>
              </div>

              <div class="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
                <h5 class="font-medium text-blue-800 mb-2">How it works:</h5>
                <ul class="text-sm text-blue-700 space-y-1">
                  <li>• Receipts are automatically saved after successful transactions</li>
                  <li>• Files are organized in the specified folder structure</li>
                  <li>• Receipt saving never blocks or delays transaction completion</li>
                  <li>• Failed saves are logged but don't affect the transaction</li>
                </ul>
              </div>

              <button type="submit" class="btn btn-success mt-4">
                <i class="fa fa-save"></i> Save Receipt Settings
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  async saveReceiptSettings(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const settingsData = {};

    // Convert form data
    formData.forEach((value, key) => {
      settingsData[key] = value;
    });

    // Convert checkboxes
    settingsData.receipt_auto_save_enabled = formData.get('receipt_auto_save_enabled') ? true : false;
    settingsData.receipt_save_pdf = formData.get('receipt_save_pdf') ? true : false;
    settingsData.receipt_save_image = formData.get('receipt_save_image') ? true : false;
    settingsData.receipt_include_timestamp = formData.get('receipt_include_timestamp') ? true : false;
    settingsData.receipt_image_quality = parseFloat(settingsData.receipt_image_quality || 0.95);

    try {
      const response = await fetch(`${window.api}settings/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsData)
      });

      if (response.ok) {
        if (window.notiflix) {
          window.notiflix.Report.success('Success', 'Receipt settings saved successfully', 'Ok');
        }
        await this.loadSettings();
      }
    } catch (error) {
      console.error('Error saving receipt settings:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to save receipt settings', 'Ok');
      }
    }
  }
}

// Make SettingsModule available globally
window.SettingsModule = SettingsModule;