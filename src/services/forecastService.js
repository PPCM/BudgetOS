import { query } from '../database/connection.js';
import { roundAmount, formatDateISO } from '../utils/helpers.js';
import { addDays, addMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import Account from '../models/Account.js';
import PlannedTransaction from '../models/PlannedTransaction.js';

export class ForecastService {
  /**
   * Calcule les prévisions de trésorerie pour un compte
   */
  static calculateForecast(userId, accountId, days = 90) {
    const account = Account.findByIdOrFail(accountId, userId);
    const today = new Date();
    const horizon = addDays(today, days);

    // Récupérer les transactions planifiées
    const planned = query.all(`
      SELECT * FROM planned_transactions
      WHERE user_id = ? AND (account_id = ? OR to_account_id = ?) AND is_active = 1
        AND (end_date IS NULL OR end_date >= date('now'))
    `, [userId, accountId, accountId]);

    // Récupérer les débits différés à venir
    const deferredDebits = query.all(`
      SELECT cc.name as card_name, ccc.debit_date, ccc.total_amount
      FROM credit_card_cycles ccc
      JOIN credit_cards cc ON ccc.credit_card_id = cc.id
      WHERE cc.user_id = ? AND cc.linked_account_id = ?
        AND ccc.status IN ('open', 'pending')
        AND ccc.debit_date BETWEEN date('now') AND date('now', '+' || ? || ' days')
    `, [userId, accountId, days]);

    // Générer les occurrences futures des transactions planifiées
    const futureTransactions = [];
    for (const pt of planned) {
      const occurrences = ForecastService.generateOccurrences(pt, today, horizon);
      for (const date of occurrences) {
        const amount = pt.account_id === accountId ? pt.amount : -pt.amount;
        futureTransactions.push({
          date: formatDateISO(date),
          amount,
          description: pt.description,
          type: 'planned',
          sourceId: pt.id,
        });
      }
    }

    // Ajouter les débits différés
    for (const debit of deferredDebits) {
      futureTransactions.push({
        date: debit.debit_date,
        amount: -debit.total_amount,
        description: `Prélèvement ${debit.card_name}`,
        type: 'deferred_debit',
      });
    }

    // Trier par date
    futureTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculer les soldes jour par jour
    let balance = account.currentBalance;
    const dailyBalances = [];
    const interval = eachDayOfInterval({ start: today, end: horizon });

    let txIndex = 0;
    for (const day of interval) {
      const dayStr = formatDateISO(day);
      const dayTransactions = [];

      while (txIndex < futureTransactions.length && futureTransactions[txIndex].date === dayStr) {
        balance += futureTransactions[txIndex].amount;
        dayTransactions.push(futureTransactions[txIndex]);
        txIndex++;
      }

      dailyBalances.push({
        date: dayStr,
        balance: roundAmount(balance),
        transactions: dayTransactions,
      });
    }

    const balances = dailyBalances.map(d => d.balance);
    return {
      accountId,
      accountName: account.name,
      currentBalance: account.currentBalance,
      forecast: {
        days30: ForecastService.getBalanceAtDay(dailyBalances, 30),
        days60: ForecastService.getBalanceAtDay(dailyBalances, 60),
        days90: ForecastService.getBalanceAtDay(dailyBalances, 90),
      },
      minBalance: Math.min(...balances),
      maxBalance: Math.max(...balances),
      minBalanceDate: dailyBalances.find(d => d.balance === Math.min(...balances))?.date,
      dailyBalances,
      upcomingTransactions: futureTransactions.slice(0, 20),
    };
  }

  static getBalanceAtDay(dailyBalances, day) {
    return dailyBalances[Math.min(day, dailyBalances.length - 1)]?.balance || 0;
  }

  static generateOccurrences(planned, start, end) {
    const occurrences = [];
    let current = new Date(planned.next_occurrence || planned.start_date);
    const endDate = planned.end_date ? new Date(planned.end_date) : end;
    const maxDate = new Date(Math.min(end.getTime(), endDate.getTime()));

    while (current <= maxDate) {
      if (current >= start) occurrences.push(new Date(current));
      
      switch (planned.frequency) {
        case 'once': return occurrences;
        case 'daily': current = addDays(current, 1); break;
        case 'weekly': current = addDays(current, 7); break;
        case 'biweekly': current = addDays(current, 14); break;
        case 'monthly': current = addMonths(current, 1); break;
        case 'bimonthly': current = addMonths(current, 2); break;
        case 'quarterly': current = addMonths(current, 3); break;
        case 'semiannual': current = addMonths(current, 6); break;
        case 'annual': current = addMonths(current, 12); break;
        default: return occurrences;
      }
    }
    return occurrences;
  }

  /**
   * Calcule les prévisions globales pour tous les comptes
   */
  static calculateGlobalForecast(userId, days = 90) {
    const accounts = query.all(`
      SELECT id, name, current_balance FROM accounts
      WHERE user_id = ? AND is_active = 1 AND is_included_in_total = 1 AND type != 'credit_card'
    `, [userId]);

    const forecasts = accounts.map(acc => ForecastService.calculateForecast(userId, acc.id, days));
    
    const today = new Date();
    const horizon = addDays(today, days);
    const interval = eachDayOfInterval({ start: today, end: horizon });
    
    // Agréger les soldes
    const globalDaily = interval.map((day, i) => {
      const dayStr = formatDateISO(day);
      const totalBalance = forecasts.reduce((sum, f) => {
        const dayData = f.dailyBalances.find(d => d.date === dayStr);
        return sum + (dayData?.balance || 0);
      }, 0);
      return { date: dayStr, balance: roundAmount(totalBalance) };
    });

    const currentTotal = accounts.reduce((sum, a) => sum + a.current_balance, 0);
    const balances = globalDaily.map(d => d.balance);

    return {
      currentBalance: roundAmount(currentTotal),
      forecast: {
        days30: globalDaily[Math.min(30, globalDaily.length - 1)]?.balance || 0,
        days60: globalDaily[Math.min(60, globalDaily.length - 1)]?.balance || 0,
        days90: globalDaily[Math.min(90, globalDaily.length - 1)]?.balance || 0,
      },
      minBalance: Math.min(...balances),
      maxBalance: Math.max(...balances),
      dailyBalances: globalDaily,
      accountForecasts: forecasts.map(f => ({
        accountId: f.accountId,
        accountName: f.accountName,
        currentBalance: f.currentBalance,
        forecast30: f.forecast.days30,
      })),
    };
  }

  /**
   * Calcule le résumé mensuel prévisionnel
   */
  static getMonthlyForecast(userId, months = 3) {
    const result = [];
    const today = new Date();

    for (let i = 0; i <= months; i++) {
      const monthStart = startOfMonth(addMonths(today, i));
      const monthEnd = endOfMonth(monthStart);

      const planned = query.all(`
        SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
               SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses
        FROM planned_transactions
        WHERE user_id = ? AND is_active = 1
          AND next_occurrence BETWEEN ? AND ?
      `, [userId, formatDateISO(monthStart), formatDateISO(monthEnd)]);

      const deferred = query.get(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM credit_card_cycles ccc
        JOIN credit_cards cc ON ccc.credit_card_id = cc.id
        WHERE cc.user_id = ? AND ccc.debit_date BETWEEN ? AND ?
      `, [userId, formatDateISO(monthStart), formatDateISO(monthEnd)]);

      result.push({
        month: formatDateISO(monthStart).slice(0, 7),
        plannedIncome: planned[0]?.income || 0,
        plannedExpenses: (planned[0]?.expenses || 0) + (deferred?.total || 0),
        netFlow: (planned[0]?.income || 0) - (planned[0]?.expenses || 0) - (deferred?.total || 0),
      });
    }

    return result;
  }
}

export default ForecastService;
