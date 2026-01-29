/**
 * Shared utilities for model data conversion and pagination.
 */

/**
 * Convert a camelCase string to snake_case for database columns.
 * @param {string} str - camelCase string
 * @returns {string} snake_case string
 */
export function camelToSnake(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Filter and convert incoming data to allowed DB fields.
 * Handles camelCase to snake_case conversion, boolean to int, and JSON serialization.
 * @param {Object} data - Input data object (camelCase keys)
 * @param {string[]} allowedFields - List of allowed snake_case DB column names
 * @param {Object} [options={}]
 * @param {string[]} [options.jsonFields=[]] - Fields that need JSON.stringify
 * @param {string[]} [options.booleanFields=[]] - Fields that are explicitly boolean (converted to 0/1)
 * @returns {Object} Filtered object with snake_case keys ready for DB insert/update
 */
export function buildUpdates(data, allowedFields, options = {}) {
  const { jsonFields = [], booleanFields = [] } = options;
  const updates = {};

  for (const [key, value] of Object.entries(data)) {
    const dbKey = camelToSnake(key);
    if (!allowedFields.includes(dbKey)) continue;

    if (jsonFields.includes(dbKey)) {
      updates[dbKey] = JSON.stringify(value);
    } else if (booleanFields.includes(dbKey) || typeof value === 'boolean') {
      updates[dbKey] = value ? 1 : 0;
    } else {
      updates[dbKey] = value;
    }
  }

  return updates;
}

/**
 * Build standard pagination response metadata.
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total item count
 * @returns {{ page: number, limit: number, total: number, totalPages: number }}
 */
export function paginationMeta(page, limit, total) {
  const t = Number(total);
  return { page, limit, total: t, totalPages: Math.ceil(t / limit) };
}
