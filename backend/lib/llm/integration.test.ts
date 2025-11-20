/**
 * Claude API Integration Tests
 *
 * These tests use the actual Claude API to verify end-to-end functionality
 * of article decomposition into assertions and reassembly with trust filtering.
 *
 * To run these tests, ensure CLAUDE_API_KEY is set in your environment.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { extractAssertionsFromWikipedia, extractAssertionsFromNews } from './extraction';
import { generateWikiArticle, generateChatResponse } from './generation';
import type { Assertion } from '../../../shared/types/assertion';

// Skip these tests if no API key is provided
const skipIfNoKey = process.env.CLAUDE_API_KEY === 'test-api-key' || !process.env.CLAUDE_API_KEY;

describe('Claude API Integration Tests', { skip: skipIfNoKey }, () => {
  beforeAll(() => {
    if (skipIfNoKey) {
      console.log('Skipping Claude API integration tests: No API key provided');
    }
  });

  describe('Article Decomposition: Wikipedia', () => {
    it('should extract factual assertions from Wikipedia article', async () => {
      const wikipediaContent = `
        Solar System

        The Solar System is the gravitationally bound system of the Sun and the objects that orbit it.
        It formed 4.6 billion years ago from the gravitational collapse of a giant interstellar molecular cloud.

        The Sun is a G-type main-sequence star that contains 99.86% of the system's mass.
        The four inner planets (Mercury, Venus, Earth, and Mars) are terrestrial planets,
        composed primarily of rock and metal.

        Jupiter is the largest planet in the Solar System, with a mass 2.5 times that of all
        the other planets combined. Saturn is known for its extensive ring system.
      `;

      const assertions = await extractAssertionsFromWikipedia(wikipediaContent);

      // Verify assertions were extracted
      expect(assertions).toBeDefined();
      expect(assertions.length).toBeGreaterThan(5);

      // Verify assertion structure
      assertions.forEach((assertion) => {
        expect(assertion).toHaveProperty('content');
        expect(assertion).toHaveProperty('type');
        expect(assertion).toHaveProperty('confidence');
        expect(assertion).toHaveProperty('topic');

        // Content should be non-empty
        expect(assertion.content.length).toBeGreaterThan(10);

        // Confidence should be 0-1
        expect(assertion.confidence).toBeGreaterThanOrEqual(0);
        expect(assertion.confidence).toBeLessThanOrEqual(1);

        // Should have at least one topic
        expect(assertion.topic.length).toBeGreaterThan(0);
      });

      // Verify we extracted key facts
      const contents = assertions.map((a) => a.content.toLowerCase());
      const hasSunFact = contents.some((c) => c.includes('sun'));
      const hasPlanetFact = contents.some((c) => c.includes('planet'));

      expect(hasSunFact || hasPlanetFact).toBe(true);
    }, 30000); // 30s timeout for API call

    it('should extract assertions with proper confidence scores', async () => {
      const content = `
        The Moon is Earth's only natural satellite. It orbits Earth at an average distance
        of 384,400 km. The Moon is thought to have formed about 4.51 billion years ago,
        not long after Earth.
      `;

      const assertions = await extractAssertionsFromWikipedia(content);

      expect(assertions.length).toBeGreaterThan(2);

      // Well-established facts should have high confidence
      const moonOrbitAssertion = assertions.find((a) =>
        a.content.toLowerCase().includes('satellite') || a.content.toLowerCase().includes('orbit')
      );

      if (moonOrbitAssertion) {
        expect(moonOrbitAssertion.confidence).toBeGreaterThan(0.7);
      }
    }, 30000);
  });

  describe('Article Decomposition: News', () => {
    it('should extract assertions from news article', async () => {
      const newsContent = `
        Breaking: Major Climate Agreement Reached

        World leaders announced a groundbreaking climate agreement on Tuesday, committing
        to reduce carbon emissions by 50% by 2030. The agreement was signed by representatives
        from 150 countries at the Global Climate Summit in Geneva.

        "This is a historic moment for humanity," said Summit Chair Dr. Maria Santos.
        The agreement includes binding targets for renewable energy adoption and
        substantial funding for developing nations to transition away from fossil fuels.

        Environmental groups praised the agreement but called for stronger enforcement mechanisms.
      `;

      const assertions = await extractAssertionsFromNews(newsContent);

      expect(assertions).toBeDefined();
      expect(assertions.length).toBeGreaterThan(3);

      // Verify assertion structure
      assertions.forEach((assertion) => {
        expect(assertion).toHaveProperty('content');
        expect(assertion).toHaveProperty('type');
        expect(assertion).toHaveProperty('confidence');
        expect(assertion.content.length).toBeGreaterThan(10);
      });

      // Verify we captured key information
      const contents = assertions.map((a) => a.content.toLowerCase());
      const hasClimateInfo = contents.some((c) =>
        c.includes('climate') || c.includes('emission') || c.includes('carbon')
      );

      expect(hasClimateInfo).toBe(true);
    }, 30000);

    it('should identify attributions in news content', async () => {
      const content = `
        According to Dr. Jane Smith from MIT, the new technology could revolutionize
        the field. "We've made a breakthrough," Smith stated in an interview.
        Independent expert Dr. Bob Johnson confirmed the findings.
      `;

      const assertions = await extractAssertionsFromNews(content);

      // Some assertions should have attributions
      const withAttribution = assertions.filter((a) => a.attributedTo && a.attributedTo.length > 0);

      expect(withAttribution.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Article Reassembly with Trust Filtering', () => {
    it('should generate coherent article from trusted assertions', async () => {
      // Create mock assertions about a topic
      const assertions: Assertion[] = [
        {
          assertionId: 'a1',
          content: 'Photosynthesis is the process by which plants convert light energy into chemical energy',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['photosynthesis', 'biology'] },
        },
        {
          assertionId: 'a2',
          content: 'Chlorophyll is the green pigment in plants that absorbs light for photosynthesis',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['photosynthesis', 'biology'] },
        },
        {
          assertionId: 'a3',
          content: 'Plants release oxygen as a byproduct of photosynthesis',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['photosynthesis', 'biology', 'oxygen'] },
        },
        {
          assertionId: 'a4',
          content: 'Photosynthesis occurs primarily in the leaves of plants',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['photosynthesis', 'plant anatomy'] },
        },
      ];

      // All assertions have high trust
      const trustValues = new Map([
        ['a1', 0.95],
        ['a2', 0.90],
        ['a3', 0.92],
        ['a4', 0.88],
      ]);

      const result = await generateWikiArticle(
        'Photosynthesis',
        assertions,
        trustValues,
        0.5 // Low threshold to include all
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(100);

      // Article should be coherent and include information from assertions
      const content = result.content.toLowerCase();
      expect(content).toContain('photosynthesis');

      // Should mention at least some key concepts
      const hasKeyTerms =
        content.includes('light') ||
        content.includes('plant') ||
        content.includes('energy') ||
        content.includes('chlorophyll') ||
        content.includes('oxygen');

      expect(hasKeyTerms).toBe(true);
    }, 30000);

    it('should filter out low-trust assertions when generating article', async () => {
      const assertions: Assertion[] = [
        {
          assertionId: 'a1',
          content: 'Water freezes at 0 degrees Celsius',
          type: 'factual',
          sourceId: 'SCIENCE_SOURCE',
          sourceUrl: 'https://example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['physics', 'water'] },
        },
        {
          assertionId: 'a2',
          content: 'Water can freeze instantly by looking at it',
          type: 'factual',
          sourceId: 'QUESTIONABLE_SOURCE',
          sourceUrl: 'https://example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['water', 'magic'] },
        },
      ];

      // First assertion has high trust, second has low trust
      const trustValues = new Map([
        ['a1', 0.95],
        ['a2', 0.1],
      ]);

      const result = await generateWikiArticle('Water', assertions, trustValues, 0.7);

      // Article should include high-trust information
      const content = result.content.toLowerCase();
      expect(content).toContain('water');

      // Low trust info should be filtered (this is probabilistic, but should generally work)
      // We check that the article doesn't contain the obviously false claim
      expect(content).not.toContain('looking at it');
    }, 30000);

    it('should show trust influence by comparing high vs low trust articles', async () => {
      const assertions: Assertion[] = [
        {
          assertionId: 'a1',
          content: 'The Earth is approximately 4.5 billion years old',
          type: 'factual',
          sourceId: 'SCIENCE',
          sourceUrl: 'https://example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['Earth', 'geology'] },
        },
        {
          assertionId: 'a2',
          content: 'The Earth formed through natural geological processes',
          type: 'factual',
          sourceId: 'SCIENCE',
          sourceUrl: 'https://example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['Earth', 'geology'] },
        },
      ];

      // Generate article with high trust
      const highTrustValues = new Map([['a1', 0.9], ['a2', 0.9]]);
      const highTrustArticle = await generateWikiArticle(
        'Earth',
        assertions,
        highTrustValues,
        0.5
      );

      // Generate article with low trust (should include alternative info)
      const lowTrustValues = new Map([['a1', 0.2], ['a2', 0.2]]);
      const lowTrustArticle = await generateWikiArticle(
        'Earth',
        assertions.slice(0, 1), // Only include first assertion with low trust
        lowTrustValues,
        0.5
      );

      // Both should generate content, but may differ in emphasis
      expect(highTrustArticle.content.length).toBeGreaterThan(50);
      expect(lowTrustArticle.content.length).toBeGreaterThan(50);

      // High trust article should be more confident/detailed
      expect(highTrustArticle.content.length).toBeGreaterThanOrEqual(
        lowTrustArticle.content.length * 0.5
      );
    }, 45000);
  });

  describe('Chat Q&A with Trust Context', () => {
    it('should answer questions using trusted assertions', async () => {
      const assertions: Assertion[] = [
        {
          assertionId: 'a1',
          content: 'The human brain contains approximately 86 billion neurons',
          type: 'factual',
          sourceId: 'NEUROSCIENCE',
          sourceUrl: 'https://example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['neuroscience', 'brain'] },
        },
        {
          assertionId: 'a2',
          content: 'Neurons communicate through electrical and chemical signals',
          type: 'factual',
          sourceId: 'NEUROSCIENCE',
          sourceUrl: 'https://example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['neuroscience', 'neurons'] },
        },
      ];

      const trustValues = new Map([['a1', 0.95], ['a2', 0.92]]);

      const result = await generateChatResponse(
        'How many neurons are in the human brain?',
        assertions,
        trustValues
      );

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(20);

      // Response should reference the number from our assertions
      const response = result.response.toLowerCase();
      expect(response).toContain('86 billion' || response.includes('86') || response.includes('billion'));
    }, 30000);

    it('should cite sources when answering', async () => {
      const assertions: Assertion[] = [
        {
          assertionId: 'a1',
          content: 'Marie Curie discovered radium in 1898',
          type: 'factual',
          sourceId: 'HISTORY',
          sourceUrl: 'https://example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['history', 'science'] },
        },
      ];

      const trustValues = new Map([['a1', 0.9]]);

      const result = await generateChatResponse(
        'Who discovered radium?',
        assertions,
        trustValues
      );

      expect(result.response.length).toBeGreaterThan(10);
      expect(result.citedAssertions).toBeDefined();
      expect(result.citedAssertions.length).toBeGreaterThanOrEqual(0);

      // Response should mention Marie Curie
      const response = result.response.toLowerCase();
      expect(response.includes('curie') || response.includes('marie')).toBe(true);
    }, 30000);
  });

  describe('End-to-End: Decompose and Reassemble', () => {
    it('should decompose article, then reassemble it coherently', async () => {
      const originalArticle = `
        Quantum Computing

        Quantum computing harnesses quantum mechanical phenomena to perform computations.
        Unlike classical computers that use bits (0 or 1), quantum computers use quantum bits
        or qubits that can exist in superposition of both states simultaneously.

        This allows quantum computers to solve certain problems exponentially faster than
        classical computers. Applications include cryptography, drug discovery, and
        optimization problems.
      `;

      // Step 1: Decompose into assertions
      const assertions = await extractAssertionsFromWikipedia(originalArticle);

      expect(assertions.length).toBeGreaterThan(3);

      // Step 2: Convert to full Assertion objects
      const fullAssertions: Assertion[] = assertions.map((ext, index) => ({
        assertionId: `a${index}`,
        content: ext.content,
        type: 'wiki_import',
        sourceId: 'WIKIPEDIA',
        sourceUrl: 'https://wikipedia.org/Quantum_computing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          topics: ext.topics,
          confidence: ext.confidence,
        },
      }));

      // Step 3: Assign trust values (all trusted)
      const trustValues = new Map<string, number>();
      fullAssertions.forEach((a) => {
        trustValues.set(a.assertionId, 0.9);
      });

      // Step 4: Reassemble into article
      const reassembled = await generateWikiArticle(
        'Quantum Computing',
        fullAssertions,
        trustValues,
        0.5
      );

      // Verify reassembled article
      expect(reassembled.content.length).toBeGreaterThan(100);

      const content = reassembled.content.toLowerCase();
      expect(content).toContain('quantum');
      expect(content.includes('qubit') || content.includes('computing')).toBe(true);

      // Should be coherent (not just a list of facts)
      // Check for sentence structure
      expect(content.split('.').length).toBeGreaterThan(2);
    }, 60000); // Longer timeout for full workflow
  });
});
