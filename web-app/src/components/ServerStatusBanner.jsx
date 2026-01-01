import React, { useState, useEffect } from 'react';
import serverConfigService from '../services/serverConfig.js';
import ServerConfigModal from './ServerConfigModal.jsx';

const ServerStatusBanner = () => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    // Initialize configuration state
    const currentConfig = serverConfigService.getConfig();
    setIsConfigured(serverConfigService.isReady());
    setConfig(currentConfig);

    // Listen for configuration changes
    const unsubscribe = serverConfigService.addListener((newConfig) => {
      setIsConfigured(newConfig.ready);
      setConfig(newConfig);
    });

    return unsubscribe;
  }, []);

  const handleConfigureServer = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Don't show banner if server is configured and ready
  if (isConfigured) {
    return null;
  }

  return (
    <>
      <div className="server-status-banner">
        <div className="banner-content">
          <div className="banner-icon">
            <i className="fa fa-exclamation-triangle"></i>
          </div>
          <div className="banner-text">
            <div className="banner-title">Server Configuration Required</div>
            <div className="banner-subtitle">
              This web application needs to connect to your PharmaMine server to function properly.
            </div>
          </div>
          <div className="banner-actions">
            <button className="btn btn-primary" onClick={handleConfigureServer}>
              Configure Server
            </button>
            <button className="btn btn-secondary" onClick={handleConfigureServer}>
              Setup Guide
            </button>
          </div>
        </div>
      </div>

      <ServerConfigModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      <style jsx>{`
        .server-status-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #fff3cd;
          border-bottom: 1px solid #ffeaa7;
          z-index: 1001;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .banner-icon {
          font-size: 20px;
          color: #856404;
          flex-shrink: 0;
        }

        .banner-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .banner-title {
          font-weight: 600;
          color: #856404;
          font-size: 16px;
        }

        .banner-subtitle {
          font-size: 14px;
          color: #6c757d;
        }

        .banner-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-block;
        }

        .btn-primary {
          background-color: #4CAF50;
          color: white;
        }

        .btn-primary:hover {
          background-color: #45a049;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #5a6268;
        }

        @media (max-width: 768px) {
          .banner-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .banner-actions {
            width: 100%;
            justify-content: space-between;
          }

          .btn {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
};

export default ServerStatusBanner;
