/**
 * Auth Utilities Tests
 */
import { describe, it, expect } from 'vitest';
import { getUserId, getUserEmail, parseBody, checkOwnership } from './auth';
import { UnauthorizedError } from './errors';
import { createMockEvent } from '../../test/test-helpers';

describe('Auth Utilities', () => {
  describe('getUserId', () => {
    it('should extract user ID from Cognito claims', () => {
      const event = createMockEvent({
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: {
            claims: {
              sub: 'user-123',
              email: 'test@example.com',
            },
          },
        },
      });

      const userId = getUserId(event);
      expect(userId).toBe('user-123');
    });

    it('should throw UnauthorizedError if no authorizer', () => {
      const event = createMockEvent({
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: undefined,
        },
      });

      expect(() => getUserId(event)).toThrow(UnauthorizedError);
    });
  });

  describe('getUserEmail', () => {
    it('should extract email from Cognito claims', () => {
      const event = createMockEvent({
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: {
            claims: {
              sub: 'user-123',
              email: 'test@example.com',
            },
          },
        },
      });

      const email = getUserEmail(event);
      expect(email).toBe('test@example.com');
    });
  });

  describe('parseBody', () => {
    it('should parse valid JSON body', () => {
      const event = createMockEvent({
        body: JSON.stringify({ name: 'Test', value: 123 }),
      });

      const body = parseBody(event);
      expect(body).toEqual({ name: 'Test', value: 123 });
    });

    it('should throw for null body', () => {
      const event = createMockEvent({ body: null });
      expect(() => parseBody(event)).toThrow();
    });
  });

  describe('checkOwnership', () => {
    it('should not throw for matching userId and resourceUserId', () => {
      expect(() => checkOwnership('user-123', 'user-123')).not.toThrow();
    });

    it('should throw UnauthorizedError for non-matching IDs', () => {
      expect(() => checkOwnership('user-123', 'user-456')).toThrow(UnauthorizedError);
    });
  });
});
