import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();

    navigate(
      `/products${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`,
    );

    setMenuOpen(false);
  }

  function handleLogout() {
    logout();
    navigate("/");
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="shrink-0">
          <span className="text-2xl font-extrabold tracking-tight text-brand-700">
            NexaCart<span className="text-slate-900"> AI</span>
          </span>
        </Link>

        <form onSubmit={handleSearch} className="hidden flex-1 md:flex">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search headphones, watches..."
            aria-label="Search products"
            className="w-full rounded-l-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            className="rounded-r-xl bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"
          >
            Search
          </button>
        </form>

        <nav className="hidden items-center gap-5 text-sm font-medium lg:flex">
          <Link
            to="/"
            className="text-brand-700 font-semibold hover:text-brand-800"
          >
            Home
          </Link>

          <Link to="/products" className="hover:text-brand-700">
            Products
          </Link>

          <Link
            to="/cart"
            className="relative font-medium text-slate-700 hover:text-teal-700"
          >
            Cart
          </Link>

          <Link
            to="/orders"
            className="relative font-medium text-slate-700 hover:text-teal-700"
          >
            My Orders
          </Link>

          {isAuthenticated && user?.role === "admin" && (
            <Link to="/admin" className="hover:text-brand-700">
              Admin
            </Link>
          )}

          {isAuthenticated ? (
            <>
              <span className="max-w-28 truncate text-slate-500">
                {user?.name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-50"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-brand-700">
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-4 py-2.5 text-white hover:bg-brand-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="ml-auto rounded-lg border border-slate-300 px-3 py-2 text-sm lg:hidden"
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <form onSubmit={handleSearch} className="flex">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
            className="min-w-0 flex-1 rounded-l-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            className="rounded-r-lg bg-brand-600 px-4 text-white"
          >
            Search
          </button>
        </form>
      </div>

      {menuOpen && (
        <nav className="space-y-1 border-t border-slate-200 bg-white p-4 lg:hidden">
          {/* Home link */}
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="block rounded-lg p-3 hover:bg-slate-50"
          >
            Home
          </Link>

          <Link
            to="/products"
            onClick={() => setMenuOpen(false)}
            className="block rounded-lg p-3 hover:bg-slate-50"
          >
            Products
          </Link>

          {isAuthenticated && user?.role === "customer" && (
            <>
              <Link
                to="/cart"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg p-3 hover:bg-slate-50"
              >
                Cart
              </Link>
              <Link
                to="/orders"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg p-3 hover:bg-slate-50"
              >
                My Orders
              </Link>
            </>
          )}

          {isAuthenticated && user?.role === "admin" && (
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg p-3 hover:bg-slate-50"
            >
              Admin Dashboard
            </Link>
          )}

          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="w-full rounded-lg p-3 text-left text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg p-3 hover:bg-slate-50"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg p-3 hover:bg-slate-50"
              >
                Create Account
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
