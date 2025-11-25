/**
 * Entity-type-specific default trust values
 *
 * These defaults are used when:
 * 1. A user has not explicitly set trust for an entity
 * 2. Trust inference cannot determine a value (insufficient similar users)
 *
 * Security-critical: Default 0.0 for unknown users prevents Sybil attacks
 */

// Official import bots that vouch for content attribution
export const OFFICIAL_IMPORT_BOTS = [
  "IMPORT_BOT_NEWS",
  "IMPORT_BOT_WIKIPEDIA",
  "IMPORT_BOT_ACADEMIC",
  "IMPORT_BOT_SOCIAL",
] as const;

// Official composition/editorial bots
export const OFFICIAL_COMPOSITION_BOTS = [
  "COMPOSITION_BOT",
  "TRANSLATION_BOT_ES",
  "TRANSLATION_BOT_FR",
  "SIMPLIFICATION_BOT",
] as const;

// All official bots (combination of import and composition)
export const OFFICIAL_BOTS = [
  ...OFFICIAL_IMPORT_BOTS,
  ...OFFICIAL_COMPOSITION_BOTS,
] as const;

// Well-known sources that get elevated default trust for bootstrapping
export const WELL_KNOWN_SOURCES = [
  // News agencies
  "REUTERS",
  "ASSOCIATED_PRESS",
  "AFP",

  // Reference sources
  "WIKIPEDIA",
  "BRITANNICA",

  // Scientific
  "NATURE",
  "SCIENCE_MAG",
  "PUBMED",

  // Government (examples - expand as needed)
  "CDC",
  "WHO",
  "NASA",
] as const;

/**
 * Get the default trust value for an entity based on its type and identity
 *
 * @param entityId - The ID of the entity (userId, sourceId, botId, etc.)
 * @param entityType - The type of entity ('user', 'source', 'bot', 'assertion', 'group')
 * @param currentUserId - The ID of the current user (optional, for self-trust)
 * @returns Default trust value between 0.0 and 1.0
 */
export function getDefaultTrust(
  entityId: string,
  entityType: 'user' | 'source' | 'bot' | 'assertion' | 'group',
  currentUserId?: string
): number {
  // Users always trust themselves
  if (entityType === 'user' && currentUserId && entityId === currentUserId) {
    return 1.0;
  }

  // Official bots get semi-trust for their curation role
  if (entityType === 'bot' && OFFICIAL_BOTS.includes(entityId as any)) {
    return 0.5;
  }

  // Well-known sources get semi-trust for bootstrapping new users
  if (entityType === 'source' && WELL_KNOWN_SOURCES.includes(entityId as any)) {
    return 0.5;
  }

  // Unknown users default to 0.0 (security-critical for Sybil resistance)
  if (entityType === 'user') {
    return 0.0;
  }

  // All other entities default to 0.0 (must earn trust)
  return 0.0;
}

/**
 * Check if an entity is an official bot
 */
export function isOfficialBot(entityId: string): boolean {
  return OFFICIAL_BOTS.includes(entityId as any);
}

/**
 * Check if an entity is a well-known source
 */
export function isWellKnownSource(entityId: string): boolean {
  return WELL_KNOWN_SOURCES.includes(entityId as any);
}

/**
 * Legacy constant for backwards compatibility during migration
 * @deprecated Use getDefaultTrust() instead
 */
export const DEFAULT_TRUST_VALUE_LEGACY = 0.5;
