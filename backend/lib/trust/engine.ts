/**
 * Trust Engine - Main API for trust computation
 *
 * Provides high-level functions for computing and managing trust using
 * similarity-based diffusion algorithm.
 */

import { inferTrust, inferTrustBatch, explainTrustInference, type InferenceResult } from './propagation';
import type { TrustVector } from './similarity';
import {
  listUserTrust,
  getTrustValue,
  storePropagatedTrust,
  getAllUsersTrust,
} from '../db/trust';
import { queryAssertionsByType } from '../db/assertions';
import type { Assertion } from '@nudge/shared';
import { getDefaultTrust } from '../../../shared/constants/trust-defaults';

/**
 * Build trust vectors for all users from database
 *
 * @returns Array of trust vectors (sparse representation)
 */
export async function buildUserTrustVectors(): Promise<{
  vectors: TrustVector[];
  valueMap: Map<string, Map<string, number>>;
}> {
  // Load all users' explicit trust values from database
  const allUsersTrust = await getAllUsersTrust();

  const vectors: TrustVector[] = [];
  const valueMap = new Map<string, Map<string, number>>();

  for (const [userId, trustRelationships] of allUsersTrust.entries()) {
    const values = new Map<string, number>();

    // Only include explicit (direct) trust values
    for (const rel of trustRelationships) {
      if (rel.isDirectTrust) {
        values.set(rel.targetId, rel.trustValue);
      }
    }

    // Only create vector if user has explicit values
    if (values.size > 0) {
      vectors.push({ userId, values });
      valueMap.set(userId, values);
    }
  }

  return { vectors, valueMap };
}

/**
 * Compute trust values for all assertions in a user's network
 *
 * This is the main function used to update a user's trust cache
 * after they set new trust values or when assertions change.
 */
export async function computeUserTrustNetwork(
  userId: string
): Promise<Map<string, number>> {
  console.log(`Computing trust network for user ${userId}`);

  // 1. Build trust vectors for all users
  const { vectors, valueMap } = await buildUserTrustVectors();
  console.log(`Built ${vectors.length} user trust vectors`);

  // 2. Load assertions to compute trust for
  const assertions: Assertion[] = [];
  const types = ['factual', 'wiki_import', 'news_import', 'opinion', 'prediction'];

  // Load assertions incrementally
  for (const type of types) {
    const { assertions: typeAssertions } = await queryAssertionsByType(type, 500);
    assertions.push(...typeAssertions);
  }
  console.log(`Loaded ${assertions.length} assertions`);

  // 3. Collect all entities that need trust computation
  const entities = new Set<string>();
  const entityTypes = new Map<string, 'user' | 'source' | 'bot' | 'assertion' | 'group'>();

  // Add assertions
  for (const assertion of assertions) {
    entities.add(assertion.assertionId);
    entityTypes.set(assertion.assertionId, 'assertion');

    // Add sources (for provenance chain computation)
    if (assertion.sourceId) {
      entities.add(assertion.sourceId);
      const sourceType = assertion.sourceType === 'bot' ? 'bot' : 'source';
      entityTypes.set(assertion.sourceId, sourceType);
    }

    // Add import bots (for provenance chain)
    if (assertion.importedBy) {
      entities.add(assertion.importedBy);
      entityTypes.set(assertion.importedBy, 'bot');
    }
  }

  console.log(`Computing trust for ${entities.size} entities`);

  // 4. Infer trust for all entities using similarity-based diffusion
  const targetIds = Array.from(entities);
  const results = inferTrustBatch(
    userId,
    targetIds,
    entityTypes,
    vectors,
    valueMap
  );

  // 5. Apply provenance chain: effective_trust = min(trust_in_bot, trust_in_source)
  const trustValues = new Map<string, number>();

  for (const assertion of assertions) {
    const assertionResult = results.get(assertion.assertionId);
    let assertionTrust = assertionResult?.trustValue ?? getDefaultTrust(assertion.assertionId, 'assertion', userId);

    // If imported, apply provenance chain
    if (assertion.importedBy && assertion.sourceId) {
      const botResult = results.get(assertion.importedBy);
      const sourceResult = results.get(assertion.sourceId);

      const botTrust = botResult?.trustValue ?? getDefaultTrust(assertion.importedBy, 'bot', userId);
      const sourceTrust = sourceResult?.trustValue ?? getDefaultTrust(assertion.sourceId, 'source', userId);

      // Effective trust is minimum of bot and source
      const effectiveTrust = Math.min(botTrust, sourceTrust);

      // Use the more restrictive trust value
      assertionTrust = Math.min(assertionTrust, effectiveTrust);
    }

    trustValues.set(assertion.assertionId, assertionTrust);
  }

  // 6. Store propagated values in database
  const propagatedValues = new Map<
    string,
    { value: number; confidence: number; sources: string[] }
  >();

  for (const [entityId, trustValue] of trustValues.entries()) {
    const result = results.get(entityId);

    if (result) {
      // Get explanation for trust sources
      const explanation = await explainTrustInference(
        userId,
        entityId,
        vectors,
        valueMap,
        { topN: 5 }
      );

      propagatedValues.set(entityId, {
        value: trustValue,
        confidence: result.confidence,
        sources: explanation.map((e) => e.userId),
      });
    }
  }

  console.log(`Storing ${propagatedValues.size} propagated trust values`);
  await storePropagatedTrust(userId, propagatedValues);

  return trustValues;
}

/**
 * Get trust value for a specific entity (assertion, source, user, etc.)
 *
 * Returns cached value if available, otherwise computes on-demand.
 *
 * @param userId - The user to get trust for
 * @param entityId - The entity to get trust in
 * @param entityType - The type of entity (defaults to 'assertion')
 * @returns Trust value between 0 and 1
 */
export async function getUserTrustForEntity(
  userId: string,
  entityId: string,
  entityType: 'user' | 'source' | 'bot' | 'assertion' | 'group' = 'assertion'
): Promise<number> {
  // Check if we have a cached value
  const cachedTrust = await getTrustValue(userId, entityId);

  if (cachedTrust) {
    return cachedTrust.trustValue;
  }

  // If no cached value, compute on-demand
  const { vectors, valueMap } = await buildUserTrustVectors();
  const result = inferTrust(userId, entityId, entityType, vectors, valueMap);

  return result.trustValue;
}

/**
 * Get trust value for a specific assertion (convenience function)
 *
 * Returns cached value if available, otherwise computes on-demand.
 */
export async function getUserTrustForAssertion(
  userId: string,
  assertionId: string
): Promise<number> {
  return getUserTrustForEntity(userId, assertionId, 'assertion');
}

/**
 * Get trust values for multiple assertions
 *
 * Efficiently batch-loads from cache or computes on-demand.
 */
export async function getUserTrustForAssertions(
  userId: string,
  assertionIds: string[]
): Promise<Map<string, number>> {
  const trustMap = new Map<string, number>();

  // Load from database
  const { getTrustValues } = await import('../db/trust');
  const cachedValues = await getTrustValues(userId, assertionIds);

  // Check which values we need to compute
  const missingIds: string[] = [];
  for (const assertionId of assertionIds) {
    const cached = cachedValues.get(assertionId);
    if (cached) {
      trustMap.set(assertionId, cached.trustValue);
    } else {
      missingIds.push(assertionId);
    }
  }

  // Compute missing values on-demand
  if (missingIds.length > 0) {
    const { vectors, valueMap } = await buildUserTrustVectors();
    const entityTypes = new Map<string, 'user' | 'source' | 'bot' | 'assertion' | 'group'>();
    for (const id of missingIds) {
      entityTypes.set(id, 'assertion');
    }

    const results = inferTrustBatch(userId, missingIds, entityTypes, vectors, valueMap);

    for (const [entityId, result] of results.entries()) {
      trustMap.set(entityId, result.trustValue);
    }
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
    const trust = trustValues.get(a.assertionId) ?? getDefaultTrust(a.assertionId, 'assertion', userId);
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
    const trustA = trustValues.get(a.assertionId) ?? getDefaultTrust(a.assertionId, 'assertion', userId);
    const trustB = trustValues.get(b.assertionId) ?? getDefaultTrust(b.assertionId, 'assertion', userId);
    return trustB - trustA; // Descending
  });
}

/**
 * Get trust explanation for an entity
 *
 * Returns information about why the user should trust/distrust this entity,
 * showing which similar users influenced the inferred value.
 */
export async function getTrustExplanation(
  userId: string,
  entityId: string
): Promise<{
  trustValue: number;
  confidence: number;
  isExplicit: boolean;
  contributors: Array<{
    userId: string;
    similarity: number;
    trustValue: number;
    contribution: number;
  }>;
}> {
  // Get cached trust
  const cachedTrust = await getTrustValue(userId, entityId);

  // Build trust vectors for explanation
  const { vectors, valueMap } = await buildUserTrustVectors();

  // Get explanation
  const contributors = await explainTrustInference(
    userId,
    entityId,
    vectors,
    valueMap,
    { topN: 10 }
  );

  // Check if this is explicit trust
  const userValues = valueMap.get(userId);
  const isExplicit = userValues?.has(entityId) ?? false;

  return {
    trustValue: cachedTrust?.trustValue ?? getDefaultTrust(entityId, 'assertion', userId),
    confidence: cachedTrust?.propagationConfidence ?? 0,
    isExplicit,
    contributors,
  };
}

/**
 * Compute trust for an assertion with provenance chain
 *
 * For imported content, effective trust = min(trust_in_bot, trust_in_source)
 * This allows users to trust sources while distrusting import mechanisms.
 */
export async function computeAssertionTrustWithProvenance(
  userId: string,
  assertion: Assertion
): Promise<{
  assertionTrust: number;
  sourceTrust?: number;
  importBotTrust?: number;
  effectiveTrust: number;
}> {
  const { vectors, valueMap } = await buildUserTrustVectors();

  // Get trust in assertion itself
  const assertionResult = inferTrust(
    userId,
    assertion.assertionId,
    'assertion',
    vectors,
    valueMap
  );

  let result = {
    assertionTrust: assertionResult.trustValue,
    effectiveTrust: assertionResult.trustValue,
  } as {
    assertionTrust: number;
    sourceTrust?: number;
    importBotTrust?: number;
    effectiveTrust: number;
  };

  // If imported, apply provenance chain
  if (assertion.importedBy && assertion.sourceId) {
    const botResult = inferTrust(userId, assertion.importedBy, 'bot', vectors, valueMap);
    const sourceResult = inferTrust(userId, assertion.sourceId, 'source', vectors, valueMap);

    result.sourceTrust = sourceResult.trustValue;
    result.importBotTrust = botResult.trustValue;

    // Effective trust is minimum of bot and source
    const provenanceTrust = Math.min(botResult.trustValue, sourceResult.trustValue);

    // Final trust is minimum of assertion trust and provenance trust
    result.effectiveTrust = Math.min(result.assertionTrust, provenanceTrust);
  }

  return result;
}
