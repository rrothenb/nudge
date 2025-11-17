/**
 * Assertion extraction from articles using Claude
 */
import { callClaudeJSON } from './client';
import {
  EXTRACTION_SYSTEM_PROMPT,
  createExtractionPrompt,
  createTopicIdentificationPrompt,
} from './prompts';
import type { AssertionType } from '@nudge/shared';

export interface ExtractedAssertion {
  content: string;
  type: 'factual' | 'attribution';
  confidence: number;
  topic: string[];
  attributedTo?: string;
}

/**
 * Extract assertions from Wikipedia article
 */
export async function extractAssertionsFromWikipedia(
  articleText: string
): Promise<ExtractedAssertion[]> {
  const prompt = createExtractionPrompt(articleText, 'wikipedia');

  try {
    const assertions = await callClaudeJSON<ExtractedAssertion[]>(prompt, {
      systemPrompt: EXTRACTION_SYSTEM_PROMPT,
      maxTokens: 2048,
    });

    return assertions.filter((a) => a.content && a.content.length > 10);
  } catch (error) {
    console.error('Failed to extract assertions from Wikipedia:', error);
    return [];
  }
}

/**
 * Extract assertions from news article
 */
export async function extractAssertionsFromNews(
  articleText: string
): Promise<ExtractedAssertion[]> {
  const prompt = createExtractionPrompt(articleText, 'news');

  try {
    const assertions = await callClaudeJSON<ExtractedAssertion[]>(prompt, {
      systemPrompt: EXTRACTION_SYSTEM_PROMPT,
      maxTokens: 2048,
    });

    return assertions.filter((a) => a.content && a.content.length > 10);
  } catch (error) {
    console.error('Failed to extract assertions from news:', error);
    return [];
  }
}

/**
 * Identify topics from text
 */
export async function identifyTopics(text: string): Promise<string[]> {
  const prompt = createTopicIdentificationPrompt(text);

  try {
    const topics = await callClaudeJSON<string[]>(prompt, {
      maxTokens: 256,
    });

    return topics.filter((t) => t && t.length > 0);
  } catch (error) {
    console.error('Failed to identify topics:', error);
    return [];
  }
}

/**
 * Map extracted assertion type to our AssertionType enum
 */
export function mapExtractedType(
  extractedType: 'factual' | 'attribution',
  sourceType: 'wikipedia' | 'news'
): AssertionType {
  if (sourceType === 'wikipedia') {
    return 'wiki_import';
  } else {
    return extractedType === 'attribution' ? 'attribution' : 'news_import';
  }
}
