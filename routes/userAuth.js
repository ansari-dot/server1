import express from 'express';
import AuthController from '../controllers/AuthController.js';
import { authenticateUser } from '../middlewares/userAuth.js';

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/profile', authenticateUser, AuthController.getProfile);
router.put('/profile', authenticateUser, AuthController.updateProfile);
router.get('/coupons', authenticateUser, AuthController.getUserCoupons);

export default router;
