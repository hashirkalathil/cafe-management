import { supabase } from '../lib/supabase'
import { plainError } from '../lib/errors'

export async function listExpenseCategories() {
  const { data, error } = await supabase.from('expense_categories').select('id, name').order('name')
  if (error) throw new Error(plainError(error, "Couldn't load categories. Please try again."))
  return data
}

export async function listExpenses(from, to) {
  const { data, error } = await supabase
    .from('expenses')
    .select('id, expense_date, category_id, title, amount, supplier, quantity, unit, note, expense_categories(name)')
    .gte('expense_date', from)
    .lte('expense_date', to)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(plainError(error, "Couldn't load expenses. Please try again."))
  return data
}

const blank = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())

export async function saveExpense(id, f) {
  const row = {
    expense_date: f.date,
    category_id: f.categoryId,
    title: f.title.trim(),
    amount: Math.round(Number(f.amount) * 100) / 100,
    supplier: blank(f.supplier),
    quantity: blank(f.quantity) === null ? null : Number(f.quantity),
    unit: blank(f.unit),
    note: blank(f.note),
  }
  const { error } = id
    ? await supabase.from('expenses').update(row).eq('id', id)
    : await supabase.from('expenses').insert(row)
  if (error) throw new Error(plainError(error))
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw new Error(plainError(error))
}
