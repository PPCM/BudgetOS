import bcrypt from 'bcryptjs';
import { query, transaction } from '../database/connection.js';
import { generateId } from '../utils/helpers.js';
import config from '../config/index.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

/**
 * Catégories par défaut pour les nouveaux utilisateurs
 */
const defaultCategories = [
  // Revenus
  { name: 'Salaire', type: 'income', icon: 'Briefcase', color: '#10B981' },
  { name: 'Primes', type: 'income', icon: 'Gift', color: '#059669' },
  { name: 'Remboursements', type: 'income', icon: 'ArrowLeft', color: '#34D399' },
  { name: 'Autres revenus', type: 'income', icon: 'PlusCircle', color: '#A7F3D0' },
  
  // Dépenses - Logement
  { name: 'Loyer', type: 'expense', icon: 'Home', color: '#EF4444' },
  { name: 'Électricité', type: 'expense', icon: 'Zap', color: '#F97316' },
  { name: 'Eau', type: 'expense', icon: 'Droplet', color: '#3B82F6' },
  { name: 'Internet', type: 'expense', icon: 'Wifi', color: '#8B5CF6' },
  { name: 'Téléphone', type: 'expense', icon: 'Phone', color: '#A855F7' },
  
  // Dépenses - Transport
  { name: 'Carburant', type: 'expense', icon: 'Fuel', color: '#F59E0B' },
  { name: 'Transports', type: 'expense', icon: 'Train', color: '#06B6D4' },
  { name: 'Entretien véhicule', type: 'expense', icon: 'Wrench', color: '#78716C' },
  
  // Dépenses - Alimentation
  { name: 'Courses', type: 'expense', icon: 'ShoppingCart', color: '#22C55E' },
  { name: 'Restaurant', type: 'expense', icon: 'Utensils', color: '#F97316' },
  
  // Dépenses - Santé
  { name: 'Santé', type: 'expense', icon: 'Heart', color: '#F43F5E' },
  
  // Dépenses - Loisirs
  { name: 'Loisirs', type: 'expense', icon: 'Music', color: '#EC4899' },
  { name: 'Abonnements', type: 'expense', icon: 'Tv', color: '#8B5CF6' },
  
  // Dépenses - Autres
  { name: 'Vêtements', type: 'expense', icon: 'Shirt', color: '#D946EF' },
  { name: 'Impôts', type: 'expense', icon: 'FileText', color: '#64748B' },
  { name: 'Banque', type: 'expense', icon: 'Landmark', color: '#475569' },
  { name: 'Divers', type: 'expense', icon: 'MoreHorizontal', color: '#9CA3AF' },
  
  // Virements
  { name: 'Virement interne', type: 'transfer', icon: 'ArrowRightLeft', color: '#6366F1' },
  { name: 'Épargne', type: 'transfer', icon: 'PiggyBank', color: '#10B981' },
];

/**
 * Modèle User
 */
export class User {
  /**
   * Crée un nouvel utilisateur
   */
  static async create(data) {
    const { email, password, firstName, lastName, locale, currency } = data;
    
    // Vérifier si l'email existe déjà
    const existing = query.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      throw new ConflictError('Cet email est déjà utilisé', 'EMAIL_EXISTS');
    }
    
    const id = generateId();
    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);
    
    // Créer l'utilisateur, ses paramètres et ses catégories par défaut
    transaction(() => {
      query.run(`
        INSERT INTO users (id, email, password_hash, first_name, last_name, locale, currency)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [id, email, passwordHash, firstName || null, lastName || null, locale, currency]);
      
      query.run(`
        INSERT INTO user_settings (id, user_id)
        VALUES (?, ?)
      `, [generateId(), id]);
      
      // Créer les catégories par défaut pour l'utilisateur
      defaultCategories.forEach((cat, index) => {
        query.run(`
          INSERT INTO categories (id, user_id, name, type, icon, color, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [generateId(), id, cat.name, cat.type, cat.icon, cat.color, index]);
      });
    });
    
    return User.findById(id);
  }
  
  /**
   * Trouve un utilisateur par ID
   */
  static findById(id) {
    const user = query.get(`
      SELECT id, email, first_name, last_name, role, locale, currency, timezone,
             is_active, email_verified, last_login_at, created_at, updated_at
      FROM users
      WHERE id = ? AND is_active = 1
    `, [id]);
    
    return user ? User.format(user) : null;
  }
  
  /**
   * Trouve un utilisateur par email
   */
  static findByEmail(email) {
    const user = query.get(`
      SELECT id, email, password_hash, first_name, last_name, role, locale, currency, timezone,
             is_active, email_verified, last_login_at, created_at, updated_at
      FROM users
      WHERE email = ? AND is_active = 1
    `, [email.toLowerCase()]);
    
    return user ? { ...User.format(user), passwordHash: user.password_hash } : null;
  }
  
  /**
   * Vérifie le mot de passe
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
  
  /**
   * Met à jour un utilisateur
   */
  static update(id, data) {
    const user = User.findById(id);
    if (!user) {
      throw new NotFoundError('Utilisateur non trouvé');
    }
    
    const allowedFields = ['first_name', 'last_name', 'locale', 'currency', 'timezone'];
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        updates.push(`${dbKey} = ?`);
        values.push(value);
      }
    }
    
    if (updates.length > 0) {
      values.push(id);
      query.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    }
    
    return User.findById(id);
  }
  
  /**
   * Change le mot de passe
   */
  static async changePassword(id, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);
    query.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  }
  
  /**
   * Met à jour la date de dernière connexion
   */
  static updateLastLogin(id) {
    query.run('UPDATE users SET last_login_at = datetime("now") WHERE id = ?', [id]);
  }
  
  /**
   * Désactive un utilisateur
   */
  static deactivate(id) {
    query.run('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
  }
  
  /**
   * Liste tous les utilisateurs (admin)
   */
  static findAll(options = {}) {
    const { page = 1, limit = 50, role } = options;
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT id, email, first_name, last_name, role, locale, currency,
             is_active, email_verified, last_login_at, created_at
      FROM users
      WHERE 1=1
    `;
    const params = [];
    
    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const users = query.all(sql, params);
    const total = query.get('SELECT COUNT(*) as count FROM users')?.count || 0;
    
    return {
      data: users.map(User.format),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Récupère les paramètres utilisateur
   */
  static getSettings(userId) {
    const settings = query.get('SELECT * FROM user_settings WHERE user_id = ?', [userId]);
    return settings ? User.formatSettings(settings) : null;
  }
  
  /**
   * Met à jour les paramètres utilisateur
   */
  static updateSettings(userId, data) {
    const allowedFields = [
      'date_format', 'number_format', 'week_start_day', 'dashboard_layout',
      'default_account_id', 'email_notifications', 'notify_low_balance',
      'low_balance_threshold', 'notify_upcoming_bills', 'bills_reminder_days',
      'default_import_config', 'theme'
    ];
    
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        updates.push(`${dbKey} = ?`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }
    
    if (updates.length > 0) {
      values.push(userId);
      query.run(`UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`, values);
    }
    
    return User.getSettings(userId);
  }
  
  /**
   * Formate un utilisateur pour l'API
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
      emailVerified: Boolean(user.email_verified),
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
  
  /**
   * Formate les paramètres pour l'API
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
