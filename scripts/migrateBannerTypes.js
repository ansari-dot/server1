import mongoose from 'mongoose';
import ShopBanner from '../models/ShopBanner.js';
import dotenv from 'dotenv';

dotenv.config();

const migrateBannerTypes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Update all existing banners without bannerType to have 'main' as default
    const result = await ShopBanner.updateMany(
      { bannerType: { $exists: false } },
      { $set: { bannerType: 'main' } }
    );

    console.log(`Updated ${result.modifiedCount} banners with default bannerType 'main'`);

    // Show all banners
    const banners = await ShopBanner.find({});
    console.log('Current banners:');
    banners.forEach(banner => {
      console.log(`- ${banner.title}: ${banner.bannerType} (${banner.isActive ? 'Active' : 'Inactive'})`);
    });

    await mongoose.disconnect();
    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateBannerTypes();