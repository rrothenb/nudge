/**
 * Assertion types used throughout the platform
 */

export enum AssertionType {
  // Core types
  FACTUAL = "factual",           // Basic factual claim
  TRUST = "trust",               // Trust relationship assertion
  ATTRIBUTION = "attribution",   // "Source X says Y"
  EVIDENTIAL = "evidential",     // "Study supports claim"
  OPINION = "opinion",           // Opinion or subjective claim
  PREDICTION = "prediction",     // Future-oriented prediction

  // Import types
  WIKI_IMPORT = "wiki_import",   // From Wikipedia
  NEWS_IMPORT = "news_import",   // From news source

  // Future: blog, tweet, forum_post (Phase 3)
}

export type RelationshipType =
  | "supports"        // This assertion supports/reinforces another
  | "contradicts"     // This assertion contradicts another
  | "elaborates"      // This assertion adds detail to another
  | "cites"           // This assertion cites another as evidence
  | "updates"         // This assertion updates/supersedes another
  | "equivalent_to";  // This assertion is editorially equivalent to another

export interface AssertionRelationship {
  type: RelationshipType;
  targetId: string;       // The assertion being related to
  confidence: number;     // 0.0 to 1.0 confidence in this relationship
}

export type SourceType = "user" | "bot" | "import";

export interface Assertion {
  // Identity
  assertionId: string;
  version: number;

  // Content
  type: AssertionType;
  content: string | Record<string, any>;

  // Attribution
  sourceId: string;           // userId or "WIKIPEDIA" or "NYT" etc
  sourceType: SourceType;
  authorUserId?: string;      // If user-authored

  // Provenance (who vouched for attribution)
  importedBy?: string;        // Bot ID that imported/vouched for this assertion
  originalUrl?: string;       // Original source URL (for imported content)

  // Metadata
  topic?: string[];           // For wiki organization
  publishedAt?: string;       // ISO timestamp for news/social
  url?: string;               // If imported from web
  extractedFrom?: string;     // Parent assertionId if extracted

  // Temporal scope
  temporalScope?: {
    start: Date;
    end?: Date;
  };

  // Relationships to other assertions
  relationships?: AssertionRelationship[];

  // For semantic search (future)
  embedding?: number[];

  // Timestamps
  createdAt: string;          // ISO timestamp
  updatedAt: string;          // ISO timestamp
}

export interface CreateAssertionInput {
  type: AssertionType;
  content: string | Record<string, any>;
  sourceId: string;
  sourceType: SourceType;
  importedBy?: string;
  originalUrl?: string;
  topic?: string[];
  publishedAt?: string;
  url?: string;
  extractedFrom?: string;
  temporalScope?: {
    start: Date;
    end?: Date;
  };
  relationships?: AssertionRelationship[];
  embedding?: number[];
}
