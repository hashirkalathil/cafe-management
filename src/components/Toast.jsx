import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { ICON } from '../lib/ui'

const ToastContext = createContext(null)

const looks = {
  success: { icon: CircleCheck, style: 'bg-success-soft text-success' },
  error: { icon: CircleAlert, style: 'bg-danger-soft text-danger' },
  info: { icon: Info, style: 'bg-info-soft text-info' },
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const nextId = useRef(1)

  const remove = useCallback((id) => setItems((list) => list.filter((t) => t.id !== id)), [])

  const show = useCallback(
    (type, message) => {
      const id = nextId.current++
      // Keep at most 3 on screen.
      setItems((list) => [...list.slice(-2), { id, type, message }])
      setTimeout(() => remove(id), 4000)
    },
    [remove],
  )

  const toast = useMemo(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
      info: (message) => show('info', message),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Sits above the phone bottom bar. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-60 flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map(({ id, type, message }) => {
          const { icon: Icon, style } = looks[type]
          return (
            <button
              key={id}
              type="button"
              role={type === 'error' ? 'alert' : 'status'}
              onClick={() => remove(id)}
              className={`pointer-events-auto flex max-w-sm items-center gap-2 rounded-base px-4 py-3 text-left text-body font-medium shadow-pop ${style}`}
            >
              <Icon className={ICON} />
              {message}
            </button>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const toast = useContext(ToastContext)
  if (!toast) throw new Error('useToast needs ToastProvider')
  return toast
}
