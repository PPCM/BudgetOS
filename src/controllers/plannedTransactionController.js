import PlannedTransaction from '../models/PlannedTransaction.js';

export const createPlannedTransaction = async (req, res) => {
  const planned = PlannedTransaction.create(req.user.id, req.body);
  res.status(201).json({ success: true, data: { plannedTransaction: planned } });
};

export const getPlannedTransactions = async (req, res) => {
  const result = PlannedTransaction.findByUser(req.user.id, req.query);
  res.json({ success: true, data: result.data, pagination: result.pagination });
};

export const getPlannedTransaction = async (req, res) => {
  const planned = PlannedTransaction.findByIdOrFail(req.params.id, req.user.id);
  res.json({ success: true, data: { plannedTransaction: planned } });
};

export const updatePlannedTransaction = async (req, res) => {
  const planned = PlannedTransaction.update(req.params.id, req.user.id, req.body);
  res.json({ success: true, data: { plannedTransaction: planned } });
};

export const deletePlannedTransaction = async (req, res) => {
  const result = PlannedTransaction.delete(req.params.id, req.user.id);
  res.json({ success: true, ...result });
};

export const getUpcoming = async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const upcoming = PlannedTransaction.getUpcoming(req.user.id, days);
  res.json({ success: true, data: { upcoming } });
};

export const createOccurrence = async (req, res) => {
  const { date, amount } = req.body;
  const transaction = PlannedTransaction.createOccurrence(req.params.id, req.user.id, date, amount);
  res.status(201).json({ success: true, data: { transaction } });
};
