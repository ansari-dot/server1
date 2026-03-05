import Newsletter from '../models/Newsletter.js';
import User from '../models/User.js';

class NewsletterController {
  static async subscribe(req, res) {
    try {
      const { email, name, source = 'footer' } = req.body;

      const existing = await Newsletter.findOne({ email });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'This email is already subscribed to our newsletter'
        });
      }

      const subscription = new Newsletter({ email, name, source });
      await subscription.save();

      res.json({
        success: true,
        message: 'Successfully subscribed to newsletter'
      });
    } catch (error) {
      console.error('Subscribe error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to subscribe'
      });
    }
  }

  static async checkSubscription(req, res) {
    try {
      const { email } = req.query;
      const subscription = await Newsletter.findOne({ email });
      
      res.json({
        success: true,
        data: { isSubscribed: !!subscription }
      });
    } catch (error) {
      console.error('Check subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check subscription'
      });
    }
  }

  static async getAll(req, res) {
    try {
      const { page = 1, limit = 50, search } = req.query;
      
      // Fetch newsletter subscriptions
      const newsletterQuery = search ? { email: { $regex: search, $options: 'i' } } : {};
      const newsletters = await Newsletter.find(newsletterQuery).lean();
      
      // Fetch registered users
      const userQuery = search ? { email: { $regex: search, $options: 'i' } } : {};
      const users = await User.find(userQuery).select('email name createdAt').lean();
      
      // Combine and deduplicate by email
      const emailMap = new Map();
      
      newsletters.forEach(sub => {
        emailMap.set(sub.email, {
          _id: sub._id,
          email: sub.email,
          name: sub.name,
          source: sub.source,
          isActive: sub.isActive,
          createdAt: sub.createdAt
        });
      });
      
      users.forEach(user => {
        if (!emailMap.has(user.email)) {
          emailMap.set(user.email, {
            _id: user._id,
            email: user.email,
            name: user.name,
            source: 'registration',
            isActive: true,
            createdAt: user.createdAt
          });
        }
      });
      
      // Convert to array and sort by date
      const allSubscriptions = Array.from(emailMap.values())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Paginate
      const total = allSubscriptions.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedSubscriptions = allSubscriptions.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          subscriptions: paginatedSubscriptions,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
    } catch (error) {
      console.error('Get subscriptions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get subscriptions'
      });
    }
  }

  static async exportToExcel(req, res) {
    try {
      // Fetch newsletter subscriptions
      const newsletters = await Newsletter.find().lean();
      
      // Fetch registered users
      const users = await User.find().select('email name createdAt').lean();
      
      // Combine and deduplicate by email
      const emailMap = new Map();
      
      newsletters.forEach(sub => {
        emailMap.set(sub.email, {
          email: sub.email,
          name: sub.name || 'N/A',
          source: sub.source,
          status: sub.isActive ? 'Active' : 'Inactive',
          subscribedDate: new Date(sub.createdAt).toLocaleDateString()
        });
      });
      
      users.forEach(user => {
        if (!emailMap.has(user.email)) {
          emailMap.set(user.email, {
            email: user.email,
            name: user.name || 'N/A',
            source: 'registration',
            status: 'Active',
            subscribedDate: new Date(user.createdAt).toLocaleDateString()
          });
        }
      });
      
      const data = Array.from(emailMap.values())
        .sort((a, b) => new Date(b.subscribedDate) - new Date(a.subscribedDate))
        .map(item => ({
          Email: item.email,
          Name: item.name,
          Source: item.source,
          Status: item.status,
          'Subscribed Date': item.subscribedDate
        }));

      res.json({
        success: true,
        data: { subscriptions: data }
      });
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export subscriptions'
      });
    }
  }

  static async delete(req, res) {
    try {
      await Newsletter.findByIdAndDelete(req.params.id);
      res.json({
        success: true,
        message: 'Subscription deleted'
      });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete subscription'
      });
    }
  }
}

export default NewsletterController;
