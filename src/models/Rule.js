import knex from '../database/connection.js';
import { generateId } from '../utils/helpers.js';
import { NotFoundError } from '../utils/errors.js';
import dateHelpers from '../database/dateHelpers.js';
import { buildUpdates } from '../utils/modelHelpers.js';

export class Rule {
  static async create(userId, data) {
    const id = generateId();
    await knex('rules').insert({
      id, user_id: userId, name: data.name, priority: data.priority || 0,
      is_active: data.isActive !== false,
      conditions: JSON.stringify(data.conditions),
      action_category_id: data.actionCategoryId || null,
      action_tags: data.actionTags ? JSON.stringify(data.actionTags) : null,
      action_notes: data.actionNotes || null,
    });
    return Rule.findById(id, userId);
  }

  static async findById(id, userId) {
    const rule = await knex('rules').where({ id, user_id: userId }).first();
    return rule ? Rule.format(rule) : null;
  }

  static async findByIdOrFail(id, userId) {
    const rule = await Rule.findById(id, userId);
    if (!rule) throw new NotFoundError('Règle non trouvée');
    return rule;
  }

  static async findByUser(userId, options = {}) {
    const { isActive, sortBy = 'priority', sortOrder = 'desc' } = options;
    let query = knex('rules').where('user_id', userId);
    if (isActive !== undefined) query = query.where('is_active', isActive);
    const sortFields = { name: 'name', priority: 'priority', times_applied: 'times_applied', created_at: 'created_at' };
    const rules = await query.orderBy(sortFields[sortBy] || 'priority', sortOrder === 'asc' ? 'asc' : 'desc');
    return rules.map(Rule.format);
  }

  static async matchTransaction(userId, transaction) {
    const rules = await Rule.findByUser(userId, { isActive: true });
    for (const rule of rules) {
      if (Rule.evaluateConditions(rule.conditions, transaction)) {
        return rule;
      }
    }
    return null;
  }

  static evaluateConditions(conditions, tx) {
    for (const cond of conditions) {
      const value = tx[cond.field];
      const target = cond.caseSensitive ? cond.value : (typeof cond.value === 'string' ? cond.value.toLowerCase() : cond.value);
      const actual = cond.caseSensitive ? value : (typeof value === 'string' ? value.toLowerCase() : value);

      let match = false;
      switch (cond.operator) {
        case 'equals': match = actual === target; break;
        case 'not_equals': match = actual !== target; break;
        case 'contains': match = String(actual).includes(target); break;
        case 'not_contains': match = !String(actual).includes(target); break;
        case 'starts_with': match = String(actual).startsWith(target); break;
        case 'ends_with': match = String(actual).endsWith(target); break;
        case 'greater_than': match = Number(actual) > Number(target); break;
        case 'less_than': match = Number(actual) < Number(target); break;
        case 'between': match = Number(actual) >= target[0] && Number(actual) <= target[1]; break;
        case 'regex': match = new RegExp(target, cond.caseSensitive ? '' : 'i').test(actual); break;
      }
      if (!match) return false;
    }
    return true;
  }

  static async applyRule(userId, transactionId, ruleId) {
    const rule = await Rule.findByIdOrFail(ruleId, userId);
    const updates = {};

    if (rule.actionCategoryId) updates.category_id = rule.actionCategoryId;
    if (rule.actionTags?.length) updates.tags = JSON.stringify(rule.actionTags);
    if (rule.actionNotes) {
      // Append note: use Knex raw for cross-database concatenation
      await knex('transactions')
        .where({ id: transactionId, user_id: userId })
        .update({
          ...updates,
          notes: knex.raw(`${dateHelpers.concat(knex, dateHelpers.coalesceEmpty(knex, 'notes').toString(), '?').toString()}`, ['\n' + rule.actionNotes]),
        });
    } else if (Object.keys(updates).length > 0) {
      await knex('transactions').where({ id: transactionId, user_id: userId }).update(updates);
    }

    await knex('rules').where('id', ruleId).update({
      times_applied: knex.raw('times_applied + 1'),
      last_applied_at: knex.fn.now(),
    });
    return true;
  }

  static async update(id, userId, data) {
    await Rule.findByIdOrFail(id, userId);
    const fields = ['name', 'priority', 'is_active', 'conditions', 'action_category_id', 'action_tags', 'action_notes'];
    const updates = buildUpdates(data, fields, { jsonFields: ['conditions', 'action_tags'] });

    if (Object.keys(updates).length > 0) {
      await knex('rules').where({ id, user_id: userId }).update(updates);
    }
    return Rule.findById(id, userId);
  }

  static async delete(id, userId) {
    await Rule.findByIdOrFail(id, userId);
    await knex('rules').where({ id, user_id: userId }).del();
    return { deleted: true };
  }

  static format(rule) {
    return {
      id: rule.id, userId: rule.user_id, name: rule.name, priority: rule.priority,
      isActive: Boolean(rule.is_active), conditions: JSON.parse(rule.conditions),
      actionCategoryId: rule.action_category_id,
      actionTags: rule.action_tags ? JSON.parse(rule.action_tags) : [],
      actionNotes: rule.action_notes, timesApplied: rule.times_applied,
      lastAppliedAt: rule.last_applied_at, createdAt: rule.created_at, updatedAt: rule.updated_at,
    };
  }
}

export default Rule;
