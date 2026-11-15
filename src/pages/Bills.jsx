import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Loader2, Receipt } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { formatTime, fromPaise, money, startOfTodayIST, toPaise } from '../lib/format'
import { ICON } from '../lib/ui'
import { listPaidToday, listToBill } from '../services/bills'

const methodLabels = { cash: 'Cash', card: 'Card', upi: 'UPI' }
const tabs = [
  { key: 'to', label: 'To bill' },
  { key: 'paid', label: 'Paid today' },
]

function savedTab() {
  try {
    return sessionStorage.getItem('bills-tab') === 'paid' ? 'paid' : 'to'
  } catch {
    return 'to'
  }
}

export default function Bills() {
  const toast = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState(savedTab)
  const [toBill, setToBill] = useState(null)
  const [paid, setPaid] = useState(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(
    async (quiet) => {
      try {
        const [a, b] = await Promise.all([listToBill(), listPaidToday(startOfTodayIST())])
        setToBill(a)
        setPaid(b)
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

  function pickTab(key) {
    setTab(key)
    try {
      sessionStorage.setItem('bills-tab', key)
    } catch {
      // remembering the tab is optional
    }
  }

  const paidTotal = useMemo(() => fromPaise((paid ?? []).reduce((n, p) => n + toPaise(p.amount), 0)), [paid])
  const ready = toBill !== null && paid !== null
  const counts = { to: toBill?.length ?? 0, paid: paid?.length ?? 0 }
  const rows = tab === 'to' ? toBill : paid

  return (
    <main className="mx-auto max-w-3xl p-4 lg:p-8">
      <h1 className="mb-4 text-title font-semibold">Bills</h1>

      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => pickTab(t.key)}
            className={`flex h-10 items-center gap-2 rounded-full px-4 text-body font-medium shadow-card transition ${
              tab === t.key ? 'bg-primary text-on-primary' : 'bg-surface'
            }`}
          >
            {t.label}
            <span
              className={`min-w-5 rounded-full px-1.5 text-center text-small font-semibold ${
                tab === t.key ? 'bg-on-primary text-primary' : 'bg-primary-soft text-primary'
              }`}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {!ready && !failed && (
        <div className="flex justify-center py-12 text-primary">
          <Loader2 className={`${ICON} size-6 animate-spin`} />
        </div>
      )}
      {failed && !ready && <EmptyState title="Couldn't load bills" actionLabel="Try again" onAction={() => load(false)} />}

      {ready && tab === 'paid' && paid.length > 0 && (
        <p className="mb-3 text-body">
          Total today: <span className="font-semibold">{money(paidTotal)}</span>
        </p>
      )}

      {ready && rows.length === 0 && (
        <div className="rounded-base bg-surface shadow-card">
          <EmptyState icon={Receipt} title={tab === 'to' ? 'No bills to make' : 'No payments yet today'} />
        </div>
      )}

      {ready && rows.length > 0 && (
        <div className="rounded-base bg-surface shadow-card">
          {tab === 'to' &&
            toBill.map((o, i) => {
              const sum = fromPaise(
                o.order_items.filter((x) => x.status !== 'cancelled').reduce((n, x) => n + toPaise(x.price) * x.quantity, 0),
              )
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => navigate(`/bills/${o.id}`)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-primary-soft ${i > 0 ? 'border-t border-line' : ''} ${i === 0 ? 'rounded-t-base' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium">{o.dining_tables?.name}</p>
                    <p className="text-small text-muted">Order #{o.order_no} · asked at {formatTime(o.updated_at)}</p>
                  </div>
                  <span className="text-body font-medium">{money(sum)}</span>
                  <ChevronRight className={`${ICON} text-muted`} />
                </button>
              )
            })}
          {tab === 'paid' &&
            paid.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/bills/${p.bills.order_id}`)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-primary-soft ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium">
                    {p.bills.orders?.dining_tables?.name} · Bill #{p.bills.bill_no}
                  </p>
                  <p className="text-small text-muted">
                    {methodLabels[p.method]} · {formatTime(p.paid_at)}
                  </p>
                </div>
                <span className="text-body font-medium">{money(p.amount)}</span>
                <ChevronRight className={`${ICON} text-muted`} />
              </button>
            ))}
        </div>
      )}
    </main>
  )
}
