import crypto from 'crypto';
import { ForbiddenError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Génère un token CSRF
 */
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Middleware de protection CSRF personnalisé
 * Alternative à csurf qui est déprécié
 */
export const csrfProtection = (req, res, next) => {
  // Ignorer pour les requêtes safe (GET, HEAD, OPTIONS)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }
  
  // Vérifier le token CSRF
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
    throw new ForbiddenError('Token CSRF invalide', 'CSRF_TOKEN_INVALID');
  }
  
  next();
};

/**
 * Middleware pour générer et fournir le token CSRF
 */
export const csrfTokenProvider = (req, res, next) => {
  // Générer un token si absent
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }
  
  // Ajouter une méthode pour récupérer le token
  res.locals.csrfToken = req.session.csrfToken;
  
  // Exposer le token dans un header de réponse pour les SPA
  res.setHeader('X-CSRF-Token', req.session.csrfToken);
  
  next();
};

/**
 * Route pour obtenir le token CSRF (pour les SPA)
 */
export const csrfTokenRoute = (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }
  
  res.json({ csrfToken: req.session.csrfToken });
};
