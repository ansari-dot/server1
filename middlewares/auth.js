import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import AuditLog from '../models/AuditLog.js';

// Generate JWT token
export const generateToken = (admin) => {
  return jwt.sign(
    { 
      id: admin._id, 
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Set authentication cookie
export const setAuthCookie = (res, token) => {
  res.cookie('adminToken', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  });
};

// Clear authentication cookie
export const clearAuthCookie = (res) => {
  res.cookie('adminToken', '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    expires: new Date(0),
    path: '/'
  });
};

// Authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    // Check for token in cookie or Authorization header
    let token = req.cookies.adminToken;
    
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get admin from database
    const admin = await Admin.findById(decoded.id);
    
    if (!admin || !admin.isActive) {
      clearAuthCookie(res);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token or admin account deactivated.' 
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Attach admin to request
    req.admin = admin;
    req.adminPermissions = admin.permissions;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      clearAuthCookie(res);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      clearAuthCookie(res);
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during authentication.' 
    });
  }
};

// Permission check middleware
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.adminPermissions.includes(permission)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions.' 
      });
    }
    next();
  };
};

// Multiple permissions check (requires at least one)
export const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    const hasPermission = permissions.some(permission => 
      req.adminPermissions.includes(permission)
    );
    
    if (!hasPermission) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions.' 
      });
    }
    next();
  };
};

// Role check middleware
export const requireRole = (role) => {
  return (req, res, next) => {
    if (req.admin.role !== role && req.admin.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient role privileges.' 
      });
    }
    next();
  };
};

// Audit logging middleware
export const auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log the action if request was successful
      if (res.statusCode >= 200 && res.statusCode < 300 && req.admin) {
        AuditLog.createLog({
          admin: req.admin._id,
          action,
          resource,
          resourceId: req.params.id || req.body._id,
          details: `${action} on ${resource}`,
          changes: {
            before: req.oldData || null,
            after: req.body || null
          },
          metadata: {
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            severity: getSeverity(action)
          }
        }).catch(err => console.error('Audit log error:', err));
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Determine severity based on action
function getSeverity(action) {
  const criticalActions = ['delete'];
  const highActions = ['create', 'security.update', 'currency.update'];
  const mediumActions = ['update'];
  
  if (criticalActions.some(critical => action.includes(critical))) return 'critical';
  if (highActions.some(high => action.includes(high))) return 'high';
  if (mediumActions.some(medium => action.includes(medium))) return 'medium';
  return 'low';
}

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies.adminToken;
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const admin = await Admin.findById(decoded.id);
      
      if (admin && admin.isActive) {
        req.admin = admin;
        req.adminPermissions = admin.permissions;
      }
    }
    
    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};
