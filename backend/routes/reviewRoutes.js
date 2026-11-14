const express = require("express");
const mongoose = require("mongoose");

const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/reviews/:productId
// Public: view reviews for an active product
router.get("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const reviews = await Review.find({
      product: productId,
    })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating: product.averageRating,
      reviews,
    });
  } catch (error) {
    console.error("Get reviews error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve reviews.",
    });
  }
});

router.get("/:productId", async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const reviews = await Review.find({ product: productId })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    next(error);
  }
});


// POST /api/reviews/:productId
// Customer with a delivered order can review a product
router.post(
  "/:productId",
  protect,
  authorizeRoles("customer"),
  async (req, res) => {
    try {
      const { productId } = req.params;
      const { rating, comment } = req.body;

      if (!mongoose.isValidObjectId(productId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID.",
        });
      }

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be a whole number from 1 to 5.",
        });
      }

      if (
        typeof comment !== "string" ||
        comment.trim().length < 3 ||
        comment.trim().length > 1000
      ) {
        return res.status(400).json({
          success: false,
          message: "Comment must contain 3 to 1000 characters.",
        });
      }

      const product = await Product.findOne({
        _id: productId,
        isActive: true,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      // Require a delivered order containing this product
      const deliveredOrder = await Order.findOne({
        user: req.user._id,
        status: "delivered",
        "items.product": productId,
      });

      if (!deliveredOrder) {
        return res.status(403).json({
          success: false,
          message: "Only customers who received this product can review it.",
        });
      }

      const review = await Review.create({
        user: req.user._id,
        product: productId,
        rating,
        comment: comment.trim(),
      });

      // Recalculate the rating from all stored reviews
      const result = await Review.aggregate([
        {
          $match: {
            product: new mongoose.Types.ObjectId(productId),
          },
        },
        {
          $group: {
            _id: "$product",
            averageRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 },
          },
        },
      ]);

      const stats = result[0] || {
        averageRating: 0,
        reviewCount: 0,
      };

      await Product.updateOne(
        { _id: productId },
        {
          $set: {
            averageRating: Number(stats.averageRating.toFixed(2)),
            reviewCount: stats.reviewCount,
          },
        },
      );

      return res.status(201).json({
        success: true,
        message: "Review submitted successfully.",
        review,
        averageRating: Number(stats.averageRating.toFixed(2)),
        reviewCount: stats.reviewCount,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You have already reviewed this product.",
        });
      }

      console.error("Create review error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to submit review.",
      });
    }
  },
);

module.exports = router;
