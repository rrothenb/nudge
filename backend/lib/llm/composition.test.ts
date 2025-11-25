/**
 * Composition Pipeline Tests
 *
 * Tests for phrasing selection, conflict detection, and anti-hallucination
 * validation in the article composition pipeline.
 */
import { describe, it, expect } from 'vitest';
import {
  selectBestPhrasing,
  selectBestPhrasings,
  detectConflicts,
  formatAssertionsForPrompt,
  validateNoHallucination,
  type AssertionWithPhrasing,
} from './composition';
import type { Assertion, AssertionRelationship } from '@nudge/shared';

describe('Composition Pipeline', () => {
  describe('selectBestPhrasing', () => {
    it('should use original phrasing when no equivalences exist', async () => {
      const assertion: Assertion = {
        assertionId: 'a1',
        content: 'The sky is blue',
        sourceId: 'source1',
        sourceType: 'source',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allAssertions = new Map([['a1', assertion]]);
      const userTrustValues = new Map([['source1', 0.8]]);

      const result = await selectBestPhrasing(assertion, allAssertions, userTrustValues);

      expect(result.content).toBe('The sky is blue');
      expect(result.sourceId).toBe('source1');
      expect(result.phrasingSources).toHaveLength(1);
      expect(result.phrasingSources[0].isOriginal).toBe(true);
    });

    it('should use higher-trusted editorial phrasing when available', async () => {
      const original: Assertion = {
        assertionId: 'a1',
        content: 'The atmosphere appears blue',
        sourceId: 'source1',
        sourceType: 'source',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const editorial: Assertion = {
        assertionId: 'a2',
        content: 'The sky is blue due to Rayleigh scattering',
        sourceId: 'trusted_editor',
        sourceType: 'bot',
        createdAt: new Date(),
        updatedAt: new Date(),
        relationships: [
          {
            type: 'equivalent_to',
            targetId: 'a1',
            confidence: 0.9,
          },
        ],
      };

      const allAssertions = new Map([
        ['a1', original],
        ['a2', editorial],
      ]);
      const userTrustValues = new Map([
        ['source1', 0.7],
        ['trusted_editor', 0.95], // Higher trust in editor
      ]);

      const result = await selectBestPhrasing(original, allAssertions, userTrustValues);

      expect(result.content).toBe('The sky is blue due to Rayleigh scattering');
      expect(result.sourceId).toBe('trusted_editor');
      expect(result.phrasingSources).toHaveLength(2);
    });

    it('should keep original phrasing when editor has lower trust', async () => {
      const original: Assertion = {
        assertionId: 'a1',
        content: 'The atmosphere appears blue',
        sourceId: 'trusted_source',
        sourceType: 'source',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const editorial: Assertion = {
        assertionId: 'a2',
        content: 'The sky is blue due to Rayleigh scattering',
        sourceId: 'untrusted_editor',
        sourceType: 'bot',
        createdAt: new Date(),
        updatedAt: new Date(),
        relationships: [
          {
            type: 'equivalent_to',
            targetId: 'a1',
            confidence: 0.9,
          },
        ],
      };

      const allAssertions = new Map([
        ['a1', original],
        ['a2', editorial],
      ]);
      const userTrustValues = new Map([
        ['trusted_source', 0.95], // Higher trust in original
        ['untrusted_editor', 0.6],
      ]);

      const result = await selectBestPhrasing(original, allAssertions, userTrustValues);

      expect(result.content).toBe('The atmosphere appears blue');
      expect(result.sourceId).toBe('trusted_source');
    });

    it('should not use editorial phrasing when confidence is too low', async () => {
      const original: Assertion = {
        assertionId: 'a1',
        content: 'The atmosphere appears blue',
        sourceId: 'source1',
        sourceType: 'source',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const editorial: Assertion = {
        assertionId: 'a2',
        content: 'The sky is blue',
        sourceId: 'editor',
        sourceType: 'bot',
        createdAt: new Date(),
        updatedAt: new Date(),
        relationships: [
          {
            type: 'equivalent_to',
            targetId: 'a1',
            confidence: 0.5, // Low confidence
          },
        ],
      };

      const allAssertions = new Map([
        ['a1', original],
        ['a2', editorial],
      ]);
      const userTrustValues = new Map([
        ['source1', 0.7],
        ['editor', 0.9], // Higher trust but low confidence
      ]);

      const result = await selectBestPhrasing(original, allAssertions, userTrustValues);

      // Should keep original due to low equivalence confidence
      expect(result.content).toBe('The atmosphere appears blue');
      expect(result.sourceId).toBe('source1');
    });

    it('should choose highest-trusted phrasing among multiple editors', async () => {
      const original: Assertion = {
        assertionId: 'a1',
        content: 'Sky is blue',
        sourceId: 'source1',
        sourceType: 'source',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const editor1: Assertion = {
        assertionId: 'a2',
        content: 'The sky appears blue',
        sourceId: 'editor1',
        sourceType: 'bot',
        createdAt: new Date(),
        updatedAt: new Date(),
        relationships: [{ type: 'equivalent_to', targetId: 'a1', confidence: 0.9 }],
      };

      const editor2: Assertion = {
        assertionId: 'a3',
        content: 'The sky is blue due to Rayleigh scattering',
        sourceId: 'editor2',
        sourceType: 'bot',
        createdAt: new Date(),
        updatedAt: new Date(),
        relationships: [{ type: 'equivalent_to', targetId: 'a1', confidence: 0.95 }],
      };

      const allAssertions = new Map([
        ['a1', original],
        ['a2', editor1],
        ['a3', editor2],
      ]);
      const userTrustValues = new Map([
        ['source1', 0.6],
        ['editor1', 0.8],
        ['editor2', 0.95], // Highest trust
      ]);

      const result = await selectBestPhrasing(original, allAssertions, userTrustValues);

      expect(result.content).toBe('The sky is blue due to Rayleigh scattering');
      expect(result.sourceId).toBe('editor2');
      expect(result.phrasingSources).toHaveLength(3);
    });
  });

  describe('selectBestPhrasings (batch)', () => {
    it('should process multiple assertions efficiently', async () => {
      const assertions: Assertion[] = [
        {
          assertionId: 'a1',
          content: 'Fact 1',
          sourceId: 'source1',
          sourceType: 'source',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          assertionId: 'a2',
          content: 'Fact 2',
          sourceId: 'source2',
          sourceType: 'source',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const userTrustValues = new Map([
        ['source1', 0.8],
        ['source2', 0.9],
      ]);

      const results = await selectBestPhrasings(assertions, userTrustValues);

      expect(results).toHaveLength(2);
      expect(results[0].assertionId).toBe('a1');
      expect(results[1].assertionId).toBe('a2');
    });
  });

  describe('formatAssertionsForPrompt', () => {
    it('should format assertions for LLM prompt', () => {
      const assertions: AssertionWithPhrasing[] = [
        {
          assertionId: 'a1',
          content: 'The sky is blue',
          sourceId: 'source1',
          sourceType: 'source',
          phrasingSources: [
            { assertionId: 'a1', sourceId: 'source1', sourceTrust: 0.8, isOriginal: true },
          ],
        },
        {
          assertionId: 'a2',
          content: 'Water is wet',
          sourceId: 'source2',
          sourceType: 'source',
          importedBy: 'import_bot',
          phrasingSources: [
            { assertionId: 'a2', sourceId: 'source2', sourceTrust: 0.9, isOriginal: true },
          ],
        },
      ];

      const formatted = formatAssertionsForPrompt(assertions, []);

      expect(formatted).toContain('The sky is blue');
      expect(formatted).toContain('Water is wet');
      expect(formatted).toContain('Source: source1');
      expect(formatted).toContain('Source: source2');
      expect(formatted).toContain('imported by import_bot');
    });

    it('should mark conflicts in formatted output', () => {
      const assertions: AssertionWithPhrasing[] = [
        {
          assertionId: 'a1',
          content: 'The sky is blue',
          sourceId: 'source1',
          sourceType: 'source',
          phrasingSources: [
            { assertionId: 'a1', sourceId: 'source1', sourceTrust: 0.8, isOriginal: true },
          ],
        },
        {
          assertionId: 'a2',
          content: 'The sky is green',
          sourceId: 'source2',
          sourceType: 'source',
          phrasingSources: [
            { assertionId: 'a2', sourceId: 'source2', sourceTrust: 0.7, isOriginal: true },
          ],
        },
      ];

      const conflicts = [
        {
          assertion1: assertions[0],
          assertion2: assertions[1],
          conflictType: 'contradicts' as const,
          confidence: 0.9,
        },
      ];

      const formatted = formatAssertionsForPrompt(assertions, conflicts);

      expect(formatted).toContain('[CONFLICT');
      expect(formatted).toContain('CONFLICTING PERSPECTIVES');
      expect(formatted).toContain('The sky is blue');
      expect(formatted).toContain('The sky is green');
    });

    it('should include phrasing metadata when requested', () => {
      const assertions: AssertionWithPhrasing[] = [
        {
          assertionId: 'a1',
          content: 'The sky is blue',
          sourceId: 'editor1',
          sourceType: 'bot',
          phrasingSources: [
            { assertionId: 'a0', sourceId: 'original', sourceTrust: 0.6, isOriginal: true },
            { assertionId: 'a1', sourceId: 'editor1', sourceTrust: 0.9, isOriginal: false },
          ],
        },
      ];

      const formatted = formatAssertionsForPrompt(assertions, [], true);

      expect(formatted).toContain('[Phrasing by editor1]');
    });
  });

  describe('validateNoHallucination', () => {
    it('should pass validation when numbers match', () => {
      const assertions: AssertionWithPhrasing[] = [
        {
          assertionId: 'a1',
          content: 'The temperature reached 72 degrees',
          sourceId: 'source1',
          sourceType: 'source',
          phrasingSources: [],
        },
        {
          assertionId: 'a2',
          content: 'Population grew by 15%',
          sourceId: 'source2',
          sourceType: 'source',
          phrasingSources: [],
        },
      ];

      const generated = 'The temperature reached 72 degrees yesterday. Population grew by 15%.';

      const result = validateNoHallucination(generated, assertions);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when generated content includes new numbers', () => {
      const assertions: AssertionWithPhrasing[] = [
        {
          assertionId: 'a1',
          content: 'The sky is blue',
          sourceId: 'source1',
          sourceType: 'source',
          phrasingSources: [],
        },
      ];

      const generated = 'The sky is blue. Scientists measured this at 450 nanometers wavelength.';

      const result = validateNoHallucination(generated, assertions);

      expect(result.isValid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('450');
    });

    it('should warn when generated content includes new proper nouns', () => {
      const assertions: AssertionWithPhrasing[] = [
        {
          assertionId: 'a1',
          content: 'The research was conducted',
          sourceId: 'source1',
          sourceType: 'source',
          phrasingSources: [],
        },
      ];

      const generated = 'The research was conducted by Dr. John Smith at Stanford University.';

      const result = validateNoHallucination(generated, assertions);

      expect(result.isValid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should allow proper nouns that appear in assertions', () => {
      const assertions: AssertionWithPhrasing[] = [
        {
          assertionId: 'a1',
          content: 'Dr. John Smith conducted research at Stanford University',
          sourceId: 'source1',
          sourceType: 'source',
          phrasingSources: [],
        },
      ];

      const generated = 'Dr. John Smith conducted important research at Stanford University.';

      const result = validateNoHallucination(generated, assertions);

      expect(result.isValid).toBe(true);
    });

    it('should handle empty assertions', () => {
      const assertions: AssertionWithPhrasing[] = [];
      const generated = 'Some generated content with 123 numbers and Names.';

      const result = validateNoHallucination(generated, assertions);

      expect(result.isValid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Editorial improvements workflow', () => {
    it('should support composition bot improving phrasings', async () => {
      // Original assertion from news import
      const original: Assertion = {
        assertionId: 'a1',
        content: 'climate change bad',
        sourceId: 'NEWS_ARTICLE',
        sourceType: 'source',
        importedBy: 'IMPORT_BOT_NEWS',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Composition bot creates improved phrasing
      const improved: Assertion = {
        assertionId: 'a2',
        content: 'Climate change poses significant environmental risks',
        sourceId: 'COMPOSITION_BOT',
        sourceType: 'bot',
        createdAt: new Date(),
        updatedAt: new Date(),
        relationships: [
          {
            type: 'equivalent_to',
            targetId: 'a1',
            confidence: 0.95,
          },
        ],
      };

      const allAssertions = new Map([
        ['a1', original],
        ['a2', improved],
      ]);

      // User who trusts composition bot
      const userTrustValues = new Map([
        ['NEWS_ARTICLE', 0.7],
        ['COMPOSITION_BOT', 0.9],
      ]);

      const result = await selectBestPhrasing(original, allAssertions, userTrustValues);

      expect(result.content).toBe('Climate change poses significant environmental risks');
      expect(result.sourceId).toBe('COMPOSITION_BOT');
    });

    it('should support translator bot creating equivalences', async () => {
      // Original French assertion
      const french: Assertion = {
        assertionId: 'a1',
        content: 'Le ciel est bleu',
        sourceId: 'FR_SOURCE',
        sourceType: 'source',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Translation bot creates English equivalent
      const english: Assertion = {
        assertionId: 'a2',
        content: 'The sky is blue',
        sourceId: 'TRANSLATOR_BOT',
        sourceType: 'bot',
        createdAt: new Date(),
        updatedAt: new Date(),
        relationships: [
          {
            type: 'equivalent_to',
            targetId: 'a1',
            confidence: 0.99,
          },
        ],
      };

      const allAssertions = new Map([
        ['a1', french],
        ['a2', english],
      ]);

      // User trusts translator
      const userTrustValues = new Map([
        ['FR_SOURCE', 0.8],
        ['TRANSLATOR_BOT', 0.95],
      ]);

      const result = await selectBestPhrasing(french, allAssertions, userTrustValues);

      expect(result.content).toBe('The sky is blue');
      expect(result.sourceId).toBe('TRANSLATOR_BOT');
    });
  });
});
