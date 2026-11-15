import { supabase } from '../lib/supabase'
import { plainError } from '../lib/errors'

export async function listStaff() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, created_at')
    .order('created_at')
  if (error) throw new Error(plainError(error, "Couldn't load staff. Please try again."))
  return data
}

export async function updateStaff(id, changes) {
  const { error } = await supabase.from('profiles').update(changes).eq('id', id)
  if (error) throw new Error(plainError(error))
}

const fields = { email_taken: 'email', bad_email: 'email', weak_password: 'password', bad_name: 'name' }

// A plain error that also says which form box it belongs to.
function fieldError(code) {
  const e = new Error(plainError({ message: code }))
  e.field = fields[code]
  return e
}

// Needs the `create-staff` function (see supabase/functions/create-staff).
export async function addStaff({ fullName, role, email, password }) {
  const { data, error } = await supabase.functions.invoke('create-staff', {
    body: { full_name: fullName, role, email, password },
  })
  if (error) {
    let body = null
    try {
      body = await error.context.json()
    } catch {
      // No readable answer: the function is probably not set up.
    }
    if (body?.error) throw fieldError(body.error)
    throw new Error("Couldn't add. Is the staff function set up?")
  }
  if (data?.error) throw fieldError(data.error)
}
