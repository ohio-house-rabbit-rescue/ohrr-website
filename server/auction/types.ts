// Shapes returned by the auction database functions (update 35).

export type Fulfil = 'pickup' | 'ship'
export type SaleKind = 'bid' | 'buy_now' | 'desk'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cash' | 'refunded' | 'void'

export interface Address {
  line1?: string
  line2?: string
  city?: string
  state?: string
  zip?: string
}

/** auction_bidder_json(), plus the Stripe ids when read through auction_bidder_secure(). */
export interface Bidder {
  id: string
  bidder_no: number
  event_slug: string
  name: string
  email: string
  phone: string | null
  fulfil: Fulfil
  address: Address | null
  card_ready: boolean
  card_brand: string | null
  card_last4: string | null
  is_blocked: boolean
  access_token: string
  created_at: string
  stripe_customer_id?: string | null
  stripe_payment_method_id?: string | null
}

export interface ItemPublic {
  id: string
  title: string
  description: string | null
  donated_by: string | null
  value_cents: number | null
  photo_url: string | null
  session: 'morning' | 'afternoon' | 'all-day'
  status: 'available' | 'won'
  buy_now_cents: number | null
  ship_fee_cents: number | null
  current_bid_cents: number | null
  closes_at: string | null
  is_open: boolean
}

/** auction_sale_json() */
export interface Sale {
  sale_id: string
  item_id: string
  bidder_id: string | null
  kind: SaleKind
  amount_cents: number
  ship_fee_cents: number
  total_cents: number
  fulfil: Fulfil
  ship_address: Address | null
  payment_status: PaymentStatus
  stripe_payment_intent_id: string | null
  failure_message: string | null
  paid_at: string | null
  fulfil_status: 'pending' | 'picked_up' | 'shipped'
  tracking: string | null
  shipped_at: string | null
  note: string | null
  created_at: string
  buyer: {
    name: string | null
    email: string | null
    phone: string | null
    bidder_no: number | null
    card_brand: string | null
    card_last4: string | null
    stripe_customer_id: string | null
    stripe_payment_method_id: string | null
  }
  item: ItemPublic | null
}

/** What the sites get back; never includes Stripe ids. */
export function publicBidder(b: Bidder): Omit<Bidder, 'stripe_customer_id' | 'stripe_payment_method_id'> {
  const { stripe_customer_id: _c, stripe_payment_method_id: _p, ...rest } = b
  return rest
}

/** A sale as the sites see it: no Stripe customer/payment-method ids. */
export function publicSale(s: Sale): Sale {
  return { ...s, buyer: { ...s.buyer, stripe_customer_id: null, stripe_payment_method_id: null } }
}
