/**
 * View routes (wiki, news, chat)
 */
import { Router } from 'express';
import { store } from '../data/store.js';
import { searchAssertions } from '../utils/search.js';

export const viewRoutes = Router();

// GET /api/views/wiki/:topic
viewRoutes.get('/wiki/:topic', (req, res) => {
  const userId = (req as any).userId;
  const topic = decodeURIComponent(req.params.topic);

  // Check cache
  const cached = store.getWikiArticle(userId, topic);
  if (cached) {
    return res.json(cached);
  }

  // Get assertions about this topic
  const assertions = store.getAssertionsByTopic(topic);

  if (assertions.length === 0) {
    return res.status(404).json({ error: 'No content found for this topic' });
  }

  // Get user's trust values
  const userTrust = store.getUserTrust(userId);
  const trustMap = new Map(userTrust.map((t) => [t.targetId, t.trustValue]));

  // Filter assertions by trust
  const user = store.getUser(userId);
  const threshold = user ? user.defaultTrustThreshold : 0.5;

  const trustedAssertions = assertions.filter((a) => {
    const trust = trustMap.get(a.sourceId) || 0.5;
    return trust >= threshold;
  });

  if (trustedAssertions.length === 0) {
    return res.json({
      topic,
      content: `No trusted content available for "${topic}". Try adjusting your trust settings or trust more sources.`,
      trustScore: 0,
      sources: [],
      generatedAt: new Date().toISOString(),
    });
  }

  // Generate article from trusted assertions
  const content = generateArticleContent(topic, trustedAssertions);
  const sources = Array.from(new Set(trustedAssertions.map((a) => a.sourceId)));
  const avgTrust =
    trustedAssertions.reduce((sum, a) => sum + (trustMap.get(a.sourceId) || 0.5), 0) /
    trustedAssertions.length;

  const article = {
    topic,
    content,
    trustScore: avgTrust,
    sources,
    generatedAt: new Date().toISOString(),
  };

  // Cache it
  store.setWikiArticle(userId, topic, article);

  res.json(article);
});

// GET /api/views/news
viewRoutes.get('/news', (req, res) => {
  const userId = (req as any).userId;
  const { limit = '50', since } = req.query;

  let news = store.getNews();

  // Filter by time
  if (since && typeof since === 'string') {
    const sinceDate = new Date(since);
    news = news.filter((item) => new Date(item.publishedAt) >= sinceDate);
  }

  // Get user's trust values and preferences
  const user = store.getUser(userId);
  const userTrust = store.getUserTrust(userId);
  const trustMap = new Map(userTrust.map((t) => [t.targetId, t.trustValue]));

  // Calculate recency scores
  const userNews = news.map((item) => {
    const userTrustValue = trustMap.get(item.sourceId) || 0.5;
    const ageInDays =
      (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - ageInDays / 30);

    return {
      ...item,
      trustValue: userTrustValue,
      recencyScore,
      controversyScore: 0, // TODO: Calculate from multiple users' trust values
    };
  });

  // Filter by trust threshold
  const threshold = user ? user.defaultTrustThreshold : 0.5;
  const filtered = userNews.filter((item) => item.trustValue >= threshold);

  // Sort by recency (most recent first)
  // TODO: Allow user to choose sort order (recency vs controversy)
  filtered.sort((a, b) => b.recencyScore - a.recencyScore);

  // Apply limit
  const limitNum = parseInt(limit as string, 10);
  const result = filtered.slice(0, limitNum);

  res.json(result);
});

// POST /api/views/chat
viewRoutes.post('/chat', (req, res) => {
  const userId = (req as any).userId;
  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required' });
  }

  // Find relevant assertions using semantic search
  const allAssertions = store.getAllAssertions();
  const searchResults = searchAssertions(query, allAssertions, {
    limit: 10,
    minScore: 0.1,
  });

  const relevantAssertions = searchResults.map((r) => r.assertion);

  // Get user's trust values
  const user = store.getUser(userId);
  const userTrust = store.getUserTrust(userId);
  const trustMap = new Map(userTrust.map((t) => [t.targetId, t.trustValue]));

  // Filter by trust
  const threshold = user ? user.defaultTrustThreshold : 0.5;
  const trustedAssertions = relevantAssertions.filter((a) => {
    const trust = trustMap.get(a.sourceId) || 0.5;
    return trust >= threshold;
  });

  // Generate response
  let response: string;
  let sources: Array<{ assertionId: string; content: string; trustValue: number }> = [];

  if (trustedAssertions.length === 0) {
    response = `I don't have trusted information to answer that question. Try trusting more sources or adjusting your trust threshold.`;
  } else {
    // Take top 3 most relevant
    const topAssertions = trustedAssertions.slice(0, 3);

    response = generateChatResponse(query, topAssertions);
    sources = topAssertions.map((a) => ({
      assertionId: a.assertionId,
      content: a.content,
      trustValue: trustMap.get(a.sourceId) || 0.5,
    }));
  }

  const chatMessage = {
    query,
    response,
    sources,
    timestamp: new Date().toISOString(),
  };

  store.addChatMessage(userId, chatMessage);

  res.json({
    response,
    sources,
  });
});

// Helper functions
function generateArticleContent(topic: string, assertions: any[]): string {
  const intro = `# ${topic}\n\n`;

  const body = assertions
    .map((a, i) => {
      return `${a.content} [${i + 1}]`;
    })
    .join(' ');

  const sources = `\n\n## Sources\n\n` + assertions.map((a, i) => `[${i + 1}] ${a.sourceId}`).join('\n');

  return intro + body + sources;
}

function generateChatResponse(query: string, assertions: any[]): string {
  if (assertions.length === 0) {
    return "I don't have enough information to answer that question.";
  }

  // Simple response generation
  const facts = assertions.map((a) => a.content).join(' ');

  return `Based on trusted sources: ${facts}`;
}
