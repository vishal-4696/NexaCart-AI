const express = require("express");
const mongoose = require("mongoose");

const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// Every cart endpoint requires an authenticated customer
router.use(protect, authorizeRoles("customer"));

// Retrieve the current customer's cart
const getCustomerCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [],
    });
  }

  return cart;
};

// Populate products and calculate subtotal
const formatCart = async (cart) => {
  await cart.populate("items.product");

  const items = cart.items
    .filter((item) => item.product && item.product.isActive)
    .map((item) => ({
      product: item.product,
      quantity: item.quantity,
      lineTotal: item.product.price * item.quantity,
    }));

  const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);

  return {
    id: cart._id,
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: Number(subtotal.toFixed(2)),
  };
};

// POST /api/cart/items
// Add a product or increase its existing quantity
router.post("/items", async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (typeof productId !== "string" || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "A valid productId is required.",
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be an integer between 1 and 100.",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or unavailable.",
      });
    }

    if (product.stock < quantity) {
      return res.status(409).json({
        success: false,
        message: `Only ${product.stock} units are currently available.`,
      });
    }

    const cart = await getCustomerCart(req.user._id);
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId,
    );

    const newQuantity = existingItem
      ? existingItem.quantity + quantity
      : quantity;

    if (newQuantity > product.stock) {
      return res.status(409).json({
        success: false,
        message: `Only ${product.stock} units are available in total.`,
      });
    }

    if (newQuantity > 100) {
      return res.status(400).json({
        success: false,
        message: "A maximum of 100 units per product is allowed.",
      });
    }

    if (existingItem) {
      existingItem.quantity = newQuantity;
    } else {
      cart.items.push({
        product: product._id,
        quantity,
      });
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Product added to cart.",
      cart: await formatCart(cart),
    });
  } catch (error) {
    console.error("Add to cart error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to add product to cart.",
    });
  }
});

// GET /api/cart
// View the current customer's cart
router.get("/", async (req, res) => {
  try {
    const cart = await getCustomerCart(req.user._id);

    return res.status(200).json({
      success: true,
      cart: await formatCart(cart),
    });
  } catch (error) {
    console.error("Get cart error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve cart.",
    });
  }
});

// PATCH /api/cart/items/:productId
// Set an item's quantity
router.patch("/items/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be an integer between 1 and 100.",
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found.",
      });
    }

    const item = cart.items.find(
      (entry) => entry.product.toString() === productId,
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Product is not in your cart.",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      isActive: true,
    });

    if (!product) {
      return res.status(409).json({
        success: false,
        message: "Product is unavailable.",
      });
    }

    if (quantity > product.stock) {
      return res.status(409).json({
        success: false,
        message: `Only ${product.stock} units are currently available.`,
      });
    }

    item.quantity = quantity;
    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart quantity updated.",
      cart: await formatCart(cart),
    });
  } catch (error) {
    console.error("Update cart error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update cart.",
    });
  }
});

// DELETE /api/cart/items/:productId
// Remove one product from the cart
router.delete("/items/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found.",
      });
    }

    const initialLength = cart.items.length;

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId,
    );

    if (cart.items.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: "Product is not in your cart.",
      });
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Product removed from cart.",
      cart: await formatCart(cart),
    });
  } catch (error) {
    console.error("Remove cart item error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to remove product.",
    });
  }
});

// DELETE /api/cart
// Clear the current customer's cart
router.delete("/", async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart is already empty.",
      });
    }

    cart.items = [];
    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully.",
      cart: await formatCart(cart),
    });
  } catch (error) {
    console.error("Clear cart error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to clear cart.",
    });
  }
});

module.exports = router;
