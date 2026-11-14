const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    // Main category
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Subcategory
    subCategory: {
      type: String,
      required: true,
      trim: true,
      default: "Other",
      index: true,
    },

    brand: {
      type: String,
      default: "Unbranded",
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Primary product image (backward compatibility)
    imageUrl: {
      type: String,
      default: "",
    },

    // Multiple product images
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (images) {
          return images.every(
            (image) => typeof image === "string" && image.trim().length > 0,
          );
        },
        message: "Product images must contain valid image URLs.",
      },
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    tags: {
      type: [String],
      default: [],
    },

    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

productSchema.index({
  name: "text",
  description: "text",
  tags: "text",
});

module.exports = mongoose.model("Product", productSchema);
