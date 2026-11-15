import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight, ClipboardList, Loader2, Receipt, TrendingUp, Wallet } from 'lucide-react'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { formatTime, fromPaise, money, todayIST, toPaise } from '../lib/format'
import { ICON } from '../lib/ui'
import { listRecentBills } from '../services/bills'
import { listExpenses } from '../services/expenses'
import { listLiveOrders } from '../services/orders'
import { getReport } from '../services/reports'

const methodLabels = { cash: 'Cash', card: 'Card', upi: 'UPI' }

function Tile({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-base bg-surface p-4 shadow-card">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-base bg-accent-soft text-primary">
        <Icon className={ICON} />
      </span>
      <div className="min-w-0">
        <p className="text-small text-muted">{label}</p>
        <p className="truncate text-title font-semibold">{value}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const toast = useToast()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(
    async (quiet) => {
      try {
        const t = todayIST()
        const [report, expenses, live, recent] = await Promise.all([
          getReport(t, t),
          listExpenses(t, t),
          listLiveOrders(),
          listRecentBills(5),
        ])
        setData({
          sales: report.sales.reduce((n, s) => n + toPaise(s.total_sales), 0),
          bills: report.sales.reduce((n, s) => n + s.bills, 0),
          expenses: expenses.reduce((n, e) => n + toPaise(e.amount), 0),
          // Drafts are not counted: nothing has been sent yet.
          open: live.filter((o) => o.status !== 'open').length,
          recent,
        })
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
  useAutoRefresh(() => load(true), 10000)

  return (
    <main className="mx-auto max-w-4xl p-4 lg:p-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-title font-semibold">Dashboard</h1>
        <Button variant="secondary" onClick={() => navigate('/reports')}>
          Reports <ArrowRight className={ICON} />
        </Button>
      </div>

      {!data && !failed && (
        <div className="flex justify-center py-12 text-primary">
          <Loader2 className={`${ICON} size-6 animate-spin`} />
        </div>
      )}
      {failed && !data && <EmptyState title="Couldn't load the dashboard" actionLabel="Try again" onAction={() => load(false)} />}

      {data && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Tile icon={TrendingUp} label="Today's sales" value={money(fromPaise(data.sales))} />
            <Tile icon={Receipt} label="Bills today" value={data.bills} />
            <Tile icon={ClipboardList} label="Open orders" value={data.open} />
            <Tile icon={Wallet} label="Today's expenses" value={money(fromPaise(data.expenses))} />
          </div>

          <section className="rounded-base bg-surface shadow-card">
            <h2 className="px-4 pt-4 pb-2 text-section font-semibold">Last 5 bills</h2>
            {data.recent.length === 0 && <EmptyState icon={Receipt} title="No bills yet" />}
            {data.recent.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/bills/${p.bills.order_id}`)}
                className="flex w-full items-center gap-3 border-t border-line px-4 py-3 text-left transition hover:bg-primary-soft"
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
          </section>
        </div>
      )}
    </main>
  )
}
