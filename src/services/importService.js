import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { query, transaction as dbTransaction } from '../database/connection.js';
import { generateId, normalizeDescription, calculateMatchScore, formatDateISO } from '../utils/helpers.js';
import { BadRequestError } from '../utils/errors.js';
import Transaction from '../models/Transaction.js';
import Rule from '../models/Rule.js';
import crypto from 'crypto';
import { parse as parseDate, isValid } from 'date-fns';

export class ImportService {
  static async createImport(userId, accountId, file, fileType) {
    const id = generateId();
    query.run(`
      INSERT INTO imports (id, user_id, account_id, filename, file_type, file_size, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [id, userId, accountId, file.filename, fileType, file.size]);
    return id;
  }

  static async parseFile(filePath, fileType, config = {}) {
    const content = fs.readFileSync(filePath);
    
    switch (fileType) {
      case 'csv': return ImportService.parseCSV(content, config);
      case 'excel': return ImportService.parseExcel(content, config);
      case 'qif': return ImportService.parseQIF(content.toString('utf-8'));
      case 'qfx':
      case 'ofx': return ImportService.parseOFX(content.toString('utf-8'));
      default: throw new BadRequestError('Type de fichier non supporté');
    }
  }

  static parseCSV(content, config) {
    const { delimiter = ';', encoding = 'utf-8', hasHeader = true, dateFormat = 'dd/MM/yyyy',
      decimalSeparator = ',', columns, skipRows = 0, invertAmounts = false } = config;
    
    let text = content.toString(encoding === 'utf-8' ? 'utf-8' : 'latin1');
    const records = parse(text, { delimiter, skip_empty_lines: true, from_line: skipRows + 1 });
    
    const dataRows = hasHeader ? records.slice(1) : records;
    return dataRows.map((row, index) => {
      const amount = ImportService.parseAmount(row[columns.amount], decimalSeparator, invertAmounts);
      const date = ImportService.parseLocalDate(row[columns.date], dateFormat);
      
      return {
        rowIndex: index + skipRows + (hasHeader ? 2 : 1),
        date, amount,
        description: row[columns.description]?.trim() || '',
        valueDate: columns.valueDate !== undefined ? ImportService.parseLocalDate(row[columns.valueDate], dateFormat) : null,
        reference: columns.reference !== undefined ? row[columns.reference]?.trim() : null,
        hash: ImportService.generateHash(date, amount, row[columns.description]),
      };
    }).filter(r => r.date && !isNaN(r.amount));
  }

  static parseExcel(content, config) {
    const { sheetIndex = 0, hasHeader = true, dateFormat = 'dd/MM/yyyy', columns, skipRows = 0, invertAmounts = false } = config;
    const workbook = XLSX.read(content, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[sheetIndex]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    const dataRows = data.slice(skipRows + (hasHeader ? 1 : 0));
    const getColIndex = (col) => typeof col === 'string' ? XLSX.utils.decode_col(col) : col;
    
    return dataRows.map((row, index) => {
      const amount = ImportService.parseAmount(row[getColIndex(columns.amount)], '.', invertAmounts);
      let date = row[getColIndex(columns.date)];
      if (date instanceof Date) date = formatDateISO(date);
      else date = ImportService.parseLocalDate(date, dateFormat);
      
      return {
        rowIndex: index + skipRows + (hasHeader ? 2 : 1),
        date, amount,
        description: String(row[getColIndex(columns.description)] || '').trim(),
        hash: ImportService.generateHash(date, amount, row[getColIndex(columns.description)]),
      };
    }).filter(r => r.date && !isNaN(r.amount));
  }

  static parseQIF(content) {
    const transactions = [];
    let current = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (!line) return;
      
      const code = line[0];
      const value = line.substring(1);
      
      switch (code) {
        case 'D': current.date = ImportService.parseLocalDate(value, 'MM/dd/yyyy'); break;
        case 'T':
        case 'U': current.amount = ImportService.parseAmount(value, '.', false); break;
        case 'P': current.description = value; break;
        case 'M': current.notes = value; break;
        case 'N': current.reference = value; break;
        case '^':
          if (current.date && current.amount !== undefined) {
            current.hash = ImportService.generateHash(current.date, current.amount, current.description);
            transactions.push(current);
          }
          current = {};
          break;
      }
    });
    return transactions;
  }

  static parseOFX(content) {
    const transactions = [];
    const txRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;
    
    while ((match = txRegex.exec(content)) !== null) {
      const tx = match[1];
      const getValue = (tag) => {
        const m = tx.match(new RegExp(`<${tag}>([^<\\n]+)`, 'i'));
        return m ? m[1].trim() : null;
      };
      
      const dateStr = getValue('DTPOSTED');
      const date = dateStr ? `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}` : null;
      const amount = parseFloat(getValue('TRNAMT')) || 0;
      const description = getValue('NAME') || getValue('MEMO') || '';
      
      if (date) {
        transactions.push({
          date, amount, description,
          reference: getValue('FITID'),
          hash: ImportService.generateHash(date, amount, description),
        });
      }
    }
    return transactions;
  }

  static parseAmount(value, decimalSeparator, invert) {
    if (typeof value === 'number') return invert ? -value : value;
    let str = String(value).replace(/\s/g, '');
    if (decimalSeparator === ',') str = str.replace(/\./g, '').replace(',', '.');
    else str = str.replace(/,/g, '');
    const amount = parseFloat(str) || 0;
    return invert ? -amount : amount;
  }

  static parseLocalDate(value, format) {
    if (!value) return null;
    if (value instanceof Date) return formatDateISO(value);
    const parsed = parseDate(value, format, new Date());
    return isValid(parsed) ? formatDateISO(parsed) : null;
  }

  static generateHash(date, amount, description) {
    const str = `${date}|${amount}|${normalizeDescription(description)}`;
    return crypto.createHash('md5').update(str).digest('hex');
  }

  static async findMatches(userId, accountId, importedTxs, options = {}) {
    const { dateTolerance = 2, amountTolerance = 0.01 } = options;
    const existingTxs = query.all(`
      SELECT * FROM transactions WHERE user_id = ? AND account_id = ? AND status != 'void'
      ORDER BY date DESC LIMIT 1000
    `, [userId, accountId]);

    return importedTxs.map(imported => {
      // Check for exact duplicate by hash
      const duplicate = existingTxs.find(tx => tx.import_hash === imported.hash);
      if (duplicate) return { ...imported, matchType: 'duplicate', matchedTransaction: duplicate };

      // Find potential matches
      const candidates = existingTxs.filter(tx => {
        const daysDiff = Math.abs((new Date(imported.date) - new Date(tx.date)) / 86400000);
        const amountDiff = Math.abs(Math.abs(imported.amount) - Math.abs(tx.amount)) / Math.abs(imported.amount);
        return daysDiff <= dateTolerance && amountDiff <= amountTolerance;
      });

      if (candidates.length > 0) {
        const scored = candidates.map(tx => ({ tx, score: calculateMatchScore(imported, tx) }))
          .sort((a, b) => b.score - a.score);
        const best = scored[0];
        if (best.score >= 80) return { ...imported, matchType: 'exact', matchedTransaction: best.tx, score: best.score };
        if (best.score >= 50) return { ...imported, matchType: 'probable', matchedTransaction: best.tx, score: best.score };
      }

      return { ...imported, matchType: 'new', matchedTransaction: null };
    });
  }

  static async processImport(userId, importId, actions, autoCategories = true) {
    const imp = query.get('SELECT * FROM imports WHERE id = ? AND user_id = ?', [importId, userId]);
    if (!imp) throw new BadRequestError('Import non trouvé');

    query.run('UPDATE imports SET status = "processing", started_at = datetime("now") WHERE id = ?', [importId]);
    
    let imported = 0, duplicates = 0, errors = 0;
    const errorDetails = [];

    for (const [rowId, action] of Object.entries(actions)) {
      try {
        if (action.action === 'skip') continue;
        if (action.action === 'match' && action.matchedTransactionId) {
          query.run('UPDATE transactions SET is_reconciled = 1, reconciled_at = datetime("now") WHERE id = ?',
            [action.matchedTransactionId]);
          continue;
        }

        const txData = action.transactionData;
        if (!txData) continue;

        // Auto-categorize
        let categoryId = action.categoryId;
        if (autoCategories && !categoryId) {
          const rule = Rule.matchTransaction(userId, txData);
          if (rule) categoryId = rule.actionCategoryId;
        }

        Transaction.create(userId, {
          accountId: imp.account_id, categoryId,
          amount: txData.amount, description: action.description || txData.description,
          date: txData.date, valueDate: txData.valueDate,
          type: txData.amount >= 0 ? 'income' : 'expense',
          status: 'cleared', importId, importHash: txData.hash,
        });
        imported++;
      } catch (err) {
        errors++;
        errorDetails.push({ rowId, error: err.message });
      }
    }

    query.run(`UPDATE imports SET status = 'completed', imported_count = ?, duplicate_count = ?,
      error_count = ?, error_details = ?, completed_at = datetime('now') WHERE id = ?`,
      [imported, duplicates, errors, JSON.stringify(errorDetails), importId]);

    return { imported, duplicates, errors, errorDetails };
  }
}

export default ImportService;
