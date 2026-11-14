import api from "./axios";

// Get the logged-in customer's cart
export async function getCart() {
  const response = await api.get("/cart");
  return response.data;
}

// Add a product to the cart
export async function addToCart(productId, quantity = 1) {
  const response = await api.post("/cart/items", {
    productId,
    quantity,
  });

  return response.data;
}

// Change the quantity of an existing cart item
export async function updateCartItem(productId, quantity) {
  const response = await api.patch(`/cart/items/${productId}`, {
    quantity,
  });

  return response.data;
}

// Remove a product from the cart
export async function removeCartItem(productId) {
  const response = await api.delete(`/cart/items/${productId}`);
  return response.data;
}
