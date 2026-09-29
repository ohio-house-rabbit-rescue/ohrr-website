// GET /api/auction/health — is the payment server set up? (Never shows a secret.)
import type { Env } from '../../../server/auction/env'
import { json } from '../../../server/auction/http'

export const onRequestGet: PagesFunction<Env> = async ({ env }) =>
  json({
    ok: true,
    stripe: Boolean(env.STRIPE_SECRET_KEY),
    stripe_mode: env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : env.STRIPE_SECRET_KEY ? 'test' : null,
    webhook: Boolean(env.STRIPE_WEBHOOK_SECRET),
    supabase: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
  })
