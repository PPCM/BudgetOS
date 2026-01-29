import ReportService from '../services/reportService.js';
import ForecastService from '../services/forecastService.js';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export const getDashboard = async (req, res) => {
  const summary = await ReportService.getDashboardSummary(req.user.id);
  res.json({ success: true, data: summary });
};

export const getExpensesByCategory = async (req, res) => {
  const { startDate, endDate, accountId } = req.query;
  const start = startDate || format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const end = endDate || format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const expenses = await ReportService.getExpensesByCategory(req.user.id, start, end, accountId);
  res.json({ success: true, data: { expenses, period: { startDate: start, endDate: end } } });
};

export const getIncomeByCategory = async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate || format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const end = endDate || format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const income = await ReportService.getIncomeByCategory(req.user.id, start, end);
  res.json({ success: true, data: { income, period: { startDate: start, endDate: end } } });
};

export const getMonthlyTrend = async (req, res) => {
  const months = parseInt(req.query.months) || 12;
  const trend = await ReportService.getMonthlyTrend(req.user.id, months);
  res.json({ success: true, data: { trend } });
};

export const getExpensesByCreditCard = async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate || format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const end = endDate || format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const expenses = await ReportService.getExpensesByCreditCard(req.user.id, start, end);
  res.json({ success: true, data: { expenses } });
};

export const getMonthComparison = async (req, res) => {
  const { month1, month2 } = req.query;
  const comparison = await ReportService.getMonthComparison(req.user.id, month1, month2);
  res.json({ success: true, data: comparison });
};

export const getForecast = async (req, res) => {
  const { accountId, days } = req.query;
  const forecast = accountId
    ? await ForecastService.calculateForecast(req.user.id, accountId, parseInt(days) || 90)
    : await ForecastService.calculateGlobalForecast(req.user.id, parseInt(days) || 90);
  res.json({ success: true, data: { forecast } });
};

export const getMonthlyForecast = async (req, res) => {
  const months = parseInt(req.query.months) || 3;
  const forecast = await ForecastService.getMonthlyForecast(req.user.id, months);
  res.json({ success: true, data: { forecast } });
};
