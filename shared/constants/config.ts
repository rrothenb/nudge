/**
 * Configuration constants
 */

// AWS DynamoDB table names (overridden by environment variables)
export const TABLES = {
  USERS: process.env.USERS_TABLE || 'trust-platform-users-dev',
  ASSERTIONS: process.env.ASSERTIONS_TABLE || 'trust-platform-assertions-dev',
  TRUST: process.env.TRUST_TABLE || 'trust-platform-trust-dev',
  CACHE: process.env.CACHE_TABLE || 'trust-platform-cache-dev',
  JOBS: process.env.JOBS_TABLE || 'trust-platform-jobs-dev',
};

// Known source mappings
export const SOURCE_MAPPINGS: Record<string, string> = {
  'en.wikipedia.org': 'WIKIPEDIA',
  'rss.nytimes.com': 'NYT',
  'nytimes.com': 'NYT',
  'feeds.bbci.co.uk': 'BBC',
  'bbc.com': 'BBC',
  'washingtonpost.com': 'WAPO',
  'theguardian.com': 'GUARDIAN',
  'npr.org': 'NPR',
  'reuters.com': 'REUTERS',
  'apnews.com': 'AP',
};

// API configuration
export const API_CONFIG = {
  CLAUDE_API_KEY_SECRET: process.env.CLAUDE_API_KEY_SECRET || 'trust-platform-claude-api-key-dev',
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,  // For local development
};
