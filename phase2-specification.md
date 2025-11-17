# Trust-Based Knowledge Platform - Phase 2 Specification
## AWS Deployment for Multi-User Demo

**Version:** 2.0  
**Phase:** Multi-user deployment (12 users)  
**Target:** Working demo on AWS with all 5 interface views  
**Based on:** Phase 1 PoC specification

---

## Executive Summary

Phase 2 takes the Phase 1 proof-of-concept and deploys it as a working multi-user system on AWS. The goal is to support ~12 users with all 5 interface views (Wiki, News, Chat, Social, Forum) operational, real authentication, content import pipelines, and user-authored content (blogs, tweets). This phase prioritizes functionality and user experience over scalability.

**Key Additions from Phase 1:**
- Multi-user authentication and authorization
- User-specific trust networks and personalization
- Content import from Wikipedia and news sources
- User content authoring (blogs and tweets)
- Polished frontend with appealing UX
- AWS serverless deployment (SAM)
- Claude API integration for all LLM operations

**Explicitly Out of Scope:**
- Horizontal scaling beyond ~12 users
- Performance optimization
- Production security hardening
- Mobile apps
- Advanced analytics
- Monetization features

---

## Architecture Overview

### Deployment Model: AWS Serverless (SAM)

**Why Serverless:**
- Cost-effective for 12 users (pay per use)
- No infrastructure management
- Auto-scaling within acceptable limits
- Fast deployment iteration

**Core AWS Services:**
- **Lambda**: All backend logic
- **API Gateway**: REST API with Cognito auth
- **Cognito**: User authentication and management
- **DynamoDB**: Primary data store (assertions, trust, users)
- **S3**: Frontend hosting and file storage
- **CloudFront**: CDN for frontend (optional but recommended)
- **EventBridge**: Async job triggers
- **CloudWatch**: Logging and monitoring

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  React SPA hosted on S3 + CloudFront                        │
│  - WikiView, NewsView, ChatView, SocialView, ForumView     │
│  - TrustUI components, ContentEditor, Authentication       │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────────────────────┐
│                    API GATEWAY                               │
│  REST API with Cognito Authorizer                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                   LAMBDA FUNCTIONS                           │
│                                                              │
│  AUTH & USER:                                               │
│  - UserProfile (GET/PUT profile, preferences)               │
│                                                              │
│  CORE DATA:                                                 │
│  - AssertionCRUD (create, read, update assertions)          │
│  - TrustOperations (set/get trust values)                   │
│  - TrustPropagation (async trust calculation)               │
│                                                              │
│  CONTENT CREATION:                                          │
│  - BlogAuthor (user writes blog -> extract assertions)      │
│  - TweetAuthor (user posts tweet -> create assertion)       │
│                                                              │
│  CONTENT IMPORT:                                            │
│  - WikiImport (scrape Wikipedia -> extract assertions)      │
│  - NewsImport (RSS/scrape news -> extract assertions)       │
│                                                              │
│  VIEW QUERIES (one per interface):                          │
│  - WikiQuery (topic-based knowledge browser)                │
│  - NewsQuery (time-ordered feed)                            │
│  - ChatQuery (LLM Q&A with trust context)                   │
│  - SocialQuery (trust-filtered social feed)                 │
│  - ForumQuery (threaded discussions)                        │
│                                                              │
│  CONTENT GENERATION:                                        │
│  - ArticleGenerator (Claude API -> assembled articles)      │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                      DYNAMODB                                │
│  - UsersTable (profiles, preferences)                       │
│  - AssertionsTable (all assertions + metadata)              │
│  - TrustRelationshipsTable (user -> entity -> trust value)  │
│  - GeneratedContentCache (cached articles per user)         │
│  - ImportJobsTable (track import status)                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
│  - Anthropic Claude API (assertion extraction, generation)  │
│  - Wikipedia API (article content)                          │
│  - RSS feeds (news sources)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication & User Management

### Cognito User Pool Configuration

**Sign-up Flow:**
- Self-service registration via email
- Email verification required
- Password requirements: min 8 chars, mixed case, numbers
- No admin approval needed

**User Attributes:**
```typescript
{
  email: string         // Primary identifier, verified
  sub: string          // Cognito UUID, used as userId in system
  email_verified: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

**Session Management:**
- JWT tokens (ID token, access token, refresh token)
- Frontend stores tokens in localStorage
- API Gateway validates tokens on every request
- Token expiry: 1 hour (configurable)

### Authorization Model

**Principle:** Users can only modify their own data.

**Permission Rules:**
- Users can create assertions (blogs, tweets, trust relationships)
- Users can read all assertions (filtered by their trust network)
- Users can only update/delete their own assertions
- Users can only modify their own trust values
- Users can only access their own profile

**Implementation:**
- API Gateway authorizer extracts userId from JWT
- Lambda functions receive userId in event context
- DynamoDB queries include userId in key conditions
- No row-level security needed (DynamoDB doesn't support it anyway)

---

## Data Model (DynamoDB Schema)

### Design Principles

**Why DynamoDB:**
- Serverless, managed
- Excellent for key-value and simple queries
- Cost-effective at this scale
- Flexible schema (good for evolving assertions)

**Access Patterns to Support:**
1. Get user profile by userId
2. Get all assertions by a specific source
3. Get all assertions of a specific type
4. Get trust value for user+target
5. Get all trust relationships for a user
6. Get all users who trust a specific assertion/source
7. Get cached article for user+topic
8. Get import job status

### UsersTable

```typescript
// Primary Key
PK: "USER#<userId>"          // Cognito sub
SK: "PROFILE"

// Attributes
{
  userId: string              // Cognito sub (UUID)
  email: string               
  displayName: string
  bio?: string
  
  // Preferences
  defaultTrustThreshold: number      // 0.5
  openMindedness: number             // 0.1 = narrow, 0.9 = very open
  showControversySignals: boolean    // true
  showAlternateViews: boolean        // true
  
  // View preferences
  defaultView: "wiki" | "news" | "chat" | "social" | "forum"
  
  // Metadata
  createdAt: timestamp
  updatedAt: timestamp
  lastLoginAt: timestamp
}

// Access pattern: GetItem with PK+SK
```

### AssertionsTable

```typescript
// Primary Key
PK: "ASSERTION#<assertionId>"
SK: "VERSION#<timestamp>"     // Enables versioning if needed

// Attributes
{
  assertionId: string          // UUID
  version: number              // 1, 2, 3... (for future edits)
  
  // Content
  type: AssertionType          // See enum below
  content: string | object     // Text or structured data
  
  // Attribution
  sourceId: string             // userId or "WIKIPEDIA" or "NYT" etc
  sourceType: "user" | "bot" | "import"
  authorUserId?: string        // If type=blog or tweet
  
  // Metadata
  topic?: string[]             // For wiki organization
  publishedAt?: timestamp      // For news/social feeds
  url?: string                 // If imported from web
  extractedFrom?: string       // Parent assertionId if extracted
  
  // Timestamps
  createdAt: timestamp
  updatedAt: timestamp
}

// AssertionType enum
enum AssertionType {
  FACTUAL = "factual"          // "Fed raised rates to 5.5%"
  TRUST = "trust"              // "Alice trusts NYT at 0.8"
  EQUIVALENCE = "equivalence"  // "X means same as Y"
  ORDERING = "ordering"        // "Fact A before Fact B"
  EVIDENTIAL = "evidential"    // "Study supports claim"
  ATTRIBUTION = "attribution"  // "Source X says Y"
  BLOG = "blog"                // User-authored long-form
  TWEET = "tweet"              // User-authored short-form
  WIKI_IMPORT = "wiki_import"  // From Wikipedia
  NEWS_IMPORT = "news_import"  // From news source
}

// GSI1: Query by source
GSI1PK: "SOURCE#<sourceId>"
GSI1SK: "CREATED#<timestamp>"

// GSI2: Query by type
GSI2PK: "TYPE#<type>"
GSI2SK: "CREATED#<timestamp>"

// GSI3: Query by topic (for wiki view)
GSI3PK: "TOPIC#<topic>"
GSI3SK: "CREATED#<timestamp>"
```

### TrustRelationshipsTable

```typescript
// Primary Key
PK: "USER#<userId>"
SK: "TARGET#<targetId>"       // assertionId or sourceId

// Attributes
{
  userId: string               // Who is doing the trusting
  targetId: string             // What is being trusted
  targetType: "assertion" | "source" | "user"
  
  trustValue: number           // 0.0 to 1.0
  isDirectTrust: boolean       // true if user set it, false if propagated
  
  // If propagated
  propagatedFrom?: string[]    // List of sourceIds that influenced this
  propagationConfidence?: number  // How certain we are (0-1)
  
  // Metadata
  lastUpdated: timestamp
  notes?: string               // User's optional note on why
}

// Access patterns:
// 1. GetItem: Get trust for user+target
// 2. Query with PK: Get all trust for a user
// 3. Query with GSI1: Find who trusts a target

// GSI1: Query by target (reverse lookup)
GSI1PK: "TARGET#<targetId>"
GSI1SK: "USER#<userId>"
```

### GeneratedContentCache

```typescript
// Primary Key
PK: "USER#<userId>"
SK: "CONTENT#<contentType>#<contentId>"

// Attributes
{
  userId: string
  contentType: "wiki_article" | "news_feed" | "chat_response"
  contentId: string            // Topic name, query hash, etc
  
  generatedContent: string     // The actual text
  assertionIds: string[]       // Which assertions were used
  
  // Cache metadata
  trustSnapshot: object        // Trust values at generation time
  generatedAt: timestamp
  expiresAt: timestamp         // TTL for DynamoDB auto-delete
  
  // Stats
  claudeTokensUsed: number
  generationTimeMs: number
}

// TTL: 24 hours (auto-delete stale cache)
```

### ImportJobsTable

```typescript
// Primary Key
PK: "JOB#<jobId>"
SK: "STATUS"

// Attributes
{
  jobId: string                // UUID
  userId: string               // Who initiated import
  
  jobType: "wiki" | "news"
  source: string               // URL or feed identifier
  
  status: "pending" | "processing" | "completed" | "failed"
  progress: {
    totalItems: number
    processedItems: number
    failedItems: number
  }
  
  // Results
  extractedAssertionIds: string[]
  errorMessages?: string[]
  
  // Timestamps
  createdAt: timestamp
  startedAt?: timestamp
  completedAt?: timestamp
}

// GSI1: Query by user
GSI1PK: "USER#<userId>"
GSI1SK: "CREATED#<timestamp>"
```

---

## Trust Engine Specification

### Trust Propagation Algorithm

**Unchanged from Phase 1** except for multi-user considerations:

- Each user has their own trust network
- Trust propagation runs independently per user
- Cached results stored per user in GeneratedContentCache
- Invalidation triggers when user updates trust values

**Implementation Notes for Multi-User:**

```typescript
// Trust calculation is per-user
function computeUserTrust(
  userId: string,
  assertionId: string,
  graph: KnowledgeGraph
): number {
  // 1. Check direct trust first
  const directTrust = getTrustRelationship(userId, assertionId)
  if (directTrust !== null) {
    return directTrust.trustValue
  }
  
  // 2. Find all sources that made this assertion
  const sources = graph.getAssertionSources(assertionId)
  
  // 3. Weight by user's trust in each source
  let weightedSum = 0
  let totalWeight = 0
  
  for (const source of sources) {
    const sourceTrust = computeUserTrust(userId, source.id, graph)
    const sourceValue = source.assertionValue  // What source said about assertion
    
    weightedSum += sourceTrust * sourceValue
    totalWeight += sourceTrust
  }
  
  if (totalWeight === 0) {
    return DEFAULT_TRUST  // 0.5
  }
  
  const rawTrust = weightedSum / totalWeight
  
  // 4. Apply damping
  const α = DAMPING_FACTOR  // 0.7
  return α * rawTrust + (1 - α) * DEFAULT_TRUST
}
```

**Caching Strategy:**
- Pre-compute trust for all assertions when user logs in (async)
- Store in TrustRelationshipsTable with isDirectTrust=false
- Invalidate when user sets new trust value
- Rebuild incrementally (only affected subgraph)

**Performance:**
- For 12 users and ~10k assertions, full recomputation < 5 seconds
- Can be async (EventBridge trigger)
- Cache results for 24 hours unless trust changes

### Meta-Trust (Unchanged from Phase 1)

Trust relationships themselves are assertions:

```typescript
{
  type: "trust",
  content: {
    trustor: "USER#alice",
    trustee: "SOURCE#nyt", 
    value: 0.8
  },
  sourceId: "USER#alice",  // Alice made this claim
  sourceType: "user"
}
```

Other users can trust or distrust Alice's trust claims, enabling sincerity scoring and gaming resistance.

---

## Assertion Extraction & Content Generation

### Claude API Integration

**All LLM operations use Claude API:**
- Model: `claude-sonnet-4-20250514` for most operations
- Model: `claude-opus-4-20250514` for complex article generation (if needed)
- API Key: Stored in AWS Secrets Manager
- Rate limiting: 50 requests/minute (Anthropic's default)

### Assertion Extraction

**Use Cases:**
1. Import Wikipedia article -> extract factual assertions
2. Import news article -> extract claims and attributions
3. User writes blog -> extract key claims
4. User posts tweet -> create single assertion

**Extraction Prompt Template:**

```
Extract factual assertions from the following text. Each assertion should be:
- Atomic (one fact per assertion)
- Self-contained (understandable without context)
- Verifiable or falsifiable
- Attributed to the source if it's a claim rather than established fact

Text:
"""
{article_content}
"""

Return a JSON array of assertions:
[
  {
    "content": "The Federal Reserve raised interest rates to 5.5% in July 2023",
    "type": "factual",
    "confidence": 0.95,
    "topic": ["economics", "monetary policy"]
  },
  {
    "content": "According to Treasury Secretary Yellen, inflation is transitory",
    "type": "attribution",
    "confidence": 0.9,
    "attributedTo": "Janet Yellen",
    "topic": ["economics", "inflation"]
  }
]
```

**Post-Processing:**
- Create AssertionTable entry for each extracted assertion
- Link to source (extractedFrom = parent URL or blog post ID)
- Store in DynamoDB with source attribution

### Article Generation

**Use Case:** Generate trust-weighted article for user viewing Wiki

**Algorithm:**
1. User requests topic (e.g., "Federal Reserve")
2. Query AssertionsTable for all assertions tagged with topic
3. For each assertion, get user's trust value
4. Sort assertions by trust (descending)
5. Partition: high-trust (>threshold), low-trust (<threshold)
6. Call Claude with generation prompt

**Generation Prompt Template:**

```
You are writing a Wikipedia-style article on "{topic}" for a reader with specific trust preferences.

HIGH-TRUST FACTS (reader believes these, prioritize them):
{high_trust_assertions}

LOW-TRUST FACTS (reader is skeptical, include but present early for balance):
{low_trust_assertions}

Write a coherent, well-structured article that:
- Prioritizes high-trust facts in main narrative
- Places low-trust facts early (as is common in biased journalism)
- Maintains neutral, encyclopedic tone
- Cites sources for all claims
- Is 500-800 words

Article:
```

**Caching:**
- Store generated article in GeneratedContentCache
- Key: userId + topic
- TTL: 24 hours or until user's trust values change
- This avoids repeated Claude API calls for same query

**Cost Optimization:**
- Cache aggressively (most users will view same topics repeatedly)
- Batch extract (send multiple articles in one prompt where possible)
- Use streaming for long articles (better UX, same cost)

---

## Content Import Pipeline

### Wikipedia Import

**Trigger:** User initiates import via UI (provides Wikipedia URL)

**Workflow:**
```
1. User submits URL -> POST /api/import/wikipedia
2. Create ImportJobsTable entry (status: pending)
3. Lambda: WikiImportFunction triggered
4. Fetch Wikipedia content via MediaWiki API
5. Call Claude API to extract assertions
6. For each assertion:
   - Create AssertionTable entry
   - Set type = "wiki_import"
   - Set sourceId = "WIKIPEDIA"
   - Link to import job
7. Update ImportJobsTable (status: completed)
8. Return job ID to frontend for polling
```

**Wikipedia API:**
- Use MediaWiki REST API: `https://en.wikipedia.org/api/rest_v1/page/html/{title}`
- Parse HTML to extract clean text
- Strip tables, infoboxes (optional), keep main content

**Error Handling:**
- Invalid URL: return 400
- Wikipedia API failure: retry 3x, then mark job as failed
- Claude API failure: skip problematic section, continue with rest
- Store errors in ImportJobsTable.errorMessages

### News Import

**Trigger:** User provides RSS feed URL or specific article URL

**Workflow:**
```
1. User submits feed URL -> POST /api/import/news
2. Create ImportJobsTable entry
3. Lambda: NewsImportFunction triggered
4. Parse RSS feed (use feedparser library)
5. For each article:
   a. Fetch full article content (web scraping)
   b. Call Claude API to extract assertions
   c. Create AssertionTable entries
   d. Set type = "news_import"
   e. Set sourceId = feed identifier (e.g., "NYT", "BBC")
6. Update ImportJobsTable with progress
7. Complete when all articles processed
```

**RSS Parsing:**
- Use feedparser (Python) or similar
- Extract: title, content, link, published date, author

**Web Scraping:**
- Use BeautifulSoup or newspaper3k
- Extract clean article text (strip ads, navigation, etc)
- Fallback to RSS content if scraping fails

**Source Identification:**
- Map feed URLs to canonical source names
- e.g., `https://rss.nytimes.com/...` -> sourceId = "NYT"
- Store mapping in config or DynamoDB table

**Rate Limiting:**
- Respect robots.txt
- Delay between requests to same domain (1-2 seconds)
- Limit concurrent imports per user (1 at a time)

---

## User Content Authoring

### Blog Authoring

**Workflow:**
```
1. User writes blog post in rich text editor
2. User clicks "Publish"
3. POST /api/content/blog with:
   {
     title: string
     content: string (markdown or HTML)
     topics: string[]
   }
4. Lambda: BlogAuthorFunction
   a. Create parent assertion (type = "blog")
   b. Store full blog content
   c. Call Claude API to extract key claims
   d. Create child assertions for each claim
   e. Link child assertions to parent (extractedFrom)
5. Return blog ID
6. Blog appears in Social feed and can be tagged to Wiki topics
```

**UI Requirements:**
- Rich text editor (Quill, TipTap, or similar)
- Topic tagging (autocomplete from existing topics)
- Preview before publish
- Edit/delete own blogs

**Trust Implications:**
- Other users can trust/distrust the entire blog
- Other users can trust/distrust individual extracted claims
- User sees their own blog at trust=1.0, others see it filtered

### Tweet Authoring

**Workflow:**
```
1. User writes tweet (280 char limit)
2. User clicks "Post"
3. POST /api/content/tweet with:
   {
     content: string
     topics?: string[]
   }
4. Lambda: TweetAuthorFunction
   a. Create single assertion (type = "tweet")
   b. No extraction needed (too short)
   c. Store with sourceId = userId
5. Return tweet ID
6. Tweet appears in Social feed
```

**UI Requirements:**
- Character counter
- Optional topic tags
- Delete own tweets (no edit - like Twitter)

**Trust Implications:**
- Other users can trust/distrust the tweet
- Tweets from low-trust sources don't appear in feed

---

## Interface Views Specification

### 1. Wiki View

**Purpose:** Topic-organized knowledge browser (like Wikipedia)

**Features:**
- Topic list (sidebar or page)
- Search topics
- View article for selected topic
- Edit trust on individual assertions within article
- See controversy signals (if assertions have conflicting trust)

**API Endpoint:** `GET /api/views/wiki/{topic}`

**Query Logic:**
```typescript
async function getWikiArticle(userId: string, topic: string) {
  // 1. Find all assertions tagged with topic
  const assertions = await queryAssertionsByTopic(topic)
  
  // 2. For each assertion, get user's trust value
  const trustValues = await getTrustValues(userId, assertions.map(a => a.id))
  
  // 3. Filter by threshold
  const threshold = await getUserThreshold(userId)
  const openMindedness = await getUserOpenMindedness(userId)
  
  const highTrust = assertions.filter(a => trustValues[a.id] >= threshold)
  const lowTrust = assertions.filter(a => 
    trustValues[a.id] < threshold && 
    trustValues[a.id] >= (threshold - openMindedness)
  )
  
  // 4. Check cache
  const cached = await getGeneratedContent(userId, "wiki_article", topic)
  if (cached && !trustValuesChanged(cached.trustSnapshot, trustValues)) {
    return cached.generatedContent
  }
  
  // 5. Generate article via Claude
  const article = await generateArticle(topic, highTrust, lowTrust)
  
  // 6. Cache result
  await cacheGeneratedContent(userId, "wiki_article", topic, article, trustValues)
  
  return article
}
```

**UI Components:**
- Topic sidebar (tree structure or flat list)
- Article viewer (rendered markdown/HTML)
- Inline trust sliders (click assertion to adjust trust)
- Controversy badges (⚠️ on disputed assertions)
- "View alternate perspectives" button

### 2. News View

**Purpose:** Time-ordered feed of recent assertions (like news aggregator)

**Features:**
- Reverse-chronological list of assertions
- Filter by source
- Filter by topic
- Set trust on sources or individual items

**API Endpoint:** `GET /api/views/news?since={timestamp}&limit={n}`

**Query Logic:**
```typescript
async function getNewsFeed(userId: string, since?: Date, limit = 50) {
  // 1. Get recent assertions (type: news_import, blog, tweet)
  const recentAssertions = await queryRecentAssertions(since, limit * 2)
  
  // 2. Get user's trust values
  const trustValues = await getTrustValues(userId, recentAssertions.map(a => a.id))
  
  // 3. Filter by threshold and openMindedness
  const threshold = await getUserThreshold(userId)
  const openMindedness = await getUserOpenMindedness(userId)
  
  const filtered = recentAssertions.filter(a => 
    trustValues[a.id] >= (threshold - openMindedness)
  )
  
  // 4. Sort by trust * recency
  const scored = filtered.map(a => ({
    assertion: a,
    score: trustValues[a.id] * recencyScore(a.publishedAt)
  }))
  
  scored.sort((a, b) => b.score - a.score)
  
  return scored.slice(0, limit)
}

function recencyScore(publishedAt: Date): number {
  const hoursAgo = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60)
  return 1 / (1 + hoursAgo / 24)  // Decay over ~24 hours
}
```

**UI Components:**
- Infinite scroll feed
- Source badges (NYT, BBC, user avatars)
- Trust indicators (slider or stars)
- Filter controls (sidebar)

### 3. Chat View

**Purpose:** LLM Q&A interface with trust-weighted knowledge (like ChatGPT but using platform's KB)

**Features:**
- Natural language queries
- Responses based on user's trusted assertions
- Citations to source assertions
- Ability to adjust trust on cited sources

**API Endpoint:** `POST /api/views/chat`

**Request:**
```json
{
  "query": "What is the current Fed interest rate?",
  "conversationId": "uuid" 
}
```

**Query Logic:**
```typescript
async function chatQuery(userId: string, query: string, conversationId?: string) {
  // 1. Retrieve relevant assertions (semantic search or keyword match)
  const relevantAssertions = await searchAssertions(query, limit = 20)
  
  // 2. Get user's trust values
  const trustValues = await getTrustValues(userId, relevantAssertions.map(a => a.id))
  
  // 3. Filter by threshold
  const threshold = await getUserThreshold(userId)
  const trustedAssertions = relevantAssertions.filter(a => 
    trustValues[a.id] >= threshold
  )
  
  // 4. Build context for Claude
  const context = trustedAssertions.map(a => 
    `[${a.sourceId}]: ${a.content} (trust: ${trustValues[a.id]})`
  ).join('\n')
  
  // 5. Call Claude API
  const prompt = `
    Answer the user's question based on the following trusted facts:
    
    ${context}
    
    User question: ${query}
    
    Provide a clear answer and cite your sources using [source] notation.
  `
  
  const response = await callClaudeAPI(prompt)
  
  // 6. Cache conversation
  await saveConversation(userId, conversationId, query, response)
  
  return {
    response: response,
    citedAssertions: trustedAssertions
  }
}
```

**UI Components:**
- Chat interface (like ChatGPT)
- Conversation history (list previous queries)
- Cited assertions (sidebar or inline)
- Trust adjustment on cited sources

**Technical Challenges:**
- **Semantic search:** Need embedding-based search (DynamoDB doesn't support vectors)
  - Options: 
    - Use OpenSearch (adds complexity)
    - Use keyword-based search (simpler, less accurate)
    - Use Claude to extract keywords, then match (hybrid)
  - **Recommendation:** Start with keyword search, add semantic later if needed

### 4. Social View

**Purpose:** Trust-filtered social feed (like Twitter/X but personalized by trust)

**Features:**
- Feed of tweets and blogs from trusted sources
- Follow/trust sources (users, bots, imported feeds)
- Post own tweets
- Reply/thread (future)

**API Endpoint:** `GET /api/views/social?limit={n}`

**Query Logic:**
```typescript
async function getSocialFeed(userId: string, limit = 50) {
  // 1. Get all sources user trusts
  const trustedSources = await getUserTrustedSources(userId)
  
  // 2. Get recent content from those sources
  const recentContent = await queryAssertionsBySource(
    trustedSources.map(s => s.id),
    types: ["tweet", "blog"],
    limit: limit * 2
  )
  
  // 3. Get trust values (for ranking)
  const trustValues = await getTrustValues(userId, recentContent.map(a => a.id))
  
  // 4. Sort by trust * recency
  const scored = recentContent.map(a => ({
    assertion: a,
    score: trustValues[a.sourceId] * recencyScore(a.publishedAt)
  }))
  
  scored.sort((a, b) => b.score - a.score)
  
  return scored.slice(0, limit)
}
```

**UI Components:**
- Feed (cards for tweets, blog excerpts)
- Compose box for new tweet
- Source avatars with trust indicators
- "Follow" (set initial trust) button

### 5. Forum View

**Purpose:** Threaded discussions with trust-weighted visibility (like Reddit)

**Features:**
- Topic-based threads
- Nested replies
- Trust-based ranking of comments
- OP can be assertion or question

**API Endpoint:** `GET /api/views/forum/{threadId}`

**Data Model Addition:**

```typescript
// New assertion type
type: "forum_post" | "forum_reply"

// Forum-specific metadata
{
  threadId: string       // Root post ID
  parentId?: string      // For nested replies
  depth: number          // Nesting level
}
```

**Query Logic:**
```typescript
async function getForumThread(userId: string, threadId: string) {
  // 1. Get root post
  const rootPost = await getAssertion(threadId)
  
  // 2. Get all replies
  const allReplies = await queryRepliesByThread(threadId)
  
  // 3. Get trust values
  const trustValues = await getTrustValues(
    userId, 
    [rootPost.id, ...allReplies.map(r => r.id)]
  )
  
  // 4. Build tree structure
  const tree = buildReplyTree(rootPost, allReplies, trustValues)
  
  // 5. Sort each level by trust
  sortTreeByTrust(tree)
  
  return tree
}
```

**UI Components:**
- Thread list (by topic)
- Nested reply tree
- Collapse/expand threads
- Trust indicators on each post

---

## Frontend Architecture

### Technology Stack

**Framework:** React 18+ with TypeScript
**Styling:** Tailwind CSS + shadcn/ui components
**State Management:** React Query (for server state) + Zustand (for client state)
**Routing:** React Router v6
**Auth:** AWS Amplify (Cognito integration)
**Build:** Vite

### Project Structure

```
frontend/
  src/
    components/
      auth/
        LoginForm.tsx
        SignupForm.tsx
        ProtectedRoute.tsx
      
      trust/
        TrustSlider.tsx           # 0-1 slider with visual feedback
        TrustIndicator.tsx        # Display trust value
        SourceBadge.tsx           # Show source with trust
      
      content/
        AssertionCard.tsx         # Display single assertion
        ArticleRenderer.tsx       # Render generated article
        BlogEditor.tsx            # Rich text editor for blogs
        TweetComposer.tsx         # Tweet input box
      
      views/
        WikiView/
          TopicSidebar.tsx
          ArticleViewer.tsx
          TopicSearch.tsx
        
        NewsView/
          NewsFeed.tsx
          FeedItem.tsx
          FilterControls.tsx
        
        ChatView/
          ChatInterface.tsx
          MessageList.tsx
          QueryInput.tsx
          CitationPanel.tsx
        
        SocialView/
          SocialFeed.tsx
          TweetCard.tsx
          BlogCard.tsx
          ComposeBox.tsx
        
        ForumView/
          ThreadList.tsx
          ThreadView.tsx
          ReplyTree.tsx
          ReplyComposer.tsx
    
    hooks/
      useAuth.ts                  # Authentication hooks
      useTrust.ts                 # Trust operations
      useAssertions.ts            # CRUD operations
      useViews.ts                 # View-specific queries
    
    api/
      client.ts                   # API Gateway client (Axios)
      auth.ts                     # Cognito operations
      assertions.ts               # Assertion endpoints
      trust.ts                    # Trust endpoints
      views.ts                    # View query endpoints
      import.ts                   # Import job endpoints
    
    types/
      api.ts                      # API request/response types
      domain.ts                   # Domain models (Assertion, Trust, User)
    
    App.tsx
    main.tsx
```

### Key UI/UX Principles

**Trust Interaction:**
- Sliders for continuous trust (0-1)
- Visual feedback: red (0) -> yellow (0.5) -> green (1)
- Quick actions: "Trust", "Distrust", "Neutral" buttons
- Contextual: adjust trust inline where assertions appear

**Controversy Signals:**
- ⚠️ badge on assertions with conflicting trust
- Hover to see "X% of your network distrusts this"
- "View alternate perspective" button

**Performance:**
- Optimistic updates (UI responds immediately, sync in background)
- Lazy loading for feeds (infinite scroll)
- Skeleton screens while loading
- Cache API responses in React Query

**Accessibility:**
- ARIA labels on all interactive elements
- Keyboard navigation
- Color contrast meeting WCAG AA
- Screen reader friendly

---

## Deployment Strategy

### SAM Template Structure

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: python3.11
    Timeout: 30
    MemorySize: 512
    Environment:
      Variables:
        USERS_TABLE: !Ref UsersTable
        ASSERTIONS_TABLE: !Ref AssertionsTable
        TRUST_TABLE: !Ref TrustRelationshipsTable
        CACHE_TABLE: !Ref GeneratedContentCache
        JOBS_TABLE: !Ref ImportJobsTable
        CLAUDE_API_KEY_SECRET: !Ref ClaudeAPIKeySecret

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, prod]

Resources:
  # === COGNITO ===
  UserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: !Sub trust-platform-${Environment}
      AutoVerifiedAttributes:
        - email
      UsernameAttributes:
        - email
      Schema:
        - Name: email
          Required: true
          Mutable: false
      Policies:
        PasswordPolicy:
          MinimumLength: 8
          RequireUppercase: true
          RequireLowercase: true
          RequireNumbers: true
          RequireSymbols: false
  
  UserPoolClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      ClientName: !Sub trust-platform-client-${Environment}
      UserPoolId: !Ref UserPool
      GenerateSecret: false
      ExplicitAuthFlows:
        - ALLOW_USER_SRP_AUTH
        - ALLOW_REFRESH_TOKEN_AUTH
  
  # === API GATEWAY ===
  ApiGateway:
    Type: AWS::Serverless::Api
    Properties:
      Name: !Sub trust-platform-api-${Environment}
      StageName: !Ref Environment
      Cors:
        AllowOrigin: "'*'"
        AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
        AllowHeaders: "'Content-Type,Authorization'"
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            Type: COGNITO_USER_POOLS
            UserPoolArn: !GetAtt UserPool.Arn
  
  # === LAMBDA FUNCTIONS ===
  
  # Auth & User
  UserProfileFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/user_profile/
      Handler: app.lambda_handler
      Events:
        GetProfile:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/user/profile
            Method: GET
        UpdateProfile:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/user/profile
            Method: PUT
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref UsersTable
  
  # Core Data Operations
  AssertionCRUDFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/assertion_crud/
      Handler: app.lambda_handler
      Events:
        CreateAssertion:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/assertions
            Method: POST
        GetAssertion:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/assertions/{id}
            Method: GET
        ListAssertions:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/assertions
            Method: GET
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref AssertionsTable
  
  TrustOperationsFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/trust_operations/
      Handler: app.lambda_handler
      Events:
        SetTrust:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/trust
            Method: POST
        GetTrust:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/trust/{targetId}
            Method: GET
        ListTrust:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/trust
            Method: GET
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref TrustRelationshipsTable
  
  TrustPropagationFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/trust_propagation/
      Handler: app.lambda_handler
      Timeout: 300  # 5 minutes for full graph propagation
      MemorySize: 1024
      Events:
        TrustUpdated:
          Type: EventBridgeRule
          Properties:
            Pattern:
              source:
                - trust.platform
              detail-type:
                - TrustValueUpdated
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref TrustRelationshipsTable
        - DynamoDBCrudPolicy:
            TableName: !Ref AssertionsTable
  
  # Content Creation
  BlogAuthorFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/blog_author/
      Handler: app.lambda_handler
      Timeout: 60
      Events:
        CreateBlog:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/content/blog
            Method: POST
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref AssertionsTable
        - Statement:
            - Effect: Allow
              Action:
                - secretsmanager:GetSecretValue
              Resource: !Ref ClaudeAPIKeySecret
      Environment:
        Variables:
          CLAUDE_API_KEY_SECRET: !Ref ClaudeAPIKeySecret
  
  TweetAuthorFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/tweet_author/
      Handler: app.lambda_handler
      Events:
        CreateTweet:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/content/tweet
            Method: POST
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref AssertionsTable
  
  # Import Pipeline
  WikiImportFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/wiki_import/
      Handler: app.lambda_handler
      Timeout: 300  # 5 minutes
      MemorySize: 1024
      Events:
        StartImport:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/import/wikipedia
            Method: POST
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref AssertionsTable
        - DynamoDBCrudPolicy:
            TableName: !Ref ImportJobsTable
        - Statement:
            - Effect: Allow
              Action:
                - secretsmanager:GetSecretValue
              Resource: !Ref ClaudeAPIKeySecret
      Environment:
        Variables:
          CLAUDE_API_KEY_SECRET: !Ref ClaudeAPIKeySecret
  
  NewsImportFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/news_import/
      Handler: app.lambda_handler
      Timeout: 300
      MemorySize: 1024
      Events:
        StartImport:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/import/news
            Method: POST
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref AssertionsTable
        - DynamoDBCrudPolicy:
            TableName: !Ref ImportJobsTable
        - Statement:
            - Effect: Allow
              Action:
                - secretsmanager:GetSecretValue
              Resource: !Ref ClaudeAPIKeySecret
  
  # View Queries
  WikiQueryFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/wiki_query/
      Handler: app.lambda_handler
      Timeout: 60
      Events:
        GetWikiArticle:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/views/wiki/{topic}
            Method: GET
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref AssertionsTable
        - DynamoDBCrudPolicy:
            TableName: !Ref TrustRelationshipsTable
        - DynamoDBCrudPolicy:
            TableName: !Ref GeneratedContentCache
        - Statement:
            - Effect: Allow
              Action:
                - secretsmanager:GetSecretValue
              Resource: !Ref ClaudeAPIKeySecret
  
  NewsQueryFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/news_query/
      Handler: app.lambda_handler
      Events:
        GetNewsFeed:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/views/news
            Method: GET
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref AssertionsTable
        - DynamoDBCrudPolicy:
            TableName: !Ref TrustRelationshipsTable
  
  ChatQueryFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/chat_query/
      Handler: app.lambda_handler
      Timeout: 60
      Events:
        ChatQuery:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/views/chat
            Method: POST
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref AssertionsTable
        - DynamoDBCrudPolicy:
            TableName: !Ref TrustRelationshipsTable
        - Statement:
            - Effect: Allow
              Action:
                - secretsmanager:GetSecretValue
              Resource: !Ref ClaudeAPIKeySecret
  
  SocialQueryFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/social_query/
      Handler: app.lambda_handler
      Events:
        GetSocialFeed:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/views/social
            Method: GET
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref AssertionsTable
        - DynamoDBCrudPolicy:
            TableName: !Ref TrustRelationshipsTable
  
  ForumQueryFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/forum_query/
      Handler: app.lambda_handler
      Events:
        GetForumThread:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/views/forum/{threadId}
            Method: GET
        ListThreads:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /api/views/forum
            Method: GET
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref AssertionsTable
        - DynamoDBCrudPolicy:
            TableName: !Ref TrustRelationshipsTable
  
  # === DYNAMODB TABLES ===
  
  UsersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub trust-platform-users-${Environment}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
  
  AssertionsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub trust-platform-assertions-${Environment}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
        - AttributeName: GSI1PK
          AttributeType: S
        - AttributeName: GSI1SK
          AttributeType: S
        - AttributeName: GSI2PK
          AttributeType: S
        - AttributeName: GSI2SK
          AttributeType: S
        - AttributeName: GSI3PK
          AttributeType: S
        - AttributeName: GSI3SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: BySource
          KeySchema:
            - AttributeName: GSI1PK
              KeyType: HASH
            - AttributeName: GSI1SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
        - IndexName: ByType
          KeySchema:
            - AttributeName: GSI2PK
              KeyType: HASH
            - AttributeName: GSI2SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
        - IndexName: ByTopic
          KeySchema:
            - AttributeName: GSI3PK
              KeyType: HASH
            - AttributeName: GSI3SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
  
  TrustRelationshipsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub trust-platform-trust-${Environment}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
        - AttributeName: GSI1PK
          AttributeType: S
        - AttributeName: GSI1SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: ByTarget
          KeySchema:
            - AttributeName: GSI1PK
              KeyType: HASH
            - AttributeName: GSI1SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
  
  GeneratedContentCache:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub trust-platform-cache-${Environment}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      TimeToLiveSpecification:
        Enabled: true
        AttributeName: expiresAt
  
  ImportJobsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub trust-platform-jobs-${Environment}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
        - AttributeName: GSI1PK
          AttributeType: S
        - AttributeName: GSI1SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: ByUser
          KeySchema:
            - AttributeName: GSI1PK
              KeyType: HASH
            - AttributeName: GSI1SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
  
  # === SECRETS ===
  ClaudeAPIKeySecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: !Sub trust-platform-claude-api-key-${Environment}
      Description: Anthropic Claude API Key
      SecretString: '{"apiKey": "PLACEHOLDER - UPDATE MANUALLY"}'
  
  # === FRONTEND HOSTING ===
  WebsiteBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub trust-platform-web-${Environment}
      WebsiteConfiguration:
        IndexDocument: index.html
        ErrorDocument: index.html
      PublicAccessBlockConfiguration:
        BlockPublicAcls: false
        BlockPublicPolicy: false
        IgnorePublicAcls: false
        RestrictPublicBuckets: false
  
  WebsiteBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref WebsiteBucket
      PolicyDocument:
        Statement:
          - Effect: Allow
            Principal: '*'
            Action: 's3:GetObject'
            Resource: !Sub '${WebsiteBucket.Arn}/*'
  
  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        DefaultRootObject: index.html
        Origins:
          - Id: S3Origin
            DomainName: !GetAtt WebsiteBucket.DomainName
            S3OriginConfig:
              OriginAccessIdentity: ''
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods:
            - GET
            - HEAD
            - OPTIONS
          CachedMethods:
            - GET
            - HEAD
          ForwardedValues:
            QueryString: false
            Cookies:
              Forward: none
        CustomErrorResponses:
          - ErrorCode: 404
            ResponseCode: 200
            ResponsePagePath: /index.html

Outputs:
  ApiEndpoint:
    Description: API Gateway endpoint URL
    Value: !Sub 'https://${ApiGateway}.execute-api.${AWS::Region}.amazonaws.com/${Environment}'
  
  UserPoolId:
    Description: Cognito User Pool ID
    Value: !Ref UserPool
  
  UserPoolClientId:
    Description: Cognito User Pool Client ID
    Value: !Ref UserPoolClient
  
  WebsiteURL:
    Description: CloudFront distribution URL
    Value: !GetAtt CloudFrontDistribution.DomainName
  
  ClaudeAPIKeySecretArn:
    Description: ARN of Claude API Key secret (update manually)
    Value: !Ref ClaudeAPIKeySecret
```

### Deployment Steps

**Prerequisites:**
1. AWS CLI configured
2. SAM CLI installed
3. Claude API key from Anthropic

**Initial Deployment:**
```bash
# 1. Build SAM application
sam build

# 2. Deploy to AWS
sam deploy --guided

# 3. Update Claude API key in Secrets Manager
aws secretsmanager update-secret \
  --secret-id trust-platform-claude-api-key-dev \
  --secret-string '{"apiKey": "sk-ant-..."}'

# 4. Build and deploy frontend
cd frontend
npm run build
aws s3 sync dist/ s3://trust-platform-web-dev/

# 5. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

**Subsequent Deployments:**
```bash
# Backend
sam build && sam deploy

# Frontend
cd frontend && npm run build && aws s3 sync dist/ s3://trust-platform-web-dev/
```

---

## Technical Challenges & Solutions

### Challenge 1: Trust Propagation Performance

**Problem:** Full graph recalculation for 10k assertions and 12 users could be slow.

**Solution:**
- Incremental updates: only recalculate affected subgraph when trust changes
- Pre-compute on login: run propagation async, cache results
- Use damping to limit propagation depth (only ~3 hops needed)
- Time budget: if propagation takes >5 seconds, return cached + schedule background update

**Monitoring:**
- CloudWatch metrics for propagation time
- Alert if >10 seconds

### Challenge 2: Semantic Search for Chat View

**Problem:** DynamoDB doesn't support vector similarity search.

**Options:**
1. **Add OpenSearch** (AWS managed Elasticsearch)
   - Pros: True semantic search, good performance
   - Cons: Adds cost (~$50/month), complexity
2. **Use keyword matching**
   - Pros: Simple, uses existing DynamoDB
   - Cons: Less accurate
3. **Hybrid: Claude-based keyword extraction**
   - Call Claude to extract keywords from query
   - Match keywords against assertion content
   - Pros: Better than pure keyword, no new infrastructure
   - Cons: Extra API call, still not true semantic

**Recommendation for Phase 2:** Start with option 3 (Claude keyword extraction), add OpenSearch later if needed.

### Challenge 3: Claude API Rate Limits

**Problem:** Anthropic limits to 50 requests/minute.

**Solution:**
- Aggressive caching (24-hour TTL)
- Batch operations where possible (extract multiple assertions in one call)
- Queue system for imports (process one article at a time)
- User feedback: "Generating article..." with progress bar
- Fallback: if rate limited, return cached version (even if stale) + message

**Monitoring:**
- Track API calls per minute
- Alert if approaching limit

### Challenge 4: DynamoDB Query Complexity

**Problem:** Some queries need multiple GSIs or scans.

**Example:** "Get all assertions from sources I trust, published this week, tagged with 'economics'"

**Solution:**
- Denormalize data: duplicate assertions into multiple tables/GSIs if needed
- Accept eventual consistency
- Use filters on query results (less efficient, but acceptable at this scale)
- For complex queries (like controversy detection), run async jobs and cache results

**Monitoring:**
- CloudWatch for consumed capacity
- Optimize queries that consistently use >100 RCUs

### Challenge 5: Multi-User Data Isolation

**Problem:** Ensure users can only access their own trust values, not leak data.

**Solution:**
- Partition key includes userId (e.g., `PK: USER#<userId>`)
- Lambda functions extract userId from JWT (verified by API Gateway)
- All DynamoDB queries filter by userId
- No shared data except assertions (which are public)

**Security:**
- IAM policies: Lambda can only access specific tables
- API Gateway authorizer: JWT validation
- No direct DynamoDB access from frontend

### Challenge 6: Frontend State Management

**Problem:** Complex state across 5 views, trust updates, caching.

**Solution:**
- React Query for server state (automatic caching, refetching)
- Zustand for UI state (selected view, filters)
- Optimistic updates: UI updates immediately, rollback on error
- WebSocket for real-time updates (future, not Phase 2)

**Example:**
```typescript
// React Query for trust operations
const { mutate: setTrust } = useMutation(
  (params) => api.trust.set(params.targetId, params.value),
  {
    onMutate: async (params) => {
      // Optimistic update
      queryClient.setQueryData(['trust', params.targetId], params.value)
    },
    onError: (err, params, context) => {
      // Rollback on error
      queryClient.setQueryData(['trust', params.targetId], context.previousValue)
    },
    onSuccess: () => {
      // Invalidate affected queries
      queryClient.invalidateQueries(['newsFeed'])
      queryClient.invalidateQueries(['wikiArticle'])
    }
  }
)
```

---

## Cost Estimation (12 Users)

### AWS Services

**Lambda:**
- Executions: ~100k/month (average 8k/day)
- Duration: avg 1 second, 512 MB
- Cost: ~$5/month

**API Gateway:**
- Requests: ~100k/month
- Cost: ~$3/month

**DynamoDB:**
- On-demand pricing
- Storage: ~1 GB (assertions, trust, users)
- Reads: ~50k/month
- Writes: ~10k/month
- Cost: ~$10/month

**S3:**
- Storage: <1 GB (frontend)
- Requests: ~10k/month
- Cost: ~$1/month

**CloudFront:**
- Data transfer: ~10 GB/month
- Requests: ~50k/month
- Cost: ~$5/month

**Cognito:**
- Active users: 12
- Cost: Free (under 50 users)

**Total AWS: ~$25/month**

### Claude API

**Assertion Extraction:**
- Imports: ~50 articles/month
- Tokens per extraction: ~2k input + 1k output
- Cost: ~$1/month

**Article Generation:**
- Views: ~200/month (users viewing wiki articles)
- Tokens per article: ~1k input + 2k output
- Cost: ~$5/month

**Chat Queries:**
- Queries: ~100/month
- Tokens per query: ~500 input + 500 output
- Cost: ~$2/month

**Total Claude API: ~$8/month**

**Grand Total: ~$33/month**

*(Plus developer time, which is not metered)*

---

## Monitoring & Observability

### CloudWatch Dashboards

**Key Metrics:**
1. Lambda errors and duration
2. API Gateway 4xx/5xx responses
3. DynamoDB throttles and consumed capacity
4. Claude API call count and errors
5. User activity (logins, trust updates, content creation)

**Alarms:**
- Lambda error rate >5%
- API Gateway 5xx >1%
- DynamoDB throttles >0
- Claude API rate limit hit

### Logging Strategy

**Lambda Logs:**
- Structured JSON logging
- Include: userId, operation, duration, error (if any)
- CloudWatch Insights queries for debugging

**Example:**
```json
{
  "timestamp": "2024-11-15T10:30:00Z",
  "userId": "abc-123",
  "operation": "setTrust",
  "targetId": "assertion-xyz",
  "trustValue": 0.8,
  "duration": 150,
  "success": true
}
```

### User Analytics (Privacy-Preserving)

**Track:**
- Active users per day/week
- Most used views (wiki, news, chat, social, forum)
- Trust value distribution (how many users trust at different levels)
- Content creation (blogs, tweets per user)
- Import usage (which sources are imported most)

**Implementation:**
- Aggregate in Lambda, store in DynamoDB
- No PII in analytics (use hashed userIds)
- Weekly reports sent to admin

---

## Security Considerations (Basic, Not Production-Grade)

### Authentication
- Cognito handles password hashing
- JWT tokens expire after 1 hour
- HTTPS only (enforced by CloudFront)

### Authorization
- API Gateway validates JWT on every request
- Lambda extracts userId from JWT
- DynamoDB queries partition by userId

### Input Validation
- API Gateway request validation (basic)
- Lambda validates all inputs (reject malformed data)
- XSS protection in frontend (React auto-escapes)

### Secrets Management
- Claude API key in Secrets Manager (not in code)
- Environment variables for table names
- No hardcoded credentials

### Data Privacy
- Users can only see their own trust values
- Assertions are public (by design)
- No PII stored except email (required for auth)

**Known Limitations (acceptable for Phase 2):**
- No CSRF protection (future: implement tokens)
- No rate limiting per user (future: API Gateway throttling)
- No audit logs (future: CloudTrail)
- No encryption at rest (DynamoDB default encryption)

---

## Testing Strategy

### Unit Tests
- Lambda functions: pytest (Python) or Jest (Node)
- Frontend components: React Testing Library
- Trust propagation algorithm: property-based tests

### Integration Tests
- API endpoints: Postman/Newman
- Database operations: DynamoDB Local
- Auth flow: Cognito mock

### E2E Tests
- Playwright or Cypress
- Test user flows:
  1. Sign up -> login -> view wiki
  2. Set trust -> see filtered content
  3. Post tweet -> appears in social feed
  4. Import Wikipedia -> assertions extracted

### Load Testing (Minimal for 12 Users)
- Artillery or k6
- Simulate 10 concurrent users
- Verify no errors or throttles

---

## Migration from Phase 1 PoC

**Assuming Phase 1 has:**
- Local database (SQLite or Postgres)
- Mock data for assertions and trust
- Basic CLI or web interface

**Migration Steps:**

1. **Export PoC data:**
   - Dump assertions to JSON
   - Dump trust relationships to JSON
   - Dump any generated articles

2. **Import to DynamoDB:**
   - Write migration script (Python boto3)
   - Transform to new schema (add PK/SK)
   - Batch write to DynamoDB tables

3. **Create seed users:**
   - Manually create 2-3 test users in Cognito
   - Assign PoC trust data to these users

4. **Test migration:**
   - Verify data integrity
   - Run trust propagation on imported data
   - Generate sample articles to ensure Claude integration works

5. **Deploy frontend:**
   - Connect to new API
   - Test all 5 views
   - Verify trust updates propagate correctly

---

## Future Enhancements (Not Phase 2)

### Phase 3: Scalability
- Replace DynamoDB with graph database (Neo4j, Neptune)
- Add Redis for caching
- Horizontal scaling for Lambda
- CDN for generated articles

### Phase 4: Advanced Features
- Semantic search with embeddings
- Real-time updates via WebSockets
- Mobile apps (React Native)
- Schelling point discovery (from Phase 1 spec)
- Controversy dashboard
- Meta-trust visualization

### Phase 5: Productization
- Stripe integration for subscriptions
- Admin dashboard
- Content moderation tools
- Analytics dashboard
- Custom domains
- Email notifications

---

## Appendix: Key Decisions & Trade-offs

### Decision 1: DynamoDB vs Graph Database

**Choice:** DynamoDB

**Rationale:**
- Simpler for 12 users
- Lower cost
- Serverless
- Good enough for trust propagation at this scale

**Trade-off:** May need to migrate to graph DB later for scale

### Decision 2: Serverless vs EC2

**Choice:** Serverless (Lambda + API Gateway)

**Rationale:**
- Cost-effective for low usage
- No server management
- Auto-scaling
- Fast iteration

**Trade-off:** Cold starts (acceptable for demo)

### Decision 3: All 5 Views vs MVP

**Choice:** All 5 views

**Rationale:**
- Demonstrate full vision
- Test which views resonate with users
- Better for fundraising/demos

**Trade-off:** Longer development time

### Decision 4: Claude API vs Self-Hosted LLM

**Choice:** Claude API

**Rationale:**
- Higher quality outputs
- No infrastructure overhead
- Fast iteration
- Acceptable cost at 12 users

**Trade-off:** Vendor dependency, API costs scale with usage

### Decision 5: Keyword Search vs Semantic Search (Chat View)

**Choice:** Keyword search with Claude-based extraction

**Rationale:**
- No additional infrastructure
- Good enough for demo
- Can add OpenSearch later if needed

**Trade-off:** Less accurate than true semantic search

---

## Conclusion

This specification describes a complete, deployable multi-user system for the trust-based knowledge platform. It extends the Phase 1 PoC with:

- AWS serverless architecture (SAM)
- Multi-user authentication (Cognito)
- All 5 interface views (Wiki, News, Chat, Social, Forum)
- Content import pipelines (Wikipedia, news)
- User content authoring (blogs, tweets)
- Polished frontend (React + Tailwind)
- Claude API integration throughout

The system is designed for ~12 users with a focus on functionality and user experience over scalability. It provides a working demo that can be used for user testing, fundraising, or further development.

**Next steps:** Hand this spec to Claude Code for implementation, focusing on:
1. SAM template and DynamoDB schema
2. Lambda functions for core operations
3. Frontend with all 5 views
4. Testing and deployment

---

**Document Version:** 2.0  
**Last Updated:** November 2024  
**Status:** Ready for Implementation  
**Target:** AWS deployment for 12-user demo
