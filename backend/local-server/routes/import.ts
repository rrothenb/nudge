/**
 * Import routes (Wikipedia, News/RSS)
 */
import { Router } from 'express';
import { store } from '../data/store.js';
import type { ImportJob, Assertion } from '@nudge/shared';

export const importRoutes = Router();

// POST /api/import/wikipedia
importRoutes.post('/wikipedia', async (req, res) => {
  const userId = (req as any).userId;
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const job: ImportJob = {
    jobId,
    userId,
    source: 'wikipedia',
    status: 'processing',
    metadata: { url },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.createImportJob(job);

  // Simulate async processing
  setTimeout(() => {
    const topicMatch = url.match(/\/wiki\/(.+)/);
    const topic = topicMatch ? decodeURIComponent(topicMatch[1]) : 'Unknown Topic';

    // Create mock assertions
    const assertions: Assertion[] = [
      {
        assertionId: `assertion-${Date.now()}-1`,
        content: `Key fact about ${topic} extracted from Wikipedia.`,
        sourceId: 'Wikipedia',
        sourceUrl: url,
        assertionType: 'factual',
        confidence: 0.9,
        metadata: {
          topics: [topic.toLowerCase()],
          extractedAt: new Date().toISOString(),
          title: `${topic} Overview`,
        },
        createdAt: new Date().toISOString(),
      },
      {
        assertionId: `assertion-${Date.now()}-2`,
        content: `Additional information about ${topic} from Wikipedia.`,
        sourceId: 'Wikipedia',
        sourceUrl: url,
        assertionType: 'factual',
        confidence: 0.85,
        metadata: {
          topics: [topic.toLowerCase()],
          extractedAt: new Date().toISOString(),
          title: `${topic} Details`,
        },
        createdAt: new Date().toISOString(),
      },
    ];

    assertions.forEach((a) => store.addAssertion(a));

    // Update job status
    const updatedJob = store.getImportJob(jobId);
    if (updatedJob) {
      updatedJob.status = 'completed';
      updatedJob.updatedAt = new Date().toISOString();
      updatedJob.metadata.assertionCount = assertions.length;
      store.createImportJob(updatedJob);
    }
  }, 2000); // Simulate 2 second processing time

  res.status(202).json({
    jobId,
    status: 'processing',
    message: 'Import started',
  });
});

// POST /api/import/news
importRoutes.post('/news', async (req, res) => {
  const userId = (req as any).userId;
  const { url, maxArticles = 10 } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const job: ImportJob = {
    jobId,
    userId,
    source: 'rss',
    status: 'processing',
    metadata: { url, maxArticles },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.createImportJob(job);

  // Simulate async processing
  setTimeout(() => {
    const sourceId = extractSourceFromUrl(url);

    // Create mock news assertions
    const count = Math.min(maxArticles, 5);
    const assertions: Assertion[] = [];

    for (let i = 0; i < count; i++) {
      const daysAgo = i;
      const assertion: Assertion = {
        assertionId: `assertion-${Date.now()}-${i}`,
        content: `News item ${i + 1} from ${sourceId} RSS feed.`,
        sourceId,
        sourceUrl: `${url}#article-${i}`,
        assertionType: 'news',
        confidence: 0.8,
        metadata: {
          topics: ['news', 'current-events'],
          extractedAt: new Date().toISOString(),
          title: `Article ${i + 1}`,
          publishedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
        },
        createdAt: new Date().toISOString(),
      };

      assertions.push(assertion);
      store.addAssertion(assertion);
    }

    // Add to news feed
    const userTrust = store.getUserTrust(userId);
    const trustMap = new Map(userTrust.map((t) => [t.targetId, t.trustValue]));

    const newsItems = assertions.map((a) => {
      const trustValue = trustMap.get(a.sourceId) || 0.5;
      const ageInDays =
        (Date.now() - new Date(a.metadata.publishedAt!).getTime()) /
        (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - ageInDays / 30);
      const score = trustValue * 0.7 + recencyScore * 0.3;

      return {
        assertionId: a.assertionId,
        content: a.content,
        sourceId: a.sourceId,
        sourceUrl: a.sourceUrl,
        publishedAt: a.metadata.publishedAt!,
        trustValue,
        score,
        metadata: {
          title: a.metadata.title,
          topics: a.metadata.topics,
        },
      };
    });

    store.addNewsItems(newsItems);

    // Update job status
    const updatedJob = store.getImportJob(jobId);
    if (updatedJob) {
      updatedJob.status = 'completed';
      updatedJob.updatedAt = new Date().toISOString();
      updatedJob.metadata.assertionCount = assertions.length;
      store.createImportJob(updatedJob);
    }
  }, 2000); // Simulate 2 second processing time

  res.status(202).json({
    jobId,
    status: 'processing',
    message: 'Import started',
  });
});

function extractSourceFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split('.');
    const domain = parts.length > 1 ? parts[parts.length - 2] : hostname;
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return 'Unknown';
  }
}
