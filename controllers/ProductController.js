import Product from '../models/Product.js';
import fs from 'fs';
import path from 'path';

class ProductController {
  static async getProducts(req, res) {
    try {
      const { page = 1, limit = 15, search, category, brand, color, status, minPrice, maxPrice } = req.query;
      const sortBy = req.query.sortBy;
      const sortOrder = req.query.sortOrder;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const query = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ];
      }
      if (category) {
        query.$or = [
          { mainCategory: { $regex: category, $options: 'i' } },
          { subCategory: { $regex: category, $options: 'i' } }
        ];
      }
      if (req.query.subcategory) {
        const subcategory = req.query.subcategory;
        if (category) {
          query.$and = [
            { $or: [
              { mainCategory: { $regex: category, $options: 'i' } },
              { subCategory: { $regex: category, $options: 'i' } }
            ]},
            { subCategory: { $regex: subcategory, $options: 'i' } }
          ];
        } else {
          query.subCategory = { $regex: subcategory, $options: 'i' };
        }
      }
      if (brand) query.brand = { $regex: brand, $options: 'i' };
      if (color) query['colors.name'] = { $regex: color, $options: 'i' };
      if (status) query.status = status;
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
      }

      const sort = {};
      if (sortBy) {
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      } else {
        sort.price = 1;
      }

      const products = await Product.find(query).sort(sort).limit(limitNum).skip(skip).exec();
      const total = await Product.countDocuments(query);

      res.json({
        success: true,
        data: { products, pagination: { current: pageNum, pages: Math.ceil(total / limitNum), total, limit: limitNum } }
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async getProduct(req, res) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const FlashDeal = (await import('../models/FlashDeal.js')).default;
      const flashDeal = await FlashDeal.findOne({ product: product._id });
      let productData = product.toObject();

      if (flashDeal) {
        const now = new Date();
        const endDate = new Date(flashDeal.schedule.endDate);
        const isActive = (flashDeal.status === 'active' || flashDeal.status === 'scheduled') &&
                        now <= endDate &&
                        flashDeal.inventory.currentStock > 0;
        
        const originalPrice = product.price;
        const finalPrice = flashDeal.calculateDealPrice(originalPrice);
        const discountAmount = originalPrice - finalPrice;
        const discountPercentage = Math.round((discountAmount / originalPrice) * 100);
        const soldPercent = flashDeal.inventory.originalStock > 0
          ? Math.round((flashDeal.inventory.sold / flashDeal.inventory.originalStock) * 100)
          : 0;

        productData.flashDeal = {
          active: isActive,
          price: finalPrice,
          originalPrice: originalPrice,
          discount: flashDeal.discount,
          discountPercentage: discountPercentage,
          endDate: flashDeal.schedule.endDate,
          currentStock: flashDeal.inventory.currentStock,
          originalStock: flashDeal.inventory.originalStock,
          sold: flashDeal.inventory.sold,
          soldPercent: soldPercent
        };
      }

      res.json({ success: true, data: { product: productData } });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async createProduct(req, res) {
    try {
      req.oldData = null;
      const product = new Product(req.body);
      await product.save();
      res.status(201).json({ success: true, message: 'Product created successfully', data: { product } });
    } catch (error) {
      console.error('Create product error:', error);
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({ success: false, message: `${field} already exists` });
      }
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async updateProduct(req, res) {
    try {
      const oldProduct = await Product.findById(req.params.id);
      req.oldData = oldProduct?.toObject();
      if (!oldProduct) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      if (req.body.images && Array.isArray(req.body.images)) {
        const oldImages = oldProduct.images || [];
        const newImages = req.body.images;
        const removedImages = oldImages.filter(oldImg => 
          !newImages.some(newImg => 
            (newImg._id && newImg._id.toString() === oldImg._id.toString()) ||
            (newImg.url === oldImg.url)
          )
        );
        removedImages.forEach(image => {
          // Only delete if it's not an external URL
          if (!image.url.startsWith('http')) {
            const filePath = path.join(process.cwd(), image.url);
            if (fs.existsSync(filePath)) {
              try { fs.unlinkSync(filePath); } catch (err) {}
            }
          }
        });
      }

      const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      res.json({ success: true, message: 'Product updated successfully', data: { product } });
    } catch (error) {
      console.error('Update product error:', error);
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({ success: false, message: `${field} already exists` });
      }
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async deleteProduct(req, res) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      req.oldData = product.toObject();
      product.images.forEach(image => {
        // Only delete if it's not an external URL
        if (!image.url.startsWith('http')) {
          const filePath = path.join(process.cwd(), image.url);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      });
      await Product.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async uploadImages(req, res) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No images uploaded' });
      }
      const newImages = req.files.map((file, index) => ({
        url: `/uploads/products/${file.filename}`,
        alt: req.body.alt || product.name,
        position: product.images.length + index,
        isPrimary: product.images.length === 0 && index === 0
      }));
      product.images.push(...newImages);
      await product.save();
      res.json({ success: true, message: 'Images uploaded successfully', data: { images: newImages, product } });
    } catch (error) {
      console.error('Upload images error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async deleteImage(req, res) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      const imageIndex = product.images.findIndex(img => img._id.toString() === req.params.imageId);
      if (imageIndex === -1) {
        return res.status(404).json({ success: false, message: 'Image not found' });
      }
      const deletedImage = product.images.splice(imageIndex, 1)[0];
      if (deletedImage.isPrimary && product.images.length > 0) {
        product.images[0].isPrimary = true;
      }
      await product.save();
      // Only delete if it's not an external URL
      if (!deletedImage.url.startsWith('http')) {
        const filePath = path.join(process.cwd(), deletedImage.url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
      console.error('Delete image error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async updateInventory(req, res) {
    try {
      const { quantity, lowStockThreshold, allowBackorder } = req.body;
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      if (quantity !== undefined) product.inventory.quantity = quantity;
      if (lowStockThreshold !== undefined) product.inventory.lowStockThreshold = lowStockThreshold;
      if (allowBackorder !== undefined) product.inventory.allowBackorder = allowBackorder;
      await product.save();
      res.json({ success: true, message: 'Inventory updated successfully', data: { inventory: product.inventory } });
    } catch (error) {
      console.error('Update inventory error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async getLowStockProducts(req, res) {
    try {
      const { page = 1, limit = 15 } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      const query = { 'inventory.quantity': { $lte: '$inventory.lowStockThreshold' }, status: 'active', trackInventory: true };
      const products = await Product.find(query).sort({ 'inventory.quantity': 1 }).limit(limitNum).skip(skip).exec();
      const total = await Product.countDocuments(query);
      res.json({ success: true, data: { products, pagination: { current: pageNum, pages: Math.ceil(total / limitNum), total, limit: limitNum } } });
    } catch (error) {
      console.error('Get low stock products error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async getBrands(req, res) {
    try {
      const brands = await Product.distinct('brand');
      const brandCounts = await Promise.all(
        brands.map(async (brand) => {
          const count = await Product.countDocuments({ brand: { $regex: `^${brand}$`, $options: 'i' }, status: 'active' });
          return { name: brand, count };
        })
      );
      res.json({ success: true, data: brandCounts.sort((a, b) => b.count - a.count) });
    } catch (error) {
      console.error('Get brands error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async getColors(req, res) {
    try {
      const products = await Product.find({ status: 'active' }).select('colors');
      const colorMap = new Map();
      products.forEach(product => {
        if (product.colors && product.colors.length > 0) {
          product.colors.forEach(color => {
            if (color.isActive && color.name) {
              const existing = colorMap.get(color.name) || { name: color.name, count: 0, hex: color.hex };
              existing.count += 1;
              colorMap.set(color.name, existing);
            }
          });
        }
      });
      const colors = Array.from(colorMap.values()).sort((a, b) => b.count - a.count);
      res.json({ success: true, data: colors });
    } catch (error) {
      console.error('Get colors error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async getTopRatedProducts(req, res) {
    try {
      const { limit = 3 } = req.query;
      const limitNum = parseInt(limit);
      let products = await Product.find({ status: 'active', 'reviews.averageRating': { $exists: true, $gt: 0 } })
        .sort({ 'reviews.averageRating': -1, 'reviews.reviewCount': -1 })
        .limit(limitNum)
        .exec();
      if (products.length === 0) {
        products = await Product.find({ status: 'active' }).sort({ createdAt: -1 }).limit(limitNum).exec();
      }
      res.json({ success: true, data: { products } });
    } catch (error) {
      console.error('Get top rated products error:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  }

  static async getCategories(req, res) {
    try {
      const products = await Product.find({ status: 'active' }).select('mainCategory subCategory');
      const categoryMap = new Map();
      products.forEach(product => {
        const mainCat = product.mainCategory || 'General';
        const subCat = product.subCategory;
        if (!categoryMap.has(mainCat)) {
          categoryMap.set(mainCat, { name: mainCat, subcategories: new Set(), count: 0 });
        }
        const category = categoryMap.get(mainCat);
        category.count += 1;
        if (subCat && subCat.trim() !== '' && subCat !== mainCat) {
          category.subcategories.add(subCat.trim());
        }
      });
      const categories = Array.from(categoryMap.values()).map(cat => ({
        ...cat,
        subcategories: Array.from(cat.subcategories)
      })).sort((a, b) => b.count - a.count);
      res.json({ success: true, data: categories });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

export default ProductController;
