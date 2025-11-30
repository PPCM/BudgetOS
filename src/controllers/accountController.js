import Account from '../models/Account.js';

export const createAccount = async (req, res) => {
  const account = Account.create(req.user.id, req.body);
  res.status(201).json({ success: true, data: { account } });
};

export const getAccounts = async (req, res) => {
  const result = Account.findByUser(req.user.id, req.query);
  res.json({ success: true, data: result.data, totals: result.totals });
};

export const getAccount = async (req, res) => {
  const account = Account.findByIdOrFail(req.params.id, req.user.id);
  res.json({ success: true, data: { account } });
};

export const updateAccount = async (req, res) => {
  const account = Account.update(req.params.id, req.user.id, req.body);
  res.json({ success: true, data: { account } });
};

export const deleteAccount = async (req, res) => {
  const result = Account.delete(req.params.id, req.user.id);
  res.json({ success: true, ...result });
};

export const getAccountStats = async (req, res) => {
  const stats = Account.getStats(req.params.id, req.user.id, req.query.period);
  res.json({ success: true, data: { stats } });
};

export const recalculateBalances = async (req, res) => {
  Account.recalculateAllBalances(req.user.id);
  res.json({ success: true, message: 'Soldes recalculés' });
};
