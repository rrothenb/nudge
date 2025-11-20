/**
 * Trust Engine - Main API for trust computation
 *
 * Provides high-level functions for computing and managing trust.
 */
import { TrustGraph, buildTrustGraphFromData } from './graph';
import { propagateTrust, computeUserTrustForTarget, identifyTrustSources } from './propagation';
import {
  listUserTrust,
  getTrustValue,
  storePropagatedTrust,
} from '../db/trust';
import { queryAssertionsByType } from '../db/assertions';
import type { Assertion } from '@nudge/shared';
import { DEFAULT_TRUST_VALUE } from '@nudge/shared';

/**
 * Compute trust values for all assertions in a user's network
 *
 * This is the main function used to update a user's trust cache
 * after they set new trust values.
 */
export async function computeUserTrustNetwork(
  userId: string
): Promise<Map<string, number>> {
  console.log(`Computing trust network for user ${userId}`);

  // 1. Load user's trust relationships
  const { trustRelationships } = await listUserTrust(userId, 1000);
  console.log(`Loaded ${trustRelationships.length} trust relationships`);

  // 2. Load all assertions (for now, limit to recent ones)
  // TODO: In production, load incrementally or only relevant assertions
  const assertions: Assertion[] = [];
  const types = ['factual', 'wiki_import', 'news_import'];

  for (const type of types) {
    const { assertions: typeAssertions } = await queryAssertionsByType(type, 1000);
    assertions.push(...typeAssertions);
  }

  console.log(`Loaded ${assertions.length} assertions`);

  // 3. Build trust graph
  const graph = await buildTrustGraphFromData(userId, trustRelationships, assertions);
  console.log('Trust graph built:', graph.getStats());

  // 4. Propagate trust
  const result = propagateTrust(graph);
  console.log('Trust propagation complete:', result);

  // 5. Extract computed trust values
  const trustValues = new Map<string, number>();
  for (const [nodeId, value] of result.changes.entries()) {
    trustValues.set(nodeId, value);
  }

  // 6. Store propagated values in database
  const propagatedValues = new Map<
    string,
    { value: number; confidence: number; sources: string[] }
  >();

  for (const [nodeId, value] of trustValues.entries()) {
    const sources = identifyTrustSources(graph, nodeId, 0.1);

    // Compute confidence based on:
    // 1. Number of sources (more sources = higher confidence)
    // 2. Average contribution strength
    // 3. Controversy (variance in contributions)
    let confidence = DEFAULT_TRUST_VALUE;
    if (sources.length > 0) {
      const avgContribution = sources.reduce((sum, s) => sum + s.contribution, 0) / sources.length;
      const variance = sources.reduce((sum, s) =>
        sum + Math.pow(s.contribution - avgContribution, 2), 0) / sources.length;

      // Base confidence from number of sources (more sources = higher confidence)
      const sourceConfidence = Math.min(sources.length / 3, 1.0); // Max at 3 sources
      // Strength confidence from average contribution
      const strengthConfidence = avgContribution;
      // Controversy penalty (high variance = lower confidence)
      const controversyPenalty = Math.min(variance * 2, 0.3);

      confidence = Math.max(0, Math.min(1,
        (sourceConfidence * 0.4 + strengthConfidence * 0.6) - controversyPenalty
      ));
    }

    propagatedValues.set(nodeId, {
      value,
      confidence,
      sources: sources.map((s) => s.sourceId),
    });
  }

  await storePropagatedTrust(userId, propagatedValues);

  return trustValues;
}

/**
 * Get trust value for a specific assertion
 *
 * Returns cached value if available, otherwise computes on-demand.
 */
export async function getUserTrustForAssertion(
  userId: string,
  assertionId: string
): Promise<number> {
  // Check if we have a cached value
  const cachedTrust = await getTrustValue(userId, assertionId);

  if (cachedTrust) {
    return cachedTrust.trustValue;
  }

  // If no cached value, return default
  // In a real system, you might trigger background computation here
  return DEFAULT_TRUST_VALUE;
}

/**
 * Get trust values for multiple assertions
 *
 * Efficiently batch-loads from cache.
 */
export async function getUserTrustForAssertions(
  userId: string,
  assertionIds: string[]
): Promise<Map<string, number>> {
  const trustMap = new Map<string, number>();

  // Load from database
  const { getTrustValues } = await import('../db/trust');
  const cachedValues = await getTrustValues(userId, assertionIds);

  // Fill in values
  for (const assertionId of assertionIds) {
    const cached = cachedValues.get(assertionId);
    trustMap.set(assertionId, cached?.trustValue ?? DEFAULT_TRUST_VALUE);
  }

  return trustMap;
}

/**
 * Filter assertions by trust threshold
 *
 * Returns only assertions that meet the user's trust threshold.
 */
export async function filterAssertionsByTrust(
  userId: string,
  assertions: Assertion[],
  threshold: number
): Promise<Assertion[]> {
  const assertionIds = assertions.map((a) => a.assertionId);
  const trustValues = await getUserTrustForAssertions(userId, assertionIds);

  return assertions.filter((a) => {
    const trust = trustValues.get(a.assertionId) ?? DEFAULT_TRUST_VALUE;
    return trust >= threshold;
  });
}

/**
 * Sort assertions by trust value (descending)
 */
export async function sortAssertionsByTrust(
  userId: string,
  assertions: Assertion[]
): Promise<Assertion[]> {
  const assertionIds = assertions.map((a) => a.assertionId);
  const trustValues = await getUserTrustForAssertions(userId, assertionIds);

  return assertions.sort((a, b) => {
    const trustA = trustValues.get(a.assertionId) ?? DEFAULT_TRUST_VALUE;
    const trustB = trustValues.get(b.assertionId) ?? DEFAULT_TRUST_VALUE;
    return trustB - trustA; // Descending
  });
}

/**
 * Get trust explanation for an assertion
 *
 * Returns information about why the user should trust/distrust this assertion.
 */
export async function getTrustExplanation(
  userId: string,
  assertionId: string
): Promise<{
  trustValue: number;
  isDirectTrust: boolean;
  sources: Array<{ sourceId: string; contribution: number }>;
}> {
  // Get cached trust
  const cachedTrust = await getTrustValue(userId, assertionId);

  if (cachedTrust) {
    return {
      trustValue: cachedTrust.trustValue,
      isDirectTrust: cachedTrust.isDirectTrust,
      sources: cachedTrust.propagatedFrom
        ? cachedTrust.propagatedFrom.map((sourceId, index) => ({
            sourceId,
            contribution: 1.0 / (cachedTrust.propagatedFrom?.length ?? 1), // Equal weights for now
          }))
        : [],
    };
  }

  return {
    trustValue: DEFAULT_TRUST_VALUE,
    isDirectTrust: false,
    sources: [],
  };
}
