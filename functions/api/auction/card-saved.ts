// POST /api/auction/card-saved   { token, setup_intent }  → { bidder }
// After Stripe's card form succeeds, we read the saved card's id from Stripe
// ourselves (never trusting the browser) and mark the bidder ready to bid.
import { handle, HttpError, isUuid, json, readJson, str } from '../../../server/auction/http'
import { rpc, serviceClient } from '../../../server/auction/supabase'
import { Stripe, stripeClient } from '../../../server/auction/stripe'
import { publicBidder, type Bidder } from '../../../server/auction/types'

export const onRequestPost = handle(async ({ request, env }) => {
  const body = await readJson(request)
  const token = body.token
  const setupId = str(body.setup_intent, 80)
  if (!isUuid(token)) throw new HttpError(400, 'Missing bidder token.')
  if (!setupId.startsWith('seti_')) throw new HttpError(400, 'Missing card setup id.')

  const db = serviceClient(env)
  const stripe = stripeClient(env)
  const bidder = await rpc<Bidder | null>(db, 'auction_bidder_secure', { p_bidder_id: null, p_token: token })
  if (!bidder) throw new HttpError(404, 'We could not find your bidder registration.')

  const si = await stripe.setupIntents.retrieve(setupId, { expand: ['payment_method'] })
  const customerId = typeof si.customer === 'string' ? si.customer : si.customer?.id
  if (!customerId || customerId !== bidder.stripe_customer_id) throw new HttpError(403, 'That card setup is not yours.')
  if (si.status !== 'succeeded' || !si.payment_method) throw new HttpError(400, 'The card was not saved. Please try again.')
  const pm = si.payment_method as Stripe.PaymentMethod
  const saved = await rpc<Bidder>(db, 'auction_set_card', {
    p_bidder_id: bidder.id,
    p_customer: null,
    p_payment_method: pm.id,
    p_brand: pm.card?.brand ?? null,
    p_last4: pm.card?.last4 ?? null,
  })
  return json({ bidder: publicBidder(saved) })
})
