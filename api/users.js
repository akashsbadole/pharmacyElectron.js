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
                User._id = Math.floor(Date.now() / 1000);
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
 * GET endpoint: Check user permissions and status (for application validation).
 *
 * @param {Object} req request object.
 * @param {Object} res response object.
 * @returns {void}
 */
app.get("/check/", function (req, res) {
    // This endpoint is used by the application to validate user permissions
    // Return basic user info without sensitive data
    usersDB.findOne(
        {
            _id: 1,
        },
        function (err, docs) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "An unexpected error occurred.",
                });
            } else {
                if (!docs) {
                    // Initialize default admin user if not exists
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
                                        message: "Failed to create default admin user.",
                                    });
                                } else {
                                    res.json({
                                        success: true,
                                        message: "Default admin user created",
                                        user: {
                                            _id: user._id,
                                            username: user.username,
                                            fullname: user.fullname,
                                            permissions: {
                                                products: user.perm_products,
                                                categories: user.perm_categories,
                                                transactions: user.perm_transactions,
                                                users: user.perm_users,
                                                settings: user.perm_settings
                                            }
                                        }
                                    });
                                }
                            });
                        })
                        .catch((err) => {
                            console.error(err);
                            res.status(500).json({
                                error: "Internal Server Error",
                                message: "Failed to create default admin user.",
                            });
                        });
                } else {
                    // Return existing user info
                    res.json({
                        success: true,
                        user: {
                            _id: docs._id,
                            username: docs.username,
                            fullname: docs.fullname,
                            permissions: {
                                products: docs.perm_products,
                                categories: docs.perm_categories,
                                transactions: docs.perm_transactions,
                                users: docs.perm_users,
                                settings: docs.perm_settings
                            }
                        }
                    });
                }
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
