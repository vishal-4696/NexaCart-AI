import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCart } from "../api/cart";
import api from "../api/axios";

const initialAddress = {
  fullName: "",
  addressLine: "",
  city: "",
  postalCode: "",
  phone: "",
};

function extractItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.cart?.items)) return data.cart.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return [];
}

function productOf(item) {
  return item.product && typeof item.product === "object" ? item.product : item;
}

function productName(item) {
  return productOf(item).name || item.name || "Product";
}

function productImage(item) {
  return productOf(item).imageUrl || item.imageUrl || "";
}

function productPrice(item) {
  return Number(item.price ?? productOf(item).price ?? 0);
}

function itemQuantity(item) {
  return Number(item.quantity) || 1;
}

function validateAddress(address) {
  const errors = {};

  if (address.fullName.trim().length < 2) {
    errors.fullName = "Enter your full name.";
  }

  if (address.addressLine.trim().length < 5) {
    errors.addressLine = "Enter a complete street address.";
  }

  if (address.city.trim().length < 2) {
    errors.city = "Enter your city.";
  }

  if (!/^[1-9][0-9]{5}$/.test(address.postalCode.trim())) {
    errors.postalCode = "Enter a valid 6-digit PIN code.";
  }

  if (!/^(?:\+91[\s-]?)?[6-9]\d{9}$/.test(address.phone.trim())) {
    errors.phone = "Enter a valid 10-digit Indian mobile number.";
  }

  return errors;
}

function money(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");

    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

const banks = [
  {
    name: "State Bank of India",
    shortName: "SBI",
    domain: "onlinesbi.sbi",
  },
  {
    name: "HDFC Bank",
    shortName: "HDFC",
    domain: "hdfcbank.com",
  },
  {
    name: "ICICI Bank",
    shortName: "ICICI",
    domain: "icicibank.com",
  },
  {
    name: "Axis Bank",
    shortName: "AXIS",
    domain: "axisbank.com",
  },
  {
    name: "Kotak Mahindra Bank",
    shortName: "KOTAK",
    domain: "kotak.com",
  },
];

export default function Checkout() {
  const [address, setAddress] = useState(initialAddress);
  const [fieldErrors, setFieldErrors] = useState({});
  const [items, setItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [order, setOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [declinedOrder, setDeclinedOrder] = useState(null);

  const loadCart = useCallback(async () => {
    setLoadingCart(true);
    setPageError("");

    try {
      const response = await getCart();
      setItems(extractItems(response));
    } catch (err) {
      setPageError(
        err.response?.data?.message ||
          "Could not load your cart. Please try again.",
      );
    } finally {
      setLoadingCart(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  function handleChange(event) {
    const { name, value } = event.target;

    setAddress((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setPageError("");
  }

  async function handleCODOrder(shippingAddress) {
    const response = await api.post("/orders", {
      shippingAddress,
    });

    const data = response.data;
    const createdOrder = data.order || data.data?.order;

    if (!data.success || !createdOrder?._id) {
      throw new Error(data.message || "Unable to place your COD order.");
    }

    setOrder(createdOrder);
    setItems([]);
  }

  async function updateCheckoutStatus(razorpayOrderId) {
    const response = await api.post("/orders/razorpay/checkout-status", {
      razorpay_order_id: razorpayOrderId,
    });

    return response.data;
  }

  async function handleRazorpayPayment(shippingAddress) {
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded) {
      throw new Error(
        "Unable to load Razorpay Checkout. Check your internet connection.",
      );
    }

    const orderResponse = await api.post("/orders/razorpay/create-order", {
      shippingAddress,
    });

    const razorpayOrder = orderResponse.data;

    if (
      !razorpayOrder.success ||
      !razorpayOrder.razorpayOrderId ||
      !razorpayOrder.keyId
    ) {
      throw new Error(
        razorpayOrder.message || "Unable to create payment order.",
      );
    }

    return new Promise((resolve, reject) => {
      let paymentHandled = false;

      const options = {
        key: razorpayOrder.keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "NexaCart AI",
        description: "Secure Payment - Cards & Netbanking",
        order_id: razorpayOrder.razorpayOrderId,

        prefill: {
          name: shippingAddress.fullName,
          contact: shippingAddress.phone,
        },

        theme: {
          color: "#0f766e",
        },

        config: {
          display: {
            blocks: {
              cards: {
                name: "Cards",
                instruments: [
                  {
                    method: "card",
                  },
                ],
              },

              netbanking: {
                name: "Netbanking",
                instruments: [
                  {
                    method: "netbanking",
                  },
                ],
              },
            },

            sequence: ["block.cards", "block.netbanking"],

            preferences: {
              show_default_blocks: false,
            },
          },
        },

        handler: async function (paymentResponse) {
          if (paymentHandled) return;

          paymentHandled = true;

          try {
            const verificationResponse = await api.post(
              "/orders/razorpay/verify-payment",
              {
                razorpay_order_id: paymentResponse.razorpay_order_id,

                razorpay_payment_id: paymentResponse.razorpay_payment_id,

                razorpay_signature: paymentResponse.razorpay_signature,
              },
            );

            const verificationData = verificationResponse.data;

            if (!verificationData.success || !verificationData.order?._id) {
              throw new Error(
                verificationData.message || "Payment verification failed.",
              );
            }

            resolve(verificationData.order);
          } catch (error) {
            reject(
              new Error(
                error.response?.data?.message ||
                  error.message ||
                  "Payment verification failed.",
              ),
            );
          }
        },

        modal: {
          ondismiss: async function () {
            if (paymentHandled) return;

            paymentHandled = true;

            try {
              const result = await updateCheckoutStatus(
                razorpayOrder.razorpayOrderId,
              );

              setDeclinedOrder(
                result.order || {
                  _id: razorpayOrder.orderId,
                  status: "payment_declined",
                  paymentStatus: "failed",
                  total: razorpayOrder.amount / 100,
                },
              );

              reject(
                new Error(
                  "Payment Declined. The payment window was closed. You can try again.",
                ),
              );
            } catch (error) {
              console.error(
                "Checkout dismissal update failed:",
                error.response?.data || error.message,
              );

              reject(
                new Error(
                  error.response?.data?.message ||
                    "Payment window closed, but the payment status could not be updated. Please check My Orders.",
                ),
              );
            }
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.open();
    }).then((verifiedOrder) => {
      setOrder(verifiedOrder);
      setItems([]);
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) return;

    const errors = validateAddress(address);

    setFieldErrors(errors);
    setPageError("");
    setDeclinedOrder(null);

    if (Object.keys(errors).length > 0) {
      setPageError("Please correct the highlighted fields.");
      return;
    }

    if (items.length === 0) {
      setPageError("Your cart is empty.");
      return;
    }

    setSubmitting(true);

    const shippingAddress = {
      fullName: address.fullName.trim(),
      addressLine: address.addressLine.trim(),
      city: address.city.trim(),
      postalCode: address.postalCode.trim(),
      phone: address.phone.trim(),
    };

    try {
      if (paymentMethod === "COD") {
        await handleCODOrder(shippingAddress);
      } else if (paymentMethod === "Razorpay") {
        await handleRazorpayPayment(shippingAddress);
      }
    } catch (err) {
      setPageError(
        err.response?.data?.message ||
          err.message ||
          "Unable to complete your order.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (declinedOrder) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <section className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-4xl font-bold text-red-700">
            ×
          </div>

          <p className="mt-6 text-sm font-bold uppercase tracking-widest text-red-700">
            Payment unsuccessful
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
            Payment Declined
          </h1>

          <p className="mt-3 leading-7 text-slate-600">
            Your card payment was unsuccessful or the payment window was closed.
            Your order has not been confirmed. You can try placing a new order.
          </p>

          <div className="mt-7 rounded-2xl bg-slate-50 p-5 text-left">
            <p className="text-sm text-slate-500">Order ID</p>

            <p className="mt-1 break-all font-mono text-sm font-bold text-slate-900">
              {declinedOrder._id}
            </p>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-500">Order status</p>

              <p className="mt-1 font-bold text-red-700">Payment Declined</p>
            </div>

            <div className="mt-4">
              <p className="text-sm text-slate-500">Payment status</p>

              <p className="mt-1 font-bold text-red-700">Payment Declined</p>
            </div>

            <div className="mt-4">
              <p className="text-sm text-slate-500">Order total</p>

              <p className="mt-1 text-2xl font-extrabold text-slate-900">
                {money(declinedOrder.total)}
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/cart"
              className="rounded-xl bg-teal-700 px-6 py-3 font-bold text-white hover:bg-teal-800"
            >
              Return to cart
            </Link>

            <Link
              to="/orders"
              className="rounded-xl border border-slate-300 px-6 py-3 font-bold text-slate-700 hover:bg-slate-50"
            >
              View my orders
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (order) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl text-emerald-700">
            ✓
          </div>

          <p className="mt-6 text-sm font-bold uppercase tracking-widest text-emerald-700">
            Order confirmed
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
            Thank you for shopping!
          </h1>

          <p className="mt-3 leading-7 text-slate-600">
            Your order has been placed successfully. Keep your order ID for
            future reference.
          </p>

          <div className="mt-7 rounded-2xl bg-slate-50 p-5 text-left">
            <p className="text-sm text-slate-500">Order ID</p>

            <p className="mt-1 break-all font-mono text-sm font-bold text-slate-900">
              {order._id}
            </p>

            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(order._id)}
              className="mt-3 text-sm font-semibold text-teal-700 hover:underline"
            >
              Copy order ID
            </button>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-500">Order status</p>

              <p className="mt-1 font-semibold capitalize text-slate-900">
                {(order.status || "placed").replaceAll("_", " ")}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-sm text-slate-500">Payment method</p>

              <p className="mt-1 font-semibold text-slate-900">
                {order.paymentMethod === "COD"
                  ? "Cash on Delivery"
                  : "Razorpay - Cards & Netbanking"}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-sm text-slate-500">Payment status</p>

              <p className="mt-1 font-semibold text-slate-900">
                {order.paymentStatus === "paid"
                  ? "Paid"
                  : order.paymentStatus === "pending"
                    ? "Payment Pending"
                    : order.paymentStatus}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-sm text-slate-500">Order total</p>

              <p className="mt-1 text-2xl font-extrabold text-teal-800">
                {money(order.total)}
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/orders"
              className="rounded-xl bg-teal-700 px-6 py-3 font-bold text-white hover:bg-teal-800"
            >
              View my orders
            </Link>

            <Link
              to="/products"
              className="rounded-xl border border-slate-300 px-6 py-3 font-bold text-slate-700 hover:bg-slate-50"
            >
              Continue shopping
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const estimatedSubtotal = items.reduce(
    (sum, item) => sum + productPrice(item) * itemQuantity(item),
    0,
  );

  if (loadingCart) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-slate-500">Preparing checkout...</p>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <section className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Your cart is empty
          </h1>

          <p className="mt-2 text-slate-500">
            Add products to your cart before proceeding to checkout.
          </p>

          {pageError && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {pageError}
            </p>
          )}

          <Link
            to="/products"
            className="mt-6 inline-flex rounded-xl bg-teal-700 px-6 py-3 font-bold text-white hover:bg-teal-800"
          >
            Explore products
          </Link>
        </section>
      </main>
    );
  }

  const fields = [
    {
      name: "fullName",
      label: "Full name",
      placeholder: "Enter your full name",
      autoComplete: "name",
    },
    {
      name: "addressLine",
      label: "Street address",
      placeholder: "House number, street, area",
      autoComplete: "street-address",
    },
    {
      name: "city",
      label: "City",
      placeholder: "Enter your city",
      autoComplete: "address-level2",
    },
    {
      name: "postalCode",
      label: "PIN code",
      placeholder: "600001",
      autoComplete: "postal-code",
      inputMode: "numeric",
      maxLength: 6,
    },
    {
      name: "phone",
      label: "Mobile number",
      placeholder: "9876543210",
      autoComplete: "tel",
      inputMode: "tel",
      maxLength: 14,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/cart"
          className="text-sm font-semibold text-teal-700 hover:underline"
        >
          ← Back to cart
        </Link>

        <div className="mt-5">
          <p className="text-sm font-bold uppercase tracking-widest text-teal-700">
            Almost there
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Checkout
          </h1>

          <p className="mt-2 text-slate-500">
            Enter your delivery details and select your payment method.
          </p>
        </div>

        {pageError && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {pageError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_360px]"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-xl font-bold text-slate-900">
              Shipping address
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              All fields are required.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {fields.map((field) => (
                <div
                  key={field.name}
                  className={
                    field.name === "addressLine" ? "sm:col-span-2" : ""
                  }
                >
                  <label
                    htmlFor={field.name}
                    className="block text-sm font-semibold text-slate-800"
                  >
                    {field.label}
                  </label>

                  <input
                    id={field.name}
                    name={field.name}
                    type="text"
                    value={address[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    autoComplete={field.autoComplete}
                    inputMode={field.inputMode}
                    maxLength={field.maxLength}
                    aria-invalid={Boolean(fieldErrors[field.name])}
                    aria-describedby={
                      fieldErrors[field.name]
                        ? `${field.name}-error`
                        : undefined
                    }
                    className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none transition focus:ring-2 ${
                      fieldErrors[field.name]
                        ? "border-red-400 focus:ring-red-100"
                        : "border-slate-300 focus:border-teal-600 focus:ring-teal-100"
                    }`}
                  />

                  {fieldErrors[field.name] && (
                    <p
                      id={`${field.name}-error`}
                      className="mt-1 text-sm text-red-600"
                    >
                      {fieldErrors[field.name]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-bold text-slate-900">
                Select payment method
              </h2>

              <div className="mt-4 space-y-3">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                    paymentMethod === "COD"
                      ? "border-teal-600 bg-teal-50"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")}
                    className="mt-1 h-4 w-4 accent-teal-700"
                  />

                  <span>
                    <span className="block font-bold text-slate-900">
                      Cash on Delivery
                    </span>

                    <span className="mt-1 block text-sm text-slate-500">
                      Pay cash when your order is delivered.
                    </span>
                  </span>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                    paymentMethod === "Razorpay"
                      ? "border-teal-600 bg-teal-50"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Razorpay"
                    checked={paymentMethod === "Razorpay"}
                    onChange={() => setPaymentMethod("Razorpay")}
                    className="mt-1 h-4 w-4 accent-teal-700"
                  />

                  <div className="flex-1">
                    <span className="block font-bold text-slate-900">
                      Razorpay - Cards & Netbanking
                    </span>

                    <span className="mt-1 block text-sm text-slate-500">
                      Pay securely using debit cards, credit cards or
                      Netbanking.
                    </span>

                    <div className="mt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Cards accepted
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold italic text-blue-900">
                          VISA
                        </span>

                        <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2">
                          <span className="h-4 w-4 rounded-full bg-red-600" />
                          <span className="-ml-2 h-4 w-4 rounded-full bg-yellow-500 opacity-90" />
                          <span className="ml-1 text-xs font-semibold text-slate-700">
                            Mastercard
                          </span>
                        </span>

                        <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-blue-700">
                          RuPay
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-200 pt-3">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Netbanking
                      </p>

                      <div className="flex flex-wrap items-center gap-3">
                        {banks.map((bank) => (
                          <div
                            key={bank.shortName}
                            title={bank.name}
                            className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-2 shadow-sm"
                          >
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${bank.domain}&sz=64`}
                              alt={bank.name}
                              className="h-7 w-7 object-contain"
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                                event.currentTarget.nextSibling.style.display =
                                  "block";
                              }}
                            />

                            <span className="hidden text-[9px] font-bold text-slate-700">
                              {bank.shortName}
                            </span>
                          </div>
                        ))}
                      </div>

                      <p className="mt-3 text-xs text-slate-500">
                        And other supported Indian banks
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="mt-6 w-full rounded-xl bg-teal-700 px-6 py-3.5 font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Processing..."
                : paymentMethod === "COD"
                  ? "Place Cash on Delivery Order"
                  : "Pay with Razorpay"}
            </button>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              Your final amount and stock availability are verified by the
              server before your order is completed.
            </p>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:sticky lg:top-6">
            <h2 className="text-xl font-bold text-slate-900">Order summary</h2>

            <div className="mt-5 space-y-4">
              {items.map((item, index) => {
                const id =
                  productOf(item)._id ||
                  productOf(item).id ||
                  item.productId ||
                  index;

                return (
                  <div key={id} className="flex gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-50 p-2">
                      {productImage(item) ? (
                        <img
                          src={productImage(item)}
                          alt={productName(item)}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">No image</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-slate-800">
                        {productName(item)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Quantity: {itemQuantity(item)}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-bold text-slate-900">
                      {money(productPrice(item) * itemQuantity(item))}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="my-5 border-t border-slate-200" />

            <div className="flex justify-between gap-3 text-sm text-slate-600">
              <span>Estimated subtotal</span>
              <span>{money(estimatedSubtotal)}</span>
            </div>

            <div className="mt-3 flex justify-between gap-3 text-sm text-slate-600">
              <span>Shipping</span>
              <span>Calculated by your store</span>
            </div>

            <div className="my-5 border-t border-slate-200" />

            <div className="flex justify-between gap-3">
              <span className="font-bold text-slate-900">Estimated total</span>

              <span className="text-xl font-extrabold text-teal-800">
                {money(estimatedSubtotal)}
              </span>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              The server calculates the final order amount using current product
              prices and stock.
            </p>
          </aside>
        </form>
      </div>
    </main>
  );
}
