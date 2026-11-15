import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Loader2 } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import Field from '../components/Field'
import { useToast } from '../components/Toast'
import { addDays, formatDay, formatMonth, fromPaise, money, monthStart, todayIST, toPaise } from '../lib/format'
import { ICON } from '../lib/ui'
import { getReport } from '../services/reports'

const MAX_DAYS = 366
const methodLabels = { cash: 'Cash', card: 'Card', upi: 'UPI' }
const sum = (rows, pick) => rows.reduce((n, r) => n + toPaise(pick(r)), 0)

function presets() {
  const t = todayIST()
  return [
    { label: 'Last 7 days', from: addDays(t, -6), to: t },
    { label: 'Last 30 days', from: addDays(t, -29), to: t },
    { label: 'This month', from: monthStart(t), to: t },
  ]
}

function group(rows, keyOf, add) {
  const map = new Map()
  rows.forEach((r) => {
    const k = keyOf(r)
    map.set(k, add(map.get(k), r))
  })
  return [...map.entries()]
}

function Tile({ label, value, tone }) {
  return (
    <div className="rounded-base bg-surface p-4 shadow-card">
      <p className="text-small text-muted">{label}</p>
      <p className={`text-title font-semibold ${tone ?? ''}`}>{value}</p>
    </div>
  )
}

function Section({ title, empty, children }) {
  return (
    <section className="rounded-base bg-surface p-4 shadow-card">
      <h2 className="mb-2 text-section font-semibold">{title}</h2>
      {children?.length === 0 ? <p className="py-4 text-center text-small text-muted">{empty}</p> : children}
    </section>
  )
}

const Line = ({ left, right }) => (
  <div className="flex justify-between gap-3 py-1.5 text-body">
    <span className="min-w-0 truncate">{left}</span>
    <span className="shrink-0 font-medium">{right}</span>
  </div>
)

export default function Reports() {
  const toast = useToast()
  const [tab, setTab] = useState('daily')
  const [range, setRange] = useState(() => presets()[1])
  const [draft, setDraft] = useState(range)
  const [rangeError, setRangeError] = useState('')
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setData(null)
    getReport(range.from, range.to)
      .then((d) => {
        if (alive) {
          setData(d)
          setFailed(false)
        }
      })
      .catch((err) => {
        if (alive) {
          setFailed(true)
          toast.error(err.message)
        }
      })
    return () => {
      alive = false
    }
  }, [range, toast])

  function change(next) {
    setDraft(next)
    if (!next.from || !next.to) return setRangeError('Pick both dates.')
    if (next.from > next.to) return setRangeError('The start date must come first.')
    if (addDays(next.from, MAX_DAYS) < next.to) return setRangeError('Pick a range of up to a year.')
    setRangeError('')
    setRange(next)
  }

  const report = useMemo(() => {
    if (!data) return null
    const billsOn = new Map(data.sales.map((s) => [s.sale_date, s.bills]))
    const days = data.profit
      .map((p) => ({
        key: p.day,
        bills: billsOn.get(p.day) ?? 0,
        sales: toPaise(p.sales),
        expenses: toPaise(p.expenses),
      }))
      .sort((a, b) => b.key.localeCompare(a.key))

    const months = group(
      days,
      (d) => `${d.key.slice(0, 7)}-01`,
      (m, d) => ({
        bills: (m?.bills ?? 0) + d.bills,
        sales: (m?.sales ?? 0) + d.sales,
        expenses: (m?.expenses ?? 0) + d.expenses,
      }),
    )
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.key.localeCompare(a.key))

    const items = group(
      data.items,
      (i) => i.item_name,
      (m, i) => ({ quantity: (m?.quantity ?? 0) + i.quantity, amount: (m?.amount ?? 0) + toPaise(i.amount) }),
    )
      .sort((a, b) => b[1].quantity - a[1].quantity || b[1].amount - a[1].amount)
      .slice(0, 10)

    const methods = group(
      data.methods,
      (m) => m.method,
      (m, r) => ({ bills: (m?.bills ?? 0) + r.bills, total: (m?.total ?? 0) + toPaise(r.total) }),
    )
    const categories = group(
      data.categories,
      (c) => c.category,
      (m, r) => (m ?? 0) + toPaise(r.total),
    ).sort((a, b) => b[1] - a[1])

    const sales = days.reduce((n, d) => n + d.sales, 0)
    const expenses = days.reduce((n, d) => n + d.expenses, 0)
    return {
      days, months, items, methods, categories,
      bills: days.reduce((n, d) => n + d.bills, 0),
      sales, expenses, profit: sales - expenses,
    }
  }, [data])

  const rows = tab === 'daily' ? report?.days : report?.months

  return (
    <main className="mx-auto max-w-4xl p-4 lg:p-8">
      <h1 className="mb-4 text-title font-semibold">Reports</h1>

      <div className="mb-4 flex flex-col gap-3 rounded-base bg-surface p-4 shadow-card">
        <div className="grid grid-cols-2 gap-3">
          <Field label="From" type="date" value={draft.from} onChange={(e) => change({ ...draft, from: e.target.value })} />
          <Field label="To" type="date" value={draft.to} onChange={(e) => change({ ...draft, to: e.target.value })} />
        </div>
        {rangeError && <p className="text-small text-danger">{rangeError}</p>}
        <div className="flex flex-wrap gap-2">
          {presets().map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => change(p)}
              className="h-9 rounded-full bg-primary-soft px-3 text-small font-medium text-primary transition hover:opacity-80"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {!report && !failed && (
        <div className="flex justify-center py-12 text-primary">
          <Loader2 className={`${ICON} size-6 animate-spin`} />
        </div>
      )}
      {failed && !report && (
        <EmptyState title="Couldn't load the report" actionLabel="Try again" onAction={() => setRange({ ...range })} />
      )}

      {report && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Sales" value={money(fromPaise(report.sales))} />
            <Tile label="Bills" value={report.bills} />
            <Tile label="Expenses" value={money(fromPaise(report.expenses))} />
            <Tile
              label="Profit"
              value={`${report.profit < 0 ? '− ' : ''}${money(fromPaise(Math.abs(report.profit)))}`}
              tone={report.profit < 0 ? 'text-danger' : 'text-success'}
            />
          </div>

          <div className="flex gap-2">
            {[['daily', 'Daily'], ['monthly', 'Monthly']].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`h-10 rounded-full px-4 text-body font-medium shadow-card transition ${
                  tab === key ? 'bg-primary text-on-primary' : 'bg-surface'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="rounded-base bg-surface shadow-card">
            {rows.length === 0 && <EmptyState icon={BarChart3} title="No sales or expenses in these days" />}
            {rows.map((r, i) => {
              const profit = r.sales - r.expenses
              return (
                <div key={r.key} className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                  <div>
                    <p className="text-body font-medium">{tab === 'daily' ? formatDay(r.key) : formatMonth(r.key)}</p>
                    <p className="text-small text-muted">{r.bills} {r.bills === 1 ? 'bill' : 'bills'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-body font-medium">{money(fromPaise(r.sales))}</p>
                    <p className="text-small text-muted">
                      Expenses {money(fromPaise(r.expenses))} ·{' '}
                      <span className={profit < 0 ? 'text-danger' : 'text-success'}>
                        {profit < 0 ? '− ' : ''}{money(fromPaise(Math.abs(profit)))}
                      </span>
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Section title="Top items" empty="No sales yet">
              {report.items.map(([name, v]) => (
                <Line key={name} left={`${v.quantity} × ${name}`} right={money(fromPaise(v.amount))} />
              ))}
            </Section>
            <Section title="Sales by method" empty="No sales yet">
              {report.methods.map(([m, v]) => (
                <Line key={m} left={`${methodLabels[m] ?? m} · ${v.bills}`} right={money(fromPaise(v.total))} />
              ))}
            </Section>
            <Section title="Expenses by category" empty="No expenses yet">
              {report.categories.map(([c, total]) => (
                <Line key={c} left={c} right={money(fromPaise(total))} />
              ))}
            </Section>
          </div>
        </div>
      )}
    </main>
  )
}
