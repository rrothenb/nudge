/**
 * Provenance Chain Tests
 *
 * Tests for bot vouching and provenance chain functionality:
 * effective_trust = min(trust_in_bot, trust_in_source)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeAssertionTrustWithProvenance } from './engine';
import type { Assertion } from '@nudge/shared';

// Mock the database function
vi.mock('../db/trust', () => ({
  getAllUsersTrust: vi.fn(),
}));

import { getAllUsersTrust } from '../db/trust';

describe('Provenance Chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('computeAssertionTrustWithProvenance', () => {
    it('should return assertion trust when not imported', async () => {
      // Mock user trust data - user1 has explicit trust for the assertion
      vi.mocked(getAllUsersTrust).mockResolvedValue(
        new Map([
          [
            'user1',
            [
              {
                userId: 'user1',
                targetId: 'assertion1',
                targetType: 'assertion',
                trustValue: 0.8,
                isDirectTrust: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          ],
        ])
      );

      const assertion: Assertion = {
        assertionId: 'assertion1',
        content: 'Test assertion',
        sourceId: 'user_source',
        sourceType: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        // No importedBy field
      };

      const result = await computeAssertionTrustWithProvenance('user1', assertion);

      expect(result.assertionTrust).toBe(0.8);
      expect(result.effectiveTrust).toBe(0.8);
      expect(result.sourceTrust).toBeUndefined();
      expect(result.importBotTrust).toBeUndefined();
    });

    it('should apply provenance chain: min(bot_trust, source_trust)', async () => {
      // Mock user trust data
      vi.mocked(getAllUsersTrust).mockResolvedValue(
        new Map([
          [
            'user1',
            [
              {
                userId: 'user1',
                targetId: 'IMPORT_BOT_NEWS',
                targetType: 'bot',
                trustValue: 0.9,
                isDirectTrust: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                userId: 'user1',
                targetId: 'REUTERS',
                targetType: 'source',
                trustValue: 0.6,
                isDirectTrust: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                userId: 'user1',
                targetId: 'assertion1',
                targetType: 'assertion',
                trustValue: 0.7,
                isDirectTrust: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          ],
        ])
      );

      const assertion: Assertion = {
        assertionId: 'assertion1',
        content: 'News article content',
        sourceId: 'REUTERS',
        sourceType: 'source',
        importedBy: 'IMPORT_BOT_NEWS',
        originalUrl: 'https://reuters.com/article/123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await computeAssertionTrustWithProvenance('user1', assertion);

      // Effective trust should be min(assertion_trust, min(bot_trust, source_trust))
      expect(result.assertionTrust).toBeCloseTo(0.7, 1);
      expect(result.importBotTrust).toBeCloseTo(0.9, 1);
      expect(result.sourceTrust).toBeCloseTo(0.6, 1);
      // min(0.7, min(0.9, 0.6)) = min(0.7, 0.6) = 0.6
      expect(result.effectiveTrust).toBeCloseTo(0.6, 1);
    });

    it('should limit trust when bot is untrusted but source is trusted', async () => {
      // Scenario: User trusts Reuters but not the import bot
      vi.mocked(getAllUsersTrust).mockResolvedValue(
        new Map([
          [
            'user1',
            [
              {
                userId: 'user1',
                targetId: 'IMPORT_BOT_NEWS',
                targetType: 'bot',
                trustValue: 0.3,
                isDirectTrust: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                userId: 'user1',
                targetId: 'REUTERS',
                targetType: 'source',
                trustValue: 0.9,
                isDirectTrust: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                userId: 'user1',
                targetId: 'assertion1',
                targetType: 'assertion',
                trustValue: 0.8,
                isDirectTrust: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          ],
        ])
      );

      const assertion: Assertion = {
        assertionId: 'assertion1',
        content: 'News from trusted source via untrusted bot',
        sourceId: 'REUTERS',
        sourceType: 'source',
        importedBy: 'IMPORT_BOT_NEWS',
        originalUrl: 'https://reuters.com/article/123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await computeAssertionTrustWithProvenance('user1', assertion);

      // Effective trust should be limited by bot trust
      expect(result.assertionTrust).toBeCloseTo(0.8, 1);
      expect(result.importBotTrust).toBeCloseTo(0.3, 1);
      expect(result.sourceTrust).toBeCloseTo(0.9, 1);
      // min(0.8, min(0.3, 0.9)) = min(0.8, 0.3) = 0.3
      expect(result.effectiveTrust).toBeCloseTo(0.3, 1);
    });

    it('should limit trust when source is untrusted but bot is trusted', async () => {
      // Scenario: User trusts the import bot but not the source
      vi.mocked(getAllUsersTrust).mockResolvedValue(
        new Map([
          [
            'user1',
            [
              {
                userId: 'user1',
                targetId: 'IMPORT_BOT_NEWS',
                targetType: 'bot',
                trustValue: 0.9,
                isDirectTrust: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                userId: 'user1',
                targetId: 'SKETCHY_NEWS',
                targetType: 'source',
                trustValue: 0.2,
                isDirectTrust: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                userId: 'user1',
                targetId: 'assertion1',
                targetType: 'assertion',
                trustValue: 0.7,
                isDirectTrust: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          ],
        ])
      );

      const assertion: Assertion = {
        assertionId: 'assertion1',
        content: 'News from untrusted source via trusted bot',
        sourceId: 'SKETCHY_NEWS',
        sourceType: 'source',
        importedBy: 'IMPORT_BOT_NEWS',
        originalUrl: 'https://sketchynews.com/article/456',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await computeAssertionTrustWithProvenance('user1', assertion);

      // Effective trust should be limited by source trust
      expect(result.assertionTrust).toBeCloseTo(0.7, 1);
      expect(result.importBotTrust).toBeCloseTo(0.9, 1);
      expect(result.sourceTrust).toBeCloseTo(0.2, 1);
      // min(0.7, min(0.9, 0.2)) = min(0.7, 0.2) = 0.2
      expect(result.effectiveTrust).toBeCloseTo(0.2, 1);
    });

    it('should use entity defaults when user has no explicit trust', async () => {
      // User has no opinions set - empty vectors
      vi.mocked(getAllUsersTrust).mockResolvedValue(new Map());

      const assertion: Assertion = {
        assertionId: 'assertion1',
        content: 'News from well-known source',
        sourceId: 'REUTERS', // Well-known source → default 0.5
        sourceType: 'source',
        importedBy: 'IMPORT_BOT_NEWS', // Official bot → default 0.5
        originalUrl: 'https://reuters.com/article/123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await computeAssertionTrustWithProvenance('user1', assertion);

      // All should use entity defaults:
      // - assertion: 0.0 (unknown)
      // - REUTERS: 0.5 (well-known source)
      // - IMPORT_BOT_NEWS: 0.5 (official bot)
      // Effective = min(0.0, min(0.5, 0.5)) = 0.0
      expect(result.effectiveTrust).toBe(0.0);
    });

    it('should handle unknown bot and source with 0.0 defaults', async () => {
      // User has no opinions set
      vi.mocked(getAllUsersTrust).mockResolvedValue(new Map());

      const assertion: Assertion = {
        assertionId: 'assertion1',
        content: 'News from unknown source',
        sourceId: 'UNKNOWN_SOURCE', // Unknown → default 0.0
        sourceType: 'source',
        importedBy: 'UNKNOWN_BOT', // Unknown → default 0.0
        originalUrl: 'https://unknown.com/article/789',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await computeAssertionTrustWithProvenance('user1', assertion);

      // All default to 0.0
      expect(result.effectiveTrust).toBe(0.0);
    });
  });

  describe('Provenance chain integration scenarios', () => {
    it('should prevent fake attribution attacks', async () => {
      // Attacker creates fake bot claiming to import from Reuters
      // User trusts Reuters but hasn't set trust for the fake bot
      vi.mocked(getAllUsersTrust).mockResolvedValue(
        new Map([
          [
            'user1',
            [
              {
                userId: 'user1',
                targetId: 'REUTERS',
                targetType: 'source',
                trustValue: 0.9,
                isDirectTrust: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                userId: 'user1',
                targetId: 'assertion1',
                targetType: 'assertion',
                trustValue: 0.7,
                isDirectTrust: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              // No trust for FAKE_BOT (defaults to 0.0)
            ],
          ],
        ])
      );

      const assertion: Assertion = {
        assertionId: 'assertion1',
        content: 'Fake news claiming to be from Reuters',
        sourceId: 'REUTERS',
        sourceType: 'source',
        importedBy: 'FAKE_BOT', // Fake bot → default 0.0 trust
        originalUrl: 'https://reuters.com/article/fake',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await computeAssertionTrustWithProvenance('user1', assertion);

      // Effective trust limited by bot trust (0.0)
      expect(result.sourceTrust).toBeCloseTo(0.9, 1);
      expect(result.importBotTrust).toBe(0.0); // Unknown bot default
      // min(0.7, min(0.0, 0.9)) = min(0.7, 0.0) = 0.0
      expect(result.effectiveTrust).toBe(0.0);
    });

    it('should allow users to trust sources while distrusting import mechanisms', async () => {
      // User trusts Wikipedia as a source but distrusts automated imports
      vi.mocked(getAllUsersTrust).mockResolvedValue(
        new Map([
          [
            'user1',
            [
              {
                userId: 'user1',
                targetId: 'WIKIPEDIA',
                targetType: 'source',
                trustValue: 0.95,
                isDirectTrust: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                userId: 'user1',
                targetId: 'IMPORT_BOT_WIKIPEDIA',
                targetType: 'bot',
                trustValue: 0.4,
                isDirectTrust: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                userId: 'user1',
                targetId: 'assertion1',
                targetType: 'assertion',
                trustValue: 0.8,
                isDirectTrust: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          ],
        ])
      );

      const assertion: Assertion = {
        assertionId: 'assertion1',
        content: 'Wikipedia fact extracted by bot',
        sourceId: 'WIKIPEDIA',
        sourceType: 'source',
        importedBy: 'IMPORT_BOT_WIKIPEDIA',
        originalUrl: 'https://en.wikipedia.org/wiki/Example',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await computeAssertionTrustWithProvenance('user1', assertion);

      // Trust limited by skepticism of bot extraction
      expect(result.assertionTrust).toBeCloseTo(0.8, 1);
      expect(result.sourceTrust).toBeCloseTo(0.95, 1);
      expect(result.importBotTrust).toBeCloseTo(0.4, 1);
      // min(0.8, min(0.4, 0.95)) = min(0.8, 0.4) = 0.4
      expect(result.effectiveTrust).toBeCloseTo(0.4, 1);
    });
  });
});
