import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userSettings, setUserSettings] = useState(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data } = await authApi.getMe()
      setUser(data.data.user)
      setNeedsSetup(false)
      // Load user settings
      try {
        const settingsRes = await authApi.getSettings()
        setUserSettings(settingsRes.data.data.settings)
      } catch {
        setUserSettings(null)
      }
    } catch (error) {
      setUser(null)
      setUserSettings(null)
      // Check if application needs initial setup
      try {
        const { data } = await authApi.getSetupStatus()
        setNeedsSetup(data.data.needsSetup)
      } catch {
        setNeedsSetup(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (newSettings) => {
    const { data } = await authApi.updateSettings(newSettings)
    setUserSettings(data.data.settings)
    return data
  }

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password })
    setUser(data.data.user)
    setNeedsSetup(false)
    // Load settings after login
    try {
      const settingsRes = await authApi.getSettings()
      setUserSettings(settingsRes.data.data.settings)
    } catch {
      setUserSettings(null)
    }
    return data
  }

  const register = async (userData) => {
    const { data } = await authApi.register(userData)
    setUser(data.data.user)
    setNeedsSetup(false)
    // Load settings after register
    try {
      const settingsRes = await authApi.getSettings()
      setUserSettings(settingsRes.data.data.settings)
    } catch {
      setUserSettings(null)
    }
    return data
  }

  const logout = async () => {
    await authApi.logout()
    setUser(null)
    setUserSettings(null)
  }

  return (
    <AuthContext.Provider value={{ user, userSettings, needsSetup, loading, login, register, logout, checkAuth, updateSettings }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
