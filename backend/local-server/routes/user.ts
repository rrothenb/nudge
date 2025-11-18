/**
 * User profile routes
 */
import { Router } from 'express';
import { store } from '../data/store.js';
import type { UserProfile } from '@nudge/shared';

export const userRoutes = Router();

// GET /api/user/profile
userRoutes.get('/profile', (req, res) => {
  const userId = (req as any).userId;
  const user = store.getUser(userId);

  if (!user) {
    // Auto-create user on first access
    const newUser: UserProfile = {
      userId,
      email: `${userId}@example.com`,
      displayName: userId.replace('user-', '').replace('-', ' '),
      defaultTrustThreshold: 0.5,
      openMindedness: 0.2,
      showControversySignals: true,
      showAlternateViews: true,
      defaultView: 'wiki',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.setUser(userId, newUser);
    return res.json(newUser);
  }

  res.json(user);
});

// PUT /api/user/profile
userRoutes.put('/profile', (req, res) => {
  const userId = (req as any).userId;
  const user = store.getUser(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updates = req.body;

  // Validate and apply updates
  const updatedUser: UserProfile = {
    ...user,
    ...updates,
    userId, // Don't allow changing userId
    email: user.email, // Don't allow changing email
    updatedAt: new Date().toISOString(),
  };

  store.setUser(userId, updatedUser);
  res.json(updatedUser);
});
