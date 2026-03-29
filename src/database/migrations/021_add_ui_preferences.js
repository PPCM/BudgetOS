/**
 * Add UI preference columns to user_settings:
 * - modal_persistent: prevent modals from closing on outside click
 * - projection_expanded: show budget projection expanded by default
 */
export async function up(knex) {
  await knex.schema.alterTable('user_settings', (table) => {
    table.boolean('modal_persistent').defaultTo(false);
    table.boolean('projection_expanded').defaultTo(false);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('user_settings', (table) => {
    table.dropColumn('modal_persistent');
    table.dropColumn('projection_expanded');
  });
}
