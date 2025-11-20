# Phase 4: Deployment & Production Readiness

**Status**: Ready to Begin
**Duration**: 2-3 weeks
**Prerequisites**: Phase 3 Complete ✅

---

## Overview

Phase 4 focuses on deploying the Nudge platform to AWS and preparing it for production use. This includes real authentication with AWS Cognito, production deployment, seed data generation, and operational monitoring.

### Goals
- ✅ Real authentication with AWS Cognito (no more mock auth)
- ✅ Production deployment on AWS infrastructure
- ✅ Compelling seed data for demonstration
- ✅ Monitoring and observability setup
- ✅ Documentation for operations and maintenance

---

## Week 1: AWS Cognito Integration

### 1.1 Cognito Setup (Day 1-2)

**Create User Pool:**
```bash
# Via AWS Console or CLI
aws cognito-idp create-user-pool \
  --pool-name nudge-users-prod \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true}" \
  --auto-verified-attributes email \
  --username-attributes email \
  --mfa-configuration OPTIONAL
```

**Configuration Checklist:**
- [ ] Create Cognito User Pool
- [ ] Configure password policy (min 8 chars, mixed case, numbers)
- [ ] Enable email verification
- [ ] Set up MFA (optional, recommended)
- [ ] Create App Client (for frontend)
- [ ] Configure OAuth flows (if needed for social login)
- [ ] Note User Pool ID and App Client ID

**Output:**
- User Pool ID: `us-east-1_XXXXXXXXX`
- App Client ID: `xxxxxxxxxxxxxxxxxxxx`

### 1.2 Frontend Cognito Integration (Day 2-3)

**Install AWS Amplify:**
```bash
cd frontend
npm install @aws-amplify/auth
```

**Update Environment:**
```bash
# frontend/.env
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_REGION=us-east-1
VITE_API_BASE_URL=https://your-api-gateway-url
```

**Files to Update:**
- [ ] `frontend/src/lib/stores/auth.ts` - Replace mock auth with Amplify
  - Implement `login()` with `Auth.signIn()`
  - Implement `register()` with `Auth.signUp()`
  - Implement `logout()` with `Auth.signOut()`
  - Implement `confirmEmail()` with `Auth.confirmSignUp()`
  - Implement `resetPassword()` with `Auth.forgotPassword()`
  - Update `getAuthToken()` to get JWT from Amplify session
- [ ] `frontend/src/lib/api/client.ts` - Update to use real JWT tokens
- [ ] `frontend/src/lib/views/LoginView.svelte` - Remove "Quick Login" demo button
- [ ] Add email confirmation view
- [ ] Add password reset flow

**Testing Checklist:**
- [ ] User can register with email
- [ ] Email verification code arrives
- [ ] User can confirm email and login
- [ ] JWT token is properly set in API requests
- [ ] Logout clears session
- [ ] Password reset flow works

### 1.3 Backend Token Validation (Day 3-4)

**Update Lambda Authorizer:**
```typescript
// backend/lib/utils/auth.ts
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID!,
});

export async function validateToken(token: string) {
  try {
    const payload = await verifier.verify(token);
    return { userId: payload.sub, email: payload.email };
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
}
```

**Update SAM Template:**
```yaml
# template.yaml - Add environment variables
Environment:
  Variables:
    COGNITO_USER_POOL_ID: !Ref CognitoUserPool
    COGNITO_CLIENT_ID: !Ref CognitoUserPoolClient
```

**Testing:**
- [ ] Real JWT tokens are validated correctly
- [ ] Invalid tokens are rejected
- [ ] Expired tokens return 401
- [ ] User ID is extracted from token

### 1.4 Local Dev Server Updates (Day 4-5)

**Update local server to support Cognito tokens:**
- [ ] Add middleware to validate Cognito JWTs in local-server
- [ ] Keep mock auth as fallback for pure local development
- [ ] Add environment variable to toggle: `USE_COGNITO=true/false`

---

## Week 2: Production Deployment

### 2.1 Prepare Backend for Deployment (Day 5-6)

**Environment Variables Checklist:**
- [ ] `CLAUDE_API_KEY` - Store in AWS Secrets Manager
- [ ] `COGNITO_USER_POOL_ID` - From Step 1.1
- [ ] `COGNITO_CLIENT_ID` - From Step 1.1
- [ ] `STAGE` - Set to 'prod'

**Create Secrets in AWS:**
```bash
aws secretsmanager create-secret \
  --name /nudge/prod/claude-api-key \
  --secret-string "your-claude-api-key"
```

**Update SAM template:**
```yaml
# template.yaml
Parameters:
  ClaudeApiKeySecretArn:
    Type: String
    Description: ARN of the Secrets Manager secret containing Claude API key

Resources:
  # Add permissions for Lambdas to read secrets
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      Policies:
        - PolicyName: SecretsAccess
          PolicyDocument:
            Statement:
              - Effect: Allow
                Action:
                  - secretsmanager:GetSecretValue
                Resource: !Ref ClaudeApiKeySecretArn
```

### 2.2 Deploy Backend to AWS (Day 6-7)

**Build and Deploy:**
```bash
# From project root
cd backend
npm run build

# Build SAM application
sam build

# Deploy with guided wizard (first time)
sam deploy --guided

# Follow prompts:
# Stack Name: nudge-platform-prod
# AWS Region: us-east-1
# Parameter ClaudeApiKeySecretArn: arn:aws:secretsmanager:...
# Confirm changes before deploy: Y
# Allow SAM CLI IAM role creation: Y
# Save arguments to configuration file: Y
```

**Post-Deployment Checklist:**
- [ ] Note API Gateway endpoint URL
- [ ] Test all 8 Lambda functions via API Gateway
- [ ] Verify DynamoDB tables were created
- [ ] Check CloudWatch logs for any errors
- [ ] Verify Cognito integration works

**Troubleshooting:**
- If deployment fails, check CloudFormation events
- Verify IAM permissions for SAM
- Check Lambda function logs in CloudWatch

### 2.3 Deploy Frontend (Day 7-8)

**Build Frontend:**
```bash
cd frontend
npm run build
# Output: dist/
```

**Create S3 Bucket for Static Hosting:**
```bash
aws s3 mb s3://nudge-platform-frontend-prod
aws s3 website s3://nudge-platform-frontend-prod \
  --index-document index.html \
  --error-document index.html
```

**Configure S3 for Public Access:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::nudge-platform-frontend-prod/*"
    }
  ]
}
```

**Upload to S3:**
```bash
aws s3 sync dist/ s3://nudge-platform-frontend-prod/ --delete
```

**Set Up CloudFront Distribution:**
- [ ] Create CloudFront distribution pointing to S3 bucket
- [ ] Configure custom error response: 404 → /index.html (for SPA routing)
- [ ] Enable HTTPS
- [ ] Note CloudFront domain: `dxxxxxx.cloudfront.net`

**Optional - Custom Domain:**
- [ ] Register domain (Route 53 or external)
- [ ] Create SSL certificate in ACM
- [ ] Add CNAME record pointing to CloudFront
- [ ] Update CloudFront with custom domain

### 2.4 End-to-End Testing (Day 8-9)

**Test Flows:**
- [ ] Register new user → receive email → confirm → login
- [ ] Set trust relationships
- [ ] Import Wikipedia article
- [ ] View wiki with trust filtering
- [ ] Import news from RSS
- [ ] View news feed
- [ ] Ask questions in chat
- [ ] Create groups
- [ ] Manage profile

**Performance Testing:**
- [ ] Test with 10+ concurrent users
- [ ] Verify trust propagation completes within 5 seconds
- [ ] Check Claude API latency
- [ ] Monitor Lambda cold starts

**Security Testing:**
- [ ] Verify all API endpoints require authentication
- [ ] Test with invalid/expired tokens
- [ ] Check CORS configuration
- [ ] Verify no sensitive data in logs

---

## Week 3: Seed Data & Production Readiness

### 3.1 Create Seed Data Generation Script (Day 9-10)

**Script: `backend/scripts/generate-seed-data.ts`**

Features:
- [ ] Import 10-15 Wikipedia articles across topics:
  - Science: "Photosynthesis", "Quantum Computing", "DNA"
  - History: "World War II", "Ancient Rome"
  - Geography: "Climate Change", "Pacific Ocean"
  - Technology: "Artificial Intelligence", "Blockchain"
  - Culture: "Jazz Music", "Renaissance Art"
- [ ] Create 12 test users with diverse profiles:
  - Scientists, journalists, educators, skeptics
  - Different trust thresholds (0.4-0.85)
- [ ] Establish varied trust networks:
  - Some users trust scientific sources highly
  - Others trust news sources
  - Create interesting trust propagation patterns
- [ ] Import news from RSS feeds:
  - BBC, Reuters, NYTimes, etc.
  - 20-30 recent articles

**Run Script:**
```bash
cd backend
npm run seed-data -- --stage prod --users 12 --articles 15
```

### 3.2 Documentation Updates (Day 10-11)

**Create New Documentation:**
- [ ] `DEPLOYMENT.md` - Step-by-step deployment guide
- [ ] `OPERATIONS.md` - Monitoring, troubleshooting, maintenance
- [ ] `API.md` - API endpoint documentation
- [ ] Update `README.md` with production deployment section

**DEPLOYMENT.md Contents:**
- Prerequisites (AWS account, CLI, SAM, etc.)
- Cognito setup instructions
- Backend deployment steps
- Frontend deployment steps
- Environment variable configuration
- Troubleshooting common issues

**OPERATIONS.md Contents:**
- CloudWatch dashboard setup
- Key metrics to monitor:
  - Lambda invocation counts and errors
  - DynamoDB read/write capacity
  - Claude API usage and costs
  - Trust propagation duration
- Log aggregation and analysis
- Backup and disaster recovery
- Cost monitoring and optimization

### 3.3 Monitoring & Observability (Day 11-12)

**CloudWatch Dashboard:**
```bash
# Create dashboard via Console or CLI
aws cloudwatch put-dashboard \
  --dashboard-name NudgePlatform \
  --dashboard-body file://dashboard.json
```

**Metrics to Monitor:**
- [ ] Lambda invocations (all functions)
- [ ] Lambda errors and throttles
- [ ] Lambda duration (p50, p90, p99)
- [ ] DynamoDB read/write capacity usage
- [ ] API Gateway 4xx/5xx errors
- [ ] API Gateway latency

**CloudWatch Alarms:**
- [ ] Lambda error rate > 5%
- [ ] API Gateway 5xx rate > 1%
- [ ] DynamoDB throttling
- [ ] High Lambda duration (> 10 seconds)

**Logging Strategy:**
- [ ] Structured logging in all Lambdas
- [ ] Request/response logging (sanitized)
- [ ] Error tracking with stack traces
- [ ] Consider CloudWatch Logs Insights queries

### 3.4 Performance Optimization (Day 12-13)

**Lambda Optimizations:**
- [ ] Configure memory appropriately (test 512MB, 1024MB, 2048MB)
- [ ] Enable Lambda SnapStart if using Java (N/A for Node.js)
- [ ] Minimize cold starts:
  - Keep Lambdas warm with CloudWatch Events (optional)
  - Reduce bundle size
  - Remove unused dependencies

**DynamoDB Optimizations:**
- [ ] Review GSI design for query patterns
- [ ] Consider on-demand pricing vs. provisioned
- [ ] Enable DynamoDB auto-scaling if using provisioned
- [ ] Add DynamoDB TTL for cache entries

**Frontend Optimizations:**
- [ ] Enable CloudFront compression
- [ ] Set proper cache headers
- [ ] Lazy load components
- [ ] Code splitting for routes

### 3.5 Cost Analysis & Optimization (Day 13-14)

**Set Up AWS Cost Explorer:**
- [ ] Tag all resources: `Project=Nudge`, `Environment=prod`
- [ ] Create cost allocation tags
- [ ] Set up billing alerts

**Projected Monthly Costs (12 users):**
| Service | Estimated Cost |
|---------|----------------|
| Lambda | $5 |
| DynamoDB | $10 |
| API Gateway | $3 |
| S3/CloudFront | $5 |
| Cognito | Free (< 50 MAU) |
| Claude API | $8 |
| **Total** | **~$31/month** |

**Cost Optimization Tips:**
- [ ] Use DynamoDB on-demand for low traffic
- [ ] Monitor Claude API usage (biggest variable cost)
- [ ] Consider caching Claude responses
- [ ] Use S3 lifecycle policies for old data
- [ ] Review and remove unused resources

---

## Week 4: Testing & Launch Preparation

### 4.1 User Acceptance Testing (Day 14-15)

**Test Users:**
- [ ] Create 5-10 real test accounts
- [ ] Invite team members or beta testers
- [ ] Provide test scenarios:
  - Import content on a topic you care about
  - Set trust relationships
  - Explore how trust affects your view
  - Try the chat Q&A
  - Create a group

**Feedback Collection:**
- [ ] Create feedback form (Google Forms or Typeform)
- [ ] Track issues in GitHub Issues
- [ ] Prioritize critical bugs vs. enhancements

### 4.2 Security Review (Day 15-16)

**Security Checklist:**
- [ ] All API endpoints require authentication ✅
- [ ] Input validation with Zod schemas ✅
- [ ] SQL injection prevention (N/A - using DynamoDB)
- [ ] XSS prevention in frontend
- [ ] CSRF protection (not needed for stateless JWT API)
- [ ] Rate limiting on API Gateway
- [ ] Secrets in Secrets Manager (not environment variables) ✅
- [ ] HTTPS everywhere ✅
- [ ] Secure password policy in Cognito ✅

**Optional - External Security Audit:**
- Consider using AWS Inspector
- Or hire security consultant for penetration testing

### 4.3 Backup & Disaster Recovery (Day 16-17)

**DynamoDB Backups:**
- [ ] Enable point-in-time recovery (PITR)
- [ ] Configure daily backups
- [ ] Test restore procedure

**Code Backups:**
- [ ] GitHub repository (already done) ✅
- [ ] Tag releases for deployments

**Disaster Recovery Plan:**
- [ ] Document recovery procedures
- [ ] RTO (Recovery Time Objective): 4 hours
- [ ] RPO (Recovery Point Objective): 24 hours
- [ ] Test disaster recovery annually

### 4.4 Launch! (Day 17+)

**Pre-Launch Checklist:**
- [ ] All tests passing ✅
- [ ] Production deployment successful ✅
- [ ] Seed data loaded ✅
- [ ] Monitoring and alerts configured ✅
- [ ] Documentation complete ✅
- [ ] Beta testing complete
- [ ] Critical bugs fixed

**Launch Day:**
- [ ] Final smoke test on production
- [ ] Announce launch (blog, social media, etc.)
- [ ] Monitor closely for first 24 hours
- [ ] Be ready for support requests

**Post-Launch:**
- [ ] Monitor metrics daily for first week
- [ ] Respond to user feedback
- [ ] Track and fix bugs
- [ ] Plan Phase 5 enhancements

---

## Rollback Plan

If something goes wrong during deployment:

1. **Backend Issues:**
   - Revert to previous SAM deployment: `sam deploy --stack-name nudge-platform-prod --parameter-overrides PreviousVersion=X`
   - Or roll back via CloudFormation console

2. **Frontend Issues:**
   - Revert S3 bucket to previous version
   - Or roll back CloudFront distribution

3. **Database Issues:**
   - Restore from DynamoDB backup
   - Point-in-time recovery

---

## Success Metrics

**Week 1:**
- ✅ Cognito integration complete
- ✅ Users can register, login, logout
- ✅ JWT tokens work end-to-end

**Week 2:**
- ✅ Backend deployed to AWS
- ✅ Frontend deployed to CloudFront
- ✅ All functionality working in production

**Week 3:**
- ✅ Seed data loaded (12 users, 15+ articles, 20+ news items)
- ✅ Monitoring dashboard created
- ✅ Documentation complete

**Week 4:**
- ✅ Beta testing successful
- ✅ Launch complete
- ✅ Platform is stable and usable

---

## Phase 5 Preview: Enhancements

After Phase 4 is complete and stable, consider these enhancements:

**Performance:**
- Vector-based semantic search for assertions
- Redis caching layer for trust computations
- Lazy loading and pagination improvements

**Features:**
- Trust path visualization (show why you trust something)
- Controversy score and explanation
- Export/import trust networks
- Browser extension
- Mobile app (React Native)

**Quality:**
- E2E tests with Playwright
- CI/CD pipeline (GitHub Actions)
- Automated security scanning
- Performance benchmarking

**Operations:**
- Multi-region deployment
- CDN optimization
- Advanced monitoring with DataDog or New Relic
- A/B testing framework

---

**Last Updated**: November 20, 2025
**Status**: Ready to Execute
**Next Action**: Begin Week 1 - Cognito Setup
