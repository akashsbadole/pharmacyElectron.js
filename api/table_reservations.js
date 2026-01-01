const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const path = require("path");
const validator = require("validator");
const fs = require("fs");
const { getDatabase } = require('./database_utils');

const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

const dbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "table_reservations.db",
);

const tablesDBPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "tables.db",
);

app.use(bodyParser.json());

module.exports = app;

// Initialize databases
let reservationsDB = getDatabase(dbPath);
let tablesDB = getDatabase(tablesDBPath);

// Ensure indexes
reservationsDB.ensureIndex({ fieldName: "_id", unique: true });
reservationsDB.ensureIndex({ fieldName: "reservation_date" });
reservationsDB.ensureIndex({ fieldName: "table_id" });
reservationsDB.ensureIndex({ fieldName: "status" });
reservationsDB.ensureIndex({ fieldName: "customer_phone" });

/**
 * GET endpoint: Get the welcome message for the Table Reservations API.
 */
app.get("/", function (req, res) {
    res.send("Table Reservations API - Restaurant Table Booking System");
});

/**
 * GET endpoint: Get all reservations.
 */
app.get("/all", function (req, res) {
    const { 
        status, 
        date, 
        table_id, 
        customer_phone,
        limit = 50,
        page = 1 
    } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (date) query.reservation_date = { $regex: `^${date}` };
    if (table_id) query.table_id = parseInt(table_id);
    if (customer_phone) query.customer_phone = customer_phone;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    reservationsDB.find(query)
        .sort({ reservation_date: -1, reservation_time: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .exec(function (err, reservations) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to retrieve reservations"
                });
            }

            res.send(reservations);
        });
});

/**
 * GET endpoint: Get reservation by ID.
 */
app.get("/reservation/:id", function (req, res) {
    if (!req.params.id) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Reservation ID is required"
        });
    }

    reservationsDB.findOne(
        { _id: parseInt(req.params.id) },
        function (err, reservation) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to retrieve reservation"
                });
            }

            if (!reservation) {
                return res.status(404).json({
                    error: "Not Found",
                    message: "Reservation not found"
                });
            }

            res.send(reservation);
        }
    );
});

/**
 * POST endpoint: Create a new reservation.
 */
app.post("/create", function (req, res) {
    const {
        customer_name,
        customer_phone,
        customer_email,
        reservation_date,
        reservation_time,
        table_id,
        party_size,
        special_requests = "",
        occasion = "",
        seating_preference = "",
        estimated_duration = 120
    } = req.body;

    // Validation
    if (!customer_name || !customer_phone || !reservation_date || !reservation_time || !table_id || !party_size) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Required fields: customer_name, customer_phone, reservation_date, reservation_time, table_id, party_size"
        });
    }

    // Validate phone number format
    if (!validator.isMobilePhone(customer_phone, 'any')) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Invalid phone number format"
        });
    }

    // Validate email if provided
    if (customer_email && !validator.isEmail(customer_email)) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Invalid email format"
        });
    }

    // Check if table exists and can accommodate party size
    tablesDB.findOne({ _id: parseInt(table_id) }, function (err, table) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to validate table"
            });
        }

        if (!table) {
            return res.status(404).json({
                error: "Not Found",
                message: "Table not found"
            });
        }

        if (table.capacity < parseInt(party_size)) {
            return res.status(400).json({
                error: "Bad Request",
                message: `Table capacity (${table.capacity}) is insufficient for party size (${party_size})`
            });
        }

        // Check for conflicting reservations
        checkTableAvailability(table_id, reservation_date, reservation_time, estimated_duration)
            .then(available => {
                if (!available) {
                    return res.status(409).json({
                        error: "Conflict",
                        message: "Table is not available at the requested time"
                    });
                }

                // Create reservation
                const reservation = {
                    _id: Math.floor(Date.now() / 1000),
                    customer_name: validator.escape(customer_name),
                    customer_phone: validator.escape(customer_phone),
                    customer_email: customer_email ? validator.escape(customer_email) : "",
                    reservation_date: validator.escape(reservation_date),
                    reservation_time: validator.escape(reservation_time),
                    table_id: parseInt(table_id),
                    party_size: parseInt(party_size),
                    special_requests: validator.escape(special_requests),
                    occasion: validator.escape(occasion),
                    seating_preference: validator.escape(seating_preference),
                    estimated_duration: parseInt(estimated_duration),
                    status: "confirmed",
                    created_at: new Date().toISOString(),
                    created_by: req.body.created_by || "system",
                    confirmation_code: generateConfirmationCode(),
                    estimated_arrival: null,
                    actual_arrival: null,
                    actual_departure: null,
                    notes: "",
                    cancellation_reason: "",
                    total_amount: 0,
                    deposit_amount: 0,
                    payment_status: "pending"
                };

                reservationsDB.insert(reservation, function (err, newReservation) {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({
                            error: "Internal Server Error",
                            message: "Failed to create reservation"
                        });
                    }

                    res.status(201).json({
                        message: "Reservation created successfully",
                        reservation: newReservation
                    });
                });

            })
            .catch(error => {
                console.error("Availability check error:", error);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to check table availability"
                });
            });
    });
});

/**
 * GET endpoint: Get available tables for a specific date and time.
 */
app.get("/available-tables", function (req, res) {
    const { 
        date, 
        time, 
        party_size, 
        duration = 120 
    } = req.query;

    if (!date || !time || !party_size) {
        return res.status(400).json({
            error: "Bad Request",
            message: "Required parameters: date, time, party_size"
        });
    }

    // Get all tables that can accommodate the party size
    tablesDB.find({
        capacity: { $gte: parseInt(party_size) }
    }, function (err, tables) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve tables"
            });
        }

        // Check availability for each table
        const availabilityChecks = tables.map(table => {
            return checkTableAvailability(table._id, date, time, parseInt(duration))
                .then(available => ({
                    table: table,
                    available: available
                }));
        });

        Promise.all(availabilityChecks)
            .then(results => {
                const availableTables = results.filter(result => result.available).map(result => result.table);
                res.send(availableTables);
            })
            .catch(error => {
                console.error("Availability check error:", error);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to check table availability"
                });
            });
    });
});

/**
 * GET endpoint: Get reservation analytics.
 */
app.get("/analytics", function (req, res) {
    const { 
        start_date,
        end_date
    } = req.query;

    let query = {};
    if (start_date || end_date) {
        query.reservation_date = {};
        if (start_date) query.reservation_date.$gte = start_date;
        if (end_date) query.reservation_date.$lte = end_date;
    }

    reservationsDB.find(query, function (err, reservations) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve reservation analytics"
            });
        }

        const analytics = {
            total_reservations: reservations.length,
            status_breakdown: {},
            daily_stats: {},
            popular_times: {},
            average_party_size: 0,
            cancellation_rate: 0,
            no_show_rate: 0,
            table_utilization: {}
        };

        if (reservations.length === 0) {
            res.send(analytics);
            return;
        }

        let totalPartySize = 0;
        let cancelledCount = 0;
        let noShowCount = 0;

        reservations.forEach(reservation => {
            // Status breakdown
            const status = reservation.status || 'unknown';
            analytics.status_breakdown[status] = (analytics.status_breakdown[status] || 0) + 1;

            // Daily stats
            const date = reservation.reservation_date;
            if (!analytics.daily_stats[date]) {
                analytics.daily_stats[date] = { reservations: 0, total_party_size: 0 };
            }
            analytics.daily_stats[date].reservations++;
            analytics.daily_stats[date].total_party_size += parseInt(reservation.party_size) || 0;

            // Popular times
            const time = reservation.reservation_time;
            analytics.popular_times[time] = (analytics.popular_times[time] || 0) + 1;

            // Calculate metrics
            totalPartySize += parseInt(reservation.party_size) || 0;

            if (status === 'cancelled') cancelledCount++;
            if (status === 'no_show') noShowCount++;
        });

        analytics.average_party_size = totalPartySize / reservations.length;
        analytics.cancellation_rate = (cancelledCount / reservations.length) * 100;
        analytics.no_show_rate = (noShowCount / reservations.length) * 100;

        res.send(analytics);
    });
});

/**
 * GET endpoint: Get pending reservations for today
 */
app.get("/pending-today", function (req, res) {
    const today = new Date().toISOString().split('T')[0];
    
    reservationsDB.find({
        reservation_date: today,
        status: { $in: ['confirmed', 'pending'] }
    }, function (err, reservations) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to retrieve pending reservations"
            });
        }

        res.send(reservations);
    });
});

/**
 * GET endpoint: Search reservations by customer information
 */
app.get("/search", function (req, res) {
    const { 
        customer_name,
        customer_phone,
        customer_email,
        confirmation_code
    } = req.query;

    if (!customer_name && !customer_phone && !customer_email && !confirmation_code) {
        return res.status(400).json({
            error: "Bad Request",
            message: "At least one search parameter is required"
        });
    }

    let query = {};
    
    if (customer_name) {
        query.customer_name = { $regex: new RegExp(customer_name, 'i') };
    }
    
    if (customer_phone) {
        query.customer_phone = { $regex: new RegExp(customer_phone, 'i') };
    }
    
    if (customer_email) {
        query.customer_email = { $regex: new RegExp(customer_email, 'i') };
    }
    
    if (confirmation_code) {
        query.confirmation_code = confirmation_code.toUpperCase();
    }

    reservationsDB.find(query)
        .sort({ reservation_date: -1, reservation_time: -1 })
        .limit(20)
        .exec(function (err, reservations) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to search reservations"
                });
            }

            res.send(reservations);
        });
});

/**
 * Helper Functions
 */

/**
 * Check if a table is available for a specific time slot
 */
function checkTableAvailability(tableId, date, time, duration, excludeReservationId = null) {
    return new Promise((resolve, reject) => {
        const query = {
            table_id: parseInt(tableId),
            reservation_date: date,
            status: { $nin: ['cancelled'] }
        };

        if (excludeReservationId) {
            query._id = { $ne: parseInt(excludeReservationId) };
        }

        reservationsDB.find(query, function (err, reservations) {
            if (err) {
                reject(err);
                return;
            }

            // Parse reservation time
            const [reservationHour, reservationMinute] = time.split(':').map(Number);
            const reservationStartMinutes = reservationHour * 60 + reservationMinute;
            const reservationEndMinutes = reservationStartMinutes + duration;

            // Check for conflicts
            for (const reservation of reservations) {
                const [existingHour, existingMinute] = reservation.reservation_time.split(':').map(Number);
                const existingStartMinutes = existingHour * 60 + existingMinute;
                const existingEndMinutes = existingStartMinutes + (reservation.estimated_duration || 120);

                // Check for time overlap
                if (reservationStartMinutes < existingEndMinutes && 
                    reservationEndMinutes > existingStartMinutes) {
                    resolve(false);
                    return;
                }
            }

            resolve(true);
        });
    });
}

/**
 * Generate a unique confirmation code
 */
function generateConfirmationCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
