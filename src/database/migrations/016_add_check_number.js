/**
 * Add check_number column to transactions table.
 * Stores check/cheque number for expense and income transactions.
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable('transactions', (table) => {
    table.string('check_number', 50).nullable();
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable('transactions', (table) => {
    table.dropColumn('check_number');
  });
}
