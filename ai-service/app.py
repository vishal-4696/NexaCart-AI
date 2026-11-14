import os
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from bson import ObjectId

from collaborative import get_collaborative_recommendations

from hybrid import generate_hybrid_recommendations

# Load .env from the same folder as app.py
BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_FILE, override=True)

app = Flask(__name__)
CORS(app)


# MongoDB connection
MONGODB_URI = os.getenv("MONGODB_URI")

client = None
db = None

try:
    print("Environment file exists:", ENV_FILE.exists())
    print("MongoDB URI loaded:", bool(MONGODB_URI))

    if not MONGODB_URI:
        raise ValueError("MONGODB_URI is missing from ai-service/.env")

    client = MongoClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=5000
    )

    # Test MongoDB connection
    client.admin.command("ping")

    # Select the NexaCart database
    db = client["test"]

    print("MongoDB connected successfully!")
    print("Database:", db.name)

except Exception as error:
    print("MongoDB connection failed:", error)



# Home route
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "message": "Welcome to NexaCart AI Recommendation Service",
        "status": "Running"
    })


# Health check
@app.route("/health", methods=["GET"])
def health():
    if db is None:
        return jsonify({
            "success": False,
            "message": "MongoDB is not connected"
        }), 503

    return jsonify({
        "success": True,
        "message": "Flask and MongoDB are working",
        "database": db.name,
        "status": "OK"
    })


# Get database collection counts
@app.route("/api/data-summary", methods=["GET"])
def data_summary():
    if db is None:
        return jsonify({
            "success": False,
            "message": "Database connection unavailable"
        }), 503

    try:
        product_count = db["products"].count_documents({})
        active_product_count = db["products"].count_documents({
            "isActive": True
        })
        review_count = db["reviews"].count_documents({})
        order_count = db["orders"].count_documents({})

        return jsonify({
            "success": True,
            "message": "Database data retrieved successfully",
            "collections": {
                "products": product_count,
                "activeProducts": active_product_count,
                "reviews": review_count,
                "orders": order_count
            }
        })

    except Exception as error:
        print("Data summary error:", error)

        return jsonify({
            "success": False,
            "message": "Unable to retrieve database information"
        }), 500


#Fetch data for AI recommendations
@app.route("/api/prepare-data", methods=["GET"])
def prepare_data():
    if db is None:
        return jsonify({
            "success": False,
            "message": "MongoDB is not connected"
        }), 503

    try:
        # Fetch active products
        products = list(db["products"].find(
            {"isActive": True},
            {
                "_id": 1,
                "name": 1,
                "description": 1,
                "category": 1,
                "brand": 1,
                "price": 1,
                "tags": 1,
                "averageRating": 1,
                "reviewCount": 1
            }
        ))

        # Fetch customer reviews
        reviews = list(db["reviews"].find(
            {},
            {
                "_id": 1,
                "user": 1,
                "product": 1,
                "rating": 1
            }
        ))

        # Fetch customer orders
        orders = list(db["orders"].find(
            {},
            {
                "_id": 1,
                "user": 1,
                "items": 1
            }
        ))

        # Convert MongoDB ObjectIds into strings
        for product in products:
            product["_id"] = str(product["_id"])

        for review in reviews:
            review["_id"] = str(review["_id"])
            review["user"] = str(review["user"])
            review["product"] = str(review["product"])

        for order in orders:
            order["_id"] = str(order["_id"])
            order["user"] = str(order["user"])

            for item in order.get("items", []):
                item["product"] = str(item["product"])

        return jsonify({
            "success": True,
            "message": "AI recommendation data prepared successfully",
            "counts": {
                "products": len(products),
                "reviews": len(reviews),
                "orders": len(orders)
            },
            "data": {
                "products": products,
                "reviews": reviews,
                "orders": orders
            }
        })

    except Exception as error:
        print("Data preparation error:", error)

        return jsonify({
            "success": False,
            "message": "Unable to prepare recommendation data"
        }), 500


#Content-Based Filtering using TF-IDF
@app.route("/api/recommendations/content", methods=["GET"])
def content_recommendations():
    if db is None:
        return jsonify({
            "success": False,
            "message": "MongoDB is not connected"
        }), 503

    try:
        # Get the product ID from the URL query parameter
        product_id = request.args.get("product_id")

        if not product_id:
            return jsonify({
                "success": False,
                "message": "Please provide a product_id"
            }), 400

        if not ObjectId.is_valid(product_id):
            return jsonify({
                "success": False,
                "message": "Invalid product ID"
            }), 400

        # Fetch all active products
        products = list(db["products"].find({
            "isActive": True,
            "stock": {"$gt": 0}
        }))

        if len(products) < 2:
            return jsonify({
                "success": True,
                "message": "Not enough products for recommendations",
                "recommendations": []
            })

        # Find the selected product
        selected_index = next(
            (
                index for index, product in enumerate(products)
                if str(product["_id"]) == product_id
            ),
            None
        )

        if selected_index is None:
            return jsonify({
                "success": False,
                "message": "Product not found or inactive"
            }), 404

        # Prepare text from product details
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

        # Convert product text into TF-IDF vectors
        vectorizer = TfidfVectorizer(stop_words="english")
        tfidf_matrix = vectorizer.fit_transform(product_texts)

        # Calculate cosine similarity
        similarity_matrix = cosine_similarity(tfidf_matrix)

        # Get similarity scores for selected product
        similarity_scores = list(
            enumerate(similarity_matrix[selected_index])
        )

        # Sort by highest similarity
        similarity_scores = sorted(
            similarity_scores,
            key=lambda item: item[1],
            reverse=True
        )

        recommendations = []

        # Skip the selected product itself
        for index, score in similarity_scores:
            if index == selected_index:
                continue

            product = products[index]

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
                "similarity": round(float(score), 4)
            })

            if len(recommendations) == 5:
                break

        return jsonify({
            "success": True,
            "message": "Content-based recommendations generated",
            "selectedProduct": str(products[selected_index]["_id"]),
            "recommendations": recommendations
        })

    except ValueError as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 400

    except Exception as error:
        print("CBF recommendation error:", error)

        return jsonify({
            "success": False,
            "message": "Unable to generate recommendations"
        }), 500
    

# Similar Products - Same Subcategory Recommendations

@app.route("/api/recommendations/similar", methods=["GET"])
def similar_products_recommendations():

    if db is None:
        return jsonify({
            "success": False,
            "message": "MongoDB is not connected"
        }), 503

    product_id = request.args.get("product_id")

    if not product_id:
        return jsonify({
            "success": False,
            "message": "Please provide a product_id"
        }), 400

    if not ObjectId.is_valid(product_id):
        return jsonify({
            "success": False,
            "message": "Invalid product ID"
        }), 400

    try:
        # 1. Find the selected product
        selected_product = db["products"].find_one({
            "_id": ObjectId(product_id),
            "isActive": True
        })

        if not selected_product:
            return jsonify({
                "success": False,
                "message": "Product not found or inactive"
            }), 404

        selected_subcategory = str(
            selected_product.get("subCategory") or ""
        ).strip().casefold()

        if not selected_subcategory:
            return jsonify({
                "success": True,
                "message": "Selected product has no subcategory",
                "recommendations": [],
                "count": 0
            }), 200

        # 2. Fetch only products from the same subcategory
        products = list(db["products"].find({
            "isActive": True,
            "subCategory": selected_product.get("subCategory"),
            "_id": {"$ne": ObjectId(product_id)}
        }))

        if not products:
            return jsonify({
                "success": True,
                "message": "No similar products found in this subcategory",
                "selectedSubcategory": selected_product.get("subCategory"),
                "recommendations": [],
                "count": 0
            }), 200

        # 3. Prepare product text for TF-IDF
        all_products = [selected_product] + products
        product_texts = []

        for product in all_products:
            tags = product.get("tags", [])

            if not isinstance(tags, list):
                tags = []

            text = " ".join([
                str(product.get("name") or ""),
                str(product.get("description") or ""),
                str(product.get("category") or ""),
                str(product.get("subCategory") or ""),
                str(product.get("brand") or ""),
                " ".join(str(tag) for tag in tags)
            ])

            product_texts.append(text)

        # 4. Calculate content similarity
        vectorizer = TfidfVectorizer(stop_words="english")
        tfidf_matrix = vectorizer.fit_transform(product_texts)

        similarity_scores = cosine_similarity(
            tfidf_matrix[0:1],
            tfidf_matrix[1:]
        ).flatten()

        # 5. Rank products by similarity
        ranked_products = sorted(
            zip(products, similarity_scores),
            key=lambda item: item[1],
            reverse=True
        )

        recommendations = []

        # 6. Return the top five products
        for product, score in ranked_products[:5]:

            recommendations.append({
                "_id": str(product["_id"]),
                "name": product.get("name", ""),
                "brand": product.get("brand", ""),
                "category": product.get("category", ""),
                "subCategory": product.get("subCategory", ""),
                "description": product.get("description", ""),
                "imageUrl": product.get("imageUrl", ""),
                "price": product.get("price", 0),
                "stock": product.get("stock", 0),
                "averageRating": product.get("averageRating", 0),
                "reviewCount": product.get("reviewCount", 0),
                "similarity": round(float(score), 4)
            })

        return jsonify({
            "success": True,
            "message": "Same-subcategory recommendations generated successfully",
            "selectedProduct": selected_product.get("name", ""),
            "selectedSubcategory": selected_product.get("subCategory", ""),
            "count": len(recommendations),
            "recommendations": recommendations
        }), 200

    except Exception as error:
        print("Similar products error:", error)

        return jsonify({
            "success": False,
            "message": "Unable to generate similar products"
        }), 500

# Collaborative Filtering Recommendations
@app.route("/api/recommendations/collaborative", methods=["GET"])
def collaborative_recommendations():

    if db is None:
        return jsonify({
            "success": False,
            "message": "MongoDB connection unavailable"
        }), 503

    product_id = request.args.get("product_id")

    if not product_id:
        return jsonify({
            "success": False,
            "message": "Please provide a product_id"
        }), 400

    if not ObjectId.is_valid(product_id):
        return jsonify({
            "success": False,
            "message": "Invalid product ID"
        }), 400

    try:
        recommendations = get_collaborative_recommendations(
            db,
            product_id,
            limit=5
        )

        return jsonify({
            "success": True,
            "message": "Collaborative recommendations generated",
            "selectedProduct": product_id,
            "count": len(recommendations),
            "recommendations": recommendations
        })

    except Exception as error:
        print("Collaborative recommendation error:", error)

        return jsonify({
            "success": False,
            "message": "Unable to generate collaborative recommendations"
        }), 500


# Hybrid Recommendation API
@app.route("/api/recommendations/hybrid", methods=["GET"])
def hybrid_recommendations():

    if db is None:
        return jsonify({
            "success": False,
            "message": "MongoDB connection unavailable"
        }), 503

    product_id = request.args.get("product_id")

    if not product_id:
        return jsonify({
            "success": False,
            "message": "Please provide a product_id"
        }), 400

    if not ObjectId.is_valid(product_id):
        return jsonify({
            "success": False,
            "message": "Invalid product ID"
        }), 400

    try:
        # 1. Get Content-Based recommendations
        content_response = content_recommendations()

        # Handle Flask responses that include an error status
        if isinstance(content_response, tuple):
            response, status_code = content_response

            if status_code >= 400:
                return response, status_code

            content_response = response

        content_data = content_response.get_json()

        if not content_data.get("success"):
            return jsonify({
                "success": False,
                "message": "Unable to generate content recommendations"
            }), 500

        content_results = content_data.get(
            "recommendations", []
        )

        # 2. Get Collaborative recommendations
        collaborative_results = get_collaborative_recommendations(
            db,
            product_id,
            limit=5
        )

        # 3. Combine both recommendation systems
        recommendations = generate_hybrid_recommendations(
            content_recommendations=content_results,
            collaborative_recommendations=collaborative_results,
            content_weight=0.6,
            collaborative_weight=0.4,
            limit=5
        )

        # 4. Return final recommendations
        return jsonify({
            "success": True,
            "message": "Hybrid recommendations generated successfully",
            "selectedProduct": product_id,
            "weights": {
                "contentBased": 0.6,
                "collaborative": 0.4
            },
            "count": len(recommendations),
            "recommendations": recommendations
        })

    except Exception as error:
        print("Hybrid recommendation error:", error)

        return jsonify({
            "success": False,
            "message": "Unable to generate hybrid recommendations"
        }), 500

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True
    )
