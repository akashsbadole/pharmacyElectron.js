import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';

// Import components
import DesktopHeader from './components/DesktopHeader';
import Sidebar from './components/Sidebar';
import POSInterface from './components/POSInterface';
import ProductsView from './components/ProductsView';
import CustomersView from './components/CustomersView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import PWABanner from './components/PWABanner';
import Login from './components/Login';
import ServerStatusBanner from './components/ServerStatusBanner';

// Import hooks
import { useDataService } from './hooks/useDataService';

function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Use data service hook
  const {
    loading,
    error,
    networkStatus,
    products,
    cartItems,
    settings,
    loadProducts,
    saveCart,
    clearCart,
    createTransaction,
    syncOfflineData
  } = useDataService();

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check authentication status
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const addToCart = (product) => {
    const newCartItems = [...cartItems, { ...product, quantity: 1 }];
    saveCart(newCartItems);
  };

  const removeFromCart = (productId) => {
    const newCartItems = cartItems.filter(item => item.id !== productId);
    saveCart(newCartItems);
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    const newCartItems = cartItems.map(item => 
      item.id === productId 
        ? { ...item, quantity }
        : item
    );
    saveCart(newCartItems);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const taxRate = settings.tax_rate || 0.0875; // Default 8.75%
    return subtotal * taxRate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleInstallClick = async () => {
    // PWA installation logic would go here
    setShowInstallBanner(false);
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
  };

  const handleLogin = (credentials) => {
    // Login logic handled by useDataService hook
    setIsAuthenticated(true);
  };

  const checkout = async () => {
    if (cartItems.length === 0) {
      alert('Cart is empty!');
      return;
    }
    
    try {
      const transactionData = {
        items: cartItems.map(item => ({
          id: item.id,
          product_name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity
        })),
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        total: calculateTotal(),
        payment_method: 'cash',
        status: 'completed'
      };

      await createTransaction(transactionData);
      alert(`Checkout successful! Total: ₹${calculateTotal().toFixed(2)}`);
      clearCart();
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Checkout failed. Please try again.');
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'pos':
        return (
          <POSInterface
            products={products}
            cartItems={cartItems}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            updateQuantity={updateQuantity}
            calculateSubtotal={calculateSubtotal}
            calculateTax={calculateTax}
            calculateTotal={calculateTotal}
            clearCart={clearCart}
            checkout={checkout}
            isLoading={loading}
          />
        );
      case 'products':
        return <ProductsView products={products} onRefresh={loadProducts} />;
      case 'customers':
        return <CustomersView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <div>Unknown tab</div>;
    }
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {/* Server Configuration Banner */}
      <ServerStatusBanner />

      {/* PWA Installation Banner */}
      {!isInstalled && showInstallBanner && (
        <PWABanner
          onInstall={handleInstallClick}
          onDismiss={dismissInstallBanner}
        />
      )}

      {/* Desktop Header */}
      <DesktopHeader 
        isInstalled={isInstalled}
        onLogout={handleLogout}
        networkStatus={networkStatus}
      />

      {/* Main Content */}
      <div className="main-content">
        {/* Sidebar Navigation */}
        <Sidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Workspace */}
        <main className="workspace">
          {error && (
            <div className="error-banner">
              Error: {error}
              {networkStatus.isOnline && (
                <button onClick={syncOfflineData} className="sync-btn">
                  Sync Data
                </button>
              )}
            </div>
          )}
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

export default App;
