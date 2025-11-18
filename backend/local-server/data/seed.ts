/**
 * Seed data for local development
 */
import type { UserProfile, Assertion, TrustRelationship } from '@nudge/shared';
import { store } from './store.js';

export function seedData() {
  console.log('Seeding database...');

  // Create demo users
  const users: UserProfile[] = [
    {
      userId: 'user-demo',
      email: 'demo@example.com',
      displayName: 'Demo User',
      bio: 'Demo account for testing',
      defaultTrustThreshold: 0.5,
      showControversySignals: true,
      showAlternateViews: true,
      defaultView: 'wiki',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    },
    {
      userId: 'user-alice',
      email: 'alice@example.com',
      displayName: 'Alice Johnson',
      bio: 'Science enthusiast',
      defaultTrustThreshold: 0.7,
      showControversySignals: false,
      showAlternateViews: false,
      defaultView: 'wiki',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: 'user-bob',
      email: 'bob@example.com',
      displayName: 'Bob Smith',
      bio: 'Curious about everything',
      defaultTrustThreshold: 0.3,
      showControversySignals: true,
      showAlternateViews: true,
      defaultView: 'news',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  users.forEach((user) => store.setUser(user.userId, user));

  // Create sample assertions
  const assertions: Assertion[] = [
    {
      assertionId: 'assertion-1',
      content: 'Photosynthesis is the process by which plants convert sunlight into chemical energy.',
      sourceId: 'Wikipedia',
      sourceUrl: 'https://en.wikipedia.org/wiki/Photosynthesis',
      assertionType: 'factual',
      confidence: 0.95,
      metadata: {
        topics: ['biology', 'plants', 'photosynthesis'],
        extractedAt: new Date().toISOString(),
        title: 'Photosynthesis Overview',
      },
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      assertionId: 'assertion-2',
      content: 'Plants use chlorophyll to capture light energy during photosynthesis.',
      sourceId: 'Wikipedia',
      sourceUrl: 'https://en.wikipedia.org/wiki/Chlorophyll',
      assertionType: 'factual',
      confidence: 0.92,
      metadata: {
        topics: ['biology', 'plants', 'photosynthesis', 'chlorophyll'],
        extractedAt: new Date().toISOString(),
        title: 'Chlorophyll Function',
      },
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      assertionId: 'assertion-3',
      content: 'Artificial intelligence systems can now generate human-like text.',
      sourceId: 'NYT',
      sourceUrl: 'https://nytimes.com/ai-breakthrough',
      assertionType: 'factual',
      confidence: 0.88,
      metadata: {
        topics: ['technology', 'ai', 'machine-learning'],
        extractedAt: new Date().toISOString(),
        title: 'AI Advances in Natural Language',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      assertionId: 'assertion-4',
      content: 'Large language models are trained on vast amounts of text data from the internet.',
      sourceId: 'ArXiv',
      sourceUrl: 'https://arxiv.org/abs/example',
      assertionType: 'factual',
      confidence: 0.9,
      metadata: {
        topics: ['technology', 'ai', 'machine-learning', 'llm'],
        extractedAt: new Date().toISOString(),
        title: 'LLM Training Methods',
        publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      assertionId: 'assertion-5',
      content: 'Climate change is causing global temperatures to rise at an unprecedented rate.',
      sourceId: 'Nature',
      sourceUrl: 'https://nature.com/climate-study',
      assertionType: 'factual',
      confidence: 0.94,
      metadata: {
        topics: ['climate', 'environment', 'science'],
        extractedAt: new Date().toISOString(),
        title: 'Global Temperature Trends',
        publishedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      assertionId: 'assertion-6',
      content: 'Renewable energy sources like solar and wind are becoming more cost-effective.',
      sourceId: 'BBC',
      sourceUrl: 'https://bbc.com/renewable-energy',
      assertionType: 'factual',
      confidence: 0.85,
      metadata: {
        topics: ['energy', 'environment', 'technology'],
        extractedAt: new Date().toISOString(),
        title: 'Renewable Energy Economics',
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      assertionId: 'assertion-7',
      content: 'The human brain contains approximately 86 billion neurons.',
      sourceId: 'Wikipedia',
      sourceUrl: 'https://en.wikipedia.org/wiki/Human_brain',
      assertionType: 'factual',
      confidence: 0.91,
      metadata: {
        topics: ['neuroscience', 'biology', 'brain'],
        extractedAt: new Date().toISOString(),
        title: 'Brain Structure',
      },
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      assertionId: 'assertion-8',
      content: 'Quantum computers use qubits that can exist in multiple states simultaneously.',
      sourceId: 'ScienceDaily',
      sourceUrl: 'https://sciencedaily.com/quantum-computing',
      assertionType: 'factual',
      confidence: 0.87,
      metadata: {
        topics: ['technology', 'physics', 'quantum-computing'],
        extractedAt: new Date().toISOString(),
        title: 'Quantum Computing Basics',
        publishedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      },
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  assertions.forEach((assertion) => store.addAssertion(assertion));

  // Create sample trust relationships for demo user
  const trustRelationships: TrustRelationship[] = [
    {
      userId: 'user-demo',
      targetId: 'Wikipedia',
      targetType: 'source',
      trustValue: 0.9,
      isDirectTrust: true,
      lastUpdated: new Date().toISOString(),
      notes: 'Generally reliable for factual information',
    },
    {
      userId: 'user-demo',
      targetId: 'NYT',
      targetType: 'source',
      trustValue: 0.75,
      isDirectTrust: true,
      lastUpdated: new Date().toISOString(),
      notes: 'Reputable news source',
    },
    {
      userId: 'user-demo',
      targetId: 'Nature',
      targetType: 'source',
      trustValue: 0.95,
      isDirectTrust: true,
      lastUpdated: new Date().toISOString(),
      notes: 'Peer-reviewed scientific journal',
    },
    {
      userId: 'user-demo',
      targetId: 'BBC',
      targetType: 'source',
      trustValue: 0.8,
      isDirectTrust: true,
      lastUpdated: new Date().toISOString(),
    },
    {
      userId: 'user-demo',
      targetId: 'ArXiv',
      targetType: 'source',
      trustValue: 0.85,
      isDirectTrust: true,
      lastUpdated: new Date().toISOString(),
      notes: 'Preprint repository - varies by paper',
    },
    {
      userId: 'user-demo',
      targetId: 'user-alice',
      targetType: 'user',
      trustValue: 0.8,
      isDirectTrust: true,
      lastUpdated: new Date().toISOString(),
      notes: 'Knowledgeable about science',
    },
  ];

  trustRelationships.forEach((trust) => store.setTrustValue(trust.userId, trust));

  // Add some news items
  const newsItems = assertions
    .filter((a) => a.metadata.publishedAt)
    .map((a) => {
      const trustRel = trustRelationships.find((t) => t.targetId === a.sourceId);
      const trustValue = trustRel?.trustValue || 0.5;

      // Composite score: 70% trust, 30% recency
      const ageInDays =
        (Date.now() - new Date(a.metadata.publishedAt!).getTime()) /
        (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - ageInDays / 30); // Decays over 30 days
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

  console.log(`Seeded ${users.length} users, ${assertions.length} assertions, ${trustRelationships.length} trust relationships`);
}
