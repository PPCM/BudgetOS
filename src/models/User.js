import bcrypt from 'bcryptjs';
import knex from '../database/connection.js';
import { generateId } from '../utils/helpers.js';
import config from '../config/index.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { buildUpdates, paginationMeta } from '../utils/modelHelpers.js';

/**
 * Default categories for new users
 */
const defaultCategories = [
  // Income
  { name: 'Salaire', type: 'income', icon: 'Briefcase', color: '#10B981' },
  { name: 'Primes', type: 'income', icon: 'Gift', color: '#059669' },
  { name: 'Remboursements', type: 'income', icon: 'ArrowLeft', color: '#34D399' },
  { name: 'Autres revenus', type: 'income', icon: 'PlusCircle', color: '#A7F3D0' },
  // Expenses - Housing
  { name: 'Loyer', type: 'expense', icon: 'Home', color: '#EF4444' },
  { name: 'Électricité', type: 'expense', icon: 'Zap', color: '#F97316' },
  { name: 'Eau', type: 'expense', icon: 'Droplet', color: '#3B82F6' },
  { name: 'Internet', type: 'expense', icon: 'Wifi', color: '#8B5CF6' },
  { name: 'Téléphone', type: 'expense', icon: 'Phone', color: '#A855F7' },
  // Expenses - Transport
  { name: 'Carburant', type: 'expense', icon: 'Fuel', color: '#F59E0B' },
  { name: 'Transports', type: 'expense', icon: 'Train', color: '#06B6D4' },
  { name: 'Entretien véhicule', type: 'expense', icon: 'Wrench', color: '#78716C' },
  // Expenses - Food
  { name: 'Courses', type: 'expense', icon: 'ShoppingCart', color: '#22C55E' },
  { name: 'Restaurant', type: 'expense', icon: 'Utensils', color: '#F97316' },
  // Expenses - Health
  { name: 'Santé', type: 'expense', icon: 'Heart', color: '#F43F5E' },
  // Expenses - Leisure
  { name: 'Loisirs', type: 'expense', icon: 'Music', color: '#EC4899' },
  { name: 'Abonnements', type: 'expense', icon: 'Tv', color: '#8B5CF6' },
  // Expenses - Other
  { name: 'Vêtements', type: 'expense', icon: 'Shirt', color: '#D946EF' },
  { name: 'Impôts', type: 'expense', icon: 'FileText', color: '#64748B' },
  { name: 'Banque', type: 'expense', icon: 'Landmark', color: '#475569' },
  { name: 'Divers', type: 'expense', icon: 'MoreHorizontal', color: '#9CA3AF' },
  // Transfers
  { name: 'Virement interne', type: 'transfer', icon: 'ArrowRightLeft', color: '#6366F1' },
  { name: 'Épargne', type: 'transfer', icon: 'PiggyBank', color: '#10B981' },
];

/**
 * User model
 */
export class User {
  /**
   * Insert default categories and user_settings for a new user within a transaction
   * @param {Object} trx - Knex transaction
   * @param {string} userId - User ID
   */
  static async _insertDefaults(trx, userId) {
    await trx('user_settings').insert({ id: generateId(), user_id: userId });
    const categories = defaultCategories.map((cat, index) => ({
      id: generateId(), user_id: userId,
      name: cat.name, type: cat.type,
      icon: cat.icon, color: cat.color, sort_order: index,
    }));
    await trx('categories').insert(categories);
  }

  /**
   * Create a new user with default categories and settings
   */
  static async create(data) {
    const { email, password, firstName, lastName, locale, currency } = data;

    const existing = await knex('users').where('email', email).first();
    if (existing) {
      throw new ConflictError('This email is already in use', 'EMAIL_EXISTS');
    }

    const id = generateId();
    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    await knex.transaction(async (trx) => {
      await trx('users').insert({
        id, email, password_hash: passwordHash,
        first_name: firstName || null, last_name: lastName || null,
        locale, currency,
      });

      await User._insertDefaults(trx, id);
    });

    return User.findById(id);
  }

  /**
   * Find user by ID (active users only)
   */
  static async findById(id) {
    const user = await knex('users')
      .select('id', 'email', 'first_name', 'last_name', 'role', 'locale', 'currency', 'timezone',
        'is_active', 'email_verified', 'last_login_at', 'created_at', 'updated_at')
      .where({ id, is_active: true })
      .first();

    return user ? User.format(user) : null;
  }

  /**
   * Find user by ID regardless of active status (for admin operations)
   */
  static async findByIdAny(id) {
    const user = await knex('users')
      .select('id', 'email', 'first_name', 'last_name', 'role', 'locale', 'currency', 'timezone',
        'is_active', 'email_verified', 'last_login_at', 'created_at', 'updated_at')
      .where({ id })
      .first();

    return user ? User.format(user) : null;
  }

  /**
   * Find user by email (includes inactive users for login checks)
   */
  static async findByEmail(email) {
    const user = await knex('users')
      .select('id', 'email', 'password_hash', 'first_name', 'last_name', 'role', 'locale',
        'currency', 'timezone', 'is_active', 'email_verified', 'last_login_at', 'created_at', 'updated_at')
      .where({ email: email.toLowerCase() })
      .first();

    return user ? { ...User.format(user), passwordHash: user.password_hash } : null;
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update user profile
   */
  static async update(id, data) {
    const user = await User.findById(id);
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    const allowedFields = ['first_name', 'last_name', 'locale', 'currency', 'timezone'];
    const updates = buildUpdates(data, allowedFields);

    if (Object.keys(updates).length > 0) {
      await knex('users').where('id', id).update(updates);
    }

    return User.findById(id);
  }

  /**
   * Change password
   */
  static async changePassword(id, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);
    await knex('users').where('id', id).update({ password_hash: passwordHash });
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(id) {
    await knex('users').where('id', id).update({ last_login_at: knex.fn.now() });
  }

  /**
   * Deactivate user
   */
  static async deactivate(id) {
    await knex('users').where('id', id).update({ is_active: false });
  }

  /**
   * Permanently delete a user and all associated data (cascaded by DB)
   */
  static async delete(id) {
    const user = await knex('users').where('id', id).first();
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    await knex('users').where('id', id).del();
  }

  /**
   * Reactivate a deactivated user
   */
  static async reactivate(id) {
    const user = await knex('users').where('id', id).first();
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    await knex('users').where('id', id).update({ is_active: true });
    return User.findByIdAny(id);
  }

  /**
   * Update user role
   * @param {string} id - User ID
   * @param {string} role - New role ('user', 'admin', 'super_admin')
   */
  static async updateRole(id, role) {
    const user = await knex('users').where('id', id).first();
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    await knex('users').where('id', id).update({ role });
    return User.findByIdAny(id);
  }

  /**
   * Update a user via admin (partial update)
   * @param {string} id - User ID
   * @param {Object} data - Fields to update (email, firstName, lastName, role, locale, currency)
   * @returns {Promise<Object>} Updated user
   */
  static async adminUpdate(id, data) {
    const user = await User.findByIdAny(id);
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');

    // Check email uniqueness if changed
    if (data.email && data.email !== user.email) {
      const existing = await knex('users').where('email', data.email).whereNot('id', id).first();
      if (existing) {
        throw new ConflictError('This email is already in use', 'EMAIL_EXISTS');
      }
    }

    const allowedFields = ['email', 'first_name', 'last_name', 'role', 'locale', 'currency'];
    const updates = buildUpdates(data, allowedFields);

    if (Object.keys(updates).length > 0) {
      await knex('users').where('id', id).update(updates);
    }

    return User.findByIdAny(id);
  }

  /**
   * Create a user via admin (no default categories, assigns to group)
   * @param {Object} data - User data
   * @returns {Promise<Object>}
   */
  static async createByAdmin(data) {
    const { email, password, firstName, lastName, locale, currency, role } = data;

    const existing = await knex('users').where('email', email).first();
    if (existing) {
      throw new ConflictError('This email is already in use', 'EMAIL_EXISTS');
    }

    const id = generateId();
    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    await knex.transaction(async (trx) => {
      await trx('users').insert({
        id, email, password_hash: passwordHash,
        first_name: firstName || null, last_name: lastName || null,
        locale: locale || 'fr', currency: currency || 'EUR',
        role: role || 'user',
      });

      await User._insertDefaults(trx, id);
    });

    return User.findById(id);
  }

  /**
   * List all users (admin)
   * @param {Object} [options]
   * @param {number} [options.page=1]
   * @param {number} [options.limit=50]
   * @param {string} [options.role] - Filter by role
   * @param {string} [options.groupId] - Filter by group membership
   */
  static async findAll(options = {}) {
    const { page = 1, limit = 50, role, groupId, search, status } = options;
    const offset = (page - 1) * limit;

    let query = knex('users')
      .select('users.id', 'users.email', 'users.first_name', 'users.last_name', 'users.role',
        'users.locale', 'users.currency', 'users.is_active', 'users.email_verified',
        'users.last_login_at', 'users.created_at');

    if (role) query = query.where('users.role', role);

    if (status === 'active') query = query.where('users.is_active', true);
    else if (status === 'suspended') query = query.where('users.is_active', false);

    if (search) {
      const term = `%${search}%`;
      query = query.where(function () {
        this.where('users.email', 'like', term)
          .orWhere('users.first_name', 'like', term)
          .orWhere('users.last_name', 'like', term);
      });
    }

    if (groupId) {
      query = query
        .join('group_members', 'users.id', 'group_members.user_id')
        .where('group_members.group_id', groupId);
    }

    // Run count and data queries in parallel; count reuses filters via clone
    const [users, totalResult] = await Promise.all([
      query.clone().orderBy('users.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().clearOrder().count('* as count').first(),
    ]);
    const total = totalResult?.count || 0;

    return {
      data: users.map(User.format),
      pagination: paginationMeta(page, limit, total),
    };
  }

  /**
   * Get user settings
   */
  static async getSettings(userId) {
    const settings = await knex('user_settings').where('user_id', userId).first();
    return settings ? User.formatSettings(settings) : null;
  }

  /**
   * Update user settings
   */
  static async updateSettings(userId, data) {
    const allowedFields = [
      'date_format', 'number_format', 'week_start_day', 'dashboard_layout',
      'default_account_id', 'email_notifications', 'notify_low_balance',
      'low_balance_threshold', 'notify_upcoming_bills', 'bills_reminder_days',
      'default_import_config', 'theme',
    ];

    const updates = buildUpdates(data, allowedFields, {
      jsonFields: ['dashboard_layout', 'default_import_config'],
    });

    if (Object.keys(updates).length > 0) {
      await knex('user_settings').where('user_id', userId).update(updates);
    }

    return User.getSettings(userId);
  }

  /**
   * Format user for API response
   */
  static format(user) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
      role: user.role,
      locale: user.locale,
      currency: user.currency,
      timezone: user.timezone,
      isActive: Boolean(user.is_active),
      status: Boolean(user.is_active) ? 'active' : 'suspended',
      emailVerified: Boolean(user.email_verified),
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Format settings for API response
   */
  static formatSettings(settings) {
    return {
      dateFormat: settings.date_format,
      numberFormat: settings.number_format,
      weekStartDay: settings.week_start_day,
      dashboardLayout: settings.dashboard_layout ? JSON.parse(settings.dashboard_layout) : null,
      defaultAccountId: settings.default_account_id,
      emailNotifications: Boolean(settings.email_notifications),
      notifyLowBalance: Boolean(settings.notify_low_balance),
      lowBalanceThreshold: settings.low_balance_threshold,
      notifyUpcomingBills: Boolean(settings.notify_upcoming_bills),
      billsReminderDays: settings.bills_reminder_days,
      defaultImportConfig: settings.default_import_config ? JSON.parse(settings.default_import_config) : null,
      theme: settings.theme,
    };
  }
}

export default User;
