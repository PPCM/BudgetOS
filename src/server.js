import fs from 'fs';

import config from './config/index.js';
import logger from './utils/logger.js';
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

// Démarrer le serveur
const startServer = async () => {
  try {
    // Créer les répertoires
    ensureDirectories();

    // Initialiser la base de données
    await initDatabase();
    logger.info('Database initialized');

    // Créer l'application
    const app = createApp();

    // Démarrer le scheduler pour les transactions planifiées
    schedulerService.start();

    // Démarrer le serveur HTTP
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`Server running at http://${config.server.host}:${config.server.port}`);
      logger.info(`Environment: ${config.env}`);
    });

    // Gestion de l'arrêt propre
    const shutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        await closeDatabase();
        logger.info('Database connection closed');
        process.exit(0);
      });

      // Forcer l'arrêt après 10s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Gestion des erreurs non capturées
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
