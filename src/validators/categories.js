import { z } from 'zod';

/**
 * Types de catégories
 */
export const categoryTypes = ['income', 'expense', 'transfer'];

/**
 * Schéma de création de catégorie
 */
export const createCategorySchema = z.object({
  parentId: z.string().uuid('ID de catégorie parente invalide').nullable().optional(),
  name: z
    .string()
    .min(1, 'Nom requis')
    .max(100, 'Nom trop long')
    .trim(),
  type: z.enum(categoryTypes, {
    errorMap: () => ({ message: 'Type de catégorie invalide' }),
  }),
  icon: z
    .string()
    .max(50)
    .default('tag'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Format de couleur invalide')
    .default('#6B7280'),
  budgetMonthly: z
    .number()
    .positive('Budget invalide')
    .nullable()
    .optional(),
  sortOrder: z.number().int().min(0).default(0),
});

/**
 * Schéma de mise à jour de catégorie
 */
export const updateCategorySchema = createCategorySchema.partial();

/**
 * Schéma de paramètres d'URL
 */
export const categoryIdParamSchema = z.object({
  id: z.string().uuid('ID de catégorie invalide'),
});

/**
 * Schéma de requête pour la liste des catégories
 */
export const listCategoriesQuerySchema = z.object({
  type: z.enum(categoryTypes).optional(),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  includeSystem: z
    .string()
    .transform((val) => val !== 'false')
    .default('true'),
  flat: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
});
