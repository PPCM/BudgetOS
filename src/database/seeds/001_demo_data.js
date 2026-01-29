import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * @param {import('knex').Knex} knex
 */
export async function seed(knex) {
  // Check if admin already exists
  const existing = await knex('users').where('email', 'admin@budgetos.local').first();
  if (existing) return;

  const adminId = uuidv4();
  const adminPassword = await bcrypt.hash('Admin123!', 12);

  // Create admin user
  await knex('users').insert({
    id: adminId,
    email: 'admin@budgetos.local',
    password_hash: adminPassword,
    first_name: 'Admin',
    last_name: 'BudgetOS',
    role: 'admin',
  });

  await knex('user_settings').insert({
    id: uuidv4(),
    user_id: adminId,
  });

  // Create demo accounts
  const checkingAccountId = uuidv4();
  const savingsAccountId = uuidv4();
  const creditCardAccountId = uuidv4();

  await knex('accounts').insert([
    {
      id: checkingAccountId, user_id: adminId, name: 'Compte Courant',
      type: 'checking', institution: 'Ma Banque',
      initial_balance: 2500.00, current_balance: 2500.00,
      color: '#3B82F6', icon: 'wallet', sort_order: 0,
    },
    {
      id: savingsAccountId, user_id: adminId, name: 'Livret A',
      type: 'savings', institution: 'Ma Banque',
      initial_balance: 10000.00, current_balance: 10000.00,
      color: '#10B981', icon: 'piggy-bank', sort_order: 1,
    },
    {
      id: creditCardAccountId, user_id: adminId, name: 'Carte Visa',
      type: 'credit_card', institution: 'Ma Banque',
      initial_balance: 0, current_balance: 0,
      color: '#EF4444', icon: 'credit-card', sort_order: 2,
    },
  ]);

  // Create credit card
  await knex('credit_cards').insert({
    id: uuidv4(), user_id: adminId,
    account_id: creditCardAccountId, linked_account_id: checkingAccountId,
    name: 'Visa Premier', debit_type: 'deferred',
    cycle_start_day: 26, debit_day: 5,
    credit_limit: 3000.00, has_dedicated_account: true,
  });

  // Create categories
  const salaryCategoryId = uuidv4();
  const coursesCategoryId = uuidv4();
  const restaurantCategoryId = uuidv4();
  const electricityCategoryId = uuidv4();

  await knex('categories').insert([
    { id: salaryCategoryId, user_id: adminId, name: 'Salaire', type: 'income', icon: 'briefcase', color: '#10B981', sort_order: 0 },
    { id: coursesCategoryId, user_id: adminId, name: 'Courses', type: 'expense', icon: 'shopping-cart', color: '#22C55E', sort_order: 1 },
    { id: restaurantCategoryId, user_id: adminId, name: 'Restaurant', type: 'expense', icon: 'utensils', color: '#F97316', sort_order: 2 },
    { id: electricityCategoryId, user_id: adminId, name: 'Électricité', type: 'expense', icon: 'zap', color: '#F97316', sort_order: 3 },
  ]);

  // Create demo transactions
  const now = new Date();
  const toDateStr = (d) => d.toISOString().split('T')[0];

  await knex('transactions').insert([
    {
      id: uuidv4(), user_id: adminId, account_id: checkingAccountId,
      category_id: salaryCategoryId, amount: 2800.00,
      description: 'Salaire Novembre',
      date: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
      status: 'cleared', type: 'income',
    },
    {
      id: uuidv4(), user_id: adminId, account_id: checkingAccountId,
      category_id: coursesCategoryId, amount: -85.50,
      description: 'Carrefour',
      date: toDateStr(new Date(now.getFullYear(), now.getMonth(), 5)),
      status: 'cleared', type: 'expense',
    },
    {
      id: uuidv4(), user_id: adminId, account_id: checkingAccountId,
      category_id: restaurantCategoryId, amount: -42.00,
      description: 'Restaurant Le Petit Bistrot',
      date: toDateStr(new Date(now.getFullYear(), now.getMonth(), 10)),
      status: 'cleared', type: 'expense',
    },
    {
      id: uuidv4(), user_id: adminId, account_id: checkingAccountId,
      category_id: electricityCategoryId, amount: -95.00,
      description: 'EDF - Prélèvement mensuel',
      date: toDateStr(new Date(now.getFullYear(), now.getMonth(), 15)),
      status: 'cleared', type: 'expense',
    },
  ]);

  // Update checking account balance
  const balance = 2500.00 + 2800.00 - 85.50 - 42.00 - 95.00;
  await knex('accounts').where('id', checkingAccountId).update({ current_balance: balance });

  // Create planned transaction
  await knex('planned_transactions').insert({
    id: uuidv4(), user_id: adminId, account_id: checkingAccountId,
    category_id: salaryCategoryId, amount: 2800.00,
    description: 'Salaire', type: 'income', frequency: 'monthly',
    start_date: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
    next_occurrence: toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
    day_of_month: 1, auto_create: true,
  });
}
