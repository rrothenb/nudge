/**
 * Claude API prompt templates
 */

/**
 * System prompt for assertion extraction
 */
export const EXTRACTION_SYSTEM_PROMPT = `You are an expert at analyzing text and extracting factual assertions.

Your task is to break down articles into atomic, verifiable statements. Each assertion should be:
- Atomic: One fact per assertion
- Self-contained: Understandable without additional context
- Verifiable: Can be fact-checked
- Attributed: If it's a claim/opinion, note the source

Return a JSON array of assertions.`;

/**
 * Generate assertion extraction prompt
 */
export function createExtractionPrompt(text: string, sourceType: 'wikipedia' | 'news'): string {
  const typeGuidance =
    sourceType === 'wikipedia'
      ? 'This is from Wikipedia. Focus on factual statements and skip editorial content.'
      : 'This is from a news article. Pay attention to attributions and distinguish facts from claims.';

  return `${typeGuidance}

Extract factual assertions from the following text:

"""
${text}
"""

Return a JSON array with this structure:
[
  {
    "content": "The assertion text",
    "type": "factual" | "attribution",
    "confidence": 0.0-1.0,
    "topic": ["topic1", "topic2"],
    "attributedTo": "source name" (only if type is "attribution")
  }
]

Guidelines:
- Only extract important, non-trivial assertions
- Combine related facts if they form a coherent statement
- For controversial claims, use type "attribution" and note the source
- Confidence should reflect how certain/verifiable the assertion is
- Limit to the 20 most important assertions`;
}

/**
 * System prompt for article generation
 */
export const GENERATION_SYSTEM_PROMPT = `You are a skilled writer creating informative, neutral articles.

Your task is to synthesize information from multiple assertions into a coherent article.
You will receive assertions ranked by trustworthiness from the reader's perspective.

CRITICAL CONSTRAINTS:
- Use ONLY the provided assertions as factual content
- Do NOT introduce facts, numbers, names, or claims beyond the assertions
- Your role is EDITORIAL: arrange, transition, structure - not inventive
- Think of yourself as a copy editor, not a researcher
- If assertions conflict, present both fairly with attribution

Guidelines:
- Write in a clear, encyclopedic style
- Prioritize high-trust assertions in the main narrative
- Present conflicting perspectives fairly (never hide conflicts)
- Maintain neutral tone throughout
- Cite sources for all major claims
- Create smooth transitions between ideas
- Aim for 400-600 words
- Add only: transitions, structure, flow - NO new factual content`;

/**
 * Generate wiki article prompt
 */
export function createWikiArticlePrompt(
  topic: string,
  highTrustAssertions: Array<{ content: string; source: string }>,
  lowTrustAssertions: Array<{ content: string; source: string }> = []
): string {
  const highTrustSection = highTrustAssertions
    .map((a, i) => `${i + 1}. ${a.content} (Source: ${a.source})`)
    .join('\n');

  const lowTrustSection =
    lowTrustAssertions.length > 0
      ? `\n\nLOW-TRUST ASSERTIONS (reader is skeptical, present briefly for balance):\n` +
        lowTrustAssertions.map((a, i) => `${i + 1}. ${a.content} (Source: ${a.source})`).join('\n')
      : '';

  return `Write a Wikipedia-style article about "${topic}" using the following information.

HIGH-TRUST ASSERTIONS (reader believes these, prioritize in main narrative):
${highTrustSection}
${lowTrustSection}

CRITICAL: Use ONLY these assertions as factual content. Do not add facts, numbers, or claims not present in the assertions above.

Write a well-structured article with:
1. Opening paragraph with key definition/overview
2. Main sections covering different aspects
3. Natural incorporation of the assertions
4. Brief mention of low-trust perspectives (if any) for completeness

Your role is to organize and present these facts clearly, not to add new information.
Format the output in markdown with clear section headers.`;
}

/**
 * Generate chat response prompt
 */
export function createChatResponsePrompt(
  query: string,
  relevantAssertions: Array<{ content: string; source: string; trust: number }>
): string {
  if (relevantAssertions.length === 0) {
    return `The user asked: "${query}"

However, there are no relevant assertions in the knowledge base to answer this question.

Respond politely that you don't have information about this topic in the current knowledge base.`;
  }

  const assertionsSection = relevantAssertions
    .map((a, i) => `${i + 1}. ${a.content} (Source: ${a.source}, Trust: ${a.trust.toFixed(2)})`)
    .join('\n');

  return `Answer the user's question based ONLY on the following trusted assertions from their knowledge base.

User question: "${query}"

Trusted assertions (sorted by trust level):
${assertionsSection}

CRITICAL: Use ONLY information from the assertions above. Do not introduce facts not present in these assertions.

Guidelines:
- Answer directly and concisely
- Only use information from the assertions above
- Cite sources using [Source] notation
- If assertions don't fully answer the question, acknowledge limitations
- If assertions conflict, present both perspectives
- Aim for 2-4 paragraphs`;
}

/**
 * Generate keyword extraction prompt for search
 */
export function createKeywordExtractionPrompt(query: string): string {
  return `Extract the most important keywords and concepts from this search query for finding relevant information.

Query: "${query}"

Return a JSON object:
{
  "keywords": ["keyword1", "keyword2", ...],
  "concepts": ["broader concept1", "concept2", ...],
  "related": ["related term1", "term2", ...]
}

Limit to 5 keywords, 3 concepts, and 5 related terms maximum.`;
}

/**
 * Generate topic identification prompt
 */
export function createTopicIdentificationPrompt(text: string): string {
  return `Identify the main topics/categories for the following text.

Text:
"""
${text.substring(0, 1000)}
"""

Return a JSON array of topics (2-5 topics):
["topic1", "topic2", "topic3"]

Topics should be:
- Specific but not overly narrow
- Suitable for categorization (e.g., "Climate Change", "Federal Reserve", "Artificial Intelligence")
- Represented as proper nouns or noun phrases`;
}
