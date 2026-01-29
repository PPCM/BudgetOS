/**
 * @param {import('knex').Knex} knex
 */
export function up(knex) {
  return knex.schema.createTable('attachments', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('transaction_id', 36).notNullable()
      .references('id').inTable('transactions').onDelete('CASCADE');
    table.string('filename').notNullable();
    table.string('original_filename').notNullable();
    table.string('mime_type').notNullable();
    table.integer('file_size').notNullable();
    table.text('file_path').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('transaction_id');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('attachments');
}
