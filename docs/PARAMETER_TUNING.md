# Trust Algorithm Parameter Tuning Guide

This guide explains the tunable parameters in Nudge's similarity-based trust inference algorithm and provides guidance on when and how to adjust them.

## Overview

The trust algorithm has several parameters that control:
- **Similarity computation**: How we measure alignment between users
- **Confidence blending**: When to fall back to entity defaults
- **Performance limits**: Computational bounds for large datasets

These parameters offer trade-offs between precision, coverage, performance, and computational cost.

---

## Core Parameters

### 1. `SIMILARITY_BANDWIDTH_SIGMA` (σ)

**Location**: `backend/lib/trust/similarity.ts`
**Default**: `0.3`
**Range**: `0.1` to `1.0`

#### What it does
Controls the width of the Gaussian kernel used to weight similar users:
```
weight = exp(-(1 - similarity)² / σ²)
```

- **Lower σ** (e.g., 0.1-0.2): Only very similar users contribute significantly
- **Higher σ** (e.g., 0.5-1.0): More users contribute, even with moderate similarity

#### Impact

| σ Value | Effect | Use Case |
|---------|--------|----------|
| 0.1-0.2 | Very strict - only nearly identical users count | High-precision, low-coverage scenarios |
| 0.3 (default) | Balanced - users with 70%+ similarity contribute | General purpose |
| 0.5-0.7 | Relaxed - moderate similarity counts | Cold-start scenarios, sparse data |
| 0.8-1.0 | Very relaxed - even weak similarity contributes | Maximum coverage, may reduce precision |

#### Tuning guidance

**Increase σ when:**
- Users have few explicit trust values (sparse vectors)
- You want broader coverage at the expense of precision
- Cold-start problem: helping new users get recommendations
- Dataset is small (< 1000 users)

**Decrease σ when:**
- Users have many explicit trust values (dense vectors)
- Precision is more important than coverage
- You want to prevent weak similarities from influencing results
- Dataset is large and well-connected

**Example**: If users typically only set 5-10 trust values, increasing σ to 0.5 may help. If users set 50+ values, decreasing to 0.2 ensures only truly similar users contribute.

---

### 2. `MIN_OVERLAP_FOR_SIMILARITY`

**Location**: `backend/lib/trust/similarity.ts`
**Default**: `3`
**Range**: `1` to `10`

#### What it does
Minimum number of shared entities required to compute similarity between two users.

- Users with fewer than N overlapping trust values are considered "incomparable"
- Prevents spurious similarity from single coincidental matches

#### Impact

| Value | Effect | Use Case |
|-------|--------|----------|
| 1-2 | Very permissive - any overlap counts | Sparse data, maximum coverage |
| 3 (default) | Balanced - requires modest overlap | General purpose |
| 5-7 | Strict - requires substantial overlap | Dense data, high precision |
| 8-10 | Very strict - only deeply overlapping users | Expert communities with many shared references |

#### Tuning guidance

**Increase when:**
- Users typically have many (20+) explicit trust values
- You want to avoid spurious matches
- Community has well-defined shared references (e.g., academic citations)
- Precision is critical

**Decrease when:**
- Users typically have few (< 10) explicit trust values
- Cold-start problem: users struggle to find similar users
- Coverage is more important than precision
- Dataset is small

**Example**: In an academic community where users rate 50+ papers, setting MIN_OVERLAP = 7 ensures similarity is based on meaningful overlap. In a new community where users rate 5 sources, MIN_OVERLAP = 2 prevents isolation.

---

### 3. `CONFIDENCE_THRESHOLD`

**Location**: `backend/lib/trust/propagation.ts`
**Default**: `5.0`
**Range**: `1.0` to `20.0`

#### What it does
Minimum total weight required for full confidence in inferred trust. When total weight is below this threshold, the algorithm blends inferred trust with entity defaults:

```
if (totalWeight < CONFIDENCE_THRESHOLD):
    confidence = totalWeight / CONFIDENCE_THRESHOLD
    trust = confidence × inferredTrust + (1 - confidence) × defaultTrust
```

#### Impact

| Value | Effect | Use Case |
|-------|--------|----------|
| 1-3 | Very confident - small weight suffices | Sparse data, prefer inferred trust |
| 5 (default) | Balanced - requires multiple similar users | General purpose |
| 10-15 | Conservative - requires many similar users | High-stakes decisions |
| 20+ | Very conservative - heavy blending with defaults | Safety-critical applications |

#### Tuning guidance

**Increase when:**
- High-stakes scenarios (e.g., medical information, financial advice)
- You want stronger evidence before trusting inferences
- Entity defaults are well-calibrated
- False positives are more costly than false negatives

**Decrease when:**
- Cold-start scenarios where inference is sparse
- Entity defaults are poorly calibrated (e.g., all 0.0)
- False negatives are more costly than false positives
- Coverage is critical

**Example**: For medical information, CONFIDENCE_THRESHOLD = 15 ensures multiple similar users agree before showing high trust. For general news, CONFIDENCE_THRESHOLD = 3 allows faster bootstrapping.

---

### 4. `SIMILARITY_MAX_COMPARISONS`

**Location**: `backend/lib/trust/similarity.ts`
**Default**: `1000`
**Range**: `100` to `10000`

#### What it does
Maximum number of user comparisons to perform when finding similar users. Prevents performance degradation in large datasets.

- Algorithm stops after comparing N users who have opinions on the target
- Early stopping for computational efficiency

#### Impact

| Value | Effect | Use Case |
|-------|--------|----------|
| 100-500 | Fast, may miss some similar users | Low-latency requirements, large datasets |
| 1000 (default) | Balanced performance and coverage | General purpose |
| 2000-5000 | Thorough, slower | High-quality recommendations, offline computation |
| 10000+ | Exhaustive, potentially slow | Batch processing, comprehensive analysis |

#### Tuning guidance

**Increase when:**
- Running batch inference (offline)
- Dataset has many users with opinions on popular entities
- Accuracy is more important than latency
- User base is highly fragmented (many small clusters)

**Decrease when:**
- Real-time inference with latency requirements (< 100ms)
- Dataset is massive (millions of users)
- Most users cluster well (good coverage with fewer comparisons)
- API response time is critical

**Example**: For real-time feed ranking with 100ms budget, MAX_COMPARISONS = 200 keeps latency low. For nightly batch updates, MAX_COMPARISONS = 5000 ensures thorough analysis.

---

## Performance Considerations

### Computational Complexity

**Similarity computation**: O(N × M) where:
- N = number of users with opinions on target (up to MAX_COMPARISONS)
- M = average overlap size

**Optimization strategies**:
1. **Index by entity**: Pre-compute which users have opinions on each entity
2. **Early stopping**: Use MAX_COMPARISONS to cap worst-case behavior
3. **Batch inference**: Use `inferTrustBatch()` to amortize vector lookups
4. **Caching**: Cache similarity computations for frequently queried pairs

### Memory Usage

**Trust vectors**: O(U × E_avg) where:
- U = total users
- E_avg = average explicit trust values per user

**Typical memory footprint**:
- 10,000 users × 20 values/user × 16 bytes/value ≈ 3 MB
- 100,000 users × 50 values/user × 16 bytes/value ≈ 80 MB

Sparse representation keeps memory manageable even for large datasets.

---

## Scenario-Based Recommendations

### Scenario 1: New Community (Cold Start)
**Challenge**: Few users, sparse trust data, need maximum coverage

**Recommended settings**:
```typescript
SIMILARITY_BANDWIDTH_SIGMA = 0.5        // Relaxed similarity
MIN_OVERLAP_FOR_SIMILARITY = 2          // Low overlap requirement
CONFIDENCE_THRESHOLD = 3.0              // Trust inferences quickly
SIMILARITY_MAX_COMPARISONS = 1000       // Default
```

### Scenario 2: Mature Community (Dense Data)
**Challenge**: Many users, dense trust data, need high precision

**Recommended settings**:
```typescript
SIMILARITY_BANDWIDTH_SIGMA = 0.2        // Strict similarity
MIN_OVERLAP_FOR_SIMILARITY = 5          // Substantial overlap required
CONFIDENCE_THRESHOLD = 8.0              // Require strong evidence
SIMILARITY_MAX_COMPARISONS = 2000       // Thorough search
```

### Scenario 3: High-Stakes Content (Medical, Financial)
**Challenge**: Need maximum safety, minimize false positives

**Recommended settings**:
```typescript
SIMILARITY_BANDWIDTH_SIGMA = 0.25       // Fairly strict
MIN_OVERLAP_FOR_SIMILARITY = 5          // Substantial overlap
CONFIDENCE_THRESHOLD = 15.0             // Very conservative
SIMILARITY_MAX_COMPARISONS = 3000       // Thorough search
```

### Scenario 4: Real-Time Feed (Latency-Critical)
**Challenge**: Need < 50ms response time, millions of users

**Recommended settings**:
```typescript
SIMILARITY_BANDWIDTH_SIGMA = 0.3        // Default
MIN_OVERLAP_FOR_SIMILARITY = 3          // Default
CONFIDENCE_THRESHOLD = 5.0              // Default
SIMILARITY_MAX_COMPARISONS = 200        // Aggressive early stopping
```

### Scenario 5: Diverse User Base (Multiple Communities)
**Challenge**: Different communities with different trust patterns

**Recommended settings**:
```typescript
SIMILARITY_BANDWIDTH_SIGMA = 0.4        // Moderate relaxation
MIN_OVERLAP_FOR_SIMILARITY = 3          // Balanced
CONFIDENCE_THRESHOLD = 6.0              // Slightly conservative
SIMILARITY_MAX_COMPARISONS = 1500       // Extra thoroughness for cross-community discovery
```

---

## Monitoring and Tuning Process

### 1. **Collect Metrics**

Track these metrics to inform parameter tuning:

```typescript
// Coverage metrics
const coverageMetrics = {
  explicitTrustRate: numExplicit / totalQueries,
  inferredTrustRate: numInferred / totalQueries,
  defaultedTrustRate: numDefaulted / totalQueries,
  avgSimilarUsers: totalSimilarUsers / numInferred,
  avgConfidence: totalConfidence / numInferred,
};

// Performance metrics
const perfMetrics = {
  avgInferenceTimeMs: totalTimeMs / totalQueries,
  p95InferenceTimeMs: calculateP95(inferenceTimes),
  avgComparisons: totalComparisons / numInferred,
};

// Quality metrics (if you have ground truth)
const qualityMetrics = {
  precision: truePositives / (truePositives + falsePositives),
  recall: truePositives / (truePositives + falseNegatives),
  ndcg: calculateNDCG(rankedResults, groundTruth),
};
```

### 2. **Identify Issues**

**Low coverage** (high defaultedTrustRate):
- Increase SIMILARITY_BANDWIDTH_SIGMA
- Decrease MIN_OVERLAP_FOR_SIMILARITY
- Decrease CONFIDENCE_THRESHOLD

**Low precision** (inaccurate recommendations):
- Decrease SIMILARITY_BANDWIDTH_SIGMA
- Increase MIN_OVERLAP_FOR_SIMILARITY
- Increase CONFIDENCE_THRESHOLD

**High latency** (slow inference):
- Decrease SIMILARITY_MAX_COMPARISONS
- Consider caching or batch processing

**Low confidence** (excessive blending with defaults):
- Decrease CONFIDENCE_THRESHOLD
- Increase SIMILARITY_BANDWIDTH_SIGMA (to weight more users)

### 3. **A/B Testing**

When tuning parameters in production:

1. **Split traffic**: 90% control, 10% experimental
2. **Measure impact**: Track coverage, precision, latency
3. **Gradual rollout**: If positive, increase to 50%, then 100%
4. **Monitor quality**: Watch for unexpected side effects

**Example A/B test**:
```typescript
const params = userId.hash() % 100 < 10
  ? { sigma: 0.4, minOverlap: 2 }  // Experimental: relaxed
  : { sigma: 0.3, minOverlap: 3 }; // Control: default
```

---

## Advanced: Dynamic Parameter Adjustment

For sophisticated deployments, consider adjusting parameters based on context:

### Per-User Adaptation
```typescript
function getAdaptiveParams(userId: string, userTrustVector: TrustVector) {
  const numExplicitValues = userTrustVector.values.size;

  if (numExplicitValues < 5) {
    // Sparse user: relax parameters for coverage
    return { sigma: 0.5, minOverlap: 2, confidenceThreshold: 3.0 };
  } else if (numExplicitValues > 50) {
    // Dense user: tighten parameters for precision
    return { sigma: 0.2, minOverlap: 5, confidenceThreshold: 8.0 };
  } else {
    // Default
    return { sigma: 0.3, minOverlap: 3, confidenceThreshold: 5.0 };
  }
}
```

### Per-Entity Adaptation
```typescript
function getEntityParams(entityType: EntityType, entityId: string) {
  if (entityType === 'source' && isControversial(entityId)) {
    // Controversial sources: require stronger evidence
    return { confidenceThreshold: 12.0 };
  } else if (entityType === 'assertion' && isHighStakes(entityId)) {
    // High-stakes claims: conservative
    return { sigma: 0.25, confidenceThreshold: 15.0 };
  } else {
    // Default
    return { sigma: 0.3, confidenceThreshold: 5.0 };
  }
}
```

---

## Testing Parameter Changes

Before deploying parameter changes, test with the existing test suite:

```bash
# Run similarity tests with custom parameters
SIMILARITY_BANDWIDTH_SIGMA=0.4 npm test -- similarity.test.ts

# Run propagation tests with custom parameters
CONFIDENCE_THRESHOLD=8.0 npm test -- propagation.test.ts
```

Key tests to watch:
- **Sybil resistance**: Ensure fake users still don't influence results
- **Non-transitivity**: Ensure A→B→C doesn't create A→C
- **Schelling points**: Ensure cross-community sources still surface
- **Coverage**: Check defaultedTrust rate doesn't increase excessively

---

## Summary

**Start with defaults**:
- `SIMILARITY_BANDWIDTH_SIGMA = 0.3`
- `MIN_OVERLAP_FOR_SIMILARITY = 3`
- `CONFIDENCE_THRESHOLD = 5.0`
- `SIMILARITY_MAX_COMPARISONS = 1000`

**Monitor metrics**:
- Coverage (% inferred vs defaulted)
- Performance (inference latency)
- Quality (precision/recall if available)

**Tune conservatively**:
- Change one parameter at a time
- A/B test before full rollout
- Document rationale for changes

**Context matters**:
- Cold-start → relax parameters
- Mature community → tighten parameters
- High-stakes content → conservative
- Latency-critical → reduce MAX_COMPARISONS

The defaults work well for most scenarios. Only tune when metrics clearly indicate an issue.
