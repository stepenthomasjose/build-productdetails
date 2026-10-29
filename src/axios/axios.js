import axios from 'axios';

/**
 * Fetches product details and handles the parsed payload structural fields.
 */
const fetchProductDetails = async () => {
  const url = 'https://bufferbytes.in';
  
  const config = {
    method: 'get',
    url: url,
    headers: { 
      'x-vendor-id': 'a9e3d24d-a2fe-4fbb-830f-91e0fee9f299'
    }
  };

  try {
    const response = await axios(config);
    const product = response.data; 

    // Extracting fields based on the provided API schema guide
    const productData = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: product.price,
      currency: product.currency,
      availability: product.availability,
      
      // Map out arrays safely
      images: (product.images || []).map(img => ({
        url: img.url,
        alt: img.alt
      })),
      
      variants: (product.variants || []).map(variant => ({
        id: variant.id,
        name: variant.name,
        size: variant.options?.size,
        color: variant.options?.color,
        price: variant.price,
        available: variant.available,
        stockQuantity: variant.stock_quantity
      })),
      
      // Access jewelry/product specific specifications
      specs: {
        productWeight: product.specifications?.product_weight,
        metalWeight: product.specifications?.metal_weight,
        stoneWeight: product.specifications?.stone_weight,
        makingCharges: product.specifications?.making_charges,
        gst: product.specifications?.gst
      }
    };

    return productData;

  } catch (error) {
    console.error('Error fetching product details:', error.response?.data || error.message);
    throw new Error('Failed to fetch product details');
  }
};
