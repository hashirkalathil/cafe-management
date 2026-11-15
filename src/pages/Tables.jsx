import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, Loader2, Pencil, Plus, Power, RotateCcw, Users } from 'lucide-react'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import Field from '../components/Field'
import IconButton from '../components/IconButton'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { ICON } from '../lib/ui'
import { listLiveOrders } from '../services/orders'
import { listTables, saveTable, setTableActive } from '../services/tables'

const statusLook = {
  free: { label: 'Free', style: 'bg-success-soft text-success' },
  busy: { label: 'Busy', style: 'bg-warning-soft text-warning' },
  bill_asked: { label: 'Bill asked', style: 'bg-info-soft text-info' },
}

function TableForm({ table, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: table?.name ?? '', seats: String(table?.seats ?? 4) })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((x) => ({ ...x, [key]: undefined }))
  }

  async function save(e) {
    e.preventDefault()
    if (busy) return
    const seats = Number(form.seats)
    const next = {}
    if (!form.name.trim()) next.name = 'Enter a name.'
    if (!Number.isInteger(seats) || seats < 1 || seats > 50) next.seats = 'Enter a number from 1 to 50.'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      await saveTable(table?.id, { name: form.name, seats })
      toast.success('Saved')
      onSaved()
    } catch (err) {
      setErrors({ name: err.message })
      setBusy(false)
    }
  }

  return (
    <Modal
      title={table ? 'Edit table' : 'Add table'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="table-form" loading={busy}>Save</Button>
        </>
      }
    >
      <form id="table-form" onSubmit={save} noValidate className="flex flex-col gap-4">
        <Field label="Name" value={form.name} onChange={set('name')} error={errors.name} />
        <Field
          label="Seats"
          type="number"
          inputMode="numeric"
          min="1"
          max="50"
          value={form.seats}
          onChange={set('seats')}
          error={errors.seats}
        />
      </form>
    </Modal>
  )
}

export default function Tables() {
  const toast = useToast()
  const navigate = useNavigate()
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const canOrder = isAdmin || role === 'captain'
  const [tables, setTables] = useState(null)
  const [live, setLive] = useState([])
  const [failed, setFailed] = useState(false)
  const [form, setForm] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [pending, setPending] = useState(null)

  const load = useCallback(
    async (quiet) => {
      try {
        const [t, o] = await Promise.all([listTables(), listLiveOrders()])
        setTables(t)
        setLive(o)
        setFailed(false)
      } catch (err) {
        if (!quiet) {
          setFailed(true)
          toast.error(err.message)
        }
      }
    },
    [toast],
  )

  useEffect(() => {
    load(false)
  }, [load])
  useAutoRefresh(() => load(true))

  // table id -> its live order, and whether food is waiting to be served
  const orderOf = useMemo(() => {
    const map = {}
    live.forEach((o) => {
      map[o.table_id] = { id: o.id, status: o.status, ready: o.order_items.some((i) => i.status === 'ready') }
    })
    return map
  }, [live])

  function open(t) {
    const o = orderOf[t.id]
    if (o && role === 'billing' && o.status === 'bill_asked') navigate(`/bills/${o.id}`)
    else if (o) navigate(`/orders/${o.id}`)
    else if (canOrder && t.is_active) navigate(`/orders/new/${t.id}`)
  }

  async function toggle(table, on) {
    setPending(table.id)
    try {
      await setTableActive(table.id, on)
      toast.success(on ? 'Turned on' : 'Turned off')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPending(null)
      await load()
    }
  }

  const shown = tables?.filter((t) => isAdmin || t.is_active)

  return (
    <main className="mx-auto max-w-5xl p-4 lg:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-title font-semibold">Tables</h1>
        {isAdmin && <Button icon={Plus} onClick={() => setForm({})}>Add table</Button>}
      </div>

      {tables === null && !failed && (
        <div className="flex justify-center py-12 text-primary">
          <Loader2 className={`${ICON} size-6 animate-spin`} />
        </div>
      )}
      {failed && tables === null && (
        <EmptyState title="Couldn't load tables" actionLabel="Try again" onAction={() => load(false)} />
      )}
      {shown?.length === 0 && (
        <div className="rounded-base bg-surface shadow-card">
          <EmptyState
            icon={LayoutGrid}
            title="No tables yet"
            actionLabel={isAdmin ? 'Add table' : undefined}
            onAction={isAdmin ? () => setForm({}) : undefined}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown?.map((t) => {
          const look = statusLook[t.status]
          const o = orderOf[t.id]
          const tappable = t.is_active && (o || canOrder)
          return (
            <div
              key={t.id}
              className={`flex flex-col rounded-base bg-surface shadow-card ${t.is_active ? '' : 'opacity-50'}`}
            >
              <button
                type="button"
                disabled={!tappable}
                onClick={() => open(t)}
                className="flex flex-col gap-3 rounded-base p-4 text-left outline-offset-2 transition enabled:hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-section font-semibold">{t.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-small font-medium ${look.style}`}>
                    {t.is_active ? look.label : 'Off'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1 text-small text-muted">
                    <Users className="size-3.5" />
                    {t.seats} seats
                  </p>
                  {o?.ready && (
                    <span className="rounded-full bg-success px-2 py-0.5 text-small font-medium text-on-primary">
                      Ready
                    </span>
                  )}
                </div>
              </button>
              {isAdmin && (
                <div className="flex px-2 pb-2">
                  <IconButton icon={Pencil} label="Edit table" onClick={() => setForm(t)} />
                  {t.is_active ? (
                    <IconButton
                      icon={Power}
                      label="Turn off table"
                      tone="danger"
                      disabled={t.status !== 'free' || pending === t.id}
                      onClick={() => setConfirm(t)}
                    />
                  ) : (
                    <IconButton
                      icon={RotateCcw}
                      label="Turn on table"
                      disabled={pending === t.id}
                      onClick={() => toggle(t, true)}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {form && (
        <TableForm
          table={form.id ? form : null}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load() }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title="Turn off this table?"
          message={`${confirm.name} will be hidden from new orders. Old orders and bills stay the same.`}
          confirmLabel="Turn off"
          cancelLabel="Cancel"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const t = confirm
            setConfirm(null)
            await toggle(t, false)
          }}
        />
      )}
    </main>
  )
}
