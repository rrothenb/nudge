/**
 * Chat Query Lambda - Chat interface with trust-based knowledge
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { searchAssertions, queryAssertionsByType } from '../../lib/db/assertions';
import { getUserProfile } from '../../lib/db/users';
import { getUserTrustForAssertions } from '../../lib/trust/engine';
import { generateChatResponse, extractSearchKeywords } from '../../lib/llm/generation';
import { getUserId, parseBody } from '../../lib/utils/auth';
import { successResponse, errorResponse, badRequestResponse } from '../../lib/utils/response';

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('ChatQuery event:', JSON.stringify(event, null, 2));

  try {
    const userId = getUserId(event);
    const body = parseBody<{ query: string; conversationId?: string }>(event);

    if (!body.query) {
      return badRequestResponse('Query is required');
    }

    // Get user profile for trust threshold
    const profile = await getUserProfile(userId);
    const threshold = profile.defaultTrustThreshold;

    // Extract keywords from query (for better search)
    // For now, using simple keyword extraction instead of semantic search
    console.log(`Processing chat query: ${body.query}`);

    // Try to find relevant assertions
    // Since we don't have semantic search yet, try:
    // 1. Direct keyword search (not implemented yet)
    // 2. Get recent assertions from all types as fallback
    let relevantAssertions = await searchAssertions(body.query, 50);

    if (relevantAssertions.length === 0) {
      // Fallback: get recent factual and wiki assertions
      const { assertions: factual } = await queryAssertionsByType('factual', 20);
      const { assertions: wiki } = await queryAssertionsByType('wiki_import', 20);
      relevantAssertions = [...factual, ...wiki];

      console.log(`No search results, using ${relevantAssertions.length} fallback assertions`);
    }

    // Get trust values
    const trustValues = await getUserTrustForAssertions(
      userId,
      relevantAssertions.map((a) => a.assertionId)
    );

    // Filter by trust threshold
    const trustedAssertions = relevantAssertions.filter((a) => {
      const trust = trustValues.get(a.assertionId) ?? 0.5;
      return trust >= threshold;
    });

    console.log(`Found ${trustedAssertions.length} trusted assertions`);

    // Generate response
    const result = await generateChatResponse(
      body.query,
      trustedAssertions,
      trustValues
    );

    return successResponse({
      query: body.query,
      response: result.response,
      citedAssertions: result.citedAssertions,
      assertionsConsidered: trustedAssertions.length,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error('ChatQuery error:', error);
    return errorResponse(error);
  }
}
