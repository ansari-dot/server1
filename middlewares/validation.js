import Joi from 'joi';

// Admin validation schemas
export const adminSchemas = {
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    })
  }),
  
  create: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().trim().min(1).max(50).required(),
    lastName: Joi.string().trim().min(1).max(50).required(),
    role: Joi.string().valid('super_admin', 'admin', 'manager').default('admin'),
    permissions: Joi.array().items(Joi.string().valid(
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
    )).default([])
  }),
  
  update: Joi.object({
    firstName: Joi.string().trim().min(1).max(50),
    lastName: Joi.string().trim().min(1).max(50),
    role: Joi.string().valid('super_admin', 'admin', 'manager'),
    permissions: Joi.array().items(Joi.string().valid(
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
    )),
    isActive: Joi.boolean()
  })
};

// Product validation schemas
export const productSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(1).max(200).required(),
    slug: Joi.string().trim().min(1).max(200),
    description: Joi.string().trim().min(1).max(2000).required(),
    shortDescription: Joi.string().trim().max(500),
    sku: Joi.string().trim().min(1).max(50).required(),
    price: Joi.number().min(0).required(),
    compareAtPrice: Joi.number().min(0),
    costPrice: Joi.number().min(0),
    trackInventory: Joi.boolean().default(true),
    inventory: Joi.object({
      quantity: Joi.number().min(0).default(0),
      lowStockThreshold: Joi.number().min(0).default(10),
      allowBackorder: Joi.boolean().default(false)
    }),
    weight: Joi.number().min(0),
    dimensions: Joi.object({
      length: Joi.number().min(0),
      width: Joi.number().min(0),
      height: Joi.number().min(0),
      unit: Joi.string().valid('cm', 'in').default('cm')
    }),
    images: Joi.array().items(Joi.object({
      url: Joi.string().uri().required(),
      alt: Joi.string(),
      position: Joi.number().default(0),
      isPrimary: Joi.boolean().default(false)
    })),
    categories: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1).required(),
    tags: Joi.array().items(Joi.string().trim()),
    status: Joi.string().valid('active', 'inactive', 'draft', 'archived').default('draft'),
    visibility: Joi.string().valid('public', 'private', 'hidden').default('public'),
    seo: Joi.object({
      title: Joi.string().trim().max(200),
      description: Joi.string().trim().max(500),
      keywords: Joi.array().items(Joi.string().trim())
    })
  }),
  
  update: Joi.object({
    name: Joi.string().trim().min(1).max(200),
    slug: Joi.string().trim().min(1).max(200),
    description: Joi.string().trim().min(1).max(2000),
    shortDescription: Joi.string().trim().max(500),
    sku: Joi.string().trim().min(1).max(50),
    price: Joi.number().min(0),
    compareAtPrice: Joi.number().min(0),
    costPrice: Joi.number().min(0),
    trackInventory: Joi.boolean(),
    inventory: Joi.object({
      quantity: Joi.number().min(0),
      lowStockThreshold: Joi.number().min(0),
      allowBackorder: Joi.boolean()
    }),
    weight: Joi.number().min(0),
    dimensions: Joi.object({
      length: Joi.number().min(0),
      width: Joi.number().min(0),
      height: Joi.number().min(0),
      unit: Joi.string().valid('cm', 'in')
    }),
    images: Joi.array().items(Joi.object({
      url: Joi.string().uri(),
      alt: Joi.string(),
      position: Joi.number(),
      isPrimary: Joi.boolean()
    })),
    mainCategory: Joi.string().trim().required(),
    subCategory: Joi.string().trim(),
    tags: Joi.array().items(Joi.string().trim()),
    status: Joi.string().valid('active', 'inactive', 'draft', 'archived'),
    visibility: Joi.string().valid('public', 'private', 'hidden'),
    seo: Joi.object({
      title: Joi.string().trim().max(200),
      description: Joi.string().trim().max(500),
      keywords: Joi.array().items(Joi.string().trim())
    })
  })
};

// Category validation schemas
export const categorySchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    slug: Joi.string().trim().min(1).max(100),
    description: Joi.string().trim().max(500),
    image: Joi.object({
      url: Joi.string().uri(),
      alt: Joi.string()
    }),
    parent: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(null),
    isActive: Joi.boolean().default(true),
    displayOrder: Joi.number().default(0),
    seo: Joi.object({
      title: Joi.string().trim().max(200),
      description: Joi.string().trim().max(500),
      keywords: Joi.array().items(Joi.string().trim())
    })
  }),
  
  update: Joi.object({
    name: Joi.string().trim().min(1).max(100),
    slug: Joi.string().trim().min(1).max(100),
    description: Joi.string().trim().max(500),
    image: Joi.object({
      url: Joi.string().uri(),
      alt: Joi.string()
    }),
    parent: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(null),
    isActive: Joi.boolean(),
    displayOrder: Joi.number(),
    seo: Joi.object({
      title: Joi.string().trim().max(200),
      description: Joi.string().trim().max(500),
      keywords: Joi.array().items(Joi.string().trim())
    })
  })
};

// Coupon validation schemas
export const couponSchemas = {
  create: Joi.object({
    code: Joi.string().trim().min(1).max(20).required(),
    name: Joi.string().trim().min(1).max(100).required(),
    description: Joi.string().trim().max(500),
    type: Joi.string().valid('percentage', 'fixed').required(),
    value: Joi.number().min(0).required(),
    minimumAmount: Joi.number().min(0),
    maximumDiscount: Joi.number().min(0),
    usage: Joi.object({
      limit: Joi.number().min(1),
      limitPerCustomer: Joi.number().min(1)
    }),
    validity: Joi.object({
      type: Joi.string().valid('duration', 'date_range', 'unlimited').default('date_range'),
      startDate: Joi.date(),
      endDate: Joi.date(),
      duration: Joi.object({
        days: Joi.number().min(1),
        hours: Joi.number().min(0).max(23)
      }),
      isActive: Joi.boolean().default(true)
    }),
    scope: Joi.object({
      type: Joi.string().valid('storewide', 'categories', 'products', 'collections').default('storewide'),
      categories: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)),
      products: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)),
      excludedProducts: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    }),
    isPrivate: Joi.boolean().default(false),
    autoApply: Joi.boolean().default(false)
  }),
  
  update: Joi.object({
    name: Joi.string().trim().min(1).max(100),
    description: Joi.string().trim().max(500),
    type: Joi.string().valid('percentage', 'fixed'),
    value: Joi.number().min(0),
    minimumAmount: Joi.number().min(0),
    maximumDiscount: Joi.number().min(0),
    usage: Joi.object({
      limit: Joi.number().min(1),
      limitPerCustomer: Joi.number().min(1)
    }),
    validity: Joi.object({
      type: Joi.string().valid('duration', 'date_range', 'unlimited'),
      startDate: Joi.date(),
      endDate: Joi.date(),
      duration: Joi.object({
        days: Joi.number().min(1),
        hours: Joi.number().min(0).max(23)
      }),
      isActive: Joi.boolean()
    }),
    scope: Joi.object({
      type: Joi.string().valid('storewide', 'categories', 'products', 'collections'),
      categories: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)),
      products: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)),
      excludedProducts: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    }),
    isPrivate: Joi.boolean(),
    autoApply: Joi.boolean()
  })
};

// Flash Deal validation schemas
export const flashDealSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    description: Joi.string().trim().max(500),
    product: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    discount: Joi.object({
      type: Joi.string().valid('percentage', 'fixed').required(),
      value: Joi.number().min(0).required()
    }).required(),
    inventory: Joi.object({
      originalStock: Joi.number().min(1).required()
    }).required(),
    schedule: Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().required().min(Joi.ref('startDate')),
      timezone: Joi.string().default('UTC')
    }).required(),
    settings: Joi.object({
      showBadge: Joi.boolean().default(true),
      badgeText: Joi.string().trim().max(50),
      showCountdown: Joi.boolean().default(true),
      showStock: Joi.boolean().default(true),
      maxPerCustomer: Joi.number().min(1)
    })
  }),
  
  update: Joi.object({
    name: Joi.string().trim().min(1).max(100),
    description: Joi.string().trim().max(500),
    discount: Joi.object({
      type: Joi.string().valid('percentage', 'fixed'),
      value: Joi.number().min(0)
    }),
    inventory: Joi.object({
      originalStock: Joi.number().min(1)
    }),
    schedule: Joi.object({
      startDate: Joi.date(),
      endDate: Joi.date().min(Joi.ref('startDate')),
      timezone: Joi.string()
    }),
    settings: Joi.object({
      showBadge: Joi.boolean(),
      badgeText: Joi.string().trim().max(50),
      showCountdown: Joi.boolean(),
      showStock: Joi.boolean(),
      maxPerCustomer: Joi.number().min(1)
    })
  })
};

// Order validation schemas
export const orderSchemas = {
  create: Joi.object({
    customer: Joi.object({
      email: Joi.string().email().required(),
      firstName: Joi.string().trim().min(1).max(50).required(),
      lastName: Joi.string().trim().min(1).max(50).required(),
      phone: Joi.string().trim()
    }).required(),
    items: Joi.array().items(Joi.object({
      product: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      variant: Joi.object({
        name: Joi.string(),
        value: Joi.string()
      }),
      quantity: Joi.number().min(1).required(),
      price: Joi.number().min(0).required()
    })).min(1).required(),
    shippingAddress: Joi.object({
      firstName: Joi.string().trim().min(1).max(50).required(),
      lastName: Joi.string().trim().min(1).max(50).required(),
      company: Joi.string().trim(),
      address1: Joi.string().trim().min(1).max(200).required(),
      address2: Joi.string().trim().max(200),
      city: Joi.string().trim().min(1).max(50).required(),
      province: Joi.string().trim().min(1).max(50).required(),
      country: Joi.string().trim().min(1).max(50).required(),
      postalCode: Joi.string().trim().min(1).max(20).required(),
      phone: Joi.string().trim()
    }).required(),
    billingAddress: Joi.object({
      firstName: Joi.string().trim().min(1).max(50).required(),
      lastName: Joi.string().trim().min(1).max(50).required(),
      company: Joi.string().trim(),
      address1: Joi.string().trim().min(1).max(200).required(),
      address2: Joi.string().trim().max(200),
      city: Joi.string().trim().min(1).max(50).required(),
      province: Joi.string().trim().min(1).max(50).required(),
      country: Joi.string().trim().min(1).max(50).required(),
      postalCode: Joi.string().trim().min(1).max(20).required(),
      phone: Joi.string().trim()
    }).required(),
    currency: Joi.object({
      code: Joi.string().length(3).default('BBD'),
      rate: Joi.number().min(0).default(1)
    }),
    shipping: Joi.object({
      method: Joi.string().trim().required(),
      cost: Joi.number().min(0).default(0)
    }),
    paymentMethod: Joi.string().valid('credit_card', 'paypal', 'bank_transfer', 'cash_on_delivery').required(),
    notes: Joi.string().trim().max(1000)
  }),
  
  update: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded'),
    tracking: Joi.object({
      number: Joi.string().trim(),
      carrier: Joi.string().trim(),
      url: Joi.string().uri()
    }),
    notes: Joi.string().trim().max(1000)
  })
};

// Input validation middleware
export const validateInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    next();
  };
};
