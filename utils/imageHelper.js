// Helper function to format image URLs for frontend consumption
export const formatImageUrl = (imageUrl) => {
  if (!imageUrl) return '/placeholder.jpg';
  
  // If it's already an absolute URL (starts with http:// or https://), return imageUrl;
  
  // If it's a relative path starting with '/', add the base URL
  if (imageUrl.startsWith('/')) {
    return imageUrl;
  }
  
  // Otherwise, assume it's a relative path and add the uploads/products prefix
  return `/uploads/products/${imageUrl}`;
};

// Helper function to get the full image URL for a product
export const getProductImageUrl = (product) => {
  if (!product || !product.images || product.images.length === 0) {
    return '/placeholder.jpg';
  }
  
  const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
  return formatImageUrl(primaryImage.url);
};
