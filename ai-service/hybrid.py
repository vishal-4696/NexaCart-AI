

def diversify_recommendations(
    recommendations,
    limit=5,
    max_per_category=2
):
    """
    Limit recommendations from the same subcategory.
    Strictly enforce the maximum category limit.
    """

    diversified = []
    category_counts = {}

    for product in recommendations:

        category = (
            product.get("subCategory")
            or product.get("category")
            or "Other"
        )

        category = str(category).strip().casefold()

        if category_counts.get(category, 0) >= max_per_category:
            continue

        diversified.append(product)

        category_counts[category] = (
            category_counts.get(category, 0) + 1
        )

        if len(diversified) >= limit:
            break

    return diversified

def generate_hybrid_recommendations(
    content_recommendations,
    collaborative_recommendations,
    content_weight=0.6,
    collaborative_weight=0.4,
    limit=5
):
    """
    Generate hybrid recommendations using
    Weighted Reciprocal Rank Fusion.

    Includes:
    - Cold-start fallback
    - Out-of-stock filtering
    - Recommendation diversity
    """

    # -----------------------------------------
    # 1. Filter out-of-stock products
    # -----------------------------------------

    content_recommendations = [
        product for product in content_recommendations
        if float(product.get("stock", 0) or 0) > 0
    ]

    collaborative_recommendations = [
        product for product in collaborative_recommendations
        if float(product.get("stock", 0) or 0) > 0
    ]

    # -----------------------------------------
    # 2. Handle product cold-start
    # -----------------------------------------

    if not collaborative_recommendations:

        print(
            "Cold-start detected: "
            "Using Content-Based Filtering fallback."
        )

        fallback_recommendations = []

        for rank, product in enumerate(
            content_recommendations,
            start=1
        ):

            fallback_score = content_weight / rank

            fallback_recommendations.append({
                **product,
                "contentRank": rank,
                "collaborativeRank": None,
                "contentScore": round(1 / rank, 4),
                "collaborativeScore": 0.0,
                "hybridScore": round(fallback_score, 4),
                "recommendationMode": "content_fallback"
            })

        return diversify_recommendations(
            fallback_recommendations,
            limit=limit,
            max_per_category=2
        )

    # -----------------------------------------
    # 3. Process Content-Based recommendations
    # -----------------------------------------

    hybrid_products = {}

    for rank, product in enumerate(
        content_recommendations,
        start=1
    ):

        product_id = str(product.get("_id", ""))

        if not product_id:
            continue

        hybrid_products[product_id] = {
            **product,
            "contentRank": rank,
            "collaborativeRank": None,
            "contentScore": round(1 / rank, 4),
            "collaborativeScore": 0.0
        }

    # -----------------------------------------
    # 4. Process Collaborative recommendations
    # -----------------------------------------

    for rank, product in enumerate(
        collaborative_recommendations,
        start=1
    ):

        product_id = str(product.get("_id", ""))

        if not product_id:
            continue

        if product_id not in hybrid_products:

            hybrid_products[product_id] = {
                **product,
                "contentRank": None,
                "collaborativeRank": rank,
                "contentScore": 0.0,
                "collaborativeScore": round(1 / rank, 4)
            }

        else:

            hybrid_products[product_id]["collaborativeRank"] = rank

            hybrid_products[product_id]["collaborativeScore"] = round(
                1 / rank,
                4
            )

    # -----------------------------------------
    # 5. Calculate weighted hybrid scores
    # -----------------------------------------

    recommendations = []

    for product_id, product in hybrid_products.items():

        content_score = product["contentScore"]
        collaborative_score = product["collaborativeScore"]

        hybrid_score = (
            content_weight * content_score
            + collaborative_weight * collaborative_score
        )

        recommendations.append({
            **product,
            "hybridScore": round(hybrid_score, 4),
            "recommendationMode": "hybrid"
        })

    # -----------------------------------------
    # 6. Sort by hybrid score
    # -----------------------------------------

    recommendations.sort(
        key=lambda product: product["hybridScore"],
        reverse=True
    )

    # -----------------------------------------
    # 7. Apply recommendation diversity
    # -----------------------------------------

    return diversify_recommendations(
        recommendations,
        limit=limit,
        max_per_category=2
    )
