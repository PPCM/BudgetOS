import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { upload, uploadPayeeImage, deletePayeeImage } from '../controllers/uploadController.js';

const router = Router();

router.use(requireAuth);

// Upload d'image pour un tiers
router.post('/payee-image', upload.single('image'), uploadPayeeImage);

// Suppression d'image
router.delete('/payee-image', deletePayeeImage);

export default router;
