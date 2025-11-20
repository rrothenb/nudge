/**
 * Trust propagation algorithm
 *
 * Implements iterative trust diffusion with damping and convergence detection.
 * Based on the algorithm described in trust_knowledge_unified_spec_v2.md
 */
import type { TrustGraph, TrustNode } from './graph';
import {
  DEFAULT_TRUST_VALUE,
  TRUST_DAMPING_FACTOR,
  TRUST_MAX_ITERATIONS,
  TRUST_CONVERGENCE_THRESHOLD,
  TRUST_MAX_DEPTH,
} from '@nudge/shared';

export interface PropagationResult {
  converged: boolean;
  iterations: number;
  changes: Map<string, number>; // nodeId -> new trust value
  stats: {
    nodesUpdated: number;
    maxChange: number;
    averageChange: number;
  };
}

/**
 * Propagate trust through the graph using iterative diffusion
 *
 * Algorithm:
 * 1. Start with direct trust values
 * 2. For each iteration:
 *    - For each node without direct trust:
 *      - Compute trust as weighted average of incoming edges
 *      - Apply damping factor to blend with default trust
 * 3. Repeat until convergence or max iterations
 */
export function propagateTrust(
  graph: TrustGraph,
  options?: {
    dampingFactor?: number;
    maxIterations?: number;
    convergenceThreshold?: number;
    maxDepth?: number;
  }
): PropagationResult {
  const dampingFactor = options?.dampingFactor ?? TRUST_DAMPING_FACTOR;
  const maxIterations = options?.maxIterations ?? TRUST_MAX_ITERATIONS;
  const convergenceThreshold = options?.convergenceThreshold ?? TRUST_CONVERGENCE_THRESHOLD;
  const maxDepth = options?.maxDepth ?? TRUST_MAX_DEPTH;

  const changes = new Map<string, number>();
  let iteration = 0;
  let converged = false;

  // Get all nodes that need trust computation
  const nodesToCompute = graph.getAllNodes().filter((node) => !graph.hasDirectTrust(node.id));

  console.log(`Starting trust propagation for ${nodesToCompute.length} nodes`);

  while (iteration < maxIterations && !converged) {
    iteration++;
    let maxChange = 0;
    let totalChange = 0;
    let nodesUpdated = 0;

    for (const node of nodesToCompute) {
      const oldTrust = graph.getTrustValue(node.id);
      const newTrust = computeNodeTrust(graph, node.id, dampingFactor, maxDepth);

      // Update computed trust
      graph.setComputedTrust(node.id, newTrust);

      // Track changes
      const change = Math.abs(newTrust - oldTrust);
      if (change > 0.001) {
        // Only count non-trivial changes
        changes.set(node.id, newTrust);
        maxChange = Math.max(maxChange, change);
        totalChange += change;
        nodesUpdated++;
      }
    }

    // Check for convergence
    if (maxChange < convergenceThreshold) {
      converged = true;
      console.log(`Trust propagation converged after ${iteration} iterations`);
    }
  }

  const stats = {
    nodesUpdated: changes.size,
    maxChange: Math.max(...Array.from(changes.values()).map((v, i, arr) =>
      Math.abs(v - (arr[i-1] ?? DEFAULT_TRUST_VALUE)))),
    averageChange: changes.size > 0
      ? Array.from(changes.values()).reduce((sum, v) => sum + v, 0) / changes.size
      : 0,
  };

  return {
    converged,
    iterations: iteration,
    changes,
    stats,
  };
}

/**
 * Compute trust value for a single node
 */
function computeNodeTrust(
  graph: TrustGraph,
  nodeId: string,
  dampingFactor: number,
  maxDepth: number,
  currentDepth: number = 0
): number {
  // If node has direct trust, use it
  if (graph.hasDirectTrust(nodeId)) {
    return graph.getTrustValue(nodeId);
  }

  // Limit propagation depth
  if (currentDepth >= maxDepth) {
    return DEFAULT_TRUST_VALUE;
  }

  // Get incoming edges (sources that support this node)
  const incomingEdges = graph.getIncomingEdges(nodeId);

  if (incomingEdges.length === 0) {
    return DEFAULT_TRUST_VALUE;
  }

  // Compute weighted average of incoming trust
  let weightedSum = 0;
  let totalWeight = 0;

  for (const edge of incomingEdges) {
    // Get trust in the source node
    const sourceTrust = graph.getTrustValue(edge.from);

    // Weight by edge weight and source trust
    const weight = edge.weight * sourceTrust;

    weightedSum += weight * sourceTrust;
    totalWeight += weight;
  }

  // Compute raw trust
  const rawTrust = totalWeight > 0 ? weightedSum / totalWeight : DEFAULT_TRUST_VALUE;

  // Apply damping: blend with default trust
  // T_new = α * T_computed + (1 - α) * T_default
  const dampedTrust = dampingFactor * rawTrust + (1 - dampingFactor) * DEFAULT_TRUST_VALUE;

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, dampedTrust));
}

/**
 * Compute trust for a specific target from a user's perspective
 *
 * This is a focused computation that traces trust paths from user to target.
 * More efficient than full graph propagation for single queries.
 */
export function computeUserTrustForTarget(
  graph: TrustGraph,
  userId: string,
  targetId: string,
  maxDepth: number = TRUST_MAX_DEPTH
): number {
  // Check if user has direct trust
  const directTrust = graph.getNode(targetId)?.directTrust;
  if (directTrust !== undefined) {
    return directTrust;
  }

  // Trace trust paths from user to target
  const trustPaths = findTrustPaths(graph, userId, targetId, maxDepth);

  if (trustPaths.length === 0) {
    return DEFAULT_TRUST_VALUE;
  }

  // Compute trust as weighted average of all paths
  let totalTrust = 0;
  let totalWeight = 0;

  for (const trustPath of trustPaths) {
    // Use the pre-computed trust value from the path
    const pathStrength = trustPath.trustValue;

    // Weight longer paths less (decay with distance)
    // path.length includes source, so actual hops = path.length - 1
    const distanceDecay = Math.pow(0.8, trustPath.path.length - 1);
    const weight = pathStrength * distanceDecay;

    totalTrust += weight * pathStrength;
    totalWeight += weight;
  }

  const computedTrust = totalWeight > 0 ? totalTrust / totalWeight : DEFAULT_TRUST_VALUE;

  // Apply damping
  return (
    TRUST_DAMPING_FACTOR * computedTrust + (1 - TRUST_DAMPING_FACTOR) * DEFAULT_TRUST_VALUE
  );
}

export interface TrustPath {
  path: string[]; // Array of node IDs from source to target
  trustValue: number; // Computed trust value along this path
}

/**
 * Find all trust paths from source to target (BFS with depth limit)
 *
 * This function helps explain why a user trusts a particular target by
 * showing all the paths through which trust propagates.
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
    pathNodes: string[]; // Node IDs in the path
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
        // Trust value is the product of all edge weights in the path
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

/**
 * Identify sources of trust for a given node (for explanation)
 */
export function identifyTrustSources(
  graph: TrustGraph,
  nodeId: string,
  minContribution: number = 0.1
): Array<{ sourceId: string; contribution: number }> {
  const incomingEdges = graph.getIncomingEdges(nodeId);
  const sources: Array<{ sourceId: string; contribution: number }> = [];

  for (const edge of incomingEdges) {
    const sourceTrust = graph.getTrustValue(edge.from);
    const contribution = edge.weight * sourceTrust;

    if (contribution >= minContribution) {
      sources.push({
        sourceId: edge.from,
        contribution,
      });
    }
  }

  // Sort by contribution (descending)
  sources.sort((a, b) => b.contribution - a.contribution);

  return sources;
}
