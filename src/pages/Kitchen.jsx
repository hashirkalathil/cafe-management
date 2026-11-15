import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChefHat, Flame, Loader2, BellRing } from 'lucide-react'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { ICON } from '../lib/ui'
import { listKitchenOrders, moveItems } from '../services/kitchen'

// Each tab shows the items in one step. `next` is the step the buttons move them to.
const tabs = [
  { key: 'new', label: 'New', next: 'preparing', button: 'Preparing', all: 'All preparing', empty: 'No new orders' },
  { key: 'preparing', label: 'Preparing', next: 'ready', button: 'Ready', all: 'All ready', empty: 'Nothing is being prepared' },
  { key: 'ready', label: 'Ready', next: null, empty: 'Nothing is waiting to be served' },
]
const LATE_MINUTES = 15

function waiting(from, now) {
  const mins = Math.max(0, Math.floor((now - new Date(from).getTime()) / 60000))
  if (mins < 1) return { text: 'Just now', late: false }
  if (mins < 60) return { text: `${mins} min`, late: mins >= LATE_MINUTES }
  return { text: `${Math.floor(mins / 60)} h ${mins % 60} min`, late: true }
}

function savedTab() {
  try {
    const t = sessionStorage.getItem('kitchen-tab')
    return tabs.some((x) => x.key === t) ? t : 'new'
  } catch {
    return 'new'
  }
}

export default function Kitchen() {
  const toast = useToast()
  const [orders, setOrders] = useState(null)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState(savedTab)
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(null) // order id being changed

  const load = useCallback(
    async (quiet) => {
      try {
        setOrders(await listKitchenOrders())
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
  useAutoRefresh(() => {
    setNow(Date.now())
    load(true)
  }, 5000)

  function pickTab(key) {
    setTab(key)
    try {
      sessionStorage.setItem('kitchen-tab', key)
    } catch {
      // remembering the tab is optional
    }
  }

  // tab key -> cards, oldest first
  const board = useMemo(() => {
    const result = { new: [], preparing: [], ready: [] }
    ;(orders ?? []).forEach((o) => {
      for (const t of tabs) {
        const items = o.order_items
          .filter((i) => i.status === t.key)
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
        if (items.length) result[t.key].push({ order: o, items, since: items[0].created_at })
      }
    })
    Object.values(result).forEach((list) => list.sort((a, b) => a.since.localeCompare(b.since)))
    return result
  }, [orders])

  async function move(card, items, step) {
    if (busy) return
    setBusy(card.order.id)
    try {
      const done = await moveItems(items.map((i) => i.id), tab, step.next)
      if (done === 0) toast.info('Someone already updated this.')
      else toast.success(`Marked ${step.button.toLowerCase()}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(null)
      await load(true)
    }
  }

  const current = tabs.find((t) => t.key === tab)
  const cards = board[tab]

  return (
    <main className="mx-auto max-w-5xl p-4 lg:p-8">
      <h1 className="mb-4 text-title font-semibold">Kitchen</h1>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => pickTab(t.key)}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-body font-medium shadow-card transition ${
              tab === t.key ? 'bg-primary text-on-primary' : 'bg-surface'
            }`}
          >
            {t.label}
            <span
              className={`min-w-5 rounded-full px-1.5 text-center text-small font-semibold ${
                tab === t.key ? 'bg-on-primary text-primary' : 'bg-primary-soft text-primary'
              }`}
            >
              {board[t.key].length}
            </span>
          </button>
        ))}
      </div>

      {orders === null && !failed && (
        <div className="flex justify-center py-12 text-primary">
          <Loader2 className={`${ICON} size-6 animate-spin`} />
        </div>
      )}
      {failed && orders === null && (
        <EmptyState title="Couldn't load orders" actionLabel="Try again" onAction={() => load(false)} />
      )}
      {orders && cards.length === 0 && (
        <div className="rounded-base bg-surface shadow-card">
          <EmptyState icon={ChefHat} title={current.empty} />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const wait = waiting(card.since, now)
          return (
            <section key={card.order.id} className="flex flex-col rounded-base bg-surface p-4 shadow-card">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-section font-semibold">
                  {card.order.dining_tables?.name}
                  <span className="text-small font-normal text-muted"> · #{card.order.order_no}</span>
                </h2>
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-small font-medium ${
                    wait.late && tab !== 'ready' ? 'bg-danger-soft text-danger' : 'bg-line text-muted'
                  }`}
                >
                  <Flame className="size-3.5" />
                  {wait.text}
                </span>
              </div>

              {card.items.map((i) => (
                <div key={i.id} className="flex items-center gap-3 border-t border-line py-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-base bg-accent-soft text-body font-semibold text-primary">
                    {i.quantity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium">{i.item_name}</p>
                    {i.note && (
                      <p className="flex items-center gap-1 text-small font-medium text-warning">
                        <BellRing className="size-3.5" />
                        {i.note}
                      </p>
                    )}
                  </div>
                  {current.next && (
                    <Button
                      variant="secondary"
                      className="h-9 px-3"
                      disabled={busy === card.order.id}
                      onClick={() => move(card, [i], current)}
                    >
                      {current.button}
                    </Button>
                  )}
                </div>
              ))}

              {current.next && card.items.length > 1 && (
                <Button
                  className="mt-2"
                  loading={busy === card.order.id}
                  onClick={() => move(card, card.items, current)}
                >
                  {current.all}
                </Button>
              )}
            </section>
          )
        })}
      </div>
    </main>
  )
}
