import knex from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundError } from '../utils/errors.js';

class Payee {
  static async create(userId, data) {
    const id = uuidv4();

    await knex('payees').insert({
      id, user_id: userId, name: data.name,
      image_url: data.imageUrl || null, notes: data.notes || null,
      is_active: true,
    });

    return Payee.findById(id, userId);
  }

  static async findById(id, userId) {
    const payee = await knex('payees').where({ id, user_id: userId }).first();
    return payee ? Payee.format(payee) : null;
  }

  static async findByIdOrFail(id, userId) {
    const payee = await Payee.findById(id, userId);
    if (!payee) throw new NotFoundError('Tiers non trouvé');
    return payee;
  }

  static async findByName(name, userId) {
    const payee = await knex('payees')
      .where({ name, user_id: userId, is_active: true })
      .first();
    return payee ? Payee.format(payee) : null;
  }

  static async findByUser(userId, options = {}) {
    const { isActive, search, page = 1, limit = 100 } = options;
    const offset = (page - 1) * limit;

    let query = knex('payees').where('user_id', userId);

    const activeFilter = isActive === undefined ? true : isActive;
    query = query.where('is_active', activeFilter);

    if (search) {
      query = query.where('name', 'like', `%${search}%`);
    }

    const payees = await query.orderBy('name', 'asc').limit(limit).offset(offset);
    return payees.map(Payee.format);
  }

  static async update(id, userId, data) {
    await Payee.findByIdOrFail(id, userId);

    const updates = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.imageUrl !== undefined) updates.image_url = data.imageUrl;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.isActive !== undefined) updates.is_active = data.isActive;

    if (Object.keys(updates).length === 0) return Payee.findById(id, userId);

    await knex('payees').where({ id, user_id: userId }).update(updates);
    return Payee.findById(id, userId);
  }

  static async countTransactions(id, userId) {
    await Payee.findByIdOrFail(id, userId);
    const result = await knex('transactions')
      .where({ payee_id: id, user_id: userId })
      .count('* as count')
      .first();
    return result?.count || 0;
  }

  static async reassignTransactions(fromPayeeId, toPayeeId, userId) {
    await Payee.findByIdOrFail(fromPayeeId, userId);
    if (toPayeeId) await Payee.findByIdOrFail(toPayeeId, userId);

    const result = await knex('transactions')
      .where({ payee_id: fromPayeeId, user_id: userId })
      .update({ payee_id: toPayeeId || null });
    return { reassigned: result };
  }

  static async delete(id, userId) {
    await Payee.findByIdOrFail(id, userId);
    await knex('payees').where({ id, user_id: userId }).del();
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
