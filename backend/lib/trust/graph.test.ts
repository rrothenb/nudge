/**
 * Trust Graph Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TrustGraph } from './graph';

describe('TrustGraph', () => {
  let graph: TrustGraph;

  beforeEach(() => {
    graph = new TrustGraph();
  });

  describe('addNode', () => {
    it('should add a node to the graph', () => {
      graph.addNode('user1', 'user', 1.0);
      expect(graph.getTrustValue('user1')).toBe(1.0);
    });

    it('should add nodes with different types', () => {
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('source1', 'source', 0.5);
      graph.addNode('assertion1', 'assertion');

      expect(graph.getTrustValue('user1')).toBe(1.0);
      expect(graph.getTrustValue('source1')).toBe(0.5);
      expect(graph.getTrustValue('assertion1')).toBe(0);
    });

    it('should update existing node trust value', () => {
      graph.addNode('user1', 'user', 0.5);
      graph.addNode('user1', 'user', 0.8);
      expect(graph.getTrustValue('user1')).toBe(0.8);
    });
  });

  describe('addEdge', () => {
    beforeEach(() => {
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user', 0.0);
    });

    it('should add an edge between nodes', () => {
      graph.addEdge('user1', 'user2', 0.8, 'direct');
      const neighbors = graph.getNeighbors('user1');
      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].targetId).toBe('user2');
      expect(neighbors[0].weight).toBe(0.8);
    });

    it('should handle multiple edges from one node', () => {
      graph.addNode('user3', 'user', 0.0);
      graph.addEdge('user1', 'user2', 0.8, 'direct');
      graph.addEdge('user1', 'user3', 0.6, 'direct');

      const neighbors = graph.getNeighbors('user1');
      expect(neighbors).toHaveLength(2);
    });

    it('should handle different edge types', () => {
      graph.addEdge('user1', 'user2', 0.8, 'direct');
      graph.addNode('assertion1', 'assertion');
      graph.addEdge('user1', 'assertion1', 0.9, 'attribution');

      const neighbors = graph.getNeighbors('user1');
      expect(neighbors.find((n) => n.type === 'direct')).toBeDefined();
      expect(neighbors.find((n) => n.type === 'attribution')).toBeDefined();
    });
  });

  describe('getNeighbors', () => {
    it('should return empty array for node with no edges', () => {
      graph.addNode('user1', 'user', 1.0);
      expect(graph.getNeighbors('user1')).toHaveLength(0);
    });

    it('should return empty array for non-existent node', () => {
      expect(graph.getNeighbors('nonexistent')).toHaveLength(0);
    });

    it('should return all neighbors', () => {
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user', 0.0);
      graph.addNode('user3', 'user', 0.0);

      graph.addEdge('user1', 'user2', 0.8, 'direct');
      graph.addEdge('user1', 'user3', 0.6, 'direct');

      const neighbors = graph.getNeighbors('user1');
      expect(neighbors).toHaveLength(2);
    });
  });

  describe('getAllNodes', () => {
    it('should return empty array for empty graph', () => {
      expect(graph.getAllNodes()).toHaveLength(0);
    });

    it('should return all nodes', () => {
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user', 0.5);
      graph.addNode('source1', 'source', 0.8);

      const nodes = graph.getAllNodes();
      expect(nodes).toHaveLength(3);
      expect(nodes.map((n) => n.id).sort()).toEqual(['source1', 'user1', 'user2']);
    });
  });

  describe('getTrustValue', () => {
    it('should return 0 for non-existent node', () => {
      expect(graph.getTrustValue('nonexistent')).toBe(0);
    });

    it('should return correct trust value', () => {
      graph.addNode('user1', 'user', 0.75);
      expect(graph.getTrustValue('user1')).toBe(0.75);
    });
  });

  describe('setTrustValue', () => {
    it('should set trust value for existing node', () => {
      graph.addNode('user1', 'user', 0.5);
      graph.setTrustValue('user1', 0.9);
      expect(graph.getTrustValue('user1')).toBe(0.9);
    });

    it('should do nothing for non-existent node', () => {
      graph.setTrustValue('nonexistent', 0.9);
      expect(graph.getTrustValue('nonexistent')).toBe(0);
    });

    it('should clamp trust value to [0, 1]', () => {
      graph.addNode('user1', 'user', 0.5);
      graph.setTrustValue('user1', 1.5);
      expect(graph.getTrustValue('user1')).toBe(1);

      graph.setTrustValue('user1', -0.5);
      expect(graph.getTrustValue('user1')).toBe(0);
    });
  });

  describe('complex graph scenarios', () => {
    it('should handle chain of trust relationships', () => {
      // user1 -> user2 -> user3
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user', 0.0);
      graph.addNode('user3', 'user', 0.0);

      graph.addEdge('user1', 'user2', 0.8, 'direct');
      graph.addEdge('user2', 'user3', 0.7, 'direct');

      expect(graph.getNeighbors('user1')).toHaveLength(1);
      expect(graph.getNeighbors('user2')).toHaveLength(1);
      expect(graph.getNeighbors('user3')).toHaveLength(0);
    });

    it('should handle star topology', () => {
      // Central user connected to multiple users
      graph.addNode('center', 'user', 1.0);
      for (let i = 1; i <= 5; i++) {
        graph.addNode(`user${i}`, 'user', 0.0);
        graph.addEdge('center', `user${i}`, 0.5 + i * 0.1, 'direct');
      }

      expect(graph.getNeighbors('center')).toHaveLength(5);
      expect(graph.getAllNodes()).toHaveLength(6);
    });

    it('should handle cycle in graph', () => {
      // user1 -> user2 -> user3 -> user1
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', user', 0.0);
      graph.addNode('user3', 'user', 0.0);

      graph.addEdge('user1', 'user2', 0.8, 'direct');
      graph.addEdge('user2', 'user3', 0.7, 'direct');
      graph.addEdge('user3', 'user1', 0.6, 'direct');

      expect(graph.getAllNodes()).toHaveLength(3);
      expect(graph.getNeighbors('user1')).toHaveLength(1);
      expect(graph.getNeighbors('user2')).toHaveLength(1);
      expect(graph.getNeighbors('user3')).toHaveLength(1);
    });
  });
});
