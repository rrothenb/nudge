/**
 * Default values used throughout the application
 */

// Trust defaults
export const DEFAULT_TRUST_VALUE = 0.5;
export const DEFAULT_TRUST_THRESHOLD = 0.5;

// Trust propagation
export const TRUST_DAMPING_FACTOR = 0.7;
export const TRUST_MAX_DEPTH = 3;            // Limit propagation to 3 hops
export const TRUST_CONVERGENCE_THRESHOLD = 0.01;
export const TRUST_MAX_ITERATIONS = 10;

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
