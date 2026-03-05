import mongoose from 'mongoose';

const merchandisingSetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['featured_products', 'top_rated', 'most_gifted', 'best_sellers', 'new_arrivals', 'new_releases', 'custom'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    position: {
      type: Number,
      default: 0
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    isEnabled: {
      type: Boolean,
      default: true
    },
    maxItems: {
      type: Number,
      default: 10,
      min: 1
    },
    showPrice: {
      type: Boolean,
      default: true
    },
    showRating: {
      type: Boolean,
      default: true
    },
    autoUpdate: {
      type: Boolean,
      default: false
    },
    updateFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    }
  },
  display: {
    layout: {
      type: String,
      enum: ['grid', 'carousel', 'list'],
      default: 'grid'
    },
    columns: {
      type: Number,
      default: 4,
      min: 1,
      max: 6
    },
    autoplay: {
      type: Boolean,
      default: false
    },
    autoplaySpeed: {
      type: Number,
      default: 3000
    }
  },
  metadata: {
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  }
}, {
  timestamps: true
});

// Indexes
merchandisingSetSchema.index({ type: 1 });
merchandisingSetSchema.index({ 'settings.isEnabled': 1 });
merchandisingSetSchema.index({ 'products.position': 1 });

// Sort products by position
merchandisingSetSchema.methods.getSortedProducts = function() {
  return this.products
    .filter(p => p.product) // Filter out null products
    .sort((a, b) => a.position - b.position)
    .slice(0, this.settings.maxItems);
};

// Add product to set
merchandisingSetSchema.methods.addProduct = function(productId, position = null) {
  // Check if product already exists
  const existingIndex = this.products.findIndex(p => 
    p.product.toString() === productId.toString()
  );
  
  if (existingIndex !== -1) {
    // Update position if provided
    if (position !== null) {
      this.products[existingIndex].position = position;
    }
    return this;
  }
  
  // Determine position
  if (position === null) {
    position = this.products.length;
  }
  
  // Add new product
  this.products.push({
    product: productId,
    position: position,
    addedAt: new Date()
  });
  
  // Reorder positions
  this.reorderPositions();
  
  return this;
};

// Remove product from set
merchandisingSetSchema.methods.removeProduct = function(productId) {
  this.products = this.products.filter(p => 
    p.product.toString() !== productId.toString()
  );
  
  // Reorder positions
  this.reorderPositions();
  
  return this;
};

// Reorder product positions
merchandisingSetSchema.methods.reorderPositions = function() {
  this.products
    .sort((a, b) => a.position - b.position)
    .forEach((product, index) => {
      product.position = index;
    });
};

// Update product position
merchandisingSetSchema.methods.updateProductPosition = function(productId, newPosition) {
  const product = this.products.find(p => 
    p.product.toString() === productId.toString()
  );
  
  if (!product) return this;
  
  const oldPosition = product.position;
  
  // Move other products
  this.products.forEach(p => {
    if (p.product.toString() !== productId.toString()) {
      if (oldPosition < newPosition) {
        if (p.position > oldPosition && p.position <= newPosition) {
          p.position -= 1;
        }
      } else {
        if (p.position >= newPosition && p.position < oldPosition) {
          p.position += 1;
        }
      }
    }
  });
  
  product.position = newPosition;
  
  return this;
};

// Auto-update for dynamic sets
merchandisingSetSchema.methods.autoUpdateProducts = async function() {
  if (!this.settings.autoUpdate) return;
  
  const Product = mongoose.model('Product');
  let products = [];
  
  switch (this.type) {
    case 'top_rated':
      products = await Product.find({ status: 'active' })
        .sort({ 'reviews.averageRating': -1, 'reviews.reviewCount': -1 })
        .limit(this.settings.maxItems);
      break;
      
    case 'best_sellers':
      // This would require order data to calculate
      products = await Product.find({ status: 'active' })
        .sort({ 'inventory.quantity': -1 })
        .limit(this.settings.maxItems);
      break;
      
    case 'new_arrivals':
    case 'new_releases':
      products = await Product.find({ status: 'active' })
        .sort({ createdAt: -1 })
        .limit(this.settings.maxItems);
      break;
      
    default:
      return;
  }
  
  // Update products array
  this.products = products.map((product, index) => ({
    product: product._id,
    position: index,
    addedAt: new Date()
  }));
  
  this.metadata.lastUpdated = new Date();
  
  await this.save();
};

export default mongoose.model('MerchandisingSet', merchandisingSetSchema);
