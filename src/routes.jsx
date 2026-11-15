import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import Sidebar from './components/Sidebar'
import EmptyState from './components/EmptyState'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Staff from './pages/Staff'
import Menu from './pages/Menu'
import Tables from './pages/Tables'
import Settings from './pages/Settings'
import NewOrder from './pages/NewOrder'
import Order from './pages/Order'
import Kitchen from './pages/Kitchen'
import Bills from './pages/Bills'
import Bill from './pages/Bill'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import { useAuth } from './hooks/useAuth'
import { pageRoles, roleHome } from './lib/roles'
import { ICON } from './lib/ui'

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-primary">
      <Loader2 className={`${ICON} size-8 animate-spin`} />
    </div>
  )
}

// Needs login, shows menu and checks the role for this page.
function Protected({ page }) {
  const { profile, role, loading } = useAuth()
  if (loading) return <Loading />
  if (!profile) return <Navigate to="/login" replace />
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        {pageRoles[page].includes(role) ? <Outlet /> : <NotAllowed home={roleHome[role]} />}
      </div>
    </div>
  )
}

function NotAllowed({ home }) {
  const navigate = useNavigate()
  return (
    <main className="flex min-h-[60dvh] items-center justify-center">
      <EmptyState
        icon={ShieldAlert}
        title="You can't open this page"
        actionLabel="Go home"
        onAction={() => navigate(home)}
      />
    </main>
  )
}

function Home() {
  const { profile, role, loading } = useAuth()
  if (loading) return <Loading />
  return <Navigate to={profile ? roleHome[role] : '/login'} replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<Home />} />
      <Route element={<Protected page="dashboard" />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
      <Route element={<Protected page="expenses" />}>
        <Route path="/expenses" element={<Expenses />} />
      </Route>
      <Route element={<Protected page="reports" />}>
        <Route path="/reports" element={<Reports />} />
      </Route>
      <Route element={<Protected page="tables" />}>
        <Route path="/tables" element={<Tables />} />
      </Route>
      <Route element={<Protected page="kitchen" />}>
        <Route path="/kitchen" element={<Kitchen />} />
      </Route>
      <Route element={<Protected page="menu" />}>
        <Route path="/menu" element={<Menu />} />
      </Route>
      <Route element={<Protected page="settings" />}>
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route element={<Protected page="staff" />}>
        <Route path="/staff" element={<Staff />} />
      </Route>
      <Route element={<Protected page="newOrder" />}>
        <Route path="/orders/new/:tableId" element={<NewOrder />} />
      </Route>
      <Route element={<Protected page="orderDetails" />}>
        <Route path="/orders/:id" element={<Order />} />
      </Route>
      <Route element={<Protected page="bills" />}>
        <Route path="/bills" element={<Bills />} />
        <Route path="/bills/:id" element={<Bill />} />
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
