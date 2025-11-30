import { query } from '../database/connection.js';
import { roundAmount, formatDateISO } from '../utils/helpers.js';
import { startOfMonth, endOfMonth, subMonths, format, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';

export class ReportService {
  /**
   * Dépenses par catégorie
   */
  static getExpensesByCategory(userId, startDate, endDate, accountId = null) {
    let sql = `
      SELECT c.id, c.name, c.color, c.icon, SUM(ABS(t.amount)) as total, COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.type = 'expense' AND t.status != 'void'
        AND t.date BETWEEN ? AND ?
    `;
    const params = [userId, startDate, endDate];
    
    if (accountId) { sql += ' AND t.account_id = ?'; params.push(accountId); }
    sql += ' GROUP BY c.id ORDER BY total DESC';
    
    const results = query.all(sql, params);
    const total = results.reduce((sum, r) => sum + r.total, 0);
    
    return results.map(r => ({
      categoryId: r.id,
      categoryName: r.name || 'Non catégorisé',
      color: r.color || '#9CA3AF',
      icon: r.icon || 'tag',
      total: roundAmount(r.total),
      count: r.count,
      percentage: total > 0 ? roundAmount((r.total / total) * 100) : 0,
    }));
  }

  /**
   * Revenus par catégorie
   */
  static getIncomeByCategory(userId, startDate, endDate) {
    const results = query.all(`
      SELECT c.id, c.name, c.color, SUM(t.amount) as total, COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.type = 'income' AND t.status != 'void'
        AND t.date BETWEEN ? AND ?
      GROUP BY c.id ORDER BY total DESC
    `, [userId, startDate, endDate]);
    
    const total = results.reduce((sum, r) => sum + r.total, 0);
    return results.map(r => ({
      categoryId: r.id,
      categoryName: r.name || 'Non catégorisé',
      color: r.color || '#10B981',
      total: roundAmount(r.total),
      count: r.count,
      percentage: total > 0 ? roundAmount((r.total / total) * 100) : 0,
    }));
  }

  /**
   * Évolution mensuelle
   */
  static getMonthlyTrend(userId, months = 12) {
    const endDate = endOfMonth(new Date());
    const startDate = startOfMonth(subMonths(endDate, months - 1));
    const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate });

    return monthsInterval.map(month => {
      const monthStart = formatDateISO(startOfMonth(month));
      const monthEnd = formatDateISO(endOfMonth(month));
      
      const data = query.get(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses
        FROM transactions
        WHERE user_id = ? AND status != 'void' AND date BETWEEN ? AND ?
      `, [userId, monthStart, monthEnd]);

      return {
        month: format(month, 'yyyy-MM'),
        monthLabel: format(month, 'MMM yyyy'),
        income: roundAmount(data?.income || 0),
        expenses: roundAmount(data?.expenses || 0),
        netFlow: roundAmount((data?.income || 0) - (data?.expenses || 0)),
      };
    });
  }

  /**
   * Dépenses par carte de crédit
   */
  static getExpensesByCreditCard(userId, startDate, endDate) {
    const results = query.all(`
      SELECT cc.id, cc.name, cc.color, SUM(ABS(t.amount)) as total, COUNT(*) as count
      FROM transactions t
      JOIN credit_cards cc ON t.credit_card_id = cc.id
      WHERE t.user_id = ? AND t.type = 'expense' AND t.status != 'void'
        AND t.date BETWEEN ? AND ?
      GROUP BY cc.id ORDER BY total DESC
    `, [userId, startDate, endDate]);

    return results.map(r => ({
      cardId: r.id, cardName: r.name, color: r.color,
      total: roundAmount(r.total), count: r.count,
    }));
  }

  /**
   * Comparaison mois à mois
   */
  static getMonthComparison(userId, month1, month2) {
    const getMonthData = (monthStr) => {
      const [year, month] = monthStr.split('-').map(Number);
      const start = formatDateISO(new Date(year, month - 1, 1));
      const end = formatDateISO(endOfMonth(new Date(year, month - 1, 1)));
      
      return query.get(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses,
          COUNT(*) as transaction_count
        FROM transactions
        WHERE user_id = ? AND status != 'void' AND date BETWEEN ? AND ?
      `, [userId, start, end]);
    };

    const data1 = getMonthData(month1);
    const data2 = getMonthData(month2);

    const calcChange = (v1, v2) => v1 && v1 !== 0 ? roundAmount(((v2 - v1) / v1) * 100) : 0;

    return {
      month1: { month: month1, income: data1?.income || 0, expenses: data1?.expenses || 0 },
      month2: { month: month2, income: data2?.income || 0, expenses: data2?.expenses || 0 },
      changes: {
        income: calcChange(data1?.income, data2?.income),
        expenses: calcChange(data1?.expenses, data2?.expenses),
      },
    };
  }

  /**
   * Tableau de bord résumé
   */
  static getDashboardSummary(userId) {
    const today = new Date();
    const monthStart = formatDateISO(startOfMonth(today));
    const monthEnd = formatDateISO(endOfMonth(today));
    const yearStart = formatDateISO(startOfYear(today));

    const monthly = query.get(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses
      FROM transactions WHERE user_id = ? AND status != 'void' AND date BETWEEN ? AND ?
    `, [userId, monthStart, monthEnd]);

    const yearly = query.get(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses
      FROM transactions WHERE user_id = ? AND status != 'void' AND date BETWEEN ? AND ?
    `, [userId, yearStart, monthEnd]);

    const totals = query.get(`
      SELECT SUM(current_balance) as total FROM accounts
      WHERE user_id = ? AND is_active = 1 AND is_included_in_total = 1
    `, [userId]);

    const recentTx = query.all(`
      SELECT t.*, c.name as category_name, a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.user_id = ? AND t.status != 'void'
      ORDER BY t.date DESC, t.created_at DESC LIMIT 5
    `, [userId]);

    return {
      totalBalance: roundAmount(totals?.total || 0),
      monthlyIncome: roundAmount(monthly?.income || 0),
      monthlyExpenses: roundAmount(monthly?.expenses || 0),
      monthlyNetFlow: roundAmount((monthly?.income || 0) - (monthly?.expenses || 0)),
      yearlyIncome: roundAmount(yearly?.income || 0),
      yearlyExpenses: roundAmount(yearly?.expenses || 0),
      recentTransactions: recentTx.map(t => ({
        id: t.id, date: t.date, amount: t.amount, description: t.description,
        categoryName: t.category_name, accountName: t.account_name, type: t.type,
      })),
    };
  }
}

export default ReportService;
