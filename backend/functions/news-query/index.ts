/**
 * News Query Lambda - Get trust-filtered news feed
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { queryRecentAssertions } from '../../lib/db/assertions';
import { getUserProfile } from '../../lib/db/users';
import { getUserTrustForAssertions } from '../../lib/trust/engine';
import { getUserId } from '../../lib/utils/auth';
import { successResponse, errorResponse } from '../../lib/utils/response';
import type { Assertion, NewsFeedItem } from '@nudge/shared';

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('NewsQuery event:', JSON.stringify(event, null, 2));

  try {
    const userId = getUserId(event);
    const params = event.queryStringParameters || {};
    const limit = params.limit ? parseInt(params.limit, 10) : 50;
    const since = params.since; // ISO timestamp

    // Get user profile for trust threshold
    const profile = await getUserProfile(userId);
    const threshold = profile.defaultTrustThreshold;

    // Query recent news assertions
    const assertions = await queryRecentAssertions(limit * 2, since);

    if (assertions.length === 0) {
      return successResponse({
        items: [],
        total: 0,
      });
    }

    // Get trust values for all assertions
    const trustValues = await getUserTrustForAssertions(
      userId,
      assertions.map((a) => a.assertionId)
    );

    // Filter and score assertions
    const feedItems: NewsFeedItem[] = [];

    for (const assertion of assertions) {
      const trustValue = trustValues.get(assertion.assertionId) ?? 0.5;

      // Filter by threshold
      if (trustValue >= threshold) {
        // Calculate recency score (decay over 24 hours)
        const hoursAgo = assertion.publishedAt
          ? (Date.now() - new Date(assertion.publishedAt).getTime()) / (1000 * 60 * 60)
          : 999;
        const recencyScore = 1 / (1 + hoursAgo / 24);

        // Combined score: 70% trust, 30% recency
        const score = trustValue * 0.7 + recencyScore * 0.3;

        feedItems.push({
          assertionId: assertion.assertionId,
          content: typeof assertion.content === 'string'
            ? assertion.content
            : JSON.stringify(assertion.content),
          sourceId: assertion.sourceId,
          sourceName: assertion.sourceId, // TODO: Map to friendly name
          trustValue,
          publishedAt: assertion.publishedAt || assertion.createdAt,
          url: assertion.url,
          score,
        });
      }
    }

    // Sort by score (descending)
    feedItems.sort((a, b) => b.score - a.score);

    // Limit to requested number
    const limitedItems = feedItems.slice(0, limit);

    return successResponse({
      items: limitedItems,
      total: limitedItems.length,
      threshold,
    });
  } catch (error) {
    console.error('NewsQuery error:', error);
    return errorResponse(error);
  }
}
