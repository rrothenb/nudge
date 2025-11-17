/**
 * Claude API client
 */
import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_MODEL, CLAUDE_MAX_TOKENS, CLAUDE_TEMPERATURE } from '@nudge/shared';

// Singleton client
let client: Anthropic | null = null;

/**
 * Get or create Claude API client
 */
export function getClaudeClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY environment variable is not set');
    }

    client = new Anthropic({
      apiKey,
    });
  }

  return client;
}

/**
 * Call Claude API with retry logic
 */
export async function callClaude(
  prompt: string,
  options?: {
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    model?: string;
  }
): Promise<string> {
  const client = getClaudeClient();

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: options?.model || CLAUDE_MODEL,
        max_tokens: options?.maxTokens || CLAUDE_MAX_TOKENS,
        temperature: options?.temperature || CLAUDE_TEMPERATURE,
        system: options?.systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract text from response
      const textContent = response.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      return textContent.text;
    } catch (error: any) {
      lastError = error;
      console.error(`Claude API attempt ${attempt} failed:`, error);

      // Check if it's a rate limit error
      if (error.status === 429) {
        // Exponential backoff: 2^attempt seconds
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // For other errors, don't retry
      throw error;
    }
  }

  throw new Error(`Claude API failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Call Claude API with JSON response parsing
 */
export async function callClaudeJSON<T>(
  prompt: string,
  options?: {
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<T> {
  const fullPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON, no other text.`;

  const response = await callClaude(fullPrompt, {
    ...options,
    temperature: 0.3, // Lower temperature for more consistent JSON
  });

  // Try to extract JSON from the response
  try {
    // First, try parsing as-is
    return JSON.parse(response) as T;
  } catch (error) {
    // Try to find JSON in code blocks
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]) as T;
    }

    // Try to find JSON object/array directly
    const objectMatch = response.match(/\{[\s\S]*\}/) || response.match(/\[[\s\S]*\]/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]) as T;
    }

    throw new Error(`Failed to parse JSON from Claude response: ${response.substring(0, 500)}`);
  }
}

/**
 * Count tokens in a string (rough estimate)
 * Claude uses ~4 characters per token
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reset client (for testing)
 */
export function resetClient(): void {
  client = null;
}
