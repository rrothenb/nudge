/**
 * Default values used throughout the application
 */

// Trust defaults
/**
 * @deprecated Use getDefaultTrust() from trust-defaults.ts instead
 * This provides entity-type-specific defaults for better security
 */
export const DEFAULT_TRUST_VALUE = 0.5;
export const DEFAULT_TRUST_THRESHOLD = 0.5;

// Trust propagation (PageRank-style - DEPRECATED)
/**
 * @deprecated PageRank-style propagation replaced with similarity-based diffusion
 * These parameters are no longer used in the new algorithm
 */
export const TRUST_DAMPING_FACTOR = 0.7;
/**
 * @deprecated PageRank-style propagation replaced with similarity-based diffusion
 */
export const TRUST_MAX_DEPTH = 3;
export const TRUST_CONVERGENCE_THRESHOLD = 0.01;
export const TRUST_MAX_ITERATIONS = 10;

// Similarity-based trust inference (new algorithm)
export const SIMILARITY_BANDWIDTH_SIGMA = 0.3;        // σ parameter for Gaussian kernel
export const MIN_OVERLAP_FOR_SIMILARITY = 3;          // Minimum shared trust values to compute similarity
export const CONFIDENCE_THRESHOLD = 5.0;              // Sum of similarities needed for confident inference
export const SIMILARITY_MAX_COMPARISONS = 1000;       // Limit comparisons for performance (naive implementation)

// Content generation
export const CACHE_TTL_HOURS = 24;
export const MIN_TRUST_FOR_ARTICLE = 0.3;    // Don't include assertions below this
export const MAX_ASSERTIONS_PER_ARTICLE = 50;

// Claude API
export const CLAUDE_MODEL = "claude-sonnet-4-20250514";
export const CLAUDE_MAX_TOKENS = 4096;
export const CLAUDE_TEMPERATURE = 0.7;

// Pagination
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
