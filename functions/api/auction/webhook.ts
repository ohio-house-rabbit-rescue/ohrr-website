// POST /api/auction/webhook — Stripe tells us what happened to payments and
// saved cards, signed with the webhook secret. This is the backstop: the normal
// paths already record results, so every handler here is safe to run twice.
//
// In Stripe: Developers → Webhooks → Add endpoint
//   URL     https://ohrr-website.pages.dev/api/auction/webhook
//   Events  setup_intent.succeeded, payment_intent.succeeded,
//           payment_intent.payment_failed, charge.refunded
import type { Env } from '../../../server/auction/env'
import { json } from '../../../server/auction/http'
import { rpc, serviceClient } from '../../../server/auction/supabase'
import { Stripe, stripeClient, webCrypto } from '../../../server/auction/stripe'
import type { Sale } from '../../../server/auction/types'

const idOf = (v: string | { id: string } | null | undefined): string | null => (typeof v === 'string' ? v : (v?.id ?? null))

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Payments are not set up yet.' }, 503)
  }
  const stripe = stripeClient(env)
  const signature = request.headers.get('stripe-signature') ?? ''
  const payload = await request.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, env.STRIPE_WEBHOOK_SECRET, undefined, webCrypto())
  } catch {
    return json({ error: 'Bad signature.' }, 400)
  }

  const db = serviceClient(env)
  try {
    switch (event.type) {
      case 'setup_intent.succeeded': {
        const si = event.data.object
        const bidderId = si.metadata?.bidder_id
        const pmId = idOf(si.payment_method)
        if (bidderId && pmId) {
          const pm = await stripe.paymentMethods.retrieve(pmId)
          await rpc(db, 'auction_set_card', {
            p_bidder_id: bidderId,
            p_customer: idOf(si.customer),
            p_payment_method: pm.id,
            p_brand: pm.card?.brand ?? null,
            p_last4: pm.card?.last4 ?? null,
          })
        }
        break
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object
        const saleId = pi.metadata?.sale_id || (await rpc<Sale | null>(db, 'auction_sale_by_pi', { p_payment_intent: pi.id }))?.sale_id
        if (saleId) await rpc(db, 'auction_finalize_sale', { p_sale_id: saleId, p_status: 'paid', p_payment_intent: pi.id, p_failure: null })
        break
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object
        const sale = pi.metadata?.sale_id
          ? await rpc<Sale | null>(db, 'auction_sale_get', { p_sale_id: pi.metadata.sale_id })
          : await rpc<Sale | null>(db, 'auction_sale_by_pi', { p_payment_intent: pi.id })
        // A Buy Now that fails goes back on sale; a closing bid is kept for staff to sort out.
        if (sale && sale.payment_status === 'pending') {
          await rpc(db, 'auction_finalize_sale', {
            p_sale_id: sale.sale_id,
            p_status: sale.kind === 'buy_now' ? 'void' : 'failed',
            p_payment_intent: pi.id,
            p_failure: pi.last_payment_error?.message ?? 'Payment failed',
          })
        }
        break
      }
      case 'charge.refunded': {
        const charge = event.data.object
        const piId = idOf(charge.payment_intent)
        if (piId && charge.refunded) {
          const sale = await rpc<Sale | null>(db, 'auction_sale_by_pi', { p_payment_intent: piId })
          if (sale && sale.payment_status === 'paid') {
            await rpc(db, 'auction_finalize_sale', { p_sale_id: sale.sale_id, p_status: 'refunded', p_payment_intent: piId, p_failure: null })
          }
        }
        break
      }
      default:
        break
    }
  } catch (e) {
    console.error('webhook', event.type, e)
    return json({ received: true, error: 'Handler failed; Stripe will retry.' }, 500)
  }
  return json({ received: true })
}
