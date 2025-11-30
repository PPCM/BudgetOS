/**
 * Classe de base pour les erreurs applicatives
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erreur 400 - Requête invalide
 */
export class BadRequestError extends AppError {
  constructor(message = 'Requête invalide', code = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

/**
 * Erreur 401 - Non authentifié
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Non authentifié', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

/**
 * Erreur 403 - Accès interdit
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Accès interdit', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

/**
 * Erreur 404 - Ressource non trouvée
 */
export class NotFoundError extends AppError {
  constructor(message = 'Ressource non trouvée', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

/**
 * Erreur 409 - Conflit
 */
export class ConflictError extends AppError {
  constructor(message = 'Conflit de ressources', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

/**
 * Erreur 422 - Entité non traitable (validation)
 */
export class ValidationError extends AppError {
  constructor(message = 'Données invalides', errors = [], code = 'VALIDATION_ERROR') {
    super(message, 422, code);
    this.errors = errors;
  }
}

/**
 * Erreur 429 - Trop de requêtes
 */
export class TooManyRequestsError extends AppError {
  constructor(message = 'Trop de requêtes', code = 'TOO_MANY_REQUESTS') {
    super(message, 429, code);
  }
}

/**
 * Erreur 500 - Erreur serveur
 */
export class InternalError extends AppError {
  constructor(message = 'Erreur interne du serveur', code = 'INTERNAL_ERROR') {
    super(message, 500, code);
  }
}

/**
 * Erreur de base de données
 */
export class DatabaseError extends AppError {
  constructor(message = 'Erreur de base de données', code = 'DATABASE_ERROR') {
    super(message, 500, code);
  }
}
