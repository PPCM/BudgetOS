import { AppError, ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Gestionnaire d'erreurs global
 */
export const errorHandler = (err, req, res, next) => {
  // Log de l'erreur
  const logContext = {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.session?.userId,
    userAgent: req.get('User-Agent'),
  };
  
  if (err instanceof AppError && err.isOperational) {
    // Erreurs opérationnelles (prévues)
    logger.warn(err.message, { ...logContext, code: err.code });
  } else {
    // Erreurs inattendues
    logger.error(err.message, { ...logContext, stack: err.stack });
  }
  
  // Réponse d'erreur
  if (err instanceof AppError) {
    const response = {
      success: false,
      error: {
        message: err.message,
        code: err.code,
      },
    };
    
    // Ajouter les détails de validation si applicable
    if (err instanceof ValidationError && err.errors?.length > 0) {
      response.error.details = err.errors;
    }
    
    // Ajouter le stack en développement
    if (config.isDev) {
      response.error.stack = err.stack;
    }
    
    return res.status(err.statusCode).json(response);
  }
  
  // Erreur Zod de validation
  if (err.name === 'ZodError') {
    const errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    
    return res.status(422).json({
      success: false,
      error: {
        message: 'Données invalides',
        code: 'VALIDATION_ERROR',
        details: errors,
      },
    });
  }
  
  // Erreur SQLite
  if (err.code?.startsWith('SQLITE_')) {
    logger.error('Database error', { ...logContext, sqliteCode: err.code });
    
    return res.status(500).json({
      success: false,
      error: {
        message: 'Erreur de base de données',
        code: 'DATABASE_ERROR',
        ...(config.isDev && { details: err.message }),
      },
    });
  }
  
  // Erreur générique
  return res.status(500).json({
    success: false,
    error: {
      message: config.isProd ? 'Erreur interne du serveur' : err.message,
      code: 'INTERNAL_ERROR',
      ...(config.isDev && { stack: err.stack }),
    },
  });
};

/**
 * Gestionnaire pour les routes non trouvées
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route non trouvée',
      code: 'NOT_FOUND',
      path: req.path,
    },
  });
};

/**
 * Wrapper async pour les contrôleurs
 * Capture automatiquement les erreurs des fonctions async
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
