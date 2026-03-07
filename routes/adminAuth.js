import express from 'express';
import AdminAuthController from '../controllers/AdminAuthController.js';
import { authenticate } from '../middlewares/auth.js';
import { profileUpload } from '../middlewares/upload.js';

const router = express.Router();

router.post('/login', AdminAuthController.login);
router.get('/profile', authenticate, AdminAuthController.getProfile);
router.put('/profile', authenticate, profileUpload.single('profileImage'), AdminAuthController.updateProfile);
router.put('/change-password', authenticate, AdminAuthController.changePassword);

export default router;
