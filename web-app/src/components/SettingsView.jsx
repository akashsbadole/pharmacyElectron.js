import React from 'react';

const SettingsView = () => {
  return (
    <div className="settings-view">
      <div className="view-header">
        <h2>Settings</h2>
        <div className="view-actions">
          <button className="btn-primary">Save Changes</button>
          <button className="btn-secondary">Reset</button>
        </div>
      </div>
      
      <div className="settings-grid">
        <div className="settings-card">
          <h3>General Settings</h3>
          <div className="settings-form">
            <div className="form-group">
              <label>Store Name</label>
              <input type="text" defaultValue="Restaurant POS" />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select>
                <option>INR (₹)</option>
                <option>USD ($)</option>
                <option>EUR (€)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Tax Rate (%)</label>
              <input type="number" defaultValue="8.75" />
            </div>
          </div>
        </div>
        
        <div className="settings-card">
          <h3>POS Settings</h3>
          <div className="settings-form">
            <div className="form-group">
              <label>Default Payment Method</label>
              <select>
                <option>Cash</option>
                <option>Card</option>
                <option>UPI</option>
              </select>
            </div>
            <div className="form-group">
              <label>Auto Logout (minutes)</label>
              <input type="number" defaultValue="30" />
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" defaultChecked />
                Enable Sound Notifications
              </label>
            </div>
          </div>
        </div>
        
        <div className="settings-card">
          <h3>Backup & Sync</h3>
          <div className="settings-form">
            <div className="form-group">
              <label>Backup Frequency</label>
              <select>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            <div className="form-group">
              <button className="btn-secondary">Create Backup</button>
            </div>
            <div className="form-group">
              <button className="btn-secondary">Restore Backup</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
