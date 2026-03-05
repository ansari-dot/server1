import express from 'express';
import DashboardController from '../controllers/DashboardController.js';

const router = express.Router();

// Get comprehensive dashboard statistics
router.get('/stats', DashboardController.getDashboardStats);

// Get sales chart data
router.get('/sales-chart', DashboardController.getSalesChartData);

// Get top products
router.get('/top-products', DashboardController.getTopProducts);

export default router;
