import { z } from 'zod';

/**
 * Schéma d'inscription
 */
export const registerSchema = z.object({
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
      'Le mot de passe doit contenir au moins 8 caractères, une minuscule, une majuscule et un chiffre'
    ),
  passwordConfirm: z.string(),
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
  locale: z.enum(['fr', 'en']).default('fr'),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'CAD']).default('EUR'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['passwordConfirm'],
});

/**
 * Schéma de connexion
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('Email invalide')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Mot de passe requis'),
  rememberMe: z.boolean().default(false),
});

/**
 * Schéma de mise à jour du profil
 */
export const updateProfileSchema = z.object({
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
  locale: z.enum(['fr', 'en']).optional(),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'CAD']).optional(),
  timezone: z.string().max(50).optional(),
});

/**
 * Schéma de changement de mot de passe
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Le mot de passe est trop long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Le mot de passe doit contenir au moins 8 caractères, une minuscule, une majuscule et un chiffre'
    ),
  newPasswordConfirm: z.string(),
}).refine((data) => data.newPassword === data.newPasswordConfirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['newPasswordConfirm'],
});
