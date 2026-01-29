import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import config from './config/index.js';
import logger from './utils/logger.js';
import { initDatabase, closeDatabase } from './database/connection.js';
import { createSessionMiddleware } from './middleware/session.js';
import { helmetMiddleware, globalRateLimiter, sanitizeHeaders, suspiciousRequestLogger } from './middleware/security.js';
import { csrfProtection, csrfTokenProvider } from './middleware/csrf.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { sanitizeInput } from './middleware/validation.js';
import apiRoutes from './routes/index.js';
import schedulerService from './services/schedulerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer les répertoires nécessaires
const ensureDirectories = () => {
  const dirs = [config.paths.data, config.paths.uploads, config.paths.logs];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Directory created: ${dir}`);
    }
  });
};

// Initialiser l'application
const createApp = () => {
  const app = express();

  // Trust proxy (pour les headers X-Forwarded-*)
  app.set('trust proxy', 1);

  // Middlewares de sécurité
  app.use(helmetMiddleware);
  app.use(sanitizeHeaders);
  app.use(suspiciousRequestLogger);

  // CORS
  app.use(cors({
    origin: config.isDev ? true : process.env.CORS_ORIGIN?.split(',') || false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token'],
  }));

  // Rate limiting global
  app.use('/api', globalRateLimiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Sanitization des entrées
  app.use(sanitizeInput);

  // Sessions
  app.use(createSessionMiddleware());

  // CSRF
  app.use(csrfTokenProvider);
  app.use('/api', csrfProtection);

  // Routes API
  app.use('/api/v1', apiRoutes);

  // Servir le frontend en production
  const clientPath = path.join(__dirname, '../client/dist');
  if (fs.existsSync(clientPath)) {
    app.use(express.static(clientPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientPath, 'index.html'));
    });
  } else if (config.isDev) {
    // Page d'accueil de développement
    app.get('/', (req, res) => {
      res.json({
        name: 'BudgetOS API',
        version: '1.0.0',
        status: 'running',
        documentation: '/api/v1/health',
        environment: config.env,
      });
    });
  }

  // Gestion des erreurs
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
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
