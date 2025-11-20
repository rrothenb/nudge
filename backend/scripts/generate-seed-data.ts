#!/usr/bin/env ts-node
/**
 * Seed Data Generation Script
 *
 * Generates realistic test data for the Nudge platform including:
 * - Diverse user profiles with varied trust preferences
 * - Wikipedia articles across multiple topics
 * - Trust relationships forming interesting networks
 * - Groups organizing users and sources
 * - News articles from various sources
 *
 * Usage:
 *   npm run seed-data
 *   npm run seed-data -- --users 20 --articles 25 --dry-run
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { User, Assertion, Trust, Group } from '@nudge/shared';

// Parse command line arguments
interface SeedOptions {
  users: number;
  articles: number;
  newsItems: number;
  stage: string;
  dryRun: boolean;
  region: string;
}

function parseArgs(): SeedOptions {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    users: 12,
    articles: 15,
    newsItems: 20,
    stage: 'dev',
    dryRun: false,
    region: 'us-east-1',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--users' && i + 1 < args.length) {
      options.users = parseInt(args[++i], 10);
    } else if (arg === '--articles' && i + 1 < args.length) {
      options.articles = parseInt(args[++i], 10);
    } else if (arg === '--news' && i + 1 < args.length) {
      options.newsItems = parseInt(args[++i], 10);
    } else if (arg === '--stage' && i + 1 < args.length) {
      options.stage = args[++i];
    } else if (arg === '--region' && i + 1 < args.length) {
      options.region = args[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Seed Data Generation Script

Usage:
  npm run seed-data [options]

Options:
  --users <n>      Number of users to create (default: 12)
  --articles <n>   Number of Wikipedia articles to import (default: 15)
  --news <n>       Number of news articles to create (default: 20)
  --stage <name>   Deployment stage (default: dev)
  --region <name>  AWS region (default: us-east-1)
  --dry-run        Print what would be created without actually creating
  --help           Show this help message

Examples:
  npm run seed-data
  npm run seed-data -- --users 20 --articles 25
  npm run seed-data -- --stage prod --region us-west-2
  npm run seed-data -- --dry-run
  `);
}

// Initialize DynamoDB client
function createDynamoDBClient(region: string, stage: string): DynamoDBDocumentClient {
  const client = new DynamoDBClient({ region });
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });
}

// Generate user profiles
function generateUsers(count: number): User[] {
  const userProfiles = [
    {
      name: 'Dr. Sarah Chen',
      email: 'sarah.chen@example.com',
      bio: 'Quantum physicist and science communicator',
      threshold: 0.7,
      openMindedness: 0.3,
      interests: ['physics', 'quantum computing', 'science education'],
    },
    {
      name: 'Marcus Johnson',
      email: 'marcus.j@example.com',
      bio: 'Investigative journalist covering technology and politics',
      threshold: 0.6,
      openMindedness: 0.6,
      interests: ['journalism', 'politics', 'technology'],
    },
    {
      name: 'Prof. Elena Rodriguez',
      email: 'e.rodriguez@example.com',
      bio: 'History professor specializing in ancient civilizations',
      threshold: 0.8,
      openMindedness: 0.4,
      interests: ['history', 'archaeology', 'anthropology'],
    },
    {
      name: 'Alex Kim',
      email: 'alex.kim@example.com',
      bio: 'Software engineer and open source enthusiast',
      threshold: 0.5,
      openMindedness: 0.7,
      interests: ['programming', 'technology', 'AI'],
    },
    {
      name: 'Dr. James Wright',
      email: 'j.wright@example.com',
      bio: 'Climate scientist at National Research Institute',
      threshold: 0.75,
      openMindedness: 0.25,
      interests: ['climate change', 'environmental science', 'policy'],
    },
    {
      name: 'Maya Patel',
      email: 'maya.patel@example.com',
      bio: 'Educator and curriculum developer',
      threshold: 0.65,
      openMindedness: 0.5,
      interests: ['education', 'child development', 'pedagogy'],
    },
    {
      name: 'Tom Anderson',
      email: 'tom.a@example.com',
      bio: 'Skeptic and critical thinking advocate',
      threshold: 0.85,
      openMindedness: 0.2,
      interests: ['skepticism', 'science', 'philosophy'],
    },
    {
      name: 'Yuki Tanaka',
      email: 'yuki.t@example.com',
      bio: 'Arts and culture critic',
      threshold: 0.4,
      openMindedness: 0.8,
      interests: ['art', 'culture', 'music', 'literature'],
    },
    {
      name: 'Dr. Rachel Green',
      email: 'rachel.green@example.com',
      bio: 'Biologist researching genetics and evolution',
      threshold: 0.7,
      openMindedness: 0.35,
      interests: ['biology', 'genetics', 'evolution'],
    },
    {
      name: 'David Miller',
      email: 'david.m@example.com',
      bio: 'Independent researcher and fact-checker',
      threshold: 0.75,
      openMindedness: 0.45,
      interests: ['fact-checking', 'research', 'media literacy'],
    },
    {
      name: 'Sophia Lee',
      email: 'sophia.lee@example.com',
      bio: 'Philosopher exploring ethics and epistemology',
      threshold: 0.5,
      openMindedness: 0.9,
      interests: ['philosophy', 'ethics', 'epistemology'],
    },
    {
      name: 'Chris Brown',
      email: 'chris.b@example.com',
      bio: 'Data scientist and statistics enthusiast',
      threshold: 0.7,
      openMindedness: 0.4,
      interests: ['data science', 'statistics', 'machine learning'],
    },
  ];

  const users: User[] = [];
  for (let i = 0; i < Math.min(count, userProfiles.length); i++) {
    const profile = userProfiles[i];
    const user: User = {
      userId: `user-${i + 1}`,
      email: profile.email,
      displayName: profile.name,
      profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`,
      trustThreshold: profile.threshold,
      openMindedness: profile.openMindedness,
      bio: profile.bio,
      topics: profile.interests,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    users.push(user);
  }

  return users;
}

// Wikipedia articles to import
interface ArticleData {
  title: string;
  topic: string;
  excerpt: string;
  assertions: string[];
}

function getWikipediaArticles(): ArticleData[] {
  return [
    {
      title: 'Photosynthesis',
      topic: 'biology',
      excerpt: 'The process by which plants convert light energy into chemical energy',
      assertions: [
        'Photosynthesis is the process by which plants, algae, and some bacteria convert light energy into chemical energy',
        'Chlorophyll is the green pigment that absorbs light for photosynthesis',
        'Photosynthesis produces glucose and releases oxygen as a byproduct',
        'The process occurs primarily in the chloroplasts of plant cells',
        'Photosynthesis requires carbon dioxide, water, and sunlight',
      ],
    },
    {
      title: 'Quantum Computing',
      topic: 'technology',
      excerpt: 'Computing paradigm using quantum mechanical phenomena',
      assertions: [
        'Quantum computers use quantum bits (qubits) instead of classical bits',
        'Qubits can exist in superposition of multiple states simultaneously',
        'Quantum entanglement allows qubits to be correlated in ways impossible for classical bits',
        'Quantum computers could solve certain problems exponentially faster than classical computers',
        'Applications include cryptography, drug discovery, and optimization problems',
      ],
    },
    {
      title: 'World War II',
      topic: 'history',
      excerpt: 'Global conflict from 1939 to 1945',
      assertions: [
        'World War II lasted from 1939 to 1945',
        'The war involved most of the world\'s nations forming two opposing alliances',
        'Over 70 million people died during World War II',
        'The Holocaust resulted in the systematic murder of six million Jews',
        'The war ended with the surrender of Germany in May 1945 and Japan in August 1945',
      ],
    },
    {
      title: 'Climate Change',
      topic: 'environment',
      excerpt: 'Long-term shifts in global temperatures and weather patterns',
      assertions: [
        'Global average temperatures have risen approximately 1.1°C since pre-industrial times',
        'Human activities, particularly burning fossil fuels, are the primary cause of recent climate change',
        'Climate change leads to rising sea levels, extreme weather events, and ecosystem disruption',
        'The Paris Agreement aims to limit global warming to well below 2°C',
        'Reducing greenhouse gas emissions is critical to mitigating climate change',
      ],
    },
    {
      title: 'Artificial Intelligence',
      topic: 'technology',
      excerpt: 'Simulation of human intelligence by machines',
      assertions: [
        'Artificial Intelligence involves machines performing tasks that typically require human intelligence',
        'Machine learning is a subset of AI that learns from data without explicit programming',
        'Deep learning uses neural networks with multiple layers to process complex patterns',
        'AI applications include natural language processing, computer vision, and autonomous vehicles',
        'Ethical concerns about AI include bias, privacy, and job displacement',
      ],
    },
    {
      title: 'DNA',
      topic: 'biology',
      excerpt: 'Molecule carrying genetic instructions',
      assertions: [
        'DNA (deoxyribonucleic acid) carries genetic information in living organisms',
        'DNA has a double helix structure discovered by Watson and Crick in 1953',
        'DNA is composed of four nucleotide bases: adenine, thymine, guanine, and cytosine',
        'Genes are segments of DNA that encode instructions for making proteins',
        'DNA replication ensures genetic information is passed to daughter cells',
      ],
    },
    {
      title: 'Ancient Rome',
      topic: 'history',
      excerpt: 'Civilization that dominated the Mediterranean world',
      assertions: [
        'Ancient Rome was founded in 753 BCE according to legend',
        'Rome evolved from a monarchy to a republic and finally an empire',
        'The Roman Empire at its peak controlled territories across Europe, North Africa, and the Middle East',
        'Roman law, architecture, and language influenced Western civilization profoundly',
        'The Western Roman Empire fell in 476 CE',
      ],
    },
    {
      title: 'Pacific Ocean',
      topic: 'geography',
      excerpt: 'Largest and deepest ocean on Earth',
      assertions: [
        'The Pacific Ocean is the largest and deepest ocean on Earth',
        'It covers approximately 46% of Earth\'s water surface',
        'The Pacific Ocean contains the Mariana Trench, the deepest point on Earth',
        'The Ring of Fire, a zone of volcanic and seismic activity, surrounds the Pacific',
        'The Pacific Ocean plays a crucial role in regulating global climate',
      ],
    },
    {
      title: 'Jazz Music',
      topic: 'culture',
      excerpt: 'Musical genre originating in African-American communities',
      assertions: [
        'Jazz originated in the African-American communities of New Orleans in the late 19th century',
        'Jazz is characterized by swing rhythms, improvisation, and blue notes',
        'Louis Armstrong, Duke Ellington, and Miles Davis are legendary jazz musicians',
        'Jazz has influenced many other musical genres including rock and hip-hop',
        'Different jazz styles include swing, bebop, cool jazz, and fusion',
      ],
    },
    {
      title: 'Renaissance Art',
      topic: 'culture',
      excerpt: 'European art movement from 14th to 17th century',
      assertions: [
        'The Renaissance was a cultural movement spanning the 14th to 17th centuries',
        'Renaissance art emphasized realism, perspective, and human anatomy',
        'Leonardo da Vinci, Michelangelo, and Raphael were master Renaissance artists',
        'The Mona Lisa and The Last Supper are iconic Renaissance paintings',
        'Renaissance art marked a departure from medieval artistic conventions',
      ],
    },
    {
      title: 'Blockchain Technology',
      topic: 'technology',
      excerpt: 'Distributed ledger technology',
      assertions: [
        'Blockchain is a distributed ledger technology that records transactions across multiple computers',
        'Each block contains a cryptographic hash of the previous block, creating a chain',
        'Blockchain provides transparency, security, and immutability of records',
        'Bitcoin was the first major application of blockchain technology',
        'Beyond cryptocurrency, blockchain has applications in supply chain, voting, and digital identity',
      ],
    },
    {
      title: 'Human Brain',
      topic: 'biology',
      excerpt: 'Central organ of the human nervous system',
      assertions: [
        'The human brain contains approximately 86 billion neurons',
        'The brain is divided into regions including the cerebrum, cerebellum, and brainstem',
        'Neurons communicate through electrical and chemical signals',
        'The brain consumes about 20% of the body\'s energy despite being only 2% of body weight',
        'Neuroplasticity allows the brain to reorganize and form new neural connections',
      ],
    },
    {
      title: 'Evolution',
      topic: 'biology',
      excerpt: 'Process by which species change over time',
      assertions: [
        'Evolution is the process by which species change over successive generations',
        'Natural selection is the primary mechanism of evolution proposed by Charles Darwin',
        'Genetic mutations provide the variation upon which natural selection acts',
        'The fossil record provides evidence of evolutionary changes over millions of years',
        'All living organisms share common ancestry traced back billions of years',
      ],
    },
    {
      title: 'The Internet',
      topic: 'technology',
      excerpt: 'Global system of interconnected computer networks',
      assertions: [
        'The Internet is a global network of interconnected computer networks',
        'The Internet evolved from ARPANET, a U.S. Department of Defense project',
        'The World Wide Web, invented by Tim Berners-Lee in 1989, revolutionized Internet use',
        'Internet protocols like TCP/IP enable communication between diverse networks',
        'Over 5 billion people worldwide use the Internet as of 2023',
      ],
    },
    {
      title: 'Solar System',
      topic: 'astronomy',
      excerpt: 'The Sun and objects orbiting it',
      assertions: [
        'The Solar System consists of the Sun and all objects that orbit it',
        'The Solar System formed approximately 4.6 billion years ago',
        'Eight planets orbit the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune',
        'The Sun contains 99.86% of the Solar System\'s mass',
        'The asteroid belt lies between Mars and Jupiter',
      ],
    },
  ];
}

// Generate assertions from article data
function generateAssertions(articles: ArticleData[]): Assertion[] {
  const assertions: Assertion[] = [];
  let assertionCount = 0;

  for (const article of articles) {
    for (const content of article.assertions) {
      const assertion: Assertion = {
        assertionId: `assertion-${++assertionCount}`,
        content,
        sourceId: 'WIKIPEDIA',
        sourceUrl: `https://wikipedia.org/wiki/${article.title.replace(/\s+/g, '_')}`,
        type: 'wiki_import',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          topics: [article.topic],
          confidence: 0.85 + Math.random() * 0.1, // 0.85-0.95
          sourceType: 'wikipedia',
          articleTitle: article.title,
        },
      };
      assertions.push(assertion);
    }
  }

  return assertions;
}

// Generate trust relationships
function generateTrustRelationships(users: User[]): Trust[] {
  const trusts: Trust[] = [];
  const now = new Date().toISOString();

  // Create interesting trust patterns
  const patterns = [
    // Scientists trust each other and scientific sources
    { from: 'user-1', to: 'user-5', value: 0.9 }, // Sarah -> James (climate scientist)
    { from: 'user-1', to: 'user-9', value: 0.85 }, // Sarah -> Rachel (biologist)
    { from: 'user-5', to: 'user-1', value: 0.9 }, // James -> Sarah
    { from: 'user-9', to: 'user-1', value: 0.85 }, // Rachel -> Sarah
    { from: 'user-9', to: 'user-5', value: 0.8 }, // Rachel -> James

    // Journalists trust other journalists and fact-checkers
    { from: 'user-2', to: 'user-10', value: 0.85 }, // Marcus -> David (fact-checker)
    { from: 'user-10', to: 'user-2', value: 0.8 }, // David -> Marcus

    // Academics trust each other
    { from: 'user-3', to: 'user-6', value: 0.75 }, // Elena -> Maya (educator)
    { from: 'user-6', to: 'user-3', value: 0.8 }, // Maya -> Elena

    // Tech-savvy users trust each other
    { from: 'user-4', to: 'user-12', value: 0.8 }, // Alex -> Chris (data scientist)
    { from: 'user-12', to: 'user-4', value: 0.75 }, // Chris -> Alex

    // Skeptics have high standards
    { from: 'user-7', to: 'user-1', value: 0.9 }, // Tom -> Sarah (trusts scientists)
    { from: 'user-7', to: 'user-10', value: 0.85 }, // Tom -> David (trusts fact-checkers)

    // Open-minded users trust many people
    { from: 'user-8', to: 'user-3', value: 0.7 }, // Yuki -> Elena
    { from: 'user-8', to: 'user-11', value: 0.75 }, // Yuki -> Sophia
    { from: 'user-11', to: 'user-8', value: 0.8 }, // Sophia -> Yuki

    // Trust in sources
    { from: 'user-1', to: 'WIKIPEDIA', value: 0.9 },
    { from: 'user-2', to: 'WIKIPEDIA', value: 0.85 },
    { from: 'user-3', to: 'WIKIPEDIA', value: 0.95 },
    { from: 'user-5', to: 'WIKIPEDIA', value: 0.9 },
    { from: 'user-7', to: 'WIKIPEDIA', value: 0.85 },
    { from: 'user-9', to: 'WIKIPEDIA', value: 0.9 },
    { from: 'user-10', to: 'WIKIPEDIA', value: 0.9 },
  ];

  for (const pattern of patterns) {
    if (!users.find((u) => u.userId === pattern.from)) continue;

    const trust: Trust = {
      userId: pattern.from,
      targetId: pattern.to,
      targetType: pattern.to.startsWith('user-') ? 'user' : 'source',
      trustValue: pattern.value,
      createdAt: now,
      updatedAt: now,
    };
    trusts.push(trust);
  }

  return trusts;
}

// Generate groups
function generateGroups(users: User[]): Group[] {
  const now = new Date().toISOString();

  return [
    {
      groupId: 'group-scientists',
      name: 'Scientists',
      description: 'Verified scientists and researchers',
      createdBy: 'user-1',
      isSystemDefined: true,
      visibility: 'public',
      memberIds: ['user-1', 'user-5', 'user-9', 'user-12'],
      createdAt: now,
      updatedAt: now,
    },
    {
      groupId: 'group-journalists',
      name: 'Journalists',
      description: 'Professional journalists and fact-checkers',
      createdBy: 'user-2',
      isSystemDefined: true,
      visibility: 'public',
      memberIds: ['user-2', 'user-10'],
      createdAt: now,
      updatedAt: now,
    },
    {
      groupId: 'group-academics',
      name: 'Academics',
      description: 'Professors and educators',
      createdBy: 'user-3',
      isSystemDefined: true,
      visibility: 'public',
      memberIds: ['user-3', 'user-6', 'user-11'],
      createdAt: now,
      updatedAt: now,
    },
    {
      groupId: 'group-tech',
      name: 'Tech Experts',
      description: 'Technology professionals and researchers',
      createdBy: 'user-4',
      isSystemDefined: false,
      visibility: 'public',
      memberIds: ['user-1', 'user-4', 'user-12'],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

// Main execution
async function main() {
  const options = parseArgs();

  console.log('\n🌱 Seed Data Generation');
  console.log('========================\n');
  console.log(`Configuration:`);
  console.log(`  Users: ${options.users}`);
  console.log(`  Articles: ${options.articles}`);
  console.log(`  News Items: ${options.newsItems}`);
  console.log(`  Stage: ${options.stage}`);
  console.log(`  Region: ${options.region}`);
  console.log(`  Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log('');

  // Generate data
  console.log('📝 Generating data...');
  const users = generateUsers(options.users);
  const articles = getWikipediaArticles().slice(0, options.articles);
  const assertions = generateAssertions(articles);
  const trusts = generateTrustRelationships(users);
  const groups = generateGroups(users);

  console.log(`  ✓ Generated ${users.length} users`);
  console.log(`  ✓ Generated ${assertions.length} assertions from ${articles.length} articles`);
  console.log(`  ✓ Generated ${trusts.length} trust relationships`);
  console.log(`  ✓ Generated ${groups.length} groups`);
  console.log('');

  if (options.dryRun) {
    console.log('🔍 Dry run - Preview of data to be created:\n');

    console.log('Users:');
    users.slice(0, 3).forEach((u) => {
      console.log(`  - ${u.displayName} (${u.email})`);
      console.log(`    Trust Threshold: ${u.trustThreshold}, Open-mindedness: ${u.openMindedness}`);
    });
    console.log(`  ... and ${users.length - 3} more\n`);

    console.log('Articles:');
    articles.slice(0, 3).forEach((a) => {
      console.log(`  - ${a.title} (${a.topic})`);
      console.log(`    ${a.assertions.length} assertions`);
    });
    console.log(`  ... and ${articles.length - 3} more\n`);

    console.log('Trust Relationships (sample):');
    trusts.slice(0, 5).forEach((t) => {
      console.log(`  - ${t.userId} → ${t.targetId}: ${t.trustValue}`);
    });
    console.log(`  ... and ${trusts.length - 5} more\n`);

    console.log('Groups:');
    groups.forEach((g) => {
      console.log(`  - ${g.name}: ${g.memberIds.length} members`);
    });

    console.log('\n✅ Dry run complete. Run without --dry-run to actually create this data.\n');
    return;
  }

  // Create DynamoDB client
  const tableSuffix = options.stage === 'prod' ? '' : `-${options.stage}`;
  const docClient = createDynamoDBClient(options.region, options.stage);

  // Write users
  console.log('💾 Writing users to DynamoDB...');
  for (const user of users) {
    try {
      await docClient.send(
        new PutCommand({
          TableName: `Users${tableSuffix}`,
          Item: user,
        })
      );
    } catch (error) {
      console.error(`  ✗ Failed to write user ${user.userId}:`, error);
    }
  }
  console.log(`  ✓ Wrote ${users.length} users\n`);

  // Write assertions (in batches)
  console.log('💾 Writing assertions to DynamoDB...');
  const assertionBatches = [];
  for (let i = 0; i < assertions.length; i += 25) {
    assertionBatches.push(assertions.slice(i, i + 25));
  }

  for (const batch of assertionBatches) {
    try {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [`Assertions${tableSuffix}`]: batch.map((assertion) => ({
              PutRequest: { Item: assertion },
            })),
          },
        })
      );
    } catch (error) {
      console.error('  ✗ Failed to write assertion batch:', error);
    }
  }
  console.log(`  ✓ Wrote ${assertions.length} assertions\n`);

  // Write trust relationships
  console.log('💾 Writing trust relationships to DynamoDB...');
  for (const trust of trusts) {
    try {
      await docClient.send(
        new PutCommand({
          TableName: `Trust${tableSuffix}`,
          Item: trust,
        })
      );
    } catch (error) {
      console.error(`  ✗ Failed to write trust ${trust.userId} → ${trust.targetId}:`, error);
    }
  }
  console.log(`  ✓ Wrote ${trusts.length} trust relationships\n`);

  // Write groups
  console.log('💾 Writing groups to DynamoDB...');
  for (const group of groups) {
    try {
      await docClient.send(
        new PutCommand({
          TableName: `Groups${tableSuffix}`,
          Item: group,
        })
      );
    } catch (error) {
      console.error(`  ✗ Failed to write group ${group.groupId}:`, error);
    }
  }
  console.log(`  ✓ Wrote ${groups.length} groups\n`);

  console.log('✅ Seed data generation complete!\n');
  console.log('Next steps:');
  console.log('  1. Users can now log in with their email addresses');
  console.log('  2. Trust networks will propagate automatically');
  console.log('  3. Articles are available in the wiki view');
  console.log('  4. Groups can be explored and trusted');
  console.log('');
}

// Run the script
main().catch((error) => {
  console.error('\n❌ Error generating seed data:', error);
  process.exit(1);
});
