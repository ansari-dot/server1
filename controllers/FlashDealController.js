import FlashDeal from '../models/FlashDeal.js';
import Product from '../models/Product.js';
import { formatFlashDealForFrontend } from '../utils/flashDealHelper.js';

class FlashDealController {
  // Get all flash deals
  static async getFlashDeals(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      
      // Build query
      const query = {};
      if (status) {
        query.status = status;
      }
      
      const flashDeals = await FlashDeal.find(query)
        .populate('product', 'name sku price images mainCategory')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await FlashDeal.countDocuments(query);

      // Calculate additional fields for frontend
      const flashDealsWithStats = flashDeals.map(deal => {
        const product = deal.product;
        const originalPrice = product?.price || 0;
        const discountAmount = deal.discount.type === 'percentage' 
          ? (originalPrice * deal.discount.value) / 100 
          : deal.discount.value;
        const finalPrice = originalPrice - discountAmount;
        const discountPercentage = originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 0;
        
        // Calculate sold percentage
        const soldPercent = deal.inventory.originalStock > 0 
          ? Math.round((deal.inventory.sold / deal.inventory.originalStock) * 100)
          : 0;
        
        // Update and get status
        const currentStatus = deal.updateStatus();
        const timeLeft = deal.getTimeLeft();
        
        // Format for frontend
        return {
          id: deal._id,
          category: product?.mainCategory || 'General',
          title: deal.name,
          img: product?.images?.[0]?.url || '/placeholder.jpg',
          price: finalPrice,
          oldPrice: originalPrice,
          discount: discountPercentage,
          available: deal.inventory.currentStock,
          soldPercent: soldPercent,
          targetDate: deal.schedule.endDate,
          status: currentStatus,
          timeLeft: timeLeft,
          settings: deal.settings,
          inventory: deal.inventory,
          performance: deal.performance,
          product: product,
          schedule: deal.schedule
        };
      });

      res.json({
        success: true,
        data: {
          flashDeals: flashDealsWithStats,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get flash deals error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get single flash deal
  static async getFlashDeal(req, res) {
    try {
      const flashDeal = await FlashDeal.findById(req.params.id)
        .populate('product', 'name sku price images mainCategory');

      if (!flashDeal) {
        return res.status(404).json({
          success: false,
          message: 'Flash deal not found'
        });
      }

      // Calculate additional fields
      const dealObj = flashDeal.toObject();
      const product = flashDeal.product;
      const originalPrice = product.price;
      const discountAmount = flashDeal.discount.type === 'percentage' 
        ? (originalPrice * flashDeal.discount.value) / 100 
        : flashDeal.discount.value;
      const finalPrice = originalPrice - discountAmount;
      const discountPercentage = Math.round((discountAmount / originalPrice) * 100);
      const soldPercent = flashDeal.inventory.originalStock > 0 
        ? Math.round((flashDeal.inventory.sold / flashDeal.inventory.originalStock) * 100)
        : 0;

      const formattedDeal = {
        id: dealObj._id,
        category: product.mainCategory || 'General',
        title: flashDeal.name,
        img: product.images?.[0]?.url || '/placeholder.jpg',
        price: finalPrice,
        oldPrice: originalPrice,
        discount: discountPercentage,
        available: flashDeal.inventory.currentStock,
        soldPercent: soldPercent,
        targetDate: flashDeal.schedule.endDate,
        status: flashDeal.updateStatus(),
        timeLeft: flashDeal.getTimeLeft(),
        settings: flashDeal.settings,
        inventory: flashDeal.inventory,
        performance: flashDeal.performance,
        product: product,
        schedule: flashDeal.schedule
      };

      res.json({
        success: true,
        data: { flashDeal: formattedDeal }
      });

    } catch (error) {
      console.error('Get flash deal error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create new flash deal
  static async createFlashDeal(req, res) {
    try {
      // Map productId to product for the model
      const dealData = {
        ...req.body,
        product: req.body.productId
      };
      
      delete dealData.productId;
      
      const flashDeal = new FlashDeal(dealData);
      await flashDeal.save();

      // Populate for response
      await flashDeal.populate('product', 'name sku price images mainCategory');

      // Use helper function to format for frontend
      const formattedDeal = formatFlashDealForFrontend(flashDeal, flashDeal.product);

      res.status(201).json({
        success: true,
        message: 'Flash deal created successfully',
        data: { flashDeal: formattedDeal }
      });

    } catch (error) {
      console.error('Create flash deal error:', error);
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Flash deal for this product already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update flash deal
  static async updateFlashDeal(req, res) {
    try {
      // Map productId to product for the model
      const dealData = {
        ...req.body,
      };
      
      if (req.body.productId) {
        dealData.product = req.body.productId;
        delete dealData.productId;
      }
      
      const flashDeal = await FlashDeal.findByIdAndUpdate(
        req.params.id,
        dealData,
        { new: true, runValidators: true }
      ).populate('product', 'name sku price images mainCategory');

      if (!flashDeal) {
        return res.status(404).json({
          success: false,
          message: 'Flash deal not found'
        });
      }

      // Calculate additional fields
      const dealObj = flashDeal.toObject();
      const product = flashDeal.product;
      const originalPrice = product.price;
      const discountAmount = flashDeal.discount.type === 'percentage' 
        ? (originalPrice * flashDeal.discount.value) / 100 
        : flashDeal.discount.value;
      const finalPrice = originalPrice - discountAmount;
      const discountPercentage = Math.round((discountAmount / originalPrice) * 100);
      const soldPercent = flashDeal.inventory.originalStock > 0 
        ? Math.round((flashDeal.inventory.sold / flashDeal.inventory.originalStock) * 100)
        : 0;

      const formattedDeal = {
        id: dealObj._id,
        category: product.mainCategory || 'General',
        title: flashDeal.name,
        img: product.images?.[0]?.url || '/placeholder.jpg',
        price: finalPrice,
        oldPrice: originalPrice,
        discount: discountPercentage,
        available: flashDeal.inventory.currentStock,
        soldPercent: soldPercent,
        targetDate: flashDeal.schedule.endDate,
        status: flashDeal.updateStatus(),
        timeLeft: flashDeal.getTimeLeft(),
        settings: flashDeal.settings,
        inventory: flashDeal.inventory,
        performance: flashDeal.performance,
        product: product,
        schedule: flashDeal.schedule
      };

      res.json({
        success: true,
        message: 'Flash deal updated successfully',
        data: { flashDeal: formattedDeal }
      });

    } catch (error) {
      console.error('Update flash deal error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete flash deal
  static async deleteFlashDeal(req, res) {
    try {
      const flashDeal = await FlashDeal.findByIdAndDelete(req.params.id);

      if (!flashDeal) {
        return res.status(404).json({
          success: false,
          message: 'Flash deal not found'
        });
      }

      res.json({
        success: true,
        message: 'Flash deal deleted successfully'
      });

    } catch (error) {
      console.error('Delete flash deal error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get active flash deals for client side
  static async getActiveFlashDeals(req, res) {
    try {
      console.log('=== GET ACTIVE FLASH DEALS ===');
      
      // Get ALL flash deals for debugging (we'll filter in frontend)
      const flashDeals = await FlashDeal.find({})
        .populate('product', 'name sku price images mainCategory')
        .sort({ 'schedule.endDate': 1 });

      console.log('Found total flash deals:', flashDeals.length);
      
      // Format for frontend with error handling
      const formattedDeals = [];
      
      for (const deal of flashDeals) {
        console.log('Processing deal:', deal.name, 'Status:', deal.status);
        
        try {
          let product = deal.product;
          let originalPrice = 0;
          let categoryName = 'General';
          let productName = deal.name;
          let imageUrl = '/placeholder.jpg';
          
          if (product) {
            originalPrice = product.price || 0;
            categoryName = product.mainCategory || 'General';
            productName = product.name || deal.name;
            imageUrl = product.images?.[0]?.url || '/placeholder.jpg';
            console.log('Product found:', product.name, 'Price:', originalPrice);
          } else {
            console.log('WARNING: Deal has no product, using defaults');
          }
          
          const discountAmount = deal.discount?.type === 'percentage' 
            ? (originalPrice * (deal.discount?.value || 0)) / 100 
            : deal.discount?.value || 0;
          const finalPrice = originalPrice - discountAmount;
          const discountPercentage = originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 0;
          const soldPercent = deal.inventory?.originalStock > 0 
            ? Math.round(((deal.inventory.originalStock - deal.inventory.currentStock) / deal.inventory.originalStock) * 100)
            : 0;

          const formattedDeal = {
            id: deal._id,
            category: categoryName,
            title: deal.name,
            img: imageUrl,
            price: finalPrice,
            oldPrice: originalPrice,
            discount: discountPercentage,
            available: deal.inventory?.currentStock || 0,
            soldPercent: soldPercent,
            targetDate: deal.schedule?.endDate,
            status: deal.status,
            timeLeft: deal.getTimeLeft ? deal.getTimeLeft() : null,
            settings: deal.settings || {},
            inventory: deal.inventory || {},
            performance: deal.performance || {},
            product: product || { _id: deal.product },
            schedule: deal.schedule
          };
          
          formattedDeals.push(formattedDeal);
          console.log('Successfully formatted deal:', deal.name, 'Final price:', finalPrice);
          
        } catch (dealError) {
          console.error('Error formatting deal:', deal.name, dealError);
          continue;
        }
      }

      console.log('Final formatted deals:', formattedDeals.length);

      res.json({
        success: true,
        data: { flashDeals: formattedDeals }
      });

    } catch (error) {
      console.error('=== GET ACTIVE FLASH DEALS ERROR ===');
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get available products for flash deals
  static async getAvailableProducts(req, res) {
    try {
      const { search, category, page = 1, limit = 100, includeAll } = req.query;
      
      console.log('=== GET AVAILABLE PRODUCTS ===');
      
      // Build query
      const query = {};
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { slug: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (category && !search) {
        query.$or = [
          { mainCategory: { $regex: category, $options: 'i' } },
          { subCategory: { $regex: category, $options: 'i' } }
        ];
      }

      // Only exclude products with flash deals if includeAll is not set
      if (!includeAll) {
        const existingFlashDeals = await FlashDeal.find({}, 'product');
        const productIds = existingFlashDeals.map(deal => deal.product.toString());
        console.log('Products with flash deals:', productIds);
        
        if (productIds.length > 0) {
          query._id = { $nin: productIds };
        }
      }

      console.log('Query:', JSON.stringify(query, null, 2));

      const products = await Product.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('name slug sku price mainCategory subCategory brand images status inventory');

      console.log('Found available products:', products.length);

      const total = await Product.countDocuments(query);

      res.json({
        success: true,
        data: {
          products,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get available products error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

export default FlashDealController;
