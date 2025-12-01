import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundError } from '../utils/errors.js';

class Payee {
  static create(userId, data) {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    query.run(`
      INSERT INTO payees (id, user_id, name, image_url, notes, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `, [id, userId, data.name, data.imageUrl || null, data.notes || null, now, now]);
    
    return Payee.findById(id, userId);
  }

  static findById(id, userId) {
    const payee = query.get(`
      SELECT * FROM payees WHERE id = ? AND user_id = ?
    `, [id, userId]);
    return payee ? Payee.format(payee) : null;
  }

  static findByIdOrFail(id, userId) {
    const payee = Payee.findById(id, userId);
    if (!payee) throw new NotFoundError('Tiers non trouvé');
    return payee;
  }

  static findByName(name, userId) {
    const payee = query.get(`
      SELECT * FROM payees WHERE name = ? AND user_id = ? AND is_active = 1
    `, [name, userId]);
    return payee ? Payee.format(payee) : null;
  }

  static findByUser(userId, options = {}) {
    const { isActive, search, page = 1, limit = 100 } = options;
    let sql = 'SELECT * FROM payees WHERE user_id = ?';
    const params = [userId];
    
    // Par défaut, ne montrer que les tiers actifs (sauf si explicitement demandé)
    const activeFilter = isActive === undefined ? true : isActive;
    sql += ' AND is_active = ?';
    params.push(activeFilter ? 1 : 0);
    
    if (search) {
      sql += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }
    
    sql += ' ORDER BY name ASC';
    
    const offset = (page - 1) * limit;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    
    const payees = query.all(sql, params);
    return payees.map(Payee.format);
  }

  static update(id, userId, data) {
    Payee.findByIdOrFail(id, userId);
    
    const fields = [];
    const values = [];
    
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.imageUrl !== undefined) { fields.push('image_url = ?'); values.push(data.imageUrl); }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
    if (data.isActive !== undefined) { fields.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }
    
    if (fields.length === 0) return Payee.findById(id, userId);
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id, userId);
    
    query.run(`UPDATE payees SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
    return Payee.findById(id, userId);
  }

  static countTransactions(id, userId) {
    Payee.findByIdOrFail(id, userId);
    const result = query.get(
      'SELECT COUNT(*) as count FROM transactions WHERE payee_id = ? AND user_id = ?',
      [id, userId]
    );
    return result?.count || 0;
  }

  static reassignTransactions(fromPayeeId, toPayeeId, userId) {
    // Vérifier que le tiers source existe
    Payee.findByIdOrFail(fromPayeeId, userId);
    
    // Si toPayeeId est fourni, vérifier qu'il existe
    if (toPayeeId) {
      Payee.findByIdOrFail(toPayeeId, userId);
    }
    
    const result = query.run(
      'UPDATE transactions SET payee_id = ? WHERE payee_id = ? AND user_id = ?',
      [toPayeeId || null, fromPayeeId, userId]
    );
    return { reassigned: result.changes };
  }

  static delete(id, userId) {
    Payee.findByIdOrFail(id, userId);
    query.run('DELETE FROM payees WHERE id = ? AND user_id = ?', [id, userId]);
    return { deleted: true };
  }

  static format(payee) {
    return {
      id: payee.id,
      userId: payee.user_id,
      name: payee.name,
      imageUrl: payee.image_url,
      notes: payee.notes,
      isActive: Boolean(payee.is_active),
      createdAt: payee.created_at,
      updatedAt: payee.updated_at,
    };
  }
}

export default Payee;
