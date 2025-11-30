import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/security.js';
import { validate } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } from '../validators/auth.js';

const router = Router();

// Routes publiques
router.post('/register', authRateLimiter, validate({ body: registerSchema }), asyncHandler(authController.register));
router.post('/login', authRateLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));

// Routes protégées
router.post('/logout', requireAuth, asyncHandler(authController.logout));
router.get('/me', requireAuth, asyncHandler(authController.getMe));
router.put('/profile', requireAuth, validate({ body: updateProfileSchema }), asyncHandler(authController.updateProfile));
router.put('/password', requireAuth, validate({ body: changePasswordSchema }), asyncHandler(authController.changePassword));
router.get('/settings', requireAuth, asyncHandler(authController.getSettings));
router.put('/settings', requireAuth, asyncHandler(authController.updateSettings));

export default router;
