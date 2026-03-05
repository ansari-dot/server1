import Brand from '../models/Brand.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all brands
export const getAllBrands = async (req, res) => {
    try {
        const brands = await Brand.find().sort({ order: 1, createdAt: -1 });
        res.json({ success: true, data: brands });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get active brands (for frontend)
export const getActiveBrands = async (req, res) => {
    try {
        const brands = await Brand.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
        res.json({ success: true, data: brands });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get homepage brands (for homepage display)
export const getHomepageBrands = async (req, res) => {
    try {
        const brands = await Brand.find({ showOnHomepage: true, isActive: true }).sort({ order: 1, createdAt: -1 });
        res.json({ success: true, data: brands });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single brand
export const getBrand = async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        if (!brand) {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }
        res.json({ success: true, data: brand });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create brand
export const createBrand = async (req, res) => {
    try {
        const { name, slug, description, isActive, showOnHomepage, order } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Logo is required' });
        }

        const logo = `/uploads/brands/${req.file.filename}`;

        const brand = new Brand({
            name,
            slug,
            logo,
            description,
            isActive: isActive !== undefined ? isActive : true,
            showOnHomepage: showOnHomepage !== undefined ? showOnHomepage : false,
            order: order || 0
        });

        await brand.save();
        res.status(201).json({ success: true, data: brand });
    } catch (error) {
        if (req.file) {
            await fs.unlink(req.file.path).catch(console.error);
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update brand
export const updateBrand = async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            if (req.file) {
                await fs.unlink(req.file.path).catch(console.error);
            }
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }

        const { name, slug, description, isActive, showOnHomepage, order } = req.body;

        if (name) brand.name = name;
        if (slug) brand.slug = slug;
        if (description !== undefined) brand.description = description;
        if (isActive !== undefined) brand.isActive = isActive === 'true' || isActive === true;
        if (showOnHomepage !== undefined) brand.showOnHomepage = showOnHomepage === 'true' || showOnHomepage === true;
        if (order !== undefined) brand.order = order;

        if (req.file) {
            if (brand.logo) {
                const oldLogoPath = path.join(__dirname, '..', brand.logo);
                await fs.unlink(oldLogoPath).catch(console.error);
            }
            brand.logo = `/uploads/brands/${req.file.filename}`;
        }

        await brand.save();
        res.json({ success: true, data: brand });
    } catch (error) {
        if (req.file) {
            await fs.unlink(req.file.path).catch(console.error);
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete brand
export const deleteBrand = async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }

        // Delete logo file
        if (brand.logo) {
            const logoPath = path.join(__dirname, '..', brand.logo);
            await fs.unlink(logoPath).catch(console.error);
        }

        await Brand.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Brand deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
