/**
 * Seed data for local development
 *
 * Demonstrates the similarity-based trust algorithm with:
 * - Official import/composition bots
 * - Provenance chains (bot vouching)
 * - Assertion relationships (equivalent_to for editorial improvements)
 * - Users with similar trust patterns
 * - Cross-community trusted sources (Schelling points)
 */
import type { UserProfile, Assertion, TrustRelationship, Group } from '@nudge/shared';
import { store } from './store.js';
import {
  OFFICIAL_IMPORT_BOTS,
  OFFICIAL_COMPOSITION_BOTS,
  WELL_KNOWN_SOURCES,
} from '../../../shared/constants/trust-defaults.js';

export function seedData() {
  console.log('Seeding database with similarity-based trust demo data...');

  // Create demo users with different trust profiles
  const users: UserProfile[] = [
    {
      userId: 'user-demo',
      email: 'demo@example.com',
      displayName: 'Demo User',
      bio: 'Demo account for testing the trust algorithm',
      defaultTrustThreshold: 0.5,
      showControversySignals: true,
      showAlternateViews: true,
      defaultView: 'wiki',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    },
    {
      userId: 'user-progressive',
      email: 'progressive@example.com',
      displayName: 'Progressive Reader',
      bio: 'Interested in progressive news and climate science',
      defaultTrustThreshold: 0.6,
      showControversySignals: true,
      showAlternateViews: true,
      defaultView: 'news',
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: 'user-conservative',
      email: 'conservative@example.com',
      displayName: 'Conservative Reader',
      bio: 'Values traditional news sources',
      defaultTrustThreshold: 0.6,
      showControversySignals: true,
      showAlternateViews: true,
      defaultView: 'news',
      createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: 'user-scientist',
      email: 'scientist@example.com',
      displayName: 'Dr. Alice Chen',
      bio: 'Climate scientist, trusts peer-reviewed sources',
      defaultTrustThreshold: 0.7,
      showControversySignals: false,
      showAlternateViews: false,
      defaultView: 'wiki',
      createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: 'user-skeptic',
      email: 'skeptic@example.com',
      displayName: 'Bob the Skeptic',
      bio: 'Questions everything, low default trust',
      defaultTrustThreshold: 0.3,
      showControversySignals: true,
      showAlternateViews: true,
      defaultView: 'news',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  users.forEach((user) => store.setUser(user.userId, user));

  // Create sample assertions with provenance and relationships
  const assertions: Assertion[] = [
    // Original assertion from Reuters (imported by bot)
    {
      assertionId: 'assertion-climate-1',
      content: 'Global temperatures have risen by approximately 1.1°C since pre-industrial times.',
      sourceId: 'REUTERS',
      sourceType: 'source',
      sourceUrl: 'https://reuters.com/climate-data',
      importedBy: 'IMPORT_BOT_NEWS',
      originalUrl: 'https://reuters.com/climate-data',
      assertionType: 'FACTUAL',
      confidence: 0.95,
      metadata: {
        topics: ['climate', 'environment', 'science'],
        extractedAt: new Date().toISOString(),
        title: 'Global Temperature Trends',
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    // Editorial improvement by composition bot
    {
      assertionId: 'assertion-climate-1-improved',
      content: 'Earth\'s average temperature has increased by 1.1°C (2°F) since the late 1800s, primarily due to human activities.',
      sourceId: 'COMPOSITION_BOT',
      sourceType: 'bot',
      assertionType: 'FACTUAL',
      confidence: 0.95,
      relationships: [
        {
          type: 'equivalent_to',
          targetId: 'assertion-climate-1',
          confidence: 0.92,
        },
      ],
      metadata: {
        topics: ['climate', 'environment', 'science'],
        title: 'Global Temperature Trends (Enhanced)',
      },
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
    // Wikipedia import
    {
      assertionId: 'assertion-photosynthesis',
      content: 'Photosynthesis is the process by which plants convert sunlight into chemical energy.',
      sourceId: 'WIKIPEDIA',
      sourceType: 'source',
      sourceUrl: 'https://en.wikipedia.org/wiki/Photosynthesis',
      importedBy: 'IMPORT_BOT_WIKIPEDIA',
      originalUrl: 'https://en.wikipedia.org/wiki/Photosynthesis',
      assertionType: 'FACTUAL',
      confidence: 0.95,
      metadata: {
        topics: ['biology', 'plants', 'photosynthesis'],
        extractedAt: new Date().toISOString(),
        title: 'Photosynthesis Overview',
      },
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
    // Academic paper from Nature
    {
      assertionId: 'assertion-ai-breakthrough',
      content: 'Large language models demonstrate emergent capabilities not present in smaller models.',
      sourceId: 'NATURE',
      sourceType: 'source',
      sourceUrl: 'https://nature.com/articles/ai-2024',
      importedBy: 'IMPORT_BOT_ACADEMIC',
      originalUrl: 'https://nature.com/articles/ai-2024',
      assertionType: 'FACTUAL',
      confidence: 0.92,
      metadata: {
        topics: ['technology', 'ai', 'machine-learning'],
        extractedAt: new Date().toISOString(),
        title: 'Emergent Capabilities in LLMs',
        publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    // Simplified version for broader audience
    {
      assertionId: 'assertion-ai-breakthrough-simple',
      content: 'AI systems get new abilities as they grow larger, abilities that smaller AI systems don\'t have.',
      sourceId: 'SIMPLIFICATION_BOT',
      sourceType: 'bot',
      assertionType: 'FACTUAL',
      confidence: 0.88,
      relationships: [
        {
          type: 'equivalent_to',
          targetId: 'assertion-ai-breakthrough',
          confidence: 0.85,
        },
      ],
      metadata: {
        topics: ['technology', 'ai', 'machine-learning'],
        title: 'AI Capabilities (Simplified)',
      },
      createdAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
    },
    // Schelling point: Reuters trusted across communities
    {
      assertionId: 'assertion-reuters-economy',
      content: 'The Federal Reserve raised interest rates by 0.25% in response to inflation concerns.',
      sourceId: 'REUTERS',
      sourceType: 'source',
      sourceUrl: 'https://reuters.com/fed-rate-hike',
      importedBy: 'IMPORT_BOT_NEWS',
      originalUrl: 'https://reuters.com/fed-rate-hike',
      assertionType: 'FACTUAL',
      confidence: 0.94,
      metadata: {
        topics: ['economy', 'finance', 'federal-reserve'],
        extractedAt: new Date().toISOString(),
        title: 'Fed Interest Rate Decision',
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    // Opinion with temporal scope
    {
      assertionId: 'assertion-tech-opinion',
      content: 'AI regulation is necessary to prevent misuse of powerful language models.',
      sourceId: 'user-scientist',
      sourceType: 'user',
      assertionType: 'OPINION',
      confidence: 0.7,
      temporalScope: {
        start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      metadata: {
        topics: ['technology', 'ai', 'policy', 'ethics'],
        title: 'AI Regulation Opinion',
      },
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
    // Prediction
    {
      assertionId: 'assertion-prediction-solar',
      content: 'Solar power will become the dominant energy source globally by 2040.',
      sourceId: 'user-scientist',
      sourceType: 'user',
      assertionType: 'PREDICTION',
      confidence: 0.65,
      temporalScope: {
        start: new Date(),
        end: new Date(Date.now() + 16 * 365 * 24 * 60 * 60 * 1000), // 2040
      },
      metadata: {
        topics: ['energy', 'environment', 'solar', 'predictions'],
        title: 'Solar Energy Future',
      },
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
  ];

  assertions.forEach((assertion) => store.addAssertion(assertion));

  // Create trust relationships demonstrating similarity-based inference
  // Users with similar trust patterns will influence each other's inferred trust

  const trustRelationships: TrustRelationship[] = [
    // Demo user trusts various sources
    {
      userId: 'user-demo',
      targetId: 'WIKIPEDIA',
      targetType: 'source',
      trustValue: 0.9,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Generally reliable for factual information',
    },
    {
      userId: 'user-demo',
      targetId: 'REUTERS',
      targetType: 'source',
      trustValue: 0.85,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Balanced news reporting',
    },
    {
      userId: 'user-demo',
      targetId: 'NATURE',
      targetType: 'source',
      trustValue: 0.95,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Peer-reviewed scientific journal',
    },
    {
      userId: 'user-demo',
      targetId: 'IMPORT_BOT_NEWS',
      targetType: 'bot',
      trustValue: 0.8,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Trust the bot\'s attribution mechanism',
    },
    {
      userId: 'user-demo',
      targetId: 'COMPOSITION_BOT',
      targetType: 'bot',
      trustValue: 0.75,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Editorial improvements are helpful',
    },

    // Progressive user - similar to demo on some sources
    {
      userId: 'user-progressive',
      targetId: 'REUTERS',
      targetType: 'source',
      trustValue: 0.8,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: 'user-progressive',
      targetId: 'NATURE',
      targetType: 'source',
      trustValue: 0.95,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: 'user-progressive',
      targetId: 'WIKIPEDIA',
      targetType: 'source',
      trustValue: 0.85,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: 'user-progressive',
      targetId: 'CDC',
      targetType: 'source',
      trustValue: 0.9,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Conservative user - also trusts Reuters (Schelling point!)
    {
      userId: 'user-conservative',
      targetId: 'REUTERS',
      targetType: 'source',
      trustValue: 0.85,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: 'user-conservative',
      targetId: 'ASSOCIATED_PRESS',
      targetType: 'source',
      trustValue: 0.9,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: 'user-conservative',
      targetId: 'WIKIPEDIA',
      targetType: 'source',
      trustValue: 0.7,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Scientist - high trust in academic sources
    {
      userId: 'user-scientist',
      targetId: 'NATURE',
      targetType: 'source',
      trustValue: 0.98,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Gold standard for climate research',
    },
    {
      userId: 'user-scientist',
      targetId: 'SCIENCE_MAG',
      targetType: 'source',
      trustValue: 0.97,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: 'user-scientist',
      targetId: 'REUTERS',
      targetType: 'source',
      trustValue: 0.8,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: 'user-scientist',
      targetId: 'WIKIPEDIA',
      targetType: 'source',
      trustValue: 0.85,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: 'user-scientist',
      targetId: 'IMPORT_BOT_ACADEMIC',
      targetType: 'bot',
      trustValue: 0.9,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Skeptic - low trust across the board
    {
      userId: 'user-skeptic',
      targetId: 'REUTERS',
      targetType: 'source',
      trustValue: 0.6,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: 'user-skeptic',
      targetId: 'WIKIPEDIA',
      targetType: 'source',
      trustValue: 0.5,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Anyone can edit',
    },
    {
      userId: 'user-skeptic',
      targetId: 'IMPORT_BOT_NEWS',
      targetType: 'bot',
      trustValue: 0.4,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Automated extraction could have errors',
    },

    // Cross-user trust (for similarity computation)
    {
      userId: 'user-demo',
      targetId: 'user-scientist',
      targetType: 'user',
      trustValue: 0.85,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Expert in climate science',
    },
    {
      userId: 'user-progressive',
      targetId: 'user-scientist',
      targetType: 'user',
      trustValue: 0.9,
      isDirectTrust: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  trustRelationships.forEach((trust) => store.setTrustValue(trust.userId, trust));

  // Add news items
  const newsItems = assertions
    .filter((a) => a.metadata?.publishedAt)
    .map((a) => {
      const trustRel = trustRelationships.find(
        (t) => t.userId === 'user-demo' && t.targetId === a.sourceId
      );
      const trustValue = trustRel?.trustValue || 0.5;

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

  // Create sample groups
  const groups: Group[] = [
    {
      groupId: 'group-official-bots',
      name: 'Official Bots',
      description: 'Trusted content import and composition bots',
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [
        ...Array.from(OFFICIAL_IMPORT_BOTS).map((botId) => ({
          memberId: botId,
          memberType: 'bot' as const,
          addedBy: 'system',
          addedAt: new Date().toISOString(),
        })),
        ...Array.from(OFFICIAL_COMPOSITION_BOTS).map((botId) => ({
          memberId: botId,
          memberType: 'bot' as const,
          addedBy: 'system',
          addedAt: new Date().toISOString(),
        })),
      ],
      isSystemDefined: true,
      visibility: 'public',
      tags: ['bots', 'automation', 'trusted'],
    },
    {
      groupId: 'group-well-known-sources',
      name: 'Well-Known Sources',
      description: 'Established sources with default semi-trust for bootstrapping',
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: Array.from(WELL_KNOWN_SOURCES).map((sourceId) => ({
        memberId: sourceId,
        memberType: 'source' as const,
        addedBy: 'system',
        addedAt: new Date().toISOString(),
      })),
      isSystemDefined: true,
      visibility: 'public',
      tags: ['sources', 'established', 'default-trust'],
    },
    {
      groupId: 'group-schelling-points',
      name: 'Cross-Community Trusted',
      description: 'Sources trusted across different user communities (Schelling points)',
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [
        {
          memberId: 'REUTERS',
          memberType: 'source',
          addedBy: 'system',
          addedAt: new Date().toISOString(),
        },
        {
          memberId: 'ASSOCIATED_PRESS',
          memberType: 'source',
          addedBy: 'system',
          addedAt: new Date().toISOString(),
        },
        {
          memberId: 'AFP',
          memberType: 'source',
          addedBy: 'system',
          addedAt: new Date().toISOString(),
        },
      ],
      isSystemDefined: true,
      visibility: 'public',
      tags: ['schelling-point', 'consensus', 'cross-community'],
    },
  ];

  groups.forEach((group) => store.addGroup(group));

  console.log(`
Seeded database with similarity-based trust demo:
- ${users.length} users (with diverse trust patterns)
- ${assertions.length} assertions (with provenance and relationships)
- ${trustRelationships.length} trust relationships
- ${groups.length} groups
- Demonstrates: Sybil resistance, bot vouching, editorial improvements, Schelling points
  `);
}
