import { z } from 'zod';

/**
 * Opérateurs de condition
 */
export const conditionOperators = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'greater_than',
  'less_than',
  'between',
  'regex',
];

/**
 * Champs disponibles pour les conditions
 */
export const conditionFields = [
  'description',
  'amount',
  'date',
  'type',
];

/**
 * Schéma d'une condition de règle
 */
export const ruleConditionSchema = z.object({
  field: z.enum(conditionFields),
  operator: z.enum(conditionOperators),
  value: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]),
  caseSensitive: z.boolean().default(false),
});

/**
 * Schéma de base pour règle
 */
const ruleBaseSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100, 'Nom trop long').trim(),
  priority: z.number().int().min(0).max(100).default(0),
  isActive: z.boolean().default(true),
  conditions: z.array(ruleConditionSchema).min(1, 'Au moins une condition requise'),
  conditionLogic: z.enum(['and', 'or']).default('and'),
  actionCategoryId: z.string().uuid('ID de catégorie invalide').nullable().optional(),
  actionTags: z.array(z.string().max(50)).max(10).optional(),
  actionNotes: z.string().max(500).optional(),
});

/**
 * Schéma de création de règle
 */
export const createRuleSchema = ruleBaseSchema;

/**
 * Schéma de mise à jour de règle
 */
export const updateRuleSchema = ruleBaseSchema.partial();

/**
 * Schéma de paramètres d'URL
 */
export const ruleIdParamSchema = z.object({
  id: z.string().uuid('ID de règle invalide'),
});

/**
 * Schéma de requête pour la liste des règles
 */
export const listRulesQuerySchema = z.object({
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  sortBy: z.enum(['name', 'priority', 'times_applied', 'created_at']).default('priority'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Schéma pour tester une règle
 */
export const testRuleSchema = z.object({
  description: z.string().max(255).optional(),
  amount: z.number().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
});
