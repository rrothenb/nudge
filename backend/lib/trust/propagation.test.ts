/**
 * Trust Propagation Tests (Similarity-Based Algorithm)
 *
 * Tests for the new similarity-based trust inference algorithm
 * that replaced the old PageRank-style graph propagation.
 */
import { describe, it, expect } from 'vitest';
import {
  inferTrust,
  inferTrustBatch,
  explainTrustInference,
  findTrustPaths,
} from './propagation';
import type { TrustVector } from './similarity';
import { TrustGraph } from './graph';

describe('Trust Propagation (Similarity-Based)', () => {
  describe('inferTrust', () => {
    it('should return explicit trust when user has set it directly', () => {
      const vectors: TrustVector[] = [
        { userId: 'user1', values: new Map([['source1', 0.8]]) },
      ];
      const valueMap = new Map([['user1', new Map([['source1', 0.8]])]]);

      const result = inferTrust('user1', 'source1', 'source', vectors, valueMap);

      expect(result.trustValue).toBe(0.8);
      expect(result.isExplicit).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('should return entity default when user has no trust vector', () => {
      const vectors: TrustVector[] = [];
      const valueMap = new Map();

      const result = inferTrust('user1', 'assertion1', 'assertion', vectors, valueMap);

      expect(result.trustValue).toBe(0.0); // Default for assertions
      expect(result.isExplicit).toBe(false);
      expect(result.isDefaulted).toBe(true);
      expect(result.confidence).toBe(0);
    });

    it('should return entity default when no similar users have opinions', () => {
      const vectors: TrustVector[] = [
        { userId: 'user1', values: new Map([['source1', 0.8]]) },
        { userId: 'user2', values: new Map([['source2', 0.9]]) },
      ];
      const valueMap = new Map([
        ['user1', new Map([['source1', 0.8]])],
        ['user2', new Map([['source2', 0.9]])],
      ]);

      // user1 asks about assertion1, but no one has an opinion on it
      const result = inferTrust('user1', 'assertion1', 'assertion', vectors, valueMap);

      expect(result.trustValue).toBe(0.0);
      expect(result.isDefaulted).toBe(true);
      expect(result.numSimilarUsers).toBe(0);
    });

    it('should infer trust from similar users', () => {
      // Create three users with similar trust patterns (increased overlap for higher similarity)
      const vectors: TrustVector[] = [
        {
          userId: 'user1',
          values: new Map([
            ['source1', 0.8],
            ['source2', 0.9],
            ['source3', 0.7],
            ['source4', 0.85],
            ['source5', 0.75],
          ]),
        },
        {
          userId: 'user2',
          values: new Map([
            ['source1', 0.85],
            ['source2', 0.95],
            ['source3', 0.75],
            ['source4', 0.9],
            ['source5', 0.8],
            ['target', 0.8], // user2 has opinion on target
          ]),
        },
        {
          userId: 'user3',
          values: new Map([
            ['source1', 0.75],
            ['source2', 0.85],
            ['source3', 0.65],
            ['source4', 0.8],
            ['source5', 0.7],
            ['target', 0.7], // user3 has opinion on target
          ]),
        },
      ];

      const valueMap = new Map([
        ['user1', vectors[0].values],
        ['user2', vectors[1].values],
        ['user3', vectors[2].values],
      ]);

      // user1 asks about target
      const result = inferTrust('user1', 'target', 'assertion', vectors, valueMap);

      // Should infer trust based on similar users (user2 and user3)
      expect(result.isExplicit).toBe(false);
      // May blend with default if confidence is lower than threshold
      expect(result.numSimilarUsers).toBeGreaterThan(0);
      expect(result.trustValue).toBeGreaterThan(0.1);
      expect(result.trustValue).toBeLessThan(0.9);
    });

    it('should demonstrate non-transitivity (A→B→C does not create A→C)', () => {
      // user1 trusts user2, user2 trusts target
      // But this should NOT create transitive trust unless user1 is similar to user2
      const vectors: TrustVector[] = [
        {
          userId: 'user1',
          values: new Map([
            ['source1', 0.9],
            ['user2', 0.8], // user1 trusts user2 (but different domain)
          ]),
        },
        {
          userId: 'user2',
          values: new Map([
            ['source2', 0.7],
            ['target', 0.8], // user2 trusts target
          ]),
        },
      ];

      const valueMap = new Map([
        ['user1', vectors[0].values],
        ['user2', vectors[1].values],
      ]);

      // user1 asks about target
      const result = inferTrust('user1', 'target', 'assertion', vectors, valueMap);

      // Users have no overlap in trust values (except user2), so similarity is low
      // Result should default or have low confidence
      expect(result.numSimilarUsers).toBe(0);
      expect(result.isDefaulted).toBe(true);
    });

    it('should demonstrate Sybil resistance (fake users contribute nothing)', () => {
      // Create one real user and many fake users (more overlaps for higher similarity)
      const vectors: TrustVector[] = [
        {
          userId: 'realUser',
          values: new Map([
            ['source1', 0.8],
            ['source2', 0.9],
            ['source3', 0.75],
            ['source4', 0.85],
          ]),
        },
      ];

      const valueMap = new Map([['realUser', vectors[0].values]]);

      // Add 100 fake users with default 0.0 trust (they have no explicit values)
      for (let i = 0; i < 100; i++) {
        vectors.push({
          userId: `fakeUser${i}`,
          values: new Map([['target', 0.0]]), // Fake users "vote" 0.0
        });
        valueMap.set(`fakeUser${i}`, new Map([['target', 0.0]]));
      }

      // Add real similar user with more overlap
      vectors.push({
        userId: 'similarUser',
        values: new Map([
          ['source1', 0.85],
          ['source2', 0.95],
          ['source3', 0.8],
          ['source4', 0.9],
          ['target', 0.9], // Similar user trusts target
        ]),
      });
      valueMap.set(
        'similarUser',
        new Map([
          ['source1', 0.85],
          ['source2', 0.95],
          ['source3', 0.8],
          ['source4', 0.9],
          ['target', 0.9],
        ])
      );

      // realUser asks about target
      const result = inferTrust('realUser', 'target', 'assertion', vectors, valueMap);

      // The fake users have no similarity to realUser (no overlap),
      // so they contribute nothing. Only similarUser influences the result.
      expect(result.trustValue).toBeGreaterThan(0.1);
    });

    it('should blend with entity default when confidence is low', () => {
      const vectors: TrustVector[] = [
        {
          userId: 'user1',
          values: new Map([
            ['source1', 0.8],
            ['source2', 0.9],
          ]),
        },
        {
          userId: 'user2',
          values: new Map([
            ['source1', 0.7], // Some overlap, but not much
            ['target', 0.8],
          ]),
        },
      ];

      const valueMap = new Map([
        ['user1', vectors[0].values],
        ['user2', vectors[1].values],
      ]);

      // user1 asks about target with low confidence threshold
      const result = inferTrust('user1', 'target', 'assertion', vectors, valueMap, {
        confidenceThreshold: 10.0, // High threshold → low confidence
      });

      // Should blend with entity default due to low confidence
      expect(result.isDefaulted).toBe(true);
      expect(result.confidence).toBeLessThan(1.0);
    });
  });

  describe('inferTrustBatch', () => {
    it('should compute trust for multiple targets efficiently', () => {
      const vectors: TrustVector[] = [
        {
          userId: 'user1',
          values: new Map([
            ['source1', 0.8],
            ['source2', 0.9],
            ['source3', 0.75],
            ['source4', 0.85],
          ]),
        },
        {
          userId: 'user2',
          values: new Map([
            ['source1', 0.85],
            ['source2', 0.95],
            ['source3', 0.8],
            ['source4', 0.9],
            ['target1', 0.8],
            ['target2', 0.7],
            ['target3', 0.9],
          ]),
        },
      ];

      const valueMap = new Map([
        ['user1', vectors[0].values],
        ['user2', vectors[1].values],
      ]);

      const targetIds = ['target1', 'target2', 'target3'];
      const targetTypes = new Map<string, 'user' | 'source' | 'bot' | 'assertion' | 'group'>([
        ['target1', 'assertion'],
        ['target2', 'assertion'],
        ['target3', 'assertion'],
      ]);

      const results = inferTrustBatch('user1', targetIds, targetTypes, vectors, valueMap);

      expect(results.size).toBe(3);
      expect(results.get('target1')).toBeDefined();
      expect(results.get('target2')).toBeDefined();
      expect(results.get('target3')).toBeDefined();

      // All should have inferred trust from user2
      expect(results.get('target1')!.trustValue).toBeGreaterThan(0.1);
      expect(results.get('target2')!.trustValue).toBeGreaterThan(0.1);
      expect(results.get('target3')!.trustValue).toBeGreaterThan(0.1);
    });

    it('should handle empty target list', () => {
      const vectors: TrustVector[] = [
        { userId: 'user1', values: new Map([['source1', 0.8]]) },
      ];
      const valueMap = new Map([['user1', vectors[0].values]]);

      const results = inferTrustBatch('user1', [], new Map(), vectors, valueMap);

      expect(results.size).toBe(0);
    });
  });

  describe('explainTrustInference', () => {
    it('should identify contributors to trust inference', () => {
      const vectors: TrustVector[] = [
        {
          userId: 'user1',
          values: new Map([
            ['source1', 0.8],
            ['source2', 0.9],
            ['source3', 0.7],
          ]),
        },
        {
          userId: 'user2',
          values: new Map([
            ['source1', 0.85],
            ['source2', 0.95],
            ['source3', 0.75],
            ['target', 0.8],
          ]),
        },
        {
          userId: 'user3',
          values: new Map([
            ['source1', 0.75],
            ['source2', 0.85],
            ['source3', 0.65],
            ['target', 0.7],
          ]),
        },
      ];

      const valueMap = new Map([
        ['user1', vectors[0].values],
        ['user2', vectors[1].values],
        ['user3', vectors[2].values],
      ]);

      const explanation = explainTrustInference('user1', 'target', vectors, valueMap);

      expect(explanation.length).toBeGreaterThan(0);
      expect(explanation[0]).toHaveProperty('userId');
      expect(explanation[0]).toHaveProperty('similarity');
      expect(explanation[0]).toHaveProperty('trustValue');
      expect(explanation[0]).toHaveProperty('contribution');

      // Contributions should sum to ~100%
      const totalContribution = explanation.reduce((sum, e) => sum + e.contribution, 0);
      expect(totalContribution).toBeCloseTo(100, 0);
    });

    it('should return empty array when user has no trust vector', () => {
      const vectors: TrustVector[] = [];
      const valueMap = new Map();

      const explanation = explainTrustInference('user1', 'target', vectors, valueMap);

      expect(explanation).toEqual([]);
    });

    it('should limit results to topN contributors', () => {
      const vectors: TrustVector[] = [
        {
          userId: 'user1',
          values: new Map([['source1', 0.8]]),
        },
      ];
      const valueMap = new Map([['user1', vectors[0].values]]);

      // Add many users with opinions
      for (let i = 0; i < 20; i++) {
        vectors.push({
          userId: `user${i + 2}`,
          values: new Map([
            ['source1', 0.7 + Math.random() * 0.2],
            ['target', 0.5 + Math.random() * 0.5],
          ]),
        });
        valueMap.set(
          `user${i + 2}`,
          new Map([
            ['source1', 0.7 + Math.random() * 0.2],
            ['target', 0.5 + Math.random() * 0.5],
          ])
        );
      }

      const explanation = explainTrustInference('user1', 'target', vectors, valueMap, {
        topN: 5,
      });

      expect(explanation.length).toBeLessThanOrEqual(5);
    });
  });

  describe('findTrustPaths (legacy function)', () => {
    it('should find direct path in legacy graph', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user');
      graph.addEdge('user1', 'user2', 0.8, 'trust');

      const paths = findTrustPaths(graph, 'user1', 'user2', 3);

      expect(paths).toHaveLength(1);
      expect(paths[0].path).toEqual(['user1', 'user2']);
      expect(paths[0].trustValue).toBeCloseTo(0.8, 1);
    });

    it('should respect depth limit in legacy graph', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      for (let i = 2; i <= 5; i++) {
        graph.addNode(`user${i}`, 'user');
        graph.addEdge(`user${i - 1}`, `user${i}`, 0.9, 'trust');
      }

      const paths1 = findTrustPaths(graph, 'user1', 'user5', 2);
      const paths2 = findTrustPaths(graph, 'user1', 'user5', 5);

      expect(paths1).toHaveLength(0);
      expect(paths2.length).toBeGreaterThan(0);
    });
  });

  describe('Schelling points (cross-community trusted sources)', () => {
    it('should surface sources trusted across different communities', () => {
      // Community 1: Progressive users
      const progressive1: TrustVector = {
        userId: 'progressive1',
        values: new Map([
          ['NYT', 0.9],
          ['WaPo', 0.85],
          ['MSNBC', 0.8],
          ['Reuters', 0.9], // Schelling point
        ]),
      };

      const progressive2: TrustVector = {
        userId: 'progressive2',
        values: new Map([
          ['NYT', 0.95],
          ['WaPo', 0.9],
          ['CNN', 0.85],
          ['Reuters', 0.95], // Schelling point
        ]),
      };

      // Community 2: Conservative users
      const conservative1: TrustVector = {
        userId: 'conservative1',
        values: new Map([
          ['FoxNews', 0.9],
          ['WSJ', 0.85],
          ['Breitbart', 0.7],
          ['Reuters', 0.85], // Schelling point
        ]),
      };

      const conservative2: TrustVector = {
        userId: 'conservative2',
        values: new Map([
          ['FoxNews', 0.95],
          ['WSJ', 0.9],
          ['DailyWire', 0.8],
          ['Reuters', 0.9], // Schelling point
        ]),
      };

      const vectors = [progressive1, progressive2, conservative1, conservative2];
      const valueMap = new Map([
        ['progressive1', progressive1.values],
        ['progressive2', progressive2.values],
        ['conservative1', conservative1.values],
        ['conservative2', conservative2.values],
      ]);

      // New user with no opinions
      const newUser: TrustVector = {
        userId: 'newUser',
        values: new Map(),
      };
      vectors.push(newUser);
      valueMap.set('newUser', newUser.values);

      // Ask each community member about Reuters
      const prog1Result = inferTrust('progressive1', 'Reuters', 'source', vectors, valueMap);
      const cons1Result = inferTrust('conservative1', 'Reuters', 'source', vectors, valueMap);

      // Both should have high trust in Reuters (Schelling point)
      expect(prog1Result.trustValue).toBeGreaterThan(0.85);
      expect(cons1Result.trustValue).toBeGreaterThan(0.8);
    });
  });
});
