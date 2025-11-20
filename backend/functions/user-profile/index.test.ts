/**
 * User Profile Lambda Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index';
import { createMockEvent } from '../../test/test-helpers';

// Mock database functions
vi.mock('../../lib/db/users', () => ({
  userExists: vi.fn(),
  getUserProfile: vi.fn(),
  createUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}));

import { userExists, getUserProfile, createUserProfile, updateUserProfile } from '../../lib/db/users';

describe('User Profile Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/user/profile', () => {
    it('should return existing user profile', async () => {
      const mockProfile = {
        userId: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        trustThreshold: 0.7,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(userExists).mockResolvedValue(true);
      vi.mocked(getUserProfile).mockResolvedValue(mockProfile);

      const event = createMockEvent({ httpMethod: 'GET' });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockProfile);
      expect(getUserProfile).toHaveBeenCalledWith('test-user-id');
    });

    it('should create profile on first login', async () => {
      const mockProfile = {
        userId: 'test-user-id',
        email: 'test@example.com',
        displayName: 'test',
        trustThreshold: 0.7,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(userExists).mockResolvedValue(false);
      vi.mocked(createUserProfile).mockResolvedValue(mockProfile);

      const event = createMockEvent({ httpMethod: 'GET' });
      const response = await handler(event);

      expect(response.statusCode).toBe(201);
      expect(createUserProfile).toHaveBeenCalledWith(
        'test-user-id',
        'test@example.com',
        expect.any(String)
      );
    });

    it('should return 401 if no auth', async () => {
      const event = createMockEvent({
        httpMethod: 'GET',
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: undefined,
        },
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PUT /api/user/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        displayName: 'New Name',
        trustThreshold: 0.8,
      };

      const updatedProfile = {
        userId: 'test-user-id',
        email: 'test@example.com',
        ...updateData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(updateUserProfile).mockResolvedValue(updatedProfile);

      const event = createMockEvent({
        httpMethod: 'PUT',
        body: JSON.stringify(updateData),
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(updatedProfile);
      expect(updateUserProfile).toHaveBeenCalledWith('test-user-id', updateData);
    });

    it('should return 400 for invalid trust threshold', async () => {
      const invalidData = {
        trustThreshold: 1.5, // Invalid: should be 0-1
      };

      const event = createMockEvent({
        httpMethod: 'PUT',
        body: JSON.stringify(invalidData),
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });

    it('should handle missing body gracefully', async () => {
      const event = createMockEvent({
        httpMethod: 'PUT',
        body: null,
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      vi.mocked(userExists).mockRejectedValue(new Error('Database connection failed'));

      const event = createMockEvent({ httpMethod: 'GET' });
      const response = await handler(event);

      expect(response.statusCode).toBe(500);
    });

    it('should return 405 for unsupported methods', async () => {
      const event = createMockEvent({ httpMethod: 'DELETE' });
      const response = await handler(event);

      expect(response.statusCode).toBe(405);
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers in all responses', async () => {
      vi.mocked(userExists).mockResolvedValue(true);
      vi.mocked(getUserProfile).mockResolvedValue({
        userId: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test',
        trustThreshold: 0.7,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const event = createMockEvent({ httpMethod: 'GET' });
      const response = await handler(event);

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Access-Control-Allow-Credentials']).toBe(true);
    });
  });
});
