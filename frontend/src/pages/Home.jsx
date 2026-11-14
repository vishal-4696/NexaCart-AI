import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../api/products";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const result = await getProducts();

        if (active) {
          setProducts(result.filter((p) => p.isActive !== false));
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load products. Please check your backend.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const featured = products.slice(0, 4);

  return (
    <main>
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24 lg:px-8">
          <div>
            <span className="inline-flex rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-2 text-sm font-medium text-teal-300">
              Smarter shopping starts here
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              Discover products.
              <span className="block text-teal-400">Shop intelligently.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Explore products selected for your needs with intelligent
              recommendations and a simpler shopping experience.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/products"
                className="rounded-xl bg-teal-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-teal-400"
              >
                Explore products
              </Link>

              <a
                href="#featured"
                className="rounded-xl border border-slate-500 px-6 py-3 font-semibold hover:bg-white/10"
              >
                Featured products
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex min-h-44 flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur sm:min-h-52">
              <span className="text-4xl">🎧</span>
              <div>
                <p className="text-lg font-bold">Audio</p>
                <p className="mt-1 text-sm text-slate-300">Find your sound</p>
              </div>
            </div>

            <div className="mt-8 flex min-h-44 flex-col justify-between rounded-3xl border border-white/10 bg-teal-400/10 p-5 sm:min-h-52">
              <span className="text-4xl">⌚</span>
              <div>
                <p className="text-lg font-bold">Wearables</p>
                <p className="mt-1 text-sm text-slate-300">
                  Everyday essentials
                </p>
              </div>
            </div>

            <div className="flex min-h-44 flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-5 sm:min-h-52">
              <span className="text-4xl">💻</span>
              <div>
                <p className="text-lg font-bold">Technology</p>
                <p className="mt-1 text-sm text-slate-300">
                  Upgrade your setup
                </p>
              </div>
            </div>

            <div className="mt-8 flex min-h-44 flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-5 sm:min-h-52">
              <span className="text-4xl">✨</span>
              <div>
                <p className="text-lg font-bold">Smart picks</p>
                <p className="mt-1 text-sm text-slate-300">
                  Discover something new
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-700">
              Explore NexaCart
            </p>
            <h2
              id="featured"
              className="mt-2 text-3xl font-extrabold text-slate-900"
            >
              Featured products
            </h2>
            <p className="mt-2 text-slate-500">
              Browse products available in our catalogue.
            </p>
          </div>

          <Link
            to="/products"
            className="font-semibold text-brand-700 hover:underline"
          >
            View all products →
          </Link>
        </div>

        {loading && (
          <p className="py-12 text-center text-slate-500">
            Loading products...
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-8 rounded-xl bg-red-50 p-4 text-red-700"
          >
            {error}
          </p>
        )}

        {!loading && !error && featured.length === 0 && (
          <div className="mt-8 rounded-2xl bg-slate-100 p-8 text-center">
            <p className="font-semibold">No products available yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Add products through your admin API and refresh this page.
            </p>
          </div>
        )}

        {!loading && featured.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product._id || product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:px-8">
          <div>
            <p className="font-bold text-slate-900">Thoughtful discovery</p>
            <p className="mt-2 text-sm text-slate-500">
              Find products that fit your interests.
            </p>
          </div>
          <div>
            <p className="font-bold text-slate-900">Transparent pricing</p>
            <p className="mt-2 text-sm text-slate-500">
              See product prices and availability.
            </p>
          </div>
          <div>
            <p className="font-bold text-slate-900">Easy ordering</p>
            <p className="mt-2 text-sm text-slate-500">
              Manage your cart and orders in one place.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
