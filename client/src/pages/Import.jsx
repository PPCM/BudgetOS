import { useState, useRef, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { accountsApi, payeesApi, creditCardsApi, importApi } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import {
  Upload, FileSpreadsheet, CheckCircle,
  ChevronRight, RefreshCw, Filter, CreditCard
} from 'lucide-react'
import ImportReviewRow from '../components/ImportReviewRow'

export default function Import() {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [accountId, setAccountId] = useState('')
  const [fileType, setFileType] = useState('csv')
  const [config, setConfig] = useState({
    delimiter: ';',
    hasHeader: true,
    dateFormat: 'dd/MM/yyyy',
    decimalSeparator: ',',
    columns: { date: 0, description: 1, amount: 2 },
  })
  const [analyzeResult, setAnalyzeResult] = useState(null)
  const [confirmResult, setConfirmResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState(null)
  const fileInputRef = useRef()
  const queryClient = useQueryClient()

  // Load accounts
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll().then(r => r.data),
  })
  const accounts = accountsData?.data

  // Load payees
  const { data: payeesData } = useQuery({
    queryKey: ['payees'],
    queryFn: () => payeesApi.getAll({ limit: 500 }).then(r => r.data),
  })
  const payees = payeesData?.data || []

  // Load credit cards
  const { data: creditCardsData } = useQuery({
    queryKey: ['creditCards'],
    queryFn: () => creditCardsApi.getAll().then(r => r.data),
  })
  const creditCards = creditCardsData?.data || []

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (f) {
      setFile(f)
      setError(null)
      const ext = f.name.split('.').pop().toLowerCase()
      if (['xlsx', 'xls'].includes(ext)) setFileType('excel')
      else if (ext === 'qif') setFileType('qif')
      else if (['qfx', 'ofx'].includes(ext)) setFileType('qfx')
      else setFileType('csv')
    }
  }

  // Step 1 → Step 2: Analyze
  const handleAnalyze = async () => {
    if (!file || !accountId) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('accountId', accountId)
      formData.append('fileType', fileType)
      formData.append('config', JSON.stringify(config))

      const { data } = await importApi.analyze(formData)
      setAnalyzeResult(data.data)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  // Update a transaction in the review table
  const handleUpdateTransaction = (index, updates) => {
    setAnalyzeResult(prev => {
      const txs = [...prev.transactions]
      txs[index] = { ...txs[index], ...updates }
      return { ...prev, transactions: txs }
    })
  }

  // Bulk actions
  const handleSkipAllDuplicates = () => {
    setAnalyzeResult(prev => {
      const txs = prev.transactions.map(tx =>
        tx.matchType === 'duplicate' ? { ...tx, _action: 'skip' } : tx
      )
      return { ...prev, transactions: txs }
    })
  }

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (!analyzeResult) return []
    const txs = analyzeResult.transactions
    if (filter === 'all') return txs
    if (filter === 'new') return txs.filter(t => t.matchType === 'new')
    if (filter === 'matches') return txs.filter(t => ['exact', 'probable'].includes(t.matchType))
    if (filter === 'duplicates') return txs.filter(t => t.matchType === 'duplicate')
    return txs
  }, [analyzeResult, filter])

  // Step 2 → Step 3: Confirm
  const handleConfirm = async () => {
    if (!analyzeResult) return
    setLoading(true)
    setError(null)
    try {
      const actions = {}
      analyzeResult.transactions.forEach((tx, i) => {
        const action = tx._action || (
          tx.matchType === 'duplicate' ? 'skip'
          : tx.matchType === 'exact' ? 'match'
          : tx.matchType === 'probable' ? 'match'
          : 'create'
        )

        const entry = { action }

        if (action === 'match') {
          const matchedTx = tx._matchedTransaction || tx.matchedTransaction
          if (matchedTx) entry.matchedTransactionId = matchedTx.id
        }

        if (action === 'create' || action === 'match') {
          const payeeId = tx._payeeId !== undefined ? tx._payeeId : (tx.suggestedPayeeId || null)
          if (payeeId) entry.payeeId = payeeId

          const creditCardId = tx._creditCardId !== undefined ? tx._creditCardId : (tx.creditCardId || null)
          if (creditCardId) entry.creditCardId = creditCardId

          if (tx.merchantPattern) entry.merchantPattern = tx.merchantPattern
        }

        actions[String(i)] = entry
      })

      const { data } = await importApi.confirm({
        importId: analyzeResult.importId,
        actions,
        autoCategories: true,
      })

      setConfirmResult(data.data)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep(1)
    setFile(null)
    setAnalyzeResult(null)
    setConfirmResult(null)
    setFilter('all')
    setError(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import bancaire</h1>
        <p className="text-gray-600">Importez et rapprochez vos relevés bancaires</p>
      </div>

      {/* Steps indicator + action buttons */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: 'Fichier' },
          { n: 2, label: 'Revue' },
          { n: 3, label: 'Résultat' },
        ].map(({ n, label }) => (
          <div key={n} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= n ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {n}
              </div>
              <span className="text-sm text-gray-600 hidden sm:inline">{label}</span>
            </div>
            {n < 3 && <ChevronRight className="w-5 h-5 text-gray-400 mx-2" />}
          </div>
        ))}
        {step === 2 && (
          <>
            <div className="flex-1" />
            <button
              onClick={() => { setStep(1); setAnalyzeResult(null) }}
              className="btn btn-secondary"
            >
              Modifier les paramètres
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="btn btn-primary flex items-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Confirmer l'import"}
            </button>
          </>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: File selection */}
      {step === 1 && (
        <div className="card space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Compte de destination</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="input"
            >
              <option value="">Sélectionner un compte</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fichier à importer</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.qif,.qfx,.ofx"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-10 h-10 text-primary-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Cliquez pour sélectionner un fichier</p>
                  <p className="text-sm text-gray-400 mt-1">CSV, Excel, QIF, OFX/QFX</p>
                </>
              )}
            </div>
          </div>

          {fileType === 'csv' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Délimiteur</label>
                <select
                  value={config.delimiter}
                  onChange={(e) => setConfig({ ...config, delimiter: e.target.value })}
                  className="input"
                >
                  <option value=";">Point-virgule (;)</option>
                  <option value=",">Virgule (,)</option>
                  <option value="\t">Tabulation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format date</label>
                <select
                  value={config.dateFormat}
                  onChange={(e) => setConfig({ ...config, dateFormat: e.target.value })}
                  className="input"
                >
                  <option value="dd/MM/yyyy">JJ/MM/AAAA</option>
                  <option value="MM/dd/yyyy">MM/JJ/AAAA</option>
                  <option value="yyyy-MM-dd">AAAA-MM-JJ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Séparateur décimal</label>
                <select
                  value={config.decimalSeparator}
                  onChange={(e) => setConfig({ ...config, decimalSeparator: e.target.value })}
                  className="input"
                >
                  <option value=",">Virgule (,)</option>
                  <option value=".">Point (.)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Colonne date</label>
                <input
                  type="number"
                  min="0"
                  value={config.columns.date}
                  onChange={(e) => setConfig({ ...config, columns: { ...config.columns, date: parseInt(e.target.value) || 0 } })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Colonne description</label>
                <input
                  type="number"
                  min="0"
                  value={config.columns.description}
                  onChange={(e) => setConfig({ ...config, columns: { ...config.columns, description: parseInt(e.target.value) || 0 } })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Colonne montant</label>
                <input
                  type="number"
                  min="0"
                  value={config.columns.amount}
                  onChange={(e) => setConfig({ ...config, columns: { ...config.columns, amount: parseInt(e.target.value) || 0 } })}
                  className="input"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!file || !accountId || loading}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Analyser'}
          </button>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 2 && analyzeResult && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-xl font-bold">{analyzeResult.summary.total}</p>
              <p className="text-xs text-gray-600">Total</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <p className="text-xl font-bold text-green-600">{analyzeResult.summary.new}</p>
              <p className="text-xs text-gray-600">Nouvelles</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-xl font-bold text-blue-600">{analyzeResult.summary.matches}</p>
              <p className="text-xs text-gray-600">Correspondances</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg text-center">
              <p className="text-xl font-bold text-gray-600">{analyzeResult.summary.duplicates}</p>
              <p className="text-xs text-gray-600">Doublons</p>
            </div>
            {analyzeResult.creditCardsDetected?.length > 0 && (
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <p className="text-xl font-bold text-purple-600">{analyzeResult.creditCardsDetected.length}</p>
                </div>
                <p className="text-xs text-gray-600">CB détectées</p>
              </div>
            )}
          </div>

          {/* Credit cards detected */}
          {analyzeResult.creditCardsDetected?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {analyzeResult.creditCardsDetected.map((cc) => (
                <span key={cc.last4} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  cc.creditCardName ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  <CreditCard className="w-3 h-3" />
                  CB*{cc.last4} {cc.creditCardName ? `→ ${cc.creditCardName}` : '(non associée)'}
                  <span className="opacity-60">({cc.count})</span>
                </span>
              ))}
            </div>
          )}

          {/* Filters and bulk actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            {[
              { key: 'all', label: 'Tous' },
              { key: 'new', label: 'Nouveaux' },
              { key: 'matches', label: 'Correspondances' },
              { key: 'duplicates', label: 'Doublons' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="flex-1" />
            {analyzeResult.summary.duplicates > 0 && (
              <button
                onClick={handleSkipAllDuplicates}
                className="text-xs text-gray-600 hover:text-gray-900 underline"
              >
                Ignorer tous les doublons
              </button>
            )}
          </div>

          {/* Transaction table */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Montant</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Statut</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">CB</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Tiers</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Action</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx, i) => {
                    // Find original index in full array
                    const originalIndex = analyzeResult.transactions.indexOf(tx)
                    return (
                      <ImportReviewRow
                        key={originalIndex}
                        transaction={tx}
                        index={originalIndex}
                        payees={payees}
                        creditCards={creditCards}
                        accountId={accountId}
                        onUpdate={handleUpdateTransaction}
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Step 3: Result */}
      {step === 3 && confirmResult && (
        <div className="card text-center py-12 space-y-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Import terminé !</h2>
            <p className="text-gray-600">Voici le résumé de l'import :</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto">
            {confirmResult.imported > 0 && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xl font-bold text-green-600">{confirmResult.imported}</p>
                <p className="text-xs text-gray-600">Créées</p>
              </div>
            )}
            {confirmResult.matched > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xl font-bold text-blue-600">{confirmResult.matched}</p>
                <p className="text-xs text-gray-600">Rapprochées</p>
              </div>
            )}
            {confirmResult.skipped > 0 && (
              <div className="p-3 bg-gray-100 rounded-lg">
                <p className="text-xl font-bold text-gray-600">{confirmResult.skipped}</p>
                <p className="text-xs text-gray-600">Ignorées</p>
              </div>
            )}
            {confirmResult.aliasesLearned > 0 && (
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xl font-bold text-purple-600">{confirmResult.aliasesLearned}</p>
                <p className="text-xs text-gray-600">Alias appris</p>
              </div>
            )}
          </div>

          {confirmResult.errors > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 max-w-lg mx-auto">
              {confirmResult.errors} erreur(s) pendant l'import
            </div>
          )}

          <button onClick={reset} className="btn btn-primary">
            Nouvel import
          </button>
        </div>
      )}
    </div>
  )
}
