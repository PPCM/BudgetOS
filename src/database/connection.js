import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let db = null;
let SQL = null;
let dbPath = null;
let inTransaction = false;

/**
 * Vérifie si une colonne existe dans une table
 */
const columnExists = (tableName, columnName) => {
  const result = db.exec(`PRAGMA table_info(${tableName})`);
  if (result.length === 0) return false;
  const columns = result[0].values.map(row => row[1]);
  return columns.includes(columnName);
};

/**
 * Exécute les migrations nécessaires
 */
const runMigrations = () => {
  // Migration: Ajouter image_url à payees
  if (!columnExists('payees', 'image_url')) {
    try {
      db.run('ALTER TABLE payees ADD COLUMN image_url TEXT');
      logger.info('Migration: Added image_url column to payees table');
    } catch (e) {
      // Table n'existe peut-être pas encore, ignorer
    }
  }
};

/**
 * Initialise la connexion à la base de données SQLite
 */
export const initDatabase = async () => {
  if (db) return db;

  dbPath = path.resolve(config.database.sqlite.path);
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info('Database directory created', { path: dbDir });
  }

  try {
    SQL = await initSqlJs();
    
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      logger.info('Database loaded from file', { path: dbPath });
    } else {
      db = new SQL.Database();
      logger.info('New database created', { path: dbPath });
    }

    db.run('PRAGMA foreign_keys = ON');
    
    // Migrations automatiques
    runMigrations();
    
    return db;
  } catch (error) {
    logger.error('Failed to connect to database', { error: error.message });
    throw error;
  }
};

export const getDatabase = () => {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
};

export const saveDatabase = () => {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

export const closeDatabase = () => {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
};

export const transaction = (fn) => {
  const database = getDatabase();
  inTransaction = true;
  database.run('BEGIN TRANSACTION');
  try {
    const result = fn();
    database.run('COMMIT');
    saveDatabase();
    return result;
  } catch (error) {
    try {
      database.run('ROLLBACK');
    } catch (e) {
      // Transaction déjà terminée, ignorer
    }
    throw error;
  } finally {
    inTransaction = false;
  }
};

const convertParams = (params) => {
  return params.map(p => p === undefined ? null : p);
};

const stmtToObjects = (stmt) => {
  const results = [];
  const columns = stmt.getColumnNames();
  while (stmt.step()) {
    const row = stmt.get();
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    results.push(obj);
  }
  stmt.free();
  return results;
};

export const query = {
  all: (sql, params = []) => {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    stmt.bind(convertParams(params));
    const results = stmtToObjects(stmt);
    return results;
  },

  get: (sql, params = []) => {
    const results = query.all(sql, params);
    return results.length > 0 ? results[0] : null;
  },

  run: (sql, params = []) => {
    const database = getDatabase();
    database.run(sql, convertParams(params));
    if (!inTransaction) {
      saveDatabase();
    }
    return { changes: database.getRowsModified(), lastInsertRowid: null };
  },

  exec: (sql) => {
    const database = getDatabase();
    database.exec(sql);
    saveDatabase();
  },
};

export default { initDatabase, getDatabase, closeDatabase, saveDatabase, transaction, query };
