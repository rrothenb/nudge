import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleApiError } from './client';
import axios from 'axios';

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleApiError', () => {
    it('handles axios error with response', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            error: 'Not found',
          },
        },
      };

      const message = handleApiError(error);
      expect(message).toBe('Not found');
    });

    it('handles axios error with response message', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            message: 'Validation failed',
          },
        },
      };

      const message = handleApiError(error);
      expect(message).toBe('Validation failed');
    });

    it('handles axios error without response', () => {
      const error = {
        isAxiosError: true,
        message: 'Network Error',
      };

      const message = handleApiError(error);
      expect(message).toBe('Network Error');
    });

    it('handles generic error with message', () => {
      const error = new Error('Something went wrong');
      const message = handleApiError(error);
      expect(message).toBe('Something went wrong');
    });

    it('handles unknown error type', () => {
      const error = 'String error';
      const message = handleApiError(error);
      expect(message).toBe('An unexpected error occurred');
    });

    it('handles error object without message', () => {
      const error = {};
      const message = handleApiError(error);
      expect(message).toBe('An unexpected error occurred');
    });
  });
});
