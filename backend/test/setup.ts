/**
 * Test setup - runs before all tests
 */
import { beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  // Set environment variables for tests
  process.env.AWS_REGION = 'us-east-1';
  process.env.USERS_TABLE = 'test-users-table';
  process.env.ASSERTIONS_TABLE = 'test-assertions-table';
  process.env.TRUST_TABLE = 'test-trust-table';
  process.env.CACHE_TABLE = 'test-cache-table';
  process.env.IMPORT_JOBS_TABLE = 'test-jobs-table';
  process.env.CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || 'test-api-key';
});

afterAll(() => {
  // Cleanup
});
