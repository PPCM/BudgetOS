import knex from './connection.js';
import logger from '../utils/logger.js';

/**
 * Run Knex seeds
 */
const seed = async () => {
  try {
    logger.info('Starting database seeding...');

    // Run migrations first to ensure schema is up to date
    await knex.migrate.latest();

    const [log] = await knex.seed.run();

    if (log.length === 0) {
      logger.info('No seed files to run');
    } else {
      logger.info('Seeds applied', {
        count: log.length,
        seeds: log,
      });
    }

    await knex.destroy();

    logger.info('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

seed();
