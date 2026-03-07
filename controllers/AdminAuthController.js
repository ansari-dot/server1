import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  static async updateProfile(req, res) {
    try {
      const { firstName, lastName, email } = req.body;
      const admin = await Admin.findById(req.admin._id);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      if (email && email !== admin.email) {
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use'
          });
        }
        admin.email = email;
      }

      if (firstName) admin.firstName = firstName;
      if (lastName) admin.lastName = lastName;

      if (req.file) {
        if (admin.profileImage) {
          const oldImagePath = path.join(__dirname, '..', admin.profileImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        admin.profileImage = `/uploads/profiles/${req.file.filename}`;
      }

      await admin.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { admin: admin.toPublicJSON() }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }

      const admin = await Admin.findById(req.admin._id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      const isMatch = await admin.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      admin.password = newPassword;
      await admin.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  }
}

export default AdminAuthController;
