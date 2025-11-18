/**
 * Controversy calculation - measures disagreement in trust across users
 *
 * High controversy = high variance in trust values for related assertions
 * Indicates topics where people disagree significantly
 */

import type { Assertion } from '@nudge/shared';

export interface ControversyScore {
  score: number;              // 0.0 to 1.0, higher = more controversial
  variance: number;           // Statistical variance in trust values
  assertionCount: number;     // Number of assertions analyzed
  userCount: number;          // Number of unique users with opinions
  details?: {
    assertionId: string;
    variance: number;
    trustValues: number[];
  }[];
}

/**
 * Calculate controversy for a set of assertions
 *
 * @param assertions - Assertions to analyze
 * @param trustValuesByAssertion - Map of assertionId -> array of trust values from different users
 * @returns Controversy score
 */
export function calculateControversy(
  assertions: Assertion[],
  trustValuesByAssertion: Map<string, number[]>
): ControversyScore {
  if (assertions.length === 0) {
    return {
      score: 0,
      variance: 0,
      assertionCount: 0,
      userCount: 0,
    };
  }

  const details: ControversyScore['details'] = [];
  let totalVariance = 0;
  let validAssertions = 0;
  const allUsers = new Set<number>();

  for (const assertion of assertions) {
    const trustValues = trustValuesByAssertion.get(assertion.assertionId);

    if (!trustValues || trustValues.length < 2) {
      // Need at least 2 opinions for disagreement
      continue;
    }

    // Track unique trust values (count as different users)
    trustValues.forEach((v) => allUsers.add(v));

    const variance = calculateVariance(trustValues);
    totalVariance += variance;
    validAssertions++;

    details?.push({
      assertionId: assertion.assertionId,
      variance,
      trustValues,
    });
  }

  if (validAssertions === 0) {
    return {
      score: 0,
      variance: 0,
      assertionCount: assertions.length,
      userCount: 0,
    };
  }

  // Average variance across assertions
  const avgVariance = totalVariance / validAssertions;

  // Normalize to 0-1 score
  // Max theoretical variance is 0.25 (when half trust at 0, half at 1)
  // In practice, variance > 0.15 is very controversial
  const normalizedScore = Math.min(1.0, avgVariance / 0.15);

  return {
    score: normalizedScore,
    variance: avgVariance,
    assertionCount: assertions.length,
    userCount: allUsers.size,
    details,
  };
}

/**
 * Calculate variance of an array of numbers
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;

  return variance;
}

/**
 * Calculate standard deviation of an array of numbers
 */
export function calculateStandardDeviation(values: number[]): number {
  return Math.sqrt(calculateVariance(values));
}

/**
 * Calculate controversy for a topic across multiple users' perspectives
 *
 * This gathers trust values from user trust networks to find disagreement
 */
export function calculateTopicControversy(
  topicAssertions: Assertion[],
  userTrustMaps: Map<string, Map<string, number>>  // userId -> (assertionId -> trustValue)
): ControversyScore {
  // Collect trust values by assertion across all users
  const trustValuesByAssertion = new Map<string, number[]>();

  for (const assertion of topicAssertions) {
    const values: number[] = [];

    for (const [userId, userTrusts] of userTrustMaps.entries()) {
      const trustValue = userTrusts.get(assertion.assertionId);
      if (trustValue !== undefined) {
        values.push(trustValue);
      }
    }

    if (values.length > 0) {
      trustValuesByAssertion.set(assertion.assertionId, values);
    }
  }

  return calculateControversy(topicAssertions, trustValuesByAssertion);
}
