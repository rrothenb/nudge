/**
 * Assertion CRUD Lambda - Create, read, list assertions
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  createAssertion,
  getAssertion,
  queryAssertionsBySource,
  queryAssertionsByType,
  queryAssertionsByTopic,
} from '../../lib/db/assertions';
import { getUserId, parseBody } from '../../lib/utils/auth';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { createAssertionSchema } from '@nudge/shared';

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('AssertionCRUD event:', JSON.stringify(event, null, 2));

  try {
    const userId = getUserId(event);
    const method = event.httpMethod;
    const assertionId = event.pathParameters?.id;

    if (method === 'POST') {
      return await handleCreateAssertion(userId, event);
    } else if (method === 'GET' && assertionId) {
      return await handleGetAssertion(assertionId);
    } else if (method === 'GET') {
      return await handleListAssertions(event);
    }

    return errorResponse(new Error('Method not allowed'));
  } catch (error) {
    console.error('AssertionCRUD error:', error);
    return errorResponse(error);
  }
}

/**
 * Handle POST /api/assertions
 */
async function handleCreateAssertion(
  userId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = parseBody(event);

  // Validate input
  const validation = createAssertionSchema.safeParse(body);
  if (!validation.success) {
    return errorResponse({
      name: 'ValidationError',
      message: validation.error.message,
    });
  }

  // Create assertion
  const assertion = await createAssertion(validation.data, userId);

  return successResponse(assertion, 201);
}

/**
 * Handle GET /api/assertions/{id}
 */
async function handleGetAssertion(
  assertionId: string
): Promise<APIGatewayProxyResult> {
  const assertion = await getAssertion(assertionId);
  return successResponse(assertion);
}

/**
 * Handle GET /api/assertions?source=X&type=Y&topic=Z
 */
async function handleListAssertions(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const params = event.queryStringParameters || {};
  const source = params.source;
  const type = params.type;
  const topic = params.topic;
  const limit = params.limit ? parseInt(params.limit, 10) : 50;

  // Query by source
  if (source) {
    const result = await queryAssertionsBySource(source, limit);
    return successResponse(result);
  }

  // Query by type
  if (type) {
    const result = await queryAssertionsByType(type, limit);
    return successResponse(result);
  }

  // Query by topic
  if (topic) {
    const result = await queryAssertionsByTopic(topic, limit);
    return successResponse(result);
  }

  // No filter specified
  return errorResponse({
    name: 'ValidationError',
    message: 'Please specify source, type, or topic filter',
  });
}
