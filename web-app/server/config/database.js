const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Database type configuration
const dbType = process.env.DB_TYPE || 'sqlite'; // 'sqlite' or 'postgres'

// Database connection configuration
const getDbConfig = () => {
  if (dbType === 'postgres') {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'garmentpos',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      min: 2,  // Minimum number of clients in the pool
      idle: 10000, // Close idle clients after 10 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    };
  } else {
    // SQLite configuration
    return {
      filename: process.env.DB_FILE || './data/pharmamine_web.db',
    };
  }
};

const dbConfig = getDbConfig();

// Create database connection
let pool;
let sqliteDb;

if (dbType === 'postgres') {
  const { Pool } = require('pg');
  pool = new Pool(dbConfig);
} else {
  // Ensure directory exists for SQLite database
  const dbDir = path.dirname(dbConfig.filename);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info('Created SQLite database directory', { directory: dbDir });
  }
  sqliteDb = new sqlite3.Database(dbConfig.filename);
}

// Connection status
let isConnected = false;

// Test database connection
async function testConnection() {
  try {
    if (dbType === 'postgres') {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();

      logger.info('PostgreSQL connection test successful', {
        timestamp: result.rows[0].current_time
      });
    } else {
      // SQLite test connection
      return new Promise((resolve, reject) => {
        sqliteDb.get('SELECT datetime(\'now\') as current_time', (err, row) => {
          if (err) {
            reject(err);
          } else {
            logger.info('SQLite connection test successful', {
              timestamp: row.current_time
            });
            resolve(true);
          }
        });
      });
    }

    isConnected = true;
    return true;
  } catch (error) {
    logger.error('Database connection test failed', { error: error.message });
    isConnected = false;
    return false;
  }
}

// Connect to database
async function connect() {
  try {
    const connected = await testConnection();
    if (connected) {
      logger.info(`${dbType.toUpperCase()} connected successfully`);
    } else {
      throw new Error('Database connection failed');
    }
  } catch (error) {
    logger.error('Failed to connect to database', { error: error.message });
    throw error;
  }
}

// Execute query with error handling
async function query(text, params = []) {
  const start = Date.now();
  try {
    let res;

    if (dbType === 'postgres') {
      res = await pool.query(text, params);
      const duration = Date.now() - start;

      logger.debug('Executed PostgreSQL query', {
        text,
        duration,
        rows: res.rowCount
      });

      // Normalize result format
      return {
        rows: res.rows,
        rowCount: res.rowCount,
        command: res.command
      };
    } else {
      // SQLite query
      return new Promise((resolve, reject) => {
        const stmt = sqliteDb.prepare(text);
        stmt.all(params, (err, rows) => {
          stmt.finalize();
          if (err) {
            reject(err);
          } else {
            const duration = Date.now() - start;
            logger.debug('Executed SQLite query', {
              text,
              duration,
              rows: rows.length
            });

            // Normalize result format
            resolve({
              rows: rows || [],
              rowCount: rows ? rows.length : 0,
              command: text.split(' ')[0].toUpperCase()
            });
          }
        });
      });
    }
  } catch (error) {
    logger.error('Query failed', {
      text,
      params,
      error: error.message
    });
    throw error;
  }
}

// Execute transaction
async function transaction(callback) {
  try {
    if (dbType === 'postgres') {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error('PostgreSQL transaction failed', { error: error.message });
        throw error;
      } finally {
        client.release();
      }
    } else {
      // SQLite transaction
      return new Promise((resolve, reject) => {
        sqliteDb.serialize(() => {
          sqliteDb.run('BEGIN TRANSACTION');

          try {
            const result = callback(sqliteDb);
            sqliteDb.run('COMMIT');
            resolve(result);
          } catch (error) {
            sqliteDb.run('ROLLBACK');
            logger.error('SQLite transaction failed', { error: error.message });
            reject(error);
          }
        });
      });
    }
  } catch (error) {
    logger.error('Transaction failed', { error: error.message });
    throw error;
  }
}

// Close database connection
async function close() {
  try {
    if (dbType === 'postgres') {
      await pool.end();
      logger.info('PostgreSQL connection closed');
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.close((err) => {
          if (err) {
            reject(err);
          } else {
            logger.info('SQLite connection closed');
            resolve();
          }
        });
      });
    }
    isConnected = false;
  } catch (error) {
    logger.error('Error closing database connection', { error: error.message });
  }
}

// Create tables
const createTables = async () => {
    try {
        if (dbType === 'postgres') {
            // PostgreSQL table creation
            await query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS products (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    barcode VARCHAR(100),
                    price DECIMAL(10,2) NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 0,
                    category_id INTEGER,
                    min_stock INTEGER DEFAULT 0,
                    description TEXT,
                    img VARCHAR(500),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
                )
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS categories (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) UNIQUE NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS customers (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE,
                    phone VARCHAR(20),
                    address TEXT,
                    loyalty_tier VARCHAR(20) DEFAULT 'bronze',
                    loyalty_points INTEGER DEFAULT 0,
                    total_orders INTEGER DEFAULT 0,
                    total_spent DECIMAL(10,2) DEFAULT 0,
                    average_order_value DECIMAL(10,2) DEFAULT 0,
                    last_purchase TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id SERIAL PRIMARY KEY,
                    order_number VARCHAR(100) UNIQUE NOT NULL,
                    customer_id INTEGER,
                    items JSONB NOT NULL,
                    subtotal DECIMAL(10,2) NOT NULL,
                    discount DECIMAL(10,2) DEFAULT 0,
                    tax DECIMAL(10,2) NOT NULL,
                    total DECIMAL(10,2) NOT NULL,
                    payment_type VARCHAR(20) NOT NULL,
                    payment_amount DECIMAL(10,2) NOT NULL,
                    change DECIMAL(10,2) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
                )
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS settings (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(100) UNIQUE NOT NULL,
                    value TEXT,
                    type VARCHAR(50) DEFAULT 'string',
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS sync_log (
                    id SERIAL PRIMARY KEY,
                    table_name VARCHAR(100) NOT NULL,
                    operation VARCHAR(20) NOT NULL,
                    record_id INTEGER,
                    data JSONB NOT NULL,
                    source VARCHAR(50) NOT NULL,
                    synced BOOLEAN DEFAULT FALSE,
                    synced_at TIMESTAMP,
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create indexes for PostgreSQL
            await query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
            await query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
            await query('CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)');
            await query('CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)');
            await query('CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)');
            await query('CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id)');
            await query('CREATE INDEX IF NOT EXISTS idx_sync_log_table_name ON sync_log(table_name)');
            await query('CREATE INDEX IF NOT EXISTS idx_sync_log_synced ON sync_log(synced)');
            await query('CREATE INDEX IF NOT EXISTS idx_sync_log_created_at ON sync_log(created_at)');

        } else {
            // SQLite table creation
            await query(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    barcode TEXT,
                    price REAL NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 0,
                    category_id INTEGER,
                    min_stock INTEGER DEFAULT 0,
                    description TEXT,
                    img TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
                )
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS customers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE,
                    phone TEXT,
                    address TEXT,
                    loyalty_tier TEXT DEFAULT 'bronze',
                    loyalty_points INTEGER DEFAULT 0,
                    total_orders INTEGER DEFAULT 0,
                    total_spent REAL DEFAULT 0,
                    average_order_value REAL DEFAULT 0,
                    last_purchase DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_number TEXT UNIQUE NOT NULL,
                    customer_id INTEGER,
                    items TEXT NOT NULL, -- JSON stored as TEXT
                    subtotal REAL NOT NULL,
                    discount REAL DEFAULT 0,
                    tax REAL NOT NULL,
                    total REAL NOT NULL,
                    payment_type TEXT NOT NULL,
                    payment_amount REAL NOT NULL,
                    change REAL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
                )
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE NOT NULL,
                    value TEXT,
                    type TEXT DEFAULT 'string',
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS sync_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    table_name TEXT NOT NULL,
                    operation TEXT NOT NULL,
                    record_id INTEGER,
                    data TEXT NOT NULL, -- JSON stored as TEXT
                    source TEXT NOT NULL,
                    synced INTEGER DEFAULT 0, -- BOOLEAN as INTEGER in SQLite
                    synced_at DATETIME,
                    error_message TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create indexes for SQLite
            await query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
            await query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
            await query('CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)');
            await query('CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)');
            await query('CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)');
            await query('CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id)');
            await query('CREATE INDEX IF NOT EXISTS idx_sync_log_table_name ON sync_log(table_name)');
            await query('CREATE INDEX IF NOT EXISTS idx_sync_log_synced ON sync_log(synced)');
            await query('CREATE INDEX IF NOT EXISTS idx_sync_log_created_at ON sync_log(created_at)');
        }

        logger.info('Database tables created successfully');
    } catch (error) {
        logger.error('Error creating tables:', error);
        throw error;
    }
};

// Database utilities
const dbUtils = {
  // Insert with conflict resolution
  async insertWithConflict(table, data, conflictFields = ['id']) {
    if (dbType === 'postgres') {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const conflictClause = conflictFields.map(field => `"${field}"`).join(', ');

      const queryStr = `
        INSERT INTO ${table} (${columns.map(col => `"${col}"`).join(', ')})
        VALUES (${values.map((_, i) => `${i + 1}`).join(', ')})
        ON CONFLICT (${conflictClause})
        DO UPDATE SET
          ${columns.map(col => `"${col}" = EXCLUDED."${col}"`).join(', ')}
        RETURNING *
      `;

      return await query(queryStr, values);
    } else {
      // SQLite upsert using INSERT OR REPLACE
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, i) => `?`).join(', ');

      const queryStr = `
        INSERT OR REPLACE INTO ${table} (${columns.map(col => `"${col}"`).join(', ')})
        VALUES (${placeholders})
      `;

      return await query(queryStr, values);
    }
  },

  // Bulk insert with conflict resolution
  async bulkInsertWithConflict(table, dataArray, conflictFields = ['id']) {
    if (dataArray.length === 0) return [];

    if (dbType === 'postgres') {
      const columns = Object.keys(dataArray[0]);
      const conflictClause = conflictFields.map(field => `"${field}"`).join(', ');

      const values = dataArray.map((data, index) => {
        const rowValues = columns.map(col => `${index * columns.length + columns.indexOf(col) + 1}`);
        return `(${rowValues.join(', ')})`;
      }).join(', ');

      const queryStr = `
        INSERT INTO ${table} (${columns.map(col => `"${col}"`).join(', ')})
        VALUES ${values}
        ON CONFLICT (${conflictClause})
        DO UPDATE SET
          ${columns.map(col => `"${col}" = EXCLUDED."${col}"`).join(', ')}
        RETURNING *
      `;

      const allValues = dataArray.flatMap(data => Object.values(data));
      return await query(queryStr, allValues);
    } else {
      // SQLite bulk insert with REPLACE
      const results = [];
      for (const data of dataArray) {
        const result = await this.insertWithConflict(table, data, conflictFields);
        results.push(result);
      }
      return results;
    }
  },

  // Get table schema
  async getTableSchema(table) {
    if (dbType === 'postgres') {
      const queryStr = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `;

      return await query(queryStr, [table]);
    } else {
      // SQLite schema query
      const queryStr = `PRAGMA table_info(${table})`;
      const result = await query(queryStr);
      return result.rows.map(row => ({
        column_name: row.name,
        data_type: row.type,
        is_nullable: row.notnull ? 'NO' : 'YES',
        column_default: row.dflt_value
      }));
    }
  },

  // Check if table exists
  async tableExists(table) {
    if (dbType === 'postgres') {
      const result = await query(
        'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)',
        [table]
      );
      return result.rows[0].exists;
    } else {
      const result = await query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [table]
      );
      return result.rows.length > 0;
    }
  }
};

// Export database connection and utilities
module.exports = {
  pool,
  connect,
  query,
  transaction,
  close,
  testConnection,
  createTables,
  isConnected: () => isConnected,
  ...dbUtils
};
