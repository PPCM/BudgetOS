import { ValidationError } from '../utils/errors.js';

/**
 * Validation middleware using Zod
 * @param {Object} schemas - Zod schemas for body, query, params
 */
export const validate = (schemas) => {
  return (req, res, next) => {
    const errors = [];
    
    // Validate body
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.push(...result.error.errors.map(e => ({
          location: 'body',
          field: e.path.join('.'),
          message: e.message,
        })));
      } else {
        req.body = result.data;
      }
    }
    
    // Validate query params
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.push(...result.error.errors.map(e => ({
          location: 'query',
          field: e.path.join('.'),
          message: e.message,
        })));
      } else {
        req.query = result.data;
      }
    }
    
    // Validate path params
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.push(...result.error.errors.map(e => ({
          location: 'params',
          field: e.path.join('.'),
          message: e.message,
        })));
      } else {
        req.params = result.data;
      }
    }
    
    if (errors.length > 0) {
      throw new ValidationError('Invalid request data', errors, 'VALIDATION_ERROR');
    }
    
    next();
  };
};

/**
 * Middleware to sanitize HTML inputs
 *
 * Note: Only escapes < and > to prevent HTML tag injection.
 * Other characters (&, ", ') are NOT escaped because:
 * - React automatically escapes content on render (XSS protection)
 * - Parameterized queries prevent SQL injection
 * - Encoding at input corrupts legitimate data (e.g., "C'est" becomes "C&#x27;est")
 */
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Only escape HTML tags to prevent tag injection
      // Do NOT escape &, ", ' as they are common in legitimate text
      return obj
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }

    return obj;
  };

  // Don't sanitize password fields
  const excludeFields = ['password', 'passwordConfirm', 'oldPassword', 'newPassword'];

  if (req.body) {
    const sanitizedBody = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (excludeFields.includes(key)) {
        sanitizedBody[key] = value;
      } else {
        sanitizedBody[key] = sanitize(value);
      }
    }
    req.body = sanitizedBody;
  }

  next();
};
