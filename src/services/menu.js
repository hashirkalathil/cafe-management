import { supabase } from '../lib/supabase'
import { plainError } from '../lib/errors'

export async function listMenu() {
  const [cats, items] = await Promise.all([
    supabase.from('categories').select('id, name, sort_order, is_active').order('sort_order').order('name'),
    supabase
      .from('menu_items')
      .select('id, category_id, name, price, is_veg, is_available, is_active')
      .order('name'),
  ])
  if (cats.error || items.error) throw new Error(plainError(cats.error || items.error, "Couldn't load the menu. Please try again."))
  return { categories: cats.data, items: items.data }
}

export async function saveCategory(id, { name }, nextOrder = 0) {
  const clean = name.trim()
  const { error } = id
    ? await supabase.from('categories').update({ name: clean }).eq('id', id)
    : await supabase.from('categories').insert({ name: clean, sort_order: nextOrder })
  if (error) throw new Error(plainError(error))
}

export async function setCategoryActive(id, on) {
  const { error } = await supabase.from('categories').update({ is_active: on }).eq('id', id)
  if (error) throw new Error(plainError(error))
}

export async function saveItem(id, { name, categoryId, price, isVeg, isAvailable }) {
  const row = {
    name: name.trim(),
    category_id: categoryId,
    price: Math.round(Number(price) * 100) / 100,
    is_veg: isVeg,
    is_available: isAvailable,
  }
  const { error } = id
    ? await supabase.from('menu_items').update(row).eq('id', id)
    : await supabase.from('menu_items').insert(row)
  if (error) throw new Error(plainError(error))
}

export async function setItemActive(id, on) {
  const { error } = await supabase.from('menu_items').update({ is_active: on }).eq('id', id)
  if (error) throw new Error(plainError(error))
}

// The sold-out switch. Admin, captain and kitchen may use it.
export async function setItemAvailable(id, available) {
  const { error } = await supabase.rpc('set_item_available', { p_item_id: id, p_available: available })
  if (error) throw new Error(plainError(error))
}
