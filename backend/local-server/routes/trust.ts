/**
 * Trust operations routes
 */
import { Router } from 'express';
import { store } from '../data/store.js';
import type { TrustRelationship } from '@nudge/shared';

export const trustRoutes = Router();

// POST /api/trust
trustRoutes.post('/', (req, res) => {
  const userId = (req as any).userId;
  const { targetId, targetType, trustValue, notes } = req.body;

  // Validate
  if (!targetId || !targetType || typeof trustValue !== 'number') {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (trustValue < 0 || trustValue > 1) {
    return res.status(400).json({ error: 'Trust value must be between 0 and 1' });
  }

  const trust: TrustRelationship = {
    userId,
    targetId,
    targetType,
    trustValue,
    isDirectTrust: true,
    lastUpdated: new Date().toISOString(),
    notes,
  };

  store.setTrustValue(userId, trust);
  res.json(trust);
});

// GET /api/trust/:targetId
trustRoutes.get('/:targetId', (req, res) => {
  const userId = (req as any).userId;
  const targetId = req.params.targetId;

  const trust = store.getTrustValue(userId, targetId);

  if (!trust) {
    return res.json({
      targetId,
      trustValue: 0.5, // Default trust
      isDirectTrust: false,
    });
  }

  res.json(trust);
});

// GET /api/trust
trustRoutes.get('/', (req, res) => {
  const userId = (req as any).userId;
  const relationships = store.getUserTrust(userId);

  res.json(relationships);
});

// DELETE /api/trust/:targetId
trustRoutes.delete('/:targetId', (req, res) => {
  const userId = (req as any).userId;
  const targetId = req.params.targetId;

  store.deleteTrustValue(userId, targetId);

  res.json({ message: 'Trust value deleted' });
});
