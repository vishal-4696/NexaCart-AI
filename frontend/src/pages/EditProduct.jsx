import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

// Main categories and their subcategories
const categoryOptions = {
  Electronics: [
    "Laptops",
    "Cameras",
    "Headphones",
    "Smartphones",
    "Accessories",
  ],
  Fashion: [
    "Men's Clothing",
    "Women's Clothing",
    "Footwear",
    "Watches",
    "Accessories",
  ],
  "Home & Kitchen": [
    "Furniture",
    "Home Appliances",
    "Kitchenware",
    "Home Decor",
  ],
  Sports: ["Fitness Equipment", "Sportswear", "Sports Accessories"],
};

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    subCategory: "",
    brand: "",
    price: "",
    stock: "",
  });

  // Multiple product images
  const [images, setImages] = useState([""]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch existing product
  useEffect(() => {
    let active = true;

    async function fetchProduct() {
      try {
        const response = await api.get(`/products/${id}`);
        const product = response.data.product;

        if (!active) return;

        setFormData({
          name: product.name || "",
          description: product.description || "",
          category: product.category || "",
          subCategory: product.subCategory || "",
          brand: product.brand || "",
          price: product.price ?? "",
          stock: product.stock ?? "",
        });

        // Load existing images.
        // Older products may only have imageUrl.
        const existingImages =
          Array.isArray(product.images) && product.images.length > 0
            ? product.images
            : product.imageUrl
              ? [product.imageUrl]
              : [""];

        setImages(existingImages);
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || "Unable to load product.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchProduct();

    return () => {
      active = false;
    };
  }, [id]);

  // Handle normal form fields
  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,

      // Reset subcategory when main category changes
      ...(name === "category" ? { subCategory: "" } : {}),
    }));
  }

  // Handle image URL changes
  function handleImageChange(index, value) {
    setImages((previous) =>
      previous.map((image, i) => (i === index ? value : image)),
    );
  }

  // Add another image field
  function addImageField() {
    setImages((previous) => [...previous, ""]);
  }

  // Remove an image field
  function removeImageField(index) {
    setImages((previous) => previous.filter((_, i) => i !== index));
  }

  // Update product
  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    if (
      !formData.name.trim() ||
      !formData.description.trim() ||
      !formData.category ||
      !formData.subCategory
    ) {
      setError("Please fill in all required product details.");
      return;
    }

    if (
      !Number.isFinite(Number(formData.price)) ||
      Number(formData.price) < 0 ||
      !Number.isInteger(Number(formData.stock)) ||
      Number(formData.stock) < 0
    ) {
      setError("Enter a valid price and stock quantity.");
      return;
    }

    // Remove empty image fields
    const validImages = images.map((image) => image.trim()).filter(Boolean);

    if (validImages.length === 0) {
      setError("Please provide at least one product image URL.");
      return;
    }

    try {
      setSaving(true);

      await api.patch(`/products/${id}`, {
        ...formData,

        category: formData.category.trim(),
        subCategory: formData.subCategory.trim(),

        price: Number(formData.price),
        stock: Number(formData.stock),

        // First image is the primary image
        imageUrl: validImages[0],

        // Save all product images
        images: validImages,
      });

      alert("Product updated successfully!");
      navigate("/admin/products");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.join(", ") ||
          "Unable to update product.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="p-8">Loading product...</p>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold">Edit Product</h1>

        {error && (
          <p className="mt-4 rounded bg-red-50 p-3 text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Product Name */}
          <div>
            <label className="mb-1 block font-medium">Product Name *</label>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-lg border p-3 outline-none focus:border-teal-600"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block font-medium">Description *</label>

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={8}
              placeholder="Enter product description..."
              required
              className="w-full resize-y rounded-lg border p-3 leading-6 outline-none focus:border-teal-600"
            />
          </div>

          {/* Main Category */}
          <div>
            <label className="mb-1 block font-medium">Main Category *</label>

            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full rounded-lg border p-3 outline-none focus:border-teal-600"
            >
              <option value="">Select Main Category</option>

              {Object.keys(categoryOptions).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory */}
          <div>
            <label className="mb-1 block font-medium">Subcategory *</label>

            <select
              name="subCategory"
              value={formData.subCategory}
              onChange={handleChange}
              required
              disabled={!formData.category}
              className="w-full rounded-lg border p-3 outline-none focus:border-teal-600 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">
                {formData.category
                  ? "Select Subcategory"
                  : "Select Main Category First"}
              </option>

              {(categoryOptions[formData.category] || []).map((subCategory) => (
                <option key={subCategory} value={subCategory}>
                  {subCategory}
                </option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="mb-1 block font-medium">Brand</label>

            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              className="w-full rounded-lg border p-3 outline-none focus:border-teal-600"
            />
          </div>

          {/* Price */}
          <div>
            <label className="mb-1 block font-medium">Price *</label>

            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
              className="w-full rounded-lg border p-3 outline-none focus:border-teal-600"
            />
          </div>

          {/* Stock */}
          <div>
            <label className="mb-1 block font-medium">Stock *</label>

            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              min="0"
              step="1"
              required
              className="w-full rounded-lg border p-3 outline-none focus:border-teal-600"
            />
          </div>

          {/* Multiple Product Images */}
          <div className="border-t pt-5">
            <h2 className="text-xl font-semibold">Product Images</h2>

            <p className="mt-1 text-sm text-gray-500">
              Add multiple image URLs. The first image will be the main product
              image.
            </p>

            <div className="mt-4 space-y-4">
              {images.map((image, index) => (
                <div key={index}>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="font-medium">
                      Image {index + 1}
                      {index === 0 && (
                        <span className="ml-2 text-sm text-teal-700">
                          (Main Image)
                        </span>
                      )}
                    </label>

                    {images.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeImageField(index)}
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={image}
                    onChange={(e) => handleImageChange(index, e.target.value)}
                    placeholder="Enter image URL"
                    className="w-full rounded-lg border p-3 outline-none focus:border-teal-600"
                  />

                  {/* Image Preview */}
                  {image.trim() && (
                    <img
                      src={image}
                      alt={`Product ${index + 1}`}
                      className="mt-3 h-28 w-28 rounded-lg border object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      onLoad={(e) => {
                        e.currentTarget.style.display = "block";
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Add Image Button */}
            <button
              type="button"
              onClick={addImageField}
              className="mt-4 rounded-lg border border-teal-700 px-4 py-2 font-medium text-teal-700 hover:bg-teal-50"
            >
              + Add Another Image
            </button>
          </div>

          {/* Submit and Cancel */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-teal-700 px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/products")}
              className="rounded-lg border px-6 py-3"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
