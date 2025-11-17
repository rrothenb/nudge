/**
 * Assertion types used throughout the platform
 */

export enum AssertionType {
  // Core types
  FACTUAL = "factual",           // Basic factual claim
  TRUST = "trust",               // Trust relationship assertion
  ATTRIBUTION = "attribution",   // "Source X says Y"
  EVIDENTIAL = "evidential",     // "Study supports claim"

  // Import types
  WIKI_IMPORT = "wiki_import",   // From Wikipedia
  NEWS_IMPORT = "news_import",   // From news source

  // Future: blog, tweet, forum_post (Phase 3)
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

  // Metadata
  topic?: string[];           // For wiki organization
  publishedAt?: string;       // ISO timestamp for news/social
  url?: string;               // If imported from web
  extractedFrom?: string;     // Parent assertionId if extracted

  // Timestamps
  createdAt: string;          // ISO timestamp
  updatedAt: string;          // ISO timestamp
}

export interface CreateAssertionInput {
  type: AssertionType;
  content: string | Record<string, any>;
  sourceId: string;
  sourceType: SourceType;
  topic?: string[];
  publishedAt?: string;
  url?: string;
  extractedFrom?: string;
}
