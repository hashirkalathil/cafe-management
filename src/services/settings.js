import { supabase } from '../lib/supabase'
import { plainError } from '../lib/errors'

export async function getSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('id, restaurant_name, address, phone, tax_percent')
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(plainError(error, "Couldn't load settings. Please try again."))
  return data
}

export async function saveSettings(id, { restaurantName, address, phone, taxPercent }) {
  const { error } = await supabase
    .from('settings')
    .update({
      restaurant_name: restaurantName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      tax_percent: Math.round(Number(taxPercent) * 100) / 100,
    })
    .eq('id', id)
  if (error) throw new Error(plainError(error))
}

// Just the cafe's name, for the menu.
export async function getCafeName() {
  const { data } = await supabase.from('settings').select('restaurant_name').limit(1).maybeSingle()
  return data?.restaurant_name || ''
}
