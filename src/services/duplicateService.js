import knex from '../database/connection.js';
import Transaction from '../models/Transaction.js';
import logger from '../utils/logger.js';

// Identify groups of recurring transactions sharing (user_id, recurring_id, date).
// Caused by a past scheduler bug that recreated occurrences every hour.
//
// Within a group we pick which row to keep:
//   1. A reconciled transaction (already matched to a bank statement) wins.
//   2. Otherwise the oldest by created_at is kept.
// All other rows are flagged for deletion.
export async function findRecurringDuplicateGroups() {
  const groupRows = await knex('transactions')
    .whereNotNull('recurring_id')
    .groupBy('user_id', 'recurring_id', 'date')
    .havingRaw('COUNT(*) > 1')
    .select(
      'user_id',
      'recurring_id',
      'date',
      knex.raw('COUNT(*) as count')
    );

  const groups = [];

  for (const row of groupRows) {
    const txs = await knex('transactions as t')
      .leftJoin('planned_transactions as pt', 't.recurring_id', 'pt.id')
      .leftJoin('accounts as a', 't.account_id', 'a.id')
      .where('t.user_id', row.user_id)
      .andWhere('t.recurring_id', row.recurring_id)
      .andWhere('t.date', row.date)
      .orderBy('t.is_reconciled', 'desc')
      .orderBy('t.created_at', 'asc')
      .select(
        't.id',
        't.description',
        't.amount',
        't.is_reconciled',
        't.created_at',
        't.account_id',
        'a.name as account_name',
        'pt.description as planned_description'
      );

    if (txs.length < 2) continue;

    const keepId = txs[0].id;
    const deleteIds = txs.slice(1).map((t) => t.id);

    groups.push({
      userId: row.user_id,
      recurringId: row.recurring_id,
      plannedDescription: txs[0].planned_description,
      description: txs[0].description,
      accountId: txs[0].account_id,
      accountName: txs[0].account_name,
      date: row.date,
      amount: Number(txs[0].amount),
      count: Number(row.count),
      keepId,
      deleteIds,
    });
  }

  return groups;
}

// Returns a preview without making changes.
export async function previewRecurringDuplicates() {
  const groups = await findRecurringDuplicateGroups();
  const totalDuplicates = groups.reduce((sum, g) => sum + g.deleteIds.length, 0);
  return { groupsFound: groups.length, totalDuplicates, groups };
}

// Deletes excess duplicate transactions.
// Uses Transaction.delete() per row so account balances are recalculated
// and linked transfer rows are cleaned up correctly.
export async function cleanupRecurringDuplicates() {
  const groups = await findRecurringDuplicateGroups();
  let deleted = 0;
  const errors = [];

  for (const group of groups) {
    for (const txId of group.deleteIds) {
      try {
        await Transaction.delete(txId, group.userId);
        deleted++;
      } catch (err) {
        logger.error('Failed to delete duplicate transaction', {
          transactionId: txId,
          userId: group.userId,
          error: err.message,
        });
        errors.push({ id: txId, error: err.message });
      }
    }
  }

  return { groupsFound: groups.length, deleted, errors };
}

export default {
  findRecurringDuplicateGroups,
  previewRecurringDuplicates,
  cleanupRecurringDuplicates,
};
