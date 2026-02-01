import { z } from 'zod';

/**
 * Supported file types
 */
export const fileTypes = ['csv', 'excel', 'qif', 'qfx', 'ofx'];

/**
 * CSV import configuration schema
 */
export const csvConfigSchema = z.object({
  delimiter: z.enum([',', ';', '\t', '|']).default(';'),
  encoding: z.enum(['utf-8', 'iso-8859-1', 'windows-1252']).default('utf-8'),
  hasHeader: z.boolean().default(true),
  dateFormat: z.string().default('dd/MM/yyyy'),
  decimalSeparator: z.enum(['.', ',']).default(','),
  columns: z.object({
    date: z.number().int().min(0),
    amount: z.number().int().min(0),
    description: z.number().int().min(0),
    valueDate: z.number().int().min(0).optional(),
    category: z.number().int().min(0).optional(),
    reference: z.number().int().min(0).optional(),
  }),
  skipRows: z.number().int().min(0).default(0),
  invertAmounts: z.boolean().default(false),
});

/**
 * Excel import configuration schema
 */
export const excelConfigSchema = z.object({
  sheetIndex: z.number().int().min(0).default(0),
  hasHeader: z.boolean().default(true),
  dateFormat: z.string().default('dd/MM/yyyy'),
  columns: z.object({
    date: z.union([z.string(), z.number().int().min(0)]),
    amount: z.union([z.string(), z.number().int().min(0)]),
    description: z.union([z.string(), z.number().int().min(0)]),
    valueDate: z.union([z.string(), z.number().int().min(0)]).optional(),
    category: z.union([z.string(), z.number().int().min(0)]).optional(),
  }),
  skipRows: z.number().int().min(0).default(0),
  invertAmounts: z.boolean().default(false),
});

/**
 * Import action schema for confirm endpoint
 */
export const confirmActionSchema = z.object({
  action: z.enum(['create', 'skip', 'match']),
  matchedTransactionId: z.string().uuid().optional(),
  payeeId: z.string().uuid().optional().nullable(),
  creditCardId: z.string().uuid().optional().nullable(),
  merchantPattern: z.string().max(500).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  description: z.string().max(255).optional(),
});

/**
 * Confirm import schema
 */
export const confirmImportSchema = z.object({
  importId: z.string().uuid('Invalid import ID'),
  actions: z.record(z.string(), confirmActionSchema),
  autoCategories: z.boolean().default(true),
});

/**
 * Query schema for match candidates search
 */
export const matchCandidatesQuerySchema = z.object({
  accountId: z.string().uuid(),
  amount: z.coerce.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * URL parameter schema for import ID
 */
export const importIdParamSchema = z.object({
  id: z.string().uuid('Invalid import ID'),
});

/**
 * Query schema for import history
 */
export const listImportsQuerySchema = z.object({
  accountId: z.string().uuid().optional(),
  status: z.enum(['pending', 'analyzing', 'analyzed', 'processing', 'completed', 'failed']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
