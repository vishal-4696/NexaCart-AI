const express = require("express");
const mongoose = require("mongoose");

const Product = require("../models/Product");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================
// Validate product input
// ============================================

const validateProduct = (data, isUpdate = false) => {
  const errors = [];

  const allowedFields = [
    "name",
    "description",
    "category",
    "subCategory",
    "brand",
    "price",
    "imageUrl",
    "images",
    "stock",
    "tags",
    "isActive",
  ];

  // Check for unsupported fields
  const unknownFields = Object.keys(data).filter(
    (key) => !allowedFields.includes(key),
  );

  if (unknownFields.length > 0) {
    errors.push(`Unsupported fields: ${unknownFields.join(", ")}`);
  }

  // Required fields when creating a product
  const requiredFields = [
    "name",
    "description",
    "category",
    "subCategory",
    "price",
    "stock",
  ];

  if (!isUpdate) {
    for (const field of requiredFields) {
      if (
        data[field] === undefined ||
        data[field] === null ||
        data[field] === ""
      ) {
        errors.push(`${field} is required.`);
      }
    }
  } else if (Object.keys(data).length === 0) {
    errors.push("Provide at least one field to update.");
  }

  // Validate text fields
  for (const field of ["name", "description", "category", "subCategory"]) {
    if (
      data[field] !== undefined &&
      (typeof data[field] !== "string" || !data[field].trim())
    ) {
      errors.push(`${field} must be a non-empty string.`);
    }
  }

  // Validate brand
  if (
    data.brand !== undefined &&
    (typeof data.brand !== "string" || !data.brand.trim())
  ) {
    errors.push("brand must be a non-empty string.");
  }

  // Validate price
  if (
    data.price !== undefined &&
    (typeof data.price !== "number" ||
      !Number.isFinite(data.price) ||
      data.price < 0)
  ) {
    errors.push("price must be a non-negative number.");
  }

  // Validate stock
  if (
    data.stock !== undefined &&
    (!Number.isInteger(data.stock) || data.stock < 0)
  ) {
    errors.push("stock must be a non-negative integer.");
  }

  // Validate primary image URL
  if (data.imageUrl !== undefined && typeof data.imageUrl !== "string") {
    errors.push("imageUrl must be a string.");
  }

  // Validate multiple image URLs
  if (
    data.images !== undefined &&
    (!Array.isArray(data.images) ||
      !data.images.every(
        (image) => typeof image === "string" && image.trim().length > 0,
      ))
  ) {
    errors.push("images must be an array of non-empty strings.");
  }

  // Validate tags
  if (
    data.tags !== undefined &&
    (!Array.isArray(data.tags) ||
      !data.tags.every(
        (tag) => typeof tag === "string" && tag.trim().length > 0,
      ))
  ) {
    errors.push("tags must be an array of non-empty strings.");
  }

  // Validate active status
  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    errors.push("isActive must be a boolean.");
  }

  return errors;
};

// ============================================
// GET /api/products
// Public: List, search, filter and sort products
// ============================================

router.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      subCategory,
      minPrice,
      maxPrice,
      sort = "newest",
      page = "1",
      limit = "12",
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    // Validate pagination
    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      !Number.isInteger(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be positive; limit must be between 1 and 50.",
      });
    }

    // Only active products are visible publicly
    const filter = { isActive: true };

    // Main category filter
    if (category !== undefined) {
      if (typeof category !== "string" || !category.trim()) {
        return res.status(400).json({
          success: false,
          message: "Category must be a non-empty string.",
        });
      }

      filter.category = category.trim();
    }

    // Subcategory filter
    if (subCategory !== undefined) {
      if (typeof subCategory !== "string" || !subCategory.trim()) {
        return res.status(400).json({
          success: false,
          message: "Subcategory must be a non-empty string.",
        });
      }

      filter.subCategory = subCategory.trim();
    }

    // Price filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      const min = minPrice === undefined ? 0 : Number(minPrice);

      const max = maxPrice === undefined ? Infinity : Number(maxPrice);

      if (
        !Number.isFinite(min) ||
        min < 0 ||
        (maxPrice !== undefined && (!Number.isFinite(max) || max < 0)) ||
        min > max
      ) {
        return res.status(400).json({
          success: false,
          message: "Provide a valid price range.",
        });
      }

      filter.price = { $gte: min };

      if (maxPrice !== undefined) {
        filter.price.$lte = max;
      }
    }

    // Search products
    if (search !== undefined) {
      if (typeof search !== "string" || search.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: "Search must be a string of at most 100 characters.",
        });
      }

      // Escape special regular expression characters
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      if (escaped) {
        filter.$or = [
          {
            name: {
              $regex: escaped,
              $options: "i",
            },
          },
          {
            description: {
              $regex: escaped,
              $options: "i",
            },
          },
          {
            category: {
              $regex: escaped,
              $options: "i",
            },
          },
          {
            subCategory: {
              $regex: escaped,
              $options: "i",
            },
          },
          {
            tags: {
              $regex: escaped,
              $options: "i",
            },
          },
        ];
      }
    }

    // Sorting options
    const sortOptions = {
      newest: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating: { averageRating: -1 },
    };

    if (!sortOptions[sort]) {
      return res.status(400).json({
        success: false,
        message: "Invalid sort option.",
        allowed: Object.keys(sortOptions),
      });
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortOptions[sort])
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      products,
    });
  } catch (error) {
    console.error("List products error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch products.",
    });
  }
});

// ============================================
// GET /api/products/admin/all
// Admin only: Fetch active and inactive products
// ============================================

router.get("/admin/all", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const products = await Product.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Admin fetch products error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch all products.",
    });
  }
});

// ============================================
// GET /api/products/:id
// Public: Retrieve one active product
// ============================================

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findOne({
      _id: id,
      isActive: true,
    }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product.",
    });
  }
});

// ============================================
// POST /api/products
// Admin only: Create a product
// Supports multiple product images and subcategories
// ============================================

router.post("/", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const errors = validateProduct(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors,
      });
    }

    const {
      name,
      description,
      category,
      subCategory,
      brand,
      price,
      imageUrl,
      images,
      stock,
      tags,
      isActive,
    } = req.body;

    // Clean and prepare multiple image URLs
    const productImages = (images || []).map((image) => image.trim());

    // First image becomes the primary image
    const primaryImage = productImages[0] || (imageUrl || "").trim();

    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),

      // Main category
      category: category.trim(),

      // Subcategory
      subCategory: subCategory.trim(),

      brand: brand === undefined ? "Unbranded" : brand.trim(),

      price,

      // Keep imageUrl for existing frontend components
      imageUrl: primaryImage,

      // Store all product images
      images:
        productImages.length > 0
          ? productImages
          : primaryImage
            ? [primaryImage]
            : [],

      stock,

      tags: tags?.map((tag) => tag.trim()),

      ...(isActive !== undefined && { isActive }),
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      product,
    });
  } catch (error) {
    console.error("Create product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create product.",
    });
  }
});

// ============================================
// PATCH /api/products/:id
// Admin only: Update selected product fields
// Supports multiple product images and subcategories
// ============================================

router.patch("/:id", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const errors = validateProduct(req.body, true);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors,
      });
    }

    const updates = { ...req.body };

    // If multiple images are provided,
    // use the first image as the primary image
    if (updates.images !== undefined) {
      updates.images = updates.images.map((image) => image.trim());

      updates.imageUrl = updates.images[0] || "";
    }

    // Support older edit forms that send only imageUrl
    else if (updates.imageUrl !== undefined) {
      updates.imageUrl = updates.imageUrl.trim();

      updates.images = updates.imageUrl ? [updates.imageUrl] : [];
    }

    // Trim text fields
    for (const field of [
      "name",
      "description",
      "category",
      "subCategory",
      "brand",
    ]) {
      if (updates[field] !== undefined) {
        updates[field] = updates[field].trim();
      }
    }

    // Trim tags
    if (updates.tags !== undefined) {
      updates.tags = updates.tags.map((tag) => tag.trim());
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update product.",
    });
  }
});

// ============================================
// Export router
// ============================================

module.exports = router;
