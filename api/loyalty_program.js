const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const path = require("path");
const validator = require("validator");
const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "loyalty_program.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

// Initialize loyalty program database
let loyaltyDB = getDatabase(dbPath);
loyaltyDB.ensureIndex({ fieldName: "_id", unique: true });
loyaltyDB.ensureIndex({ fieldName: "customerId" });
loyaltyDB.ensureIndex({ fieldName: "tierLevel" });

/**
 * GET endpoint: Get the welcome message for the Loyalty Program API.
 */
app.get("/", function (req, res) {
    res.send("Enhanced Customer Loyalty & Rewards Program API");
});

/**
 * GET endpoint: Get customer loyalty data
 */
app.get("/customer/:customerId", function (req, res) {
    const customerId = parseInt(req.params.customerId);

    loyaltyDB.findOne({ customerId: customerId }, function (err, loyaltyData) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve loyalty data"
            });
        } else if (!loyaltyData) {
            // Create default loyalty profile for new customer
            createDefaultLoyaltyProfile(customerId)
                .then(defaultProfile => {
                    res.send(defaultProfile);
                })
                .catch(error => {
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "Failed to create loyalty profile"
                    });
                });
        } else {
            // Calculate current tier and benefits
            const updatedLoyaltyData = calculateCurrentTier(loyaltyData);
            res.send(updatedLoyaltyData);
        }
    });
});

/**
 * POST endpoint: Award points for transaction
 */
app.post("/award-points", function (req, res) {
    const { customerId, transactionAmount, transactionId, purchaseItems, transactionType } = req.body;

    if (!customerId || !transactionAmount) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Customer ID and transaction amount are required"
        });
    }

    loyaltyDB.findOne({ customerId: parseInt(customerId) }, function (err, loyaltyData) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Database error occurred"
            });
        }

        if (!loyaltyData) {
            return res.status(404).json({
                error: "Not Found",
                message: "Customer loyalty profile not found"
            });
        }

        // Calculate points to award
        const pointsAwarded = calculatePointsToAward(loyaltyData, parseFloat(transactionAmount), purchaseItems, transactionType);

        // Update loyalty data
        const currentPoints = loyaltyData.pointsBalance || 0;
        const totalLifetimePoints = loyaltyData.totalLifetimePoints || 0;
        const newPointsBalance = currentPoints + pointsAwarded.total;
        const newLifetimePoints = totalLifetimePoints + pointsAwarded.total;

        // Record transaction
        const pointsTransaction = {
            transactionId: transactionId || `TXN_${Date.now()}`,
            date: new Date().toISOString(),
            type: 'earned',
            points: pointsAwarded.total,
            transactionAmount: parseFloat(transactionAmount),
            basePoints: pointsAwarded.basePoints,
            bonusPoints: pointsAwarded.bonusPoints,
            multiplier: pointsAwarded.multiplier,
            reason: 'Purchase',
            purchaseItems: purchaseItems || []
        };

        const updatedLoyaltyData = {
            ...loyaltyData,
            pointsBalance: newPointsBalance,
            totalLifetimePoints: newLifetimePoints,
            lastActivityDate: new Date().toISOString(),
            pointsTransactions: [...(loyaltyData.pointsTransactions || []), pointsTransaction],
            monthlyPoints: (loyaltyData.monthlyPoints || 0) + pointsAwarded.total,
            yearlyPoints: (loyaltyData.yearlyPoints || 0) + pointsAwarded.total,
            totalTransactions: (loyaltyData.totalTransactions || 0) + 1,
            totalSpent: (loyaltyData.totalSpent || 0) + parseFloat(transactionAmount),
            averageOrderValue: ((loyaltyData.totalSpent || 0) + parseFloat(transactionAmount)) / ((loyaltyData.totalTransactions || 0) + 1)
        };

        // Check for tier upgrade
        const tierResult = checkTierUpgrade(updatedLoyaltyData);
        if (tierResult.upgraded) {
            updatedLoyaltyData.tierLevel = tierResult.newTier;
            updatedLoyaltyData.tierBenefits = getTierBenefits(tierResult.newTier);
            updatedLoyaltyData.tierUpgradeDate = new Date().toISOString();
        }

        loyaltyDB.update(
            { customerId: parseInt(customerId) },
            { $set: updatedLoyaltyData },
            {},
            function (err, numReplaced) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "Failed to update loyalty data"
                    });
                } else {
                    res.json({
                        success: true,
                        pointsAwarded: pointsAwarded.total,
                        newBalance: newPointsBalance,
                        tierUpgrade: tierResult,
                        transaction: pointsTransaction
                    });
                }
            }
        );
    });
});

/**
 * POST endpoint: Redeem points
 */
app.post("/redeem-points", function (req, res) {
    const { customerId, pointsToRedeem, rewardId, transactionId } = req.body;

    if (!customerId || !pointsToRedeem) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Customer ID and points to redeem are required"
        });
    }

    loyaltyDB.findOne({ customerId: parseInt(customerId) }, function (err, loyaltyData) {
        if (err || !loyaltyData) {
            return res.status(404).json({
                error: "Not Found",
                message: "Customer loyalty profile not found"
            });
        }

        const currentBalance = loyaltyData.pointsBalance || 0;
        if (currentBalance < pointsToRedeem) {
            return res.status(400).json({
                error: "Insufficient Points",
                message: "Customer does not have enough points for redemption"
            });
        }

        // Calculate redemption value (1 point = $0.01 by default)
        const redemptionRate = 0.01;
        const redemptionValue = pointsToRedeem * redemptionRate;

        // Record redemption
        const redemptionTransaction = {
            transactionId: transactionId || `RED_${Date.now()}`,
            date: new Date().toISOString(),
            type: 'redeemed',
            points: -pointsToRedeem,
            redemptionValue: redemptionValue,
            rewardId: rewardId || null,
            reason: 'Reward Redemption'
        };

        const updatedLoyaltyData = {
            ...loyaltyData,
            pointsBalance: currentBalance - pointsToRedeem,
            totalRedeemed: (loyaltyData.totalRedeemed || 0) + pointsToRedeem,
            lastActivityDate: new Date().toISOString(),
            pointsTransactions: [...(loyaltyData.pointsTransactions || []), redemptionTransaction]
        };

        loyaltyDB.update(
            { customerId: parseInt(customerId) },
            { $set: updatedLoyaltyData },
            {},
            function (err, numReplaced) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "Failed to process points redemption"
                    });
                } else {
                    res.json({
                        success: true,
                        pointsRedeemed: pointsToRedeem,
                        redemptionValue: redemptionValue,
                        newBalance: currentBalance - pointsToRedeem,
                        transaction: redemptionTransaction
                    });
                }
            }
        );
    });
});

/**
 * GET endpoint: Get available rewards
 */
app.get("/rewards", function (req, res) {
    const customerId = req.query.customerId ? parseInt(req.query.customerId) : null;

    // Predefined rewards catalog
    const rewardsCatalog = [
        {
            id: 'DISCOUNT_5',
            name: '$5 Off Next Purchase',
            description: 'Get $5 off your next purchase of $25 or more',
            pointsCost: 500,
            category: 'discount',
            value: 5.00,
            minimumPurchase: 25.00,
            expiryDays: 30,
            tierRequirement: null,
            isActive: true
        },
        {
            id: 'DISCOUNT_10',
            name: '$10 Off Next Purchase',
            description: 'Get $10 off your next purchase of $50 or more',
            pointsCost: 1000,
            category: 'discount',
            value: 10.00,
            minimumPurchase: 50.00,
            expiryDays: 30,
            tierRequirement: 'Silver',
            isActive: true
        },
        {
            id: 'DISCOUNT_25',
            name: '$25 Off Next Purchase',
            description: 'Get $25 off your next purchase of $100 or more',
            pointsCost: 2500,
            category: 'discount',
            value: 25.00,
            minimumPurchase: 100.00,
            expiryDays: 45,
            tierRequirement: 'Gold',
            isActive: true
        },
        {
            id: 'FREE_PRODUCT',
            name: 'Free OTC Product',
            description: 'Choose any over-the-counter product under $15',
            pointsCost: 1500,
            category: 'product',
            value: 15.00,
            minimumPurchase: null,
            expiryDays: 60,
            tierRequirement: 'Silver',
            isActive: true
        },
        {
            id: 'BIRTHDAY_REWARD',
            name: 'Birthday Reward',
            description: 'Special birthday discount or free item',
            pointsCost: 0,
            category: 'special',
            value: 10.00,
            minimumPurchase: null,
            expiryDays: 7,
            tierRequirement: null,
            isActive: true
        },
        {
            id: 'PRESCRIPTION_DISCOUNT',
            name: 'Prescription Discount',
            description: '10% discount on prescription medications',
            pointsCost: 2000,
            category: 'pharmacy',
            value: null, // Percentage-based
            discountPercentage: 10,
            minimumPurchase: null,
            expiryDays: 30,
            tierRequirement: 'Gold',
            isActive: true
        },
        {
            id: 'FREE_DELIVERY',
            name: 'Free Home Delivery',
            description: 'Free delivery for orders over $35',
            pointsCost: 300,
            category: 'service',
            value: 5.00, // Average delivery fee
            minimumPurchase: 35.00,
            expiryDays: 14,
            tierRequirement: null,
            isActive: true
        },
        {
            id: 'HEALTH_SCREENING',
            name: 'Free Health Screening',
            description: 'Complimentary blood pressure or glucose screening',
            pointsCost: 0,
            category: 'health',
            value: 25.00,
            minimumPurchase: null,
            expiryDays: 90,
            tierRequirement: 'Silver',
            isActive: true
        }
    ];

    // If customer ID provided, filter by tier requirements
    if (customerId) {
        loyaltyDB.findOne({ customerId: customerId }, function (err, loyaltyData) {
            if (err || !loyaltyData) {
                return res.send(rewardsCatalog.filter(reward => !reward.tierRequirement));
            }

            const customerTier = loyaltyData.tierLevel || 'Bronze';
            const eligibleRewards = rewardsCatalog.filter(reward => {
                if (!reward.isActive) return false;
                if (!reward.tierRequirement) return true;
                return isTierEligible(customerTier, reward.tierRequirement);
            });

            res.send(eligibleRewards);
        });
    } else {
        res.send(rewardsCatalog.filter(reward => reward.isActive));
    }
});

/**
 * POST endpoint: Create or update loyalty program settings
 */
app.post("/settings", function (req, res) {
    const settings = req.body;

    const loyaltySettings = {
        _id: 'program_settings',
        programName: settings.programName || 'Pharmacy Rewards Program',
        isActive: settings.isActive !== undefined ? settings.isActive : true,
        pointsPerDollar: settings.pointsPerDollar || 1,
        baseMultiplier: settings.baseMultiplier || 1,
        tierThresholds: settings.tierThresholds || {
            Bronze: { minPoints: 0, minPurchases: 0, benefits: ['Basic rewards'] },
            Silver: { minPoints: 1000, minPurchases: 10, benefits: ['5% discount on OTC items', 'Free delivery over $35'] },
            Gold: { minPoints: 2500, minPurchases: 25, benefits: ['10% discount on OTC items', 'Free prescription delivery', 'Priority customer service'] },
            Platinum: { minPoints: 5000, minPurchases: 50, benefits: ['15% discount on OTC items', 'Free monthly health screening', 'Exclusive member events'] }
        },
        bonusCategories: settings.bonusCategories || {
            prescriptions: { multiplier: 2, description: 'Double points on prescriptions' },
            healthProducts: { multiplier: 1.5, description: '1.5x points on health & wellness products' },
            birthday: { multiplier: 3, description: 'Triple points on birthday month' },
            newCustomer: { multiplier: 2, description: 'Double points for new customers first purchase' }
        },
        redemptionRates: settings.redemptionRates || {
            pointsPerDollar: 100, // 100 points = $1
            minimumRedemption: 100,
            maximumRedemption: 10000
        },
        specialOffers: settings.specialOffers || [],
        updatedAt: new Date().toISOString()
    };

    // Save settings (using upsert)
    loyaltyDB.update(
        { _id: 'program_settings' },
        { $set: loyaltySettings },
        { upsert: true },
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to save loyalty program settings"
                });
            } else {
                res.json({
                    success: true,
                    settings: loyaltySettings
                });
            }
        }
    );
});

/**
 * GET endpoint: Get loyalty program analytics
 */
app.get("/analytics", function (req, res) {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    loyaltyDB.find({}, function (err, allLoyaltyData) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve loyalty analytics"
            });
        }

        const analytics = {
            programOverview: {
                totalMembers: allLoyaltyData.length,
                activeMembers: 0,
                newMembersThisPeriod: 0,
                totalPointsIssued: 0,
                totalPointsRedeemed: 0,
                totalRedemptionValue: 0
            },
            tierDistribution: {
                Bronze: 0,
                Silver: 0,
                Gold: 0,
                Platinum: 0
            },
            memberEngagement: {
                averagePointsBalance: 0,
                averageLifetimePoints: 0,
                averageOrderValue: 0,
                averageVisitFrequency: 0,
                mostActiveMembers: []
            },
            topRewards: [],
            pointsActivity: {
                totalTransactions: 0,
                averagePointsPerTransaction: 0,
                bonusPointsIssued: 0
            },
            retentionMetrics: {
                memberRetentionRate: 0,
                averageMemberLifespan: 0,
                churnRate: 0
            }
        };

        let totalPointsBalance = 0;
        let totalLifetimePoints = 0;
        let totalSpent = 0;
        let totalTransactions = 0;
        let activeMembersCount = 0;

        allLoyaltyData.forEach(member => {
            // Program overview calculations
            totalPointsBalance += member.pointsBalance || 0;
            totalLifetimePoints += member.totalLifetimePoints || 0;
            totalSpent += member.totalSpent || 0;
            totalTransactions += member.totalTransactions || 0;

            // Check if member is active (activity in last 30 days)
            if (member.lastActivityDate) {
                const lastActivity = new Date(member.lastActivityDate);
                if (lastActivity >= startDate) {
                    activeMembersCount++;
                }
            }

            // Tier distribution
            const tier = member.tierLevel || 'Bronze';
            analytics.tierDistribution[tier]++;

            // Check for new members this period
            if (member.joinDate) {
                const joinDate = new Date(member.joinDate);
                if (joinDate >= startDate && joinDate <= endDate) {
                    analytics.programOverview.newMembersThisPeriod++;
                }
            }
        });

        // Calculate averages
        analytics.programOverview.activeMembers = activeMembersCount;
        analytics.programOverview.totalPointsIssued = totalLifetimePoints;
        analytics.programOverview.totalPointsRedeemed = allLoyaltyData.reduce((sum, member) => sum + (member.totalRedeemed || 0), 0);
        analytics.programOverview.totalRedemptionValue = analytics.programOverview.totalPointsRedeemed * 0.01; // Assuming $0.01 per point

        analytics.memberEngagement.averagePointsBalance = allLoyaltyData.length > 0 ? totalPointsBalance / allLoyaltyData.length : 0;
        analytics.memberEngagement.averageLifetimePoints = allLoyaltyData.length > 0 ? totalLifetimePoints / allLoyaltyData.length : 0;
        analytics.memberEngagement.averageOrderValue = totalTransactions > 0 ? totalSpent / totalTransactions : 0;

        // Most active members
        analytics.memberEngagement.mostActiveMembers = allLoyaltyData
            .sort((a, b) => (b.totalTransactions || 0) - (a.totalTransactions || 0))
            .slice(0, 10)
            .map(member => ({
                customerId: member.customerId,
                name: member.customerName || `Customer ${member.customerId}`,
                tier: member.tierLevel,
                totalTransactions: member.totalTransactions || 0,
                totalSpent: member.totalSpent || 0,
                pointsBalance: member.pointsBalance || 0
            }));

        // Points activity
        let totalPointsInTransactions = 0;
        let transactionCount = 0;
        let bonusPointsCount = 0;

        allLoyaltyData.forEach(member => {
            if (member.pointsTransactions) {
                member.pointsTransactions.forEach(transaction => {
                    if (transaction.date >= startDate.toISOString() && transaction.date <= endDate.toISOString()) {
                        totalPointsInTransactions += Math.abs(transaction.points);
                        transactionCount++;
                        if (transaction.type === 'earned' && transaction.bonusPoints > 0) {
                            bonusPointsCount += transaction.bonusPoints;
                        }
                    }
                });
            }
        });

        analytics.pointsActivity.totalTransactions = transactionCount;
        analytics.pointsActivity.averagePointsPerTransaction = transactionCount > 0 ? totalPointsInTransactions / transactionCount : 0;
        analytics.pointsActivity.bonusPointsIssued = bonusPointsCount;

        res.send(analytics);
    });
});

/**
 * POST endpoint: Process birthday rewards
 */
app.post("/birthday-rewards", function (req, res) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();

    // This would typically be called by a scheduled job
    // For now, we'll simulate finding customers with birthdays today
    
    loyaltyDB.find({}, function (err, allMembers) {
        if (err) {
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to process birthday rewards"
            });
        }

        let processedRewards = [];
        let errors = [];

        allLoyaltyData.forEach(member => {
            if (member.birthDate) {
                const birthDate = new Date(member.birthDate);
                const birthMonth = birthDate.getMonth() + 1;
                const birthDay = birthDate.getDate();

                if (birthMonth === currentMonth && birthDay === currentDay) {
                    // Award birthday reward
                    const birthdayReward = {
                        points: 100, // Bonus birthday points
                        description: 'Happy Birthday! Special reward points',
                        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
                    };

                    const newBalance = (member.pointsBalance || 0) + birthdayReward.points;
                    
                    // Record the birthday reward transaction
                    const birthdayTransaction = {
                        transactionId: `BDAY_${Date.now()}_${member.customerId}`,
                        date: new Date().toISOString(),
                        type: 'earned',
                        points: birthdayReward.points,
                        reason: 'Birthday Reward',
                        expiryDate: birthdayReward.expiryDate
                    };

                    const updatedMemberData = {
                        ...member,
                        pointsBalance: newBalance,
                        totalLifetimePoints: (member.totalLifetimePoints || 0) + birthdayReward.points,
                        lastActivityDate: new Date().toISOString(),
                        pointsTransactions: [...(member.pointsTransactions || []), birthdayTransaction],
                        birthdayRewardsClaimed: (member.birthdayRewardsClaimed || 0) + 1
                    };

                    loyaltyDB.update(
                        { customerId: member.customerId },
                        { $set: updatedMemberData },
                        {},
                        function (err, numReplaced) {
                            if (err) {
                                errors.push({
                                    customerId: member.customerId,
                                    error: err.message
                                });
                            }
                        }
                    );

                    processedRewards.push({
                        customerId: member.customerId,
                        customerName: member.customerName,
                        reward: birthdayReward
                    });
                }
            }
        });

        res.json({
            success: true,
            processedRewards: processedRewards,
            totalProcessed: processedRewards.length,
            errors: errors
        });
    });
});

/**
 * Helper function to create default loyalty profile
 */
async function createDefaultLoyaltyProfile(customerId) {
    return new Promise((resolve, reject) => {
        const defaultProfile = {
            _id: Math.floor(Date.now() / 1000),
            customerId: customerId,
            customerName: `Customer ${customerId}`, // Would be populated from customer database
            tierLevel: 'Bronze',
            tierBenefits: getTierBenefits('Bronze'),
            pointsBalance: 0,
            totalLifetimePoints: 0,
            totalRedeemed: 0,
            pointsTransactions: [],
            joinDate: new Date().toISOString(),
            lastActivityDate: new Date().toISOString(),
            monthlyPoints: 0,
            yearlyPoints: 0,
            totalTransactions: 0,
            totalSpent: 0,
            averageOrderValue: 0,
            preferredCategories: [],
            birthdayRewardsClaimed: 0,
            isActive: true
        };

        loyaltyDB.insert(defaultProfile, function (err, newProfile) {
            if (err) {
                reject(err);
            } else {
                resolve(newProfile);
            }
        });
    });
}

/**
 * Helper function to calculate points to award
 */
function calculatePointsToAward(loyaltyData, transactionAmount, purchaseItems, transactionType) {
    const baseMultiplier = loyaltyData.tierBenefits?.pointsMultiplier || 1;
    let basePoints = Math.floor(transactionAmount); // 1 point per dollar
    
    // Apply tier multiplier
    let totalPoints = Math.floor(basePoints * baseMultiplier);
    let bonusPoints = 0;
    
    // Check for bonus categories
    if (purchaseItems && Array.isArray(purchaseItems)) {
        purchaseItems.forEach(item => {
            const category = item.category || '';
            const itemValue = parseFloat(item.price) * parseInt(item.quantity);
            
            // Pharmacy/prescription bonus
            if (category.toLowerCase().includes('prescription') || transactionType === 'prescription') {
                bonusPoints += Math.floor(itemValue * 1); // 1x bonus = 2x total
            }
            
            // Health products bonus
            if (category.toLowerCase().includes('health') || category.toLowerCase().includes('wellness')) {
                bonusPoints += Math.floor(itemValue * 0.5); // 0.5x bonus
            }
        });
    }
    
    totalPoints += bonusPoints;
    
    return {
        basePoints: basePoints,
        bonusPoints: bonusPoints,
        total: totalPoints,
        multiplier: baseMultiplier
    };
}

/**
 * Helper function to check tier upgrade eligibility
 */
function checkTierUpgrade(loyaltyData) {
    const currentTier = loyaltyData.tierLevel || 'Bronze';
    const thresholds = {
        Bronze: { minPoints: 0, minPurchases: 0 },
        Silver: { minPoints: 1000, minPurchases: 10 },
        Gold: { minPoints: 2500, minPurchases: 25 },
        Platinum: { minPoints: 5000, minPurchases: 50 }
    };
    
    const currentPoints = loyaltyData.totalLifetimePoints || 0;
    const currentPurchases = loyaltyData.totalTransactions || 0;
    
    // Check if eligible for upgrade
    if (currentTier === 'Bronze' && 
        currentPoints >= thresholds.Silver.minPoints && 
        currentPurchases >= thresholds.Silver.minPurchases) {
        return { upgraded: true, newTier: 'Silver', previousTier: 'Bronze' };
    } else if (currentTier === 'Silver' && 
               currentPoints >= thresholds.Gold.minPoints && 
               currentPurchases >= thresholds.Gold.minPurchases) {
        return { upgraded: true, newTier: 'Gold', previousTier: 'Silver' };
    } else if (currentTier === 'Gold' && 
               currentPoints >= thresholds.Platinum.minPoints && 
               currentPurchases >= thresholds.Platinum.minPurchases) {
        return { upgraded: true, newTier: 'Platinum', previousTier: 'Gold' };
    }
    
    return { upgraded: false };
}

/**
 * Helper function to get tier benefits
 */
function getTierBenefits(tierLevel) {
    const benefits = {
        Bronze: {
            pointsMultiplier: 1,
            benefits: ['Basic rewards access', 'Birthday rewards'],
            description: 'Entry level membership'
        },
        Silver: {
            pointsMultiplier: 1.25,
            benefits: ['5% discount on OTC items', 'Free delivery over $35', 'Priority customer service'],
            description: 'Silver membership benefits'
        },
        Gold: {
            pointsMultiplier: 1.5,
            benefits: ['10% discount on OTC items', 'Free prescription delivery', 'Monthly health screenings', 'Exclusive offers'],
            description: 'Gold membership benefits'
        },
        Platinum: {
            pointsMultiplier: 2,
            benefits: ['15% discount on OTC items', 'Free premium delivery', 'Weekly health screenings', 'VIP customer service', 'Exclusive member events'],
            description: 'Platinum membership benefits'
        }
    };
    
    return benefits[tierLevel] || benefits.Bronze;
}

/**
 * Helper function to check tier eligibility
 */
function isTierEligible(customerTier, requiredTier) {
    const tierLevels = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    const customerLevel = tierLevels.indexOf(customerTier);
    const requiredLevel = tierLevels.indexOf(requiredTier);
    
    return customerLevel >= requiredLevel;
}

/**
 * Helper function to calculate current tier
 */
function calculateCurrentTier(loyaltyData) {
    const thresholds = {
        Bronze: { minPoints: 0, minPurchases: 0 },
        Silver: { minPoints: 1000, minPurchases: 10 },
        Gold: { minPoints: 2500, minPurchases: 25 },
        Platinum: { minPoints: 5000, minPurchases: 50 }
    };
    
    const currentPoints = loyaltyData.totalLifetimePoints || 0;
    const currentPurchases = loyaltyData.totalTransactions || 0;
    
    let currentTier = 'Bronze';
    let nextTier = null;
    let pointsToNextTier = 0;
    let purchasesToNextTier = 0;
    
    // Determine current tier
    if (currentPoints >= thresholds.Platinum.minPoints && currentPurchases >= thresholds.Platinum.minPurchases) {
        currentTier = 'Platinum';
    } else if (currentPoints >= thresholds.Gold.minPoints && currentPurchases >= thresholds.Gold.minPurchases) {
        currentTier = 'Gold';
        nextTier = 'Platinum';
        pointsToNextTier = thresholds.Platinum.minPoints - currentPoints;
        purchasesToNextTier = thresholds.Platinum.minPurchases - currentPurchases;
    } else if (currentPoints >= thresholds.Silver.minPoints && currentPurchases >= thresholds.Silver.minPurchases) {
        currentTier = 'Silver';
        nextTier = 'Gold';
        pointsToNextTier = thresholds.Gold.minPoints - currentPoints;
        purchasesToNextTier = thresholds.Gold.minPurchases - currentPurchases;
    } else {
        nextTier = 'Silver';
        pointsToNextTier = thresholds.Silver.minPoints - currentPoints;
        purchasesToNextTier = thresholds.Silver.minPurchases - currentPurchases;
    }
    
    return {
        ...loyaltyData,
        currentTier: currentTier,
        nextTier: nextTier,
        pointsToNextTier: Math.max(0, pointsToNextTier),
        purchasesToNextTier: Math.max(0, purchasesToNextTier),
        tierProgress: {
            points: currentPoints,
            purchases: currentPurchases,
            percentageToNextTier: nextTier ? 
                Math.min(100, ((currentPoints + currentPurchases) / 
                (thresholds[nextTier].minPoints + thresholds[nextTier].minPurchases)) * 100) : 100
        }
    };
}