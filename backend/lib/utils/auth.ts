/**
 * Authentication and authorization helpers
 */
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { UnauthorizedError } from './errors';

/**
 * Extract userId from Cognito JWT claims
 */
export function getUserId(event: APIGatewayProxyEvent): string {
  const userId = event.requestContext.authorizer?.claims?.sub;

  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  return userId;
}

/**
 * Extract user email from Cognito JWT claims
 */
export function getUserEmail(event: APIGatewayProxyEvent): string {
  const email = event.requestContext.authorizer?.claims?.email;

  if (!email) {
    throw new UnauthorizedError('User email not found');
  }

  return email;
}

/**
 * Check if user owns a resource
 */
export function checkOwnership(userId: string, resourceUserId: string): void {
  if (userId !== resourceUserId) {
    throw new UnauthorizedError('You do not have permission to access this resource');
  }
}

/**
 * Extract and validate request body
 */
export function parseBody<T>(event: APIGatewayProxyEvent): T {
  if (!event.body) {
    throw new Error('Request body is required');
  }

  try {
    return JSON.parse(event.body) as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}
