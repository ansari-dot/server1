import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {
    name: String,
    value: String
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const orderAddressSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: String,
  company: String,
  address1: { type: String, required: true },
  address2: String,
  city: { type: String, required: true },
  province: { type: String, required: true },
  country: { type: String, required: true },
  postalCode: { type: String, required: true },
  phone: String
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  customer: {
    email: { type: String, required: true, lowercase: true },
    firstName: { type: String, required: true },
    lastName: String,
    phone: String
  },
  items: [orderItemSchema],
  shippingAddress: orderAddressSchema,
  billingAddress: orderAddressSchema,
  currency: {
    code: { type: String, default: 'BBD' },
    rate: { type: Number, default: 1 }
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  shipping: {
    method: String,
    cost: { type: Number, default: 0 }
  },
  tax: {
    amount: { type: Number, default: 0 },
    rate: { type: Number, default: 0 }
  },
  discount: {
    code: String,
    type: { type: String, enum: ['percentage', 'fixed'] },
    value: { type: Number, default: 0 },
    amount: { type: Number, default: 0 }
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'paypal', 'bank_transfer', 'cash_on_delivery'],
    required: true
  },
  transactionId: String,
  notes: String,
  tracking: {
    number: String,
    carrier: String,
    url: String
  },
  metadata: {
    source: { type: String, default: 'admin' },
    userAgent: String,
    ip: String
  }
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ total: -1 });

// Generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Calculate totals
orderSchema.pre('save', function(next) {
  if (this.isModified('items') || this.isModified('discount') || this.isModified('shipping') || this.isModified('tax')) {
    // Calculate subtotal
    this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
    
    // Calculate total
    this.total = this.subtotal + this.shipping.cost + this.tax.amount - this.discount.amount;
  }
  next();
});

export default mongoose.model('Order', orderSchema);
