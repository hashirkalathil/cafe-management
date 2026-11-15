import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Coffee, UserPlus } from 'lucide-react'
import Button from '../components/Button'
import Field from '../components/Field'
import { useAuth } from '../hooks/useAuth'
import { signUp } from '../services/auth'

export default function Signup() {
  const { profile, loading, refresh } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ cafeName: '', fullName: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  if (!loading && profile) return <Navigate to="/" replace />

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    const next = {}
    if (!form.cafeName.trim()) next.cafeName = 'Enter your cafe name.'
    if (!form.fullName.trim()) next.fullName = 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email.'
    if (form.password.length < 8) next.password = 'Password needs at least 8 characters.'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      await signUp(form)
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
          <h1 className="text-title font-semibold">Create your cafe</h1>
        </div>
        <div className="flex flex-col gap-4">
          <Field label="Cafe name" value={form.cafeName} onChange={set('cafeName')} error={errors.cafeName} />
          <Field
            label="Your name"
            autoComplete="name"
            value={form.fullName}
            onChange={set('fullName')}
            error={errors.fullName}
          />
          <Field
            label="Email"
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={set('email')}
            error={errors.email}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
          />
          {errors.form && (
            <p role="alert" className="rounded-base bg-danger-soft px-3 py-2 text-small text-danger">
              {errors.form}
            </p>
          )}
          <Button type="submit" icon={UserPlus} loading={busy}>
            Create cafe
          </Button>
          <p className="text-center text-small">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary">
              Log in
            </Link>
          </p>
        </div>
      </form>
    </main>
  )
}
