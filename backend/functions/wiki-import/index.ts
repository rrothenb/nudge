/**
 * Wiki Import Lambda - Import Wikipedia articles
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createImportJob, updateImportJobStatus, addExtractedAssertions } from '../../lib/db/jobs';
import { createAssertion } from '../../lib/db/assertions';
import { extractAssertionsFromWikipedia } from '../../lib/llm/extraction';
import { getUserId } from '../../lib/utils/auth';
import { successResponse, errorResponse, badRequestResponse } from '../../lib/utils/response';
import { parseBody } from '../../lib/utils/auth';
import { z } from 'zod';

// Request validation schema
const importWikiSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
});

/**
 * Extract Wikipedia article title from URL
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const wikiIndex = pathParts.indexOf('wiki');

    if (wikiIndex >= 0 && pathParts.length > wikiIndex + 1) {
      return decodeURIComponent(pathParts[wikiIndex + 1]);
    }

    throw new Error('Invalid Wikipedia URL format');
  } catch (error) {
    throw new Error(`Failed to extract title from URL: ${url}`);
  }
}

/**
 * Fetch Wikipedia article content via MediaWiki API
 */
async function fetchWikipediaArticle(title: string): Promise<string> {
  const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}`;

  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Nudge/1.0 (Educational Project)',
    },
  });

  if (!response.ok) {
    throw new Error(`Wikipedia API error: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Simple HTML text extraction (remove tags)
  // In production, you'd use a proper HTML parser like cheerio
  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('WikiImport event:', JSON.stringify(event, null, 2));

  try {
    const userId = getUserId(event);
    const body = parseBody(event);

    // Validate request
    const validation = importWikiSchema.safeParse(body);
    if (!validation.success) {
      return badRequestResponse(`Invalid request: ${validation.error.message}`);
    }

    const { url, title: providedTitle } = validation.data;

    // Extract title from URL if not provided
    const title = providedTitle || extractTitleFromUrl(url);

    // Create import job
    const job = await createImportJob(
      userId,
      'wikipedia',
      url,
      { title }
    );

    console.log(`Starting Wikipedia import job ${job.jobId} for article: ${title}`);

    // Start async import process (don't await - return 202 immediately)
    processWikipediaImport(userId, job.jobId, url, title).catch((error) => {
      console.error(`Wikipedia import job ${job.jobId} failed:`, error);
      updateImportJobStatus(job.jobId, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      }).catch((e) => console.error('Failed to update job status:', e));
    });

    return successResponse(
      {
        jobId: job.jobId,
        title,
        url,
        status: 'processing',
      },
      202
    );
  } catch (error) {
    console.error('WikiImport error:', error);
    return errorResponse(error);
  }
}

/**
 * Process Wikipedia import asynchronously
 */
async function processWikipediaImport(
  userId: string,
  jobId: string,
  url: string,
  title: string
): Promise<void> {
  try {
    // Update to processing
    await updateImportJobStatus(jobId, 'processing', {
      currentStep: 'Fetching article content',
    });

    // Fetch article content
    console.log(`Fetching Wikipedia article: ${title}`);
    const content = await fetchWikipediaArticle(title);

    if (!content || content.length < 100) {
      throw new Error('Article content too short or empty');
    }

    await updateImportJobStatus(jobId, 'processing', {
      currentStep: 'Extracting assertions with Claude',
      contentLength: content.length,
    });

    // Extract assertions using Claude
    console.log(`Extracting assertions from ${content.length} characters`);
    const extractedAssertions = await extractAssertionsFromWikipedia(content);

    if (extractedAssertions.length === 0) {
      throw new Error('No assertions extracted from article');
    }

    console.log(`Extracted ${extractedAssertions.length} assertions`);

    await updateImportJobStatus(jobId, 'processing', {
      currentStep: 'Storing assertions',
      assertionsExtracted: extractedAssertions.length,
    });

    // Create assertions in database
    const assertionIds: string[] = [];
    for (const extracted of extractedAssertions) {
      const assertion = await createAssertion({
        content: extracted.content,
        type: 'wiki_import',
        sourceId: 'WIKIPEDIA',
        sourceUrl: url,
        metadata: {
          title,
          confidence: extracted.confidence,
          assertionType: extracted.type,
          topics: extracted.topics,
          attributedTo: extracted.attributedTo,
        },
      });
      assertionIds.push(assertion.assertionId);
    }

    // Link assertions to job
    await addExtractedAssertions(jobId, assertionIds);

    // Mark as completed
    await updateImportJobStatus(jobId, 'completed', {
      assertionsCreated: assertionIds.length,
      completedAt: new Date().toISOString(),
    });

    console.log(`Wikipedia import job ${jobId} completed: ${assertionIds.length} assertions created`);
  } catch (error) {
    console.error(`Wikipedia import job ${jobId} failed:`, error);
    throw error; // Re-throw to be caught by the caller
  }
}
