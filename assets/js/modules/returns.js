/**
 * Returns Module - Item Return/Refund functionality
 */

class ReturnsModule {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.selectedTransaction = null;
    this.returnItems = [];
  }
  
  initialize() {
    console.log('Returns module initialized');
    
    // Set up event listeners for return-related actions
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Handle return button clicks in transaction history
    $(document).on('click', '.return-btn', (e) => {
      const transactionId = $(e.target).data('transaction-id');
      this.openReturnModal(transactionId);
    });
    
    // Handle return form submission
    $(document).on('submit', '#returnForm', (e) => {
      e.preventDefault();
      this.processReturn();
    });
    
    // Handle item selection for return
    $(document).on('change', '.return-item-checkbox', (e) => {
      this.updateReturnItems();
    });
    
    // Handle quantity change for return items
    $(document).on('change', '.return-item-quantity', (e) => {
      this.validateReturnQuantities();
    });
  }
  
  onActivate() {
    this.loadReturnHistory();
  }
  
  async loadReturnHistory() {
    try {
      const response = await fetch(`${window.api}transactions/returns`);
      const returns = await response.json();
      
      this.app.state.updateModule('returns', { returnHistory: returns });
      
    } catch (error) {
      console.error('Error loading return history:', error);
    }
  }
  
  async openReturnModal(transactionId) {
    try {
      // Load transaction details
      const response = await fetch(`${window.api}transactions/${transactionId}`);
      const transaction = await response.json();
      
      this.selectedTransaction = transaction;
      this.returnItems = [...transaction.items];
      
      // Show return modal
      this.renderReturnModal();
      
    } catch (error) {
      console.error('Error loading transaction for return:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to load transaction details', 'Ok');
      }
    }
  }
  
  renderReturnModal() {
    const transaction = this.selectedTransaction;
    const modalHtml = `
      <div class="return-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Process Return/Refund</h3>
            <button onclick="this.closest('.return-modal').remove()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>
          
          <div class="transaction-info mb-6 p-4 bg-gray-50 rounded">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <strong>Transaction ID:</strong> ${transaction.order}<br>
                <strong>Date:</strong> ${new Date(transaction.date).toLocaleString()}<br>
                <strong>Customer:</strong> ${transaction.customer?.name || 'Walk-in Customer'}
              </div>
              <div>
                <strong>Original Total:</strong> $${parseFloat(transaction.total).toFixed(2)}<br>
                <strong>Payment Method:</strong> ${transaction.payment_type || 'N/A'}<br>
                <strong>Status:</strong> <span class="badge badge-success">Completed</span>
              </div>
            </div>
          </div>
          
          <form id="returnForm">
            <input type="hidden" name="transactionId" value="${transaction._id}">
            
            <div class="return-items-section mb-6">
              <h4 class="font-semibold mb-3">Select Items to Return</h4>
              <div class="table-responsive">
                <table class="table table-bordered">
                  <thead>
                    <tr>
                      <th>Return</th>
                      <th>Item</th>
                      <th>Original Qty</th>
                      <th>Price</th>
                      <th>Return Qty</th>
                      <th>Subtotal</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${transaction.items.map((item, index) => `
                      <tr>
                        <td class="text-center">
                          <input type="checkbox" class="return-item-checkbox" data-index="${index}" value="1">
                        </td>
                        <td>
                          <div class="font-medium">${item.product_name}</div>
                          <div class="text-sm text-gray-500">${item.sku || 'N/A'}</div>
                        </td>
                        <td>${item.quantity}</td>
                        <td>$${parseFloat(item.price).toFixed(2)}</td>
                        <td style="width: 100px;">
                          <input type="number" class="form-control return-item-quantity" 
                                 data-index="${index}" min="1" max="${item.quantity}" value="1" disabled>
                        </td>
                        <td class="return-subtotal">$0.00</td>
                        <td style="width: 200px;">
                          <select class="form-control return-reason" data-index="${index}" disabled>
                            <option value="">Select reason...</option>
                            <option value="customer_complaint">Customer Complaint</option>
                            <option value="wrong_item">Wrong Item</option>
                            <option value="quality_issue">Quality Issue</option>
                            <option value="damaged_packaging">Damaged Packaging</option>
                            <option value="expired_item">Expired Item</option>
                            <option value="order_error">Order Error</option>
                            <option value="customer_request">Customer Request</option>
                            <option value="other">Other</option>
                          </select>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="return-summary mb-6">
              <div class="grid grid-cols-2 gap-6">
                <div>
                  <h4 class="font-semibold mb-3">Return Details</h4>
                  <div class="form-group">
                    <label for="returnReasonGeneral">General Return Reason</label>
                    <select name="reason" id="returnReasonGeneral" class="form-control" required>
                      <option value="">Select reason...</option>
                      <option value="customer_complaint">Customer Complaint</option>
                      <option value="wrong_item">Wrong Item</option>
                      <option value="quality_issue">Quality Issue</option>
                      <option value="damaged_packaging">Damaged Packaging</option>
                      <option value="expired_item">Expired Item</option>
                      <option value="order_error">Order Error</option>
                      <option value="customer_request">Customer Request</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div class="form-group">
                    <label for="refundMethod">Refund Method</label>
                    <select name="refundMethod" id="refundMethod" class="form-control" required>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Original_Payment">Original Payment Method</option>
                    </select>
                  </div>
                  
                  <div class="form-group">
                    <label for="returnNotes">Additional Notes</label>
                    <textarea name="notes" id="returnNotes" class="form-control" rows="3" 
                              placeholder="Any additional notes about the return..."></textarea>
                  </div>
                </div>
                
                <div>
                  <h4 class="font-semibold mb-3">Refund Summary</h4>
                  <div class="bg-gray-50 p-4 rounded">
                    <div class="flex justify-between mb-2">
                      <span>Items to Return:</span>
                      <span id="returnItemCount">0</span>
                    </div>
                    <div class="flex justify-between mb-2">
                      <span>Total Refund Amount:</span>
                      <span id="totalRefundAmount" class="font-semibold">$0.00</span>
                    </div>
                    <hr class="my-2">
                    <div class="flex justify-between text-lg font-bold">
                      <span>Refund Total:</span>
                      <span id="finalRefundAmount">$0.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="flex gap-3">
              <button type="button" class="btn btn-secondary flex-1" onclick="this.closest('.return-modal').remove()">
                Cancel
              </button>
              <button type="submit" class="btn btn-danger flex-1" id="processReturnBtn" disabled>
                <i class="fa fa-undo"></i> Process Return
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Set up modal event handlers
    this.setupReturnModalEvents();
  }
  
  setupReturnModalEvents() {
    // Handle checkbox changes
    $('.return-item-checkbox').change((e) => {
      const index = $(e.target).data('index');
      const quantityInput = $(`.return-item-quantity[data-index="${index}"]`);
      const reasonSelect = $(`.return-reason[data-index="${index}"]`);
      
      if ($(e.target).is(':checked')) {
        quantityInput.prop('disabled', false);
        reasonSelect.prop('disabled', false);
      } else {
        quantityInput.prop('disabled', true).val(1);
        reasonSelect.prop('disabled', true).val('');
      }
      
      this.updateReturnSummary();
    });
    
    // Handle quantity changes
    $('.return-item-quantity').change((e) => {
      this.updateReturnSummary();
    });
    
    // Handle reason selection
    $('.return-reason').change((e) => {
      this.validateReturnForm();
    });
    
    // Handle general reason change
    $('#returnReasonGeneral').change(() => {
      this.validateReturnForm();
    });
    
    // Handle refund method change
    $('#refundMethod').change(() => {
      this.validateReturnForm();
    });
  }
  
  updateReturnItems() {
    const checkedItems = $('.return-item-checkbox:checked');
    this.returnItems = [];
    
    checkedItems.each((index, checkbox) => {
      const itemIndex = $(checkbox).data('index');
      const quantity = parseInt($(`.return-item-quantity[data-index="${itemIndex}"]`).val()) || 1;
      const reason = $(`.return-reason[data-index="${itemIndex}"]`).val();
      
      if (this.selectedTransaction.items[itemIndex]) {
        this.returnItems.push({
          ...this.selectedTransaction.items[itemIndex],
          returnQuantity: quantity,
          reason: reason
        });
      }
    });
    
    this.updateReturnSummary();
  }
  
  updateReturnSummary() {
    let totalRefund = 0;
    let itemCount = 0;
    
    $('.return-item-checkbox:checked').each((index, checkbox) => {
      const itemIndex = $(checkbox).data('index');
      const quantity = parseInt($(`.return-item-quantity[data-index="${itemIndex}"]`).val()) || 1;
      const item = this.selectedTransaction.items[itemIndex];
      const subtotal = parseFloat(item.price) * quantity;
      
      // Update row subtotal
      $(`.return-subtotal[data-index="${itemIndex}"]`).text(`$${subtotal.toFixed(2)}`);
      
      totalRefund += subtotal;
      itemCount++;
    });
    
    // Update summary
    $('#returnItemCount').text(itemCount);
    $('#totalRefundAmount').text(`$${totalRefund.toFixed(2)}`);
    $('#finalRefundAmount').text(`$${totalRefund.toFixed(2)}`);
    
    this.validateReturnForm();
  }
  
  validateReturnForm() {
    const hasItems = $('.return-item-checkbox:checked').length > 0;
    const hasGeneralReason = $('#returnReasonGeneral').val() !== '';
    const hasRefundMethod = $('#refundMethod').val() !== '';
    
    const isValid = hasItems && hasGeneralReason && hasRefundMethod;
    
    $('#processReturnBtn').prop('disabled', !isValid);
    
    return isValid;
  }
  
  validateReturnQuantities() {
    $('.return-item-quantity').each((index, input) => {
      const maxQuantity = parseInt($(input).attr('max'));
      const currentValue = parseInt($(input).val()) || 1;
      
      if (currentValue > maxQuantity) {
        $(input).val(maxQuantity);
      } else if (currentValue < 1) {
        $(input).val(1);
      }
    });
  }
  
  async processReturn() {
    if (!this.validateReturnForm()) {
      if (window.notiflix) {
        window.notiflix.Report.warning('Invalid Form', 'Please fill in all required fields', 'Ok');
      }
      return;
    }
    
    const formData = new FormData($('#returnForm')[0]);
    const returnData = {
      transactionId: parseInt(formData.get('transactionId')),
      reason: formData.get('reason'),
      refundMethod: formData.get('refundMethod'),
      notes: formData.get('notes'),
      items: []
    };
    
    // Collect return items
    $('.return-item-checkbox:checked').each((index, checkbox) => {
      const itemIndex = $(checkbox).data('index');
      const quantity = parseInt($(`.return-item-quantity[data-index="${itemIndex}"]`).val()) || 1;
      const reason = $(`.return-reason[data-index="${itemIndex}"]`).val();
      
      returnData.items.push({
        id: this.selectedTransaction.items[itemIndex].id,
        quantity: quantity,
        reason: reason
      });
    });
    
    try {
      if (window.notiflix) {
        window.notiflix.Block.standard('.return-modal', 'Processing return...');
      }
      
      const response = await fetch(`${window.api}transactions/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(returnData)
      });
      
      const result = await response.json();
      
      if (window.notiflix) {
        window.notiflix.Block.remove('.return-modal');
      }
      
      if (!response.ok) {
        throw new Error(result.message || 'Return processing failed');
      }
      
      // Show success message
      if (window.notiflix) {
        window.notiflix.Report.success(
          'Return Processed', 
          `Return processed successfully. Refund amount: $${result.refundAmount.toFixed(2)}`, 
          'Ok'
        );
      }
      
      // Close modal
      $('.return-modal').remove();
      
      // Refresh the page or update transaction history
      if (typeof window.refreshTransactionHistory === 'function') {
        window.refreshTransactionHistory();
      }
      
      // Optionally open return receipt
      this.openReturnReceipt(result.returnTransaction._id);
      
    } catch (error) {
      console.error('Return processing error:', error);
      
      if (window.notiflix) {
        window.notiflix.Block.remove('.return-modal');
        window.notiflix.Report.failure('Return Failed', error.message, 'Ok');
      }
    }
  }
  
  async openReturnReceipt(returnTransactionId) {
    try {
      const response = await fetch(`${window.api}transactions/return-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ returnTransactionId })
      });
      
      const receipt = await response.json();
      
      if (response.ok) {
        this.displayReturnReceipt(receipt);
      }
      
    } catch (error) {
      console.error('Error loading return receipt:', error);
    }
  }
  
  displayReturnReceipt(receipt) {
    const receiptHtml = `
      <div class="receipt-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div class="text-center mb-4">
            <h3 class="text-lg font-semibold">Return Receipt</h3>
            <p class="text-sm text-gray-600">${receipt.receiptNumber}</p>
          </div>
          
          <div class="receipt-content border-t border-b py-4 mb-4">
            <div class="text-center mb-2">
              <strong>${receipt.storeInfo.name}</strong><br>
              <small>${receipt.storeInfo.address}</small><br>
              <small>Phone: ${receipt.storeInfo.phone}</small>
            </div>
            
            <hr>
            
            <div class="mb-2">
              <strong>Return Transaction:</strong> ${receipt.returnTransaction.ref_number}<br>
              <strong>Original Transaction:</strong> ${receipt.originalTransaction.order}<br>
              <strong>Date:</strong> ${new Date(receipt.generatedDate).toLocaleString()}<br>
              <strong>Customer:</strong> ${receipt.originalTransaction.customer?.name || 'Walk-in'}
            </div>
            
            <hr>
            
            <div class="mb-2">
              <strong>Returned Items:</strong>
            </div>
            
            ${receipt.returnTransaction.items.map(item => `
              <div class="flex justify-between mb-1">
                <span>${item.product_name} (x${Math.abs(item.quantity)})</span>
                <span>$${(parseFloat(item.price) * Math.abs(item.quantity)).toFixed(2)}</span>
              </div>
            `).join('')}
            
            <hr>
            
            <div class="flex justify-between font-bold">
              <span>Total Refund:</span>
              <span>$${receipt.refundAmount.toFixed(2)}</span>
            </div>
            
            <div class="mt-2">
              <small><strong>Refund Method:</strong> ${receipt.refundMethod}</small><br>
              <small><strong>Reason:</strong> ${receipt.returnReason}</small>
            </div>
            
            ${receipt.returnNotes ? `<div class="mt-2"><small><strong>Notes:</strong> ${receipt.returnNotes}</small></div>` : ''}
          </div>
          
          <div class="text-center text-sm text-gray-600 mb-4">
            Thank you for your business!
          </div>
          
          <div class="flex gap-2">
            <button class="btn btn-secondary flex-1" onclick="window.print()">
              <i class="fa fa-print"></i> Print
            </button>
            <button class="btn btn-primary flex-1" onclick="this.closest('.receipt-modal').remove()">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', receiptHtml);
  }
  
  render() {
    const returnsState = this.app.state.getModuleState('returns') || {};
    const returnHistory = returnsState.returnHistory || [];
    
    return `
      <div class="module-container returns-module" data-module="returns">
        <div class="module-header">
          <h1 class="module-title">Returns & Refunds</h1>
          <p class="module-subtitle">Process item returns and manage refunds</p>
        </div>
        
        <div class="returns-actions mb-6">
          <div class="card">
            <div class="card-body">
              <h4>Quick Actions</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <button class="btn btn-primary" onclick="window.pharmaApp.getModule('returns').showReturnFromTransaction()">
                  <i class="fa fa-undo"></i> Return from Transaction
                </button>
                <button class="btn btn-info" onclick="window.pharmaApp.getModule('returns').viewReturnHistory()">
                  <i class="fa fa-history"></i> View Return History
                </button>
                <button class="btn btn-success" onclick="window.pharmaApp.getModule('returns').exportReturnReport()">
                  <i class="fa fa-download"></i> Export Return Report
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="return-summary mb-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="card">
              <div class="card-body text-center">
                <h3 class="text-2xl font-bold text-danger">${returnHistory.length}</h3>
                <p class="text-gray-600">Total Returns</p>
              </div>
            </div>
            <div class="card">
              <div class="card-body text-center">
                <h3 class="text-2xl font-bold text-warning">$${returnHistory.reduce((sum, r) => sum + Math.abs(parseFloat(r.total || 0)), 0).toFixed(2)}</h3>
                <p class="text-gray-600">Total Refunded</p>
              </div>
            </div>
            <div class="card">
              <div class="card-body text-center">
                <h3 class="text-2xl font-bold text-info">${this.getMostCommonReturnReason(returnHistory)}</h3>
                <p class="text-gray-600">Top Reason</p>
              </div>
            </div>
            <div class="card">
              <div class="card-body text-center">
                <h3 class="text-2xl font-bold text-success">${this.getReturnRate(returnHistory)}%</h3>
                <p class="text-gray-600">Return Rate</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="return-history">
          <div class="card">
            <div class="card-header">
              <h4 class="card-title">Recent Returns</h4>
            </div>
            <div class="card-body">
              ${returnHistory.length === 0 ? 
                '<div class="text-center text-gray-500 py-8">No returns processed yet</div>' :
                `<div class="table-responsive">
                  <table class="table table-striped">
                    <thead>
                      <tr>
                        <th>Return ID</th>
                        <th>Original Transaction</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Amount</th>
                        <th>Reason</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${returnHistory.slice(0, 10).map(returnTx => `
                        <tr>
                          <td>${returnTx.ref_number}</td>
                          <td>${returnTx.originalTransactionId}</td>
                          <td>${new Date(returnTx.date).toLocaleDateString()}</td>
                          <td>${returnTx.customer?.name || 'Walk-in'}</td>
                          <td>${returnTx.items.length}</td>
                          <td>$${Math.abs(parseFloat(returnTx.total)).toFixed(2)}</td>
                          <td>${this.formatReturnReason(returnTx.return_reason)}</td>
                          <td>
                            <button class="btn btn-sm btn-info" onclick="window.pharmaApp.getModule('returns').viewReturnDetails('${returnTx._id}')">
                              <i class="fa fa-eye"></i>
                            </button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  getMostCommonReturnReason(returns) {
    if (returns.length === 0) return 'N/A';
    
    const reasons = {};
    returns.forEach(r => {
      const reason = r.return_reason || 'unknown';
      reasons[reason] = (reasons[reason] || 0) + 1;
    });
    
    const mostCommon = Object.keys(reasons).reduce((a, b) => reasons[a] > reasons[b] ? a : b);
    return this.formatReturnReason(mostCommon);
  }
  
  getReturnRate(returns) {
    // This would need total transaction count for accurate calculation
    // For now, return a placeholder
    return returns.length > 0 ? '2.5' : '0.0';
  }
  
  formatReturnReason(reason) {
    const reasonMap = {
      'customer_complaint': 'Customer Complaint',
      'wrong_item': 'Wrong Item',
      'quality_issue': 'Quality Issue',
      'damaged_packaging': 'Damaged Packaging',
      'expired_item': 'Expired Item',
      'order_error': 'Order Error',
      'customer_request': 'Customer Request',
      'other': 'Other'
    };
    
    return reasonMap[reason] || reason || 'N/A';
  }
  
  showReturnFromTransaction() {
    // This would open a modal to search and select a transaction for return
    if (window.notiflix) {
      window.notiflix.Notify.info('Feature coming soon: Select transaction for return');
    }
  }
  
  viewReturnHistory() {
    // Navigate to transaction history with returns filter
    if (typeof window.showTransactionsView === 'function') {
      window.showTransactionsView();
      // Filter to show returns
    }
  }
  
  async exportReturnReport() {
    try {
      const response = await fetch(`${window.api}transactions/returns?format=csv`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `return_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting return report:', error);
      if (window.notiflix) {
        window.notiflix.Report.failure('Export Failed', 'Failed to export return report', 'Ok');
      }
    }
  }
  
  async viewReturnDetails(returnId) {
    try {
      const response = await fetch(`${window.api}transactions/returns/${returnId}`);
      const returnData = await response.json();
      
      // Display return details in a modal
      this.displayReturnDetailsModal(returnData);
      
    } catch (error) {
      console.error('Error loading return details:', error);
    }
  }
  
  displayReturnDetailsModal(returnData) {
    const returnTx = returnData.returnTransaction;
    const originalTx = returnData.originalTransaction;
    
    const modalHtml = `
      <div class="return-details-modal modal fade" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h4 class="modal-title">Return Details - ${returnTx.ref_number}</h4>
              <button type="button" class="close" data-dismiss="modal">
                <span>&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-md-6">
                  <h5>Return Information</h5>
                  <table class="table table-sm">
                    <tr><td><strong>Return ID:</strong></td><td>${returnTx.ref_number}</td></tr>
                    <tr><td><strong>Date:</strong></td><td>${new Date(returnTx.date).toLocaleString()}</td></tr>
                    <tr><td><strong>Reason:</strong></td><td>${this.formatReturnReason(returnTx.return_reason)}</td></tr>
                    <tr><td><strong>Refund Method:</strong></td><td>${returnTx.refund_method}</td></tr>
                    <tr><td><strong>Amount:</strong></td><td>$${Math.abs(parseFloat(returnTx.total)).toFixed(2)}</td></tr>
                  </table>
                </div>
                <div class="col-md-6">
                  <h5>Original Transaction</h5>
                  <table class="table table-sm">
                    <tr><td><strong>Transaction ID:</strong></td><td>${originalTx.order}</td></tr>
                    <tr><td><strong>Date:</strong></td><td>${new Date(originalTx.date).toLocaleString()}</td></tr>
                    <tr><td><strong>Customer:</strong></td><td>${originalTx.customer?.name || 'Walk-in'}</td></tr>
                    <tr><td><strong>Original Total:</strong></td><td>$${parseFloat(originalTx.total).toFixed(2)}</td></tr>
                  </table>
                </div>
              </div>
              
              <h5 class="mt-4">Returned Items</h5>
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Original Qty</th>
                    <th>Returned Qty</th>
                    <th>Price</th>
                    <th>Refund Amount</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  ${returnTx.items.map(item => `
                    <tr>
                      <td>${item.product_name}</td>
                      <td>${originalTx.items.find(i => i.id === item.id)?.quantity || 'N/A'}</td>
                      <td>${Math.abs(item.quantity)}</td>
                      <td>$${parseFloat(item.price).toFixed(2)}</td>
                      <td>$${(parseFloat(item.price) * Math.abs(item.quantity)).toFixed(2)}</td>
                      <td>${this.formatReturnReason(item.returnReason)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              ${returnTx.return_notes ? `
                <div class="mt-4">
                  <h5>Notes</h5>
                  <div class="alert alert-info">${returnTx.return_notes}</div>
                </div>
              ` : ''}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
              <button type="button" class="btn btn-primary" onclick="window.pharmaApp.getModule('returns').printReturnReceipt('${returnTx._id}')">
                <i class="fa fa-print"></i> Print Receipt
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remove existing modal if any
    $('.return-details-modal').remove();
    
    // Add new modal
    $('body').append(modalHtml);
    
    // Show modal
    $('.return-details-modal').modal('show');
  }
  
  async printReturnReceipt(returnId) {
    try {
      const response = await fetch(`${window.api}transactions/return-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ returnTransactionId: returnId })
      });
      
      const receipt = await response.json();
      
      if (response.ok) {
        // Open print window with receipt content
        const printWindow = window.open('', '_blank');
        printWindow.document.write(this.generatePrintableReceipt(receipt));
        printWindow.document.close();
        printWindow.print();
      }
      
    } catch (error) {
      console.error('Error printing return receipt:', error);
    }
  }
  
  generatePrintableReceipt(receipt) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Return Receipt - ${receipt.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; }
          .text-center { text-align: center; }
          .border-t { border-top: 1px solid #000; }
          .border-b { border-bottom: 1px solid #000; }
          .mb-2 { margin-bottom: 8px; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .font-bold { font-weight: bold; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="text-center mb-2">
          <h3>${receipt.storeInfo.name}</h3>
          <div>${receipt.storeInfo.address}</div>
          <div>Phone: ${receipt.storeInfo.phone}</div>
        </div>
        
        <div class="text-center mb-2 border-t border-b">
          <h4>RETURN RECEIPT</h4>
          <div>${receipt.receiptNumber}</div>
        </div>
        
        <div class="mb-2">
          <div><strong>Return Transaction:</strong> ${receipt.returnTransaction.ref_number}</div>
          <div><strong>Original Transaction:</strong> ${receipt.originalTransaction.order}</div>
          <div><strong>Date:</strong> ${new Date(receipt.generatedDate).toLocaleString()}</div>
          <div><strong>Customer:</strong> ${receipt.originalTransaction.customer?.name || 'Walk-in'}</div>
        </div>
        
        <div class="border-t border-b mb-2">
          <strong>Returned Items:</strong>
        </div>
        
        ${receipt.returnTransaction.items.map(item => `
          <div class="flex justify-between mb-1">
            <span>${item.product_name} (x${Math.abs(item.quantity)})</span>
            <span>$${(parseFloat(item.price) * Math.abs(item.quantity)).toFixed(2)}</span>
          </div>
        `).join('')}
        
        <div class="border-t border-b mb-2">
          <div class="flex justify-between font-bold">
            <span>Total Refund:</span>
            <span>$${receipt.refundAmount.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="mb-2">
          <div><strong>Refund Method:</strong> ${receipt.refundMethod}</div>
          <div><strong>Reason:</strong> ${receipt.returnReason}</div>
        </div>
        
        ${receipt.returnNotes ? `<div class="mb-2"><strong>Notes:</strong> ${receipt.returnNotes}</div>` : ''}
        
        <div class="text-center mt-4">
          <div>Thank you for your business!</div>
        </div>
      </body>
      </html>
    `;
  }
}

// Make ReturnsModule available globally
window.ReturnsModule = ReturnsModule;