/**
 * Bank patterns utility tests
 */
import { describe, it, expect } from 'vitest'
import {
  extractCBCardLast4,
  extractPurchaseDate,
  extractMerchantPattern,
  analyzeBankDescription,
} from '../../src/utils/bankPatterns.js'

describe('extractCBCardLast4', () => {
  it('extracts last 4 digits from CB*XXXX pattern', () => {
    expect(extractCBCardLast4('CARTE 28/12/25 PAYPAL CB*7166')).toBe('7166')
  })

  it('extracts with space before asterisk', () => {
    expect(extractCBCardLast4('CARTE 28/12/25 PAYPAL CB *1234')).toBe('1234')
  })

  it('extracts with trailing spaces', () => {
    expect(extractCBCardLast4('CARTE 28/12/25 PAYPAL CB*7166  ')).toBe('7166')
  })

  it('is case insensitive', () => {
    expect(extractCBCardLast4('CARTE 28/12/25 PAYPAL cb*7166')).toBe('7166')
  })

  it('returns null when no CB pattern', () => {
    expect(extractCBCardLast4('VIR SEPA SALAIRE')).toBeNull()
  })

  it('returns null for empty/null input', () => {
    expect(extractCBCardLast4('')).toBeNull()
    expect(extractCBCardLast4(null)).toBeNull()
    expect(extractCBCardLast4(undefined)).toBeNull()
  })

  it('ignores CB pattern not at end', () => {
    expect(extractCBCardLast4('CB*7166 SOME OTHER TEXT')).toBeNull()
  })
})

describe('extractPurchaseDate', () => {
  it('extracts date from CARTE dd/MM/yy pattern', () => {
    expect(extractPurchaseDate('CARTE 28/12/25 PAYPAL')).toBe('2025-12-28')
  })

  it('extracts date from CARTE dd/MM/yyyy pattern', () => {
    expect(extractPurchaseDate('CARTE 15/01/2026 AMAZON')).toBe('2026-01-15')
  })

  it('is case insensitive', () => {
    expect(extractPurchaseDate('carte 01/06/25 TEST')).toBe('2025-06-01')
  })

  it('returns null when no CARTE pattern', () => {
    expect(extractPurchaseDate('VIR SEPA SALAIRE')).toBeNull()
  })

  it('returns null for empty/null input', () => {
    expect(extractPurchaseDate('')).toBeNull()
    expect(extractPurchaseDate(null)).toBeNull()
  })

  it('handles 1970+ years for 2-digit year >= 70', () => {
    expect(extractPurchaseDate('CARTE 01/01/99 TEST')).toBe('1999-01-01')
  })
})

describe('extractMerchantPattern', () => {
  it('removes CARTE date and CB card number', () => {
    expect(extractMerchantPattern('CARTE 28/12/25 PAYPAL *ALIPAY EU CB*7166'))
      .toBe('paypal alipay eu')
  })

  it('removes VIR SEPA prefix', () => {
    expect(extractMerchantPattern('VIR SEPA JOHN DOE SALAIRE')).toBe('john doe salaire')
  })

  it('removes VIREMENT SEPA prefix', () => {
    expect(extractMerchantPattern('VIREMENT SEPA JOHN DOE')).toBe('john doe')
  })

  it('removes PRLV SEPA prefix', () => {
    expect(extractMerchantPattern('PRLV SEPA EDF')).toBe('edf')
  })

  it('removes PAIEMENT PAR CARTE prefix', () => {
    expect(extractMerchantPattern('PAIEMENT PAR CARTE AMAZON')).toBe('amazon')
  })

  it('removes PAIEMENT CB prefix', () => {
    expect(extractMerchantPattern('PAIEMENT CB FNAC')).toBe('fnac')
  })

  it('removes RETRAIT DAB prefix', () => {
    expect(extractMerchantPattern('RETRAIT DAB 01/01 PARIS')).toBe('0101 paris')
  })

  it('removes CHQ prefix', () => {
    expect(extractMerchantPattern('CHQ. 1234567')).toBe('1234567')
  })

  it('handles empty/null input', () => {
    expect(extractMerchantPattern('')).toBe('')
    expect(extractMerchantPattern(null)).toBe('')
  })

  it('normalizes accents and special characters', () => {
    expect(extractMerchantPattern('CARTE 15/01/26 CAFÉ DU THÉÂTRE'))
      .toBe('cafe du theatre')
  })
})

describe('analyzeBankDescription', () => {
  it('analyzes a full card payment description', () => {
    const result = analyzeBankDescription('CARTE 28/12/25 PAYPAL *ALIPAY EU CB*7166')
    expect(result).toEqual({
      cbLast4: '7166',
      purchaseDate: '2025-12-28',
      merchantPattern: 'paypal alipay eu',
      isCardPayment: true,
    })
  })

  it('detects card payment without CB number', () => {
    const result = analyzeBankDescription('CARTE 15/01/26 AMAZON.FR')
    expect(result.isCardPayment).toBe(true)
    expect(result.cbLast4).toBeNull()
    expect(result.purchaseDate).toBe('2026-01-15')
    expect(result.merchantPattern).toBe('amazonfr')
  })

  it('handles SEPA transfer', () => {
    const result = analyzeBankDescription('VIR SEPA JOHN DOE SALAIRE')
    expect(result.isCardPayment).toBe(false)
    expect(result.cbLast4).toBeNull()
    expect(result.purchaseDate).toBeNull()
    expect(result.merchantPattern).toBe('john doe salaire')
  })

  it('handles SEPA direct debit', () => {
    const result = analyzeBankDescription('PRLV SEPA EDF ELECTRICITE')
    expect(result.isCardPayment).toBe(false)
    expect(result.merchantPattern).toBe('edf electricite')
  })

  it('handles empty description', () => {
    const result = analyzeBankDescription('')
    expect(result).toEqual({
      cbLast4: null,
      purchaseDate: null,
      merchantPattern: '',
      isCardPayment: false,
    })
  })
})
