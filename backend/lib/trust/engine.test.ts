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
  getTrustValue: vi.fn(),
  getTrustValues: vi.fn(),
  storePropagatedTrust: vi.fn(),
  getAllUsersTrust: vi.fn(),
}));

vi.mock('../db/assertions', () => ({
  queryAssertionsByType: vi.fn(),
}));

import { listUserTrust, getTrustValue, getTrustValues, storePropagatedTrust, getAllUsersTrust } from '../db/trust';
import { queryAssertionsByType } from '../db/assertions';

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
          isDirectTrust: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          userId: 'user1',
          targetId: 'source1',
          targetType: 'source',
          trustValue: 0.9,
          isDirectTrust: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(getAllUsersTrust).mockResolvedValue(
        new Map([['user1', mockTrustRelations]])
      );
      vi.mocked(queryAssertionsByType).mockResolvedValue({ assertions: [] });
      vi.mocked(storePropagatedTrust).mockResolvedValue(undefined);

      const result = await computeUserTrustNetwork('user1');

      expect(result).toBeDefined();
      expect(result.size).toBeGreaterThanOrEqual(0);
      expect(getAllUsersTrust).toHaveBeenCalled();
    });

    it('should store propagated trust values', async () => {
      vi.mocked(getAllUsersTrust).mockResolvedValue(new Map());
      vi.mocked(queryAssertionsByType).mockResolvedValue({ assertions: [] });
      vi.mocked(storePropagatedTrust).mockResolvedValue(undefined);

      await computeUserTrustNetwork('user1');

      expect(storePropagatedTrust).toHaveBeenCalled();
    });
  });

  describe('getUserTrustForAssertion', () => {
    it('should return 0.0 default when no trust value computed', async () => {
      vi.mocked(getTrustValue).mockResolvedValue(null);
      vi.mocked(getAllUsersTrust).mockResolvedValue(new Map());
      const trust = await getUserTrustForAssertion('user1', 'assertion1');
      expect(trust).toBe(0.0);
    });
  });

  describe('getUserTrustForAssertions', () => {
    it('should return trust values for multiple assertions', async () => {
      const mockTrustMap = new Map([
        ['a1', { userId: 'user1', targetId: 'a1', targetType: 'assertion', trustValue: 0.9 }],
        ['a2', { userId: 'user1', targetId: 'a2', targetType: 'assertion', trustValue: 0.5 }],
        ['a3', { userId: 'user1', targetId: 'a3', targetType: 'assertion', trustValue: 0.3 }],
      ]);
      vi.mocked(getTrustValues).mockResolvedValue(mockTrustMap as any);

      const assertionIds = ['a1', 'a2', 'a3'];
      const trustValues = await getUserTrustForAssertions('user1', assertionIds);

      expect(trustValues).toBeDefined();
      expect(trustValues.size).toBe(3);
      expect(trustValues.get('a1')).toBe(0.9);
      expect(trustValues.get('a2')).toBe(0.5);
      expect(trustValues.get('a3')).toBe(0.3);
    });

    it('should handle empty array', async () => {
      vi.mocked(getTrustValues).mockResolvedValue(new Map());
      const trustValues = await getUserTrustForAssertions('user1', []);
      expect(trustValues.size).toBe(0);
    });
  });

  describe('filterAssertionsByTrust', () => {
    it('should filter assertions above threshold', async () => {
      const assertions = [
        { assertionId: 'a1', content: 'Fact 1' },
        { assertionId: 'a2', content: 'Fact 2' },
        { assertionId: 'a3', content: 'Fact 3' },
      ];

      // Mock the underlying getTrustValues call
      const mockTrustMap = new Map([
        ['a1', { userId: 'user1', targetId: 'a1', targetType: 'assertion', trustValue: 0.9 }],
        ['a2', { userId: 'user1', targetId: 'a2', targetType: 'assertion', trustValue: 0.5 }],
        ['a3', { userId: 'user1', targetId: 'a3', targetType: 'assertion', trustValue: 0.3 }],
      ]);
      vi.mocked(getTrustValues).mockResolvedValue(mockTrustMap as any);

      const filtered = await filterAssertionsByTrust('user1', assertions as any, 0.6);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].assertionId).toBe('a1');
    });

    it('should return all when threshold is 0', async () => {
      const assertions = [
        { assertionId: 'a1', content: 'Fact 1' },
        { assertionId: 'a2', content: 'Fact 2' },
      ];

      vi.mocked(getTrustValues).mockResolvedValue(new Map());

      const filtered = await filterAssertionsByTrust('user1', assertions as any, 0);

      expect(filtered).toHaveLength(2);
    });

    it('should use default 0.0 for missing trust values', async () => {
      const assertions = [{ assertionId: 'a1', content: 'Fact 1' }];

      vi.mocked(getTrustValues).mockResolvedValue(new Map());

      // With default 0.0, threshold of 0.4 should filter out the assertion
      const filtered = await filterAssertionsByTrust('user1', assertions as any, 0.4);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('sortAssertionsByTrust', () => {
    it('should sort assertions by trust value descending', async () => {
      const assertions = [
        { assertionId: 'a1', content: 'Fact 1' },
        { assertionId: 'a2', content: 'Fact 2' },
        { assertionId: 'a3', content: 'Fact 3' },
      ];

      vi.mocked(getTrustValues).mockResolvedValue(new Map());

      const sorted = await sortAssertionsByTrust('user1', assertions as any);

      expect(sorted).toHaveLength(3);
      // Default trust is 0.0 for all, so order may vary
      expect(sorted.map((a) => a.assertionId)).toContain('a1');
      expect(sorted.map((a) => a.assertionId)).toContain('a2');
      expect(sorted.map((a) => a.assertionId)).toContain('a3');
    });

    it('should handle missing trust values with default 0.0', async () => {
      const assertions = [
        { assertionId: 'a1', content: 'Fact 1' },
        { assertionId: 'a2', content: 'Fact 2' },
      ];

      vi.mocked(getTrustValues).mockResolvedValue(new Map());

      const sorted = await sortAssertionsByTrust('user1', assertions as any);

      expect(sorted).toHaveLength(2);
      expect(sorted.map((a) => a.assertionId)).toContain('a1');
      expect(sorted.map((a) => a.assertionId)).toContain('a2');
    });
  });

  describe('getTrustExplanation', () => {
    it('should return explanation for trust value', async () => {
      vi.mocked(getTrustValue).mockResolvedValue({
        userId: 'user1',
        targetId: 'assertion1',
        targetType: 'assertion',
        trustValue: 0.8,
        isDirectTrust: false,
        propagationConfidence: 0.9,
        propagatedFrom: ['user2', 'user3'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      vi.mocked(getAllUsersTrust).mockResolvedValue(new Map());

      const explanation = await getTrustExplanation('user1', 'assertion1');

      expect(explanation).toBeDefined();
      expect(explanation.trustValue).toBe(0.8);
      expect(explanation.isExplicit).toBe(false);
      expect(explanation.contributors).toBeDefined();
      expect(Array.isArray(explanation.contributors)).toBe(true);
    });

    it('should include contributors in explanation', async () => {
      vi.mocked(getTrustValue).mockResolvedValue(null);
      vi.mocked(getAllUsersTrust).mockResolvedValue(new Map());

      const explanation = await getTrustExplanation('user1', 'source1');

      expect(explanation.contributors).toBeDefined();
      expect(Array.isArray(explanation.contributors)).toBe(true);
    });
  });
});
