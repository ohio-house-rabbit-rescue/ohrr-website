// POST /api/auction/pay   { token, sale_id }
// A winner whose card was declined (or who added a new card) pays for their
// own sale. Same outcomes as Buy Now; a failure keeps the sale for staff.
import { chargeSale } from '../../../server/auction/charge'
import { handle, HttpError, isUuid, json, readJson } from '../../../server/auction/http'
import { rpc, serviceClient } from '../../../server/auction/supabase'
import type { Bidder, Sale } from '../../../server/auction/types'

export const onRequestPost = handle(async ({ request, env }) => {
  const body = await readJson(request)
  const token = body.token
  const saleId = body.sale_id
  if (!isUuid(token) || !isUuid(saleId)) throw new HttpError(400, 'Missing details.')

  const db = serviceClient(env)
  const bidder = await rpc<Bidder | null>(db, 'auction_bidder_secure', { p_bidder_id: null, p_token: token })
  if (!bidder) throw new HttpError(404, 'We could not find your bidder registration.')
  if (!bidder.card_ready) throw new HttpError(400, 'Please add a card first.')
  const sale = await rpc<Sale | null>(db, 'auction_sale_get', { p_sale_id: saleId })
  if (!sale || sale.bidder_id !== bidder.id) throw new HttpError(403, 'That sale is not yours.')
  if (sale.payment_status !== 'pending' && sale.payment_status !== 'failed') {
    throw new HttpError(400, `This sale is already ${sale.payment_status}.`)
  }
  // Charge the card the bidder has NOW (they may have just changed it).
  const fresh: Sale = { ...sale, buyer: { ...sale.buyer, stripe_customer_id: bidder.stripe_customer_id ?? null, stripe_payment_method_id: bidder.stripe_payment_method_id ?? null } }
  const result = await chargeSale(env, fresh, { onFailure: 'failed' })
  return json(result, result.ok || result.requires_action ? 200 : 402)
})
