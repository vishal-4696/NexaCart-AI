
def precision_at_k(recommended_items, relevant_items, k=5):
    """
    Calculate Precision@K.

    recommended_items: List of recommended product IDs.
    relevant_items: Set/list of relevant product IDs.
    k: Number of top recommendations to evaluate.
    """

    if k <= 0:
        raise ValueError("K must be greater than zero")

    # Consider only the top K recommendations
    top_k_recommendations = recommended_items[:k]

    # Convert product IDs to strings for consistent comparison
    recommended_ids = [
        str(item) for item in top_k_recommendations
    ]

    relevant_ids = set(
        str(item) for item in relevant_items
    )

    # Count relevant recommendations
    relevant_count = sum(
        1 for item in recommended_ids
        if item in relevant_ids
    )

    # Calculate Precision@K
    precision = relevant_count / k

    return round(precision, 4)


# Test the Precision@K function
if __name__ == "__main__":

    recommended_products = [
        "P101",
        "P102",
        "P103",
        "P104",
        "P105"
    ]

    relevant_products = [
        "P101",
        "P103",
        "P105"
    ]

    result = precision_at_k(
        recommended_products,
        relevant_products,
        k=5
    )

    print("Precision@5:", result)


def recall_at_k(recommended_items, relevant_items, k=5):
    """
    Calculate Recall@K.

    recommended_items: List of recommended product IDs.
    relevant_items: Set/list of all relevant product IDs.
    k: Number of top recommendations to evaluate.
    """

    if k <= 0:
        raise ValueError("K must be greater than zero")

    relevant_ids = set(
        str(item) for item in relevant_items
    )

    if not relevant_ids:
        return 0.0

    top_k_recommendations = recommended_items[:k]

    recommended_ids = [
        str(item) for item in top_k_recommendations
    ]

    relevant_count = sum(
        1 for item in recommended_ids
        if item in relevant_ids
    )

    recall = relevant_count / len(relevant_ids)

    return round(recall, 4)


def recommendation_coverage(all_recommendations, total_products):
    """
    Calculate Recommendation Coverage.

    all_recommendations: List containing recommendation lists
                         generated for different products.
    total_products: Total number of available products.
    """

    if total_products <= 0:
        raise ValueError("Total products must be greater than zero")

    # Collect all unique recommended product IDs
    unique_recommendations = set()

    for recommendations in all_recommendations:
        for product_id in recommendations:
            unique_recommendations.add(str(product_id))

    # Calculate coverage
    coverage = len(unique_recommendations) / total_products

    return round(coverage, 4)


if __name__ == "__main__":

    recommended_products = [
        "P101",
        "P102",
        "P103",
        "P104",
        "P105"
    ]

    relevant_products = [
        "P101",
        "P103",
        "P105",
        "P106"
    ]

    precision = precision_at_k(
        recommended_products,
        relevant_products,
        k=5
    )

    recall = recall_at_k(
        recommended_products,
        relevant_products,
        k=5
    )

    # Recommendations generated for different products
    all_recommendations = [
        ["P101", "P102"],
        ["P102", "P103"],
        ["P104", "P105"]
    ]

    coverage = recommendation_coverage(
        all_recommendations,
        total_products=6
    )

    print("Precision@5:", precision)
    print("Recall@5:", recall)
    print("Recommendation Coverage:", coverage)

