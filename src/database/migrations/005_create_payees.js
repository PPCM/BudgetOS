/**
 * @param {import('knex').Knex} knex
 */
export function up(knex) {
  return knex.schema.createTable('payees', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('image_url');
    table.text('notes');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    table.index('user_id');
    table.index('name');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('payees');
}
