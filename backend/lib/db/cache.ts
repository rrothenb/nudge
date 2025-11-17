/**
 * Generated content cache operations
 */
import { GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, TABLES } from './client';
import type { GeneratedContent, ContentType } from '@nudge/shared';
import { CACHE_TTL_HOURS } from '@nudge/shared';

/**
 * Store generated content in cache
 */
export async function cacheGeneratedContent(
  userId: string,
  contentType: ContentType,
  contentId: string,
  content: string,
  assertionIds: string[],
  trustSnapshot: Record<string, number>,
  claudeTokensUsed: number,
  generationTimeMs: number
): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date();
  const generatedAt = now.toISOString();
  // TTL: seconds since epoch + hours in seconds
  const expiresAt = Math.floor(now.getTime() / 1000) + CACHE_TTL_HOURS * 3600;

  const cachedContent: GeneratedContent = {
    userId,
    contentType,
    contentId,
    generatedContent: content,
    assertionIds,
    trustSnapshot,
    generatedAt,
    expiresAt,
    claudeTokensUsed,
    generationTimeMs,
  };

  await client.send(
    new PutCommand({
      TableName: TABLES.CACHE,
      Item: {
        PK: `USER#${userId}`,
        SK: `CONTENT#${contentType}#${contentId}`,
        ...cachedContent,
      },
    })
  );
}

/**
 * Get cached content if it exists and is still valid
 */
export async function getCachedContent(
  userId: string,
  contentType: ContentType,
  contentId: string
): Promise<GeneratedContent | null> {
  const client = getDynamoDBClient();

  const result = await client.send(
    new GetCommand({
      TableName: TABLES.CACHE,
      Key: {
        PK: `USER#${userId}`,
        SK: `CONTENT#${contentType}#${contentId}`,
      },
    })
  );

  if (!result.Item) {
    return null;
  }

  const { PK, SK, ...content } = result.Item;
  return content as GeneratedContent;
}

/**
 * Check if cached content is still valid
 * Returns true if cache exists and trust values haven't changed significantly
 */
export async function isCacheValid(
  userId: string,
  contentType: ContentType,
  contentId: string,
  currentTrustValues: Record<string, number>,
  maxDiff: number = 0.1 // Allow 0.1 difference in trust values
): Promise<boolean> {
  const cached = await getCachedContent(userId, contentType, contentId);

  if (!cached) {
    return false;
  }

  // Check if trust values have changed significantly
  for (const [targetId, cachedValue] of Object.entries(cached.trustSnapshot)) {
    const currentValue = currentTrustValues[targetId];
    if (currentValue === undefined) {
      continue; // New assertion, will be added next generation
    }

    if (Math.abs(currentValue - cachedValue) > maxDiff) {
      return false; // Trust has changed too much
    }
  }

  return true;
}

/**
 * Invalidate cached content for a user
 */
export async function invalidateCache(
  userId: string,
  contentType?: ContentType,
  contentId?: string
): Promise<void> {
  const client = getDynamoDBClient();

  if (contentType && contentId) {
    // Invalidate specific cache entry
    await client.send(
      new DeleteCommand({
        TableName: TABLES.CACHE,
        Key: {
          PK: `USER#${userId}`,
          SK: `CONTENT#${contentType}#${contentId}`,
        },
      })
    );
  } else {
    // TODO: Invalidate all cache for user
    // Would need to query all entries with PK=USER#userId and delete each
    // For now, just let TTL handle it
    console.log(`Invalidating all cache for user ${userId} - will expire via TTL`);
  }
}

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStats(
  userId: string
): Promise<{
  totalCached: number;
  avgTokensUsed: number;
  avgGenerationTime: number;
}> {
  // TODO: Implement cache statistics
  // Would need to query all cache entries for user
  return {
    totalCached: 0,
    avgTokensUsed: 0,
    avgGenerationTime: 0,
  };
}
