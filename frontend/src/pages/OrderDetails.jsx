import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMyOrders } from "../api/orders";

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "Unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function getPaymentLabel(paymentStatus) {
  if (paymentStatus === "paid") return "Paid";

  if (paymentStatus === "failed" || paymentStatus === "cancelled") {
    return "Payment Declined";
  }

  if (paymentStatus === "pending") return "Payment Pending";
  if (paymentStatus === "refunded") return "Refunded";

  return paymentStatus || "Not specified";
}

function getDisplayStatus(order) {
  const paymentMethod = String(order.paymentMethod || "").toLowerCase();

  if (
    order.status === "payment_declined" ||
    (paymentMethod === "razorpay" &&
      ["failed", "cancelled"].includes(order.paymentStatus))
  ) {
    return "payment_declined";
  }

  return order.status || "placed";
}

function getStatusLabel(status) {
  if (status === "payment_declined") return "Payment Declined";

  return String(status || "placed").replaceAll("_", " ");
}

function getPaymentMethodLabel(paymentDetails) {
  if (paymentDetails?.method === "card") {
    return "Credit / Debit Card";
  }

  if (paymentDetails?.method === "netbanking") {
    return "Netbanking";
  }

  return "Not available";
}

export default function OrderDetails() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      setLoading(true);
      setError("");

      try {
        const data = await getMyOrders();

        const customerOrders = Array.isArray(data.orders) ? data.orders : [];

        const found = customerOrders.find((item) => item._id === orderId);

        if (!cancelled) {
          setOrder(found || null);

          if (!found) {
            setError("This order could not be found in your order history.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load order details. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-slate-600">
        Loading order details...
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <section className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Order not found
          </h1>

          <p role="alert" className="mt-3 text-slate-600">
            {error || "We couldn't find this order."}
          </p>

          <Link
            to="/orders"
            className="mt-6 inline-flex rounded-xl bg-teal-700 px-5 py-3 font-bold text-white"
          >
            Back to my orders
          </Link>
        </section>
      </main>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const address = order.shippingAddress || {};
  const paymentDetails = order.paymentDetails || {};

  const displayStatus = getDisplayStatus(order);
  const isPaymentDeclined = displayStatus === "payment_declined";

  const paymentLabel = getPaymentLabel(order.paymentStatus);

  const isRazorpay = order.paymentMethod === "Razorpay";
  const isCard = paymentDetails.method === "card";
  const isNetbanking = paymentDetails.method === "netbanking";

  const statusStyles = {
    payment_declined: "bg-red-50 text-red-800",
    placed: "bg-teal-50 text-teal-800",
    pending_payment: "bg-yellow-50 text-yellow-800",
    confirmed: "bg-blue-50 text-blue-800",
    shipped: "bg-indigo-50 text-indigo-800",
    delivered: "bg-emerald-50 text-emerald-800",
    cancelled: "bg-red-50 text-red-800",
    failed: "bg-red-50 text-red-800",
  };

  const paymentStyles = {
    paid: "text-emerald-700",
    pending: "text-yellow-700",
    failed: "text-red-700",
    cancelled: "text-red-700",
    refunded: "text-blue-700",
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/orders"
          className="text-sm font-semibold text-teal-700 hover:underline"
        >
          ← Back to my orders
        </Link>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-teal-700">
                Order details
              </p>

              <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
                Your order
              </h1>

              <p className="mt-3 break-all font-mono text-sm text-slate-600">
                ID: {order._id}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Created on {formatDate(order.createdAt)}
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-4 py-2 text-sm font-bold capitalize ${
                statusStyles[displayStatus] || "bg-slate-100 text-slate-700"
              }`}
            >
              {getStatusLabel(displayStatus)}
            </span>
          </div>

          {isPaymentDeclined && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4"
            >
              <h2 className="font-bold text-red-900">Payment Declined</h2>

              <p className="mt-2 text-sm leading-6 text-red-800">
                Your Razorpay payment was unsuccessful or checkout was closed
                before payment was completed. This order has not been confirmed.
                You can return to your cart and try placing a new order.
              </p>

              <Link
                to="/cart"
                className="mt-4 inline-flex rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
              >
                Return to cart
              </Link>
            </div>
          )}

          {isRazorpay && order.paymentStatus === "pending" && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4"
            >
              <h2 className="font-bold text-yellow-900">Payment is pending</h2>

              <p className="mt-2 text-sm leading-6 text-yellow-800">
                Your payment has not yet been confirmed. Please check your
                payment status before attempting another payment.
              </p>
            </div>
          )}

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <section className="rounded-xl bg-slate-50 p-5">
              <h2 className="font-bold text-slate-900">Delivery address</h2>

              <div className="mt-3 space-y-1 text-sm leading-6 text-slate-600">
                <p className="font-semibold text-slate-800">
                  {address.fullName || "Not provided"}
                </p>

                <p>{address.addressLine}</p>

                <p>
                  {[address.city, address.postalCode]
                    .filter(Boolean)
                    .join(" - ")}
                </p>

                {address.phone && <p>Phone: {address.phone}</p>}
              </div>
            </section>

            <section className="rounded-xl bg-slate-50 p-5">
              <h2 className="font-bold text-slate-900">Payment information</h2>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Payment provider</p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {order.paymentMethod === "COD"
                      ? "Cash on Delivery"
                      : order.paymentMethod || "Not specified"}
                  </p>
                </div>

                {isRazorpay && (
                  <>
                    <div>
                      <p className="text-sm text-slate-500">Payment type</p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {getPaymentMethodLabel(paymentDetails)}
                      </p>
                    </div>

                    {isCard && (
                      <>
                        <div>
                          <p className="text-sm text-slate-500">Card network</p>

                          <p className="mt-1 font-semibold capitalize text-slate-900">
                            {paymentDetails.cardNetwork || "Not available"}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-500">Card type</p>

                          <p className="mt-1 font-semibold capitalize text-slate-900">
                            {paymentDetails.cardType || "Not available"}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-500">Card number</p>

                          <p className="mt-1 font-semibold text-slate-900">
                            {paymentDetails.cardLast4
                              ? `**** **** **** ${paymentDetails.cardLast4}`
                              : "Not available"}
                          </p>
                        </div>
                      </>
                    )}

                    {isNetbanking && (
                      <div>
                        <p className="text-sm text-slate-500">Bank</p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {paymentDetails.bank || "Not available"}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="border-t border-slate-200 pt-3">
                  <p className="text-sm text-slate-500">Payment status</p>

                  <p
                    className={`mt-1 font-bold ${
                      paymentStyles[order.paymentStatus] || "text-slate-700"
                    }`}
                  >
                    {paymentLabel}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-bold text-slate-900">
              Items in this order
            </h2>

            <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {items.map((item, index) => (
                <div
                  key={`${
                    item.product?._id || item.product || item.name
                  }-${index}`}
                  className="flex items-start justify-between gap-4 p-4 sm:p-5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">
                      {item.name || item.product?.name || "Product"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Quantity: {item.quantity}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Unit price: {money(item.price)}
                    </p>
                  </div>

                  <p className="shrink-0 font-bold text-slate-900">
                    {money(Number(item.price) * Number(item.quantity))}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="ml-auto mt-6 max-w-sm space-y-3 rounded-xl bg-slate-50 p-5">
            <div className="flex justify-between gap-4 text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{money(order.subtotal)}</span>
            </div>

            <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
              <span className="font-bold text-slate-900">Total</span>

              <span className="text-xl font-extrabold text-teal-800">
                {money(order.total)}
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
