// Charge a sale to the bidder's saved card. Used for Buy Now (right away) and
// for the winning bids when a session closes (the desk's "Close & charge").
import { AUCTION_NAME, type Env } from './env'
import { rpc, serviceClient } from './supabase'
import { Stripe, stripeClient } from './stripe'
import { publicSale, type PaymentStatus, type Sale } from './types'

export type ChargeResult =
  | { ok: true; sale: Sale }
  | { ok: false; requires_action: true; client_secret: string; sale: Sale }
  | { ok: false; requires_action?: false; error: string; sale: Sale }

/**
 * `onFailure`: what a declined card does to the sale. A Buy Now that fails is
 * voided (the item goes straight back up for sale); a closing bid that fails is
 * kept as 'failed' so staff can offer the item to the next bidder or take cash.
 */
export async function chargeSale(env: Env, sale: Sale, opts: { onFailure: 'failed' | 'void' }): Promise<ChargeResult> {
  const db = serviceClient(env)
  const stripe = stripeClient(env)

  const finalize = async (status: PaymentStatus, pi: string | null, failure?: string): Promise<Sale> =>
    publicSale(
      await rpc<Sale>(db, 'auction_finalize_sale', {
        p_sale_id: sale.sale_id,
        p_status: status,
        p_payment_intent: pi,
        p_failure: failure ?? null,
      }),
    )

  if (sale.payment_status === 'paid' || sale.payment_status === 'cash') return { ok: true, sale: publicSale(sale) }
  if (sale.payment_status !== 'pending' && sale.payment_status !== 'failed') {
    return { ok: false, error: `This sale is ${sale.payment_status}.`, sale: publicSale(sale) }
  }
  if (sale.total_cents <= 0) return { ok: true, sale: await finalize('paid', null) }

  const buyer = sale.buyer
  if (!buyer.stripe_customer_id || !buyer.stripe_payment_method_id) {
    const s = await finalize(opts.onFailure, null, 'No card on file')
    return { ok: false, error: 'There is no card on file for this bidder.', sale: s }
  }

  // An earlier attempt on this sale: don't charge twice.
  if (sale.stripe_payment_intent_id) {
    const pi = await stripe.paymentIntents.retrieve(sale.stripe_payment_intent_id)
    if (pi.status === 'succeeded') return { ok: true, sale: await finalize('paid', pi.id) }
    if (pi.status === 'requires_action' || pi.status === 'requires_confirmation') {
      return { ok: false, requires_action: true, client_secret: pi.client_secret ?? '', sale: publicSale(sale) }
    }
    if (pi.status === 'processing') {
      return { ok: false, error: 'The payment is still processing. Check again in a minute.', sale: publicSale(sale) }
    }
    // requires_payment_method or canceled: try again with a fresh attempt below
  }

  const title = sale.item?.title ?? 'auction item'
  try {
    const pi = await stripe.paymentIntents.create(
      {
        amount: sale.total_cents,
        currency: 'usd',
        customer: buyer.stripe_customer_id,
        payment_method: buyer.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        payment_method_types: ['card'],
        description: `${AUCTION_NAME}: ${title}`.slice(0, 200),
        receipt_email: buyer.email ?? undefined,
        metadata: {
          sale_id: sale.sale_id,
          item_id: sale.item_id,
          bidder_id: sale.bidder_id ?? '',
          kind: sale.kind,
          item: title.slice(0, 100),
          shipping_cents: String(sale.ship_fee_cents),
        },
      },
      { idempotencyKey: `sale-${sale.sale_id}-${sale.stripe_payment_intent_id ?? 'first'}` },
    )
    if (pi.status === 'succeeded') return { ok: true, sale: await finalize('paid', pi.id) }
    if (pi.status === 'requires_action') {
      const s = await finalize('pending', pi.id)
      return { ok: false, requires_action: true, client_secret: pi.client_secret ?? '', sale: s }
    }
    if (pi.status === 'processing') {
      const s = await finalize('pending', pi.id)
      return { ok: false, error: 'The payment is processing. Check again in a minute.', sale: s }
    }
    const s = await finalize(opts.onFailure, pi.id, `Payment ${pi.status.replace(/_/g, ' ')}`)
    return { ok: false, error: 'The card was not charged.', sale: s }
  } catch (e) {
    if (e instanceof Stripe.errors.StripeCardError) {
      const raw = e.raw as { payment_intent?: { id?: string; client_secret?: string } } | undefined
      const pi = raw?.payment_intent
      if (e.code === 'authentication_required' && pi?.id && pi.client_secret) {
        const s = await finalize('pending', pi.id)
        return { ok: false, requires_action: true, client_secret: pi.client_secret, sale: s }
      }
      const message = e.message || 'The card was declined.'
      const s = await finalize(opts.onFailure, pi?.id ?? null, message)
      return { ok: false, error: message, sale: s }
    }
    throw e
  }
}
