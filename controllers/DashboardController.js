import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import FlashDeal from '../models/FlashDeal.js';
import MerchandisingSet from '../models/Merchandising.js';
import Currency from '../models/Currency.js';
import Admin from '../models/Admin.js';

class DashboardController {
  // Get comprehensive dashboard statistics
  static async getDashboardStats(req, res) {
    try {
      const [
        productStats,
        orderStats,
        couponStats,
        flashDealStats,
        revenueStats
      ] = await Promise.all([
        DashboardController.getProductStats(),
        DashboardController.getOrderStats(),
        DashboardController.getCouponStats(),
        DashboardController.getFlashDealStats(),
        DashboardController.getRevenueStats()
      ]);

      res.json({
        success: true,
        data: {
          overview: {
            totalOrders: orderStats.totalOrders,
            activeProducts: productStats.activeProducts,
            activeCoupons: couponStats.activeCoupons,
            liveFlashDeals: flashDealStats.activeFlashDeals,
            totalRevenue: revenueStats.totalRevenue,
            averageOrderValue: revenueStats.averageOrderValue
          },
          products: productStats,
          orders: orderStats,
          coupons: couponStats,
          flashDeals: flashDealStats,
          revenue: revenueStats
        }
      });

    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get product statistics
  static async getProductStats() {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          inactiveProducts: {
            $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
          },
          draftProducts: {
            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
          },
          lowStockProducts: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'active'] },
                    { $eq: ['$trackInventory', true] },
                    { $lte: ['$inventory.quantity', '$inventory.lowStockThreshold'] }
                  ]
                },
                1,
                0
              ]
            }
          },
          outOfStockProducts: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'active'] },
                    { $eq: ['$trackInventory', true] },
                    { $eq: ['$inventory.quantity', 0] }
                  ]
                },
                1,
                0
              ]
            }
          },
          totalInventoryValue: {
            $sum: { $multiply: ['$price', '$inventory.quantity'] }
          }
        }
      }
    ]);

    return stats[0] || {
      totalProducts: 0,
      activeProducts: 0,
      inactiveProducts: 0,
      draftProducts: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      totalInventoryValue: 0
    };
  }

  // Get order statistics
  static async getOrderStats() {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalStats, monthlyStats, weeklyStats, recentOrders] = await Promise.all([
      Order.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            processingOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
            },
            shippedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] }
            },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            paidOrders: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
            }
          }
        }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: lastMonth } } },
        {
          $group: {
            _id: null,
            monthlyOrders: { $sum: 1 },
            monthlyRevenue: { $sum: '$total' }
          }
        }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: lastWeek } } },
        {
          $group: {
            _id: null,
            weeklyOrders: { $sum: 1 },
            weeklyRevenue: { $sum: '$total' }
          }
        }
      ]),
      Order.find()
        .populate('items.product', 'name sku')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const result = totalStats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      pendingOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      paidOrders: 0
    };

    const monthly = monthlyStats[0] || { monthlyOrders: 0, monthlyRevenue: 0 };
    const weekly = weeklyStats[0] || { weeklyOrders: 0, weeklyRevenue: 0 };

    return {
      ...result,
      monthlyOrders: monthly.monthlyOrders,
      monthlyRevenue: monthly.monthlyRevenue,
      weeklyOrders: weekly.weeklyOrders,
      weeklyRevenue: weekly.weeklyRevenue,
      recentOrders
    };
  }

  // Get coupon statistics
  static async getCouponStats() {
    const stats = await Coupon.aggregate([
      {
        $group: {
          _id: null,
          totalCoupons: { $sum: 1 },
          activeCoupons: {
            $sum: { $cond: [{ $eq: ['$validity.isActive', true] }, 1, 0] }
          },
          privateCoupons: {
            $sum: { $cond: [{ $eq: ['$isPrivate', true] }, 1, 0] }
          },
          publicCoupons: {
            $sum: { $cond: [{ $eq: ['$isPrivate', false] }, 1, 0] }
          },
          percentageCoupons: {
            $sum: { $cond: [{ $eq: ['$type', 'percentage'] }, 1, 0] }
          },
          fixedCoupons: {
            $sum: { $cond: [{ $eq: ['$type', 'fixed'] }, 1, 0] }
          },
          totalUsage: { $sum: '$usage.count' }
        }
      }
    ]);

    // Get expiring coupons (expiring within next 7 days)
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const expiringCoupons = await Coupon.find({
      'validity.isActive': true,
      'validity.endDate': { $gte: now, $lte: nextWeek }
    }).sort({ 'validity.endDate': 1 }).limit(10);

    const result = stats[0] || {
      totalCoupons: 0,
      activeCoupons: 0,
      privateCoupons: 0,
      publicCoupons: 0,
      percentageCoupons: 0,
      fixedCoupons: 0,
      totalUsage: 0
    };

    return {
      ...result,
      expiringCoupons
    };
  }

  // Get flash deal statistics
  static async getFlashDealStats() {
    const now = new Date();
    
    const stats = await FlashDeal.aggregate([
      {
        $group: {
          _id: null,
          totalFlashDeals: { $sum: 1 },
          activeFlashDeals: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lte: ['$schedule.startDate', now] },
                    { $gte: ['$schedule.endDate', now] },
                    { $gt: ['$inventory.currentStock', 0] }
                  ]
                },
                1,
                0
              ]
            }
          },
          scheduledFlashDeals: {
            $sum: {
              $cond: [
                { $gt: ['$schedule.startDate', now] },
                1,
                0
              ]
            }
          },
          expiredFlashDeals: {
            $sum: {
              $cond: [
                { $lt: ['$schedule.endDate', now] },
                1,
                0
              ]
            }
          },
          outOfStockFlashDeals: {
            $sum: {
              $cond: [{ $eq: ['$status', 'out_of_stock'] }, 1, 0]
            }
          },
          totalSold: { $sum: '$inventory.sold' },
          totalRevenue: { $sum: '$performance.revenue' }
        }
      }
    ]);

    // Get active flash deals
    const activeDeals = await FlashDeal.find({
      'schedule.startDate': { $lte: now },
      'schedule.endDate': { $gte: now },
      'inventory.currentStock': { $gt: 0 }
    })
    .populate('product', 'name sku price images')
    .sort({ 'schedule.endDate': 1 })
    .limit(5);

    const result = stats[0] || {
      totalFlashDeals: 0,
      activeFlashDeals: 0,
      scheduledFlashDeals: 0,
      expiredFlashDeals: 0,
      outOfStockFlashDeals: 0,
      totalSold: 0,
      totalRevenue: 0
    };

    return {
      ...result,
      activeDeals
    };
  }

  // Get revenue statistics
  static async getRevenueStats() {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const [totalStats, monthlyStats, yearlyStats] = await Promise.all([
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' },
            totalOrders: { $sum: 1 }
          }
        }
      ]),
      Order.aggregate([
        { 
          $match: { 
            status: { $ne: 'cancelled' },
            createdAt: { $gte: lastMonth }
          }
        },
        {
          $group: {
            _id: null,
            monthlyRevenue: { $sum: '$total' },
            monthlyOrders: { $sum: 1 }
          }
        }
      ]),
      Order.aggregate([
        { 
          $match: { 
            status: { $ne: 'cancelled' },
            createdAt: { $gte: lastYear }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    const total = totalStats[0] || { totalRevenue: 0, averageOrderValue: 0, totalOrders: 0 };
    const monthly = monthlyStats[0] || { monthlyRevenue: 0, monthlyOrders: 0 };

    return {
      totalRevenue: total.totalRevenue,
      averageOrderValue: total.averageOrderValue,
      monthlyRevenue: monthly.monthlyRevenue,
      yearlyTrend: yearlyStats
    };
  }

  // Get sales chart data
  static async getSalesChartData(req, res) {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const salesData = await Order.aggregate([
        {
          $match: {
            status: { $ne: 'cancelled' },
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      res.json({
        success: true,
        data: { salesData }
      });

    } catch (error) {
      console.error('Get sales chart data error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get top products
  static async getTopProducts(req, res) {
    try {
      const { limit = '10', period = '30' } = req.query;
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const topProducts = await Order.aggregate([
        {
          $match: {
            status: { $ne: 'cancelled' },
            createdAt: { $gte: startDate }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            totalSold: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.total' }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' }
      ]);

      res.json({
        success: true,
        data: { topProducts }
      });

    } catch (error) {
      console.error('Get top products error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default DashboardController;
