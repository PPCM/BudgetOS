import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TransactionExpandedRow, { hasExpandableDetails } from '../../src/components/TransactionExpandedRow'

// Base transaction with no extra details
const baseTx = {
  id: 'tx-1',
  notes: null,
  checkNumber: null,
  tags: [],
  status: 'pending',
  valueDate: null,
  purchaseDate: null,
  accountingDate: null,
  isRecurring: false,
  type: 'expense',
  linkedAccountName: null,
}

describe('hasExpandableDetails', () => {
  it('returns false for a transaction with no extra details', () => {
    expect(hasExpandableDetails(baseTx)).toBe(false)
  })

  it('returns true when transaction has notes', () => {
    expect(hasExpandableDetails({ ...baseTx, notes: 'Some note' })).toBe(true)
  })

  it('returns true when transaction has checkNumber', () => {
    expect(hasExpandableDetails({ ...baseTx, checkNumber: 'CHK-001' })).toBe(true)
  })

  it('returns true when transaction has tags', () => {
    expect(hasExpandableDetails({ ...baseTx, tags: ['food'] })).toBe(true)
  })

  it('returns false when tags is an empty array', () => {
    expect(hasExpandableDetails({ ...baseTx, tags: [] })).toBe(false)
  })

  it('returns true when transaction has valueDate', () => {
    expect(hasExpandableDetails({ ...baseTx, valueDate: '2026-01-20' })).toBe(true)
  })

  it('returns true when transaction has purchaseDate', () => {
    expect(hasExpandableDetails({ ...baseTx, purchaseDate: '2026-01-18' })).toBe(true)
  })

  it('returns true when transaction has accountingDate', () => {
    expect(hasExpandableDetails({ ...baseTx, accountingDate: '2026-01-22' })).toBe(true)
  })

  it('returns true when transaction is recurring', () => {
    expect(hasExpandableDetails({ ...baseTx, isRecurring: true })).toBe(true)
  })

  it('returns true for transfer with linkedAccountName', () => {
    expect(hasExpandableDetails({
      ...baseTx,
      type: 'transfer',
      linkedAccountName: 'Livret A',
    })).toBe(true)
  })

  it('returns false for transfer without linkedAccountName', () => {
    expect(hasExpandableDetails({
      ...baseTx,
      type: 'transfer',
      linkedAccountName: null,
    })).toBe(false)
  })
})

// Helper to render inside a table structure
function renderRow(tx) {
  return render(
    <table>
      <tbody>
        <TransactionExpandedRow tx={tx} colSpan={8} />
      </tbody>
    </table>
  )
}

describe('TransactionExpandedRow', () => {
  it('renders check number when present', () => {
    renderRow({ ...baseTx, checkNumber: 'CHK-042' })
    expect(screen.getByText('N° de chèque :')).toBeInTheDocument()
    expect(screen.getByText('CHK-042')).toBeInTheDocument()
  })

  it('renders notes when present', () => {
    renderRow({ ...baseTx, notes: 'Weekly groceries' })
    expect(screen.getByText('Notes :')).toBeInTheDocument()
    expect(screen.getByText('Weekly groceries')).toBeInTheDocument()
  })

  it('renders tags when present', () => {
    renderRow({ ...baseTx, tags: ['food', 'weekly'] })
    expect(screen.getByText('Tags :')).toBeInTheDocument()
    expect(screen.getByText('food')).toBeInTheDocument()
    expect(screen.getByText('weekly')).toBeInTheDocument()
  })

  it('renders recurring indicator', () => {
    renderRow({ ...baseTx, isRecurring: true })
    expect(screen.getByText('Récurrente :')).toBeInTheDocument()
    expect(screen.getByText('Oui')).toBeInTheDocument()
  })

  it('renders linked account for transfers', () => {
    renderRow({ ...baseTx, type: 'transfer', linkedAccountName: 'Livret A' })
    expect(screen.getByText('Compte lié :')).toBeInTheDocument()
    expect(screen.getByText('Livret A')).toBeInTheDocument()
  })

  it('does not render status field', () => {
    renderRow({ ...baseTx, notes: 'test', status: 'pending' })
    expect(screen.queryByText('Statut :')).not.toBeInTheDocument()
    expect(screen.queryByText('En attente')).not.toBeInTheDocument()
  })

  it('does not render check number when null', () => {
    renderRow({ ...baseTx, notes: 'test', checkNumber: null })
    expect(screen.queryByText('N° de chèque :')).not.toBeInTheDocument()
  })

  it('renders value date when present', () => {
    renderRow({ ...baseTx, valueDate: '2026-01-20' })
    expect(screen.getByText('Date de valeur :')).toBeInTheDocument()
  })

  it('renders purchase date when present', () => {
    renderRow({ ...baseTx, purchaseDate: '2026-01-18' })
    expect(screen.getByText("Date d'achat :")).toBeInTheDocument()
  })

  it('renders multiple details together', () => {
    renderRow({
      ...baseTx,
      notes: 'A note',
      checkNumber: 'CHK-100',
      isRecurring: true,
    })
    expect(screen.getByText('Notes :')).toBeInTheDocument()
    expect(screen.getByText('N° de chèque :')).toBeInTheDocument()
    expect(screen.getByText('Récurrente :')).toBeInTheDocument()
  })
})
