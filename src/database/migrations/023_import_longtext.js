/**
 * Widen imports.parsed_data and imports.match_results to LONGTEXT on MySQL/MariaDB.
 * MySQL/MariaDB TEXT is limited to 64 KB, which large imports (a few hundred rows)
 * can exceed, causing insert errors or truncation ("Corrupted analysis results").
 * SQLite and PostgreSQL TEXT is already unbounded, so this only runs on MySQL/MariaDB.
 */
function isMysql(knex) {
  const client = knex.client?.config?.client || '';
  return client.includes('mysql') || client.includes('maria');
}

export async function up(knex) {
  if (!isMysql(knex)) return;
  await knex.schema.alterTable('imports', (table) => {
    table.text('parsed_data', 'longtext').alter();
    table.text('match_results', 'longtext').alter();
  });
}

export async function down(knex) {
  if (!isMysql(knex)) return;
  await knex.schema.alterTable('imports', (table) => {
    table.text('parsed_data').alter();
    table.text('match_results').alter();
  });
}
