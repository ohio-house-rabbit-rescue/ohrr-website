import Stripe from 'stripe'
import type { Env } from './env'
import { HttpError } from './http'

/** Stripe, using fetch (Workers have no Node http). */
export function stripeClient(env: Env): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new HttpError(503, 'Payments are not set up yet (the Stripe secret key is missing).')
  return new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() })
}

/** For checking Stripe's webhook signatures with Web Crypto. */
export function webCrypto() {
  return Stripe.createSubtleCryptoProvider()
}

export { Stripe }
