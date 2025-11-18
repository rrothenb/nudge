# Local Development Server

Mock backend server for local frontend development without AWS deployment.

## Features

- ✅ All 8 Lambda endpoints implemented
- ✅ In-memory data store (no database needed)
- ✅ Mock authentication (no Cognito needed)
- ✅ Seed data with sample users, assertions, and trust relationships
- ✅ CORS enabled for frontend development
- ✅ Hot reload with tsx watch

## Quick Start

```bash
# Install dependencies (from this directory)
npm install

# Start the server
npm run dev

# Or without watch mode
npm start
```

The server will start on `http://localhost:3000`.

## Seed Data

The server automatically seeds with:

- **3 users**: demo, alice, bob
- **8 assertions**: covering topics like photosynthesis, AI, climate, etc.
- **6 trust relationships**: for the demo user
- **News feed**: 6 news items with trust scores

### Demo User

- Email: `demo@example.com`
- User ID: `user-demo`
- Password: (not required - auto-login with any token)

## API Endpoints

All endpoints are prefixed with `/api`.

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile

### Assertions
- `POST /api/assertions` - Create assertion
- `GET /api/assertions/:id` - Get assertion
- `GET /api/assertions?sourceId=X&topic=Y` - List/filter assertions

### Trust
- `POST /api/trust` - Set trust value
- `GET /api/trust/:targetId` - Get trust value
- `GET /api/trust` - List all trust relationships
- `DELETE /api/trust/:targetId` - Remove trust relationship

### Views
- `GET /api/views/wiki/:topic` - Get wiki article
- `GET /api/views/news?limit=50&since=ISO_DATE` - Get news feed
- `POST /api/views/chat` - Chat query

### Import
- `POST /api/import/wikipedia` - Import Wikipedia article
- `POST /api/import/news` - Import RSS feed

## Frontend Setup

Update your `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
```

Then start the frontend:

```bash
cd ../../frontend
npm run dev
```

The frontend will run on `http://localhost:5173` and connect to the local backend.

## Authentication

The mock auth extracts `userId` from the Authorization header but doesn't validate tokens.

When the frontend sends:
```
Authorization: Bearer mock-jwt-token-12345
```

The backend automatically uses `user-demo` as the authenticated user.

## Data Persistence

⚠️ **Data is in-memory only!** Restarting the server resets all data to seed state.

For persistent data during development, you'll need to deploy to AWS or add a local database.

## Testing

```bash
# Test health check
curl http://localhost:3000/health

# Test user profile
curl -H "Authorization: Bearer test" http://localhost:3000/api/user/profile

# Test trust list
curl -H "Authorization: Bearer test" http://localhost:3000/api/trust
```

## Troubleshooting

**Port already in use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

**CORS errors:**
- Make sure frontend is running on `localhost:5173`
- CORS is configured to allow all origins in development

**"Unauthorized" errors:**
- Ensure Authorization header is present
- Any value works: `Bearer test`, `Bearer mock-token`, etc.
