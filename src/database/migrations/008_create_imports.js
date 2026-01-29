/**
 * @param {import('knex').Knex} knex
 */
export function up(knex) {
  return knex.schema
    .createTable('imports', (table) => {
      table.string('id', 36).primary();
      table.string('user_id', 36).notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.string('account_id', 36).notNullable()
        .references('id').inTable('accounts').onDelete('CASCADE');
      table.string('filename').notNullable();
      table.string('file_type').notNullable();
      table.integer('file_size');
      table.string('status').defaultTo('pending');
      // Statistics
      table.integer('total_rows').defaultTo(0);
      table.integer('imported_count').defaultTo(0);
      table.integer('duplicate_count').defaultTo(0);
      table.integer('error_count').defaultTo(0);
      // Configuration used
      table.text('config');
      // Results
      table.text('error_details');
      table.text('processing_log');
      table.timestamp('started_at');
      table.timestamp('completed_at');
      table.timestamps(true, true);

      table.index('user_id');
      table.index('account_id');
      table.index('status');
    })
    .createTable('reconciliation_matches', (table) => {
      table.string('id', 36).primary();
      table.string('import_id', 36).notNullable()
        .references('id').inTable('imports').onDelete('CASCADE');
      table.string('imported_transaction_id', 36).notNullable()
        .references('id').inTable('transactions').onDelete('CASCADE');
      table.string('matched_transaction_id', 36)
        .references('id').inTable('transactions').onDelete('SET NULL');
      table.integer('match_score').defaultTo(0);
      table.string('match_type');
      table.string('status').defaultTo('pending');
      table.timestamps(true, true);

      table.index('import_id');
    });
}

/**
 * @param {import('knex').Knex} knex
 */
export function down(knex) {
  return knex.schema
    .dropTableIfExists('reconciliation_matches')
    .dropTableIfExists('imports');
}
