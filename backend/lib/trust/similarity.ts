/**
 * Similarity computation for trust inference
 *
 * This module implements similarity-based trust diffusion, replacing the
 * PageRank-style graph propagation. Trust is inferred based on similarity
 * in trust space: users with similar trust patterns are "nearby" and
 * influence each other's inferred values.
 *
 * Key properties:
 * - Non-transitive: Influence based on similarity, not paths
 * - Finds "people like me": Explicit goal of the algorithm
 * - Discovers Schelling points: Sources trusted across communities
 * - Scalable: O(N) naive, O(log N) with ANN structures
 */

import { MIN_OVERLAP_FOR_SIMILARITY } from "../../../shared/constants/defaults";

/**
 * A user's trust vector - sparse representation of their trust values
 */
export interface TrustVector {
  userId: string;
  values: Map<string, number>; // entityId -> trust value (0.0 to 1.0)
}

/**
 * Result of a similarity computation
 */
export interface SimilarityResult {
  userId: string;
  similarity: number;
  overlapCount: number;
}

/**
 * Compute cosine similarity between two users' trust vectors
 *
 * Only considers entities that BOTH users have explicitly set trust for.
 * Returns 0 if there's insufficient overlap (< MIN_OVERLAP_FOR_SIMILARITY).
 *
 * @param userA - First user's trust vector
 * @param userB - Second user's trust vector
 * @param minOverlap - Minimum number of shared entities required (default: 3)
 * @returns Similarity value between -1 and 1 (or 0 if insufficient overlap)
 */
export function computeCosineSimilarity(
  userA: TrustVector,
  userB: TrustVector,
  minOverlap: number = MIN_OVERLAP_FOR_SIMILARITY
): number {
  // Find entities both users have opinions on
  const overlappingEntities: string[] = [];
  for (const entityId of userA.values.keys()) {
    if (userB.values.has(entityId)) {
      overlappingEntities.push(entityId);
    }
  }

  // Insufficient overlap - can't reliably judge similarity
  if (overlappingEntities.length < minOverlap) {
    return 0;
  }

  // Compute cosine similarity on overlapping dimensions only
  let dotProduct = 0;
  let normASquared = 0;
  let normBSquared = 0;

  for (const entityId of overlappingEntities) {
    const valueA = userA.values.get(entityId)!;
    const valueB = userB.values.get(entityId)!;

    dotProduct += valueA * valueB;
    normASquared += valueA * valueA;
    normBSquared += valueB * valueB;
  }

  // Avoid division by zero
  if (normASquared === 0 || normBSquared === 0) {
    return 0;
  }

  const normA = Math.sqrt(normASquared);
  const normB = Math.sqrt(normBSquared);

  return dotProduct / (normA * normB);
}

/**
 * Compute Euclidean distance between two users in trust space
 *
 * Only considers overlapping dimensions. Returns Infinity if insufficient overlap.
 *
 * @param userA - First user's trust vector
 * @param userB - Second user's trust vector
 * @param minOverlap - Minimum number of shared entities required
 * @returns Euclidean distance (0 to ~sqrt(2) for normalized trust values)
 */
export function computeEuclideanDistance(
  userA: TrustVector,
  userB: TrustVector,
  minOverlap: number = MIN_OVERLAP_FOR_SIMILARITY
): number {
  // Find overlapping entities
  const overlappingEntities: string[] = [];
  for (const entityId of userA.values.keys()) {
    if (userB.values.has(entityId)) {
      overlappingEntities.push(entityId);
    }
  }

  // Insufficient overlap
  if (overlappingEntities.length < minOverlap) {
    return Infinity;
  }

  // Compute squared distance
  let sumSquaredDiff = 0;
  for (const entityId of overlappingEntities) {
    const valueA = userA.values.get(entityId)!;
    const valueB = userB.values.get(entityId)!;
    const diff = valueA - valueB;
    sumSquaredDiff += diff * diff;
  }

  return Math.sqrt(sumSquaredDiff);
}

/**
 * Compute Gaussian kernel weight from cosine similarity
 *
 * Uses the formula: similarity = exp(-distance² / σ²)
 * where distance = sqrt(2 * (1 - cosineSimilarity)) for unit vectors
 *
 * This converts cosine similarity [-1, 1] to a Gaussian-weighted similarity [0, 1].
 *
 * @param cosineSimilarity - Cosine similarity between -1 and 1
 * @param sigma - Bandwidth parameter (larger = wider diffusion)
 * @returns Gaussian-weighted similarity between 0 and 1
 */
export function computeGaussianKernel(
  cosineSimilarity: number,
  sigma: number
): number {
  // Convert cosine similarity to distance
  // For normalized vectors: distance² = 2(1 - cosine_similarity)
  const distanceSquared = 2 * (1 - cosineSimilarity);

  // Apply Gaussian kernel
  const sigmaSquared = sigma * sigma;
  return Math.exp(-distanceSquared / sigmaSquared);
}

/**
 * Find all users similar to a given user
 *
 * Computes similarity between the target user and all other users,
 * returning those with non-zero similarity.
 *
 * @param targetUser - The user to find similar users for
 * @param allUsers - All other users' trust vectors
 * @param sigma - Bandwidth parameter for Gaussian kernel
 * @param maxComparisons - Maximum number of users to compare (for performance)
 * @returns Array of similar users sorted by similarity (descending)
 */
export function findSimilarUsers(
  targetUser: TrustVector,
  allUsers: TrustVector[],
  sigma: number,
  maxComparisons?: number
): SimilarityResult[] {
  const results: SimilarityResult[] = [];

  // Limit comparisons for performance in naive implementation
  const usersToCompare = maxComparisons
    ? allUsers.slice(0, maxComparisons)
    : allUsers;

  for (const otherUser of usersToCompare) {
    // Skip self-comparison
    if (otherUser.userId === targetUser.userId) {
      continue;
    }

    // Compute cosine similarity
    const cosineSim = computeCosineSimilarity(targetUser, otherUser);

    // Skip if no overlap
    if (cosineSim === 0) {
      continue;
    }

    // Apply Gaussian kernel
    const gaussianSim = computeGaussianKernel(cosineSim, sigma);

    // Count overlap for debugging/analysis
    let overlapCount = 0;
    for (const entityId of targetUser.values.keys()) {
      if (otherUser.values.has(entityId)) {
        overlapCount++;
      }
    }

    results.push({
      userId: otherUser.userId,
      similarity: gaussianSim,
      overlapCount,
    });
  }

  // Sort by similarity (descending)
  results.sort((a, b) => b.similarity - a.similarity);

  return results;
}

/**
 * Compute similarity-weighted average trust value
 *
 * Given a set of users with their similarities and trust values for a target,
 * computes the weighted average.
 *
 * @param similarUsers - Users and their similarity weights
 * @param getTrustValue - Function to get each user's trust value for the target
 * @returns Weighted average trust value and total weight (for confidence)
 */
export function computeWeightedAverage(
  similarUsers: SimilarityResult[],
  getTrustValue: (userId: string) => number | undefined
): { weightedAverage: number; totalWeight: number } {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const { userId, similarity } of similarUsers) {
    const trustValue = getTrustValue(userId);

    // Skip if this user doesn't have a trust value for the target
    if (trustValue === undefined) {
      continue;
    }

    weightedSum += similarity * trustValue;
    totalWeight += similarity;
  }

  if (totalWeight === 0) {
    return { weightedAverage: 0, totalWeight: 0 };
  }

  return {
    weightedAverage: weightedSum / totalWeight,
    totalWeight,
  };
}
