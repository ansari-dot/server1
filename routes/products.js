import express from 'express';
import ProductController from '../controllers/ProductController.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, PNG, and GIF images are allowed'));
    }
  }
});

// Get all products with pagination and filtering
router.get('/', ProductController.getProducts);

// Get all brands
router.get('/brands', ProductController.getBrands);

// Get all colors
router.get('/colors', ProductController.getColors);

// Get all categories
router.get('/categories', ProductController.getCategories);

// Get top rated products
router.get('/top-rated',
  ProductController.getTopRatedProducts
);

// Get low stock products
router.get('/alerts/low-stock',
  ProductController.getLowStockProducts
);

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Products route is working', timestamp: new Date() });
});

// Get single product by ID
router.get('/:id', ProductController.getProduct);

// Create new product
router.post('/', 
  ProductController.createProduct
);

// Update product
router.put('/:id',
  ProductController.updateProduct
);

// Delete product
router.delete('/:id',
  ProductController.deleteProduct
);

// Upload product images
router.post('/:id/images',
  upload.array('images', 5),
  ProductController.uploadImages
);

// Upload temporary images (for color images before product is created)
router.post('/upload-temp',
  upload.array('images', 1),
  (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No images uploaded'
        });
      }

      const urls = req.files.map(file => `/uploads/products/${file.filename}`);
      
      res.json({
        success: true,
        data: { urls }
      });
    } catch (error) {
      console.error('Upload temp error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Delete product image
router.delete('/:id/images/:imageId',
  ProductController.deleteImage


  
);

// Update product inventory
router.patch('/:id/inventory',
  ProductController.updateInventory
);

export default router;
