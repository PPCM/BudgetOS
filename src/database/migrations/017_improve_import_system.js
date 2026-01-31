/**
 * @param {import('knex').Knex} knex
 */
export function up(knex) {
  return knex.schema
    .createTable('payee_aliases', (table) => {
      table.string('id', 36).primary();
      table.string('user_id', 36).notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.string('payee_id', 36).notNullable()
        .references('id').inTable('payees').onDelete('CASCADE');
      table.text('bank_description').notNullable();
      table.text('normalized_pattern').notNullable();
      table.string('source').defaultTo('import_learn');
      table.integer('times_matched').defaultTo(1);
      table.timestamp('last_matched_at');
      table.timestamps(true, true);

      table.unique(['user_id', 'normalized_pattern']);
      table.index('user_id');
      table.index('payee_id');
    })
    .then(() => {
      return knex.schema.alterTable('imports', (table) => {
        table.text('parsed_data');
        table.text('match_results');
        table.integer('matched_count').defaultTo(0);
      });
    });
}

/**
 * @param {import('knex').Knex} knex
 */
export function down(knex) {
  return knex.schema
    .dropTableIfExists('payee_aliases')
    .then(() => {
      return knex.schema.alterTable('imports', (table) => {
        table.dropColumn('parsed_data');
        table.dropColumn('match_results');
        table.dropColumn('matched_count');
      });
    });
}
