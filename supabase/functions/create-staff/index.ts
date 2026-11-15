// Creates a staff login inside the admin's own cafe. Only an active admin may call it.
// The secret key stays here on the server and never reaches the app.
// Supabase fills in SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY by itself.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'not_allowed' })

  const url = Deno.env.get('SUPABASE_URL')!
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: role } = await caller.rpc('app_role')
  const { data: cafeId } = await caller.rpc('app_cafe_id')
  if (role !== 'admin' || !cafeId) return reply(403, { error: 'not_allowed' })

  let input: Record<string, string>
  try {
    input = await req.json()
  } catch {
    return reply(400, { error: 'bad_email' })
  }
  const fullName = String(input.full_name ?? '').trim()
  const email = String(input.email ?? '').trim().toLowerCase()
  const password = String(input.password ?? '')
  const newRole = String(input.role ?? '')

  if (!fullName) return reply(400, { error: 'bad_name' })
  if (!['admin', 'captain', 'kitchen', 'billing'].includes(newRole)) return reply(400, { error: 'bad_role' })
  if (!/^\S+@\S+\.\S+$/.test(email)) return reply(400, { error: 'bad_email' })
  if (password.length < 8) return reply(400, { error: 'weak_password' })

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (error || !data.user) {
    const taken = /already|registered|exists/i.test(error?.message ?? '')
    return reply(taken ? 409 : 400, { error: taken ? 'email_taken' : 'bad_email' })
  }

  // Make the person's profile in this cafe and turn it on.
  const { error: profileError } = await admin.from('profiles').insert({
    id: data.user.id,
    cafe_id: cafeId,
    full_name: fullName,
    role: newRole,
    is_active: true,
  })
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id) // do not leave a half-made login
    return reply(500, { error: 'failed' })
  }
  return reply(200, { ok: true })
})
