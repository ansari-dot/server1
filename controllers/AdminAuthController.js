import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';

class AdminAuthController {
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const admin = await Admin.findOne({ email, isActive: true });
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      admin.lastLogin = new Date();
      await admin.save();

      const token = jwt.sign(
        { 
          id: admin._id,
          email: admin.email,
          role: admin.role 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      const isProduction = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
      
      res.cookie('adminToken', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          admin: admin.toPublicJSON()
        }
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }

  static async getProfile(req, res) {
    try {
      const admin = await Admin.findById(req.admin._id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      res.json({
        success: true,
        data: { admin: admin.toPublicJSON() }
      });
    } catch (error) {
      console.error('Get admin profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile'
      });
    }
  }
}

export default AdminAuthController;
