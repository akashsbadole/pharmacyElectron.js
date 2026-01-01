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
    if (this.activeTab === 'day-close') {
      this.loadDayCloseHistory();
    }
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
          <button class="tab-button ${this.activeTab === 'pricing' ? 'active' : ''}"
                  onclick="window.pharmaApp.getModule('settings').setActiveTab('pricing')">
            Time Pricing
          </button>
          <button class="tab-button ${this.activeTab === 'network' ? 'active' : ''}"
                  onclick="window.pharmaApp.getModule('settings').setActiveTab('network')">
            Network
          </button>
          <button class="tab-button ${this.activeTab === 'backup' ? 'active' : ''}"
                  onclick="window.pharmaApp.getModule('settings').setActiveTab('backup')">
            Backup & Restore
          </button>
          <button class="tab-button ${this.activeTab === 'day-close' ? 'active' : ''}"
                  onclick="window.pharmaApp.getModule('settings').setActiveTab('day-close')">
            Day Close
          </button>
        </div>
      </div>
    `;
  }
  
  renderTabContent(settings) {
    switch (this.activeTab) {
      case 'general':
        return this.renderGeneralSettings(settings);
      case 'pricing':
        return this.renderPricingSettings();
      case 'network':
        return this.renderNetworkSettings(settings);
      case 'backup':
        return this.renderBackupSettings();
      case 'day-close':
        return this.renderDayCloseSettings(settings);
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

                <div class="form-group">
                  <label class="form-label">Print Language</label>
                  <select name="print_language" class="form-input">
                    <option value="english" ${settings.print_language === 'english' ? 'selected' : ''}>English</option>
                    <option value="bilingual" ${settings.print_language === 'bilingual' ? 'selected' : ''}>English + Hindi (Bilingual)</option>
                  </select>
                  <small class="text-muted">Language for receipts, bills, and KOT printouts</small>
                </div>

                <div class="form-group">
                  <label class="form-label">KOT Display Language</label>
                  <select name="kot_display_language" class="form-input">
                    <option value="english" ${settings.kot_display_language === 'english' ? 'selected' : ''}>English</option>
                    <option value="hindi" ${settings.kot_display_language === 'hindi' ? 'selected' : ''}>Hindi</option>
                    <option value="bilingual" ${settings.kot_display_language === 'bilingual' ? 'selected' : ''}>Bilingual</option>
                  </select>
                  <small class="text-muted">Language for Kitchen Order Ticket displays</small>
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
  
  renderDayCloseSettings(settings) {
    const autoDayClose = settings.autoDayClose || false;
    const dayCloseTime = settings.dayCloseTime || "23:59";
    const dayCloseDay = settings.dayCloseDay || "everyday";
    const lastDayCloseDate = settings.lastDayCloseDate || "Never";
    
    return `
      <div class="day-close-settings">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Day Close Automation</h3>
          </div>
          <div class="card-body">
            <p class="text-gray-500 mb-4">Configure automatic day close operations and view day close history</p>
            
            <!-- Manual Day Close Section -->
            <div class="manual-day-close-section mb-4">
              <h4 class="font-medium mb-2"><i class="fa fa-clock-o"></i> Manual Day Close</h4>
              <p class="text-sm text-gray-600 mb-3">Manually trigger day close for today or a specific date</p>
              
              <div class="row mb-3">
                <div class="col-md-4">
                  <label class="form-label">Close Date</label>
                  <input type="date" id="manualCloseDate" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="col-md-4">
                  <label class="form-label">Options</label>
                  <div class="mt-2">
                    <label class="flex items-center gap-2">
                      <input type="checkbox" id="generateReport" checked>
                      <span class="text-sm">Generate Report</span>
                    </label>
                    <label class="flex items-center gap-2">
                      <input type="checkbox" id="triggerBackup">
                      <span class="text-sm">Create Backup</span>
                    </label>
                  </div>
                </div>
                <div class="col-md-4">
                  <label class="form-label">&nbsp;</label>
                  <button class="btn btn-danger btn-block" onclick="window.pharmaApp.getModule('settings').triggerManualDayClose()">
                    <i class="fa fa-power-off"></i> Close Day Now
                  </button>
                </div>
              </div>
            </div>
            
            <hr class="my-4">
            
            <!-- Automation Settings Section -->
            <div class="automation-settings-section">
              <h4 class="font-medium mb-2"><i class="fa fa-calendar"></i> Automation Settings</h4>
              <p class="text-sm text-gray-600 mb-3">Configure automatic day close scheduling</p>
              
              <form id="dayCloseSettingsForm" onsubmit="window.pharmaApp.getModule('settings').saveDayCloseSettings(event)">
                <div class="grid grid-cols-2 gap-4 mb-4">
                  <div class="form-group">
                    <label class="form-label">Enable Auto Day Close</label>
                    <label class="flex items-center gap-2 mt-2">
                      <input type="checkbox" name="autoDayClose" ${autoDayClose ? 'checked' : ''}>
                      <span class="text-sm">Automatically close day at scheduled time</span>
                    </label>
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label">Last Day Close</label>
                    <div class="mt-2 text-sm text-gray-600">${lastDayCloseDate}</div>
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label">Close Time</label>
                    <input type="time" name="dayCloseTime" class="form-control" value="${dayCloseTime}">
                    <small class="text-muted">Time to trigger automatic day close</small>
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label">Close Day</label>
                    <select name="dayCloseDay" class="form-control">
                      <option value="everyday" ${dayCloseDay === 'everyday' ? 'selected' : ''}>Every Day</option>
                      <option value="friday" ${dayCloseDay === 'friday' ? 'selected' : ''}>Friday</option>
                      <option value="saturday" ${dayCloseDay === 'saturday' ? 'selected' : ''}>Saturday</option>
                      <option value="weekly" ${dayCloseDay === 'weekly' ? 'selected' : ''}>Sunday (Weekly)</option>
                    </select>
                    <small class="text-muted">Day of week for automatic closure</small>
                  </div>
                </div>
                
                <button type="submit" class="btn btn-success">
                  <i class="fa fa-save"></i> Save Automation Settings
                </button>
              </form>
            </div>
            
            <hr class="my-4">
            
            <!-- Day Close History Section -->
            <div class="day-close-history-section">
              <h4 class="font-medium mb-2"><i class="fa fa-history"></i> Recent Day Close History</h4>
              <div id="dayCloseHistoryContent">
                <p class="text-sm text-gray-600">Loading day close history...</p>
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
    settingsData.enable_packaging_charge = formData.get('enable_packaging_charge') ? 'on' : 'off';
    
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
  
  async saveDayCloseSettings(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const autoDayClose = formData.get('autoDayClose') ? true : false;
    const dayCloseTime = formData.get('dayCloseTime') || "23:59";
    const dayCloseDay = formData.get('dayCloseDay') || "everyday";
    
    try {
      const response = await fetch(`${window.api}day-close/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          time: dayCloseTime,
          day: dayCloseDay,
          enabled: autoDayClose
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (window.notiflix) {
          window.notiflix.Report.success('Success', result.message, 'Ok');
        }
        await this.loadSettings();
        await this.loadDayCloseHistory();
      }
    } catch (error) {
      console.error('Error saving day close settings:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to save day close settings', 'Ok');
      }
    }
  }
  
  async triggerManualDayClose() {
    const closeDate = document.getElementById('manualCloseDate').value;
    const generateReport = document.getElementById('generateReport').checked;
    const triggerBackup = document.getElementById('triggerBackup').checked;
    
    if (!closeDate) {
      if (window.notiflix) {
        window.notiflix.Report.warning('Warning', 'Please select a date for day close', 'Ok');
      }
      return;
    }
    
    if (window.notiflix) {
      window.notiflix.Notify.info('Day Close', 'Starting day close operation...');
    }
    
    try {
      const response = await fetch(`${window.api}day-close/close-day`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: closeDate,
          generateReport: generateReport,
          backup: triggerBackup
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        if (window.notiflix) {
          window.notiflix.Report.success('Success', result.message, 'Ok');
        }
        
        // Show detailed results
        const details = `Operations completed:\n- Report Generated: ${result.operations.reportGenerated ? 'Yes' : 'No'}\n- Backup Created: ${result.operations.backupCreated ? 'Yes' : 'No'}\n- Transactions Processed: ${result.operations.transactionsProcessed || 0}\n- Sales Total: ₹${(result.operations.salesTotal || 0).toFixed(2)}`;
        
        if (window.notiflix) {
          window.notiflix.Report.info('Day Close Details', details, 'Ok');
        }
        
        await this.loadDayCloseHistory();
      } else {
        const errorMsg = result.message || 'Day close operation failed';
        if (window.notiflix) {
          window.notiflix.Report.failure('Error', errorMsg, 'Ok');
        }
      }
    } catch (error) {
      console.error('Error triggering day close:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to trigger day close operation', 'Ok');
      }
    }
  }
  
  async loadDayCloseHistory() {
    try {
      const response = await fetch(`${window.api}day-close/status`);
      const result = await response.json();
      
      if (response.ok) {
        const history = result.history || [];
        const historyContainer = document.getElementById('dayCloseHistoryContent');
        
        if (history.length === 0) {
          historyContainer.innerHTML = '<p class="text-sm text-gray-600">No day close records found</p>';
        } else {
          const historyHtml = `
            <div class="table-responsive">
              <table class="table table-striped table-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Transactions</th>
                    <th>Total Sales</th>
                    <th>Shifts Closed</th>
                    <th>Closed At</th>
                  </tr>
                </thead>
                <tbody>
                  ${history.slice(0, 10).map(entry => `
                    <tr>
                      <td>${entry.date}</td>
                      <td>${entry.summary.totalTransactions}</td>
                      <td>₹${entry.summary.totalSales.toFixed(2)}</td>
                      <td>${entry.summary.activeShifts}</td>
                      <td>${new Date(entry.closedAt).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ${history.length > 10 ? '<p class="text-sm text-gray-600 mt-2">Showing last 10 records</p>' : ''}
          `;
          historyContainer.innerHTML = historyHtml;
        }
      }
    } catch (error) {
      console.error('Error loading day close history:', error);
      const historyContainer = document.getElementById('dayCloseHistoryContent');
      if (historyContainer) {
        historyContainer.innerHTML = '<p class="text-sm text-red-600">Error loading day close history</p>';
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
}

// Make SettingsModule available globally
window.SettingsModule = SettingsModule;