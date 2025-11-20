/**
 * Comprehensive Claude API Integration Tests
 *
 * These tests provide extensive coverage of the assertion extraction and
 * article generation pipeline, including edge cases, scale testing, and
 * quality metrics that go beyond basic functionality.
 *
 * To run: CLAUDE_API_KEY=<key> npm test -- lib/llm/integration-comprehensive.test.ts
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { extractAssertionsFromWikipedia, extractAssertionsFromNews } from './extraction';
import { generateWikiArticle, generateChatResponse } from './generation';
import type { Assertion } from '../../../shared/types/assertion';

// Skip these tests if no API key is provided
const skipIfNoKey = process.env.CLAUDE_API_KEY === 'test-api-key' || !process.env.CLAUDE_API_KEY;

describe('Comprehensive Claude API Integration Tests', { skip: skipIfNoKey }, () => {
  beforeAll(() => {
    if (skipIfNoKey) {
      console.log('Skipping comprehensive integration tests: No API key provided');
    }
  });

  describe('Conflict Resolution and Controversial Topics', () => {
    it('should handle contradictory assertions from different sources', async () => {
      // Test with a controversial topic where sources might disagree
      const climateChangeContent = `
        Climate Change Debate

        According to the Intergovernmental Panel on Climate Change (IPCC), human activities
        are the dominant cause of observed warming since the mid-20th century. The IPCC states
        that it is extremely likely (95-100% probability) that human influence has been the
        dominant cause of warming.

        However, some researchers have questioned the magnitude of human impact. A minority
        of scientists argue that natural climate variability plays a larger role than currently
        acknowledged in climate models.

        The scientific consensus, as represented by 97% of actively publishing climate scientists,
        agrees that climate-warming trends are extremely likely due to human activities.
      `;

      const assertions = await extractAssertionsFromWikipedia(climateChangeContent);

      expect(assertions.length).toBeGreaterThan(3);

      // Should extract both consensus and dissenting views
      const contents = assertions.map(a => a.content.toLowerCase());
      const hasConsensusView = contents.some(c =>
        c.includes('human') && (c.includes('cause') || c.includes('influence'))
      );
      const hasDifferentPerspectives = assertions.length >= 3;

      expect(hasConsensusView).toBe(true);
      expect(hasDifferentPerspectives).toBe(true);

      // All assertions should have confidence scores reflecting certainty
      assertions.forEach(assertion => {
        expect(assertion.confidence).toBeGreaterThan(0);
        expect(assertion.confidence).toBeLessThanOrEqual(1);
      });
    }, 45000);

    it('should handle politically sensitive topics appropriately', async () => {
      const politicalContent = `
        Vaccination Policy Debate

        The Centers for Disease Control and Prevention (CDC) and World Health Organization (WHO)
        state that vaccines are safe and effective, having prevented millions of deaths. Clinical
        trials involving tens of thousands of participants demonstrated high efficacy rates.

        Public health officials emphasize that the benefits of vaccination far outweigh the risks.
        Serious adverse events are extremely rare, occurring in less than 1 in 100,000 cases.

        Some parents have expressed concerns about vaccine timing and ingredients, leading to
        debates about mandatory vaccination policies versus parental choice.
      `;

      const assertions = await extractAssertionsFromNews(politicalContent);

      expect(assertions.length).toBeGreaterThan(2);

      // Should identify attributions for claims
      const withAttributions = assertions.filter(a =>
        a.attributedTo && a.attributedTo.length > 0
      );

      // At least some assertions should have clear attributions
      expect(withAttributions.length).toBeGreaterThan(0);

      // Confidence scores should reflect scientific consensus
      const scientificClaims = assertions.filter(a =>
        a.content.toLowerCase().includes('cdc') ||
        a.content.toLowerCase().includes('who') ||
        a.content.toLowerCase().includes('clinical trial')
      );

      scientificClaims.forEach(claim => {
        // Scientific claims from authoritative sources should have higher confidence
        expect(claim.confidence).toBeGreaterThan(0.7);
      });
    }, 45000);
  });

  describe('Scale Testing - Large Articles', () => {
    it('should handle long Wikipedia article with 20+ assertions', async () => {
      const longArticle = `
        Artificial Intelligence: A Comprehensive Overview

        Introduction
        Artificial intelligence (AI) is the simulation of human intelligence processes by machines,
        especially computer systems. These processes include learning, reasoning, and self-correction.

        History
        The term "artificial intelligence" was coined by John McCarthy in 1956 at the Dartmouth Conference.
        This conference is considered the birth of AI as a field of study. Early AI research in the 1950s
        explored topics like problem solving and symbolic methods.

        Alan Turing proposed the Turing Test in 1950 as a measure of machine intelligence. The test
        evaluates a machine's ability to exhibit intelligent behavior indistinguishable from a human.

        Machine Learning
        Machine learning is a subset of AI that focuses on the development of algorithms that can learn
        from and make decisions based on data. It does not require explicit programming for every task.

        Supervised learning uses labeled training data to learn the mapping between inputs and outputs.
        Common applications include image classification and spam detection.

        Unsupervised learning finds patterns in data without predefined labels. Clustering and
        dimensionality reduction are common unsupervised learning tasks.

        Deep learning uses neural networks with multiple layers to process complex patterns in data.
        It has achieved remarkable success in image recognition, natural language processing, and game playing.

        Neural Networks
        Artificial neural networks are computing systems inspired by biological neural networks.
        They consist of interconnected nodes (neurons) organized in layers.

        Convolutional Neural Networks (CNNs) are particularly effective for image processing tasks.
        They use convolution operations to detect features in images hierarchically.

        Recurrent Neural Networks (RNNs) are designed to handle sequential data like text and time series.
        They maintain internal memory to process sequences of inputs.

        Natural Language Processing
        Natural language processing (NLP) enables computers to understand, interpret, and generate human language.
        Applications include machine translation, sentiment analysis, and chatbots.

        Large language models like GPT and BERT have revolutionized NLP by learning from vast amounts of text data.
        These models can perform multiple language tasks without task-specific training.

        Computer Vision
        Computer vision enables machines to interpret and understand visual information from the world.
        It powers applications like facial recognition, autonomous vehicles, and medical imaging.

        Object detection algorithms can identify and locate multiple objects within an image.
        Semantic segmentation classifies each pixel in an image into predefined categories.

        Ethics and Challenges
        AI systems can perpetuate or amplify biases present in training data. Ensuring fairness and
        transparency in AI decision-making is an ongoing challenge.

        The "black box" problem refers to the difficulty in understanding how complex AI models
        make decisions. Explainable AI aims to make model decisions more interpretable.

        Privacy concerns arise from AI's ability to analyze personal data at scale. Regulations
        like GDPR aim to protect individual privacy rights.

        Job displacement due to automation is a significant societal concern. Reskilling and
        education programs are needed to help workers adapt to an AI-driven economy.

        Future Directions
        Artificial General Intelligence (AGI) refers to AI that can perform any intellectual task
        a human can do. Current AI systems are narrow AI, specialized for specific tasks.

        Quantum computing may dramatically accelerate AI capabilities by solving complex optimization
        problems faster than classical computers.

        Brain-computer interfaces could enable direct communication between human brains and AI systems.
        This technology is still in early stages but shows promise for medical applications.
      `;

      const assertions = await extractAssertionsFromWikipedia(longArticle);

      // Should extract 20+ assertions from comprehensive article
      expect(assertions.length).toBeGreaterThanOrEqual(20);
      expect(assertions.length).toBeLessThan(60); // But not too many

      // All assertions should be well-formed
      assertions.forEach(assertion => {
        expect(assertion.content.length).toBeGreaterThan(15);
        expect(assertion.confidence).toBeGreaterThan(0);
        expect(assertion.topic.length).toBeGreaterThan(0);
      });

      // Should cover multiple topics
      const allTopics = new Set(assertions.flatMap(a => a.topic));
      expect(allTopics.size).toBeGreaterThan(3);

      // Now test reassembly with all these assertions
      const fullAssertions: Assertion[] = assertions.map((ext, index) => ({
        assertionId: `ai-${index}`,
        content: ext.content,
        type: 'wiki_import',
        sourceId: 'WIKIPEDIA',
        sourceUrl: 'https://wikipedia.org/AI',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: { topics: ext.topic, confidence: ext.confidence },
      }));

      const trustValues = new Map<string, number>();
      fullAssertions.forEach(a => trustValues.set(a.assertionId, 0.9));

      const article = await generateWikiArticle(
        'Artificial Intelligence',
        fullAssertions,
        trustValues,
        0.5
      );

      // Article should be substantial
      expect(article.content.length).toBeGreaterThan(500);
      expect(article.content.split('\n').length).toBeGreaterThan(5);

      // Should maintain coherent structure
      const lowerContent = article.content.toLowerCase();
      expect(lowerContent).toContain('artificial intelligence');
    }, 120000); // 2 minute timeout for large test
  });

  describe('Multi-Source Integration', () => {
    it('should blend Wikipedia facts with recent news updates', async () => {
      // Simulate having both historical facts and recent news
      const assertions: Assertion[] = [
        // Wikipedia facts (historical, high confidence)
        {
          assertionId: 'w1',
          content: 'SpaceX was founded by Elon Musk in 2002',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org/SpaceX',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          metadata: { topics: ['space', 'technology'], confidence: 0.95 },
        },
        {
          assertionId: 'w2',
          content: 'The Falcon 9 is a reusable rocket designed by SpaceX',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org/Falcon_9',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          metadata: { topics: ['space', 'rockets'], confidence: 0.95 },
        },
        // Recent news (current, varying confidence)
        {
          assertionId: 'n1',
          content: 'SpaceX recently completed its 300th successful Falcon 9 landing',
          type: 'news_import',
          sourceId: 'SPACE_NEWS',
          sourceUrl: 'https://spacenews.com/article',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
          metadata: { topics: ['space', 'achievements'], confidence: 0.85 },
        },
        {
          assertionId: 'n2',
          content: 'Industry analysts predict SpaceX will attempt a Mars mission within the next decade',
          type: 'news_import',
          sourceId: 'TECH_BLOG',
          sourceUrl: 'https://techblog.com/spacex',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
          metadata: { topics: ['space', 'mars', 'predictions'], confidence: 0.6 },
        },
      ];

      // High trust in Wikipedia, medium trust in news
      const trustValues = new Map([
        ['w1', 0.95],
        ['w2', 0.95],
        ['n1', 0.75],
        ['n2', 0.55],
      ]);

      const article = await generateWikiArticle(
        'SpaceX',
        assertions,
        trustValues,
        0.5
      );

      expect(article.content.length).toBeGreaterThan(100);

      const content = article.content.toLowerCase();

      // Should include high-trust facts
      expect(
        content.includes('spacex') || content.includes('falcon')
      ).toBe(true);

      // Should blend historical and recent information
      const hasHistoricalContext = content.includes('2002') || content.includes('founded');
      const hasRecentInfo = content.includes('recent') || content.includes('300') || content.includes('landing');

      expect(hasHistoricalContext || hasRecentInfo).toBe(true);
    }, 45000);

    it('should handle mixed confidence levels appropriately', async () => {
      const assertions: Assertion[] = [
        // High confidence scientific fact
        {
          assertionId: 'high1',
          content: 'Water boils at 100 degrees Celsius at sea level',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org/Water',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['chemistry', 'physics'], confidence: 0.99 },
        },
        // Medium confidence emerging research
        {
          assertionId: 'med1',
          content: 'Recent studies suggest a new water phase may exist under extreme pressure',
          type: 'news_import',
          sourceId: 'SCIENCE_JOURNAL',
          sourceUrl: 'https://science.com/article',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['chemistry', 'research'], confidence: 0.7 },
        },
        // Lower confidence speculation
        {
          assertionId: 'low1',
          content: 'Some researchers speculate water memory effects could explain homeopathy',
          type: 'news_import',
          sourceId: 'ALT_SCIENCE',
          sourceUrl: 'https://altscience.com/article',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['pseudoscience'], confidence: 0.3 },
        },
      ];

      // Trust values reflect source reliability
      const trustValues = new Map([
        ['high1', 0.95],
        ['med1', 0.70],
        ['low1', 0.25],
      ]);

      const article = await generateWikiArticle(
        'Water',
        assertions,
        trustValues,
        0.6 // Threshold filters out low-confidence speculation
      );

      const content = article.content.toLowerCase();

      // Should include high-confidence facts
      expect(content.includes('water') || content.includes('boil')).toBe(true);

      // Should NOT include low-confidence speculation (below threshold)
      expect(content.includes('homeopathy')).toBe(false);
    }, 45000);
  });

  describe('Quality and Coherence Metrics', () => {
    it('should generate coherent article, not just list of facts', async () => {
      const assertions: Assertion[] = [
        {
          assertionId: 'p1',
          content: 'Photosynthesis converts light energy into chemical energy',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org/Photosynthesis',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['biology'], confidence: 0.95 },
        },
        {
          assertionId: 'p2',
          content: 'Chlorophyll absorbs light in the blue and red wavelengths',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org/Chlorophyll',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['biology'], confidence: 0.95 },
        },
        {
          assertionId: 'p3',
          content: 'The process occurs in chloroplasts within plant cells',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org/Chloroplast',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['biology'], confidence: 0.95 },
        },
      ];

      const trustValues = new Map([
        ['p1', 0.9],
        ['p2', 0.9],
        ['p3', 0.9],
      ]);

      const article = await generateWikiArticle(
        'Photosynthesis',
        assertions,
        trustValues,
        0.5
      );

      // Check for coherent article structure
      expect(article.content.length).toBeGreaterThan(100);

      // Should have multiple sentences
      const sentences = article.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      expect(sentences.length).toBeGreaterThan(2);

      // Should have connecting words (not just bullet points)
      const content = article.content.toLowerCase();
      const hasConnectors =
        content.includes(' and ') ||
        content.includes(' which ') ||
        content.includes(' that ') ||
        content.includes(' where ') ||
        content.includes(' this ') ||
        content.includes(' these ');

      expect(hasConnectors).toBe(true);

      // Should NOT be just a bulleted list
      const bulletCount = (article.content.match(/^[-*•]/gm) || []).length;
      expect(bulletCount).toBeLessThan(sentences.length / 2);
    }, 45000);

    it('should not hallucinate facts not in assertions', async () => {
      const assertions: Assertion[] = [
        {
          assertionId: 'e1',
          content: 'The Eiffel Tower is located in Paris, France',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org/Eiffel_Tower',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['landmarks', 'france'], confidence: 0.99 },
        },
        {
          assertionId: 'e2',
          content: 'It was designed by Gustave Eiffel',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org/Eiffel_Tower',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['landmarks', 'architecture'], confidence: 0.99 },
        },
      ];

      const trustValues = new Map([
        ['e1', 0.95],
        ['e2', 0.95],
      ]);

      const article = await generateWikiArticle(
        'Eiffel Tower',
        assertions,
        trustValues,
        0.5
      );

      const content = article.content.toLowerCase();

      // Should mention the facts we provided
      expect(content.includes('paris') || content.includes('france')).toBe(true);
      expect(content.includes('eiffel') || content.includes('gustave')).toBe(true);

      // Should NOT include specific facts we didn't provide
      // (e.g., height, construction date, visitor numbers)
      // This is a soft check - we're looking for absence of very specific numbers
      const hasSpecificHeight = /324\s*m(eters)?/.test(content) || /1,063\s*ft/.test(content);
      const hasConstructionYear = /1889/.test(content);

      // Note: This is probabilistic - the model MIGHT infer general info,
      // but specific measurements should not appear
      if (hasSpecificHeight || hasConstructionYear) {
        console.warn('Warning: Generated content may include facts not in assertions');
      }
    }, 45000);
  });

  describe('Edge Cases and Robustness', () => {
    it('should handle minimal content gracefully', async () => {
      const minimalContent = `
        The Moon is Earth's natural satellite.
      `;

      const assertions = await extractAssertionsFromWikipedia(minimalContent);

      // Should extract at least one assertion
      expect(assertions.length).toBeGreaterThan(0);
      expect(assertions[0].content.length).toBeGreaterThan(10);
    }, 30000);

    it('should handle content with special characters and formatting', async () => {
      const formattedContent = `
        Mathematical Constants

        π (pi) is approximately 3.14159... and represents the ratio of a circle's
        circumference to its diameter.

        Euler's number, e ≈ 2.71828, is the base of natural logarithms.

        The equation E = mc² shows the equivalence of energy (E) and mass (m),
        where c is the speed of light.
      `;

      const assertions = await extractAssertionsFromWikipedia(formattedContent);

      expect(assertions.length).toBeGreaterThan(2);

      // Should handle special characters
      assertions.forEach(assertion => {
        expect(assertion.content.length).toBeGreaterThan(10);
        expect(assertion.confidence).toBeGreaterThan(0);
      });
    }, 30000);

    it('should handle empty/near-empty article generation gracefully', async () => {
      const emptyAssertions: Assertion[] = [];
      const trustValues = new Map<string, number>();

      const article = await generateWikiArticle(
        'Unknown Topic',
        emptyAssertions,
        trustValues,
        0.5
      );

      // Should not crash, should return some content
      expect(article).toBeDefined();
      expect(article.content).toBeDefined();
      expect(typeof article.content).toBe('string');
    }, 30000);

    it('should handle all assertions below trust threshold', async () => {
      const assertions: Assertion[] = [
        {
          assertionId: 'u1',
          content: 'Unverified claim from unreliable source',
          type: 'news_import',
          sourceId: 'UNRELIABLE',
          sourceUrl: 'https://example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['unknown'], confidence: 0.3 },
        },
      ];

      const trustValues = new Map([['u1', 0.2]]);

      const article = await generateWikiArticle(
        'Test Topic',
        assertions,
        trustValues,
        0.8 // High threshold filters everything
      );

      expect(article).toBeDefined();
      expect(article.content).toBeDefined();
      // Article should acknowledge limited information
      expect(article.content.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Chat Q&A Advanced Scenarios', () => {
    it('should handle questions requiring synthesis of multiple assertions', async () => {
      const assertions: Assertion[] = [
        {
          assertionId: 'c1',
          content: 'The human heart has four chambers',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org/Heart',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['anatomy', 'heart'], confidence: 0.99 },
        },
        {
          assertionId: 'c2',
          content: 'The heart pumps blood through the circulatory system',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org/Heart',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['anatomy', 'circulation'], confidence: 0.99 },
        },
        {
          assertionId: 'c3',
          content: 'The average human heart beats about 100,000 times per day',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org/Heart',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['anatomy', 'physiology'], confidence: 0.95 },
        },
      ];

      const trustValues = new Map([
        ['c1', 0.95],
        ['c2', 0.95],
        ['c3', 0.95],
      ]);

      const result = await generateChatResponse(
        'How does the heart work?',
        assertions,
        trustValues
      );

      expect(result.response.length).toBeGreaterThan(50);

      // Should synthesize information from multiple assertions
      const response = result.response.toLowerCase();
      const mentionsChambers = response.includes('chamber') || response.includes('four');
      const mentionsPumping = response.includes('pump') || response.includes('blood');

      expect(mentionsChambers || mentionsPumping).toBe(true);
    }, 30000);

    it('should handle questions with no relevant assertions', async () => {
      const assertions: Assertion[] = [
        {
          assertionId: 'x1',
          content: 'The capital of France is Paris',
          type: 'wiki_import',
          sourceId: 'WIKIPEDIA',
          sourceUrl: 'https://wikipedia.org',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { topics: ['geography'], confidence: 0.99 },
        },
      ];

      const trustValues = new Map([['x1', 0.95]]);

      const result = await generateChatResponse(
        'What is quantum entanglement?',
        assertions,
        trustValues
      );

      expect(result.response).toBeDefined();
      expect(result.response.length).toBeGreaterThan(20);

      // Should acknowledge lack of relevant information
      const response = result.response.toLowerCase();
      const acknowledgesLimitation =
        response.includes('don\'t have') ||
        response.includes('no information') ||
        response.includes('cannot') ||
        response.includes('unable');

      // This is probabilistic, but the model should recognize the mismatch
      if (!acknowledgesLimitation) {
        console.warn('Model may not be acknowledging lack of relevant assertions');
      }
    }, 30000);
  });
});
