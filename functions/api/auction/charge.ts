// POST /api/auction/charge   (staff — Authorization: Bearer <their Supabase session token>)
//   { org_id, event }            close every item past its time and charge the winners
//   { sale_id }                  charge (or retry) one sale
//   { offer_next_sale_id }       pass a failed sale to the next-highest bidder and charge them
// → { results: ChargeResult[], errors: [{ item_id, error }] }
// Postgres checks the staff member's permission (events.bunfest.manage); this
// server only does the charging.
import { chargeSale, type ChargeResult } from '../../../server/auction/charge'
import { DEFAULT_EVENT } from '../../../server/auction/env'
import { handle, HttpError, isUuid, json, readJson, str } from '../../../server/auction/http'
import { rpc, serviceClient, userClient } from '../../../server/auction/supabase'
import type { Sale } from '../../../server/auction/types'

export const onRequestPost = handle(async ({ request, env }) => {
  const jwt = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!jwt) throw new HttpError(401, 'Sign in as staff first.')
  const staff = userClient(jwt)
  const service = serviceClient(env)
  const body = await readJson(request)

  let sales: Sale[] = []
  const errors: { item_id?: string; error: string }[] = []

  if (isUuid(body.sale_id)) {
    // Staff can read sales they manage (Row-Level Security); anyone else gets nothing.
    const { data, error } = await staff.from('auction_sales').select('id').eq('id', body.sale_id).maybeSingle()
    if (error || !data) throw new HttpError(403, 'Not allowed.')
    const sale = await rpc<Sale | null>(service, 'auction_sale_get', { p_sale_id: body.sale_id })
    if (sale) sales = [sale]
  } else if (isUuid(body.offer_next_sale_id)) {
    const next = await rpc<Sale | null>(staff, 'auction_offer_next', { p_sale_id: body.offer_next_sale_id })
    if (!next) return json({ results: [], errors: [], message: 'No other bidder with a card on file bid on this item.' })
    sales = [next]
  } else {
    const org = body.org_id
    if (!isUuid(org)) throw new HttpError(400, 'Missing org_id.')
    const event = str(body.event, 60) || DEFAULT_EVENT
    const list = await rpc<Array<Sale | { item_id: string; error: string }>>(staff, 'auction_close_ready', { p_org: org, p_event: event })
    for (const row of list ?? []) {
      if ('error' in row) errors.push({ item_id: row.item_id, error: row.error })
      else sales.push(row)
    }
  }

  const results: ChargeResult[] = []
  for (const sale of sales) {
    try {
      results.push(await chargeSale(env, sale, { onFailure: 'failed' }))
    } catch (e) {
      errors.push({ item_id: sale.item_id, error: e instanceof Error ? e.message : 'Charge failed' })
    }
  }
  return json({ results, errors })
})
