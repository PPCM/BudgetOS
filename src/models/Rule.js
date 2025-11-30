import { query } from '../database/connection.js';
import { generateId, normalizeDescription } from '../utils/helpers.js';
import { NotFoundError } from '../utils/errors.js';

export class Rule {
  static create(userId, data) {
    const id = generateId();
    query.run(`
      INSERT INTO rules (id, user_id, name, priority, is_active, conditions, action_category_id, action_tags, action_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, userId, data.name, data.priority || 0, data.isActive !== false ? 1 : 0,
      JSON.stringify(data.conditions), data.actionCategoryId || null,
      data.actionTags ? JSON.stringify(data.actionTags) : null, data.actionNotes || null]);
    return Rule.findById(id, userId);
  }

  static findById(id, userId) {
    const rule = query.get('SELECT * FROM rules WHERE id = ? AND user_id = ?', [id, userId]);
    return rule ? Rule.format(rule) : null;
  }

  static findByIdOrFail(id, userId) {
    const rule = Rule.findById(id, userId);
    if (!rule) throw new NotFoundError('Règle non trouvée');
    return rule;
  }

  static findByUser(userId, options = {}) {
    const { isActive, sortBy = 'priority', sortOrder = 'desc' } = options;
    let sql = 'SELECT * FROM rules WHERE user_id = ?';
    const params = [userId];
    if (isActive !== undefined) { sql += ' AND is_active = ?'; params.push(isActive ? 1 : 0); }
    const sortFields = { name: 'name', priority: 'priority', times_applied: 'times_applied', created_at: 'created_at' };
    sql += ` ORDER BY ${sortFields[sortBy] || 'priority'} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    return query.all(sql, params).map(Rule.format);
  }

  static matchTransaction(userId, transaction) {
    const rules = Rule.findByUser(userId, { isActive: true });
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

  static applyRule(userId, transactionId, ruleId) {
    const rule = Rule.findByIdOrFail(ruleId, userId);
    const updates = [];
    const values = [];
    
    if (rule.actionCategoryId) { updates.push('category_id = ?'); values.push(rule.actionCategoryId); }
    if (rule.actionTags?.length) { updates.push('tags = ?'); values.push(JSON.stringify(rule.actionTags)); }
    if (rule.actionNotes) { updates.push('notes = COALESCE(notes, "") || ?'); values.push('\n' + rule.actionNotes); }
    
    if (updates.length) {
      values.push(transactionId, userId);
      query.run(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    }
    query.run('UPDATE rules SET times_applied = times_applied + 1, last_applied_at = datetime("now") WHERE id = ?', [ruleId]);
    return true;
  }

  static update(id, userId, data) {
    Rule.findByIdOrFail(id, userId);
    const fields = ['name', 'priority', 'is_active', 'conditions', 'action_category_id', 'action_tags', 'action_notes'];
    const updates = [], values = [];
    
    Object.entries(data).forEach(([key, value]) => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (fields.includes(dbKey)) {
        updates.push(`${dbKey} = ?`);
        if (dbKey === 'conditions' || dbKey === 'action_tags') values.push(JSON.stringify(value));
        else if (typeof value === 'boolean') values.push(value ? 1 : 0);
        else values.push(value);
      }
    });
    
    if (updates.length) {
      values.push(id, userId);
      query.run(`UPDATE rules SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    }
    return Rule.findById(id, userId);
  }

  static delete(id, userId) {
    Rule.findByIdOrFail(id, userId);
    query.run('DELETE FROM rules WHERE id = ? AND user_id = ?', [id, userId]);
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
