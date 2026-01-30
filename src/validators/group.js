import { z } from 'zod';

/**
 * Schema for creating a group
 */
export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Nom requis')
    .max(100, 'Nom trop long')
    .trim(),
  description: z
    .string()
    .max(500, 'Description trop longue')
    .trim()
    .optional(),
});

/**
 * Schema for updating a group
 */
export const updateGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Nom requis')
    .max(100, 'Nom trop long')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description trop longue')
    .trim()
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * Schema for adding a member to a group
 */
export const addMemberSchema = z.object({
  userId: z.string().min(1, 'ID utilisateur requis').optional(),
  email: z.string().email('Email invalide').toLowerCase().trim().optional(),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Le mot de passe est trop long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Le mot de passe doit contenir une minuscule, une majuscule et un chiffre'
    )
    .optional(),
  firstName: z.string().max(100).trim().optional(),
  lastName: z.string().max(100).trim().optional(),
  role: z.enum(['admin', 'member']).default('member'),
});

/**
 * Schema for updating a member's role
 */
export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member'], {
    required_error: 'Rôle requis',
    invalid_type_error: 'Rôle invalide',
  }),
});

/**
 * Schema for group list query params
 */
export const groupListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().max(100).optional(),
  isActive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});

/**
 * Schema for member list query params
 */
export const memberListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  role: z.enum(['admin', 'member']).optional(),
});
