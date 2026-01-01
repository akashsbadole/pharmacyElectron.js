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
    "tables.db",
);

const tableOrdersDbPath = path.join(
    appData,
    appName,
    "server",
    "databases",
    "table_orders.db",
);

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

module.exports = app;

// Initialize tables database
let tablesDB = getDatabase(dbPath);
tablesDB.ensureIndex({ fieldName: "_id", unique: true });
tablesDB.ensureIndex({ fieldName: "table_number" });
tablesDB.ensureIndex({ fieldName: "status" });
tablesDB.ensureIndex({ fieldName: "location" });

// Initialize table orders database
let tableOrdersDB = getDatabase(tableOrdersDbPath);
tableOrdersDB.ensureIndex({ fieldName: "_id", unique: true });
tableOrdersDB.ensureIndex({ fieldName: "table_id" });
tableOrdersDB.ensureIndex({ fieldName: "order_number" });
tableOrdersDB.ensureIndex({ fieldName: "order_status" });

// Table status constants
const TABLE_STATUS = {
    AVAILABLE: 'available',
    OCCUPIED: 'occupied',
    RESERVED: 'reserved',
    CLEANING: 'cleaning',
    OUT_OF_SERVICE: 'out_of_service'
};

// Table order status constants
const TABLE_ORDER_STATUS = {
    SEATED: 'seated',
    ORDERING: 'ordering',
    EATING: 'eating',
    READY_TO_LEAVE: 'ready_to_leave',
    CLOSED: 'closed'
};

/**
 * GET endpoint: Get the welcome message for the Tables API.
 */
app.get("/", function (req, res) {
    res.send("Tables API - Table Management System");
});

/**
 * GET endpoint: Get all tables with optional filtering
 */
app.get("/tables", function (req, res) {
    let query = {};
    let sortOptions = {};
    
    // Apply filters
    if (req.query.status) {
        query.status = req.query.status;
    }
    
    if (req.query.location) {
        query.location = req.query.location;
    }
    
    if (req.query.capacity) {
        query.capacity = parseInt(req.query.capacity);
    }
    
    if (req.query.search) {
        const searchTerm = req.query.search.toLowerCase();
        query.$or = [
            { table_number: new RegExp(searchTerm, 'i') },
            { table_name: new RegExp(searchTerm, 'i') },
            { location: new RegExp(searchTerm, 'i') }
        ];
    }
    
    // Sorting options
    if (req.query.sort) {
        switch (req.query.sort) {
            case 'number':
                sortOptions.table_number = 1;
                break;
            case 'capacity':
                sortOptions.capacity = 1;
                break;
            case 'location':
                sortOptions.location = 1;
                break;
            case 'status':
                sortOptions.status = 1;
                break;
            default:
                sortOptions.table_number = 1;
        }
    } else {
        sortOptions.table_number = 1;
    }
    
    tablesDB.find(query).sort(sortOptions).exec(function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            res.send(docs);
        }
    });
});

/**
 * GET endpoint: Get table by ID
 */
app.get("/tables/:tableId", function (req, res) {
    if (!req.params.tableId) {
        res.status(400).send("Table ID is required.");
    } else {
        tablesDB.findOne(
            { _id: req.params.tableId },
            function (err, table) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "An unexpected error occurred.",
                    });
                } else if (!table) {
                    res.status(404).json({
                        error: "Table not found",
                        message: "The requested table does not exist.",
                    });
                } else {
                    res.send(table);
                }
            }
        );
    }
});

/**
 * POST endpoint: Create a new table
 */
app.post("/tables", function (req, res) {
    try {
        const tableData = req.body;
        
        // Validate required fields
        if (!tableData.table_number || !tableData.capacity) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Table number and capacity are required."
            });
        }
        
        // Check for duplicate table numbers
        tablesDB.findOne({ table_number: tableData.table_number }, function (err, existingTable) {
            if (err) {
                return res.status(500).json({
                    error: "Database Error",
                    message: "Failed to check for duplicate table numbers."
                });
            }
            
            if (existingTable) {
                return res.status(400).json({
                    error: "Validation Error",
                    message: "A table with this number already exists."
                });
            }
            
            const table = {
                _id: tableData._id || Math.floor(Date.now() / 1000),
                table_number: validator.escape(tableData.table_number),
                table_name: validator.escape(tableData.table_name || tableData.table_number),
                capacity: parseInt(tableData.capacity) || 4,
                location: validator.escape(tableData.location || "Main"),
                status: TABLE_STATUS.AVAILABLE,
                position_x: parseFloat(tableData.position_x) || 0,
                position_y: parseFloat(tableData.position_y) || 0,
                width: parseInt(tableData.width) || 100,
                height: parseInt(tableData.height) || 100,
                shape: validator.escape(tableData.shape || "square"),
                is_active: tableData.is_active !== false,
                created_date: new Date().toISOString(),
                last_modified: new Date().toISOString()
            };
            
            tablesDB.insert(table, function (err, newTable) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "Failed to create table.",
                    });
                } else {
                    // Emit real-time update
                    if (global.io) {
                        global.io.emit('table-created', newTable);
                    }
                    
                    res.status(201).json(newTable);
                }
            });
        });
        
    } catch (error) {
        console.error("Table creation error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while creating the table.",
        });
    }
});

/**
 * PUT endpoint: Update an existing table
 */
app.put("/tables/:tableId", function (req, res) {
    try {
        const tableId = req.params.tableId;
        const tableData = req.body;
        
        // Check if table exists
        tablesDB.findOne({ _id: tableId }, function (err, existingTable) {
            if (err) {
                return res.status(500).json({
                    error: "Database Error",
                    message: "Failed to find table."
                });
            }
            
            if (!existingTable) {
                return res.status(404).json({
                    error: "Table not found",
                    message: "The table to update does not exist."
                });
            }
            
            // Check for duplicate table numbers (excluding current table)
            if (tableData.table_number && tableData.table_number !== existingTable.table_number) {
                tablesDB.findOne({ table_number: tableData.table_number }, function (err, duplicateTable) {
                    if (err) {
                        return res.status(500).json({
                            error: "Database Error",
                            message: "Failed to check for duplicate table numbers."
                        });
                    }
                    
                    if (duplicateTable) {
                        return res.status(400).json({
                            error: "Validation Error",
                            message: "A table with this number already exists."
                        });
                    }
                    
                    performUpdate();
                });
            } else {
                performUpdate();
            }
        });
        
        function performUpdate() {
            const updateData = {
                table_number: validator.escape(tableData.table_number || existingTable.table_number),
                table_name: validator.escape(tableData.table_name || existingTable.table_name),
                capacity: parseInt(tableData.capacity) || existingTable.capacity,
                location: validator.escape(tableData.location || existingTable.location),
                position_x: parseFloat(tableData.position_x) || existingTable.position_x,
                position_y: parseFloat(tableData.position_y) || existingTable.position_y,
                width: parseInt(tableData.width) || existingTable.width,
                height: parseInt(tableData.height) || existingTable.height,
                shape: validator.escape(tableData.shape || existingTable.shape),
                is_active: tableData.is_active !== undefined ? tableData.is_active : existingTable.is_active,
                last_modified: new Date().toISOString()
            };
            
            // Don't allow manual status updates through this endpoint
            // Use the dedicated status update endpoint instead
            
            tablesDB.update(
                { _id: tableId },
                { $set: updateData },
                {},
                function (err, numReplaced) {
                    if (err) {
                        console.error(err);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: "Failed to update table.",
                        });
                    } else {
                        // Emit real-time update
                        if (global.io) {
                            global.io.emit('table-updated', { table_id: tableId, ...updateData });
                        }
                        
                        tablesDB.findOne({ _id: tableId }, function (err, updatedTable) {
                            if (err) {
                                res.status(500).json({
                                    error: "Table updated but failed to retrieve updated data.",
                                });
                            } else {
                                res.json(updatedTable);
                            }
                        });
                    }
                }
            );
        }
        
    } catch (error) {
        console.error("Table update error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while updating the table.",
        });
    }
});

/**
 * PUT endpoint: Update table status
 */
app.put("/tables/:tableId/status", function (req, res) {
    try {
        const tableId = req.params.tableId;
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Status is required."
            });
        }
        
        const validStatuses = Object.values(TABLE_STATUS);
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Invalid status. Must be one of: " + validStatuses.join(", ")
            });
        }
        
        tablesDB.findOne({ _id: tableId }, function (err, table) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Database error."
                });
            }
            
            if (!table) {
                return res.status(404).json({
                    error: "Table not found",
                    message: "The table to update does not exist."
                });
            }
            
            const updateData = {
                status: status,
                last_modified: new Date().toISOString()
            };
            
            tablesDB.update(
                { _id: tableId },
                { $set: updateData },
                {},
                function (err, numReplaced) {
                    if (err) {
                        console.error(err);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: "Failed to update table status.",
                        });
                    } else {
                        // Emit real-time update
                        if (global.io) {
                            global.io.emit('table-status-updated', {
                                table_id: tableId,
                                status: status,
                                table_number: table.table_number
                            });
                        }
                        
                        tablesDB.findOne({ _id: tableId }, function (err, updatedTable) {
                            res.json(updatedTable);
                        });
                    }
                }
            );
        });
        
    } catch (error) {
        console.error("Table status update error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while updating the table status.",
        });
    }
});

/**
 * DELETE endpoint: Delete a table
 */
app.delete("/tables/:tableId", function (req, res) {
    const tableId = req.params.tableId;
    
    // Check if table has active orders
    tableOrdersDB.findOne({ table_id: tableId, order_status: { $in: [TABLE_ORDER_STATUS.SEATED, TABLE_ORDER_STATUS.ORDERING, TABLE_ORDER_STATUS.EATING] } }, function (err, activeOrder) {
        if (err) {
            return res.status(500).json({
                error: "Database Error",
                message: "Failed to check for active orders."
            });
        }
        
        if (activeOrder) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Cannot delete table with active orders."
            });
        }
        
        tablesDB.remove(
            { _id: tableId },
            {},
            function (err, numRemoved) {
                if (err) {
                    console.error(err);
                    res.status(500).json({
                        error: "Internal Server Error",
                        message: "Failed to delete table.",
                    });
                } else if (numRemoved === 0) {
                    res.status(404).json({
                        error: "Table not found",
                        message: "The table to delete does not exist.",
                    });
                } else {
                    // Emit real-time update
                    if (global.io) {
                        global.io.emit('table-deleted', { table_id: tableId });
                    }
                    
                    res.sendStatus(200);
                }
            }
        );
    });
});

/**
 * GET endpoint: Get table layout
 */
app.get("/layout", function (req, res) {
    tablesDB.find({ is_active: true }).sort({ position_x: 1, position_y: 1 }).exec(function (err, tables) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            res.send(tables);
        }
    });
});

/**
 * PUT endpoint: Update table layout positions
 */
app.put("/layout", function (req, res) {
    try {
        const { tables } = req.body;
        
        if (!Array.isArray(tables)) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Tables array is required."
            });
        }
        
        const updateOperations = tables.map(table => ({
            updateOne: {
                filter: { _id: table._id },
                update: { 
                    $set: { 
                        position_x: parseFloat(table.position_x) || 0,
                        position_y: parseFloat(table.position_y) || 0,
                        width: parseInt(table.width) || 100,
                        height: parseInt(table.height) || 100,
                        last_modified: new Date().toISOString()
                    }
                }
            }
        }));
        
        tablesDB.bulkWrite(updateOperations, function (err, result) {
            if (err) {
                console.error(err);
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Failed to update table layout.",
                });
            } else {
                // Emit real-time update
                if (global.io) {
                    global.io.emit('layout-updated', { tables: tables });
                }
                
                res.json({ 
                    message: "Layout updated successfully",
                    modified_count: result.modifiedCount 
                });
            }
        });
        
    } catch (error) {
        console.error("Layout update error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while updating the layout.",
        });
    }
});

/**
 * GET endpoint: Get table orders
 */
app.get("/orders", function (req, res) {
    let query = {};
    let sortOptions = { order_time: -1 };
    
    // Apply filters
    if (req.query.table_id) {
        query.table_id = req.query.table_id;
    }
    
    if (req.query.status) {
        query.order_status = req.query.status;
    }
    
    if (req.query.server_id) {
        query.server_id = req.query.server_id;
    }
    
    if (req.query.date) {
        const date = new Date(req.query.date);
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        
        query.order_time = {
            $gte: date.toISOString(),
            $lt: nextDate.toISOString()
        };
    }
    
    tableOrdersDB.find(query).sort(sortOptions).exec(function (err, docs) {
        if (err) {
            console.error(err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred.",
            });
        } else {
            res.send(docs);
        }
    });
});

/**
 * POST endpoint: Create a new table order
 */
app.post("/orders", function (req, res) {
    try {
        const orderData = req.body;
        
        // Validate required fields
        if (!orderData.table_id || !orderData.order_number) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Table ID and order number are required."
            });
        }
        
        // Check if table exists
        tablesDB.findOne({ _id: orderData.table_id }, function (err, table) {
            if (err) {
                return res.status(500).json({
                    error: "Database Error",
                    message: "Failed to find table."
                });
            }
            
            if (!table) {
                return res.status(404).json({
                    error: "Table not found",
                    message: "The specified table does not exist."
                });
            }
            
            // Check for existing active order on this table
            tableOrdersDB.findOne({ 
                table_id: orderData.table_id, 
                order_status: { $in: [TABLE_ORDER_STATUS.SEATED, TABLE_ORDER_STATUS.ORDERING, TABLE_ORDER_STATUS.EATING] }
            }, function (err, existingOrder) {
                if (err) {
                    return res.status(500).json({
                        error: "Database Error",
                        message: "Failed to check for existing orders."
                    });
                }
                
                if (existingOrder) {
                    return res.status(400).json({
                        error: "Validation Error",
                        message: "There is already an active order on this table."
                    });
                }
                
                const tableOrder = {
                    _id: orderData._id || Math.floor(Date.now() / 1000),
                    table_id: validator.escape(orderData.table_id),
                    order_number: validator.escape(orderData.order_number),
                    customer_count: parseInt(orderData.customer_count) || 1,
                    order_status: TABLE_ORDER_STATUS.SEATED,
                    server_id: validator.escape(orderData.server_id || ""),
                    order_time: new Date().toISOString(),
                    estimated_service_time: orderData.estimated_service_time ? new Date(orderData.estimated_service_time).toISOString() : null,
                    actual_service_time: null,
                    bill_total: parseFloat(orderData.bill_total) || 0,
                    bill_status: "open",
                    bill_split_info: Array.isArray(orderData.bill_split_info) ? orderData.bill_split_info : [],
                    special_requests: validator.escape(orderData.special_requests || ""),
                    feedback_rating: null,
                    notes: validator.escape(orderData.notes || ""),
                    created_date: new Date().toISOString(),
                    last_modified: new Date().toISOString()
                };
                
                tableOrdersDB.insert(tableOrder, function (err, newOrder) {
                    if (err) {
                        console.error(err);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: "Failed to create table order.",
                        });
                    } else {
                        // Update table status to occupied
                        tablesDB.update(
                            { _id: orderData.table_id },
                            { 
                                $set: { 
                                    status: TABLE_STATUS.OCCUPIED,
                                    last_modified: new Date().toISOString()
                                }
                            },
                            {},
                            function (err, numReplaced) {
                                if (err) {
                                    console.error("Failed to update table status:", err);
                                }
                            }
                        );
                        
                        // Emit real-time updates
                        if (global.io) {
                            global.io.emit('table-order-created', newOrder);
                            global.io.emit('table-status-updated', {
                                table_id: orderData.table_id,
                                status: TABLE_STATUS.OCCUPIED
                            });
                        }
                        
                        res.status(201).json(newOrder);
                    }
                });
            });
        });
        
    } catch (error) {
        console.error("Table order creation error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while creating the table order.",
        });
    }
});

/**
 * PUT endpoint: Transfer table order to another table
 */
app.put("/orders/:orderId/transfer", function (req, res) {
  try {
    const orderId = req.params.orderId;
    const { new_table_id } = req.body;

    if (!new_table_id) {
      return res.status(400).json({
        error: "Validation Error",
        message: "New table ID is required."
      });
    }

    // Check if order exists
    tableOrdersDB.findOne({ _id: orderId }, function (err, order) {
      if (err) {
        console.error(err);
        return res.status(500).json({
          error: "Internal Server Error",
          message: "Database error."
        });
      }

      if (!order) {
        return res.status(404).json({
          error: "Order not found",
          message: "The order to transfer does not exist."
        });
      }

      if (order.table_id === new_table_id) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Cannot transfer order to the same table."
        });
      }

      // Check if new table exists and is available
      tablesDB.findOne({ _id: new_table_id }, function (err, newTable) {
        if (err) {
          return res.status(500).json({
            error: "Database Error",
            message: "Failed to find new table."
          });
        }

        if (!newTable) {
          return res.status(404).json({
            error: "New table not found",
            message: "The destination table does not exist."
          });
        }

        // Check if new table already has an active order
        tableOrdersDB.findOne({
          table_id: new_table_id,
          order_status: { $in: [TABLE_ORDER_STATUS.SEATED, TABLE_ORDER_STATUS.ORDERING, TABLE_ORDER_STATUS.EATING] }
        }, function (err, existingOrder) {
          if (err) {
            return res.status(500).json({
              error: "Database Error",
              message: "Failed to check for existing orders on new table."
            });
          }

          if (existingOrder) {
            return res.status(400).json({
              error: "Validation Error",
              message: "The destination table already has an active order."
            });
          }

          const oldTableId = order.table_id;

          // Update order with new table
          tableOrdersDB.update(
            { _id: orderId },
            {
              $set: {
                table_id: validator.escape(new_table_id),
                last_modified: new Date().toISOString()
              }
            },
            {},
            function (err, numReplaced) {
              if (err) {
                console.error(err);
                res.status(500).json({
                  error: "Internal Server Error",
                  message: "Failed to transfer order.",
                });
              } else {
                // Update old table status to available
                updateTableStatus(oldTableId, TABLE_ORDER_STATUS.CLOSED);

                // Update new table status to occupied
                updateTableStatus(new_table_id, order.order_status);

                // Log the transfer in audit logs if available
                if (global.auditLogsDB) {
                  const logData = {
                    order_id: orderId,
                    old_table_id: oldTableId,
                    new_table_id: new_table_id,
                    user_id: req.user ? req.user._id : '',
                    action: 'table_transfer',
                    timestamp: new Date().toISOString(),
                    details: `Transferred order ${order.order_number} from table ${oldTableId} to table ${new_table_id}`
                  };
                  global.auditLogsDB.insert(logData, function(err) {
                    if (err) console.error('Failed to log transfer:', err);
                  });
                }

                // Emit real-time updates
                if (global.io) {
                  global.io.emit('table-order-transferred', {
                    order_id: orderId,
                    old_table_id: oldTableId,
                    new_table_id: new_table_id,
                    order_status: order.order_status
                  });
                }

                tableOrdersDB.findOne({ _id: orderId }, function (err, updatedOrder) {
                  res.json({
                    message: "Order transferred successfully",
                    order: updatedOrder,
                    old_table_id: oldTableId,
                    new_table_id: new_table_id
                  });
                });
              }
            }
          );
        });
      });
    });

  } catch (error) {
    console.error("Order transfer error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while transferring the order.",
    });
  }
});

/**
 * PUT endpoint: Update table order status
 */
app.put("/orders/:orderId/status", function (req, res) {
    try {
        const orderId = req.params.orderId;
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Status is required."
            });
        }
        
        const validStatuses = Object.values(TABLE_ORDER_STATUS);
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Invalid status. Must be one of: " + validStatuses.join(", ")
            });
        }
        
        tableOrdersDB.findOne({ _id: orderId }, function (err, order) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Database error."
                });
            }
            
            if (!order) {
                return res.status(404).json({
                    error: "Order not found",
                    message: "The order to update does not exist."
                });
            }
            
            const updateData = {
                order_status: status,
                last_modified: new Date().toISOString()
            };
            
            // Set actual service time when order is closed
            if (status === TABLE_ORDER_STATUS.CLOSED) {
                updateData.actual_service_time = new Date().toISOString();
            }
            
            tableOrdersDB.update(
                { _id: orderId },
                { $set: updateData },
                {},
                function (err, numReplaced) {
                    if (err) {
                        console.error(err);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: "Failed to update order status.",
                        });
                    } else {
                        // Update table status based on order status
                        updateTableStatus(order.table_id, status);
                        
                        // Emit real-time updates
                        if (global.io) {
                            global.io.emit('table-order-updated', {
                                order_id: orderId,
                                status: status,
                                table_id: order.table_id
                            });
                        }
                        
                        tableOrdersDB.findOne({ _id: orderId }, function (err, updatedOrder) {
                            res.json(updatedOrder);
                        });
                    }
                }
            );
        });
        
    } catch (error) {
        console.error("Order status update error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while updating the order status.",
        });
    }
});

/**
 * PUT endpoint: Update bill information
 */
app.put("/orders/:orderId/bill", function (req, res) {
    try {
        const orderId = req.params.orderId;
        const { bill_total, bill_status, bill_split_info } = req.body;
        
        tableOrdersDB.findOne({ _id: orderId }, function (err, order) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Database error."
                });
            }
            
            if (!order) {
                return res.status(404).json({
                    error: "Order not found",
                    message: "The order to update does not exist."
                });
            }
            
            const updateData = {
                last_modified: new Date().toISOString()
            };
            
            if (bill_total !== undefined) {
                updateData.bill_total = parseFloat(bill_total) || 0;
            }
            
            if (bill_status) {
                const validBillStatuses = ['open', 'partial_payment', 'paid'];
                if (!validBillStatuses.includes(bill_status)) {
                    return res.status(400).json({
                        error: "Validation Error",
                        message: "Invalid bill status. Must be one of: " + validBillStatuses.join(", ")
                    });
                }
                updateData.bill_status = bill_status;
            }
            
            if (bill_split_info) {
                updateData.bill_split_info = Array.isArray(bill_split_info) ? bill_split_info : [];
            }
            
            tableOrdersDB.update(
                { _id: orderId },
                { $set: updateData },
                {},
                function (err, numReplaced) {
                    if (err) {
                        console.error(err);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: "Failed to update bill information.",
                        });
                    } else {
                        // Emit real-time update
                        if (global.io) {
                            global.io.emit('table-bill-updated', {
                                order_id: orderId,
                                bill_total: updateData.bill_total,
                                bill_status: updateData.bill_status,
                                table_id: order.table_id
                            });
                        }
                        
                        tableOrdersDB.findOne({ _id: orderId }, function (err, updatedOrder) {
                            res.json(updatedOrder);
                        });
                    }
                }
            );
        });
        
    } catch (error) {
        console.error("Bill update error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while updating the bill information.",
        });
    }
});

/**
 * POST endpoint: Split bill
 */
app.post("/orders/:orderId/split-bill", function (req, res) {
    try {
        const orderId = req.params.orderId;
        const { split_type, split_data } = req.body;
        
        if (!split_type || !split_data) {
            return res.status(400).json({
                error: "Validation Error",
                message: "Split type and split data are required."
            });
        }
        
        tableOrdersDB.findOne({ _id: orderId }, function (err, order) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Internal Server Error",
                    message: "Database error."
                });
            }
            
            if (!order) {
                return res.status(404).json({
                    error: "Order not found",
                    message: "The order to split does not exist."
                });
            }
            
            const splitInfo = calculateBillSplit(order, split_type, split_data);
            
            tableOrdersDB.update(
                { _id: orderId },
                { 
                    $set: { 
                        bill_split_info: splitInfo,
                        last_modified: new Date().toISOString()
                    }
                },
                {},
                function (err, numReplaced) {
                    if (err) {
                        console.error(err);
                        res.status(500).json({
                            error: "Internal Server Error",
                            message: "Failed to split bill.",
                        });
                    } else {
                        // Emit real-time update
                        if (global.io) {
                            global.io.emit('bill-split-updated', {
                                order_id: orderId,
                                split_info: splitInfo,
                                table_id: order.table_id
                            });
                        }
                        
                        res.json({
                            message: "Bill split successfully",
                            split_info: splitInfo
                        });
                    }
                }
            );
        });
        
    } catch (error) {
        console.error("Bill split error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "An error occurred while splitting the bill.",
        });
    }
});

/**
 * GET endpoint: Get table metrics
 */
app.get("/metrics", function (req, res) {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    Promise.all([
        getTableMetrics(startDate, endDate),
        getTableUtilization(startDate, endDate),
        getServiceMetrics(startDate, endDate)
    ]).then(([tableMetrics, utilization, serviceMetrics]) => {
        res.send({
            table_metrics: tableMetrics,
            utilization: utilization,
            service_metrics: serviceMetrics
        });
    }).catch(error => {
        console.error("Metrics calculation error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to calculate metrics."
        });
    });
});

/**
 * Helper function to update table status based on order status
 */
function updateTableStatus(tableId, orderStatus) {
    let tableStatus = TABLE_STATUS.AVAILABLE;
    
    switch (orderStatus) {
        case TABLE_ORDER_STATUS.SEATED:
        case TABLE_ORDER_STATUS.ORDERING:
        case TABLE_ORDER_STATUS.EATING:
            tableStatus = TABLE_STATUS.OCCUPIED;
            break;
        case TABLE_ORDER_STATUS.READY_TO_LEAVE:
            tableStatus = TABLE_STATUS.CLEANING;
            break;
        case TABLE_ORDER_STATUS.CLOSED:
            tableStatus = TABLE_STATUS.CLEANING;
            break;
    }
    
    tablesDB.update(
        { _id: tableId },
        { 
            $set: { 
                status: tableStatus,
                last_modified: new Date().toISOString()
            }
        },
        {},
        function (err, numReplaced) {
            if (err) {
                console.error("Failed to update table status:", err);
            } else {
                // Emit real-time update
                if (global.io) {
                    global.io.emit('table-status-updated', {
                        table_id: tableId,
                        status: tableStatus
                    });
                }
            }
        }
    );
}

/**
 * Helper function to calculate bill split
 */
function calculateBillSplit(order, splitType, splitData) {
    const totalBill = order.bill_total;
    let splitInfo = [];
    
    switch (splitType) {
        case 'equal':
            const equalAmount = totalBill / splitData.num_people;
            splitInfo = Array.from({ length: splitData.num_people }, (_, index) => ({
                split_id: index + 1,
                amount: equalAmount,
                type: 'equal',
                description: `Person ${index + 1}`
            }));
            break;
            
        case 'custom':
            splitInfo = splitData.splits.map(split => ({
                split_id: split.split_id,
                amount: parseFloat(split.amount) || 0,
                type: 'custom',
                description: split.description || ''
            }));
            break;
            
        case 'percentage':
            splitInfo = splitData.percentages.map(percentage => ({
                split_id: percentage.split_id,
                amount: (totalBill * percentage.percentage) / 100,
                type: 'percentage',
                percentage: percentage.percentage,
                description: percentage.description || ''
            }));
            break;
            
        case 'items':
            // This would require integration with order items
            splitInfo = splitData.item_splits.map(itemSplit => ({
                split_id: itemSplit.split_id,
                amount: itemSplit.total_amount || 0,
                type: 'items',
                items: itemSplit.items || [],
                description: itemSplit.description || ''
            }));
            break;
    }
    
    return splitInfo;
}

/**
 * Helper function to get table metrics
 */
function getTableMetrics(startDate, endDate) {
    return new Promise((resolve, reject) => {
        tableOrdersDB.find({
            order_time: {
                $gte: startDate.toISOString(),
                $lte: endDate.toISOString()
            }
        }, function (err, orders) {
            if (err) return reject(err);
            
            const metrics = {
                total_orders: orders.length,
                closed_orders: orders.filter(o => o.order_status === TABLE_ORDER_STATUS.CLOSED).length,
                average_bill_total: 0,
                total_revenue: 0,
                average_service_time: 0
            };
            
            if (orders.length > 0) {
                const completedOrders = orders.filter(o => o.actual_service_time);
                
                if (completedOrders.length > 0) {
                    const totalServiceTime = completedOrders.reduce((sum, order) => {
                        const start = new Date(order.order_time);
                        const end = new Date(order.actual_service_time);
                        return sum + (end - start) / (1000 * 60); // Convert to minutes
                    }, 0);
                    
                    metrics.average_service_time = Math.round(totalServiceTime / completedOrders.length);
                }
                
                metrics.total_revenue = orders.reduce((sum, order) => sum + order.bill_total, 0);
                metrics.average_bill_total = metrics.total_revenue / orders.length;
            }
            
            resolve(metrics);
        });
    });
}

/**
 * Helper function to get table utilization
 */
function getTableUtilization(startDate, endDate) {
    return new Promise((resolve, reject) => {
        tablesDB.find({}, function (err, tables) {
            if (err) return reject(err);
            
            tableOrdersDB.find({
                order_time: {
                    $gte: startDate.toISOString(),
                    $lte: endDate.toISOString()
                }
            }, function (err, orders) {
                if (err) return reject(err);
                
                const utilization = {};
                const totalTimeRange = (endDate - startDate) / (1000 * 60 * 60); // Hours
                
                tables.forEach(table => {
                    const tableOrders = orders.filter(o => o.table_id === table._id);
                    const occupiedTime = tableOrders.reduce((sum, order) => {
                        if (order.actual_service_time) {
                            const start = new Date(order.order_time);
                            const end = new Date(order.actual_service_time);
                            return sum + (end - start) / (1000 * 60 * 60); // Convert to hours
                        }
                        return sum;
                    }, 0);
                    
                    utilization[table._id] = {
                        table_number: table.table_number,
                        total_orders: tableOrders.length,
                        occupied_hours: occupiedTime,
                        utilization_percentage: Math.round((occupiedTime / totalTimeRange) * 100)
                    };
                });
                
                resolve(utilization);
            });
        });
    });
}

/**
 * Helper function to get service metrics
 */
function getServiceMetrics(startDate, endDate) {
    return new Promise((resolve, reject) => {
        tableOrdersDB.find({
            order_time: {
                $gte: startDate.toISOString(),
                $lte: endDate.toISOString()
            }
        }, function (err, orders) {
            if (err) return reject(err);
            
            const metrics = {
                server_performance: {},
                status_breakdown: {},
                peak_hours: {}
            };
            
            // Server performance
            orders.forEach(order => {
                if (order.server_id) {
                    if (!metrics.server_performance[order.server_id]) {
                        metrics.server_performance[order.server_id] = {
                            total_orders: 0,
                            total_revenue: 0,
                            average_bill: 0,
                            average_service_time: 0
                        };
                    }
                    
                    const server = metrics.server_performance[order.server_id];
                    server.total_orders++;
                    server.total_revenue += order.bill_total;
                    
                    if (order.actual_service_time) {
                        const serviceTime = (new Date(order.actual_service_time) - new Date(order.order_time)) / (1000 * 60);
                        server.average_service_time += serviceTime;
                    }
                }
            });
            
            // Calculate averages
            Object.keys(metrics.server_performance).forEach(serverId => {
                const server = metrics.server_performance[serverId];
                server.average_bill = server.total_revenue / server.total_orders;
                if (server.total_orders > 0) {
                    server.average_service_time = Math.round(server.average_service_time / server.total_orders);
                }
            });
            
            // Status breakdown
            orders.forEach(order => {
                if (!metrics.status_breakdown[order.order_status]) {
                    metrics.status_breakdown[order.order_status] = 0;
                }
                metrics.status_breakdown[order.order_status]++;
            });
            
            // Peak hours
            orders.forEach(order => {
                const hour = new Date(order.order_time).getHours();
                if (!metrics.peak_hours[hour]) {
                    metrics.peak_hours[hour] = 0;
                }
                metrics.peak_hours[hour]++;
            });
            
            resolve(metrics);
        });
    });
}

/**
 * Function to create table order from POS transaction
 */
app.createTableOrderFromTransaction = function(transaction, callback) {
    try {
        // Find table by table number
        tablesDB.findOne({ table_number: transaction.table_number }, function (err, table) {
            if (err) {
                return callback(err);
            }
            
            if (!table) {
                return callback(new Error(`Table ${transaction.table_number} not found`));
            }
            
            const tableOrder = {
                table_id: table._id,
                order_number: transaction.transaction_id.toString(),
                customer_count: 1,
                order_status: TABLE_ORDER_STATUS.SEATED,
                server_id: transaction.server_id || "",
                order_time: new Date(transaction.date).toISOString(),
                bill_total: transaction.total_amount,
                bill_status: "open",
                special_requests: transaction.notes || "",
                created_date: new Date().toISOString(),
                last_modified: new Date().toISOString()
            };
            
            tableOrdersDB.insert(tableOrder, function (err, createdOrder) {
                if (err) {
                    callback(err);
                } else {
                    // Update table status
                    updateTableStatus(table._id, TABLE_ORDER_STATUS.SEATED);
                    
                    // Emit real-time update
                    if (global.io) {
                        global.io.emit('table-order-created', createdOrder);
                    }
                    
                    callback(null, createdOrder);
                }
            });
        });
        
    } catch (error) {
        callback(error);
    }
};

module.exports = app;