// PharmaMine Demo Mode - Mock Data

// Demo Mode Detection
const demoMode = {
    // Check if demo mode is enabled
    isEnabled: () => {
        return localStorage.getItem('demoMode') === 'true' || 
               window.location.search.includes('demo=true') ||
               window.location.hash.includes('demo');
    },

    // Enable demo mode
    enable: () => {
        localStorage.setItem('demoMode', 'true');
        window.location.hash = '#demo';
    },

    // Disable demo mode
    disable: () => {
        localStorage.removeItem('demoMode');
        if (window.location.hash === '#demo') {
            window.location.hash = '';
        }
    }
};

// Mock Data
const mockData = {
    // User data for demo
    user: {
        id: 1,
        username: 'demo_user',
        fullname: 'Demo User',
        email: 'demo@pharmamine.com',
        role: 'admin'
    },

    // Categories
    categories: [
        { id: 1, name: 'Pain Relief', description: 'Pain relief medications' },
        { id: 2, name: 'Antibiotics', description: 'Antibiotic medications' },
        { id: 3, name: 'Vitamins', description: 'Vitamin supplements' },
        { id: 4, name: 'Cold & Flu', description: 'Cold and flu medications' },
        { id: 5, name: 'Heart Health', description: 'Cardiovascular medications' },
        { id: 6, name: 'Diabetes', description: 'Diabetes medications and supplies' }
    ],

    // Products
    products: [
        {
            id: 1,
            name: 'Paracetamol 500mg',
            category_id: 1,
            category_name: 'Pain Relief',
            price: 5.99,
            quantity: 150,
            min_stock: 20,
            img: 'assets/images/default.jpg',
            description: 'Pain relief and fever reduction',
            barcode: '1234567890123'
        },
        {
            id: 2,
            name: 'Ibuprofen 200mg',
            category_id: 1,
            category_name: 'Pain Relief',
            price: 8.99,
            quantity: 85,
            min_stock: 15,
            img: 'assets/images/default.jpg',
            description: 'Anti-inflammatory pain reliever',
            barcode: '1234567890124'
        },
        {
            id: 3,
            name: 'Amoxicillin 250mg',
            category_id: 2,
            category_name: 'Antibiotics',
            price: 12.99,
            quantity: 45,
            min_stock: 10,
            img: 'assets/images/default.jpg',
            description: 'Broad-spectrum antibiotic',
            barcode: '1234567890125'
        },
        {
            id: 4,
            name: 'Vitamin C 1000mg',
            category_id: 3,
            category_name: 'Vitamins',
            price: 15.99,
            quantity: 120,
            min_stock: 25,
            img: 'assets/images/default.jpg',
            description: 'High-strength vitamin C supplement',
            barcode: '1234567890126'
        },
        {
            id: 5,
            name: 'Vitamin D3 2000 IU',
            category_id: 3,
            category_name: 'Vitamins',
            price: 18.99,
            quantity: 95,
            min_stock: 20,
            img: 'assets/images/default.jpg',
            description: 'Vitamin D3 supplement for bone health',
            barcode: '1234567890127'
        },
        {
            id: 6,
            name: 'Cough Syrup 100ml',
            category_id: 4,
            category_name: 'Cold & Flu',
            price: 9.99,
            quantity: 75,
            min_stock: 15,
            img: 'assets/images/default.jpg',
            description: 'Cough and cold relief syrup',
            barcode: '1234567890128'
        },
        {
            id: 7,
            name: 'Aspirin 325mg',
            category_id: 1,
            category_name: 'Pain Relief',
            price: 6.99,
            quantity: 200,
            min_stock: 30,
            img: 'assets/images/default.jpg',
            description: 'Pain reliever and blood thinner',
            barcode: '1234567890129'
        },
        {
            id: 8,
            name: 'Atorvastatin 20mg',
            category_id: 5,
            category_name: 'Heart Health',
            price: 25.99,
            quantity: 60,
            min_stock: 12,
            img: 'assets/images/default.jpg',
            description: 'Cholesterol lowering medication',
            barcode: '1234567890130'
        },
        {
            id: 9,
            name: 'Metformin 500mg',
            category_id: 6,
            category_name: 'Diabetes',
            price: 14.99,
            quantity: 110,
            min_stock: 20,
            img: 'assets/images/default.jpg',
            description: 'Diabetes medication for blood sugar control',
            barcode: '1234567890131'
        },
        {
            id: 10,
            name: 'Loratadine 10mg',
            category_id: 4,
            category_name: 'Cold & Flu',
            price: 11.99,
            quantity: 90,
            min_stock: 18,
            img: 'assets/images/default.jpg',
            description: 'Antihistamine for allergies',
            barcode: '1234567890132'
        },
        {
            id: 11,
            name: 'Omeprazole 20mg',
            category_id: 1,
            category_name: 'Pain Relief',
            price: 16.99,
            quantity: 70,
            min_stock: 15,
            img: 'assets/images/default.jpg',
            description: 'Proton pump inhibitor for acid reflux',
            barcode: '1234567890133'
        },
        {
            id: 12,
            name: 'Multivitamin Complex',
            category_id: 3,
            category_name: 'Vitamins',
            price: 22.99,
            quantity: 85,
            min_stock: 20,
            img: 'assets/images/default.jpg',
            description: 'Complete multivitamin supplement',
            barcode: '1234567890134'
        }
    ],

    // Customers
    customers: [
        {
            id: 1,
            name: 'John Smith',
            email: 'john.smith@email.com',
            phone: '+1234567890',
            address: '123 Main St, City, State 12345',
            loyalty_tier: 'gold',
            loyalty_points: 450,
            last_purchase: '2026-01-04T14:30:00Z',
            total_purchases: 1250.75,
            join_date: '2025-03-15T10:00:00Z'
        },
        {
            id: 2,
            name: 'Sarah Johnson',
            email: 'sarah.j@email.com',
            phone: '+1234567891',
            address: '456 Oak Ave, City, State 12345',
            loyalty_tier: 'silver',
            loyalty_points: 275,
            last_purchase: '2026-01-03T16:45:00Z',
            total_purchases: 785.50,
            join_date: '2025-05-22T14:30:00Z'
        },
        {
            id: 3,
            name: 'Michael Brown',
            email: 'm.brown@email.com',
            phone: '+1234567892',
            address: '789 Pine Rd, City, State 12345',
            loyalty_tier: 'platinum',
            loyalty_points: 890,
            last_purchase: '2026-01-05T11:20:00Z',
            total_purchases: 2150.25,
            join_date: '2024-11-10T09:15:00Z'
        },
        {
            id: 4,
            name: 'Emily Davis',
            email: 'emily.davis@email.com',
            phone: '+1234567893',
            address: '321 Elm St, City, State 12345',
            loyalty_tier: 'bronze',
            loyalty_points: 125,
            last_purchase: '2026-01-02T13:15:00Z',
            total_purchases: 320.80,
            join_date: '2025-08-05T16:45:00Z'
        },
        {
            id: 5,
            name: 'David Wilson',
            email: 'david.wilson@email.com',
            phone: '+1234567894',
            address: '654 Maple Dr, City, State 12345',
            loyalty_tier: 'gold',
            loyalty_points: 620,
            last_purchase: '2026-01-04T10:30:00Z',
            total_purchases: 1850.90,
            join_date: '2025-01-20T11:00:00Z'
        },
        {
            id: 6,
            name: 'Lisa Anderson',
            email: 'lisa.a@email.com',
            phone: '+1234567895',
            address: '987 Cedar Ln, City, State 12345',
            loyalty_tier: 'silver',
            loyalty_points: 385,
            last_purchase: '2026-01-01T15:45:00Z',
            total_purchases: 920.40,
            join_date: '2025-04-12T13:20:00Z'
        }
    ],

    // Transactions
    transactions: [
        {
            id: 1,
            order_number: 'ORD-2026-001',
            date: '2026-01-05T14:30:00Z',
            customer_id: 3,
            customer_name: 'Michael Brown',
            total: 45.97,
            status: 1,
            payment_method: 'Credit Card',
            items: [
                { product_id: 1, name: 'Paracetamol 500mg', quantity: 2, price: 5.99, total: 11.98 },
                { product_id: 4, name: 'Vitamin C 1000mg', quantity: 1, price: 15.99, total: 15.99 },
                { product_id: 8, name: 'Atorvastatin 20mg', quantity: 1, price: 25.99, total: 25.99 }
            ],
            tax: 3.68,
            discount: 0,
            subtotal: 42.29
        },
        {
            id: 2,
            order_number: 'ORD-2026-002',
            date: '2026-01-05T13:15:00Z',
            customer_id: 1,
            customer_name: 'John Smith',
            total: 26.97,
            status: 1,
            payment_method: 'Cash',
            items: [
                { product_id: 2, name: 'Ibuprofen 200mg', quantity: 3, price: 8.99, total: 26.97 }
            ],
            tax: 2.16,
            discount: 0,
            subtotal: 24.81
        },
        {
            id: 3,
            order_number: 'ORD-2026-003',
            date: '2026-01-05T12:00:00Z',
            customer_id: null,
            customer_name: 'Walk-in Customer',
            total: 15.99,
            status: 1,
            payment_method: 'Debit Card',
            items: [
                { product_id: 4, name: 'Vitamin C 1000mg', quantity: 1, price: 15.99, total: 15.99 }
            ],
            tax: 1.28,
            discount: 0,
            subtotal: 14.71
        },
        {
            id: 4,
            order_number: 'ORD-2026-004',
            date: '2026-01-04T16:45:00Z',
            customer_id: 5,
            customer_name: 'David Wilson',
            total: 51.96,
            status: 1,
            payment_method: 'Credit Card',
            items: [
                { product_id: 6, name: 'Cough Syrup 100ml', quantity: 2, price: 9.99, total: 19.98 },
                { product_id: 10, name: 'Loratadine 10mg', quantity: 1, price: 11.99, total: 11.99 },
                { product_id: 12, name: 'Multivitamin Complex', quantity: 1, price: 22.99, total: 22.99 }
            ],
            tax: 4.16,
            discount: 2.00,
            subtotal: 45.80
        },
        {
            id: 5,
            order_number: 'ORD-2026-005',
            date: '2026-01-04T14:20:00Z',
            customer_id: 2,
            customer_name: 'Sarah Johnson',
            total: 18.98,
            status: 1,
            payment_method: 'Cash',
            items: [
                { product_id: 3, name: 'Amoxicillin 250mg', quantity: 1, price: 12.99, total: 12.99 },
                { product_id: 7, name: 'Aspirin 325mg', quantity: 1, price: 6.99, total: 6.99 }
            ],
            tax: 1.52,
            discount: 0,
            subtotal: 17.46
        },
        {
            id: 6,
            order_number: 'ORD-2026-006',
            date: '2026-01-04T11:30:00Z',
            customer_id: null,
            customer_name: 'Walk-in Customer',
            total: 31.98,
            status: 1,
            payment_method: 'Credit Card',
            items: [
                { product_id: 9, name: 'Metformin 500mg', quantity: 2, price: 14.99, total: 29.98 },
                { product_id: 11, name: 'Omeprazole 20mg', quantity: 1, price: 16.99, total: 16.99 }
            ],
            tax: 5.04,
            discount: 0,
            subtotal: 46.97
        },
        {
            id: 7,
            order_number: 'ORD-2026-007',
            date: '2026-01-03T15:45:00Z',
            customer_id: 6,
            customer_name: 'Lisa Anderson',
            total: 22.98,
            status: 1,
            payment_method: 'Debit Card',
            items: [
                { product_id: 5, name: 'Vitamin D3 2000 IU', quantity: 1, price: 18.99, total: 18.99 },
                { product_id: 7, name: 'Aspirin 325mg', quantity: 1, price: 6.99, total: 6.99 }
            ],
            tax: 2.07,
            discount: 1.00,
            subtotal: 21.91
        },
        {
            id: 8,
            order_number: 'ORD-2026-008',
            date: '2026-01-03T10:15:00Z',
            customer_id: 4,
            customer_name: 'Emily Davis',
            total: 14.98,
            status: 1,
            payment_method: 'Cash',
            items: [
                { product_id: 2, name: 'Ibuprofen 200mg', quantity: 1, price: 8.99, total: 8.99 },
                { product_id: 6, name: 'Cough Syrup 100ml', quantity: 1, price: 9.99, total: 9.99 }
            ],
            tax: 1.51,
            discount: 0,
            subtotal: 13.47
        }
    ],

    // Sync status
    syncStatus: {
        isRunning: false,
        status: 'online',
        lastSync: '2026-01-05T18:30:00Z',
        nextSync: '2026-01-05T18:45:00Z',
        changes: 0
    }
};

// Mock API responses
const mockApiResponses = {
    // Authentication
    'auth/me': () => ({
        success: true,
        data: mockData.user
    }),

    'auth/login': () => ({
        success: true,
        data: {
            token: 'demo_token_123',
            user: mockData.user
        }
    }),

    'auth/register': () => ({
        success: true,
        message: 'Registration successful!'
    }),

    // Inventory
    'inventory/products': () => ({
        success: true,
        data: mockData.products
    }),

    'inventory/categories': () => ({
        success: true,
        data: mockData.categories
    }),

    'inventory/search': (params) => {
        const query = params.q || '';
        const filteredProducts = mockData.products.filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.description.toLowerCase().includes(query.toLowerCase())
        );
        return {
            success: true,
            data: filteredProducts
        };
    },

    // Customers
    'customers/all': () => ({
        success: true,
        data: mockData.customers
    }),

    'customers/search': (params) => {
        const query = params.q || '';
        const filteredCustomers = mockData.customers.filter(customer => 
            customer.name.toLowerCase().includes(query.toLowerCase()) ||
            customer.email.toLowerCase().includes(query.toLowerCase())
        );
        return {
            success: true,
            data: filteredCustomers
        };
    },

    // Transactions
    'transactions/all': () => ({
        success: true,
        data: mockData.transactions
    }),

    // Sync
    'sync/status': () => ({
        success: true,
        data: mockData.syncStatus
    }),

    'sync/trigger': () => ({
        success: true,
        message: 'Sync completed'
    }),

    // Inventory exports
    'inventory/export/csv': () => ({
        success: true,
        data: 'Product Name,Category,Price,Stock\nParacetamol 500mg,Pain Relief,5.99,150\nIbuprofen 200mg,Pain Relief,8.99,85\nAmoxicillin 250mg,Antibiotics,12.99,45\nVitamin C 1000mg,Vitamins,15.99,120\nVitamin D3 2000 IU,Vitamins,18.99,95'
    }),

    // Transaction exports
    'transactions/export/csv': () => ({
        success: true,
        data: 'Order Number,Date,Customer,Total,Status\nORD-2026-001,2026-01-05,Michael Brown,45.97,Completed\nORD-2026-002,2026-01-05,John Smith,26.97,Completed\nORD-2026-003,2026-01-05,Walk-in Customer,15.99,Completed\nORD-2026-004,2026-01-04,David Wilson,51.96,Completed'
    })
};

// Demo mode API override
const demoApi = {
    // Override fetch API for demo mode
    setup: () => {
        if (!demoMode.isEnabled()) return;

        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            // Parse URL and determine endpoint
            const urlObj = new URL(url, window.location.origin);
            let endpoint = urlObj.pathname.replace('/api/', '');
            
            // Handle query parameters
            const params = {};
            urlObj.searchParams.forEach((value, key) => {
                params[key] = value;
            });

            // Check if this endpoint has mock data
            if (mockApiResponses[endpoint]) {
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 200));
                
                const response = mockApiResponses[endpoint](params);
                return {
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(response)
                };
            }

            // For POST, PUT, DELETE operations in demo mode, return success
            if (options.method && options.method !== 'GET') {
                await new Promise(resolve => setTimeout(resolve, 300));
                return {
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({
                        success: true,
                        message: 'Demo mode: Operation simulated successfully'
                    })
                };
            }

            // Fallback to original fetch for unmapped endpoints
            return originalFetch(url, options);
        };
    },

    // Get fallback data for failed requests (used for 401 error handling)
    getFallbackData: (endpoint) => {
        console.log(`🎭 Providing demo fallback data for: ${endpoint}`);
        
        // Extract endpoint name from path
        const endpointPath = endpoint.split('/').pop();
        
        // Map endpoints to demo data
        switch(endpointPath) {
            case 'all':
            case 'customers':
                return { success: true, data: mockData.customers };
            case 'products':
            case 'inventory':
                return { success: true, data: mockData.products };
            case 'transactions':
                return { success: true, data: mockData.transactions };
            case 'categories':
                return { success: true, data: mockData.categories };
            case 'status':
                return { success: true, data: mockData.syncStatus };
            default:
                // For other endpoints, provide empty arrays
                return { 
                    success: true, 
                    data: Array.isArray(mockData.products) ? [] : [] 
                };
        }
    },

    // Clean up demo API override
    cleanup: () => {
        if (window.fetch && window.fetch.toString().includes('demoApi')) {
            // This is a simplified cleanup - in real implementation you'd store the original
            console.log('Demo API cleanup would happen here');
        }
    }
};

// Make demo utilities globally available
window.demoMode = demoMode;
window.mockData = mockData;
window.mockApiResponses = mockApiResponses;
window.demoApi = demoApi;