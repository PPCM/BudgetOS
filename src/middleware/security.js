import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { TooManyRequestsError } from '../utils/errors.js';

/**
 * Configuration Helmet pour les headers de sécurité
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
});

/**
 * Rate limiter global
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.isDev ? 1 * 60 * 1000 : config.security.rateLimit.windowMs,
  max: config.isDev ? 1000 : config.security.rateLimit.maxRequests,
  message: { 
    error: 'Trop de requêtes, veuillez réessayer plus tard',
    code: 'TOO_MANY_REQUESTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', { 
      ip: req.ip, 
      path: req.path,
      userId: req.session?.userId,
    });
    throw new TooManyRequestsError();
  },
});

/**
 * Rate limiter strict pour l'authentification
 */
export const authRateLimiter = rateLimit({
  windowMs: config.isDev ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min en dev, 15 min en prod
  max: config.isDev ? 100 : 10, // 100 tentatives en dev, 10 en prod
  message: { 
    error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes',
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter pour les uploads
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 20, // 20 uploads par heure
  message: { 
    error: 'Trop de fichiers uploadés, veuillez réessayer plus tard',
    code: 'TOO_MANY_UPLOADS',
  },
});

/**
 * Middleware de nettoyage des headers dangereux
 */
export const sanitizeHeaders = (req, res, next) => {
  // Supprimer le header X-Powered-By s'il existe encore
  res.removeHeader('X-Powered-By');
  next();
};

/**
 * Middleware pour logger les requêtes suspectes
 */
export const suspiciousRequestLogger = (req, res, next) => {
  const suspiciousPatterns = [
    /(\.\.|\/\/)/,  // Path traversal
    /<script/i,     // XSS
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript injection
  ];
  
  const url = req.originalUrl;
  const body = JSON.stringify(req.body || {});
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(body)) {
      logger.warn('Suspicious request detected', {
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        userId: req.session?.userId,
      });
      break;
    }
  }
  
  next();
};
