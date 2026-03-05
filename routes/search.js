import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Search products endpoint
router.get('/products', async (req, res) => {
  try {
    const { q, category, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: { products: [], total: 0 }
      });
    }

    const query = {
      status: 'active',
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ]
    };

    if (category && category !== 'All categories') {
      query.$and = [
        { $or: query.$or },
        {
          $or: [
            { mainCategory: { $regex: category, $options: 'i' } },
            { subCategory: { $regex: category, $options: 'i' } }
          ]
        }
      ];
      delete query.$or;
    }

    const products = await Product.find(query)
      .select('name slug price compareAtPrice images brand mainCategory')
      .limit(parseInt(limit))
      .sort({ name: 1 })
      .exec();

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products: products.map(p => ({
          _id: p._id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          image: p.images?.[0]?.url || '/img/product/default.jpg',
          brand: p.brand,
          category: p.mainCategory
        })),
        total
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

export default router;
