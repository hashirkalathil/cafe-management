import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, Users } from 'lucide-react'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import Field from '../components/Field'
import IconButton from '../components/IconButton'
import Modal from '../components/Modal'
import Switch from '../components/Switch'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { roleLabels } from '../lib/roles'
import { addStaff, listStaff, updateStaff } from '../services/staff'
import { ICON } from '../lib/ui'

const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({ value, label }))

function StaffForm({ person, onClose, onSaved }) {
  const toast = useToast()
  const { profile } = useAuth()
  const isNew = !person
  const isMe = person?.id === profile.id
  const [form, setForm] = useState({
    name: person?.full_name ?? '',
    role: person?.role ?? 'captain',
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    if (busy) return
    const next = {}
    if (!form.name.trim()) next.name = 'Enter a name.'
    if (isNew) {
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email.'
      if (form.password.length < 8) next.password = 'Use at least 8 characters.'
    }
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      if (isNew) {
        await addStaff({ fullName: form.name.trim(), role: form.role, email: form.email, password: form.password })
      } else {
        await updateStaff(person.id, { full_name: form.name.trim(), role: form.role })
      }
      toast.success(isNew ? 'Staff added' : 'Saved')
      onSaved()
    } catch (err) {
      if (err.field) setErrors({ [err.field]: err.message })
      else toast.error(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal
      title={isNew ? 'Add staff' : 'Edit staff'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="staff-form" loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <form id="staff-form" onSubmit={save} noValidate className="flex flex-col gap-4">
        <Field label="Name" value={form.name} onChange={set('name')} error={errors.name} />
        <Field
          label="Role"
          options={roleOptions}
          value={form.role}
          onChange={set('role')}
          disabled={isMe}
        />
        {isNew && (
          <>
            <Field
              label="Email"
              type="email"
              autoComplete="off"
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
          </>
        )}
      </form>
    </Modal>
  )
}

export default function Staff() {
  const toast = useToast()
  const { profile } = useAuth()
  const [people, setPeople] = useState(null)
  const [failed, setFailed] = useState(false)
  const [form, setForm] = useState(null) // null = closed, {} = new, person = edit
  const [pending, setPending] = useState(null)

  const load = useCallback(async () => {
    try {
      setPeople(await listStaff())
      setFailed(false)
    } catch (err) {
      setFailed(true)
      toast.error(err.message)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function toggle(person, on) {
    setPending(person.id)
    try {
      await updateStaff(person.id, { is_active: on })
      toast.success(on ? 'Turned on' : 'Turned off')
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPending(null)
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-4 lg:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-title font-semibold">Staff</h1>
        <Button icon={Plus} onClick={() => setForm({})}>
          Add staff
        </Button>
      </div>

      <div className="rounded-base bg-surface shadow-card">
        {people === null && !failed && (
          <div className="flex justify-center py-12 text-primary">
            <Loader2 className={`${ICON} size-6 animate-spin`} />
          </div>
        )}
        {failed && people === null && (
          <EmptyState title="Couldn't load staff" actionLabel="Try again" onAction={load} />
        )}
        {people?.length === 0 && (
          <EmptyState icon={Users} title="No staff yet" actionLabel="Add staff" onAction={() => setForm({})} />
        )}
        {people?.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''} ${
              p.is_active ? '' : 'opacity-60'
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-medium">
                {p.full_name || 'No name yet'}
                {p.id === profile.id && <span className="text-small text-muted"> (you)</span>}
              </p>
              <p className="text-small text-muted">{roleLabels[p.role]}</p>
            </div>
            <Switch
              checked={p.is_active}
              onChange={(on) => toggle(p, on)}
              label={p.is_active ? `Turn off ${p.full_name}` : `Turn on ${p.full_name}`}
              disabled={pending === p.id || p.id === profile.id}
            />
            <IconButton icon={Pencil} label="Edit" onClick={() => setForm(p)} />
          </div>
        ))}
      </div>

      {form && (
        <StaffForm
          person={form.id ? form : null}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null)
            load()
          }}
        />
      )}
    </main>
  )
}
