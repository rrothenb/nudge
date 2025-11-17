/**
 * Trust graph data structure and operations
 */
import type { TrustRelationship, Assertion } from '@nudge/shared';
import { DEFAULT_TRUST_VALUE } from '@nudge/shared';

export interface TrustNode {
  id: string;
  type: 'user' | 'source' | 'assertion';
  directTrust?: number; // User's explicit trust value
  computedTrust: number; // Computed value (may equal directTrust)
  edges: TrustEdge[];
}

export interface TrustEdge {
  from: string; // Source node ID
  to: string; // Target node ID
  weight: number; // Trust value (0-1)
  type: 'trust' | 'authored' | 'supports';
}

export class TrustGraph {
  private nodes: Map<string, TrustNode>;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.nodes = new Map();
  }

  /**
   * Add or update a node in the graph
   */
  addNode(id: string, type: TrustNode['type'], directTrust?: number): void {
    const existing = this.nodes.get(id);

    if (existing) {
      // Update existing node
      if (directTrust !== undefined) {
        existing.directTrust = directTrust;
        existing.computedTrust = directTrust; // Start with direct value
      }
    } else {
      // Create new node
      this.nodes.set(id, {
        id,
        type,
        directTrust,
        computedTrust: directTrust ?? DEFAULT_TRUST_VALUE,
        edges: [],
      });
    }
  }

  /**
   * Add an edge between two nodes
   */
  addEdge(from: string, to: string, weight: number, type: TrustEdge['type']): void {
    const fromNode = this.nodes.get(from);

    if (!fromNode) {
      throw new Error(`Source node not found: ${from}`);
    }

    // Check if edge already exists
    const existingEdge = fromNode.edges.find((e) => e.to === to);

    if (existingEdge) {
      // Update existing edge
      existingEdge.weight = weight;
      existingEdge.type = type;
    } else {
      // Add new edge
      fromNode.edges.push({ from, to, weight, type });
    }
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): TrustNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): TrustNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get nodes of a specific type
   */
  getNodesByType(type: TrustNode['type']): TrustNode[] {
    return Array.from(this.nodes.values()).filter((node) => node.type === type);
  }

  /**
   * Get outgoing edges from a node
   */
  getOutgoingEdges(nodeId: string): TrustEdge[] {
    const node = this.nodes.get(nodeId);
    return node ? node.edges : [];
  }

  /**
   * Get incoming edges to a node
   */
  getIncomingEdges(nodeId: string): TrustEdge[] {
    const edges: TrustEdge[] = [];

    for (const node of this.nodes.values()) {
      for (const edge of node.edges) {
        if (edge.to === nodeId) {
          edges.push(edge);
        }
      }
    }

    return edges;
  }

  /**
   * Check if a node has direct trust set
   */
  hasDirectTrust(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    return node !== undefined && node.directTrust !== undefined;
  }

  /**
   * Get the computed trust value for a node
   */
  getTrustValue(nodeId: string): number {
    const node = this.nodes.get(nodeId);
    return node ? node.computedTrust : DEFAULT_TRUST_VALUE;
  }

  /**
   * Set the computed trust value for a node
   */
  setComputedTrust(nodeId: string, value: number): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.computedTrust = value;
    }
  }

  /**
   * Get all node IDs
   */
  getNodeIds(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    totalNodes: number;
    totalEdges: number;
    nodesWithDirectTrust: number;
    averageTrust: number;
  } {
    const nodes = this.getAllNodes();
    const totalNodes = nodes.length;
    const totalEdges = nodes.reduce((sum, node) => sum + node.edges.length, 0);
    const nodesWithDirectTrust = nodes.filter((n) => n.directTrust !== undefined).length;
    const averageTrust =
      nodes.reduce((sum, node) => sum + node.computedTrust, 0) / (totalNodes || 1);

    return {
      totalNodes,
      totalEdges,
      nodesWithDirectTrust,
      averageTrust,
    };
  }
}

/**
 * Build a trust graph from user's trust relationships and assertions
 */
export async function buildTrustGraphFromData(
  userId: string,
  trustRelationships: TrustRelationship[],
  assertions: Assertion[]
): Promise<TrustGraph> {
  const graph = new TrustGraph(userId);

  // Add user as root node
  graph.addNode(userId, 'user', 1.0);

  // Add trust relationships
  for (const trust of trustRelationships) {
    // Add target node
    graph.addNode(
      trust.targetId,
      trust.targetType === 'assertion' ? 'assertion' : 'source',
      trust.isDirectTrust ? trust.trustValue : undefined
    );

    // Add edge from user to target
    graph.addEdge(userId, trust.targetId, trust.trustValue, 'trust');
  }

  // Add assertions and their relationships
  for (const assertion of assertions) {
    // Add assertion node
    if (!graph.getNode(assertion.assertionId)) {
      graph.addNode(assertion.assertionId, 'assertion');
    }

    // Add source node if not exists
    if (!graph.getNode(assertion.sourceId)) {
      graph.addNode(assertion.sourceId, 'source');
    }

    // Add edge from source to assertion
    graph.addEdge(assertion.sourceId, assertion.assertionId, 1.0, 'authored');
  }

  return graph;
}
