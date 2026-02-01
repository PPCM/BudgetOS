import { z } from 'zod';

export const createPayeeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  imageUrl: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updatePayeeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  imageUrl: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const payeeQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional().transform(v => v === undefined ? undefined : v === 'true'),
  page: z.string().optional().transform(v => parseInt(v) || 1),
  limit: z.string().optional().transform(v => Math.min(parseInt(v) || 100, 500)),
});
