import express from 'express';
import AdminAuthController from '../controllers/AdminAuthController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.post('/login', AdminAuthController.login);
router.get('/profile', authenticate, AdminAuthController.getProfile);

export default router;
