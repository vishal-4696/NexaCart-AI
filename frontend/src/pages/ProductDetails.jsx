import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProductById } from "../api/products";
import ProductReviews from "../components/ProductReviews";
import { useAuth } from "../context/AuthContext";
import { addToCart } from "../api/cart";
import ProductCard from "../components/ProductCard";
import api from "../api/axios";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");

  // Image gallery states
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  // AI recommendation states
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");

  // Similar products - same subcategory
  const [similarProducts, setSimilarProducts] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState("");

  // Fetch product details
  useEffect(() => {
    let active = true;

    async function loadProduct() {
      setLoading(true);
      setError("");

      try {
        const result = await getProductById(id);

        if (active) {
          setProduct(result);

          // Support multiple images and older products
          const productImages =
            Array.isArray(result.images) && result.images.length > 0
              ? result.images
              : result.imageUrl
                ? [result.imageUrl]
                : [];

          setImages(productImages);
          setSelectedImage(0);
          setImageFailed(false);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message || "Unable to find this product.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [id]);

  // Fetch AI hybrid recommendations
  useEffect(() => {
    let active = true;

    async function loadRecommendations() {
      setRecommendationsLoading(true);
      setRecommendationsError("");
      setRecommendations([]);

      try {
        const response = await api.get("/ai/recommendations/hybrid", {
          params: {
            product_id: id,
          },
        });

        if (active) {
          const products = response.data.recommendations || [];

          // Exclude the currently viewed product
          setRecommendations(
            products.filter(
              (item) => String(item._id || item.id) !== String(id),
            ),
          );
        }
      } catch (err) {
        if (active) {
          console.error("AI recommendation error:", err);
          setRecommendationsError("Unable to load recommendations.");
        }
      } finally {
        if (active) {
          setRecommendationsLoading(false);
        }
      }
    }

    if (id) {
      loadRecommendations();
    }

    return () => {
      active = false;
    };
  }, [id]);

  // Fetch similar products from the same subcategory
  useEffect(() => {
    let active = true;

    async function loadSimilarProducts() {
      setSimilarLoading(true);
      setSimilarError("");
      setSimilarProducts([]);

      try {
        const response = await api.get("/ai/recommendations/similar", {
          params: {
            product_id: id,
          },
        });

        if (active) {
          const products = response.data.recommendations || [];

          setSimilarProducts(
            products.filter(
              (item) => String(item._id || item.id) !== String(id),
            ),
          );
        }
      } catch (err) {
        if (active) {
          console.error("Similar products error:", err);
          setSimilarError("Unable to load similar products.");
        }
      } finally {
        if (active) {
          setSimilarLoading(false);
        }
      }
    }

    if (id) {
      loadSimilarProducts();
    }

    return () => {
      active = false;
    };
  }, [id]);

  // Add product to cart
  async function handleAddToCart() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    setAddingToCart(true);
    setCartMessage("");
    setCartError("");

    try {
      await addToCart(product._id || product.id, 1);

      setCartMessage("Product added to your cart!");
    } catch (err) {
      setCartError(
        err.response?.data?.message ||
          "Unable to add this product to your cart.",
      );
    } finally {
      setAddingToCart(false);
    }
  }

  // Previous image
  function showPreviousImage() {
    setSelectedImage((previous) =>
      previous === 0 ? images.length - 1 : previous - 1,
    );

    setImageFailed(false);
  }

  // Next image
  function showNextImage() {
    setSelectedImage((previous) =>
      previous === images.length - 1 ? 0 : previous + 1,
    );

    setImageFailed(false);
  }

  // Select thumbnail
  function handleImageSelect(index) {
    setSelectedImage(index);
    setImageFailed(false);
  }

  // Loading screen
  if (loading) {
    return (
      <main className="p-16 text-center text-slate-500">
        Loading product details...
      </main>
    );
  }

  // Product not available
  if (error || !product || product.isActive === false) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Product not available</h1>

        <p className="mt-3 text-slate-500">
          {error || "This product is currently unavailable."}
        </p>

        <Link
          to="/products"
          className="mt-6 inline-block font-semibold text-brand-700 hover:underline"
        >
          ← Back to products
        </Link>
      </main>
    );
  }

  const inStock = Number(product.stock) > 0;
  const currentImage = images[selectedImage];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back to Products */}

      <Link
        to="/products"
        className="text-sm font-semibold text-brand-700 hover:underline"
      >
        ← Back to products
      </Link>

      {/* PRODUCT SECTION */}

      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
        {/* IMAGE + PRODUCT INFORMATION */}

        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 md:gap-12">
          {/* LEFT: PRODUCT IMAGE GALLERY */}

          <div className="w-full">
            {/* Main Image */}

            <div className="relative flex h-[320px] items-center justify-center overflow-hidden rounded-2xl bg-slate-50 p-5 sm:h-[420px]">
              {currentImage && !imageFailed ? (
                <img
                  src={currentImage}
                  alt={product.name}
                  onError={() => setImageFailed(true)}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  Image unavailable
                </div>
              )}

              {/* Previous and Next Buttons */}

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={showPreviousImage}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white px-4 py-2 text-xl shadow hover:bg-slate-100"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={showNextImage}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white px-4 py-2 text-xl shadow hover:bg-slate-100"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Images */}

            {images.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => handleImageSelect(index)}
                    aria-label={`View product image ${index + 1}`}
                    aria-pressed={selectedImage === index}
                    className={`h-20 w-20 overflow-hidden rounded-xl border-2 p-1 transition ${
                      selectedImage === index
                        ? "border-teal-700 ring-2 ring-teal-100"
                        : "border-slate-200 hover:border-teal-400"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="h-full w-full rounded-lg object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {images.length > 1 && (
              <p className="mt-2 text-sm text-slate-500">
                Image {selectedImage + 1} of {images.length}
              </p>
            )}
          </div>

          {/* RIGHT: PRODUCT INFORMATION */}

          <div className="flex flex-col items-start pt-1">
            {/* Category */}

            <p className="text-sm font-bold uppercase tracking-wider text-brand-700">
              {product.category || "Product"}
            </p>

            {/* Product Name */}

            <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              {product.name}
            </h1>

            {/* Brand */}

            {product.brand && (
              <p className="mt-2 text-slate-500">Brand: {product.brand}</p>
            )}

            {/* Rating */}

            <div className="mt-4 flex items-center gap-2">
              <span className="font-semibold text-amber-600">
                ★ {Number(product.averageRating || 0).toFixed(1)}
              </span>

              <span className="text-sm text-slate-500">
                ({product.reviewCount || 0} reviews)
              </span>
            </div>

            {/* Price */}

            <p className="mt-6 text-3xl font-extrabold text-slate-900">
              ₹{Number(product.price || 0).toLocaleString("en-IN")}
            </p>

            {/* Stock Status */}

            <p
              className={`mt-3 text-sm font-semibold ${
                inStock ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {inStock
                ? `${product.stock} available`
                : "Currently out of stock"}
            </p>

            {/* Description */}

            <div className="mt-4 text-md leading-6 text-gray-600 whitespace-pre-wrap break-words">
              {product.description}
            </div>

            {/* Add to Cart */}

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={addingToCart || !inStock}
              className="mt-6 w-full rounded-xl bg-teal-700 px-6 py-3.5 font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {!inStock
                ? "Out of stock"
                : addingToCart
                  ? "Adding..."
                  : "Add to cart"}
            </button>

            {/* Cart Success Message */}

            {cartMessage && (
              <p role="status" className="mt-3 text-sm text-emerald-700">
                {cartMessage}{" "}
                <Link to="/cart" className="font-semibold underline">
                  View cart
                </Link>
              </p>
            )}

            {/* Cart Error Message */}

            {cartError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {cartError}
              </p>
            )}

            {/* Sign In */}

            {!isAuthenticated && (
              <div className="mt-6">
                <Link
                  to="/login"
                  className="inline-flex rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
                >
                  Sign in to shop
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* SIMILAR PRODUCTS - SAME SUBCATEGORY */}
        <section className="mt-10 border-t border-slate-200 pt-8">
          <div className="mb-6">
            <p className="text-sm font-bold uppercase tracking-wider text-teal-700">
              Explore more
            </p>

            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
              You May Also Like
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Discover products from the subcategory.
            </p>
          </div>

          {similarLoading && (
            <p className="py-8 text-center text-slate-500">
              Finding similar products...
            </p>
          )}

          {!similarLoading && similarError && (
            <p className="py-8 text-center text-slate-500">{similarError}</p>
          )}

          {!similarLoading && !similarError && similarProducts.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {similarProducts.map((item) => (
                <ProductCard key={item._id || item.id} product={item} />
              ))}
            </div>
          )}

          {!similarLoading && !similarError && similarProducts.length === 0 && (
            <p className="py-8 text-center text-slate-500">
              No similar products available in this subcategory yet.
            </p>
          )}
        </section>

        {/* AI POWERED RECOMMENDATIONS */}
        <section className="mt-10 border-t border-slate-200 pt-8">
          <div className="mb-6">
            <p className="text-sm font-bold uppercase tracking-wider text-teal-700">
              AI Powered
            </p>

            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
              AI Recommended for You
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Discover smart product recommendations powered by our hybrid AI system.
            </p>
          </div>

          {recommendationsLoading && (
            <p className="py-8 text-center text-slate-500">
              Finding recommendations for you...
            </p>
          )}

          {!recommendationsLoading && recommendationsError && (
            <p className="py-8 text-center text-slate-500">
              {recommendationsError}
            </p>
          )}

          {!recommendationsLoading &&
            !recommendationsError &&
            recommendations.length > 0 && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recommendations.map((item) => (
                  <ProductCard key={item._id || item.id} product={item} />
                ))}
              </div>
            )}

          {!recommendationsLoading &&
            !recommendationsError &&
            recommendations.length === 0 && (
              <p className="py-8 text-center text-slate-500">
                No recommendations available yet.
              </p>
            )}
        </section>

        {/* CUSTOMER REVIEWS */}
        <section className="mt-10 border-t border-slate-200 pt-8">
          <ProductReviews productId={id} />
        </section>
      </div>
    </main>
  );
}
