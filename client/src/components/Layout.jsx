import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  LayoutDashboard, Wallet, ArrowLeftRight, CreditCard, 
  Tags, BarChart3, LogOut, Menu, X, Upload, Calendar,
  Wand2, Settings
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { name: 'Comptes', href: '/accounts', icon: Wallet },
  { name: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { name: 'Planifiées', href: '/planned', icon: Calendar },
  { name: 'Cartes de crédit', href: '/credit-cards', icon: CreditCard },
  { name: 'Catégories', href: '/categories', icon: Tags },
  { name: 'Import', href: '/import', icon: Upload },
  { name: 'Règles', href: '/rules', icon: Wand2 },
  { name: 'Rapports', href: '/reports', icon: BarChart3 },
  { name: 'Paramètres', href: '/settings', icon: Settings },
]

export default function Layout() {
  const { user, logout } = useAuth()
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
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 font-medium">
                  {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.fullName || user?.email}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Déconnexion"
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
