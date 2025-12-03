import { z } from 'zod';
import { transactionTypes } from './transactions.js';

/**
 * Fréquences disponibles
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
 * Schéma de base pour transaction planifiée
 */
const plannedTransactionBaseSchema = z.object({
  accountId: z.string().uuid('ID de compte invalide'),
  categoryId: z.string().uuid('ID de catégorie invalide').nullable().optional(),
  payeeId: z.string().uuid('ID de tiers invalide').nullable().optional(),
  creditCardId: z.string().uuid('ID de carte invalide').nullable().optional(),
  toAccountId: z.string().uuid('ID de compte destination invalide').nullable().optional(),
  amount: z.number().finite('Montant invalide'),
  description: z.string().min(1, 'Description requise').max(255, 'Description trop longue').trim(),
  notes: z.string().max(1000).optional(),
  type: z.enum(transactionTypes, { errorMap: () => ({ message: 'Type de transaction invalide' }) }),
  frequency: z.enum(frequencies, { errorMap: () => ({ message: 'Fréquence invalide' }) }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  executeBeforeHoliday: z.boolean().default(false),
  daysBeforeCreate: z.number().int().min(0).max(30).default(0),
  maxOccurrences: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

/**
 * Schéma de création de transaction planifiée
 */
export const createPlannedTransactionSchema = plannedTransactionBaseSchema;

/**
 * Schéma de mise à jour de transaction planifiée
 */
export const updatePlannedTransactionSchema = plannedTransactionBaseSchema.partial();

/**
 * Schéma de paramètres d'URL
 */
export const plannedTransactionIdParamSchema = z.object({
  id: z.string().uuid('ID de transaction planifiée invalide'),
});

/**
 * Schéma de requête pour la liste
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
 * Schéma pour créer une occurrence manuellement
 */
export const createOccurrenceSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),
  amount: z.number().finite().optional(),
});
