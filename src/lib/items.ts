// Items with an OHRR code — the website's copy of the app's scan/types.ts and
// scan/api.ts, for the Items list and the label printer. One code → one item of
// one kind; the kind decides which table holds the details. Update 36 adds a
// fourth kind, `donation` ("cataloged, sort later"), and label_printed_at.
// Update 39 adds a donation's details: how many, a price for one, condition,
// what sort of thing and where it's kept (and a shop product's category and
// shelf).
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

/** "6 of them · $5 each · Like new · Food & hay · Kept: Bin 3" — the extra details in one line. */
export function extrasSummary(item: Pick<TaggedItem, 'kind' | 'quantity' | 'price_cents' | 'condition' | 'category' | 'location'>): string {
  const parts: string[] = []
  if (item.kind === 'donation' && item.quantity && item.quantity > 1) parts.push(`${item.quantity} of them`)
  if (item.kind === 'donation' && item.price_cents != null) parts.push(`${money(item.price_cents)} each`)
  if (item.condition) parts.push(conditionLabel(item.condition))
  if (item.category) parts.push(item.category)
  if (item.location) parts.push(`Kept: ${item.location}`)
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

/* ------------------------------------------------------------- money */

export const money = (c: number | null | undefined) => (c == null ? '' : `$${c % 100 === 0 ? c / 100 : (c / 100).toFixed(2)}`)

export const toCents = (s: string): number | null => {
  const n = Number(s.replace(/[^0-9.]/g, ''))
  return s.trim() === '' || !Number.isFinite(n) || n < 0 ? null : Math.round(n * 100)
}

/** Plain-words status for a list row. */
export function statusLabel(item: TaggedItem): string {
  if (item.kind === 'donation') return 'To be sorted'
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
}

/**
 * Catalog a new item in one call. The database makes the code (OHRR-XXXXX)
 * unless a scanned tag's code is given (update 36). Before update 39 the extra
 * details aren't accepted: the item is saved without condition, category and
 * place, and comes back with details_skipped when any detail had been entered,
 * so the screen can say so.
 */
export async function catalogNewItem(orgId: string, input: CatalogInput): Promise<TaggedItem> {
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
  const first = await supabase.rpc('catalog_new_item', { ...base, ...extras })
  if (!first.error) {
    const item = asItem(first.data)
    if (!item) throw new Error('Saved, but the item could not be read back.')
    return item
  }
  if (!isMissingFunction(first.error)) throw first.error
  const old = await supabase.rpc('catalog_new_item', base)
  if (old.error) throw old.error
  const item = asItem(old.data)
  if (!item) throw new Error('Saved, but the item could not be read back.')
  const wanted = (input.quantity ?? 1) > 1 || input.priceCents != null || Boolean(extras.p_condition || extras.p_category || extras.p_location)
  return wanted ? { ...item, details_skipped: true } : item
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

/** Places and categories typed lately, for one-click chips (empty before update 39, or on any error). */
export async function catalogSuggestions(orgId: string): Promise<{ locations: string[]; categories: string[] }> {
  try {
    const { data, error } = await supabase.rpc('catalog_suggestions', { p_org: orgId })
    if (error || !data || typeof data !== 'object') return { locations: [], categories: [] }
    const d = data as { locations?: unknown; categories?: unknown }
    const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
    return { locations: strings(d.locations), categories: strings(d.categories) }
  } catch {
    return { locations: [], categories: [] }
  }
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
