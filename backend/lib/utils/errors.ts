/**
 * Custom error types for better error handling
 */

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
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
export function formatError(error: any): { statusCode: number; message: string } {
  if (error instanceof NotFoundError) {
    return { statusCode: 404, message: error.message };
  }
  if (error instanceof ValidationError) {
    return { statusCode: 400, message: error.message };
  }
  if (error instanceof ConflictError) {
    return { statusCode: 409, message: error.message };
  }
  if (error instanceof UnauthorizedError) {
    return { statusCode: 401, message: error.message };
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);
  return { statusCode: 500, message: 'Internal server error' };
}
