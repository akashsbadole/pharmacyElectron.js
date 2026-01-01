import React, { useState, useEffect } from 'react';
import serverConfigService from '../services/serverConfig.js';

const ServerConfigModal = ({ isOpen, onClose }) => {
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('3000');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [configStatus, setConfigStatus] = useState(null);

  useEffect(() => {
    // Load current configuration
    const currentConfig = serverConfigService.getConfig();
    if (currentConfig && currentConfig.host && currentConfig.port) {
      setHost(currentConfig.host);
      setPort(currentConfig.port.toString());
    }
  }, []);

  // Test server connection
  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`http://${host}:${port}/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 3000
      });

      if (response.ok) {
        const config = await response.json();
        setTestResult({
          success: true,
          message: `Server found on ${host}:${port}`,
          config: config
        });
      } else {
        setTestResult({
          success: false,
          message: `Server responded with status ${response.status}`
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error.message || 'Connection failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save configuration
  const saveConfiguration = () => {
    if (testResult && testResult.success) {
      serverConfigService.setManualConfig(host, port);
      setConfigStatus({
        type: 'success',
        message: 'Server configuration saved successfully'
      });
      
      // Close modal after successful save
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setConfigStatus({
        type: 'error',
        message: 'Please test and verify the connection before saving'
      });
    }
  };

  // Clear configuration
  const clearConfiguration = () => {
    serverConfigService.clearConfig();
    setConfigStatus({
      type: 'info',
      message: 'Server configuration cleared'
    });
  };

  // Auto-discover servers
  const autoDiscover = async () => {
    setIsTesting(true);
    setTestResult(null);

    const commonPorts = [3000, 8080, 8081, 52554, 4000, 5000];
    
    for (const port of commonPorts) {
      try {
        const response = await fetch(`http://localhost:${port}/config`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 2000
        });

        if (response.ok) {
          const config = await response.json();
          setHost('localhost');
          setPort(port.toString());
          setTestResult({
            success: true,
            message: `Server found on localhost:${port}`,
            config: config
          });
          setIsTesting(false);
          return;
        }
      } catch (error) {
        // Continue to next port
      }
    }

    setTestResult({
      success: false,
      message: 'No server found on common ports'
    });
    setIsTesting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Server Configuration</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="modal-body">
          {/* Configuration Status */}
          {configStatus && (
            <div className={`alert ${configStatus.type === 'success' ? 'alert-success' : configStatus.type === 'error' ? 'alert-danger' : 'alert-info'}`}>
              {configStatus.message}
            </div>
          )}

          {/* Current Status */}
          <div className="config-section">
            <h4>Current Status</h4>
            <div className="status-info">
              <span className={`status-dot ${serverConfigService.isReady() ? 'status-ready' : 'status-pending'}`}></span>
              <span>{serverConfigService.isReady() ? 'Server Ready' : 'Server Not Configured'}</span>
            </div>
            {serverConfigService.isReady() && (
              <div className="current-config">
                <small>Current: {serverConfigService.getAPIBase()}</small>
              </div>
            )}
          </div>

          {/* Manual Configuration */}
          <div className="config-section">
            <h4>Manual Configuration</h4>
            <div className="form-group">
              <label>Host</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="localhost"
              />
            </div>
            <div className="form-group">
              <label>Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="3000"
              />
            </div>
          </div>

          {/* Test Connection */}
          <div className="config-section">
            <h4>Test Connection</h4>
            <div className="button-group">
              <button 
                className="btn btn-primary"
                onClick={testConnection}
                disabled={isTesting}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={autoDiscover}
                disabled={isTesting}
              >
                Auto Discover
              </button>
            </div>
            
            {testResult && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                <div className="result-message">{testResult.message}</div>
                {testResult.config && (
                  <div className="result-details">
                    <small>API Base: {testResult.config.api}</small>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Common Server Ports */}
          <div className="config-section">
            <h4>Common Server Ports</h4>
            <div className="port-list">
              {[3000, 8080, 8081, 52554, 4000, 5000].map(portNum => (
                <button
                  key={portNum}
                  className="port-btn"
                  onClick={() => {
                    setPort(portNum.toString());
                    setHost('localhost');
                  }}
                >
                  {portNum}
                </button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="config-section">
            <h4>Instructions</h4>
            <div className="instructions">
              <ol>
                <li>Enter your server host and port (default: localhost:3000)</li>
                <li>Click "Test Connection" to verify the server is accessible</li>
                <li>Click "Auto Discover" to find servers on common ports</li>
                <li>Click "Save Configuration" to apply the settings</li>
              </ol>
              <p className="note">
                <strong>Note:</strong> This web application connects to your existing PharmaMine server.
                Make sure your server is running before testing the connection.
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={clearConfiguration}>
            Clear Config
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary"
            onClick={saveConfiguration}
            disabled={!testResult || !testResult.success}
          >
            Save Configuration
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          width: 100%;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #eee;
        }

        .modal-header h3 {
          margin: 0;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .close-btn:hover {
          background: #f0f0f0;
        }

        .modal-body {
          padding: 20px;
        }

        .config-section {
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 1px solid #f0f0f0;
        }

        .config-section:last-child {
          border-bottom: none;
        }

        .config-section h4 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 16px;
        }

        .status-info {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }

        .status-ready {
          background-color: #28a745;
          box-shadow: 0 0 5px rgba(40, 167, 69, 0.5);
        }

        .status-pending {
          background-color: #ffc107;
          box-shadow: 0 0 5px rgba(255, 193, 7, 0.5);
        }

        .current-config {
          margin-top: 5px;
          color: #666;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
          color: #333;
          font-weight: 500;
        }

        .form-group input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #4CAF50;
          box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
        }

        .button-group {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }

        .btn {
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
          font-size: 14px;
        }

        .btn-primary {
          background-color: #4CAF50;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #45a049;
        }

        .btn-primary:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #5a6268;
        }

        .test-result {
          padding: 10px;
          border-radius: 4px;
          margin-top: 10px;
          border: 1px solid #ddd;
        }

        .test-result.success {
          background-color: #d4edda;
          border-color: #c3e6cb;
          color: #155724;
        }

        .test-result.error {
          background-color: #f8d7da;
          border-color: #f5c6cb;
          color: #721c24;
        }

        .result-message {
          font-weight: 500;
        }

        .result-details {
          margin-top: 5px;
          font-size: 12px;
          color: #666;
        }

        .port-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .port-btn {
          padding: 8px 12px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .port-btn:hover {
          background: #f8f9fa;
          border-color: #4CAF50;
        }

        .instructions {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
          border: 1px solid #e9ecef;
        }

        .instructions ol {
          margin: 0 0 10px 0;
          padding-left: 20px;
        }

        .instructions li {
          margin-bottom: 5px;
          color: #333;
        }

        .note {
          margin: 0;
          font-size: 12px;
          color: #666;
          font-style: italic;
        }

        .modal-footer {
          padding: 20px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .alert {
          padding: 10px 15px;
          border-radius: 4px;
          margin-bottom: 15px;
          border: 1px solid transparent;
        }

        .alert-success {
          color: #155724;
          background-color: #d4edda;
          border-color: #c3e6cb;
        }

        .alert-danger {
          color: #721c24;
          background-color: #f8d7da;
          border-color: #f5c6cb;
        }

        .alert-info {
          color: #0c5460;
          background-color: #d1ecf1;
          border-color: #bee5eb;
        }

        @media (max-width: 768px) {
          .modal-content {
            width: 95%;
            margin: 20px;
          }
          
          .button-group {
            flex-direction: column;
          }
          
          .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ServerConfigModal;
