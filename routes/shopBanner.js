import express from 'express';
import ShopBannerController from '../controllers/ShopBannerController.js';
import { upload } from '../middlewares/upload.js';

const router = express.Router();

router.get('/', ShopBannerController.getBanners);
router.get('/active', ShopBannerController.getActiveBanners);
router.post('/', upload.single('image'), ShopBannerController.createBanner);
router.put('/:id', upload.single('image'), ShopBannerController.updateBanner);
router.delete('/:id', ShopBannerController.deleteBanner);
router.patch('/:id/toggle', ShopBannerController.toggleStatus);

export default router;
