import { z } from 'zod';
import { transactionTypes } from './transactions.js';

/**
 * Available frequencies
 */
export const frequencies = [
  'once',
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannual',
  'annual',
];

/**
 * Base planned transaction schema
 */
const plannedTransactionBaseSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
  payeeId: z.string().uuid('Invalid payee ID').nullable().optional(),
  creditCardId: z.string().uuid('Invalid card ID').nullable().optional(),
  toAccountId: z.string().uuid('Invalid destination account ID').nullable().optional(),
  amount: z.number().finite('Invalid amount'),
  description: z.string().min(1, 'Description required').max(255, 'Description too long').trim(),
  notes: z.string().max(1000).optional(),
  type: z.enum(transactionTypes, { errorMap: () => ({ message: 'Invalid transaction type' }) }),
  frequency: z.enum(frequencies, { errorMap: () => ({ message: 'Invalid frequency' }) }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  deleteOnEnd: z.boolean().default(false),
  executeBeforeHoliday: z.boolean().default(false),
  daysBeforeCreate: z.number().int().min(0).max(30).default(0),
  maxOccurrences: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

/**
 * Planned transaction creation schema
 */
export const createPlannedTransactionSchema = plannedTransactionBaseSchema;

/**
 * Planned transaction update schema
 */
export const updatePlannedTransactionSchema = plannedTransactionBaseSchema.partial();

/**
 * URL parameters schema
 */
export const plannedTransactionIdParamSchema = z.object({
  id: z.string().uuid('Invalid planned transaction ID'),
});

/**
 * Query schema for list
 */
export const listPlannedTransactionsQuerySchema = z.object({
  accountId: z.string().uuid().optional(),
  type: z.enum(transactionTypes).optional(),
  frequency: z.enum(frequencies).optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

/**
 * Schema for manually creating an occurrence
 */
export const createOccurrenceSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  amount: z.number().finite().optional(),
});
