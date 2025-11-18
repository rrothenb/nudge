/**
 * Import API endpoints
 */
import apiClient, { handleApiError } from './client';

export interface ImportJobResponse {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  title?: string;
  url?: string;
  sourceId?: string;
}

/**
 * Import Wikipedia article
 */
export async function importWikipedia(url: string, title?: string): Promise<ImportJobResponse> {
  try {
    const response = await apiClient.post<ImportJobResponse>('/import/wikipedia', {
      url,
      title,
    });
    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
}

/**
 * Import news from RSS feed
 */
export async function importNews(
  feedUrl: string,
  sourceId?: string,
  maxArticles?: number
): Promise<ImportJobResponse> {
  try {
    const response = await apiClient.post<ImportJobResponse>('/import/news', {
      feedUrl,
      sourceId,
      maxArticles,
    });
    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
}
