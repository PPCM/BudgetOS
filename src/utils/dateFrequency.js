import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

/**
 * Advance a date by one period of the given frequency.
 * Shared helper used by PlannedTransaction model and ReportService.
 * @param {Date} date - The date to advance
 * @param {string} frequency - Frequency type
 * @returns {Date} The advanced date
 */
export function advanceByFrequency(date, frequency) {
  switch (frequency) {
    case 'daily': return addDays(date, 1);
    case 'weekly': return addWeeks(date, 1);
    case 'biweekly': return addWeeks(date, 2);
    case 'monthly': return addMonths(date, 1);
    case 'bimonthly': return addMonths(date, 2);
    case 'quarterly': return addMonths(date, 3);
    case 'semiannual': return addMonths(date, 6);
    case 'annual': return addYears(date, 1);
    case 'once': return addYears(date, 100);
    default: return addMonths(date, 1);
  }
}
