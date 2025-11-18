/**
 * Local development server
 * Mock implementation of all Lambda endpoints
 */
import express from 'express';
import cors from 'cors';
import { seedData } from './data/seed.js';
import { userRoutes } from './routes/user.js';
import { assertionRoutes } from './routes/assertions.js';
import { trustRoutes } from './routes/trust.js';
import { viewRoutes } from './routes/views.js';
import { importRoutes } from './routes/import.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Mock auth middleware - extracts userId from Authorization header
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Extract userId from mock token (format: "mock-jwt-token-{timestamp}")
    // In development, we stored userId in localStorage as 'user_id'
    // The token itself doesn't matter, we'll use a default user
    (req as any).userId = 'user-demo';
  } else if (req.path.includes('/api/')) {
    // For API routes, require auth
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
});

// Routes
app.use('/api/user', userRoutes);
app.use('/api/assertions', assertionRoutes);
app.use('/api/trust', trustRoutes);
app.use('/api/views', viewRoutes);
app.use('/api/import', importRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Seed data and start server
seedData();

app.listen(PORT, () => {
  console.log(`
🚀 Local development server running!

   API Server: http://localhost:${PORT}
   Health Check: http://localhost:${PORT}/health

   Mock user: demo@example.com
   User ID: user-demo

   Frontend: Update VITE_API_URL=http://localhost:${PORT}
  `);
});
