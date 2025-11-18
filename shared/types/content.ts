/**
 * Generated content and caching types
 */

export type ContentType = "wiki_article" | "news_feed" | "chat_response";

export interface GeneratedContent {
  // Identity
  userId: string;
  contentType: ContentType;
  contentId: string;           // Topic name, query hash, etc

  // Content
  generatedContent: string;    // The actual text (markdown or HTML)
  assertionIds: string[];      // Which assertions were used

  // Cache metadata
  trustSnapshot: Record<string, number>;  // Trust values at generation time
  generatedAt: string;         // ISO timestamp
  expiresAt: number;           // Unix timestamp for DynamoDB TTL

  // Stats
  claudeTokensUsed: number;
  generationTimeMs: number;
}

export interface WikiArticle {
  topic: string;
  content: string;             // Generated markdown
  assertions: {
    id: string;
    content: string;
    trustValue: number;
    sourceId: string;
  }[];
  generatedAt: string;
}

export interface NewsFeedItem {
  assertionId: string;
  content: string;
  sourceId: string;
  sourceName: string;
  trustValue: number;
  publishedAt: string;
  url?: string;
  recencyScore: number;        // 0-1, based on publication date
  controversyScore: number;    // 0-1, variance in trust across users
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citedAssertions?: string[];  // AssertionIds cited in response
  timestamp: string;
}

export interface ChatConversation {
  conversationId: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
