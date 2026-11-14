import api from "./axios";

// Create a customer order
export async function createOrder(shippingAddress) {
  const response = await api.post("/orders", {
    shippingAddress,
  });

  return response.data;
}

// Get logged-in customer's orders
export async function getMyOrders() {
  const response = await api.get("/orders/my-orders");

  return response.data;
}

// Admin: Get all customer orders
export async function getAllOrders() {
  const response = await api.get("/admin/orders");

  return response.data;
}

// Admin: Update order status
export async function updateOrderStatus(orderId, status) {
  const response = await api.patch(`/orders/${orderId}/status`, { status });

  return response.data;
}
