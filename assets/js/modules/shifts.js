/**
 * Shifts Module - Shift Management functionality
 */

class ShiftsModule {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.currentShift = null;
    this.shifts = [];
    this.selectedShift = null;
  }

  initialize() {
    console.log('Shifts module initialized');
  }

  onActivate() {
    this.loadCurrentShift();
    this.loadShifts();
  }

  async loadCurrentShift() {
    try {
      const response = await fetch(`${window.api}shifts/current?user_id=${window.user?._id || 0}&till_id=${window.user?.till || 0}`);
      if (response.ok) {
        this.currentShift = await response.json();
        this.app.state.updateModule('shifts', { currentShift: this.currentShift });
      } else {
        this.currentShift = null;
        this.app.state.updateModule('shifts', { currentShift: null });
      }
    } catch (error) {
      console.error('Error loading current shift:', error);
      this.currentShift = null;
    }
  }

  async loadShifts() {
    try {
      const response = await fetch(`${window.api}shifts/all`);
      this.shifts = await response.json();
      this.app.state.updateModule('shifts', { shifts: this.shifts });
    } catch (error) {
      console.error('Error loading shifts:', error);
      this.shifts = [];
    }
  }

  async startShift(openingBalance, notes = '') {
    try {
      if (window.notiflix) window.notiflix.Block.standard('.shifts-container', 'Starting shift...');

      const response = await fetch(`${window.api}shifts/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: window.user?._id || 0,
          till_id: window.user?.till || 0,
          opening_balance: parseFloat(openingBalance),
          notes: notes
        })
      });

      if (!response.ok) throw new Error('Failed to start shift');

      const newShift = await response.json();
      this.currentShift = newShift;
      this.app.state.updateModule('shifts', {
        currentShift: this.currentShift,
        shifts: [newShift, ...this.shifts]
      });

      if (window.notiflix) {
        window.notiflix.Block.remove('.shifts-container');
        window.notiflix.Report.success('Shift Started', 'Your shift has been started successfully!', 'Ok');
      }

      return newShift;
    } catch (error) {
      console.error('Error starting shift:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('.shifts-container');
        window.notiflix.Report.failure('Failed to Start Shift', error.message || 'An error occurred', 'Ok');
      }
      throw error;
    }
  }

  async endShift(closingBalance, notes = '') {
    try {
      if (!this.currentShift) {
        throw new Error('No active shift to end');
      }

      if (window.notiflix) window.notiflix.Block.standard('.shifts-container', 'Ending shift...');

      const response = await fetch(`${window.api}shifts/end`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: this.currentShift.shift_id,
          closing_balance: parseFloat(closingBalance),
          notes: notes
        })
      });

      if (!response.ok) throw new Error('Failed to end shift');

      const endedShift = await response.json();
      this.currentShift = null;
      this.app.state.updateModule('shifts', {
        currentShift: null,
        shifts: this.shifts.map(s => s.shift_id === endedShift.shift_id ? endedShift : s)
      });

      if (window.notiflix) {
        window.notiflix.Block.remove('.shifts-container');
        window.notiflix.Report.success('Shift Ended', 'Your shift has been ended successfully!', 'Ok');
      }

      return endedShift;
    } catch (error) {
      console.error('Error ending shift:', error);
      if (window.notiflix) {
        window.notiflix.Block.remove('.shifts-container');
        window.notiflix.Report.failure('Failed to End Shift', error.message || 'An error occurred', 'Ok');
      }
      throw error;
    }
  }

  async loadShiftReport(shiftId) {
    try {
      const response = await fetch(`${window.api}shifts/report/${shiftId}`);
      if (!response.ok) throw new Error('Failed to load shift report');

      const report = await response.json();
      this.selectedShift = report;
      this.app.state.updateModule('shifts', { selectedShift: report });
      return report;
    } catch (error) {
      console.error('Error loading shift report:', error);
      throw error;
    }
  }

  render() {
    const shiftsState = this.app.state.getModuleState('shifts');
    const currentShift = shiftsState.currentShift;
    const shifts = shiftsState.shifts || [];

    return `
      <div class="shifts-container module-container" data-module="shifts">
        <div class="module-header">
          <h1 class="module-title">Shift Management</h1>
          <p class="module-subtitle">Manage cash counters and track shift performance</p>
        </div>

        <div class="shifts-content">
          ${this.renderCurrentShiftStatus(currentShift)}
          ${this.renderShiftActions(currentShift)}
          ${this.renderShiftsList(shifts)}
          ${this.renderShiftReportModal()}
        </div>
      </div>
    `;
  }

  renderCurrentShiftStatus(currentShift) {
    if (!currentShift) {
      return `
        <div class="current-shift-status mb-6">
          <div class="card">
            <div class="card-body">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-gray-600">No Active Shift</h3>
                  <p class="text-sm text-gray-500">You need to start a shift to process transactions</p>
                </div>
                <div class="text-right">
                  <div class="text-sm text-gray-500">Status</div>
                  <span class="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">Inactive</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    const startTime = new Date(currentShift.start_time).toLocaleString();
    const duration = this.calculateShiftDuration(currentShift.start_time);

    return `
      <div class="current-shift-status mb-6">
        <div class="card border-green-200 bg-green-50">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-green-800">Active Shift</h3>
                <p class="text-sm text-green-600">Started: ${startTime}</p>
                <p class="text-sm text-green-600">Duration: ${duration}</p>
              </div>
              <div class="text-right">
                <div class="text-sm text-green-600">Shift ID</div>
                <div class="font-mono text-green-800">${currentShift.shift_id}</div>
                <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium mt-2 inline-block">Active</span>
              </div>
            </div>

            <div class="grid grid-cols-4 gap-4 mt-4">
              <div class="text-center">
                <div class="text-sm text-gray-500">Opening Balance</div>
                <div class="text-lg font-semibold text-green-600">$${parseFloat(currentShift.opening_balance || 0).toFixed(2)}</div>
              </div>
              <div class="text-center">
                <div class="text-sm text-gray-500">Expected Cash</div>
                <div class="text-lg font-semibold text-blue-600">$${parseFloat(currentShift.expected_cash || 0).toFixed(2)}</div>
              </div>
              <div class="text-center">
                <div class="text-sm text-gray-500">Transactions</div>
                <div class="text-lg font-semibold text-purple-600">${currentShift.transactions_count || 0}</div>
              </div>
              <div class="text-center">
                <div class="text-sm text-gray-500">Cash Sales</div>
                <div class="text-lg font-semibold text-orange-600">$${parseFloat(currentShift.cash_sales || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderShiftActions(currentShift) {
    if (currentShift) {
      return `
        <div class="shift-actions mb-6">
          <div class="card">
            <div class="card-body">
              <h4 class="card-title">Shift Actions</h4>
              <div class="flex gap-3">
                <button class="btn btn-primary" onclick="window.pharmaApp.getModule('shifts').showEndShiftModal()">
                  <i class="fa fa-stop"></i> End Shift
                </button>
                <button class="btn btn-info" onclick="window.pharmaApp.getModule('shifts').showShiftReport('${currentShift.shift_id}')">
                  <i class="fa fa-chart-line"></i> View Report
                </button>
                <button class="btn btn-secondary" onclick="window.pharmaApp.getModule('shifts').refreshCurrentShift()">
                  <i class="fa fa-refresh"></i> Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="shift-actions mb-6">
          <div class="card">
            <div class="card-body">
              <h4 class="card-title">Start New Shift</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="form-label">Opening Balance</label>
                  <input type="number" step="0.01" class="form-input" id="openingBalance" placeholder="0.00" required>
                </div>
                <div>
                  <label class="form-label">Notes (Optional)</label>
                  <input type="text" class="form-input" id="shiftNotes" placeholder="Any notes for this shift">
                </div>
                <div class="flex items-end">
                  <button class="btn btn-success w-full" onclick="window.pharmaApp.getModule('shifts').handleStartShift()">
                    <i class="fa fa-play"></i> Start Shift
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  renderShiftsList(shifts) {
    const recentShifts = shifts.slice(0, 10); // Show last 10 shifts

    return `
      <div class="shifts-list">
        <div class="card">
          <div class="card-header">
            <h4 class="card-title">Recent Shifts</h4>
          </div>
          <div class="card-body">
            ${recentShifts.length === 0 ? `
              <div class="text-center text-gray-500 py-8">
                <i class="fa fa-clock-o text-3xl mb-2"></i>
                <p>No shifts found</p>
              </div>
            ` : `
              <div class="overflow-x-auto">
                <table class="table table-striped">
                  <thead>
                    <tr>
                      <th>Shift ID</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Status</th>
                      <th>Opening</th>
                      <th>Expected</th>
                      <th>Difference</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recentShifts.map(shift => this.renderShiftRow(shift)).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  renderShiftRow(shift) {
    const startTime = new Date(shift.start_time).toLocaleString();
    const endTime = shift.end_time ? new Date(shift.end_time).toLocaleString() : '-';
    const status = shift.status === 'open' ?
      '<span class="label label-success">Open</span>' :
      '<span class="label label-default">Closed</span>';

    const openingBalance = parseFloat(shift.opening_balance || 0).toFixed(2);
    const expectedCash = parseFloat(shift.expected_cash || 0).toFixed(2);
    const closingBalance = parseFloat(shift.closing_balance || 0).toFixed(2);
    const difference = shift.status === 'closed' ?
      (parseFloat(closingBalance) - parseFloat(expectedCash)).toFixed(2) : '-';

    return `
      <tr>
        <td class="font-mono text-sm">${shift.shift_id}</td>
        <td>${startTime}</td>
        <td>${endTime}</td>
        <td>${status}</td>
        <td>$${openingBalance}</td>
        <td>$${expectedCash}</td>
        <td class="${difference !== '-' && parseFloat(difference) !== 0 ? (parseFloat(difference) > 0 ? 'text-green-600' : 'text-red-600') : ''}">
          ${difference !== '-' ? '$' + difference : '-'}
        </td>
        <td>
          <button class="btn btn-sm btn-info" onclick="window.pharmaApp.getModule('shifts').showShiftReport('${shift.shift_id}')">
            <i class="fa fa-eye"></i> Report
          </button>
        </td>
      </tr>
    `;
  }

  renderShiftReportModal() {
    const selectedShift = this.app.state.getModuleState('shifts').selectedShift;

    if (!selectedShift) return '';

    const shift = selectedShift.shift;
    const transactions = selectedShift.transactions || [];
    const summary = selectedShift.summary || {};

    return `
      <div class="shift-report-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style="display: block;">
        <div class="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-semibold">Shift Report - ${shift.shift_id}</h3>
              <button onclick="window.pharmaApp.getModule('shifts').closeShiftReport()" class="text-gray-500">
                <i class="fa fa-times"></i>
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div class="card">
                <div class="card-header">
                  <h4 class="card-title">Shift Summary</h4>
                </div>
                <div class="card-body">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <div class="text-sm text-gray-500">Start Time</div>
                      <div>${new Date(shift.start_time).toLocaleString()}</div>
                    </div>
                    <div>
                      <div class="text-sm text-gray-500">End Time</div>
                      <div>${shift.end_time ? new Date(shift.end_time).toLocaleString() : 'Ongoing'}</div>
                    </div>
                    <div>
                      <div class="text-sm text-gray-500">Opening Balance</div>
                      <div class="font-semibold">$${parseFloat(shift.opening_balance || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div class="text-sm text-gray-500">Closing Balance</div>
                      <div class="font-semibold">$${parseFloat(shift.closing_balance || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div class="text-sm text-gray-500">Expected Cash</div>
                      <div class="font-semibold">$${parseFloat(shift.expected_cash || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div class="text-sm text-gray-500">Cash Difference</div>
                      <div class="font-semibold ${parseFloat(shift.cash_difference || 0) >= 0 ? 'text-green-600' : 'text-red-600'}">
                        $${parseFloat(shift.cash_difference || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="card">
                <div class="card-header">
                  <h4 class="card-title">Transaction Summary</h4>
                </div>
                <div class="card-body">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <div class="text-sm text-gray-500">Total Transactions</div>
                      <div class="text-2xl font-bold text-blue-600">${summary.total_transactions || 0}</div>
                    </div>
                    <div>
                      <div class="text-sm text-gray-500">Total Sales</div>
                      <div class="text-2xl font-bold text-green-600">$${parseFloat(summary.total_sales || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div class="text-sm text-gray-500">Cash Transactions</div>
                      <div class="font-semibold">${summary.cash_transactions || 0}</div>
                    </div>
                    <div>
                      <div class="text-sm text-gray-500">Card Transactions</div>
                      <div class="font-semibold">${summary.card_transactions || 0}</div>
                    </div>
                    <div>
                      <div class="text-sm text-gray-500">Cash Amount</div>
                      <div class="font-semibold text-orange-600">$${parseFloat(summary.cash_amount || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div class="text-sm text-gray-500">Card Amount</div>
                      <div class="font-semibold text-purple-600">$${parseFloat(summary.card_amount || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <h4 class="card-title">Transactions (${transactions.length})</h4>
              </div>
              <div class="card-body">
                ${transactions.length === 0 ? `
                  <div class="text-center text-gray-500 py-8">No transactions found for this shift</div>
                ` : `
                  <div class="overflow-x-auto max-h-96 overflow-y-auto">
                    <table class="table table-striped">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Order #</th>
                          <th>Items</th>
                          <th>Payment</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${transactions.map(tx => `
                          <tr>
                            <td>${new Date(tx.date).toLocaleString()}</td>
                            <td>${tx.order}</td>
                            <td>
                              ${tx.items ? tx.items.map(item => `${item.product_name} (x${item.quantity})`).join(', ') : 'N/A'}
                            </td>
                            <td>${tx.payment_mode || 'Cash'}</td>
                            <td>$${parseFloat(tx.total || 0).toFixed(2)}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                `}
              </div>
            </div>

            <div class="flex justify-end gap-3 mt-4">
              <button class="btn btn-secondary" onclick="window.pharmaApp.getModule('shifts').closeShiftReport()">
                Close
              </button>
              <button class="btn btn-primary" onclick="window.pharmaApp.getModule('shifts').printShiftReport()">
                <i class="fa fa-print"></i> Print Report
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  calculateShiftDuration(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now - start;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }

  async handleStartShift() {
    const openingBalance = document.getElementById('openingBalance').value;
    const notes = document.getElementById('shiftNotes').value;

    if (!openingBalance || isNaN(parseFloat(openingBalance))) {
      if (window.notiflix) {
        window.notiflix.Report.warning('Invalid Balance', 'Please enter a valid opening balance', 'Ok');
      }
      return;
    }

    try {
      await this.startShift(openingBalance, notes);
      // Clear form
      document.getElementById('openingBalance').value = '';
      document.getElementById('shiftNotes').value = '';
      // Re-render
      this.render();
    } catch (error) {
      // Error already handled in startShift
    }
  }

  showEndShiftModal() {
    const modal = `
      <div class="end-shift-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">End Shift</h3>
            <button onclick="window.pharmaApp.getModule('shifts').hideEndShiftModal()" class="text-gray-500">
              <i class="fa fa-times"></i>
            </button>
          </div>

          <div class="mb-4">
            <label class="form-label">Closing Balance (Cash Counted)</label>
            <input type="number" step="0.01" class="form-input" id="closingBalance"
                   placeholder="Enter the actual cash counted" required>
          </div>

          <div class="mb-4">
            <label class="form-label">Notes (Optional)</label>
            <textarea class="form-input" id="closingNotes" rows="3"
                      placeholder="Any notes about the shift closure"></textarea>
          </div>

          <div class="expected-cash-info mb-4 p-3 bg-blue-50 rounded">
            <div class="text-sm text-blue-600">
              <strong>Expected Cash:</strong> $${parseFloat(this.currentShift?.expected_cash || 0).toFixed(2)}
            </div>
          </div>

          <div class="flex gap-3">
            <button class="btn btn-secondary flex-1" onclick="window.pharmaApp.getModule('shifts').hideEndShiftModal()">
              Cancel
            </button>
            <button class="btn btn-success flex-1" onclick="window.pharmaApp.getModule('shifts').handleEndShift()">
              End Shift
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
  }

  hideEndShiftModal() {
    const modal = document.querySelector('.end-shift-modal');
    if (modal) {
      modal.remove();
    }
  }

  async handleEndShift() {
    const closingBalance = document.getElementById('closingBalance').value;
    const notes = document.getElementById('closingNotes').value;

    if (!closingBalance || isNaN(parseFloat(closingBalance))) {
      if (window.notiflix) {
        window.notiflix.Report.warning('Invalid Balance', 'Please enter a valid closing balance', 'Ok');
      }
      return;
    }

    try {
      await this.endShift(closingBalance, notes);
      this.hideEndShiftModal();
      // Re-render
      this.render();
    } catch (error) {
      // Error already handled in endShift
    }
  }

  async showShiftReport(shiftId) {
    try {
      await this.loadShiftReport(shiftId);
      this.render();
    } catch (error) {
      if (window.notiflix) {
        window.notiflix.Report.failure('Error', 'Failed to load shift report', 'Ok');
      }
    }
  }

  closeShiftReport() {
    this.selectedShift = null;
    this.app.state.updateModule('shifts', { selectedShift: null });
    this.render();
  }

  printShiftReport() {
    window.print();
  }

  async refreshCurrentShift() {
    await this.loadCurrentShift();
    this.render();
  }
}

// Make ShiftsModule available globally
window.ShiftsModule = ShiftsModule;