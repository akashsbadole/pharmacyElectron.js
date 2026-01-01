const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const validator = require("validator");
const path = require("path");
const dbPath = path.join(
    process.env.APPDATA,
    process.env.APPNAME,
    "server",
    "databases",
    "delivery_partners.db",
);

app.use(bodyParser.json());

module.exports = app;

const { getDatabase } = require('./database_utils');

let deliveryPartnersDB = getDatabase(dbPath);
deliveryPartnersDB.ensureIndex({ fieldName: "_id", unique: true });
deliveryPartnersDB.ensureIndex({ fieldName: "partner_id", unique: true });

/**
 * GET endpoint: Get the welcome message for the Delivery Partners API.
 */
app.get("/", function (req, res) {
    res.send("Delivery Partners API");
});

/**
 * GET endpoint: Get all delivery partners.
 */
app.get("/all", function (req, res) {
    deliveryPartnersDB.find({}, function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: `An unexpected error occurred. ${err}`,
            });
        } else {
            res.send(docs);
        }
    });
});

/**
 * GET endpoint: Get delivery partner by ID.
 */
app.get("/partner/:partnerId", function (req, res) {
    if (!req.params.partnerId) {
        res.status(500).send("Partner ID field is required.");
    } else {
        deliveryPartnersDB.findOne(
            {
                _id: parseInt(req.params.partnerId),
            },
            function (err, docs) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: `An unexpected error occurred. ${err}`,
                    });
                } else {
                    res.send(docs);
                }
            },
        );
    }
});

/**
 * POST endpoint: Create or update a delivery partner.
 */
app.post("/post", function (req, res) {
    const processPassword = (password) => {
        if (password) {
            return bcrypt.hash(password, saltRounds);
        }
        return Promise.resolve(null);
    };

    processPassword(req.body.password)
        .then((hash) => {
            if (hash) {
                req.body.password = hash;
            }

            const permissions = [
                "perm_accept_orders",
                "perm_update_status", 
                "perm_view_analytics",
                "perm_manage_deliveries"
            ];

            for (const perm of permissions) {
                if (req.body[perm]) {
                    req.body[perm] = req.body[perm] === "on" ? 1 : 0;
                } else {
                    if (req.body.id === "") {
                        req.body[perm] = 0;
                    }
                }
            }

            const partner = {
                ...req.body,
                status: req.body.status || "active",
                is_active: req.body.is_active !== undefined ? req.body.is_active : true,
                created_at: req.body.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            delete partner.id;
            delete partner.pass;

            if (req.body.id === "") {
                partner._id = Math.floor(Date.now() / 1000);
                partner.partner_id = partner._id;
                
                deliveryPartnersDB.insert(partner, function (err, partnerDoc) {
                    if (err) {
                        console.error(err);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: `An unexpected error occurred. ${err}`,
                        });
                    } else {
                        res.send(partnerDoc);
                    }
                });
            } else {
                deliveryPartnersDB.update(
                    {
                        _id: parseInt(req.body.id),
                    },
                    {
                        $set: partner,
                    },
                    {},
                    function (err, numReplaced) {
                        if (err) {
                            console.error(err);
                            res.status(500).json({
                                error: "Internal Server Error",
                                message: `An unexpected error occurred. ${err}`,
                            });
                        } else {
                            res.sendStatus(200);
                        }
                    },
                );
            }
        })
        .catch((err) => {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: `An unexpected error occurred. ${err}`,
            });
        });
});

/**
 * POST endpoint: Authenticate delivery partner login.
 */
app.post("/login", function (req, res) {
    deliveryPartnersDB.findOne(
        {
            partner_id: validator.escape(req.body.partner_id),
        },
        function (err, partner) {
            if (partner) {
                if (partner.password) {
                    bcrypt
                        .compare(req.body.password, partner.password)
                        .then((result) => {
                            if (result) {
                                deliveryPartnersDB.update(
                                    {
                                        _id: partner._id,
                                    },
                                    {
                                        $set: {
                                            last_login: new Date().toISOString(),
                                            status: "online",
                                        },
                                    },
                                    {},
                                );
                                res.send({ ...partner, auth: true });
                            } else {
                                res.send({ auth: false });
                            }
                        })
                        .catch((err) =>
                            res.send({ auth: false, message: err.message }),
                        );
                } else {
                    deliveryPartnersDB.update(
                        {
                            _id: partner._id,
                        },
                        {
                            $set: {
                                last_login: new Date().toISOString(),
                                status: "online",
                            },
                        },
                        {},
                    );
                    res.send({ ...partner, auth: true });
                }
            } else {
                res.send({ auth: false });
            }
        },
    );
});

/**
 * POST endpoint: Logout delivery partner.
 */
app.post("/logout", function (req, res) {
    const { partner_id } = req.body;
    
    if (!partner_id) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Partner ID is required"
        });
    }

    deliveryPartnersDB.update(
        {
            partner_id: partner_id,
        },
        {
            $set: {
                status: "offline",
                last_logout: new Date().toISOString(),
            },
        },
        {},
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: `An unexpected error occurred. ${err}`,
                });
            } else {
                res.send({ success: true, message: "Logged out successfully" });
            }
        },
    );
});

/**
 * DELETE endpoint: Delete a delivery partner.
 */
app.delete("/partner/:partnerId", function (req, res) {
    deliveryPartnersDB.remove(
        {
            _id: parseInt(req.params.partnerId),
        },
        function (err, numRemoved) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: `An unexpected error occurred. ${err}`,
                });
            } else {
                res.sendStatus(200);
            }
        },
    );
});

/**
 * GET endpoint: Get delivery partners by status.
 */
app.get("/by-status", function (req, res) {
    const { status } = req.query;
    
    let query = {};
    if (status) {
        query.status = status;
    }
    
    deliveryPartnersDB.find(query, function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: `An unexpected error occurred. ${err}`,
            });
        } else {
            res.send(docs);
        }
    });
});

/**
 * POST endpoint: Assign delivery partner to order.
 */
app.post("/assign-to-order", function (req, res) {
    const { transaction_id, partner_id, order_type, delivery_address, estimated_time } = req.body;
    
    if (!transaction_id || !partner_id) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Transaction ID and Partner ID are required"
        });
    }

    deliveryPartnersDB.update(
        {
            partner_id: partner_id,
        },
        {
            $set: {
                current_order: transaction_id,
                status: "busy",
                last_assignment: new Date().toISOString(),
            },
        },
        {},
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: `An unexpected error occurred. ${err}`,
                });
            } else {
                res.send({
                    success: true,
                    message: "Delivery partner assigned successfully",
                    assignment: {
                        transaction_id,
                        partner_id,
                        order_type: order_type || "delivery",
                        delivery_address,
                        estimated_time,
                        assigned_at: new Date().toISOString()
                    }
                });
            }
        },
    );
});

/**
 * POST endpoint: Update delivery status.
 */
app.post("/update-delivery-status", function (req, res) {
    const { transaction_id, partner_id, status, location, notes } = req.body;
    
    if (!transaction_id || !partner_id) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Transaction ID and Partner ID are required"
        });
    }

    const updateData = {
        delivery_status: status,
        delivery_updated_at: new Date().toISOString(),
        delivery_notes: notes || ""
    };

    if (location) {
        updateData.current_location = location;
    }

    if (status === "delivered" || status === "cancelled") {
        updateData.status = "available";
        updateData.current_order = null;
    }

    deliveryPartnersDB.update(
        {
            partner_id: partner_id,
        },
        {
            $set: updateData,
        },
        {},
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: `An unexpected error occurred. ${err}`,
                });
            } else {
                res.send({
                    success: true,
                    message: "Delivery status updated successfully",
                    status: status,
                    timestamp: new Date().toISOString()
                });
            }
        },
    );
});

/**
 * GET endpoint: Get delivery partner performance analytics.
 */
app.get("/performance", function (req, res) {
    const { start_date, end_date, partner_id } = req.query;
    
    let query = {};
    
    if (partner_id) {
        query.partner_id = partner_id;
    }
    
    if (start_date && end_date) {
        query.created_at = {
            $gte: start_date,
            $lte: end_date
        };
    }

    deliveryPartnersDB.find(query, function (err, partners) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: `An unexpected error occurred. ${err}`,
            });
        } else {
            const performance = partners.map(partner => ({
                partner_id: partner.partner_id,
                name: partner.name || partner.partner_name,
                total_orders: partner.total_orders || 0,
                completed_orders: partner.completed_orders || 0,
                cancelled_orders: partner.cancelled_orders || 0,
                average_rating: partner.average_rating || 0,
                total_earnings: partner.total_earnings || 0,
                status: partner.status,
                last_login: partner.last_login,
                performance_score: calculatePerformanceScore(partner)
            }));

            res.send(performance);
        }
    });
});

/**
 * Helper function to calculate delivery partner performance score
 */
function calculatePerformanceScore(partner) {
    const totalOrders = partner.total_orders || 0;
    const completedOrders = partner.completed_orders || 0;
    const cancelledOrders = partner.cancelled_orders || 0;
    const rating = partner.average_rating || 0;
    
    if (totalOrders === 0) return 0;
    
    const completionRate = (completedOrders / totalOrders) * 100;
    const cancellationRate = (cancelledOrders / totalOrders) * 100;
    
    const score = (completionRate * 0.6) + (rating * 20) - (cancellationRate * 0.4);
    
    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * GET endpoint: Get available delivery partners for assignment.
 */
app.get("/available", function (req, res) {
    deliveryPartnersDB.find(
        {
            $and: [
                { status: "available" },
                { is_active: true }
            ]
        },
        function (err, docs) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: `An unexpected error occurred. ${err}`,
                });
            } else {
                res.send(docs);
            }
        },
    );
});

/**
 * POST endpoint: Update delivery partner location.
 */
app.post("/update-location", function (req, res) {
    const { partner_id, latitude, longitude, accuracy } = req.body;
    
    if (!partner_id || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Partner ID, latitude, and longitude are required"
        });
    }

    const locationUpdate = {
        current_location: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            accuracy: accuracy || null,
            timestamp: new Date().toISOString()
        },
        last_location_update: new Date().toISOString()
    };

    deliveryPartnersDB.update(
        {
            partner_id: partner_id,
        },
        {
            $set: locationUpdate,
        },
        {},
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: `An unexpected error occurred. ${err}`,
                });
            } else {
                res.send({
                    success: true,
                    message: "Location updated successfully",
                    location: locationUpdate.current_location
                });
            }
        },
    );
});

/**
 * GET endpoint: Get delivery partner location history.
 */
app.get("/location-history/:partnerId", function (req, res) {
    const partnerId = req.params.partnerId;
    
    deliveryPartnersDB.findOne(
        {
            partner_id: partnerId,
        },
        function (err, partner) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: `An unexpected error occurred. ${err}`,
                });
            } else {
                const locationData = {
                    partner_id: partnerId,
                    current_location: partner?.current_location || null,
                    last_location_update: partner?.last_location_update || null,
                    location_history: partner?.location_history || []
                };
                
                res.send(locationData);
            }
        },
    );
});

/**
 * POST endpoint: Mark delivery as completed.
 */
app.post("/complete-delivery", function (req, res) {
    const { transaction_id, partner_id, delivery_time, customer_rating, delivery_notes } = req.body;
    
    if (!transaction_id || !partner_id) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Transaction ID and Partner ID are required"
        });
    }

    const completionData = {
        delivery_status: "delivered",
        delivery_completed_at: new Date().toISOString(),
        customer_rating: customer_rating || 0,
        delivery_notes: delivery_notes || "",
        status: "available",
        current_order: null
    };

    deliveryPartnersDB.update(
        {
            partner_id: partner_id,
        },
        {
            $set: completionData,
        },
        {},
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: `An unexpected error occurred. ${err}`,
                });
            } else {
                res.send({
                    success: true,
                    message: "Delivery completed successfully",
                    completion: {
                        transaction_id,
                        partner_id,
                        delivery_time: delivery_time || new Date().toISOString(),
                        customer_rating,
                        completed_at: new Date().toISOString()
                    }
                });
            }
        },
    );
});

/**
 * Utility function to get all delivery partners (for reporting functions)
 */
app.getDeliveryPartners = function (callback) {
    deliveryPartnersDB.find({}, function (err, docs) {
        if (err) {
            console.error(err);
            callback([]);
        } else {
            callback(docs);
        }
    });
};
