// The payment server's settings. The three secrets come from Cloudflare
// (Settings → Variables and Secrets); the public values are the same ones the
// website itself ships with.
export interface Env {
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  /** Optional: extra origins allowed to call the API, comma-separated. */
  AUCTION_EXTRA_ORIGINS?: string
}

export const SUPABASE_URL = 'https://ixxzebtzjgeimoijexwn.supabase.co'
// Publishable key: safe to be public; security is Row-Level Security.
export const SUPABASE_ANON_KEY = 'sb_publishable__Yc7IquvYLVFdgqfcXfvmw_vN_bEIyO'

export const DEFAULT_EVENT = 'midwest-bunfest-2026'
export const AUCTION_NAME = 'Midwest BunFest silent auction'

/** The three OHRR sites, their Cloudflare preview addresses, the phone apps and local dev. */
export function originAllowed(origin: string, env: Env): boolean {
  if (!origin) return false
  const fixed = [
    'https://ohrr-app.pages.dev',
    'https://ohrr-website.pages.dev',
    'https://ohrr-bunfest.pages.dev',
    'https://ohiohouserabbitrescue.org',
    'https://www.ohiohouserabbitrescue.org',
    'https://midwestbunfest.org',
    'https://www.midwestbunfest.org',
    'capacitor://localhost', // iPhone app
    'https://localhost', // Android app
    'http://localhost',
  ]
  if (fixed.includes(origin)) return true
  if (/^https:\/\/[a-z0-9-]+\.ohrr-(app|website|bunfest)\.pages\.dev$/.test(origin)) return true
  if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true
  const extra = (env.AUCTION_EXTRA_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return extra.includes(origin)
}
