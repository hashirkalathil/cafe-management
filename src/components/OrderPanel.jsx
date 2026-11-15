import { Check, Minus, MessageSquare, Plus, ShoppingBag, X } from 'lucide-react'
import IconButton from './IconButton'
import EmptyState from './EmptyState'
import { money } from '../lib/format'

const statusLook = {
  new: { label: 'New', style: 'bg-info-soft text-info' },
  preparing: { label: 'Preparing', style: 'bg-warning-soft text-warning' },
  ready: { label: 'Ready', style: 'bg-success-soft text-success' },
  served: { label: 'Served', style: 'bg-line text-muted' },
}

const round = (n) => Math.round(n * 100) / 100
const roundBtn =
  'size-8 rounded-full bg-primary text-on-primary hover:bg-primary-dark hover:text-on-primary'

// Order list: items, + / −, totals. `can` says what this person may do to each line.
export default function OrderPanel({
  lines, showStatus, taxPercent, can, onQty, onNote, onServe, onCancel, hideTitle = false, actions,
}) {
  const subtotal = round(lines.reduce((sum, l) => sum + l.price * l.quantity, 0))
  const tax = round((subtotal * taxPercent) / 100)

  return (
    <div className="flex h-full flex-col gap-4">
      {!hideTitle && <h2 className="text-title font-semibold">Your order</h2>}

      {lines.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No items yet" />
      ) : (
        <ul className="flex flex-col gap-4">
          {lines.map((l) => {
            const look = statusLook[l.status]
            return (
              <li key={l.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium">
                      {l.item_name}
                      {can.soldOut(l) && <span className="text-small text-danger"> · Sold out</span>}
                    </p>
                    <p className="text-small text-muted">{money(l.price * l.quantity)}</p>
                  </div>
                  {can.qty(l) ? (
                    <div className="flex items-center gap-2">
                      <IconButton icon={Minus} label="Remove one" className={roundBtn} onClick={() => onQty(l, -1)} />
                      <span className="w-5 text-center text-body font-medium">{l.quantity}</span>
                      <IconButton
                        icon={Plus}
                        label="Add one"
                        className={roundBtn}
                        disabled={can.soldOut(l)}
                        onClick={() => onQty(l, 1)}
                      />
                    </div>
                  ) : (
                    <span className="text-body font-medium">×{l.quantity}</span>
                  )}
                </div>
                {(l.note || showStatus || can.note(l) || can.serve(l) || can.cancel(l)) && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-small text-muted">
                      {l.note ? `“${l.note}”` : ''}
                    </p>
                    <div className="flex shrink-0 items-center">
                      {showStatus && look && (
                        <span className={`rounded-full px-2 py-0.5 text-small font-medium ${look.style}`}>
                          {look.label}
                        </span>
                      )}
                      {can.note(l) && (
                        <IconButton icon={MessageSquare} label="Add note" className="size-8" onClick={() => onNote(l)} />
                      )}
                      {can.serve(l) && (
                        <IconButton icon={Check} label="Mark served" className="size-8" onClick={() => onServe(l)} />
                      )}
                      {can.cancel(l) && (
                        <IconButton icon={X} label="Cancel item" tone="danger" className="size-8" onClick={() => onCancel(l)} />
                      )}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <div className="flex justify-between text-body text-muted">
          <span>Subtotal</span>
          <span>{money(subtotal)}</span>
        </div>
        <div className="flex justify-between text-body text-muted">
          <span>Tax ({taxPercent}%)</span>
          <span>{money(tax)}</span>
        </div>
        <div className="my-1 h-px bg-line" />
        <div className="flex justify-between text-section font-semibold">
          <span>Total</span>
          <span>{money(subtotal + tax)}</span>
        </div>
        {actions && <div className="mt-2 flex flex-col gap-2">{actions}</div>}
      </div>
    </div>
  )
}
