/**
 * News Import Lambda - Import news articles from RSS feeds
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createImportJob, updateImportJobStatus, addExtractedAssertions } from '../../lib/db/jobs';
import { createAssertion } from '../../lib/db/assertions';
import { extractAssertionsFromNews } from '../../lib/llm/extraction';
import { getUserId } from '../../lib/utils/auth';
import { successResponse, errorResponse, badRequestResponse } from '../../lib/utils/response';
import { parseBody } from '../../lib/utils/auth';
import { z } from 'zod';

// Request validation schema
const importNewsSchema = z.object({
  feedUrl: z.string().url(),
  sourceId: z.string().optional(),
  maxArticles: z.number().min(1).max(50).optional().default(10),
});

/**
 * Simple RSS feed parser
 */
interface FeedItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  content?: string;
}

async function parseFeed(feedUrl: string): Promise<FeedItem[]> {
  const response = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Nudge/1.0 (Educational Project)',
    },
  });

  if (!response.ok) {
    throw new Error(`Feed fetch error: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();

  // Simple XML parsing (in production, use a proper RSS parser library)
  const items: FeedItem[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of itemMatches) {
    const itemXml = match[1];

    const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[1] ||
                  itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[2] || '';
    const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
    const description = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/)?.[1] ||
                       itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/)?.[2];
    const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
    const content = itemXml.match(/<content:encoded><!\[CDATA\[(.*?)\]\]><\/content:encoded>/)?.[1];

    if (title && link) {
      items.push({
        title: cleanHtml(title),
        link,
        description: description ? cleanHtml(description) : undefined,
        pubDate,
        content: content ? cleanHtml(content) : undefined,
      });
    }
  }

  return items;
}

/**
 * Clean HTML tags from text
 */
function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch article content from URL
 */
async function fetchArticleContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Nudge/1.0 (Educational Project)',
      },
    });

    if (!response.ok) {
      throw new Error(`Article fetch error: ${response.status}`);
    }

    const html = await response.text();
    return cleanHtml(html);
  } catch (error) {
    console.error(`Failed to fetch article content from ${url}:`, error);
    return ''; // Return empty string on failure
  }
}

/**
 * Infer source ID from feed URL
 */
function inferSourceId(feedUrl: string): string {
  const url = new URL(feedUrl);
  const hostname = url.hostname.toLowerCase();

  // Common news sources
  if (hostname.includes('nytimes.com')) return 'NYT';
  if (hostname.includes('washingtonpost.com')) return 'WAPO';
  if (hostname.includes('bbc.co.uk') || hostname.includes('bbc.com')) return 'BBC';
  if (hostname.includes('reuters.com')) return 'REUTERS';
  if (hostname.includes('apnews.com')) return 'AP';
  if (hostname.includes('cnn.com')) return 'CNN';
  if (hostname.includes('foxnews.com')) return 'FOX';
  if (hostname.includes('theguardian.com')) return 'GUARDIAN';

  // Default to hostname
  return hostname.replace(/^www\./, '').split('.')[0].toUpperCase();
}

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('NewsImport event:', JSON.stringify(event, null, 2));

  try {
    const userId = getUserId(event);
    const body = parseBody(event);

    // Validate request
    const validation = importNewsSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse(`Invalid request: ${validation.error.message}`);
    }

    const { feedUrl, sourceId: providedSourceId, maxArticles } = validation.data;

    // Infer source ID if not provided
    const sourceId = providedSourceId || inferSourceId(feedUrl);

    // Create import job
    const job = await createImportJob(
      userId,
      'news',
      feedUrl,
      { sourceId, maxArticles }
    );

    console.log(`Starting news import job ${job.jobId} from feed: ${feedUrl}`);

    // Start async import process (don't await - return 202 immediately)
    processNewsImport(userId, job.jobId, feedUrl, sourceId, maxArticles).catch((error) => {
      console.error(`News import job ${job.jobId} failed:`, error);
      updateImportJobStatus(job.jobId, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      }).catch((e) => console.error('Failed to update job status:', e));
    });

    return successResponse(
      {
        jobId: job.jobId,
        feedUrl,
        sourceId,
        maxArticles,
        status: 'processing',
      },
      202
    );
  } catch (error) {
    console.error('NewsImport error:', error);
    return errorResponse(error);
  }
}

/**
 * Process news import asynchronously
 */
async function processNewsImport(
  userId: string,
  jobId: string,
  feedUrl: string,
  sourceId: string,
  maxArticles: number
): Promise<void> {
  try {
    // Update to processing
    await updateImportJobStatus(jobId, 'processing', {
      currentStep: 'Fetching RSS feed',
    });

    // Parse RSS feed
    console.log(`Fetching RSS feed: ${feedUrl}`);
    const items = await parseFeed(feedUrl);

    if (items.length === 0) {
      throw new Error('No items found in RSS feed');
    }

    console.log(`Found ${items.length} articles in feed, processing ${Math.min(items.length, maxArticles)}`);

    const processItems = items.slice(0, maxArticles);
    const allAssertionIds: string[] = [];

    // Process each article
    for (let i = 0; i < processItems.length; i++) {
      const item = processItems[i];

      await updateImportJobStatus(jobId, 'processing', {
        currentStep: `Processing article ${i + 1}/${processItems.length}`,
        currentArticle: item.title,
      });

      console.log(`Processing article: ${item.title}`);

      // Get article content (use description, content, or fetch from URL)
      let articleText = item.content || item.description || '';

      // If content is too short, try fetching from URL
      if (articleText.length < 200 && item.link) {
        const fetchedContent = await fetchArticleContent(item.link);
        if (fetchedContent.length > articleText.length) {
          articleText = fetchedContent;
        }
      }

      if (articleText.length < 100) {
        console.log(`Skipping article (too short): ${item.title}`);
        continue;
      }

      // Combine title and content
      const fullText = `${item.title}\n\n${articleText}`;

      // Extract assertions
      console.log(`Extracting assertions from ${fullText.length} characters`);
      const extractedAssertions = await extractAssertionsFromNews(fullText);

      if (extractedAssertions.length === 0) {
        console.log(`No assertions extracted from: ${item.title}`);
        continue;
      }

      console.log(`Extracted ${extractedAssertions.length} assertions from: ${item.title}`);

      // Create assertions in database
      for (const extracted of extractedAssertions) {
        const assertion = await createAssertion({
          content: extracted.content,
          type: 'news_import',
          sourceId,
          sourceUrl: item.link,
          metadata: {
            title: item.title,
            pubDate: item.pubDate,
            confidence: extracted.confidence,
            assertionType: extracted.type,
            topics: extracted.topics,
            attributedTo: extracted.attributedTo,
          },
        });
        allAssertionIds.push(assertion.assertionId);
      }
    }

    // Link assertions to job
    if (allAssertionIds.length > 0) {
      await addExtractedAssertions(jobId, allAssertionIds);
    }

    // Mark as completed
    await updateImportJobStatus(jobId, 'completed', {
      articlesProcessed: processItems.length,
      assertionsCreated: allAssertionIds.length,
      completedAt: new Date().toISOString(),
    });

    console.log(`News import job ${jobId} completed: ${allAssertionIds.length} assertions from ${processItems.length} articles`);
  } catch (error) {
    console.error(`News import job ${jobId} failed:`, error);
    throw error; // Re-throw to be caught by the caller
  }
}
