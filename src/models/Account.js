import knex from '../database/connection.js';
import { generateId, roundAmount } from '../utils/helpers.js';
import { NotFoundError } from '../utils/errors.js';
import dateHelpers from '../database/dateHelpers.js';
import { buildUpdates } from '../utils/modelHelpers.js';

/**
 * Account model
 */
export class Account {
  /**
   * Create a new account
   */
  static async create(userId, data) {
    const id = generateId();

    await knex('accounts').insert({
      id, user_id: userId, name: data.name, type: data.type,
      institution: data.institution || null, account_number: data.accountNumber || null,
      initial_balance: data.initialBalance || 0, current_balance: data.initialBalance || 0,
      currency: data.currency || 'EUR', color: data.color || '#3B82F6',
      icon: data.icon || 'wallet',
      is_included_in_total: data.isIncludedInTotal !== false,
      notes: data.notes || null, sort_order: data.sortOrder || 0,
    });

    return Account.findById(id, userId);
  }

  /**
   * Find account by ID
   */
  static async findById(id, userId) {
    const account = await knex('accounts')
      .where({ id, user_id: userId, is_active: true })
      .first();

    return account ? Account.format(account) : null;
  }

  /**
   * Find account by ID or throw
   */
  static async findByIdOrFail(id, userId) {
    const account = await Account.findById(id, userId);
    if (!account) throw new NotFoundError('Compte non trouvé');
    return account;
  }

  /**
   * List user accounts
   */
  static async findByUser(userId, options = {}) {
    const { type, isActive = true, includeBalance = true } = options;

    let query = knex('accounts').where('user_id', userId);
    if (type) query = query.where('type', type);
    if (isActive !== undefined) query = query.where('is_active', isActive);

    const accounts = await query.orderBy('sort_order', 'asc').orderBy('name', 'asc');

    let totals = null;
    if (includeBalance) {
      totals = await Account.calculateTotals(userId);
    }

    return { data: accounts.map(Account.format), totals };
  }

  /**
   * Calculate account totals
   */
  static async calculateTotals(userId) {
    const result = await knex('accounts')
      .where({ user_id: userId, is_active: true })
      .select(
        knex.raw('SUM(CASE WHEN is_included_in_total = true THEN current_balance ELSE 0 END) as total_balance'),
        knex.raw("SUM(CASE WHEN type IN ('checking', 'savings', 'cash') AND is_included_in_total = true THEN current_balance ELSE 0 END) as available_balance"),
        knex.raw("SUM(CASE WHEN type = 'investment' AND is_included_in_total = true THEN current_balance ELSE 0 END) as investment_balance"),
        knex.raw('COUNT(*) as account_count'),
      )
      .first();

    return {
      totalBalance: roundAmount(result?.total_balance || 0),
      availableBalance: roundAmount(result?.available_balance || 0),
      investmentBalance: roundAmount(result?.investment_balance || 0),
      accountCount: Number(result?.account_count || 0),
    };
  }

  /**
   * Update account
   */
  static async update(id, userId, data) {
    await Account.findByIdOrFail(id, userId);

    const allowedFields = [
      'name', 'type', 'institution', 'account_number', 'currency',
      'color', 'icon', 'is_included_in_total', 'notes', 'sort_order',
    ];

    const updates = buildUpdates(data, allowedFields);

    if (Object.keys(updates).length > 0) {
      await knex('accounts').where({ id, user_id: userId }).update(updates);
    }

    return Account.findById(id, userId);
  }

  /**
   * Recalculate account balance from transactions
   */
  static async updateBalance(id, userId, trx = null) {
    const db = trx || knex;
    const account = await db('accounts')
      .where({ id, user_id: userId, is_active: true })
      .first();

    if (!account) return 0;

    const result = await db('transactions')
      .where({ account_id: id, user_id: userId })
      .whereNot('status', 'void')
      .sum('amount as transactions_sum')
      .first();

    const newBalance = roundAmount(Number(account.initial_balance) + Number(result?.transactions_sum || 0));
    await db('accounts').where('id', id).update({ current_balance: newBalance });

    return newBalance;
  }

  /**
   * Recalculate all balances for a user
   */
  static async recalculateAllBalances(userId) {
    const accounts = await knex('accounts')
      .where({ user_id: userId, is_active: true })
      .select('id');

    for (const account of accounts) {
      await Account.updateBalance(account.id, userId);
    }
  }

  /**
   * Delete account (soft delete if has transactions)
   */
  static async delete(id, userId) {
    await Account.findByIdOrFail(id, userId);

    const txCount = await knex('transactions').where('account_id', id).count('* as count').first();
    const count = txCount?.count || 0;

    if (count > 0) {
      await knex('accounts').where({ id, user_id: userId }).update({ is_active: false });
    } else {
      await knex('accounts').where({ id, user_id: userId }).del();
    }

    return { deleted: true, softDelete: count > 0 };
  }

  /**
   * Get account statistics
   */
  static async getStats(id, userId, period = 'month') {
    await Account.findByIdOrFail(id, userId);

    let query = knex('transactions')
      .where({ account_id: id, user_id: userId })
      .whereNot('status', 'void');

    switch (period) {
      case 'week':
        query = query.whereRaw(dateHelpers.dateWithinLastDays(knex, 'date', 7).toString());
        break;
      case 'month':
        query = query.whereRaw(`date >= ${dateHelpers.startOfMonth(knex).toString()}`);
        break;
      case 'year':
        query = query.whereRaw(`date >= ${dateHelpers.startOfYear(knex).toString()}`);
        break;
    }

    const stats = await query.select(
      knex.raw('COUNT(*) as transaction_count'),
      knex.raw('SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income'),
      knex.raw('SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_expenses'),
      knex.raw('AVG(amount) as average_transaction'),
    ).first();

    return {
      transactionCount: Number(stats?.transaction_count || 0),
      totalIncome: roundAmount(stats?.total_income || 0),
      totalExpenses: roundAmount(stats?.total_expenses || 0),
      netFlow: roundAmount(Number(stats?.total_income || 0) - Number(stats?.total_expenses || 0)),
      averageTransaction: roundAmount(stats?.average_transaction || 0),
    };
  }

  /**
   * Format account for API response
   */
  static format(account) {
    return {
      id: account.id,
      userId: account.user_id,
      name: account.name,
      type: account.type,
      institution: account.institution,
      accountNumber: account.account_number,
      initialBalance: Number(account.initial_balance),
      currentBalance: Number(account.current_balance),
      currency: account.currency,
      color: account.color,
      icon: account.icon,
      isActive: Boolean(account.is_active),
      isIncludedInTotal: Boolean(account.is_included_in_total),
      notes: account.notes,
      sortOrder: account.sort_order,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    };
  }
}

export default Account;
