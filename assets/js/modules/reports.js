/**
 * Reports Module - Reports and analytics
 */

class ReportsModule {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.reportsData = {};
    this.loading = false;
    this.dateRange = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    };
  }
  
  initialize() {
    console.log('Reports module initialized');
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Handle refresh button click
    document.addEventListener('click', (e) => {
      if (e.target.matches('#reports-refresh-btn') || e.target.closest('#reports-refresh-btn')) {
        e.preventDefault();
        this.updateDateRange();
        this.loadReportsData();
      }
    });

    // Handle date range changes
    document.addEventListener('change', (e) => {
      if (e.target.matches('#reports-start-date') || e.target.matches('#reports-end-date')) {
        this.updateDateRange();
      }
    });
  }

  updateDateRange() {
    const startInput = document.getElementById('reports-start-date');
    const endInput = document.getElementById('reports-end-date');

    if (startInput && endInput) {
      this.dateRange.start = new Date(startInput.value);
      this.dateRange.end = new Date(endInput.value);
    }
  }
  
  onActivate() {
    console.log('Reports module onActivate called');
    // Load reports data
    this.loadReportsData();
  }

  async loadReportsData() {
    if (this.loading) return;

    this.loading = true;
    console.log('Loading reports data...');
    console.log('window.api available:', window.api);

    try {
      const params = new URLSearchParams({
        start_date: this.dateRange.start.toISOString(),
        end_date: this.dateRange.end.toISOString()
      });

      const response = await fetch(`${window.api}analytics/dashboard?${params}`);
      console.log('API response status:', response.status);

      if (response.ok) {
        this.reportsData = await response.json();
        console.log('Reports data loaded:', this.reportsData);
        this.render(); // Re-render with new data
      } else {
        console.error('Failed to load reports data:', response.statusText);
        this.reportsData = { error: 'Failed to load data' };
      }
    } catch (error) {
      console.error('Error loading reports data:', error);
      this.reportsData = { error: error.message };
    } finally {
      this.loading = false;
    }
  }

  render() {
    console.log('Reports render called with data:', this.reportsData);

    return `
      <div class="module-container reports-module" data-module="reports">
        <div class="module-header">
          <h1 class="module-title">📊 Reports & Analytics</h1>
          <p class="module-subtitle">Comprehensive sales reports and business insights</p>

          <div class="reports-controls">
            <div class="date-range-picker">
              <label>Report Period:</label>
              <input type="date" id="reports-start-date" value="${this.dateRange.start.toISOString().split('T')[0]}" class="form-control">
              <span>to</span>
              <input type="date" id="reports-end-date" value="${this.dateRange.end.toISOString().split('T')[0]}" class="form-control">
              <button id="reports-refresh-btn" class="btn btn-primary">
                <i class="fas fa-sync-alt"></i> Generate Report
              </button>
            </div>
          </div>
        </div>

        <div class="reports-content">
          ${this.renderReportsContent()}
        </div>
      </div>
    `;
  }

  renderReportsContent() {
    if (this.loading) {
      return `
        <div class="text-center py-8">
          <i class="fa fa-spinner fa-spin text-2xl mb-4"></i>
          <div>Loading reports data...</div>
        </div>
      `;
    }

    if (this.reportsData.error) {
      return `
        <div class="text-center py-8 text-red-500">
          <i class="fa fa-exclamation-triangle text-4xl mb-4"></i>
          <div>Error loading reports: ${this.reportsData.error}</div>
        </div>
      `;
    }

    if (!this.reportsData.sales) {
      return `
        <div class="text-center py-8 text-gray-500">
          <i class="fa fa-chart-bar text-4xl mb-4"></i>
          <div>No data available for the selected period</div>
        </div>
      `;
    }

    const data = this.reportsData;

    return `
      <div class="reports-grid">
        <!-- Key Metrics Cards -->
        <div class="metrics-section">
          <h2>📈 Key Performance Indicators</h2>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-icon">💰</div>
              <div class="metric-content">
                <h3>Total Revenue</h3>
                <div class="metric-value">${(data.sales?.total_revenue || 0).toFixed(2)}</div>
                <div class="metric-label">Last 30 days</div>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-icon">🛒</div>
              <div class="metric-content">
                <h3>Total Orders</h3>
                <div class="metric-value">${data.sales?.total_orders || 0}</div>
                <div class="metric-label">Transactions</div>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-icon">📊</div>
              <div class="metric-content">
                <h3>Average Order Value</h3>
                <div class="metric-value">${(data.sales?.average_order_value || 0).toFixed(2)}</div>
                <div class="metric-label">Per transaction</div>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-icon">👨‍🍳</div>
              <div class="metric-content">
                <h3>Kitchen Efficiency</h3>
                <div class="metric-value">${(data.kitchen?.efficiency_metrics?.order_completion_rate || 0).toFixed(1)}%</div>
                <div class="metric-label">Orders completed</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Performers -->
        <div class="tables-section">
          <div class="table-card">
            <h2>🏆 Top Selling Items</h2>
            <div class="table-responsive">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Sales</th>
                    <th>Revenue</th>
                    <th>Profit Margin</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.renderTopItems(data.menu_performance?.top_selling_items || [])}
                </tbody>
              </table>
            </div>
          </div>

          <div class="table-card">
            <h2>🪑 Table Performance</h2>
            <div class="table-responsive">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Table</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                    <th>Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.renderTablePerformance(data.table_analytics?.table_utilization || {})}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Insights and Recommendations -->
        <div class="insights-section">
          <div class="insight-card">
            <h2>🔍 Key Insights</h2>
            <div class="insight-list">
              ${this.renderInsights(data)}
            </div>
          </div>

          <div class="insight-card">
            <h2>💡 Recommendations</h2>
            <div class="recommendation-list">
              ${this.renderRecommendations(data)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTopItems(items) {
    if (!items || items.length === 0) {
      return '<tr><td colspan="4">No sales data available</td></tr>';
    }

    return items.slice(0, 5).map(item => `
      <tr>
        <td>${item.name || item.product_name || 'Unknown Item'}</td>
        <td>${item.sales || 0}</td>
        <td>${(item.revenue || 0).toFixed(2)}</td>
        <td>${(item.margin || 0).toFixed(1)}%</td>
      </tr>
    `).join('');
  }

  renderTablePerformance(tables) {
    const tableArray = Object.values(tables);
    if (!tableArray || tableArray.length === 0) {
      return '<tr><td colspan="4">No table data available</td></tr>';
    }

    return tableArray.slice(0, 5).map(table => `
      <tr>
        <td>Table ${table.table_number || table.table_id}</td>
        <td>${table.total_orders || 0}</td>
        <td>${(table.revenue || 0).toFixed(2)}</td>
        <td>${table.utilization_percentage || 0}%</td>
      </tr>
    `).join('');
  }

  renderInsights(data) {
    const insights = [];

    if (data.sales?.peak_hours?.length > 0) {
      const peakHour = data.sales.peak_hours[0];
      insights.push(`Peak sales hour: ${peakHour.hour}:00 with ${peakHour.revenue.toFixed(2)} in revenue`);
    }

    if (data.menu_performance?.top_selling_items?.length > 0) {
      const topItem = data.menu_performance.top_selling_items[0];
      insights.push(`Best selling item: ${topItem.name} (${topItem.sales} units sold)`);
    }

    if (data.kitchen?.on_time_delivery_rate > 90) {
      insights.push(`Excellent kitchen performance: ${data.kitchen.on_time_delivery_rate.toFixed(1)}% on-time delivery`);
    }

    if (data.sales?.growth_metrics?.revenue_growth > 0) {
      insights.push(`Revenue trending upward: ${data.sales.growth_metrics.revenue_growth.toFixed(1)}% growth`);
    }

    if (insights.length === 0) {
      return '<div class="insight-item">No significant insights available for this period</div>';
    }

    return insights.map(insight => `<div class="insight-item">${insight}</div>`).join('');
  }

  renderRecommendations(data) {
    const recommendations = [];

    if (data.menu_performance?.low_performing_items?.length > 0) {
      recommendations.push(`Consider reviewing ${data.menu_performance.low_performing_items.length} underperforming menu items`);
    }

    if (data.kitchen?.average_prep_time > 20) {
      recommendations.push('Kitchen prep time could be optimized to improve efficiency');
    }

    if (data.table_analytics?.average_turnover_time > 60) {
      recommendations.push('Table turnover time is high - consider streamlining service process');
    }

    if (data.sales?.peak_hours?.length > 0) {
      const peakHour = data.sales.peak_hours[0];
      recommendations.push(`Staff additional personnel during peak hour (${peakHour.hour}:00) to handle increased demand`);
    }

    if (recommendations.length === 0) {
      return '<div class="recommendation-item">No specific recommendations at this time</div>';
    }

    return recommendations.map(rec => `<div class="recommendation-item">${rec}</div>`).join('');
  }
}

// Make ReportsModule available globally
window.ReportsModule = ReportsModule;