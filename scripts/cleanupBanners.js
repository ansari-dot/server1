import mongoose from 'mongoose';
import ShopBanner from '../models/ShopBanner.js';
import dotenv from 'dotenv';

dotenv.config();

const cleanupBanners = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all banners
    const allBanners = await ShopBanner.find({});
    console.log(`Found ${allBanners.length} total banners`);

    // Delete old banners that have link or order fields (old schema)
    const deleteResult = await ShopBanner.deleteMany({
      $or: [
        { link: { $exists: true } },
        { order: { $exists: true } },
        { bannerType: { $exists: false } }
      ]
    });
    console.log(`Deleted ${deleteResult.deletedCount} old banners`);

    // Show remaining banners
    const remainingBanners = await ShopBanner.find({});
    console.log(`Remaining ${remainingBanners.length} banners:`);
    remainingBanners.forEach(banner => {
      console.log(`- ${banner.title}: ${banner.bannerType} (${banner.isActive ? 'Active' : 'Inactive'})`);
    });

    await mongoose.disconnect();
    console.log('Cleanup completed');
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
};

cleanupBanners();