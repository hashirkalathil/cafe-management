import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Coffee, LogIn } from 'lucide-react'
import Button from '../components/Button'
import Field from '../components/Field'
import { useAuth } from '../hooks/useAuth'
import { logIn } from '../services/auth'

export default function Login() {
  const { profile, loading, refresh } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  if (!loading && profile) return <Navigate to="/" replace />

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    const next = {}
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter your email.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      await logIn(email, password)
      await refresh()
      navigate('/', { replace: true })
    } catch (err) {
      setErrors({ form: err.message })
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <form onSubmit={submit} noValidate className="w-full max-w-sm rounded-base bg-surface p-6 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary text-on-primary">
            <Coffee className="size-6" />
          </span>
          <h1 className="text-title font-semibold">Log in</h1>
        </div>
        <div className="flex flex-col gap-4">
          <Field
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          {errors.form && (
            <p role="alert" className="rounded-base bg-danger-soft px-3 py-2 text-small text-danger">
              {errors.form}
            </p>
          )}
          <Button type="submit" icon={LogIn} loading={busy}>
            Log in
          </Button>
          <p className="text-center text-small">
            New here?{' '}
            <Link to="/signup" className="font-semibold text-primary">
              Create your cafe
            </Link>
          </p>
        </div>
      </form>
    </main>
  )
}
