/**
 * API Gateway response helpers
 */
import type { APIGatewayProxyResult } from 'aws-lambda';
import { formatError } from './errors';

/**
 * Create a success response
 */
export function successResponse(data: any, statusCode: number = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(data),
  };
}

/**
 * Create an error response
 */
export function errorResponse(error: any): APIGatewayProxyResult {
  const { statusCode, message } = formatError(error);

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({ error: message }),
  };
}

/**
 * Create a 404 Not Found response
 */
export function notFoundResponse(message: string = 'Not found'): APIGatewayProxyResult {
  return errorResponse({ name: 'NotFoundError', message });
}

/**
 * Create a 400 Bad Request response
 */
export function badRequestResponse(message: string = 'Bad request'): APIGatewayProxyResult {
  return errorResponse({ name: 'ValidationError', message });
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorizedResponse(
  message: string = 'Unauthorized'
): APIGatewayProxyResult {
  return errorResponse({ name: 'UnauthorizedError', message });
}
