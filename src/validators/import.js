import { z } from 'zod';

/**
 * Types de fichiers supportés
 */
export const fileTypes = ['csv', 'excel', 'qif', 'qfx', 'ofx'];

/**
 * Schéma de configuration d'import CSV
 */
export const csvConfigSchema = z.object({
  delimiter: z.enum([',', ';', '\t', '|']).default(';'),
  encoding: z.enum(['utf-8', 'iso-8859-1', 'windows-1252']).default('utf-8'),
  hasHeader: z.boolean().default(true),
  dateFormat: z.string().default('dd/MM/yyyy'),
  decimalSeparator: z.enum(['.', ',']).default(','),
  // Mapping des colonnes
  columns: z.object({
    date: z.number().int().min(0),
    amount: z.number().int().min(0),
    description: z.number().int().min(0),
    valueDate: z.number().int().min(0).optional(),
    category: z.number().int().min(0).optional(),
    reference: z.number().int().min(0).optional(),
  }),
  // Options d'import
  skipRows: z.number().int().min(0).default(0),
  invertAmounts: z.boolean().default(false),
});

/**
 * Schéma de configuration d'import Excel
 */
export const excelConfigSchema = z.object({
  sheetIndex: z.number().int().min(0).default(0),
  hasHeader: z.boolean().default(true),
  dateFormat: z.string().default('dd/MM/yyyy'),
  // Mapping des colonnes (lettres ou indices)
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
 * Schéma de démarrage d'import
 */
export const startImportSchema = z.object({
  accountId: z.string().uuid('ID de compte invalide'),
  fileType: z.enum(fileTypes, {
    errorMap: () => ({ message: 'Type de fichier invalide' }),
  }),
  config: z.union([csvConfigSchema, excelConfigSchema]).optional(),
  // Options de rapprochement
  dateTolerance: z.number().int().min(0).max(10).default(2),
  amountTolerance: z.number().min(0).max(0.1).default(0.01),
  autoReconcile: z.boolean().default(true),
  autoCategories: z.boolean().default(true),
});

/**
 * Schéma de prévisualisation d'import
 */
export const previewImportSchema = z.object({
  fileType: z.enum(fileTypes),
  config: z.union([csvConfigSchema, excelConfigSchema]).optional(),
  previewRows: z.number().int().min(1).max(50).default(10),
});

/**
 * Schéma d'action sur ligne importée
 */
export const importActionSchema = z.object({
  action: z.enum(['import', 'skip', 'match']),
  matchedTransactionId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().max(255).optional(),
});

/**
 * Schéma de validation d'import
 */
export const validateImportSchema = z.object({
  importId: z.string().uuid('ID d\'import invalide'),
  actions: z.record(z.string().uuid(), importActionSchema),
});

/**
 * Schéma de paramètres d'URL
 */
export const importIdParamSchema = z.object({
  id: z.string().uuid('ID d\'import invalide'),
});

/**
 * Schéma de requête pour l'historique des imports
 */
export const listImportsQuerySchema = z.object({
  accountId: z.string().uuid().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
