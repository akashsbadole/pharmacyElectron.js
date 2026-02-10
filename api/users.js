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
    "users.db",
);

app.use(bodyParser.json());

module.exports = app;

const { getDatabase } = require('./database_utils');

let usersDB = getDatabase(dbPath);
usersDB.ensureIndex({ fieldName: "username", unique: true });

let sessionLogsPath = path.join(
    process.env.APPDATA,
    process.env.APPNAME,
    "server",
    "databases",
    "session_logs.db",
);

let sessionLogsDB = getDatabase(sessionLogsPath);
sessionLogsDB.ensureIndex({ fieldName: "_id", unique: true });

/**
 * GET endpoint: Get the welcome message for the Users API.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/", function (req, res) {
    res.send("Users API");
});

/**
 * GET endpoint: Get user details by user ID.
 *
 * @param {Object} req request object with user ID as a parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/user/:userId", function (req, res) {
    if (!req.params.userId) {
        res.status(500).send("ID field is required.");
    } else {
        usersDB.findOne(
            {
                _id: parseInt(req.params.userId),
            },
            function (err, docs) {
                res.send(docs);
            },
        );
    }
});

/**
 * GET endpoint: Log out a user by updating the user status.
 *
 * @param {Object} req request object with user ID as a parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/logout/:userId", function (req, res) {
    if (!req.params.userId) {
        res.status(500).send("ID field is required.");
    } else {
        usersDB.update(
            {
                _id: parseInt(req.params.userId),
            },
            {
                $set: {
                    status: "Logged Out_" + new Date(),
                },
            },
            {},
        );

        sessionLogsDB.insert({
            user_id: parseInt(req.params.userId),
            action: 'logout',
            timestamp: new Date().toISOString()
        });

        res.sendStatus(200);
    }
});

/**
 * POST endpoint: Verify manager credentials for void operations.
 *
 * @param {Object} req request object with username and password in the body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.post("/verify-manager", function (req, res) {
    usersDB.findOne(
        {
            username: validator.escape(req.body.username),
        },
        function (err, docs) {
            if (docs) {
                // Verify password
                bcrypt
                    .compare(req.body.password, docs.password)
                    .then((result) => {
                        if (result) {
                            res.send({ valid: true, user: docs });
                        } else {
                            res.send({ valid: false });
                        }
                    })
                    .catch((err) =>
                        res.send({ valid: false, message: err.message }),
                    );
            } else {
                res.send({ valid: false });
            }
        },
    );
});

/**
 * POST endpoint: Authenticate user login and update user status.
 *
 * @param {Object} req request object with login credentials in the body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.post("/login", function (req, res) {
    usersDB.findOne(
        {
            username: validator.escape(req.body.username),
        },
        function (err, docs) {
            if (docs) {
                //verify password
                bcrypt
                    .compare(req.body.password, docs.password)
                    .then((result) => {
                        if (result) {
                            usersDB.update(
                                {
                                    _id: docs._id,
                                },
                                {
                                    $set: {
                                        status: "Logged In_" + new Date(),
                                    },
                                },
                                {},
                            );
                            sessionLogsDB.insert({
                                user_id: docs._id,
                                action: 'login',
                                timestamp: new Date().toISOString()
                            });
                            res.send({ ...docs, auth: true });
                        }
                        //Invalid password
                        else res.send({ auth: false });
                    })
                    .catch((err) =>
                        res.send({ auth: false, message: err.message }),
                    );
            }
            //No user Account
            else res.send({ auth: false });
        },
    );
});

/**
 * GET endpoint: Get details of all users.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/all", function (req, res) {
    usersDB.find({}, function (err, docs) {
        res.send(docs);
    });
});

/**
 * DELETE endpoint: Delete a user by user ID.
 *
 * @param {Object} req request object with user ID as a parameter.
 * @param {Object} res response object.
 * @returns {void}
 */
app.delete("/user/:userId", function (req, res) {
    usersDB.remove(
        {
            _id: parseInt(req.params.userId),
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
 * POST endpoint: Create or update a user.
 *
 * @param {Object} req request object with user data in the body.
 * @param {Object} res response object.
 * @returns {void}
 */
app.post("/post", function (req, res) {
    //encrypt password
    bcrypt
        .hash(req.body.password, saltRounds)
        .then((hash) => {
            req.body.password = hash;
            const perms = [
                "perm_products",
                "perm_categories",
                "perm_transactions",
                "perm_users",
                "perm_settings",
            ];

            for (const perm of perms) {
                if (!!req.body[perm]) {
                    req.body[perm] = req.body[perm] === "on" ? 1 : 0;
                } else {
                    //create missing permission only with new users
                    if(req.body.id==="")
                    {
                      req.body[perm] = 0;  
                    }
                    
                }
            }

            let User = {
                ...req.body,
                status: "",
            };
            delete User.id;
            delete User.pass;
            if (req.body.id === "") {
                User._id = Date.now() + Math.floor(Math.random() * 1000);
                usersDB.insert(User, function (err, user) {
                    if (err) {
                        console.error(err);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: `An unexpected error occurred. ${err}`,
                        });
                    }
                    else {
                        res.send( user);
                    }
                });
            } else {
                usersDB.update(
                    {
                        _id: parseInt(req.body.id),
                    },
                    {
                        $set: User,
                    },
                    {},
                    function (err, numReplaced, user) {
                        if (err) {
                        console.error(err);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: `An unexpected error occurred. ${err}`,
                        });
                    }
                        else {
                            res.sendStatus(200);
                        }
                    },
                );
            }
        })
        .catch((err) => 
        {
          
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: `An unexpected error occurred. ${err}`,
                });
        });
});

/**
 * GET endpoint: Check and initialize the default admin user if not exists.
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/check", function (req, res) {
    usersDB.findOne(
        {
            _id: 1,
        },
        function (err, docs) {
            if (!docs) {
                bcrypt
                    .hash("admin", saltRounds)
                    .then((hash) => {
                        let user = {
                            _id: 1,
                            username: "admin",
                            fullname: "Administrator",
                            perm_products: 1,
                            perm_categories: 1,
                            perm_transactions: 1,
                            perm_users: 1,
                            perm_settings: 1,
                            status: "",
                        };
                        user.password = hash;
                        usersDB.insert(user, function (err, user) {
                            if (err) {
                                console.error(err);
                                res.status(500).json({
                                    error: "Internal Server Error",
                                    message: `An unexpected error occurred. ${err}`,
                                });
                            }
                        });
                    })
                    .catch((err) => 
                        {
                            console.error(err);
                            res.sendStatus(500).json({
                                    error: "Internal Server Error",
                                    message: `An unexpected error occurred. ${err}`
                                });
                        });
            }
        },
    );
});

/**
 * Get all users (for reporting functions)
 *
 * @param {Function} callback - Callback function to receive users data
 * @returns {void}
 */
app.getUsers = function (callback) {
    usersDB.find({}, function (err, docs) {
        if (err) {
            console.error(err);
            callback([]);
        } else {
            callback(docs);
        }
    });
};

/**
 * Utility: Mask sensitive data (Stub)
 * Call this before sending user/patient data if user lacks 'perm_sensitive_view'
 */
app.maskSensitiveData = function(data) {
    // Stub: In real imp, check user permissions and mask phone/email
    // console.log("Masking sensitive data...");
    return data;
};

/**
 * NEW: Waiter/Steward Assignment Functionality
 * Endpoints for managing waiter/steward assignments to orders and tables
 */

// Get all waiters/stewards
app.get("/waiters", function (req, res) {
    usersDB.find(
        {
            $or: [
                { role: "waiter" },
                { role: "steward" },
                { user_type: "waiter" },
                { user_type: "steward" }
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
        }
    );
});

// Assign waiter to order
app.post("/assign-waiter", function (req, res) {
    const { orderId, waiterId, tableNumber } = req.body;
    
    if (!orderId || !waiterId) {
        return res.status(400).json({
            error: "Bad Request",
            message: "orderId and waiterId are required"
        });
    }

    // Log the assignment
    sessionLogsDB.insert({
        action: 'waiter_assignment',
        waiter_id: parseInt(waiterId),
        order_id: orderId,
        table_number: tableNumber || null,
        timestamp: new Date().toISOString()
    });

    res.send({ 
        success: true, 
        message: 'Waiter assigned successfully',
        assignment: {
            orderId,
            waiterId,
            tableNumber,
            timestamp: new Date().toISOString()
        }
    });
});

// Get waiter assignments for a specific time period
app.get("/waiter-assignments", function (req, res) {
    const { startDate, endDate, waiterId } = req.query;
    
    let query = { action: 'waiter_assignment' };
    
    if (waiterId) {
        query.waiter_id = parseInt(waiterId);
    }
    
    if (startDate && endDate) {
        query.timestamp = {
            $gte: startDate,
            $lte: endDate
        };
    }

    sessionLogsDB.find(query, function (err, docs) {
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

// Update user with waiter-specific information
app.put("/update-waiter/:userId", function (req, res) {
    const userId = parseInt(req.params.userId);
    const { 
        role, 
        employee_id, 
        shift_timing, 
        zones, 
        commission_rate,
        hourly_rate,
        contact_number,
        hire_date,
        is_active 
    } = req.body;

    const updateData = {
        ...req.body,
        updated_at: new Date().toISOString()
    };

    // Ensure proper role assignment
    if (role && (role === 'waiter' || role === 'steward')) {
        updateData.user_type = role;
    }

    usersDB.update(
        { _id: userId },
        { $set: updateData },
        {},
        function (err, numReplaced) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: `An unexpected error occurred. ${err}`,
                });
            } else if (numReplaced === 0) {
                res.status(404).json({
                    error: "Not Found",
                    message: "User not found"
                });
            } else {
                res.send({ 
                    success: true, 
                    message: 'Waiter information updated successfully' 
                });
            }
        }
    );
});

// Get waiter performance statistics
app.get("/waiter-performance", function (req, res) {
    const { startDate, endDate } = req.query;
    
    let matchQuery = { action: 'waiter_assignment' };
    
    if (startDate && endDate) {
        matchQuery.timestamp = {
            $gte: startDate,
            $lte: endDate
        };
    }

    // Aggregation pipeline to get performance stats
    sessionLogsDB.find(matchQuery, function (err, assignments) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: `An unexpected error occurred. ${err}`,
            });
        } else {
            // Process assignments to get statistics
            const stats = {};
            assignments.forEach(assignment => {
                const waiterId = assignment.waiter_id;
                if (!stats[waiterId]) {
                    stats[waiterId] = {
                        waiter_id: waiterId,
                        total_orders: 0,
                        tables_served: new Set(),
                        first_assignment: assignment.timestamp,
                        last_assignment: assignment.timestamp
                    };
                }
                
                stats[waiterId].total_orders++;
                if (assignment.table_number) {
                    stats[waiterId].tables_served.add(assignment.table_number);
                }
                
                // Update time range
                if (assignment.timestamp < stats[waiterId].first_assignment) {
                    stats[waiterId].first_assignment = assignment.timestamp;
                }
                if (assignment.timestamp > stats[waiterId].last_assignment) {
                    stats[waiterId].last_assignment = assignment.timestamp;
                }
            });

            // Convert Set to Array for JSON serialization
            const result = Object.values(stats).map(stat => ({
                ...stat,
                tables_served: Array.from(stat.tables_served),
                unique_tables: stat.tables_served.size
            }));

            res.send(result);
        }
    });
});

// Bulk assign waiters to multiple orders
app.post("/bulk-assign-waiters", function (req, res) {
    const { assignments } = req.body; // Array of {orderId, waiterId, tableNumber}
    
    if (!Array.isArray(assignments)) {
        return res.status(400).json({
            error: "Bad Request",
            message: "assignments must be an array"
        });
    }

    const logsToInsert = assignments.map(assignment => ({
        action: 'waiter_assignment',
        waiter_id: parseInt(assignment.waiterId),
        order_id: assignment.orderId,
        table_number: assignment.tableNumber || null,
        timestamp: new Date().toISOString()
    }));

    sessionLogsDB.insert(logsToInsert, function (err, inserted) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: `An unexpected error occurred. ${err}`,
            });
        } else {
            res.send({ 
                success: true, 
                message: `${inserted.length} waiters assigned successfully`,
                assignments: inserted
            });
        }
    });
});
