import express from 'express';
import AuditLogController from '../controllers/AuditLogController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', authenticate, AuditLogController.getLogs);
router.get('/export', authenticate, AuditLogController.exportLogs);

export default router;
