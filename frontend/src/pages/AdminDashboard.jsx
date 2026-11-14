import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getAdminDashboard } from "../api/admin";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const { user } = useAuth();

  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await getAdminDashboard();
        setAdminData(data.admin);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>

        <p className="mt-2 text-slate-500">
          Welcome back, {adminData?.name || user?.name}! Manage your NexaCart AI
          store here.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Product Management</h2>

            <p className="mt-2 text-sm text-slate-500">
              Add, edit and manage your store products.
            </p>

            <Link
              to="/admin/products"
              className="mt-5 inline-block rounded-lg bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800"
            >
              Manage Products
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Order Management</h2>

            <p className="mt-2 text-sm text-slate-500">
              View customer orders and update their status.
            </p>

            <Link
              to="/admin/orders"
              className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Manage Orders
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Admin Account</h2>

          <p className="mt-3 text-slate-600">Name: {adminData?.name}</p>

          <p className="mt-2 text-slate-600">Email: {adminData?.email}</p>

          <p className="mt-2 text-teal-700 font-semibold">
            Role: Administrator
          </p>
        </div>
      </div>
    </main>
  );
}
