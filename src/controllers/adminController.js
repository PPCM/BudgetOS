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
    throw new NotFoundError('User not found', 'USER_NOT_FOUND');
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
    throw new BadRequestError('You cannot modify your own role', 'CANNOT_MODIFY_OWN_ROLE');
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
    throw new BadRequestError('You cannot suspend yourself', 'CANNOT_SUSPEND_SELF');
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
 * Delete a user and all their data (super_admin only)
 */
export const deleteUser = async (req, res) => {
  const { userId } = req.params;

  if (userId === req.user.id) {
    throw new BadRequestError('You cannot delete yourself', 'CANNOT_DELETE_SELF');
  }

  // Prevent deleting the last super_admin
  const targetUser = await User.findByIdAny(userId);
  if (targetUser?.role === 'super_admin') {
    const { data: superAdmins } = await User.findAll({ role: 'super_admin' });
    if (superAdmins.length <= 1) {
      throw new BadRequestError('Cannot delete the last super administrator', 'CANNOT_DELETE_LAST_SUPER_ADMIN');
    }
  }

  await User.delete(userId);

  logger.info('User deleted by admin', { userId, deletedBy: req.user.id });

  res.json({
    success: true,
    message: 'User deleted',
  });
};

/**
 * Change user role (super_admin only)
 */
export const updateUserRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (userId === req.user.id) {
    throw new BadRequestError('You cannot modify your own role', 'CANNOT_MODIFY_OWN_ROLE');
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
    data: settings,
  });
};

/**
 * Update system settings (super_admin only)
 */
export const updateSettings = async (req, res) => {
  const { allowPublicRegistration, defaultRegistrationGroupId, defaultLocale, defaultDecimalSeparator, defaultDigitGrouping } = req.body;

  if (allowPublicRegistration !== undefined) {
    // If enabling public registration, verify default group is set
    if (allowPublicRegistration === true) {
      const currentGroupId = defaultRegistrationGroupId ||
        await SystemSetting.get('default_registration_group_id');
      if (!currentGroupId) {
        throw new BadRequestError(
          'A default group must be set to enable public registration', 'DEFAULT_GROUP_REQUIRED'
        );
      }
      // Verify the group exists and is active
      const group = await Group.findById(currentGroupId);
      if (!group || !group.isActive) {
        throw new BadRequestError('The specified default group is invalid or inactive', 'DEFAULT_GROUP_INVALID');
      }
    }
    await SystemSetting.set('allow_public_registration', String(allowPublicRegistration), req.user.id);
  }

  if (defaultRegistrationGroupId !== undefined) {
    if (defaultRegistrationGroupId !== null) {
      // Verify group exists
      const group = await Group.findById(defaultRegistrationGroupId);
      if (!group || !group.isActive) {
        throw new BadRequestError('The specified group is invalid or inactive', 'GROUP_INVALID');
      }
    }
    await SystemSetting.set('default_registration_group_id', defaultRegistrationGroupId, req.user.id);
  }

  if (defaultLocale !== undefined) {
    await SystemSetting.set('default_locale', defaultLocale, req.user.id);
  }

  if (defaultDecimalSeparator !== undefined) {
    await SystemSetting.set('default_decimal_separator', defaultDecimalSeparator, req.user.id);
  }

  if (defaultDigitGrouping !== undefined) {
    await SystemSetting.set('default_digit_grouping', defaultDigitGrouping, req.user.id);
  }

  const settings = await SystemSetting.getAllFormatted();

  logger.info('System settings updated', { updatedBy: req.user.id });

  res.json({
    success: true,
    data: settings,
  });
};
