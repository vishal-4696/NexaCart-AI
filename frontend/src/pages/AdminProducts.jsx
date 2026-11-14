import { useEffect, useState } from "react";
import api from "../api/axios";
import { Link } from "react-router-dom";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  // Fetch all products (active + inactive)
  async function fetchProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/products/admin/all");

      setProducts(response.data.products || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to fetch products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  // Deactivate product
  async function handleDelete(productId) {
    const confirmed = window.confirm(
      "Are you sure you want to deactivate this product?",
    );

    if (!confirmed) return;

    try {
      setActionLoading(productId);
      setError("");

      await api.patch(`/products/${productId}`, {
        isActive: false,
      });

      setProducts((previousProducts) =>
        previousProducts.map((product) =>
          product._id === productId ? { ...product, isActive: false } : product,
        ),
      );

      alert("Product deactivated successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to deactivate product.");
    } finally {
      setActionLoading("");
    }
  }

  // Reactivate product
  async function handleReactivate(productId) {
    const confirmed = window.confirm(
      "Are you sure you want to reactivate this product?",
    );

    if (!confirmed) return;

    try {
      setActionLoading(productId);
      setError("");

      await api.patch(`/products/${productId}`, {
        isActive: true,
      });

      setProducts((previousProducts) =>
        previousProducts.map((product) =>
          product._id === productId ? { ...product, isActive: true } : product,
        ),
      );

      alert("Product reactivated successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reactivate product.");
    } finally {
      setActionLoading("");
    }
  }

  // Search products by name, category and subcategory
  const filteredProducts = products.filter((product) => {
    const query = search.toLowerCase().trim();

    return (
      product.name?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query) ||
      product.subCategory?.toLowerCase().includes(query) ||
      product.brand?.toLowerCase().includes(query)
    );
  });

  const activeCount = products.filter((product) => product.isActive).length;

  const inactiveCount = products.length - activeCount;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <p className="text-lg font-semibold">Loading products...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Product Management
            </h1>

            <p className="mt-2 text-slate-500">
              Manage all NexaCart AI products.
            </p>
          </div>

          <Link
            to="/admin/products/add"
            className="rounded-lg bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800"
          >
            + Add Product
          </Link>
        </div>

        {/* Statistics */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Products</p>
            <h2 className="mt-2 text-3xl font-bold">{products.length}</h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active Products</p>
            <h2 className="mt-2 text-3xl font-bold text-green-600">
              {activeCount}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Inactive Products</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {inactiveCount}
            </h2>
          </div>
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="Search by product, category or subcategory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-8 w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />

        {/* Error Message */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Product Table */}
        <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Subcategory</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product._id} className="border-t hover:bg-slate-50">
                  {/* Product Image and Name */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          product.imageUrl ||
                          "https://placehold.co/60x60?text=No+Image"
                        }
                        alt={product.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            "https://placehold.co/60x60?text=No+Image";
                        }}
                        className="h-12 w-12 rounded-lg object-cover"
                      />

                      <span className="font-medium text-slate-800">
                        {product.name}
                      </span>
                    </div>
                  </td>

                  {/* Main Category */}
                  <td className="p-4">{product.category || "—"}</td>

                  {/* Subcategory */}
                  <td className="p-4">
                    {product.subCategory ? (
                      <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">
                        {product.subCategory}
                      </span>
                    ) : (
                      <span className="text-slate-400">Not assigned</span>
                    )}
                  </td>

                  {/* Price */}
                  <td className="p-4">
                    ₹{Number(product.price).toLocaleString("en-IN")}
                  </td>

                  {/* Stock */}
                  <td className="p-4">{product.stock}</td>

                  {/* Status */}
                  <td className="p-4">
                    <span
                      className={
                        product.isActive
                          ? "rounded-full bg-green-100 px-3 py-1 text-green-700"
                          : "rounded-full bg-red-100 px-3 py-1 text-red-700"
                      }
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/admin/products/edit/${product._id}`}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Edit
                      </Link>

                      {product.isActive ? (
                        <button
                          onClick={() => handleDelete(product._id)}
                          disabled={actionLoading === product._id}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {actionLoading === product._id
                            ? "Please wait..."
                            : "Deactivate"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(product._id)}
                          disabled={actionLoading === product._id}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === product._id
                            ? "Please wait..."
                            : "Reactivate"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty Search Result */}
          {filteredProducts.length === 0 && (
            <p className="p-6 text-center text-slate-500">No products found.</p>
          )}
        </div>

        {/* Footer */}
        <p className="mt-4 text-sm text-slate-500">
          Total products displayed: {filteredProducts.length}
        </p>

        <button
          onClick={fetchProducts}
          className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100"
        >
          Refresh Products
        </button>
      </div>
    </main>
  );
}
