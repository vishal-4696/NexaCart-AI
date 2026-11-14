# NEXACART AI – FINAL RECOMMENDATION EVALUATION REPORT

## 1. Project Overview

NexaCart AI uses three recommendation approaches:

- Content-Based Filtering (CBF)
- Collaborative Filtering (CF)
- Hybrid Recommendation System

The hybrid system combines CBF and CF using weighted scores:
- Content-Based Filtering: 60%
- Collaborative Filtering: 40%

## 2. Dataset Summary

| Metric | Value |
|---|---:|
| Active Products | 6 |
| Training Interactions | 7 |
| Testing Cases | 1 |
| Orders | 4 |
| Reviews | 8 |
| Customers with order interactions | 2 |

## 3. Evaluation Metrics

### Precision@5
Measures the proportion of recommended products that are relevant among the top five recommendations.

### Recall@5
Measures the proportion of relevant products successfully retrieved among the top five recommendations.

### Recommendation Coverage
Measures the proportion of available products that appear in the recommendation lists.

## 4. Algorithm Comparison

| Algorithm | Precision@5 | Recall@5 | Coverage |
|---|---:|---:|---:|
| CBF | 0.20 | 1.00 | 0.8333 |
| CF | 0.20 | 1.00 | 0.6667 |
| Hybrid | 0.20 | 1.00 | 0.6667 |

## 5. Algorithm Improvements

The recommendation system includes:

1. Weighted Hybrid Recommendation – combines CBF and CF using 60:40 weights.
2. Cold-Start Handling – uses CBF when collaborative recommendations are unavailable.
3. Out-of-Stock Filtering – excludes unavailable products.
4. Recommendation Diversity – limits repeated subcategories to improve variety.
5. Top-K Recommendations – returns up to five products.

## 6. Evaluation Observations

- All three algorithms achieved the same Precision@5 and Recall@5 in the latest evaluation.
- CBF achieved the highest recommendation coverage.
- CF and Hybrid achieved lower coverage in this evaluation.
- The hybrid algorithm combines content and collaborative signals, but did not outperform CBF on the measured metrics.

## 7. Limitations

- The current dataset is very small.
- Only one testing case was available in the latest run.
- The evaluation results are preliminary and cannot establish reliable general performance.
- More customers, products, orders and reviews are needed for a stronger evaluation.

## 8. Conclusion

NexaCart AI successfully implements Content-Based Filtering, Collaborative Filtering and a Hybrid Recommendation System.

The system also includes cold-start handling, stock filtering and recommendation diversity.

The current evaluation provides an initial comparison of the three approaches. Further testing with a larger dataset is required to measure recommendation quality reliably.
