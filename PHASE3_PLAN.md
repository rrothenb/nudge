# Phase 3: Frontend Development Plan

## Overview
Build a Svelte + TypeScript frontend that provides three main views (Wiki, News, Chat) with trust-based personalization. Users can manage their trust relationships, import content, and see knowledge filtered through their personal trust network.

## Architecture

### Tech Stack (Confirmed)
- **Framework**: Svelte 4.2.19 + TypeScript
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS 3.4
- **Auth**: AWS Amplify (Cognito)
- **HTTP Client**: Axios 1.7
- **State Management**: Svelte stores
- **Routing**: Custom client-side routing
- **Shared Types**: @nudge/shared package

### Directory Structure
```
frontend/src/
├── lib/
│   ├── components/          # Reusable UI components
│   │   ├── common/          # Generic components
│   │   │   ├── Button.svelte
│   │   │   ├── Card.svelte
│   │   │   ├── Input.svelte
│   │   │   ├── Modal.svelte
│   │   │   └── Spinner.svelte
│   │   ├── trust/           # Trust-specific components
│   │   │   ├── TrustSlider.svelte
│   │   │   ├── TrustBadge.svelte
│   │   │   └── TrustGraph.svelte
│   │   ├── content/         # Content display components
│   │   │   ├── AssertionCard.svelte
│   │   │   ├── SourceBadge.svelte
│   │   │   └── ArticleView.svelte
│   │   └── layout/          # Layout components
│   │       ├── Header.svelte
│   │       ├── Sidebar.svelte
│   │       └── Footer.svelte
│   ├── views/               # Main view components
│   │   ├── WikiView.svelte
│   │   ├── NewsView.svelte
│   │   ├── ChatView.svelte
│   │   ├── ProfileView.svelte
│   │   └── TrustView.svelte
│   ├── stores/              # Svelte stores for state
│   │   ├── auth.ts          # Auth state
│   │   ├── user.ts          # User profile
│   │   ├── trust.ts         # Trust relationships
│   │   └── content.ts       # Content cache
│   ├── api/                 # API client
│   │   ├── client.ts        # Axios instance with auth
│   │   ├── users.ts         # User API calls
│   │   ├── assertions.ts    # Assertion API calls
│   │   ├── trust.ts         # Trust API calls
│   │   ├── views.ts         # View API calls
│   │   └── imports.ts       # Import API calls
│   ├── utils/               # Utility functions
│   │   ├── router.ts        # Client-side routing
│   │   ├── formatters.ts    # Date, number formatting
│   │   └── validators.ts    # Form validation
│   └── types/               # Frontend-specific types
│       └── ui.ts            # UI state types
├── App.svelte               # Root component
├── main.ts                  # Entry point
└── app.css                  # Global styles
```

## Implementation Phases

### Phase 3.1: Core Infrastructure (Days 1-2)
**Goal**: Set up routing, auth, API client, and state management

#### Tasks:
1. **Client-Side Router**
   - Create simple hash-based router
   - Routes: `/`, `/wiki`, `/news`, `/chat`, `/profile`, `/trust`
   - Navigation component

2. **AWS Amplify Auth Setup**
   - Configure Cognito integration
   - Login/Signup components
   - Auth guard for protected routes
   - Token refresh logic

3. **API Client**
   - Axios instance with interceptors
   - Auto-attach JWT tokens
   - Error handling and retry logic
   - API methods for all endpoints

4. **Svelte Stores**
   - `authStore`: Login state, user session
   - `userStore`: User profile, preferences
   - `trustStore`: Trust relationships cache
   - `contentStore`: Content cache with TTL

5. **Layout Components**
   - Header with navigation
   - Sidebar with view switcher
   - Footer
   - Responsive layout

**Deliverables**:
- Working auth flow (login/logout)
- API calls to backend working
- Basic navigation between views
- Layout structure in place

### Phase 3.2: Trust Components (Days 3-4)
**Goal**: Build reusable components for trust visualization and management

#### Tasks:
1. **TrustSlider.svelte**
   - 0-1 range slider with visual feedback
   - Color coding (red → yellow → green)
   - Disabled state for default (0.5)
   - Labels and tooltips

2. **TrustBadge.svelte**
   - Shows trust value as colored badge
   - Multiple sizes (sm, md, lg)
   - Click to view trust explanation
   - Animated transitions

3. **TrustGraph.svelte** (Optional, if time permits)
   - Visual graph of trust relationships
   - D3.js or similar for visualization
   - Interactive nodes

4. **AssertionCard.svelte**
   - Display single assertion
   - Source attribution
   - Trust badge
   - Metadata (topics, date)
   - Expand/collapse details

5. **SourceBadge.svelte**
   - Shows source with icon
   - Trust indicator
   - Click to adjust trust for source

**Deliverables**:
- Reusable trust UI components
- Visual trust feedback
- Assertion display component

### Phase 3.3: Wiki View (Days 5-6)
**Goal**: Topic-based knowledge browser with trust-filtered articles

#### Components:
- **WikiView.svelte**: Main view
  - Topic search/autocomplete
  - Article display area
  - Trust threshold slider
  - "Open-mindedness" slider

#### Features:
1. **Topic Search**
   - Search for topics
   - Recent topics list
   - Suggested topics

2. **Article Display**
   - Fetch article for topic
   - Display trust-weighted content
   - Show high-trust assertions (green highlights)
   - Show low-trust assertions separately (yellow/red)
   - Source citations

3. **Trust Controls**
   - Adjust trust threshold (0-1)
   - Adjust open-mindedness (0-1)
   - See article regenerate in real-time

4. **Actions**
   - Import Wikipedia article for topic
   - View assertion sources
   - Adjust trust for sources

**API Calls**:
- `GET /api/views/wiki/{topic}` - Get article
- `POST /api/import/wikipedia` - Import article

**Deliverables**:
- Working wiki view
- Topic search
- Trust-filtered article display
- Import functionality

### Phase 3.4: News View (Days 7-8)
**Goal**: Time-ordered news feed with trust-based ranking

#### Components:
- **NewsView.svelte**: Main view
  - News feed list
  - Filters (time range, sources)
  - Trust controls

#### Features:
1. **News Feed**
   - List of news items (title, summary, source, date)
   - Trust score indicator
   - Recency score indicator
   - Combined ranking score

2. **Filtering**
   - Time range filter (today, week, month, all)
   - Source filter (show/hide specific sources)
   - Trust threshold filter

3. **News Item Details**
   - Expand to see full assertions
   - Source attribution
   - Related assertions
   - Adjust trust for source

4. **Actions**
   - Import RSS feed
   - Refresh feed
   - Trust/distrust source

**API Calls**:
- `GET /api/views/news?limit=50&since=<timestamp>` - Get news feed
- `POST /api/import/news` - Import RSS feed

**Deliverables**:
- Working news feed
- Trust-based ranking
- Time filtering
- Import RSS functionality

### Phase 3.5: Chat View (Days 9-10)
**Goal**: Q&A interface using only trusted assertions

#### Components:
- **ChatView.svelte**: Main view
  - Chat messages list
  - Input box
  - Source citations

#### Features:
1. **Chat Interface**
   - Message history (user questions + AI responses)
   - Input box with send button
   - Loading state while waiting for response
   - Streaming response (if time permits)

2. **Responses**
   - Display AI answer
   - Show source assertions used
   - Trust indicators for sources
   - "Why did you say that?" - show reasoning

3. **Source Citations**
   - Click citation to see full assertion
   - Adjust trust for cited sources
   - View trust explanation

4. **Chat History**
   - Store conversation in local state
   - Clear conversation button
   - Export conversation (optional)

**API Calls**:
- `POST /api/views/chat` - Send question, get answer

**Deliverables**:
- Working chat interface
- Q&A with Claude
- Source citations
- Trust-based answers

### Phase 3.6: Profile & Trust Management (Days 11-12)
**Goal**: User profile and trust relationship management

#### Components:
1. **ProfileView.svelte**
   - Display name
   - Email (read-only)
   - Trust threshold preference
   - Open-mindedness preference
   - Update profile button

2. **TrustView.svelte**
   - List of all trust relationships
   - Search/filter trusted entities
   - Adjust trust values
   - Remove trust relationships
   - Add new trust relationship

#### Features:
**Profile Management**:
- View profile
- Edit display name
- Adjust default trust threshold
- Adjust default open-mindedness
- Save changes

**Trust Management**:
- List all trusted users/sources
- Search for user/source
- Set trust value (0-1 slider)
- Remove trust relationship
- View trust propagation explanation
- See who you trust indirectly (via propagation)

**API Calls**:
- `GET /api/user/profile` - Get profile
- `PUT /api/user/profile` - Update profile
- `GET /api/trust` - List trust relationships
- `POST /api/trust` - Set trust value
- `GET /api/trust/{targetId}` - Get specific trust value
- `DELETE /api/trust/{targetId}` - Remove trust

**Deliverables**:
- Profile editing
- Trust relationship management
- Trust value adjustment UI

### Phase 3.7: Content Import UI (Days 13-14)
**Goal**: UI for importing Wikipedia articles and RSS feeds

#### Components:
- **ImportModal.svelte**: Modal for import actions
  - Wikipedia URL input
  - RSS feed URL input
  - Import progress
  - Job status

#### Features:
1. **Wikipedia Import**
   - Input Wikipedia URL
   - Extract and display title
   - Show import progress
   - Display extracted assertions count
   - Success/error feedback

2. **RSS Import**
   - Input RSS feed URL
   - Select max articles to import
   - Show import progress
   - Display assertions per article
   - Success/error feedback

3. **Job Tracking**
   - Show import job status
   - Progress indicator
   - View completed jobs
   - Cancel running job (optional)

**API Calls**:
- `POST /api/import/wikipedia` - Start Wikipedia import
- `POST /api/import/news` - Start RSS import
- `GET /api/import/jobs` (if implemented) - Check job status

**Deliverables**:
- Import modal
- Wikipedia import flow
- RSS import flow
- Progress tracking

## Testing Strategy

### Unit Tests
- Component tests with Vitest
- Store tests
- API client tests (mocked)
- Utility function tests

### Integration Tests
- Auth flow end-to-end
- View rendering with real API
- Trust adjustment flow
- Import flow

### Manual Testing
- Test on different screen sizes
- Test with different trust thresholds
- Test with real Wikipedia/RSS content
- Test error scenarios

## UI/UX Considerations

### Design Principles
1. **Trust Transparency**: Always show why content is shown/hidden
2. **Progressive Disclosure**: Start simple, reveal complexity on demand
3. **Immediate Feedback**: Update UI instantly when trust changes
4. **Accessibility**: Keyboard navigation, screen reader support
5. **Responsive**: Mobile-first, works on all devices

### Color Scheme
- **High Trust** (0.8-1.0): Green tones
- **Medium Trust** (0.5-0.8): Yellow/amber tones
- **Low Trust** (0-0.5): Red tones
- **Neutral** (0.5): Gray

### Typography
- Clear hierarchy (h1, h2, h3)
- Readable body text (16px+)
- Monospace for technical content

## Environment Setup

### Required Environment Variables
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3000/api
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Development Workflow
```bash
# Install dependencies
npm install

# Build shared types
cd ../shared && npm run build

# Start dev server
cd ../frontend
npm run dev

# In another terminal, run backend locally
cd ../backend
sam local start-api --env-vars env.json
```

## Success Criteria

### Must Have
- ✅ User can log in with Cognito
- ✅ User can view wiki articles filtered by trust
- ✅ User can view news feed ranked by trust
- ✅ User can chat and get answers from trusted knowledge
- ✅ User can adjust trust values for sources
- ✅ User can import Wikipedia articles
- ✅ User can import RSS feeds
- ✅ User can update their profile

### Nice to Have
- Visual trust graph
- Streaming chat responses
- Export conversations
- Trust propagation explanation UI
- Dark mode toggle
- Keyboard shortcuts
- Offline support

## Timeline

**Total Estimated Time**: 14 days

- Days 1-2: Infrastructure setup
- Days 3-4: Trust components
- Days 5-6: Wiki view
- Days 7-8: News view
- Days 9-10: Chat view
- Days 11-12: Profile & trust management
- Days 13-14: Content import + polish

## Next Steps

1. ✅ Review and approve this plan
2. Set up development environment
3. Create `.env` file with API credentials
4. Start with Phase 3.1: Core Infrastructure
5. Implement incrementally, testing as we go
6. Commit frequently with descriptive messages

---

**Ready to begin Phase 3 implementation!**
