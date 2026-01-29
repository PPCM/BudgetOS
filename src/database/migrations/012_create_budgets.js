/**
 * @param {import('knex').Knex} knex
 */
export function up(knex) {
  return knex.schema.createTable('budgets', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('category_id', 36)
      .references('id').inTable('categories').onDelete('SET NULL');
    table.string('name').notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.string('period').notNullable();
    table.date('start_date').notNullable();
    table.date('end_date');
    table.boolean('is_active').defaultTo(true);
    table.boolean('rollover').defaultTo(false);
    table.timestamps(true, true);

    table.index('user_id');
    table.index('category_id');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('budgets');
}
