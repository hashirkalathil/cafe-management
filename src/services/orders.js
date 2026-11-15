import { supabase } from '../lib/supabase'
import { plainError } from '../lib/errors'

const fail = (error, fallback) => {
  throw new Error(plainError(error, fallback))
}

// Table -> its live order (for the Tables page): id, status and whether food is waiting.
export async function listLiveOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, table_id, status, order_items(status)')
    .not('status', 'in', '(paid,cancelled)')
  if (error) fail(error, "Couldn't load orders. Please try again.")
  return data
}

export async function getOrder(id) {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, table_id, dining_tables(name), order_items(id, menu_item_id, item_name, price, quantity, note, status, created_at)',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) fail(error, "Couldn't load the order. Please try again.")
  return data
}

export async function getOrCreateOrder(tableId) {
  const { data, error } = await supabase.rpc('get_or_create_order', { p_table_id: tableId })
  if (error) fail(error, "Couldn't open the table. Please try again.")
  return data
}

export async function addLine(orderId, menuItemId) {
  // Name and price are filled in by the database from the menu.
  const { error } = await supabase
    .from('order_items')
    .insert({ order_id: orderId, menu_item_id: menuItemId, item_name: '', price: 0, quantity: 1 })
  if (error) fail(error)
}

// Used when the kitchen may already have started the line.
function lineError(error) {
  const text = String(error?.message || '')
  if (text === 'not_allowed') {
    throw new Error('The kitchen already started this item.')
  }
  fail(error)
}

export async function setLineQuantity(id, quantity) {
  const { error } = await supabase.from('order_items').update({ quantity }).eq('id', id)
  if (error) lineError(error)
}

export async function setLineNote(id, note) {
  const { error } = await supabase.from('order_items').update({ note: note.trim() || null }).eq('id', id)
  if (error) lineError(error)
}

export async function cancelLine(id) {
  const { error } = await supabase.from('order_items').update({ status: 'cancelled' }).eq('id', id)
  if (error) lineError(error)
}

export async function serveLines(ids) {
  const { error } = await supabase.from('order_items').update({ status: 'served' }).in('id', ids)
  if (error) fail(error)
}

export async function sendOrder(orderId) {
  const { error } = await supabase.rpc('send_order', { p_order_id: orderId })
  if (error) {
    if (String(error.message) === 'sold_out' && error.details) {
      throw new Error(`${error.details} is sold out. Remove it to send.`)
    }
    fail(error)
  }
}

export async function askForBill(orderId) {
  const { error } = await supabase.rpc('ask_for_bill', { p_order_id: orderId })
  if (error) fail(error)
}

export async function cancelOrder(orderId) {
  const { error } = await supabase.rpc('cancel_order', { p_order_id: orderId })
  if (error) fail(error)
}
