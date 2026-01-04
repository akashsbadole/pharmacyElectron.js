const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const async = require("async");
const path = require("path");
const validator = require("validator");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;
const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "loyalty.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

let loyaltyDB = getDatabase(path.join(appData, appName, "server", "databases", "loyalty_programs.db"));
let pointsDB = getDatabase(path.join(appData, appName, "server", "databases", "loyalty_points.db"));
let tiersDB = getDatabase(path.join(appData, appName, "server", "databases", "loyalty_tiers.db"));
let referralsDB = getDatabase(path.join(appData, appName, "server", "databases", "loyalty_referrals.db"));

// Ensure indexes
loyaltyDB.ensureIndex({ fieldName: "_id", unique: true });
pointsDB.ensureIndex({ fieldName: "_id", unique: true });
tiersDB.ensureIndex({ fieldName: "_id", unique: true });
referralsDB.ensureIndex({ fieldName: "_id", unique: true });

/**
 * DEFAULT LOYALTY PROGRAM CONFIGURATION
 */
const DEFAULT_TIERS = {
    bronze: {
        name: "Bronze",
        minSpend: 0,
        minPoints: 0,
        benefits: {
            pointsMultiplier: 1,
            discountPercentage: 0,
            freeShipping: false,
            earlyAccess: false,
            birthdayBonus: 100,
            referralReward: 50
        },
        color: "#CD7F32",
        icon: "bronze-star"
    },
    silver: {
        name: "Silver", 
        minSpend: 5000,
        minPoints: 1000,
        benefits: {
            pointsMultiplier: 1.2,
            discountPercentage: 2,
            freeShipping: true,
            earlyAccess: false,
            birthdayBonus: 250,
            referralReward: 100
        },
        color: "#C0C0C0",
        icon: "silver-star"
    },
    gold: {
        name: "Gold",
        minSpend: 15000,
        minPoints: 3000,
        benefits: {
            pointsMultiplier: 1.5,
            discountPercentage: 5,
            freeShipping: true,
            earlyAccess: true,
            birthdayBonus: 500,
            referralReward: 200
        },
        color: "#FFD700",
        icon: "gold-star"
    },
    platinum: {
        name: "Platinum",
        minSpend: 30000,
        minPoints: 6000,
        benefits: {
            pointsMultiplier: 2,
            discountPercentage: 8,
            freeShipping: true,
            earlyAccess: true,
            birthdayBonus: 1000,
            referralReward: 300,
            exclusiveEvents: true
        },
        color: "#E5E4E2",
        icon: "platinum-crown"
    },
    diamond: {
        name: "Diamond",
        minSpend: 75000,
        minPoints: 15000,
        benefits: {
            pointsMultiplier: 3,
            discountPercentage: 12,
            freeShipping: true,
            earlyAccess: true,
            birthdayBonus: 2000,
            referralReward: 500,
            exclusiveEvents: true,
            personalConcierge: true,
            prioritySupport: true
        },
        color: "#B9F2FF",
        icon: "diamond-gem"
    }
};

/**
 * GIFT STORE SPECIFIC BENEFITS
 */
const GIFT_BENEFITS = {
    wrapping: {
        bronze: 0,
        silver: 5,
        gold: 10,
        platinum: 15,
        diamond: 25
    },
    giftCards: {
        bronze: 0,
        silver: 2,
        gold: 5,
        platinum: 8,
        diamond: 12
    },
    bulkDiscount: {
        bronze: 0,
        silver: 2,
        gold: 5,
        platinum: 8,
        diamond: 12
    }
};

/**
 * GET endpoint: Get loyalty system status
 */
app.get("/", function (req, res) {
    res.send("Loyalty System API - Comprehensive rewards and engagement platform");
});

/**
 * GET endpoint: Get all loyalty programs
 */
app.get("/programs", function (req, res) {
    loyaltyDB.find({}, function (err, programs) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.send(programs);
        }
    });
});

/**
 * POST endpoint: Create or update loyalty program
 */
app.post("/programs", function (req, res) {
    const program = {
        _id: req.body._id || `program_${Date.now()}`,
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    loyaltyDB.update(
        { _id: program._id },
        program,
        { upsert: true },
        function (err, numReplaced) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.sendStatus(200);
            }
        }
    );
});

/**
 * GET endpoint: Get customer loyalty profile
 */
app.get("/customer/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    
    async.parallel({
        customer: function(callback) {
            const customerDB = getDatabase(path.join(appData, appName, "server", "databases", "customers.db"));
            customerDB.findOne({ _id: customerId }, callback);
        },
        points: function(callback) {
            pointsDB.findOne({ customerId: customerId }, callback);
        },
        tier: function(callback) {
            tiersDB.findOne({ customerId: customerId }, callback);
        },
        referrals: function(callback) {
            referralsDB.find({ referrerId: customerId }, callback);
        }
    }, function(err, results) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const loyaltyProfile = {
                customer: results.customer,
                points: results.points || { balance: 0, lifetime: 0, transactions: [] },
                tier: results.tier || { tier: 'bronze', progress: 0, nextTier: 'silver' },
                referrals: results.referrals || [],
                benefits: calculateBenefits(results.tier?.tier || 'bronze'),
                giftBenefits: calculateGiftBenefits(results.tier?.tier || 'bronze')
            };
            res.send(loyaltyProfile);
        }
    });
});

/**
 * POST endpoint: Award points to customer
 */
app.post("/points/award", function (req, res) {
    const { customerId, points, reason, orderValue, metadata } = req.body;
    
    if (!customerId || !points) {
        return res.status(400).json({ error: "customerId and points are required" });
    }

    async.waterfall([
        // Get current points balance
        function(callback) {
            pointsDB.findOne({ customerId: customerId }, callback);
        },
        // Create points transaction
        function(currentPoints, callback) {
            const transaction = {
                _id: `points_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                customerId: customerId,
                points: points,
                type: 'earned',
                reason: reason || 'Purchase',
                orderValue: orderValue || 0,
                metadata: metadata || {},
                timestamp: new Date()
            };

            // Update or create points record
            const newBalance = (currentPoints?.balance || 0) + points;
            const newLifetime = (currentPoints?.lifetime || 0) + points;
            
            const pointsRecord = {
                _id: customerId,
                customerId: customerId,
                balance: newBalance,
                lifetime: newLifetime,
                lastUpdated: new Date(),
                transactions: [...(currentPoints?.transactions || []), transaction]
            };

            pointsDB.update(
                { customerId: customerId },
                pointsRecord,
                { upsert: true },
                function(err, numReplaced) {
                    callback(err, transaction, newBalance);
                }
            );
        },
        // Check tier progression
        function(transaction, newBalance, callback) {
            checkTierProgression(customerId, newBalance, callback);
        }
    ], function(err, result) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.send({
                success: true,
                pointsAwarded: points,
                newBalance: result.newBalance,
                tierProgression: result.tierProgression
            });
        }
    });
});

/**
 * POST endpoint: Redeem points
 */
app.post("/points/redeem", function (req, res) {
    const { customerId, points, rewardType, rewardId } = req.body;
    
    if (!customerId || !points) {
        return res.status(400).json({ error: "customerId and points are required" });
    }

    async.waterfall([
        // Check available points
        function(callback) {
            pointsDB.findOne({ customerId: customerId }, callback);
        },
        // Verify sufficient balance
        function(currentPoints, callback) {
            if (!currentPoints || currentPoints.balance < points) {
                return callback(new Error("Insufficient points balance"));
            }
            
            const transaction = {
                _id: `redeem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                customerId: customerId,
                points: -points,
                type: 'redeemed',
                reason: rewardType || 'Redemption',
                rewardId: rewardId,
                timestamp: new Date()
            };

            const newBalance = currentPoints.balance - points;
            
            pointsDB.update(
                { customerId: customerId },
                {
                    ...currentPoints,
                    balance: newBalance,
                    lastUpdated: new Date(),
                    transactions: [...currentPoints.transactions, transaction]
                },
                {},
                function(err, numReplaced) {
                    callback(err, transaction, newBalance);
                }
            );
        }
    ], function(err, result) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.send({
                success: true,
                pointsRedeemed: points,
                newBalance: result.newBalance,
                transaction: result.transaction
            });
        }
    });
});

/**
 * GET endpoint: Get points history
 */
app.get("/points/history/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    
    pointsDB.findOne({ customerId: customerId }, function(err, pointsData) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const transactions = pointsData?.transactions || [];
            res.send({
                balance: pointsData?.balance || 0,
                lifetime: pointsData?.lifetime || 0,
                transactions: transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            });
        }
    });
});

/**
 * GET endpoint: Get available rewards
 */
app.get("/rewards", function (req, res) {
    const customerId = req.query.customerId;
    const tier = req.query.tier || 'bronze';
    
    // Define available rewards based on tier
    const rewards = [
        {
            id: 'discount_10',
            name: '10% Discount',
            description: 'Get 10% off your next purchase',
            pointsCost: tier === 'diamond' ? 500 : tier === 'platinum' ? 600 : tier === 'gold' ? 750 : 1000,
            type: 'discount',
            value: 10,
            tierRestrictions: ['bronze', 'silver', 'gold', 'platinum', 'diamond']
        },
        {
            id: 'free_shipping',
            name: 'Free Shipping',
            description: 'Free shipping on your next order',
            pointsCost: tier === 'diamond' ? 200 : tier === 'platinum' ? 250 : tier === 'gold' ? 300 : 400,
            type: 'shipping',
            value: 1,
            tierRestrictions: ['silver', 'gold', 'platinum', 'diamond']
        },
        {
            id: 'gift_wrap',
            name: 'Premium Gift Wrapping',
            description: 'Complimentary premium gift wrapping service',
            pointsCost: tier === 'diamond' ? 100 : tier === 'platinum' ? 150 : tier === 'gold' ? 200 : 300,
            type: 'gift_service',
            value: 1,
            tierRestrictions: ['silver', 'gold', 'platinum', 'diamond']
        },
        {
            id: 'birthday_gift',
            name: 'Birthday Special Gift',
            description: 'Special birthday reward',
            pointsCost: 0,
            type: 'birthday',
            value: 1,
            tierRestrictions: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
            automatic: true
        }
    ];

    // Filter rewards based on customer eligibility
    const availableRewards = rewards.filter(reward => 
        reward.tierRestrictions.includes(tier)
    );

    res.send(availableRewards);
});

/**
 * POST endpoint: Process referral
 */
app.post("/referrals/process", function (req, res) {
    const { referrerId, refereeId, referralCode } = req.body;
    
    if (!referrerId || !refereeId || !referralCode) {
        return res.status(400).json({ error: "referrerId, refereeId, and referralCode are required" });
    }

    async.waterfall([
        // Check if referral already exists
        function(callback) {
            referralsDB.findOne({ referralCode: referralCode }, callback);
        },
        // Create referral record
        function(existingReferral, callback) {
            if (existingReferral) {
                return callback(new Error("Referral code already used"));
            }

            const referral = {
                _id: `referral_${Date.now()}`,
                referrerId: referrerId,
                refereeId: refereeId,
                referralCode: referralCode,
                status: 'completed',
                rewards: {
                    referrer: calculateReferralReward(referrerId),
                    referee: 100 // Welcome bonus for referee
                },
                createdAt: new Date(),
                completedAt: new Date()
            };

            referralsDB.insert(referral, function(err, newReferral) {
                callback(err, newReferral);
            });
        },
        // Award points to both parties
        function(referral, callback) {
            async.parallel([
                // Award to referrer
                function(cb) {
                    awardReferralPoints(referrerId, referral.rewards.referrer, 'referral_bonus', cb);
                },
                // Award to referee
                function(cb) {
                    awardReferralPoints(refereeId, referral.rewards.referee, 'referral_welcome', cb);
                }
            ], function(err, results) {
                callback(err, referral, results);
            });
        }
    ], function(err, referral, results) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.send({
                success: true,
                referral: referral,
                rewards: results
            });
        }
    });
});

/**
 * GET endpoint: Get referral analytics
 */
app.get("/referrals/analytics/:customerId", function (req, res) {
    const customerId = req.params.customerId;
    
    referralsDB.find({ referrerId: customerId }, function(err, referrals) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const analytics = {
                totalReferrals: referrals.length,
                successfulReferrals: referrals.filter(r => r.status === 'completed').length,
                totalPointsEarned: referrals.reduce((sum, r) => sum + r.rewards.referrer, 0),
                averageConversionRate: referrals.length > 0 ? 
                    (referrals.filter(r => r.status === 'completed').length / referrals.length) * 100 : 0
            };
            res.send(analytics);
        }
    });
});

/**
 * POST endpoint: Apply loyalty discount
 */
app.post("/discount/apply", function (req, res) {
    const { customerId, orderValue, category } = req.body;
    
    async.waterfall([
        // Get customer tier
        function(callback) {
            tiersDB.findOne({ customerId: customerId }, callback);
        },
        // Calculate discount
        function(tierData, callback) {
            const tier = tierData?.tier || 'bronze';
            const tierConfig = DEFAULT_TIERS[tier];
            
            if (!tierConfig) {
                return callback(new Error("Invalid tier"));
            }

            let discountPercentage = tierConfig.benefits.discountPercentage;
            
            // Bonus discount for gift purchases
            if (category === 'gifts') {
                const giftBonus = GIFT_BENEFITS.giftCards[tier] || 0;
                discountPercentage += giftBonus;
            }

            const discountAmount = (orderValue * discountPercentage) / 100;
            
            callback(null, {
                tier: tier,
                discountPercentage: discountPercentage,
                discountAmount: discountAmount,
                benefits: tierConfig.benefits
            });
        }
    ], function(err, discount) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.send(discount);
        }
    });
});

/**
 * GET endpoint: Get loyalty analytics
 */
app.get("/analytics", function (req, res) {
    async.parallel({
        totalMembers: function(callback) {
            tiersDB.count({}, callback);
        },
        tierDistribution: function(callback) {
            tiersDB.find({}, function(err, tiers) {
                if (err) return callback(err);
                
                const distribution = tiers.reduce((acc, tier) => {
                    acc[tier.tier] = (acc[tier.tier] || 0) + 1;
                    return acc;
                }, {});
                
                callback(null, distribution);
            });
        },
        pointsActivity: function(callback) {
            pointsDB.find({}, function(err, pointsData) {
                if (err) return callback(err);
                
                const totalPointsIssued = pointsData.reduce((sum, p) => sum + p.lifetime, 0);
                const totalPointsRedeemed = pointsData.reduce((sum, p) => {
                    const redeemed = p.transactions
                        .filter(t => t.type === 'redeemed')
                        .reduce((tSum, t) => tSum + Math.abs(t.points), 0);
                    return sum + redeemed;
                }, 0);
                
                callback(null, {
                    totalIssued: totalPointsIssued,
                    totalRedeemed: totalPointsRedeemed,
                    activeBalance: totalPointsIssued - totalPointsRedeemed
                });
            });
        }
    }, function(err, analytics) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.send(analytics);
        }
    });
});

/**
 * POST endpoint: Initialize default loyalty program
 */
app.post("/initialize", function (req, res) {
    // Create default tiers
    async.eachOfSeries(DEFAULT_TIERS, function(tierData, tierKey, callback) {
        const tierRecord = {
            _id: `tier_${tierKey}`,
            tierKey: tierKey,
            ...tierData,
            isDefault: true
        };
        
        tiersDB.update(
            { _id: tierRecord._id },
            tierRecord,
            { upsert: true },
            callback
        );
    }, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.send({ success: true, message: "Default loyalty program initialized" });
        }
    });
});

/**
 * HELPER FUNCTIONS
 */

function calculateBenefits(tier) {
    const tierConfig = DEFAULT_TIERS[tier];
    return tierConfig ? tierConfig.benefits : DEFAULT_TIERS.bronze.benefits;
}

function calculateGiftBenefits(tier) {
    return {
        wrappingDiscount: GIFT_BENEFITS.wrapping[tier] || 0,
        giftCardBonus: GIFT_BENEFITS.giftCards[tier] || 0,
        bulkDiscount: GIFT_BENEFITS.bulkDiscount[tier] || 0,
        exclusiveWrapping: tier !== 'bronze',
        customMessages: tier !== 'bronze',
        priorityProcessing: ['platinum', 'diamond'].includes(tier)
    };
}

function checkTierProgression(customerId, currentPoints, callback) {
    tiersDB.findOne({ customerId: customerId }, function(err, currentTier) {
        if (err) return callback(err);
        
        const currentTierKey = currentTier?.tier || 'bronze';
        const tierKeys = Object.keys(DEFAULT_TIERS);
        const currentIndex = tierKeys.indexOf(currentTierKey);
        
        let progression = { upgraded: false, newTier: currentTierKey };
        
        // Check if customer qualifies for next tier
        for (let i = currentIndex + 1; i < tierKeys.length; i++) {
            const nextTierKey = tierKeys[i];
            const nextTier = DEFAULT_TIERS[nextTierKey];
            
            if (currentPoints >= nextTier.minPoints) {
                // Update tier
                tiersDB.update(
                    { customerId: customerId },
                    {
                        customerId: customerId,
                        tier: nextTierKey,
                        progress: calculateProgress(currentPoints, nextTierKey),
                        nextTier: tierKeys[i + 1] || null,
                        lastUpdated: new Date()
                    },
                    { upsert: true },
                    function(err) {
                        progression = {
                            upgraded: true,
                            newTier: nextTierKey,
                            previousTier: currentTierKey
                        };
                        callback(err, progression);
                    }
                );
                return;
            }
        }
        
        // No tier change, just update progress
        tiersDB.update(
            { customerId: customerId },
            {
                customerId: customerId,
                tier: currentTierKey,
                progress: calculateProgress(currentPoints, currentTierKey),
                nextTier: tierKeys[currentIndex + 1] || null,
                lastUpdated: new Date()
            },
            { upsert: true },
            function(err) {
                callback(err, progression);
            }
        );
    });
}

function calculateProgress(currentPoints, tierKey) {
    const tierKeys = Object.keys(DEFAULT_TIERS);
    const currentIndex = tierKeys.indexOf(tierKey);
    
    if (currentIndex === tierKeys.length - 1) {
        return 100; // Highest tier
    }
    
    const currentTier = DEFAULT_TIERS[tierKey];
    const nextTier = DEFAULT_TIERS[tierKeys[currentIndex + 1]];
    
    const progressRange = nextTier.minPoints - currentTier.minPoints;
    const currentProgress = currentPoints - currentTier.minPoints;
    
    return Math.min(100, Math.max(0, (currentProgress / progressRange) * 100));
}

function calculateReferralReward(referrerId) {
    // Get referrer's tier to calculate appropriate reward
    tiersDB.findOne({ customerId: referrerId }, function(err, tierData) {
        if (err) return 100; // Default reward
        
        const tier = tierData?.tier || 'bronze';
        return DEFAULT_TIERS[tier].benefits.referralReward;
    });
}

function awardReferralPoints(customerId, points, reason, callback) {
    pointsDB.findOne({ customerId: customerId }, function(err, currentPoints) {
        if (err) return callback(err);
        
        const transaction = {
            _id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            customerId: customerId,
            points: points,
            type: 'earned',
            reason: reason,
            timestamp: new Date()
        };

        const newBalance = (currentPoints?.balance || 0) + points;
        const newLifetime = (currentPoints?.lifetime || 0) + points;
        
        pointsDB.update(
            { customerId: customerId },
            {
                _id: customerId,
                customerId: customerId,
                balance: newBalance,
                lifetime: newLifetime,
                lastUpdated: new Date(),
                transactions: [...(currentPoints?.transactions || []), transaction]
            },
            { upsert: true },
            function(err, numReplaced) {
                callback(err, transaction);
            }
        );
    });
}