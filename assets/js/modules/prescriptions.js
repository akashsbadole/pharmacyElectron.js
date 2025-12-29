/**
 * Prescriptions Module - Prescription management
 */

class PrescriptionsModule {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.activeTab = 'pending';
  }
  
  initialize() {
    console.log('Prescriptions module initialized');
  }
  
  onActivate() {
    this.loadInitialData();
  }
  
  async loadInitialData() {
    await Promise.all([
      this.loadPendingPrescriptions(),
      this.loadVerifiedPrescriptions()
    ]);
  }
  
  async loadPendingPrescriptions() {
    try {
      const response = await fetch(`${window.api}prescriptions/pending`);
      const prescriptions = await response.json();
      
      this.app.state.updateModule('prescriptions', { pending: prescriptions });
    } catch (error) {
      console.error('Error loading pending prescriptions:', error);
    }
  }
  
  async loadVerifiedPrescriptions() {
    try {
      const response = await fetch(`${window.api}prescriptions/verified`);
      const prescriptions = await response.json();
      
      this.app.state.updateModule('prescriptions', { verified: prescriptions });
    } catch (error) {
      console.error('Error loading verified prescriptions:', error);
    }
  }
  
  setActiveTab(tab) {
    this.activeTab = tab;
    this.app.state.updateModule('prescriptions', { activeTab: tab });
    this.render();
  }
  
  async verifyPrescription(prescriptionId, verificationData) {
    try {
      const response = await fetch(`${window.api}prescriptions/verify/${prescriptionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(verificationData)
      });
      
      // Refresh prescriptions
      await this.loadPendingPrescriptions();
      await this.loadVerifiedPrescriptions();
      
      if (window.notiflix) {
        window.notiflix.Report.success('Success', 'Prescription verified successfully', 'Ok');
      }
      
    } catch (error) {
      console.error('Error verifying prescription:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to verify prescription', 'Ok');
      }
    }
  }
  
  async rejectPrescription(prescriptionId, reason) {
    try {
      const response = await fetch(`${window.api}prescriptions/reject/${prescriptionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      
      // Refresh prescriptions
      await this.loadPendingPrescriptions();
      
      if (window.notiflix) {
        window.notiflix.Report.success('Success', 'Prescription rejected', 'Ok');
      }
      
    } catch (error) {
      console.error('Error rejecting prescription:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to reject prescription', 'Ok');
      }
    }
  }
  
  addToCart(prescription) {
    // Switch to POS module and add prescription items to cart
    this.app.switchToModule('pos');
    // TODO: Add prescription items to POS cart
  }
  
  render() {
    const prescriptionsState = this.app.state.getModuleState('prescriptions');
    
    return `
      <div class="module-container prescriptions-module" data-module="prescriptions">
        <div class="module-header">
          <h1 class="module-title">Prescription Management</h1>
          <p class="module-subtitle">Manage and verify prescriptions</p>
        </div>
        
        ${this.renderTabs(prescriptionsState)}
        ${this.renderTabContent(prescriptionsState)}
      </div>
    `;
  }
  
  renderTabs(state) {
    return `
      <div class="tabs mb-6">
        <div class="flex border-b">
          <button class="tab-button ${this.activeTab === 'pending' ? 'active' : ''}" 
                  onclick="window.pharmaApp.getModule('prescriptions').setActiveTab('pending')">
            Pending (${state.pending?.length || 0})
          </button>
          <button class="tab-button ${this.activeTab === 'verified' ? 'active' : ''}" 
                  onclick="window.pharmaApp.getModule('prescriptions').setActiveTab('verified')">
            Verified (${state.verified?.length || 0})
          </button>
          <button class="tab-button ${this.activeTab === 'history' ? 'active' : ''}" 
                  onclick="window.pharmaApp.getModule('prescriptions').setActiveTab('history')">
            History
          </button>
        </div>
      </div>
    `;
  }
  
  renderTabContent(state) {
    switch (this.activeTab) {
      case 'pending':
        return this.renderPendingPrescriptions(state.pending);
      case 'verified':
        return this.renderVerifiedPrescriptions(state.verified);
      case 'history':
        return this.renderPrescriptionHistory();
      default:
        return '';
    }
  }
  
  renderPendingPrescriptions(prescriptions) {
    if (!prescriptions || prescriptions.length === 0) {
      return `
        <div class="text-center py-8 text-gray-500">
          <i class="fa fa-prescription text-4xl mb-4"></i>
          <div>No pending prescriptions</div>
        </div>
      `;
    }
    
    return `
      <div class="prescriptions-list">
        <div class="grid gap-4">
          ${prescriptions.map(prescription => `
            <div class="card">
              <div class="card-body">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="font-medium">${prescription.customer_name}</h3>
                    <p class="text-sm text-gray-500">${prescription.doctor_name}</p>
                    <p class="text-sm text-gray-500">${prescription.medication}</p>
                    <p class="text-sm text-gray-500">Dosage: ${prescription.dosage}</p>
                  </div>
                  <div class="text-right">
                    <div class="text-sm text-gray-500">${new Date(prescription.date).toLocaleDateString()}</div>
                    ${prescription.is_controlled ? '<span class="badge badge-warning badge-sm">Controlled</span>' : ''}
                  </div>
                </div>
                
                <div class="flex gap-2 mt-4">
                  <button class="btn btn-success btn-sm" 
                          onclick="window.pharmaApp.getModule('prescriptions').verifyPrescription('${prescription._id}')">
                    Verify
                  </button>
                  <button class="btn btn-danger btn-sm" 
                          onclick="window.pharmaApp.getModule('prescriptions').rejectPrescription('${prescription._id}')">
                    Reject
                  </button>
                  <button class="btn btn-info btn-sm" 
                          onclick="window.pharmaApp.getModule('prescriptions').addToCart(${JSON.stringify(prescription).replace(/"/g, '"')})">
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  renderVerifiedPrescriptions(prescriptions) {
    if (!prescriptions || prescriptions.length === 0) {
      return `
        <div class="text-center py-8 text-gray-500">
          <div>No verified prescriptions</div>
        </div>
      `;
    }
    
    return `
      <div class="verified-prescriptions">
        <div class="grid gap-4">
          ${prescriptions.map(prescription => `
            <div class="card">
              <div class="card-body">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="font-medium">${prescription.customer_name}</h3>
                    <p class="text-sm text-gray-500">${prescription.doctor_name}</p>
                    <p class="text-sm text-gray-500">${prescription.medication}</p>
                    <p class="text-sm text-gray-500">Dosage: ${prescription.dosage}</p>
                  </div>
                  <div class="text-right">
                    <div class="text-sm text-gray-500">Verified: ${new Date(prescription.verified_date).toLocaleDateString()}</div>
                    <span class="badge badge-success badge-sm">Verified</span>
                  </div>
                </div>
                
                <button class="btn btn-info btn-sm mt-4" 
                        onclick="window.pharmaApp.getModule('prescriptions').addToCart(${JSON.stringify(prescription).replace(/"/g, '"')})">
                  Add to Cart
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  renderPrescriptionHistory() {
    return `
      <div class="prescription-history">
        <div class="card">
          <div class="card-body">
            <p class="text-gray-500">Prescription history feature coming soon...</p>
          </div>
        </div>
      </div>
    `;
  }
}

// Make PrescriptionsModule available globally
window.PrescriptionsModule = PrescriptionsModule;