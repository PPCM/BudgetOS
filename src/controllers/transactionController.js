import Transaction from '../models/Transaction.js';

export const createTransaction = async (req, res) => {
  const transaction = Transaction.create(req.user.id, req.body);
  res.status(201).json({ success: true, data: { transaction } });
};

export const getTransactions = async (req, res) => {
  const result = Transaction.findByUser(req.user.id, req.query);
  res.json({ success: true, data: result.data, pagination: result.pagination });
};

export const getTransaction = async (req, res) => {
  const transaction = Transaction.findByIdOrFail(req.params.id, req.user.id);
  const splits = transaction.isSplit ? Transaction.getSplits(req.params.id, req.user.id) : [];
  res.json({ success: true, data: { transaction, splits } });
};

export const updateTransaction = async (req, res) => {
  const transaction = Transaction.update(req.params.id, req.user.id, req.body);
  res.json({ success: true, data: { transaction } });
};

export const deleteTransaction = async (req, res) => {
  const result = Transaction.delete(req.params.id, req.user.id);
  res.json({ success: true, ...result });
};

export const reconcileTransactions = async (req, res) => {
  const { transactionIds, reconcileDate } = req.body;
  const result = Transaction.reconcile(req.user.id, transactionIds, reconcileDate);
  res.json({ success: true, ...result });
};

export const createSplitTransaction = async (req, res) => {
  const { splits, ...txData } = req.body;
  const transaction = Transaction.createWithSplits(req.user.id, txData, splits);
  res.status(201).json({ success: true, data: { transaction } });
};

export const findMatchingTransactions = async (req, res) => {
  const { accountId, date, amount, dateTolerance, amountTolerance } = req.query;
  const matches = Transaction.findForReconciliation(req.user.id, accountId, {
    date, amount: parseFloat(amount), dateTolerance: parseInt(dateTolerance) || 2,
    amountTolerance: parseFloat(amountTolerance) || 0.01,
  });
  res.json({ success: true, data: { matches } });
};
