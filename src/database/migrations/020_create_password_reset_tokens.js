/**
 * Create password_reset_tokens table for password recovery
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('password_reset_tokens', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash', 64).notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('used_at').nullable();
    table.timestamps(true, true);

    table.unique('token_hash');
    table.index('user_id');
    table.index('expires_at');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('password_reset_tokens');
}
