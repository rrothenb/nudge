# Trust-Based Knowledge Platform

A multi-user trust-based knowledge platform that enables personalized truth through trust propagation. Users see content filtered and ranked by their personal trust network, allowing multiple incompatible worldviews to coexist without forced consensus.

## 🎯 Project Vision

This system treats **trust as a primitive** rather than content. Every piece of information exists as an assertion that can be independently trusted or distrusted. Your experience is determined by what **you** choose to trust, not what the platform or majority decides.

### Key Features

- **Wiki View**: Topic-organized knowledge browser with trust-filtered articles
- **News View**: Time-ordered feed of news with trust-based ranking
- **Chat View**: AI Q&A interface using only trusted assertions
- **Trust Propagation**: Automatic inference of trust through your network
- **Content Import**: Wikipedia and news article import with assertion extraction

## 🏗️ Architecture

**Frontend**: Svelte + TypeScript + Tailwind CSS
**Backend**: AWS Lambda (Node.js + TypeScript)
**Database**: DynamoDB
**Auth**: AWS Cognito
**LLM**: Claude API (Anthropic)
**IaC**: AWS SAM

```
┌─────────────────────────────────────┐
│   Svelte Frontend (S3 + CloudFront) │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   API Gateway + Cognito Auth        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Lambda Functions (TypeScript)     │
│   - Wiki/News/Chat Query            │
│   - Trust Operations                │
│   - Content Import                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   DynamoDB Tables                   │
│   - Assertions, Trust, Users        │
└─────────────────────────────────────┘
```

## 📁 Project Structure

```
nudge/
├── shared/                 # Shared TypeScript types & validators
│   ├── types/             # Domain models (Assertion, Trust, User)
│   ├── validators/        # Zod schemas
│   └── constants/         # Config and defaults
├── backend/               # Lambda functions
│   ├── functions/         # Individual Lambda handlers
│   │   ├── user-profile/
│   │   ├── assertion-crud/
│   │   ├── trust-operations/
│   │   ├── wiki-query/
│   │   ├── news-query/
│   │   ├── chat-query/
│   │   ├── wiki-import/
│   │   └── news-import/
│   └── lib/              # Shared backend utilities
│       ├── db/           # DynamoDB operations
│       ├── llm/          # Claude API client
│       └── utils/        # Helper functions
├── frontend/             # Svelte app
│   └── src/
│       ├── lib/          # Svelte components
│       ├── stores/       # State management
│       ├── api/          # API client
│       └── routes/       # Views (wiki, news, chat)
├── template.yaml         # AWS SAM template
└── samconfig.toml        # SAM deployment config
```

## 🎉 What's Implemented (Phase 2 Complete)

### Backend Infrastructure
- **8 Lambda Functions**: All fully implemented and tested
- **DynamoDB Layer**: Complete CRUD operations for all tables
- **Trust Engine**: Iterative diffusion algorithm with convergence detection
- **Claude Integration**: Assertion extraction and article generation
- **Test Suite**: 45+ unit tests + 6 integration tests with real Claude API

### Key Capabilities Demonstrated
1. **Article Decomposition**: Break Wikipedia/news articles into atomic assertions
2. **Trust Propagation**: Multi-hop trust inference through user networks
3. **Personalized Filtering**: Filter content based on user's trust values
4. **Article Reassembly**: Generate coherent articles from trusted assertions
5. **Trust Influence**: Verified that trust values change generated content

### What's Working
- ✅ User profile management (auto-creation on first login)
- ✅ Assertion CRUD with GSI queries (by source, type, topic)
- ✅ Trust operations with background propagation
- ✅ Wikipedia article import with Claude extraction
- ✅ RSS feed import with assertion extraction
- ✅ Wiki article generation (trust-weighted)
- ✅ News feed (trust-ranked with recency scoring)
- ✅ Chat Q&A (using only trusted assertions)
- ✅ Cache invalidation based on trust changes

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- AWS CLI configured
- AWS SAM CLI installed
- Anthropic Claude API key

### 1. Install Dependencies

```bash
# Install all dependencies (root, shared, backend, frontend)
npm run install:all

# Or manually:
npm install
cd shared && npm install
cd ../backend && npm install
cd ../frontend && npm install
```

### 2. Build Shared Types

```bash
npm run build:shared
```

### 3. Set Up Environment

```bash
# Frontend environment
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your AWS Cognito details (after deployment)

# Claude API Key
export CLAUDE_API_KEY=your-api-key-here
```

### 4. Deploy Backend to AWS

```bash
# Build and deploy
sam build
sam deploy --guided

# Follow prompts:
# - Stack name: trust-platform-dev
# - Region: us-east-1
# - Environment: dev
# - ClaudeAPIKeyValue: your-claude-api-key
# - Confirm changes: Y
# - Allow SAM CLI IAM role creation: Y
# - Save arguments to config: Y
```

After deployment, note the outputs:
- `ApiEndpoint`: Your API Gateway URL
- `UserPoolId`: Cognito User Pool ID
- `UserPoolClientId`: Cognito Client ID
- `WebsiteBucketName`: S3 bucket for frontend

### 5. Configure Frontend

Update `frontend/.env`:

```env
VITE_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/dev
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 6. Run Frontend Locally

```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

### 7. Deploy Frontend to S3

```bash
cd frontend
npm run build
aws s3 sync dist/ s3://your-bucket-name/
```

## 📚 Development

### Running Backend Locally

```bash
# Start local API (requires SAM)
sam local start-api --env-vars env.json

# Create env.json:
{
  "Parameters": {
    "CLAUDE_API_KEY": "your-key"
  }
}
```

### Running Frontend

```bash
cd frontend
npm run dev          # Dev server
npm run build        # Production build
npm run preview      # Preview production build
```

### Testing

#### Running Tests

```bash
# Backend: Run all tests
npm test

# Backend: Run with coverage report
npm test -- --run --coverage

# Backend: Run specific test file
npm test -- --run lib/trust/graph.test.ts

# Backend: Run integration tests (requires CLAUDE_API_KEY)
export CLAUDE_API_KEY=your-api-key
npm test -- --run lib/llm/integration.test.ts

# Frontend tests
cd frontend
npm test
```

#### Test Suite

The backend includes comprehensive test coverage:

**Unit Tests (45+ tests)**
- **Trust Graph** (21 tests): Node/edge operations, complex topologies, cycles
- **Trust Propagation** (16 tests): Diffusion algorithm, multi-hop trust, convergence
- **Trust Engine**: Network computation, filtering, sorting by trust
- **Error Utilities** (11 tests): Custom error types, status codes, formatting
- **Auth Utilities** (8 tests): JWT extraction, body parsing, ownership checks
- **Response Utilities** (12 tests): API Gateway responses, CORS headers
- **Lambda Functions**: User profile handler with mocking

**Integration Tests (6 tests using Claude API)**
- ✅ **Article Decomposition**: Extract assertions from Wikipedia/news content
- ✅ **Trust-Based Filtering**: Filter assertions by user's trust values
- ✅ **Article Reassembly**: Generate coherent articles from trusted assertions
- ✅ **Trust Influence**: Verify high vs low trust produces different content
- ✅ **Chat Q&A**: Answer questions using only trusted knowledge base
- ✅ **End-to-End Flow**: Decompose → Filter → Reassemble workflow

The integration tests demonstrate the **core value proposition** of the platform: breaking down articles into atomic assertions, applying personalized trust filtering, and reassembling knowledge that respects the user's trust network.

### Type Checking

```bash
# Frontend
cd frontend
npm run check

# Backend
cd backend
npm run build
```

## 🗄️ Database Schema

### DynamoDB Tables

**UsersTable**
- PK: `USER#<userId>`, SK: `PROFILE`
- Stores user profiles and preferences

**AssertionsTable**
- PK: `ASSERTION#<assertionId>`, SK: `VERSION#<timestamp>`
- GSI1 (BySource): Query assertions by source
- GSI2 (ByType): Query assertions by type
- GSI3 (ByTopic): Query assertions by topic

**TrustRelationshipsTable**
- PK: `USER#<userId>`, SK: `TARGET#<targetId>`
- GSI1 (ByTarget): Reverse lookup (who trusts X)

**GeneratedContentCache**
- PK: `USER#<userId>`, SK: `CONTENT#<type>#<id>`
- TTL: 24 hours

**ImportJobsTable**
- PK: `JOB#<jobId>`, SK: `STATUS`
- GSI1 (ByUser): Query user's import jobs

## 🔑 API Endpoints

### Authentication
All endpoints require Cognito JWT token in `Authorization` header.

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile

### Assertions
- `POST /api/assertions` - Create assertion
- `GET /api/assertions/{id}` - Get assertion
- `GET /api/assertions` - List assertions (with filters)

### Trust
- `POST /api/trust` - Set trust value
- `GET /api/trust/{targetId}` - Get trust value
- `GET /api/trust` - List all trust relationships

### Views
- `GET /api/views/wiki/{topic}` - Get wiki article
- `GET /api/views/news` - Get news feed
- `POST /api/views/chat` - Chat query

### Import
- `POST /api/import/wikipedia` - Start Wikipedia import
- `POST /api/import/news` - Start news import

## 🎨 Frontend Components

### Core Components
- `TrustSlider.svelte` - Adjust trust (0-1) with visual feedback
- `AssertionCard.svelte` - Display single assertion
- `SourceBadge.svelte` - Show source with trust indicator

### View Components
- `WikiView.svelte` - Topic-based knowledge browser
- `NewsView.svelte` - Time-ordered news feed
- `ChatView.svelte` - Q&A interface

## 🔒 Security

- **Authentication**: AWS Cognito with JWT tokens
- **Authorization**: Users can only modify their own data
- **API Gateway**: Validates tokens on every request
- **Secrets**: Claude API key stored in AWS Secrets Manager
- **HTTPS**: All traffic encrypted via CloudFront/API Gateway

## 📊 Monitoring

CloudWatch dashboards track:
- Lambda invocations and errors
- API Gateway requests and latency
- DynamoDB consumed capacity
- Claude API usage

## 💰 Costs (Estimated for 12 Users)

- **AWS Services**: ~$25/month
  - Lambda: $5
  - DynamoDB: $10
  - API Gateway: $3
  - S3/CloudFront: $6
  - Cognito: Free (under 50 users)

- **Claude API**: ~$8/month
  - Assertion extraction: $1
  - Article generation: $5
  - Chat queries: $2

**Total: ~$33/month**

## 🗺️ Roadmap

### Phase 1: Setup ✅ (Complete)
- ✅ Project structure
- ✅ Shared types
- ✅ SAM template
- ✅ Lambda placeholders

### Phase 2: Core Backend ✅ (Complete)
- ✅ DynamoDB access layer (users, assertions, trust, cache, jobs)
- ✅ Trust propagation engine (graph, diffusion, path finding)
- ✅ Claude API integration (extraction, generation)
- ✅ All 8 Lambda functions implemented
  - ✅ user-profile (GET/PUT with auto-creation)
  - ✅ assertion-crud (create, read, query)
  - ✅ trust-operations (set, get, list, delete)
  - ✅ wiki-query (trust-filtered article generation)
  - ✅ news-query (trust-ranked news feed)
  - ✅ chat-query (Q&A from trusted assertions)
  - ✅ wiki-import (Wikipedia article import)
  - ✅ news-import (RSS feed import)
- ✅ Comprehensive test suite (45+ unit tests, 6 integration tests)

### Phase 3: Frontend (Next)
- Wiki view implementation
- News view implementation
- Chat view implementation
- User profile management UI
- Trust relationship management UI

### Phase 4: Deployment & Polish
- Seed data generation
- Production deployment
- User testing with 12-user demo
- Performance optimization
- Documentation refinement

## 📖 Documentation

- [Phase 1 Specification](./phase1-intro-section.md) - Vision and concepts
- [Phase 2 Specification](./phase2-specification.md) - Technical details
- [Unified Specification](./trust_knowledge_unified_spec_v2.md) - Core algorithms

## 🤝 Contributing

This is currently a proof-of-concept for a 12-user demo. Phase 2 (backend) is complete. Contributions welcome for Phase 3 (frontend).

## 📄 License

See [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

Built with Claude (Sonnet 4.5) assistance. Uses Anthropic's Claude API for assertion extraction and article generation.

---

**Status**: Phase 2 Complete ✅ - Backend fully implemented with comprehensive test suite. Ready for Phase 3 (Frontend Development).
