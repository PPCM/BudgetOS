import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { preloadCsrfToken } from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Toujours rafraîchir le token CSRF avant le login
      await preloadCsrfToken()
      await login(email, password)
      navigate('/')
    } catch (err) {
      console.error('Login error:', err.response?.status, err.response?.data)
      const message = err.response?.data?.error?.message || 'Erreur de connexion'
      const code = err.response?.data?.error?.code
      if (code === 'CSRF_TOKEN_INVALID') {
        setError('Erreur de sécurité, veuillez réessayer')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
              <span className="text-2xl font-bold text-primary-600">B</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">BudgetOS</h1>
            <p className="text-gray-600 mt-2">Connectez-vous à votre compte</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="vous@exemple.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Se connecter
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Créer un compte
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 text-center">
              <strong>Compte démo :</strong><br />
              admin@budgetos.local / Admin123!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
