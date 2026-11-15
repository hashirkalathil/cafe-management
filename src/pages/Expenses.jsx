import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import Field from '../components/Field'
import IconButton from '../components/IconButton'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { addDays, formatDay, fromPaise, monthEnd, monthStart, money, todayIST, toPaise, weekStart } from '../lib/format'
import { ICON } from '../lib/ui'
import { deleteExpense, listExpenseCategories, listExpenses, saveExpense } from '../services/expenses'

const filters = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
]

function rangeOf(key) {
  const t = todayIST()
  if (key === 'today') return [t, t]
  if (key === 'week') return [weekStart(t), addDays(weekStart(t), 6)]
  return [monthStart(t), monthEnd(t)]
}

function ExpenseForm({ expense, categories, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    date: expense?.expense_date ?? todayIST(),
    categoryId: expense?.category_id ?? categories[0]?.id ?? '',
    title: expense?.title ?? '',
    amount: expense ? String(expense.amount) : '',
    supplier: expense?.supplier ?? '',
    quantity: expense?.quantity != null ? String(expense.quantity) : '',
    unit: expense?.unit ?? '',
    note: expense?.note ?? '',
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((x) => ({ ...x, [key]: undefined }))
  }

  async function save(e) {
    e.preventDefault()
    if (busy) return
    const next = {}
    const amount = Number(form.amount)
    if (!form.date) next.date = 'Pick a date.'
    if (!form.categoryId) next.categoryId = 'Pick a category.'
    if (!form.title.trim()) next.title = 'Enter a title.'
    if (form.amount.trim() === '' || Number.isNaN(amount) || amount <= 0) next.amount = 'Enter an amount above 0.'
    else if (amount > 10000000) next.amount = 'This amount looks too high.'
    if (form.quantity.trim() !== '' && !(Number(form.quantity) > 0)) next.quantity = 'Enter a number above 0.'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      await saveExpense(expense?.id, form)
      toast.success('Saved')
      onSaved()
    } catch (err) {
      toast.error(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal
      title={expense ? 'Edit expense' : 'Add expense'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="expense-form" loading={busy}>Save</Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={save} noValidate className="flex flex-col gap-4">
        <Field label="Date" type="date" value={form.date} onChange={set('date')} error={errors.date} />
        {form.date > todayIST() && <p className="-mt-2 text-small text-warning">This date is in the future.</p>}
        <Field
          label="Category"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          value={form.categoryId}
          onChange={set('categoryId')}
          error={errors.categoryId}
        />
        <Field label="Title" value={form.title} onChange={set('title')} error={errors.title} />
        <Field
          label="Amount (₹)"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={form.amount}
          onChange={set('amount')}
          error={errors.amount}
        />
        <Field label="Supplier (optional)" value={form.supplier} onChange={set('supplier')} />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Quantity (optional)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.quantity}
            onChange={set('quantity')}
            error={errors.quantity}
          />
          <Field label="Unit (optional)" placeholder="kg, litre" value={form.unit} onChange={set('unit')} />
        </div>
        <Field label="Note (optional)" value={form.note} onChange={set('note')} />
      </form>
    </Modal>
  )
}

export default function Expenses() {
  const toast = useToast()
  const [filter, setFilter] = useState('today')
  const [rows, setRows] = useState(null)
  const [categories, setCategories] = useState([])
  const [failed, setFailed] = useState(false)
  const [form, setForm] = useState(null) // null closed, {} new, expense = edit
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    try {
      const [from, to] = rangeOf(filter)
      const [list, cats] = await Promise.all([listExpenses(from, to), listExpenseCategories()])
      setRows(list)
      setCategories(cats)
      setFailed(false)
    } catch (err) {
      setFailed(true)
      toast.error(err.message)
    }
  }, [filter, toast])

  useEffect(() => {
    setRows(null)
    load()
  }, [load])

  const total = useMemo(() => fromPaise((rows ?? []).reduce((n, r) => n + toPaise(r.amount), 0)), [rows])

  async function remove(expense) {
    try {
      await deleteExpense(expense.id)
      toast.success('Deleted')
    } catch (err) {
      toast.error(err.message)
    }
    await load()
  }

  return (
    <main className="mx-auto max-w-3xl p-4 lg:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-title font-semibold">Expenses</h1>
        <Button icon={Plus} disabled={categories.length === 0} onClick={() => setForm({})}>
          Add expense
        </Button>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`h-10 shrink-0 rounded-full px-4 text-body font-medium shadow-card transition ${
              filter === f.key ? 'bg-primary text-on-primary' : 'bg-surface'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows === null && !failed && (
        <div className="flex justify-center py-12 text-primary">
          <Loader2 className={`${ICON} size-6 animate-spin`} />
        </div>
      )}
      {failed && rows === null && <EmptyState title="Couldn't load expenses" actionLabel="Try again" onAction={load} />}

      {rows && (
        <>
          <p className="mb-3 text-body">
            Total: <span className="font-semibold">{money(total)}</span>
          </p>
          <div className="rounded-base bg-surface shadow-card">
            {rows.length === 0 && (
              <EmptyState
                icon={Wallet}
                title="No expenses here"
                actionLabel={categories.length ? 'Add expense' : undefined}
                onAction={categories.length ? () => setForm({}) : undefined}
              />
            )}
            {rows.map((r, i) => (
              <div key={r.id} className={`flex items-center gap-2 py-2 pr-2 pl-4 ${i > 0 ? 'border-t border-line' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium">{r.title}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-small text-muted">
                    <span className="rounded-full bg-primary-soft px-2 text-primary">{r.expense_categories?.name}</span>
                    <span>{formatDay(r.expense_date)}</span>
                    {r.supplier && <span>{r.supplier}</span>}
                    {r.quantity != null && (
                      <span>
                        {Number(r.quantity)} {r.unit ?? ''}
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-body font-medium">{money(r.amount)}</span>
                <IconButton icon={Pencil} label="Edit expense" onClick={() => setForm(r)} />
                <IconButton icon={Trash2} label="Delete expense" tone="danger" onClick={() => setConfirm(r)} />
              </div>
            ))}
          </div>
        </>
      )}

      {form && (
        <ExpenseForm
          expense={form.id ? form : null}
          categories={categories}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null)
            load()
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title="Delete this expense?"
          message={`${confirm.title} (${money(confirm.amount)}) will be removed. This can't be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const e = confirm
            setConfirm(null)
            await remove(e)
          }}
        />
      )}
    </main>
  )
}
