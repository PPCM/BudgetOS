import { normalizeDescription } from './helpers.js';

/**
 * Extract the last 4 digits of a credit card from a bank description.
 * Matches patterns like "CB*7166", "CB *1234", "CB*1234" at end of string.
 * @param {string} description - Raw bank description
 * @returns {string|null} Last 4 digits or null
 */
export function extractCBCardLast4(description) {
  if (!description) return null;
  const match = description.match(/CB\s?\*\s?(\d{4})\s*$/i);
  return match ? match[1] : null;
}

/**
 * Extract the purchase date from a bank description.
 * Matches patterns like "CARTE 28/12/25" or "CARTE 28/12/2025".
 * @param {string} description - Raw bank description
 * @returns {string|null} ISO date string (YYYY-MM-DD) or null
 */
export function extractPurchaseDate(description) {
  if (!description) return null;
  const match = description.match(/CARTE\s+(\d{2})\/(\d{2})\/(\d{2,4})/i);
  if (!match) return null;

  const day = match[1];
  const month = match[2];
  let year = match[3];

  // Convert 2-digit year to 4-digit
  if (year.length === 2) {
    const yearNum = parseInt(year, 10);
    year = (yearNum >= 70 ? '19' : '20') + year;
  }

  return `${year}-${month}-${day}`;
}

/**
 * Extract a clean merchant pattern from a bank description.
 * Removes CARTE dd/MM/yy, CB*XXXX, VIR SEPA, PRLV SEPA, PAIEMENT PAR CARTE prefixes,
 * then normalizes the result.
 * @param {string} description - Raw bank description
 * @returns {string} Normalized merchant pattern
 */
export function extractMerchantPattern(description) {
  if (!description) return '';

  let cleaned = description;

  // Remove CARTE dd/MM/yy or CARTE dd/MM/yyyy prefix
  cleaned = cleaned.replace(/CARTE\s+\d{2}\/\d{2}\/\d{2,4}\s*/i, '');

  // Remove CB*XXXX suffix
  cleaned = cleaned.replace(/\s*CB\s?\*\s?\d{4}\s*$/i, '');

  // Remove common bank prefixes
  cleaned = cleaned.replace(/^VIR(?:EMENT)?\s+SEPA\s*/i, '');
  cleaned = cleaned.replace(/^PRLV\s+SEPA\s*/i, '');
  cleaned = cleaned.replace(/^PAIEMENT\s+PAR\s+CARTE\s*/i, '');
  cleaned = cleaned.replace(/^PAIEMENT\s+CB\s*/i, '');
  cleaned = cleaned.replace(/^RETRAIT\s+DAB\s*/i, '');
  cleaned = cleaned.replace(/^CHQ\s*\.?\s*/i, '');
  cleaned = cleaned.replace(/^CHEQUE\s*/i, '');

  return normalizeDescription(cleaned);
}

/**
 * Analyze a bank description and extract all available metadata.
 * @param {string} description - Raw bank description
 * @returns {{ cbLast4: string|null, purchaseDate: string|null, merchantPattern: string, isCardPayment: boolean }}
 */
export function analyzeBankDescription(description) {
  const cbLast4 = extractCBCardLast4(description);
  const purchaseDate = extractPurchaseDate(description);
  const merchantPattern = extractMerchantPattern(description);
  const isCardPayment = !!(cbLast4 || /CARTE\s+\d{2}\/\d{2}/i.test(description || ''));

  return {
    cbLast4,
    purchaseDate,
    merchantPattern,
    isCardPayment,
  };
}
