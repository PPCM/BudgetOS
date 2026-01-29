import knex from '../database/connection.js';
import { roundAmount, formatDateISO } from '../utils/helpers.js';
import { addDays, addMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import dateHelpers from '../database/dateHelpers.js';
import Account from '../models/Account.js';

export class ForecastService {
  /**
   * Calculate cash flow forecast for an account
   */
  static async calculateForecast(userId, accountId, days = 90) {
    const account = await Account.findByIdOrFail(accountId, userId);
    const today = new Date();
    const horizon = addDays(today, days);
    const todayStr = formatDateISO(today);
    const horizonStr = formatDateISO(horizon);

    // Get planned transactions
    const planned = await knex('planned_transactions')
      .where('user_id', userId)
      .where(function () {
        this.where('account_id', accountId).orWhere('to_account_id', accountId);
      })
      .where('is_active', true)
      .where(function () {
        this.whereNull('end_date').orWhere('end_date', '>=', todayStr);
      });

    // Get upcoming deferred debits
    const deferredDebits = await knex('credit_card_cycles as ccc')
      .join('credit_cards as cc', 'ccc.credit_card_id', 'cc.id')
      .select('cc.name as card_name', 'ccc.debit_date', 'ccc.total_amount')
      .where('cc.user_id', userId)
      .where('cc.linked_account_id', accountId)
      .whereIn('ccc.status', ['open', 'pending'])
      .whereBetween('ccc.debit_date', [todayStr, horizonStr]);

    // Generate future occurrences of planned transactions
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

    // Add deferred debits
    for (const debit of deferredDebits) {
      futureTransactions.push({
        date: debit.debit_date,
        amount: -debit.total_amount,
        description: `Prélèvement ${debit.card_name}`,
        type: 'deferred_debit',
      });
    }

    // Sort by date
    futureTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate daily balances
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
    const minBalance = Math.min(...balances);
    return {
      accountId,
      accountName: account.name,
      currentBalance: account.currentBalance,
      forecast: {
        days30: ForecastService.getBalanceAtDay(dailyBalances, 30),
        days60: ForecastService.getBalanceAtDay(dailyBalances, 60),
        days90: ForecastService.getBalanceAtDay(dailyBalances, 90),
      },
      minBalance,
      maxBalance: Math.max(...balances),
      minBalanceDate: dailyBalances.find(d => d.balance === minBalance)?.date,
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
   * Calculate global forecast for all accounts
   */
  static async calculateGlobalForecast(userId, days = 90) {
    const accounts = await knex('accounts')
      .select('id', 'name', 'current_balance')
      .where({ user_id: userId, is_active: true, is_included_in_total: true })
      .whereNot('type', 'credit_card');

    const forecasts = await Promise.all(
      accounts.map(acc => ForecastService.calculateForecast(userId, acc.id, days))
    );

    const today = new Date();
    const horizon = addDays(today, days);
    const interval = eachDayOfInterval({ start: today, end: horizon });

    // Aggregate balances
    const globalDaily = interval.map((day) => {
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
   * Monthly forecast summary
   */
  static async getMonthlyForecast(userId, months = 3) {
    const today = new Date();
    const globalStart = formatDateISO(startOfMonth(today));
    const globalEnd = formatDateISO(endOfMonth(addMonths(today, months)));

    const yearMonthExpr = dateHelpers.yearMonth(knex, 'next_occurrence');
    const yearMonthDebitExpr = dateHelpers.yearMonth(knex, 'ccc.debit_date');

    // Batch query: all planned transactions grouped by month
    const [plannedRows, deferredRows] = await Promise.all([
      knex('planned_transactions')
        .where('user_id', userId)
        .where('is_active', true)
        .whereBetween('next_occurrence', [globalStart, globalEnd])
        .select(
          knex.raw(`${yearMonthExpr} as month_key`),
          knex.raw("SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income"),
          knex.raw("SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses"),
        )
        .groupByRaw(yearMonthExpr),
      knex('credit_card_cycles as ccc')
        .join('credit_cards as cc', 'ccc.credit_card_id', 'cc.id')
        .where('cc.user_id', userId)
        .whereBetween('ccc.debit_date', [globalStart, globalEnd])
        .select(knex.raw(`${yearMonthDebitExpr} as month_key`))
        .sum('ccc.total_amount as total')
        .groupByRaw(yearMonthDebitExpr),
    ]);

    const plannedMap = {};
    for (const row of plannedRows) {
      plannedMap[row.month_key] = row;
    }
    const deferredMap = {};
    for (const row of deferredRows) {
      deferredMap[row.month_key] = row;
    }

    const result = [];
    for (let i = 0; i <= months; i++) {
      const monthStart = startOfMonth(addMonths(today, i));
      const key = formatDateISO(monthStart).slice(0, 7);
      const planned = plannedMap[key];
      const deferred = deferredMap[key];

      const income = planned?.income || 0;
      const expenses = (planned?.expenses || 0) + (deferred?.total || 0);
      result.push({
        month: key,
        plannedIncome: income,
        plannedExpenses: expenses,
        netFlow: income - expenses,
      });
    }

    return result;
  }
}

export default ForecastService;
