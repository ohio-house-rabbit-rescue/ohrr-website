import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, type Env } from './env'
import { HttpError } from './http'

const noSession = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }

/** Runs as the service role: bypasses Row-Level Security. Server only. */
export function serviceClient(env: Env): SupabaseClient {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new HttpError(503, 'Payments are not set up yet (the Supabase service key is missing).')
  }
  return createClient(SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: noSession })
}

/** Runs as the signed-in staff member, so Postgres checks their permissions. */
export function userClient(jwt: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: noSession,
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
}

/** Call a database function; a `raise exception` becomes a 400 with its message. */
export async function rpc<T>(db: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(fn, args)
  if (error) throw new HttpError(400, error.message)
  return data as T
}
