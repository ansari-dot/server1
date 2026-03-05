import mongoose from 'mongoose';

const currencySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 3
  },
  name: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  format: {
    decimalPlaces: {
      type: Number,
      default: 2,
      min: 0,
      max: 4
    },
    decimalSeparator: {
      type: String,
      default: '.'
    },
    thousandsSeparator: {
      type: String,
      default: ','
    },
    symbolPosition: {
      type: String,
      enum: ['before', 'after'],
      default: 'before'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  metadata: {
    autoUpdate: {
      type: Boolean,
      default: true
    },
    updateSource: {
      type: String,
      enum: ['manual', 'api', 'csv'],
      default: 'manual'
    }
  }
}, {
  timestamps: true
});

// Indexes
currencySchema.index({ code: 1 });
currencySchema.index({ isActive: 1 });
currencySchema.index({ isDefault: 1 });

// Ensure only one default currency
currencySchema.pre('save', async function(next) {
  if (this.isDefault) {
    await mongoose.model('Currency').updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Format amount
currencySchema.methods.formatAmount = function(amount) {
  const formatted = amount.toFixed(this.format.decimalPlaces);
  const parts = formatted.split('.');
  
  // Add thousands separator
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, this.format.thousandsSeparator);
  
  let result = parts.join(this.format.decimalSeparator);
  
  // Add symbol
  if (this.format.symbolPosition === 'before') {
    result = this.symbol + result;
  } else {
    result = result + ' ' + this.symbol;
  }
  
  return result;
};

// Convert from base currency
currencySchema.methods.convertFromBase = function(baseAmount) {
  return baseAmount * this.rate;
};

// Convert to base currency
currencySchema.methods.convertToBase = function(amount) {
  return amount / this.rate;
};

// Get default currency
currencySchema.statics.getDefault = async function() {
  return this.findOne({ isDefault: true, isActive: true });
};

// Get active currencies
currencySchema.statics.getActive = async function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Update rates from external source
currencySchema.statics.updateRates = async function(rates) {
  const bulkOps = [];
  
  for (const [code, rate] of Object.entries(rates)) {
    bulkOps.push({
      updateOne: {
        filter: { code: code.toUpperCase() },
        update: { 
          rate: rate,
          lastUpdated: new Date()
        },
        upsert: true
      }
    });
  }
  
  if (bulkOps.length > 0) {
    await this.bulkWrite(bulkOps);
  }
};

export default mongoose.model('Currency', currencySchema);
