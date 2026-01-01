import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Import server configuration service to initialize it
import serverConfigService from './services/serverConfig';

// Import API service to ensure it's initialized
import apiService from './services/api';

// Import data service to ensure it's initialized
import dataService from './services/dataService';

// Initialize server configuration
serverConfigService.initialize().then(success => {
  if (success) {
    console.log('Server configuration initialized successfully');
  } else {
    console.warn('Server configuration initialization failed, will retry automatically');
  }
}).catch(error => {
  console.error('Error initializing server configuration:', error);
});

// Render the application
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
