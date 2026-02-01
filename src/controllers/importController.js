import ImportService from '../services/importService.js';
import knex from '../database/connection.js';
import { BadRequestError } from '../utils/errors.js';
import Transaction from '../models/Transaction.js';
import { matchCandidatesQuerySchema } from '../validators/import.js';

export const analyzeImport = async (req, res) => {
  if (!req.file) throw new BadRequestError('No file provided', 'FILE_REQUIRED');

  const { accountId, fileType, config: importConfig } = req.body;
  if (!accountId) throw new BadRequestError('Destination account required', 'ACCOUNT_ID_REQUIRED');
  if (!fileType) throw new BadRequestError('File type required', 'FILE_TYPE_REQUIRED');

  const parsedConfig = importConfig ? JSON.parse(importConfig) : {};

  const result = await ImportService.analyzeImport(
    req.user.id, accountId, req.file, fileType, parsedConfig
  );

  res.json({ success: true, data: result });
};

export const confirmImport = async (req, res) => {
  const { importId, actions, autoCategories = true } = req.body;
  if (!importId) throw new BadRequestError('Import ID required', 'IMPORT_ID_REQUIRED');
  if (!actions) throw new BadRequestError('Actions required', 'ACTIONS_REQUIRED');

  const result = await ImportService.confirmImport(
    req.user.id, importId, actions, autoCategories
  );

  res.json({ success: true, data: result });
};

export const getImportHistory = async (req, res) => {
  const { accountId, status, page = 1, limit = 20 } = req.query;

  let query = knex('imports').where('user_id', req.user.id);

  if (accountId) query = query.where('account_id', accountId);
  if (status) query = query.where('status', status);

  const imports = await query
    .orderBy('created_at', 'desc')
    .limit(parseInt(limit))
    .offset((parseInt(page) - 1) * parseInt(limit));

  res.json({
    success: true,
    data: imports.map(imp => ({
      id: imp.id, accountId: imp.account_id, filename: imp.filename,
      fileType: imp.file_type, status: imp.status, totalRows: imp.total_rows,
      importedCount: imp.imported_count, duplicateCount: imp.duplicate_count,
      matchedCount: imp.matched_count,
      errorCount: imp.error_count, createdAt: imp.created_at, completedAt: imp.completed_at,
    })),
  });
};

export const getMatchCandidates = async (req, res) => {
  const { accountId, amount, date } = matchCandidatesQuerySchema.parse(req.query);

  const candidates = await Transaction.findMatchCandidates(
    req.user.id, accountId, { amount, date }
  );

  res.json({ success: true, data: candidates });
};

export const getImport = async (req, res) => {
  const imp = await knex('imports')
    .where({ id: req.params.id, user_id: req.user.id })
    .first();

  if (!imp) throw new BadRequestError('Import not found', 'IMPORT_NOT_FOUND');

  res.json({
    success: true,
    data: {
      id: imp.id, accountId: imp.account_id, filename: imp.filename,
      fileType: imp.file_type, status: imp.status, totalRows: imp.total_rows,
      importedCount: imp.imported_count, duplicateCount: imp.duplicate_count,
      matchedCount: imp.matched_count,
      errorCount: imp.error_count, errorDetails: imp.error_details ? JSON.parse(imp.error_details) : [],
      config: imp.config ? JSON.parse(imp.config) : null,
      createdAt: imp.created_at, completedAt: imp.completed_at,
    },
  });
};
