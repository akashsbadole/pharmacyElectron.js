# PharmaMine Web Application

A comprehensive web-based retail management system with PostgreSQL backend and real-time synchronization capabilities.

## Overview

PharmaMine Web is a modern web application built on top of the existing PharmaMine desktop application. It provides a complete retail management solution with:

- **Point of Sale (POS)** - Modern web-based POS system
- **Inventory Management** - Real-time inventory tracking and management
- **Customer Management** - Customer database with loyalty program support
- **Transaction History** - Complete transaction tracking and reporting
- **Real-time Sync** - Bi-directional sync between web and desktop applications

## Architecture

### Backend (Node.js/Express)
- **Express.js** server with modular API structure
- **PostgreSQL** database for web application data
- **NeDB** integration for desktop application sync
- **Real-time synchronization** engine with conflict resolution
- **JWT authentication** and security middleware
- **Comprehensive API** endpoints for all retail operations

### Frontend (Vanilla JavaScript)
- **Responsive design** with Bootstrap 5
- **Modular JavaScript** architecture
- **Real-time sync status** monitoring
- **Progressive Web App** features
- **Offline-first** capabilities

### Database Architecture
- **PostgreSQL** for web application (multi-user, scalable)
- **NeDB** for desktop application (single-user, file-based)
- **Bi-directional sync** with conflict resolution
- **Change data capture** for efficient synchronization

## Features

### Core Retail Features
- ✅ **Point of Sale System** - Complete POS with barcode scanning
- ✅ **Inventory Management** - Real-time stock tracking and alerts
- ✅ **Customer Management** - Customer database with loyalty tiers
- ✅ **Transaction Processing** - Complete sales and payment handling
- ✅ **Product Catalog** - Comprehensive product management
- ✅ **Category Management** - Organized product categorization

### Advanced Features
- ✅ **Real-time Synchronization** - Bi-directional sync between web and desktop
- ✅ **Conflict Resolution** - Automatic and manual conflict handling
- ✅ **Multi-tier Loyalty Program** - Bronze, Silver, Gold, Platinum tiers
- ✅ **CSV Import/Export** - Bulk data operations
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile
- ✅ **Authentication & Authorization** - Secure user management

### Sync Features
- ✅ **Real-time Sync Engine** - Automatic background synchronization
- ✅ **Offline Support** - Both applications work offline
- ✅ **Conflict Detection** - Smart conflict identification and resolution
- ✅ **Change Tracking** - Comprehensive audit trail
- ✅ **Performance Monitoring** - Sync performance metrics

## Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn package manager

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd web-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=pharmamine_web
   DB_USER=postgres
   DB_PASSWORD=your_password
   
   # Sync Configuration
   NEDB_HOST=localhost
   NEDB_PORT=49499
   NEDB_PATH=./data/databases
   
   # Sync Settings
   SYNC_INTERVAL=30000
   RETRY_INTERVAL=5000
   MAX_RETRIES=3
   
   # CORS and Security
   CORS_ORIGIN=http://localhost:3000
   LOG_LEVEL=info
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   ```

4. **Set up PostgreSQL database**
   ```sql
   CREATE DATABASE pharmamine_web;
   -- Run the database schema from web-app/server/config/database.js
   ```

5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the application**
   - Web Application: http://localhost:3001
   - Health Check: http://localhost:3001/health
   - API Documentation: http://localhost:3001/api

## Database Schema

The application uses a comprehensive database schema with the following key tables:

### Core Tables
- **products** - Product catalog with inventory tracking
- **categories** - Product categorization
- **customers** - Customer database with loyalty program
- **transactions** - Sales and transaction history
- **users** - User authentication and permissions
- **settings** - Application configuration

### Sync Tables
- **sync_log** - Change tracking and synchronization log
- **inventory_matrix** - Advanced inventory management
- **gift_receipts** - Gift receipt management
- **gift_cards** - Gift card system
- **gift_bundles** - Product bundling

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Inventory
- `GET /api/inventory/products` - Get all products
- `GET /api/inventory/categories` - Get all categories
- `POST /api/inventory/products` - Create product
- `PUT /api/inventory/products/:id` - Update product
- `DELETE /api/inventory/products/:id` - Delete product
- `GET /api/inventory/search?q=query` - Search products

### Customers
- `GET /api/customers/all` - Get all customers
- `POST /api/customers/customer` - Create customer
- `PUT /api/customers/customer/:id` - Update customer
- `DELETE /api/customers/customer/:id` - Delete customer
- `GET /api/customers/search?q=query` - Search customers

### Transactions
- `GET /api/transactions/all` - Get all transactions
- `POST /api/transactions/new` - Create transaction
- `GET /api/transactions/:id` - Get transaction details

### Sync
- `GET /api/sync/status` - Get sync status
- `POST /api/sync/trigger` - Trigger manual sync
- `POST /api/sync/start` - Start sync engine
- `POST /api/sync/stop` - Stop sync engine
- `GET /api/sync/history` - Get sync history
- `GET /api/sync/conflicts` - Get sync conflicts

## Synchronization System

### Sync Architecture
The synchronization system provides bi-directional sync between the web application (PostgreSQL) and desktop application (NeDB):

```
┌─────────────────┐    Sync    ┌─────────────────┐
│   Web App       │◄──────────►│   Desktop App   │
│   (PostgreSQL)  │            │   (NeDB)        │
└─────────────────┘            └─────────────────┘
         │                               │
         │                               │
         ▼                               ▼
┌─────────────────────────────────────────────────┐
│              Sync Engine                        │
│  ┌─────────────┐    Conflict    ┌─────────────┐ │
│  │   Sync      │◄──────────────►│   Resolver  │ │
│  │   Tracker   │                │             │ │
│  └─────────────┘                └─────────────┘ │
└─────────────────────────────────────────────────┘
```

### Sync Features
- **Real-time synchronization** with configurable intervals
- **Conflict resolution** with multiple strategies (timestamp, manual, overwrite)
- **Change detection** using timestamp-based tracking
- **Performance monitoring** with detailed metrics
- **Error handling** with retry mechanisms
- **Audit trail** for all sync operations

### Conflict Resolution Strategies
1. **Timestamp-based** - Newer changes win
2. **Manual resolution** - User intervention required
3. **Overwrite** - Always prefer one source

## Development

### Project Structure
```
web-app/
├── server/                    # Backend server
│   ├── server.js             # Main server file
│   ├── config/               # Configuration files
│   │   ├── database.js       # Database connection
│   │   └── sync.js          # Sync configuration
│   ├── api/                  # API endpoints
│   ├── sync/                 # Sync engine
│   ├── middleware/           # Express middleware
│   └── models/               # Database models
├── client/                   # Frontend application
│   ├── index.html           # Main HTML file
│   ├── css/                 # Stylesheets
│   ├── js/                  # JavaScript modules
│   │   ├── app.js           # Main application
│   │   ├── auth.js          # Authentication
│   │   ├── sync.js          # Sync module
│   │   └── components/      # Feature components
│   └── assets/              # Static assets
├── package.json             # Dependencies
└── README.md               # This file
```

### Development Commands
```bash
# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Adding New Features

1. **Backend API**
   - Add new endpoint in `/server/api/`
   - Create database model in `/server/models/`
   - Add route in `/server/server.js`

2. **Frontend Components**
   - Create new component in `/client/js/components/`
   - Add HTML structure in `/client/index.html`
   - Add CSS styles in `/client/css/`

3. **Database Changes**
   - Update schema in `/server/config/database.js`
   - Add migration script if needed
   - Update models and API endpoints

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **CORS Protection** - Cross-origin resource sharing control
- **Input Validation** - Comprehensive input sanitization
- **Rate Limiting** - Protection against abuse
- **Helmet.js** - Security headers
- **Password Hashing** - Secure password storage

## Performance Features

- **Database Connection Pooling** - Efficient database connections
- **Caching** - Strategic caching for performance
- **Compression** - Gzip compression for responses
- **CDN Support** - Static asset optimization
- **Lazy Loading** - Component-based loading

## Monitoring and Logging

- **Winston Logging** - Structured logging system
- **Performance Metrics** - Sync and operation metrics
- **Error Tracking** - Comprehensive error handling
- **Health Checks** - Application health monitoring

## Deployment

### Docker Deployment
```bash
# Build Docker image
docker build -t pharmamine-web .

# Run container
docker run -p 3001:3001 pharmamine-web
```

### Production Deployment
1. Set environment variables for production
2. Configure reverse proxy (nginx)
3. Set up SSL/TLS certificates
4. Configure database backups
5. Set up monitoring and logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the code comments

## Future Enhancements

- [ ] Mobile app development
- [ ] Advanced analytics and reporting
- [ ] Integration with payment gateways
- [ ] Multi-store support
- [ ] Advanced inventory forecasting
- [ ] AI-powered recommendations
- [ ] Mobile POS application
- [ ] Advanced CRM features

## Technologies Used

### Backend
- Node.js
- Express.js
- PostgreSQL
- NeDB
- JWT
- Winston
- Helmet
- CORS

### Frontend
- Vanilla JavaScript
- Bootstrap 5
- Font Awesome
- Chart.js
- Fetch API

### Development Tools
- ESLint
- Prettier
- Nodemon
- Docker
- Git

---

**Note**: This web application is designed to work alongside the existing PharmaMine desktop application, providing a modern web interface while maintaining data synchronization between both platforms.
