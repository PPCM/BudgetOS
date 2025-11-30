import { query } from '../database/connection.js';
import { generateId } from '../utils/helpers.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export class Category {
  static create(userId, data) {
    const id = generateId();
    query.run(`
      INSERT INTO categories (id, user_id, parent_id, name, type, icon, color, budget_monthly, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, userId, data.parentId || null, data.name, data.type,
      data.icon || 'tag', data.color || '#6B7280', data.budgetMonthly || null, data.sortOrder || 0]);
    return Category.findById(id, userId);
  }

  static findById(id, userId) {
    const category = query.get(`
      SELECT c.*, p.name as parent_name FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = ? AND (c.user_id = ? OR c.user_id IS NULL) AND c.is_active = 1
    `, [id, userId]);
    return category ? Category.format(category) : null;
  }

  static findByIdOrFail(id, userId) {
    const category = Category.findById(id, userId);
    if (!category) throw new NotFoundError('Catégorie non trouvée');
    return category;
  }

  static findByUser(userId, options = {}) {
    const { type, parentId, isActive = true, includeSystem = true, flat = false } = options;
    let sql = `SELECT c.*, p.name as parent_name FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id WHERE (c.user_id = ? OR c.user_id IS NULL)`;
    const params = [userId];
    
    if (!includeSystem) { sql += ' AND c.is_system = 0'; }
    if (type) { sql += ' AND c.type = ?'; params.push(type); }
    if (parentId !== undefined) {
      sql += parentId === null ? ' AND c.parent_id IS NULL' : ' AND c.parent_id = ?';
      if (parentId !== null) params.push(parentId);
    }
    if (isActive !== undefined) { sql += ' AND c.is_active = ?'; params.push(isActive ? 1 : 0); }
    sql += ' ORDER BY c.sort_order ASC, c.name ASC';
    
    const categories = query.all(sql, params).map(Category.format);
    return flat ? categories : Category.buildTree(categories);
  }

  static buildTree(categories) {
    const map = new Map();
    const tree = [];
    categories.forEach(cat => map.set(cat.id, { ...cat, children: [] }));
    categories.forEach(cat => {
      const node = map.get(cat.id);
      if (cat.parentId && map.has(cat.parentId)) map.get(cat.parentId).children.push(node);
      else tree.push(node);
    });
    return tree;
  }

  static update(id, userId, data) {
    Category.findByIdOrFail(id, userId);
    
    const fields = ['parent_id', 'name', 'type', 'icon', 'color', 'budget_monthly', 'sort_order'];
    const updates = [], values = [];
    Object.entries(data).forEach(([key, value]) => {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (fields.includes(dbKey)) { updates.push(`${dbKey} = ?`); values.push(value); }
    });
    if (updates.length) {
      values.push(id, userId);
      query.run(`UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    }
    return Category.findById(id, userId);
  }

  static delete(id, userId) {
    Category.findByIdOrFail(id, userId);
    const txCount = query.get('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?', [id])?.count || 0;
    if (txCount > 0) query.run('UPDATE categories SET is_active = 0 WHERE id = ? AND user_id = ?', [id, userId]);
    else query.run('DELETE FROM categories WHERE id = ? AND user_id = ?', [id, userId]);
    return { deleted: true, softDelete: txCount > 0 };
  }

  static format(category) {
    return {
      id: category.id, userId: category.user_id, parentId: category.parent_id,
      parentName: category.parent_name, name: category.name, type: category.type,
      icon: category.icon, color: category.color, isSystem: Boolean(category.is_system),
      isActive: Boolean(category.is_active), budgetMonthly: category.budget_monthly,
      sortOrder: category.sort_order, createdAt: category.created_at, updatedAt: category.updated_at,
    };
  }
}

export default Category;
