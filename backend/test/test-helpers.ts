/**
 * Test helpers and mocks
 */
import { vi } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Create a mock API Gateway event
 */
export function createMockEvent(
  overrides: Partial<APIGatewayProxyEvent> = {}
): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api-id',
      authorizer: {
        claims: {
          sub: 'test-user-id',
          email: 'test@example.com',
        },
      },
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'test-agent',
        userArn: null,
      },
      path: '/',
      stage: 'test',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'test-resource-id',
      resourcePath: '/',
    },
    resource: '/',
    ...overrides,
  } as APIGatewayProxyEvent;
}

/**
 * Mock DynamoDB DocumentClient
 */
export function createMockDynamoDB() {
  const store = new Map<string, any>();

  return {
    store,
    send: vi.fn(async (command: any) => {
      const commandName = command.constructor.name;

      switch (commandName) {
        case 'PutCommand':
          store.set(JSON.stringify(command.input.Item), command.input.Item);
          return {};

        case 'GetCommand':
          const getKey = JSON.stringify(command.input.Key);
          return { Item: store.get(getKey) };

        case 'UpdateCommand':
          // Simplified update logic
          const updateKey = JSON.stringify(command.input.Key);
          const existing = store.get(updateKey) || {};
          store.set(updateKey, { ...existing, ...command.input.ExpressionAttributeValues });
          return { Attributes: store.get(updateKey) };

        case 'DeleteCommand':
          const deleteKey = JSON.stringify(command.input.Key);
          store.delete(deleteKey);
          return {};

        case 'QueryCommand':
          // Return all items for testing
          return { Items: Array.from(store.values()) };

        case 'BatchGetCommand':
          return {
            Responses: {
              [command.input.RequestItems[Object.keys(command.input.RequestItems)[0]].TableName]:
                Array.from(store.values()),
            },
          };

        default:
          return {};
      }
    }),
    reset: () => {
      store.clear();
    },
  };
}

/**
 * Create sample assertion for testing
 */
export function createSampleAssertion(overrides: Partial<any> = {}) {
  return {
    assertionId: 'assertion-123',
    content: 'The Earth orbits the Sun',
    type: 'factual',
    sourceId: 'WIKIPEDIA',
    sourceUrl: 'https://wikipedia.org/Solar_System',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
}

/**
 * Create sample user profile for testing
 */
export function createSampleUser(overrides: Partial<any> = {}) {
  return {
    userId: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    trustThreshold: 0.7,
    openMindedness: 0.2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create sample trust relationship for testing
 */
export function createSampleTrust(overrides: Partial<any> = {}) {
  return {
    userId: 'user-123',
    targetId: 'user-456',
    targetType: 'user',
    trustValue: 0.8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
