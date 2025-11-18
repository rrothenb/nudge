/**
 * Error Utilities Tests
 */
import { describe, it, expect } from 'vitest';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  formatError,
} from './errors';

describe('Error Utilities', () => {
  describe('Custom Error Types', () => {
    it('should create NotFoundError with correct properties', () => {
      const error = new NotFoundError('User', 'user123');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('User not found: user123');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });

    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid email format');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid email format');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
    });

    it('should create ConflictError with correct properties', () => {
      const error = new ConflictError('User already exists');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe('User already exists');
      expect(error.statusCode).toBe(409);
      expect(error.name).toBe('ConflictError');
    });

    it('should create UnauthorizedError with correct properties', () => {
      const error = new UnauthorizedError('Invalid token');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('UnauthorizedError');
    });
  });

  describe('formatError', () => {
    it('should format NotFoundError correctly', () => {
      const error = new NotFoundError('User', 'user123');
      const formatted = formatError(error);

      expect(formatted).toEqual({
        error: 'User not found: user123',
        code: 'NOT_FOUND',
      });
    });

    it('should format ValidationError correctly', () => {
      const error = new ValidationError('Invalid input');
      const formatted = formatError(error);

      expect(formatted).toEqual({
        error: 'Invalid input',
        code: 'VALIDATION_ERROR',
      });
    });

    it('should format ConflictError correctly', () => {
      const error = new ConflictError('Resource conflict');
      const formatted = formatError(error);

      expect(formatted).toEqual({
        error: 'Resource conflict',
        code: 'CONFLICT',
      });
    });

    it('should format UnauthorizedError correctly', () => {
      const error = new UnauthorizedError();
      const formatted = formatError(error);

      expect(formatted).toEqual({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    });

    it('should format generic Error as internal error', () => {
      const error = new Error('Something went wrong');
      const formatted = formatError(error);

      expect(formatted).toEqual({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });

    it('should handle unknown error types', () => {
      const error = 'string error';
      const formatted = formatError(error);

      expect(formatted).toEqual({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });

    it('should include details if provided', () => {
      const error = new ValidationError('Invalid input');
      (error as any).details = { field: 'email', reason: 'invalid format' };
      const formatted = formatError(error);

      expect(formatted).toEqual({
        error: 'Invalid input',
        code: 'VALIDATION_ERROR',
        details: { field: 'email', reason: 'invalid format' },
      });
    });
  });
});
