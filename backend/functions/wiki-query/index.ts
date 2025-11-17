/**
 * Wiki Query Lambda - Generate wiki articles from assertions
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { queryAssertionsByTopic } from '../../lib/db/assertions';
import { getUserProfile } from '../../lib/db/users';
import { getUserTrustForAssertions } from '../../lib/trust/engine';
import { getCachedContent, cacheGeneratedContent, isCacheValid } from '../../lib/db/cache';
import { generateWikiArticle } from '../../lib/llm/generation';
import { getUserId } from '../../lib/utils/auth';
import { successResponse, errorResponse, badRequestResponse } from '../../lib/utils/response';

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('WikiQuery event:', JSON.stringify(event, null, 2));

  try {
    const userId = getUserId(event);
    const topic = event.pathParameters?.topic;

    if (!topic) {
      return badRequestResponse('Topic is required');
    }

    // Decode topic from URL (handles spaces and special chars)
    const decodedTopic = decodeURIComponent(topic);

    // Get user profile for trust threshold
    const profile = await getUserProfile(userId);
    const threshold = profile.defaultTrustThreshold;

    // Query assertions by topic
    const { assertions } = await queryAssertionsByTopic(decodedTopic, 100);

    if (assertions.length === 0) {
      return successResponse({
        topic: decodedTopic,
        content: `# ${decodedTopic}\n\nNo assertions found for this topic yet. Try importing content or creating assertions.`,
        assertions: [],
        fromCache: false,
      });
    }

    // Get trust values for all assertions
    const trustValues = await getUserTrustForAssertions(
      userId,
      assertions.map((a) => a.assertionId)
    );

    // Check cache
    const cached = await getCachedContent(userId, 'wiki_article', decodedTopic);

    if (cached) {
      // Validate cache against current trust values
      const trustSnapshot: Record<string, number> = {};
      for (const [id, value] of trustValues.entries()) {
        trustSnapshot[id] = value;
      }

      const valid = await isCacheValid(userId, 'wiki_article', decodedTopic, trustSnapshot);

      if (valid) {
        console.log('Returning cached wiki article');
        return successResponse({
          topic: decodedTopic,
          content: cached.generatedContent,
          assertions: cached.assertionIds,
          fromCache: true,
          generatedAt: cached.generatedAt,
        });
      }
    }

    // Generate new article
    console.log(`Generating wiki article for topic: ${decodedTopic}`);
    const startTime = Date.now();

    const result = await generateWikiArticle(
      decodedTopic,
      assertions,
      trustValues,
      threshold
    );

    const generationTime = Date.now() - startTime;

    // Cache the result
    const trustSnapshot: Record<string, number> = {};
    for (const [id, value] of trustValues.entries()) {
      trustSnapshot[id] = value;
    }

    await cacheGeneratedContent(
      userId,
      'wiki_article',
      decodedTopic,
      result.content,
      result.assertionIds,
      trustSnapshot,
      result.tokensUsed,
      generationTime
    );

    return successResponse({
      topic: decodedTopic,
      content: result.content,
      assertions: result.assertionIds,
      fromCache: false,
      generatedAt: new Date().toISOString(),
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error('WikiQuery error:', error);
    return errorResponse(error);
  }
}
