import { supabase } from '../lib/supabase'
import { plainError } from '../lib/errors'

export async function listTables() {
  const { data, error } = await supabase
    .from('dining_tables')
    .select('id, name, seats, status, is_active')
    .order('created_at')
  if (error) throw new Error(plainError(error, "Couldn't load tables. Please try again."))
  return data
}

export async function saveTable(id, { name, seats }) {
  const row = { name: name.trim(), seats: Number(seats) }
  const { error } = id
    ? await supabase.from('dining_tables').update(row).eq('id', id)
    : await supabase.from('dining_tables').insert(row)
  if (error) throw new Error(plainError(error))
}

export async function setTableActive(id, on) {
  const { error } = await supabase.from('dining_tables').update({ is_active: on }).eq('id', id)
  if (error) throw new Error(plainError(error))
}
