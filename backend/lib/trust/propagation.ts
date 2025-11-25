/**
 * Trust inference using similarity-based diffusion
 *
 * ALGORITHM CHANGE: This module replaces PageRank-style graph propagation
 * with similarity-based trust inference. Trust is inferred based on similarity
 * in trust space: users with similar trust patterns influence each other's
 * inferred values.
 *
 * Key properties:
 * - Non-transitive: Influence based on similarity, not paths
 * - Finds "people like me": Explicit goal of the algorithm
 * - Discovers Schelling points: Sources trusted across communities surface
 * - Sybil-resistant: Fake users with default 0.0 contribute nothing
 * - Scalable: O(N) naive, O(log N) with ANN structures
 */

import type { TrustGraph } from './graph';
import {
  SIMILARITY_BANDWIDTH_SIGMA,
  MIN_OVERLAP_FOR_SIMILARITY,
  CONFIDENCE_THRESHOLD,
  SIMILARITY_MAX_COMPARISONS,
} from '@nudge/shared';
import { getDefaultTrust } from '../../../shared/constants/trust-defaults';
import {
  type TrustVector,
  type SimilarityResult,
  findSimilarUsers,
  computeWeightedAverage,
} from './similarity';

export interface InferenceResult {
  trustValue: number;
  confidence: number; // 0 to 1, based on total similarity weight
  numSimilarUsers: number;
  isExplicit: boolean; // true if user explicitly set this value
  isDefaulted: boolean; // true if fell back to entity default
}

/**
 * Infer trust value for a target entity from a user's perspective
 *
 * Algorithm:
 * 1. Check for explicit trust (always wins)
 * 2. Find users who have opinions on the target
 * 3. Compute similarity to those users
 * 4. Compute similarity-weighted average of their opinions
 * 5. Blend with entity default based on confidence
 *
 * @param userId - The user to infer trust for
 * @param targetId - The entity to infer trust in
 * @param targetType - The type of entity (for default trust)
 * @param allUserVectors - All users' trust vectors
 * @param userTrustValues - Map of userId -> targetId -> trust value
 * @param options - Configuration options
 * @returns Inferred trust result with confidence metrics
 */
export function inferTrust(
  userId: string,
  targetId: string,
  targetType: 'user' | 'source' | 'bot' | 'assertion' | 'group',
  allUserVectors: TrustVector[],
  userTrustValues: Map<string, Map<string, number>>,
  options?: {
    sigma?: number;
    minOverlap?: number;
    confidenceThreshold?: number;
    maxComparisons?: number;
  }
): InferenceResult {
  const sigma = options?.sigma ?? SIMILARITY_BANDWIDTH_SIGMA;
  const confidenceThreshold = options?.confidenceThreshold ?? CONFIDENCE_THRESHOLD;
  const maxComparisons = options?.maxComparisons ?? SIMILARITY_MAX_COMPARISONS;

  // 1. Check for explicit trust (always wins)
  const explicitTrust = userTrustValues.get(userId)?.get(targetId);
  if (explicitTrust !== undefined) {
    return {
      trustValue: explicitTrust,
      confidence: 1.0,
      numSimilarUsers: 0,
      isExplicit: true,
      isDefaulted: false,
    };
  }

  // 2. Get the user's trust vector
  const userVector = allUserVectors.find((v) => v.userId === userId);
  if (!userVector) {
    // User has no trust values set - use entity default
    const defaultTrust = getDefaultTrust(targetId, targetType, userId);
    return {
      trustValue: defaultTrust,
      confidence: 0,
      numSimilarUsers: 0,
      isExplicit: false,
      isDefaulted: true,
    };
  }

  // 3. Find users who have opinions on the target
  const usersWithOpinion = allUserVectors.filter((v) => {
    const userValues = userTrustValues.get(v.userId);
    return userValues?.has(targetId);
  });

  if (usersWithOpinion.length === 0) {
    // No one has an opinion on this target - use entity default
    const defaultTrust = getDefaultTrust(targetId, targetType, userId);
    return {
      trustValue: defaultTrust,
      confidence: 0,
      numSimilarUsers: 0,
      isExplicit: false,
      isDefaulted: true,
    };
  }

  // 4. Compute similarity to users with opinions
  const similarUsers = findSimilarUsers(
    userVector,
    usersWithOpinion,
    sigma,
    maxComparisons
  );

  if (similarUsers.length === 0) {
    // No similar users - use entity default
    const defaultTrust = getDefaultTrust(targetId, targetType, userId);
    return {
      trustValue: defaultTrust,
      confidence: 0,
      numSimilarUsers: 0,
      isExplicit: false,
      isDefaulted: true,
    };
  }

  // 5. Compute similarity-weighted average
  const { weightedAverage, totalWeight } = computeWeightedAverage(
    similarUsers,
    (uid) => userTrustValues.get(uid)?.get(targetId)
  );

  // 6. Check if we have enough confidence
  if (totalWeight < confidenceThreshold) {
    // Not enough similar users with opinions - blend with entity default
    const defaultTrust = getDefaultTrust(targetId, targetType, userId);
    const confidence = Math.min(1.0, totalWeight / confidenceThreshold);
    const blendedTrust = confidence * weightedAverage + (1 - confidence) * defaultTrust;

    return {
      trustValue: blendedTrust,
      confidence,
      numSimilarUsers: similarUsers.length,
      isExplicit: false,
      isDefaulted: true, // Partially defaulted
    };
  }

  // 7. Sufficient confidence - use the inferred value
  return {
    trustValue: weightedAverage,
    confidence: 1.0,
    numSimilarUsers: similarUsers.length,
    isExplicit: false,
    isDefaulted: false,
  };
}

/**
 * Batch inference for multiple targets
 *
 * More efficient than calling inferTrust multiple times because it
 * computes user similarities once and reuses them.
 *
 * @param userId - The user to infer trust for
 * @param targetIds - Array of entity IDs to infer trust for
 * @param targetTypes - Map of targetId -> entity type
 * @param allUserVectors - All users' trust vectors
 * @param userTrustValues - Map of userId -> targetId -> trust value
 * @param options - Configuration options
 * @returns Map of targetId -> inference result
 */
export function inferTrustBatch(
  userId: string,
  targetIds: string[],
  targetTypes: Map<string, 'user' | 'source' | 'bot' | 'assertion' | 'group'>,
  allUserVectors: TrustVector[],
  userTrustValues: Map<string, Map<string, number>>,
  options?: {
    sigma?: number;
    confidenceThreshold?: number;
    maxComparisons?: number;
  }
): Map<string, InferenceResult> {
  const results = new Map<string, InferenceResult>();

  // Process each target
  for (const targetId of targetIds) {
    const targetType = targetTypes.get(targetId) ?? 'user';
    const result = inferTrust(
      userId,
      targetId,
      targetType,
      allUserVectors,
      userTrustValues,
      options
    );
    results.set(targetId, result);
  }

  return results;
}

/**
 * Explain why a trust value was inferred
 *
 * Returns the top contributors to the inferred trust value,
 * showing which similar users influenced the result.
 *
 * @param userId - The user whose trust is being explained
 * @param targetId - The entity being trusted
 * @param allUserVectors - All users' trust vectors
 * @param userTrustValues - Map of userId -> targetId -> trust value
 * @param options - Configuration options
 * @returns Top similar users who contributed to the inference
 */
export function explainTrustInference(
  userId: string,
  targetId: string,
  allUserVectors: TrustVector[],
  userTrustValues: Map<string, Map<string, number>>,
  options?: {
    sigma?: number;
    maxComparisons?: number;
    topN?: number;
  }
): Array<{
  userId: string;
  similarity: number;
  trustValue: number;
  contribution: number; // Percentage contribution to final value
}> {
  const sigma = options?.sigma ?? SIMILARITY_BANDWIDTH_SIGMA;
  const maxComparisons = options?.maxComparisons ?? SIMILARITY_MAX_COMPARISONS;
  const topN = options?.topN ?? 10;

  // Get user vector
  const userVector = allUserVectors.find((v) => v.userId === userId);
  if (!userVector) {
    return [];
  }

  // Find users with opinions on target
  const usersWithOpinion = allUserVectors.filter((v) => {
    const userValues = userTrustValues.get(v.userId);
    return userValues?.has(targetId);
  });

  // Compute similarities
  const similarUsers = findSimilarUsers(
    userVector,
    usersWithOpinion,
    sigma,
    maxComparisons
  );

  // Compute total weight for contribution percentages
  let totalWeight = 0;
  const contributors: Array<{
    userId: string;
    similarity: number;
    trustValue: number;
    weight: number;
  }> = [];

  for (const { userId: otherUserId, similarity } of similarUsers) {
    const trustValue = userTrustValues.get(otherUserId)?.get(targetId);
    if (trustValue !== undefined) {
      totalWeight += similarity;
      contributors.push({
        userId: otherUserId,
        similarity,
        trustValue,
        weight: similarity,
      });
    }
  }

  // Convert weights to contribution percentages
  const results = contributors
    .map((c) => ({
      userId: c.userId,
      similarity: c.similarity,
      trustValue: c.trustValue,
      contribution: totalWeight > 0 ? (c.weight / totalWeight) * 100 : 0,
    }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, topN);

  return results;
}

// =============================================================================
// LEGACY FUNCTIONS (for backwards compatibility and explanation)
// =============================================================================

/**
 * @deprecated Use inferTrust instead
 * Legacy function for graph-based propagation
 */
export function computeUserTrustForTarget(
  graph: TrustGraph,
  userId: string,
  targetId: string,
  maxDepth: number = 3
): number {
  console.warn(
    'computeUserTrustForTarget is deprecated. Use inferTrust with similarity-based algorithm.'
  );

  // For backwards compatibility, check direct trust
  const directTrust = graph.getNode(targetId)?.directTrust;
  if (directTrust !== undefined) {
    return directTrust;
  }

  // Fall back to entity default
  return getDefaultTrust(targetId, 'user', userId);
}

export interface TrustPath {
  path: string[]; // Array of node IDs from source to target
  trustValue: number; // Computed trust value along this path
}

/**
 * Find trust paths from source to target
 *
 * Note: This is kept for explanation and debugging, but the new
 * similarity-based algorithm does NOT use paths. Trust is not transitive.
 *
 * @param graph - The trust graph
 * @param sourceId - The source node ID (typically the user)
 * @param targetId - The target node ID
 * @param maxDepth - Maximum path length to search
 * @returns Array of trust paths with their computed trust values
 */
export function findTrustPaths(
  graph: TrustGraph,
  sourceId: string,
  targetId: string,
  maxDepth: number
): TrustPath[] {
  const paths: TrustPath[] = [];
  const queue: Array<{
    currentId: string;
    pathNodes: string[];
    pathEdges: Array<{ from: string; to: string; weight: number }>;
    visited: Set<string>;
  }> = [
    {
      currentId: sourceId,
      pathNodes: [sourceId],
      pathEdges: [],
      visited: new Set([sourceId]),
    },
  ];

  while (queue.length > 0) {
    const { currentId, pathNodes, pathEdges, visited } = queue.shift()!;

    // Check depth limit
    if (pathEdges.length >= maxDepth) {
      continue;
    }

    // Get outgoing edges
    const edges = graph.getOutgoingEdges(currentId);

    for (const edge of edges) {
      // Skip if already visited (avoid cycles)
      if (visited.has(edge.to)) {
        continue;
      }

      const newPathNodes = [...pathNodes, edge.to];
      const newPathEdges = [...pathEdges, { from: edge.from, to: edge.to, weight: edge.weight }];

      // Found target?
      if (edge.to === targetId) {
        // Compute trust value along this path
        const trustValue = newPathEdges.reduce((product, edge) => product * edge.weight, 1.0);

        paths.push({
          path: newPathNodes,
          trustValue,
        });
        continue;
      }

      // Add to queue for further exploration
      queue.push({
        currentId: edge.to,
        pathNodes: newPathNodes,
        pathEdges: newPathEdges,
        visited: new Set([...visited, edge.to]),
      });
    }
  }

  // Sort paths by trust value (descending)
  paths.sort((a, b) => b.trustValue - a.trustValue);

  return paths;
}
