// POST /api/auction/complete   { token, sale_id }  → { sale }
// After a bidder finishes their bank's extra check (3-D Secure) in the browser,
// we ask Stripe how the payment ended and record it.
import { handle, HttpError, isUuid, json, readJson } from '../../../server/auction/http'
import { rpc, serviceClient } from '../../../server/auction/supabase'
import { stripeClient } from '../../../server/auction/stripe'
import { publicSale, type Bidder, type Sale } from '../../../server/auction/types'

export const onRequestPost = handle(async ({ request, env }) => {
  const body = await readJson(request)
  const token = body.token
  const saleId = body.sale_id
  if (!isUuid(token) || !isUuid(saleId)) throw new HttpError(400, 'Missing details.')

  const db = serviceClient(env)
  const bidder = await rpc<Bidder | null>(db, 'auction_bidder_secure', { p_bidder_id: null, p_token: token })
  if (!bidder) throw new HttpError(404, 'We could not find your bidder registration.')
  const sale = await rpc<Sale | null>(db, 'auction_sale_get', { p_sale_id: saleId })
  if (!sale || sale.bidder_id !== bidder.id) throw new HttpError(403, 'That sale is not yours.')
  if (sale.payment_status !== 'pending' || !sale.stripe_payment_intent_id) return json({ sale: publicSale(sale) })

  const pi = await stripeClient(env).paymentIntents.retrieve(sale.stripe_payment_intent_id)
  if (pi.status === 'succeeded') {
    const s = await rpc<Sale>(db, 'auction_finalize_sale', { p_sale_id: saleId, p_status: 'paid', p_payment_intent: pi.id, p_failure: null })
    return json({ sale: publicSale(s) })
  }
  if (pi.status === 'requires_payment_method' || pi.status === 'canceled') {
    const status = sale.kind === 'buy_now' ? 'void' : 'failed'
    const s = await rpc<Sale>(db, 'auction_finalize_sale', {
      p_sale_id: saleId,
      p_status: status,
      p_payment_intent: pi.id,
      p_failure: pi.last_payment_error?.message ?? 'The payment was not completed',
    })
    return json({ sale: publicSale(s) })
  }
  return json({ sale: publicSale(sale), stripe_status: pi.status })
})
