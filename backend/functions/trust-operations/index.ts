/**
 * Trust Operations Lambda - Set and get trust values
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  setTrustValue,
  getTrustValue,
  listUserTrust,
  deleteTrustValue,
} from '../../lib/db/trust';
import { computeUserTrustNetwork } from '../../lib/trust/engine';
import { getUserId, parseBody } from '../../lib/utils/auth';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { setTrustSchema } from '@nudge/shared';

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('TrustOperations event:', JSON.stringify(event, null, 2));

  try {
    const userId = getUserId(event);
    const method = event.httpMethod;
    const targetId = event.pathParameters?.targetId;

    if (method === 'POST') {
      return await handleSetTrust(userId, event);
    } else if (method === 'GET' && targetId) {
      return await handleGetTrust(userId, targetId);
    } else if (method === 'GET') {
      return await handleListTrust(userId, event);
    } else if (method === 'DELETE' && targetId) {
      return await handleDeleteTrust(userId, targetId);
    }

    return errorResponse(new Error('Method not allowed'));
  } catch (error) {
    console.error('TrustOperations error:', error);
    return errorResponse(error);
  }
}

/**
 * Handle POST /api/trust
 */
async function handleSetTrust(
  userId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = parseBody(event);

  // Validate input
  const validation = setTrustSchema.safeParse(body);
  if (!validation.success) {
    return errorResponse({
      name: 'ValidationError',
      message: validation.error.message,
    });
  }

  // Set trust value
  const trust = await setTrustValue(userId, validation.data);

  // Trigger trust propagation in background (fire and forget)
  // In production, you'd use EventBridge or SQS for this
  computeUserTrustNetwork(userId).catch((error) => {
    console.error('Background trust propagation failed:', error);
  });

  return successResponse(trust);
}

/**
 * Handle GET /api/trust/{targetId}
 */
async function handleGetTrust(
  userId: string,
  targetId: string
): Promise<APIGatewayProxyResult> {
  const trust = await getTrustValue(userId, targetId);

  if (!trust) {
    return successResponse({
      targetId,
      trustValue: 0.5, // Default trust
      isDirectTrust: false,
    });
  }

  return successResponse(trust);
}

/**
 * Handle GET /api/trust
 */
async function handleListTrust(
  userId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const params = event.queryStringParameters || {};
  const limit = params.limit ? parseInt(params.limit, 10) : 100;

  const result = await listUserTrust(userId, limit);

  return successResponse(result);
}

/**
 * Handle DELETE /api/trust/{targetId}
 */
async function handleDeleteTrust(
  userId: string,
  targetId: string
): Promise<APIGatewayProxyResult> {
  await deleteTrustValue(userId, targetId);

  // Trigger trust propagation in background
  computeUserTrustNetwork(userId).catch((error) => {
    console.error('Background trust propagation failed:', error);
  });

  return successResponse({ message: 'Trust value deleted' });
}
