import { z } from 'zod'

export const curatedSourceSchema = z.object({
  title: z.string().min(2).max(200),
  url: z.string().url(),
  type: z.enum(['OFFICIAL', 'MARKETPLACE', 'SNS', 'VIDEO', 'ARTICLE', 'COMMUNITY']),
  platform: z.string().min(1),
  excerpt: z.string().max(2000).optional(),
  author: z.string().max(120).optional(),
  publishedAt: z.coerce.date().optional(),
  thumbnailUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
})

export const refreshCurationSchema = z.object({
  includeVideos: z.boolean().default(true),
  includeWeb: z.boolean().default(true),
  maxResults: z.number().int().min(3).max(20).default(12),
})

export type CuratedSourceInput = z.infer<typeof curatedSourceSchema>
export type RefreshCurationInput = z.infer<typeof refreshCurationSchema>


