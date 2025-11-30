import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, closeDatabase, query } from './connection.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Insère les données de seed
 */
const seed = async () => {
  try {
    logger.info('Starting database seeding...');
    
    await initDatabase();
    
    // Créer un utilisateur admin de démonstration
    const adminPassword = await bcrypt.hash('Admin123!', config.security.bcryptRounds);
    const adminId = uuidv4();
    
    const existingAdmin = query.get('SELECT id FROM users WHERE email = ?', ['admin@budgetos.local']);
    
    if (!existingAdmin) {
      query.run(`
        INSERT INTO users (id, email, password_hash, first_name, last_name, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [adminId, 'admin@budgetos.local', adminPassword, 'Admin', 'BudgetOS', 'admin']);
      
      logger.info('Admin user created', { email: 'admin@budgetos.local', password: 'Admin123!' });
      
      query.run(`INSERT INTO user_settings (id, user_id) VALUES (?, ?)`, [uuidv4(), adminId]);
      
      // Créer des comptes de démonstration
      const checkingAccountId = uuidv4();
      const savingsAccountId = uuidv4();
      const creditCardAccountId = uuidv4();
      
      query.run(`
        INSERT INTO accounts (id, user_id, name, type, institution, initial_balance, current_balance, color, icon, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [checkingAccountId, adminId, 'Compte Courant', 'checking', 'Ma Banque', 2500.00, 2500.00, '#3B82F6', 'wallet', 0]);
      
      query.run(`
        INSERT INTO accounts (id, user_id, name, type, institution, initial_balance, current_balance, color, icon, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [savingsAccountId, adminId, 'Livret A', 'savings', 'Ma Banque', 10000.00, 10000.00, '#10B981', 'piggy-bank', 1]);
      
      query.run(`
        INSERT INTO accounts (id, user_id, name, type, institution, initial_balance, current_balance, color, icon, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [creditCardAccountId, adminId, 'Carte Visa', 'credit_card', 'Ma Banque', 0, 0, '#EF4444', 'credit-card', 2]);
      
      logger.info('Demo accounts created');
      
      // Créer une carte de crédit à débit différé
      query.run(`
        INSERT INTO credit_cards (id, user_id, account_id, linked_account_id, name, debit_type, cycle_start_day, debit_day, credit_limit, has_dedicated_account)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), adminId, creditCardAccountId, checkingAccountId, 'Visa Premier', 'deferred', 26, 5, 3000.00, 1]);
      
      logger.info('Demo credit card created');
      
      // Créer les catégories pour l'utilisateur admin
      const salaryCategoryId = uuidv4();
      const coursesCategoryId = uuidv4();
      const restaurantCategoryId = uuidv4();
      const electricityCategoryId = uuidv4();
      
      query.run(`INSERT INTO categories (id, user_id, name, type, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [salaryCategoryId, adminId, 'Salaire', 'income', 'briefcase', '#10B981', 0]);
      query.run(`INSERT INTO categories (id, user_id, name, type, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [coursesCategoryId, adminId, 'Courses', 'expense', 'shopping-cart', '#22C55E', 1]);
      query.run(`INSERT INTO categories (id, user_id, name, type, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [restaurantCategoryId, adminId, 'Restaurant', 'expense', 'utensils', '#F97316', 2]);
      query.run(`INSERT INTO categories (id, user_id, name, type, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [electricityCategoryId, adminId, 'Électricité', 'expense', 'zap', '#F97316', 3]);
      
      logger.info('Demo categories created');
      
      const now = new Date();
      
      // Créer quelques transactions de démonstration
      query.run(`
        INSERT INTO transactions (id, user_id, account_id, category_id, amount, description, date, status, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'cleared', ?)
      `, [uuidv4(), adminId, checkingAccountId, salaryCategoryId, 2800.00, 'Salaire Novembre', 
          new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], 'income']);
      
      query.run(`
        INSERT INTO transactions (id, user_id, account_id, category_id, amount, description, date, status, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'cleared', ?)
      `, [uuidv4(), adminId, checkingAccountId, coursesCategoryId, -85.50, 'Carrefour',
          new Date(now.getFullYear(), now.getMonth(), 5).toISOString().split('T')[0], 'expense']);
      
      query.run(`
        INSERT INTO transactions (id, user_id, account_id, category_id, amount, description, date, status, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'cleared', ?)
      `, [uuidv4(), adminId, checkingAccountId, restaurantCategoryId, -42.00, 'Restaurant Le Petit Bistrot',
          new Date(now.getFullYear(), now.getMonth(), 10).toISOString().split('T')[0], 'expense']);
      
      query.run(`
        INSERT INTO transactions (id, user_id, account_id, category_id, amount, description, date, status, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'cleared', ?)
      `, [uuidv4(), adminId, checkingAccountId, electricityCategoryId, -95.00, 'EDF - Prélèvement mensuel',
          new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split('T')[0], 'expense']);
      
      // Mettre à jour le solde du compte courant
      const balance = 2500.00 + 2800.00 - 85.50 - 42.00 - 95.00;
      query.run('UPDATE accounts SET current_balance = ? WHERE id = ?', [balance, checkingAccountId]);
      
      logger.info('Demo transactions created');
      
      // Créer une transaction planifiée
      query.run(`
        INSERT INTO planned_transactions (id, user_id, account_id, category_id, amount, description, type, frequency, start_date, next_occurrence, day_of_month, auto_create)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), adminId, checkingAccountId, salaryCategoryId, 2800.00, 'Salaire', 'income', 'monthly',
          new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0], 1, 1]);
      
      logger.info('Demo planned transaction created');
    } else {
      logger.info('Admin user already exists, skipping demo data');
    }
    
    closeDatabase();
    
    logger.info('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

seed();
