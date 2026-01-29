/**
 * @param {import('knex').Knex} knex
 */
export function up(knex) {
  return knex.schema.createTable('rules', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.integer('priority').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    // Conditions (JSON)
    table.text('conditions').notNullable();
    // Actions
    table.string('action_category_id', 36)
      .references('id').inTable('categories').onDelete('SET NULL');
    table.text('action_tags');
    table.text('action_notes');
    // Statistics
    table.integer('times_applied').defaultTo(0);
    table.timestamp('last_applied_at');
    table.timestamps(true, true);

    table.index('user_id');
    table.index('priority');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('rules');
}
