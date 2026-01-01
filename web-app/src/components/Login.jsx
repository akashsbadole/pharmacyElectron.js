import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Import the API service
      const apiService = (await import('../services/api.js')).default;
      
      const result = await apiService.login(credentials);
      
      if (result.success) {
        onLogin(result);
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="app-logo">🍽️</div>
          <h1>Restaurant POS</h1>
          <p>Point of Sale System</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              placeholder="Enter your username"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            className="login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>Restaurant Management System</p>
          <p className="version">v1.0.0</p>
        </div>
      </div>
      
      <style jsx>{`
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background-color: #f5f5f5;
          padding: 20px;
        }
        
        .login-card {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
          text-align: center;
        }
        
        .login-header {
          margin-bottom: 30px;
        }
        
        .app-logo {
          font-size: 48px;
          margin-bottom: 10px;
        }
        
        .login-header h1 {
          margin: 0 0 5px 0;
          font-size: 24px;
          color: #333;
        }
        
        .login-header p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }
        
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .form-group {
          text-align: left;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }
        
        .form-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.2s;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: #4CAF50;
          box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
        }
        
        .form-group input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }
        
        .error-message {
          background-color: #ffebee;
          color: #c62828;
          padding: 10px;
          border-radius: 6px;
          font-size: 14px;
          text-align: center;
        }
        
        .login-btn {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 14px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .login-btn:hover:not(:disabled) {
          background-color: #45a049;
        }
        
        .login-btn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        
        .login-footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        
        .login-footer p {
          margin: 5px 0 0 0;
          color: #666;
          font-size: 12px;
        }
        
        .version {
          font-weight: 500;
        }
        
        @media (max-width: 480px) {
          .login-card {
            padding: 30px 20px;
          }
          
          .app-logo {
            font-size: 36px;
          }
          
          .login-header h1 {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
