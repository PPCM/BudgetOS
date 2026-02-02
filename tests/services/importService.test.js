import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { ImportService } from '../../src/services/importService.js';

/**
 * Build an Excel buffer with ExcelJS for testing parseExcel().
 * @param {Array<Array>} rows - Array of rows (each row is an array of cell values)
 * @returns {Promise<Buffer>}
 */
async function buildExcelBuffer(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  for (const row of rows) {
    sheet.addRow(row);
  }
  return workbook.xlsx.writeBuffer();
}

describe('ImportService.parseExcel', () => {
  it('should parse a basic Excel file with header row', async () => {
    const buffer = await buildExcelBuffer([
      ['Date', 'Amount', 'Description'],
      ['15/01/2025', 100.50, 'Salary payment'],
      ['16/01/2025', -25.00, 'Grocery store'],
    ]);

    const result = await ImportService.parseExcel(buffer, {
      columns: { date: 0, amount: 1, description: 2 },
      hasHeader: true,
      dateFormat: 'dd/MM/yyyy',
    });

    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2025-01-15');
    expect(result[0].amount).toBe(100.50);
    expect(result[0].description).toBe('Salary payment');
    expect(result[1].date).toBe('2025-01-16');
    expect(result[1].amount).toBe(-25.00);
    expect(result[1].description).toBe('Grocery store');
  });

  it('should parse without header row', async () => {
    const buffer = await buildExcelBuffer([
      ['10/02/2025', 50, 'Test'],
    ]);

    const result = await ImportService.parseExcel(buffer, {
      columns: { date: 0, amount: 1, description: 2 },
      hasHeader: false,
      dateFormat: 'dd/MM/yyyy',
    });

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2025-02-10');
    expect(result[0].amount).toBe(50);
  });

  it('should handle column letters (A, B, C)', async () => {
    const buffer = await buildExcelBuffer([
      ['Date', 'Amount', 'Description'],
      ['20/03/2025', 200, 'Payment'],
    ]);

    const result = await ImportService.parseExcel(buffer, {
      columns: { date: 'A', amount: 'B', description: 'C' },
      hasHeader: true,
      dateFormat: 'dd/MM/yyyy',
    });

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2025-03-20');
    expect(result[0].amount).toBe(200);
    expect(result[0].description).toBe('Payment');
  });

  it('should skip rows when skipRows is set', async () => {
    const buffer = await buildExcelBuffer([
      ['Some bank header info'],
      ['Date', 'Amount', 'Description'],
      ['01/04/2025', 75, 'Skipped header'],
    ]);

    const result = await ImportService.parseExcel(buffer, {
      columns: { date: 0, amount: 1, description: 2 },
      hasHeader: true,
      skipRows: 1,
      dateFormat: 'dd/MM/yyyy',
    });

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(75);
  });

  it('should invert amounts when invertAmounts is true', async () => {
    const buffer = await buildExcelBuffer([
      ['Date', 'Amount', 'Description'],
      ['05/05/2025', 100, 'Inverted'],
    ]);

    const result = await ImportService.parseExcel(buffer, {
      columns: { date: 0, amount: 1, description: 2 },
      hasHeader: true,
      dateFormat: 'dd/MM/yyyy',
      invertAmounts: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(-100);
  });

  it('should handle Date objects in cells', async () => {
    const buffer = await buildExcelBuffer([
      ['Date', 'Amount', 'Description'],
      [new Date(2025, 5, 15), 42, 'Date object'],
    ]);

    const result = await ImportService.parseExcel(buffer, {
      columns: { date: 0, amount: 1, description: 2 },
      hasHeader: true,
      dateFormat: 'dd/MM/yyyy',
    });

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2025-06-15');
    expect(result[0].amount).toBe(42);
  });

  it('should filter out rows with invalid dates', async () => {
    const buffer = await buildExcelBuffer([
      ['Date', 'Amount', 'Description'],
      ['15/01/2025', 100, 'Valid'],
      ['not-a-date', 50, 'Invalid date'],
    ]);

    const result = await ImportService.parseExcel(buffer, {
      columns: { date: 0, amount: 1, description: 2 },
      hasHeader: true,
      dateFormat: 'dd/MM/yyyy',
    });

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Valid');
  });

  it('should generate hash for each row', async () => {
    const buffer = await buildExcelBuffer([
      ['Date', 'Amount', 'Description'],
      ['01/01/2025', 10, 'Test hash'],
    ]);

    const result = await ImportService.parseExcel(buffer, {
      columns: { date: 0, amount: 1, description: 2 },
      hasHeader: true,
      dateFormat: 'dd/MM/yyyy',
    });

    expect(result[0].hash).toBeDefined();
    expect(typeof result[0].hash).toBe('string');
    expect(result[0].hash).toHaveLength(32); // MD5 hex
  });

  it('should assign correct rowIndex values', async () => {
    const buffer = await buildExcelBuffer([
      ['Date', 'Amount', 'Description'],
      ['01/01/2025', 10, 'Row 1'],
      ['02/01/2025', 20, 'Row 2'],
      ['03/01/2025', 30, 'Row 3'],
    ]);

    const result = await ImportService.parseExcel(buffer, {
      columns: { date: 0, amount: 1, description: 2 },
      hasHeader: true,
      dateFormat: 'dd/MM/yyyy',
    });

    expect(result[0].rowIndex).toBe(2);
    expect(result[1].rowIndex).toBe(3);
    expect(result[2].rowIndex).toBe(4);
  });
});
