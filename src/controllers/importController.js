import path from 'path';
import fs from 'fs';
import ImportService from '../services/importService.js';
import { query } from '../database/connection.js';
import { BadRequestError } from '../utils/errors.js';
import config from '../config/index.js';

export const uploadFile = async (req, res) => {
  if (!req.file) throw new BadRequestError('Aucun fichier fourni');
  
  const { accountId, fileType } = req.body;
  const importId = await ImportService.createImport(req.user.id, accountId, req.file, fileType);
  
  res.status(201).json({
    success: true,
    data: { importId, filename: req.file.originalname },
  });
};

export const previewImport = async (req, res) => {
  if (!req.file) throw new BadRequestError('Aucun fichier fourni');
  
  const { fileType, config: importConfig } = req.body;
  const parsedConfig = importConfig ? JSON.parse(importConfig) : {};
  
  const transactions = await ImportService.parseFile(req.file.path, fileType, parsedConfig);
  const preview = transactions.slice(0, parseInt(req.query.previewRows) || 10);
  
  // Nettoyer le fichier temporaire
  fs.unlinkSync(req.file.path);
  
  res.json({
    success: true,
    data: { preview, totalRows: transactions.length },
  });
};

export const processImport = async (req, res) => {
  const { importId, accountId, fileType, config: importConfig, filePath } = req.body;
  const parsedConfig = importConfig ? JSON.parse(importConfig) : {};
  
  // Parser le fichier
  const transactions = await ImportService.parseFile(filePath, fileType, parsedConfig);
  
  // Trouver les correspondances
  const matches = await ImportService.findMatches(req.user.id, accountId, transactions, {
    dateTolerance: req.body.dateTolerance || 2,
    amountTolerance: req.body.amountTolerance || 0.01,
  });
  
  res.json({
    success: true,
    data: {
      importId,
      transactions: matches,
      summary: {
        total: matches.length,
        new: matches.filter(m => m.matchType === 'new').length,
        duplicates: matches.filter(m => m.matchType === 'duplicate').length,
        matches: matches.filter(m => ['exact', 'probable'].includes(m.matchType)).length,
      },
    },
  });
};

export const validateImport = async (req, res) => {
  const { importId, actions, autoCategories } = req.body;
  const result = await ImportService.processImport(req.user.id, importId, actions, autoCategories);
  
  res.json({ success: true, data: result });
};

export const getImportHistory = async (req, res) => {
  const { accountId, status, page = 1, limit = 20 } = req.query;
  
  let sql = 'SELECT * FROM imports WHERE user_id = ?';
  const params = [req.user.id];
  
  if (accountId) { sql += ' AND account_id = ?'; params.push(accountId); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
  
  const imports = query.all(sql, params);
  
  res.json({
    success: true,
    data: imports.map(imp => ({
      id: imp.id, accountId: imp.account_id, filename: imp.filename,
      fileType: imp.file_type, status: imp.status, totalRows: imp.total_rows,
      importedCount: imp.imported_count, duplicateCount: imp.duplicate_count,
      errorCount: imp.error_count, createdAt: imp.created_at, completedAt: imp.completed_at,
    })),
  });
};

export const getImport = async (req, res) => {
  const imp = query.get('SELECT * FROM imports WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!imp) throw new BadRequestError('Import non trouvé');
  
  res.json({
    success: true,
    data: {
      id: imp.id, accountId: imp.account_id, filename: imp.filename,
      fileType: imp.file_type, status: imp.status, totalRows: imp.total_rows,
      importedCount: imp.imported_count, duplicateCount: imp.duplicate_count,
      errorCount: imp.error_count, errorDetails: imp.error_details ? JSON.parse(imp.error_details) : [],
      config: imp.config ? JSON.parse(imp.config) : null,
      createdAt: imp.created_at, completedAt: imp.completed_at,
    },
  });
};
