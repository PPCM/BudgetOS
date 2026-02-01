import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Build req.user from session data.
 * @param {Object} session - Express session
 * @returns {Object} User object for req.user
 */
const buildReqUser = (session) => ({
  id: session.userId,
  email: session.email,
  role: session.role || 'user',
  locale: session.locale,
  currency: session.currency,
});

/**
 * Throws UnauthorizedError if session has no userId.
 * Populates req.user from session.
 * @param {Object} req - Express request
 */
const ensureAuthenticated = (req) => {
  if (!req.session?.userId) {
    throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
  }
  req.user = buildReqUser(req.session);
};

/**
 * Middleware requiring authentication.
 * Populates req.user from session data.
 */
export const requireAuth = (req, res, next) => {
  ensureAuthenticated(req);
  next();
};

/**
 * Middleware requiring admin or super_admin role
 */
export const requireAdmin = (req, res, next) => {
  ensureAuthenticated(req);

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    logger.warn('Unauthorized admin access attempt', {
      userId: req.user.id,
      path: req.path,
    });
    throw new ForbiddenError('Admin access required', 'ADMIN_REQUIRED');
  }

  next();
};

/**
 * Middleware requiring super_admin role
 */
export const requireSuperAdmin = (req, res, next) => {
  ensureAuthenticated(req);

  if (req.user.role !== 'super_admin') {
    logger.warn('Unauthorized super admin access attempt', {
      userId: req.user.id,
      path: req.path,
    });
    throw new ForbiddenError('Super admin access required', 'SUPER_ADMIN_REQUIRED');
  }

  next();
};

/**
 * Middleware requiring super_admin OR admin of the group specified in params/body.
 * Uses dynamic import to avoid circular dependency with Group model.
 */
export const requireGroupAdmin = async (req, res, next) => {
  ensureAuthenticated(req);

  // Super admins always have access
  if (req.user.role === 'super_admin') {
    return next();
  }

  const groupId = req.params.groupId || req.body?.groupId;
  if (!groupId) {
    throw new ForbiddenError('Group admin access required', 'GROUP_ADMIN_REQUIRED');
  }

  // Dynamic import to avoid circular dependency
  const { Group } = await import('../models/Group.js');
  const isAdmin = await Group.isGroupAdmin(req.user.id, groupId);

  if (!isAdmin) {
    logger.warn('Unauthorized group admin access attempt', {
      userId: req.user.id,
      groupId,
      path: req.path,
    });
    throw new ForbiddenError('Group admin access required', 'GROUP_ADMIN_REQUIRED');
  }

  next();
};

/**
 * Middleware requiring admin or super_admin role (without group check)
 */
export const requireAdminOrSuperAdmin = (req, res, next) => {
  ensureAuthenticated(req);

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    logger.warn('Unauthorized admin access attempt', {
      userId: req.user.id,
      path: req.path,
    });
    throw new ForbiddenError('Admin access required', 'ADMIN_REQUIRED');
  }

  next();
};

/**
 * Optional authentication middleware.
 * Populates req.user if authenticated, otherwise sets it to null.
 */
export const optionalAuth = (req, res, next) => {
  req.user = req.session?.userId ? buildReqUser(req.session) : null;
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
    throw new ForbiddenError('Unauthorized access to this resource', 'FORBIDDEN');
  }

  next();
};
