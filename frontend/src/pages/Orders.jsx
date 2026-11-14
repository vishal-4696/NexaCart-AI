import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyOrders } from "../api/orders";

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function getDisplayStatus(order) {
  if (
    order.paymentMethod === "Razorpay" &&
    order.paymentStatus === "pending" &&
    ["placed", "pending_payment"].includes(order.status)
  ) {
    return "payment_declined";
  }

  return order.status || "placed";
}

function statusStyle(status) {
  switch ((status || "").toLowerCase()) {
    case "delivered":
      return "bg-emerald-100 text-emerald-800";

    case "shipped":
      return "bg-blue-100 text-blue-800";

    case "confirmed":
      return "bg-indigo-100 text-indigo-800";

    case "cancelled":
    case "failed":
    case "payment_declined":
      return "bg-red-100 text-red-800";

    default:
      return "bg-amber-100 text-amber-800";
  }
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getMyOrders();

      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load your orders. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-5xl text-slate-600">
          Loading your orders...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/products"
          className="text-sm font-semibold text-teal-700 hover:underline"
        >
          ← Continue shopping
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-teal-700">
              Your purchases
            </p>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              My Orders
            </h1>

            <p className="mt-2 text-slate-500">
              View your purchases and track their status.
            </p>
          </div>

          <button
            type="button"
            onClick={loadOrders}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Refresh orders
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={loadOrders}
              className="mt-2 font-bold underline"
            >
              Try again
            </button>
          </div>
        )}

        {!error && orders.length === 0 && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <div className="text-5xl">📦</div>

            <h2 className="mt-4 text-xl font-bold text-slate-900">
              No orders yet
            </h2>

            <p className="mt-2 text-slate-500">
              Your completed checkouts will appear here.
            </p>

            <Link
              to="/products"
              className="mt-6 inline-flex rounded-xl bg-teal-700 px-6 py-3 font-bold text-white hover:bg-teal-800"
            >
              Explore products
            </Link>
          </section>
        )}

        <div className="mt-8 space-y-5">
          {orders.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const displayStatus = getDisplayStatus(order);

            return (
              <article
                key={order._id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Order ID
                    </p>

                    <p className="mt-1 break-all font-mono text-sm font-bold text-slate-900">
                      {order._id}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Placed {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusStyle(
                      displayStatus,
                    )}`}
                  >
                    {displayStatus === "payment_declined"
                      ? "Payment Declined"
                      : displayStatus.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="py-5">
                  <p className="mb-3 text-sm font-semibold text-slate-700">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </p>

                  <div className="space-y-3">
                    {items.slice(0, 3).map((item, index) => (
                      <div
                        key={`${item.product?._id || item.product || item.name}-${index}`}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {item.name || item.product?.name || "Product"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Quantity: {item.quantity}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm text-slate-700">
                          {money(Number(item.price) * Number(item.quantity))}
                        </p>
                      </div>
                    ))}

                    {items.length > 3 && (
                      <p className="text-sm text-slate-500">
                        And {items.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm text-slate-500">Order total</p>

                    <p className="mt-1 text-xl font-extrabold text-slate-900">
                      {money(order.total)}
                    </p>
                  </div>

                  <Link
                    to={`/orders/${order._id}`}
                    state={{ order }}
                    className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-800"
                  >
                    View order details →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
