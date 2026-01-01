import React from 'react';

const DesktopHeader = ({ isInstalled, onLogout, networkStatus }) => {
  return (
    <header className="desktop-header">
      <div className="brand-section">
        <div className="app-logo">🍽️</div>
        <h1>Restaurant POS</h1>
        {networkStatus && (
          <div className={`network-status ${networkStatus.isOnline ? 'online' : 'offline'}`}>
            {networkStatus.isOnline ? '● Online' : '● Offline'}
          </div>
        )}
      </div>
      
      <div className="user-section">
        <span className="user-name">Cashier: John Doe</span>
        <button className="btn-settings" title="Settings">
          <i className="fa fa-cog"></i>
        </button>
        <button className="btn-logout" title="Logout" onClick={onLogout}>
          <i className="fa fa-sign-out"></i>
        </button>
      </div>
      
      <style jsx>{`
        .desktop-header {
          height: 60px;
          background: white;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 20px;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          backdrop-filter: blur(5px);
        }
        
        .brand-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .app-logo {
          width: 40px;
          height: 40px;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .brand-section h1 {
          font-size: 1.2rem;
          font-weight: 600;
          color: #4CAF50;
        }
        
        .network-status {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 12px;
          background: #f0f0f0;
          color: #666;
        }
        
        .network-status.online {
          background: #e8f5e9;
          color: #2e7d32;
        }
        
        .network-status.offline {
          background: #ffebee;
          color: #c62828;
        }
        
        .user-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .user-name {
          font-size: 0.9rem;
          color: #666;
          background: #f8f8f8;
          padding: 6px 12px;
          border-radius: 20px;
          border: 1px solid #e0e0e0;
        }
        
        .btn-settings, .btn-logout {
          background: none;
          border: 1px solid #e0e0e0;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
        }
        
        .btn-settings:hover, .btn-logout:hover {
          background: #4CAF50;
          color: white;
          border-color: #4CAF50;
        }
        
        @media (max-width: 768px) {
          .brand-section h1 {
            font-size: 1rem;
          }
          
          .user-name {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};

export default DesktopHeader;
