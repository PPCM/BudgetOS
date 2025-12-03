import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import { 
  Upload, FileSpreadsheet, CheckCircle, XCircle, 
  AlertTriangle, ChevronRight, RefreshCw 
} from 'lucide-react'
import axios from 'axios'

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
  const [preview, setPreview] = useState(null)
  const [matches, setMatches] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef()
  const queryClient = useQueryClient()

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll().then(r => r.data),
  })
  const accounts = accountsData?.data

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (f) {
      setFile(f)
      const ext = f.name.split('.').pop().toLowerCase()
      if (['xlsx', 'xls'].includes(ext)) setFileType('excel')
      else if (ext === 'qif') setFileType('qif')
      else if (['qfx', 'ofx'].includes(ext)) setFileType('qfx')
      else setFileType('csv')
    }
  }

  const handlePreview = async () => {
    if (!file || !accountId) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileType', fileType)
      formData.append('config', JSON.stringify(config))
      
      const { data } = await axios.post('/api/v1/import/preview', formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPreview(data.data)
      setStep(2)
    } catch (err) {
      alert('Erreur lors de la prévisualisation: ' + (err.response?.data?.error?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = async () => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('accountId', accountId)
      formData.append('fileType', fileType)
      formData.append('config', JSON.stringify(config))

      const { data } = await axios.post('/api/v1/import/process', formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMatches(data.data)
      setStep(3)
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async () => {
    setLoading(true)
    try {
      const actions = {}
      matches.transactions.forEach((tx, i) => {
        if (tx.matchType === 'duplicate') {
          actions[i] = { action: 'skip' }
        } else if (tx.matchType === 'new') {
          actions[i] = { action: 'create', transactionData: tx }
        } else {
          actions[i] = { action: 'match', matchedTransactionId: tx.matchedTransaction?.id, transactionData: tx }
        }
      })

      await axios.post('/api/v1/import/validate', {
        importId: matches.importId,
        actions,
        autoCategories: true,
      }, { withCredentials: true })

      queryClient.invalidateQueries(['transactions'])
      queryClient.invalidateQueries(['accounts'])
      setStep(4)
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep(1)
    setFile(null)
    setPreview(null)
    setMatches(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import bancaire</h1>
        <p className="text-gray-600">Importez vos relevés bancaires</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {s}
            </div>
            {s < 4 && <ChevronRight className="w-5 h-5 text-gray-400 mx-1" />}
          </div>
        ))}
      </div>

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
                <label className="block text-sm font-medium text-gray-700 mb-1">Colonne date</label>
                <input
                  type="number"
                  min="0"
                  value={config.columns.date}
                  onChange={(e) => setConfig({ ...config, columns: { ...config.columns, date: parseInt(e.target.value) } })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Colonne description</label>
                <input
                  type="number"
                  min="0"
                  value={config.columns.description}
                  onChange={(e) => setConfig({ ...config, columns: { ...config.columns, description: parseInt(e.target.value) } })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Colonne montant</label>
                <input
                  type="number"
                  min="0"
                  value={config.columns.amount}
                  onChange={(e) => setConfig({ ...config, columns: { ...config.columns, amount: parseInt(e.target.value) } })}
                  className="input"
                />
              </div>
            </div>
          )}

          <button
            onClick={handlePreview}
            disabled={!file || !accountId || loading}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Prévisualiser'}
          </button>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && preview && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Prévisualisation ({preview.totalRows} lignes)</h2>
            <button onClick={() => setStep(1)} className="text-sm text-primary-600 hover:underline">
              Modifier les paramètres
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.preview.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{row.description}</td>
                    <td className={`px-3 py-2 text-right font-medium ${row.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleProcess}
            disabled={loading}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Analyser les correspondances'}
          </button>
        </div>
      )}

      {/* Step 3: Matches */}
      {step === 3 && matches && (
        <div className="card space-y-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold">{matches.summary.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{matches.summary.new}</p>
              <p className="text-sm text-gray-600">Nouvelles</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{matches.summary.matches}</p>
              <p className="text-sm text-gray-600">Correspondances</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-600">{matches.summary.duplicates}</p>
              <p className="text-sm text-gray-600">Doublons</p>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {matches.transactions.slice(0, 50).map((tx, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${
                tx.matchType === 'duplicate' ? 'bg-amber-50' :
                tx.matchType === 'new' ? 'bg-green-50' : 'bg-blue-50'
              }`}>
                {tx.matchType === 'duplicate' && <XCircle className="w-5 h-5 text-amber-600" />}
                {tx.matchType === 'new' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {['exact', 'probable'].includes(tx.matchType) && <AlertTriangle className="w-5 h-5 text-blue-600" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{tx.description}</p>
                  <p className="text-sm text-gray-500">{tx.date}</p>
                </div>
                <span className={`font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={handleValidate}
            disabled={loading}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Valider l\'import'}
          </button>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <div className="card text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Import terminé !</h2>
          <p className="text-gray-600 mb-6">Les transactions ont été importées avec succès.</p>
          <button onClick={reset} className="btn btn-primary">
            Nouvel import
          </button>
        </div>
      )}
    </div>
  )
}
