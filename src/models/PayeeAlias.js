import knex from '../database/connection.js';
import { generateId } from '../utils/helpers.js';

/**
 * PayeeAlias model
 * Maps bank description patterns to user payees for automatic matching during imports.
 */
class PayeeAlias {
  /**
   * Create a new alias
   * @param {string} userId
   * @param {Object} data - { payeeId, bankDescription, normalizedPattern, source }
   * @returns {Promise<Object>} Created alias
   */
  static async create(userId, data) {
    const id = generateId();

    await knex('payee_aliases').insert({
      id,
      user_id: userId,
      payee_id: data.payeeId,
      bank_description: data.bankDescription,
      normalized_pattern: data.normalizedPattern,
      source: data.source || 'import_learn',
      times_matched: 1,
      last_matched_at: knex.fn.now(),
    });

    return PayeeAlias.findById(id, userId);
  }

  /**
   * Find an alias by ID
   */
  static async findById(id, userId) {
    const alias = await knex('payee_aliases as pa')
      .leftJoin('payees as p', 'pa.payee_id', 'p.id')
      .select('pa.*', 'p.name as payee_name')
      .where({ 'pa.id': id, 'pa.user_id': userId })
      .first();

    return alias ? PayeeAlias.format(alias) : null;
  }

  /**
   * Find an alias by exact normalized pattern
   * @param {string} userId
   * @param {string} normalizedPattern
   * @returns {Promise<Object|null>}
   */
  static async findByPattern(userId, normalizedPattern) {
    const alias = await knex('payee_aliases as pa')
      .leftJoin('payees as p', 'pa.payee_id', 'p.id')
      .select('pa.*', 'p.name as payee_name')
      .where({ 'pa.user_id': userId, 'pa.normalized_pattern': normalizedPattern })
      .first();

    return alias ? PayeeAlias.format(alias) : null;
  }

  /**
   * Find the best matching alias for a merchant pattern.
   * Priority: exact match > substring inclusion > sorted by times_matched DESC.
   * @param {string} userId
   * @param {string} merchantPattern - Normalized merchant pattern to match
   * @returns {Promise<Object|null>} Best matching alias with payee info, or null
   */
  static async findBestMatch(userId, merchantPattern) {
    if (!merchantPattern) return null;

    // 1. Try exact match first
    const exact = await knex('payee_aliases as pa')
      .leftJoin('payees as p', 'pa.payee_id', 'p.id')
      .select('pa.*', 'p.name as payee_name')
      .where({ 'pa.user_id': userId, 'pa.normalized_pattern': merchantPattern })
      .first();

    if (exact) return PayeeAlias.format(exact);

    // 2. Substring matching: pattern contained in merchantPattern or vice versa
    const allAliases = await knex('payee_aliases as pa')
      .leftJoin('payees as p', 'pa.payee_id', 'p.id')
      .select('pa.*', 'p.name as payee_name')
      .where('pa.user_id', userId)
      .orderBy('pa.times_matched', 'desc');

    for (const alias of allAliases) {
      const pattern = alias.normalized_pattern;
      if (merchantPattern.includes(pattern) || pattern.includes(merchantPattern)) {
        return PayeeAlias.format(alias);
      }
    }

    return null;
  }

  /**
   * List all aliases for a payee
   * @param {string} payeeId
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  static async findByPayee(payeeId, userId) {
    const aliases = await knex('payee_aliases as pa')
      .leftJoin('payees as p', 'pa.payee_id', 'p.id')
      .select('pa.*', 'p.name as payee_name')
      .where({ 'pa.payee_id': payeeId, 'pa.user_id': userId })
      .orderBy('pa.times_matched', 'desc');

    return aliases.map(PayeeAlias.format);
  }

  /**
   * Learn (upsert) an alias: create if new, increment times_matched if exists.
   * @param {string} userId
   * @param {string} payeeId
   * @param {string} bankDescription - Raw bank description
   * @param {string} normalizedPattern - Cleaned pattern
   * @returns {Promise<Object>} The alias record
   */
  static async learnAlias(userId, payeeId, bankDescription, normalizedPattern) {
    if (!normalizedPattern) return null;

    const existing = await knex('payee_aliases')
      .where({ user_id: userId, normalized_pattern: normalizedPattern })
      .first();

    if (existing) {
      // Update the existing alias: increment counter, update payee if different
      await knex('payee_aliases')
        .where({ id: existing.id })
        .update({
          payee_id: payeeId,
          times_matched: existing.times_matched + 1,
          last_matched_at: knex.fn.now(),
        });
      return PayeeAlias.findById(existing.id, userId);
    }

    return PayeeAlias.create(userId, {
      payeeId,
      bankDescription,
      normalizedPattern,
      source: 'import_learn',
    });
  }

  /**
   * Delete an alias
   * @param {string} id
   * @param {string} userId
   * @returns {Promise<{deleted: boolean}>}
   */
  static async delete(id, userId) {
    const deleted = await knex('payee_aliases')
      .where({ id, user_id: userId })
      .del();

    return { deleted: deleted > 0 };
  }

  /**
   * Format an alias for the API
   * @param {Object} alias - Raw database row
   * @returns {Object}
   */
  static format(alias) {
    return {
      id: alias.id,
      userId: alias.user_id,
      payeeId: alias.payee_id,
      payeeName: alias.payee_name || null,
      bankDescription: alias.bank_description,
      normalizedPattern: alias.normalized_pattern,
      source: alias.source,
      timesMatched: alias.times_matched,
      lastMatchedAt: alias.last_matched_at,
      createdAt: alias.created_at,
      updatedAt: alias.updated_at,
    };
  }
}

export default PayeeAlias;
