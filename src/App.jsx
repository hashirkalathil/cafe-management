import { BrowserRouter } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { ToastProvider } from './components/Toast'
import EmptyState from './components/EmptyState'
import { AuthProvider } from './hooks/useAuth'
import AppRoutes from './routes'
import { isConfigured } from './lib/supabase'

export default function App() {
  if (!isConfigured) {
    return (
      <EmptyState icon={Settings} title="The app is not set up yet. Please ask the person who installed it." />
    )
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}
