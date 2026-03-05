import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  minimumAmount: {
    type: Number,
    min: 0
  },
  maximumDiscount: {
    type: Number,
    min: 0
  },
  usage: {
    limit: {
      type: Number,
      min: 1
    },
    limitPerCustomer: {
      type: Number,
      min: 1
    },
    count: {
      type: Number,
      default: 0
    }
  },
  validity: {
    type: {
      type: String,
      enum: ['duration', 'date_range', 'unlimited'],
      default: 'date_range'
    },
    startDate: Date,
    endDate: Date,
    duration: {
      days: Number,
      hours: Number
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  scope: {
    type: {
      type: String,
      enum: ['storewide', 'categories', 'products', 'collections'],
      default: 'storewide'
    },
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    excludedProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }]
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  autoApply: {
    type: Boolean,
    default: false
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  }
}, {
  timestamps: true
});

// Indexes
couponSchema.index({ code: 1 });
couponSchema.index({ 'validity.startDate': 1 });
couponSchema.index({ 'validity.endDate': 1 });
couponSchema.index({ 'validity.isActive': 1 });
couponSchema.index({ isPrivate: 1 });

// Check if coupon is valid
couponSchema.methods.isValid = function() {
  const now = new Date();
  
  // Check if coupon is active
  if (!this.validity.isActive) return false;
  
  // Check date range validity
  if (this.validity.type === 'date_range') {
    if (this.validity.startDate && now < this.validity.startDate) return false;
    if (this.validity.endDate && now > this.validity.endDate) return false;
  }
  
  // Check usage limit
  if (this.usage.limit && this.usage.count >= this.usage.limit) return false;
  
  return true;
};

// Check if customer can use this coupon
couponSchema.methods.canCustomerUse = async function(customerEmail) {
  // First check if coupon is valid
  if (!this.isValid()) return false;
  
  // Check per-customer limit
  if (this.usage.limitPerCustomer) {
    const Order = mongoose.model('Order');
    const customerUsage = await Order.countDocuments({
      'discount.code': this.code,
      'customer.email': customerEmail,
      status: { $ne: 'cancelled' }
    });
    
    if (customerUsage >= this.usage.limitPerCustomer) return false;
  }
  
  return true;
};

// Apply coupon to cart
couponSchema.methods.applyToCart = function(cart) {
  if (!this.isValid()) return { valid: false, message: 'Invalid coupon' };
  
  let applicableSubtotal = cart.subtotal;
  
  // Check if coupon is product-specific
  if (this.scope.type === 'products' && this.scope.products.length > 0) {
    const couponProductIds = this.scope.products.map(p => p._id ? p._id.toString() : p.toString());
    
    // Calculate subtotal only for matching products
    applicableSubtotal = cart.items
      .filter(item => couponProductIds.includes(item.product.toString()))
      .reduce((sum, item) => sum + item.total, 0);
    
    // Check if any cart item matches coupon products
    if (applicableSubtotal === 0) {
      return { 
        valid: false, 
        message: 'Invalid coupon' 
      };
    }
  }
  
  let discountAmount = 0;
  
  // Check minimum amount
  if (this.minimumAmount && applicableSubtotal < this.minimumAmount) {
    return { 
      valid: false, 
      message: `Minimum order amount is $${this.minimumAmount}` 
    };
  }
  
  // Calculate discount based on type (only on applicable products)
  if (this.type === 'percentage') {
    discountAmount = (applicableSubtotal * this.value) / 100;
  } else {
    discountAmount = this.value;
  }
  
  // Apply maximum discount limit
  if (this.maximumDiscount && discountAmount > this.maximumDiscount) {
    discountAmount = this.maximumDiscount;
  }
  
  return {
    valid: true,
    discountAmount,
    type: this.type,
    value: this.value,
    code: this.code,
    applicableSubtotal,
    isProductSpecific: this.scope.type === 'products' && this.scope.products.length > 0
  };
};

export default mongoose.model('Coupon', couponSchema);
