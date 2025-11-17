import { z } from 'zod';

export const trustValueSchema = z.number().min(0).max(1);

export const setTrustSchema = z.object({
  targetId: z.string().min(1),
  targetType: z.enum(['assertion', 'source', 'user']),
  trustValue: trustValueSchema,
  notes: z.string().max(500).optional(),
});

export const getTrustSchema = z.object({
  targetId: z.string().min(1),
});

export type SetTrustInput = z.infer<typeof setTrustSchema>;
export type GetTrustInput = z.infer<typeof getTrustSchema>;
