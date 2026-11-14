import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCart, updateCartItem, removeCartItem } from "../api/cart";

function getItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.cart?.items)) return data.cart.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return [];
}

function getProduct(item) {
  return item.product && typeof item.product === "object" ? item.product : item;
}

function getProductId(item) {
  const product = getProduct(item);
  return product._id || product.id || item.productId;
}

function getQuantity(item) {
  return Number(item.quantity) || 1;
}

function getPrice(item) {
  const product = getProduct(item);
  return Number(item.price ?? product.price ?? 0);
}

function getName(item) {
  const product = getProduct(item);
  return product.name || item.name || "Product";
}

function getImage(item) {
  const product = getProduct(item);
  return product.imageUrl || item.imageUrl || "";
}

function getStock(item) {
  const product = getProduct(item);
  return product.stock;
}

export default function Cart() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getCart();
      setItems(getItems(data));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your cart. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  async function changeQuantity(item, newQuantity) {
    const productId = getProductId(item);
    const stock = getStock(item);

    if (!productId) {
      setError("This cart item has no product ID.");
      return;
    }

    if (!Number.isInteger(newQuantity) || newQuantity < 1) {
      setError("Quantity must be at least 1.");
      return;
    }

    if (stock != null && newQuantity > Number(stock)) {
      setError(`Only ${stock} units are available.`);
      return;
    }

    setBusyId(productId);
    setError("");

    try {
      await updateCartItem(productId, newQuantity);
      await loadCart();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update quantity.");
    } finally {
      setBusyId("");
    }
  }

  async function removeItem(item) {
    const productId = getProductId(item);

    if (!productId) {
      setError("This cart item has no product ID.");
      return;
    }

    setBusyId(productId);
    setError("");

    try {
      await removeCartItem(productId);
      await loadCart();
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove this product.");
    } finally {
      setBusyId("");
    }
  }

  const subtotal = items.reduce(
    (sum, item) => sum + getPrice(item) * getQuantity(item),
    0,
  );

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-slate-500">Loading your cart...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/products"
          className="text-sm font-semibold text-teal-700 hover:underline"
        >
          ← Continue shopping
        </Link>

        <div className="mt-5">
          <p className="text-sm font-bold uppercase tracking-widest text-teal-700">
            Your selections
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Shopping cart
          </h1>

          <p className="mt-2 text-slate-500">
            {items.length} {items.length === 1 ? "item" : "items"} in your cart
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={loadCart}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="text-5xl" aria-hidden="true">
              🛒
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              Your cart is empty
            </h2>

            <p className="mt-2 text-slate-500">
              Find something you love and add it to your cart.
            </p>

            <Link
              to="/products"
              className="mt-6 inline-flex rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white hover:bg-teal-800"
            >
              Explore products
            </Link>
          </section>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
            {/* Cart items */}
            <section className="space-y-4">
              {items.map((item) => {
                const id = getProductId(item);
                const quantity = getQuantity(item);
                const price = getPrice(item);
                const stock = getStock(item);
                const isBusy = busyId === id;

                return (
                  <article
                    key={id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-5"
                  >
                    <Link
                      to={`/products/${id}`}
                      className="flex h-32 w-full shrink-0 items-center justify-center rounded-xl bg-slate-50 p-3 sm:w-32"
                    >
                      {getImage(item) ? (
                        <img
                          src={getImage(item)}
                          alt={getName(item)}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-sm text-slate-400">No image</span>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/products/${id}`}
                        className="font-bold text-slate-900 hover:text-teal-700"
                      >
                        {getName(item)}
                      </Link>

                      <p className="mt-2 text-lg font-extrabold text-slate-900">
                        ₹{price.toLocaleString("en-IN")}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Line total: ₹
                        {(price * quantity).toLocaleString("en-IN")}
                      </p>

                      {stock != null && (
                        <p className="mt-1 text-xs text-slate-500">
                          {stock} available
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-4">
                        <div className="flex items-center rounded-lg border border-slate-300">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${getName(item)}`}
                            disabled={isBusy || quantity <= 1}
                            onClick={() => changeQuantity(item, quantity - 1)}
                            className="px-3 py-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                          >
                            −
                          </button>

                          <span className="min-w-10 text-center text-sm font-semibold">
                            {isBusy ? "…" : quantity}
                          </span>

                          <button
                            type="button"
                            aria-label={`Increase quantity of ${getName(item)}`}
                            disabled={
                              isBusy ||
                              (stock != null && quantity >= Number(stock))
                            }
                            onClick={() => changeQuantity(item, quantity + 1)}
                            className="px-3 py-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => removeItem(item)}
                          className="text-sm font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            {/* Order summary */}
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-xl font-bold text-slate-900">
                Order summary
              </h2>

              <div className="mt-6 flex justify-between gap-4 text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="mt-3 flex justify-between gap-4 text-sm text-slate-600">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>

              <div className="my-5 border-t border-slate-200" />

              <div className="flex justify-between gap-4">
                <span className="font-bold text-slate-900">Subtotal</span>
                <span className="text-xl font-extrabold text-teal-800">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate("/checkout")}
                className="mt-6 w-full rounded-xl bg-teal-700 px-5 py-3.5 font-bold text-white transition hover:bg-teal-800"
              >
                Proceed to checkout
              </button>

              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                Final prices and stock will be verified by the server when you
                place your order.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
