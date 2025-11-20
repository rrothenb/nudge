/**
 * Trust Propagation Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TrustGraph } from './graph';
import {
  propagateTrust,
  computeUserTrustForTarget,
  findTrustPaths,
  identifyTrustSources,
} from './propagation';

describe('Trust Propagation', () => {
  describe('propagateTrust', () => {
    it('should propagate trust through single hop', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user'); // No direct trust
      graph.addEdge('user1', 'user2', 0.8, 'trust');

      const result = propagateTrust(graph);

      expect(result.converged).toBe(true);
      // user2 should get 0.8 * 0.7 (damping) = 0.56
      expect(graph.getTrustValue('user2')).toBeCloseTo(0.56, 1);
    });

    it('should propagate trust through multiple hops', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user'); // No direct trust
      graph.addNode('user3', 'user'); // No direct trust

      graph.addEdge('user1', 'user2', 0.8, 'trust');
      graph.addEdge('user2', 'user3', 0.9, 'trust');

      const result = propagateTrust(graph);

      expect(result.converged).toBe(true);
      // user2: 0.8 * 0.7 = 0.56
      // user3: 0.56 * 0.9 * 0.7 ≈ 0.35
      expect(graph.getTrustValue('user2')).toBeGreaterThan(0.5);
      expect(graph.getTrustValue('user3')).toBeGreaterThan(0.3);
      expect(graph.getTrustValue('user3')).toBeLessThan(graph.getTrustValue('user2'));
    });

    it('should handle multiple trust sources', () => {
      const graph = new TrustGraph('user1');
      // Two users with full trust
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user', 1.0);
      graph.addNode('target', 'user'); // No direct trust

      // Both trust the target
      graph.addEdge('user1', 'target', 0.7, 'trust');
      graph.addEdge('user2', 'target', 0.6, 'trust');

      const result = propagateTrust(graph);

      expect(result.converged).toBe(true);
      // Target should receive trust from both sources
      const targetTrust = graph.getTrustValue('target');
      expect(targetTrust).toBeGreaterThan(0.4);
    });

    it('should respect max depth limit', () => {
      const graph = new TrustGraph('user1');
      // Create a chain longer than max depth
      graph.addNode('user1', 'user', 1.0);
      for (let i = 2; i <= 5; i++) {
        graph.addNode(`user${i}`, 'user', 0.0);
        graph.addEdge(`user${i - 1}`, `user${i}`, 0.9, 'trust');
      }

      const result = propagateTrust(graph, { maxDepth: 2 });

      expect(result.converged).toBe(true);
      // user2 and user3 should have trust, user4 and user5 should have much less
      expect(graph.getTrustValue('user2')).toBeGreaterThan(0.5);
      expect(graph.getTrustValue('user3')).toBeGreaterThan(0.3);
      expect(graph.getTrustValue('user4')).toBeLessThan(0.3);
    });

    it('should converge within max iterations', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user'); // No direct trust
      graph.addEdge('user1', 'user2', 0.8, 'trust');

      const result = propagateTrust(graph, { maxIterations: 10 });

      expect(result.iterations).toBeLessThanOrEqual(10);
      expect(result.converged).toBe(true);
    });

    it('should handle cycles without infinite loops', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user'); // No direct trust
      graph.addNode('user3', 'user'); // No direct trust

      // Create a cycle: user1 -> user2 -> user3 -> user1
      graph.addEdge('user1', 'user2', 0.8, 'trust');
      graph.addEdge('user2', 'user3', 0.7, 'trust');
      graph.addEdge('user3', 'user1', 0.6, 'trust');

      const result = propagateTrust(graph);

      expect(result.converged).toBe(true);
      expect(result.iterations).toBeLessThan(100);
    });

    it('should respect custom damping factor', () => {
      const graph1 = new TrustGraph('user1');
      graph1.addNode('user1', 'user', 1.0);
      graph1.addNode('user2', 'user', 0.0);
      graph1.addEdge('user1', 'user2', 0.8, 'trust');

      const graph2 = new TrustGraph('user1');
      graph2.addNode('user1', 'user', 1.0);
      graph2.addNode('user2', 'user', 0.0);
      graph2.addEdge('user1', 'user2', 0.8, 'trust');

      propagateTrust(graph1, { dampingFactor: 0.7 });
      propagateTrust(graph2, { dampingFactor: 0.9 });

      // Higher damping should result in higher trust values
      expect(graph2.getTrustValue('user2')).toBeGreaterThan(graph1.getTrustValue('user2'));
    });
  });

  describe('computeUserTrustForTarget', () => {
    it('should return 1.0 for direct trust to self', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);

      const trust = computeUserTrustForTarget(graph, 'user1', 'user1');
      expect(trust).toBe(1.0);
    });

    it('should compute trust for direct connection', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user'); // No direct trust
      graph.addEdge('user1', 'user2', 0.8, 'trust');

      const trust = computeUserTrustForTarget(graph, 'user1', 'user2');
      expect(trust).toBeCloseTo(0.8, 1);
    });

    it('should compute trust through intermediaries', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user'); // No direct trust
      graph.addNode('user3', 'user'); // No direct trust

      graph.addEdge('user1', 'user2', 0.9, 'trust');
      graph.addEdge('user2', 'user3', 0.8, 'trust');

      const trust = computeUserTrustForTarget(graph, 'user1', 'user3');
      // Trust should be 0.9 * 0.8 * 0.7 (damping) ≈ 0.50
      expect(trust).toBeGreaterThan(0.4);
      expect(trust).toBeLessThan(0.6);
    });

    it('should return 0 for no connection', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user'); // No direct trust

      const trust = computeUserTrustForTarget(graph, 'user1', 'user2');
      expect(trust).toBe(0);
    });

    it('should respect max depth', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      for (let i = 2; i <= 5; i++) {
        graph.addNode(`user${i}`, 'user', 0.0);
        graph.addEdge(`user${i - 1}`, `user${i}`, 0.9, 'trust');
      }

      const trust1 = computeUserTrustForTarget(graph, 'user1', 'user5', 2);
      const trust2 = computeUserTrustForTarget(graph, 'user1', 'user5', 5);

      // With depth 2, should have no path to user5
      expect(trust1).toBe(0);
      // With depth 5, should have a path
      expect(trust2).toBeGreaterThan(0);
    });
  });

  describe('findTrustPaths', () => {
    it('should find direct path', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user'); // No direct trust
      graph.addEdge('user1', 'user2', 0.8, 'trust');

      const paths = findTrustPaths(graph, 'user1', 'user2', 3);

      expect(paths).toHaveLength(1);
      expect(paths[0].path).toEqual(['user1', 'user2']);
      expect(paths[0].trustValue).toBeCloseTo(0.8, 1);
    });

    it('should find multiple paths', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user'); // No direct trust
      graph.addNode('user3', 'user'); // No direct trust
      graph.addNode('target', 'user'); // No direct trust

      // Two paths from user1 to target
      graph.addEdge('user1', 'user2', 0.8, 'trust');
      graph.addEdge('user2', 'target', 0.7, 'trust');
      graph.addEdge('user1', 'user3', 0.6, 'trust');
      graph.addEdge('user3', 'target', 0.9, 'trust');

      const paths = findTrustPaths(graph, 'user1', 'target', 3);

      expect(paths.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for no path', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user'); // No direct trust

      const paths = findTrustPaths(graph, 'user1', 'user2', 3);

      expect(paths).toHaveLength(0);
    });

    it('should respect depth limit', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      for (let i = 2; i <= 5; i++) {
        graph.addNode(`user${i}`, 'user', 0.0);
        graph.addEdge(`user${i - 1}`, `user${i}`, 0.9, 'trust');
      }

      const paths1 = findTrustPaths(graph, 'user1', 'user5', 2);
      const paths2 = findTrustPaths(graph, 'user1', 'user5', 5);

      expect(paths1).toHaveLength(0);
      expect(paths2.length).toBeGreaterThan(0);
    });
  });

  describe('identifyTrustSources', () => {
    it('should identify direct trust source', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user'); // No direct trust
      graph.addEdge('user1', 'user2', 0.8, 'trust');

      const sources = identifyTrustSources(graph, 'user1', 'user2', 3);

      expect(sources).toHaveLength(1);
      expect(sources[0].sourceId).toBe('user1');
      expect(sources[0].contribution).toBeCloseTo(0.8, 1);
    });

    it('should identify intermediate trust sources', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user'); // No direct trust
      graph.addNode('user3', 'user'); // No direct trust

      graph.addEdge('user1', 'user2', 0.9, 'trust');
      graph.addEdge('user2', 'user3', 0.8, 'trust');

      const sources = identifyTrustSources(graph, 'user1', 'user3', 3);

      // Should identify user2 as intermediate
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.some((s) => s.sourceId === 'user2')).toBe(true);
    });

    it('should handle multiple contributing sources', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user'); // No direct trust
      graph.addNode('user3', 'user'); // No direct trust
      graph.addNode('target', 'user'); // No direct trust

      graph.addEdge('user1', 'user2', 0.8, 'trust');
      graph.addEdge('user2', 'target', 0.7, 'trust');
      graph.addEdge('user1', 'user3', 0.6, 'trust');
      graph.addEdge('user3', 'target', 0.9, 'trust');

      const sources = identifyTrustSources(graph, 'user1', 'target', 3);

      // Should identify both user2 and user3 as contributors
      expect(sources.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for no trust path', () => {
      const graph = new TrustGraph('user1');
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user'); // No direct trust

      const sources = identifyTrustSources(graph, 'user1', 'user2', 3);

      expect(sources).toHaveLength(0);
    });
  });
});
