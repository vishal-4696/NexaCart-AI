import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getProducts } from "../api/products";
import ProductCard from "../components/ProductCard";

// Available main categories and subcategories
const categoryOptions = {
  Electronics: [
    "Laptops",
    "Cameras",
    "Headphones",
    "Smartphones",
    "Accessories",
  ],
  Fashion: [
    "Men's Clothing",
    "Women's Clothing",
    "Footwear",
    "Watches",
    "Accessories",
  ],
  "Home & Kitchen": [
    "Furniture",
    "Home Appliances",
    "Kitchenware",
    "Home Decor",
  ],
  Sports: ["Fitness Equipment", "Sportswear", "Sports Accessories"],
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters from URL
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "All";
  const subCategory = searchParams.get("subCategory") || "All";

  // Fetch products
  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const result = await getProducts();

        if (active) {
          setProducts(result.filter((p) => p.isActive !== false));
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load products. Check your backend connection.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  // Get available main categories from products
  const categories = useMemo(
    () => ["All", ...new Set(products.map((p) => p.category).filter(Boolean))],
    [products],
  );

  // Get available subcategories for selected main category
  const subCategories = useMemo(() => {
    if (category === "All") {
      return [
        "All",
        ...new Set(products.map((p) => p.subCategory).filter(Boolean)),
      ];
    }

    return [
      "All",
      ...new Set(
        products
          .filter((p) => p.category === category)
          .map((p) => p.subCategory)
          .filter(Boolean),
      ),
    ];
  }, [products, category]);

  // Filter products
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        [
          product.name,
          product.description,
          product.category,
          product.subCategory,
          product.brand,
          ...(Array.isArray(product.tags) ? product.tags : []),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesCategory =
        category === "All" || product.category === category;

      const matchesSubCategory =
        subCategory === "All" || product.subCategory === subCategory;

      return matchesSearch && matchesCategory && matchesSubCategory;
    });
  }, [products, search, category, subCategory]);

  // Update URL filters
  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);

    if (
      !value ||
      (key === "category" && value === "All") ||
      (key === "subCategory" && value === "All")
    ) {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    // Reset subcategory when main category changes
    if (key === "category") {
      next.delete("subCategory");
    }

    setSearchParams(next);
  }

  // Clear all filters
  function clearFilters() {
    setSearchParams({});
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Page heading */}
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-brand-700">
          The NexaCart collection
        </p>

        <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Explore products
        </h1>

        <p className="mt-3 text-slate-500">
          Search the catalogue and find what you need.
        </p>
      </div>

      {/* Search and main category */}
      <div className="mt-8 grid gap-4 md:grid-cols-[1fr_240px]">
        <input
          type="search"
          aria-label="Filter products"
          placeholder="Search by name, brand or description..."
          value={search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />

        <select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => updateFilter("category", e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-brand-500"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item === "All" ? "All categories" : item}
            </option>
          ))}
        </select>
      </div>

      {/* Subcategory filters */}
      <div className="mt-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Browse by subcategory
        </h2>

        <div className="flex flex-wrap gap-2">
          {subCategories.map((item) => {
            const selected = subCategory === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() => updateFilter("subCategory", item)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  selected
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-brand-500 hover:text-brand-700"
                }`}
              >
                {item === "All" ? "All subcategories" : item}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product count and clear filters */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {loading
            ? "Loading products..."
            : `${filteredProducts.length} product(s) found`}
        </p>

        {(search || category !== "All" || subCategory !== "All") && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-semibold text-brand-700 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center text-slate-500">
          Loading your products...
        </div>
      )}

      {/* No products found */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="mt-8 rounded-2xl bg-white p-12 text-center shadow-sm">
          <p className="text-4xl">🔎</p>

          <h2 className="mt-4 text-xl font-bold">No matching products</h2>

          <p className="mt-2 text-slate-500">
            Try another search term or category.
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700"
          >
            Show all products
          </button>
        </div>
      )}

      {/* Product cards */}
      {!loading && !error && filteredProducts.length > 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product._id || product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
