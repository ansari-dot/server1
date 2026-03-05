import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout',
      'product.create', 'product.update', 'product.delete',
      'category.create', 'category.update', 'category.delete',
      'order.create', 'order.update', 'order.delete',
      'coupon.create', 'coupon.update', 'coupon.delete',
      'flash_deal.create', 'flash_deal.update', 'flash_deal.delete',
      'merchandising.create', 'merchandising.update', 'merchandising.delete',
      'currency.update',
      'security.update',
      'settings.update'
    ]
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  details: {
    type: String,
    required: true
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  metadata: {
    ip: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    sessionId: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
auditLogSchema.index({ admin: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });
auditLogSchema.index({ 'metadata.timestamp': -1 });
auditLogSchema.index({ 'metadata.severity': 1 });

// Create audit log entry
auditLogSchema.statics.createLog = async function(data) {
  const log = new this({
    ...data,
    'metadata.timestamp': new Date()
  });
  
  await log.save();
  return log;
};

// Get recent logs for admin
auditLogSchema.statics.getRecentForAdmin = async function(adminId, limit = 50) {
  return this.find({ admin: adminId })
    .populate('admin', 'email firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Get logs by action type
auditLogSchema.statics.getByAction = async function(action, limit = 100) {
  return this.find({ action })
    .populate('admin', 'email firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Get logs by resource
auditLogSchema.statics.getByResource = async function(resource, resourceId = null, limit = 100) {
  const query = resourceId ? { resource, resourceId } : { resource };
  
  return this.find(query)
    .populate('admin', 'email firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Search logs
auditLogSchema.statics.search = async function(searchTerm, filters = {}, limit = 100) {
  const query = {
    $and: []
  };
  
  // Text search
  if (searchTerm) {
    query.$and.push({
      $or: [
        { details: { $regex: searchTerm, $options: 'i' } },
        { resource: { $regex: searchTerm, $options: 'i' } }
      ]
    });
  }
  
  // Apply filters
  if (filters.action) {
    query.$and.push({ action: filters.action });
  }
  
  if (filters.admin) {
    query.$and.push({ admin: filters.admin });
  }
  
  if (filters.severity) {
    query.$and.push({ 'metadata.severity': filters.severity });
  }
  
  if (filters.dateFrom || filters.dateTo) {
    const dateQuery = {};
    if (filters.dateFrom) dateQuery.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) dateQuery.$lte = new Date(filters.dateTo);
    query.$and.push({ createdAt: dateQuery });
  }
  
  // If no filters, return all
  if (query.$and.length === 0) {
    return this.find({})
      .populate('admin', 'email firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit);
  }
  
  return this.find(query)
    .populate('admin', 'email firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Export logs to CSV
auditLogSchema.statics.exportToCSV = async function(filters = {}) {
  const logs = await this.search('', filters, 10000);
  
  const headers = [
    'Timestamp', 'Admin Email', 'Action', 'Resource', 'Details', 
    'IP Address', 'User Agent', 'Severity'
  ];
  
  const csv = [headers.join(',')];
  
  logs.forEach(log => {
    const row = [
      `"${log.createdAt.toISOString()}"`,
      `"${log.admin?.email || 'N/A'}"`,
      `"${log.action}"`,
      `"${log.resource}"`,
      `"${log.details.replace(/"/g, '""')}"`,
      `"${log.metadata.ip || 'N/A'}"`,
      `"${(log.metadata.userAgent || '').replace(/"/g, '""')}"`,
      `"${log.metadata.severity}"`
    ];
    csv.push(row.join(','));
  });
  
  return csv.join('\n');
};

export default mongoose.model('AuditLog', auditLogSchema);
