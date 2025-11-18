/**
 * Shared types and utilities for trust platform
 * Used by both frontend and backend
 */

// Types
export * from './types/assertion';
export * from './types/trust';
export * from './types/user';
export * from './types/content';
export * from './types/import';

// Constants
export * from './constants/defaults';
export * from './constants/config';

// Validators (schemas only, not inferred types)
export { createAssertionSchema, assertionTypeSchema } from './validators/assertion';
export { setTrustSchema } from './validators/trust';
export { updateProfileSchema } from './validators/user';
