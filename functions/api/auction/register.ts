// POST /api/auction/register
// { event?, name, email, phone?, fulfil: 'pickup'|'ship', address? }
// → { bidder, client_secret }   (the client_secret opens Stripe's card form)
import { DEFAULT_EVENT } from '../../../server/auction/env'
import { handle, HttpError, json, readJson, str } from '../../../server/auction/http'
import { rpc, serviceClient } from '../../../server/auction/supabase'
import { stripeClient } from '../../../server/auction/stripe'
import { publicBidder, type Address, type Bidder } from '../../../server/auction/types'

function pickAddress(v: unknown): Address | null {
  if (!v || typeof v !== 'object') return null
  const a = v as Record<string, unknown>
  return {
    line1: str(a.line1, 120),
    line2: str(a.line2, 120) || undefined,
    city: str(a.city, 80),
    state: str(a.state, 40),
    zip: str(a.zip, 20),
  }
}

export const onRequestPost = handle(async ({ request, env }) => {
  const body = await readJson(request)
  const name = str(body.name, 80)
  const email = str(body.email, 120).toLowerCase()
  const phone = str(body.phone, 30)
  const fulfil = body.fulfil === 'ship' ? 'ship' : 'pickup'
  const event = str(body.event, 60) || DEFAULT_EVENT
  const address = fulfil === 'ship' ? pickAddress(body.address) : null
  if (!name) throw new HttpError(400, 'Please give your name.')
  if (!email.includes('@')) throw new HttpError(400, 'Please give an email address.')
  if (fulfil === 'ship' && (!address?.line1 || !address.zip)) throw new HttpError(400, 'Please give a shipping address.')

  const db = serviceClient(env)
  const stripe = stripeClient(env)

  const bidder = await rpc<Bidder>(db, 'auction_register_bidder', {
    p_event: event,
    p_name: name,
    p_email: email,
    p_phone: phone || null,
    p_fulfil: fulfil,
    p_address: address,
  })
  const customer = await stripe.customers.create({
    name,
    email,
    phone: phone || undefined,
    metadata: { bidder_id: bidder.id, bidder_no: String(bidder.bidder_no), event },
  })
  const setup = await stripe.setupIntents.create({
    customer: customer.id,
    payment_method_types: ['card'],
    usage: 'off_session',
    metadata: { bidder_id: bidder.id },
  })
  const saved = await rpc<Bidder>(db, 'auction_set_card', {
    p_bidder_id: bidder.id,
    p_customer: customer.id,
    p_payment_method: null,
    p_brand: null,
    p_last4: null,
  })
  return json({ bidder: publicBidder(saved), client_secret: setup.client_secret })
})
