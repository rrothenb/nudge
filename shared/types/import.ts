/**
 * Import job tracking types
 */

export type ImportJobType = "wiki" | "news";
export type ImportJobStatus = "pending" | "processing" | "completed" | "failed";

export interface ImportJob {
  // Identity
  jobId: string;               // UUID
  userId: string;              // Who initiated import

  // Job details
  jobType: ImportJobType;
  source: string;              // URL or feed identifier

  // Status
  status: ImportJobStatus;
  progress: {
    totalItems: number;
    processedItems: number;
    failedItems: number;
  };

  // Results
  extractedAssertionIds: string[];
  errorMessages?: string[];

  // Timestamps
  createdAt: string;           // ISO timestamp
  startedAt?: string;          // ISO timestamp
  completedAt?: string;        // ISO timestamp
}

export interface StartImportInput {
  jobType: ImportJobType;
  source: string;              // URL to import from
}

export interface ImportJobResponse {
  jobId: string;
  status: ImportJobStatus;
  progress: {
    totalItems: number;
    processedItems: number;
    failedItems: number;
  };
  extractedAssertionIds?: string[];
  errorMessages?: string[];
}
