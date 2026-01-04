const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const async = require("async");
const path = require("path");
const validator = require("validator");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

// Database paths
const dbPaths = {
    customerPreferences: path.join(appData, appName, "server", "databases", "customer_preferences.db"),
    customerBehavior: path.join(appData, appName, "server", "databases", "customer_behavior.db"),
    customerSegments: path.join(appData, appName, "server", "databases", "customer_segments.db"),
    giftPreferences: path.join(appData, appName, "server", "databases", "gift_preferences.db"),
    privacySettings: path.join(appData, appName, "server", "databases", "privacy_settings.db")
};

// Initialize databases
let customerPreferencesDB = getDatabase(dbPaths.customerPreferences);
let customerBehaviorDB = getDatabase(dbPaths.customerBehavior);
let customerSegmentsDB = getDatabase(dbPaths.customerSegments);
let giftPreferencesDB = getDatabase(dbPaths.giftPreferences);
let privacySettingsDB = getDatabase(dbPaths.privacySettings);

// Ensure indexes
customerPreferencesDB.ensureIndex({ fieldName: "_id", unique: true });
customerBehaviorDB.ensureIndex({ fieldName: "_id", unique: true });
customerSegmentsDB.ensureIndex({ fieldName: "_id", unique: true });
giftPreferencesDB.ensureIndex({ fieldName: "_id", unique: true });
privacySettingsDB.ensureIndex({ fieldName: "_id", unique: true });

/**
 * GET endpoint: Get the welcome message for the Customer Preferences API.
 */
app.get("/", function (req, res) {
    res.send("Customer Preferences API - Customer Intelligence Engine");
});

/**
 * POST endpoint: Track customer behavior and update preferences
 */
app.post("/track-behavior", async function (req, res) {
    try {
        const behaviorData = req.body;
        
        // Validate required fields
        if (!behaviorData.customerId || !behaviorData.action) {
            return res.status(400).json({
                error: "Bad Request",
                message: "customerId and action are required"
            });
        }

        // Add timestamp and session info
        behaviorData.timestamp = new Date().toISOString();
        behaviorData.sessionId = req.headers['x-session-id'] || 'unknown';
        
        // Insert behavior tracking record
        await new Promise((resolve, reject) => {
            customerBehaviorDB.insert(behaviorData, function (err, result) {
                if (err) reject(err);
                else resolve(result);
            });
        });

        // Update customer preferences based on behavior
        await updateCustomerPreferences(behaviorData);
        
        res.sendStatus(200);
    } catch (error) {
        console.error("Error tracking behavior:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to track customer behavior"
        });
    }
});

/**
 * GET endpoint: Get customer preferences by customer ID
 */
app.get("/preferences/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    
    customerPreferencesDB.findOne({ customerId: customerId }, function (err, preferences) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve preferences"
            });
        } else {
            res.send(preferences || {});
        }
    });
});

/**
 * POST endpoint: Set customer preferences manually
 */
app.post("/preferences/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    const preferences = req.body;
    
    preferences.customerId = customerId;
    preferences.lastUpdated = new Date().toISOString();
    
    customerPreferencesDB.update(
        { customerId: customerId },
        preferences,
        { upsert: true },
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to update preferences"
                });
            } else {
                res.sendStatus(200);
            }
        }
    );
});

/**
 * POST endpoint: Set garment-specific size preferences
 */
app.post("/sizes/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    const sizePreferences = req.body;
    
    sizePreferences.customerId = customerId;
    sizePreferences.lastUpdated = new Date().toISOString();
    
    customerPreferencesDB.update(
        { customerId: customerId },
        { $set: { sizePreferences: sizePreferences } },
        { upsert: true },
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to update size preferences"
                });
            } else {
                res.sendStatus(200);
            }
        }
    );
});

/**
 * POST endpoint: Update color preferences based on purchase history
 */
app.post("/colors/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    const colorPreferences = req.body;
    
    colorPreferences.customerId = customerId;
    colorPreferences.lastUpdated = new Date().toISOString();
    
    customerPreferencesDB.update(
        { customerId: customerId },
        { $set: { colorPreferences: colorPreferences } },
        { upsert: true },
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to update color preferences"
                });
            } else {
                res.sendStatus(200);
            }
        }
    );
});

/**
 * GET endpoint: Get garment size recommendations for a customer
 */
app.get("/sizes/:customerId/recommendations", function (req, res) {
    const customerId = req.params.customerId;
    const productCategory = req.query.category || 'general';
    
    generateSizeRecommendations(customerId, productCategory, function(err, recommendations) {
        if (err) {
            console.error("Error generating size recommendations:", err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate size recommendations"
            });
        } else {
            res.send(recommendations);
        }
    });
});

/**
 * GET endpoint: Get color recommendations for a customer
 */
app.get("/colors/:customerId/recommendations", function (req, res) {
    const customerId = req.params.customerId;
    const productCategory = req.query.category || 'general';
    
    generateColorRecommendations(customerId, productCategory, function(err, recommendations) {
        if (err) {
            console.error("Error generating color recommendations:", err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate color recommendations"
            });
        } else {
            res.send(recommendations);
        }
    });
});

/**
 * POST endpoint: Analyze purchase history for size/color preferences
 */
app.post("/analyze/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    
    analyzePurchaseHistoryForPreferences(customerId, function(err, analysis) {
        if (err) {
            console.error("Error analyzing purchase history:", err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to analyze purchase history"
            });
        } else {
            res.send(analysis);
        }
    });
});

/**
 * GET endpoint: Get quick selection data for POS
 */
app.get("/quick-selection/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    const productCategory = req.query.category;
    
    generateQuickSelectionData(customerId, productCategory, function(err, quickData) {
        if (err) {
            console.error("Error generating quick selection data:", err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate quick selection data"
            });
        } else {
            res.send(quickData);
        }
    });
});

/**
 * POST endpoint: Track size/color selection for learning
 */
app.post("/track-selection", function (req, res) {
    const selectionData = req.body;
    
    // Validate required fields
    if (!selectionData.customerId || !selectionData.productId || !selectionData.size || !selectionData.color) {
        return res.status(400).json({
            error: "Bad Request",
            message: "customerId, productId, size, and color are required"
        });
    }
    
    selectionData.timestamp = new Date().toISOString();
    
    // Store selection data
    customerBehaviorDB.insert(selectionData, function (err, result) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to track selection"
            });
        } else {
            // Update preferences based on selection
            updatePreferencesFromSelection(selectionData);
            res.sendStatus(200);
        }
    });
});

/**
 * GET endpoint: Get customer behavior history
 */
app.get("/behavior/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    const limit = parseInt(req.query.limit) || 100;
    
    customerBehaviorDB.find({ customerId: customerId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec(function (err, behaviors) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to retrieve behavior history"
                });
            } else {
                res.send(behaviors);
            }
        });
});

/**
 * GET endpoint: Get customer segmentation data
 */
app.get("/segments/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    
    customerSegmentsDB.findOne({ customerId: customerId }, function (err, segment) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve segment data"
            });
        } else {
            res.send(segment || {});
        }
    });
});

/**
 * POST endpoint: Generate customer segmentation
 */
app.post("/segment", function (req, res) {
    const customerId = req.body.customerId;
    
    if (!customerId) {
        return res.status(400).json({
            error: "Bad Request",
            message: "customerId is required"
        });
    }
    
    // Generate segmentation based on customer data
    generateCustomerSegmentation(customerId, function(err, segment) {
        if (err) {
            console.error("Error generating segmentation:", err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate segmentation"
            });
        } else {
            res.send(segment);
        }
    });
});

/**
 * GET endpoint: Get personalized recommendations
 */
app.get("/recommendations/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    const limit = parseInt(req.query.limit) || 10;
    
    generateRecommendations(customerId, limit, function(err, recommendations) {
        if (err) {
            console.error("Error generating recommendations:", err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate recommendations"
            });
        } else {
            res.send(recommendations);
        }
    });
});

/**
 * POST endpoint: Track gift preferences and patterns
 */
app.post("/gift-preferences", function (req, res) {
    const giftData = req.body;
    
    giftData.timestamp = new Date().toISOString();
    
    giftPreferencesDB.insert(giftData, function (err, result) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to track gift preferences"
            });
        } else {
            res.sendStatus(200);
        }
    });
});

/**
 * GET endpoint: Get gift preferences
 */
app.get("/gift-preferences/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    
    giftPreferencesDB.find({ customerId: customerId }, function (err, preferences) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve gift preferences"
            });
        } else {
            res.send(preferences);
        }
    });
});

/**
 * POST endpoint: Set privacy preferences
 */
app.post("/privacy/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    const privacySettings = req.body;
    
    privacySettings.customerId = customerId;
    privacySettings.lastUpdated = new Date().toISOString();
    
    privacySettingsDB.update(
        { customerId: customerId },
        privacySettings,
        { upsert: true },
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to update privacy settings"
                });
            } else {
                res.sendStatus(200);
            }
        }
    );
});

/**
 * GET endpoint: Get privacy preferences
 */
app.get("/privacy/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    
    privacySettingsDB.findOne({ customerId: customerId }, function (err, settings) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve privacy settings"
            });
        } else {
            res.send(settings || {
                dataCollection: true,
                personalization: true,
                analytics: true,
                marketing: false,
                retentionPeriod: '24' // months
            });
        }
    });
});

/**
 * GET endpoint: Customer analytics and insights
 */
app.get("/analytics/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    
    generateCustomerAnalytics(customerId, function(err, analytics) {
        if (err) {
            console.error("Error generating analytics:", err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to generate analytics"
            });
        } else {
            res.send(analytics);
        }
    });
});

/**
 * Utility function to update customer preferences based on behavior
 */
async function updateCustomerPreferences(behaviorData) {
    return new Promise((resolve, reject) => {
        const customerId = behaviorData.customerId;
        
        // Get current preferences
        customerPreferencesDB.findOne({ customerId: customerId }, function (err, currentPrefs) {
            if (err) return reject(err);
            
            let preferences = currentPrefs || { customerId: customerId };
            preferences.lastUpdated = new Date().toISOString();
            
            // Update preferences based on behavior
            switch (behaviorData.action) {
                case 'purchase':
                    preferences = updatePurchasePreferences(preferences, behaviorData);
                    break;
                case 'view':
                    preferences = updateViewPreferences(preferences, behaviorData);
                    break;
                case 'search':
                    preferences = updateSearchPreferences(preferences, behaviorData);
                    break;
                case 'add_to_cart':
                    preferences = updateCartPreferences(preferences, behaviorData);
                    break;
            }
            
            // Update in database
            customerPreferencesDB.update(
                { customerId: customerId },
                preferences,
                { upsert: true },
                function (err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    });
}

/**
 * Update purchase-related preferences
 */
function updatePurchasePreferences(preferences, behaviorData) {
    if (!preferences.purchaseHistory) preferences.purchaseHistory = [];
    
    preferences.purchaseHistory.push({
        productId: behaviorData.productId,
        category: behaviorData.category,
        price: behaviorData.price,
        timestamp: behaviorData.timestamp,
        // Add garment-specific data
        size: behaviorData.size || null,
        color: behaviorData.color || null,
        variant: behaviorData.variant || null
    });
    
    // Update category preferences
    if (!preferences.categories) preferences.categories = {};
    preferences.categories[behaviorData.category] = 
        (preferences.categories[behaviorData.category] || 0) + 1;
    
    // Update price range preferences
    if (!preferences.priceRanges) preferences.priceRanges = {};
    const priceRange = getPriceRange(behaviorData.price);
    preferences.priceRanges[priceRange] = 
        (preferences.priceRanges[priceRange] || 0) + 1;
    
    // Update seasonal preferences
    if (!preferences.seasonal) preferences.seasonal = {};
    const season = getSeason(new Date());
    preferences.seasonal[season] = 
        (preferences.seasonal[season] || 0) + 1;
    
    // Update garment-specific preferences
    if (behaviorData.size) {
        if (!preferences.sizePreferences) preferences.sizePreferences = {};
        if (!preferences.sizePreferences[behaviorData.category]) {
            preferences.sizePreferences[behaviorData.category] = {};
        }
        preferences.sizePreferences[behaviorData.category][behaviorData.size] = 
            (preferences.sizePreferences[behaviorData.category][behaviorData.size] || 0) + 1;
    }
    
    if (behaviorData.color) {
        if (!preferences.colorPreferences) preferences.colorPreferences = {};
        preferences.colorPreferences[behaviorData.color] = 
            (preferences.colorPreferences[behaviorData.color] || 0) + 1;
    }
    
    return preferences;
}

/**
 * Update view-related preferences
 */
function updateViewPreferences(preferences, behaviorData) {
    if (!preferences.viewHistory) preferences.viewHistory = [];
    
    preferences.viewHistory.push({
        productId: behaviorData.productId,
        category: behaviorData.category,
        timestamp: behaviorData.timestamp,
        duration: behaviorData.duration || 0
    });
    
    return preferences;
}

/**
 * Update search-related preferences
 */
function updateSearchPreferences(preferences, behaviorData) {
    if (!preferences.searchTerms) preferences.searchTerms = {};
    
    if (behaviorData.searchTerms) {
        behaviorData.searchTerms.forEach(term => {
            preferences.searchTerms[term] = 
                (preferences.searchTerms[term] || 0) + 1;
        });
    }
    
    return preferences;
}

/**
 * Update cart-related preferences
 */
function updateCartPreferences(preferences, behaviorData) {
    if (!preferences.cartHistory) preferences.cartHistory = [];
    
    preferences.cartHistory.push({
        productId: behaviorData.productId,
        category: behaviorData.category,
        timestamp: behaviorData.timestamp
    });
    
    return preferences;
}

/**
 * Generate customer segmentation
 */
function generateCustomerSegmentation(customerId, callback) {
    async.parallel([
        // Get behavior data
        function(callback) {
            customerBehaviorDB.find({ customerId: customerId }, function(err, behaviors) {
                callback(err, behaviors);
            });
        },
        // Get preferences
        function(callback) {
            customerPreferencesDB.findOne({ customerId: customerId }, function(err, prefs) {
                callback(err, prefs);
            });
        }
    ], function(err, results) {
        if (err) return callback(err);
        
        const [behaviors, preferences] = results;
        const segment = {
            customerId: customerId,
            segments: {},
            lastUpdated: new Date().toISOString()
        };
        
        // Calculate frequency segment
        const purchaseFrequency = behaviors.filter(b => b.action === 'purchase').length;
        if (purchaseFrequency >= 20) {
            segment.segments.frequency = 'high';
        } else if (purchaseFrequency >= 5) {
            segment.segments.frequency = 'medium';
        } else {
            segment.segments.frequency = 'low';
        }
        
        // Calculate value segment
        const totalValue = behaviors
            .filter(b => b.action === 'purchase')
            .reduce((sum, b) => sum + (b.price || 0), 0);
        
        if (totalValue >= 10000) {
            segment.segments.value = 'high';
        } else if (totalValue >= 2000) {
            segment.segments.value = 'medium';
        } else {
            segment.segments.value = 'low';
        }
        
        // Calculate loyalty segment
        const daysSinceFirstPurchase = behaviors.length > 0 ? 
            Math.floor((new Date() - new Date(behaviors[behaviors.length - 1].timestamp)) / (1000 * 60 * 60 * 24)) : 0;
        
        if (daysSinceFirstPurchase < 30) {
            segment.segments.loyalty = 'new';
        } else if (daysSinceFirstPurchase < 180) {
            segment.segments.loyalty = 'growing';
        } else {
            segment.segments.loyalty = 'at-risk';
        }
        
        // Save segmentation
        customerSegmentsDB.update(
            { customerId: customerId },
            segment,
            { upsert: true },
            function(err) {
                callback(err, segment);
            }
        );
    });
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(customerId, limit, callback) {
    customerPreferencesDB.findOne({ customerId: customerId }, function(err, preferences) {
        if (err) return callback(err);
        
        const recommendations = {
            customerId: customerId,
            products: [],
            generatedAt: new Date().toISOString()
        };
        
        if (!preferences) {
            return callback(null, recommendations);
        }
        
        // Generate product recommendations based on preferences
        const topCategories = Object.entries(preferences.categories || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([category]) => category);
        
        const preferredPriceRange = Object.entries(preferences.priceRanges || {})
            .sort((a, b) => b[1] - a[1])[0]?.[0];
        
        // Simulate product recommendations (in real implementation, query product database)
        recommendations.products = [
            {
                productId: 'rec_' + Date.now(),
                category: topCategories[0] || 'general',
                reason: 'Based on your purchase history in ' + (topCategories[0] || 'general'),
                confidence: 0.85,
                priceRange: preferredPriceRange || 'medium'
            }
        ].slice(0, limit);
        
        callback(null, recommendations);
    });
}

/**
 * Generate customer analytics
 */
function generateCustomerAnalytics(customerId, callback) {
    async.parallel([
        function(callback) {
            customerBehaviorDB.find({ customerId: customerId }, function(err, behaviors) {
                callback(err, behaviors);
            });
        },
        function(callback) {
            customerSegmentsDB.findOne({ customerId: customerId }, function(err, segment) {
                callback(err, segment);
            });
        }
    ], function(err, results) {
        if (err) return callback(err);
        
        const [behaviors, segment] = results;
        const analytics = {
            customerId: customerId,
            totalPurchases: behaviors.filter(b => b.action === 'purchase').length,
            totalSpent: behaviors
                .filter(b => b.action === 'purchase')
                .reduce((sum, b) => sum + (b.price || 0), 0),
            averageOrderValue: 0,
            lastPurchaseDate: null,
            preferredCategories: [],
            segments: segment?.segments || {},
            lifetimeValue: 0,
            churnRisk: 0,
            generatedAt: new Date().toISOString()
        };
        
        // Calculate average order value
        const purchases = behaviors.filter(b => b.action === 'purchase');
        if (purchases.length > 0) {
            analytics.averageOrderValue = analytics.totalSpent / purchases.length;
            analytics.lastPurchaseDate = purchases[purchases.length - 1].timestamp;
        }
        
        // Get preferred categories
        if (preferences) {
            analytics.preferredCategories = Object.entries(preferences.categories || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([category, count]) => ({ category, count }));
        }
        
        callback(null, analytics);
    });
}

/**
 * Helper functions
 */
function getPriceRange(price) {
    if (price < 500) return 'low';
    if (price < 2000) return 'medium';
    if (price < 5000) return 'high';
    return 'premium';
}

function getSeason(date) {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
}

/**
 * Generate size recommendations based on purchase history and preferences
 */
function generateSizeRecommendations(customerId, productCategory, callback) {
    customerPreferencesDB.findOne({ customerId: customerId }, function(err, preferences) {
        if (err) return callback(err);
        
        const recommendations = {
            customerId: customerId,
            category: productCategory,
            recommendedSizes: [],
            confidence: 0,
            reasoning: [],
            generatedAt: new Date().toISOString()
        };
        
        if (!preferences || !preferences.sizePreferences) {
            recommendations.recommendedSizes = ['S', 'M', 'L', 'XL']; // Default fallback
            recommendations.confidence = 0.1;
            recommendations.reasoning.push('No size history available - showing all common sizes');
            return callback(null, recommendations);
        }
        
        const categorySizes = preferences.sizePreferences[productCategory] || {};
        const allSizes = preferences.sizePreferences['all'] || {};
        
        // Get most frequent sizes for the category
        const categoryTopSizes = Object.entries(categorySizes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([size]) => size);
        
        // Get most frequent sizes overall
        const overallTopSizes = Object.entries(allSizes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([size]) => size);
        
        // Combine and prioritize
        const combinedSizes = [...categoryTopSizes, ...overallTopSizes]
            .filter((size, index, array) => array.indexOf(size) === index);
        
        recommendations.recommendedSizes = combinedSizes.slice(0, 3);
        recommendations.confidence = categoryTopSizes.length > 0 ? 0.8 : 0.5;
        
        if (categoryTopSizes.length > 0) {
            recommendations.reasoning.push(`Frequently purchased in ${productCategory}: ${categoryTopSizes.join(', ')}`);
        }
        
        if (overallTopSizes.length > 0 && overallTopSizes !== categoryTopSizes) {
            recommendations.reasoning.push(`Overall preference: ${overallTopSizes.join(', ')}`);
        }
        
        callback(null, recommendations);
    });
}

/**
 * Generate color recommendations based on purchase history and preferences
 */
function generateColorRecommendations(customerId, productCategory, callback) {
    customerPreferencesDB.findOne({ customerId: customerId }, function(err, preferences) {
        if (err) return callback(err);
        
        const recommendations = {
            customerId: customerId,
            category: productCategory,
            recommendedColors: [],
            confidence: 0,
            reasoning: [],
            generatedAt: new Date().toISOString()
        };
        
        if (!preferences || !preferences.colorPreferences) {
            recommendations.recommendedColors = ['Black', 'Blue', 'White', 'Grey']; // Default fallback
            recommendations.confidence = 0.1;
            recommendations.reasoning.push('No color history available - showing popular colors');
            return callback(null, recommendations);
        }
        
        // Get most frequent colors
        const topColors = Object.entries(preferences.colorPreferences)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([color]) => color);
        
        recommendations.recommendedColors = topColors;
        recommendations.confidence = topColors.length > 0 ? 0.75 : 0.3;
        
        if (topColors.length > 0) {
            recommendations.reasoning.push(`Frequently purchased colors: ${topColors.join(', ')}`);
            
            // Add category-specific reasoning if available
            if (productCategory !== 'general') {
                recommendations.reasoning.push(`Based on your ${productCategory} purchases`);
            }
        }
        
        callback(null, recommendations);
    });
}

/**
 * Analyze purchase history to extract size and color preferences
 */
function analyzePurchaseHistoryForPreferences(customerId, callback) {
    const transactionsDB = getDatabase(path.join(process.env.APPDATA, process.env.APPNAME, "server", "databases", "transactions.db"));
    
    // Get recent transactions with garment data
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    transactionsDB.find({
        date: { $gte: threeMonthsAgo.toISOString() },
        status: 1,
        $or: [
            { 'items.variant_data': { $exists: true } },
            { 'items.is_variant': true }
        ]
    }, function(err, transactions) {
        if (err) return callback(err);
        
        const analysis = {
            customerId: customerId,
            period: '3_months',
            totalPurchases: 0,
            sizeAnalysis: {},
            colorAnalysis: {},
            categoryPreferences: {},
            trends: {},
            generatedAt: new Date().toISOString()
        };
        
        if (!transactions || transactions.length === 0) {
            analysis.message = 'No recent garment purchases found';
            return callback(null, analysis);
        }
        
        let totalGarmentPurchases = 0;
        const sizeCounts = {};
        const colorCounts = {};
        const categoryCounts = {};
        
        transactions.forEach(transaction => {
            if (transaction.items && Array.isArray(transaction.items)) {
                transaction.items.forEach(item => {
                    // Check if item has variant data (garment with size/color)
                    if (item.variant_data || item.is_variant) {
                        totalGarmentPurchases++;
                        
                        const category = item.category || 'general';
                        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                        
                        // Extract size and color from variant data
                        const variantData = item.variant_data;
                        if (variantData) {
                            const size = variantData.size;
                            const color = variantData.color;
                            
                            if (size) {
                                if (!sizeCounts[category]) sizeCounts[category] = {};
                                sizeCounts[category][size] = (sizeCounts[category][size] || 0) + 1;
                            }
                            
                            if (color) {
                                colorCounts[color] = (colorCounts[color] || 0) + 1;
                            }
                        }
                    }
                });
            }
        });
        
        analysis.totalPurchases = totalGarmentPurchases;
        analysis.sizeAnalysis = sizeCounts;
        analysis.colorAnalysis = colorCounts;
        analysis.categoryPreferences = categoryCounts;
        
        // Calculate trends and insights
        analysis.insights = [];
        
        if (totalGarmentPurchases > 0) {
            // Most popular category
            const topCategory = Object.entries(categoryCounts)
                .sort((a, b) => b[1] - a[1])[0];
            if (topCategory) {
                analysis.insights.push(`Most purchased category: ${topCategory[0]} (${topCategory[1]} items)`);
            }
            
            // Most popular size overall
            const allSizes = {};
            Object.values(sizeCounts).forEach(categorySizes => {
                Object.entries(categorySizes).forEach(([size, count]) => {
                    allSizes[size] = (allSizes[size] || 0) + count;
                });
            });
            
            const topSize = Object.entries(allSizes)
                .sort((a, b) => b[1] - a[1])[0];
            if (topSize) {
                analysis.insights.push(`Most purchased size: ${topSize[0]} (${topSize[1]} times)`);
            }
            
            // Most popular color
            const topColor = Object.entries(colorCounts)
                .sort((a, b) => b[1] - a[1])[0];
            if (topColor) {
                analysis.insights.push(`Most purchased color: ${topColor[0]} (${topColor[1]} times)`);
            }
        }
        
        callback(null, analysis);
    });
}

/**
 * Generate quick selection data for POS interface
 */
function generateQuickSelectionData(customerId, productCategory, callback) {
    customerPreferencesDB.findOne({ customerId: customerId }, function(err, preferences) {
        if (err) return callback(err);
        
        const quickData = {
            customerId: customerId,
            category: productCategory,
            quickSizes: [],
            quickColors: [],
            recommendedVariant: null,
            hasPreferences: false,
            generatedAt: new Date().toISOString()
        };
        
        if (!preferences) {
            return callback(null, quickData);
        }
        
        // Get preferred sizes for the category
        const categorySizes = preferences.sizePreferences?.[productCategory] || {};
        const allSizes = preferences.sizePreferences?.['all'] || {};
        
        // Get top 2 sizes for quick selection
        const topSizes = Object.entries({...categorySizes, ...allSizes})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([size]) => size);
        
        quickData.quickSizes = topSizes.length > 0 ? topSizes : ['M', 'L'];
        
        // Get top 3 colors
        const topColors = preferences.colorPreferences ? 
            Object.entries(preferences.colorPreferences)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([color]) => color) : 
            ['Black', 'Blue', 'White'];
        
        quickData.quickColors = topColors;
        
        // Generate recommended variant (most common combination)
        if (quickData.quickSizes.length > 0 && quickData.quickColors.length > 0) {
            quickData.recommendedVariant = {
                size: quickData.quickSizes[0],
                color: quickData.quickColors[0],
                confidence: 0.8
            };
        }
        
        quickData.hasPreferences = 
            (categorySizes && Object.keys(categorySizes).length > 0) ||
            (allSizes && Object.keys(allSizes).length > 0) ||
            (preferences.colorPreferences && Object.keys(preferences.colorPreferences).length > 0);
        
        callback(null, quickData);
    });
}

/**
 * Update preferences based on customer selection
 */
function updatePreferencesFromSelection(selectionData) {
    const customerId = selectionData.customerId;
    
    customerPreferencesDB.findOne({ customerId: customerId }, function(err, preferences) {
        if (err || !preferences) return;
        
        // Update size preferences
        if (selectionData.size) {
            if (!preferences.sizePreferences) preferences.sizePreferences = {};
            if (!preferences.sizePreferences[selectionData.category]) {
                preferences.sizePreferences[selectionData.category] = {};
            }
            preferences.sizePreferences[selectionData.category][selectionData.size] = 
                (preferences.sizePreferences[selectionData.category][selectionData.size] || 0) + 1;
        }
        
        // Update color preferences
        if (selectionData.color) {
            if (!preferences.colorPreferences) preferences.colorPreferences = {};
            preferences.colorPreferences[selectionData.color] = 
                (preferences.colorPreferences[selectionData.color] || 0) + 1;
        }
        
        preferences.lastUpdated = new Date().toISOString();
        
        // Save updated preferences
        customerPreferencesDB.update(
            { customerId: customerId },
            preferences,
            {},
            function(err) {
                if (err) {
                    console.error('Error updating preferences from selection:', err);
                }
            }
        );
    });
}