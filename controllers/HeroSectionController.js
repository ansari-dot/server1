import HeroSection from '../models/HeroSection.js';
import fs from 'fs';
import path from 'path';

class HeroSectionController {
  static async getAll(req, res) {
    try {
      const { active } = req.query;
      const query = active === 'true' ? { isActive: true } : {};
      
      const heroSections = await HeroSection.find(query).sort({ order: 1 });
      
      res.json({
        success: true,
        data: { heroSections }
      });
    } catch (error) {
      console.error('Get hero sections error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getById(req, res) {
    try {
      const heroSection = await HeroSection.findById(req.params.id);
      
      if (!heroSection) {
        return res.status(404).json({
          success: false,
          message: 'Hero section not found'
        });
      }
      
      res.json({
        success: true,
        data: { heroSection }
      });
    } catch (error) {
      console.error('Get hero section error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async create(req, res) {
    try {
      const heroSection = new HeroSection(req.body);
      await heroSection.save();
      
      res.status(201).json({
        success: true,
        message: 'Hero section created successfully',
        data: { heroSection }
      });
    } catch (error) {
      console.error('Create hero section error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async update(req, res) {
    try {
      const heroSection = await HeroSection.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!heroSection) {
        return res.status(404).json({
          success: false,
          message: 'Hero section not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Hero section updated successfully',
        data: { heroSection }
      });
    } catch (error) {
      console.error('Update hero section error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async delete(req, res) {
    try {
      const heroSection = await HeroSection.findById(req.params.id);
      
      if (!heroSection) {
        return res.status(404).json({
          success: false,
          message: 'Hero section not found'
        });
      }

      // Delete image file only if it's not an external URL
      if (heroSection.image && !heroSection.image.startsWith('http')) {
        const filePath = path.join(process.cwd(), heroSection.image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await HeroSection.findByIdAndDelete(req.params.id);
      
      res.json({
        success: true,
        message: 'Hero section deleted successfully'
      });
    } catch (error) {
      console.error('Delete hero section error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image uploaded'
        });
      }

      const imageUrl = `/uploads/hero/${req.file.filename}`;
      
      res.json({
        success: true,
        data: { imageUrl }
      });
    } catch (error) {
      console.error('Upload image error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default HeroSectionController;
