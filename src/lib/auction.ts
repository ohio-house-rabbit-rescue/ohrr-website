// Midwest BunFest Silent Auction — shared types, formatters and the photo
// upload for the staff catalogue editor. The website's copy of the app's
// src/features/raffle/types.ts and photoUpload.ts (keep them in sync). Rows
// come straight from the `raffle_items` / `auction_settings` tables; the table
// keeps its `raffle_items` name so both the app and this site read it.
import { supabase } from './supabase'

export interface AuctionItem {
  id: string
  org_id: string
  event_slug: string
  title: string
  description: string | null
  donated_by: string | null
  value_cents: number | null
  photo_url: string | null
  session: string
  status: string
  is_published: boolean
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AuctionSettings {
  org_id: string
  event_slug: string
  morning_closes_at: string | null
  afternoon_closes_at: string | null
  intro_text: string | null
  raffle_ticket_price_cents: number | null
  raffle_bundle_qty: number | null
  raffle_bundle_price_cents: number | null
  raffle_details: string | null
  updated_at: string
}

// The event this catalog belongs to (plain text in the table; no FK yet).
export const AUCTION_EVENT_SLUG = 'midwest-bunfest-2026'
// BunFest day, used to turn a staff-entered close time into a timestamptz.
export const AUCTION_EVENT_DATE = '2026-10-25'
export const AUCTION_EVENT_TZ = 'America/New_York'

export const AUCTION_SESSIONS = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'all-day', label: 'All day' },
] as const
export type AuctionSession = (typeof AUCTION_SESSIONS)[number]['value']

export const AUCTION_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'won', label: 'Won' },
] as const
export type AuctionStatus = (typeof AUCTION_STATUSES)[number]['value']

export function sessionLabel(value: string): string {
  return AUCTION_SESSIONS.find((s) => s.value === value)?.label ?? value
}

export function statusLabel(value: string): string {
  return AUCTION_STATUSES.find((s) => s.value === value)?.label ?? value
}

// "$35" / "$12.50"
export function formatValue(cents: number | null | undefined): string | null {
  if (cents === null || cents === undefined) return null
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`
}

// Dollars typed by staff ("12.5", "$40") → integer cents, or null when blank.
export function dollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, '').trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export function centsToDollars(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ''
  return (cents / 100).toFixed(2).replace(/\.00$/, '')
}

/* ---- raffle-ticket pricing (staff-entered in auction_settings; nothing is
   hard-coded). A bundle counts only when BOTH its qty (>= 2) and price are set. ---- */

export type RafflePricing = Pick<AuctionSettings, 'raffle_ticket_price_cents' | 'raffle_bundle_qty' | 'raffle_bundle_price_cents'>

export function raffleBundle(p: RafflePricing | null | undefined): { qty: number; cents: number } | null {
  const qty = p?.raffle_bundle_qty ?? null
  const cents = p?.raffle_bundle_price_cents ?? null
  if (qty === null || cents === null || qty < 2 || cents < 0) return null
  return { qty, cents }
}

// "$2 each" / "$2 each · 6 for $10" / "6 for $10", or null when nothing is set.
export function rafflePriceLine(p: RafflePricing | null | undefined): string | null {
  const each = p?.raffle_ticket_price_cents ?? null
  const bundle = raffleBundle(p)
  const parts: string[] = []
  if (each !== null && each >= 0) parts.push(`${formatValue(each)} each`)
  if (bundle) parts.push(`${bundle.qty} for ${formatValue(bundle.cents)}`)
  return parts.length ? parts.join(' · ') : null
}

// Staff order: purely sort_order then title (status doesn't move rows around).
export function sortForStaff<T extends { sort_order: number; title: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  )
}

// A neutral placeholder needs the item's initial (real photos only — no icons).
export function itemInitial(title: string): string {
  const ch = title.trim().charAt(0)
  return ch ? ch.toUpperCase() : '?'
}

/* ---- session close times <-> timestamptz on BunFest day, America/New_York ----
   Used by the staff "Auction setup" panel only; the public catalog never shows
   a time. */

// "12:15 pm" in the event's time zone.
export function formatEventTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString('en-US', { timeZone: AUCTION_EVENT_TZ, hour: 'numeric', minute: '2-digit' }).toLowerCase()
}

// The zone's UTC offset (ms) at a given instant, via Intl (handles DST).
function tzOffsetMs(ts: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ts))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asIfUtc - ts
}

// "14:30" (a <input type="time"> value) → ISO timestamptz for that wall-clock
// time on BunFest day in the event's zone. Empty input → null.
export function eventTimeToIso(time: string): string | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim())
  if (!m) return null
  const [y, mo, d] = AUCTION_EVENT_DATE.split('-').map(Number)
  const wall = Date.UTC(y, mo - 1, d, Number(m[1]), Number(m[2]))
  let ts = wall - tzOffsetMs(wall, AUCTION_EVENT_TZ)
  ts = wall - tzOffsetMs(ts, AUCTION_EVENT_TZ)
  return new Date(ts).toISOString()
}

// ISO timestamptz → "14:30" in the event's zone (to prefill the time input).
export function isoToEventTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: AUCTION_EVENT_TZ,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(d)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('hour')}:${get('minute')}`
}

/* ---- photos: downscale in the browser (max 1280px on the long edge, JPEG) so
   the upload is quick, then store in the public `raffle-photos` bucket at
   <org_id>/<uuid>.jpg — the same bucket and layout the app uses. ---- */

export const PHOTO_BUCKET = 'raffle-photos'
const MAX_EDGE = 1280
const JPEG_QUALITY = 0.85

type Drawable = ImageBitmap | HTMLImageElement

async function loadDrawable(file: Blob): Promise<Drawable> {
  // createImageBitmap honours the camera's EXIF orientation, so portrait shots
  // come out upright. Older browsers fall back to an <img>.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // fall through
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('That file doesn’t look like a photo.'))
      img.src = url
    })
  } finally {
    // Revoking after load is safe: the decoded image is already in memory.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

function sizeOf(d: Drawable): { width: number; height: number } {
  if ('naturalWidth' in d) return { width: d.naturalWidth || d.width, height: d.naturalHeight || d.height }
  return { width: d.width, height: d.height }
}

// Returns a JPEG no larger than MAX_EDGE on its longest side.
export async function downscaleToJpeg(file: Blob): Promise<Blob> {
  const drawable = await loadDrawable(file)
  const { width, height } = sizeOf(drawable)
  if (!width || !height) throw new Error('Could not read that photo.')
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process the photo on this device.')
  ctx.drawImage(drawable, 0, 0, w, h)
  if ('close' in drawable) drawable.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) throw new Error('Could not process the photo on this device.')
  return blob
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// Downscale + upload; resolves to the photo's public URL.
export async function uploadAuctionPhoto(file: Blob, orgId: string): Promise<string> {
  const jpeg = await downscaleToJpeg(file)
  const path = `${orgId}/${newId()}.jpg`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, jpeg, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}
