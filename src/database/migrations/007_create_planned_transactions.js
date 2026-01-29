/**
 * @param {import('knex').Knex} knex
 */
export function up(knex) {
  return knex.schema.createTable('planned_transactions', (table) => {
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
    // Amount and description
    table.decimal('amount', 15, 2).notNullable();
    table.text('description').notNullable();
    table.text('notes');
    table.string('type').notNullable();
    // Transfer destination
    table.string('to_account_id', 36)
      .references('id').inTable('accounts').onDelete('SET NULL');
    // Scheduling
    table.string('frequency').notNullable();
    table.date('start_date').notNullable();
    table.date('end_date');
    table.date('next_occurrence');
    table.integer('day_of_month');
    table.integer('day_of_week');
    // Options
    table.boolean('auto_create').defaultTo(false);
    table.boolean('execute_before_holiday').defaultTo(false);
    table.boolean('delete_on_end').defaultTo(false);
    table.integer('days_before_create').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_created_at');
    table.integer('occurrences_created').defaultTo(0);
    table.integer('max_occurrences');
    // Metadata
    table.text('tags');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('next_occurrence');
    table.index('account_id');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('planned_transactions');
}
