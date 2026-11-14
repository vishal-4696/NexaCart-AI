import api from "./axios";

// Get reviews for one product
export async function getProductReviews(productId) {
  const response = await api.get(`/reviews/${productId}`);
  const data = response.data;

  // Support common Express response formats.
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.reviews)) return data.reviews;
  if (Array.isArray(data.data)) return data.data;

  return [];
}

// Submit a product review
export async function createProductReview(productId, reviewData) {
  const response = await api.post(`/reviews/${productId}`, reviewData);

  return response.data;
}
