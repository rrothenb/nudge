/**
 * Trust Engine Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrustGraph } from './graph';
import {
  computeUserTrustNetwork,
  getUserTrustForAssertion,
  getUserTrustForAssertions,
  filterAssertionsByTrust,
  sortAssertionsByTrust,
  getTrustExplanation,
} from './engine';

// Mock the database modules
vi.mock('../db/trust', () => ({
  listUserTrust: vi.fn(),
  storePropagatedTrust: vi.fn(),
}));

vi.mock('../db/assertions', () => ({
  queryAllAssertions: vi.fn(),
}));

import { listUserTrust, storePropagatedTrust } from '../db/trust';
import { queryAllAssertions } from '../db/assertions';

describe('Trust Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('computeUserTrustNetwork', () => {
    it('should compute trust network from user relationships', async () => {
      const mockTrustRelations = [
        {
          userId: 'user1',
          targetId: 'user2',
          targetType: 'user',
          trustValue: 0.8,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          userId: 'user1',
          targetId: 'source1',
          targetType: 'source',
          trustValue: 0.9,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(listUserTrust).mockResolvedValue(mockTrustRelations);
      vi.mocked(queryAllAssertions).mockResolvedValue({ assertions: [] });
      vi.mocked(storePropagatedTrust).mockResolvedValue(undefined);

      const result = await computeUserTrustNetwork('user1');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user1');
      expect(result.trustValues).toBeDefined();
      expect(listUserTrust).toHaveBeenCalledWith('user1');
    });

    it('should store propagated trust values', async () => {
      vi.mocked(listUserTrust).mockResolvedValue([]);
      vi.mocked(queryAllAssertions).mockResolvedValue({ assertions: [] });
      vi.mocked(storePropagatedTrust).mockResolvedValue(undefined);

      await computeUserTrustNetwork('user1');

      expect(storePropagatedTrust).toHaveBeenCalled();
    });
  });

  describe('getUserTrustForAssertion', () => {
    it('should return 0.5 default when no trust value computed', async () => {
      const trust = await getUserTrustForAssertion('user1', 'assertion1');
      expect(trust).toBe(0.5);
    });
  });

  describe('getUserTrustForAssertions', () => {
    it('should return trust values for multiple assertions', async () => {
      const assertionIds = ['a1', 'a2', 'a3'];
      const trustValues = await getUserTrustForAssertions('user1', assertionIds);

      expect(trustValues).toBeDefined();
      expect(Object.keys(trustValues).length).toBe(3);
      expect(trustValues['a1']).toBeDefined();
      expect(trustValues['a2']).toBeDefined();
      expect(trustValues['a3']).toBeDefined();
    });

    it('should handle empty array', async () => {
      const trustValues = await getUserTrustForAssertions('user1', []);
      expect(trustValues).toEqual({});
    });
  });

  describe('filterAssertionsByTrust', () => {
    it('should filter assertions above threshold', () => {
      const assertions = [
        { assertionId: 'a1', content: 'Fact 1' },
        { assertionId: 'a2', content: 'Fact 2' },
        { assertionId: 'a3', content: 'Fact 3' },
      ];

      const trustValues = {
        a1: 0.9,
        a2: 0.5,
        a3: 0.3,
      };

      const filtered = filterAssertionsByTrust(assertions as any, trustValues, 0.6);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].assertionId).toBe('a1');
    });

    it('should return all when threshold is 0', () => {
      const assertions = [
        { assertionId: 'a1', content: 'Fact 1' },
        { assertionId: 'a2', content: 'Fact 2' },
      ];

      const trustValues = { a1: 0.5, a2: 0.3 };

      const filtered = filterAssertionsByTrust(assertions as any, trustValues, 0);

      expect(filtered).toHaveLength(2);
    });

    it('should use default 0.5 for missing trust values', () => {
      const assertions = [{ assertionId: 'a1', content: 'Fact 1' }];

      const trustValues = {};

      const filtered = filterAssertionsByTrust(assertions as any, trustValues, 0.4);

      expect(filtered).toHaveLength(1);
    });
  });

  describe('sortAssertionsByTrust', () => {
    it('should sort assertions by trust value descending', () => {
      const assertions = [
        { assertionId: 'a1', content: 'Fact 1' },
        { assertionId: 'a2', content: 'Fact 2' },
        { assertionId: 'a3', content: 'Fact 3' },
      ];

      const trustValues = {
        a1: 0.5,
        a2: 0.9,
        a3: 0.3,
      };

      const sorted = sortAssertionsByTrust(assertions as any, trustValues);

      expect(sorted).toHaveLength(3);
      expect(sorted[0].assertionId).toBe('a2');
      expect(sorted[1].assertionId).toBe('a1');
      expect(sorted[2].assertionId).toBe('a3');
    });

    it('should handle missing trust values with default 0.5', () => {
      const assertions = [
        { assertionId: 'a1', content: 'Fact 1' },
        { assertionId: 'a2', content: 'Fact 2' },
      ];

      const trustValues = { a1: 0.9 };

      const sorted = sortAssertionsByTrust(assertions as any, trustValues);

      expect(sorted[0].assertionId).toBe('a1');
      expect(sorted[1].assertionId).toBe('a2');
    });
  });

  describe('getTrustExplanation', () => {
    it('should return explanation for trust value', async () => {
      const explanation = await getTrustExplanation('user1', 'assertion1');

      expect(explanation).toBeDefined();
      expect(explanation.targetId).toBe('assertion1');
      expect(explanation.trustValue).toBeDefined();
      expect(explanation.explanation).toBeDefined();
    });

    it('should include trust paths in explanation', async () => {
      const explanation = await getTrustExplanation('user1', 'source1');

      expect(explanation.sources).toBeDefined();
      expect(Array.isArray(explanation.sources)).toBe(true);
    });
  });
});
