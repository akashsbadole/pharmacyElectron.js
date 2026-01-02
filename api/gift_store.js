/**
 * Comprehensive Gift Store Management System for StyleMine
 * Handles gift receipts, gift cards, bundling, wrapping, and all gift-specific operations
 */

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const validator = require("validator");
const Datastore = require("@seald-io/nedb");
const async = require("async");
const crypto = require("crypto");

const app = express();
app.use(bodyParser.json());

const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

// Database paths for gift store system
const dbPaths = {
    gift_receipts: path.join(appData, appName, "server", "databases", "gift_receipts.db"),
    gift_cards: path.join(appData, appName, "server", "databases", "gift_cards.db"),
    gift_bundles: path.join(appData, appName, "server", "databases", "gift_bundles.db"),
    gift_wrapping: path.join(appData, appName, "server", "databases", "gift_wrapping.db"),
    gift_occasions: path.join(appData, appName, "server", "databases", "gift_occasions.db"),
    gift_transactions: path.join(appData, appName, "server", "databases", "gift_transactions.db"),
    gift_analytics: path.join(appData, appName, "server", "databases", "gift_analytics.db")
};

const { getDatabase } = require('./database_utils');

// Initialize gift store databases
const giftDBs = {};
Object.keys(dbPaths).forEach(key => {
    giftDBs[key] = getDatabase(dbPaths[key]);
    giftDBs[key].ensureIndex({ fieldName: "_id", unique: true });
    if (key === 'gift_receipts') {
        giftDBs[key].ensureIndex({ fieldName: "receipt_number", unique: true });
        giftDBs[key].ensureIndex({ fieldName: "transaction_id", unique: false });
    }
    if (key === 'gift_cards') {
        giftDBs[key].ensureIndex({ fieldName: "card_number", unique: true });
        giftDBs[key].ensureIndex({ fieldName: "card_id", unique: true });
    }
    if (key === 'gift_bundles') {
        giftDBs[key].ensureIndex({ fieldName: "bundle_id", unique: true });
        giftDBs[key].ensureIndex({ fieldName: "category", unique: false });
    }
});

module.exports = app;

/**
 * GIFT RECEIPT SYSTEM
 */

// POST - Generate gift receipt without prices
app.post("/receipts/generate", function (req, res) {
    const {
        transaction_id,
        gift_message,
        gift_recipient_name,
        gift_recipient_contact,
        is_anonymous,
        gift_wrapping_style,
        gift_wrapping_cost,
        gift_card_included,
        gift_card_value,
        scheduled_delivery,
        personalization_options
    } = req.body;

    if (!transaction_id) {
        res.status(400).json({ error: "Transaction ID is required" });
        return;
    }

    const giftReceipt = {
        receipt_id: `GR${Date.now()}`,
        receipt_number: generateGiftReceiptNumber(),
        transaction_id: transaction_id,
        
        // Gift Details
        gift_details: {
            is_gift: true,
            gift_message: validator.escape(gift_message || ""),
            gift_recipient_name: validator.escape(gift_recipient_name || ""),
            gift_recipient_contact: validator.escape(gift_recipient_contact || ""),
            is_anonymous: is_anonymous || false,
            sender_anonymous: false
        },

        // Gift Services
        gift_services: {
            gift_wrapping: {
                applied: !!gift_wrapping_style,
                style: validator.escape(gift_wrapping_style || ""),
                cost: parseFloat(gift_wrapping_cost) || 0,
                personalization: personalization_options || {}
            },
            gift_card: {
                included: gift_card_included || false,
                value: parseFloat(gift_card_value) || 0,
                message: validator.escape(req.body.gift_card_message || "")
            },
            scheduled_delivery: {
                requested: !!scheduled_delivery,
                delivery_date: scheduled_delivery || null,
                delivery_instructions: validator.escape(req.body.delivery_instructions || "")
            }
        },

        // Receipt Content (without prices)
        receipt_content: {
            items: req.body.items || [], // Will be populated from transaction
            total_items: (req.body.items || []).length,
            gift_message_included: !!gift_message,
            receipt_type: "gift_receipt"
        },

        // Validation and Security
        validation: {
            receipt_token: crypto.randomBytes(32).toString("hex"),
            fraud_prevention: {
                digital_signature: generateDigitalSignature(),
                checksum: generateChecksum(req.body.items || [])
            },
            return_policy: {
                eligible: true,
                return_window_days: 30,
                conditions: "Original tags required with gift receipt"
            }
        },

        // Digital Delivery
        digital_delivery: {
            email_sent: false,
            sms_sent: false,
            download_url: "",
            qr_code: "",
            shareable_link: ""
        },

        // Status and Tracking
        status: {
            is_active: true,
            created_at: new Date().toISOString(),
            created_by: validator.escape(req.body.created_by || "system"),
            last_modified: new Date().toISOString()
        }
    };

    giftDBs.gift_receipts.insert(giftReceipt, function (err, newReceipt) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to generate gift receipt" });
        } else {
            // Generate digital delivery options
            generateDeliveryOptions(newReceipt).then(deliveryOptions => {
                giftDBs.gift_receipts.update(
                    { _id: newReceipt._id },
                    { $set: { digital_delivery: deliveryOptions } },
                    {},
                    function (updateErr) {
                        res.status(201).json({
                            success: true,
                            receipt_id: giftReceipt.receipt_id,
                            receipt_number: giftReceipt.receipt_number,
                            digital_delivery: deliveryOptions,
                            message: "Gift receipt generated successfully"
                        });
                    }
                );
            });
        }
    });
});

// GET - Retrieve gift receipt
app.get("/receipts/:receiptId", function (req, res) {
    const receiptId = req.params.receiptId;
    
    giftDBs.gift_receipts.findOne({ 
        $or: [
            { receipt_id: receiptId },
            { receipt_number: receiptId }
        ]
    }, function (err, receipt) {
        if (err) {
            res.status(500).json({ error: "Internal Server Error" });
        } else if (!receipt) {
            res.status(404).json({ error: "Gift receipt not found" });
        } else {
            res.json(receipt);
        }
    });
});

// POST - Validate gift receipt for returns/exchanges
app.post("/receipts/validate", function (req, res) {
    const { receipt_number, validation_token, return_reason } = req.body;
    
    giftDBs.gift_receipts.findOne({ 
        receipt_number: receipt_number,
        "validation.receipt_token": validation_token 
    }, function (err, receipt) {
        if (err) {
            res.status(500).json({ error: "Internal Server Error" });
        } else if (!receipt) {
            res.status(404).json({ 
                valid: false, 
                error: "Invalid receipt or validation token" 
            });
        } else {
            const validationResult = validateGiftReceipt(receipt, return_reason);
            res.json(validationResult);
        }
    });
});

/**
 * GIFT CARD MANAGEMENT SYSTEM
 */

// POST - Issue new gift card
app.post("/cards/issue", function (req, res) {
    const {
        card_type, // "digital", "physical", "email", "sms"
        denomination,
        purchaser_info,
        recipient_info,
        custom_message,
        delivery_method,
        scheduled_delivery,
        design_template
    } = req.body;

    if (!denomination || !purchaser_info) {
        res.status(400).json({ error: "Denomination and purchaser information are required" });
        return;
    }

    const giftCard = {
        card_id: generateGiftCardId(),
        card_number: generateGiftCardNumber(),
        card_pin: generateGiftCardPIN(),
        
        // Card Details
        card_details: {
            card_type: validator.escape(card_type || "digital"),
            denomination: parseFloat(denomination),
            purchase_value: parseFloat(denomination),
            current_balance: parseFloat(denomination),
            currency: "INR"
        },

        // Purchase Information
        purchase_info: {
            purchased_by: {
                customer_id: validator.escape(purchaser_info.customer_id || ""),
                name: validator.escape(purchaser_info.name || ""),
                email: validator.escape(purchaser_info.email || ""),
                phone: validator.escape(purchaser_info.phone || "")
            },
            purchase_date: new Date().toISOString(),
            purchase_price: parseFloat(denomination),
            transaction_id: validator.escape(req.body.transaction_id || "")
        },

        // Recipient Information
        recipient_info: {
            name: validator.escape(recipient_info?.name || ""),
            email: validator.escape(recipient_info?.email || ""),
            phone: validator.escape(recipient_info?.phone || ""),
            message: validator.escape(custom_message || "")
        },

        // Design and Customization
        design: {
            template_id: validator.escape(design_template || "default"),
            custom_message: validator.escape(custom_message || ""),
            delivery_method: validator.escape(delivery_method || "email"),
            delivery_date: scheduled_delivery || new Date().toISOString(),
            delivery_status: "pending"
        },

        // Validity and Terms
        validity: {
            issue_date: new Date().toISOString(),
            expiry_date: new Date(Date.now() + 24 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 24 months
            validity_months: 24,
            terms_conditions: "Valid for 24 months from issue date. Non-refundable.",
            refundable: false,
            transferable: true
        },

        // Security Features
        security: {
            pin_protected: true,
            requires_verification: true,
            fraud_monitoring: true,
            usage_limits: {
                daily_limit: 5,
                transaction_limit: parseFloat(denomination)
            }
        },

        // Status
        status: {
            is_active: true,
            is_blocked: false,
            block_reason: null,
            usage_count: 0,
            last_used_date: null
        },

        created_at: new Date().toISOString()
    };

    giftDBs.gift_cards.insert(giftCard, function (err, newCard) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to issue gift card" });
        } else {
            // Process delivery based on method
            processGiftCardDelivery(newCard).then(deliveryResult => {
                res.status(201).json({
                    success: true,
                    card_id: giftCard.card_id,
                    card_number: giftCard.card_number,
                    delivery_status: deliveryResult,
                    message: "Gift card issued successfully"
                });
            });
        }
    });
});

// POST - Redeem gift card
app.post("/cards/redeem", function (req, res) {
    const { card_number, pin, redemption_amount, transaction_id } = req.body;
    
    if (!card_number || !redemption_amount) {
        res.status(400).json({ error: "Card number and redemption amount are required" });
        return;
    }

    giftDBs.gift_cards.findOne({ 
        card_number: card_number,
        "status.is_active": true,
        "status.is_blocked": false
    }, function (err, card) {
        if (err) {
            res.status(500).json({ error: "Internal Server Error" });
        } else if (!card) {
            res.status(404).json({ 
                success: false, 
                error: "Gift card not found or inactive" 
            });
        } else {
            // Validate PIN if required
            if (card.security.pin_protected && card.card_pin !== pin) {
                res.status(401).json({ 
                    success: false, 
                    error: "Invalid PIN" 
                });
                return;
            }

            // Check balance and validity
            const validation = validateGiftCardRedemption(card, parseFloat(redemption_amount));
            if (!validation.valid) {
                res.status(400).json({
                    success: false,
                    error: validation.error
                });
                return;
            }

            // Process redemption
            processGiftCardRedemption(card, parseFloat(redemption_amount), transaction_id)
                .then(result => {
                    res.json(result);
                })
                .catch(error => {
                    res.status(500).json({ error: error.message });
                });
        }
    });
});

// GET - Check gift card balance
app.get("/cards/:cardId/balance", function (req, res) {
    const cardId = req.params.cardId;
    
    giftDBs.gift_cards.findOne({ 
        $or: [
            { card_id: cardId },
            { card_number: cardId }
        ]
    }, function (err, card) {
        if (err) {
            res.status(500).json({ error: "Internal Server Error" });
        } else if (!card) {
            res.status(404).json({ error: "Gift card not found" });
        } else {
            res.json({
                card_id: card.card_id,
                card_number: card.card_number,
                current_balance: card.card_details.current_balance,
                denomination: card.card_details.denomination,
                validity: {
                    is_valid: new Date() < new Date(card.validity.expiry_date),
                    expiry_date: card.validity.expiry_date,
                    days_remaining: calculateDaysRemaining(card.validity.expiry_date)
                },
                status: card.status
            });
        }
    });
});

// GET - Gift card transaction history
app.get("/cards/:cardId/transactions", function (req, res) {
    const cardId = req.params.cardId;
    const { limit } = req.query;
    
    giftDBs.gift_cards.findOne({ 
        $or: [
            { card_id: cardId },
            { card_number: cardId }
        ]
    }, function (err, card) {
        if (err || !card) {
            res.status(404).json({ error: "Gift card not found" });
            return;
        }

        const transactions = card.transactions || [];
        const sortedTransactions = transactions
            .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
            .slice(0, parseInt(limit) || 50);

        res.json({
            card_id: card.card_id,
            total_transactions: transactions.length,
            transactions: sortedTransactions
        });
    });
});

/**
 * GIFT BUNDLE MANAGEMENT
 */

// POST - Create gift bundle
app.post("/bundles/create", function (req, res) {
    const {
        bundle_name,
        bundle_type, // "curated", "build_your_own", "seasonal", "occasion"
        components,
        pricing,
        customization_options,
        availability,
        marketing_info
    } = req.body;

    if (!bundle_name || !components || components.length === 0) {
        res.status(400).json({ error: "Bundle name and components are required" });
        return;
    }

    const giftBundle = {
        bundle_id: `BUNDLE${Date.now()}`,
        bundle_name: validator.escape(bundle_name),
        bundle_type: validator.escape(bundle_type || "curated"),
        
        // Bundle Details
        bundle_details: {
            description: validator.escape(req.body.description || ""),
            category: validator.escape(req.body.category || "general"),
            occasion: validator.escape(req.body.occasion || ""),
            gender: validator.escape(req.body.gender || "unisex"),
            age_group: validator.escape(req.body.age_group || "adults"),
            season: validator.escape(req.body.season || "all_season"),
            style_theme: validator.escape(req.body.style_theme || "")
        },

        // Bundle Components
        components: components.map(component => ({
            component_id: `COMP${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            product_id: parseInt(component.product_id),
            product_name: validator.escape(component.product_name),
            category: validator.escape(component.category),
            quantity: parseInt(component.quantity) || 1,
            individual_price: parseFloat(component.individual_price),
            included_price: parseFloat(component.included_price || component.individual_price),
            is_mandatory: component.is_mandatory || false,
            variant_selection: component.variant_selection || {}
        })),

        // Pricing Structure
        pricing: {
            total_individual_price: pricing?.total_individual_price || calculateTotalIndividualPrice(components),
            bundle_price: parseFloat(pricing?.bundle_price || 0),
            total_discount: pricing?.total_discount || 0,
            discount_percentage: pricing?.discount_percentage || 0,
            savings_per_customer: pricing?.savings_per_customer || 0
        },

        // Bundle Variants
        variants: req.body.variants || [],

        // Availability Management
        availability: {
            is_available: availability?.is_available !== false,
            stock_status: availability?.stock_status || "in_stock",
            current_stock: parseInt(availability?.current_stock) || 0,
            low_stock_threshold: parseInt(availability?.low_stock_threshold) || 10,
            pre_order_available: availability?.pre_order_available || false,
            lead_time_days: parseInt(availability?.lead_time_days) || 3
        },

        // Customization Options
        customization: {
            allow_component_substitution: customization_options?.allow_component_substitution || false,
            allow_size_selection: customization_options?.allow_size_selection || true,
            allow_color_selection: customization_options?.allow_color_selection || false,
            gift_wrapping_included: customization_options?.gift_wrapping_included || false,
            gift_message_included: customization_options?.gift_message_included || true,
            personalization_options: customization_options?.personalization_options || {}
        },

        // Marketing Information
        marketing: {
            featured: marketing_info?.featured || false,
            banner_image: validator.escape(marketing_info?.banner_image || ""),
            gallery_images: marketing_info?.gallery_images || [],
            promotional_tags: marketing_info?.promotional_tags || [],
            seo_title: validator.escape(marketing_info?.seo_title || ""),
            seo_description: validator.escape(marketing_info?.seo_description || "")
        },

        // Performance Metrics
        performance: {
            views: 0,
            conversions: 0,
            conversion_rate: 0,
            revenue_generated: 0,
            average_order_value: 0,
            return_rate: 0,
            customer_satisfaction: 0,
            last_sold_date: null
        },

        // Validity Period
        validity: {
            start_date: req.body.start_date || new Date().toISOString(),
            end_date: req.body.end_date || null,
            is_seasonal: req.body.is_seasonal || false,
            limited_time_offer: req.body.limited_time_offer || false
        },

        status: {
            is_active: true,
            created_at: new Date().toISOString(),
            created_by: validator.escape(req.body.created_by || "admin")
        }
    };

    giftDBs.gift_bundles.insert(giftBundle, function (err, newBundle) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to create gift bundle" });
        } else {
            res.status(201).json({
                success: true,
                bundle_id: giftBundle.bundle_id,
                message: "Gift bundle created successfully",
                bundle: newBundle
            });
        }
    });
});

// GET - Get available gift bundles
app.get("/bundles/available", function (req, res) {
    const { category, occasion, gender, price_range, in_stock_only } = req.query;
    
    let query = { "status.is_active": true };
    
    if (category) query["bundle_details.category"] = category;
    if (occasion) query["bundle_details.occasion"] = occasion;
    if (gender) query["bundle_details.gender"] = gender;
    if (in_stock_only === 'true') {
        query["availability.is_available"] = true;
        query["availability.current_stock"] = { $gt: 0 };
    }

    giftDBs.gift_bundles.find(query, function (err, bundles) {
        if (err) {
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            // Filter by price range if specified
            let filteredBundles = bundles;
            if (price_range) {
                const [min, max] = price_range.split('-').map(p => parseFloat(p));
                filteredBundles = bundles.filter(b => {
                    const price = b.pricing.bundle_price;
                    return (!min || price >= min) && (!max || price <= max);
                });
            }

            res.send(filteredBundles);
        }
    });
});

// POST - Process bundle order
app.post("/bundles/:bundleId/process-order", function (req, res) {
    const bundleId = req.params.bundleId;
    const { quantity, selected_variants, customer_id } = req.body;
    
    giftDBs.gift_bundles.findOne({ bundle_id: bundleId }, function (err, bundle) {
        if (err || !bundle) {
            res.status(404).json({ error: "Bundle not found" });
            return;
        }

        // Validate availability
        if (!bundle.availability.is_available) {
            res.status(400).json({ error: "Bundle is not available" });
            return;
        }

        if (bundle.availability.current_stock < quantity) {
            res.status(400).json({ 
                error: "Insufficient stock", 
                available_quantity: bundle.availability.current_stock 
            });
            return;
        }

        // Process the bundle order
        processBundleOrder(bundle, quantity, selected_variants, customer_id)
            .then(result => {
                res.json(result);
            })
            .catch(error => {
                res.status(500).json({ error: error.message });
            });
    });
});

/**
 * GIFT WRAPPING AND PACKAGING
 */

// GET - Available wrapping styles
app.get("/wrapping/styles", function (req, res) {
    giftDBs.gift_wrapping.find({ "status.is_available": true }, function (err, styles) {
        if (err) {
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.send(styles);
        }
    });
});

// POST - Add gift wrapping option
app.post("/wrapping/add-style", function (req, res) {
    const {
        style_name,
        style_category, // "elegant", "colorful", "minimalist", "festive", "seasonal"
        cost,
        description,
        images,
        personalization_options
    } = req.body;

    if (!style_name || !style_category || cost === undefined) {
        res.status(400).json({ error: "Style name, category, and cost are required" });
        return;
    }

    const wrappingStyle = {
        style_id: `WRAP${Date.now()}`,
        style_name: validator.escape(style_name),
        style_category: validator.escape(style_category),
        
        details: {
            cost: parseFloat(cost),
            description: validator.escape(description || ""),
            images: images || [],
            personalization_options: personalization_options || {},
            occasion_compatibility: req.body.occasion_compatibility || [],
            gender_compatibility: req.body.gender_compatibility || ["unisex"]
        },

        availability: {
            is_available: true,
            seasonal_availability: req.body.seasonal_availability || "year_round",
            stock_level: parseInt(req.body.stock_level) || 100,
            lead_time_days: parseInt(req.body.lead_time_days) || 0
        },

        status: {
            is_active: true,
            created_at: new Date().toISOString(),
            created_by: validator.escape(req.body.created_by || "admin")
        }
    };

    giftDBs.gift_wrapping.insert(wrappingStyle, function (err, newStyle) {
        if (err) {
            res.status(500).json({ error: "Failed to add wrapping style" });
        } else {
            res.status(201).json({
                success: true,
                style_id: wrappingStyle.style_id,
                message: "Gift wrapping style added successfully"
            });
        }
    });
});

// POST - Calculate wrapping cost
app.post("/wrapping/calculate-cost", function (req, res) {
    const { style_id, quantity, personalization } = req.body;
    
    giftDBs.gift_wrapping.findOne({ style_id }, function (err, style) {
        if (err || !style) {
            res.status(404).json({ error: "Wrapping style not found" });
            return;
        }

        const baseCost = style.details.cost * (quantity || 1);
        const personalizationCost = calculatePersonalizationCost(style, personalization);
        const totalCost = baseCost + personalizationCost;

        res.json({
            style_name: style.style_name,
            quantity: quantity || 1,
            base_cost: baseCost,
            personalization_cost: personalizationCost,
            total_cost: totalCost,
            breakdown: {
                per_unit_cost: style.details.cost,
                personalization_included: !!personalization
            }
        });
    });
});

/**
 * GIFT OCCASION MANAGEMENT
 */

// GET - Get gift occasions
app.get("/occasions", function (req, res) {
    const { active_only, occasion_type } = req.query;
    
    let query = {};
    if (active_only === 'true') {
        query['status.is_active'] = true;
    }
    if (occasion_type) {
        query.occasion_type = occasion_type;
    }

    giftDBs.gift_occasions.find(query, function (err, occasions) {
        if (err) {
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.send(occasions);
        }
    });
});

// POST - Create gift occasion
app.post("/occasions/create", function (req, res) {
    const {
        occasion_name,
        occasion_type, // "festival", "birthday", "anniversary", "wedding", "corporate", "seasonal"
        date_information,
        target_demographics,
        gift_preferences,
        promotional_strategy
    } = req.body;

    if (!occasion_name || !occasion_type) {
        res.status(400).json({ error: "Occasion name and type are required" });
        return;
    }

    const giftOccasion = {
        occasion_id: `OCC${Date.now()}`,
        occasion_name: validator.escape(occasion_name),
        occasion_type: validator.escape(occasion_type),
        
        // Occasion Details
        occasion_details: {
            description: validator.escape(req.body.description || ""),
            cultural_significance: validator.escape(req.body.cultural_significance || ""),
            celebration_type: validator.escape(req.body.celebration_type || "")
        },

        // Date and Timing
        date_information: {
            primary_date: date_information?.primary_date || null,
            celebration_period: date_information?.celebration_period || {},
            duration_days: parseInt(date_information?.duration_days) || 1,
            recurrence: validator.escape(date_information?.recurrence || "annual"),
            next_occurrence: date_information?.next_occurrence || null,
            preparation_period_days: parseInt(date_information?.preparation_period_days) || 30
        },

        // Target Demographics
        target_demographics: {
            age_groups: target_demographics?.age_groups || ["all_ages"],
            genders: target_demographics?.genders || ["male", "female"],
            family_structure: target_demographics?.family_structure || [],
            income_brackets: target_demographics?.income_brackets || ["all_income_levels"],
            geographic_regions: target_demographics?.geographic_regions || [],
            cultural_groups: target_demographics?.cultural_groups || []
        },

        // Gift Preferences
        gift_preferences: {
            traditional_gifts: gift_preferences?.traditional_gifts || {},
            modern_gifts: gift_preferences?.modern_gifts || {},
            price_ranges: gift_preferences?.price_ranges || {},
            gift_categories: gift_preferences?.gift_categories || [],
            bundling_opportunities: gift_preferences?.bundling_opportunities || []
        },

        // Promotional Strategy
        promotional_strategy: {
            discount_offers: promotional_strategy?.discount_offers || {},
            campaign_timing: promotional_strategy?.campaign_timing || {},
            target_audience: promotional_strategy?.target_audience || "all_customers",
            communication_channels: promotional_strategy?.communication_channels || []
        },

        // Performance Tracking
        performance_tracking: {
            previous_year_performance: promotional_strategy?.previous_year_performance || {},
            current_year_projections: promotional_strategy?.current_year_projections || {},
            benchmarks: promotional_strategy?.benchmarks || {}
        },

        status: {
            is_active: true,
            created_at: new Date().toISOString(),
            created_by: validator.escape(req.body.created_by || "admin")
        }
    };

    giftDBs.gift_occasions.insert(giftOccasion, function (err, newOccasion) {
        if (err) {
            res.status(500).json({ error: "Failed to create gift occasion" });
        } else {
            res.status(201).json({
                success: true,
                occasion_id: giftOccasion.occasion_id,
                message: "Gift occasion created successfully"
            });
        }
    });
});

/**
 * GIFT ANALYTICS AND BUSINESS INTELLIGENCE
 */

// GET - Gift sales analytics
app.get("/analytics/sales", function (req, res) {
    const { start_date, end_date, gift_type, occasion } = req.query;
    
    let query = {};
    if (start_date || end_date) {
        query.date = {};
        if (start_date) query.date.$gte = start_date;
        if (end_date) query.date.$lte = end_date;
    }
    if (gift_type) query.gift_type = gift_type;
    if (occasion) query.occasion = occasion;

    giftDBs.gift_analytics.find(query, function (err, analytics) {
        if (err) {
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            const aggregated = aggregateGiftAnalytics(analytics);
            res.json(aggregated);
        }
    });
});

// POST - Track gift transaction
app.post("/analytics/track-gift-transaction", function (req, res) {
    const {
        transaction_id,
        gift_type, // "receipt", "card", "bundle", "wrapping"
        occasion,
        customer_segment,
        order_value,
        gift_services_used,
        timestamp
    } = req.body;

    const analyticsRecord = {
        transaction_id,
        gift_type,
        occasion: occasion || null,
        customer_segment: customer_segment || "general",
        order_value: parseFloat(order_value) || 0,
        gift_services_used: gift_services_used || [],
        timestamp: timestamp || new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
    };

    giftDBs.gift_analytics.insert(analyticsRecord, function (err, record) {
        if (err) {
            res.status(500).json({ error: "Failed to track gift transaction" });
        } else {
            res.json({ success: true, message: "Gift transaction tracked successfully" });
        }
    });
});

/**
 * HELPER FUNCTIONS
 */

// Generate gift receipt number
function generateGiftReceiptNumber() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `GR${timestamp.slice(-6)}${random}`;
}

// Generate gift card ID
function generateGiftCardId() {
    return `GC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

// Generate gift card number
function generateGiftCardNumber() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString().substr(2, 8);
    return `GC-${timestamp.slice(-4)}-${random.slice(0, 4)}-${random.slice(4, 8)}`;
}

// Generate gift card PIN
function generateGiftCardPIN() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Generate digital signature
function generateDigitalSignature() {
    return crypto.randomBytes(16).toString("hex");
}

// Generate checksum
function generateChecksum(items) {
    const data = JSON.stringify(items);
    return crypto.createHash('sha256').update(data).digest('hex');
}

// Calculate days remaining until expiry
function calculateDaysRemaining(expiryDate) {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Calculate total individual price of bundle components
function calculateTotalIndividualPrice(components) {
    return components.reduce((total, component) => {
        return total + (parseFloat(component.individual_price) * (component.quantity || 1));
    }, 0);
}

// Validate gift receipt
function validateGiftReceipt(receipt, returnReason) {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    return {
        valid: true,
        receipt_number: receipt.receipt_number,
        return_window: {
            eligible: true,
            expires_on: expiryDate.toISOString(),
            days_remaining: 30
        },
        conditions: [
            "Original tags must be attached",
            "Item must be unworn",
            "Gift receipt required for return"
        ],
        return_reason_accepted: validateReturnReason(returnReason)
    };
}

// Validate return reason
function validateReturnReason(returnReason) {
    const acceptedReasons = [
        "size_issue", "quality_issue", "wrong_item", "not_as_described", "damaged"
    ];
    return acceptedReasons.includes(returnReason);
}

// Validate gift card redemption
function validateGiftCardRedemption(card, redemptionAmount) {
    // Check expiry
    if (new Date() > new Date(card.validity.expiry_date)) {
        return { valid: false, error: "Gift card has expired" };
    }

    // Check balance
    if (card.card_details.current_balance < redemptionAmount) {
        return { 
            valid: false, 
            error: "Insufficient balance",
            current_balance: card.card_details.current_balance
        };
    }

    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = (card.transactions || []).filter(t => 
        t.transaction_date.startsWith(today) && t.transaction_type === 'purchase'
    );
    
    if (todayTransactions.length >= card.security.usage_limits.daily_limit) {
        return { valid: false, error: "Daily usage limit exceeded" };
    }

    return { valid: true };
}

// Process gift card redemption
async function processGiftCardRedemption(card, redemptionAmount, transactionId) {
    const newBalance = card.card_details.current_balance - redemptionAmount;
    const transaction = {
        transaction_id: `TXN${Date.now()}`,
        transaction_date: new Date().toISOString(),
        transaction_type: "purchase",
        amount: redemptionAmount,
        order_id: transactionId || "",
        remaining_balance: newBalance,
        store_location: validator.escape(req.body.store_location || "Online"),
        cashier: validator.escape(req.body.cashier || "System")
    };

    // Update card balance and add transaction
    card.card_details.current_balance = newBalance;
    card.transactions = card.transactions || [];
    card.transactions.push(transaction);
    card.status.usage_count += 1;
    card.status.last_used_date = new Date().toISOString();

    return new Promise((resolve, reject) => {
        giftDBs.gift_cards.update(
            { card_id: card.card_id },
            {
                $set: {
                    "card_details.current_balance": newBalance,
                    "status.usage_count": card.status.usage_count,
                    "status.last_used_date": card.status.last_used_date
                },
                $push: { transactions: transaction }
            },
            {},
            function (err) {
                if (err) {
                    reject(new Error("Failed to process redemption"));
                } else {
                    resolve({
                        success: true,
                        transaction_id: transaction.transaction_id,
                        redemption_amount: redemptionAmount,
                        remaining_balance: newBalance,
                        message: "Gift card redeemed successfully"
                    });
                }
            }
        );
    });
}

// Process gift card delivery
async function processGiftCardDelivery(card) {
    // This would integrate with email/SMS services
    // For now, returning a mock response
    return {
        delivery_method: card.design.delivery_method,
        delivery_status: "sent",
        delivery_timestamp: new Date().toISOString(),
        tracking_id: `DEL${Date.now()}`
    };
}

// Generate delivery options for gift receipt
async function generateDeliveryOptions(receipt) {
    const shareableLink = `${process.env.BASE_URL || 'http://localhost:3000'}/gift-receipt/${receipt.receipt_number}`;
    const qrCode = generateQRCode(shareableLink);
    
    return {
        email_sent: false,
        sms_sent: false,
        download_url: shareableLink,
        qr_code: qrCode,
        shareable_link: shareableLink
    };
}

// Generate QR code (placeholder)
function generateQRCode(data) {
    return `QR_${crypto.createHash('md5').update(data).digest("hex").substr(0, 16)}`;
}

// Calculate personalization cost
function calculatePersonalizationCost(style, personalization) {
    if (!personalization || !style.details.personalization_options) {
        return 0;
    }
    
    let cost = 0;
    const options = style.details.personalization_options;
    
    if (personalization.message && options.custom_message) {
        cost += options.custom_message.cost || 0;
    }
    
    if (personalization.ribbon && options.ribbon) {
        cost += options.ribbon.cost || 0;
    }
    
    return cost;
}

// Process bundle order
async function processBundleOrder(bundle, quantity, selectedVariants, customerId) {
    // Validate and reserve inventory
    const inventoryValidation = await validateBundleInventory(bundle, quantity, selectedVariants);
    if (!inventoryValidation.valid) {
        throw new Error(inventoryValidation.error);
    }

    // Calculate final price
    const finalPrice = bundle.pricing.bundle_price * quantity;
    
    // Reserve inventory (this would integrate with inventory system)
    await reserveBundleInventory(bundle, quantity, selectedVariants);

    return {
        success: true,
        bundle_id: bundle.bundle_id,
        quantity: quantity,
        unit_price: bundle.pricing.bundle_price,
        total_price: finalPrice,
        discount_applied: bundle.pricing.total_discount,
        customer_savings: bundle.pricing.savings_per_customer * quantity,
        estimated_delivery: calculateEstimatedDelivery(bundle),
        message: "Bundle order processed successfully"
    };
}

// Validate bundle inventory
async function validateBundleInventory(bundle, quantity, selectedVariants) {
    // This would check inventory levels for all components
    // For now, returning a mock response
    if (bundle.availability.current_stock < quantity) {
        return { valid: false, error: "Insufficient stock" };
    }
    return { valid: true };
}

// Reserve bundle inventory
async function reserveBundleInventory(bundle, quantity, selectedVariants) {
    // This would integrate with inventory system to reserve stock
    return true;
}

// Calculate estimated delivery
function calculateEstimatedDelivery(bundle) {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + bundle.availability.lead_time_days);
    return deliveryDate.toISOString();
}

// Aggregate gift analytics
function aggregateGiftAnalytics(analytics) {
    const aggregated = {
        total_gift_transactions: analytics.length,
        gift_type_breakdown: {},
        occasion_breakdown: {},
        customer_segment_breakdown: {},
        total_gift_revenue: 0,
        average_gift_order_value: 0,
        gift_service_usage: {},
        performance_metrics: {}
    };

    analytics.forEach(record => {
        aggregated.total_gift_revenue += record.order_value;
        
        // Gift type breakdown
        aggregated.gift_type_breakdown[record.gift_type] = 
            (aggregated.gift_type_breakdown[record.gift_type] || 0) + 1;
        
        // Occasion breakdown
        if (record.occasion) {
            aggregated.occasion_breakdown[record.occasion] = 
                (aggregated.occasion_breakdown[record.occasion] || 0) + 1;
        }
        
        // Customer segment breakdown
        aggregated.customer_segment_breakdown[record.customer_segment] = 
            (aggregated.customer_segment_breakdown[record.customer_segment] || 0) + 1;
        
        // Gift service usage
        record.gift_services_used.forEach(service => {
            aggregated.gift_service_usage[service] = 
                (aggregated.gift_service_usage[service] || 0) + 1;
        });
    });

    aggregated.average_gift_order_value = aggregated.total_gift_revenue / analytics.length;
    
    return aggregated;
}