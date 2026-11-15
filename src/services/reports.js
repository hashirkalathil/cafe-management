import { supabase } from '../lib/supabase'
import { plainError } from '../lib/errors'

const PAGE = 1000

// The database returns at most 1000 rows at a time. Keep asking until all rows are in.
async function fetchAll(build) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) throw new Error(plainError(error, "Couldn't load the report. Please try again."))
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
}

const inRange = (table, dateColumn, columns, from, to, order) => () =>
  supabase.from(table).select(columns).gte(dateColumn, from).lte(dateColumn, to).order(order)

// Everything the Reports page shows, for days from..to (text like 2026-11-15).
export async function getReport(from, to) {
  const [sales, profit, items, methods, categories] = await Promise.all([
    fetchAll(inRange('daily_sales', 'sale_date', 'sale_date, bills, total_sales, tax, discount', from, to, 'sale_date')),
    fetchAll(inRange('daily_profit', 'day', 'day, sales, expenses, profit', from, to, 'day')),
    fetchAll(inRange('top_items', 'sale_date', 'sale_date, item_name, quantity, amount', from, to, 'sale_date')),
    fetchAll(inRange('sales_by_method', 'sale_date', 'sale_date, method, bills, total', from, to, 'sale_date')),
    fetchAll(inRange('expenses_by_category', 'expense_date', 'expense_date, category, total', from, to, 'expense_date')),
  ])
  return { sales, profit, items, methods, categories }
}
