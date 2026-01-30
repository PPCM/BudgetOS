import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { requireSuperAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  createUserSchema,
  updateRoleSchema,
  updateSettingsSchema,
  userListQuerySchema,
} from '../validators/admin.js';

const router = Router();

// User management
router.get('/users', requireSuperAdmin, validate({ query: userListQuerySchema }), asyncHandler(adminController.listUsers));
router.get('/users/:userId', requireSuperAdmin, asyncHandler(adminController.getUser));
router.post('/users', requireSuperAdmin, validate({ body: createUserSchema }), asyncHandler(adminController.createUser));
router.put('/users/:userId/suspend', requireSuperAdmin, asyncHandler(adminController.suspendUser));
router.put('/users/:userId/reactivate', requireSuperAdmin, asyncHandler(adminController.reactivateUser));
router.put('/users/:userId/role', requireSuperAdmin, validate({ body: updateRoleSchema }), asyncHandler(adminController.updateUserRole));

// System settings
router.get('/settings', requireSuperAdmin, asyncHandler(adminController.getSettings));
router.put('/settings', requireSuperAdmin, validate({ body: updateSettingsSchema }), asyncHandler(adminController.updateSettings));

export default router;
