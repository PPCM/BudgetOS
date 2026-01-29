/**
 * @param {import('knex').Knex} knex
 */
export function up(knex) {
  return knex.schema
    .createTable('credit_cards', (table) => {
      table.string('id', 36).primary();
      table.string('user_id', 36).notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.string('account_id', 36).notNullable()
        .references('id').inTable('accounts').onDelete('CASCADE');
      table.string('linked_account_id', 36)
        .references('id').inTable('accounts').onDelete('SET NULL');
      table.string('name').notNullable();
      table.string('card_number_last4');
      table.string('expiration_date');
      table.string('debit_type').notNullable();
      // Deferred debit configuration
      table.integer('cycle_start_day').defaultTo(1);
      table.integer('debit_day');
      table.integer('debit_days_before_end');
      // Limits
      table.decimal('credit_limit', 15, 2);
      // Settings
      table.boolean('has_dedicated_account').defaultTo(false);
      table.boolean('auto_generate_debit').defaultTo(true);
      table.boolean('is_active').defaultTo(true);
      table.string('color').defaultTo('#EF4444');
      table.text('notes');
      table.timestamps(true, true);

      table.index('user_id');
      table.index('account_id');
    })
    .createTable('credit_card_cycles', (table) => {
      table.string('id', 36).primary();
      table.string('credit_card_id', 36).notNullable()
        .references('id').inTable('credit_cards').onDelete('CASCADE');
      table.date('cycle_start_date').notNullable();
      table.date('cycle_end_date').notNullable();
      table.date('debit_date').notNullable();
      table.decimal('total_amount', 15, 2).defaultTo(0);
      table.string('status').defaultTo('open');
      table.string('debit_transaction_id', 36);
      table.timestamps(true, true);

      table.index('credit_card_id');
      table.index(['cycle_start_date', 'cycle_end_date']);
    });
}

/**
 * @param {import('knex').Knex} knex
 */
export function down(knex) {
  return knex.schema
    .dropTableIfExists('credit_card_cycles')
    .dropTableIfExists('credit_cards');
}
