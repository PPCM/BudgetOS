import Knex from 'knex';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Build the Knex configuration based on environment settings.
 */
const buildKnexConfig = () => {
  const dbType = process.env.DB_TYPE || config.database.type || 'sqlite';

  const migrationsConfig = {
    directory: path.resolve(__dirname, 'migrations'),
    sortDirsSeparately: true,
  };

  switch (dbType) {
    case 'mysql':
    case 'mariadb':
      return {
        client: 'mysql2',
        connection: {
          host: config.database.mysql.host,
          port: config.database.mysql.port,
          database: config.database.mysql.database,
          user: config.database.mysql.user,
          password: config.database.mysql.password,
          charset: 'utf8mb4',
        },
        pool: { min: 2, max: 10 },
        migrations: migrationsConfig,
      };

    case 'postgres':
    case 'postgresql':
      return {
        client: 'pg',
        connection: {
          host: config.database.postgres.host,
          port: config.database.postgres.port,
          database: config.database.postgres.database,
          user: config.database.postgres.user,
          password: config.database.postgres.password,
        },
        pool: { min: 2, max: 10 },
        migrations: migrationsConfig,
      };

    case 'sqlite':
    default: {
      const dbPath = path.resolve(config.database.sqlite.path);
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      return {
        client: 'better-sqlite3',
        connection: { filename: dbPath },
        useNullAsDefault: true,
        pool: {
          afterCreate: (conn, cb) => {
            conn.pragma('foreign_keys = ON');
            cb();
          },
        },
        migrations: migrationsConfig,
      };
    }
  }
};

// Create the Knex instance
const knex = Knex(buildKnexConfig());

/**
 * Initialize the database: run migrations to bring schema up to date.
 */
export const initDatabase = async () => {
  try {
    await knex.migrate.latest();
    logger.info('Database migrations applied successfully');
    return knex;
  } catch (error) {
    logger.error('Failed to initialize database', { error: error.message });
    throw error;
  }
};

/**
 * Close the database connection pool.
 */
export const closeDatabase = async () => {
  try {
    await knex.destroy();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database', { error: error.message });
  }
};

/**
 * Execute a function inside a database transaction.
 * @param {function(import('knex').Knex.Transaction): Promise<*>} fn
 * @returns {Promise<*>}
 */
export const transaction = async (fn) => {
  return knex.transaction(fn);
};

// Export the Knex instance as default and named
export { knex };
export default knex;
