import api from "./axios";

// Fetch admin dashboard information
export async function getAdminDashboard() {
  const response = await api.get("/admin/dashboard");
  return response.data;
}
