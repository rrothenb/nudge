/**
 * Content generation using Claude
 */
import { callClaude } from './client';
import {
  GENERATION_SYSTEM_PROMPT,
  createWikiArticlePrompt,
  createChatResponsePrompt,
  createKeywordExtractionPrompt,
} from './prompts';
import type { Assertion } from '@nudge/shared';

export interface GeneratedArticle {
  content: string;
  assertionIds: string[];
  tokensUsed: number;
}

export interface ChatResponse {
  response: string;
  citedAssertions: string[];
  tokensUsed: number;
}

/**
 * Generate wiki-style article from assertions
 */
export async function generateWikiArticle(
  topic: string,
  assertions: Assertion[],
  trustValues: Map<string, number>,
  threshold: number = 0.5
): Promise<GeneratedArticle> {
  const startTime = Date.now();

  // Separate high and low trust assertions
  const highTrust: Array<{ content: string; source: string }> = [];
  const lowTrust: Array<{ content: string; source: string }> = [];

  for (const assertion of assertions) {
    const trust = trustValues.get(assertion.assertionId) ?? 0.5;
    const item = {
      content: typeof assertion.content === 'string' ? assertion.content : JSON.stringify(assertion.content),
      source: assertion.sourceId,
    };

    if (trust >= threshold) {
      highTrust.push(item);
    } else if (trust >= threshold - 0.2) {
      lowTrust.push(item);
    }
  }

  // Limit to avoid token limits
  const maxHighTrust = 30;
  const maxLowTrust = 10;

  const prompt = createWikiArticlePrompt(
    topic,
    highTrust.slice(0, maxHighTrust),
    lowTrust.slice(0, maxLowTrust)
  );

  const content = await callClaude(prompt, {
    systemPrompt: GENERATION_SYSTEM_PROMPT,
    maxTokens: 2048,
  });

  const generationTime = Date.now() - startTime;

  // Estimate tokens used (input + output)
  const estimatedTokens = Math.ceil((prompt.length + content.length) / 4);

  return {
    content,
    assertionIds: assertions.map((a) => a.assertionId),
    tokensUsed: estimatedTokens,
  };
}

/**
 * Generate chat response from trusted assertions
 */
export async function generateChatResponse(
  query: string,
  relevantAssertions: Assertion[],
  trustValues: Map<string, number>
): Promise<ChatResponse> {
  const startTime = Date.now();

  // Sort by trust value (descending)
  const sortedAssertions = relevantAssertions.sort((a, b) => {
    const trustA = trustValues.get(a.assertionId) ?? 0.5;
    const trustB = trustValues.get(b.assertionId) ?? 0.5;
    return trustB - trustA;
  });

  // Take top assertions
  const maxAssertions = 20;
  const topAssertions = sortedAssertions.slice(0, maxAssertions);

  const assertionsWithTrust = topAssertions.map((a) => ({
    content: typeof a.content === 'string' ? a.content : JSON.stringify(a.content),
    source: a.sourceId,
    trust: trustValues.get(a.assertionId) ?? 0.5,
  }));

  const prompt = createChatResponsePrompt(query, assertionsWithTrust);

  const response = await callClaude(prompt, {
    systemPrompt:
      'You are a helpful assistant answering questions based on the user\'s trusted knowledge base.',
    maxTokens: 1024,
  });

  const generationTime = Date.now() - startTime;

  // Extract cited assertion IDs (simple pattern matching)
  const citedAssertions: string[] = [];
  for (const assertion of topAssertions) {
    // Check if the assertion content appears in the response
    const content = typeof assertion.content === 'string' ? assertion.content : '';
    if (content && response.includes(content.substring(0, 50))) {
      citedAssertions.push(assertion.assertionId);
    }
  }

  const estimatedTokens = Math.ceil((prompt.length + response.length) / 4);

  return {
    response,
    citedAssertions,
    tokensUsed: estimatedTokens,
  };
}

/**
 * Extract keywords from search query
 */
export async function extractSearchKeywords(query: string): Promise<{
  keywords: string[];
  concepts: string[];
  related: string[];
}> {
  const prompt = createKeywordExtractionPrompt(query);

  try {
    const result = await callClaude(prompt, {
      maxTokens: 512,
      temperature: 0.3,
    });

    // Parse JSON from response
    const parsed = JSON.parse(result);
    return {
      keywords: parsed.keywords || [],
      concepts: parsed.concepts || [],
      related: parsed.related || [],
    };
  } catch (error) {
    console.error('Failed to extract keywords:', error);
    // Fallback: simple keyword extraction
    return {
      keywords: query.toLowerCase().split(/\s+/).slice(0, 5),
      concepts: [],
      related: [],
    };
  }
}

/**
 * Generate news feed summary
 */
export async function generateNewsSummary(
  assertions: Assertion[],
  trustValues: Map<string, number>,
  limit: number = 10
): Promise<string> {
  // Sort by trust and recency
  const sorted = assertions
    .filter((a) => {
      const trust = trustValues.get(a.assertionId) ?? 0.5;
      return trust >= 0.4; // Minimum threshold
    })
    .sort((a, b) => {
      const trustA = trustValues.get(a.assertionId) ?? 0.5;
      const trustB = trustValues.get(b.assertionId) ?? 0.5;

      // Combine trust and recency
      const scoreA = trustA * 0.7 + (a.publishedAt ? 0.3 : 0);
      const scoreB = trustB * 0.7 + (b.publishedAt ? 0.3 : 0);

      return scoreB - scoreA;
    })
    .slice(0, limit);

  if (sorted.length === 0) {
    return 'No trusted news items found.';
  }

  const items = sorted
    .map((a, i) => {
      const content = typeof a.content === 'string' ? a.content : JSON.stringify(a.content);
      return `${i + 1}. ${content} (${a.sourceId})`;
    })
    .join('\n');

  return `Today's trusted news:\n\n${items}`;
}
