# Next Steps - Phase 2: Core Backend Development

Phase 1 is complete! Here's what to do next.

## ✅ Phase 1 Complete

We've successfully set up:
- ✅ Project structure (monorepo with shared, backend, frontend)
- ✅ Shared TypeScript types and validators
- ✅ AWS SAM template with all infrastructure
- ✅ Frontend foundation (Svelte + Vite + Tailwind)
- ✅ Backend Lambda function placeholders
- ✅ Comprehensive documentation

## 🚀 Phase 2: Core Backend Implementation

### Step 1: DynamoDB Access Layer (3-4 days)

Create the database access layer in `backend/lib/db/`:

**Files to create:**
```
backend/lib/db/
├── client.ts          # DynamoDB client initialization
├── users.ts           # User profile operations
├── assertions.ts      # Assertion CRUD
├── trust.ts           # Trust relationship operations
├── cache.ts           # Generated content cache
└── jobs.ts            # Import job tracking
```

**Key functions to implement:**

`users.ts`:
- `createUserProfile(userId, email, displayName)`
- `getUserProfile(userId)`
- `updateUserPreferences(userId, preferences)`

`assertions.ts`:
- `putAssertion(assertion)`
- `getAssertion(assertionId)`
- `queryAssertionsBySource(sourceId)`
- `queryAssertionsByType(type)`
- `queryAssertionsByTopic(topic)`

`trust.ts`:
- `setTrustValue(userId, targetId, value)`
- `getTrustValue(userId, targetId)`
- `listUserTrust(userId)`
- `listWhoTrustsTarget(targetId)`

**Testing:**
- Write unit tests for each function
- Use DynamoDB Local for testing
- Test GSI queries

### Step 2: Trust Propagation Engine (4-5 days)

Implement the trust calculation algorithm in `backend/lib/trust/`:

**Files to create:**
```
backend/lib/trust/
├── propagation.ts     # Core algorithm
├── graph.ts           # Graph operations
└── cache.ts           # Trust value caching
```

**Algorithm to implement:**
1. Build trust graph from relationships
2. Iterative diffusion with damping
3. Convergence detection
4. Cache results per user

**Key functions:**
- `buildTrustGraph(userId): TrustGraph`
- `propagateTrust(graph, maxIterations): Map<string, number>`
- `computeUserTrust(userId, targetId): number`
- `invalidateTrustCache(userId)`

**Testing:**
- Test with small graphs (3-5 nodes)
- Test convergence
- Test damping factor effects
- Benchmark performance

### Step 3: Claude API Integration (3-4 days)

Create the LLM client and prompts in `backend/lib/llm/`:

**Files to create:**
```
backend/lib/llm/
├── client.ts          # Anthropic Claude SDK wrapper
├── prompts.ts         # Prompt templates
├── extraction.ts      # Assertion extraction
└── generation.ts      # Article generation
```

**Features to implement:**

`extraction.ts`:
- `extractAssertions(text, sourceType): Assertion[]`
- Parse Wikipedia articles
- Parse news articles
- Handle errors gracefully

`generation.ts`:
- `generateWikiArticle(topic, assertions, trustValues): string`
- `generateChatResponse(query, assertions): string`
- Use trust values to order content
- Cache generated content

**Environment setup:**
- Use `CLAUDE_API_KEY` from env or Secrets Manager
- Rate limit: 50 requests/minute
- Timeout: 60 seconds
- Retry logic for transient failures

### Step 4: Implement Lambda Functions (5-6 days)

Now implement the actual logic in each Lambda function.

**Priority order:**

1. **user-profile/** - User management
   - GET: Return user profile from DB
   - PUT: Update preferences (threshold, openMindedness)
   - Initialize new users with defaults

2. **trust-operations/** - Trust management
   - POST: Set trust value, trigger propagation
   - GET: Return trust value (direct or propagated)
   - Validate trust values (0-1 range)

3. **assertion-crud/** - Assertion management
   - POST: Create new assertion
   - GET: Retrieve assertion(s)
   - Validate with Zod schemas

4. **wiki-query/** - Wiki view
   - Query assertions by topic
   - Get user's trust values
   - Generate article with Claude
   - Cache result

5. **news-query/** - News view
   - Query recent assertions (NEWS_IMPORT type)
   - Filter by trust threshold
   - Sort by trust * recency score
   - Return paginated results

6. **chat-query/** - Chat view
   - Search assertions (keyword-based for now)
   - Filter by trust threshold
   - Generate response with Claude
   - Include citation links

7. **wiki-import/** - Wikipedia importer
   - Fetch article from Wikipedia API
   - Extract text with Cheerio
   - Call Claude to extract assertions
   - Save to DynamoDB
   - Track job status

8. **news-import/** - News importer
   - Parse RSS feed
   - Fetch article content
   - Extract assertions with Claude
   - Save to DynamoDB
   - Track job status

### Step 5: Frontend Implementation (10-12 days)

Build the three views: Wiki, News, Chat.

#### 5A: Shared Components (2 days)

Create in `frontend/src/lib/components/`:

```svelte
<!-- TrustSlider.svelte -->
<script lang="ts">
  export let value: number;
  export let targetId: string;

  function handleChange(e) {
    // Call API to set trust
  }
</script>

<input type="range" min="0" max="1" step="0.01" bind:value on:change={handleChange} />

<!-- AssertionCard.svelte -->
<script lang="ts">
  import type { Assertion } from '@shared/types/assertion';
  export let assertion: Assertion;
  export let trustValue: number;
</script>

<div class="card">
  <p>{assertion.content}</p>
  <TrustSlider value={trustValue} targetId={assertion.assertionId} />
</div>
```

#### 5B: API Client (1 day)

Create in `frontend/src/api/`:

```typescript
// client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Add auth interceptor
api.interceptors.request.use(async (config) => {
  const token = await getJWTToken(); // From Amplify
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// assertions.ts
export async function getAssertion(id: string) {
  const { data } = await api.get(`/api/assertions/${id}`);
  return data;
}

// trust.ts
export async function setTrust(targetId: string, value: number) {
  const { data } = await api.post('/api/trust', { targetId, value });
  return data;
}

// views.ts
export async function getWikiArticle(topic: string) {
  const { data } = await api.get(`/api/views/wiki/${topic}`);
  return data;
}
```

#### 5C: Svelte Stores (1 day)

Create in `frontend/src/lib/stores/`:

```typescript
// auth.ts
import { writable } from 'svelte/store';
import { Amplify, Auth } from 'aws-amplify';

export const user = writable(null);
export const isAuthenticated = writable(false);

// trust.ts
import { writable } from 'svelte/store';

export const trustValues = writable<Map<string, number>>(new Map());

// Load trust values on init
export async function loadUserTrust() {
  const values = await api.listTrust();
  trustValues.set(new Map(values.map(t => [t.targetId, t.trustValue])));
}
```

#### 5D: Wiki View (3 days)

Create in `frontend/src/routes/wiki/`:

```svelte
<!-- WikiView.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getWikiArticle } from '@/api/views';

  let topic = 'Federal Reserve';
  let article = null;
  let loading = false;

  async function loadArticle() {
    loading = true;
    article = await getWikiArticle(topic);
    loading = false;
  }

  onMount(() => loadArticle());
</script>

<div class="wiki-view">
  <aside>
    <!-- Topic list/search -->
  </aside>
  <main>
    {#if loading}
      <p>Loading...</p>
    {:else if article}
      <h1>{article.topic}</h1>
      <div class="content">
        {@html article.content}
      </div>
      <aside>
        <!-- Assertions with trust sliders -->
      </aside>
    {/if}
  </main>
</div>
```

#### 5E: News View (2 days)

Create in `frontend/src/routes/news/`:

```svelte
<!-- NewsView.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getNewsFeed } from '@/api/views';
  import NewsFeedItem from './NewsFeedItem.svelte';

  let items = [];
  let loading = false;

  async function loadFeed() {
    loading = true;
    items = await getNewsFeed();
    loading = false;
  }

  onMount(() => loadFeed());
</script>

<div class="news-view">
  <aside>
    <!-- Filters: source, topic, date -->
  </aside>
  <main>
    {#if loading}
      <p>Loading...</p>
    {:else}
      {#each items as item}
        <NewsFeedItem {item} />
      {/each}
    {/if}
  </main>
</div>
```

#### 5F: Chat View (3 days)

Create in `frontend/src/routes/chat/`:

```svelte
<!-- ChatView.svelte -->
<script lang="ts">
  import { chatQuery } from '@/api/views';

  let messages = [];
  let input = '';
  let loading = false;

  async function sendMessage() {
    if (!input.trim()) return;

    messages = [...messages, { role: 'user', content: input }];
    const query = input;
    input = '';
    loading = true;

    const response = await chatQuery(query);
    messages = [...messages, { role: 'assistant', content: response.response }];
    loading = false;
  }
</script>

<div class="chat-view">
  <main class="messages">
    {#each messages as msg}
      <div class="message {msg.role}">
        {msg.content}
      </div>
    {/each}
  </main>
  <footer>
    <input bind:value={input} on:keypress={(e) => e.key === 'Enter' && sendMessage()} />
    <button on:click={sendMessage} disabled={loading}>Send</button>
  </footer>
</div>
```

### Step 6: Testing & Deployment (3-4 days)

1. **Unit tests** for all backend functions
2. **Integration tests** for API endpoints
3. **E2E tests** with Playwright
4. **Deploy to AWS**: `sam deploy`
5. **Deploy frontend**: `aws s3 sync frontend/dist/ s3://bucket/`
6. **Smoke test** all endpoints
7. **Create seed data**: Import 3-5 Wikipedia articles
8. **Invite test users** (12 users)
9. **Monitor logs** and fix issues

## 📝 Estimated Timeline

- **Phase 2 (Backend)**: 15-19 days
- **Phase 3 (Frontend)**: 10-12 days
- **Phase 4 (Testing)**: 3-4 days

**Total**: ~30-35 days

## 🎯 Success Criteria

By the end of Phase 2-4, you should have:

- ✅ All 3 views functional (Wiki, News, Chat)
- ✅ Trust propagation working
- ✅ Content import from Wikipedia/news
- ✅ 12 test users with diverse trust networks
- ✅ System deployed on AWS
- ✅ Demo-ready with seed data

## 🛠️ Development Tips

1. **Work incrementally** - Get one Lambda working before moving to next
2. **Test locally** - Use `sam local start-api` and DynamoDB Local
3. **Commit often** - Small, focused commits
4. **Monitor costs** - Check AWS billing regularly
5. **Ask questions** - Don't hesitate to ask if stuck

## 📚 Resources

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Svelte Tutorial](https://svelte.dev/tutorial)

## 🤔 Questions?

Review the documentation:
- [README.md](./README.md) - Project overview and quick start
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow and patterns
- [Phase 2 Specification](./phase2-specification.md) - Detailed technical specs

Ready to build! 🚀
