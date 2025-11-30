import { query, transaction } from '../database/connection.js';
import { generateId, roundAmount } from '../utils/helpers.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

/**
 * Modèle Account
 */
export class Account {
  /**
   * Crée un nouveau compte
   */
  static create(userId, data) {
    const id = generateId();
    
    query.run(`
      INSERT INTO accounts (
        id, user_id, name, type, institution, account_number,
        initial_balance, current_balance, currency, color, icon,
        is_included_in_total, notes, sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, userId, data.name, data.type, data.institution || null,
      data.accountNumber || null, data.initialBalance || 0, data.initialBalance || 0,
      data.currency || 'EUR', data.color || '#3B82F6', data.icon || 'wallet',
      data.isIncludedInTotal !== false ? 1 : 0, data.notes || null,
      data.sortOrder || 0
    ]);
    
    return Account.findById(id, userId);
  }
  
  /**
   * Trouve un compte par ID
   */
  static findById(id, userId) {
    const account = query.get(`
      SELECT * FROM accounts
      WHERE id = ? AND user_id = ? AND is_active = 1
    `, [id, userId]);
    
    return account ? Account.format(account) : null;
  }
  
  /**
   * Trouve un compte par ID (vérification propriété)
   */
  static findByIdOrFail(id, userId) {
    const account = Account.findById(id, userId);
    if (!account) {
      throw new NotFoundError('Compte non trouvé');
    }
    return account;
  }
  
  /**
   * Liste les comptes d'un utilisateur
   */
  static findByUser(userId, options = {}) {
    const { type, isActive = true, includeBalance = true } = options;
    
    let sql = 'SELECT * FROM accounts WHERE user_id = ?';
    const params = [userId];
    
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    
    if (isActive !== undefined) {
      sql += ' AND is_active = ?';
      params.push(isActive ? 1 : 0);
    }
    
    sql += ' ORDER BY sort_order ASC, name ASC';
    
    const accounts = query.all(sql, params);
    
    // Calculer les totaux si demandé
    let totals = null;
    if (includeBalance) {
      totals = Account.calculateTotals(userId);
    }
    
    return {
      data: accounts.map(Account.format),
      totals,
    };
  }
  
  /**
   * Calcule les totaux des comptes
   */
  static calculateTotals(userId) {
    const result = query.get(`
      SELECT 
        SUM(CASE WHEN is_included_in_total = 1 THEN current_balance ELSE 0 END) as total_balance,
        SUM(CASE WHEN type IN ('checking', 'savings', 'cash') AND is_included_in_total = 1 THEN current_balance ELSE 0 END) as available_balance,
        SUM(CASE WHEN type = 'investment' AND is_included_in_total = 1 THEN current_balance ELSE 0 END) as investment_balance,
        COUNT(*) as account_count
      FROM accounts
      WHERE user_id = ? AND is_active = 1
    `, [userId]);
    
    return {
      totalBalance: roundAmount(result?.total_balance || 0),
      availableBalance: roundAmount(result?.available_balance || 0),
      investmentBalance: roundAmount(result?.investment_balance || 0),
      accountCount: result?.account_count || 0,
    };
  }
  
  /**
   * Met à jour un compte
   */
  static update(id, userId, data) {
    const account = Account.findByIdOrFail(id, userId);
    
    const allowedFields = [
      'name', 'type', 'institution', 'account_number', 'currency',
      'color', 'icon', 'is_included_in_total', 'notes', 'sort_order'
    ];
    
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        updates.push(`${dbKey} = ?`);
        values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    }
    
    if (updates.length > 0) {
      values.push(id, userId);
      query.run(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    }
    
    return Account.findById(id, userId);
  }
  
  /**
   * Met à jour le solde du compte
   */
  static updateBalance(id, userId) {
    const account = Account.findByIdOrFail(id, userId);
    
    // Calculer le solde à partir des transactions
    const result = query.get(`
      SELECT COALESCE(SUM(amount), 0) as transactions_sum
      FROM transactions
      WHERE account_id = ? AND user_id = ? AND status != 'void'
    `, [id, userId]);
    
    const newBalance = roundAmount(account.initialBalance + (result?.transactions_sum || 0));
    
    query.run('UPDATE accounts SET current_balance = ? WHERE id = ?', [newBalance, id]);
    
    return newBalance;
  }
  
  /**
   * Recalcule tous les soldes d'un utilisateur
   */
  static recalculateAllBalances(userId) {
    const accounts = query.all('SELECT id FROM accounts WHERE user_id = ? AND is_active = 1', [userId]);
    
    for (const account of accounts) {
      Account.updateBalance(account.id, userId);
    }
  }
  
  /**
   * Supprime un compte (soft delete)
   */
  static delete(id, userId) {
    Account.findByIdOrFail(id, userId);
    
    // Vérifier s'il y a des transactions
    const txCount = query.get(`
      SELECT COUNT(*) as count FROM transactions WHERE account_id = ?
    `, [id])?.count || 0;
    
    if (txCount > 0) {
      // Soft delete - désactiver le compte
      query.run('UPDATE accounts SET is_active = 0 WHERE id = ? AND user_id = ?', [id, userId]);
    } else {
      // Hard delete si pas de transactions
      query.run('DELETE FROM accounts WHERE id = ? AND user_id = ?', [id, userId]);
    }
    
    return { deleted: true, softDelete: txCount > 0 };
  }
  
  /**
   * Obtient les statistiques d'un compte
   */
  static getStats(id, userId, period = 'month') {
    Account.findByIdOrFail(id, userId);
    
    let dateFilter;
    switch (period) {
      case 'week':
        dateFilter = "date >= date('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "date >= date('now', 'start of month')";
        break;
      case 'year':
        dateFilter = "date >= date('now', 'start of year')";
        break;
      default:
        dateFilter = '1=1';
    }
    
    const stats = query.get(`
      SELECT
        COUNT(*) as transaction_count,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_expenses,
        AVG(amount) as average_transaction
      FROM transactions
      WHERE account_id = ? AND user_id = ? AND status != 'void' AND ${dateFilter}
    `, [id, userId]);
    
    return {
      transactionCount: stats?.transaction_count || 0,
      totalIncome: roundAmount(stats?.total_income || 0),
      totalExpenses: roundAmount(stats?.total_expenses || 0),
      netFlow: roundAmount((stats?.total_income || 0) - (stats?.total_expenses || 0)),
      averageTransaction: roundAmount(stats?.average_transaction || 0),
    };
  }
  
  /**
   * Formate un compte pour l'API
   */
  static format(account) {
    return {
      id: account.id,
      userId: account.user_id,
      name: account.name,
      type: account.type,
      institution: account.institution,
      accountNumber: account.account_number,
      initialBalance: account.initial_balance,
      currentBalance: account.current_balance,
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
