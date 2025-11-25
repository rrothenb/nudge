/**
 * Trust relationship database operations
 */
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  BatchGetCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, TABLES } from './client';
import type { TrustRelationship, SetTrustInput } from '@nudge/shared';

/**
 * Set trust value for a target
 */
export async function setTrustValue(
  userId: string,
  input: SetTrustInput
): Promise<TrustRelationship> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();

  const trust: TrustRelationship = {
    userId,
    targetId: input.targetId,
    targetType: input.targetType,
    trustValue: input.trustValue,
    isDirectTrust: true, // User explicitly set this
    notes: input.notes,
    lastUpdated: now,
  };

  await client.send(
    new PutCommand({
      TableName: TABLES.TRUST,
      Item: {
        PK: `USER#${userId}`,
        SK: `TARGET#${input.targetId}`,
        ...trust,
        // GSI1: Reverse lookup (who trusts this target)
        GSI1PK: `TARGET#${input.targetId}`,
        GSI1SK: `USER#${userId}`,
      },
    })
  );

  return trust;
}

/**
 * Get trust value for a specific target
 */
export async function getTrustValue(
  userId: string,
  targetId: string
): Promise<TrustRelationship | null> {
  const client = getDynamoDBClient();

  const result = await client.send(
    new GetCommand({
      TableName: TABLES.TRUST,
      Key: {
        PK: `USER#${userId}`,
        SK: `TARGET#${targetId}`,
      },
    })
  );

  if (!result.Item) {
    return null;
  }

  const { PK, SK, GSI1PK, GSI1SK, ...trust } = result.Item;
  return trust as TrustRelationship;
}

/**
 * Get trust values for multiple targets
 */
export async function getTrustValues(
  userId: string,
  targetIds: string[]
): Promise<Map<string, TrustRelationship>> {
  if (targetIds.length === 0) {
    return new Map();
  }

  const client = getDynamoDBClient();
  const trustMap = new Map<string, TrustRelationship>();

  // DynamoDB BatchGetItem limit is 100
  const batchSize = 100;

  for (let i = 0; i < targetIds.length; i += batchSize) {
    const batch = targetIds.slice(i, i + batchSize);

    const result = await client.send(
      new BatchGetCommand({
        RequestItems: {
          [TABLES.TRUST]: {
            Keys: batch.map((targetId) => ({
              PK: `USER#${userId}`,
              SK: `TARGET#${targetId}`,
            })),
          },
        },
      })
    );

    if (result.Responses?.[TABLES.TRUST]) {
      for (const item of result.Responses[TABLES.TRUST]) {
        const { PK, SK, GSI1PK, GSI1SK, ...trust } = item;
        const trustRel = trust as TrustRelationship;
        trustMap.set(trustRel.targetId, trustRel);
      }
    }
  }

  return trustMap;
}

/**
 * List all trust relationships for a user
 */
export async function listUserTrust(
  userId: string,
  limit: number = 100,
  lastEvaluatedKey?: Record<string, any>
): Promise<{
  trustRelationships: TrustRelationship[];
  lastEvaluatedKey?: Record<string, any>;
}> {
  const client = getDynamoDBClient();

  const result = await client.send(
    new QueryCommand({
      TableName: TABLES.TRUST,
      KeyConditionExpression: 'PK = :userKey',
      ExpressionAttributeValues: {
        ':userKey': `USER#${userId}`,
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    })
  );

  const trustRelationships = (result.Items || []).map((item) => {
    const { PK, SK, GSI1PK, GSI1SK, ...trust } = item;
    return trust as TrustRelationship;
  });

  return {
    trustRelationships,
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

/**
 * Get all users who trust a specific target (reverse lookup)
 */
export async function getWhoTrustsTarget(
  targetId: string,
  limit: number = 100
): Promise<TrustRelationship[]> {
  const client = getDynamoDBClient();

  const result = await client.send(
    new QueryCommand({
      TableName: TABLES.TRUST,
      IndexName: 'ByTarget',
      KeyConditionExpression: 'GSI1PK = :targetKey',
      ExpressionAttributeValues: {
        ':targetKey': `TARGET#${targetId}`,
      },
      Limit: limit,
    })
  );

  const trustRelationships = (result.Items || []).map((item) => {
    const { PK, SK, GSI1PK, GSI1SK, ...trust } = item;
    return trust as TrustRelationship;
  });

  return trustRelationships;
}

/**
 * Delete trust relationship (reset to default)
 */
export async function deleteTrustValue(
  userId: string,
  targetId: string
): Promise<void> {
  const client = getDynamoDBClient();

  await client.send(
    new DeleteCommand({
      TableName: TABLES.TRUST,
      Key: {
        PK: `USER#${userId}`,
        SK: `TARGET#${targetId}`,
      },
    })
  );
}

/**
 * Store propagated trust values (from trust engine)
 */
export async function storePropagatedTrust(
  userId: string,
  propagatedValues: Map<string, { value: number; confidence: number; sources: string[] }>
): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();

  // Store propagated trust values
  // In production, you'd batch these with BatchWriteItem
  for (const [targetId, propagated] of propagatedValues.entries()) {
    // Only store if not a direct trust (don't overwrite user's explicit choices)
    const existingTrust = await getTrustValue(userId, targetId);
    if (existingTrust && existingTrust.isDirectTrust) {
      continue; // Skip, user has explicitly set this
    }

    const trust: TrustRelationship = {
      userId,
      targetId,
      targetType: 'assertion', // Propagated values are typically for assertions
      trustValue: propagated.value,
      isDirectTrust: false,
      propagatedFrom: propagated.sources,
      propagationConfidence: propagated.confidence,
      lastUpdated: now,
    };

    await client.send(
      new PutCommand({
        TableName: TABLES.TRUST,
        Item: {
          PK: `USER#${userId}`,
          SK: `TARGET#${targetId}`,
          ...trust,
          GSI1PK: `TARGET#${targetId}`,
          GSI1SK: `USER#${userId}`,
        },
      })
    );
  }
}

/**
 * Get trusted sources for a user (sources with trust >= threshold)
 */
export async function getTrustedSources(
  userId: string,
  threshold: number = 0.5
): Promise<string[]> {
  const { trustRelationships } = await listUserTrust(userId, 1000);

  return trustRelationships
    .filter((t) => t.targetType === 'source' && t.trustValue >= threshold)
    .map((t) => t.targetId);
}

/**
 * Get all users' trust relationships (for building trust vectors)
 *
 * This scans the entire trust table and returns a map of userId -> trust relationships.
 * Used by the similarity-based trust inference algorithm.
 *
 * NOTE: In production with many users, this would be expensive. Consider:
 * - Caching with periodic refresh
 * - Using DynamoDB Streams to incrementally update
 * - Partitioning by user cohorts
 */
export async function getAllUsersTrust(): Promise<Map<string, TrustRelationship[]>> {
  const client = getDynamoDBClient();
  const usersTrust = new Map<string, TrustRelationship[]>();

  // Scan the table (expensive in production, but works for POC)
  let lastEvaluatedKey: Record<string, any> | undefined;
  let itemCount = 0;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLES.TRUST,
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    // Process items
    if (result.Items) {
      for (const item of result.Items) {
        const { PK, SK, GSI1PK, GSI1SK, ...trust } = item;
        const trustRel = trust as TrustRelationship;
        const userId = trustRel.userId;

        if (!usersTrust.has(userId)) {
          usersTrust.set(userId, []);
        }
        usersTrust.get(userId)!.push(trustRel);
        itemCount++;
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`Loaded trust relationships for ${usersTrust.size} users (${itemCount} total relationships)`);

  return usersTrust;
}
