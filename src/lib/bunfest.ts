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
  })
  if (error) throw error
}
