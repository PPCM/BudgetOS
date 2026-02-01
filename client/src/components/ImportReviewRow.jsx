import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, CreditCard, ArrowRightLeft, PlusCircle, XCircle, CheckCircle, Link2, RefreshCw, Loader2 } from 'lucide-react'
import SearchableSelect from './SearchableSelect'
import { formatCurrency, formatDate } from '../lib/utils'
import { importApi } from '../lib/api'

const matchTypeBadge = {
  duplicate: { labelKey: 'import.matchTypes.duplicate', bg: 'bg-gray-100 text-gray-700' },
  exact: { labelKey: 'import.matchTypes.exact', bg: 'bg-blue-100 text-blue-700' },
  probable: { labelKey: 'import.matchTypes.probable', bg: 'bg-amber-100 text-amber-700' },
  new: { labelKey: 'import.matchTypes.new', bg: 'bg-green-100 text-green-700' },
}

export default function ImportReviewRow({
  transaction,
  index,
  payees,
  creditCards,
  accountId,
  onUpdate,
}) {
  const { t } = useTranslation()
  const [manualExpanded, setManualExpanded] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [showCandidates, setShowCandidates] = useState(false)
  const [loadingCandidates, setLoadingCandidates] = useState(false)

  const tx = transaction
  const badge = matchTypeBadge[tx.matchType] || matchTypeBadge.new

  // Default action based on match type
  const defaultAction = tx.matchType === 'duplicate' ? 'skip'
    : tx.matchType === 'exact' ? 'match'
    : tx.matchType === 'probable' ? 'match'
    : 'create'

  const action = tx._action || defaultAction
  const payeeId = tx._payeeId !== undefined ? tx._payeeId : (tx.suggestedPayeeId || null)
  const creditCardId = tx._creditCardId !== undefined ? tx._creditCardId : (tx.creditCardId || null)

  const handleChange = (field, value) => {
    onUpdate(index, { [`_${field}`]: value })
  }

  // Unified matched transaction: manual override or auto-detected
  const matchedTx = tx._matchedTransaction || tx.matchedTransaction
  const hasMatch = matchedTx != null

  // Auto-expand when action is "match", allow manual toggle otherwise
  const isAutoExpanded = action === 'match' && hasMatch
  const showExpanded = isAutoExpanded || manualExpanded

  // Reset manual expand and candidates when action changes to match
  useEffect(() => {
    if (action === 'match') {
      setManualExpanded(false)
      setShowCandidates(false)
    }
  }, [action])

  // Resolve payee name from matchedTx (backend provides it) or fallback to local lookup
  const matchedPayeeName = hasMatch
    ? (matchedTx.payeeName || payees.find(p => p.id === matchedTx.payeeId)?.name || null)
    : null

  // Fetch candidate transactions for manual matching
  const fetchCandidates = async () => {
    setLoadingCandidates(true)
    try {
      const { data } = await importApi.getMatchCandidates({
        accountId, amount: tx.amount, date: tx.date
      })
      setCandidates(data.data || [])
      setShowCandidates(true)
    } finally {
      setLoadingCandidates(false)
    }
  }

  // Select a candidate from the list
  const selectCandidate = (candidate) => {
    handleChange('matchedTransaction', {
      id: candidate.id,
      date: candidate.date,
      amount: candidate.amount,
      description: candidate.description,
      payeeId: candidate.payeeId,
      payeeName: candidate.payeeName,
    })
    handleChange('action', 'match')
    setShowCandidates(false)
    setCandidates([])
  }

  // Handle CheckCircle click
  const handleMatchClick = () => {
    if (hasMatch && action !== 'match') {
      handleChange('action', 'match')
    } else if (!hasMatch) {
      fetchCandidates()
    } else {
      // Already match action with existing match — toggle expand
      setManualExpanded(!manualExpanded)
    }
  }

  return (
    <>
      <tr className={`border-b border-gray-100 ${action === 'skip' ? 'opacity-50' : ''}`}>
        {/* Date */}
        <td className="px-3 py-2 text-sm whitespace-nowrap">
          {tx.date}
          {tx.purchaseDate && tx.purchaseDate !== tx.date && (
            <div className="text-xs text-gray-400">{t('import.purchaseDate', { date: tx.purchaseDate })}</div>
          )}
        </td>

        {/* Description */}
        <td className="px-3 py-2 text-sm max-w-xs">
          <div className="truncate" title={tx.description}>{tx.description}</div>
          {tx.merchantPattern && (
            <div className="text-xs text-gray-400 truncate">{tx.merchantPattern}</div>
          )}
        </td>

        {/* Amount */}
        <td className={`px-3 py-2 text-sm text-right font-medium whitespace-nowrap ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(tx.amount)}
        </td>

        {/* Status badge */}
        <td className="px-3 py-2 text-sm">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg}`}>
            {t(badge.labelKey)}
            {tx.score && <span className="ml-1 opacity-60">({tx.score})</span>}
          </span>
        </td>

        {/* Credit card */}
        <td className="px-3 py-2 text-sm whitespace-nowrap">
          {tx.cbLast4 ? (
            tx.creditCardName ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                <CreditCard className="w-3 h-3" />
                {tx.creditCardName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                <CreditCard className="w-3 h-3" />
                CB*{tx.cbLast4} ?
              </span>
            )
          ) : null}
        </td>

        {/* Payee */}
        <td className="px-3 py-2 text-sm" style={{ minWidth: '180px' }}>
          {action === 'match' && hasMatch ? (
            <span className="inline-flex items-center gap-1 text-xs text-gray-700 italic">
              <Link2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
              {matchedPayeeName || '—'}
            </span>
          ) : action !== 'skip' ? (
            <SearchableSelect
              value={payeeId}
              onChange={(val) => handleChange('payeeId', val)}
              options={payees}
              placeholder={t('import.payeePlaceholder')}
              className="text-xs"
              allowCreate={false}
            />
          ) : tx.suggestedPayeeName ? (
            <span className="text-xs text-gray-500">{tx.suggestedPayeeName}</span>
          ) : null}
        </td>

        {/* Action icons */}
        <td className="px-3 py-2 text-sm">
          <div className="flex items-center gap-1">
            <button
              type="button"
              title={t('import.actions.create')}
              data-action="create"
              onClick={() => handleChange('action', 'create')}
              className={`p-0.5 rounded transition-colors ${
                action === 'create'
                  ? 'text-blue-500'
                  : 'text-gray-300 hover:text-blue-400'
              }`}
            >
              <PlusCircle className="w-5 h-5" />
            </button>
            <button
              type="button"
              title={t('import.actions.skip')}
              data-action="skip"
              onClick={() => handleChange('action', 'skip')}
              className={`p-0.5 rounded transition-colors ${
                action === 'skip'
                  ? 'text-gray-500'
                  : 'text-gray-300 hover:text-gray-400'
              }`}
            >
              <XCircle className="w-5 h-5" />
            </button>
            <button
              type="button"
              title={t('import.actions.match')}
              data-action="match"
              onClick={handleMatchClick}
              className={`p-0.5 rounded transition-colors ${
                loadingCandidates
                  ? 'text-gray-400'
                  : action === 'match'
                    ? 'text-green-500'
                    : 'text-gray-300 hover:text-green-400'
              }`}
            >
              {loadingCandidates
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <CheckCircle className="w-5 h-5" />
              }
            </button>
          </div>
        </td>

        {/* Expand button */}
        <td className="px-2 py-2">
          {hasMatch && !isAutoExpanded && (
            <button
              type="button"
              onClick={() => setManualExpanded(!manualExpanded)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {manualExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </td>
      </tr>

      {/* Expanded row: show candidates list */}
      {showCandidates && (
        <tr className="bg-amber-50/50 border-b border-gray-100">
          <td colSpan="8" className="px-3 py-2">
            <div className="text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-700">{t('import.candidates', { count: candidates.length })}</span>
                <button
                  type="button"
                  onClick={() => { setShowCandidates(false); setCandidates([]) }}
                  className="text-gray-500 hover:text-gray-700 underline text-xs"
                >
                  {t('common.cancel')}
                </button>
              </div>
              {candidates.length === 0 ? (
                <p className="text-gray-500 italic py-2">{t('import.noCandidates')}</p>
              ) : (
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {candidates.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => selectCandidate(c)}
                      className="flex items-center gap-4 px-2 py-1.5 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                    >
                      <span className="whitespace-nowrap">{c.date}</span>
                      <span className="flex-1 truncate">{c.description}</span>
                      <span className="text-gray-600 truncate max-w-[120px]">{c.payeeName || '—'}</span>
                      <span className={`whitespace-nowrap font-medium ${c.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(c.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}

      {/* Expanded row: show matched transaction details */}
      {showExpanded && hasMatch && !showCandidates && (
        <tr className="bg-blue-50/50 border-b border-gray-100">
          <td colSpan="8" className="px-3 py-2">
            <div className="flex items-center gap-4 text-xs">
              <ArrowRightLeft className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-5 gap-4">
                <div>
                  <span className="text-gray-500">{t('import.matchedDate')}:</span>{' '}
                  <span className="font-medium">{matchedTx.date}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">{t('import.matchedDescription')}:</span>{' '}
                  <span className="font-medium">{matchedTx.description}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('import.matchedPayee')}:</span>{' '}
                  <span className="font-medium">{matchedPayeeName || '—'}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500">{t('import.matchedAmount')}:</span>{' '}
                  <span className={`font-medium ${matchedTx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(matchedTx.amount)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                title={t('import.changeMatch')}
                onClick={fetchCandidates}
                className="p-1 hover:bg-blue-100 rounded text-blue-500 hover:text-blue-700 transition-colors flex-shrink-0"
              >
                {loadingCandidates
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <RefreshCw className="w-4 h-4" />
                }
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
