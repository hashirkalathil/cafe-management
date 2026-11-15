// Rupees with up to 2 decimals, e.g. ₹1,250 or ₹99.50
export const money = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

// Money maths in whole paise, so 0.1 + 0.2 never shows 0.30000000000000004.
export const toPaise = (n) => Math.round(Number(n || 0) * 100)
export const fromPaise = (p) => p / 100

// Start of today in India time, as a timestamp the database understands.
export function startOfTodayIST() {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
  return `${day}T00:00:00+05:30`
}

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

export const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })

// ----- Days (India time). A "day" is text like 2026-11-15. -----
export const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

export function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const monthStart = (day) => `${day.slice(0, 8)}01`

export function monthEnd(day) {
  const d = new Date(`${day}T00:00:00Z`)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
}

// Monday of the week the day is in.
export function weekStart(day) {
  const dow = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7
  return addDays(day, -dow)
}

export const formatDay = (day) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' })

export const formatMonth = (day) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
