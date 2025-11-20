/**
 * Trust Graph Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TrustGraph } from './graph';

describe('TrustGraph', () => {
  let graph: TrustGraph;

  beforeEach(() => {
    graph = new TrustGraph('test-user');
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
      expect(graph.getTrustValue('assertion1')).toBe(0.5); // DEFAULT_TRUST_VALUE
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
      graph.addEdge('user1', 'user2', 0.8, 'trust');
      const edges = graph.getOutgoingEdges('user1');
      expect(edges).toHaveLength(1);
      expect(edges[0].to).toBe('user2');
      expect(edges[0].weight).toBe(0.8);
    });

    it('should handle multiple edges from one node', () => {
      graph.addNode('user3', 'user', 0.0);
      graph.addEdge('user1', 'user2', 0.8, 'trust');
      graph.addEdge('user1', 'user3', 0.6, 'trust');

      const edges = graph.getOutgoingEdges('user1');
      expect(edges).toHaveLength(2);
    });

    it('should handle different edge types', () => {
      graph.addEdge('user1', 'user2', 0.8, 'trust');
      graph.addNode('assertion1', 'assertion');
      graph.addEdge('user1', 'assertion1', 0.9, 'authored');

      const edges = graph.getOutgoingEdges('user1');
      expect(edges.find((e) => e.type === 'trust')).toBeDefined();
      expect(edges.find((e) => e.type === 'authored')).toBeDefined();
    });
  });

  describe('getOutgoingEdges', () => {
    it('should return empty array for node with no edges', () => {
      graph.addNode('user1', 'user', 1.0);
      expect(graph.getOutgoingEdges('user1')).toHaveLength(0);
    });

    it('should return empty array for non-existent node', () => {
      expect(graph.getOutgoingEdges('nonexistent')).toHaveLength(0);
    });

    it('should return all outgoing edges', () => {
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user', 0.0);
      graph.addNode('user3', 'user', 0.0);

      graph.addEdge('user1', 'user2', 0.8, 'trust');
      graph.addEdge('user1', 'user3', 0.6, 'trust');

      const edges = graph.getOutgoingEdges('user1');
      expect(edges).toHaveLength(2);
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
    it('should return DEFAULT_TRUST_VALUE for non-existent node', () => {
      expect(graph.getTrustValue('nonexistent')).toBe(0.5);
    });

    it('should return correct trust value', () => {
      graph.addNode('user1', 'user', 0.75);
      expect(graph.getTrustValue('user1')).toBe(0.75);
    });
  });

  describe('setComputedTrust', () => {
    it('should set computed trust value for existing node', () => {
      graph.addNode('user1', 'user', 0.5);
      graph.setComputedTrust('user1', 0.9);
      expect(graph.getTrustValue('user1')).toBe(0.9);
    });

    it('should do nothing for non-existent node', () => {
      graph.setComputedTrust('nonexistent', 0.9);
      expect(graph.getTrustValue('nonexistent')).toBe(0.5);
    });

    it('should accept values outside [0, 1] (no clamping in new API)', () => {
      graph.addNode('user1', 'user', 0.5);
      graph.setComputedTrust('user1', 1.5);
      expect(graph.getTrustValue('user1')).toBe(1.5);

      graph.setComputedTrust('user1', -0.5);
      expect(graph.getTrustValue('user1')).toBe(-0.5);
    });
  });

  describe('complex graph scenarios', () => {
    it('should handle chain of trust relationships', () => {
      // user1 -> user2 -> user3
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user', 0.0);
      graph.addNode('user3', 'user', 0.0);

      graph.addEdge('user1', 'user2', 0.8, 'trust');
      graph.addEdge('user2', 'user3', 0.7, 'trust');

      expect(graph.getOutgoingEdges('user1')).toHaveLength(1);
      expect(graph.getOutgoingEdges('user2')).toHaveLength(1);
      expect(graph.getOutgoingEdges('user3')).toHaveLength(0);
    });

    it('should handle star topology', () => {
      // Central user connected to multiple users
      graph.addNode('center', 'user', 1.0);
      for (let i = 1; i <= 5; i++) {
        graph.addNode(`user${i}`, 'user', 0.0);
        graph.addEdge('center', `user${i}`, 0.5 + i * 0.1, 'trust');
      }

      expect(graph.getOutgoingEdges('center')).toHaveLength(5);
      expect(graph.getAllNodes()).toHaveLength(6);
    });

    it('should handle cycle in graph', () => {
      // user1 -> user2 -> user3 -> user1
      graph.addNode('user1', 'user', 1.0);
      graph.addNode('user2', 'user', 0.0);
      graph.addNode('user3', 'user', 0.0);

      graph.addEdge('user1', 'user2', 0.8, 'trust');
      graph.addEdge('user2', 'user3', 0.7, 'trust');
      graph.addEdge('user3', 'user1', 0.6, 'trust');

      expect(graph.getAllNodes()).toHaveLength(3);
      expect(graph.getOutgoingEdges('user1')).toHaveLength(1);
      expect(graph.getOutgoingEdges('user2')).toHaveLength(1);
      expect(graph.getOutgoingEdges('user3')).toHaveLength(1);
    });
  });
});
