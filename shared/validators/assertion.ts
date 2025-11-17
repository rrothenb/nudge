import { z } from 'zod';
import { AssertionType } from '../types/assertion';

export const assertionTypeSchema = z.nativeEnum(AssertionType);

export const createAssertionSchema = z.object({
  type: assertionTypeSchema,
  content: z.union([z.string().min(1), z.record(z.any())]),
  sourceId: z.string().min(1),
  sourceType: z.enum(['user', 'bot', 'import']),
  topic: z.array(z.string()).optional(),
  publishedAt: z.string().datetime().optional(),
  url: z.string().url().optional(),
  extractedFrom: z.string().optional(),
});

export const assertionIdSchema = z.string().uuid();

export type CreateAssertionInput = z.infer<typeof createAssertionSchema>;
