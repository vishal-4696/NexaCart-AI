import api from "./axios";

// Get all products
export async function getProducts() {
  const response = await api.get("/products");

  // Support common Express response formats.
  const data = response.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.products)) return data.products;
  if (Array.isArray(data.data)) return data.data;

  return [];
}

// Get one product by MongoDB ID
export async function getProductById(id) {
  const response = await api.get(`/products/${id}`);

  const data = response.data;

  return data.product || data.data || data;
}

// Admin: Create a new product
export async function createProduct(productData) {
  const response = await api.post("/products", productData);
  return response.data;
}
