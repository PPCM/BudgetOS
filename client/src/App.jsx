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

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/login" />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
