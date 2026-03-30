import PlannedTransaction from '../models/PlannedTransaction.js';

export const createPlannedTransaction = async (req, res) => {
  const planned = await PlannedTransaction.create(req.user.id, req.body);

  // Check if there are past occurrences to backfill
  const pastOccurrences = PlannedTransaction.getPastOccurrences(req.body);

  res.status(201).json({
    success: true,
    data: {
      plannedTransaction: planned,
      pastOccurrences: pastOccurrences.length,
      pastDates: pastOccurrences,
    },
  });
};

export const getPlannedTransactions = async (req, res) => {
  const result = await PlannedTransaction.findByUser(req.user.id, req.query);
  res.json({ success: true, data: result.data, pagination: result.pagination });
};

export const getPlannedTransaction = async (req, res) => {
  const planned = await PlannedTransaction.findByIdOrFail(req.params.id, req.user.id);
  res.json({ success: true, data: { plannedTransaction: planned } });
};

export const updatePlannedTransaction = async (req, res) => {
  // update() auto-reconciles dates when schedule changes (without creating/deleting)
  const planned = await PlannedTransaction.update(req.params.id, req.user.id, req.body);

  // Check remaining mismatches that need user confirmation (create/delete)
  const analysis = await PlannedTransaction.analyzePastOccurrences(req.params.id, req.user.id);

  res.json({
    success: true,
    data: {
      plannedTransaction: planned,
      missingOccurrences: analysis.missingOccurrences,
      excessOccurrences: analysis.excessOccurrences,
    },
  });
};

export const deletePlannedTransaction = async (req, res) => {
  const result = await PlannedTransaction.delete(req.params.id, req.user.id);
  res.json({ success: true, ...result });
};

export const getUpcoming = async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const upcoming = await PlannedTransaction.getUpcoming(req.user.id, days);
  res.json({ success: true, data: { upcoming } });
};

export const createOccurrence = async (req, res) => {
  const { date, amount } = req.body;
  const transaction = await PlannedTransaction.createOccurrence(req.params.id, req.user.id, date, amount);
  res.status(201).json({ success: true, data: { transaction } });
};

export const reconcileOccurrences = async (req, res) => {
  const deleteExcess = req.body?.deleteExcess === true;
  const result = await PlannedTransaction.reconcilePastOccurrences(req.params.id, req.user.id, { deleteExcess });
  res.json({ success: true, data: result });
};
