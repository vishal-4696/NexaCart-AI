
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from bson import ObjectId


def get_collaborative_recommendations(
    db,
    product_id,
    limit=5,
    training_interactions=None
):
    """
    Generate recommendations using customer purchases
    and product reviews.

    training_interactions:
        Optional list of dictionaries containing:
        user_id, product_id and score.

        If not provided, interactions are fetched from MongoDB.
    """

    interactions = []

    # --------------------------------------------------
    # 1. Use supplied training data or fetch from MongoDB
    # --------------------------------------------------

    if training_interactions is not None:

        interactions = training_interactions.copy()

    else:

        # Get purchase interactions
        orders = db["orders"].find(
            {},
            {"user": 1, "items.product": 1, "items.quantity": 1}
        )

        for order in orders:

            user_id = order.get("user")

            if not user_id:
                continue

            for item in order.get("items", []):

                item_id = item.get("product")

                if not item_id:
                    continue

                quantity = item.get("quantity", 1)

                interactions.append({
                    "user_id": str(user_id),
                    "product_id": str(item_id),
                    "score": min(float(quantity), 3.0)
                })

        # Get review interactions
        reviews = db["reviews"].find(
            {},
            {"user": 1, "product": 1, "rating": 1}
        )

        for review in reviews:

            user_id = review.get("user")
            product_id_value = review.get("product")
            rating = review.get("rating", 0)

            if not user_id or not product_id_value:
                continue

            interactions.append({
                "user_id": str(user_id),
                "product_id": str(product_id_value),
                "score": float(rating) / 5.0
            })

    # --------------------------------------------------
    # 2. Check interaction data
    # --------------------------------------------------

    if not interactions:
        return []

    # --------------------------------------------------
    # 3. Create user-product interaction matrix
    # --------------------------------------------------

    data = pd.DataFrame(interactions)

    required_columns = {"user_id", "product_id", "score"}

    if not required_columns.issubset(data.columns):
        raise ValueError(
            "Training interactions must contain "
            "user_id, product_id and score"
        )

    data["user_id"] = data["user_id"].astype(str)
    data["product_id"] = data["product_id"].astype(str)

    data = data.groupby(
        ["user_id", "product_id"],
        as_index=False
    )["score"].sum()

    interaction_matrix = data.pivot(
        index="user_id",
        columns="product_id",
        values="score"
    ).fillna(0)

    # --------------------------------------------------
    # 4. Check selected product
    # --------------------------------------------------

    selected_product_id = str(product_id)

    if selected_product_id not in interaction_matrix.columns:
        return []

    # --------------------------------------------------
    # 5. Calculate item-to-item cosine similarity
    # --------------------------------------------------

    similarity_matrix = cosine_similarity(
        interaction_matrix.T
    )

    similarity_df = pd.DataFrame(
        similarity_matrix,
        index=interaction_matrix.columns,
        columns=interaction_matrix.columns
    )

    similar_products = similarity_df[
        selected_product_id
    ].drop(selected_product_id)

    similar_products = similar_products.sort_values(
        ascending=False
    )

    # --------------------------------------------------
    # 6. Fetch recommended products from MongoDB
    # --------------------------------------------------

    recommendations = []

    for recommended_id, similarity_score in similar_products.items():

        if similarity_score <= 0:
            continue

        try:

            product = db["products"].find_one({
                "_id": ObjectId(recommended_id),
                "isActive": True,
                "stock": {"$gt": 0}
            })
        
            if not product:
                continue

            recommendations.append({
                "_id": str(product["_id"]),
                "name": product.get("name", ""),
                "description": product.get("description", ""),
                "category": product.get("category", ""),
                "subCategory": product.get("subCategory", ""),
                "brand": product.get("brand", ""),
                "price": product.get("price", 0),
                "stock": product.get("stock", 0),
                "imageUrl": product.get("imageUrl", ""),
                "averageRating": product.get("averageRating", 0),
                "reviewCount": product.get("reviewCount", 0),
                "similarity": round(float(similarity_score), 4)
            })

        except Exception as error:
            print("Recommendation product error:", error)

        if len(recommendations) >= limit:
            break

    return recommendations
