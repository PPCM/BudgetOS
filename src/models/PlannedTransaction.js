import { query, transaction as dbTransaction } from '../database/connection.js';
import { generateId, formatDateISO } from '../utils/helpers.js';
import { NotFoundError } from '../utils/errors.js';
import { addDays, addWeeks, addMonths, addYears, setDate, setDay } from 'date-fns';
import Transaction from './Transaction.js';

export class PlannedTransaction {
  static create(userId, data) {
    const id = generateId();
    const nextOccurrence = PlannedTransaction.calculateNextOccurrence(data);
    
    query.run(`
      INSERT INTO planned_transactions (
        id, user_id, account_id, category_id, payee_id, credit_card_id, to_account_id,
        amount, description, notes, type, frequency, start_date, end_date,
        next_occurrence, auto_create, execute_before_holiday, days_before_create,
        max_occurrences, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, userId, data.accountId, data.categoryId || null, data.payeeId || null,
      data.creditCardId || null, data.toAccountId || null, data.amount, data.description,
      data.notes || null, data.type, data.frequency, data.startDate, data.endDate || null,
      nextOccurrence, 1, data.executeBeforeHoliday ? 1 : 0,
      data.daysBeforeCreate || 0, data.maxOccurrences || null,
      data.tags ? JSON.stringify(data.tags) : null
    ]);
    return PlannedTransaction.findById(id, userId);
  }

  static calculateNextOccurrence(data) {
    const start = new Date(data.startDate);
    const today = new Date();
    const endDate = data.endDate ? new Date(data.endDate) : null;
    let next = start;

    if (start <= today) {
      const freq = data.frequency;
      while (next <= today) {
        switch (freq) {
          case 'once': return null;
          case 'daily': next = addDays(next, 1); break;
          case 'weekly': next = addWeeks(next, 1); break;
          case 'biweekly': next = addWeeks(next, 2); break;
          case 'monthly': next = addMonths(next, 1); break;
          case 'bimonthly': next = addMonths(next, 2); break;
          case 'quarterly': next = addMonths(next, 3); break;
          case 'semiannual': next = addMonths(next, 6); break;
          case 'annual': next = addYears(next, 1); break;
        }
      }
    }
    
    // Vérifier si la prochaine occurrence dépasse la date de fin
    if (endDate && next > endDate) {
      return null;
    }
    
    return formatDateISO(next);
  }

  static findById(id, userId) {
    const pt = query.get(`
      SELECT pt.*, c.name as category_name, c.icon as category_icon, c.color as category_color, 
        a.name as account_name, ta.name as to_account_name, p.name as payee_name, p.image_url as payee_image_url
      FROM planned_transactions pt
      LEFT JOIN categories c ON pt.category_id = c.id
      LEFT JOIN accounts a ON pt.account_id = a.id
      LEFT JOIN accounts ta ON pt.to_account_id = ta.id
      LEFT JOIN payees p ON pt.payee_id = p.id
      WHERE pt.id = ? AND pt.user_id = ?
    `, [id, userId]);
    return pt ? PlannedTransaction.format(pt) : null;
  }

  static findByIdOrFail(id, userId) {
    const pt = PlannedTransaction.findById(id, userId);
    if (!pt) throw new NotFoundError('Transaction planifiée non trouvée');
    return pt;
  }

  static findByUser(userId, options = {}) {
    const { accountId, type, frequency, isActive = true, page = 1, limit = 50 } = options;
    let sql = `SELECT pt.*, c.name as category_name, c.icon as category_icon, c.color as category_color, 
      a.name as account_name, ta.name as to_account_name, p.name as payee_name, p.image_url as payee_image_url
      FROM planned_transactions pt
      LEFT JOIN categories c ON pt.category_id = c.id
      LEFT JOIN accounts a ON pt.account_id = a.id
      LEFT JOIN accounts ta ON pt.to_account_id = ta.id
      LEFT JOIN payees p ON pt.payee_id = p.id
      WHERE pt.user_id = ?`;
    const params = [userId];
    
    if (accountId) { sql += ' AND pt.account_id = ?'; params.push(accountId); }
    if (type) { sql += ' AND pt.type = ?'; params.push(type); }
    if (frequency) { sql += ' AND pt.frequency = ?'; params.push(frequency); }
    if (isActive !== undefined) { sql += ' AND pt.is_active = ?'; params.push(isActive ? 1 : 0); }
    
    const total = query.get(sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM'), params)?.count || 0;
    sql += ' ORDER BY pt.next_occurrence ASC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    
    return {
      data: query.all(sql, params).map(PlannedTransaction.format),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static getUpcoming(userId, days = 30) {
    const planned = query.all(`
      SELECT pt.*, c.name as category_name, a.name as account_name, ta.name as to_account_name,
        p.name as payee_name, p.image_url as payee_image_url
      FROM planned_transactions pt
      LEFT JOIN categories c ON pt.category_id = c.id
      LEFT JOIN accounts a ON pt.account_id = a.id
      LEFT JOIN accounts ta ON pt.to_account_id = ta.id
      LEFT JOIN payees p ON pt.payee_id = p.id
      WHERE pt.user_id = ? AND pt.is_active = 1
        AND pt.next_occurrence <= date('now', '+' || ? || ' days')
      ORDER BY pt.next_occurrence ASC
    `, [userId, days]);
    return planned.map(PlannedTransaction.format);
  }

  static createOccurrence(id, userId, date, amount = null) {
    const pt = PlannedTransaction.findByIdOrFail(id, userId);
    const tx = Transaction.create(userId, {
      accountId: pt.accountId, categoryId: pt.categoryId, payeeId: pt.payeeId,
      creditCardId: pt.creditCardId, amount: amount || pt.amount, description: pt.description,
      notes: pt.notes, date, type: pt.type, isRecurring: true, recurringId: id, toAccountId: pt.toAccountId
    });
    
    query.run(`UPDATE planned_transactions SET 
      last_created_at = ?, occurrences_created = occurrences_created + 1,
      next_occurrence = ? WHERE id = ?`,
      [date, PlannedTransaction.calculateNextOccurrence(pt), id]);
    
    return tx;
  }

  static update(id, userId, data) {
    const existing = PlannedTransaction.findByIdOrFail(id, userId);
    const fields = ['account_id', 'category_id', 'payee_id', 'credit_card_id', 'to_account_id', 'amount',
      'description', 'notes', 'type', 'frequency', 'start_date', 'end_date',
      'execute_before_holiday', 'days_before_create', 'is_active', 'max_occurrences', 'tags'];
    const updates = [], values = [];
    
    Object.entries(data).forEach(([key, value]) => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (fields.includes(dbKey)) {
        updates.push(`${dbKey} = ?`);
        values.push(dbKey === 'tags' ? JSON.stringify(value) : (typeof value === 'boolean' ? (value ? 1 : 0) : value));
      }
    });
    
    // Recalculer next_occurrence si startDate, endDate ou frequency ont changé
    if (data.startDate || data.endDate !== undefined || data.frequency) {
      const updatedData = {
        startDate: data.startDate || existing.startDate,
        endDate: data.endDate !== undefined ? data.endDate : existing.endDate,
        frequency: data.frequency || existing.frequency,
      };
      const newNextOccurrence = PlannedTransaction.calculateNextOccurrence(updatedData);
      updates.push('next_occurrence = ?');
      values.push(newNextOccurrence);
    }
    
    if (updates.length) {
      values.push(id, userId);
      query.run(`UPDATE planned_transactions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    }
    return PlannedTransaction.findById(id, userId);
  }

  static delete(id, userId) {
    PlannedTransaction.findByIdOrFail(id, userId);
    query.run('DELETE FROM planned_transactions WHERE id = ? AND user_id = ?', [id, userId]);
    return { deleted: true };
  }

  static format(pt) {
    return {
      id: pt.id, userId: pt.user_id, accountId: pt.account_id, accountName: pt.account_name,
      categoryId: pt.category_id, categoryName: pt.category_name, categoryIcon: pt.category_icon, categoryColor: pt.category_color,
      payeeId: pt.payee_id, payeeName: pt.payee_name, payeeImageUrl: pt.payee_image_url,
      creditCardId: pt.credit_card_id, toAccountId: pt.to_account_id, toAccountName: pt.to_account_name,
      amount: pt.amount, description: pt.description, notes: pt.notes, type: pt.type,
      frequency: pt.frequency, startDate: pt.start_date, endDate: pt.end_date, nextOccurrence: pt.next_occurrence,
      autoCreate: Boolean(pt.auto_create), executeBeforeHoliday: Boolean(pt.execute_before_holiday),
      daysBeforeCreate: pt.days_before_create, isActive: Boolean(pt.is_active),
      lastCreatedAt: pt.last_created_at, occurrencesCreated: pt.occurrences_created,
      maxOccurrences: pt.max_occurrences, tags: pt.tags ? JSON.parse(pt.tags) : [],
      createdAt: pt.created_at, updatedAt: pt.updated_at,
    };
  }
}

export default PlannedTransaction;
