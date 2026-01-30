import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Middleware requiring authentication.
 * Populates req.user from session data.
 */
export const requireAuth = (req, res, next) => {
  if (!req.session?.userId) {
    throw new UnauthorizedError('Authentification requise');
  }

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
 * Middleware requiring admin or super_admin role
 */
export const requireAdmin = (req, res, next) => {
  if (!req.session?.userId) {
    throw new UnauthorizedError('Authentification requise');
  }

  if (req.session.role !== 'admin' && req.session.role !== 'super_admin') {
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
 * Middleware requiring super_admin role
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.session?.userId) {
    throw new UnauthorizedError('Authentification requise');
  }

  if (req.session.role !== 'super_admin') {
    logger.warn('Unauthorized super admin access attempt', {
      userId: req.session.userId,
      path: req.path,
    });
    throw new ForbiddenError('Accès super administrateur requis');
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
 * Middleware requiring super_admin OR admin of the group specified in params/body.
 * Uses dynamic import to avoid circular dependency with Group model.
 */
export const requireGroupAdmin = async (req, res, next) => {
  if (!req.session?.userId) {
    throw new UnauthorizedError('Authentification requise');
  }

  req.user = {
    id: req.session.userId,
    email: req.session.email,
    role: req.session.role || 'user',
    locale: req.session.locale,
    currency: req.session.currency,
  };

  // Super admins always have access
  if (req.session.role === 'super_admin') {
    return next();
  }

  const groupId = req.params.groupId || req.body?.groupId;
  if (!groupId) {
    throw new ForbiddenError('Accès administrateur de groupe requis');
  }

  // Dynamic import to avoid circular dependency
  const { Group } = await import('../models/Group.js');
  const isAdmin = await Group.isGroupAdmin(req.session.userId, groupId);

  if (!isAdmin) {
    logger.warn('Unauthorized group admin access attempt', {
      userId: req.session.userId,
      groupId,
      path: req.path,
    });
    throw new ForbiddenError('Accès administrateur de groupe requis');
  }

  next();
};

/**
 * Middleware requiring admin or super_admin role (without group check)
 */
export const requireAdminOrSuperAdmin = (req, res, next) => {
  if (!req.session?.userId) {
    throw new UnauthorizedError('Authentification requise');
  }

  if (req.session.role !== 'admin' && req.session.role !== 'super_admin') {
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
 * Optional authentication middleware.
 * Populates req.user if authenticated, otherwise sets it to null.
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
 * Middleware to verify resource ownership.
 * Allows access if user owns the resource or has admin/super_admin role.
 */
export const requireOwnership = (req, res, next) => {
  const resourceUserId = req.params.userId || req.body?.userId;

  if (!resourceUserId) {
    return next();
  }

  if (req.user.id !== resourceUserId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    logger.warn('Unauthorized resource access attempt', {
      userId: req.user.id,
      resourceUserId,
      path: req.path,
    });
    throw new ForbiddenError('Accès non autorisé à cette ressource');
  }

  next();
};
