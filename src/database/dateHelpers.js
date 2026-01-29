/**
 * Portable SQL date helpers for cross-database compatibility.
 * Generates the appropriate SQL expressions for SQLite, MySQL/MariaDB and PostgreSQL.
 */

/**
 * Detect the database client type from a Knex instance.
 * @param {import('knex').Knex} knex
 * @returns {'sqlite'|'mysql'|'pg'}
 */
function getDialect(knex) {
  const client = knex.client?.config?.client || knex.client?.constructor?.name || '';
  if (client.includes('sqlite') || client.includes('better-sqlite')) return 'sqlite';
  if (client.includes('mysql') || client.includes('maria')) return 'mysql';
  return 'pg';
}

/**
 * Returns a raw expression for the current timestamp.
 */
export function now(knex) {
  return knex.fn.now();
}

/**
 * Returns a raw expression for the current date (without time).
 */
export function currentDate(knex) {
  const dialect = getDialect(knex);
  switch (dialect) {
    case 'sqlite': return knex.raw("date('now')");
    case 'mysql': return knex.raw('CURDATE()');
    case 'pg': return knex.raw('CURRENT_DATE');
  }
}

/**
 * Returns a raw expression for date + N interval.
 * @param {string} column - Column name or raw date expression
 * @param {number} amount - Number of units to add
 * @param {'days'|'months'|'years'} unit
 */
export function dateAdd(knex, column, amount, unit) {
  const dialect = getDialect(knex);
  const unitMap = { days: 'days', months: 'months', years: 'years' };
  switch (dialect) {
    case 'sqlite':
      return knex.raw(`date(${column}, '+${amount} ${unitMap[unit]}')`);
    case 'mysql':
      return knex.raw(`DATE_ADD(${column}, INTERVAL ${amount} ${unit.toUpperCase().replace(/S$/, '')})`);
    case 'pg':
      return knex.raw(`(${column} + INTERVAL '${amount} ${unit}')`);
  }
}

/**
 * Returns a raw expression for date - N interval.
 */
export function dateSub(knex, column, amount, unit) {
  const dialect = getDialect(knex);
  const unitMap = { days: 'days', months: 'months', years: 'years' };
  switch (dialect) {
    case 'sqlite':
      return knex.raw(`date(${column}, '-${amount} ${unitMap[unit]}')`);
    case 'mysql':
      return knex.raw(`DATE_SUB(${column}, INTERVAL ${amount} ${unit.toUpperCase().replace(/S$/, '')})`);
    case 'pg':
      return knex.raw(`(${column} - INTERVAL '${amount} ${unit}')`);
  }
}

/**
 * Returns a raw expression for the start of the current month.
 */
export function startOfMonth(knex) {
  const dialect = getDialect(knex);
  switch (dialect) {
    case 'sqlite': return knex.raw("date('now', 'start of month')");
    case 'mysql': return knex.raw("DATE_FORMAT(CURDATE(), '%Y-%m-01')");
    case 'pg': return knex.raw("DATE_TRUNC('month', CURRENT_DATE)::date");
  }
}

/**
 * Returns a raw expression for the start of the current year.
 */
export function startOfYear(knex) {
  const dialect = getDialect(knex);
  switch (dialect) {
    case 'sqlite': return knex.raw("date('now', 'start of year')");
    case 'mysql': return knex.raw("DATE_FORMAT(CURDATE(), '%Y-01-01')");
    case 'pg': return knex.raw("DATE_TRUNC('year', CURRENT_DATE)::date");
  }
}

/**
 * Returns a raw expression for the current year as integer.
 */
export function yearNow(knex) {
  const dialect = getDialect(knex);
  switch (dialect) {
    case 'sqlite': return knex.raw("CAST(strftime('%Y', 'now') AS INTEGER)");
    case 'mysql': return knex.raw('YEAR(CURDATE())');
    case 'pg': return knex.raw("EXTRACT(YEAR FROM CURRENT_DATE)::integer");
  }
}

/**
 * Returns a raw expression for the current month as integer.
 */
export function monthNow(knex) {
  const dialect = getDialect(knex);
  switch (dialect) {
    case 'sqlite': return knex.raw("CAST(strftime('%m', 'now') AS INTEGER)");
    case 'mysql': return knex.raw('MONTH(CURDATE())');
    case 'pg': return knex.raw("EXTRACT(MONTH FROM CURRENT_DATE)::integer");
  }
}

/**
 * Returns a raw expression for the number of days between two date expressions.
 * Result is: date2 - date1 (positive if date2 > date1).
 */
export function daysBetween(knex, date1, date2) {
  const dialect = getDialect(knex);
  switch (dialect) {
    case 'sqlite':
      return knex.raw(`(julianday(${date2}) - julianday(${date1}))`);
    case 'mysql':
      return knex.raw(`DATEDIFF(${date2}, ${date1})`);
    case 'pg':
      return knex.raw(`(${date2}::date - ${date1}::date)`);
  }
}

/**
 * Returns a raw expression for substring.
 */
export function substr(knex, column, start, length) {
  const dialect = getDialect(knex);
  switch (dialect) {
    case 'sqlite': return knex.raw(`SUBSTR(${column}, ${start}, ${length})`);
    case 'mysql': return knex.raw(`SUBSTRING(${column}, ${start}, ${length})`);
    case 'pg': return knex.raw(`SUBSTRING(${column} FROM ${start} FOR ${length})`);
  }
}

/**
 * Returns a raw expression for string concatenation.
 */
export function concat(knex, ...parts) {
  const dialect = getDialect(knex);
  const joined = parts.join(', ');
  switch (dialect) {
    case 'sqlite': return knex.raw(parts.join(' || '));
    case 'mysql': return knex.raw(`CONCAT(${joined})`);
    case 'pg': return knex.raw(`CONCAT(${joined})`);
  }
}

/**
 * Returns a raw expression for COALESCE with empty string fallback.
 * Useful for replacing the SQLite pattern: COALESCE(col, "") || value
 */
export function coalesceEmpty(knex, column) {
  const dialect = getDialect(knex);
  switch (dialect) {
    case 'sqlite': return knex.raw(`COALESCE(${column}, '')`);
    case 'mysql': return knex.raw(`COALESCE(${column}, '')`);
    case 'pg': return knex.raw(`COALESCE(${column}, '')`);
  }
}

/**
 * Returns a raw date filtering expression for "last N days".
 */
export function dateWithinLastDays(knex, column, days) {
  const dialect = getDialect(knex);
  switch (dialect) {
    case 'sqlite': return knex.raw(`${column} >= date('now', '-${days} days')`);
    case 'mysql': return knex.raw(`${column} >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)`);
    case 'pg': return knex.raw(`${column} >= CURRENT_DATE - INTERVAL '${days} days'`);
  }
}

/**
 * Returns a raw date filtering expression for "within next N days".
 */
export function dateWithinNextDays(knex, column, days) {
  const dialect = getDialect(knex);
  switch (dialect) {
    case 'sqlite': return knex.raw(`${column} <= date('now', '+${days} days')`);
    case 'mysql': return knex.raw(`${column} <= DATE_ADD(CURDATE(), INTERVAL ${days} DAY)`);
    case 'pg': return knex.raw(`${column} <= CURRENT_DATE + INTERVAL '${days} days'`);
  }
}

/**
 * Returns a raw expression for a date range between now and +N days.
 */
export function dateBetweenNowAndDays(knex, column, days) {
  const dialect = getDialect(knex);
  switch (dialect) {
    case 'sqlite': return knex.raw(`${column} BETWEEN date('now') AND date('now', '+${days} days')`);
    case 'mysql': return knex.raw(`${column} BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ${days} DAY)`);
    case 'pg': return knex.raw(`${column} BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'`);
  }
}

/**
 * Returns the appropriate NULLS LAST sort expression.
 */
export function nullsLast(knex, column, direction = 'ASC') {
  const dialect = getDialect(knex);
  const dir = direction.toUpperCase();
  switch (dialect) {
    case 'sqlite':
      // SQLite does not support NULLS LAST natively
      return knex.raw(`(CASE WHEN ${column} IS NULL THEN 1 ELSE 0 END), ${column} ${dir}`);
    case 'mysql':
      // MySQL sorts NULLs first for ASC, last for DESC. For consistent NULLS LAST:
      return knex.raw(`(CASE WHEN ${column} IS NULL THEN 1 ELSE 0 END), ${column} ${dir}`);
    case 'pg':
      return knex.raw(`${column} ${dir} NULLS LAST`);
  }
}

/**
 * Returns a date tolerance range expression for reconciliation matching.
 * e.g., date BETWEEN date(?, '-N days') AND date(?, '+N days')
 */
export function dateTolerance(knex, column, dateParam, toleranceDays) {
  const dialect = getDialect(knex);
  switch (dialect) {
    case 'sqlite':
      return knex.raw(`${column} BETWEEN date(?, '-${toleranceDays} days') AND date(?, '+${toleranceDays} days')`, [dateParam, dateParam]);
    case 'mysql':
      return knex.raw(`${column} BETWEEN DATE_SUB(?, INTERVAL ${toleranceDays} DAY) AND DATE_ADD(?, INTERVAL ${toleranceDays} DAY)`, [dateParam, dateParam]);
    case 'pg':
      return knex.raw(`${column} BETWEEN (?::date - INTERVAL '${toleranceDays} days') AND (?::date + INTERVAL '${toleranceDays} days')`, [dateParam, dateParam]);
  }
}

/**
 * Returns a raw expression for ordering by absolute date distance from a reference date.
 */
export function absDateDistance(knex, column, dateParam) {
  const dialect = getDialect(knex);
  switch (dialect) {
    case 'sqlite':
      return knex.raw(`ABS(julianday(${column}) - julianday(?))`, [dateParam]);
    case 'mysql':
      return knex.raw(`ABS(DATEDIFF(${column}, ?))`, [dateParam]);
    case 'pg':
      return knex.raw(`ABS(${column}::date - ?::date)`, [dateParam]);
  }
}

/**
 * Returns a raw expression for casting a value to integer.
 */
export function castInt(knex, expression) {
  const dialect = getDialect(knex);
  switch (dialect) {
    case 'sqlite': return knex.raw(`CAST(${expression} AS INTEGER)`);
    case 'mysql': return knex.raw(`CAST(${expression} AS SIGNED)`);
    case 'pg': return knex.raw(`CAST(${expression} AS INTEGER)`);
  }
}

export default {
  getDialect,
  now,
  currentDate,
  dateAdd,
  dateSub,
  startOfMonth,
  startOfYear,
  yearNow,
  monthNow,
  daysBetween,
  substr,
  concat,
  coalesceEmpty,
  dateWithinLastDays,
  dateWithinNextDays,
  dateBetweenNowAndDays,
  nullsLast,
  dateTolerance,
  absDateDistance,
  castInt,
};
