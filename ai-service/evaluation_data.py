
def prepare_evaluation_data(db):
    """
    Fetch purchase and review interactions from MongoDB,
    then create training data and leave-one-out test cases.
    """

    interactions = []

    # -----------------------------------------
    # 1. Collect purchase interactions
    # -----------------------------------------

    orders = db["orders"].find(
        {},
        {"user": 1, "items.product": 1, "items.quantity": 1}
    )

    for order in orders:

        user_id = order.get("user")

        if not user_id:
            continue

        for item in order.get("items", []):

            product_id = item.get("product")

            if not product_id:
                continue

            quantity = item.get("quantity", 1)

            interactions.append({
                "user_id": str(user_id),
                "product_id": str(product_id),
                "score": min(float(quantity), 3.0)
            })

    # -----------------------------------------
    # 2. Collect review interactions
    # -----------------------------------------

    reviews = db["reviews"].find(
        {},
        {"user": 1, "product": 1, "rating": 1}
    )

    for review in reviews:

        user_id = review.get("user")
        product_id = review.get("product")
        rating = review.get("rating", 0)

        if not user_id or not product_id:
            continue

        interactions.append({
            "user_id": str(user_id),
            "product_id": str(product_id),
            "score": float(rating) / 5.0
        })

    # -----------------------------------------
    # 3. Combine duplicate user-product records
    # -----------------------------------------

    combined = {}

    for interaction in interactions:

        key = (
            interaction["user_id"],
            interaction["product_id"]
        )

        if key not in combined:
            combined[key] = 0.0

        combined[key] += interaction["score"]

    combined_interactions = [
        {
            "user_id": user_id,
            "product_id": product_id,
            "score": score
        }
        for (user_id, product_id), score in combined.items()
    ]

    # -----------------------------------------
    # 4. Group products by customer
    # -----------------------------------------

    user_products = {}

    for interaction in combined_interactions:

        user_id = interaction["user_id"]

        user_products.setdefault(user_id, []).append(
            interaction["product_id"]
        )

    
    # -----------------------------------------
    # 5. Create training and testing datasets
    # -----------------------------------------

    train_data = []
    test_cases = []

    # Find test cases that CF can actually evaluate.
    # Another customer must have both the seed product
    # and held-out product in their training interactions.

    candidate_cases = []

    for user_id, product_ids in user_products.items():

        product_ids = sorted(set(product_ids))

        if len(product_ids) < 2:
            continue

        seed_product_id = product_ids[0]
        held_out_product_id = product_ids[-1]

        # Check whether another customer has both products
        collaborative_support = False

        for other_user_id, other_products in user_products.items():

            if other_user_id == user_id:
                continue

            other_products = set(other_products)

            if (
                seed_product_id in other_products
                and held_out_product_id in other_products
            ):
                collaborative_support = True
                break

        if collaborative_support:

            candidate_cases.append({
                "user_id": user_id,
                "seed_product_id": seed_product_id,
                "relevant_product_ids": [held_out_product_id]
            })

    # Use the first valid candidate for this small dataset
    if candidate_cases:

        selected_case = candidate_cases[0]
        test_cases.append(selected_case)

        held_out_user_id = selected_case["user_id"]
        held_out_product_id = selected_case["relevant_product_ids"][0]

        # Remove only the selected customer's held-out interaction.
        # Keep the same product in other customers' training data.

        for interaction in combined_interactions:

            if (
                interaction["user_id"] == held_out_user_id
                and interaction["product_id"] == held_out_product_id
            ):
                continue

            train_data.append(interaction)

    else:

        print(
            "No suitable collaborative filtering test case found. "
            "More overlapping customer interactions are required."
        )

    return train_data, test_cases

if __name__ == "__main__":
    from app import db

    if db is None:
        print("MongoDB connection unavailable.")

    else:
        train_data, test_cases = prepare_evaluation_data(db)

        print("\n--- Evaluation Data Summary ---")
        print("Training interactions:", len(train_data))
        print("Testing cases:", len(test_cases))

        print("\nTraining data:")
        for item in train_data:
            print(item)

        print("\nTesting cases:")
        for case in test_cases:
            print(case)
