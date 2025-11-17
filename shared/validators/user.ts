import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  defaultTrustThreshold: z.number().min(0).max(1).optional(),
  openMindedness: z.number().min(0).max(1).optional(),
  defaultView: z.enum(['wiki', 'news', 'chat']).optional(),
});

export const userPreferencesSchema = z.object({
  defaultTrustThreshold: z.number().min(0).max(1),
  openMindedness: z.number().min(0).max(1),
  defaultView: z.enum(['wiki', 'news', 'chat']),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
