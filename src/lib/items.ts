// Items with an OHRR number (DON-00042, or a Hop Shop SKU like HAY-101-001 —
// update 41) — the website's copy of the app's scan/types.ts and
// scan/api.ts, for the Items list and the label printer. One code → one item of
// one kind; the kind decides which table holds the details. Update 36 adds a
// fourth kind, `donation` ("cataloged, sort later"), and label_printed_at.
// Update 39 adds a donation's details: how many, a price for one, condition,
// what sort of thing and where it's kept (and a shop product's category and
// shelf). Update 40 adds donation intake: drop-offs (who gave it, for the
// thank-you letter), where a donation is headed, a value for each or for the
// whole lot, size, use-by, splitting a lot, baskets and the monthly report.
// Update 47 adds receiving: a donation or bought (what we paid, where), and its
// use from OHRR's own list (Midwest BunFest, Guardians Event, Hop Shop, Bunny
// Care …); 'event' joins headed_for and 'rabbits' now means our own use.
import { supabase } from './supabase'
import type { IconName } from '../components/icons'

export type ItemKind = 'auction' | 'raffle' | 'stock' | 'donation'

/** The kinds a donation can be sorted INTO. */
export const SORT_INTO: ItemKind[] = ['auction', 'raffle', 'stock']

export interface KindMeta {
  label: string
  icon: IconName
  tone: 'blue' | 'orange'
  /** The "it's gone" status for this kind, in plain words. */
  done: string
  doneLabel: string
  open: string
}

export const KIND_META: Record<ItemKind, KindMeta> = {
  donation: { label: 'Donation — sort later', icon: 'gift', tone: 'blue', done: 'unsorted', doneLabel: 'To sort', open: 'unsorted' },
  auction: { label: 'Silent Auction', icon: 'gavel', tone: 'orange', done: 'won', doneLabel: 'Won', open: 'available' },
  raffle: { label: 'Raffle prize', icon: 'ticket', tone: 'orange', done: 'drawn', doneLabel: 'Drawn', open: 'available' },
  stock: { label: 'Hop Shop stock', icon: 'box', tone: 'blue', done: 'inactive', doneLabel: 'Hidden', open: 'active' },
}

/** What the RPCs return — the same shape for every kind. */
export interface TaggedItem {
  tag_id: string
  code: string
  kind: ItemKind
  ref_id: string
  title: string
  description: string | null
  donated_by: string | null
  value_cents: number | null
  photo_url: string | null
  /** All its photos, cover first (update 37; missing before it). */
  photo_urls?: string[] | null
  price_cents: number | null
  quantity: number | null
  status: string
  is_published: boolean
  session?: 'morning' | 'afternoon' | 'all-day' | null
  /** Donations only: the day it came in. */
  received_on?: string | null
  /** Set once its label has been printed (update 36; missing before it). */
  label_printed_at?: string | null
  /**
   * Update 39 (missing before it): condition (donations), what sort of thing
   * and where it's kept (donations; for shop stock, the product's category
   * and shelf).
   */
  condition?: string | null
  category?: string | null
  location?: string | null
  /** Client only: the extra details couldn't be saved yet (update 39 not run). */
  details_skipped?: boolean
  /** Update 40 (donations): where it's headed, value each or for the lot, size, use-by, drop-off, outcome. */
  headed_for?: HeadedFor | null
  value_basis?: 'each' | 'all' | null
  value_each_cents?: number | null
  value_total_cents?: number | null
  size?: string | null
  use_by?: string | null
  outcome?: 'sorted' | 'basket' | 'rabbits' | 'passed_on' | null
  outcome_at?: string | null
  outcome_note?: string | null
  dropoff_id?: string | null
  split_from?: string | null
  /** A donation in a basket: the basket it's in. */
  in_basket?: { code: string; kind: ItemKind; title: string } | null
  /** A basket (raffle prize or auction lot): the donations in it. */
  contents?: { code: string | null; title: string; quantity: number; size: string | null; donated_by: string | null; value_total_cents: number | null }[] | null
  /** Client only: headed for / size / use-by / drop-off couldn't be saved yet (update 40 not run). */
  plan_skipped?: boolean
  /** The box it's packed in (update 46; missing before it). */
  box?: { code: string; box_no: number; location: string | null } | null
  /** Update 47 (donations): how it came in, what was paid and where, and its use ("Guardians Event"). */
  source?: 'donation' | 'purchase' | null
  cost_cents?: number | null
  bought_from?: string | null
  purpose?: string | null
  /** Client only: the receiving details couldn't be saved yet (update 47 not run). */
  receiving_skipped?: boolean
  created_at: string
  updated_at?: string
}

/* ------------------------------------------------------- the details */

export const CONDITIONS: { value: string; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
]

export const conditionLabel = (v: string | null | undefined): string => CONDITIONS.find((c) => c.value === v)?.label ?? ''

/** Starting ideas for "What sort of thing?"; anything else can be typed. */
export const CATEGORY_IDEAS = [
  'Food & hay',
  'Toys & chews',
  'Houses & pens',
  'Litter & supplies',
  'Grooming',
  'Gift basket',
  'Art & decor',
  'Clothing & accessories',
  'Gift card',
]

/** "50 of them · 24×36 · Worth $10 each · $500 in all · For: Raffle · Like new · Kept: Bin 3" — the extra details in one line (the app's wording). */
export function extrasSummary(
  item: Pick<TaggedItem, 'kind' | 'quantity' | 'price_cents' | 'condition' | 'category' | 'location'> &
    Partial<Pick<TaggedItem, 'value_cents' | 'value_basis' | 'size' | 'headed_for' | 'use_by' | 'outcome' | 'purpose' | 'source' | 'cost_cents' | 'bought_from'>>,
): string {
  const parts: string[] = []
  const donation = item.kind === 'donation'
  if (donation && item.quantity && item.quantity > 1) parts.push(`${item.quantity} of them`)
  if (donation && item.size) parts.push(item.size)
  if (donation && item.source === 'purchase') {
    const paid = item.cost_cents != null ? `Bought for ${money(item.cost_cents)}` : 'Bought'
    parts.push(item.bought_from ? `${paid} at ${item.bought_from}` : paid)
  }
  if (donation && item.value_cents != null) parts.push(`Worth ${valueLine({ value_cents: item.value_cents, value_basis: item.value_basis, quantity: item.quantity })}`)
  if (donation && item.price_cents != null) parts.push(`Sells at ${money(item.price_cents)} each`)
  if (donation && (item.purpose || item.headed_for) && !item.outcome) parts.push(`For: ${purposeLine(item)}`)
  if (item.condition) parts.push(conditionLabel(item.condition))
  if (item.category) parts.push(item.category)
  if (item.location) parts.push(`Kept: ${item.location}`)
  if (donation && item.use_by) parts.push(`Use by ${usDate(item.use_by)}`)
  return parts.join(' · ')
}

/**
 * Has update 39 run, as far as this item can tell? After it, donations and
 * shop stock always carry a `location` key (null when blank); before it, never.
 */
export const hasDetails = (item: TaggedItem): boolean => 'location' in item

/** Shown after Add when the extra details could not be kept yet. */
export const UPDATE_39_ADD_NOTE = 'The item is saved. How many, the price and the other details need database update 39.'
/** Shown when condition, category or place can't be saved yet. */
export const UPDATE_39_EXTRAS_NOTE = 'Condition, category and where it’s kept need database update 39.'

/* ------------------------------------------------------------- update 40 */

/** Update 47 adds 'event': used at an event, not as a raffle prize or auction lot. */
export type HeadedFor = 'raffle' | 'auction' | 'shop' | 'rabbits' | 'event'

/** How a donation will be used; '' = not sure yet (sort later). 'rabbits' is
 *  kept for the rescue's own use (Bunny Care, office). */
export const HEADED_FOR: { value: HeadedFor | ''; label: string }[] = [
  { value: '', label: 'Not sure yet' },
  { value: 'raffle', label: 'Raffle' },
  { value: 'auction', label: 'Silent Auction' },
  { value: 'event', label: 'Used at an event' },
  { value: 'shop', label: 'Hop Shop' },
  { value: 'rabbits', label: 'Our own use' },
]

export const headedLabel = (v: string | null | undefined): string => (v ? (HEADED_FOR.find((h) => h.value === v)?.label ?? '') : '')

/* ------------------------------------------------------------- update 47 */

/** One of OHRR's uses: an event (raffle, auction or used there), sold in the
 *  Hop Shop, or kept for the rescue's own use (Bunny Care, office). */
export type PurposeUse = 'event' | 'shop' | 'keep'

export interface ItemPurpose {
  id: string
  name: string
  use: PurposeUse
  sort_order: number
  is_active: boolean
}

/** OHRR's uses on 2026-10-27, shown until update 47 is run (it makes the same list). */
export const DEFAULT_PURPOSES: ItemPurpose[] = [
  { id: 'default-bunfest', name: 'Midwest BunFest', use: 'event', sort_order: 10, is_active: true },
  { id: 'default-guardians', name: 'Guardians Event', use: 'event', sort_order: 20, is_active: true },
  { id: 'default-special', name: 'Special Event', use: 'event', sort_order: 30, is_active: true },
  { id: 'default-hopshop', name: 'Hop Shop', use: 'shop', sort_order: 40, is_active: true },
  { id: 'default-care', name: 'Bunny Care', use: 'keep', sort_order: 50, is_active: true },
]

export const PURPOSE_USES: { value: PurposeUse; label: string; hint: string }[] = [
  { value: 'event', label: 'An event', hint: 'Raffle prize, auction lot, or used there' },
  { value: 'shop', label: 'Sold in the Hop Shop', hint: 'Gets a price' },
  { value: 'keep', label: 'Kept for our own use', hint: 'Bunny care, office, cleaning' },
]

/** Where headed_for lands for a use: an event starts as "used at the event". */
export function headedForUse(use: PurposeUse | null | undefined): HeadedFor | '' {
  return use === 'shop' ? 'shop' : use === 'keep' ? 'rabbits' : use === 'event' ? 'event' : ''
}

/** How it's used at an event. */
export const EVENT_USES: { value: 'raffle' | 'auction' | 'event'; label: string }[] = [
  { value: 'raffle', label: 'Raffle prize' },
  { value: 'auction', label: 'Silent Auction' },
  { value: 'event', label: 'Used at the event' },
]

/** "Guardians Event · Raffle prize", "Hop Shop", "Bunny Care", or the old place. */
export function purposeLine(item: { purpose?: string | null; headed_for?: HeadedFor | null }): string {
  if (!item.purpose) return item.headed_for ? headedLabel(item.headed_for) : ''
  const how = item.headed_for === 'raffle' || item.headed_for === 'auction' ? EVENT_USES.find((e) => e.value === item.headed_for)?.label : ''
  return how ? `${item.purpose} · ${how}` : item.purpose
}

/** The kind as people say it: a donation we bought is "Bought — sort later". */
export function kindLabel(item: Pick<TaggedItem, 'kind' | 'source'>): string {
  return item.kind === 'donation' && item.source === 'purchase' ? 'Bought — sort later' : KIND_META[item.kind].label
}

/** What we paid, from dollars typed for the whole lot or for each. */
export function costCents(v: { cost: string; costBasis: 'each' | 'all'; quantity: number }): number | null {
  const c = toCents(v.cost)
  if (c == null) return null
  return v.costBasis === 'each' ? c * Math.max(1, v.quantity) : c
}

/** Where a donation headed for X goes when it's sorted. */
export const HEADED_KIND: Record<'raffle' | 'auction' | 'shop', ItemKind> = { raffle: 'raffle', auction: 'auction', shop: 'stock' }

type ValueParts = { value_cents: number | null | undefined; value_basis?: 'each' | 'all' | null; quantity: number | null | undefined }

/** Value for one and for the lot, whichever way it was typed. */
export function donationValues(v: ValueParts): { each: number | null; total: number | null } {
  if (v.value_cents == null) return { each: null, total: null }
  const q = Math.max(1, v.quantity ?? 1)
  return v.value_basis === 'all' ? { each: Math.round(v.value_cents / q), total: v.value_cents } : { each: v.value_cents, total: v.value_cents * q }
}

/** "$10 each · $500 in all", or "$25" for one. */
export function valueLine(v: ValueParts): string {
  const { each, total } = donationValues(v)
  if (each == null || total == null) return ''
  return (v.quantity ?? 1) > 1 ? `${money(each)} each · ${money(total)} in all` : money(total)
}

/** "Mar 15, 2027" from "2027-03-15". */
export function usDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Use-by within 30 days (or past). */
export function dueSoon(iso: string | null | undefined): boolean {
  if (!iso) return false
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return false
  return new Date(y, m - 1, d).getTime() - Date.now() < 30 * 86400000
}

/**
 * Has update 40 run, as far as this donation can tell? After it a donation
 * always carries a `headed_for` key (null when not sure yet); before it, never.
 */
export const has40 = (item: TaggedItem): boolean => 'headed_for' in item

/** Shown after Add when where it's headed, size, use-by or the drop-off could not be kept yet. */
export const UPDATE_40_ADD_NOTE = 'The item is saved. Where it’s headed, size, use-by and the drop-off need database update 40.'
/** Shown where a part arriving with update 40 lives, when the database hasn't got it yet. */
export const NEEDS_40 = 'This needs database update 40.'

/* ------------------------------------------------------------- money */

export const money = (c: number | null | undefined) => (c == null ? '' : `$${c % 100 === 0 ? c / 100 : (c / 100).toFixed(2)}`)

export const toCents = (s: string): number | null => {
  const n = Number(s.replace(/[^0-9.]/g, ''))
  return s.trim() === '' || !Number.isFinite(n) || n < 0 ? null : Math.round(n * 100)
}

/** Plain-words status for a list row. */
export function statusLabel(item: TaggedItem): string {
  if (item.kind === 'donation') {
    if (item.outcome === 'basket') return item.in_basket ? `In the basket “${item.in_basket.title}”` : 'In a basket'
    if (item.outcome === 'rabbits') return 'In use by OHRR'
    if (item.outcome === 'passed_on') return 'Passed on / not usable'
    if (item.purpose) return `To be sorted · for: ${purposeLine(item)}`
    return item.headed_for ? `To be sorted · for: ${headedLabel(item.headed_for)}` : 'To be sorted'
  }
  if (item.kind === 'stock') {
    const n = item.quantity ?? 0
    const count = n === 1 ? '1 in stock' : `${n} in stock`
    return item.status === 'inactive' ? `${count} · hidden from the shop` : count
  }
  const done = item.status === 'won' ? 'Won' : item.status === 'drawn' ? 'Drawn' : 'Available'
  return item.is_published ? done : `${done} · hidden`
}

/* ------------------------------------------------------------- RPCs */

/** True when the database doesn't have the function yet (an update not run). */
export function isMissingFunction(e: unknown): boolean {
  const o = e as { code?: string; message?: string } | null
  return o?.code === 'PGRST202' || o?.code === 'PGRST203' || /could not find the function|schema cache/i.test(o?.message ?? '')
}

/** Shown in place of a feature that arrives with update 36. */
export const UPDATE_36_NOTE = 'This part needs database update 36 (donations and labels), which hasn’t been run yet. Everything else here still works.'

function asItem(data: unknown): TaggedItem | null {
  if (!data || typeof data !== 'object') return null
  return data as TaggedItem
}

/**
 * The item with this code, or null when no item has it yet (the app's
 * findByCode: "Scan an item" looks a label up with the same function).
 */
export async function findByCode(orgId: string, code: string): Promise<TaggedItem | null> {
  const { data, error } = await supabase.rpc('item_by_code', { p_org: orgId, p_code: code })
  if (error) throw error
  return asItem(data)
}

/**
 * Everything with a code, newest first. Only the two arguments every database
 * version knows, so this works before and after update 36 (label_printed_at is
 * simply absent before it).
 */
export async function listItems(orgId: string, kind: ItemKind | null = null): Promise<TaggedItem[]> {
  const { data, error } = await supabase.rpc('list_tagged_items', { p_org: orgId, p_kind: kind })
  if (error) throw error
  return ((data ?? []) as unknown[]).map(asItem).filter((x): x is TaggedItem => x !== null)
}

const blank = (s: string | null | undefined) => (s ?? '').trim() || null

export interface CatalogInput {
  title: string
  kind?: ItemKind
  donatedBy?: string
  /** Notes. */
  description?: string
  valueCents?: number | null
  photoUrl?: string | null
  code?: string | null
  /** Update 39 details. */
  quantity?: number | null
  priceCents?: number | null
  condition?: string | null
  category?: string | null
  location?: string | null
  /** Update 40 (donations): where it's headed, value each/all, size, use-by, drop-off. */
  plan?: DonationPlan | null
}

/** Update 40: a donation's plan. Only the keys given are changed. */
export interface DonationPlan {
  headed_for?: HeadedFor | null
  value_basis?: 'each' | 'all'
  size?: string | null
  use_by?: string | null
  dropoff_id?: string | null
  /** Update 47: its use from OHRR's list, how it came in, and what was paid where. */
  purpose?: string | null
  source?: 'donation' | 'purchase'
  cost_cents?: number | null
  bought_from?: string | null
}

/** The update 47 keys of a plan. */
const RECEIVING_KEYS = ['purpose', 'source', 'cost_cents', 'bought_from'] as const

/** Sent receiving details (update 47) but the item came back without them: not run yet. */
function receivingSkipped(plan: DonationPlan | null, item: TaggedItem): boolean {
  if (!plan || 'source' in item) return false
  return RECEIVING_KEYS.some((k) => plan[k] != null && plan[k] !== '' && plan[k] !== 'donation')
}

/** Before update 47 'event' is not a place: keep the rest of the plan. */
const isUnknownPlace = (e: unknown) => /unknown place|headed_for_check/i.test((e as { message?: string } | null)?.message ?? '')

/** Shown after Add when the receiving details could not be kept yet. */
export const UPDATE_47_NOTE =
  'The item is saved. Donation or bought, what we paid, where it was bought and what it’s for need database update 47; add them from the item once it has run.'

/**
 * Catalog a new item in one call. The database gives a donation the next DON
 * number (update 41; a DON label nothing has yet keeps its number, a packet
 * barcode isn't kept) (update 36). Before update 39 the extra
 * details aren't accepted: the item is saved without condition, category and
 * place, and comes back with details_skipped when any detail had been entered,
 * so the screen can say so. Update 40 takes the donation's plan (p_plan) in
 * the same call; before it the item is saved without it and comes back with
 * plan_skipped.
 */
export async function catalogNewItem(orgId: string, input: CatalogInput): Promise<TaggedItem> {
  const plan = input.plan && Object.values(input.plan).some((v) => v != null && v !== '' && v !== 'each') ? input.plan : null
  const base = {
    p_org: orgId,
    p_title: input.title.trim(),
    p_kind: input.kind ?? 'donation',
    p_description: blank(input.description),
    p_donated_by: blank(input.donatedBy),
    p_value_cents: input.valueCents ?? null,
    p_photo_url: input.photoUrl ?? null,
    p_price_cents: input.priceCents ?? null,
    p_quantity: input.quantity ?? null,
    p_code: input.code ?? null,
  }
  const extras = { p_condition: blank(input.condition), p_category: blank(input.category), p_location: blank(input.location) }
  // Newest first: with the plan (update 40), then without it (39), then the bare call (36).
  if (plan) {
    let withPlan = await supabase.rpc('catalog_new_item', { ...base, ...extras, p_plan: plan })
    if (withPlan.error && plan.headed_for === 'event' && isUnknownPlace(withPlan.error)) {
      withPlan = await supabase.rpc('catalog_new_item', { ...base, ...extras, p_plan: { ...plan, headed_for: null } })
    }
    if (!withPlan.error) {
      const item = asItem(withPlan.data)
      if (!item) throw new Error('Saved, but the item could not be read back.')
      return receivingSkipped(plan, item) ? { ...item, receiving_skipped: true } : item
    }
    if (!isMissingFunction(withPlan.error)) throw withPlan.error
    // Without the plan a value is read as the value of one. A value typed for
    // the whole lot is shared out, so the lot's total still comes out right.
    const q = Math.max(1, input.quantity ?? 1)
    if (plan.value_basis === 'all' && base.p_value_cents != null && q > 1) base.p_value_cents = Math.round(base.p_value_cents / q)
  }
  const first = await supabase.rpc('catalog_new_item', { ...base, ...extras })
  if (!first.error) {
    const item = asItem(first.data)
    if (!item) throw new Error('Saved, but the item could not be read back.')
    return plan ? { ...item, plan_skipped: true } : item
  }
  if (!isMissingFunction(first.error)) throw first.error
  const old = await supabase.rpc('catalog_new_item', base)
  if (old.error) throw old.error
  const item = asItem(old.data)
  if (!item) throw new Error('Saved, but the item could not be read back.')
  const wanted = (input.quantity ?? 1) > 1 || input.priceCents != null || Boolean(extras.p_condition || extras.p_category || extras.p_location)
  return wanted || plan ? { ...item, details_skipped: wanted, plan_skipped: Boolean(plan) } : item
}

/* ------------------------------------------------- update 40: donations */

type Fn40 =
  | 'set_donation_plan'
  | 'set_donation_outcome'
  | 'split_donation'
  | 'make_basket'
  | 'sort_headed_donations'
  | 'start_dropoff'
  | 'update_dropoff'
  | 'set_dropoff_thanked'
  | 'list_dropoffs'
  | 'dropoff_detail'
  | 'donations_received'

/** A function from update 40. Before it, the error says so in plain words (NEEDS_40). */
async function rpc40<T>(fn: Fn40, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    if (isMissingFunction(error)) throw new Error(NEEDS_40)
    throw error
  }
  return data as T
}

/** True when an error is "update 40 hasn't been run". */
export const isNeeds40 = (e: unknown) => e instanceof Error && e.message === NEEDS_40

/** Headed for, value each/all, size, use-by, drop-off — only the keys given. */
export async function setDonationPlan(orgId: string, code: string, plan: DonationPlan): Promise<TaggedItem | null> {
  let item: TaggedItem | null
  try {
    item = asItem(await rpc40('set_donation_plan', { p_org: orgId, p_code: code, p_plan: plan }))
  } catch (err) {
    if (plan.headed_for !== 'event' || !isUnknownPlace(err)) throw err
    item = asItem(await rpc40('set_donation_plan', { p_org: orgId, p_code: code, p_plan: { ...plan, headed_for: null } }))
  }
  return item && receivingSkipped(plan, item) ? { ...item, receiving_skipped: true } : item
}

/** In use by OHRR (our own use), passed on / not usable, or null to undo (also takes it out of a basket). */
export async function setDonationOutcome(orgId: string, code: string, outcome: 'rabbits' | 'passed_on' | null, note?: string): Promise<TaggedItem | null> {
  return asItem(await rpc40('set_donation_outcome', { p_org: orgId, p_code: code, p_outcome: outcome, p_note: blank(note) }))
}

/** Take some of a lot off as their own donation, with the next DON number. Returns the new part. */
export async function splitDonation(orgId: string, code: string, quantity: number, headedFor?: HeadedFor | null): Promise<TaggedItem> {
  const item = asItem(await rpc40('split_donation', { p_org: orgId, p_code: code, p_quantity: quantity, p_headed_for: headedFor ?? null }))
  if (!item) throw new Error('Split, but the new part could not be read back.')
  return item
}

/** Several donations become one raffle prize or auction lot. Returns the basket. */
export async function makeBasket(orgId: string, codes: string[], kind: 'raffle' | 'auction', title: string, description?: string): Promise<TaggedItem> {
  const item = asItem(await rpc40('make_basket', { p_org: orgId, p_codes: codes, p_kind: kind, p_title: title.trim(), p_description: blank(description) }))
  if (!item) throw new Error('Made, but the basket could not be read back.')
  return item
}

/** Move every donation headed for one place. Returns how many moved. */
export async function sortHeadedDonations(orgId: string, headedFor: HeadedFor): Promise<number> {
  const n = await rpc40<unknown>('sort_headed_donations', { p_org: orgId, p_headed_for: headedFor })
  return typeof n === 'number' ? n : 0
}

export interface Dropoff {
  id: string
  donor_name: string | null
  donor_email: string | null
  received_on: string
  note: string | null
  thanked_at: string | null
  created_at: string
  items: number
  pieces: number
  value_total_cents: number | null
}

/** One donation line, for a drop-off and the report, with where it is now. */
export interface DonationLine {
  id: string
  title: string
  size: string | null
  quantity: number
  value_cents: number | null
  value_basis: 'each' | 'all'
  value_each_cents: number | null
  value_total_cents: number | null
  donated_by: string | null
  received_on: string
  dropoff_id: string | null
  headed_for: HeadedFor | null
  outcome: 'sorted' | 'basket' | 'rabbits' | 'passed_on' | null
  outcome_at: string | null
  sorted_kind: ItemKind | null
  split_from: string | null
  photo_url: string | null
  use_by: string | null
  created_at: string
  code: string | null
  went_to: { code: string; kind: ItemKind; title: string | null } | null
  /** donations_received only */
  dropoff_donor?: string | null
}

export interface DropoffInput {
  donorName?: string
  donorEmail?: string
  receivedOn?: string | null
  note?: string
}

export async function startDropoff(orgId: string, d: DropoffInput): Promise<Dropoff> {
  return rpc40<Dropoff>('start_dropoff', {
    p_org: orgId,
    p_donor_name: blank(d.donorName),
    p_donor_email: blank(d.donorEmail),
    p_received_on: d.receivedOn || null,
    p_note: blank(d.note),
  })
}

export async function updateDropoff(orgId: string, id: string, d: DropoffInput): Promise<Dropoff> {
  return rpc40<Dropoff>('update_dropoff', {
    p_org: orgId,
    p_id: id,
    p_donor_name: blank(d.donorName),
    p_donor_email: blank(d.donorEmail),
    p_received_on: d.receivedOn || null,
    p_note: blank(d.note),
  })
}

export async function setDropoffThanked(orgId: string, id: string, thanked = true): Promise<Dropoff> {
  return rpc40<Dropoff>('set_dropoff_thanked', { p_org: orgId, p_id: id, p_thanked: thanked })
}

export async function listDropoffs(orgId: string, limit = 40): Promise<Dropoff[]> {
  const data = await rpc40<unknown>('list_dropoffs', { p_org: orgId, p_limit: limit })
  return Array.isArray(data) ? (data as Dropoff[]) : []
}

export async function dropoffDetail(orgId: string, id: string): Promise<(Dropoff & { lines: DonationLine[] }) | null> {
  const data = await rpc40<unknown>('dropoff_detail', { p_org: orgId, p_id: id })
  if (!data || typeof data !== 'object') return null
  const d = data as Dropoff & { lines?: DonationLine[] | null }
  return { ...d, lines: Array.isArray(d.lines) ? d.lines : [] }
}

/** Every donation received between two dates (YYYY-MM-DD), for the report. */
export async function donationsReceived(orgId: string, from: string, to: string): Promise<DonationLine[]> {
  const data = await rpc40<unknown>('donations_received', { p_org: orgId, p_from: from, p_to: to })
  return Array.isArray(data) ? (data as DonationLine[]) : []
}

/**
 * Condition, what sort of thing and where it's kept (update 39). A donation
 * keeps all three; shop stock keeps the category and its shelf. Blank clears.
 */
export async function setItemExtras(
  orgId: string,
  code: string,
  x: { condition?: string | null; category?: string | null; location?: string | null },
): Promise<TaggedItem | null> {
  const { data, error } = await supabase.rpc('set_item_extras', {
    p_org: orgId,
    p_code: code,
    p_condition: blank(x.condition),
    p_category: blank(x.category),
    p_location: blank(x.location),
  })
  if (error) {
    if (isMissingFunction(error)) throw new Error(UPDATE_39_EXTRAS_NOTE)
    throw error
  }
  return asItem(data)
}

export interface CatalogSuggestions {
  locations: string[]
  categories: string[]
  /** Update 47: stores typed before, and Hop Shop vendors. */
  stores: string[]
}

/** Places, categories and stores used lately, for the drop-downs (empty before update 39, or on any error). */
export async function catalogSuggestions(orgId: string): Promise<CatalogSuggestions> {
  try {
    const { data, error } = await supabase.rpc('catalog_suggestions', { p_org: orgId })
    if (error || !data || typeof data !== 'object') return { locations: [], categories: [], stores: [] }
    const d = data as { locations?: unknown; categories?: unknown; stores?: unknown }
    const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
    return { locations: strings(d.locations), categories: strings(d.categories), stores: strings(d.stores) }
  } catch {
    return { locations: [], categories: [], stores: [] }
  }
}

/** OHRR's list of uses; the five it started with until update 47 is run. */
export async function listItemPurposes(orgId: string): Promise<{ purposes: ItemPurpose[]; ready: boolean }> {
  const { data, error } = await supabase.rpc('list_item_purposes', { p_org: orgId })
  if (error || !Array.isArray(data)) return { purposes: DEFAULT_PURPOSES, ready: false }
  return { purposes: data as ItemPurpose[], ready: true }
}

/** Admin 1 and up add to the list of uses (false before update 47). */
export async function canEditItemPurposes(orgId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_edit_item_purposes', { p_org: orgId })
  return !error && data === true
}

/** Add a use (id null), or rename one, change its kind, or hide it. */
export async function saveItemPurpose(orgId: string, p: { id?: string | null; name: string; use: PurposeUse; is_active?: boolean }): Promise<ItemPurpose> {
  const { data, error } = await supabase.rpc('save_item_purpose', {
    p_org: orgId,
    p_id: p.id ?? null,
    p_name: p.name.trim(),
    p_use: p.use,
    p_is_active: p.is_active ?? true,
  })
  if (error) {
    if (isMissingFunction(error)) throw new Error('Adding to the list needs database update 47.')
    throw new Error(error.message || 'Could not save the use')
  }
  return data as ItemPurpose
}

/** After printing labels: remember which are done (or undo with printed=false). */
export async function markLabelsPrinted(orgId: string, codes: string[], printed = true): Promise<number> {
  const { data, error } = await supabase.rpc('mark_labels_printed', { p_org: orgId, p_codes: codes, p_printed: printed })
  if (error) throw error
  return typeof data === 'number' ? data : 0
}

/** Donor names typed lately, newest first — for one-click chips. */
export async function recentDonors(orgId: string, limit = 12): Promise<string[]> {
  const { data, error } = await supabase.rpc('recent_donors', { p_org: orgId, p_limit: limit })
  if (error) throw error
  return Array.isArray(data) ? (data as unknown[]).filter((x): x is string => typeof x === 'string') : []
}

/**
 * Move a donation into the auction, the raffle or the shop — or update any
 * item — under the same code. The photo is passed along, since a kind change
 * makes a new row. An auction lot's session defaults to all-day. Shop stock
 * and (update 39) donations keep a price and how many; for a donation, a null
 * price or count keeps what it has. A donation moved into the shop takes its
 * own price and count when none are given here.
 */
export async function saveItem(
  orgId: string,
  code: string,
  kind: ItemKind,
  d: { title: string; description?: string | null; donatedBy?: string | null; valueCents?: number | null; photoUrl?: string | null; priceCents?: number | null; quantity?: number | null },
): Promise<TaggedItem> {
  const stock = kind === 'stock'
  const donation = kind === 'donation'
  const { data, error } = await supabase.rpc('save_scanned_item', {
    p_org: orgId,
    p_code: code,
    p_kind: kind,
    p_title: d.title.trim(),
    p_description: d.description?.trim() || null,
    p_donated_by: stock ? null : d.donatedBy?.trim() || null,
    p_value_cents: stock ? null : (d.valueCents ?? null),
    p_photo_url: d.photoUrl ?? null,
    p_price_cents: stock || donation ? (d.priceCents ?? null) : null,
    p_quantity: stock ? Math.max(0, Math.round(d.quantity ?? 1)) : donation && d.quantity != null ? Math.max(1, Math.round(d.quantity)) : null,
    p_session: null,
  })
  if (error) throw error
  const item = asItem(data)
  if (!item) throw new Error('Saved, but the item could not be read back.')
  return item
}

/** Up to four photos per item (update 37). */
export const MAX_ITEM_PHOTOS = 4

/**
 * An item's photos, cover first: `photo_urls` when it has any, else the single
 * `photo_url` (before update 37/38 the lists don't carry photo_urls), else none.
 * Works for anything with those two fields — a tagged item, an auction lot, a
 * Hop Shop product.
 */
export function itemPhotos(item: { photo_url?: string | null; photo_urls?: readonly (string | null)[] | null }): string[] {
  const list = (Array.isArray(item.photo_urls) ? item.photo_urls : []).filter((u): u is string => typeof u === 'string' && u.trim() !== '')
  if (list.length) return list.slice(0, MAX_ITEM_PHOTOS)
  return item.photo_url ? [item.photo_url] : []
}

/** Replace an item's photo list, in this order; the first becomes its cover (photo_url). */
export async function setItemPhotos(orgId: string, code: string, urls: string[]): Promise<TaggedItem> {
  const { data, error } = await supabase.rpc('set_item_photos', { p_org: orgId, p_code: code, p_photo_urls: urls.slice(0, MAX_ITEM_PHOTOS) })
  if (error) throw error
  const item = asItem(data)
  if (!item) throw new Error('Saved, but the item could not be read back.')
  return item
}
