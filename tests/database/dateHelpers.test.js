/**
 * dateHelpers utilities tests
 */
import { describe, it, expect, vi } from 'vitest';
import dateHelpers from '../../src/database/dateHelpers.js';

/**
 * Create a minimal mock knex instance for a given database client.
 */
function mockKnex(clientName) {
  return {
    client: { config: { client: clientName } },
    fn: { now: () => 'NOW()' },
    raw: (sql, bindings) => ({ sql, bindings, toString: () => sql }),
  };
}

describe('yearMonth', () => {
  it('returns SQLite strftime expression for better-sqlite3', () => {
    const k = mockKnex('better-sqlite3');
    const result = dateHelpers.yearMonth(k, 'date');
    expect(result).toBe("strftime('%Y-%m', date)");
  });

  it('returns MySQL DATE_FORMAT expression for mysql2', () => {
    const k = mockKnex('mysql2');
    const result = dateHelpers.yearMonth(k, 'date');
    expect(result).toBe("DATE_FORMAT(date, '%Y-%m')");
  });

  it('returns PostgreSQL TO_CHAR expression for pg', () => {
    const k = mockKnex('pg');
    const result = dateHelpers.yearMonth(k, 'date');
    expect(result).toBe("TO_CHAR(date, 'YYYY-MM')");
  });

  it('works with custom column names', () => {
    const k = mockKnex('better-sqlite3');
    const result = dateHelpers.yearMonth(k, 't.created_at');
    expect(result).toBe("strftime('%Y-%m', t.created_at)");
  });
});

describe('getDialect', () => {
  it('detects sqlite dialect', () => {
    expect(dateHelpers.getDialect(mockKnex('better-sqlite3'))).toBe('sqlite');
    expect(dateHelpers.getDialect(mockKnex('sqlite3'))).toBe('sqlite');
  });

  it('detects mysql dialect', () => {
    expect(dateHelpers.getDialect(mockKnex('mysql2'))).toBe('mysql');
    expect(dateHelpers.getDialect(mockKnex('mariadb'))).toBe('mysql');
  });

  it('defaults to pg dialect', () => {
    expect(dateHelpers.getDialect(mockKnex('pg'))).toBe('pg');
    expect(dateHelpers.getDialect(mockKnex('postgresql'))).toBe('pg');
  });
});
