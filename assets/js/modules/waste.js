/**
 * Waste / Spoilage Tracking Module
 */

class WasteModule {
  constructor(app) {
    this.app = app;
    this.container = null;
  }

  initialize() {
    console.log('Waste module initialized');
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Handle waste form submission
    $(document).on('submit', '#logWasteForm', (e) => {
      e.preventDefault();
      this.logWaste();
    });
  }

  onActivate() {
    this.loadInitialData();
  }

  async loadInitialData() {
    await Promise.all([
      this.loadWasteEntries(),
      this.loadAnalytics(),
      this.loadProducts()
    ]);
  }

  async loadWasteEntries() {
    try {
      this.app.state.updateModule('waste', { loading: true });

      const response = await fetch(`${window.api}waste/waste`);
      const wasteEntries = await response.json();

      this.app.state.updateModule('waste', {
        wasteEntries,
        loading: false
      });

    } catch (error) {
      console.error('Error loading waste entries:', error);
      this.app.state.updateModule('waste', { loading: false });
    }
  }

  async loadAnalytics() {
    try {
      const response = await fetch(`${window.api}waste/analytics`);
      const analytics = await response.json();

      this.app.state.updateModule('waste', { analytics });

    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  async loadProducts() {
    try {
      const response = await fetch(`${window.api}inventory/products`);
      const products = await response.json();

      this.app.state.updateModule('waste', { products });
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  async logWaste() {
    const formData = new FormData(document.getElementById('logWasteForm'));
    const data = {
      productId: formData.get('productId'),
      quantity: parseInt(formData.get('quantity')),
      reason: formData.get('reason'),
      notes: formData.get('notes') || ''
    };

    try {
      const response = await fetch(`${window.api}waste/waste`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to log waste');
      }

      const result = await response.json();

      if (window.notiflix) {
        window.notiflix.Notify.success('Waste entry logged successfully!');
      }

      // Reset form and refresh data
      document.getElementById('logWasteForm').reset();
      await this.loadInitialData();

    } catch (error) {
      console.error('Error logging waste:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', error.message, 'Ok');
      }
    }
  }

  render() {
    const wasteState = this.app.state.getModuleState('waste');
    const wasteEntries = wasteState.wasteEntries || [];
    const analytics = wasteState.analytics || {};
    const products = wasteState.products || [];

    return `
      <div class="module-container waste-module" data-module="waste">
        <div class="module-header">
          <h1 class="module-title">Waste / Spoilage Tracking</h1>
          <p class="module-subtitle">Log wasted food items and track spoilage analytics</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          ${this.renderLogWasteForm(products)}
          ${this.renderAnalyticsSummary(analytics)}
        </div>

        ${this.renderWasteEntries(wasteEntries)}
      </div>
    `;
  }

  renderLogWasteForm(products) {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Log Waste Entry</h3>
        </div>
        <div class="card-body">
          <form id="logWasteForm">
            <div class="form-group">
              <label class="form-label">Product *</label>
              <select name="productId" class="form-select" required>
                <option value="">Select a product</option>
                ${products.map(p => `<option value="${p._id}">${p.name}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Quantity *</label>
              <input type="number" name="quantity" class="form-input" min="1" required>
            </div>

            <div class="form-group">
              <label class="form-label">Reason *</label>
              <select name="reason" class="form-select" required>
                <option value="">Select reason</option>
                <option value="burnt">Burnt</option>
                <option value="expired">Expired</option>
                <option value="returned">Returned</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Notes</label>
              <textarea name="notes" class="form-input" rows="3" placeholder="Optional notes..."></textarea>
            </div>

            <button type="submit" class="btn btn-primary w-full">Log Waste</button>
          </form>
        </div>
      </div>
    `;
  }

  renderAnalyticsSummary(analytics) {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Waste Analytics</h3>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-red-600">$${analytics.totalWasteCost?.toFixed(2) || '0.00'}</div>
              <div class="text-sm text-gray-500">Total Waste Cost</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">${analytics.totalWasteQuantity || 0}</div>
              <div class="text-sm text-gray-500">Total Waste Quantity</div>
            </div>
          </div>

          <div class="mt-4">
            <h4 class="font-medium mb-2">Waste by Reason</h4>
            <div class="space-y-2">
              ${Object.entries(analytics.wasteByReason || {}).map(([reason, data]) => `
                <div class="flex justify-between">
                  <span class="capitalize">${reason}</span>
                  <span>$${data.cost?.toFixed(2) || '0.00'} (${data.quantity || 0} items)</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderWasteEntries(entries) {
    if (!entries || entries.length === 0) {
      return `
        <div class="card">
          <div class="card-body text-center py-8 text-gray-500">
            <i class="fa fa-trash text-4xl mb-4"></i>
            <div>No waste entries found</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Waste History</h3>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="p-4 text-left">Product</th>
                  <th class="p-4 text-left">Quantity</th>
                  <th class="p-4 text-left">Reason</th>
                  <th class="p-4 text-left">Cost</th>
                  <th class="p-4 text-left">Date</th>
                  <th class="p-4 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                ${entries.map(entry => `
                  <tr>
                    <td class="p-4 font-medium">${entry.productName}</td>
                    <td class="p-4">${entry.quantity}</td>
                    <td class="p-4 capitalize">${entry.reason}</td>
                    <td class="p-4">$${entry.totalCost?.toFixed(2) || '0.00'}</td>
                    <td class="p-4 text-sm text-gray-500">${new Date(entry.date).toLocaleDateString()}</td>
                    <td class="p-4 text-sm text-gray-500">${entry.notes || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
}

// Make WasteModule available globally
window.WasteModule = WasteModule;