import { query, transaction as dbTransaction } from '../database/connection.js';
import { generateId, roundAmount, normalizeDescription } from '../utils/helpers.js';
import { NotFoundError } from '../utils/errors.js';
import Account from './Account.js';

/**
 * Modèle Transaction
 */
export class Transaction {
  /**
   * Crée une nouvelle transaction
   */
  static create(userId, data) {
    const id = generateId();
    
    // Vérifier que le compte existe
    Account.findByIdOrFail(data.accountId, userId);
    
    // Ajuster le signe du montant selon le type
    let amount = Math.abs(data.amount);
    if (data.type === 'expense' || data.type === 'transfer') {
      amount = -amount; // Débit pour dépenses et virements (compte source)
    }
    
    dbTransaction(() => {
      query.run(`
        INSERT INTO transactions (
          id, user_id, account_id, category_id, payee_id, credit_card_id,
          amount, description, notes, date, value_date, purchase_date,
          status, type, is_recurring, recurring_id, tags
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, userId, data.accountId, data.categoryId || null, data.payeeId || null, data.creditCardId || null,
        amount, data.description, data.notes || null, data.date,
        data.valueDate || null, data.purchaseDate || null,
        data.status || 'pending', data.type, data.isRecurring ? 1 : 0,
        data.recurringId || null, data.tags ? JSON.stringify(data.tags) : null
      ]);
      
      // Mettre à jour le solde du compte
      Account.updateBalance(data.accountId, userId);
      
      // Gérer les virements avec compte destination
      if (data.type === 'transfer' && data.toAccountId) {
        // Récupérer le nom du compte source pour la description
        const sourceAccount = Account.findById(data.accountId, userId);
        const transferId = generateId();
        query.run(`
          INSERT INTO transactions (
            id, user_id, account_id, category_id, payee_id, amount, description,
            date, status, type, linked_transaction_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          transferId, userId, data.toAccountId, data.categoryId || null, data.payeeId || null,
          Math.abs(amount), data.description,
          data.date, data.status || 'pending', 'transfer', id
        ]);
        
        // Mettre à jour la transaction source avec le lien vers la transaction destination
        query.run('UPDATE transactions SET linked_transaction_id = ? WHERE id = ?', [transferId, id]);
        
        Account.updateBalance(data.toAccountId, userId);
      }
    });
    
    return Transaction.findById(id, userId);
  }
  
  /**
   * Trouve une transaction par ID
   */
  static findById(id, userId) {
    const tx = query.get(`
      SELECT t.*, c.name as category_name, a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.id = ? AND t.user_id = ?
    `, [id, userId]);
    
    return tx ? Transaction.format(tx) : null;
  }
  
  /**
   * Trouve une transaction ou lance une erreur
   */
  static findByIdOrFail(id, userId) {
    const tx = Transaction.findById(id, userId);
    if (!tx) {
      throw new NotFoundError('Transaction non trouvée');
    }
    return tx;
  }
  
  /**
   * Liste les transactions avec filtres
   */
  static findByUser(userId, options = {}) {
    const {
      accountId, categoryId, creditCardId, type, status,
      startDate, endDate, minAmount, maxAmount, search,
      page = 1, limit = 50, sortBy = 'date', sortOrder = 'desc'
    } = options;
    
    let sql = `
      SELECT t.*, 
        c.name as category_name, c.icon as category_icon, c.color as category_color, 
        a.name as account_name, 
        p.name as payee_name, p.image_url as payee_image_url,
        linked_tx.account_id as linked_account_id,
        linked_a.name as linked_account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN payees p ON t.payee_id = p.id
      LEFT JOIN transactions linked_tx ON t.linked_transaction_id = linked_tx.id
      LEFT JOIN accounts linked_a ON linked_tx.account_id = linked_a.id
      WHERE t.user_id = ?
    `;
    const params = [userId];
    
    if (accountId) {
      sql += ' AND t.account_id = ?';
      params.push(accountId);
    }
    
    if (categoryId) {
      sql += ' AND t.category_id = ?';
      params.push(categoryId);
    }
    
    if (creditCardId) {
      sql += ' AND t.credit_card_id = ?';
      params.push(creditCardId);
    }
    
    if (type) {
      sql += ' AND t.type = ?';
      params.push(type);
    }
    
    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }
    
    if (startDate) {
      sql += ' AND t.date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ' AND t.date <= ?';
      params.push(endDate);
    }
    
    if (minAmount !== undefined) {
      sql += ' AND ABS(t.amount) >= ?';
      params.push(minAmount);
    }
    
    if (maxAmount !== undefined) {
      sql += ' AND ABS(t.amount) <= ?';
      params.push(maxAmount);
    }
    
    if (search) {
      sql += ' AND (t.description LIKE ? OR t.notes LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // Compte total - utiliser une regex pour remplacer tout le SELECT jusqu'à FROM
    const countSql = sql.replace(/SELECT[\s\S]*?FROM transactions/i, 'SELECT COUNT(*) as count FROM transactions');
    const total = query.get(countSql, params)?.count || 0;
    
    // Tri et pagination
    const allowedSortFields = { date: 't.date', amount: 't.amount', description: 't.description', created_at: 't.created_at' };
    const sortField = allowedSortFields[sortBy] || 't.date';
    sql += ` ORDER BY ${sortField} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    
    const transactions = query.all(sql, params);
    
    return {
      data: transactions.map(Transaction.format),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Met à jour une transaction
   */
  static update(id, userId, data) {
    const tx = Transaction.findByIdOrFail(id, userId);
    const oldAccountId = tx.accountId;
    
    const allowedFields = [
      'account_id', 'category_id', 'payee_id', 'credit_card_id', 'amount', 'description',
      'notes', 'date', 'value_date', 'purchase_date', 'status', 'type', 'tags'
    ];
    
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        updates.push(`${dbKey} = ?`);
        if (dbKey === 'tags') {
          values.push(JSON.stringify(value));
        } else if (dbKey === 'amount') {
          // Ajuster le signe
          const type = data.type || tx.type;
          let amount = Math.abs(value);
          if (type === 'expense') amount = -amount;
          values.push(amount);
        } else {
          values.push(value);
        }
      }
    }
    
    if (updates.length > 0) {
      values.push(id, userId);
      
      dbTransaction(() => {
        query.run(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
        
        // Mettre à jour les soldes
        Account.updateBalance(oldAccountId, userId);
        if (data.accountId && data.accountId !== oldAccountId) {
          Account.updateBalance(data.accountId, userId);
        }
      });
    }
    
    return Transaction.findById(id, userId);
  }
  
  /**
   * Supprime une transaction
   */
  static delete(id, userId) {
    const tx = Transaction.findByIdOrFail(id, userId);
    
    // Récupérer la transaction liée si c'est un virement
    const linkedTx = tx.linked_transaction_id 
      ? query.get('SELECT * FROM transactions WHERE id = ?', [tx.linked_transaction_id])
      : null;
    
    dbTransaction(() => {
      // Supprimer les splits associés
      query.run('DELETE FROM transaction_splits WHERE transaction_id = ?', [id]);
      
      // Supprimer les transactions liées (ancienne méthode avec parent)
      query.run('DELETE FROM transactions WHERE parent_transaction_id = ?', [id]);
      
      // Supprimer la transaction liée (virements)
      if (linkedTx) {
        query.run('DELETE FROM transactions WHERE id = ?', [linkedTx.id]);
        Account.updateBalance(linkedTx.account_id, userId);
      }
      
      // Supprimer la transaction
      query.run('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
      
      // Mettre à jour le solde
      Account.updateBalance(tx.accountId, userId);
    });
    
    return { deleted: true };
  }
  
  /**
   * Rapproche des transactions
   */
  static reconcile(userId, transactionIds, reconcileDate) {
    dbTransaction(() => {
      for (const txId of transactionIds) {
        query.run(`
          UPDATE transactions
          SET status = 'reconciled', is_reconciled = 1, reconciled_at = ?
          WHERE id = ? AND user_id = ?
        `, [reconcileDate, txId, userId]);
      }
    });
    
    return { reconciled: transactionIds.length };
  }
  
  /**
   * Recherche de transactions pour rapprochement
   */
  static findForReconciliation(userId, accountId, criteria) {
    const { date, amount, dateTolerance = 2, amountTolerance = 0.01 } = criteria;
    
    const minAmount = Math.abs(amount) * (1 - amountTolerance);
    const maxAmount = Math.abs(amount) * (1 + amountTolerance);
    
    const transactions = query.all(`
      SELECT t.*, c.name as category_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.account_id = ?
        AND t.status != 'reconciled'
        AND t.date BETWEEN date(?, '-' || ? || ' days') AND date(?, '+' || ? || ' days')
        AND ABS(t.amount) BETWEEN ? AND ?
      ORDER BY ABS(ABS(t.amount) - ?) ASC, ABS(julianday(t.date) - julianday(?)) ASC
      LIMIT 10
    `, [
      userId, accountId,
      date, dateTolerance, date, dateTolerance,
      minAmount, maxAmount,
      Math.abs(amount), date
    ]);
    
    return transactions.map(Transaction.format);
  }
  
  /**
   * Crée une transaction avec ventilation
   */
  static createWithSplits(userId, data, splits) {
    const tx = Transaction.create(userId, { ...data, isSplit: true });
    
    for (const split of splits) {
      query.run(`
        INSERT INTO transaction_splits (id, transaction_id, category_id, amount, description)
        VALUES (?, ?, ?, ?, ?)
      `, [generateId(), tx.id, split.categoryId, split.amount, split.description || null]);
    }
    
    return Transaction.findById(tx.id, userId);
  }
  
  /**
   * Récupère les splits d'une transaction
   */
  static getSplits(transactionId, userId) {
    Transaction.findByIdOrFail(transactionId, userId);
    
    const splits = query.all(`
      SELECT ts.*, c.name as category_name
      FROM transaction_splits ts
      LEFT JOIN categories c ON ts.category_id = c.id
      WHERE ts.transaction_id = ?
    `, [transactionId]);
    
    return splits.map(s => ({
      id: s.id,
      transactionId: s.transaction_id,
      categoryId: s.category_id,
      categoryName: s.category_name,
      amount: s.amount,
      description: s.description,
    }));
  }
  
  /**
   * Formate une transaction pour l'API
   */
  static format(tx) {
    return {
      id: tx.id,
      userId: tx.user_id,
      accountId: tx.account_id,
      accountName: tx.account_name,
      categoryId: tx.category_id,
      categoryName: tx.category_name,
      categoryIcon: tx.category_icon,
      categoryColor: tx.category_color,
      payeeId: tx.payee_id,
      payeeName: tx.payee_name,
      payeeImageUrl: tx.payee_image_url,
      creditCardId: tx.credit_card_id,
      creditCardCycleId: tx.credit_card_cycle_id,
      amount: tx.amount,
      description: tx.description,
      notes: tx.notes,
      date: tx.date,
      valueDate: tx.value_date,
      purchaseDate: tx.purchase_date,
      accountingDate: tx.accounting_date,
      status: tx.status,
      type: tx.type,
      isRecurring: Boolean(tx.is_recurring),
      recurringId: tx.recurring_id,
      importId: tx.import_id,
      importHash: tx.import_hash,
      externalId: tx.external_id,
      isReconciled: Boolean(tx.is_reconciled),
      reconciledAt: tx.reconciled_at,
      isSplit: Boolean(tx.is_split),
      parentTransactionId: tx.parent_transaction_id,
      linkedTransactionId: tx.linked_transaction_id,
      linkedAccountId: tx.linked_account_id,
      linkedAccountName: tx.linked_account_name,
      hasAttachments: Boolean(tx.has_attachments),
      tags: tx.tags ? JSON.parse(tx.tags) : [],
      createdAt: tx.created_at,
      updatedAt: tx.updated_at,
    };
  }
}

export default Transaction;
