/**
 * API Gateway response helpers
 */
import type { APIGatewayProxyResult } from 'aws-lambda';
import { formatError, NotFoundError, ValidationError, UnauthorizedError } from './errors';

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
  const formatted = formatError(error);
  const statusCode = error?.statusCode || 500;

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(formatted),
  };
}

/**
 * Create a 404 Not Found response
 */
export function notFoundResponse(message: string = 'Not found'): APIGatewayProxyResult {
  return errorResponse(new NotFoundError(message));
}

/**
 * Create a 400 Bad Request response
 */
export function badRequestResponse(message: string = 'Bad request'): APIGatewayProxyResult {
  return errorResponse(new ValidationError(message));
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorizedResponse(
  message: string = 'Unauthorized'
): APIGatewayProxyResult {
  return errorResponse(new UnauthorizedError(message));
}
