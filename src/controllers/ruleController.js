import Rule from '../models/Rule.js';

export const createRule = async (req, res) => {
  const rule = Rule.create(req.user.id, req.body);
  res.status(201).json({ success: true, data: { rule } });
};

export const getRules = async (req, res) => {
  const rules = Rule.findByUser(req.user.id, req.query);
  res.json({ success: true, data: { rules } });
};

export const getRule = async (req, res) => {
  const rule = Rule.findByIdOrFail(req.params.id, req.user.id);
  res.json({ success: true, data: { rule } });
};

export const updateRule = async (req, res) => {
  const rule = Rule.update(req.params.id, req.user.id, req.body);
  res.json({ success: true, data: { rule } });
};

export const deleteRule = async (req, res) => {
  const result = Rule.delete(req.params.id, req.user.id);
  res.json({ success: true, ...result });
};

export const testRule = async (req, res) => {
  const rule = Rule.findByIdOrFail(req.params.id, req.user.id);
  const matches = Rule.evaluateConditions(rule.conditions, req.body);
  res.json({ success: true, data: { matches, rule } });
};

export const applyRuleToTransaction = async (req, res) => {
  const { transactionId } = req.body;
  Rule.applyRule(req.user.id, transactionId, req.params.id);
  res.json({ success: true, message: 'Règle appliquée' });
};
