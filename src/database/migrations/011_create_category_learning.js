/**
 * @param {import('knex').Knex} knex
 */
export function up(knex) {
  return knex.schema.createTable('category_learning', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.text('pattern').notNullable();
    table.string('category_id', 36).notNullable()
      .references('id').inTable('categories').onDelete('CASCADE');
    table.decimal('confidence', 5, 2).defaultTo(1.0);
    table.integer('times_used').defaultTo(1);
    table.timestamp('last_used_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'pattern']);
    table.index('user_id');
    table.index('pattern');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('category_learning');
}
