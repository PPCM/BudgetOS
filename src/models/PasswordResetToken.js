import crypto from 'crypto';
import knex from '../database/connection.js';
import { generateId } from '../utils/helpers.js';

/**
 * PasswordResetToken model for managing password reset tokens
 */
export class PasswordResetToken {
  /**
   * Create a new password reset token, invalidating any previous tokens for the user
   * @param {string} userId - User ID
   * @param {string} tokenHash - SHA-256 hash of the token
   * @param {Date} expiresAt - Expiration date
   * @returns {Promise<Object>} Created token record
   */
  static async create(userId, tokenHash, expiresAt) {
    // Invalidate all previous tokens for this user
    await knex('password_reset_tokens')
      .where('user_id', userId)
      .whereNull('used_at')
      .update({ used_at: knex.fn.now() });

    const id = generateId();
    await knex('password_reset_tokens').insert({
      id,
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    return { id, userId, tokenHash, expiresAt };
  }

  /**
   * Find a valid (non-used, non-expired) token by its hash
   * @param {string} hash - SHA-256 hash of the token
   * @returns {Promise<Object|null>} Token record or null
   */
  static async findByTokenHash(hash) {
    const token = await knex('password_reset_tokens')
      .where('token_hash', hash)
      .whereNull('used_at')
      .where('expires_at', '>', knex.fn.now())
      .first();

    return token ? PasswordResetToken.format(token) : null;
  }

  /**
   * Mark a token as used
   * @param {string} id - Token ID
   */
  static async markUsed(id) {
    await knex('password_reset_tokens')
      .where('id', id)
      .update({ used_at: knex.fn.now() });
  }

  /**
   * Delete expired tokens (cleanup)
   * @returns {Promise<number>} Number of deleted tokens
   */
  static async deleteExpired() {
    return knex('password_reset_tokens')
      .where('expires_at', '<', knex.fn.now())
      .del();
  }

  /**
   * Generate a secure random token and its hash
   * @returns {{ token: string, hash: string }}
   */
  static generateToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  /**
   * Hash a token string using SHA-256
   * @param {string} token - Raw token
   * @returns {string} SHA-256 hex hash
   */
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Format token for API response
   * @param {Object} raw - Raw DB row
   * @returns {Object}
   */
  static format(raw) {
    return {
      id: raw.id,
      userId: raw.user_id,
      tokenHash: raw.token_hash,
      expiresAt: raw.expires_at,
      usedAt: raw.used_at,
      createdAt: raw.created_at,
    };
  }
}

export default PasswordResetToken;
