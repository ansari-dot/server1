import express from 'express';
import NotificationController from '../controllers/NotificationController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', authenticate, NotificationController.getNotifications);
router.put('/:id/read', authenticate, NotificationController.markAsRead);
router.put('/read-all', authenticate, NotificationController.markAllAsRead);

export default router;
