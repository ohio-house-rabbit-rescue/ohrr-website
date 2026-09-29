// Lets the app, the website and the BunFest site call this API from the
// browser (CORS). Stripe's webhook has no Origin header and passes straight through.
import { originAllowed, type Env } from '../../../server/auction/env'

function corsHeaders(origin: string): Record<string, string> {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const origin = ctx.request.headers.get('Origin') ?? ''
  const allowed = origin ? originAllowed(origin, ctx.env) : false
  if (ctx.request.method === 'OPTIONS') {
    return new Response(null, { status: allowed ? 204 : 403, headers: allowed ? corsHeaders(origin) : {} })
  }
  if (origin && !allowed) {
    return new Response(JSON.stringify({ error: 'This site may not use the auction API.' }), {
      status: 403,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  }
  const res = await ctx.next()
  if (!allowed) return res
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(corsHeaders(origin))) headers.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}
