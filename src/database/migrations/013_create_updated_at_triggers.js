import dateHelpers from '../dateHelpers.js';

const tablesWithUpdatedAt = [
  'users', 'accounts', 'transactions', 'credit_cards', 'credit_card_cycles',
  'categories', 'planned_transactions', 'imports', 'rules', 'budgets', 'user_settings',
];

/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  const dialect = dateHelpers.getDialect(knex);

  if (dialect === 'sqlite') {
    // SQLite: create triggers for updated_at
    for (const table of tablesWithUpdatedAt) {
      await knex.raw(`
        CREATE TRIGGER IF NOT EXISTS update_${table}_timestamp
        AFTER UPDATE ON ${table}
        BEGIN
          UPDATE ${table} SET updated_at = datetime('now') WHERE id = NEW.id;
        END
      `);
    }
  } else if (dialect === 'mysql') {
    // MySQL/MariaDB: use ON UPDATE CURRENT_TIMESTAMP via column modification
    for (const table of tablesWithUpdatedAt) {
      const hasColumn = await knex.schema.hasColumn(table, 'updated_at');
      if (hasColumn) {
        await knex.raw(`
          ALTER TABLE \`${table}\`
          MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        `);
      }
    }
  } else if (dialect === 'pg') {
    // PostgreSQL: create a function + trigger
    await knex.raw(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    for (const table of tablesWithUpdatedAt) {
      await knex.raw(`
        DROP TRIGGER IF EXISTS update_${table}_timestamp ON ${table}
      `);
      await knex.raw(`
        CREATE TRIGGER update_${table}_timestamp
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
      `);
    }
  }
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  const dialect = dateHelpers.getDialect(knex);

  if (dialect === 'sqlite') {
    for (const table of tablesWithUpdatedAt) {
      await knex.raw(`DROP TRIGGER IF EXISTS update_${table}_timestamp`);
    }
  } else if (dialect === 'pg') {
    for (const table of tablesWithUpdatedAt) {
      await knex.raw(`DROP TRIGGER IF EXISTS update_${table}_timestamp ON ${table}`);
    }
    await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column()');
  }
  // MySQL: no action needed, column modification is reverted by dropping tables
}
