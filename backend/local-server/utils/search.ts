/**
 * Basic semantic search implementation
 * TODO: Upgrade to vector-based search with embeddings
 */
import type { Assertion } from '@nudge/shared';

export interface SearchResult {
  assertion: Assertion;
  score: number;
  matchedTerms: string[];
}

/**
 * Search assertions using keyword matching
 * Returns assertions ranked by relevance
 */
export function searchAssertions(
  query: string,
  assertions: Assertion[],
  options: {
    limit?: number;
    minScore?: number;
  } = {}
): SearchResult[] {
  const { limit = 20, minScore = 0.1 } = options;

  // Extract search terms
  const terms = extractTerms(query);
  if (terms.length === 0) {
    return [];
  }

  // Score each assertion
  const results: SearchResult[] = assertions
    .map((assertion) => {
      const { score, matchedTerms } = scoreAssertion(assertion, terms);
      return { assertion, score, matchedTerms };
    })
    .filter((result) => result.score >= minScore);

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

/**
 * Extract meaningful search terms from query
 */
function extractTerms(query: string): string[] {
  const stopWords = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'has',
    'he',
    'in',
    'is',
    'it',
    'its',
    'of',
    'on',
    'that',
    'the',
    'to',
    'was',
    'will',
    'with',
  ]);

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter((term) => term.length > 2 && !stopWords.has(term));
}

/**
 * Score an assertion against search terms
 */
function scoreAssertion(
  assertion: Assertion,
  terms: string[]
): { score: number; matchedTerms: string[] } {
  const content = assertion.content.toLowerCase();
  const topics = (assertion.metadata.topics || []).join(' ').toLowerCase();
  const title = (assertion.metadata.title || '').toLowerCase();

  let score = 0;
  const matchedTerms: string[] = [];

  for (const term of terms) {
    let termScore = 0;

    // Exact matches in content (highest weight)
    if (content.includes(term)) {
      const regex = new RegExp(`\\b${term}\\b`, 'g');
      const exactMatches = (content.match(regex) || []).length;
      termScore += exactMatches * 1.0;
      matchedTerms.push(term);
    }

    // Partial matches in content
    if (content.includes(term) && !content.match(new RegExp(`\\b${term}\\b`))) {
      termScore += 0.3;
    }

    // Matches in topics (high weight)
    if (topics.includes(term)) {
      termScore += 0.8;
      if (!matchedTerms.includes(term)) {
        matchedTerms.push(term);
      }
    }

    // Matches in title (medium weight)
    if (title.includes(term)) {
      termScore += 0.5;
      if (!matchedTerms.includes(term)) {
        matchedTerms.push(term);
      }
    }

    score += termScore;
  }

  // Normalize by number of terms
  score = score / terms.length;

  // Boost score based on assertion confidence
  score = score * (0.5 + assertion.confidence * 0.5);

  return { score, matchedTerms };
}

/**
 * Find similar assertions based on topics
 */
export function findSimilarAssertions(
  assertion: Assertion,
  allAssertions: Assertion[],
  limit: number = 5
): Assertion[] {
  const topics = assertion.metadata.topics || [];
  if (topics.length === 0) {
    return [];
  }

  // Score other assertions by topic overlap
  const scored = allAssertions
    .filter((a) => a.assertionId !== assertion.assertionId)
    .map((a) => {
      const aTopics = a.metadata.topics || [];
      const overlap = topics.filter((t) => aTopics.includes(t)).length;
      return { assertion: a, score: overlap };
    })
    .filter((item) => item.score > 0);

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((item) => item.assertion);
}
