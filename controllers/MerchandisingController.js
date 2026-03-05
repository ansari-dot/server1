import MerchandisingSet from '../models/Merchandising.js';
import Product from '../models/Product.js';

class MerchandisingController {
  // Get all merchandising sets
  static async getMerchandisingSets(req, res) {
    try {
      const sets = await MerchandisingSet.find()
        .populate('products.product', 'name sku price images mainCategory')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: { merchandisingSets: sets }
      });

    } catch (error) {
      console.error('Get merchandising sets error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get single merchandising set
  static async getMerchandisingSet(req, res) {
    try {
      const set = await MerchandisingSet.findById(req.params.id)
        .populate('products.product', 'name sku price images mainCategory');

      if (!set) {
        return res.status(404).json({
          success: false,
          message: 'Merchandising set not found'
        });
      }

      res.json({
        success: true,
        data: { merchandisingSet: set }
      });

    } catch (error) {
      console.error('Get merchandising set error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create new merchandising set
  static async createMerchandisingSet(req, res) {
    try {
      const merchandisingSet = new MerchandisingSet(req.body);
      await merchandisingSet.save();

      // Populate products for response
      await merchandisingSet.populate('products.product', 'name sku price images mainCategory');

      res.status(201).json({
        success: true,
        message: 'Merchandising set created successfully',
        data: { merchandisingSet }
      });

    } catch (error) {
      console.error('Create merchandising set error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update merchandising set
  static async updateMerchandisingSet(req, res) {
    try {
      const set = await MerchandisingSet.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('products.product', 'name sku price images mainCategory');

      if (!set) {
        return res.status(404).json({
          success: false,
          message: 'Merchandising set not found'
        });
      }

      res.json({
        success: true,
        message: 'Merchandising set updated successfully',
        data: { merchandisingSet: set }
      });

    } catch (error) {
      console.error('Update merchandising set error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete merchandising set
  static async deleteMerchandisingSet(req, res) {
    try {
      const set = await MerchandisingSet.findByIdAndDelete(req.params.id);

      if (!set) {
        return res.status(404).json({
          success: false,
          message: 'Merchandising set not found'
        });
      }

      res.json({
        success: true,
        message: 'Merchandising set deleted successfully'
      });

    } catch (error) {
      console.error('Delete merchandising set error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Add product to merchandising set
  static async addProductToSet(req, res) {
    try {
      const { productId, position } = req.body;
      const set = await MerchandisingSet.findById(req.params.id);

      if (!set) {
        return res.status(404).json({
          success: false,
          message: 'Merchandising set not found'
        });
      }

      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      set.addProduct(productId, position);
      await set.save();

      // Populate for response
      await set.populate('products.product', 'name sku price images mainCategory');

      res.json({
        success: true,
        message: 'Product added to merchandising set successfully',
        data: { merchandisingSet: set }
      });

    } catch (error) {
      console.error('Add product to set error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Remove product from merchandising set
  static async removeProductFromSet(req, res) {
    try {
      const { productId } = req.params;
      const set = await MerchandisingSet.findById(req.params.id);

      if (!set) {
        return res.status(404).json({
          success: false,
          message: 'Merchandising set not found'
        });
      }

      set.removeProduct(productId);
      await set.save();

      // Populate for response
      await set.populate('products.product', 'name sku price images mainCategory');

      res.json({
        success: true,
        message: 'Product removed from merchandising set successfully',
        data: { merchandisingSet: set }
      });

    } catch (error) {
      console.error('Remove product from set error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update product position in set
  static async updateProductPosition(req, res) {
    try {
      const { productId, newPosition } = req.body;
      const set = await MerchandisingSet.findById(req.params.id);

      if (!set) {
        return res.status(404).json({
          success: false,
          message: 'Merchandising set not found'
        });
      }

      set.updateProductPosition(productId, newPosition);
      await set.save();

      // Populate for response
      await set.populate('products.product', 'name sku price images mainCategory');

      res.json({
        success: true,
        message: 'Product position updated successfully',
        data: { merchandisingSet: set }
      });

    } catch (error) {
      console.error('Update product position error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get featured products for client side
  static async getFeaturedProducts(req, res) {
    try {
      const featuredSet = await MerchandisingSet.findOne({
        type: 'featured_products',
        'settings.isEnabled': true
      }).populate('products.product', 'name sku price images mainCategory description');

      if (!featuredSet) {
        return res.json({
          success: true,
          data: { products: [] }
        });
      }

      const sortedProducts = featuredSet.getSortedProducts();
      
      res.json({
        success: true,
        data: { 
          products: sortedProducts,
          title: featuredSet.title,
          description: featuredSet.description,
          settings: featuredSet.settings,
          display: featuredSet.display
        }
      });

    } catch (error) {
      console.error('Get featured products error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get best sellers for client side
  static async getBestSellers(req, res) {
    try {
      const bestSellersSet = await MerchandisingSet.findOne({
        type: 'best_sellers',
        'settings.isEnabled': true
      }).populate('products.product', 'name sku price compareAtPrice images mainCategory subCategory description shortDescription features colors reviews inventory');

      if (!bestSellersSet) {
        return res.json({
          success: true,
          data: { 
            isEnabled: false,
            products: []
          }
        });
      }

      const sortedProducts = bestSellersSet.getSortedProducts();
      
      res.json({
        success: true,
        data: { 
          ...bestSellersSet.toObject(),
          products: sortedProducts,
          isEnabled: bestSellersSet.settings.isEnabled
        }
      });

    } catch (error) {
      console.error('Get best sellers error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get top selling products for client side
  static async getTopSellingProducts(req, res) {
    try {
      const topSellingSet = await MerchandisingSet.findOne({
        name: 'Top Selling Products',
        'settings.isEnabled': true
      }).populate('products.product', 'name sku price images mainCategory subCategory reviews');

      if (!topSellingSet) {
        return res.json({
          success: true,
          data: { 
            products: [],
            title: 'Top Selling Products'
          }
        });
      }

      const sortedProducts = topSellingSet.getSortedProducts();
      
      res.json({
        success: true,
        data: { 
          ...topSellingSet.toObject(),
          products: sortedProducts
        }
      });

    } catch (error) {
      console.error('Get top selling products error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get you may like products for client side
  static async getYouMayLikeProducts(req, res) {
    try {
      const youMayLikeSet = await MerchandisingSet.findOne({
        name: 'You may like',
        'settings.isEnabled': true
      }).populate('products.product', 'name sku price images mainCategory subCategory reviews');

      if (!youMayLikeSet) {
        return res.json({
          success: true,
          data: { 
            products: [],
            title: 'You may like'
          }
        });
      }

      const sortedProducts = youMayLikeSet.getSortedProducts();
      
      res.json({
        success: true,
        data: { 
          ...youMayLikeSet.toObject(),
          products: sortedProducts
        }
      });

    } catch (error) {
      console.error('Get you may like products error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get new releases for client side
  static async getNewReleasesProducts(req, res) {
    try {
      const newReleasesSet = await MerchandisingSet.findOne({
        $or: [
          { type: 'new_releases' },
          { type: 'new_arrivals' },
          { name: 'New Release' }
        ],
        'settings.isEnabled': true
      }).populate('products.product', 'name sku price images mainCategory subCategory reviews');

      if (!newReleasesSet) {
        return res.json({
          success: true,
          data: { 
            products: [],
            title: 'New releases'
          }
        });
      }

      const sortedProducts = newReleasesSet.getSortedProducts();
      
      res.json({
        success: true,
        data: { 
          ...newReleasesSet.toObject(),
          products: sortedProducts
        }
      });

    } catch (error) {
      console.error('Get new releases products error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get all products for selection
  static async getAvailableProducts(req, res) {
    try {
      const { search, category, page = 1, limit = 20 } = req.query;
      
      // Build query
      const query = { status: 'active' };
      
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

      const products = await Product.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('name sku price mainCategory subCategory images');

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
        message: 'Internal server error'
      });
    }
  }
}

export default MerchandisingController;
