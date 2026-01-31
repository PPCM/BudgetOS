import { z } from 'zod';

/**
 * Types de transactions
 */
export const transactionTypes = ['income', 'expense', 'transfer'];

/**
 * Statuts de transactions
 */
export const transactionStatuses = ['pending', 'cleared', 'reconciled', 'void'];

/**
 * Schéma de base pour une transaction
 */
const baseTransactionSchema = {
  accountId: z.string().uuid('ID de compte invalide'),
  categoryId: z.string().uuid('ID de catégorie invalide').nullable().optional(),
  payeeId: z.string().uuid('ID de tiers invalide').nullable().optional(),
  creditCardId: z.string().uuid('ID de carte invalide').nullable().optional(),
  amount: z
    .number()
    .finite('Montant invalide')
    .refine((val) => val !== 0, 'Le montant ne peut pas être nul'),
  description: z
    .string()
    .min(1, 'Description requise')
    .max(255, 'Description trop longue')
    .trim(),
  notes: z.string().max(1000).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  valueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide')
    .optional(),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide')
    .optional(),
  type: z.enum(transactionTypes, {
    errorMap: () => ({ message: 'Type de transaction invalide' }),
  }),
  status: z.enum(transactionStatuses).default('pending'),
  tags: z.array(z.string().max(50)).max(10).optional(),
  checkNumber: z.string().max(50).nullable().optional(),
};

/**
 * Schéma de création de transaction
 */
export const createTransactionSchema = z.object({
  ...baseTransactionSchema,
  // accountId can be null for transfers with external source
  accountId: z.string().uuid('ID de compte invalide').nullable(),
  // Pour les virements (can be null or undefined)
  toAccountId: z.string().uuid('ID de compte destination invalide').nullable().optional(),
}).refine((data) => {
  // For non-transfers, accountId is required
  if (data.type !== 'transfer' && !data.accountId) {
    return false
  }
  // For transfers, at least one account must be set
  if (data.type === 'transfer' && !data.accountId && !data.toAccountId) {
    return false
  }
  return true
}, {
  message: 'Un compte est requis',
  path: ['accountId'],
});

/**
 * Schéma de mise à jour de transaction
 */
export const updateTransactionSchema = z.object({
  ...baseTransactionSchema,
  // accountId can be null for transfers with external source
  accountId: z.string().uuid('ID de compte invalide').nullable().optional(),
  amount: baseTransactionSchema.amount.optional(),
  description: z
    .string()
    .min(1, 'Description requise')
    .max(255, 'Description trop longue')
    .trim()
    .optional(),
  date: baseTransactionSchema.date.optional(),
  type: z.enum(transactionTypes).optional(),
  // For transfers: destination account (can be added, changed, or removed)
  toAccountId: z.string().uuid('ID de compte destination invalide').nullable().optional(),
}).partial();

/**
 * Schéma pour les splits (ventilation)
 */
export const transactionSplitSchema = z.object({
  categoryId: z.string().uuid('ID de catégorie invalide').nullable(),
  amount: z.number().finite('Montant invalide'),
  description: z.string().max(255).optional(),
});

/**
 * Schéma de création de transaction avec splits
 */
export const createSplitTransactionSchema = z.object({
  ...baseTransactionSchema,
  splits: z.array(transactionSplitSchema).min(2, 'Au moins 2 ventilations requises'),
}).refine((data) => {
  const totalSplits = data.splits.reduce((sum, split) => sum + Math.abs(split.amount), 0);
  return Math.abs(totalSplits - Math.abs(data.amount)) < 0.01;
}, {
  message: 'La somme des ventilations doit égaler le montant total',
  path: ['splits'],
});

/**
 * Schéma de requête pour la liste des transactions
 */
export const listTransactionsQuerySchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  creditCardId: z.string().uuid().optional(),
  type: z.enum(transactionTypes).optional(),
  status: z.enum(transactionStatuses).optional(),
  isReconciled: z.enum(['true', 'false']).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.enum(['date', 'amount', 'description', 'created_at', 'payee', 'category', 'account']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Schéma de paramètres d'URL
 */
export const transactionIdParamSchema = z.object({
  id: z.string().uuid('ID de transaction invalide'),
});

/**
 * Schéma pour le rapprochement
 */
export const reconcileTransactionsSchema = z.object({
  transactionIds: z.array(z.string().uuid()).min(1, 'Au moins une transaction requise'),
  reconcileDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),
});
