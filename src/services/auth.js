import { supabase } from '../lib/supabase'
import { plainError } from '../lib/errors'

// Every function here either returns data or throws an Error whose message is already plain.

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

// Returns the person's profile, or null when they have none.
export async function getMyProfile() {
  const { data, error } = await supabase.rpc('my_profile')
  if (error) throw new Error("Couldn't load your account. Please try again.")
  return data?.[0] ?? null
}

export async function logIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) {
    const offline = /fetch|network/i.test(error.message)
    throw new Error(offline ? 'No internet. Please check and try again.' : 'Email or password is wrong.')
  }

  let profile
  try {
    profile = await getMyProfile()
  } catch (e) {
    await supabase.auth.signOut()
    throw e
  }
  if (!profile) {
    await supabase.auth.signOut()
    throw new Error('This account is not ready. Ask your admin.')
  }
  if (!profile.is_active) {
    await supabase.auth.signOut()
    throw new Error('This account is turned off. Ask your admin.')
  }
  return profile
}

export async function logOut() {
  await supabase.auth.signOut()
}

// While a new cafe is being made the person has a login but no account yet.
// The app must not log them out in that short time.
let signingUp = false
export const isSigningUp = () => signingUp

// Makes a login, then a new cafe with this person as its admin.
export async function signUp({ cafeName, fullName, email, password }) {
  signingUp = true
  try {
    const cleanEmail = email.trim()
    const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password })
    if (error) {
      if (/fetch|network/i.test(error.message)) throw new Error('No internet. Please check and try again.')
      if (!/registered|already|exists/i.test(error.message)) throw new Error("Couldn't sign up. Please try again.")
      // An earlier try may have stopped half way. Carry on if this login has no cafe yet.
      const back = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      if (back.error || (await getMyProfile())) {
        await supabase.auth.signOut()
        throw new Error('This email is already used. Please log in.')
      }
    } else if (!data.session) {
      throw new Error('Check your email to confirm, then log in.')
    }

    const { error: cafeError } = await supabase.rpc('create_cafe', {
      p_cafe_name: cafeName.trim(),
      p_full_name: fullName.trim(),
    })
    if (cafeError) {
      throw new Error(plainError(cafeError, "Couldn't create your cafe. Please try again."))
    }
  } finally {
    signingUp = false
  }
}
