// Error Handler Middleware for PharmaMine Web Application

const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Handle specific error types
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = [];

  // Handle validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }));
  }

  // Handle duplicate key errors
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry error';
    const field = Object.keys(err.keyPattern)[0];
    errors = [{
      field: field,
      message: `${field} already exists`
    }];
  }

  // Handle cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Handle database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    statusCode = 503;
    message = 'Database connection error';
  }

  // Send error response
  const errorResponse = {
    success: false,
    message: message,
    ...(isDevelopment && { stack: err.stack }),
    ...(errors.length > 0 && { errors: errors })
  };

  res.status(statusCode).json(errorResponse);
};

// 404 handler
const notFoundHandler = (req, res) => {
  logger.warn('404 Not Found:', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  res.status(404).json({
    success: false,
    message: 'Resource not found',
    path: req.originalUrl
  });
};

// Async error handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
