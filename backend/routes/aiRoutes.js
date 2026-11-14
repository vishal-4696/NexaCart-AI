const express = require("express");
const axios = require("axios");

const router = express.Router();

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || "http://127.0.0.1:5001";

// Get content-based recommendations
router.get("/recommendations/content", async (req, res) => {
  try {
    const { product_id } = req.query;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const response = await axios.get(
      `${AI_SERVICE_URL}/api/recommendations/content`,
      {
        params: { product_id },
        timeout: 10000,
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Content recommendation error:",
      error.response?.data || error.message
    );

    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Unable to fetch content recommendations",
    });
  }
});

// Get collaborative recommendations
router.get("/recommendations/collaborative", async (req, res) => {
  try {
    const { user_id, product_id } = req.query;

    const response = await axios.get(
      `${AI_SERVICE_URL}/api/recommendations/collaborative`,
      {
        params: { user_id, product_id },
        timeout: 10000,
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Collaborative recommendation error:",
      error.response?.data || error.message
    );

    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Unable to fetch collaborative recommendations",
    });
  }
});

// Get hybrid recommendations
router.get("/recommendations/hybrid", async (req, res) => {
  try {
    const { product_id, user_id } = req.query;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const response = await axios.get(
      `${AI_SERVICE_URL}/api/recommendations/hybrid`,
      {
        params: { product_id, user_id },
        timeout: 60000,
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Hybrid recommendation error:",
      error.response?.data || error.message
    );

    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Unable to fetch hybrid recommendations",
    });
  }
});

// Similar Products - Same Subcategory
router.get("/recommendations/similar", async (req, res) => {
  try {
    const { product_id } = req.query;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const response = await axios.get(
      `${AI_SERVICE_URL}/api/recommendations/similar`,
      {
        params: { product_id },
        timeout: 15000,
      }
    );

    return res.status(200).json(response.data);

  } catch (error) {
    console.error(
      "Similar products error:",
      error.response?.data || error.message
    );

    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Unable to fetch similar products",
    });
  }
});

module.exports = router;
