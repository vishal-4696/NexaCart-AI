import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createProductReview, getProductReviews } from "../api/reviews";

function StarDisplay({ rating }) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <span
      className="tracking-wide text-amber-500"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
    >
      {"★".repeat(Math.round(value))}
      <span className="text-slate-300">
        {"★".repeat(5 - Math.round(value))}
      </span>
    </span>
  );
}

function formatDate(date) {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProductReviews({ productId, onReviewSubmitted }) {
  const { user, isAuthenticated } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadReviews() {
    setLoading(true);
    setLoadError("");

    try {
      const data = await getProductReviews(productId);
      setReviews(data);
    } catch (err) {
      setLoadError(
        err.response?.data?.message ||
          "Unable to load reviews. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
    // Reload when the product changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    const trimmedComment = comment.trim();

    if (!Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
      setError("Please select a rating from 1 to 5 stars.");
      return;
    }

    if (!trimmedComment) {
      setError("Please enter a comment.");
      return;
    }

    if (trimmedComment.length > 1000) {
      setError("Your comment must be 1000 characters or fewer.");
      return;
    }

    setSubmitting(true);

    try {
      await createProductReview(productId, {
        rating: Number(rating),
        comment: trimmedComment,
      });

      setComment("");
      setRating(5);
      setMessage("Your review was submitted successfully.");

      await loadReviews();

      // Let the product details page refresh its rating summary.
      if (onReviewSubmitted) {
        await onReviewSubmitted();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not submit your review. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
        reviews.length
      : 0;

  return (
    <section className="mt-10 border-t border-slate-200 pt-10">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-teal-700">
          Customer feedback
        </p>

        <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
          Customer reviews
        </h2>
      </div>

      {/* Rating summary */}
      <div className="mt-6 flex flex-wrap items-center gap-5 rounded-2xl bg-white p-5 shadow-sm">
        <div>
          <p className="text-4xl font-extrabold text-slate-900">
            {averageRating.toFixed(1)}
            <span className="text-lg text-slate-400">/5</span>
          </p>

          <div className="mt-1">
            <StarDisplay rating={averageRating} />
          </div>
        </div>

        <div className="text-sm text-slate-500">
          <p className="font-semibold text-slate-800">
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </p>
          <p className="mt-1">Based on loaded customer reviews</p>
        </div>
      </div>

      {/* Review list */}
      <div className="mt-8">
        {loading && <p className="py-5 text-slate-500">Loading reviews...</p>}

        {loadError && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {loadError}
            <button
              type="button"
              onClick={loadReviews}
              className="ml-2 font-bold underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !loadError && reviews.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
            <p className="font-semibold text-slate-800">No reviews yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Be the first to share your experience, if eligible.
            </p>
          </div>
        )}

        {!loading && !loadError && reviews.length > 0 && (
          <div className="divide-y divide-slate-200">
            {reviews.map((review) => (
              <article key={review._id || review.id} className="py-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    {review.user?.name ||
                      review.user?.email ||
                      review.userName ||
                      "Verified customer"}
                  </p>

                  <span className="text-sm text-slate-400">
                    {formatDate(review.createdAt)}
                  </span>
                </div>

                <div className="mt-2">
                  <StarDisplay rating={review.rating} />
                </div>

                <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
                  {review.comment}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Review form */}
      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h3 className="text-xl font-bold text-slate-900">Write a review</h3>

        {!isAuthenticated ? (
          <p className="mt-3 text-slate-600">
            Please{" "}
            <Link to="/login" className="font-semibold text-teal-700 underline">
              log in
            </Link>{" "}
            to submit a review.
          </p>
        ) : user?.role !== "customer" ? (
          <p className="mt-3 text-slate-600">
            Reviews can only be submitted by customer accounts.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <div>
              <label className="block font-semibold text-slate-800">
                Your rating
              </label>

              <div
                className="mt-2 flex gap-1"
                role="group"
                aria-label="Choose a rating"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    aria-label={`${value} star${value > 1 ? "s" : ""}`}
                    aria-pressed={rating === value}
                    className={`text-3xl transition hover:scale-110 ${
                      value <= rating ? "text-amber-500" : "text-slate-300"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {rating} out of 5 stars
              </p>
            </div>

            <div>
              <label
                htmlFor="review-comment"
                className="block font-semibold text-slate-800"
              >
                Your comments
              </label>

              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like or dislike about this product?"
                rows={4}
                maxLength={1000}
                required
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {comment.length}/1000 characters
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit review"}
            </button>

            <p className="text-xs leading-5 text-slate-500">
              Reviews are subject to the backend's purchase and delivery
              eligibility checks.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
