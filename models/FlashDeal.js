import mongoose from 'mongoose';

const flashDealSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  discount: {
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true
    },
    value: {
      type: Number,
      required: true,
      min: 0
    }
  },
  inventory: {
    originalStock: {
      type: Number,
      required: true,
      min: 1
    },
    currentStock: {
      type: Number,
      required: true,
      min: 0
    },
    sold: {
      type: Number,
      default: 0
    }
  },
  schedule: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'expired', 'out_of_stock', 'cancelled'],
    default: 'scheduled'
  },
  settings: {
    showBadge: {
      type: Boolean,
      default: true
    },
    badgeText: String,
    showCountdown: {
      type: Boolean,
      default: true
    },
    showStock: {
      type: Boolean,
      default: true
    },
    maxPerCustomer: {
      type: Number,
      min: 1
    }
  },
  performance: {
    views: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    }
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
flashDealSchema.index({ product: 1 });
flashDealSchema.index({ 'schedule.startDate': 1 });
flashDealSchema.index({ 'schedule.endDate': 1 });
flashDealSchema.index({ status: 1 });
flashDealSchema.index({ 'inventory.currentStock': 1 });

// Update status based on schedule and inventory
flashDealSchema.methods.updateStatus = function() {
  const now = new Date();
  
  if (this.status === 'cancelled') return this.status;
  
  if (now < this.schedule.startDate) {
    this.status = 'scheduled';
  } else if (now >= this.schedule.startDate && now <= this.schedule.endDate) {
    if (this.inventory.currentStock <= 0) {
      this.status = 'out_of_stock';
    } else {
      this.status = 'active';
    }
  } else if (now > this.schedule.endDate) {
    this.status = 'expired';
  }
  
  return this.status;
};

// Check if deal is currently active
flashDealSchema.methods.isActive = function() {
  return this.updateStatus() === 'active';
};

// Calculate time left
flashDealSchema.methods.getTimeLeft = function() {
  const now = new Date();
  const endDate = new Date(this.schedule.endDate);
  
  if (now >= endDate) return null;
  
  const diff = endDate - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds };
};

// Calculate deal price
flashDealSchema.methods.calculateDealPrice = function(originalPrice) {
  const discountAmount = this.discount.type === 'percentage' 
    ? (originalPrice * this.discount.value) / 100 
    : this.discount.value;
  return originalPrice - discountAmount;
};

// Purchase from flash deal
flashDealSchema.methods.purchase = async function(quantity = 1) {
  if (!this.isActive()) {
    throw new Error('Flash deal is not active');
  }
  
  if (this.inventory.currentStock < quantity) {
    throw new Error('Insufficient stock');
  }
  
  // Update inventory
  this.inventory.currentStock -= quantity;
  this.inventory.sold += quantity;
  
  // Update performance
  this.performance.conversions += quantity;
  
  // Update status if out of stock
  if (this.inventory.currentStock === 0) {
    this.status = 'out_of_stock';
  }
  
  await this.save();
  
  return this;
};

// Auto-update status
flashDealSchema.pre('save', function(next) {
  if (this.isModified('schedule.startDate') || 
      this.isModified('schedule.endDate') || 
      this.isModified('inventory.currentStock')) {
    this.updateStatus();
  }
  next();
});

export default mongoose.model('FlashDeal', flashDealSchema);
