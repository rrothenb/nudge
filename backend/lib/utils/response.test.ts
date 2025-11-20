/**
 * Response Utilities Tests
 */
import { describe, it, expect } from 'vitest';
import { successResponse, errorResponse, badRequestResponse } from './response';
import { NotFoundError, ValidationError } from './errors';

describe('Response Utilities', () => {
  describe('successResponse', () => {
    it('should create a 200 success response by default', () => {
      const response = successResponse({ message: 'Success' });

      expect(response).toEqual({
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Success' }),
      });
    });

    it('should create response with custom status code', () => {
      const response = successResponse({ id: 'new-item' }, 201);

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual({ id: 'new-item' });
    });

    it('should handle complex data structures', () => {
      const data = {
        user: { id: '123', name: 'Test' },
        items: [1, 2, 3],
        nested: { deep: { value: true } },
      };

      const response = successResponse(data);

      expect(JSON.parse(response.body)).toEqual(data);
    });

    it('should handle null data', () => {
      const response = successResponse(null);

      expect(JSON.parse(response.body)).toBeNull();
    });

    it('should handle arrays', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const response = successResponse(data);

      expect(JSON.parse(response.body)).toEqual(data);
    });

    it('should include CORS headers', () => {
      const response = successResponse({});

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Access-Control-Allow-Credentials']).toBe(true);
    });
  });

  describe('errorResponse', () => {
    it('should create error response from NotFoundError', () => {
      const error = new NotFoundError('User', 'user123');
      const response = errorResponse(error);

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toEqual({
        error: 'User not found: user123',
        code: 'NOT_FOUND',
      });
    });

    it('should create error response from ValidationError', () => {
      const error = new ValidationError('Invalid input');
      const response = errorResponse(error);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        error: 'Invalid input',
        code: 'VALIDATION_ERROR',
      });
    });

    it('should create 500 response for generic Error', () => {
      const error = new Error('Something went wrong');
      const response = errorResponse(error);

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });

    it('should handle string errors', () => {
      const response = errorResponse('String error message');

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });

    it('should include CORS headers', () => {
      const error = new Error('Test');
      const response = errorResponse(error);

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Access-Control-Allow-Credentials']).toBe(true);
    });

    it('should preserve error details', () => {
      const error = new ValidationError('Invalid data');
      (error as any).details = { field: 'email', reason: 'required' };

      const response = errorResponse(error);

      expect(JSON.parse(response.body)).toEqual({
        error: 'Invalid data',
        code: 'VALIDATION_ERROR',
        details: { field: 'email', reason: 'required' },
      });
    });
  });

  describe('badRequestResponse', () => {
    it('should create 400 response with message', () => {
      const response = badRequestResponse('Invalid request');

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        error: 'Invalid request',
        code: 'VALIDATION_ERROR',
      });
    });

    it('should include CORS headers', () => {
      const response = badRequestResponse('Test');

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Access-Control-Allow-Credentials']).toBe(true);
    });

    it('should handle empty message', () => {
      const response = badRequestResponse('');

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toBe('');
    });
  });
});
