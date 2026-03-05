import User from '../models/User.js';
import Newsletter from '../models/Newsletter.js';
import jwt from 'jsonwebtoken';

class AuthController {
  static async register(req, res) {
    try {
      const { name, email, password, phone, address } = req.body;

      console.log('Registration request received:', { name, email, phone, address });

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      if (!address || !address.street || !address.city || !address.state || !address.country) {
        console.log('Address validation failed:', address);
        return res.status(400).json({
          success: false,
          message: 'Complete address (street, city, state, country) is required'
        });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }

      const user = new User({
        name,
        email,
        password,
        phone,
        addresses: [address]
      });
      
      console.log('Saving user with addresses:', user.addresses);
      await user.save();
      console.log('User saved successfully with addresses:', user.addresses);

      // Auto-subscribe to newsletter
      try {
        const existingSubscription = await Newsletter.findOne({ email });
        if (!existingSubscription) {
          await Newsletter.create({ email, name, source: 'registration' });
        }
      } catch (error) {
        console.log('Newsletter subscription failed:', error);
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone
          }
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email, isActive: true });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }

  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId)
        .select('-password')
        .populate('coupons.couponId');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile'
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const { name, phone, addresses } = req.body;
      
      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { name, phone, addresses },
        { new: true, runValidators: true }
      ).select('-password');

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  static async getUserCoupons(req, res) {
    try {
      const user = await User.findById(req.user.userId)
        .populate('coupons.couponId');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: { coupons: user.coupons }
      });
    } catch (error) {
      console.error('Get user coupons error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get coupons'
      });
    }
  }
}

export default AuthController;
