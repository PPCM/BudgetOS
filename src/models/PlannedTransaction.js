import knex from '../database/connection.js';
import dateHelpers from '../database/dateHelpers.js';
import { generateId, formatDateISO } from '../utils/helpers.js';
import { NotFoundError } from '../utils/errors.js';
import { addDays, addWeeks, addMonths, addYears, setDate, setDay } from 'date-fns';
import Transaction from './Transaction.js';
import { buildUpdates, paginationMeta } from '../utils/modelHelpers.js';

export class PlannedTransaction {
  static async create(userId, data) {
    const id = generateId();
    const nextOccurrence = PlannedTransaction.calculateNextOccurrence(data);

    await knex('planned_transactions').insert({
      id,
      user_id: userId,
      account_id: data.accountId,
      category_id: data.categoryId || null,
      payee_id: data.payeeId || null,
      credit_card_id: data.creditCardId || null,
      to_account_id: data.toAccountId || null,
      amount: data.amount,
      description: data.description,
      notes: data.notes || null,
      type: data.type,
      frequency: data.frequency,
      start_date: data.startDate,
      end_date: data.endDate || null,
      next_occurrence: nextOccurrence,
      auto_create: true,
      execute_before_holiday: !!data.executeBeforeHoliday,
      delete_on_end: !!data.deleteOnEnd,
      days_before_create: data.daysBeforeCreate || 0,
      max_occurrences: data.maxOccurrences || null,
      tags: data.tags ? JSON.stringify(data.tags) : null,
    });

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

    // Check if the next occurrence exceeds the end date
    if (endDate && next > endDate) {
      return null;
    }

    return formatDateISO(next);
  }

  static async findById(id, userId) {
    const pt = await knex('planned_transactions as pt')
      .leftJoin('categories as c', 'pt.category_id', 'c.id')
      .leftJoin('accounts as a', 'pt.account_id', 'a.id')
      .leftJoin('accounts as ta', 'pt.to_account_id', 'ta.id')
      .leftJoin('payees as p', 'pt.payee_id', 'p.id')
      .select(
        'pt.*',
        'c.name as category_name',
        'c.icon as category_icon',
        'c.color as category_color',
        'a.name as account_name',
        'ta.name as to_account_name',
        'p.name as payee_name',
        'p.image_url as payee_image_url'
      )
      .where('pt.id', id)
      .andWhere('pt.user_id', userId)
      .first();

    return pt ? PlannedTransaction.format(pt) : null;
  }

  static async findByIdOrFail(id, userId) {
    const pt = await PlannedTransaction.findById(id, userId);
    if (!pt) throw new NotFoundError('Planned transaction not found', 'PLANNED_NOT_FOUND');
    return pt;
  }

  static async findByUser(userId, options = {}) {
    const { accountId, type, frequency, isActive = true, page = 1, limit = 50 } = options;

    const baseQuery = knex('planned_transactions as pt')
      .leftJoin('categories as c', 'pt.category_id', 'c.id')
      .leftJoin('accounts as a', 'pt.account_id', 'a.id')
      .leftJoin('accounts as ta', 'pt.to_account_id', 'ta.id')
      .leftJoin('payees as p', 'pt.payee_id', 'p.id')
      .where('pt.user_id', userId);

    if (accountId) baseQuery.andWhere('pt.account_id', accountId);
    if (type) baseQuery.andWhere('pt.type', type);
    if (frequency) baseQuery.andWhere('pt.frequency', frequency);
    if (isActive !== undefined) baseQuery.andWhere('pt.is_active', !!isActive);

    const countResult = await baseQuery.clone().count('* as count').first();
    const total = countResult?.count || 0;

    const rows = await baseQuery.clone()
      .select(
        'pt.*',
        'c.name as category_name',
        'c.icon as category_icon',
        'c.color as category_color',
        'a.name as account_name',
        'ta.name as to_account_name',
        'p.name as payee_name',
        'p.image_url as payee_image_url'
      )
      .orderBy('pt.next_occurrence', 'asc')
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      data: rows.map(PlannedTransaction.format),
      pagination: paginationMeta(page, limit, total),
    };
  }

  static async getUpcoming(userId, days = 30) {
    const planned = await knex('planned_transactions as pt')
      .leftJoin('categories as c', 'pt.category_id', 'c.id')
      .leftJoin('accounts as a', 'pt.account_id', 'a.id')
      .leftJoin('accounts as ta', 'pt.to_account_id', 'ta.id')
      .leftJoin('payees as p', 'pt.payee_id', 'p.id')
      .select(
        'pt.*',
        'c.name as category_name',
        'a.name as account_name',
        'ta.name as to_account_name',
        'p.name as payee_name',
        'p.image_url as payee_image_url'
      )
      .where('pt.user_id', userId)
      .andWhere('pt.is_active', true)
      .andWhereRaw(dateHelpers.dateWithinNextDays(knex, 'pt.next_occurrence', days).toString())
      .orderBy('pt.next_occurrence', 'asc');

    return planned.map(PlannedTransaction.format);
  }

  static async createOccurrence(id, userId, date, amount = null) {
    const pt = await PlannedTransaction.findByIdOrFail(id, userId);
    const tx = await Transaction.create(userId, {
      accountId: pt.accountId, categoryId: pt.categoryId, payeeId: pt.payeeId,
      creditCardId: pt.creditCardId, amount: amount || pt.amount, description: pt.description,
      notes: pt.notes, date, type: pt.type, isRecurring: true, recurringId: id, toAccountId: pt.toAccountId,
    });

    await knex('planned_transactions')
      .where('id', id)
      .update({
        last_created_at: date,
        occurrences_created: knex.raw('occurrences_created + 1'),
        next_occurrence: PlannedTransaction.calculateNextOccurrence(pt),
      });

    return tx;
  }

  static async update(id, userId, data) {
    const existing = await PlannedTransaction.findByIdOrFail(id, userId);
    const fields = [
      'account_id', 'category_id', 'payee_id', 'credit_card_id', 'to_account_id', 'amount',
      'description', 'notes', 'type', 'frequency', 'start_date', 'end_date',
      'execute_before_holiday', 'delete_on_end', 'days_before_create', 'is_active', 'max_occurrences', 'tags',
    ];
    const updates = buildUpdates(data, fields, { jsonFields: ['tags'] });

    // Recalculate next_occurrence if startDate, endDate or frequency changed
    if (data.startDate || data.endDate !== undefined || data.frequency) {
      const updatedData = {
        startDate: data.startDate || existing.startDate,
        endDate: data.endDate !== undefined ? data.endDate : existing.endDate,
        frequency: data.frequency || existing.frequency,
      };
      updates.next_occurrence = PlannedTransaction.calculateNextOccurrence(updatedData);
    }

    if (Object.keys(updates).length > 0) {
      await knex('planned_transactions')
        .where({ id, user_id: userId })
        .update(updates);
    }

    return PlannedTransaction.findById(id, userId);
  }

  static async delete(id, userId) {
    await PlannedTransaction.findByIdOrFail(id, userId);
    await knex('planned_transactions')
      .where({ id, user_id: userId })
      .del();
    return { deleted: true };
  }

  static format(pt) {
    return {
      id: pt.id, userId: pt.user_id, accountId: pt.account_id, accountName: pt.account_name,
      categoryId: pt.category_id, categoryName: pt.category_name, categoryIcon: pt.category_icon, categoryColor: pt.category_color,
      payeeId: pt.payee_id, payeeName: pt.payee_name, payeeImageUrl: pt.payee_image_url,
      creditCardId: pt.credit_card_id, toAccountId: pt.to_account_id, toAccountName: pt.to_account_name,
      amount: Number(pt.amount), description: pt.description, notes: pt.notes, type: pt.type,
      frequency: pt.frequency, startDate: pt.start_date, endDate: pt.end_date, nextOccurrence: pt.next_occurrence,
      autoCreate: Boolean(pt.auto_create), executeBeforeHoliday: Boolean(pt.execute_before_holiday),
      deleteOnEnd: Boolean(pt.delete_on_end), daysBeforeCreate: pt.days_before_create, isActive: Boolean(pt.is_active),
      lastCreatedAt: pt.last_created_at, occurrencesCreated: pt.occurrences_created,
      maxOccurrences: pt.max_occurrences, tags: pt.tags ? JSON.parse(pt.tags) : [],
      createdAt: pt.created_at, updatedAt: pt.updated_at,
    };
  }
}

export default PlannedTransaction;
