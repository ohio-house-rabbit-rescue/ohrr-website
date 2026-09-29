// POST /api/auction/new-card   { token }  → { client_secret }
// A fresh card form for a bidder who wants to change their card (or whose
// card was declined). The new card replaces the old one once saved.
import { handle, HttpError, isUuid, json, readJson } from '../../../server/auction/http'
import { rpc, serviceClient } from '../../../server/auction/supabase'
import { stripeClient } from '../../../server/auction/stripe'
import type { Bidder } from '../../../server/auction/types'

export const onRequestPost = handle(async ({ request, env }) => {
  const body = await readJson(request)
  const token = body.token
  if (!isUuid(token)) throw new HttpError(400, 'Missing bidder token.')

  const db = serviceClient(env)
  const stripe = stripeClient(env)
  const bidder = await rpc<Bidder | null>(db, 'auction_bidder_secure', { p_bidder_id: null, p_token: token })
  if (!bidder) throw new HttpError(404, 'We could not find your bidder registration.')

  let customerId = bidder.stripe_customer_id ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: bidder.name,
      email: bidder.email,
      phone: bidder.phone ?? undefined,
      metadata: { bidder_id: bidder.id, bidder_no: String(bidder.bidder_no), event: bidder.event_slug },
    })
    customerId = customer.id
    await rpc(db, 'auction_set_card', { p_bidder_id: bidder.id, p_customer: customerId, p_payment_method: null, p_brand: null, p_last4: null })
  }
  const setup = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
    metadata: { bidder_id: bidder.id },
  })
  return json({ client_secret: setup.client_secret })
})
