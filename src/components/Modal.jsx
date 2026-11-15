import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import IconButton from './IconButton'

// `busy` stops closing while something is being saved.
export default function Modal({ title, onClose, children, footer, busy = false }) {
  const box = useRef(null)

  useEffect(() => {
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    box.current?.focus()
    return () => {
      document.body.style.overflow = before
    }
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="flex max-h-[90dvh] w-full flex-col rounded-t-base bg-surface shadow-pop outline-none sm:max-w-md sm:rounded-base"
      >
        <div className="flex items-center justify-between border-b border-line py-2 pr-2 pl-5">
          <h2 className="text-section font-semibold">{title}</h2>
          <IconButton icon={X} label="Close" onClick={onClose} disabled={busy} />
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>
        )}
      </div>
    </div>
  )
}
