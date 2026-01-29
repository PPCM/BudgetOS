/**
 * @param {import('knex').Knex} knex
 */
export function up(knex) {
  return knex.schema
    .createTable('transactions', (table) => {
      table.string('id', 36).primary();
      table.string('user_id', 36).notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.string('account_id', 36).notNullable()
        .references('id').inTable('accounts').onDelete('CASCADE');
      table.string('category_id', 36)
        .references('id').inTable('categories').onDelete('SET NULL');
      table.string('payee_id', 36)
        .references('id').inTable('payees').onDelete('SET NULL');
      table.string('credit_card_id', 36)
        .references('id').inTable('credit_cards').onDelete('SET NULL');
      table.string('credit_card_cycle_id', 36)
        .references('id').inTable('credit_card_cycles').onDelete('SET NULL');
      // Amount and description
      table.decimal('amount', 15, 2).notNullable();
      table.text('description').notNullable();
      table.text('notes');
      // Dates
      table.date('date').notNullable();
      table.date('value_date');
      table.date('purchase_date');
      table.date('accounting_date');
      // Status
      table.string('status').defaultTo('pending');
      table.string('type').notNullable();
      // Recurrence
      table.boolean('is_recurring').defaultTo(false);
      table.string('recurring_id', 36);
      // Import
      table.string('import_id', 36);
      table.string('import_hash');
      table.string('external_id');
      // Reconciliation
      table.boolean('is_reconciled').defaultTo(false);
      table.timestamp('reconciled_at');
      // Split
      table.boolean('is_split').defaultTo(false);
      table.string('parent_transaction_id', 36)
        .references('id').inTable('transactions').onDelete('CASCADE');
      // Linked transfer
      table.string('linked_transaction_id', 36);
      // Attachments
      table.boolean('has_attachments').defaultTo(false);
      // Metadata
      table.text('tags');
      table.text('metadata');
      table.timestamps(true, true);

      table.index('user_id');
      table.index('account_id');
      table.index('payee_id');
      table.index('category_id');
      table.index('date');
      table.index('status');
      table.index('credit_card_id');
      table.index('import_hash');
    })
    .createTable('transaction_splits', (table) => {
      table.string('id', 36).primary();
      table.string('transaction_id', 36).notNullable()
        .references('id').inTable('transactions').onDelete('CASCADE');
      table.string('category_id', 36)
        .references('id').inTable('categories').onDelete('SET NULL');
      table.decimal('amount', 15, 2).notNullable();
      table.text('description');
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index('transaction_id');
    });
}

/**
 * @param {import('knex').Knex} knex
 */
export function down(knex) {
  return knex.schema
    .dropTableIfExists('transaction_splits')
    .dropTableIfExists('transactions');
}
