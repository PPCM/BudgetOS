import { Router } from 'express';
import * as groupController from '../controllers/groupController.js';
import { requireAuth, requireSuperAdmin, requireGroupAdmin, requireAdminOrSuperAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  groupListQuerySchema,
  memberListQuerySchema,
} from '../validators/group.js';

const router = Router();

// Group CRUD
router.post('/', requireSuperAdmin, validate({ body: createGroupSchema }), asyncHandler(groupController.createGroup));
router.get('/', requireAdminOrSuperAdmin, validate({ query: groupListQuerySchema }), asyncHandler(groupController.listGroups));
router.get('/my', requireAuth, asyncHandler(groupController.getMyGroups));
router.get('/:groupId', asyncHandler(requireGroupAdmin), asyncHandler(groupController.getGroup));
router.put('/:groupId', requireSuperAdmin, validate({ body: updateGroupSchema }), asyncHandler(groupController.updateGroup));
router.delete('/:groupId', requireSuperAdmin, asyncHandler(groupController.deleteGroup));

// Group members
router.get('/:groupId/members', asyncHandler(requireGroupAdmin), validate({ query: memberListQuerySchema }), asyncHandler(groupController.listMembers));
router.post('/:groupId/members', asyncHandler(requireGroupAdmin), validate({ body: addMemberSchema }), asyncHandler(groupController.addMember));
router.put('/:groupId/members/:userId', asyncHandler(requireGroupAdmin), validate({ body: updateMemberRoleSchema }), asyncHandler(groupController.updateMember));
router.delete('/:groupId/members/:userId', asyncHandler(requireGroupAdmin), asyncHandler(groupController.removeMember));

export default router;
