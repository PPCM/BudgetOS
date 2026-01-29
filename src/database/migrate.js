import knex from './connection.js';
import logger from '../utils/logger.js';

/**
 * Run Knex migrations
 */
const migrate = async () => {
  try {
    logger.info('Starting database migration...');

    const [batchNo, log] = await knex.migrate.latest();

    if (log.length === 0) {
      logger.info('Database is already up to date');
    } else {
      logger.info(`Migration batch ${batchNo} applied`, {
        count: log.length,
        migrations: log,
      });
    }

    await knex.destroy();

    logger.info('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

migrate();
