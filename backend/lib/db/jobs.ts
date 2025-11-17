/**
 * Import job tracking operations
 */
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, TABLES } from './client';
import { NotFoundError } from '../utils/errors';
import type { ImportJob, ImportJobType, ImportJobStatus } from '@nudge/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new import job
 */
export async function createImportJob(
  userId: string,
  jobType: ImportJobType,
  source: string
): Promise<ImportJob> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();
  const jobId = uuidv4();

  const job: ImportJob = {
    jobId,
    userId,
    jobType,
    source,
    status: 'pending',
    progress: {
      totalItems: 0,
      processedItems: 0,
      failedItems: 0,
    },
    extractedAssertionIds: [],
    createdAt: now,
  };

  await client.send(
    new PutCommand({
      TableName: TABLES.JOBS,
      Item: {
        PK: `JOB#${jobId}`,
        SK: 'STATUS',
        ...job,
        // GSI1: Query by user
        GSI1PK: `USER#${userId}`,
        GSI1SK: `CREATED#${now}`,
      },
    })
  );

  return job;
}

/**
 * Get import job by ID
 */
export async function getImportJob(jobId: string): Promise<ImportJob> {
  const client = getDynamoDBClient();

  const result = await client.send(
    new GetCommand({
      TableName: TABLES.JOBS,
      Key: {
        PK: `JOB#${jobId}`,
        SK: 'STATUS',
      },
    })
  );

  if (!result.Item) {
    throw new NotFoundError(`Import job not found: ${jobId}`);
  }

  const { PK, SK, GSI1PK, GSI1SK, ...job } = result.Item;
  return job as ImportJob;
}

/**
 * Update import job status
 */
export async function updateImportJobStatus(
  jobId: string,
  status: ImportJobStatus,
  progress?: {
    totalItems?: number;
    processedItems?: number;
    failedItems?: number;
  },
  errorMessages?: string[]
): Promise<void> {
  const client = getDynamoDBClient();
  const now = new Date().toISOString();

  const updateExpressions: string[] = ['#status = :status', '#updatedAt = :updatedAt'];
  const expressionAttributeNames: Record<string, string> = {
    '#status': 'status',
    '#updatedAt': 'updatedAt',
  };
  const expressionAttributeValues: Record<string, any> = {
    ':status': status,
    ':updatedAt': now,
  };

  // Update timestamps based on status
  if (status === 'processing') {
    updateExpressions.push('#startedAt = :startedAt');
    expressionAttributeNames['#startedAt'] = 'startedAt';
    expressionAttributeValues[':startedAt'] = now;
  } else if (status === 'completed' || status === 'failed') {
    updateExpressions.push('#completedAt = :completedAt');
    expressionAttributeNames['#completedAt'] = 'completedAt';
    expressionAttributeValues[':completedAt'] = now;
  }

  // Update progress if provided
  if (progress) {
    if (progress.totalItems !== undefined) {
      updateExpressions.push('#progress.#totalItems = :totalItems');
      expressionAttributeNames['#progress'] = 'progress';
      expressionAttributeNames['#totalItems'] = 'totalItems';
      expressionAttributeValues[':totalItems'] = progress.totalItems;
    }
    if (progress.processedItems !== undefined) {
      updateExpressions.push('#progress.#processedItems = :processedItems');
      expressionAttributeNames['#progress'] = 'progress';
      expressionAttributeNames['#processedItems'] = 'processedItems';
      expressionAttributeValues[':processedItems'] = progress.processedItems;
    }
    if (progress.failedItems !== undefined) {
      updateExpressions.push('#progress.#failedItems = :failedItems');
      expressionAttributeNames['#progress'] = 'progress';
      expressionAttributeNames['#failedItems'] = 'failedItems';
      expressionAttributeValues[':failedItems'] = progress.failedItems;
    }
  }

  // Add error messages if provided
  if (errorMessages && errorMessages.length > 0) {
    updateExpressions.push('#errorMessages = :errorMessages');
    expressionAttributeNames['#errorMessages'] = 'errorMessages';
    expressionAttributeValues[':errorMessages'] = errorMessages;
  }

  await client.send(
    new UpdateCommand({
      TableName: TABLES.JOBS,
      Key: {
        PK: `JOB#${jobId}`,
        SK: 'STATUS',
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
}

/**
 * Add extracted assertion IDs to job
 */
export async function addExtractedAssertions(
  jobId: string,
  assertionIds: string[]
): Promise<void> {
  if (assertionIds.length === 0) {
    return;
  }

  const client = getDynamoDBClient();

  await client.send(
    new UpdateCommand({
      TableName: TABLES.JOBS,
      Key: {
        PK: `JOB#${jobId}`,
        SK: 'STATUS',
      },
      UpdateExpression:
        'SET #extractedAssertionIds = list_append(if_not_exists(#extractedAssertionIds, :empty_list), :newIds)',
      ExpressionAttributeNames: {
        '#extractedAssertionIds': 'extractedAssertionIds',
      },
      ExpressionAttributeValues: {
        ':newIds': assertionIds,
        ':empty_list': [],
      },
    })
  );
}

/**
 * List import jobs for a user
 */
export async function listUserImportJobs(
  userId: string,
  limit: number = 50,
  lastEvaluatedKey?: Record<string, any>
): Promise<{
  jobs: ImportJob[];
  lastEvaluatedKey?: Record<string, any>;
}> {
  const client = getDynamoDBClient();

  const result = await client.send(
    new QueryCommand({
      TableName: TABLES.JOBS,
      IndexName: 'ByUser',
      KeyConditionExpression: 'GSI1PK = :userKey',
      ExpressionAttributeValues: {
        ':userKey': `USER#${userId}`,
      },
      ScanIndexForward: false, // Latest first
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    })
  );

  const jobs = (result.Items || []).map((item) => {
    const { PK, SK, GSI1PK, GSI1SK, ...job } = item;
    return job as ImportJob;
  });

  return {
    jobs,
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

/**
 * Get active import jobs (pending or processing)
 */
export async function getActiveImportJobs(userId: string): Promise<ImportJob[]> {
  const { jobs } = await listUserImportJobs(userId, 100);
  return jobs.filter((job) => job.status === 'pending' || job.status === 'processing');
}
