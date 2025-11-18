/**
 * Assertion CRUD routes
 */
import { Router } from 'express';
import { store } from '../data/store.js';
import type { Assertion } from '@nudge/shared';

export const assertionRoutes = Router();

// POST /api/assertions
assertionRoutes.post('/', (req, res) => {
  const userId = (req as any).userId;
  const data = req.body;

  const assertion: Assertion = {
    assertionId: `assertion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: data.content,
    sourceId: data.sourceId,
    sourceUrl: data.sourceUrl,
    assertionType: data.assertionType || 'factual',
    confidence: data.confidence || 0.8,
    metadata: {
      ...data.metadata,
      extractedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
  };

  store.addAssertion(assertion);
  res.status(201).json(assertion);
});

// GET /api/assertions/:id
assertionRoutes.get('/:id', (req, res) => {
  const assertionId = req.params.id;
  const assertion = store.getAssertion(assertionId);

  if (!assertion) {
    return res.status(404).json({ error: 'Assertion not found' });
  }

  res.json(assertion);
});

// GET /api/assertions
assertionRoutes.get('/', (req, res) => {
  const { sourceId, topic, type, limit = '100' } = req.query;

  let assertions = store.getAllAssertions();

  // Filter by source
  if (sourceId && typeof sourceId === 'string') {
    assertions = assertions.filter((a) => a.sourceId === sourceId);
  }

  // Filter by topic
  if (topic && typeof topic === 'string') {
    assertions = assertions.filter((a) =>
      a.metadata.topics?.includes(topic)
    );
  }

  // Filter by type
  if (type && typeof type === 'string') {
    assertions = assertions.filter((a) => a.assertionType === type);
  }

  // Apply limit
  const limitNum = parseInt(limit as string, 10);
  assertions = assertions.slice(0, limitNum);

  res.json(assertions);
});
