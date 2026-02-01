import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Transactions from './pages/Transactions'
import CreditCards from './pages/CreditCards'
import Categories from './pages/Categories'
import Reports from './pages/Reports'
import Import from './pages/Import'
import PlannedTransactions from './pages/PlannedTransactions'
import Rules from './pages/Rules'
import Settings from './pages/Settings'
import Payees from './pages/Payees'
import AdminUsers from './pages/AdminUsers'
import AdminGroups from './pages/AdminGroups'
import AdminSettings from './pages/AdminSettings'

function PrivateRoute({ children }) {
  const { user, needsSetup, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return needsSetup ? <Navigate to="/register" /> : <Navigate to="/login" />
  }

  return children
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />
  if (user.role !== 'super_admin') return <Navigate to="/" />

  return children
}

function LoginRoute() {
  const { user, needsSetup, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (user) return <Navigate to="/" />
  if (needsSetup) return <Navigate to="/register" />

  return <Login />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="credit-cards" element={<CreditCards />} />
        <Route path="categories" element={<Categories />} />
        <Route path="reports" element={<Reports />} />
        <Route path="import" element={<Import />} />
        <Route path="planned" element={<PlannedTransactions />} />
        <Route path="rules" element={<Rules />} />
        <Route path="payees" element={<Payees />} />
        <Route path="settings" element={<Settings />} />
        <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="admin/groups" element={<AdminRoute><AdminGroups /></AdminRoute>} />
        <Route path="admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
      </Route>
    </Routes>
  )
}

export default App
