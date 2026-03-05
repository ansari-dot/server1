import express from 'express';
import NewsletterController from '../controllers/NewsletterController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.post('/subscribe', NewsletterController.subscribe);
router.get('/check', NewsletterController.checkSubscription);
router.get('/', authenticate, NewsletterController.getAll);
router.get('/export', authenticate, NewsletterController.exportToExcel);
router.delete('/:id', authenticate, NewsletterController.delete);

export default router;
