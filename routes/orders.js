import express from 'express';
import OrderController from '../controllers/OrderController.js';
import { authenticateUser } from '../middlewares/userAuth.js';

const router = express.Router();

// Get all orders with pagination and filtering
router.get('/', OrderController.getOrders);

// Get order statistics
router.get('/stats', OrderController.getOrderStats);

// Get recent orders
router.get('/recent', OrderController.getRecentOrders);

// Get user's orders (protected)
router.get('/my-orders', authenticateUser, OrderController.getMyOrders);

// Get single order by ID
router.get('/:id', OrderController.getOrder);

// Create new order
router.post('/', 
  (req, res, next) => {
    // Optional authentication - attach user if token exists
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.userToken;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
      } catch (error) {
        // Token invalid, continue as guest
      }
    }
    next();
  },
  OrderController.createOrder
);

// Update order
router.put('/:id',
  OrderController.updateOrder
);

// Delete order
router.delete('/:id',
  OrderController.deleteOrder
);

// Update order status
router.patch('/:id/status',
  OrderController.updateOrderStatus
);

// Update payment status
router.patch('/:id/payment',
  OrderController.updatePaymentStatus
);

// Add tracking information
router.patch('/:id/tracking',
  OrderController.addTracking
);

// Refund order
router.post('/:id/refund',
  OrderController.refundOrder
);

// Track order by order number and email
router.post('/track',
  OrderController.trackOrder
);

export default router;
