// POST /api/auction/buy-now   { token, item_id }
// → { ok: true, sale }  or  { ok: false, requires_action, client_secret, sale }
//   or { ok: false, error, sale }  (the item goes straight back up for sale)
import { chargeSale } from '../../../server/auction/charge'
import { handle, HttpError, isUuid, json, readJson } from '../../../server/auction/http'
import { rpc, serviceClient } from '../../../server/auction/supabase'
import type { Bidder, Sale } from '../../../server/auction/types'

export const onRequestPost = handle(async ({ request, env }) => {
  const body = await readJson(request)
  const token = body.token
  const itemId = body.item_id
  if (!isUuid(token)) throw new HttpError(400, 'Please register to bid first.')
  if (!isUuid(itemId)) throw new HttpError(400, 'Which item?')

  const db = serviceClient(env)
  const bidder = await rpc<Bidder | null>(db, 'auction_bidder_secure', { p_bidder_id: null, p_token: token })
  if (!bidder) throw new HttpError(404, 'We could not find your bidder registration. Please register again.')
  if (bidder.is_blocked) throw new HttpError(403, 'Bidding is not available for this registration. Please see the auction desk.')
  if (!bidder.card_ready) throw new HttpError(400, 'Please add a card first.')

  // Locks the item and marks it sold-pending, so two people can't both buy it.
  const sale = await rpc<Sale>(db, 'auction_begin_sale', { p_item_id: itemId, p_bidder_id: bidder.id, p_kind: 'buy_now' })
  const result = await chargeSale(env, sale, { onFailure: 'void' })
  return json(result, result.ok || result.requires_action ? 200 : 402)
})
