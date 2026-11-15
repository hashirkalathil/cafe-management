import { Inbox } from 'lucide-react'
import Button from './Button'
import { ICON } from '../lib/ui'

export default function EmptyState({ icon: Icon = Inbox, title, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className={ICON} />
      </span>
      <p className="text-section font-semibold">{title}</p>
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  )
}
