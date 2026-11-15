import { useEffect, useRef } from 'react'

// Calls `callback` every few seconds while the tab is visible, and again when you come back to it.
export function useAutoRefresh(callback, ms = 5000) {
  const latest = useRef(callback)
  useEffect(() => {
    latest.current = callback
  })

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) latest.current()
    }
    const timer = setInterval(tick, ms)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [ms])
}
