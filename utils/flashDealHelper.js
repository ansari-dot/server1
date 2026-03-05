import { getProductImageUrl } from './imageHelper.js';

// Helper function to format flash deal data for frontend
export const formatFlashDealForFrontend = (flashDeal, product) => {
  const originalPrice = product.price;
  const discountAmount = flashDeal.discount.type === 'percentage' 
    ? (originalPrice * flashDeal.discount.value) / 100 
    : flashDeal.discount.value;
  const finalPrice = originalPrice - discountAmount;
  const discountPercentage = Math.round((discountAmount / originalPrice) * 100);
  const soldPercent = flashDeal.inventory.originalStock > 0 
    ? Math.round((flashDeal.inventory.sold / flashDeal.inventory.originalStock) * 100)
    : 0;

  return {
    id: flashDeal._id,
    category: product.mainCategory || 'General',
    title: flashDeal.name,
    img: getProductImageUrl(product),
    price: finalPrice,
    oldPrice: originalPrice,
    discount: discountPercentage,
    available: flashDeal.inventory.currentStock,
    soldPercent: soldPercent,
    targetDate: flashDeal.schedule.endDate,
    status: flashDeal.updateStatus(),
    timeLeft: flashDeal.getTimeLeft(),
    settings: flashDeal.settings,
    inventory: flashDeal.inventory,
    performance: flashDeal.performance,
    product: product
  };
};
