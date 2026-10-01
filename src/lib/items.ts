// Items with an OHRR code — the website's copy of the app's scan/types.ts and
// scan/api.ts, for the Items list and the label printer. One code → one item of
// one kind; the kind decides which table holds the details. Update 36 adds a
// fourth kind, `donation` ("cataloged, sort later"), and label_printed_at.
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
  /** All its photos, main first (update 37; missing before it). */
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
  created_at: string
  updated_at?: string
}

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

/**
 * Catalog a new item in one call. The database makes the code (OHRR-XXXXX)
 * unless a scanned tag's code is given. Update 36.
 */
export async function catalogNewItem(
  orgId: string,
  input: { title: string; kind?: ItemKind; donatedBy?: string; description?: string; valueCents?: number | null; photoUrl?: string | null; code?: string | null },
): Promise<TaggedItem> {
  const { data, error } = await supabase.rpc('catalog_new_item', {
    p_org: orgId,
    p_title: input.title.trim(),
    p_kind: input.kind ?? 'donation',
    p_description: input.description?.trim() || null,
    p_donated_by: input.donatedBy?.trim() || null,
    p_value_cents: input.valueCents ?? null,
    p_photo_url: input.photoUrl ?? null,
    p_price_cents: null,
    p_quantity: null,
    p_code: input.code ?? null,
  })
  if (error) throw error
  const item = asItem(data)
  if (!item) throw new Error('Saved, but the item could not be read back.')
  return item
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
 * makes a new row. An auction lot's session defaults to all-day.
 */
export async function saveItem(
  orgId: string,
  code: string,
  kind: ItemKind,
  d: { title: string; description?: string | null; donatedBy?: string | null; valueCents?: number | null; photoUrl?: string | null; priceCents?: number | null; quantity?: number | null },
): Promise<TaggedItem> {
  const stock = kind === 'stock'
  const { data, error } = await supabase.rpc('save_scanned_item', {
    p_org: orgId,
    p_code: code,
    p_kind: kind,
    p_title: d.title.trim(),
    p_description: d.description?.trim() || null,
    p_donated_by: stock ? null : d.donatedBy?.trim() || null,
    p_value_cents: stock ? null : (d.valueCents ?? null),
    p_photo_url: d.photoUrl ?? null,
    p_price_cents: stock ? (d.priceCents ?? null) : null,
    p_quantity: stock ? Math.max(0, Math.round(d.quantity ?? 1)) : null,
    p_session: null,
  })
  if (error) throw error
  const item = asItem(data)
  if (!item) throw new Error('Saved, but the item could not be read back.')
  return item
}

/** Up to four photos per item (update 37). */
export const MAX_ITEM_PHOTOS = 4

/** An item's photos, main first — photo_urls, or the single photo_url before update 37. */
export function itemPhotos(item: { photo_url: string | null; photo_urls?: string[] | null }): string[] {
  const list = (item.photo_urls ?? []).filter(Boolean)
  if (list.length) return list.slice(0, MAX_ITEM_PHOTOS)
  return item.photo_url ? [item.photo_url] : []
}

/** Replace an item's photo list; the first becomes its main photo. */
export async function setItemPhotos(orgId: string, code: string, urls: string[]): Promise<TaggedItem> {
  const { data, error } = await supabase.rpc('set_item_photos', { p_org: orgId, p_code: code, p_photo_urls: urls.slice(0, MAX_ITEM_PHOTOS) })
  if (error) throw error
  const item = asItem(data)
  if (!item) throw new Error('Saved, but the item could not be read back.')
  return item
}
