/**
 * Custom error types for better error handling
 */

export class NotFoundError extends Error {
  statusCode = 404;

  constructor(resourceType?: string, resourceId?: string) {
    const message = resourceType && resourceId
      ? `${resourceType} not found: ${resourceId}`
      : resourceType || 'Resource not found';
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  statusCode = 400;
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class ConflictError extends Error {
  statusCode = 409;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;

  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Check if error is a DynamoDB conditional check failure
 */
export function isConditionalCheckFailure(error: any): boolean {
  return error.name === 'ConditionalCheckFailedException';
}

/**
 * Format error for API response
 */
export function formatError(error: any): { error: string; code: string; details?: any } {
  if (error instanceof NotFoundError) {
    return { error: error.message, code: 'NOT_FOUND' };
  }
  if (error instanceof ValidationError) {
    const result: { error: string; code: string; details?: any } = {
      error: error.message,
      code: 'VALIDATION_ERROR',
    };
    if (error.details) {
      result.details = error.details;
    }
    return result;
  }
  if (error instanceof ConflictError) {
    return { error: error.message, code: 'CONFLICT' };
  }
  if (error instanceof UnauthorizedError) {
    return { error: error.message, code: 'UNAUTHORIZED' };
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);
  return { error: 'Internal server error', code: 'INTERNAL_ERROR' };
}
