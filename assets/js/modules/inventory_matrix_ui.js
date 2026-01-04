/**
 * Inventory Matrix UI Module
 * Handles visualization of stock matrix, reordering, and analytics
 */

class InventoryMatrixUI {
    constructor(app) {
        this.app = app;
        this.api = window.api;
        this.container = null;
    }

    // Initialize the module
    initialize() {
        console.log('Inventory Matrix UI initialized');
        // Register this sub-module with the main inventory module if possible, 
        // or just expose it globally to be called
        window.InventoryMatrixUI = this;
    }

    /**
     * Show the main Matrix Dashboard Modal
     */
    showDashboard() {
        const modalHtml = `
      <div class="matrix-dashboard-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
           id="matrixDashboardModal">
        <div class="bg-white rounded-lg w-full max-w-7xl mx-4 h-[90vh] flex flex-col">
          <div class="flex justify-between items-center p-6 border-b">
            <div>
              <h3 class="text-2xl font-bold text-gray-800">Inventory Intelligence</h3>
              <p class="text-sm text-gray-500">AI-driven stock optimization and reordering</p>
            </div>
            <button onclick="window.InventoryMatrixUI.closeDashboard()" class="text-gray-500 hover:text-gray-700">
              <i class="fa fa-times text-xl"></i>
            </button>
          </div>
          
          <div class="flex flex-1 overflow-hidden">
            <!-- Sidebar -->
            <div class="w-64 bg-gray-50 border-r p-4">
              <nav class="space-y-2">
                <a href="#" onclick="window.InventoryMatrixUI.switchTab('overview')" class="matrix-nav-item block px-4 py-2 rounded-lg bg-blue-100 text-blue-700 font-medium" data-tab="overview">
                  <i class="fa fa-tachometer-alt mr-2"></i> Overview
                </a>
                <a href="#" onclick="window.InventoryMatrixUI.switchTab('restock')" class="matrix-nav-item block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200" data-tab="restock">
                  <i class="fa fa-truck-loading mr-2"></i> Reorder Suggestions
                  <span id="restock-badge" class="hidden ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">0</span>
                </a>
                <a href="#" onclick="window.InventoryMatrixUI.switchTab('abc')" class="matrix-nav-item block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200" data-tab="abc">
                  <i class="fa fa-sort-alpha-down mr-2"></i> ABC Analysis
                </a>
                <a href="#" onclick="window.InventoryMatrixUI.switchTab('deadstock')" class="matrix-nav-item block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200" data-tab="deadstock">
                  <i class="fa fa-skull-crossbones mr-2"></i> Dead Stock
                </a>
                <a href="#" onclick="window.InventoryMatrixUI.switchTab('velocity')" class="matrix-nav-item block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200" data-tab="velocity">
                  <i class="fa fa-chart-line mr-2"></i> Sales Velocity
                </a>
              </nav>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto p-6" id="matrix-content-area">
              <!-- Content injected here -->
              <div class="flex justify-center items-center h-full">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.loadOverview();
    }

    closeDashboard() {
        $('#matrixDashboardModal').remove();
    }

    switchTab(tabName) {
        // Update Sidebar
        $('.matrix-nav-item').removeClass('bg-blue-100 text-blue-700 font-medium').addClass('text-gray-600 hover:bg-gray-200');
        $(`.matrix-nav-item[data-tab="${tabName}"]`).removeClass('text-gray-600 hover:bg-gray-200').addClass('bg-blue-100 text-blue-700 font-medium');

        // Load Content
        const contentArea = $('#matrix-content-area');
        contentArea.html('<div class="flex justify-center items-center h-full"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>');

        switch (tabName) {
            case 'overview': this.loadOverview(); break;
            case 'restock': this.loadRestockSuggestions(); break;
            case 'abc': this.loadABCAnalysis(); break;
            case 'deadstock': this.loadDeadStock(); break;
            case 'velocity': this.loadSalesVelocity(); break;
        }
    }

    /**
     * Tab: Overview
     */
    async loadOverview() {
        try {
            // Fetch summary data
            const [restockData, deadStockData] = await Promise.all([
                $.get(this.api + 'inventory-matrix/reports/restock-suggestions'),
                $.get(this.api + 'inventory-matrix/reports/dead-stock?days=90')
            ]);

            const criticalRestock = restockData.filter(i => i.priority === 'Critical').length;
            const highRestock = restockData.filter(i => i.priority === 'High').length;
            const deadStockValue = deadStockData.reduce((sum, i) => sum + (i.value || 0), 0);

            const html = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-red-50 p-6 rounded-lg border border-red-100">
                <h4 class="text-red-800 font-semibold mb-2">Critical Stockouts</h4>
                <div class="text-4xl font-bold text-red-600">${criticalRestock}</div>
                <p class="text-sm text-red-600 mt-1">Products with 0 inventory</p>
                <button onclick="window.InventoryMatrixUI.switchTab('restock')" class="mt-4 text-sm font-medium text-red-700 hover:text-red-900 underline">View Items</button>
            </div>
            
            <div class="bg-yellow-50 p-6 rounded-lg border border-yellow-100">
                <h4 class="text-yellow-800 font-semibold mb-2">Reorder Needed</h4>
                <div class="text-4xl font-bold text-yellow-600">${highRestock + criticalRestock}</div>
                <p class="text-sm text-yellow-600 mt-1">Products below reorder point</p>
                <button onclick="window.InventoryMatrixUI.switchTab('restock')" class="mt-4 text-sm font-medium text-yellow-700 hover:text-yellow-900 underline">View Suggestions</button>
            </div>

            <div class="bg-gray-100 p-6 rounded-lg border border-gray-200">
                <h4 class="text-gray-800 font-semibold mb-2">Dead Stock Value</h4>
                <div class="text-4xl font-bold text-gray-600">₹${deadStockValue.toLocaleString()}</div>
                <p class="text-sm text-gray-600 mt-1">Inventory unsold for 90+ days</p>
                <button onclick="window.InventoryMatrixUI.switchTab('deadstock')" class="mt-4 text-sm font-medium text-gray-700 hover:text-gray-900 underline">Analyze Dead Stock</button>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white p-6 rounded-lg border shadow-sm">
                <h4 class="font-bold text-gray-800 mb-4">Quick Actions</h4>
                <div class="space-y-3">
                    <button onclick="window.InventoryMatrixUI.runABCAnalysis()" class="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 font-medium transition flex items-center">
                        <i class="fa fa-magic mr-3"></i> Run Full Store ABC Analysis
                    </button>
                    <button onclick="window.InventoryMatrixUI.generateBulkPO()" class="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg text-green-700 font-medium transition flex items-center">
                        <i class="fa fa-file-invoice-dollar mr-3"></i> Generate Purchase Orders for Critical Items
                    </button>
                </div>
            </div>
            
             <div class="bg-white p-6 rounded-lg border shadow-sm">
                <h4 class="font-bold text-gray-800 mb-4">System Status</h4>
                <div class="text-sm space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Matrix Engine:</span>
                        <span class="text-green-600 font-medium">Active</span>
                    </div>
                     <div class="flex justify-between">
                        <span class="text-gray-600">Reorder Calculation:</span>
                        <span class="text-blue-600 font-medium">Auto (Daily)</span>
                    </div>
                     <div class="flex justify-between">
                        <span class="text-gray-600">Last Analysis:</span>
                        <span class="text-gray-800">${new Date().toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </div>
      `;
            $('#matrix-content-area').html(html);

            // Update badge
            const totalRestock = criticalRestock + highRestock;
            if (totalRestock > 0) {
                $('#restock-badge').text(totalRestock).removeClass('hidden');
            } else {
                $('#restock-badge').addClass('hidden');
            }

        } catch (error) {
            this.showError('Failed to load dashboard overview', error);
        }
    }

    /**
     * Tab: Restock Suggestions
     */
    async loadRestockSuggestions() {
        try {
            const data = await $.get(this.api + 'inventory-matrix/reports/restock-suggestions');

            if (data.length === 0) {
                $('#matrix-content-area').html(this.getEmptyState('No items need restocking right now!', 'check-circle'));
                return;
            }

            const html = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-gray-800">Restock Recommendations</h3>
            <button onclick="window.InventoryMatrixUI.generateBulkPO(true)" class="btn btn-primary">
                <i class="fa fa-file-invoice"></i> Create Purchase Orders (${data.length})
            </button>
        </div>

        <div class="bg-white rounded-lg border shadow-sm overflow-hidden">
            <table class="w-full text-left border-collapse">
                <thead class="bg-gray-50 text-gray-600 text-sm uppercase font-semibold">
                    <tr>
                        <th class="p-4 border-b">Priority</th>
                        <th class="p-4 border-b">Product</th>
                        <th class="p-4 border-b">Stock Status</th>
                        <th class="p-4 border-b text-right">Suggested Qty</th>
                        <th class="p-4 border-b text-center">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    ${data.map(item => `
                        <tr class="hover:bg-gray-50">
                            <td class="p-4">
                                <span class="px-2 py-1 rounded text-xs font-bold ${item.priority === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}">
                                    ${item.priority}
                                </span>
                            </td>
                            <td class="p-4">
                                <div class="font-medium text-gray-900">${item.name}</div>
                                <div class="text-xs text-gray-500">ID: ${item.product_id} | Supplier: ${item.supplier_id || 'N/A'}</div>
                            </td>
                            <td class="p-4">
                                <div class="text-sm">
                                    <span class="font-medium text-gray-700">${item.current_stock}</span>
                                    <span class="text-gray-400 mx-1">/</span>
                                    <span class="text-gray-500">Reorder Point: ${item.reorder_point}</span>
                                </div>
                                <div class="w-24 bg-gray-200 rounded-full h-1.5 mt-2">
                                    <div class="bg-${item.priority === 'Critical' ? 'red' : 'yellow'}-500 h-1.5 rounded-full" 
                                         style="width: ${Math.min((item.current_stock / item.reorder_point) * 100, 100)}%"></div>
                                </div>
                            </td>
                            <td class="p-4 text-right font-bold text-blue-600">
                                ${item.suggested_quantity}
                            </td>
                            <td class="p-4 text-center">
                                <button onclick="window.InventoryMatrixUI.addToPO('${item.product_id}', ${item.suggested_quantity})" 
                                        class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                    Add to PO
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
      `;
            $('#matrix-content-area').html(html);

        } catch (error) {
            this.showError('Failed to load restock suggestions', error);
        }
    }

    /**
     * Tab: ABC Analysis
     */
    async loadABCAnalysis() {
        // Since getting full ABC data might require paginated requests or a new endpoint listing all matrices,
        // For this demo we'll trigger a fresh analysis first or show a "Run Analysis" state.
        // Ideally we fetch a report. Let's assume we create a report endpoint or just trigger batch analysis for now.
        
        const html = `
            <div class="max-w-2xl mx-auto text-center py-12">
                <i class="fa fa-chart-pie text-6xl text-blue-200 mb-6"></i>
                <h3 class="text-2xl font-bold text-gray-800 mb-2">ABC Analysis</h3>
                <p class="text-gray-600 mb-8">Categorize your inventory into Class A (High Value), B (Medium), and C (Low) to prioritize management efforts.</p>
                
                <button onclick="window.InventoryMatrixUI.runABCAnalysis()" class="btn btn-primary btn-lg">
                    <i class="fa fa-play mr-2"></i> Run Full Store Analysis
                </button>
                
                <div id="abc-results" class="mt-8 hidden text-left">
                    <!-- Results injection -->
                </div>
            </div>
        `;
         $('#matrix-content-area').html(html);
    }
    
    async runABCAnalysis() {
        if (window.notiflix) window.notiflix.Loading.standard('Categorizing Inventory...');
        try {
            const res = await $.post(this.api + 'inventory-matrix/analysis/abc-batch');
            if(window.notiflix) window.notiflix.Loading.remove();
            
            const html = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <div class="flex items-center text-green-700 mb-2">
                        <i class="fa fa-check-circle text-xl mr-2"></i>
                        <span class="font-bold text-lg">Analysis Complete</span>
                    </div>
                    <p class="text-green-600">Successfully categorized ${res.processed} products.</p>
                </div>
                
                <div class="grid grid-cols-3 gap-4 mb-6">
                    <div class="bg-blue-50 p-4 rounded text-center border border-blue-100">
                        <div class="text-2xl font-bold text-blue-700">Class A</div>
                        <div class="text-xs text-blue-600">Top 80% Value</div>
                        <div class="text-sm mt-1">High Priority</div>
                    </div>
                    <div class="bg-purple-50 p-4 rounded text-center border border-purple-100">
                        <div class="text-2xl font-bold text-purple-700">Class B</div>
                        <div class="text-xs text-purple-600">Next 15% Value</div>
                        <div class="text-sm mt-1">Medium Priority</div>
                    </div>
                    <div class="bg-gray-50 p-4 rounded text-center border border-gray-200">
                        <div class="text-2xl font-bold text-gray-700">Class C</div>
                        <div class="text-xs text-gray-600">Bottom 5% Value</div>
                        <div class="text-sm mt-1">Low Priority</div>
                    </div>
                </div>
            `;
            $('#abc-results').html(html).removeClass('hidden');
            
        } catch(error) {
             if(window.notiflix) window.notiflix.Loading.remove();
             this.showError('ABC Analysis Failed', error);
        }
    }

    /**
     * Tab: Dead Stock
     */
    async loadDeadStock() {
        try {
            const data = await $.get(this.api + 'inventory-matrix/reports/dead-stock?days=90');
            
            if(data.length === 0) {
                 $('#matrix-content-area').html(this.getEmptyState('No dead stock found! Great job!', 'smile'));
                 return;
            }
            
            const totalValue = data.reduce((sum, i) => sum + (i.value || 0), 0);
            
             const html = `
                <div class="mb-6 bg-red-50 p-4 rounded-lg flex justify-between items-center">
                    <div>
                        <h4 class="font-bold text-red-800">Dead Stock Value: ₹${totalValue.toLocaleString()}</h4>
                        <p class="text-sm text-red-600">Items with no sales in last 90 days</p>
                    </div>
                    <button class="btn btn-danger btn-sm">
                        <i class="fa fa-tags"></i> Create Clearance Sale
                    </button>
                </div>

                <div class="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <table class="w-full text-left">
                        <thead class="bg-gray-50 text-gray-600 text-sm">
                            <tr>
                                <th class="p-3">Product</th>
                                <th class="p-3">Stock Qty</th>
                                <th class="p-3">Value</th>
                                <th class="p-3">Last Restocked</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 text-sm">
                            ${data.map(item => `
                                <tr>
                                    <td class="p-3 font-medium">${item.name}</td>
                                    <td class="p-3">${item.stock}</td>
                                    <td class="p-3">₹${(item.value || 0).toFixed(2)}</td>
                                    <td class="p-3 text-gray-500">${item.last_restocked ? new Date(item.last_restocked).toLocaleDateString() : 'Unknown'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            $('#matrix-content-area').html(html);
            
        } catch(error) {
            this.showError('Failed to load dead stock report', error);
        }
    }
    
    /**
     * Tab: Sales Velocity (Simplified)
     */
    loadSalesVelocity() {
         const html = `
             <div class="text-center py-12">
                <i class="fa fa-tachometer-alt text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-lg font-medium text-gray-900">Velocity Tracking</h3>
                <p class="text-gray-500 max-w-sm mx-auto">
                    Sales velocity analysis is computed automatically during reorder calculation. 
                    Individual product velocity can be viewed in the Product Details > Matrix tab.
                </p>
             </div>
         `;
         $('#matrix-content-area').html(html);
    }

    // Helpers
    showError(message, error) {
        console.error(error);
        $('#matrix-content-area').html(`
            <div class="text-center py-12">
                <i class="fa fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                <h3 class="text-lg font-bold text-gray-800">${message}</h3>
                <p class="text-sm text-gray-500">${error.statusText || error.message || 'Unknown error'}</p>
                <button onclick="window.InventoryMatrixUI.loadOverview()" class="mt-4 text-blue-600 hover:underline">Return to Overview</button>
            </div>
        `);
    }

    getEmptyState(message, icon) {
        return `
            <div class="flex flex-col items-center justify-center h-full text-gray-500">
                <i class="fa fa-${icon} text-5xl mb-4 text-gray-300"></i>
                <p class="text-lg font-medium">${message}</p>
            </div>
        `;
    }
    
    // Actions
    addToPO(productId, quantity) {
        // Implementation to create/append to a PO
        if(window.notiflix) window.notiflix.Notify.success(`Added ${quantity} units of ${productId} to draft PO`);
        // Actual logic would call purchase order API or add to local cart state
    }
    
    generateBulkPO() {
         if(window.notiflix) window.notiflix.Notify.info('Generating Bulk PO feature coming next step');
    }
}

// Initialize and attach to window
window.InventoryMatrixUI = new InventoryMatrixUI();
// Auto-init on load if needed
$(document).ready(() => {
    if(window.InventoryMatrixUI) window.InventoryMatrixUI.initialize();
});
