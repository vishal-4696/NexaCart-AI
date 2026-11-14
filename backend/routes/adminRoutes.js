const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const Order = require("../models/Order");

const router = express.Router();

// GET /api/admin/dashboard
// Admin only: dashboard information
router.get("/dashboard", protect, authorizeRoles("admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the NexaCart AI admin dashboard.",
    admin: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    },
  });
});

// GET /api/admin/orders
// Admin only: retrieve all customer orders
router.get("/orders", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Admin orders error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve all orders.",
    });
  }
});

module.exports = router;
