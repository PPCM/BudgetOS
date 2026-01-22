/**
 * Migration script to fix HTML entities in existing data
 *
 * This script reverses the incorrect HTML encoding that was applied
 * to text fields by the old sanitizeInput middleware.
 *
 * Run with: node src/database/fix-html-entities.js
 */
import { initDatabase, query, saveDatabase, closeDatabase } from './connection.js'
import logger from '../utils/logger.js'

/**
 * Decode HTML entities back to original characters
 * @param {string} str - String with HTML entities
 * @returns {string} Decoded string
 */
function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return str

  return str
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
  // Note: We keep &lt; and &gt; as they might be intentional
}

/**
 * Fix HTML entities in a specific table and column
 * @param {string} table - Table name
 * @param {string} column - Column name
 * @returns {number} Number of rows updated
 */
function fixColumn(table, column) {
  // Find rows with encoded entities
  const rows = query.all(`
    SELECT id, ${column}
    FROM ${table}
    WHERE ${column} LIKE '%&#x27;%'
       OR ${column} LIKE '%&quot;%'
       OR ${column} LIKE '%&amp;%'
  `)

  let updated = 0
  for (const row of rows) {
    const decoded = decodeHtmlEntities(row[column])
    if (decoded !== row[column]) {
      query.run(`UPDATE ${table} SET ${column} = ? WHERE id = ?`, [decoded, row.id])
      updated++
    }
  }

  return updated
}

async function main() {
  try {
    await initDatabase()
    logger.info('Starting HTML entities fix migration...')

    const fixes = [
      // Transactions
      { table: 'transactions', column: 'description' },
      { table: 'transactions', column: 'notes' },

      // Categories
      { table: 'categories', column: 'name' },

      // Payees
      { table: 'payees', column: 'name' },
      { table: 'payees', column: 'notes' },

      // Accounts
      { table: 'accounts', column: 'name' },
      { table: 'accounts', column: 'notes' },

      // Planned transactions
      { table: 'planned_transactions', column: 'description' },
      { table: 'planned_transactions', column: 'notes' },

      // Users
      { table: 'users', column: 'first_name' },
      { table: 'users', column: 'last_name' },

      // Credit cards
      { table: 'credit_cards', column: 'name' },
      { table: 'credit_cards', column: 'notes' },
    ]

    let totalUpdated = 0

    for (const { table, column } of fixes) {
      try {
        const updated = fixColumn(table, column)
        if (updated > 0) {
          logger.info(`Fixed ${updated} rows in ${table}.${column}`)
          totalUpdated += updated
        }
      } catch (err) {
        // Column might not exist, skip
        logger.warn(`Skipping ${table}.${column}: ${err.message}`)
      }
    }

    saveDatabase()
    logger.info(`Migration complete. Total rows fixed: ${totalUpdated}`)

  } catch (error) {
    logger.error('Migration failed', { error: error.message })
    process.exit(1)
  } finally {
    closeDatabase()
  }
}

main()
