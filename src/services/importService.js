import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import knex from '../database/connection.js';
import { generateId, normalizeDescription, calculateMatchScore, formatDateISO } from '../utils/helpers.js';
import { BadRequestError } from '../utils/errors.js';
import Transaction from '../models/Transaction.js';
import Rule from '../models/Rule.js';
import PayeeAlias from '../models/PayeeAlias.js';
import { CreditCard } from '../models/CreditCard.js';
import { analyzeBankDescription } from '../utils/bankPatterns.js';
import crypto from 'crypto';
import { parse as parseDate, isValid, subDays, addDays } from 'date-fns';

export class ImportService {
  /**
   * Analyze an import file: parse, enrich with bank patterns, find matches.
   * Stores results in the database so the file can be deleted immediately.
   * @param {string} userId
   * @param {string} accountId
   * @param {Object} file - Multer file object
   * @param {string} fileType - csv, excel, qif, qfx, ofx
   * @param {Object} config - Parsing configuration
   * @returns {Object} { importId, transactions, summary, creditCardsDetected }
   */
  static async analyzeImport(userId, accountId, file, fileType, config = {}) {
    // Create import record
    const importId = generateId();
    await knex('imports').insert({
      id: importId,
      user_id: userId,
      account_id: accountId,
      filename: file.originalname || file.filename,
      file_type: fileType,
      file_size: file.size,
      status: 'analyzing',
    });

    // Parse file
    const parsedTxs = await ImportService.parseFile(file.path, fileType, config);

    // Enrich with bank pattern analysis
    const enrichedTxs = await ImportService.enrichTransactions(userId, accountId, parsedTxs);

    // Find matches with existing transactions
    const matchResults = await ImportService.findMatches(userId, accountId, enrichedTxs);

    // Build summary
    const summary = {
      total: matchResults.length,
      new: matchResults.filter(m => m.matchType === 'new').length,
      duplicates: matchResults.filter(m => m.matchType === 'duplicate').length,
      matches: matchResults.filter(m => ['exact', 'probable'].includes(m.matchType)).length,
    };

    // Collect detected credit cards
    const creditCardsDetected = {};
    for (const tx of matchResults) {
      if (tx.cbLast4) {
        if (!creditCardsDetected[tx.cbLast4]) {
          creditCardsDetected[tx.cbLast4] = {
            last4: tx.cbLast4,
            creditCardId: tx.creditCardId || null,
            creditCardName: tx.creditCardName || null,
            count: 0,
          };
        }
        creditCardsDetected[tx.cbLast4].count++;
      }
    }

    // Store parsed data and match results in DB (so file can be deleted)
    await knex('imports').where('id', importId).update({
      status: 'analyzed',
      total_rows: matchResults.length,
      matched_count: summary.matches + summary.duplicates,
      parsed_data: JSON.stringify(enrichedTxs),
      match_results: JSON.stringify(matchResults),
    });

    // Delete temporary file
    try {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (e) {
      // Non-critical: file cleanup failure
    }

    return {
      importId,
      transactions: matchResults,
      summary,
      creditCardsDetected: Object.values(creditCardsDetected),
    };
  }

  /**
   * Enrich parsed transactions with bank pattern analysis and payee alias matching.
   * @param {string} userId
   * @param {string} accountId
   * @param {Array} parsedTxs - Parsed transactions from file
   * @returns {Array} Enriched transactions
   */
  static async enrichTransactions(userId, accountId, parsedTxs) {
    // Load user credit cards
    const creditCards = await CreditCard.findByUser(userId, { includeBalances: false });

    return Promise.all(parsedTxs.map(async (tx) => {
      const analysis = analyzeBankDescription(tx.description);
      const enriched = { ...tx, ...analysis };

      // Match CB card number to user's credit cards
      if (analysis.cbLast4) {
        const matchedCard = creditCards.find(
          cc => cc.cardNumberLast4 === analysis.cbLast4
        );
        if (matchedCard) {
          enriched.creditCardId = matchedCard.id;
          enriched.creditCardName = matchedCard.name;
        }
      }

      // Match merchant pattern to known payee aliases
      if (analysis.merchantPattern) {
        const aliasMatch = await PayeeAlias.findBestMatch(userId, analysis.merchantPattern);
        if (aliasMatch) {
          enriched.suggestedPayeeId = aliasMatch.payeeId;
          enriched.suggestedPayeeName = aliasMatch.payeeName;
        }
      }

      return enriched;
    }));
  }

  /**
   * Find matches between imported transactions and existing ones.
   * Uses date range filtering instead of arbitrary limit.
   */
  static async findMatches(userId, accountId, importedTxs, options = {}) {
    const { dateTolerance = 2, amountTolerance = 0.01 } = options;

    if (importedTxs.length === 0) return [];

    // Compute date range from imported transactions
    const dates = importedTxs.map(tx => new Date(tx.date)).filter(d => !isNaN(d));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    const rangeStart = formatDateISO(subDays(minDate, 30));
    const rangeEnd = formatDateISO(addDays(maxDate, 30));

    const existingTxs = await knex('transactions as t')
      .leftJoin('payees as p', 't.payee_id', 'p.id')
      .where({ 't.user_id': userId, 't.account_id': accountId })
      .whereNot('t.status', 'void')
      .where('t.date', '>=', rangeStart)
      .where('t.date', '<=', rangeEnd)
      .select('t.*', 'p.name as payee_name')
      .orderBy('t.date', 'desc');

    return importedTxs.map(imported => {
      // Check for exact duplicate by hash (includes reconciled transactions)
      const duplicate = existingTxs.find(tx => tx.import_hash === imported.hash);
      if (duplicate) {
        return { ...imported, matchType: 'duplicate', matchedTransaction: ImportService.formatExistingTx(duplicate) };
      }

      // Find potential matches within tolerances (excludes reconciled transactions)
      const candidates = existingTxs.filter(tx => {
        if (tx.is_reconciled) return false;
        const daysDiff = Math.abs((new Date(imported.date) - new Date(tx.date)) / 86400000);
        const importAbs = Math.abs(imported.amount);
        const txAbs = Math.abs(tx.amount);
        if (importAbs === 0) return false;
        const amountDiff = Math.abs(importAbs - txAbs) / importAbs;
        return daysDiff <= dateTolerance && amountDiff <= amountTolerance;
      });

      if (candidates.length > 0) {
        const scored = candidates.map(tx => ({ tx, score: calculateMatchScore(imported, tx) }))
          .sort((a, b) => b.score - a.score);
        const best = scored[0];
        if (best.score >= 80) {
          return { ...imported, matchType: 'exact', matchedTransaction: ImportService.formatExistingTx(best.tx), score: best.score };
        }
        if (best.score >= 50) {
          return { ...imported, matchType: 'probable', matchedTransaction: ImportService.formatExistingTx(best.tx), score: best.score };
        }
      }

      return { ...imported, matchType: 'new', matchedTransaction: null };
    });
  }

  /**
   * Format an existing transaction for match display
   */
  static formatExistingTx(tx) {
    return {
      id: tx.id,
      date: tx.date,
      amount: Number(tx.amount),
      description: tx.description,
      payeeId: tx.payee_id,
      payeeName: tx.payee_name || null,
      categoryId: tx.category_id,
      isReconciled: Boolean(tx.is_reconciled),
    };
  }

  /**
   * Confirm an import by applying user-defined actions.
   * Reads match_results from the DB (file already deleted).
   * @param {string} userId
   * @param {string} importId
   * @param {Object} actions - Record<rowIndex, { action, payeeId?, creditCardId?, merchantPattern?, categoryId?, description? }>
   * @param {boolean} autoCategories - Auto-categorize new transactions using rules
   * @returns {Object} { imported, matched, skipped, aliasesLearned, errors, errorDetails }
   */
  static async confirmImport(userId, importId, actions, autoCategories = true) {
    const imp = await knex('imports').where({ id: importId, user_id: userId }).first();
    if (!imp) throw new BadRequestError('Import non trouvé');
    if (imp.status !== 'analyzed') throw new BadRequestError('Import pas encore analysé ou déjà confirmé');

    // Read stored match results
    let matchResults;
    try {
      matchResults = JSON.parse(imp.match_results);
    } catch (e) {
      throw new BadRequestError('Résultats d\'analyse corrompus');
    }

    // Build a lookup by rowIndex for quick access
    const txByIndex = {};
    matchResults.forEach((tx, i) => {
      txByIndex[String(i)] = tx;
    });

    await knex('imports').where('id', importId).update({
      status: 'processing',
      started_at: knex.fn.now(),
    });

    let imported = 0, matched = 0, skipped = 0, aliasesLearned = 0, errors = 0;
    const errorDetails = [];

    for (const [rowId, action] of Object.entries(actions)) {
      try {
        const txData = txByIndex[rowId];
        if (!txData) continue;

        if (action.action === 'skip') {
          skipped++;
          continue;
        }

        if (action.action === 'match' && action.matchedTransactionId) {
          await knex('transactions').where({ id: action.matchedTransactionId, user_id: userId })
            .update({ is_reconciled: true, reconciled_at: knex.fn.now() });
          matched++;
        } else if (action.action === 'create') {
          // Determine category
          let categoryId = action.categoryId || null;
          if (autoCategories && !categoryId) {
            const rule = await Rule.matchTransaction(userId, txData);
            if (rule) categoryId = rule.actionCategoryId;
          }

          const newTx = await Transaction.create(userId, {
            accountId: imp.account_id,
            categoryId,
            payeeId: action.payeeId || txData.suggestedPayeeId || null,
            creditCardId: action.creditCardId || txData.creditCardId || null,
            amount: txData.amount,
            description: action.description || txData.description,
            date: txData.date,
            valueDate: txData.valueDate || null,
            purchaseDate: txData.purchaseDate || null,
            type: txData.amount >= 0 ? 'income' : 'expense',
            status: 'cleared',
            importId,
            importHash: txData.hash,
          });

          // Mark imported transaction as reconciled
          if (newTx) {
            await knex('transactions').where({ id: newTx.id, user_id: userId })
              .update({ is_reconciled: true, reconciled_at: knex.fn.now() });
          }

          // Assign to credit card cycle if deferred card
          const ccId = action.creditCardId || txData.creditCardId;
          if (ccId && newTx) {
            try {
              await CreditCard.assignTransactionToCycle(newTx.id, ccId, userId);
            } catch (e) {
              // Non-critical: cycle assignment failure
            }
          }

          imported++;
        }

        // Learn payee alias if payee was assigned and we have a merchant pattern
        const payeeId = action.payeeId || txData.suggestedPayeeId;
        const merchantPattern = action.merchantPattern || txData.merchantPattern;
        if (payeeId && merchantPattern && action.action !== 'skip') {
          try {
            await PayeeAlias.learnAlias(userId, payeeId, txData.description, merchantPattern);
            aliasesLearned++;
          } catch (e) {
            // Non-critical: alias learning failure
          }
        }
      } catch (err) {
        errors++;
        errorDetails.push({ rowId, error: err.message });
      }
    }

    await knex('imports').where('id', importId).update({
      status: 'completed',
      imported_count: imported,
      matched_count: matched,
      duplicate_count: skipped,
      error_count: errors,
      error_details: errorDetails.length > 0 ? JSON.stringify(errorDetails) : null,
      completed_at: knex.fn.now(),
    });

    return { imported, matched, skipped, aliasesLearned, errors, errorDetails };
  }

  // ---- File parsing methods (unchanged) ----

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
}

export default ImportService;
