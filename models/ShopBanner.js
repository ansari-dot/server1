import mongoose from 'mongoose';

const shopBannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  bannerType: {
    type: String,
    enum: ['main', 'sidebar'],
    default: 'main'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

shopBannerSchema.index({ isActive: 1 });
shopBannerSchema.index({ bannerType: 1 });

export default mongoose.model('ShopBanner', shopBannerSchema);
