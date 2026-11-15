import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Banknote, Check, CircleCheck, CreditCard, Loader2, Printer, Receipt as ReceiptIcon, Smartphone } from 'lucide-react'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import Field from '../components/Field'
import IconButton from '../components/IconButton'
import { useToast } from '../components/Toast'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { formatDateTime, fromPaise, money, toPaise } from '../lib/format'
import { ICON } from '../lib/ui'
import { getBillView, saveBill, takePayment } from '../services/bills'
import { getSettings } from '../services/settings'

const methods = [
  { key: 'cash', label: 'Cash', icon: Banknote },
  { key: 'card', label: 'Card', icon: CreditCard },
  { key: 'upi', label: 'UPI', icon: Smartphone },
]
const methodLabels = { cash: 'Cash', card: 'Card', upi: 'UPI' }

function Row({ label, value, strong }) {
  return (
    <div className={`flex justify-between ${strong ? 'text-section font-semibold' : 'text-body text-muted'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function Receipt({ view, settings }) {
  const { order, bill, payment } = view
  const lines = order.order_items.filter((l) => l.status !== 'cancelled')
  return (
    <div className="receipt rounded-base bg-surface p-5 shadow-card">
      <div className="mb-3 text-center">
        <p className="text-section font-semibold">{settings?.restaurant_name}</p>
        {settings?.address && <p className="text-small">{settings.address}</p>}
        {settings?.phone && <p className="text-small">{settings.phone}</p>}
      </div>
      <div className="mb-3 border-y border-dashed border-line py-2 text-small">
        <div className="flex justify-between"><span>Bill #{bill.bill_no}</span><span>{order.dining_tables?.name}</span></div>
        <p>{formatDateTime(payment?.paid_at ?? bill.created_at)}</p>
      </div>
      <div className="mb-3 flex flex-col gap-1 text-body">
        {lines.map((l) => (
          <div key={l.id} className="flex justify-between gap-2">
            <span className="min-w-0">{l.quantity} × {l.item_name}</span>
            <span>{money(fromPaise(toPaise(l.price) * l.quantity))}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 border-t border-dashed border-line pt-2">
        <Row label="Subtotal" value={money(bill.subtotal)} />
        <Row label={`Tax (${Number(bill.tax_percent)}%)`} value={money(bill.tax_amount)} />
        {Number(bill.discount) > 0 && <Row label="Discount" value={`− ${money(bill.discount)}`} />}
        <Row label="Total" value={money(bill.total)} strong />
        {payment && <Row label="Paid by" value={methodLabels[payment.method]} />}
      </div>
      <p className="mt-4 text-center text-small">Thank you! Please visit again.</p>
    </div>
  )
}

export default function Bill() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [view, setView] = useState(undefined) // undefined loading, null not found
  const [settings, setSettings] = useState(null)
  const [discount, setDiscount] = useState('')
  const [method, setMethod] = useState('cash')
  const [received, setReceived] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [filled, setFilled] = useState(false)

  const load = useCallback(
    async (quiet) => {
      try {
        const v = await getBillView(id)
        setView(v)
        // Start the discount box from an earlier try, once.
        if (v?.bill && v.bill.status === 'unpaid') {
          setDiscount((d) => (filled || d !== '' || Number(v.bill.discount) === 0 ? d : String(v.bill.discount)))
          setFilled(true)
        }
      } catch (err) {
        if (!quiet) toast.error(err.message)
        setView((prev) => (prev === undefined ? null : prev))
      }
    },
    [id, toast, filled],
  )

  useEffect(() => {
    load(false)
    getSettings().then(setSettings).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  // Keep the page fresh until it is paid; a paid bill never changes.
  useAutoRefresh(() => {
    if (!busy && view?.bill?.status !== 'paid') load(true)
  })

  const calc = useMemo(() => {
    if (!view) return null
    const sub = view.order.order_items
      .filter((l) => l.status !== 'cancelled')
      .reduce((n, l) => n + toPaise(l.price) * l.quantity, 0)
    const rate = Number(view.bill?.tax_percent ?? settings?.tax_percent ?? 0)
    const tax = Math.round((sub * rate) / 100)
    const disc = toPaise(discount === '' ? 0 : discount)
    return { sub, rate, tax, disc, total: sub + tax - disc }
  }, [view, settings, discount])

  if (view === undefined) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center text-primary">
        <Loader2 className={`${ICON} size-8 animate-spin`} />
      </div>
    )
  }
  if (view === null) {
    return <EmptyState icon={ReceiptIcon} title="Couldn't find this bill" actionLabel="Go to bills" onAction={() => navigate('/bills')} />
  }

  const { order, bill, payment } = view
  const paid = bill?.status === 'paid'
  const lines = order.order_items.filter((l) => l.status !== 'cancelled')
  const askedFor = order.status === 'bill_asked'

  const header = (
    <div className="mb-4 flex items-center gap-2">
      <IconButton icon={ArrowLeft} label="Back to bills" onClick={() => navigate('/bills')} />
      <h1 className="text-title font-semibold">
        {order.dining_tables?.name} · Order #{order.order_no}
      </h1>
    </div>
  )

  if (paid) {
    return (
      <main className="mx-auto max-w-sm p-4 lg:p-8">
        {header}
        <p className="mb-4 flex items-center justify-center gap-2 text-section font-semibold text-success">
          <CircleCheck className={ICON} /> Paid
        </p>
        <Receipt view={view} settings={settings} />
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" icon={Printer} className="flex-1" onClick={() => window.print()}>
            Print receipt
          </Button>
          <Button icon={Check} className="flex-1" onClick={() => navigate('/bills')}>
            Done
          </Button>
        </div>
      </main>
    )
  }

  if (!askedFor) {
    const text = order.status === 'cancelled' ? 'This order was cancelled' : 'The bill has not been asked for yet'
    return (
      <main className="mx-auto max-w-xl p-4 lg:p-8">
        {header}
        <div className="rounded-base bg-surface shadow-card">
          <EmptyState icon={ReceiptIcon} title={text} actionLabel="Go to bills" onAction={() => navigate('/bills')} />
        </div>
      </main>
    )
  }

  async function pay(e) {
    e.preventDefault()
    if (busy) return
    const next = {}
    if (discount !== '' && (Number.isNaN(Number(discount)) || calc.disc < 0)) next.discount = 'Enter 0 or more.'
    else if (calc.disc > calc.sub) next.discount = "Discount can't be more than the subtotal."
    if (method === 'cash' && toPaise(received === '' ? 0 : received) < calc.total) {
      next.received = received === '' ? 'Enter the amount received.' : 'This is less than the total.'
    }
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      const made = await saveBill(order.id, fromPaise(calc.disc))
      // The database works out the final total; check cash against that.
      if (method === 'cash' && toPaise(received) < toPaise(made.total)) {
        setErrors({ received: 'This is less than the total.' })
        await load(true)
        return
      }
      await takePayment(made.id, method, Number(made.total))
      toast.success('Payment taken')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
      await load(true)
    }
  }

  const change = method === 'cash' && received !== '' ? toPaise(received) - calc.total : 0

  return (
    <main className="mx-auto max-w-xl p-4 lg:p-8">
      {header}
      <form onSubmit={pay} noValidate className="flex flex-col gap-4 rounded-base bg-surface p-5 shadow-card">
        <ul className="flex flex-col gap-2">
          {lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-3 text-body">
              <span className="min-w-0">
                {l.quantity} × {l.item_name}
              </span>
              <span>{money(fromPaise(toPaise(l.price) * l.quantity))}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <Row label="Subtotal" value={money(fromPaise(calc.sub))} />
          <Row label={`Tax (${calc.rate}%)`} value={money(fromPaise(calc.tax))} />
          <Row label="Discount" value={calc.disc > 0 ? `− ${money(fromPaise(calc.disc))}` : money(0)} />
          <Row label="Total" value={money(fromPaise(Math.max(calc.total, 0)))} strong />
        </div>

        <div className="flex flex-col gap-4 border-t border-line pt-4">
          <Field
            label="Discount (₹)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => {
              setDiscount(e.target.value)
              setErrors((x) => ({ ...x, discount: undefined }))
            }}
            error={errors.discount}
          />

          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
            {methods.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={method === key}
                onClick={() => {
                  setMethod(key)
                  setErrors((x) => ({ ...x, received: undefined }))
                }}
                className={`flex h-16 flex-col items-center justify-center gap-1 rounded-base text-body font-medium shadow-card transition ${
                  method === key ? 'bg-primary text-on-primary' : 'bg-surface'
                }`}
              >
                <Icon className={ICON} />
                {label}
              </button>
            ))}
          </div>

          {method === 'cash' && (
            <>
              <Field
                label="Amount received (₹)"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={received}
                onChange={(e) => {
                  setReceived(e.target.value)
                  setErrors((x) => ({ ...x, received: undefined }))
                }}
                error={errors.received}
              />
              {received !== '' && change >= 0 && <Row label="Change to give" value={money(fromPaise(change))} strong />}
            </>
          )}
        </div>

        <Button type="submit" icon={Check} loading={busy} disabled={calc.total < 0}>
          Take payment
        </Button>
      </form>
    </main>
  )
}
