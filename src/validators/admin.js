import { z } from 'zod';

/**
 * Schema for creating a user via admin
 */
export const createUserSchema = z.object({
  email: z
    .string()
    .email('Email invalide')
    .max(255, 'Email trop long')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Le mot de passe est trop long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Le mot de passe doit contenir une minuscule, une majuscule et un chiffre'
    ),
  firstName: z
    .string()
    .min(1, 'Prénom requis')
    .max(100, 'Prénom trop long')
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(1, 'Nom requis')
    .max(100, 'Nom trop long')
    .trim()
    .optional(),
  role: z.enum(['user', 'admin']).default('user'),
  groupId: z.string().min(1, 'ID groupe requis').optional(),
  locale: z.enum(['fr', 'en']).default('fr'),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'CAD']).default('EUR'),
});

/**
 * Schema for updating user role
 */
export const updateRoleSchema = z.object({
  role: z.enum(['user', 'admin'], {
    required_error: 'Rôle requis',
    invalid_type_error: 'Rôle invalide (user ou admin)',
  }),
});

/**
 * Schema for system settings update
 */
export const updateSettingsSchema = z.object({
  allowPublicRegistration: z.boolean().optional(),
  defaultRegistrationGroupId: z.string().nullable().optional(),
});

/**
 * Schema for admin user list query params
 */
export const userListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  role: z.enum(['user', 'admin', 'super_admin']).optional(),
  groupId: z.string().optional(),
});
