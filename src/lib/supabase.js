import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// False when .env is missing or empty, so the app can show a friendly screen
// instead of crashing.
export const isConfigured = Boolean(key && url && /^https?:\/\//.test(url))

export const supabase = isConfigured ? createClient(url, key) : null
