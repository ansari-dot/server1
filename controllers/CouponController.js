import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';

class CouponController {
  // Get all coupons with pagination and filtering
  static async getCoupons(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        type,
        isPrivate,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build query
      const query = {};
      
      if (search) {
        query.$or = [
          { code: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (status === 'active') {
        query['validity.isActive'] = true;
      } else if (status === 'inactive') {
        query['validity.isActive'] = false;
      }
      
      if (type) {
        query.type = type;
      }
      
      if (isPrivate !== undefined) {
        query.isPrivate = isPrivate === 'true';
      }

      // Build sort options
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query with pagination
      const coupons = await Coupon.find(query)
        .populate('scope.products', 'name sku price images mainCategory')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      // Add status and usage info
      const couponsWithStatus = coupons.map(coupon => {
        const couponObj = coupon.toObject();
        couponObj.isValid = coupon.isValid();
        couponObj.usageInfo = {
          used: coupon.usage.count,
          limit: coupon.usage.limit,
          remaining: coupon.usage.limit ? coupon.usage.limit - coupon.usage.count : 'Unlimited'
        };
        return couponObj;
      });

      const total = await Coupon.countDocuments(query);

      res.json({
        success: true,
        data: {
          coupons: couponsWithStatus,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get coupons error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get single coupon by ID
  static async getCoupon(req, res) {
    try {
      const coupon = await Coupon.findById(req.params.id)
        .populate('scope.products', 'name sku price images mainCategory')
        .populate('scope.excludedProducts', 'name sku');

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }

      const couponObj = coupon.toObject();
      couponObj.isValid = coupon.isValid();
      couponObj.usageInfo = {
        used: coupon.usage.count,
        limit: coupon.usage.limit,
        remaining: coupon.usage.limit ? coupon.usage.limit - coupon.usage.count : 'Unlimited'
      };

      res.json({
        success: true,
        data: { coupon: couponObj }
      });

    } catch (error) {
      console.error('Get coupon error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create new coupon
  static async createCoupon(req, res) {
    try {
      // Store old data for audit
      req.oldData = null;

      // Set created by
      if (req.admin) {
        req.body.metadata = {
          ...req.body.metadata,
          createdBy: req.admin._id
        };
      }

      const coupon = new Coupon(req.body);
      await coupon.save();

      // Populate for response
      await coupon.populate('scope.products', 'name sku price images mainCategory');

      res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        data: { coupon }
      });

    } catch (error) {
      console.error('Create coupon error:', error);
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update coupon
  static async updateCoupon(req, res) {
    try {
      // Store old data for audit
      const oldCoupon = await Coupon.findById(req.params.id);
      req.oldData = oldCoupon?.toObject();

      const coupon = await Coupon.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('scope.products', 'name sku price images mainCategory');

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }

      res.json({
        success: true,
        message: 'Coupon updated successfully',
        data: { coupon }
      });

    } catch (error) {
      console.error('Update coupon error:', error);
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete coupon
  static async deleteCoupon(req, res) {
    try {
      const coupon = await Coupon.findById(req.params.id);
      
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }

      // Store old data for audit
      req.oldData = coupon.toObject();

      await Coupon.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'Coupon deleted successfully'
      });

    } catch (error) {
      console.error('Delete coupon error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Validate coupon
  static async validateCoupon(req, res) {
    try {
      const { code, cart } = req.body;

      const coupon = await Coupon.findOne({ code: code.toUpperCase() })
        .populate('scope.products', 'name sku price images mainCategory');

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }

      // Check if coupon is valid
      if (!coupon.isValid()) {
        return res.status(400).json({
          success: false,
          message: 'Coupon is not valid or has expired'
        });
      }

      // Apply coupon to cart
      const result = coupon.applyToCart(cart);

      res.json({
        success: true,
        data: {
          coupon,
          discount: result
        }
      });

    } catch (error) {
      console.error('Validate coupon error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Check if customer can use coupon
  static async checkCustomerUsage(req, res) {
    try {
      const { code, customerEmail } = req.body;

      const coupon = await Coupon.findOne({ code: code.toUpperCase() });

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }

      const canUse = await coupon.canCustomerUse(customerEmail);

      res.json({
        success: true,
        data: {
          canUse,
          coupon: {
            code: coupon.code,
            name: coupon.name,
            type: coupon.type,
            value: coupon.value,
            usageLimit: coupon.usage.limitPerCustomer
          }
        }
      });

    } catch (error) {
      console.error('Check customer usage error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get coupon statistics
  static async getCouponStats(req, res) {
    try {
      const stats = await Coupon.aggregate([
        {
          $group: {
            _id: null,
            totalCoupons: { $sum: 1 },
            activeCoupons: {
              $sum: { $cond: [{ $eq: ['$validity.isActive', true] }, 1, 0] }
            },
            inactiveCoupons: {
              $sum: { $cond: [{ $eq: ['$validity.isActive', false] }, 1, 0] }
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

      const result = stats[0] || {
        totalCoupons: 0,
        activeCoupons: 0,
        inactiveCoupons: 0,
        privateCoupons: 0,
        publicCoupons: 0,
        percentageCoupons: 0,
        fixedCoupons: 0,
        totalUsage: 0
      };

      res.json({
        success: true,
        data: { stats: result }
      });

    } catch (error) {
      console.error('Get coupon stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Toggle coupon status
  static async toggleStatus(req, res) {
    try {
      const coupon = await Coupon.findById(req.params.id);
      
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }

      // Store old data for audit
      req.oldData = coupon.toObject();

      coupon.validity.isActive = !coupon.validity.isActive;
      await coupon.save();

      res.json({
        success: true,
        message: `Coupon ${coupon.validity.isActive ? 'activated' : 'deactivated'} successfully`,
        data: { coupon }
      });

    } catch (error) {
      console.error('Toggle coupon status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get coupon usage history
  static async getCouponUsage(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const orders = await Order.find({
        'discount.code': req.params.code
      })
      .populate('items.product', 'name sku')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      const total = await Order.countDocuments({
        'discount.code': req.params.code
      });

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get coupon usage error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default CouponController;
