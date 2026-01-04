// Validation Middleware for PharmaMine Web Application

const { body, validationResult } = require('express-validator');

// Validation rules for user registration
const validateRegistration = [
    body('username')
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    // Custom validation middleware to check for validation errors
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array().map(error => ({
                    field: error.param,
                    message: error.msg
                }))
            });
        }
        next();
    }
];

// Validation rules for user login
const validateLogin = [
    body('username')
        .notEmpty()
        .withMessage('Username or email is required')
        .isLength({ max: 100 })
        .withMessage('Username/email cannot exceed 100 characters'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ max: 100 })
        .withMessage('Password cannot exceed 100 characters'),
    
    // Custom validation middleware to check for validation errors
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array().map(error => ({
                    field: error.param,
                    message: error.msg
                }))
            });
        }
        next();
    }
];

// Validation rules for changing password
const validateChangePassword = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    // Custom validation middleware to check for validation errors
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array().map(error => ({
                    field: error.param,
                    message: error.msg
                }))
            });
        }
        next();
    }
];

// Validation rules for product creation/update
const validateProduct = [
    body('name')
        .isLength({ min: 1, max: 255 })
        .withMessage('Product name is required and cannot exceed 255 characters'),
    
    body('price')
        .isNumeric()
        .withMessage('Price must be a valid number')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    
    body('quantity')
        .isInt({ min: 0 })
        .withMessage('Quantity must be a non-negative integer'),
    
    body('category_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Category ID must be a positive integer'),
    
    body('barcode')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Barcode cannot exceed 100 characters'),
    
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    
    // Custom validation middleware
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array().map(error => ({
                    field: error.param,
                    message: error.msg
                }))
            });
        }
        next();
    }
];

// Validation rules for customer creation/update
const validateCustomer = [
    body('name')
        .isLength({ min: 1, max: 255 })
        .withMessage('Customer name is required and cannot exceed 255 characters'),
    
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('phone')
        .optional()
        .isLength({ max: 20 })
        .withMessage('Phone number cannot exceed 20 characters')
        .matches(/^[0-9+\-\s()]+$/)
        .withMessage('Please provide a valid phone number'),
    
    body('address')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Address cannot exceed 500 characters'),
    
    body('loyalty_tier')
        .optional()
        .isIn(['bronze', 'silver', 'gold', 'platinum', 'diamond'])
        .withMessage('Invalid loyalty tier'),
    
    body('loyalty_points')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Loyalty points must be a non-negative integer'),
    
    // Custom validation middleware
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array().map(error => ({
                    field: error.param,
                    message: error.msg
                }))
            });
        }
        next();
    }
];

// Validation rules for transaction creation
const validateTransaction = [
    body('order_number')
        .isLength({ min: 1, max: 100 })
        .withMessage('Order number is required and cannot exceed 100 characters'),
    
    body('customer_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Customer ID must be a positive integer'),
    
    body('items')
        .isArray({ min: 1 })
        .withMessage('At least one item is required'),
    
    body('items.*.id')
        .isInt({ min: 1 })
        .withMessage('Item ID must be a positive integer'),
    
    body('items.*.name')
        .isLength({ min: 1, max: 255 })
        .withMessage('Item name is required and cannot exceed 255 characters'),
    
    body('items.*.price')
        .isNumeric()
        .withMessage('Item price must be a valid number')
        .isFloat({ min: 0 })
        .withMessage('Item price must be a positive number'),
    
    body('items.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Item quantity must be a positive integer'),
    
    body('subtotal')
        .isNumeric()
        .withMessage('Subtotal must be a valid number')
        .isFloat({ min: 0 })
        .withMessage('Subtotal must be a positive number'),
    
    body('discount')
        .optional()
        .isNumeric()
        .withMessage('Discount must be a valid number')
        .isFloat({ min: 0 })
        .withMessage('Discount must be a non-negative number'),
    
    body('tax')
        .isNumeric()
        .withMessage('Tax must be a valid number')
        .isFloat({ min: 0 })
        .withMessage('Tax must be a non-negative number'),
    
    body('total')
        .isNumeric()
        .withMessage('Total must be a valid number')
        .isFloat({ min: 0 })
        .withMessage('Total must be a positive number'),
    
    body('payment_type')
        .isIn(['cash', 'card', 'upi', 'credit'])
        .withMessage('Invalid payment type'),
    
    body('payment_amount')
        .isNumeric()
        .withMessage('Payment amount must be a valid number')
        .isFloat({ min: 0 })
        .withMessage('Payment amount must be a non-negative number'),
    
    // Custom validation middleware
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array().map(error => ({
                    field: error.param,
                    message: error.msg
                }))
            });
        }
        next();
    }
];

module.exports = {
    validateRegistration,
    validateLogin,
    validateChangePassword,
    validateProduct,
    validateCustomer,
    validateTransaction
};
