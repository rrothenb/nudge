/**
 * User profile database operations
 */
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, TABLES } from './client';
import { NotFoundError } from '../utils/errors';
import type { UserProfile, UpdateProfileInput } from '@nudge/shared';
import { DEFAULT_TRUST_THRESHOLD, DEFAULT_OPEN_MINDEDNESS } from '@nudge/shared';

/**
 * Create a new user profile
 */
export async function createUserProfile(
  userId: string,
  email: string,
  displayName: string
): Promise<UserProfile> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();

  const profile: UserProfile = {
    userId,
    email,
    displayName,
    bio: '',
    defaultTrustThreshold: DEFAULT_TRUST_THRESHOLD,
    openMindedness: DEFAULT_OPEN_MINDEDNESS,
    showControversySignals: true,
    showAlternateViews: true,
    defaultView: 'wiki',
    createdAt: now,
    updatedAt: now,
  };

  await client.send(
    new PutCommand({
      TableName: TABLES.USERS,
      Item: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
        ...profile,
      },
      // Don't overwrite if already exists
      ConditionExpression: 'attribute_not_exists(PK)',
    })
  );

  return profile;
}

/**
 * Get user profile by userId
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const client = getDynamoDBClient();

  const result = await client.send(
    new GetCommand({
      TableName: TABLES.USERS,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
    })
  );

  if (!result.Item) {
    throw new NotFoundError(`User profile not found: ${userId}`);
  }

  // Remove DynamoDB keys from response
  const { PK, SK, ...profile } = result.Item;
  return profile as UserProfile;
}

/**
 * Update user profile or preferences
 */
export async function updateUserProfile(
  userId: string,
  updates: UpdateProfileInput
): Promise<UserProfile> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();

  // Build update expression dynamically
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  // Always update the updatedAt timestamp
  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = now;

  // Add each field that's being updated
  if (updates.displayName !== undefined) {
    updateExpressions.push('#displayName = :displayName');
    expressionAttributeNames['#displayName'] = 'displayName';
    expressionAttributeValues[':displayName'] = updates.displayName;
  }

  if (updates.bio !== undefined) {
    updateExpressions.push('#bio = :bio');
    expressionAttributeNames['#bio'] = 'bio';
    expressionAttributeValues[':bio'] = updates.bio;
  }

  if (updates.defaultTrustThreshold !== undefined) {
    updateExpressions.push('#defaultTrustThreshold = :defaultTrustThreshold');
    expressionAttributeNames['#defaultTrustThreshold'] = 'defaultTrustThreshold';
    expressionAttributeValues[':defaultTrustThreshold'] = updates.defaultTrustThreshold;
  }

  if (updates.openMindedness !== undefined) {
    updateExpressions.push('#openMindedness = :openMindedness');
    expressionAttributeNames['#openMindedness'] = 'openMindedness';
    expressionAttributeValues[':openMindedness'] = updates.openMindedness;
  }

  if (updates.defaultView !== undefined) {
    updateExpressions.push('#defaultView = :defaultView');
    expressionAttributeNames['#defaultView'] = 'defaultView';
    expressionAttributeValues[':defaultView'] = updates.defaultView;
  }

  const result = await client.send(
    new UpdateCommand({
      TableName: TABLES.USERS,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      // Only update if the item exists
      ConditionExpression: 'attribute_exists(PK)',
      ReturnValues: 'ALL_NEW',
    })
  );

  if (!result.Attributes) {
    throw new NotFoundError(`User profile not found: ${userId}`);
  }

  const { PK, SK, ...profile } = result.Attributes;
  return profile as UserProfile;
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();

  await client.send(
    new UpdateCommand({
      TableName: TABLES.USERS,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
      UpdateExpression: 'SET #lastLoginAt = :lastLoginAt',
      ExpressionAttributeNames: {
        '#lastLoginAt': 'lastLoginAt',
      },
      ExpressionAttributeValues: {
        ':lastLoginAt': now,
      },
    })
  );
}

/**
 * Check if user exists
 */
export async function userExists(userId: string): Promise<boolean> {
  try {
    await getUserProfile(userId);
    return true;
  } catch (error) {
    if (error instanceof NotFoundError) {
      return false;
    }
    throw error;
  }
}
