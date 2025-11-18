/**
 * In-memory data store for local development
 */
import type {
  UserProfile,
  Assertion,
  TrustRelationship,
  ImportJob,
  Group,
} from '@nudge/shared';

export interface WikiArticle {
  topic: string;
  content: string;
  trustScore: number;
  sources: string[];
  generatedAt: string;
}

export interface NewsItem {
  assertionId: string;
  content: string;
  sourceId: string;
  sourceUrl?: string;
  publishedAt: string;
  trustValue: number;
  score: number;
  metadata: {
    title?: string;
    topics?: string[];
  };
}

export interface ChatMessage {
  query: string;
  response: string;
  sources: Array<{
    assertionId: string;
    content: string;
    trustValue: number;
  }>;
  timestamp: string;
}

class DataStore {
  users: Map<string, UserProfile> = new Map();
  assertions: Map<string, Assertion> = new Map();
  trust: Map<string, TrustRelationship[]> = new Map();
  importJobs: Map<string, ImportJob> = new Map();
  wikiCache: Map<string, WikiArticle> = new Map();
  newsCache: NewsItem[] = [];
  chatHistory: Map<string, ChatMessage[]> = new Map();
  groups: Map<string, Group> = new Map();

  // User operations
  getUser(userId: string): UserProfile | undefined {
    return this.users.get(userId);
  }

  setUser(userId: string, user: UserProfile): void {
    this.users.set(userId, user);
  }

  // Assertion operations
  getAssertion(assertionId: string): Assertion | undefined {
    return this.assertions.get(assertionId);
  }

  addAssertion(assertion: Assertion): void {
    this.assertions.set(assertion.assertionId, assertion);
  }

  getAssertionsBySource(sourceId: string): Assertion[] {
    return Array.from(this.assertions.values()).filter(
      (a) => a.sourceId === sourceId
    );
  }

  getAssertionsByTopic(topic: string): Assertion[] {
    return Array.from(this.assertions.values()).filter((a) =>
      a.metadata.topics?.includes(topic)
    );
  }

  getAllAssertions(): Assertion[] {
    return Array.from(this.assertions.values());
  }

  // Trust operations
  getUserTrust(userId: string): TrustRelationship[] {
    return this.trust.get(userId) || [];
  }

  setTrustValue(userId: string, trust: TrustRelationship): void {
    const userTrust = this.trust.get(userId) || [];
    const existing = userTrust.findIndex((t) => t.targetId === trust.targetId);

    if (existing >= 0) {
      userTrust[existing] = trust;
    } else {
      userTrust.push(trust);
    }

    this.trust.set(userId, userTrust);
  }

  getTrustValue(userId: string, targetId: string): TrustRelationship | undefined {
    const userTrust = this.trust.get(userId) || [];
    return userTrust.find((t) => t.targetId === targetId);
  }

  deleteTrustValue(userId: string, targetId: string): void {
    const userTrust = this.trust.get(userId) || [];
    const filtered = userTrust.filter((t) => t.targetId !== targetId);
    this.trust.set(userId, filtered);
  }

  // Import job operations
  createImportJob(job: ImportJob): void {
    this.importJobs.set(job.jobId, job);
  }

  getImportJob(jobId: string): ImportJob | undefined {
    return this.importJobs.get(jobId);
  }

  // Cache operations
  getWikiArticle(userId: string, topic: string): WikiArticle | undefined {
    return this.wikiCache.get(`${userId}:${topic}`);
  }

  setWikiArticle(userId: string, topic: string, article: WikiArticle): void {
    this.wikiCache.set(`${userId}:${topic}`, article);
  }

  getNews(): NewsItem[] {
    return this.newsCache;
  }

  addNewsItems(items: NewsItem[]): void {
    this.newsCache.push(...items);
    // Sort by score descending
    this.newsCache.sort((a, b) => b.score - a.score);
  }

  // Chat operations
  getChatHistory(userId: string): ChatMessage[] {
    return this.chatHistory.get(userId) || [];
  }

  addChatMessage(userId: string, message: ChatMessage): void {
    const history = this.chatHistory.get(userId) || [];
    history.push(message);
    this.chatHistory.set(userId, history);
  }

  // Group operations
  getGroup(groupId: string): Group | undefined {
    return this.groups.get(groupId);
  }

  addGroup(group: Group): void {
    this.groups.set(group.groupId, group);
  }

  getAllGroups(): Group[] {
    return Array.from(this.groups.values());
  }

  deleteGroup(groupId: string): void {
    this.groups.delete(groupId);
  }

  // Reset (for testing)
  reset(): void {
    this.users.clear();
    this.assertions.clear();
    this.trust.clear();
    this.importJobs.clear();
    this.wikiCache.clear();
    this.newsCache = [];
    this.chatHistory.clear();
    this.groups.clear();
  }
}

export const store = new DataStore();
