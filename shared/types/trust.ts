/**
 * Trust relationship types
 */

export type TargetType = "assertion" | "source" | "user";

export interface TrustRelationship {
  // Identity
  userId: string;              // Who is doing the trusting
  targetId: string;            // What is being trusted (assertionId or sourceId)
  targetType: TargetType;

  // Trust value
  trustValue: number;          // 0.0 to 1.0
  isDirectTrust: boolean;      // true if user set it, false if propagated

  // Propagation metadata (if propagated)
  propagatedFrom?: string[];   // List of sourceIds that influenced this
  propagationConfidence?: number;  // How certain we are (0-1)

  // Metadata
  lastUpdated: string;         // ISO timestamp
  notes?: string;              // User's optional note on why they trust/distrust
}

export interface SetTrustInput {
  targetId: string;
  targetType: TargetType;
  trustValue: number;
  notes?: string;
}

export interface GetTrustResponse {
  targetId: string;
  trustValue: number;
  isDirectTrust: boolean;
  lastUpdated: string;
  notes?: string;
}

export interface TrustGraphNode {
  id: string;
  type: "assertion" | "source" | "user";
  trustValue: number;
  connections: string[];  // IDs of connected nodes
}
