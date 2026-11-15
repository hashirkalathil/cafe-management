import { supabase } from '../lib/supabase'
import { plainError } from '../lib/errors'
import { getOrder } from './orders'

// Orders waiting for a bill, oldest first.
export async function listToBill() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_no, updated_at, dining_tables(name), order_items(price, quantity, status)')
    .eq('status', 'bill_asked')
    .order('updated_at')
  if (error) throw new Error(plainError(error, "Couldn't load bills. Please try again."))
  return data
}

// Payments taken since `since`, newest first.
export async function listPaidToday(since) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, method, amount, paid_at, bills(bill_no, order_id, orders(order_no, dining_tables(name)))')
    .gte('paid_at', since)
    .order('paid_at', { ascending: false })
  if (error) throw new Error(plainError(error, "Couldn't load bills. Please try again."))
  return data
}

// Everything the bill page needs. The page is opened by order id.
export async function getBillView(orderId) {
  const order = await getOrder(orderId)
  if (!order) return null

  const { data: bill, error } = await supabase
    .from('bills')
    .select('id, bill_no, subtotal, tax_percent, tax_amount, discount, total, status, created_at')
    .eq('order_id', orderId)
    .maybeSingle()
  if (error) throw new Error(plainError(error, "Couldn't load the bill. Please try again."))

  let payment = null
  if (bill?.status === 'paid') {
    const res = await supabase
      .from('payments')
      .select('method, amount, paid_at')
      .eq('bill_id', bill.id)
      .maybeSingle()
    if (res.error) throw new Error(plainError(res.error, "Couldn't load the bill. Please try again."))
    payment = res.data
  }
  return { order, bill, payment }
}

// Makes the bill (or updates its discount) and returns it as the database worked it out.
export async function saveBill(orderId, discount) {
  const { data: id, error } = await supabase.rpc('save_bill', { p_order_id: orderId, p_discount: discount })
  if (error) throw new Error(plainError(error))
  const res = await supabase.from('bills').select('id, bill_no, total').eq('id', id).single()
  if (res.error) throw new Error(plainError(res.error))
  return res.data
}

export async function takePayment(billId, method, amount) {
  const { error } = await supabase.rpc('take_payment', { p_bill_id: billId, p_method: method, p_amount: amount })
  if (error) throw new Error(plainError(error))
}

// The newest paid bills, for the dashboard.
export async function listRecentBills(limit = 5) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, method, amount, paid_at, bills(bill_no, order_id, orders(order_no, dining_tables(name)))')
    .order('paid_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(plainError(error, "Couldn't load bills. Please try again."))
  return data
}
