/**
 * Add index on transactions.recurring_id for faster lookups
 * during forecast deduplication and reconciliation queries
 */
export async function up(knex) {
  await knex.schema.alterTable('transactions', (table) => {
    table.index('recurring_id');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('transactions', (table) => {
    table.dropIndex('recurring_id');
  });
}
