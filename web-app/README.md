# Restaurant POS Web Application

A modern, responsive web application for restaurant point-of-sale operations, built as a companion to the existing PharmaMine desktop application.

## Overview

This web application provides a browser-based interface that connects to your existing PharmaMine server, offering the same functionality as the desktop version with additional web-specific features like offline support, PWA capabilities, and mobile responsiveness.

## Features

### Core Functionality
- **Point of Sale (POS)**: Complete POS interface with product catalog, cart management, and checkout
- **Menu Management**: Product catalog with categories, pricing, and inventory tracking
- **Customer Management**: Customer database with purchase history and loyalty tracking
- **Reports & Analytics**: Sales reports, inventory turnover, and staff activity reports
- **Settings**: Configuration for store settings, tax rates, and business rules

### Web-Specific Features
- **Progressive Web App (PWA)**: Installable on devices, works offline
- **Server Auto-Discovery**: Automatically finds your PharmaMine server
- **Offline Support**: Works without internet, syncs when connection is restored
- **Mobile Responsive**: Works on desktops, tablets, and smartphones
- **Real-time Updates**: Live data synchronization with the server

### Restaurant-Specific Features
- **Recipe Management**: Complete recipe system with ingredient tracking and cost calculation
- **Kitchen Display System (KDS)**: Order management for kitchen staff
- **Table Management**: Table layout and order tracking
- **Combo Meal Builder**: Create and manage combo meals
- **Happy Hour Pricing**: Time-based pricing rules
- **Service Charges**: Optional service charges for large groups
- **Packaging Fees**: Takeaway order fees

## Architecture

### Frontend
- **React 18** with functional components and hooks
- **Vite** for fast development and build process
- **CSS-in-JS** for component styling
- **Service Worker** for offline functionality
- **PWA Manifest** for installable app experience

### Backend Integration
- **Dynamic Server Discovery**: Automatically finds PharmaMine server
- **RESTful API Integration**: Connects to existing PharmaMine API endpoints
- **Real-time Communication**: WebSocket support for live updates
- **Authentication**: JWT-based authentication system

### Data Management
- **Offline Storage**: IndexedDB for offline data persistence
- **Sync Engine**: Automatic data synchronization when online
- **Caching**: Smart caching for improved performance
- **Data Validation**: Client-side validation with server-side verification

## Installation

### Prerequisites
- Node.js (version 16 or higher)
- Your existing PharmaMine server running
- Access to the PharmaMine API endpoints

### Setup

1. **Clone or download** this web application to your server or local machine

2. **Install dependencies**:
   ```bash
   cd web-app
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   Open your browser and navigate to `http://localhost:5173` (or the port shown in the console)

5. **Configure server connection**:
   - The app will automatically try to discover your PharmaMine server
   - If auto-discovery fails, use the Server Configuration modal to manually enter your server details
   - Default: `localhost:3000` (same as your PharmaMine server)

### Production Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Serve the built files**:
   Use any static file server (Apache, Nginx, etc.) to serve the `dist` folder

3. **Configure your server**:
   Ensure your PharmaMine server allows CORS requests from your web application domain

## Server Configuration

The web application automatically discovers your PharmaMine server using several methods:

1. **Auto-discovery**: Scans common ports (3000, 8080, 8081, 52554, 4000, 5000)
2. **Environment variables**: Check for `REACT_APP_API_HOST` and `REACT_APP_API_PORT`
3. **Configuration file**: Look for `config.json` in the root directory
4. **Manual configuration**: Use the Server Configuration modal

### Manual Configuration

If auto-discovery fails:

1. Click "Configure Server" in the banner
2. Enter your server host and port (default: localhost:3000)
3. Test the connection
4. Save the configuration

## API Endpoints

The web application connects to your existing PharmaMine API endpoints:

- **Authentication**: `/api/login`, `/api/logout`
- **Products**: `/api/inventory/products`, `/api/inventory/product`
- **Categories**: `/api/categories/all`, `/api/categories/new`
- **Transactions**: `/api/transactions/new`, `/api/transactions/by-date`
- **Customers**: `/api/customers/all`, `/api/customers/new`
- **Settings**: `/api/settings/get`, `/api/settings/update`
- **Reports**: `/api/transactions/reports/*`
- **Kitchen**: `/api/kitchen/orders`, `/api/kitchen/orders/*/status`

## Browser Support

- **Modern browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile browsers**: iOS Safari 13+, Chrome for Android 80+
- **PWA support**: Chrome, Edge, Safari (iOS), and other modern browsers

## Security

- **HTTPS recommended**: Use HTTPS in production for security
- **CORS configuration**: Configure your PharmaMine server to allow your domain
- **Authentication**: JWT tokens with automatic refresh
- **Data encryption**: All data transmitted over HTTPS

## Troubleshooting

### Server Connection Issues
1. Ensure your PharmaMine server is running
2. Check that the server port is accessible from the browser
3. Verify CORS settings on your server
4. Use the Server Configuration modal to manually set the server address

### Offline Mode
- The app works offline after initial load
- Data is cached locally and synced when connection is restored
- Some features may be limited in offline mode

### Performance Issues
- Clear browser cache if experiencing slow loading
- Check network connection for API calls
- Monitor browser developer tools for errors

## Development

### Adding New Features
1. Create new components in the `src/components` directory
2. Add new routes in `src/App.jsx`
3. Create API services in `src/services`
4. Add hooks in `src/hooks` for state management
5. Update the data service for new API endpoints

### Testing
```bash
npm run test
```

### Building for Production
```bash
npm run build
```

## License

This application is part of the PharmaMine ecosystem and follows the same licensing terms.

## Support

For issues related to:
- **Web application**: Report issues in this repository
- **Server API**: Report issues in the main PharmaMine repository
- **General support**: Contact the development team

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Changelog

### v1.0.0
- Initial web application release
- Complete POS functionality
- PWA support with offline capabilities
- Server auto-discovery and configuration
- Mobile responsive design
- Recipe management system
- Kitchen display system
- Table management
- Combo meal builder
- Happy hour pricing
- Service charges and packaging fees
