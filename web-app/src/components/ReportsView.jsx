import React from 'react';

const ReportsView = () => {
  return (
    <div className="reports-view">
      <div className="view-header">
        <h2>Reports & Analytics</h2>
        <div className="view-actions">
          <button className="btn-primary">Generate Report</button>
          <button className="btn-secondary">Export</button>
        </div>
      </div>
      
      <div className="reports-grid">
        <div className="report-card">
          <h3>Sales Summary</h3>
          <div className="report-content">
            <div className="metric">
              <span className="label">Total Sales</span>
              <span className="value">₹15,250.00</span>
            </div>
            <div className="metric">
              <span className="label">Transactions</span>
              <span className="value">45</span>
            </div>
            <div className="metric">
              <span className="label">Avg Order Value</span>
              <span className="value">₹338.89</span>
            </div>
          </div>
        </div>
        
        <div className="report-card">
          <h3>Top Products</h3>
          <div className="report-content">
            <div className="product-list">
              <div className="product-item">
                <span className="product-name">Margherita Pizza</span>
                <span className="product-count">12 sold</span>
              </div>
              <div className="product-item">
                <span className="product-name">Pepperoni Pizza</span>
                <span className="product-count">8 sold</span>
              </div>
              <div className="product-item">
                <span className="product-name">Soft Drink</span>
                <span className="product-count">25 sold</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="report-card">
          <h3>Payment Methods</h3>
          <div className="report-content">
            <div className="payment-method">
              <span className="method-name">Cash</span>
              <span className="method-count">30 transactions</span>
            </div>
            <div className="payment-method">
              <span className="method-name">Card</span>
              <span className="method-count">15 transactions</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
