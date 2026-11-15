import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getSession, getMyProfile, onAuthChange, logOut, isSigningUp } from '../services/auth'
import { useToast } from '../components/Toast'

const AuthContext = createContext(null)
const RECHECK_MS = 60000

export function AuthProvider({ children }) {
  const toast = useToast()
  const [userId, setUserId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const hadProfile = useRef(false)

  // Follow the sign-in state.
  useEffect(() => {
    let alive = true
    getSession().then((s) => {
      if (!alive) return
      setUserId(s?.user.id ?? null)
      if (!s) setLoading(false)
    })
    const stop = onAuthChange((s) => {
      setUserId(s?.user.id ?? null)
      if (!s) {
        setProfile(null)
        hadProfile.current = false
        setLoading(false)
      }
    })
    return () => {
      alive = false
      stop()
    }
  }, [])

  // Load (and re-check) who this is and whether the account is still on.
  const check = useCallback(
    async (quiet) => {
      if (isSigningUp()) return
      try {
        const p = await getMyProfile()
        if (!p || !p.is_active) {
          // Login page shows its own message; this one is for people already working.
          if (hadProfile.current) toast.error('Please log in again.')
          hadProfile.current = false
          setProfile(null)
          await logOut()
          return
        }
        hadProfile.current = true
        setProfile(p)
      } catch {
        // A short network hiccup must not log anyone out.
        if (!quiet) toast.error("Couldn't load your account. Please try again.")
      } finally {
        setLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    if (!userId) return undefined
    check(false)
    const timer = setInterval(() => check(true), RECHECK_MS)
    const onFocus = () => check(true)
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [userId, check])

  const value = useMemo(
    () => ({ profile, role: profile?.role ?? null, loading, refresh: () => check(true) }),
    [profile, loading, check],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth needs AuthProvider')
  return ctx
}
