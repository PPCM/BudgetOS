/**
 * @param {import('knex').Knex} knex
 */
export function up(knex) {
  return knex.schema.createTable('categories', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36)
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('parent_id', 36)
      .references('id').inTable('categories').onDelete('SET NULL');
    table.string('name').notNullable();
    table.string('type').notNullable();
    table.string('icon').defaultTo('tag');
    table.string('color').defaultTo('#6B7280');
    table.boolean('is_system').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.decimal('budget_monthly', 15, 2);
    table.timestamps(true, true);

    table.index('user_id');
    table.index('parent_id');
    table.index('type');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('categories');
}
