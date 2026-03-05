import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: false,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  shortDescription: {
    type: String,
    maxlength: 500
  },
  features: [{
    type: String,
    trim: true
  }],
  brand: {
    type: String,
    required: true,
    trim: true
  },
  colors: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    hex: {
      type: String,
      match: /^#[0-9A-F]{6}$/i
    },
    image: String,
    price: {
      type: Number,
      min: 0
    },
    inventory: {
      type: Number,
      default: 0,
      min: 0
    },
    sku: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  sku: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  compareAtPrice: {
    type: Number,
    min: 0
  },
  costPrice: {
    type: Number,
    min: 0
  },
  isNewArrival: {
    type: Boolean,
    default: false
  },
  isHot: {
    type: Boolean,
    default: false
  },
  discount: {
    type: String,
    trim: true
  }, trackInventory: {
    type: Boolean,
    default: true
  },
  inventory: {
    quantity: {
      type: Number,
      default: 0,
      min: 0
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0
    },
    allowBackorder: {
      type: Boolean,
      default: false
    }
  },
  weight: {
    type: Number,
    min: 0
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['cm', 'in'],
      default: 'cm'
    }
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    position: {
      type: Number,
      default: 0
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  mainCategory: {
    type: String,
    required: true,
    trim: true
  },
  subCategory: {
    type: String,
    trim: true
  },
  tags: [String],
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'hidden'],
    default: 'public'
  },
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  variants: [{
    name: String,
    options: [String],
    values: [{
      name: String,
      price: Number,
      sku: String,
      inventory: Number,
      image: String
    }]
  }],
  reviews: {
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    source: String,
    externalId: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ status: 1 });
productSchema.index({ 'inventory.quantity': 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

// Generate slug from name
productSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '-')
      .replace(/-+/g, '-');
  }
  next();
});

// Ensure primary image
productSchema.pre('save', function (next) {
  if (this.images.length > 0 && !this.images.some(img => img.isPrimary)) {
    this.images[0].isPrimary = true;
  }
  next();
});

// Validate color inventory against total inventory
productSchema.pre('save', function (next) {
  if (this.trackInventory && this.colors && this.colors.length > 0) {
    const totalColorInventory = this.colors.reduce((sum, color) => sum + (color.inventory || 0), 0);
    if (totalColorInventory > this.inventory.quantity) {
      const error = new Error(`Stock Volume Mismatch: Total color inventory (${totalColorInventory}) exceeds total stock (${this.inventory.quantity})`);
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});

// Validate color inventory against total inventory on update
productSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  
  // Check if we're updating colors or inventory
  if (update && (update.colors || update.inventory || update.trackInventory !== undefined)) {
    // We need to fetch the document to validate
    this.model.findOne(this.getQuery()).then(doc => {
      if (!doc) return next();
      
      const trackInventory = update.trackInventory !== undefined ? update.trackInventory : doc.trackInventory;
      const colors = update.colors || doc.colors;
      const inventory = update.inventory || doc.inventory;
      
      if (trackInventory && colors && colors.length > 0) {
        const totalColorInventory = colors.reduce((sum, color) => sum + (color.inventory || 0), 0);
        if (totalColorInventory > inventory.quantity) {
          const error = new Error(`Stock Volume Mismatch: Total color inventory (${totalColorInventory}) exceeds total stock (${inventory.quantity})`);
          error.name = 'ValidationError';
          return next(error);
        }
      }
      next();
    }).catch(next);
  } else {
    next();
  }
});

export default mongoose.model('Product', productSchema);
