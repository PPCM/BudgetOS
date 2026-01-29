import CreditCard from '../models/CreditCard.js';

export const createCreditCard = async (req, res) => {
  const card = await CreditCard.create(req.user.id, req.body);
  res.status(201).json({ success: true, data: { creditCard: card } });
};

export const getCreditCards = async (req, res) => {
  const cards = await CreditCard.findByUser(req.user.id, req.query);
  res.json({ success: true, data: { creditCards: cards } });
};

export const getCreditCard = async (req, res) => {
  const card = await CreditCard.findByIdOrFail(req.params.id, req.user.id);
  const currentCycle = card.debitType === 'deferred' ? await CreditCard.getCurrentCycle(req.params.id, req.user.id) : null;
  res.json({ success: true, data: { creditCard: card, currentCycle } });
};

export const updateCreditCard = async (req, res) => {
  const card = await CreditCard.update(req.params.id, req.user.id, req.body);
  res.json({ success: true, data: { creditCard: card } });
};

export const deleteCreditCard = async (req, res) => {
  const result = await CreditCard.delete(req.params.id, req.user.id);
  res.json({ success: true, ...result });
};

export const getCycles = async (req, res) => {
  const cycles = await CreditCard.getCycles(req.params.id, req.user.id, req.query);
  res.json({ success: true, data: { cycles } });
};

export const getCurrentCycle = async (req, res) => {
  const cycle = await CreditCard.getCurrentCycle(req.params.id, req.user.id);
  if (cycle) {
    cycle.transactions = await CreditCard.getCycleTransactions(cycle.id, req.user.id);
  }
  res.json({ success: true, data: { cycle } });
};

export const getCycleTransactions = async (req, res) => {
  const transactions = await CreditCard.getCycleTransactions(req.params.cycleId, req.user.id);
  res.json({ success: true, data: { transactions } });
};

export const generateCycleDebit = async (req, res) => {
  const debitId = await CreditCard.generateCycleDebit(req.params.cycleId, req.user.id);
  res.json({ success: true, data: { debitTransactionId: debitId } });
};
