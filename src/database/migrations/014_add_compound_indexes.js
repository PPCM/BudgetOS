/**
 * Add compound indexes for common query patterns.
 * These indexes optimize the most frequent joins and filters.
 */
export function up(knex) {
  return knex.schema
    // Transactions compound indexes
    .alterTable('transactions', (table) => {
      table.index(['user_id', 'date'], 'idx_transactions_user_date');
      table.index(['user_id', 'account_id', 'date'], 'idx_transactions_user_account_date');
      table.index(['user_id', 'type', 'status', 'date'], 'idx_transactions_user_type_status_date');
      table.index(['credit_card_id', 'credit_card_cycle_id'], 'idx_transactions_cc_cycle');
      table.index(['account_id', 'user_id', 'status'], 'idx_transactions_account_user_status');
    })
    // Accounts compound indexes
    .alterTable('accounts', (table) => {
      table.index(['user_id', 'is_active'], 'idx_accounts_user_active');
      table.index(['user_id', 'is_active', 'is_included_in_total'], 'idx_accounts_user_active_total');
    })
    // Credit card cycles compound index
    .alterTable('credit_card_cycles', (table) => {
      table.index(['credit_card_id', 'status'], 'idx_cc_cycles_card_status');
    })
    // Planned transactions compound index
    .alterTable('planned_transactions', (table) => {
      table.index(['user_id', 'is_active', 'next_occurrence'], 'idx_planned_tx_user_active_next');
    })
    // Imports compound index
    .alterTable('imports', (table) => {
      table.index(['user_id', 'account_id', 'status'], 'idx_imports_user_account_status');
    });
}

export function down(knex) {
  return knex.schema
    .alterTable('transactions', (table) => {
      table.dropIndex([], 'idx_transactions_user_date');
      table.dropIndex([], 'idx_transactions_user_account_date');
      table.dropIndex([], 'idx_transactions_user_type_status_date');
      table.dropIndex([], 'idx_transactions_cc_cycle');
      table.dropIndex([], 'idx_transactions_account_user_status');
    })
    .alterTable('accounts', (table) => {
      table.dropIndex([], 'idx_accounts_user_active');
      table.dropIndex([], 'idx_accounts_user_active_total');
    })
    .alterTable('credit_card_cycles', (table) => {
      table.dropIndex([], 'idx_cc_cycles_card_status');
    })
    .alterTable('planned_transactions', (table) => {
      table.dropIndex([], 'idx_planned_tx_user_active_next');
    })
    .alterTable('imports', (table) => {
      table.dropIndex([], 'idx_imports_user_account_status');
    });
}
