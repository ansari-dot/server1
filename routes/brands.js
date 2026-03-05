import express from 'express';
import multer from 'multer';
import path from 'path';
import * as BrandController from '../controllers/BrandController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Configure multer for brand logo uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/brands/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'brand-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|svg|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// Public routes
router.get('/active', BrandController.getActiveBrands);
router.get('/homepage', BrandController.getHomepageBrands);
router.get('/', BrandController.getAllBrands);

// Admin routes
router.get('/:id', authenticate, BrandController.getBrand);
router.post('/', authenticate, upload.single('logo'), BrandController.createBrand);
router.put('/:id', authenticate, upload.single('logo'), BrandController.updateBrand);
router.delete('/:id', authenticate, BrandController.deleteBrand);

export default router;
