import Group from '../models/Group.js';
import User from '../models/User.js';
import { BadRequestError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Create a new group (super_admin only)
 */
export const createGroup = async (req, res) => {
  const group = await Group.create({
    name: req.body.name,
    description: req.body.description,
    defaultLocale: req.body.defaultLocale,
    createdBy: req.user.id,
  });

  logger.info('Group created', { groupId: group.id, userId: req.user.id });

  res.status(201).json({
    success: true,
    data: { group },
  });
};

/**
 * List groups (admin: own groups, super_admin: all)
 */
export const listGroups = async (req, res) => {
  const { page, limit, search, isActive } = req.query;

  let result;
  if (req.user.role === 'super_admin') {
    result = await Group.findAll({ page, limit, search, isActive });
  } else {
    // Admin users see only groups they administer
    const adminGroups = await Group.findByAdmin(req.user.id);
    result = {
      data: adminGroups,
      pagination: { page: 1, limit: adminGroups.length, total: adminGroups.length, totalPages: 1 },
    };
  }

  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
};

/**
 * Get current user's groups
 */
export const getMyGroups = async (req, res) => {
  const groups = await Group.findByUser(req.user.id);

  res.json({
    success: true,
    data: groups,
  });
};

/**
 * Get group details
 */
export const getGroup = async (req, res) => {
  const group = await Group.findByIdOrFail(req.params.groupId);
  const memberCount = await Group.getMemberCount(group.id);

  res.json({
    success: true,
    data: { group: { ...group, memberCount } },
  });
};

/**
 * Update a group (super_admin only)
 */
export const updateGroup = async (req, res) => {
  const group = await Group.update(req.params.groupId, req.body);

  logger.info('Group updated', { groupId: group.id, userId: req.user.id });

  res.json({
    success: true,
    data: { group },
  });
};

/**
 * Deactivate a group (super_admin only)
 */
export const deleteGroup = async (req, res) => {
  const group = await Group.deactivate(req.params.groupId);

  logger.info('Group deactivated', { groupId: group.id, userId: req.user.id });

  res.json({
    success: true,
    data: { group },
  });
};

/**
 * List members of a group
 */
export const listMembers = async (req, res) => {
  const { groupId } = req.params;
  const { page, limit, role } = req.query;

  await Group.findByIdOrFail(groupId);
  const result = await Group.findMembers(groupId, { page, limit, role });

  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
};

/**
 * Add a member to a group.
 * Can either add an existing user (by userId) or create a new one (by email+password).
 */
export const addMember = async (req, res) => {
  const { groupId } = req.params;
  const { userId, email, password, firstName, lastName, role, locale, currency } = req.body;

  const group = await Group.findByIdOrFail(groupId);

  let targetUserId = userId;

  // If no userId provided but email+password, create a new user
  if (!targetUserId && email && password) {
    const newUser = await User.createByAdmin({
      email, password, firstName, lastName, role: 'user',
      locale: locale || group.defaultLocale,
      currency: currency || undefined,
    });
    targetUserId = newUser.id;
  }

  if (!targetUserId) {
    throw new BadRequestError('userId or email+password required', 'MEMBER_ID_REQUIRED');
  }

  const member = await Group.addMember(groupId, targetUserId, role || 'member');

  logger.info('Member added to group', {
    groupId, userId: targetUserId, role: role || 'member',
    addedBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: { member },
  });
};

/**
 * Update a member's role in a group
 */
export const updateMember = async (req, res) => {
  const { groupId, userId } = req.params;
  const { role } = req.body;

  const member = await Group.updateMemberRole(groupId, userId, role);

  logger.info('Member role updated', {
    groupId, userId, newRole: role, updatedBy: req.user.id,
  });

  res.json({
    success: true,
    data: { member },
  });
};

/**
 * Delete a member (user and all their data) from a group
 */
export const removeMember = async (req, res) => {
  const { groupId, userId } = req.params;

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

  logger.info('User deleted from group', {
    groupId, userId, deletedBy: req.user.id,
  });

  res.json({
    success: true,
    message: 'User deleted',
  });
};
