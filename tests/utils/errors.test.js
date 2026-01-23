/**
 * Error classes tests
 */
import { describe, it, expect } from 'vitest'
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalError,
  DatabaseError,
} from '../../src/utils/errors.js'

describe('AppError', () => {
  it('creates error with default values', () => {
    const error = new AppError('Test error')
    expect(error.message).toBe('Test error')
    expect(error.statusCode).toBe(500)
    expect(error.code).toBe('INTERNAL_ERROR')
    expect(error.isOperational).toBe(true)
  })

  it('creates error with custom values', () => {
    const error = new AppError('Custom error', 418, 'TEAPOT')
    expect(error.message).toBe('Custom error')
    expect(error.statusCode).toBe(418)
    expect(error.code).toBe('TEAPOT')
  })

  it('is an instance of Error', () => {
    const error = new AppError('Test')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AppError)
  })

  it('has stack trace', () => {
    const error = new AppError('Test')
    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('errors.test.js')
  })
})

describe('BadRequestError', () => {
  it('creates error with status 400', () => {
    const error = new BadRequestError()
    expect(error.statusCode).toBe(400)
    expect(error.code).toBe('BAD_REQUEST')
    expect(error.message).toBe('Requête invalide')
  })

  it('accepts custom message', () => {
    const error = new BadRequestError('Invalid input')
    expect(error.message).toBe('Invalid input')
  })

  it('accepts custom code', () => {
    const error = new BadRequestError('Test', 'CUSTOM_CODE')
    expect(error.code).toBe('CUSTOM_CODE')
  })
})

describe('UnauthorizedError', () => {
  it('creates error with status 401', () => {
    const error = new UnauthorizedError()
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Non authentifié')
  })

  it('accepts custom message', () => {
    const error = new UnauthorizedError('Token expired')
    expect(error.message).toBe('Token expired')
  })
})

describe('ForbiddenError', () => {
  it('creates error with status 403', () => {
    const error = new ForbiddenError()
    expect(error.statusCode).toBe(403)
    expect(error.code).toBe('FORBIDDEN')
    expect(error.message).toBe('Accès interdit')
  })

  it('accepts custom message', () => {
    const error = new ForbiddenError('Insufficient permissions')
    expect(error.message).toBe('Insufficient permissions')
  })
})

describe('NotFoundError', () => {
  it('creates error with status 404', () => {
    const error = new NotFoundError()
    expect(error.statusCode).toBe(404)
    expect(error.code).toBe('NOT_FOUND')
    expect(error.message).toBe('Ressource non trouvée')
  })

  it('accepts custom message', () => {
    const error = new NotFoundError('User not found')
    expect(error.message).toBe('User not found')
  })
})

describe('ConflictError', () => {
  it('creates error with status 409', () => {
    const error = new ConflictError()
    expect(error.statusCode).toBe(409)
    expect(error.code).toBe('CONFLICT')
    expect(error.message).toBe('Conflit de ressources')
  })

  it('accepts custom message', () => {
    const error = new ConflictError('Resource already exists')
    expect(error.message).toBe('Resource already exists')
  })
})

describe('ValidationError', () => {
  it('creates error with status 422', () => {
    const error = new ValidationError()
    expect(error.statusCode).toBe(422)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toBe('Données invalides')
    expect(error.errors).toEqual([])
  })

  it('accepts validation errors array', () => {
    const errors = [
      { field: 'email', message: 'Invalid email' },
      { field: 'name', message: 'Required' },
    ]
    const error = new ValidationError('Validation failed', errors)
    expect(error.errors).toEqual(errors)
  })

  it('accepts custom code', () => {
    const error = new ValidationError('Test', [], 'SCHEMA_ERROR')
    expect(error.code).toBe('SCHEMA_ERROR')
  })
})

describe('TooManyRequestsError', () => {
  it('creates error with status 429', () => {
    const error = new TooManyRequestsError()
    expect(error.statusCode).toBe(429)
    expect(error.code).toBe('TOO_MANY_REQUESTS')
    expect(error.message).toBe('Trop de requêtes')
  })

  it('accepts custom message', () => {
    const error = new TooManyRequestsError('Rate limit exceeded')
    expect(error.message).toBe('Rate limit exceeded')
  })
})

describe('InternalError', () => {
  it('creates error with status 500', () => {
    const error = new InternalError()
    expect(error.statusCode).toBe(500)
    expect(error.code).toBe('INTERNAL_ERROR')
    expect(error.message).toBe('Erreur interne du serveur')
  })

  it('accepts custom message', () => {
    const error = new InternalError('Something went wrong')
    expect(error.message).toBe('Something went wrong')
  })
})

describe('DatabaseError', () => {
  it('creates error with status 500', () => {
    const error = new DatabaseError()
    expect(error.statusCode).toBe(500)
    expect(error.code).toBe('DATABASE_ERROR')
    expect(error.message).toBe('Erreur de base de données')
  })

  it('accepts custom message', () => {
    const error = new DatabaseError('Connection failed')
    expect(error.message).toBe('Connection failed')
  })
})

describe('Error inheritance', () => {
  it('all errors inherit from AppError', () => {
    expect(new BadRequestError()).toBeInstanceOf(AppError)
    expect(new UnauthorizedError()).toBeInstanceOf(AppError)
    expect(new ForbiddenError()).toBeInstanceOf(AppError)
    expect(new NotFoundError()).toBeInstanceOf(AppError)
    expect(new ConflictError()).toBeInstanceOf(AppError)
    expect(new ValidationError()).toBeInstanceOf(AppError)
    expect(new TooManyRequestsError()).toBeInstanceOf(AppError)
    expect(new InternalError()).toBeInstanceOf(AppError)
    expect(new DatabaseError()).toBeInstanceOf(AppError)
  })

  it('all errors inherit from Error', () => {
    expect(new BadRequestError()).toBeInstanceOf(Error)
    expect(new NotFoundError()).toBeInstanceOf(Error)
    expect(new ValidationError()).toBeInstanceOf(Error)
  })

  it('all errors are operational', () => {
    expect(new BadRequestError().isOperational).toBe(true)
    expect(new NotFoundError().isOperational).toBe(true)
    expect(new InternalError().isOperational).toBe(true)
  })
})
