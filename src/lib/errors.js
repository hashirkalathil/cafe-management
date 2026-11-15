// Turns any error into one plain sentence. Raw error text is never shown.
const messages = {
  not_allowed: "You can't do that.",
  self_change: "You can't turn yourself off or change your own role.",
  last_admin: 'There must be at least one active admin.',
  order_not_found: "Couldn't find that order.",
  order_locked: "This order can't be changed any more.",
  item_unavailable: 'This item is not available.',
  sold_out: 'This item is sold out.',
  empty_order: 'Add at least one item.',
  not_all_served: 'Serve all items first.',
  bill_exists: 'A bill is already made for this order.',
  bill_not_asked: 'The bill has not been asked for yet.',
  bad_discount: "Discount can't be more than the total.",
  wrong_amount: 'The amount must match the total.',
  already_paid: 'This bill is already paid.',
  table_unavailable: 'This table is not available.',
  email_taken: 'This email is already used.',
  bad_email: 'Enter a valid email.',
  weak_password: 'Password needs at least 8 characters.',
  bad_name: 'Enter a name.',
  bad_cafe_name: 'Enter your cafe name.',
  already_has_cafe: 'This email is already used. Please log in.',
  bad_role: 'Pick a role.',
  table_busy: "This table is in use. Finish its order first.",
}

const LOGIN_AGAIN = 'Please log in again.'

export function plainError(error, fallback = "Couldn't save. Please try again.") {
  if (!error) return fallback
  const text = String(error.message || error)
  const code = error.code

  // Our own short codes raised in the database or the staff function.
  for (const key of Object.keys(messages)) {
    if (text === key || text.startsWith(`${key}:`) || error.error === key) return messages[key]
  }
  if (error.error && messages[error.error]) return messages[error.error]

  // Not signed in any more, or turned off.
  if (code === '42501' || code === 'PGRST301' || error.status === 401 || /jwt|row-level security/i.test(text)) {
    return LOGIN_AGAIN
  }
  if (code === '23505') return 'This name is already used.'
  if (/failed to fetch|network/i.test(text)) return 'No internet. Please check and try again.'
  return fallback
}

export function isLoginAgain(error) {
  return plainError(error) === LOGIN_AGAIN
}
