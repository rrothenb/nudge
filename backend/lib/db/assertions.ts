/**
 * Assertion database operations
 */
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, TABLES } from './client';
import { NotFoundError } from '../utils/errors';
import type { Assertion, CreateAssertionInput } from '@nudge/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new assertion
 */
export async function createAssertion(
  input: CreateAssertionInput,
  authorUserId?: string
): Promise<Assertion> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  const assertionId = uuidv4();

  const assertion: Assertion = {
    assertionId,
    version: 1,
    type: input.type,
    content: input.content,
    sourceId: input.sourceId,
    sourceType: input.sourceType,
    authorUserId,
    topic: input.topic,
    publishedAt: input.publishedAt,
    url: input.url,
    extractedFrom: input.extractedFrom,
    createdAt: now,
    updatedAt: now,
  };

  // Prepare GSI keys for efficient querying
  const item: any = {
    PK: `ASSERTION#${assertionId}`,
    SK: `VERSION#${now}`,
    ...assertion,
    // GSI1: Query by source
    GSI1PK: `SOURCE#${input.sourceId}`,
    GSI1SK: `CREATED#${now}`,
    // GSI2: Query by type
    GSI2PK: `TYPE#${input.type}`,
    GSI2SK: `CREATED#${now}`,
  };

  // GSI3: Query by topic (only if topic is provided)
  if (input.topic && input.topic.length > 0) {
    // Store primary topic in GSI3
    item.GSI3PK = `TOPIC#${input.topic[0]}`;
    item.GSI3SK = `CREATED#${now}`;
  }

  await client.send(
    new PutCommand({
      TableName: TABLES.ASSERTIONS,
      Item: item,
    })
  );

  return assertion;
}

/**
 * Get assertion by ID
 */
export async function getAssertion(assertionId: string): Promise<Assertion> {
  const client = getDynamoDBClient();

  // Query to get the latest version
  const result = await client.send(
    new QueryCommand({
      TableName: TABLES.ASSERTIONS,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `ASSERTION#${assertionId}`,
      },
      ScanIndexForward: false, // Sort descending (latest first)
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    throw new NotFoundError(`Assertion not found: ${assertionId}`);
  }

  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...assertion } =
    result.Items[0];
  return assertion as Assertion;
}

/**
 * Get multiple assertions by IDs
 */
export async function getAssertions(assertionIds: string[]): Promise<Assertion[]> {
  if (assertionIds.length === 0) {
    return [];
  }

  const client = getDynamoDBClient();

  // DynamoDB BatchGetItem limit is 100
  const assertions: Assertion[] = [];
  const batchSize = 100;

  for (let i = 0; i < assertionIds.length; i += batchSize) {
    const batch = assertionIds.slice(i, i + batchSize);

    const result = await client.send(
      new BatchGetCommand({
        RequestItems: {
          [TABLES.ASSERTIONS]: {
            Keys: batch.map((id) => ({
              PK: `ASSERTION#${id}`,
              SK: `VERSION#1`, // For now, always get version 1
            })),
          },
        },
      })
    );

    if (result.Responses?.[TABLES.ASSERTIONS]) {
      for (const item of result.Responses[TABLES.ASSERTIONS]) {
        const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...assertion } =
          item;
        assertions.push(assertion as Assertion);
      }
    }
  }

  return assertions;
}

/**
 * Query assertions by source
 */
export async function queryAssertionsBySource(
  sourceId: string,
  limit: number = 50,
  lastEvaluatedKey?: Record<string, any>
): Promise<{
  assertions: Assertion[];
  lastEvaluatedKey?: Record<string, any>;
}> {
  const client = getDynamoDBClient();

  const result = await client.send(
    new QueryCommand({
      TableName: TABLES.ASSERTIONS,
      IndexName: 'BySource',
      KeyConditionExpression: 'GSI1PK = :sourceKey',
      ExpressionAttributeValues: {
        ':sourceKey': `SOURCE#${sourceId}`,
      },
      ScanIndexForward: false, // Latest first
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    })
  );

  const assertions = (result.Items || []).map((item) => {
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...assertion } = item;
    return assertion as Assertion;
  });

  return {
    assertions,
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

/**
 * Query assertions by type
 */
export async function queryAssertionsByType(
  type: string,
  limit: number = 50,
  lastEvaluatedKey?: Record<string, any>
): Promise<{
  assertions: Assertion[];
  lastEvaluatedKey?: Record<string, any>;
}> {
  const client = getDynamoDBClient();

  const result = await client.send(
    new QueryCommand({
      TableName: TABLES.ASSERTIONS,
      IndexName: 'ByType',
      KeyConditionExpression: 'GSI2PK = :typeKey',
      ExpressionAttributeValues: {
        ':typeKey': `TYPE#${type}`,
      },
      ScanIndexForward: false, // Latest first
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    })
  );

  const assertions = (result.Items || []).map((item) => {
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...assertion } = item;
    return assertion as Assertion;
  });

  return {
    assertions,
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

/**
 * Query assertions by topic
 */
export async function queryAssertionsByTopic(
  topic: string,
  limit: number = 50,
  lastEvaluatedKey?: Record<string, any>
): Promise<{
  assertions: Assertion[];
  lastEvaluatedKey?: Record<string, any>;
}> {
  const client = getDynamoDBClient();

  const result = await client.send(
    new QueryCommand({
      TableName: TABLES.ASSERTIONS,
      IndexName: 'ByTopic',
      KeyConditionExpression: 'GSI3PK = :topicKey',
      ExpressionAttributeValues: {
        ':topicKey': `TOPIC#${topic}`,
      },
      ScanIndexForward: false, // Latest first
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    })
  );

  const assertions = (result.Items || []).map((item) => {
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...assertion } = item;
    return assertion as Assertion;
  });

  return {
    assertions,
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

/**
 * Query recent assertions (for news feed)
 * Queries NEWS_IMPORT type and sorts by publishedAt
 */
export async function queryRecentAssertions(
  limit: number = 50,
  sinceTimestamp?: string
): Promise<Assertion[]> {
  const client = getDynamoDBClient();

  let keyConditionExpression = 'GSI2PK = :typeKey';
  const expressionAttributeValues: any = {
    ':typeKey': 'TYPE#news_import',
  };

  if (sinceTimestamp) {
    keyConditionExpression += ' AND GSI2SK > :sinceKey';
    expressionAttributeValues[':sinceKey'] = `CREATED#${sinceTimestamp}`;
  }

  const result = await client.send(
    new QueryCommand({
      TableName: TABLES.ASSERTIONS,
      IndexName: 'ByType',
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: false, // Latest first
      Limit: limit,
    })
  );

  const assertions = (result.Items || []).map((item) => {
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...assertion } = item;
    return assertion as Assertion;
  });

  return assertions;
}

/**
 * Search assertions by content (simple keyword search for now)
 * This is a placeholder - in production, you'd use OpenSearch or similar
 */
export async function searchAssertions(
  query: string,
  limit: number = 20
): Promise<Assertion[]> {
  // For now, return empty array
  // TODO: Implement with OpenSearch or Claude-based keyword extraction
  console.warn('searchAssertions not yet implemented, returning empty array');
  return [];
}
