import User from '../models/User.js';
import Group from '../models/Group.js';
import SystemSetting from '../models/SystemSetting.js';
import { BadRequestError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * List all users (super_admin only)
 */
export const listUsers = async (req, res) => {
  const { page, limit, role, groupId, search, status } = req.query;
  const result = await User.findAll({ page, limit, role, groupId, search, status });

  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
};

/**
 * Get user details (super_admin only)
 */
export const getUser = async (req, res) => {
  const user = await User.findByIdAny(req.params.userId);
  if (!user) {
    const { NotFoundError } = await import('../utils/errors.js');
    throw new NotFoundError('Utilisateur non trouvé');
  }

  const groups = await Group.findByUser(req.params.userId);

  res.json({
    success: true,
    data: { user, groups },
  });
};

/**
 * Create a user (super_admin only)
 */
export const createUser = async (req, res) => {
  const { email, password, firstName, lastName, role, groupId, locale, currency } = req.body;

  const user = await User.createByAdmin({
    email, password, firstName, lastName, role, locale, currency,
  });

  // Assign to group if provided
  if (groupId) {
    await Group.addMember(groupId, user.id, role === 'admin' ? 'admin' : 'member');
  }

  logger.info('User created by admin', {
    userId: user.id, email, createdBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: { user },
  });
};

/**
 * Update a user (super_admin only)
 */
export const updateUser = async (req, res) => {
  const { userId } = req.params;

  // Prevent self-role modification
  if (req.body.role && userId === req.user.id) {
    throw new BadRequestError('Vous ne pouvez pas modifier votre propre rôle');
  }

  const user = await User.adminUpdate(userId, req.body);

  logger.info('User updated by admin', { userId, updatedBy: req.user.id });

  res.json({
    success: true,
    data: { user },
  });
};

/**
 * Suspend a user (super_admin only)
 */
export const suspendUser = async (req, res) => {
  const { userId } = req.params;

  if (userId === req.user.id) {
    throw new BadRequestError('Vous ne pouvez pas vous suspendre vous-même');
  }

  await User.deactivate(userId);
  const user = await User.findByIdAny(userId);

  logger.info('User suspended', { userId, suspendedBy: req.user.id });

  res.json({
    success: true,
    data: { user },
  });
};

/**
 * Reactivate a user (super_admin only)
 */
export const reactivateUser = async (req, res) => {
  const user = await User.reactivate(req.params.userId);

  logger.info('User reactivated', { userId: req.params.userId, reactivatedBy: req.user.id });

  res.json({
    success: true,
    data: { user },
  });
};

/**
 * Change user role (super_admin only)
 */
export const updateUserRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (userId === req.user.id) {
    throw new BadRequestError('Vous ne pouvez pas modifier votre propre rôle');
  }

  const user = await User.updateRole(userId, role);

  logger.info('User role updated', { userId, newRole: role, updatedBy: req.user.id });

  res.json({
    success: true,
    data: { user },
  });
};

/**
 * Get system settings (super_admin only)
 */
export const getSettings = async (req, res) => {
  const settings = await SystemSetting.getAllFormatted();

  res.json({
    success: true,
    data: { settings },
  });
};

/**
 * Update system settings (super_admin only)
 */
export const updateSettings = async (req, res) => {
  const { allowPublicRegistration, defaultRegistrationGroupId } = req.body;

  if (allowPublicRegistration !== undefined) {
    // If enabling public registration, verify default group is set
    if (allowPublicRegistration === true) {
      const currentGroupId = defaultRegistrationGroupId ||
        await SystemSetting.get('default_registration_group_id');
      if (!currentGroupId) {
        throw new BadRequestError(
          'Un groupe par défaut doit être défini pour activer l\'inscription publique'
        );
      }
      // Verify the group exists and is active
      const group = await Group.findById(currentGroupId);
      if (!group || !group.isActive) {
        throw new BadRequestError('Le groupe par défaut spécifié est invalide ou inactif');
      }
    }
    await SystemSetting.set('allow_public_registration', String(allowPublicRegistration), req.user.id);
  }

  if (defaultRegistrationGroupId !== undefined) {
    if (defaultRegistrationGroupId !== null) {
      // Verify group exists
      const group = await Group.findById(defaultRegistrationGroupId);
      if (!group || !group.isActive) {
        throw new BadRequestError('Le groupe spécifié est invalide ou inactif');
      }
    }
    await SystemSetting.set('default_registration_group_id', defaultRegistrationGroupId, req.user.id);
  }

  const settings = await SystemSetting.getAllFormatted();

  logger.info('System settings updated', { updatedBy: req.user.id });

  res.json({
    success: true,
    data: { settings },
  });
};
