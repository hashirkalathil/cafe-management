import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, LayoutGrid, Loader2, Plus, Receipt, Search, Send, ShoppingBag } from 'lucide-react'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import Field from '../components/Field'
import IconButton from '../components/IconButton'
import Modal from '../components/Modal'
import OrderPanel from '../components/OrderPanel'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { money } from '../lib/format'
import { groupIcon } from '../lib/groupIcon'
import { ICON } from '../lib/ui'
import { listMenu } from '../services/menu'
import {
  addLine, askForBill, cancelLine, cancelOrder, getOrder, sendOrder, serveLines, setLineNote, setLineQuantity,
} from '../services/orders'
import { getSettings } from '../services/settings'

const orderLabels = {
  open: 'Draft', sent: 'New', preparing: 'Preparing', ready: 'Ready', served: 'Served',
  bill_asked: 'Bill asked', paid: 'Paid', cancelled: 'Cancelled',
}
const EDITABLE = ['open', 'sent', 'preparing', 'ready', 'served']
const MAX_QTY = 99

export default function Order() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [order, setOrder] = useState(undefined) // undefined loading, null not found
  const [menu, setMenu] = useState(null)
  const [taxPercent, setTaxPercent] = useState(0)
  const [group, setGroup] = useState('all')
  const [search, setSearch] = useState('')
  const [sheet, setSheet] = useState(false)
  const [noteFor, setNoteFor] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [acting, setActing] = useState(false)
  const linesRef = useRef([])
  const queue = useRef(Promise.resolve())

  const reload = useCallback(
    async (quiet) => {
      try {
        const [o, m] = await Promise.all([getOrder(id), listMenu()])
        linesRef.current = o?.order_items ?? []
        setOrder(o)
        setMenu(m)
      } catch (err) {
        if (!quiet) toast.error(err.message)
        setOrder((prev) => (prev === undefined ? null : prev))
      }
    },
    [id, toast],
  )

  useEffect(() => {
    reload(false)
    getSettings().then((s) => s && setTaxPercent(Number(s.tax_percent))).catch(() => {})
  }, [reload])
  useAutoRefresh(() => reload(true))

  // One change at a time, so quick taps never collide.
  const run = useCallback(
    (op, okText) => {
      queue.current = queue.current
        .then(async () => {
          await op()
          if (okText) toast.success(okText)
        })
        .catch((err) => toast.error(err.message))
        .then(() => reload(true))
      return queue.current
    },
    [reload, toast],
  )

  const lines = useMemo(
    () =>
      (order?.order_items ?? [])
        .filter((l) => l.status !== 'cancelled')
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [order],
  )
  const menuById = useMemo(() => Object.fromEntries((menu?.items ?? []).map((i) => [i.id, i])), [menu])
  const groups = useMemo(() => (menu?.categories ?? []).filter((c) => c.is_active), [menu])
  const pickable = (i) => i.is_active && groups.some((g) => g.id === i.category_id)
  const orderable = (i) => pickable(i) && i.is_available

  const counts = useMemo(() => {
    const c = {}
    lines.forEach((l) => { c[l.menu_item_id] = (c[l.menu_item_id] || 0) + l.quantity })
    return c
  }, [lines])

  const shown = useMemo(
    () =>
      (menu?.items ?? []).filter(
        (i) =>
          pickable(i) &&
          (group === 'all' || i.category_id === group) &&
          i.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [menu, group, search],
  )

  if (order === undefined) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center text-primary">
        <Loader2 className={`${ICON} size-8 animate-spin`} />
      </div>
    )
  }
  if (order === null) {
    return (
      <EmptyState icon={ShoppingBag} title="Couldn't find this order" actionLabel="Go to tables" onAction={() => navigate('/tables')} />
    )
  }

  const editable = (role === 'admin' || role === 'captain') && EDITABLE.includes(order.status)
  const isDraft = order.status === 'open'
  const readyLines = lines.filter((l) => l.status === 'ready')
  const total = lines.reduce((n, l) => n + l.price * l.quantity, 0)
  const count = lines.reduce((n, l) => n + l.quantity, 0)

  const can = {
    qty: (l) => editable && l.status === 'new',
    note: (l) => editable && l.status === 'new',
    serve: (l) => editable && l.status === 'ready',
    cancel: (l) => editable && (isAdmin ? l.status !== 'served' : l.status === 'new'),
    soldOut: (l) => l.status === 'new' && menuById[l.menu_item_id] && !orderable(menuById[l.menu_item_id]),
  }

  const addItem = (m) =>
    run(async () => {
      const same = linesRef.current.find((l) => l.menu_item_id === m.id && l.status === 'new' && !l.note)
      if (same) {
        if (same.quantity >= MAX_QTY) throw new Error(`You can add up to ${MAX_QTY} of one item.`)
        await setLineQuantity(same.id, same.quantity + 1)
      } else {
        await addLine(order.id, m.id)
      }
    })

  const changeQty = (l, delta) =>
    run(async () => {
      const q = l.quantity + delta
      if (q < 1) await cancelLine(l.id)
      else if (q > MAX_QTY) throw new Error(`You can add up to ${MAX_QTY} of one item.`)
      else await setLineQuantity(l.id, q)
    })

  async function act(action, okText, goBack) {
    if (acting) return
    setActing(true)
    try {
      await queue.current
      await action()
      toast.success(okText)
      if (goBack) navigate('/tables')
      else await reload(true)
    } catch (err) {
      toast.error(err.message)
      await reload(true)
    } finally {
      setActing(false)
    }
  }

  const panel = (hideTitle) => (
    <OrderPanel
      lines={lines}
      showStatus={!isDraft}
      taxPercent={taxPercent}
      can={can}
      hideTitle={hideTitle}
      onQty={changeQty}
      onNote={setNoteFor}
      onServe={(l) => run(() => serveLines([l.id]), 'Marked served')}
      onCancel={(l) => setConfirm({ type: 'line', line: l })}
      actions={editable && (
        <>
          {isDraft ? (
            <Button
              icon={Send}
              loading={acting}
              disabled={lines.length === 0}
              onClick={() => act(() => sendOrder(order.id), 'Sent to kitchen', true)}
            >
              Send to kitchen
            </Button>
          ) : (
            <>
              {readyLines.length > 0 && (
                <Button
                  variant="secondary"
                  disabled={acting}
                  onClick={() => act(() => serveLines(readyLines.map((l) => l.id)), 'Marked served')}
                >
                  Mark all ready as served
                </Button>
              )}
              <Button
                icon={Receipt}
                loading={acting}
                disabled={order.status !== 'served'}
                onClick={() => act(() => askForBill(order.id), 'Bill asked', true)}
              >
                Ask for bill
              </Button>
              {order.status !== 'served' && <p className="text-center text-small text-muted">Serve all items first</p>}
            </>
          )}
          {(isDraft || isAdmin) && (
            <Button variant="ghostDanger" disabled={acting} onClick={() => setConfirm({ type: 'order' })}>
              Cancel order
            </Button>
          )}
        </>
      )}
    />
  )

  return (
    <div className="flex min-w-0 flex-1">
      <main className="min-w-0 flex-1 space-y-6 p-4 pb-40 lg:p-6 lg:pb-6">
        <div className="flex items-center gap-2">
          <IconButton icon={ArrowLeft} label="Back to tables" onClick={() => navigate('/tables')} />
          <h1 className="text-title font-semibold">
            {order.dining_tables?.name} · Order #{order.order_no}
          </h1>
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-small font-medium text-primary">
            {orderLabels[order.status]}
          </span>
        </div>

        {editable ? (
          <>
            <label className="flex h-12 items-center gap-3 rounded-full bg-surface px-4 shadow-card">
              <Search className={`${ICON} text-muted`} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu"
                className="h-full min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted"
              />
            </label>

            <section>
              <h2 className="mb-3 text-section font-semibold">Groups</h2>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
                {[{ id: 'all', name: 'All' }, ...groups].map((g) => {
                  const Icon = g.id === 'all' ? LayoutGrid : groupIcon(g.name)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGroup(g.id)}
                      className={`flex w-24 shrink-0 flex-col items-center gap-2 rounded-base px-2 py-3 text-small font-medium shadow-card transition ${
                        group === g.id ? 'bg-accent-soft text-primary' : 'bg-surface text-ink'
                      }`}
                    >
                      <Icon className="size-6" />
                      <span className="w-full truncate text-center">{g.name}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-section font-semibold">Menu</h2>
              {menu === null ? null : shown.length === 0 ? (
                <EmptyState icon={Search} title={search ? 'Nothing found' : 'No items here yet'} />
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {shown.map((item) => {
                    const Icon = groupIcon(groups.find((g) => g.id === item.category_id)?.name)
                    const ok = orderable(item)
                    return (
                      <li
                        key={item.id}
                        className={`flex items-center gap-4 rounded-base bg-surface p-4 shadow-card ${ok ? '' : 'opacity-50'}`}
                      >
                        <span className="relative flex size-14 shrink-0 items-center justify-center rounded-base bg-accent-soft text-primary">
                          <Icon className="size-6" />
                          {counts[item.id] > 0 && (
                            <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-primary text-small font-semibold text-on-primary">
                              {counts[item.id]}
                            </span>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body font-semibold">{item.name}</p>
                          <p className="text-small text-muted">
                            {!item.is_available ? 'Sold out' : item.is_veg ? 'Veg' : 'Non-veg'}
                          </p>
                          <p className="mt-1 text-section font-semibold">{money(item.price)}</p>
                        </div>
                        <IconButton
                          icon={Plus}
                          label={`Add ${item.name}`}
                          disabled={!ok}
                          onClick={() => addItem(item)}
                          className="rounded-full bg-primary text-on-primary hover:bg-primary-dark hover:text-on-primary"
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        ) : (
          <div className="mx-auto max-w-md rounded-base bg-surface p-5 shadow-card">{panel(true)}</div>
        )}
      </main>

      {editable && (
        <aside className="hidden w-80 shrink-0 bg-surface p-6 shadow-card xl:block">{panel(false)}</aside>
      )}

      {editable && count > 0 && (
        <button
          type="button"
          onClick={() => setSheet(true)}
          className="fixed inset-x-4 bottom-20 z-20 flex h-14 items-center justify-between rounded-full bg-primary px-5 text-body font-semibold text-on-primary shadow-pop lg:bottom-4 lg:left-64 xl:hidden"
        >
          <span className="flex items-center gap-2">
            <ShoppingBag className={ICON} />
            {count} {count === 1 ? 'item' : 'items'}
          </span>
          <span>View order · {money(total)}</span>
        </button>
      )}

      {sheet && editable && (
        <Modal title="Your order" onClose={() => setSheet(false)}>
          {panel(true)}
        </Modal>
      )}

      {noteFor && (
        <NoteForm
          line={noteFor}
          onClose={() => setNoteFor(null)}
          onSave={(text) => {
            const l = noteFor
            setNoteFor(null)
            run(() => setLineNote(l.id, text), 'Note saved')
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.type === 'order' ? 'Cancel this order?' : 'Cancel this item?'}
          message={
            confirm.type === 'order'
              ? 'All items will be cancelled and the table becomes free.'
              : `${confirm.line.item_name} will be removed from the order.`
          }
          confirmLabel="Yes, cancel"
          cancelLabel="No"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const c = confirm
            setConfirm(null)
            if (c.type === 'order') await act(() => cancelOrder(order.id), 'Order cancelled', true)
            else await run(() => cancelLine(c.line.id), 'Item cancelled')
          }}
        />
      )}
    </div>
  )
}

function NoteForm({ line, onClose, onSave }) {
  const [text, setText] = useState(line.note ?? '')
  return (
    <Modal
      title={line.item_name}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="note-form">Save</Button>
        </>
      }
    >
      <form
        id="note-form"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(text)
        }}
      >
        <Field label="Note" placeholder="Less spicy" maxLength={100} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </form>
    </Modal>
  )
}
