import express from 'express';
import CouponController from '../controllers/CouponController.js';

const router = express.Router();

// Get all coupons with pagination and filtering
router.get('/', CouponController.getCoupons);

// Get coupon statistics
router.get('/stats', CouponController.getCouponStats);

// Validate coupon (public endpoint, but requires auth for admin)
router.post('/validate', CouponController.validateCoupon);

// Check customer usage
router.post('/check-usage', CouponController.checkCustomerUsage);

// Get coupon usage history
router.get('/:code/usage', CouponController.getCouponUsage);

// Get single coupon by ID
router.get('/:id', CouponController.getCoupon);

// Create new coupon
router.post('/', 
  CouponController.createCoupon
);

// Update coupon
router.put('/:id',
  CouponController.updateCoupon
);

// Delete coupon
router.delete('/:id',
  CouponController.deleteCoupon
);

// Toggle coupon status
router.patch('/:id/toggle',
  CouponController.toggleStatus
);

export default router;
