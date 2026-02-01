import crypto from 'crypto';
import { ForbiddenError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Generate a CSRF token
 */
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Custom CSRF protection middleware
 * Alternative to the deprecated csurf package
 */
export const csrfProtection = (req, res, next) => {
  // Skip safe methods (GET, HEAD, OPTIONS)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }
  
  // Verify the CSRF token
  const tokenFromHeader = req.headers['x-csrf-token'];
  const tokenFromBody = req.body?._csrf;
  const tokenFromSession = req.session?.csrfToken;
  
  const providedToken = tokenFromHeader || tokenFromBody;
  
  if (!providedToken || !tokenFromSession || providedToken !== tokenFromSession) {
    logger.warn('CSRF token mismatch', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.session?.userId,
    });
    throw new ForbiddenError('Invalid CSRF token', 'CSRF_TOKEN_INVALID');
  }
  
  next();
};

/**
 * Middleware to generate and provide the CSRF token
 */
export const csrfTokenProvider = (req, res, next) => {
  // Generate a token if missing
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }
  
  // Add a method to retrieve the token
  res.locals.csrfToken = req.session.csrfToken;
  
  // Expose the token in a response header for SPAs
  res.setHeader('X-CSRF-Token', req.session.csrfToken);
  
  next();
};

/**
 * Route to obtain the CSRF token (for SPAs)
 */
export const csrfTokenRoute = (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }
  
  res.json({ csrfToken: req.session.csrfToken });
};
