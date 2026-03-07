import ShopBanner from '../models/ShopBanner.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ShopBannerController {
  static async getBanners(req, res) {
    try {
      const banners = await ShopBanner.find().sort({ createdAt: -1 });
      res.json({ success: true, data: { banners } });
    } catch (error) {
      console.error('Get banners error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async getActiveBanners(req, res) {
    try {
      const { type } = req.query;
      console.log('Request type parameter:', type);
      
      let query = { isActive: true };
      
      if (type) {
        query.bannerType = type;
        console.log('Filtering for bannerType:', type);
      }
      
      console.log('Final query:', JSON.stringify(query));
      const banners = await ShopBanner.find(query).sort({ createdAt: -1 });
      console.log(`Found ${banners.length} banners for type '${type}':`);
      banners.forEach(b => {
        console.log(`  - ${b.title}: bannerType='${b.bannerType}', isActive=${b.isActive}`);
      });
      
      res.json({ success: true, data: { banners } });
    } catch (error) {
      console.error('Get active banners error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async createBanner(req, res) {
    try {
      console.log('Raw request body:', req.body);
      console.log('Request file:', req.file ? req.file.filename : 'none');
      
      const { title, isActive, imageUrl, bannerType } = req.body;
      console.log('Extracted values:', { title, isActive, imageUrl, bannerType });
      
      let imagePath;
      if (imageUrl) {
        imagePath = imageUrl;
      } else if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
      } else {
        return res.status(400).json({ success: false, message: 'Image or image URL is required' });
      }

      const bannerData = {
        title: title || 'Shop Banner',
        image: imagePath,
        bannerType: bannerType || 'main',
        isActive: isActive === 'true' || isActive === true
      };
      
      console.log('Creating banner with data:', bannerData);
      const banner = new ShopBanner(bannerData);
      
      await banner.save();
      console.log('Saved banner:', banner.toObject());
      
      res.status(201).json({ success: true, message: 'Banner created successfully', data: { banner } });
    } catch (error) {
      console.error('Create banner error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async updateBanner(req, res) {
    try {
      const { title, isActive, imageUrl, bannerType } = req.body;
      const banner = await ShopBanner.findById(req.params.id);

      if (!banner) {
        return res.status(404).json({ success: false, message: 'Banner not found' });
      }

      banner.title = title || banner.title;
      banner.isActive = isActive !== undefined ? isActive : banner.isActive;
      banner.bannerType = bannerType || banner.bannerType;

      if (imageUrl) {
        if (banner.image && !banner.image.startsWith('http')) {
          const oldImagePath = path.join(__dirname, '..', banner.image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        banner.image = imageUrl;
      } else if (req.file) {
        if (banner.image && !banner.image.startsWith('http')) {
          const oldImagePath = path.join(__dirname, '..', banner.image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        banner.image = `/uploads/${req.file.filename}`;
      }

      await banner.save();
      res.json({ success: true, message: 'Banner updated successfully', data: { banner } });
    } catch (error) {
      console.error('Update banner error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async deleteBanner(req, res) {
    try {
      const banner = await ShopBanner.findById(req.params.id);

      if (!banner) {
        return res.status(404).json({ success: false, message: 'Banner not found' });
      }

      if (banner.image && !banner.image.startsWith('http')) {
        const imagePath = path.join(__dirname, '..', banner.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      await ShopBanner.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'Banner deleted successfully' });
    } catch (error) {
      console.error('Delete banner error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async toggleStatus(req, res) {
    try {
      const banner = await ShopBanner.findById(req.params.id);

      if (!banner) {
        return res.status(404).json({ success: false, message: 'Banner not found' });
      }

      banner.isActive = !banner.isActive;
      await banner.save();

      res.json({ success: true, message: `Banner ${banner.isActive ? 'activated' : 'deactivated'}`, data: { banner } });
    } catch (error) {
      console.error('Toggle status error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

export default ShopBannerController;
