import { useEffect, useState } from "react";
import { getAllOrders, updateOrderStatus } from "../api/orders";

const nextStatuses = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  pending_payment: [],
  payment_declined: [],
};

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAllOrders();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusUpdate = async (orderId, status) => {
    const confirmed = window.confirm(
      `Are you sure you want to change this order to ${status}?`,
    );

    if (!confirmed) return;

    try {
      setUpdatingId(orderId);

      await updateOrderStatus(orderId, status);
      await fetchOrders();

      alert("Order status updated successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Unable to update order status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getPaymentMethod = (order) => {
    if (order.paymentMethod === "COD") {
      return "Cash on Delivery (COD)";
    }

    if (order.paymentMethod === "Razorpay") {
      const method = order.paymentDetails?.method;

      if (method === "card") {
        return "Card (Razorpay)";
      }

      if (method === "netbanking") {
        return "Net Banking (Razorpay)";
      }

      return order.paymentStatus === "pending"
        ? "Razorpay (Payment Pending)"
        : "Razorpay";
    }

    return order.paymentMethod || "Not available";
  };

  const getPaymentStatusLabel = (status) => {
    if (status === "failed" || status === "cancelled")
      return "Payment Declined";
    if (status === "pending") return "Payment Pending";
    return status || "Unknown";
  };

  const getPaymentStatusStyle = (status) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700";

      case "pending":
        return "bg-yellow-100 text-yellow-700";

      case "failed":
        return "bg-red-100 text-red-700";

      case "refunded":
        return "bg-purple-100 text-purple-700";

      case "cancelled":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return <div className="p-6">Loading orders...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>

        <button
          onClick={fetchOrders}
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Manage Orders</h1>

            <p className="text-gray-500">View and manage customer orders</p>
          </div>

          <button
            onClick={fetchOrders}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Refresh Orders
          </button>
        </div>

        <div className="mb-6 rounded-lg bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Total Orders</p>

          <h2 className="text-3xl font-bold text-gray-800">{orders.length}</h2>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-500">No customer orders found.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => {
              const availableStatuses = nextStatuses[order.status] || [];

              const isRazorpayUnpaid =
                order.paymentMethod === "Razorpay" &&
                order.paymentStatus !== "paid";

              const isDeclined = order.status === "payment_declined";

              return (
                <div key={order._id} className="rounded-xl bg-white p-5 shadow">
                  <div className="flex flex-wrap justify-between gap-3 border-b pb-4">
                    <div>
                      <h2 className="font-semibold text-gray-800">
                        Order #{order._id}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString()
                          : "Date unavailable"}
                      </p>
                    </div>

                    <span
                      className={`h-fit rounded-full px-3 py-1 text-sm font-medium capitalize ${
                        isDeclined
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {isDeclined
                        ? "Payment Declined"
                        : order.status?.replaceAll("_", " ") || "Unknown"}
                    </span>
                  </div>

                  <div className="py-4">
                    <h3 className="mb-2 font-semibold text-gray-700">
                      Customer Details
                    </h3>

                    <p className="text-sm text-gray-600">
                      Name: {order.user?.name || "Unknown"}
                    </p>

                    <p className="text-sm text-gray-600">
                      Email: {order.user?.email || "Unknown"}
                    </p>
                  </div>

                  <div className="border-t py-4">
                    <h3 className="mb-3 font-semibold text-gray-700">
                      Payment Information
                    </h3>

                    <div className="space-y-3 rounded-lg bg-gray-50 p-4">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="text-sm text-gray-600">
                          Payment Method
                        </span>

                        <span className="text-sm font-semibold text-gray-800">
                          {getPaymentMethod(order)}
                        </span>
                      </div>

                      {order.paymentDetails?.method === "card" && (
                        <div className="border-t pt-3">
                          <p className="text-sm text-gray-600">
                            Card Network:{" "}
                            <span className="font-semibold text-gray-800">
                              {order.paymentDetails.cardNetwork ||
                                "Not available"}
                            </span>
                          </p>

                          <p className="mt-1 text-sm text-gray-600">
                            Card Type:{" "}
                            <span className="font-semibold text-gray-800">
                              {order.paymentDetails.cardType || "Not available"}
                            </span>
                          </p>

                          <p className="mt-1 text-sm text-gray-600">
                            Card Number:{" "}
                            <span className="font-semibold text-gray-800">
                              **** **** ****{" "}
                              {order.paymentDetails.cardLast4 || "****"}
                            </span>
                          </p>
                        </div>
                      )}

                      {order.paymentDetails?.method === "netbanking" && (
                        <div className="border-t pt-3">
                          <p className="text-sm text-gray-600">
                            Bank:{" "}
                            <span className="font-semibold text-gray-800">
                              {order.paymentDetails.bank || "Not available"}
                            </span>
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm text-gray-600">
                          Payment Status
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getPaymentStatusStyle(
                            order.paymentStatus,
                          )}`}
                        >
                          {getPaymentStatusLabel(order.paymentStatus)}
                        </span>
                      </div>

                      {order.razorpayPaymentId && (
                        <div className="border-t pt-3">
                          <p className="text-sm text-gray-600">
                            Razorpay Payment ID
                          </p>

                          <p className="mt-1 break-all text-xs font-medium text-gray-800">
                            {order.razorpayPaymentId}
                          </p>
                        </div>
                      )}

                      {isRazorpayUnpaid && (
                        <p
                          className={`border-t pt-3 text-sm ${
                            isDeclined ? "text-red-700" : "text-amber-700"
                          }`}
                        >
                          {isDeclined
                            ? "Payment was declined or cancelled. Do not process or ship this order."
                            : "Payment has not been confirmed. Do not process or ship this order until payment is verified."}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t py-4">
                    <h3 className="mb-3 font-semibold text-gray-700">
                      Ordered Products
                    </h3>

                    {order.items?.length > 0 ? (
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div
                            key={item._id || index}
                            className="flex flex-wrap justify-between gap-2 rounded-lg bg-gray-50 p-3 text-sm"
                          >
                            <span className="font-medium text-gray-800">
                              {item.product?.name || item.name || "Product"}
                            </span>

                            <div className="flex flex-wrap gap-4 text-gray-600">
                              <span>
                                ₹{Number(item.price).toLocaleString("en-IN")} ×{" "}
                                {item.quantity}
                              </span>

                              <span>Qty: {item.quantity}</span>

                              <span className="font-semibold text-gray-800">
                                ₹
                                {(
                                  Number(item.price) * Number(item.quantity)
                                ).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Product details unavailable.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between border-t py-4">
                    <span className="font-semibold text-gray-700">
                      Total Amount
                    </span>

                    <span className="font-bold text-gray-900">
                      ₹{Number(order.total ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="mb-3 font-semibold text-gray-700">
                      Update Order Status
                    </h3>

                    {isDeclined ? (
                      <p className="text-sm text-red-700">
                        Payment declined. No further status updates are
                        possible.
                      </p>
                    ) : isRazorpayUnpaid ? (
                      <p className="text-sm text-amber-700">
                        Order status updates are disabled until Razorpay payment
                        is confirmed.
                      </p>
                    ) : availableStatuses.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {availableStatuses.map((status) => (
                          <button
                            key={status}
                            disabled={updatingId === order._id}
                            onClick={() =>
                              handleStatusUpdate(order._id, status)
                            }
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm capitalize text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {updatingId === order._id ? "Updating..." : status}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        This order has reached its final status.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminOrders;
