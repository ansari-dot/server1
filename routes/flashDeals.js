import express from 'express';
import FlashDealController from '../controllers/FlashDealController.js';

const router = express.Router();

// Get active flash deals for client side (public endpoint) - MUST BE BEFORE /:id
router.get('/active/deals', FlashDealController.getActiveFlashDeals);

// Get available products for flash deals - MUST BE BEFORE /:id
router.get('/products/available', FlashDealController.getAvailableProducts);

// Get all flash deals
router.get('/', FlashDealController.getFlashDeals);

// Get single flash deal
router.get('/:id', FlashDealController.getFlashDeal);

// Create new flash deal
router.post('/', FlashDealController.createFlashDeal);

// Update flash deal
router.put('/:id', FlashDealController.updateFlashDeal);

// Delete flash deal
router.delete('/:id', FlashDealController.deleteFlashDeal);

export default router;
