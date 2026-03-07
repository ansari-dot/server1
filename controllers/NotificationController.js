import Notification from '../models/Notification.js';

class NotificationController {
  static async getNotifications(req, res) {
    try {
      const notifications = await Notification.find()
        .populate('orderId', 'orderNumber total')
        .populate('productId', 'name sku inventory')
        .sort({ createdAt: -1 })
        .limit(20);

      const unreadCount = await Notification.countDocuments({ isRead: false });

      res.json({
        success: true,
        data: {
          notifications,
          unreadCount
        }
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }
  }

  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      await Notification.findByIdAndUpdate(id, { isRead: true });

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
  }

  static async markAllAsRead(req, res) {
    try {
      await Notification.updateMany({ isRead: false }, { isRead: true });

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read'
      });
    }
  }

  static async createNotification(type, title, message, orderId = null, productId = null) {
    try {
      await Notification.create({
        type,
        title,
        message,
        orderId,
        productId
      });
    } catch (error) {
      console.error('Create notification error:', error);
    }
  }
}

export default NotificationController;
