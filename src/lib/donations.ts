// Donation intake (update 40), the parts that don't talk to the database:
// where a donation is now in plain words, the thank-you letter for a
// drop-off, the monthly report's sums and its spreadsheet, and the drop-off
// this computer is adding to today. The calls themselves live in items.ts.
import { OHRR } from './constants'
import { todayOhio } from './staff'
import { toCsv } from './exportFile'
import { headedLabel, money, usDate, type DonationLine, type Dropoff } from './items'

/* ------------------------------------------------- where it is now */

/** The report's places, in the order they are listed. */
export const PLACE_ORDER = [
  'Waiting to be sorted',
  'Waiting to be sorted (for: Raffle)',
  'Waiting to be sorted (for: Silent Auction)',
  'Waiting to be sorted (for: Hop Shop)',
  'Waiting to be sorted (for: For the rabbits)',
  'Raffle (sorted)',
  'Silent Auction (sorted)',
  'Hop Shop (sorted)',
  'In a basket',
  'Used for the rabbits',
  'Passed on / not usable',
]

const SORTED_INTO: Record<string, string> = { raffle: 'Raffle', auction: 'Silent Auction', stock: 'Hop Shop' }

/** "Waiting to be sorted (for: Raffle)", "Hop Shop (sorted)", "In a basket", … */
export function whereNow(l: Pick<DonationLine, 'outcome' | 'headed_for' | 'sorted_kind'>): string {
  if (l.outcome === 'sorted') return `${SORTED_INTO[l.sorted_kind ?? ''] ?? 'Sorted'} (sorted)`
  if (l.outcome === 'basket') return 'In a basket'
  if (l.outcome === 'rabbits') return 'Used for the rabbits'
  if (l.outcome === 'passed_on') return 'Passed on / not usable'
  return l.headed_for ? `Waiting to be sorted (for: ${headedLabel(l.headed_for)})` : 'Waiting to be sorted'
}

/** The code to look the line up by: its own, or the item it was sorted into. */
export const lineCode = (l: Pick<DonationLine, 'code' | 'went_to'>): string => l.code ?? l.went_to?.code ?? ''

/* ------------------------------------------------- the thank-you letter */

export interface LetterLine {
  title: string
  size: string | null
  quantity: number
  value_total_cents: number | null
}

/**
 * One line per thing given: a lot that was split later is counted back
 * together (the parts' quantities and values added to the line they came
 * from, following split_from back to the first one in this drop-off).
 */
export function letterLines(lines: DonationLine[]): LetterLine[] {
  const byId = new Map(lines.map((l) => [l.id, l]))
  const rootOf = (l: DonationLine): DonationLine => {
    let cur = l
    const seen = new Set<string>([cur.id])
    while (cur.split_from && byId.has(cur.split_from) && !seen.has(cur.split_from)) {
      cur = byId.get(cur.split_from)!
      seen.add(cur.id)
    }
    return cur
  }
  const sorted = [...lines].sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
  const out = new Map<string, LetterLine>()
  for (const l of sorted) {
    const root = rootOf(l)
    const cur = out.get(root.id) ?? { title: root.title, size: root.size, quantity: 0, value_total_cents: null }
    cur.quantity += Math.max(0, l.quantity ?? 0)
    if (l.value_total_cents != null) cur.value_total_cents = (cur.value_total_cents ?? 0) + l.value_total_cents
    out.set(root.id, cur)
  }
  // Roots first seen through a part still list in the order they came in.
  return [...out.entries()]
    .sort(([a], [b]) => {
      const ca = byId.get(a)?.created_at ?? ''
      const cb = byId.get(b)?.created_at ?? ''
      return ca < cb ? -1 : ca > cb ? 1 : 0
    })
    .map(([, v]) => v)
}

/** The letter, exactly as OHRR asked for it; values only when asked. */
export function letterText(d: Pick<Dropoff, 'donor_name' | 'received_on'>, lines: DonationLine[], showValues: boolean): string {
  const name = (d.donor_name ?? '').trim() || 'friend'
  const given = letterLines(lines).map(
    (l) =>
      `- ${l.quantity} × ${l.title}${l.size ? ` (${l.size})` : ''}${showValues && l.value_total_cents != null ? ` — worth ${money(l.value_total_cents)}` : ''}`,
  )
  const thanks = `Thank you for your donation to ${OHRR.name} on ${usDate(d.received_on)}.`
  return [
    `Dear ${name},`,
    '',
    given.length ? `${thanks} You gave:` : thanks,
    ...(given.length ? ['', ...given] : []),
    '',
    'Thank you for helping the rabbits in our care.',
    '',
    'With thanks,',
    OHRR.name,
    OHRR.email,
  ].join('\n')
}

export const LETTER_SUBJECT = `Thank you from ${OHRR.name}`

/** A mailto: to the donor with the letter in it. */
export function letterMailto(email: string, text: string): string {
  return `mailto:${email.trim()}?subject=${encodeURIComponent(LETTER_SUBJECT)}&body=${encodeURIComponent(text)}`
}

/* ------------------------------------------------- the monthly report */

/** Who gave it: the drop-off's donor, else the name on the item; '' when nobody was named. */
export const lineDonor = (l: DonationLine): string => (l.dropoff_donor ?? '').trim() || (l.donated_by ?? '').trim()

export interface ReportTotals {
  /** Things received (a lot split later counts once). */
  items: number
  /** Every piece, the sum of how many. */
  pieces: number
  /** Different donors named. */
  donors: number
  /** Things with no donor named. */
  unnamed: number
  value_cents: number
  /** Things with no value given. */
  no_value: number
}

export function reportTotals(lines: DonationLine[]): ReportTotals {
  const originals = lines.filter((l) => !l.split_from)
  const names = new Set<string>()
  let unnamed = 0
  for (const l of originals) {
    const n = lineDonor(l)
    if (n) names.add(n.toLowerCase())
    else unnamed++
  }
  // A part split off later belongs to the same donor as the lot it came from.
  for (const l of lines) if (l.split_from && lineDonor(l)) names.add(lineDonor(l).toLowerCase())
  return {
    items: originals.length,
    pieces: lines.reduce((s, l) => s + Math.max(0, l.quantity ?? 0), 0),
    donors: names.size,
    unnamed,
    value_cents: lines.reduce((s, l) => s + (l.value_total_cents ?? 0), 0),
    no_value: originals.filter((l) => l.value_total_cents == null).length,
  }
}

export interface ReportRow {
  label: string
  /** Lines in this row: a split lot shows each part where it is. */
  lines: number
  pieces: number
  value_cents: number
}

export function byPlace(lines: DonationLine[]): ReportRow[] {
  const rows = new Map<string, ReportRow>()
  for (const l of lines) {
    const label = whereNow(l)
    const r = rows.get(label) ?? { label, lines: 0, pieces: 0, value_cents: 0 }
    r.lines++
    r.pieces += Math.max(0, l.quantity ?? 0)
    r.value_cents += l.value_total_cents ?? 0
    rows.set(label, r)
  }
  const rank = (s: string) => {
    const i = PLACE_ORDER.indexOf(s)
    return i < 0 ? PLACE_ORDER.length : i
  }
  return [...rows.values()].sort((a, b) => rank(a.label) - rank(b.label))
}

export const NOT_NAMED = 'Not named'

/** By donor, most given first; "Not named" last. Items count a split lot once. */
export function byDonor(lines: DonationLine[]): ReportRow[] {
  const rows = new Map<string, ReportRow>()
  for (const l of lines) {
    const name = lineDonor(l)
    const key = name.toLowerCase()
    const r = rows.get(key) ?? { label: name || NOT_NAMED, lines: 0, pieces: 0, value_cents: 0 }
    if (!l.split_from) r.lines++
    r.pieces += Math.max(0, l.quantity ?? 0)
    r.value_cents += l.value_total_cents ?? 0
    rows.set(key, r)
  }
  return [...rows.entries()]
    .sort(([ka, a], [kb, b]) => (ka === '' ? 1 : kb === '' ? -1 : b.value_cents - a.value_cents || b.pieces - a.pieces || a.label.localeCompare(b.label)))
    .map(([, r]) => r)
}

/** "10/01/2026" from "2026-10-01" — the spreadsheet's date. */
const sheetDate = (iso: string | null | undefined) => {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return y && m && d ? `${m}/${d}/${y}` : ''
}
const sheetMoney = (c: number | null | undefined) => (c == null ? '' : (c / 100).toFixed(2))

export const REPORT_COLUMNS = ['Date received', 'Donor', 'Item', 'Size', 'How many', 'Value each', 'Value in all', 'Where it is now', 'Code']

export function reportCsv(lines: DonationLine[]): string {
  return toCsv(
    REPORT_COLUMNS,
    lines.map((l) => [
      sheetDate(l.received_on),
      lineDonor(l),
      l.title,
      l.size ?? '',
      l.quantity,
      sheetMoney(l.value_each_cents),
      sheetMoney(l.value_total_cents),
      whereNow(l),
      lineCode(l),
    ]),
  )
}

/* ------------------------------------------------- months */

/** "2026-10" for today in Ohio. */
export const thisMonth = () => todayOhio().slice(0, 7)

/** A month a number of months away ("2026-10", -1 → "2026-09"). */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + by, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** The first and last day of a month, as YYYY-MM-DD. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` }
}

/** "October 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export const isMonth = (s: string | null | undefined): s is string => Boolean(s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s))

/* ------------------------------------------------- today's drop-off */

const CURRENT_KEY = 'ohrr.dropoff.current'

/** The drop-off this computer is adding to — only on the day it was started. */
export function loadCurrentDropoff(orgId: string): Dropoff | null {
  try {
    const raw = localStorage.getItem(CURRENT_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as { orgId?: string; day?: string; dropoff?: Dropoff }
    if (v.orgId !== orgId || v.day !== todayOhio() || !v.dropoff?.id) return null
    return v.dropoff
  } catch {
    return null
  }
}

export function saveCurrentDropoff(orgId: string, d: Dropoff | null): void {
  try {
    if (d) localStorage.setItem(CURRENT_KEY, JSON.stringify({ orgId, day: todayOhio(), dropoff: d }))
    else localStorage.removeItem(CURRENT_KEY)
  } catch {
    /* private mode: it just isn't remembered */
  }
}

/** "Pat Barron's drop-off, Oct 1" (or "A drop-off, Oct 1" with no name). */
export function dropoffName(d: Pick<Dropoff, 'donor_name' | 'received_on'>): string {
  const n = (d.donor_name ?? '').trim()
  const day = usDate(d.received_on).replace(/, \d{4}$/, (m) => (d.received_on.slice(0, 4) === todayOhio().slice(0, 4) ? '' : m))
  return `${n ? `${n}’s drop-off` : 'A drop-off'}, ${day}`
}

