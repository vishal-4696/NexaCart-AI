import { useState } from "react";
import { Link } from "react-router-dom";

export default function ProductCard({ product }) {
  const id = product._id || product.id;
  const [imageFailed, setImageFailed] = useState(false);

  const inStock = Number(product.stock) > 0;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/products/${id}`} className="block">
        {/* Product Image */}
        <div className="flex h-56 items-center justify-center overflow-hidden bg-slate-50 p-4">
          {product.imageUrl && !imageFailed ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
              <span className="text-sm">Image unavailable</span>
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="p-4">
          {/* Main Category */}
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            {product.category || "Featured product"}
          </p>

          {/* Subcategory */}
          {product.subCategory && (
            <p className="mt-1 text-xs font-medium text-slate-600">
              {product.subCategory}
            </p>
          )}

          {/* Product Name */}
          <h3 className="mt-2 min-h-12 line-clamp-2 font-semibold text-slate-900 group-hover:text-teal-700">
            {product.name}
          </h3>

          {/* Description */}
          <p className="mt-2 line-clamp-2 text-sm text-slate-500">
            {product.description}
          </p>

          {/* Price and Rating */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xl font-bold text-slate-900">
              ₹{Number(product.price || 0).toLocaleString("en-IN")}
            </span>

            <span className="text-xs text-slate-500">
              {Number(product.averageRating || 0).toFixed(1)} ★
            </span>
          </div>

          {/* Stock */}
          <p
            className={`mt-3 text-sm font-medium ${
              inStock ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {inStock ? `${product.stock} in stock` : "Out of stock"}
          </p>
        </div>
      </Link>

      {/* View Details Button */}
      <div className="px-4 pb-4">
        <Link
          to={`/products/${id}`}
          className="block rounded-lg border border-teal-700 py-2.5 text-center text-sm font-semibold text-teal-700 hover:bg-teal-50"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
