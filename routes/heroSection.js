import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import HeroSectionController from '../controllers/HeroSectionController.js';

const router = express.Router();

// Create upload directory if it doesn't exist
const uploadDir = 'uploads/hero';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'hero-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// All routes are public (no authentication required)
router.get('/', HeroSectionController.getAll);
router.get('/:id', HeroSectionController.getById);
router.post('/', HeroSectionController.create);
router.put('/:id', HeroSectionController.update);
router.delete('/:id', HeroSectionController.delete);
router.post('/upload', upload.single('image'), HeroSectionController.uploadImage);

export default router;
