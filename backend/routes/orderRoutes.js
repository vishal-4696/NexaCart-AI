const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");

const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const razorpay = require("../config/razorpay");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", authorizeRoles("customer"), async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { shippingAddress } = req.body;

    const requiredFields = [
      "fullName",
      "addressLine",
      "city",
      "postalCode",
      "phone",
    ];

    if (
      !shippingAddress ||
      typeof shippingAddress !== "object" ||
      Array.isArray(shippingAddress) ||
      requiredFields.some(
        (field) =>
          typeof shippingAddress[field] !== "string" ||
          !shippingAddress[field].trim(),
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide all required shipping address fields.",
      });
    }

    const address = {};

    for (const field of requiredFields) {
      address[field] = shippingAddress[field].trim();
    }

    if (
      address.fullName.length > 100 ||
      address.addressLine.length > 250 ||
      address.city.length > 100 ||
      address.postalCode.length > 20 ||
      address.phone.length > 30
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more shipping address fields are too long.",
      });
    }

    let createdOrder;

    await session.withTransaction(async () => {
      const cart = await Cart.findOne({
        user: req.user._id,
      }).session(session);

      if (!cart || cart.items.length === 0) {
        const error = new Error("Your cart is empty.");
        error.statusCode = 400;
        throw error;
      }

      const orderItems = [];
      let subtotal = 0;

      for (const cartItem of cart.items) {
        const product = await Product.findOne({
          _id: cartItem.product,
          isActive: true,
        }).session(session);

        if (!product) {
          const error = new Error(
            "A product in your cart is no longer available.",
          );
          error.statusCode = 409;
          throw error;
        }

        if (!Number.isInteger(cartItem.quantity) || cartItem.quantity < 1) {
          const error = new Error("Invalid cart quantity.");
          error.statusCode = 400;
          throw error;
        }

        const stockResult = await Product.updateOne(
          {
            _id: product._id,
            isActive: true,
            stock: { $gte: cartItem.quantity },
          },
          {
            $inc: { stock: -cartItem.quantity },
          },
          { session },
        );

        if (stockResult.modifiedCount !== 1) {
          const error = new Error(`Insufficient stock for ${product.name}.`);
          error.statusCode = 409;
          throw error;
        }

        subtotal += product.price * cartItem.quantity;

        orderItems.push({
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: cartItem.quantity,
          imageUrl: product.imageUrl || "",
        });
      }

      subtotal = Number(subtotal.toFixed(2));

      const [order] = await Order.create(
        [
          {
            user: req.user._id,
            items: orderItems,
            shippingAddress: address,
            subtotal,
            total: subtotal,
            paymentMethod: "COD",
            paymentStatus: "pending",
            status: "placed",
          },
        ],
        { session },
      );

      cart.items = [];
      await cart.save({ session });

      createdOrder = order;
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      order: createdOrder,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Create COD order error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to place order.",
    });
  } finally {
    await session.endSession();
  }
});

router.post(
  "/razorpay/create-order",
  authorizeRoles("customer"),
  async (req, res) => {
    let order;

    try {
      const { shippingAddress } = req.body;

      const requiredFields = [
        "fullName",
        "addressLine",
        "city",
        "postalCode",
        "phone",
      ];

      if (
        !shippingAddress ||
        typeof shippingAddress !== "object" ||
        Array.isArray(shippingAddress) ||
        requiredFields.some(
          (field) =>
            typeof shippingAddress[field] !== "string" ||
            !shippingAddress[field].trim(),
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Provide all required shipping address fields.",
        });
      }

      const address = {};

      for (const field of requiredFields) {
        address[field] = shippingAddress[field].trim();
      }

      if (
        address.fullName.length > 100 ||
        address.addressLine.length > 250 ||
        address.city.length > 100 ||
        address.postalCode.length > 20 ||
        address.phone.length > 30
      ) {
        return res.status(400).json({
          success: false,
          message: "One or more shipping address fields are too long.",
        });
      }

      const cart = await Cart.findOne({
        user: req.user._id,
      });

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Your cart is empty.",
        });
      }

      const orderItems = [];
      let subtotal = 0;

      for (const cartItem of cart.items) {
        const product = await Product.findOne({
          _id: cartItem.product,
          isActive: true,
        });

        if (!product) {
          return res.status(409).json({
            success: false,
            message: "A product in your cart is no longer available.",
          });
        }

        if (!Number.isInteger(cartItem.quantity) || cartItem.quantity < 1) {
          return res.status(400).json({
            success: false,
            message: "Invalid cart quantity.",
          });
        }

        if (product.stock < cartItem.quantity) {
          return res.status(409).json({
            success: false,
            message: `Insufficient stock for ${product.name}.`,
          });
        }

        subtotal += product.price * cartItem.quantity;

        orderItems.push({
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: cartItem.quantity,
          imageUrl: product.imageUrl || "",
        });
      }

      subtotal = Number(subtotal.toFixed(2));

      if (!Number.isFinite(subtotal) || subtotal <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid order amount.",
        });
      }

      order = await Order.create({
        user: req.user._id,
        items: orderItems,
        shippingAddress: address,
        subtotal,
        total: subtotal,
        paymentMethod: "Razorpay",
        paymentStatus: "pending",
        status: "pending_payment",
      });

      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: Math.round(subtotal * 100),
          currency: "INR",
          receipt: `order_${order._id}`,
        });

        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        return res.status(201).json({
          success: true,
          message: "Razorpay order created successfully.",
          orderId: order._id,
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          keyId: process.env.RAZORPAY_KEY_ID,
        });
      } catch (razorpayError) {
        order.paymentStatus = "failed";
        order.status = "payment_declined";
        await order.save();

        throw razorpayError;
      }
    } catch (error) {
      console.error("Razorpay order creation error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to create Razorpay order.",
      });
    }
  },
);

router.post(
  "/razorpay/checkout-status",
  authorizeRoles("customer"),
  async (req, res) => {
    try {
      const { razorpay_order_id } = req.body;

      if (typeof razorpay_order_id !== "string" || !razorpay_order_id.trim()) {
        return res.status(400).json({
          success: false,
          message: "Razorpay order ID is required.",
        });
      }

      const order = await Order.findOne({
        razorpayOrderId: razorpay_order_id,
        user: req.user._id,
        paymentMethod: "Razorpay",
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      if (order.paymentStatus === "paid") {
        return res.status(200).json({
          success: true,
          message: "Payment is already successful.",
          order,
        });
      }

      if (order.paymentStatus !== "pending") {
        return res.status(200).json({
          success: false,
          message: "Payment was not completed.",
          order,
        });
      }

      const paymentsResponse =
        await razorpay.orders.fetchPayments(razorpay_order_id);

      const payments = paymentsResponse.items || [];

      const capturedPayment = payments.find(
        (payment) => payment.status === "captured",
      );

      if (capturedPayment) {
        return res.status(409).json({
          success: false,
          message:
            "Payment was captured. Please complete payment verification.",
          paymentStatus: "captured",
        });
      }

      const authorizedPayment = payments.find(
        (payment) => payment.status === "authorized",
      );

      if (authorizedPayment) {
        return res.status(409).json({
          success: false,
          message: "Payment is still being processed.",
          paymentStatus: "authorized",
        });
      }

      const latestPayment = payments[payments.length - 1];

      order.paymentStatus = "failed";
      order.status = "payment_declined";

      if (latestPayment?.id) {
        order.razorpayPaymentId = latestPayment.id;
      }

      await order.save();

      return res.status(200).json({
        success: false,
        message: "Payment declined or cancelled.",
        order,
      });
    } catch (error) {
      console.error("Checkout status error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to check payment status.",
      });
    }
  },
);

router.post(
  "/razorpay/verify-payment",
  authorizeRoles("customer"),
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;

      if (
        typeof razorpay_order_id !== "string" ||
        typeof razorpay_payment_id !== "string" ||
        typeof razorpay_signature !== "string" ||
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing Razorpay payment details.",
        });
      }

      const order = await Order.findOne({
        razorpayOrderId: razorpay_order_id,
        user: req.user._id,
        paymentMethod: "Razorpay",
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      if (order.paymentStatus === "paid") {
        if (order.razorpayPaymentId === razorpay_payment_id) {
          return res.status(200).json({
            success: true,
            message: "Payment was already verified.",
            order,
          });
        }

        return res.status(409).json({
          success: false,
          message: "This order has already been paid.",
        });
      }

      if (order.paymentStatus !== "pending") {
        return res.status(409).json({
          success: false,
          message: "This order is not awaiting payment.",
        });
      }

      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      const expectedBuffer = Buffer.from(generatedSignature, "hex");
      const receivedBuffer = Buffer.from(razorpay_signature, "hex");

      if (
        expectedBuffer.length !== receivedBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment signature.",
        });
      }

      const payment = await razorpay.payments.fetch(razorpay_payment_id);

      if (
        payment.order_id !== razorpay_order_id ||
        payment.amount !== Math.round(order.total * 100) ||
        payment.currency !== "INR"
      ) {
        return res.status(400).json({
          success: false,
          message: "Payment details do not match the order.",
        });
      }

      if (payment.status !== "captured") {
        return res.status(409).json({
          success: false,
          message: "Payment has not been captured yet.",
          paymentStatus: payment.status,
        });
      }

      await session.withTransaction(async () => {
        const currentOrder = await Order.findOne({
          _id: order._id,
          user: req.user._id,
          paymentStatus: "pending",
          status: "pending_payment",
        }).session(session);

        if (!currentOrder) {
          const error = new Error(
            "Order was already processed. Please refresh your orders.",
          );
          error.statusCode = 409;
          throw error;
        }

        for (const item of currentOrder.items) {
          const stockResult = await Product.updateOne(
            {
              _id: item.product,
              isActive: true,
              stock: { $gte: item.quantity },
            },
            {
              $inc: { stock: -item.quantity },
            },
            { session },
          );

          if (stockResult.modifiedCount !== 1) {
            const error = new Error(`Insufficient stock for ${item.name}.`);
            error.statusCode = 409;
            throw error;
          }
        }

        currentOrder.paymentStatus = "paid";
        currentOrder.status = "placed";
        currentOrder.razorpayPaymentId = razorpay_payment_id;
        currentOrder.razorpaySignature = razorpay_signature;

        currentOrder.paymentDetails = {
          method: ["card", "netbanking"].includes(payment.method)
            ? payment.method
            : null,

          cardNetwork: payment.card?.network || null,
          cardType: payment.card?.type || null,
          cardLast4: payment.card?.last4 || null,
          bank: payment.bank || null,
        };

        await currentOrder.save({ session });

        const cart = await Cart.findOne({
          user: req.user._id,
        }).session(session);

        if (cart) {
          cart.items = [];
          await cart.save({ session });
        }
      });

      const updatedOrder = await Order.findById(order._id);

      return res.status(200).json({
        success: true,
        message: "Payment verified and order confirmed successfully.",
        order: updatedOrder,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Razorpay payment verification error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to verify payment.",
      });
    } finally {
      await session.endSession();
    }
  },
);

router.get("/my-orders", authorizeRoles("customer"), async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Order history error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve order history.",
    });
  }
});

router.get("/", authorizeRoles("admin"), async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Admin order list error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve orders.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const isOwner = order.user.toString() === req.user._id.toString();

    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this order.",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve order.",
    });
  }
});

router.patch("/:id/status", authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["confirmed", "shipped", "delivered", "cancelled"];

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status.",
        allowed: allowedStatuses,
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (order.paymentMethod === "Razorpay" && order.paymentStatus !== "paid") {
      return res.status(409).json({
        success: false,
        message: "This order cannot be processed until payment is confirmed.",
      });
    }

    const allowedTransitions = {
      placed: ["confirmed", "cancelled"],
      confirmed: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    };

    if (!allowedTransitions[order.status]?.includes(status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot change order from ${order.status} to ${status}.`,
      });
    }

    if (status === "cancelled") {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const currentOrder = await Order.findOne({
            _id: id,
            status: { $in: ["placed", "confirmed"] },
          }).session(session);

          if (!currentOrder) {
            const error = new Error(
              "Order status changed. Please refresh and try again.",
            );
            error.statusCode = 409;
            throw error;
          }

          for (const item of currentOrder.items) {
            await Product.updateOne(
              { _id: item.product },
              { $inc: { stock: item.quantity } },
              { session },
            );
          }

          currentOrder.status = "cancelled";
          await currentOrder.save({ session });
        });
      } finally {
        await session.endSession();
      }

      const cancelledOrder = await Order.findById(id);

      return res.status(200).json({
        success: true,
        message: "Order cancelled and stock restored.",
        order: cancelledOrder,
      });
    }

    order.status = status;

    if (status === "delivered" && order.paymentMethod === "COD") {
      order.paymentStatus = "paid";
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order status updated.",
      order,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Update order status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update order status.",
    });
  }
});

module.exports = router;
