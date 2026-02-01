import { z } from 'zod';

/**
 * Category types
 */
export const categoryTypes = ['income', 'expense', 'transfer'];

/**
 * Category creation schema
 */
export const createCategorySchema = z.object({
  parentId: z.string().uuid('Invalid parent category ID').nullable().optional(),
  name: z
    .string()
    .min(1, 'Name required')
    .max(100, 'Name too long')
    .trim(),
  type: z.enum(categoryTypes, {
    errorMap: () => ({ message: 'Invalid category type' }),
  }),
  icon: z
    .string()
    .max(50)
    .default('tag'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .default('#6B7280'),
  budgetMonthly: z
    .number()
    .positive('Invalid budget')
    .nullable()
    .optional(),
  sortOrder: z.number().int().min(0).default(0),
});

/**
 * Category update schema
 */
export const updateCategorySchema = createCategorySchema.partial();

/**
 * URL parameters schema
 */
export const categoryIdParamSchema = z.object({
  id: z.string().uuid('Invalid category ID'),
});

/**
 * Query schema for category list
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
