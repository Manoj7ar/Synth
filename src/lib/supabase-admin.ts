import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type AnyRecord = Record<string, unknown>

const globalForSupabase = globalThis as typeof globalThis & {
  __synthSupabaseAdmin?: SupabaseClient<AnyRecord>
}

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

export function createSupabaseAdminClient() {
  const url = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  return createClient<AnyRecord>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'synth-server-admin',
      },
    },
  })
}

export function getSupabaseAdminClient() {
  if (!globalForSupabase.__synthSupabaseAdmin) {
    globalForSupabase.__synthSupabaseAdmin = createSupabaseAdminClient()
  }
  return globalForSupabase.__synthSupabaseAdmin
}
