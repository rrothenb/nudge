/**
 * Article composition utilities
 *
 * Implements phrasing selection for equivalence relationships and
 * conflict detection for contradicting assertions.
 */

import type { Assertion, AssertionRelationship } from '@nudge/shared';
import { queryAssertionsByIds } from '../db/assertions';

export interface AssertionWithPhrasing {
  assertionId: string;
  content: string;
  sourceId: string;
  sourceType: string;
  importedBy?: string;
  phrasingSources: Array<{
    assertionId: string;
    sourceId: string;
    sourceTrust: number;
    isOriginal: boolean;
  }>;
}

export interface ConflictPair {
  assertion1: AssertionWithPhrasing;
  assertion2: AssertionWithPhrasing;
  conflictType: 'contradicts';
  confidence: number;
}

/**
 * Select the best-trusted phrasing for an assertion
 *
 * For each assertion:
 * 1. Check for equivalent_to relationships
 * 2. Load all equivalent phrasings
 * 3. Filter to those the user trusts
 * 4. Choose the highest-trusted equivalence, or original if none trusted
 *
 * This allows editorial improvements (composition bots, translators) without
 * losing provenance. Users who don't trust the editor see the original.
 *
 * @param assertion - The original assertion
 * @param allAssertions - Map of all assertions (for looking up equivalences)
 * @param userTrustValues - User's trust values for sources
 * @returns Assertion with selected phrasing and metadata
 */
export async function selectBestPhrasing(
  assertion: Assertion,
  allAssertions: Map<string, Assertion>,
  userTrustValues: Map<string, number>
): Promise<AssertionWithPhrasing> {
  // Start with original phrasing
  let selectedContent = typeof assertion.content === 'string'
    ? assertion.content
    : JSON.stringify(assertion.content);

  let selectedSourceId = assertion.sourceId;
  let selectedSourceTrust = userTrustValues.get(assertion.sourceId) ?? 0.5;

  const phrasingSources: Array<{
    assertionId: string;
    sourceId: string;
    sourceTrust: number;
    isOriginal: boolean;
  }> = [
    {
      assertionId: assertion.assertionId,
      sourceId: assertion.sourceId,
      sourceTrust: selectedSourceTrust,
      isOriginal: true,
    },
  ];

  // Find equivalence relationships pointing TO this assertion
  // (editors create new assertions with equivalent_to pointing to original)
  for (const [otherId, otherAssertion] of allAssertions.entries()) {
    if (otherId === assertion.assertionId) continue;

    // Check if this assertion claims equivalence to our target
    const equivalenceRel = otherAssertion.relationships?.find(
      (rel) => rel.type === 'equivalent_to' && rel.targetId === assertion.assertionId
    );

    if (equivalenceRel) {
      const editorTrust = userTrustValues.get(otherAssertion.sourceId) ?? 0.5;

      // Add to candidate phrasings
      phrasingSources.push({
        assertionId: otherAssertion.assertionId,
        sourceId: otherAssertion.sourceId,
        sourceTrust: editorTrust,
        isOriginal: false,
      });

      // If this editor is more trusted AND has high confidence, use their phrasing
      if (editorTrust > selectedSourceTrust && equivalenceRel.confidence >= 0.7) {
        selectedContent = typeof otherAssertion.content === 'string'
          ? otherAssertion.content
          : JSON.stringify(otherAssertion.content);
        selectedSourceId = otherAssertion.sourceId;
        selectedSourceTrust = editorTrust;
      }
    }
  }

  return {
    assertionId: assertion.assertionId,
    content: selectedContent,
    sourceId: selectedSourceId,
    sourceType: assertion.sourceType,
    importedBy: assertion.importedBy,
    phrasingSources,
  };
}

/**
 * Select best phrasings for all assertions (batch)
 *
 * More efficient than calling selectBestPhrasing individually.
 */
export async function selectBestPhrasings(
  assertions: Assertion[],
  userTrustValues: Map<string, number>
): Promise<AssertionWithPhrasing[]> {
  // Build map of all assertions for lookups
  const assertionMap = new Map<string, Assertion>();
  for (const assertion of assertions) {
    assertionMap.set(assertion.assertionId, assertion);
  }

  // Also need to load any assertions that might be equivalences
  // For now, we'll just use the assertions we have (could be extended)

  // Process each assertion
  const results: AssertionWithPhrasing[] = [];
  for (const assertion of assertions) {
    const withPhrasing = await selectBestPhrasing(assertion, assertionMap, userTrustValues);
    results.push(withPhrasing);
  }

  return results;
}

/**
 * Detect conflicts between assertions
 *
 * Identifies pairs of assertions with 'contradicts' relationships.
 * These should be presented fairly to the user, not hidden.
 *
 * @param assertions - Assertions with selected phrasings
 * @returns Array of conflict pairs
 */
export function detectConflicts(
  assertions: AssertionWithPhrasing[]
): ConflictPair[] {
  const conflicts: ConflictPair[] = [];
  const assertionMap = new Map<string, AssertionWithPhrasing>();

  for (const assertion of assertions) {
    assertionMap.set(assertion.assertionId, assertion);
  }

  // Check each assertion for contradicts relationships
  for (const assertion of assertions) {
    // Need to access relationships from original assertion data
    // For now, this is a placeholder - would need to pass relationships through
    // This will be implemented when we have relationship data
  }

  return conflicts;
}

/**
 * Format assertions for LLM prompt
 *
 * Prepares assertions with phrasings and conflict markers for composition.
 *
 * @param assertions - Assertions with selected phrasings
 * @param conflicts - Detected conflicts
 * @param includeMetadata - Whether to include trust and phrasing metadata
 * @returns Formatted string for LLM prompt
 */
export function formatAssertionsForPrompt(
  assertions: AssertionWithPhrasing[],
  conflicts: ConflictPair[],
  includeMetadata: boolean = false
): string {
  const conflictIds = new Set<string>();
  for (const conflict of conflicts) {
    conflictIds.add(conflict.assertion1.assertionId);
    conflictIds.add(conflict.assertion2.assertionId);
  }

  const formatted = assertions.map((assertion, index) => {
    let line = `${index + 1}. ${assertion.content}`;

    // Add source attribution
    line += ` (Source: ${assertion.sourceId}`;
    if (assertion.importedBy) {
      line += `, imported by ${assertion.importedBy}`;
    }
    line += ')';

    // Mark if this is part of a conflict
    if (conflictIds.has(assertion.assertionId)) {
      line += ' [CONFLICT - see alternative perspectives below]';
    }

    // Add phrasing metadata if requested
    if (includeMetadata && assertion.phrasingSources.length > 1) {
      const otherPhrasings = assertion.phrasingSources.filter((p) => !p.isOriginal);
      if (otherPhrasings.length > 0) {
        line += ` [Phrasing by ${assertion.sourceId}]`;
      }
    }

    return line;
  }).join('\n');

  // Add conflict section if any
  if (conflicts.length > 0) {
    const conflictSection = '\n\nCONFLICTING PERSPECTIVES (present both fairly):\n' +
      conflicts.map((conflict, index) => {
        return `Conflict ${index + 1}:\n` +
          `  Perspective A: ${conflict.assertion1.content} (${conflict.assertion1.sourceId})\n` +
          `  Perspective B: ${conflict.assertion2.content} (${conflict.assertion2.sourceId})`;
      }).join('\n');

    return formatted + conflictSection;
  }

  return formatted;
}

/**
 * Validate that LLM output doesn't introduce new facts
 *
 * Performs basic checks to ensure the generated content doesn't
 * hallucinate facts beyond the provided assertions.
 *
 * This is a heuristic check - not perfect, but catches obvious violations.
 *
 * @param generatedContent - The LLM-generated article
 * @param assertions - The source assertions
 * @returns Validation result with warnings
 */
export function validateNoHallucination(
  generatedContent: string,
  assertions: AssertionWithPhrasing[]
): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Extract key phrases from assertions
  const assertionPhrases = new Set<string>();
  for (const assertion of assertions) {
    // Extract sentences and key phrases
    const sentences = assertion.content.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    for (const sentence of sentences) {
      assertionPhrases.add(sentence.trim().toLowerCase());
    }
  }

  // Check for specific numeric claims in generated content that aren't in assertions
  const numberPattern = /\d+(?:\.\d+)?%?/g;
  const generatedNumbers = generatedContent.match(numberPattern) || [];

  for (const number of generatedNumbers) {
    // Check if this number appears in any assertion
    const found = assertions.some((a) => a.content.includes(number));
    if (!found) {
      warnings.push(`Generated content includes number "${number}" not found in source assertions`);
    }
  }

  // Check for proper names that don't appear in assertions (potential hallucination)
  // This is a simplified check - production would use NER
  const properNounPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const generatedNames = generatedContent.match(properNounPattern) || [];

  for (const name of generatedNames) {
    if (name.length < 3) continue; // Skip short words
    const found = assertions.some((a) => a.content.includes(name));
    if (!found) {
      warnings.push(`Generated content mentions "${name}" not found in source assertions`);
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}
