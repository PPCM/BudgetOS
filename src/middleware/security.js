import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { TooManyRequestsError } from '../utils/errors.js';

/**
 * Helmet configuration for security headers
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
      upgradeInsecureRequests: config.isDev ? null : [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
});

/**
 * Global rate limiter
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.isDev ? 1 * 60 * 1000 : config.security.rateLimit.windowMs,
  max: config.isDev ? 1000 : config.security.rateLimit.maxRequests,
  message: { 
    error: 'Too many requests, please try again later',
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
 * Strict rate limiter for authentication
 */
export const authRateLimiter = rateLimit({
  windowMs: config.isDev ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 min in prod
  max: config.isDev ? 100 : 10, // 100 attempts in dev, 10 in prod
  message: { 
    error: 'Too many login attempts, please try again in 15 minutes',
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter for file uploads
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: { 
    error: 'Too many file uploads, please try again later',
    code: 'TOO_MANY_UPLOADS',
  },
});

/**
 * Middleware to sanitize dangerous headers
 */
export const sanitizeHeaders = (req, res, next) => {
  // Remove X-Powered-By header if still present
  res.removeHeader('X-Powered-By');
  next();
};

/**
 * Middleware to log suspicious requests
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
