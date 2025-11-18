/**
 * View API endpoints (Wiki, News, Chat)
 */
import apiClient, { handleApiError } from './client';

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
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  response: string;
  sources: Array<{
    assertionId: string;
    content: string;
    trustValue: number;
  }>;
}

/**
 * Get wiki article for a topic
 */
export async function getWikiArticle(topic: string): Promise<WikiArticle> {
  try {
    const encodedTopic = encodeURIComponent(topic);
    const response = await apiClient.get<WikiArticle>(`/views/wiki/${encodedTopic}`);
    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
}

/**
 * Get news feed
 */
export async function getNewsFeed(params?: {
  limit?: number;
  since?: string;
}): Promise<NewsItem[]> {
  try {
    const response = await apiClient.get<NewsItem[]>('/views/news', { params });
    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
}

/**
 * Send chat message and get response
 */
export async function sendChatMessage(query: string): Promise<ChatResponse> {
  try {
    const response = await apiClient.post<ChatResponse>('/views/chat', { query });
    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
}
