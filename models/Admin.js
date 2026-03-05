import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'manager'],
    default: 'admin'
  },
  permissions: [{
    type: String,
    enum: [
      'products.read', 'products.write', 'products.delete',
      'orders.read', 'orders.write', 'orders.delete',
      'categories.read', 'categories.write', 'categories.delete',
      'coupons.read', 'coupons.write', 'coupons.delete',
      'flash_deals.read', 'flash_deals.write', 'flash_deals.delete',
      'merchandising.read', 'merchandising.write',
      'currency.read', 'currency.write',
      'security.read', 'security.write',
      'audit_logs.read',
      'dashboard.read'
    ]
  }],
  lastLogin: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get public profile
adminSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    role: this.role,
    permissions: this.permissions,
    lastLogin: this.lastLogin,
    isActive: this.isActive,
    createdAt: this.createdAt
  };
};

export default mongoose.model('Admin', adminSchema);
