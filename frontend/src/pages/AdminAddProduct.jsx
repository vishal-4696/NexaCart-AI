import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createProduct } from "../api/products";

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

export default function AdminAddProduct() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    subCategory: "",
    brand: "",
    price: "",
    stock: "",
    tags: "",
  });

  // Multiple product images
  const [images, setImages] = useState([""]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle form fields
  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,

      // Reset subcategory when main category changes
      ...(name === "category" ? { subCategory: "" } : {}),
    }));
  }

  // Update an image URL
  function handleImageChange(index, value) {
    const updatedImages = [...images];
    updatedImages[index] = value;
    setImages(updatedImages);
  }

  // Add another image field
  function addImageField() {
    setImages([...images, ""]);
  }

  // Remove an image field
  function removeImageField(index) {
    setImages(images.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (
      !form.name.trim() ||
      !form.description.trim() ||
      !form.category.trim() ||
      !form.subCategory.trim() ||
      form.price === "" ||
      form.stock === ""
    ) {
      setError("Please fill all required fields.");
      return;
    }

    if (
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0 ||
      !Number.isInteger(Number(form.stock)) ||
      Number(form.stock) < 0
    ) {
      setError("Enter a valid price and stock quantity.");
      return;
    }

    // Remove empty image fields
    const validImages = images.map((image) => image.trim()).filter(Boolean);

    try {
      setLoading(true);

      await createProduct({
        name: form.name.trim(),
        description: form.description.trim(),

        // Main category
        category: form.category.trim(),

        // Subcategory
        subCategory: form.subCategory.trim(),

        brand: form.brand.trim() || "Unbranded",
        price: Number(form.price),

        // First image is the primary image
        imageUrl: validImages[0] || "",

        // All product images
        images: validImages,

        stock: Number(form.stock),

        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });

      alert("Product created successfully!");
      navigate("/admin/products");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.join(", ") ||
          "Unable to create product.",
      );
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    ["name", "Product Name"],
    ["description", "Description"],
    ["brand", "Brand"],
    ["price", "Price"],
    ["stock", "Stock Quantity"],
    ["tags", "Tags (comma separated)"],
  ];

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link to="/admin/products" className="text-teal-700 hover:underline">
        ← Back to Products
      </Link>

      <h1 className="mt-5 text-3xl font-bold">Add New Product</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5 rounded-2xl bg-white p-6 shadow"
      >
        {/* Existing product fields */}
        {fields.map(([name, label]) => (
          <div key={name}>
            <label className="mb-2 block font-medium">
              {label}
              {["name", "description"].includes(name) ||
              ["price", "stock"].includes(name)
                ? " *"
                : ""}
            </label>

            {name === "description" ? (
              <textarea
                name={name}
                value={form[name]}
                onChange={handleChange}
                className="w-full rounded-lg border p-3"
                rows="4"
                required
              />
            ) : (
              <input
                name={name}
                type={["price", "stock"].includes(name) ? "number" : "text"}
                min={["price", "stock"].includes(name) ? "0" : undefined}
                step={name === "price" ? "0.01" : "1"}
                value={form[name]}
                onChange={handleChange}
                className="w-full rounded-lg border p-3"
                required={["name", "price", "stock"].includes(name)}
              />
            )}
          </div>
        ))}

        {/* Main Category */}
        <div>
          <label className="mb-2 block font-medium">Main Category *</label>

          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            required
            className="w-full rounded-lg border p-3"
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
          <label className="mb-2 block font-medium">Subcategory *</label>

          <select
            name="subCategory"
            value={form.subCategory}
            onChange={handleChange}
            required
            disabled={!form.category}
            className="w-full rounded-lg border p-3 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="">
              {form.category
                ? "Select Subcategory"
                : "Select Main Category First"}
            </option>

            {(categoryOptions[form.category] || []).map((subCategory) => (
              <option key={subCategory} value={subCategory}>
                {subCategory}
              </option>
            ))}
          </select>
        </div>

        {/* Multiple product images */}
        <div>
          <label className="mb-3 block font-semibold">Product Images</label>

          <p className="mb-3 text-sm text-gray-500">
            Add multiple image URLs. The first image will be used as the main
            product image.
          </p>

          <div className="space-y-3">
            {images.map((image, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={image}
                  onChange={(e) => handleImageChange(index, e.target.value)}
                  placeholder={`Image URL ${index + 1}`}
                  className="w-full rounded-lg border p-3"
                />

                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImageField(index)}
                    className="rounded-lg bg-red-100 px-3 py-3 text-red-600 hover:bg-red-200"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addImageField}
            className="mt-3 rounded-lg border border-teal-700 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
          >
            + Add Another Image
          </button>
        </div>

        {/* Error message */}
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-700 p-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Product"}
        </button>
      </form>
    </main>
  );
}
