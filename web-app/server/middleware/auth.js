// Authentication Middleware for PharmaMine Web Application

const jwt = require('jsonwebtoken');

// Authenticate JWT token middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        
        req.userId = user.userId;
        req.username = user.username;
        next();
    });
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // Continue without authentication
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (!err) {
            req.userId = user.userId;
            req.username = user.username;
        }
        next();
    });
};

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
    // For now, we'll assume all authenticated users have admin access
    // In a full implementation, you would check user roles/permissions
    if (!req.userId) {
        return res.status(401).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

// Check if user is authenticated (for optional routes)
const isAuthenticated = (req) => {
    return !!req.userId;
};

module.exports = {
    authenticateToken,
    optionalAuth,
    requireAdmin,
    isAuthenticated
};
