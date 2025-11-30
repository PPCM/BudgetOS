import { z } from 'zod';

/**
 * Types de comptes valides
 */
export const accountTypes = ['checking', 'savings', 'cash', 'investment', 'external', 'credit_card'];

/**
 * Schéma de création de compte
 */
export const createAccountSchema = z.object({
  name: z
    .string()
    .min(1, 'Nom requis')
    .max(100, 'Nom trop long')
    .trim(),
  type: z.enum(accountTypes, {
    errorMap: () => ({ message: 'Type de compte invalide' }),
  }),
  institution: z
    .string()
    .max(100, 'Nom d\'établissement trop long')
    .trim()
    .optional(),
  accountNumber: z
    .string()
    .max(50, 'Numéro de compte trop long')
    .trim()
    .optional(),
  initialBalance: z
    .number()
    .finite('Montant invalide')
    .default(0),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'CAD']).default('EUR'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Format de couleur invalide')
    .default('#3B82F6'),
  icon: z
    .string()
    .max(50)
    .default('wallet'),
  isIncludedInTotal: z.boolean().default(true),
  notes: z.string().max(1000).optional(),
});

/**
 * Schéma de mise à jour de compte
 */
export const updateAccountSchema = createAccountSchema.partial();

/**
 * Schéma des paramètres de requête pour la liste des comptes
 */
export const listAccountsQuerySchema = z.object({
  type: z.enum(accountTypes).optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  includeBalance: z
    .string()
    .transform((val) => val !== 'false')
    .default('true'),
});

/**
 * Schéma de paramètres d'URL
 */
export const accountIdParamSchema = z.object({
  id: z.string().uuid('ID de compte invalide'),
});
