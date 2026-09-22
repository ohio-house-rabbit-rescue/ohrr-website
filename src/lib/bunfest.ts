// Staff writes for the Midwest BunFest content (website mirror of the app's
// src/features/bunfest/api.ts): the education programme, the
// rescue directory, and the BunFest side of a company already in the supplier /
// vendor list. See supabase/migrations/20260922120000_bunfest_content.sql.
import { supabase } from './supabase'

export interface SessionRow {
  id: string
  org_id: string
  year: number
  start_time: string
  end_time: string | null
  title: string
  presenter: string | null
  description: string | null
  room: string | null
  /** "Education Sessions" / "Special Interest Sessions" — tracks run at once. */
  track: string
  kind: 'session' | 'break' | 'activity'
  is_published: boolean
  sort_order: number
}
export type SessionInput = Omit<Partial<SessionRow>, 'org_id'> & { org_id: string; start_time: string; title: string }

export interface PartnerRow {
  id: string
  org_id: string
  name: string
  location: string | null
  city: string | null
  state: string | null
  region: 'Midwest' | 'Northeast' | 'South' | 'West' | null
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  blurb: string | null
  is_host: boolean
  at_bunfest: boolean
  /** The years this rescue was a BunFest partner; empty means not tagged yet. */
  bunfest_years: number[]
  is_published: boolean
  sort_order: number
}
export type PartnerInput = Omit<Partial<PartnerRow>, 'org_id' | 'name'> & { org_id: string; name: string }

export const SESSION_KINDS: { value: SessionRow['kind']; label: string }[] = [
  { value: 'session', label: 'Talk' },
  { value: 'activity', label: 'Activity' },
  { value: 'break', label: 'Break' },
]

/** "13:30" ⟷ "13:30:00" — <input type="time"> gives the short form. */
export function toTime(v: string): string {
  return v.length === 5 ? `${v}:00` : v
}
export function fromTime(v: string | null): string {
  return v ? v.slice(0, 5) : ''
}

/* ------------------------------------------------------------- sessions */

export async function listSessions(orgId: string, year: number): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('bunfest_sessions')
    .select('*')
    .eq('org_id', orgId)
    .eq('year', year)
    .order('start_time')
  if (error) throw error
  return (data ?? []) as SessionRow[]
}

/** Which years have sessions, newest first (so staff can copy last year's). */
export async function sessionYears(orgId: string): Promise<number[]> {
  const { data, error } = await supabase.from('bunfest_sessions').select('year').eq('org_id', orgId)
  if (error) throw error
  return [...new Set(((data ?? []) as { year: number }[]).map((r) => r.year))].sort((a, b) => b - a)
}

export async function saveSession(s: SessionInput): Promise<SessionRow> {
  const { data, error } = await supabase.from('bunfest_sessions').upsert(s, { onConflict: 'id' }).select('*').single()
  if (error) throw error
  return data as SessionRow
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('bunfest_sessions').delete().eq('id', id)
  if (error) throw error
}

/** Copy a year's programme into another year, as a starting point. */
export async function copySessions(orgId: string, from: number, to: number): Promise<number> {
  const rows = await listSessions(orgId, from)
  if (rows.length === 0) return 0
  const copies = rows.map((r) => ({
    org_id: orgId,
    year: to,
    start_time: r.start_time,
    end_time: r.end_time,
    title: r.title,
    presenter: r.presenter,
    description: r.description,
    room: r.room,
    track: r.track,
    kind: r.kind,
    is_published: false, // a copy starts hidden — it's last year's until checked
    sort_order: r.sort_order,
  }))
  const { error } = await supabase.from('bunfest_sessions').insert(copies)
  if (error) throw error
  return copies.length
}

/* ------------------------------------------------------------- partners */

export async function listPartners(orgId: string): Promise<PartnerRow[]> {
  const { data, error } = await supabase
    .from('rescue_partners')
    .select('*')
    .eq('org_id', orgId)
    .order('sort_order')
    .order('name')
  if (error) throw error
  return (data ?? []) as PartnerRow[]
}

export async function savePartner(p: PartnerInput): Promise<PartnerRow> {
  const { data, error } = await supabase.from('rescue_partners').upsert(p, { onConflict: 'id' }).select('*').single()
  if (error) throw error
  return data as PartnerRow
}

export async function deletePartner(id: string): Promise<void> {
  const { error } = await supabase.from('rescue_partners').delete().eq('id', id)
  if (error) throw error
}

/* --------------------------------------------------------------- booths */

export interface VendorDetails {
  category: string | null
  blurb: string | null
  booth: string | null
  room: 'burgundy' | 'emerald' | null
  tables: number
  published: boolean
  sort: number
  /** The years this company had a table — the public list shows one year. */
  years: number[]
}

export async function saveVendorDetails(supplierId: string, d: VendorDetails): Promise<void> {
  const { error } = await supabase.rpc('save_vendor_details', {
    p_id: supplierId,
    p_category: d.category,
    p_blurb: d.blurb,
    p_booth: d.booth,
    p_room: d.room,
    p_tables: d.tables,
    p_published: d.published,
    p_sort: d.sort,
    p_years: d.years,
  })
  if (error) throw error
}

/* ------------------------------------------------- the activity pages */

/**
 * The BunFest activity pages (Bunny Spa, Glamour Shots, the host hotel …),
 * one set per year — supabase/migrations/20260922150000_bunfest_this_year.sql.
 * The app's twin is src/features/bunfest/api.ts.
 */
export interface PageRow {
  id: string
  org_id: string
  event_slug: string
  year: number
  slug: string
  title: string
  subtitle: string | null
  icon: string | null
  sponsor_note: string | null
  chips: string[]
  note: string | null
  sections: unknown
  feature: 'reserve' | 'raffle' | null
  reserve: unknown
  email_signup: string | null
  contact: unknown
  related_label: string | null
  related: unknown
  is_published: boolean
  sort_order: number
}
export type PageInput = Omit<Partial<PageRow>, 'org_id' | 'slug' | 'title'> & {
  org_id: string
  slug: string
  title: string
}

/** A section as the form edits it — a heading with a paragraph and/or bullets. */
export interface PageSection {
  heading: string
  body: string
  list: string
}

export function sectionsToForm(v: unknown): PageSection[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s) => ({
      heading: typeof s.heading === 'string' ? s.heading : '',
      body: typeof s.body === 'string' ? s.body : '',
      list: Array.isArray(s.list) ? s.list.filter((i): i is string => typeof i === 'string').join('\n') : '',
    }))
}

export function sectionsFromForm(sections: PageSection[], keepSlots: unknown): unknown[] {
  // The raffle page has a section that also shows the staff-entered raffle
  // details; keep that marker on the section it was on.
  const slots = Array.isArray(keepSlots)
    ? keepSlots.map((s) => (s && typeof s === 'object' ? (s as Record<string, unknown>).slot : undefined))
    : []
  return sections
    .map((s, i) => {
      const list = s.list.split('\n').map((l) => l.trim()).filter(Boolean)
      const out: Record<string, unknown> = {}
      if (s.heading.trim()) out.heading = s.heading.trim()
      if (s.body.trim()) out.body = s.body.trim()
      if (list.length > 0) out.list = list
      if (slots[i]) out.slot = slots[i]
      return out
    })
    .filter((s) => Object.keys(s).length > 0)
}

export async function listPages(orgId: string, year: number): Promise<PageRow[]> {
  const { data, error } = await supabase
    .from('bunfest_pages')
    .select('*')
    .eq('org_id', orgId)
    .eq('year', year)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as PageRow[]
}

export async function pageYears(orgId: string): Promise<number[]> {
  const { data, error } = await supabase.from('bunfest_pages').select('year').eq('org_id', orgId)
  if (error) throw error
  return [...new Set(((data ?? []) as { year: number }[]).map((r) => r.year))].sort((a, b) => b - a)
}

export async function savePage(p: PageInput): Promise<PageRow> {
  const { data, error } = await supabase.from('bunfest_pages').upsert(p, { onConflict: 'id' }).select('*').single()
  if (error) throw error
  return data as PageRow
}

export async function deletePage(id: string): Promise<void> {
  const { error } = await supabase.from('bunfest_pages').delete().eq('id', id)
  if (error) throw error
}

/* ------------------------------------------------- starting a new year */

export interface YearCopy {
  sessions: number
  features: number
  pages: number
  vendors: number
  partners: number
}

/**
 * Copy a whole year of BunFest content into a new one — the programme, the
 * festival cards, every activity page and both rosters. Anything already in
 * the target year is left alone.
 */
export async function startBunfestYear(orgId: string, from: number, to: number): Promise<YearCopy> {
  const { data, error } = await supabase.rpc('start_bunfest_year', { p_org: orgId, p_from: from, p_to: to })
  if (error) throw error
  return (data ?? { sessions: 0, features: 0, pages: 0, vendors: 0, partners: 0 }) as YearCopy
}

/** The icons a festival page can use — the same set the app can draw. */
export const PAGE_ICONS = [
  'star', 'book', 'sparkles', 'camera', 'ticket', 'gift', 'heart', 'bag', 'users',
  'calendar', 'mappin', 'clock', 'award', 'store', 'gavel', 'info',
]
