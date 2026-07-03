import fs from 'fs';
import { createRequire } from 'module';

import config from './config/index.js';
import logger from './utils/logger.js';

const require = createRequire(import.meta.url);
const { name: appName, version: appVersion } = require('../package.json');
import { initDatabase, closeDatabase } from './database/connection.js';
import createApp from './app.js';
import schedulerService from './services/schedulerService.js';

// Create required directories
const ensureDirectories = () => {
  const dirs = [config.paths.data, config.paths.uploads, config.paths.logs];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Directory created: ${dir}`);
    }
  });
};

// Start the server
const startServer = async () => {
  try {
    // Create the directories
    ensureDirectories();

    // Initialize the database
    await initDatabase();
    logger.info('Database initialized');

    // Create the application
    const app = createApp();

    // Start the scheduler for planned transactions
    schedulerService.start();

    // Start the HTTP server
    const server = app.listen(config.server.port, config.server.host, () => {
      const banner = `
  ____            _            _    ___  ____
 | __ ) _   _  __| | __ _  ___| |_ / _ \\/ ___|
 |  _ \\| | | |/ _\` |/ _\` |/ _ \\ __| | | \\___ \\
 | |_) | |_| | (_| | (_| |  __/ |_| |_| |___) |
 |____/ \\__,_|\\__,_|\\__, |\\___\\____|\\___/|____/
                     |___/            v${appVersion}`;
      logger.info(banner);
      logger.info(`Server running at http://${config.server.host}:${config.server.port}`);
      logger.info(`Environment: ${config.env}`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        await closeDatabase();
        logger.info('Database connection closed');
        process.exit(0);
      });

      // Force shutdown after 10s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Uncaught error handling
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', { error: err.message, stack: err.stack });
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason: String(reason) });
    });

  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

startServer();
