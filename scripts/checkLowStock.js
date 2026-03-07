import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import Notification from '../models/Notification.js';

dotenv.config();

const checkLowStockProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all products with low stock
    const products = await Product.find({
      trackInventory: true,
      status: 'active'
    });

    let notificationsCreated = 0;

    for (const product of products) {
      const threshold = product.inventory.lowStockThreshold || 10;
      const currentStock = product.inventory.quantity;

      if (currentStock <= threshold) {
        // Check if notification already exists for this product
        const existingNotification = await Notification.findOne({
          productId: product._id,
          type: 'product',
          isRead: false
        });

        if (!existingNotification) {
          await Notification.create({
            type: 'product',
            title: 'Low Stock Alert',
            message: `Product "${product.name}" is running low on stock. Current: ${currentStock}, Threshold: ${threshold}`,
            productId: product._id
          });
          notificationsCreated++;
          console.log(`Created notification for: ${product.name} (Stock: ${currentStock}/${threshold})`);
        } else {
          console.log(`Notification already exists for: ${product.name}`);
        }
      }
    }

    console.log(`\nTotal notifications created: ${notificationsCreated}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkLowStockProducts();
