
from app import db
from evaluation_data import prepare_evaluation_data
from collaborative import get_collaborative_recommendations
from hybrid import generate_hybrid_recommendations
from evaluation import precision_at_k, recall_at_k

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# --------------------------------------------------
# 1. Generate Content-Based recommendations
# --------------------------------------------------

def get_content_recommendations(db, product_id, limit=5):

    products = list(db["products"].find({
        "isActive": True
    }))

    selected_index = next(
        (
            index for index, product in enumerate(products)
            if str(product["_id"]) == str(product_id)
        ),
        None
    )

    if selected_index is None or len(products) < 2:
        return []

    product_texts = []

    for product in products:

        tags = product.get("tags", [])

        if not isinstance(tags, list):
            tags = []

        text = " ".join([
            str(product.get("name") or ""),
            str(product.get("description") or ""),
            str(product.get("category") or ""),
            str(product.get("brand") or ""),
            " ".join(str(tag) for tag in tags)
        ])

        product_texts.append(text)

    try:

        vectorizer = TfidfVectorizer(stop_words="english")
        tfidf_matrix = vectorizer.fit_transform(product_texts)

        similarity_matrix = cosine_similarity(tfidf_matrix)

    except ValueError:
        return []

    similarity_scores = list(
        enumerate(similarity_matrix[selected_index])
    )

    similarity_scores.sort(
        key=lambda item: item[1],
        reverse=True
    )

    recommendations = []

    for index, score in similarity_scores:

        if index == selected_index:
            continue

        product = products[index]

        recommendations.append({
            "_id": str(product["_id"]),
            "similarity": round(float(score), 4)
        })

        if len(recommendations) >= limit:
            break

    return recommendations


# --------------------------------------------------
# 2. Evaluate one recommendation algorithm
# --------------------------------------------------

def evaluate_algorithm(
    algorithm_name,
    train_data,
    test_cases,
    all_product_count
):

    precision_scores = []
    recall_scores = []
    all_recommended_ids = set()

    print(f"\n--- {algorithm_name} ---")

    for case in test_cases:

        seed_product_id = case["seed_product_id"]
        relevant_ids = case["relevant_product_ids"]

        # CBF recommendations
        content_results = get_content_recommendations(
            db,
            seed_product_id,
            limit=5
        )

        # CF recommendations using training data only
        collaborative_results = get_collaborative_recommendations(
            db,
            seed_product_id,
            limit=5,
            training_interactions=train_data
        )

        # Select the requested algorithm
        if algorithm_name == "CBF":
            recommendations = content_results

        elif algorithm_name == "CF":
            recommendations = collaborative_results

        else:
            recommendations = generate_hybrid_recommendations(
                content_recommendations=content_results,
                collaborative_recommendations=collaborative_results,
                content_weight=0.6,
                collaborative_weight=0.4,
                limit=5
            )

        recommended_ids = [
            str(item["_id"])
            for item in recommendations
        ]

        precision = precision_at_k(
            recommended_ids,
            relevant_ids,
            k=5
        )

        recall = recall_at_k(
            recommended_ids,
            relevant_ids,
            k=5
        )

        precision_scores.append(precision)
        recall_scores.append(recall)

        all_recommended_ids.update(recommended_ids)

        print("\nCustomer:", case["user_id"])
        print("Seed product:", seed_product_id)
        print("Relevant products:", relevant_ids)
        print("Recommended products:", recommended_ids)
        print("Precision@5:", precision)
        print("Recall@5:", recall)

    # Calculate average metrics
    average_precision = (
        sum(precision_scores) / len(precision_scores)
        if precision_scores else 0
    )

    average_recall = (
        sum(recall_scores) / len(recall_scores)
        if recall_scores else 0
    )

    coverage = (
        len(all_recommended_ids) / all_product_count
        if all_product_count > 0 else 0
    )

    return {
        "algorithm": algorithm_name,
        "precision": round(average_precision, 4),
        "recall": round(average_recall, 4),
        "coverage": round(coverage, 4)
    }


# --------------------------------------------------
# 3. Main evaluation
# --------------------------------------------------

if __name__ == "__main__":

    if db is None:
        print("MongoDB connection unavailable.")

    else:

        train_data, test_cases = prepare_evaluation_data(db)

        total_products = db["products"].count_documents({
            "isActive": True
        })

        print("\n================================")
        print("NEXACART AI ALGORITHM EVALUATION")
        print("================================")

        print("Training interactions:", len(train_data))
        print("Testing cases:", len(test_cases))
        print("Active products:", total_products)

        if not test_cases:
            print("Not enough customer interactions for evaluation.")

        else:

            results = []

            for algorithm in ["CBF", "CF", "Hybrid"]:

                result = evaluate_algorithm(
                    algorithm,
                    train_data,
                    test_cases,
                    total_products
                )

                results.append(result)

            # Final comparison
            print("\n================================")
            print("FINAL ALGORITHM COMPARISON")
            print("================================")

            print(
                f"{'Algorithm':<12}"
                f"{'Precision@5':<16}"
                f"{'Recall@5':<12}"
                f"{'Coverage':<12}"
            )

            for result in results:

                print(
                    f"{result['algorithm']:<12}"
                    f"{result['precision']:<16}"
                    f"{result['recall']:<12}"
                    f"{result['coverage']:<12}"
                )
