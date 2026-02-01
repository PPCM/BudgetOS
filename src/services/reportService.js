import knex from '../database/connection.js';
import dateHelpers from '../database/dateHelpers.js';
import { roundAmount, formatDateISO } from '../utils/helpers.js';
import { startOfMonth, endOfMonth, subMonths, format, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';

export class ReportService {
  /**
   * Expenses by category
   */
  static async getExpensesByCategory(userId, startDate, endDate, accountId = null) {
    let query = knex('transactions as t')
      .leftJoin('categories as c', 't.category_id', 'c.id')
      .select('c.id', 'c.name', 'c.color', 'c.icon')
      .sum(knex.raw('ABS(t.amount) as total'))
      .count('* as count')
      .where('t.user_id', userId)
      .where('t.type', 'expense')
      .whereNot('t.status', 'void')
      .whereBetween('t.date', [startDate, endDate])
      .groupBy('c.id')
      .orderBy('total', 'desc');

    if (accountId) query = query.where('t.account_id', accountId);

    const results = await query;
    const total = results.reduce((sum, r) => sum + Number(r.total || 0), 0);

    return results.map(r => ({
      categoryId: r.id,
      categoryName: r.name || 'Uncategorized',
      color: r.color || '#9CA3AF',
      icon: r.icon || 'tag',
      total: roundAmount(r.total || 0),
      count: Number(r.count),
      percentage: total > 0 ? roundAmount((Number(r.total || 0) / total) * 100) : 0,
    }));
  }

  /**
   * Income by category
   */
  static async getIncomeByCategory(userId, startDate, endDate) {
    const results = await knex('transactions as t')
      .leftJoin('categories as c', 't.category_id', 'c.id')
      .select('c.id', 'c.name', 'c.color')
      .sum('t.amount as total')
      .count('* as count')
      .where('t.user_id', userId)
      .where('t.type', 'income')
      .whereNot('t.status', 'void')
      .whereBetween('t.date', [startDate, endDate])
      .groupBy('c.id')
      .orderBy('total', 'desc');

    const total = results.reduce((sum, r) => sum + Number(r.total || 0), 0);
    return results.map(r => ({
      categoryId: r.id,
      categoryName: r.name || 'Uncategorized',
      color: r.color || '#10B981',
      total: roundAmount(r.total || 0),
      count: Number(r.count),
      percentage: total > 0 ? roundAmount((Number(r.total || 0) / total) * 100) : 0,
    }));
  }

  /**
   * Monthly trend
   */
  static async getMonthlyTrend(userId, months = 12) {
    const endDate = endOfMonth(new Date());
    const startDate = startOfMonth(subMonths(endDate, months - 1));
    const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate });

    const yearMonthExpr = dateHelpers.yearMonth(knex, 'date');

    // Single query with GROUP BY month instead of N queries
    const rows = await knex('transactions')
      .where('user_id', userId)
      .whereNot('status', 'void')
      .whereBetween('date', [formatDateISO(startDate), formatDateISO(endDate)])
      .select(
        knex.raw(`${yearMonthExpr} as month_key`),
        knex.raw("SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income"),
        knex.raw("SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses"),
      )
      .groupByRaw(yearMonthExpr);

    // Build a lookup map from query results
    const dataMap = {};
    for (const row of rows) {
      dataMap[row.month_key] = row;
    }

    // Map every month in the interval (including months with no transactions)
    return monthsInterval.map(month => {
      const key = format(month, 'yyyy-MM');
      const data = dataMap[key];
      const income = roundAmount(data?.income || 0);
      const expenses = roundAmount(data?.expenses || 0);
      return {
        month: key,
        monthLabel: format(month, 'MMM yyyy'),
        income,
        expenses,
        netFlow: roundAmount(income - expenses),
      };
    });
  }

  /**
   * Expenses by credit card
   */
  static async getExpensesByCreditCard(userId, startDate, endDate) {
    const results = await knex('transactions as t')
      .join('credit_cards as cc', 't.credit_card_id', 'cc.id')
      .select('cc.id', 'cc.name', 'cc.color')
      .sum(knex.raw('ABS(t.amount) as total'))
      .count('* as count')
      .where('t.user_id', userId)
      .where('t.type', 'expense')
      .whereNot('t.status', 'void')
      .whereBetween('t.date', [startDate, endDate])
      .groupBy('cc.id')
      .orderBy('total', 'desc');

    return results.map(r => ({
      cardId: r.id, cardName: r.name, color: r.color,
      total: roundAmount(r.total || 0), count: Number(r.count),
    }));
  }

  /**
   * Month-to-month comparison
   */
  static async getMonthComparison(userId, month1, month2) {
    const getMonthData = async (monthStr) => {
      const [year, month] = monthStr.split('-').map(Number);
      const start = formatDateISO(new Date(year, month - 1, 1));
      const end = formatDateISO(endOfMonth(new Date(year, month - 1, 1)));

      return knex('transactions')
        .where('user_id', userId)
        .whereNot('status', 'void')
        .whereBetween('date', [start, end])
        .select(
          knex.raw("SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income"),
          knex.raw("SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses"),
          knex.raw('COUNT(*) as transaction_count'),
        )
        .first();
    };

    const [data1, data2] = await Promise.all([getMonthData(month1), getMonthData(month2)]);

    const calcChange = (v1, v2) => v1 && v1 !== 0 ? roundAmount(((v2 - v1) / v1) * 100) : 0;

    return {
      month1: { month: month1, income: roundAmount(data1?.income || 0), expenses: roundAmount(data1?.expenses || 0) },
      month2: { month: month2, income: roundAmount(data2?.income || 0), expenses: roundAmount(data2?.expenses || 0) },
      changes: {
        income: calcChange(data1?.income, data2?.income),
        expenses: calcChange(data1?.expenses, data2?.expenses),
      },
    };
  }

  /**
   * Dashboard summary
   */
  static async getDashboardSummary(userId) {
    const today = new Date();
    const monthStart = formatDateISO(startOfMonth(today));
    const monthEnd = formatDateISO(endOfMonth(today));
    const yearStart = formatDateISO(startOfYear(today));

    // Run all 4 independent queries in parallel
    const [monthly, yearly, totals, recentTx] = await Promise.all([
      knex('transactions')
        .where('user_id', userId)
        .whereNot('status', 'void')
        .whereBetween('date', [monthStart, monthEnd])
        .select(
          knex.raw("SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income"),
          knex.raw("SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses"),
        )
        .first(),
      knex('transactions')
        .where('user_id', userId)
        .whereNot('status', 'void')
        .whereBetween('date', [yearStart, monthEnd])
        .select(
          knex.raw("SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income"),
          knex.raw("SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses"),
        )
        .first(),
      knex('accounts')
        .where({ user_id: userId, is_active: true, is_included_in_total: true })
        .sum('current_balance as total')
        .first(),
      knex('transactions as t')
        .leftJoin('categories as c', 't.category_id', 'c.id')
        .leftJoin('accounts as a', 't.account_id', 'a.id')
        .select('t.*', 'c.name as category_name', 'a.name as account_name')
        .where('t.user_id', userId)
        .whereNot('t.status', 'void')
        .orderBy('t.date', 'desc')
        .orderBy('t.created_at', 'desc')
        .limit(5),
    ]);

    return {
      totalBalance: roundAmount(totals?.total || 0),
      monthlyIncome: roundAmount(monthly?.income || 0),
      monthlyExpenses: roundAmount(monthly?.expenses || 0),
      monthlyNetFlow: roundAmount((monthly?.income || 0) - (monthly?.expenses || 0)),
      yearlyIncome: roundAmount(yearly?.income || 0),
      yearlyExpenses: roundAmount(yearly?.expenses || 0),
      recentTransactions: recentTx.map(t => ({
        id: t.id, date: t.date, amount: Number(t.amount), description: t.description,
        categoryName: t.category_name, accountName: t.account_name, type: t.type,
      })),
    };
  }
}

export default ReportService;
