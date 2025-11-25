# Nudge Platform: Design Specification for Implementation

**Purpose**: This document specifies the intended design for the trust-based knowledge platform. Claude Code should use this to understand what changes are needed to align the current codebase with the design vision.

**Approach**: This document describes WHAT the system should do and WHY. Claude Code should determine HOW to implement it and plan the implementation steps.

---

## 1. Core Philosophy

### 1.1 Trust Is Personal, Not Universal

The system does NOT try to determine what is universally trustworthy. Instead, it discovers what a specific individual is likely to trust based on their existing trust patterns and the patterns of similar users.

Key principle: "What do people like me trust?" — NOT "What do my trusted sources trust?"

### 1.2 Echo Chambers Are Acceptable

Users naturally form trust bubbles. The platform respects this while providing tools to explore outside the bubble (threshold adjustment). Communities that share no trusted sources may be mutually invisible to each other — this is correct behavior, not a bug.

### 1.3 Bridge-Building Through Choice

The platform should encourage (not force) users to occasionally lower their trust threshold to see the strongest arguments from perspectives they don't usually trust. The goal is showing users the other side's most compelling content, not their most extreme.

---

## 2. Trust Algorithm: Diffusion in Trust Space

### 2.1 The Problem With the Current Algorithm

The current codebase uses PageRank-style graph propagation:

```
Trust flows along edges: A → B → C
Result: A trusts C because A trusts B who trusts C
```

This is WRONG for the platform's goals because:
- It's transitive (creates trust chains)
- It creates mathematical barriers between communities (damping factor causes exponential decay)
- It doesn't find "people like me"
- It can't discover Schelling points (sources trusted across communities)
- It doesn't scale (O(N*M) per trust change)

### 2.2 The Correct Algorithm: Similarity-Based Diffusion

Trust should be inferred based on similarity in trust space, not graph distance.

**Core Model**:
```
Trust_i(T) = Σ_j [ similarity(i,j) * Trust_j(T) ] / Σ_j similarity(i,j)

where similarity(i,j) = exp(-distance(i,j)² / σ²)  [Gaussian kernel]
```

**Intuition**: Users who trust similar things are "nearby" in trust space. Trust inference is a weighted average of nearby users' opinions, where "nearby" means "has similar trust patterns."

**Key Properties**:
- NOT transitive: Influence is based on similarity, not paths
- Finds "people like me": Explicit goal of the algorithm
- Discovers Schelling points: Sources trusted by multiple communities naturally surface
- Scalable: O(N) naive, O(log N) with ANN data structures

### 2.3 Similarity Metric

Use cosine similarity on overlapping trust values:

```python
def compute_similarity(user_i, user_j):
    # Get entities both users have explicitly set trust for
    overlap = intersection(user_i.trust_keys, user_j.trust_keys)
    
    if len(overlap) < MIN_OVERLAP:  # Suggest: MIN_OVERLAP = 3
        return 0  # Not enough shared basis to judge similarity
    
    # Cosine similarity on overlapping dimensions only
    dot_product = sum(user_i[k] * user_j[k] for k in overlap)
    norm_i = sqrt(sum(user_i[k]² for k in overlap))
    norm_j = sqrt(sum(user_j[k]² for k in overlap))
    
    return dot_product / (norm_i * norm_j)
```

### 2.4 Diffusion Algorithm

```python
def infer_trust(user_id, target_id):
    # 1. Check for explicit trust (always wins)
    explicit = get_explicit_trust(user_id, target_id)
    if explicit is not None:
        return explicit
    
    # 2. Get user's trust vector
    user_vector = get_user_trust_vector(user_id)
    
    # 3. Find users who have opinions on target
    users_with_opinion = get_users_with_trust_on(target_id)
    
    # 4. Compute similarity-weighted average
    total_weight = 0
    weighted_sum = 0
    
    for other_user in users_with_opinion:
        other_vector = get_user_trust_vector(other_user.id)
        
        # Gaussian kernel for similarity
        distance = compute_distance(user_vector, other_vector)
        similarity = exp(-distance² / σ²)  # σ is bandwidth parameter
        
        weighted_sum += similarity * other_user.trust[target_id]
        total_weight += similarity
    
    # 5. Compute diffused trust with confidence blending
    if total_weight < CONFIDENCE_THRESHOLD:
        # Not enough similar users with opinions
        return get_entity_default_trust(target_id)
    
    diffused = weighted_sum / total_weight
    
    # 6. Blend with entity default based on confidence
    confidence = min(1.0, total_weight / CONFIDENCE_THRESHOLD)
    default = get_entity_default_trust(target_id)
    
    return confidence * diffused + (1 - confidence) * default
```

### 2.5 Bandwidth Parameter (σ)

The σ parameter controls diffusion spread:
- Large σ: Wide diffusion, many users influence each other
- Small σ: Narrow diffusion, only very similar users influence

**Initial approach**: Start with a fixed heuristic (e.g., σ = 0.3) or estimate from data using Silverman's rule: `σ = median_pairwise_distance * N^(-1/5)`

This is a tunable parameter, not an architectural decision.

### 2.6 Scalability Path

The algorithm should be implemented to allow future optimization:

| Scale | Approach | Complexity |
|-------|----------|------------|
| 100 users | Naive: compare to all users | O(N) |
| 10K users | LSH: hash to buckets, compare within | O(k) |
| 100K+ users | ANN: approximate nearest neighbors | O(log N) |

For the POC, naive O(N) is acceptable. The architecture should not preclude later optimization.

---

## 3. Trust Value Semantics

### 3.1 Trust Scale

Trust values are in the range [0, 1]:

| Value | Meaning | System Behavior |
|-------|---------|-----------------|
| **Not set** | User hasn't considered this entity | Infer via diffusion |
| **0.0** | Active distrust | Exclude from view; do not infer |
| **0.5** | Explicit neutral / no opinion yet | Use as-is; do not override with inference |
| **1.0** | Full trust | Include in view; do not infer |

**Critical distinction**: An explicit value of 0.5 is different from "not set." Explicit 0.5 means "I've considered this and choose to be neutral" — the system should NOT try to infer a different value.

### 3.2 Entity-Type Default Trust Values

When diffusion cannot infer a value (no similar users with opinions), fall back to entity-type defaults:

| Entity Type | Default Trust | Rationale |
|-------------|---------------|-----------|
| Unknown/random user | 0.0 | Must earn trust; prevents Sybil attacks |
| Official import bot | 0.5 | Semi-trusted conduit for content |
| Composition/editorial bot | 0.5 | Semi-trusted for editorial judgment |
| Well-known sources (Wikipedia, major news) | 0.5 | Bootstrap visibility for new users |
| User's own content | 1.0 | Users trust themselves |

**Implementation**: Each entity should have a `defaultTrust` field based on its type. This replaces the single `DEFAULT_TRUST_VALUE` constant.

```typescript
function getDefaultTrust(entityId: string, entityType: string): number {
  if (entityType === 'user' && entityId === currentUserId) return 1.0;
  if (OFFICIAL_BOTS.includes(entityId)) return 0.5;
  if (WELL_KNOWN_SOURCES.includes(entityId)) return 0.5;
  if (entityType === 'user') return 0.0;  // Unknown users
  return 0.0;  // Unknown entities
}
```

### 3.3 Security Implications

With DEFAULT_TRUST_VALUE = 0.0 for unknown users:
- **Sybil attacks fail**: 10,000 fake accounts each contribute 0 weight to diffusion
- **Trust laundering fails**: Intermediaries can't bootstrap trust from nothing
- **Gaming resistance**: Must earn trust through real user endorsement

---

## 4. Provenance Chain

### 4.1 The Problem

Currently, anyone can claim `sourceId: "NEW_YORK_TIMES"` on an assertion. There's no verification that content actually came from that source.

### 4.2 The Solution: Bot Vouching

Import bots explicitly vouch for source attribution:

```
User → trusts → Import Bot → vouches for → Source → asserts → Assertion
```

**Data model**:
```typescript
interface Assertion {
  id: string;
  content: string;
  
  // Direct source (who made this claim)
  sourceId: string;
  sourceType: 'user' | 'source' | 'bot';
  
  // Provenance (who vouched for the attribution)
  importedBy?: string;  // Bot ID that imported this
  originalUrl?: string;  // Where it came from
  
  // ... other fields
}
```

**Trust calculation for imported content**:
```
effective_trust = min(trust_in_bot, trust_in_source)
```

If a user trusts NYT (0.9) but distrusts IMPORT_BOT_NEWS (0.3), they see NYT content at 0.3. This allows users to trust sources while distrusting the import mechanism (e.g., preferring their own scraper).

### 4.3 User Choice on Official Systems

Users can choose to distrust official bots entirely. A "paranoid user" might:
1. Set IMPORT_BOT_OFFICIAL to 0.0
2. Run their own import bot
3. Trust their own bot at 0.8
4. See content through their own trusted pipeline

The system must support this use case.

---

## 5. Assertion Model

### 5.1 Core Assertion Structure

```typescript
interface Assertion {
  id: string;
  content: string;  // Natural language statement
  
  // Source and provenance
  sourceId: string;
  sourceType: 'user' | 'source' | 'bot';
  importedBy?: string;
  originalUrl?: string;
  extractedFrom?: string;  // Parent document ID
  
  // Classification
  assertionType: 'factual' | 'opinion' | 'prediction' | 'attributed_claim';
  topics: string[];
  temporalScope?: { start: Date; end?: Date };
  
  // Relationships to other assertions
  relationships: Array<{
    type: 'supports' | 'contradicts' | 'elaborates' | 'cites' | 'updates' | 'equivalent_to';
    targetId: string;
    confidence: number;
  }>;
  
  // For semantic search
  embedding?: number[];
}
```

### 5.2 The Equivalence Relationship

A special relationship type `equivalent_to` enables editorial improvements without losing provenance.

**Use cases**:
- LLM rephrases for better flow: `COMPOSITION_BOT` asserts equivalence
- Human editor improves wording: `user@editor` asserts equivalence
- Translation: `TRANSLATION_BOT_ES` asserts equivalence
- Simplification: `SIMPLIFICATION_BOT` asserts equivalence

**Example**:
```
Original assertion (from Reuters):
  id: "a1"
  content: "The company's Q3 earnings exceeded analyst expectations by 12%"
  sourceId: "REUTERS"

Equivalence assertion (from composition bot):
  id: "a2"
  content: "Q3 earnings beat forecasts by 12%"
  sourceId: "COMPOSITION_BOT"
  relationships: [{ type: 'equivalent_to', targetId: 'a1', confidence: 0.95 }]
```

**Trust for equivalence**:
```
effective_trust = min(trust_in_original_source, trust_in_editor)
```

Users who don't trust the composition bot see the original phrasing. Users who do see the improved version.

### 5.3 Non-Transitive Equivalence

Equivalences are NOT transitive. If A≡B and B≡C, that does NOT mean A≡C.

**Rationale**: 
- Prevents meaning drift through chains
- Keeps provenance simple (always one hop to original)
- Makes debugging "why does this say this?" straightforward

The composition bot should always assert equivalence against the ORIGINAL assertion, not against another equivalence.

---

## 6. Article Composition

### 6.1 Overview

Articles are dynamically composed from assertions weighted by user trust. The LLM's role is editorial (arrangement, transitions, conflict presentation), not inventive.

### 6.2 Composition Pipeline

```
1. Query: User requests topic (e.g., "US Economy 2024")
   ↓
2. Retrieval: Semantic search for relevant assertions
   ↓
3. Trust filtering: Remove assertions below user's threshold
   ↓
4. Phrasing selection: For each assertion, pick best trusted equivalence
   ↓
5. Conflict detection: Identify contradicting assertion pairs
   ↓
6. Structure planning: Cluster by subtopic, order logically
   ↓
7. LLM composition: Generate coherent article from assertion set
```

### 6.3 Phrasing Selection

```python
def get_best_phrasing(assertion_id, user_trust_context):
    original = get_assertion(assertion_id)
    equivalences = get_equivalences(assertion_id)
    
    # Filter to equivalences the user trusts
    trusted = [eq for eq in equivalences 
               if get_user_trust(user_id, eq.source_id) >= threshold]
    
    if not trusted:
        return original.content
    
    # Pick highest-trusted equivalence
    best = max(trusted, key=lambda eq: get_user_trust(user_id, eq.source_id))
    return best.content
```

### 6.4 Composition Constraints

The LLM composition prompt should constrain the model to:
- Use ONLY the provided assertions as factual content
- Add only transitions, structure, and flow — no new claims
- Present conflicts fairly with attribution to both sides
- Not hallucinate facts beyond the assertion set

---

## 7. Parameters to Remove or Change

### 7.1 Remove: openMindedness

The `openMindedness` parameter should be removed entirely. It is conceptually just `1 - threshold`. Only `threshold` should exist.

High threshold = restrictive (low open-mindedness)
Low threshold = exploratory (high open-mindedness)

### 7.2 Change: DEFAULT_TRUST_VALUE

The single constant `DEFAULT_TRUST_VALUE = 0.5` should be replaced with entity-type-specific defaults as described in Section 3.2.

The fallback for truly unknown entities should be 0.0, not 0.5.

---

## 8. Entities That Receive Trust

Trust can be set on four entity types:

1. **Assertions**: Individual claims/statements
2. **Users**: People using the platform  
3. **Sources**: External entities (Wikipedia, NYT, academic journals, etc.)
4. **Groups**: Collections of users or sources (can be explicit or emergent)

All four types participate in the trust graph and can be trusted/distrusted by users.

---

## 9. Summary of Required Changes

### Critical (Security)
1. Replace `DEFAULT_TRUST_VALUE = 0.5` with entity-type-specific defaults
2. Default unknown users to 0.0
3. Implement provenance chain (import bot vouching)

### Critical (Algorithm)
4. Replace PageRank-style propagation with diffusion-based similarity inference
5. Implement cosine similarity on overlapping trust values
6. Add Gaussian kernel weighting for trust inference

### Important (Cleanup)
7. Remove `openMindedness` parameter entirely
8. Add `equivalent_to` relationship type for editorial assertions
9. Ensure equivalences are non-transitive (always point to original)

### Architecture
10. Store `defaultTrust` per entity based on type
11. Ensure explicit trust values (including 0.5) are never overwritten by inference
12. Structure composition pipeline to use phrasing selection

---

## 10. Validation Criteria

The implementation should satisfy these properties:

### Trust Algorithm
- [ ] Users with similar trust patterns get similar inferred values
- [ ] Trust is NOT transitive (A trusts B, B trusts C does NOT imply A trusts C)
- [ ] Schelling points emerge (sources trusted by multiple communities surface)
- [ ] Sybil attacks fail (fake users with default 0.0 contribute nothing)

### Provenance
- [ ] Fake attribution is impossible (can't claim sourceId without bot vouching)
- [ ] Users can distrust official bots and use alternatives
- [ ] Editorial changes (equivalences) are visible and trustable

### Composition
- [ ] Users with different trust see different article content
- [ ] Conflicts are presented fairly, not hidden
- [ ] LLM cannot introduce facts not in the assertion set

---

*End of specification. Claude Code should use this to understand the design intent and plan implementation accordingly.*
