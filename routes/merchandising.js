import express from 'express';
import MerchandisingController from '../controllers/MerchandisingController.js';

const router = express.Router();

// Get all merchandising sets
router.get('/', MerchandisingController.getMerchandisingSets);

// Get featured products for client side (public endpoint)
router.get('/featured/products', MerchandisingController.getFeaturedProducts);

// Get best sellers for client side (public endpoint)
router.get('/best-sellers', MerchandisingController.getBestSellers);

// Get top selling products for client side (public endpoint)
router.get('/top-selling', MerchandisingController.getTopSellingProducts);

// Get you may like products for client side (public endpoint)
router.get('/you-may-like', MerchandisingController.getYouMayLikeProducts);

// Get new releases for client side (public endpoint)
router.get('/new-releases', MerchandisingController.getNewReleasesProducts);

// Get available products for selection
router.get('/products/available', MerchandisingController.getAvailableProducts);

// Get single merchandising set
router.get('/:id', MerchandisingController.getMerchandisingSet);

// Create new merchandising set
router.post('/', MerchandisingController.createMerchandisingSet);

// Update merchandising set
router.put('/:id', MerchandisingController.updateMerchandisingSet);

// Delete merchandising set
router.delete('/:id', MerchandisingController.deleteMerchandisingSet);

// Add product to merchandising set
router.post('/:id/products', MerchandisingController.addProductToSet);

// Remove product from merchandising set
router.delete('/:id/products/:productId', MerchandisingController.removeProductFromSet);

// Update product position in set
router.patch('/:id/products/position', MerchandisingController.updateProductPosition);

export default router;
