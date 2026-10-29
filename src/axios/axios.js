
import axios from "axios";

const fetchProductDetails = async () => {
  try {
    const response = await axios.get(
      "/api/customer/products/59bbc2b3-0ce0-45b6-91d6-efd1ecbb012f/",
      {
        headers: {
          "x-vendor-id": "a9e3d24d-a2fe-4fbb-830f-91e0fee9f299",
        },
      }
    );

    const result = response.data;

    if (result.status !== "success" || !result.data) {
      throw new Error(result.message || "Unable to retrieve product.");
    }

    console.log("Actual product data:", result.data);

    return result.data;
  } catch (error) {
    console.error(
      "Product API error:",
      error.response?.data || error.message
    );

    throw error;
  }
};

export default fetchProductDetails;