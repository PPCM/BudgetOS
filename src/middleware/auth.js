import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Middleware d'authentification
 * Vérifie que l'utilisateur est connecté
 */
export const requireAuth = (req, res, next) => {
  if (!req.session?.userId) {
    throw new UnauthorizedError('Authentification requise');
  }
  
  // Ajouter les infos utilisateur à la requête
  req.user = {
    id: req.session.userId,
    email: req.session.email,
    role: req.session.role || 'user',
    locale: req.session.locale,
    currency: req.session.currency,
  };
  
  next();
};

/**
 * Middleware pour vérifier le rôle administrateur
 */
export const requireAdmin = (req, res, next) => {
  if (!req.session?.userId) {
    throw new UnauthorizedError('Authentification requise');
  }
  
  if (req.session.role !== 'admin') {
    logger.warn('Unauthorized admin access attempt', {
      userId: req.session.userId,
      path: req.path,
    });
    throw new ForbiddenError('Accès administrateur requis');
  }
  
  req.user = {
    id: req.session.userId,
    email: req.session.email,
    role: req.session.role,
    locale: req.session.locale,
    currency: req.session.currency,
  };
  
  next();
};

/**
 * Middleware optionnel d'authentification
 * Ajoute les infos utilisateur si connecté, sinon continue
 */
export const optionalAuth = (req, res, next) => {
  if (req.session?.userId) {
    req.user = {
      id: req.session.userId,
      email: req.session.email,
      role: req.session.role || 'user',
      locale: req.session.locale,
      currency: req.session.currency,
    };
  } else {
    req.user = null;
  }
  
  next();
};

/**
 * Middleware pour vérifier la propriété d'une ressource
 * À utiliser avec un paramètre :userId dans la route
 */
export const requireOwnership = (req, res, next) => {
  const resourceUserId = req.params.userId || req.body?.userId;
  
  if (!resourceUserId) {
    return next();
  }
  
  if (req.user.id !== resourceUserId && req.user.role !== 'admin') {
    logger.warn('Unauthorized resource access attempt', {
      userId: req.user.id,
      resourceUserId,
      path: req.path,
    });
    throw new ForbiddenError('Accès non autorisé à cette ressource');
  }
  
  next();
};
