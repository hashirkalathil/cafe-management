import { supabase } from '../lib/supabase'
import { plainError } from '../lib/errors'

// Orders the kitchen still has work on, with their items.
export async function listKitchenOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_no, status, dining_tables(name), order_items(id, item_name, quantity, note, status, created_at)')
    .in('status', ['sent', 'preparing', 'ready'])
  if (error) throw new Error(plainError(error, "Couldn't load orders. Please try again."))
  return data
}

// Moves items from one step to the next. Items someone else already moved are left alone.
// Returns how many items were really changed.
export async function moveItems(ids, from, to) {
  const { data, error } = await supabase
    .from('order_items')
    .update({ status: to })
    .in('id', ids)
    .eq('status', from)
    .select('id')
  if (error) {
    const text = String(error.message || '')
    if (text === 'not_allowed' || text === 'order_locked') {
      throw new Error('This order has changed. Please check the screen.')
    }
    throw new Error(plainError(error))
  }
  return data.length
}
