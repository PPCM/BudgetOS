/**
 * modelHelpers utilities tests
 */
import { describe, it, expect } from 'vitest';
import { camelToSnake, buildUpdates, paginationMeta } from '../../src/utils/modelHelpers.js';

describe('camelToSnake', () => {
  it('converts camelCase to snake_case', () => {
    expect(camelToSnake('firstName')).toBe('first_name');
    expect(camelToSnake('creditCardId')).toBe('credit_card_id');
    expect(camelToSnake('isActive')).toBe('is_active');
  });

  it('handles already snake_case strings', () => {
    expect(camelToSnake('first_name')).toBe('first_name');
    expect(camelToSnake('name')).toBe('name');
  });

  it('handles single-word strings', () => {
    expect(camelToSnake('name')).toBe('name');
    expect(camelToSnake('id')).toBe('id');
  });

  it('handles multiple consecutive uppercase letters', () => {
    expect(camelToSnake('toJSON')).toBe('to_j_s_o_n');
  });
});

describe('buildUpdates', () => {
  it('filters to allowed fields only', () => {
    const data = { firstName: 'Alice', lastName: 'Smith', role: 'admin' };
    const allowed = ['first_name', 'last_name'];
    const result = buildUpdates(data, allowed);
    expect(result).toEqual({ first_name: 'Alice', last_name: 'Smith' });
    expect(result).not.toHaveProperty('role');
  });

  it('converts boolean values to 0/1', () => {
    const data = { isActive: true, isDeleted: false };
    const allowed = ['is_active', 'is_deleted'];
    const result = buildUpdates(data, allowed);
    expect(result).toEqual({ is_active: 1, is_deleted: 0 });
  });

  it('serializes JSON fields', () => {
    const tags = ['food', 'groceries'];
    const data = { tags, name: 'test' };
    const allowed = ['tags', 'name'];
    const result = buildUpdates(data, allowed, { jsonFields: ['tags'] });
    expect(result.tags).toBe(JSON.stringify(tags));
    expect(result.name).toBe('test');
  });

  it('converts explicit boolean fields to 0/1', () => {
    const data = { executeBeforeHoliday: true, amount: 100 };
    const allowed = ['execute_before_holiday', 'amount'];
    const result = buildUpdates(data, allowed, {
      booleanFields: ['execute_before_holiday'],
    });
    expect(result.execute_before_holiday).toBe(1);
    expect(result.amount).toBe(100);
  });

  it('returns empty object when no fields match', () => {
    const data = { unknown: 'value', other: 42 };
    const allowed = ['name', 'type'];
    const result = buildUpdates(data, allowed);
    expect(result).toEqual({});
  });

  it('handles empty data', () => {
    const result = buildUpdates({}, ['name']);
    expect(result).toEqual({});
  });

  it('handles null and undefined values', () => {
    const data = { name: null, type: undefined };
    const allowed = ['name', 'type'];
    const result = buildUpdates(data, allowed);
    expect(result).toEqual({ name: null, type: undefined });
  });

  it('handles numeric values correctly', () => {
    const data = { amount: 42.5, sortOrder: 0 };
    const allowed = ['amount', 'sort_order'];
    const result = buildUpdates(data, allowed);
    expect(result).toEqual({ amount: 42.5, sort_order: 0 });
  });
});

describe('paginationMeta', () => {
  it('returns correct pagination metadata', () => {
    const result = paginationMeta(1, 50, 200);
    expect(result).toEqual({
      page: 1,
      limit: 50,
      total: 200,
      totalPages: 4,
    });
  });

  it('rounds up totalPages for partial pages', () => {
    const result = paginationMeta(1, 50, 75);
    expect(result).toEqual({
      page: 1,
      limit: 50,
      total: 75,
      totalPages: 2,
    });
  });

  it('handles zero total', () => {
    const result = paginationMeta(1, 50, 0);
    expect(result).toEqual({
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0,
    });
  });

  it('handles total equal to limit', () => {
    const result = paginationMeta(1, 10, 10);
    expect(result).toEqual({
      page: 1,
      limit: 10,
      total: 10,
      totalPages: 1,
    });
  });

  it('handles single item', () => {
    const result = paginationMeta(1, 50, 1);
    expect(result).toEqual({
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
    });
  });
});
