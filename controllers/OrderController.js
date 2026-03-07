import Order from '../models/Order.js';
import Product from '../models/Product.js';
import FlashDeal from '../models/FlashDeal.js';
import NotificationController from './NotificationController.js';
import mongoose from 'mongoose';

class OrderController {
  // Get all orders with pagination and filtering
  static async getOrders(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        paymentStatus,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        dateFrom,
        dateTo,
        minTotal,
        maxTotal
      } = req.query;

      // Build query
      const query = {};
      
      if (search) {
        query.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { 'customer.email': { $regex: search, $options: 'i' } },
          { 'customer.firstName': { $regex: search, $options: 'i' } },
          { 'customer.lastName': { $regex: search, $options: 'i' } }
        ];
      }
      
      if (status) {
        query.status = status;
      }
      
      if (paymentStatus) {
        query.paymentStatus = paymentStatus;
      }
      
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }
      
      if (minTotal || maxTotal) {
        query.total = {};
        if (minTotal) query.total.$gte = parseFloat(minTotal);
        if (maxTotal) query.total.$lte = parseFloat(maxTotal);
      }

      // Build sort options
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query with pagination
      const orders = await Order.find(query)
        .populate('items.product', 'name sku images')
        .populate('user', 'firstName lastName email')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const total = await Order.countDocuments(query);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get single order by ID
  static async getOrder(req, res) {
    try {
      const order = await Order.findById(req.params.id)
        .populate('items.product', 'name sku images price');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.json({
        success: true,
        data: { order }
      });

    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create new order
  static async createOrder(req, res) {
    try {
      // Store old data for audit
      req.oldData = null;

      const orderData = req.body;
      console.log('Received order data:', JSON.stringify(orderData, null, 2));

      // Validate required fields
      if (!orderData.customer || !orderData.customer.email || !orderData.customer.firstName) {
        return res.status(400).json({
          success: false,
          message: 'Customer information is required'
        });
      }

      if (!orderData.items || orderData.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Order must contain at least one item'
        });
      }

      // Add user ID if authenticated
      if (req.user?.userId) {
        orderData.user = req.user.userId;
      }

      // Calculate item totals
      orderData.items = orderData.items.map(item => ({
        ...item,
        total: item.price * item.quantity
      }));
      
      console.log('Processed order data:', JSON.stringify(orderData, null, 2));

      // Generate order number if not provided
      if (!orderData.orderNumber) {
        const count = await Order.countDocuments();
        orderData.orderNumber = `ORD-${String(count + 1).padStart(6, '0')}`;
        console.log('Generated order number:', orderData.orderNumber);
      }

      // Check product availability and update inventory
      for (const item of orderData.items) {
        console.log('Looking for product with ID:', item.product);
        console.log('Item details:', item);
        console.log('Item variant:', item.variant);
        
        // Validate product ID format
        if (!mongoose.Types.ObjectId.isValid(item.product)) {
          console.log(`Invalid product ID format: ${item.product}`);
          return res.status(400).json({
            success: false,
            message: `Invalid product ID: ${item.product}`
          });
        }
        
        const product = await Product.findById(item.product);
        console.log('Found product:', product?.name);
        console.log('Product colors:', product?.colors);
        
        if (!product) {
          console.log(`Product ${item.product} not found`);
          return res.status(400).json({
            success: false,
            message: `Product not found`
          });
        }

        // Check if item has a selected color
        const selectedColorName = item.variant?.name === 'Color' ? item.variant.value : null;
        console.log('Selected color name:', selectedColorName);
        
        if (selectedColorName && product.colors && product.colors.length > 0) {
          const colorIndex = product.colors.findIndex(c => c.name === selectedColorName);
          console.log('Color index:', colorIndex);
          
          if (colorIndex !== -1) {
            const color = product.colors[colorIndex];
            console.log('Found color:', color.name, 'with inventory:', color.inventory);
            
            if (color.inventory < item.quantity) {
              return res.status(400).json({
                success: false,
                message: `Insufficient stock for ${product.name} in ${selectedColorName} color`
              });
            }
          }
        } else if (product.trackInventory && product.inventory.quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for product ${product.name}`
          });
        }

        // Check if product is part of an active flash deal
        const flashDeal = await FlashDeal.findOne({
          product: item.product,
          status: { $in: ['active', 'scheduled'] },
          'schedule.endDate': { $gte: new Date() }
        });

        if (flashDeal) {
          console.log('Flash deal found for product:', product.name);
          console.log('Current flash deal stock before:', flashDeal.inventory.currentStock);
          
          // Check flash deal stock
          if (flashDeal.inventory.currentStock < item.quantity) {
            return res.status(400).json({
              success: false,
              message: `Insufficient flash deal stock for ${product.name}`
            });
          }
          
          // Update flash deal inventory
          flashDeal.inventory.currentStock -= item.quantity;
          flashDeal.inventory.sold += item.quantity;
          
          console.log('Flash deal stock after:', flashDeal.inventory.currentStock);
          console.log('Flash deal sold:', flashDeal.inventory.sold);
          
          // Update status if out of stock
          if (flashDeal.inventory.currentStock === 0) {
            flashDeal.status = 'out_of_stock';
          }
          
          await flashDeal.save();
          console.log('Flash deal saved successfully');
        }

        // Update product inventory
        if (selectedColorName && product.colors && product.colors.length > 0) {
          const colorIndex = product.colors.findIndex(c => c.name === selectedColorName);
          if (colorIndex !== -1) {
            console.log(`Updating color inventory for ${selectedColorName} at index ${colorIndex}`);
            console.log(`Before: color inventory = ${product.colors[colorIndex].inventory}, total = ${product.inventory.quantity}`);
            
            await Product.updateOne(
              { _id: item.product },
              { 
                $inc: { 
                  [`colors.${colorIndex}.inventory`]: -item.quantity,
                  'inventory.quantity': -item.quantity
                }
              }
            );
            
            // Check for low stock after update
            const updatedProduct = await Product.findById(item.product);
            const threshold = updatedProduct.inventory.lowStockThreshold || 10;
            if (updatedProduct.inventory.quantity <= threshold) {
              const Notification = (await import('../models/Notification.js')).default;
              const existingNotification = await Notification.findOne({
                productId: updatedProduct._id,
                type: 'product',
                isRead: false
              });
              
              if (!existingNotification) {
                await NotificationController.createNotification(
                  'product',
                  'Low Stock Alert',
                  `Product "${updatedProduct.name}" is running low on stock. Current: ${updatedProduct.inventory.quantity}, Threshold: ${threshold}`,
                  null,
                  updatedProduct._id
                );
              }
            }
            
            console.log(`After update: decreased color inventory by ${item.quantity}`);
            console.log('Color inventory updated for:', product.name, '-', selectedColorName);
          } else {
            // Color not found, just update total inventory
            if (product.trackInventory) {
              await Product.updateOne(
                { _id: item.product },
                { $inc: { 'inventory.quantity': -item.quantity } }
              );
              
              // Check for low stock
              const updatedProduct = await Product.findById(item.product);
              const threshold = updatedProduct.inventory.lowStockThreshold || 10;
              if (updatedProduct.inventory.quantity <= threshold) {
                const Notification = (await import('../models/Notification.js')).default;
                const existingNotification = await Notification.findOne({
                  productId: updatedProduct._id,
                  type: 'product',
                  isRead: false
                });
                
                if (!existingNotification) {
                  await NotificationController.createNotification(
                    'product',
                    'Low Stock Alert',
                    `Product "${updatedProduct.name}" is running low on stock. Current: ${updatedProduct.inventory.quantity}, Threshold: ${threshold}`,
                    null,
                    updatedProduct._id
                  );
                }
              }
              
              console.log('Product inventory updated for:', product.name);
            }
          }
        } else if (product.trackInventory) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { 'inventory.quantity': -item.quantity } }
          );
          
          // Check for low stock
          const updatedProduct = await Product.findById(item.product);
          const threshold = updatedProduct.inventory.lowStockThreshold || 10;
          if (updatedProduct.inventory.quantity <= threshold) {
            const Notification = (await import('../models/Notification.js')).default;
            const existingNotification = await Notification.findOne({
              productId: updatedProduct._id,
              type: 'product',
              isRead: false
            });
            
            if (!existingNotification) {
              await NotificationController.createNotification(
                'product',
                'Low Stock Alert',
                `Product "${updatedProduct.name}" is running low on stock. Current: ${updatedProduct.inventory.quantity}, Threshold: ${threshold}`,
                null,
                updatedProduct._id
              );
            }
          }
          
          console.log('Product inventory updated for:', product.name);
        }
      }

      const order = new Order(orderData);
      console.log('About to save order:', order);
      
      await order.save();
      console.log('Order saved successfully:', order);

      // Populate products for response
      await order.populate('items.product', 'name sku images');
      console.log('Order populated successfully');

      // Create notification for new order
      await NotificationController.createNotification(
        'order',
        'New Order Received',
        `Order ${order.orderNumber} from ${orderData.customer.firstName} ${orderData.customer.lastName} - $${order.total.toFixed(2)}`,
        order._id
      );

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { order }
      });

    } catch (error) {
      console.error('Create order error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        errors: error.errors
      });
      
      // Send more detailed error for validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error: ' + messages.join(', '),
          errors: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error: ' + error.message
      });
    }
  }

  // Update order
  static async updateOrder(req, res) {
    try {
      // Store old data for audit
      const oldOrder = await Order.findById(req.params.id);
      req.oldData = oldOrder?.toObject();

      const order = await Order.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('items.product', 'name sku images');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.json({
        success: true,
        message: 'Order updated successfully',
        data: { order }
      });

    } catch (error) {
      console.error('Update order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete order
  static async deleteOrder(req, res) {
    try {
      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Store old data for audit
      req.oldData = order.toObject();

      // Restore inventory if order is being deleted
      if (order.status !== 'cancelled') {
        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (product && product.trackInventory) {
            product.inventory.quantity += item.quantity;
            await product.save();
          }
          
          // Restore flash deal inventory if applicable
          const flashDeal = await FlashDeal.findOne({ product: item.product });
          if (flashDeal) {
            flashDeal.inventory.currentStock += item.quantity;
            flashDeal.inventory.sold -= item.quantity;
            
            // Update status if was out of stock
            if (flashDeal.status === 'out_of_stock' && flashDeal.inventory.currentStock > 0) {
              flashDeal.updateStatus();
            }
            
            await flashDeal.save();
          }
        }
      }

      await Order.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'Order deleted successfully'
      });

    } catch (error) {
      console.error('Delete order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update order status
  static async updateOrderStatus(req, res) {
    try {
      const { status } = req.body;

      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Store old data for audit
      req.oldData = order.toObject();

      // If order is being cancelled, return items to stock
      if (status === 'cancelled' && order.status !== 'cancelled') {
        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (product && product.trackInventory) {
            await Product.updateOne(
              { _id: item.product },
              { $inc: { 'inventory.quantity': item.quantity } }
            );
          }
          
          // Restore flash deal inventory if applicable
          const flashDeal = await FlashDeal.findOne({ product: item.product });
          if (flashDeal) {
            flashDeal.inventory.currentStock += item.quantity;
            flashDeal.inventory.sold -= item.quantity;
            
            // Update status if was out of stock
            if (flashDeal.status === 'out_of_stock' && flashDeal.inventory.currentStock > 0) {
              flashDeal.updateStatus();
            }
            
            await flashDeal.save();
          }
        }
      }

      order.status = status;
      
      // Update payment status to 'paid' when order is confirmed, shipped, or delivered
      if (['confirmed', 'shipped', 'delivered'].includes(status) && order.paymentStatus === 'pending') {
        order.paymentStatus = 'paid';
      }
      
      await order.save();

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: { order }
      });

    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update payment status
  static async updatePaymentStatus(req, res) {
    try {
      const { paymentStatus, transactionId } = req.body;

      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Store old data for audit
      req.oldData = order.toObject();

      order.paymentStatus = paymentStatus;
      if (transactionId) order.transactionId = transactionId;
      await order.save();

      res.json({
        success: true,
        message: 'Payment status updated successfully',
        data: { order }
      });

    } catch (error) {
      console.error('Update payment status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Add tracking information
  static async addTracking(req, res) {
    try {
      const { number, carrier, url } = req.body;

      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Store old data for audit
      req.oldData = order.toObject();

      order.tracking = { number, carrier, url };
      order.status = 'shipped';
      await order.save();

      res.json({
        success: true,
        message: 'Tracking information added successfully',
        data: { order }
      });

    } catch (error) {
      console.error('Add tracking error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get order statistics
  static async getOrderStats(req, res) {
    try {
      const stats = await Order.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            processingOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
            },
            shippedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] }
            },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            paidOrders: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
            },
            unpaidOrders: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        pendingOrders: 0,
        processingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        paidOrders: 0,
        unpaidOrders: 0
      };

      res.json({
        success: true,
        data: { stats: result }
      });

    } catch (error) {
      console.error('Get order stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Export orders to CSV
  static async exportOrders(req, res) {
    try {
      const orders = await Order.find()
        .populate('items.product', 'name sku')
        .populate('user', 'firstName lastName email')
        .sort({ createdAt: -1 });

      const csv = [
        ['Order Number', 'Customer Name', 'Email', 'Date', 'Status', 'Payment Status', 'Total', 'Items'].join(',')
      ];

      orders.forEach(order => {
        const customerName = order.user 
          ? `${order.user.firstName} ${order.user.lastName}`
          : `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim();
        const email = order.user?.email || order.customer?.email || 'N/A';
        const items = order.items.map(item => `${item.product?.name || 'Product'} (x${item.quantity})`).join('; ');
        
        csv.push([
          `"${order.orderNumber}"`,
          `"${customerName}"`,
          `"${email}"`,
          `"${new Date(order.createdAt).toLocaleDateString()}"`,
          `"${order.status}"`,
          `"${order.paymentStatus}"`,
          `"$${order.total.toFixed(2)}"`,
          `"${items}"`
        ].join(','));
      });

      const filename = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv.join('\n'));
    } catch (error) {
      console.error('Export orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export orders'
      });
    }
  }

  // Get recent orders
  static async getRecentOrders(req, res) {
    try {
      const { limit = 10 } = req.query;

      const orders = await Order.find()
        .populate('items.product', 'name sku images')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: { orders }
      });

    } catch (error) {
      console.error('Get recent orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user's orders
  static async getMyOrders(req, res) {
    try {
      const userId = req.user.userId;
      const orders = await Order.find({ user: userId })
        .populate('items.product', 'name sku images')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: { orders }
      });
    } catch (error) {
      console.error('Get my orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Track order by order number and email
  static async trackOrder(req, res) {
    try {
      const { orderNumber, email } = req.body;

      if (!orderNumber || !email) {
        return res.status(400).json({
          success: false,
          message: 'Order number and email are required'
        });
      }

      // Find order by order number and customer email
      const order = await Order.findOne({
        orderNumber: orderNumber.replace('#', ''), // Remove # if present
        'customer.email': email.toLowerCase()
      }).populate('items.product');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found. Please check your order number and email.'
        });
      }

      // Calculate tracking progress based on order status
      const getStatusStage = (status) => {
        switch (status) {
          case 'pending': return 1; // 25%
          case 'confirmed': return 2; // 50%
          case 'processing': return 2; // 50%
          case 'shipped': return 3; // 75%
          case 'delivered': return 4; // 100%
          default: return 1;
        }
      };

      // Format tracking data
      const trackingData = {
        orderNumber: order.orderNumber,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        orderDate: order.createdAt,
        status: order.status,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 5 days from now
        currentStage: getStatusStage(order.status),
        items: order.items.map(item => ({
          name: item.product?.name || 'Product',
          quantity: item.quantity,
          price: item.price
        })),
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        total: order.total
      };

      res.json({
        success: true,
        data: trackingData
      });

    } catch (error) {
      console.error('Track order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Refund order
  static async refundOrder(req, res) {
    try {
      const { refundType, returnToStock, verificationCode } = req.body;
      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Verify the code against .env
      const correctCode = process.env.REFUND_VERIFICATION_CODE;
      
      if (!verificationCode) {
        return res.status(400).json({
          success: false,
          message: 'Verification code is required'
        });
      }

      if (verificationCode !== correctCode) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code'
        });
      }

      // Return items to stock if requested
      if (returnToStock) {
        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (product && product.trackInventory) {
            // Check if item has a selected color
            const selectedColorName = item.variant?.name === 'Color' ? item.variant.value : null;
            
            if (selectedColorName && product.colors && product.colors.length > 0) {
              const colorIndex = product.colors.findIndex(c => c.name === selectedColorName);
              if (colorIndex !== -1) {
                // Update both color inventory and total inventory
                await Product.updateOne(
                  { _id: item.product },
                  { 
                    $inc: { 
                      [`colors.${colorIndex}.inventory`]: item.quantity,
                      'inventory.quantity': item.quantity
                    }
                  }
                );
              } else {
                // Color not found, just update total inventory
                await Product.updateOne(
                  { _id: item.product },
                  { $inc: { 'inventory.quantity': item.quantity } }
                );
              }
            } else {
              // No color variant, update total inventory only
              await Product.updateOne(
                { _id: item.product },
                { $inc: { 'inventory.quantity': item.quantity } }
              );
            }
          }
          
          // Restore flash deal inventory if applicable
          const flashDeal = await FlashDeal.findOne({ product: item.product });
          if (flashDeal) {
            flashDeal.inventory.currentStock += item.quantity;
            flashDeal.inventory.sold -= item.quantity;
            
            // Update status if was out of stock
            if (flashDeal.status === 'out_of_stock' && flashDeal.inventory.currentStock > 0) {
              flashDeal.updateStatus();
            }
            
            await flashDeal.save();
          }
        }
      }

      // Update order status
      order.status = 'refunded';
      order.refundInfo = {
        refundType,
        returnedToStock: returnToStock,
        refundedAt: new Date()
      };
      await order.save();

      res.json({
        success: true,
        message: 'Order refunded successfully',
        data: { order }
      });

    } catch (error) {
      console.error('Refund order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Generate refund verification code
  static async generateRefundCode(req, res) {
    try {
      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Just confirm the order exists, don't send the code
      res.json({
        success: true,
        message: 'Ready for verification'
      });

    } catch (error) {
      console.error('Generate refund code error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default OrderController;
