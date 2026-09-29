// Silent auction, website side: the hooks the public pages share. Everything
// that talks to the database or the payment server is in auctionClient.ts
// (the contract); this file only wires it to React and handles the day before
// update 35 has been run (the catalog RPC is missing, so the page falls back
// to the plain raffle_items read and shows a preview with no bidding).
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, errMessage, isConfigured } from './supabase'
import { confirmPaymentAction } from '../components/CardSetup'
import {
  AUCTION_EVENT,
  auctionApi,
  fetchCatalog,
  fetchMyPage,
  forgetBidder,
  recallBidder,
  type Address,
  type AuctionItem,
  type Catalog,
  type ChargeResult,
  type MyPage,
  type RememberedBidder,
  type Sale,
} from './auctionClient'

export const CATALOG_PATH = '/bunfest/silent-auction'
export const REGISTER_PATH = `${CATALOG_PATH}/register`
export const MY_BIDS_PATH = `${CATALOG_PATH}/me`
export const itemPath = (id: string) => `${CATALOG_PATH}/${id}`

/** Is this the "function isn't in the database yet" error (update 35 not run)? */
export function isMissingFunction(e: unknown): boolean {
  const o = e as { code?: string; message?: string } | null
  const m = o?.message ?? (typeof e === 'string' ? e : '')
  return o?.code === 'PGRST202' || /could not find the function|schema cache|does not exist/i.test(m)
}

interface RaffleRow {
  id: string
  title: string
  description: string | null
  donated_by: string | null
  value_cents: number | null
  photo_url: string | null
  session: AuctionItem['session']
  status: AuctionItem['status']
  sort_order: number
}

function previewItem(r: RaffleRow): AuctionItem {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    donated_by: r.donated_by,
    value_cents: r.value_cents,
    photo_url: r.photo_url,
    session: r.session,
    status: r.status,
    won_kind: null,
    sort_order: r.sort_order,
    starting_bid_cents: null,
    increment_cents: 500,
    buy_now_cents: null,
    ship_fee_cents: null,
    current_bid_cents: null,
    next_min_cents: 500,
    bid_count: 0,
    high_bidder_no: null,
    closes_at: null,
    is_open: false,
  }
}

/** The catalog before update 35: the published items, no settings, nothing open. */
async function previewCatalog(event: string): Promise<Catalog> {
  const [itemsRes, settingsRes] = await Promise.all([
    supabase
      .from('raffle_items')
      .select('id,title,description,donated_by,value_cents,photo_url,session,status,sort_order')
      .eq('event_slug', event)
      .eq('is_published', true)
      .order('sort_order', { ascending: true }),
    supabase.from('auction_settings').select('intro_text').eq('event_slug', event).limit(1),
  ])
  const rows = itemsRes.error ? [] : ((itemsRes.data ?? []) as RaffleRow[])
  const intro = settingsRes.error ? null : ((settingsRes.data?.[0] as { intro_text?: string | null } | undefined)?.intro_text ?? null)
  return {
    now: new Date().toISOString(),
    // No settings row means no bidding; the intro line still shows.
    settings: intro?.trim()
      ? {
          bidding_enabled: false,
          bidding_opens_at: null,
          morning_closes_at: null,
          afternoon_closes_at: null,
          extend_minutes: 0,
          default_increment_cents: 500,
          stripe_publishable_key: null,
          intro_text: intro,
          bidding_note: null,
          pickup_note: null,
          shipping_note: null,
        }
      : null,
    items: rows.map(previewItem),
  }
}

export type CatalogSource = 'live' | 'preview'

/** The catalog through auction_catalog(), or the preview when that RPC isn't there yet. */
export async function loadCatalog(event = AUCTION_EVENT): Promise<{ catalog: Catalog; source: CatalogSource }> {
  if (!isConfigured) return { catalog: { now: new Date().toISOString(), settings: null, items: [] }, source: 'preview' }
  try {
    const catalog = await fetchCatalog(supabase, event)
    if (!catalog || !Array.isArray(catalog.items)) throw new Error('empty')
    return { catalog, source: 'live' }
  } catch {
    return { catalog: await previewCatalog(event), source: 'preview' }
  }
}

/** Can anyone bid online right now (switched on, with Stripe's key in place)? */
export function biddingOffered(c: Catalog | null): boolean {
  return Boolean(c?.settings?.bidding_enabled && c.settings.stripe_publishable_key)
}

/**
 * The catalog, refreshed every `everyMs` while bidding is on (countdowns and
 * bids move) — a single read otherwise.
 */
export function useCatalog(everyMs = 15000): { catalog: Catalog | null; source: CatalogSource; error: string | null; reload: () => Promise<void> } {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [source, setSource] = useState<CatalogSource>('preview')
  const [error, setError] = useState<string | null>(null)
  const live = useRef(true)

  const reload = useCallback(async () => {
    try {
      const r = await loadCatalog()
      if (!live.current) return
      setCatalog(r.catalog)
      setSource(r.source)
      setError(null)
    } catch (e) {
      if (live.current) setError(errMessage(e))
    }
  }, [])

  useEffect(() => {
    live.current = true
    void reload()
    return () => {
      live.current = false
    }
  }, [reload])

  const polling = Boolean(catalog?.settings?.bidding_enabled)
  useEffect(() => {
    if (!polling) return
    const t = setInterval(() => void reload(), everyMs)
    return () => clearInterval(t)
  }, [polling, everyMs, reload])

  return { catalog, source, error, reload }
}

/**
 * The server's clock, kept moving between reads: countdowns count from the
 * database's `now`, not the visitor's (a phone's clock can be minutes out).
 * Ticks every 20 s.
 */
export function useServerNow(serverNowIso: string | null | undefined): string {
  const offset = useRef(0)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (serverNowIso) offset.current = new Date(serverNowIso).getTime() - Date.now()
  }, [serverNowIso])
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 20000)
    return () => clearInterval(t)
  }, [])
  void tick
  return new Date(Date.now() + offset.current).toISOString()
}

/**
 * The bidder this browser remembers, and their page from the database (their
 * details, bids and wins). `page` is undefined while loading, null when there is
 * no registration (or the token no longer works — then it is forgotten).
 */
export function useMyPage(tokenOverride?: string, everyMs = 15000): {
  remembered: RememberedBidder | null
  token: string
  page: MyPage | null | undefined
  error: string | null
  reload: () => Promise<void>
  forget: () => void
} {
  const [remembered, setRemembered] = useState<RememberedBidder | null>(() => recallBidder())
  const token = tokenOverride || remembered?.access_token || ''
  const [page, setPage] = useState<MyPage | null | undefined>(token ? undefined : null)
  const [error, setError] = useState<string | null>(null)
  const live = useRef(true)

  const reload = useCallback(async () => {
    if (!token || !isConfigured) {
      setPage(null)
      return
    }
    try {
      const p = await fetchMyPage(supabase, token)
      if (!live.current) return
      if (!p) {
        // The link doesn't match any registration: stop remembering it.
        if (!tokenOverride) forgetBidder()
        setRemembered(null)
      }
      setPage(p)
      setError(null)
    } catch (e) {
      if (!live.current) return
      // Before update 35 there is no such function: nothing to show, no alarm.
      setPage(null)
      setError(isMissingFunction(e) ? null : errMessage(e))
    }
  }, [token, tokenOverride])

  useEffect(() => {
    live.current = true
    void reload()
    return () => {
      live.current = false
    }
  }, [reload])

  useEffect(() => {
    if (!token || everyMs <= 0) return
    const t = setInterval(() => void reload(), everyMs)
    return () => clearInterval(t)
  }, [token, everyMs, reload])

  const forget = useCallback(() => {
    forgetBidder()
    setRemembered(null)
    setPage(null)
  }, [])

  return { remembered, token, page, error, reload, forget }
}

/** Sets the browser tab's title while the page is open. */
export function useDocTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (!title) return
    const before = document.title
    document.title = `${title} · Ohio House Rabbit Rescue`
    return () => {
      document.title = before
    }
  }, [title])
}

export type Settled = { ok: true; sale: Sale; message: string } | { ok: false; sale: Sale | null; message: string }

/**
 * Finish a charge the payment server started: paid outright, or the bank
 * wants its extra check (3-D Secure) first, or it was declined. Returns the
 * plain words to show.
 */
export async function settleCharge(result: ChargeResult, token: string, publishableKey: string | null | undefined): Promise<Settled> {
  if (result.ok) return { ok: true, sale: result.sale, message: 'Paid. Stripe has emailed your receipt.' }
  if (result.requires_action) {
    if (!publishableKey) return { ok: false, sale: result.sale, message: 'Your bank wants an extra check, but the card form is not set up. Please see the auction desk.' }
    const check = await confirmPaymentAction(publishableKey, result.client_secret)
    if (!check.ok) return { ok: false, sale: result.sale, message: check.error ?? 'The bank did not approve the payment.' }
    const done = await auctionApi.complete(token, result.sale.sale_id)
    if (done.sale.payment_status === 'paid') return { ok: true, sale: done.sale, message: 'Paid. Stripe has emailed your receipt.' }
    if (done.sale.payment_status === 'pending') return { ok: true, sale: done.sale, message: 'Your bank is still confirming the payment. Check back in a minute.' }
    return { ok: false, sale: done.sale, message: done.sale.failure_message ?? 'The payment was not completed.' }
  }
  return { ok: false, sale: result.sale, message: result.error }
}

/** "12 Main St, Apt 2, Columbus, OH 43214" */
export function addressLine(a: Address | null | undefined): string {
  if (!a) return ''
  const city = [a.city, [a.state, a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [a.line1, a.line2, city].filter((s) => s && String(s).trim()).join(', ')
}

/** "Ships +$8" / "Pickup only" */
export function shipLine(item: Pick<AuctionItem, 'ship_fee_cents'>): string {
  if (item.ship_fee_cents == null) return 'Pickup only'
  return item.ship_fee_cents === 0 ? 'Ships free' : `Ships +$${(item.ship_fee_cents / 100).toFixed(2).replace(/\.00$/, '')}`
}

/** The card as Stripe describes it: "Visa ending 4242". */
export function cardLine(b: { card_brand: string | null; card_last4: string | null; card_ready: boolean }): string {
  if (!b.card_ready) return 'No card on file yet'
  const brand = b.card_brand ? b.card_brand.charAt(0).toUpperCase() + b.card_brand.slice(1) : 'Card'
  return b.card_last4 ? `${brand} ending ${b.card_last4}` : brand
}

/** "Sat, Oct 25, 2:30 PM" in Eastern time. */
export function fmtAt(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
