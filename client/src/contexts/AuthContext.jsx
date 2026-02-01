import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../lib/api'
import i18n from '../i18n'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userSettings, setUserSettings] = useState(null)
  const [userGroups, setUserGroups] = useState([])
  const [needsSetup, setNeedsSetup] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data } = await authApi.getMe()
      setUser(data.data.user)
      setUserGroups(data.data.groups || [])
      setNeedsSetup(false)
      if (data.data.user?.locale) i18n.changeLanguage(data.data.user.locale)
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
      setUserGroups([])
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
    if (newSettings.locale) i18n.changeLanguage(newSettings.locale)
    return data
  }

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password })
    // Reload full user data (user, settings, groups) via checkAuth
    await checkAuth()
    return data
  }

  const register = async (userData) => {
    const { data } = await authApi.register(userData)
    // Reload full user data (user, settings, groups) via checkAuth
    await checkAuth()
    return data
  }

  const logout = async () => {
    await authApi.logout()
    setUser(null)
    setUserSettings(null)
    setUserGroups([])
  }

  const isGroupAdmin = userGroups.some(g => g.memberRole === 'admin')

  return (
    <AuthContext.Provider value={{ user, userSettings, userGroups, isGroupAdmin, needsSetup, loading, login, register, logout, checkAuth, updateSettings }}>
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
