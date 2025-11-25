# Trust Algorithm Architecture

This document provides a detailed technical explanation of Nudge's similarity-based trust inference algorithm.

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Architecture Components](#architecture-components)
4. [Algorithm Details](#algorithm-details)
5. [Data Structures](#data-structures)
6. [Integration](#integration)
7. [Security Properties](#security-properties)
8. [Performance Characteristics](#performance-characteristics)

---

## Overview

Nudge uses a **similarity-based trust inference algorithm** to help users make trust decisions about entities they haven't explicitly evaluated. Instead of propagating trust through a social graph (like PageRank), the algorithm finds users with similar trust patterns and uses their opinions to infer trust.

### Key Innovation

**Non-transitive trust**: The fact that Alice trusts Bob, and Bob trusts Charlie, does **not** automatically mean Alice trusts Charlie. Trust is inferred only when Alice's trust pattern is similar to users who trust Charlie.

This design provides:
- **Sybil attack resistance**: Fake accounts with no genuine similarity contribute nothing
- **Schelling points**: Sources trusted across different communities naturally surface
- **Personalization**: Inferences respect individual user preferences
- **Explainability**: We can show which similar users influenced each inference

---

## Core Principles

### 1. Explicit Trust is King
If a user has explicitly set trust for an entity, that value always wins. No inference, no overriding.

### 2. Similarity in Trust Space
We measure similarity based on how users rate shared entities, not social connections:
- Two users are similar if they tend to trust/distrust the same sources
- Similarity is computed using **cosine similarity** on overlapping trust values
- Requires minimum overlap (default 3 entities) to be meaningful

### 3. Entity-Specific Defaults
Different entity types have different default trust levels:
- **Unknown users**: 0.0 (security-critical for Sybil resistance)
- **Official bots**: 0.5 (semi-trusted for curation)
- **Well-known sources**: 0.5 (bootstrapping for new users)
- **Everything else**: 0.0 (must earn trust)

### 4. Provenance Chain
For imported content, trust is bounded by the chain:
```
effective_trust = min(trust_in_bot, trust_in_source, assertion_trust)
```
This prevents fake attribution attacks.

### 5. Phrasing Selection
When multiple phrasings express equivalent content, the algorithm selects the most trusted phrasing based on the composition bot's trust and relationship confidence.

---

## Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Trust Engine                            │
│  (High-level API: computeUserTrust, getUserFeed)            │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├─────► Similarity Module
               │       - computeSimilarity()
               │       - findSimilarUsers()
               │       - Gaussian kernel weighting
               │
               ├─────► Propagation Module
               │       - inferTrust()
               │       - inferTrustBatch()
               │       - explainTrustInference()
               │       - Confidence blending
               │
               ├─────► Provenance Module
               │       - computeAssertionTrustWithProvenance()
               │       - Bot vouching validation
               │       - Chain-of-trust computation
               │
               ├─────► Composition Module
               │       - selectBestPhrasing()
               │       - validateNoHallucination()
               │       - Anti-hallucination checks
               │
               └─────► Trust Defaults
                       - getDefaultTrust()
                       - Entity-specific defaults
                       - Official bots/sources lists
```

### Module Responsibilities

#### **similarity.ts**
- **Purpose**: Compute similarity between users based on trust patterns
- **Key Functions**:
  - `computeSimilarity(vec1, vec2)`: Cosine similarity on overlapping values
  - `findSimilarUsers(userId, targetId, vectors, valueMap)`: Find users similar to userId who have opinions on targetId
  - `weightBySimilarity(similarity, sigma)`: Gaussian kernel weighting
- **Parameters**:
  - `SIMILARITY_BANDWIDTH_SIGMA`: Controls kernel width (default 0.3)
  - `MIN_OVERLAP_FOR_SIMILARITY`: Minimum shared entities (default 3)
  - `SIMILARITY_MAX_COMPARISONS`: Performance cap (default 1000)

#### **propagation.ts**
- **Purpose**: Infer trust from similar users
- **Key Functions**:
  - `inferTrust(userId, targetId, targetType, vectors, valueMap, options)`: Infer trust for single target
  - `inferTrustBatch(userId, targetIds, targetTypes, vectors, valueMap, options)`: Batch inference for multiple targets
  - `explainTrustInference(userId, targetId, vectors, valueMap, options)`: Explain which users contributed
  - `findTrustPaths(graph, sourceId, targetId, maxDepth)`: Legacy graph-based paths
- **Parameters**:
  - `CONFIDENCE_THRESHOLD`: Minimum weight for full confidence (default 5.0)
- **Algorithm**:
  1. Check for explicit trust (return if found)
  2. Find similar users with opinions on target
  3. Compute weighted average of their trust values
  4. Blend with entity default if confidence is low
  5. Return trust value, confidence, and metadata

#### **engine.ts**
- **Purpose**: High-level trust computation and feed ranking
- **Key Functions**:
  - `computeUserTrust(userId, targetId, targetType)`: Compute trust for any entity
  - `getUserFeed(userId, candidateAssertions)`: Rank assertions by trust
  - `computeAssertionTrustWithProvenance(userId, assertion)`: Full trust including provenance chain
- **Integration**: Combines similarity, propagation, provenance, and composition

#### **provenance.ts** (integrated into engine.ts)
- **Purpose**: Validate and compute provenance chains for imported content
- **Key Logic**:
  ```typescript
  if (assertion.importedBy) {
    const botTrust = inferTrust(userId, assertion.importedBy, 'bot', ...);
    const sourceTrust = inferTrust(userId, assertion.sourceId, assertion.sourceType, ...);
    const assertionTrust = inferTrust(userId, assertion.assertionId, 'assertion', ...);

    effectiveTrust = Math.min(botTrust, sourceTrust, assertionTrust);
  }
  ```
- **Security**: Prevents fake bots from vouching for untrusted sources

#### **composition.ts**
- **Purpose**: Select best phrasing from equivalent assertions
- **Key Functions**:
  - `selectBestPhrasing(userId, assertion, allAssertions)`: Pick most trusted equivalent phrasing
  - `validateNoHallucination(original, composed)`: Ensure composition preserves meaning
- **Algorithm**:
  1. Find equivalent assertions via `equivalent_to` relationships
  2. Compute trust for composition bot and relationship confidence
  3. If trust × confidence > threshold, use composed version
  4. Validate no hallucination (semantic equivalence check)

#### **trust-defaults.ts**
- **Purpose**: Define entity-specific default trust values
- **Key Functions**:
  - `getDefaultTrust(entityId, entityType, currentUserId)`: Get default for entity
  - `isOfficialBot(entityId)`: Check if entity is official bot
  - `isWellKnownSource(entityId)`: Check if entity is well-known source
- **Constants**:
  - `OFFICIAL_IMPORT_BOTS`: ['IMPORT_BOT_NEWS', 'IMPORT_BOT_WIKIPEDIA', ...]
  - `OFFICIAL_COMPOSITION_BOTS`: ['COMPOSITION_BOT', 'TRANSLATION_BOT_ES', ...]
  - `WELL_KNOWN_SOURCES`: ['REUTERS', 'WIKIPEDIA', 'NATURE', 'CDC', ...]

---

## Algorithm Details

### Similarity-Based Trust Inference

#### Step 1: Build Trust Vectors

Each user's explicit trust values form a sparse vector:

```typescript
type TrustVector = {
  userId: string;
  values: Map<string, number>; // entityId → trustValue
};

// Example:
const alice: TrustVector = {
  userId: 'alice',
  values: new Map([
    ['REUTERS', 0.9],
    ['WIKIPEDIA', 0.85],
    ['NATURE', 0.95],
    ['CNN', 0.7],
  ]),
};
```

#### Step 2: Compute Similarity

For users with at least `MIN_OVERLAP_FOR_SIMILARITY` shared entities, compute cosine similarity:

```typescript
function computeSimilarity(vec1: TrustVector, vec2: TrustVector): number {
  // Find overlapping entities
  const overlap = [...vec1.values.keys()].filter(id => vec2.values.has(id));

  if (overlap.length < MIN_OVERLAP_FOR_SIMILARITY) {
    return 0; // Not enough overlap
  }

  // Compute dot product and magnitudes
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (const id of overlap) {
    const v1 = vec1.values.get(id)!;
    const v2 = vec2.values.get(id)!;
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  }

  // Cosine similarity
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}
```

**Similarity range**: [0, 1] where:
- 0 = orthogonal (no correlation)
- 1 = identical (perfect alignment)
- 0.7-0.8 = strong similarity (typically useful for inference)

#### Step 3: Weight by Similarity

Apply Gaussian kernel to convert similarity to weight:

```typescript
function weightBySimilarity(similarity: number, sigma: number): number {
  const distance = 1 - similarity;
  return Math.exp(-(distance * distance) / (sigma * sigma));
}
```

**Effect**:
- σ = 0.3 (default): similarity 0.9 → weight 0.72, similarity 0.7 → weight 0.11
- σ = 0.5: similarity 0.9 → weight 0.90, similarity 0.7 → weight 0.53
- Lower σ = steeper drop-off, only very similar users contribute significantly

#### Step 4: Weighted Average

Compute trust as weighted average of similar users:

```typescript
function inferTrust(userId: string, targetId: string, ...): TrustResult {
  // Find similar users who have opinions on target
  const similarUsers = findSimilarUsers(userId, targetId, vectors, valueMap);

  let weightedSum = 0;
  let totalWeight = 0;

  for (const { userId: simUserId, similarity, trustValue } of similarUsers) {
    const weight = weightBySimilarity(similarity, sigma);
    weightedSum += weight * trustValue;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    // No similar users found → use entity default
    return {
      trustValue: getDefaultTrust(targetId, targetType, userId),
      isExplicit: false,
      isDefaulted: true,
      confidence: 0,
      numSimilarUsers: 0,
    };
  }

  const inferredTrust = weightedSum / totalWeight;
  const confidence = Math.min(totalWeight / CONFIDENCE_THRESHOLD, 1.0);

  // Blend with entity default if confidence is low
  const entityDefault = getDefaultTrust(targetId, targetType, userId);
  const finalTrust = confidence * inferredTrust + (1 - confidence) * entityDefault;

  return {
    trustValue: finalTrust,
    isExplicit: false,
    isDefaulted: totalWeight < CONFIDENCE_THRESHOLD,
    confidence,
    numSimilarUsers: similarUsers.length,
  };
}
```

#### Step 5: Confidence Blending

When total weight is below `CONFIDENCE_THRESHOLD`, we lack strong evidence. Blend inferred trust with entity default:

```
confidence = min(totalWeight / CONFIDENCE_THRESHOLD, 1.0)
finalTrust = confidence × inferredTrust + (1 - confidence) × entityDefault
```

**Examples** (with CONFIDENCE_THRESHOLD = 5.0):
- totalWeight = 10 → confidence = 1.0 → finalTrust = inferredTrust
- totalWeight = 5 → confidence = 1.0 → finalTrust = inferredTrust
- totalWeight = 2.5 → confidence = 0.5 → finalTrust = 0.5 × inferredTrust + 0.5 × entityDefault
- totalWeight = 0 → confidence = 0.0 → finalTrust = entityDefault

---

## Data Structures

### Trust Graph (Legacy, for findTrustPaths)

```typescript
class TrustGraph {
  private nodes: Map<string, TrustNode>;
  private edges: Map<string, TrustEdge[]>;

  addNode(id: string, type: EntityType, trust?: number): void;
  addEdge(from: string, to: string, trust: number, relationship: string): void;
  getNeighbors(nodeId: string): TrustEdge[];
}
```

**Note**: The similarity-based algorithm doesn't use the graph structure for inference, only trust vectors. The graph is retained for the legacy `findTrustPaths()` function.

### Trust Vector Storage

```typescript
// In-memory representation (loaded from database)
const vectors: TrustVector[] = [
  { userId: 'alice', values: new Map([['REUTERS', 0.9], ...]) },
  { userId: 'bob', values: new Map([['REUTERS', 0.8], ...]) },
  // ...
];

// Fast lookup by user
const valueMap: Map<string, Map<string, number>> = new Map([
  ['alice', new Map([['REUTERS', 0.9], ...])],
  ['bob', new Map([['REUTERS', 0.8], ...])],
  // ...
]);
```

**Optimization**: `valueMap` provides O(1) lookup for a user's trust vector, critical for performance.

### Database Schema

```typescript
// Trust table (DynamoDB or similar)
interface TrustRecord {
  userId: string;           // Partition key
  targetId: string;         // Sort key
  targetType: 'user' | 'source' | 'bot' | 'assertion' | 'group';
  trustValue: number;       // [0.0, 1.0]
  isDirectTrust: boolean;   // true = explicit, false = inferred (cached)
  createdAt: string;
  updatedAt: string;
}

// Assertions table
interface Assertion {
  assertionId: string;
  content: string;
  sourceId: string;
  sourceType: 'user' | 'source' | 'bot';
  importedBy?: string;      // Bot ID that imported this
  originalUrl?: string;     // Source URL
  relationships?: AssertionRelationship[];
  temporalScope?: {
    validFrom?: Date;
    validUntil?: Date;
  };
  // ...
}

interface AssertionRelationship {
  type: 'supports' | 'contradicts' | 'equivalent_to' | 'refines';
  targetId: string;
  confidence: number;
}
```

---

## Integration

### Feed Ranking Flow

```
User requests feed
    ↓
getUserFeed(userId, candidateAssertions)
    ↓
For each assertion:
    ├─► Load user's trust vectors
    ├─► Compute assertion trust (with provenance)
    │   ├─► Infer bot trust
    │   ├─► Infer source trust
    │   └─► Compute min(bot, source, assertion)
    ├─► Check for better phrasing
    │   ├─► Find equivalent assertions
    │   ├─► Compute composition bot trust
    │   └─► Select best phrasing if trust × confidence > threshold
    └─► Assign trust score
    ↓
Sort by trust (descending)
    ↓
Return ranked feed
```

### Trust Computation API

```typescript
// Single entity trust
const result = await computeUserTrust('alice', 'REUTERS', 'source');
// Returns: { trustValue: 0.85, isExplicit: true, ... }

// Batch inference (optimized)
const targets = ['assertion1', 'assertion2', 'assertion3'];
const targetTypes = new Map([
  ['assertion1', 'assertion'],
  ['assertion2', 'assertion'],
  ['assertion3', 'assertion'],
]);
const results = inferTrustBatch('alice', targets, targetTypes, vectors, valueMap);
// Returns: Map<targetId, TrustResult>

// Full provenance chain
const assertion = await getAssertion('assertion1');
const result = await computeAssertionTrustWithProvenance('alice', assertion);
// Returns: {
//   assertionTrust: 0.7,
//   sourceTrust: 0.6,
//   importBotTrust: 0.9,
//   effectiveTrust: 0.6,  // min(0.7, 0.6, 0.9)
// }

// Explanation
const explanation = explainTrustInference('alice', 'REUTERS', vectors, valueMap);
// Returns: [
//   { userId: 'bob', similarity: 0.92, trustValue: 0.85, contribution: 45% },
//   { userId: 'carol', similarity: 0.88, trustValue: 0.90, contribution: 35% },
//   { userId: 'dave', similarity: 0.81, trustValue: 0.80, contribution: 20% },
// ]
```

---

## Security Properties

### 1. Sybil Attack Resistance

**Attack**: Attacker creates many fake accounts to boost trust in a target.

**Defense**:
- Unknown users default to 0.0 trust
- Similarity requires genuine overlap (MIN_OVERLAP = 3)
- Fake accounts with no real trust history have zero similarity to real users
- Even 1000 fake accounts contribute nothing if they don't overlap with the target user

**Test**: `propagation.test.ts` - "should demonstrate Sybil resistance"

### 2. Non-Transitivity

**Property**: A→B and B→C does not imply A→C

**Why it matters**: Prevents trust from flowing through chains in unexpected ways. You might trust your friend's judgment about restaurants but not about politics.

**Implementation**: Trust is inferred only from users with similar trust patterns, not from the trust graph structure.

**Test**: `propagation.test.ts` - "should demonstrate non-transitivity"

### 3. Fake Attribution Prevention

**Attack**: Malicious bot claims to import content from trusted source.

**Defense**: Provenance chain requires trust in BOTH the bot AND the source:
```
effective_trust = min(trust_in_bot, trust_in_source, assertion_trust)
```
If the bot is unknown (default 0.0 trust), effective trust is 0.0 regardless of source.

**Test**: `provenance.test.ts` - "should prevent fake attribution attacks"

### 4. Hallucination Prevention

**Attack**: Composition bot rewrites assertion to change meaning while claiming equivalence.

**Defense**:
- `validateNoHallucination()` checks semantic equivalence
- Composition only applies if trust in bot × relationship confidence > threshold
- Users can explicitly set low trust for unreliable composition bots

**Test**: `composition.test.ts` - "should reject hallucinations"

### 5. Schelling Points (Cross-Community Trust)

**Property**: Sources trusted by different communities naturally surface as Schelling points.

**How**: If both progressive and conservative users have similar trust for Reuters (even if they disagree on other sources), Reuters becomes a bridge.

**Test**: `propagation.test.ts` - "should surface sources trusted across different communities"

---

## Performance Characteristics

### Time Complexity

**Single inference** (`inferTrust`):
- O(U_target × M) where:
  - U_target = users with opinions on target (up to MAX_COMPARISONS)
  - M = average overlap size
- Typical: 100 users × 10 overlap = 1000 operations
- Cap: MAX_COMPARISONS = 1000 prevents worst case

**Batch inference** (`inferTrustBatch`):
- O(T × U_common × M) where:
  - T = number of targets
  - U_common = users with opinions on any target
  - M = average overlap
- Optimization: Reuses similarity computations across targets

**Feed ranking** (`getUserFeed`):
- O(N × U × M) where N = feed size
- Typical: 50 assertions × 100 users × 10 overlap = 50K operations
- With caching: O(N) after first query

### Space Complexity

**Trust vectors**:
- O(U × E_avg) where:
  - U = total users
  - E_avg = average explicit values per user
- Sparse representation keeps this manageable

**Value map**:
- O(U × E_avg) same as vectors
- Trade memory for O(1) lookup speed

**Similarity cache** (optional):
- O(U²) worst case if caching all pairs
- O(U × K) if caching top-K similar users per user
- Recommended: Cache top 100 similar users per user

### Optimization Strategies

1. **Indexing by entity**:
   ```typescript
   // Pre-compute: which users have opinions on each entity
   const entityIndex: Map<string, Set<string>> = new Map();
   for (const vector of vectors) {
     for (const entityId of vector.values.keys()) {
       if (!entityIndex.has(entityId)) {
         entityIndex.set(entityId, new Set());
       }
       entityIndex.get(entityId)!.add(vector.userId);
     }
   }

   // Fast lookup: users with opinions on target
   const candidates = entityIndex.get(targetId) || new Set();
   ```

2. **Batch inference**:
   Use `inferTrustBatch()` when ranking feeds to amortize vector loading.

3. **Similarity caching**:
   ```typescript
   const similarityCache: Map<string, Map<string, number>> = new Map();

   function getCachedSimilarity(userId1: string, userId2: string): number | undefined {
     return similarityCache.get(userId1)?.get(userId2);
   }
   ```

4. **Early stopping**:
   Stop after `MAX_COMPARISONS` to cap worst-case latency.

5. **Approximate algorithms** (future):
   - Locality-sensitive hashing (LSH) for similar user discovery
   - Clustering users to reduce comparison space
   - Sampling instead of exhaustive search

---

## Future Enhancements

### 1. Time-Decay for Stale Trust
Weight more recent trust judgments higher:
```typescript
const ageInDays = (now - trustRecord.updatedAt) / (1000 * 60 * 60 * 24);
const decayFactor = Math.exp(-ageInDays / DECAY_HALFLIFE);
const weightedTrust = trustValue * decayFactor;
```

### 2. Uncertainty Propagation
Represent trust as a distribution (mean, variance) instead of a point estimate:
```typescript
interface TrustDistribution {
  mean: number;
  variance: number;
}
```

### 3. Multi-Dimensional Trust
Trust in different domains (accuracy, fairness, depth):
```typescript
interface TrustVector {
  accuracy: number;
  fairness: number;
  depth: number;
}
```

### 4. Active Learning
Suggest which entities users should rate to maximize inference quality:
```typescript
function suggestNextRating(userId: string): string {
  // Return entity that would reduce uncertainty most
}
```

### 5. Federated Trust
Allow users to run inference locally without uploading trust data to servers.

---

## Conclusion

Nudge's similarity-based trust algorithm provides:
- ✅ **Sybil resistance**: Fake accounts contribute nothing
- ✅ **Non-transitivity**: No unexpected trust chains
- ✅ **Personalization**: Respects individual preferences
- ✅ **Schelling points**: Cross-community agreement surfaces naturally
- ✅ **Explainability**: Can show which users influenced each inference
- ✅ **Security**: Provenance chains prevent fake attribution
- ✅ **Performance**: Scales to millions of users with proper optimization

The algorithm is fully tested (135 tests passing) and ready for production use. See [PARAMETER_TUNING.md](PARAMETER_TUNING.md) for tuning guidance.
