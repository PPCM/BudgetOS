import { z } from 'zod';

/**
 * Condition operators
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
 * Available fields for conditions
 */
export const conditionFields = [
  'description',
  'amount',
  'date',
  'type',
];

/**
 * Rule condition schema
 */
export const ruleConditionSchema = z.object({
  field: z.enum(conditionFields),
  operator: z.enum(conditionOperators),
  value: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]),
  caseSensitive: z.boolean().default(false),
});

/**
 * Base rule schema
 */
const ruleBaseSchema = z.object({
  name: z.string().min(1, 'Name required').max(100, 'Name too long').trim(),
  priority: z.number().int().min(0).max(100).default(0),
  isActive: z.boolean().default(true),
  conditions: z.array(ruleConditionSchema).min(1, 'At least one condition required'),
  conditionLogic: z.enum(['and', 'or']).default('and'),
  actionCategoryId: z.string().uuid('Invalid category ID').nullable().optional(),
  actionTags: z.array(z.string().max(50)).max(10).optional(),
  actionNotes: z.string().max(500).optional(),
});

/**
 * Rule creation schema
 */
export const createRuleSchema = ruleBaseSchema;

/**
 * Rule update schema
 */
export const updateRuleSchema = ruleBaseSchema.partial();

/**
 * URL parameters schema
 */
export const ruleIdParamSchema = z.object({
  id: z.string().uuid('Invalid rule ID'),
});

/**
 * Query schema for rule list
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
 * Schema for testing a rule
 */
export const testRuleSchema = z.object({
  description: z.string().max(255).optional(),
  amount: z.number().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
});
