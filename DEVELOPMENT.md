# Development Guide

This guide covers the development workflow, architecture decisions, and implementation details.

## Development Workflow

### Initial Setup

```bash
# Clone and setup
git clone <repo>
cd nudge
npm run install:all
npm run build:shared

# Set up AWS credentials
aws configure

# Install SAM CLI (if not already installed)
# macOS: brew install aws-sam-cli
# Linux: pip install aws-sam-cli
```

### Daily Development

```bash
# 1. Work on shared types (if needed)
cd shared
npm run watch  # Auto-rebuild on changes

# 2. Work on backend
cd backend
# Edit functions/*/index.ts or lib/*
npm run build

# 3. Work on frontend
cd frontend
npm run dev  # Hot reload on http://localhost:5173
```

### Testing Changes

```bash
# Backend - Local testing
cd backend
sam local start-api

# Backend - Unit tests
npm test

# Frontend - Local testing
cd frontend
npm run dev

# Frontend - Type checking
npm run check
```

### Deployment

```bash
# Deploy backend changes
sam build && sam deploy

# Deploy frontend changes
cd frontend
npm run build
aws s3 sync dist/ s3://$(aws cloudformation describe-stacks --stack-name trust-platform-dev --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' --output text)/
```

## Architecture Decisions

### Why Svelte over React?

1. **Smaller bundle size** - Svelte compiles to vanilla JS
2. **Better performance** - No virtual DOM overhead
3. **Less boilerplate** - Reactive stores vs hooks/context
4. **Built-in animations** - Better UX out of the box

### Why TypeScript for Backend?

1. **Shared types** - Same types used in frontend and backend
2. **Better DX** - Single language, consistent tooling
3. **Type safety** - Catch errors at compile time
4. **Fast cold starts** - Node.js Lambda performs well

### Why DynamoDB?

1. **Serverless** - No server management
2. **Pay per use** - Cost-effective for 12 users
3. **Auto-scaling** - Handles traffic spikes
4. **GSIs** - Flexible querying patterns

Trade-offs:
- No joins (denormalize data)
- No transactions across tables (design around it)
- Query limitations (use GSIs wisely)

### Why SAM over CDK?

1. **Simpler** - YAML template vs TypeScript code
2. **Less abstraction** - Closer to CloudFormation
3. **Local testing** - `sam local` works well
4. **Faster builds** - No synthesis step

Trade-offs:
- More verbose than CDK
- Less programmatic control

## Implementation Patterns

### Shared Types Pattern

Types are defined once in `shared/types/` and used everywhere:

```typescript
// shared/types/assertion.ts
export interface Assertion {
  assertionId: string;
  content: string;
  // ...
}

// backend/functions/assertion-crud/index.ts
import { Assertion } from '@nudge/shared';

// frontend/src/api/assertions.ts
import type { Assertion } from '@shared/types/assertion';
```

### DynamoDB Access Pattern

```typescript
// backend/lib/db/assertions.ts
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

export async function putAssertion(client: DynamoDBDocumentClient, assertion: Assertion) {
  await client.send(new PutCommand({
    TableName: process.env.ASSERTIONS_TABLE,
    Item: {
      PK: `ASSERTION#${assertion.assertionId}`,
      SK: `VERSION#${assertion.version}`,
      ...assertion,
      // GSI keys
      GSI1PK: `SOURCE#${assertion.sourceId}`,
      GSI1SK: `CREATED#${assertion.createdAt}`,
    },
  }));
}
```

### Lambda Handler Pattern

```typescript
// backend/functions/*/index.ts
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  // 1. Extract userId from Cognito
  const userId = event.requestContext.authorizer?.claims?.sub;

  // 2. Validate input
  const input = parseAndValidate(event.body);

  // 3. Business logic
  const result = await doSomething(userId, input);

  // 4. Return response
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  };
}
```

### Svelte Store Pattern

```typescript
// frontend/src/stores/trust.ts
import { writable } from 'svelte/store';

export const trustValues = writable<Map<string, number>>(new Map());

export async function setTrust(targetId: string, value: number) {
  // Optimistic update
  trustValues.update(map => {
    map.set(targetId, value);
    return map;
  });

  try {
    await api.setTrust(targetId, value);
  } catch (err) {
    // Rollback on error
    trustValues.update(map => {
      map.delete(targetId);
      return map;
    });
    throw err;
  }
}
```

## Testing Strategy

### Backend Tests

```typescript
// backend/functions/trust-operations/index.test.ts
import { describe, it, expect } from 'vitest';
import { handler } from './index';

describe('TrustOperationsFunction', () => {
  it('sets trust value', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ targetId: 'test', trustValue: 0.8 }),
      requestContext: {
        authorizer: { claims: { sub: 'user123' } }
      }
    };

    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);
  });
});
```

### Frontend Tests

```typescript
// frontend/src/lib/components/TrustSlider.test.ts
import { render, fireEvent } from '@testing-library/svelte';
import TrustSlider from './TrustSlider.svelte';

test('updates trust value on slide', async () => {
  const { getByRole } = render(TrustSlider, {
    props: { value: 0.5 }
  });

  const slider = getByRole('slider');
  await fireEvent.change(slider, { target: { value: 0.8 } });

  expect(slider.value).toBe('0.8');
});
```

## Common Tasks

### Adding a New API Endpoint

1. **Define types** in `shared/types/`
2. **Add Lambda function** in `backend/functions/`
3. **Add to SAM template** in `template.yaml`
4. **Add API client** in `frontend/src/api/`
5. **Deploy**: `sam build && sam deploy`

### Adding a New Svelte Component

1. **Create component** in `frontend/src/lib/components/`
2. **Add props and types**
3. **Import and use** in routes
4. **Style with Tailwind**

### Modifying DynamoDB Schema

1. **Update types** in `shared/types/`
2. **Update table definition** in `template.yaml`
3. **Update access patterns** in `backend/lib/db/`
4. **Deploy**: `sam deploy` (CloudFormation will update)
5. **Migration**: Write script if needed

### Adding Claude API Integration

1. **Define prompt template** in `backend/lib/llm/prompts.ts`
2. **Call Claude** via `backend/lib/llm/client.ts`
3. **Parse response** and create assertions
4. **Cache result** in GeneratedContentCache

## Debugging

### Backend (Lambda)

```bash
# View logs
sam logs -n UserProfileFunction --tail

# Or in AWS Console: CloudWatch > Log Groups

# Local debugging with breakpoints
sam local start-api --debug-port 5858
# Attach debugger on port 5858
```

### Frontend

```bash
# Svelte DevTools (Chrome/Firefox extension)
# View component tree, stores, events

# Console logging
console.log('Trust value:', $trustValues.get(targetId));
```

### DynamoDB

```bash
# Query table locally
aws dynamodb scan --table-name trust-platform-assertions-dev --limit 10

# Or use NoSQL Workbench for DynamoDB (GUI)
```

## Performance Optimization

### Backend

- **Caching**: Use GeneratedContentCache for expensive operations
- **Batch operations**: BatchGetItem/BatchWriteItem when possible
- **Lambda memory**: Increase for CPU-bound tasks
- **Cold starts**: Keep functions warm with EventBridge cron

### Frontend

- **Code splitting**: Lazy load routes
- **Debounce**: API calls on user input
- **Virtual scrolling**: For long lists
- **Image optimization**: Use WebP, lazy loading

## Security Best Practices

1. **Never commit secrets** - Use Secrets Manager or env vars
2. **Validate all inputs** - Use Zod schemas
3. **Sanitize user content** - Prevent XSS
4. **Use HTTPS everywhere** - No mixed content
5. **Principle of least privilege** - IAM roles/policies

## Troubleshooting

### "Module not found" errors

```bash
# Rebuild shared types
cd shared && npm run build

# Clear node_modules
rm -rf node_modules package-lock.json
npm install
```

### SAM build failures

```bash
# Clean .aws-sam directory
rm -rf .aws-sam

# Rebuild
sam build --use-container
```

### Cognito auth not working

1. Check User Pool ID and Client ID in `.env`
2. Verify JWT token in network tab
3. Check API Gateway authorizer configuration
4. Ensure Cognito user is confirmed (check email)

## Next Steps

After Phase 1 setup:

1. **Phase 2**: Implement DynamoDB access layer
2. **Phase 3**: Build trust propagation engine
3. **Phase 4**: Integrate Claude API
4. **Phase 5**: Build frontend views

See [README.md](./README.md) for full roadmap.
