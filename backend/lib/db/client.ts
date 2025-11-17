/**
 * DynamoDB client initialization and configuration
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Singleton client instance
let documentClient: DynamoDBDocumentClient | null = null;

/**
 * Get or create DynamoDB Document Client
 * Uses singleton pattern to reuse connections across Lambda invocations
 */
export function getDynamoDBClient(): DynamoDBDocumentClient {
  if (!documentClient) {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    documentClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        // Whether to automatically convert empty strings, blobs, and sets to `null`
        convertEmptyValues: false,
        // Whether to remove undefined values while marshalling
        removeUndefinedValues: true,
        // Whether to convert typeof object to map attribute
        convertClassInstanceToMap: true,
      },
      unmarshallOptions: {
        // Whether to return numbers as a string instead of converting them to native JavaScript numbers
        wrapNumbers: false,
      },
    });
  }

  return documentClient;
}

/**
 * Table names from environment variables
 */
export const TABLES = {
  USERS: process.env.USERS_TABLE || 'trust-platform-users-dev',
  ASSERTIONS: process.env.ASSERTIONS_TABLE || 'trust-platform-assertions-dev',
  TRUST: process.env.TRUST_TABLE || 'trust-platform-trust-dev',
  CACHE: process.env.CACHE_TABLE || 'trust-platform-cache-dev',
  JOBS: process.env.JOBS_TABLE || 'trust-platform-jobs-dev',
} as const;

/**
 * Reset client (useful for testing)
 */
export function resetClient(): void {
  documentClient = null;
}
