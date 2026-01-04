const app = require("express")();
const bodyParser = require("body-parser");
const Datastore = require("@seald-io/nedb");
const path = require("path");
const async = require("async");
const validator = require("validator");

const appName = process.env.APPNAME;
const appData = process.env.APPDATA;

const dbPaths = {
    inventory_matrix: path.join(appData, appName, "server", "databases", "inventory_matrix.db"),
    transactions: path.join(appData, appName, "server", "databases", "transactions.db"),
    suppliers: path.join(appData, appName, "server", "databases", "suppliers.db"),
    purchase_orders: path.join(appData, appName, "server", "databases", "purchase_orders.db"),
    inventory: path.join(appData, appName, "server", "databases", "inventory.db")
};

const { getDatabase } = require('./database_utils');

app.use(bodyParser.json());

const matrixDB = getDatabase(dbPaths.inventory_matrix);
const transactionsDB = getDatabase(dbPaths.transactions);
const suppliersDB = getDatabase(dbPaths.suppliers);
const poDB = getDatabase(dbPaths.purchase_orders);
const inventoryDB = getDatabase(dbPaths.inventory);

matrixDB.ensureIndex({ fieldName: "product_id", unique: true });
matrixDB.ensureIndex({ fieldName: "matrix_id", unique: true });

module.exports = app;

/**
 * CORE INVENTORY MATRIX LOGIC
 */

// Helper: Calculate Sales Velocity (Average Daily Sales)
const calculateSalesVelocity = (productId, days = 30) => {
    return new Promise((resolve, reject) => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        transactionsDB.find({
            date: { $gte: startDate.toISOString() },
            status: 1 // Completed sales
        }, (err, transactions) => {
            if (err) return reject(err);
            
            let totalSold = 0;
            transactions.forEach(txn => {
                txn.items.forEach(item => {
                    if (parseInt(item.product_id || item.id) === parseInt(productId)) {
                        totalSold += parseInt(item.quantity);
                    }
                });
            });
            
            resolve(totalSold / days);
        });
    });
};

// Helper: Calculate Reorder Point
// Formula: (Average Daily Sales * Lead Time) + Safety Stock
const calculateReorderMetrics = (salesVelocity, leadTimeDays, serviceLevelFactor = 1.65, stdDevDemand = 0) => {
    const leadTimeDemand = salesVelocity * leadTimeDays;
    // Safety Stock = Z * sqrt(Avg Lead Time * stdDevDemand^2 + Avg Demand^2 * stdDevLeadTime^2)
    // Simplified: Safety Stock = Z * stdDevDemand * sqrt(Lead Time)
    const safetyStock = Math.ceil(serviceLevelFactor * (stdDevDemand || (salesVelocity * 0.2)) * Math.sqrt(leadTimeDays));
    
    return {
        reorderPoint: Math.ceil(leadTimeDemand + safetyStock),
        safetyStock: safetyStock,
        leadTimeDemand: leadTimeDemand
    };
};

/**
 * API ENDPOINTS
 */

// GET: Get Full Matrix Details for a Product
app.get("/details/:productId", (req, res) => {
    const productId = parseInt(req.params.productId);
    
    matrixDB.findOne({ product_id: productId }, (err, matrix) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!matrix) return res.status(404).json({ error: "Matrix not found for this product" });
        
        res.json(matrix);
    });
});

// POST: Run Analysis & Update Matrix for a Product
app.post("/analyze/:productId", async (req, res) => {
    const productId = parseInt(req.params.productId);
    
    try {
        // 1. Get existing matrix and product info
        const matrix = await new Promise((resolve, reject) => {
            matrixDB.findOne({ product_id: productId }, (err, doc) => err ? reject(err) : resolve(doc));
        });

        if (!matrix) return res.status(404).json({ error: "Matrix not found. Create one first." });

        // 2. Calculate Sales Velocity
        const velocity = await calculateSalesVelocity(productId, 30);
        
        // 3. Get Supplier Lead Time (Mocked or from DB)
        // In a real app, fetch from supplier_details in inventory or suppliers DB
        const leadTime = matrix.reorder_management?.supplier_information?.lead_time_days || 7;
        
        // 4. Calculate Metrics
        const metrics = calculateReorderMetrics(velocity, leadTime);
        
        // 5. ABC Analysis Classification
        // Simplified: Classify based on velocity * cost
        // We need cost from inventoryDB
        const product = await new Promise((resolve, reject) => {
            inventoryDB.findOne({ _id: productId }, (err, doc) => err ? reject(err) : resolve(doc));
        });
        
        const cost = parseFloat(product.cost || product.price || 0);
        const monthlyUsageValue = velocity * 30 * cost;
        
        let abcClass = 'C';
        if (monthlyUsageValue > 10000) abcClass = 'A'; // Thresholds would be dynamic in production
        else if (monthlyUsageValue > 2000) abcClass = 'B';
        
        // 6. Update Matrix
        const updates = {
            "sales_velocity.daily_average": velocity,
            "sales_velocity.last_calculated": new Date().toISOString(),
            "reorder_management.calculated_reorder_point": metrics.reorderPoint,
            "reorder_management.safety_stock": metrics.safetyStock,
            "abc_analysis.current_class": abcClass,
            "abc_analysis.last_updated": new Date().toISOString()
        };
        
        // Update Reorder Point in Main Inventory if enabled
        if (matrix.reorder_management?.auto_update_main_inventory) {
            inventoryDB.update({ _id: productId }, { $set: { minStock: metrics.reorderPoint } });
        }

        matrixDB.update({ product_id: productId }, { $set: updates }, {}, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, metrics, abcClass, velocity });
        });

    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET: Generate Global Restock Report
app.get("/reports/restock-suggestions", (req, res) => {
    // Join Inventory and Matrix
    inventoryDB.find({}, (err, products) => {
        if (err) return res.status(500).json({ error: err.message });
        
        matrixDB.find({}, (err, matrices) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const matrixMap = {};
            matrices.forEach(m => matrixMap[m.product_id] = m);
            
            const suggestions = [];
            
            products.forEach(p => {
                const matrix = matrixMap[p._id];
                const currentStock = parseInt(p.quantity) || 0;
                
                // Determine Reorder Point: Matrix calculated > Manual minStock > Default 10
                let reorderPoint = 10;
                if (matrix && matrix.reorder_management?.calculated_reorder_point) {
                    reorderPoint = matrix.reorder_management.calculated_reorder_point;
                } else if (p.minStock) {
                    reorderPoint = parseInt(p.minStock);
                }
                
                if (currentStock <= reorderPoint) {
                    // Calculate Suggestion
                    const reorderQty = matrix?.reorder_management?.supplier_information?.reorder_multiples 
                        ? Math.ceil((reorderPoint * 2 - currentStock) / matrix.reorder_management.supplier_information.reorder_multiples) * matrix.reorder_management.supplier_information.reorder_multiples
                        : (reorderPoint * 2 - currentStock); // Target 2x reorder point as max stock

                    suggestions.push({
                        product_id: p._id,
                        name: p.name,
                        current_stock: currentStock,
                        reorder_point: reorderPoint,
                        suggested_quantity: Math.max(reorderQty, 1),
                        supplier_id: p.supplierId,
                        priority: currentStock === 0 ? 'Critical' : 'High',
                        reason: currentStock === 0 ? 'Stockout' : 'Below Reorder Point'
                    });
                }
            });
            
            res.json(suggestions);
        });
    });
});

// POST: Batch ABC Analysis
app.post("/analysis/abc-batch", (req, res) => {
    // 1. Calculate consumption value for all products
    // 2. Sort descending
    // 3. Assign A (top 80% value), B (next 15%), C (bottom 5%)
    
    transactionsDB.find({ 
        date: { $gte: new Date(Date.now() - 30*24*60*60*1000).toISOString() },
        status: 1 
    }, (err, txns) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const usageMap = {}; // productId -> { qty, value }
        
        // Process transactions
        txns.forEach(t => {
            t.items.forEach(i => {
                const pid = i.product_id || i.id;
                const val = (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 0);
                if (!usageMap[pid]) usageMap[pid] = 0;
                usageMap[pid] += val;
            });
        });
        
        // Sort
        const sorted = Object.keys(usageMap).map(pid => ({ pid, val: usageMap[pid] }))
            .sort((a, b) => b.val - a.val);
            
        const totalVal = sorted.reduce((sum, i) => sum + i.val, 0);
        let cumVal = 0;
        const classifications = [];
        
        sorted.forEach(item => {
            cumVal += item.val;
            const perc = cumVal / totalVal;
            let cls = 'C';
            if (perc <= 0.8) cls = 'A';
            else if (perc <= 0.95) cls = 'B';
            
            classifications.push({ product_id: parseInt(item.pid), class: cls, val: item.val });
        });
        
        // Update Database
        async.each(classifications, (item, cb) => {
            matrixDB.update(
                { product_id: item.product_id },
                { $set: { "abc_analysis.current_class": item.class, "abc_analysis.last_updated": new Date().toISOString() } },
                { upsert: false }, // Only update if matrix exists
                cb
            );
        }, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ 
                success: true, 
                processed: classifications.length, 
                details: classifications.slice(0, 10) // Show top 10
            });
        });
    });
});

// GET: Dead Stock Report (No sales in X days)
app.get("/reports/dead-stock", (req, res) => {
    const days = parseInt(req.query.days) || 90;
    const cutoff = new Date(Date.now() - days*24*60*60*1000);
    
    // Find all products
    inventoryDB.find({ quantity: { $gt: 0 } }, (err, products) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Find recent transactions
        transactionsDB.find({ date: { $gte: cutoff.toISOString() } }, (err, txns) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const activeProductIds = new Set();
            txns.forEach(t => {
                t.items.forEach(i => activeProductIds.add(parseInt(i.product_id || i.id)));
            });
            
            const deadStock = products.filter(p => !activeProductIds.has(p._id)).map(p => ({
                product_id: p._id,
                name: p.name,
                stock: p.quantity,
                value: (parseFloat(p.cost) || 0) * p.quantity,
                last_restocked: p.lastRestocked
            }));
            
            res.json(deadStock);
        });
    });
});

