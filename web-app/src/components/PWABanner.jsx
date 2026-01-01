import React from 'react';

const PWABanner = ({ onInstall, onDismiss }) => {
  return (
    <div className="install-banner show">
      <div className="install-content">
        <h3>Install Restaurant POS</h3>
        <p>Add to your home screen for a better experience</p>
        <div className="install-actions">
          <button onClick={onInstall} className="install-btn">
            Install App
          </button>
          <button onClick={onDismiss} className="dismiss-btn">
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWABanner;
