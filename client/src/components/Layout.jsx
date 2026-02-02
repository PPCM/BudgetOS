import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Wallet, ArrowLeftRight, CreditCard,
  Tags, BarChart3, LogOut, Menu, X, Upload, Repeat,
  Wand2, Settings, Users, Shield, FolderTree, Cog
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'

const navigation = [
  { name: 'nav.dashboard', href: '/', icon: LayoutDashboard },
  { name: 'nav.accounts', href: '/accounts', icon: Wallet },
  { name: 'nav.transactions', href: '/transactions', icon: ArrowLeftRight },
  { name: 'nav.recurring', href: '/planned', icon: Repeat },
  { name: 'nav.creditCards', href: '/credit-cards', icon: CreditCard },
  { name: 'nav.categories', href: '/categories', icon: Tags },
  { name: 'nav.payees', href: '/payees', icon: Users },
  { name: 'nav.import', href: '/import', icon: Upload },
  { name: 'nav.rules', href: '/rules', icon: Wand2 },
  { name: 'nav.reports', href: '/reports', icon: BarChart3 },
  { name: 'nav.settings', href: '/settings', icon: Settings },
]

const adminNavigation = [
  { name: 'admin.users.title', href: '/admin/users', icon: Users },
  { name: 'admin.groups.title', href: '/admin/groups', icon: FolderTree },
  { name: 'admin.settings.title', href: '/admin/settings', icon: Cog },
]

export default function Layout() {
  const { user, isGroupAdmin, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-primary-600">BudgetOS</h1>
            <button 
              className="lg:hidden p-1 rounded hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                {t(item.name)}
              </NavLink>
            ))}

            {/* Admin section - super_admin and group admins */}
            {(user?.role === 'super_admin' || isGroupAdmin) && (
              <>
                <div className="border-t border-gray-200 my-3" />
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  {t('nav.administration')}
                </p>
                {adminNavigation
                  .filter((item) => {
                    // Group admins only see Groups link
                    if (user?.role === 'super_admin') return true
                    return item.href === '/admin/groups'
                  })
                  .map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    {t(item.name)}
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          {/* Version */}
          <div className="mx-4 mb-2 px-3 py-1.5 bg-gray-50 rounded-lg text-center">
            <span className="text-xs text-gray-400 font-medium tracking-wide">BudgetOS v{__APP_VERSION__}</span>
          </div>

          {/* User */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.fullName || user?.email}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title={t('nav.logout')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center h-16 px-4 gap-4">
            <button 
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
