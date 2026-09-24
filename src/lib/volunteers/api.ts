// Volunteers: the roster staff keep, and the private record a volunteer can
// open on their own phone or computer. The website's copy of the app's
// src/features/volunteers/api.ts — keep the two in sync (the website's client
// is untyped, so the row shapes are spelled out here).
//
// A volunteer has no account, so their record is reached by a private token,
// the same idea as a booking's cancel link. Staff hand it over as a link or a
// QR code from Staff → Volunteers; the device remembers it. Same RPCs and the
// same localStorage key as the app, so a link opened on a laptop works like
// one opened on a phone.
import { supabase } from '../supabase'
import { APP_ORIGIN, SITE_ORIGIN } from './calls'

export type VolunteerStatus = 'prospect' | 'active' | 'paused' | 'former'
export type HoursStatus = 'logged' | 'confirmed'
export type HoursSource = 'self' | 'staff' | 'checkin'

export interface VolunteerRow {
  id: string
  org_id: string
  name: string
  email: string | null
  phone: string | null
  status: VolunteerStatus
  roles: string[]
  started_on: string | null
  orientation_on: string | null
  notes: string | null
  photo_url: string | null
  access_token: string
  /** What their hours are for — the letter they'll need. */
  hours_for: 'school' | 'military' | 'workplace' | 'community' | 'other' | null
  /** School, branch, employer … whatever that letter asks for. */
  letter_details: Record<string, string> | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface VolunteerInput {
  id?: string
  org_id: string
  name: string
  email?: string | null
  phone?: string | null
  status?: VolunteerStatus
  roles?: string[]
  started_on?: string | null
  orientation_on?: string | null
  notes?: string | null
}

export interface HoursRow {
  id: string
  org_id: string
  email: string
  name: string | null
  on_date: string
  hours: number
  activity: string
  volunteer_id: string | null
  status: HoursStatus
  source: HoursSource
  note: string | null
  added_by: string | null
  created_at: string
}

export const VOLUNTEER_STATUS: { value: VolunteerStatus; label: string }[] = [
  { value: 'prospect', label: 'Interested' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Taking a break' },
  { value: 'former', label: 'No longer volunteering' },
]

/** The roles OHRR actually runs, offered as tick boxes (free text is allowed too). */
export const VOLUNTEER_ROLES = [
  'Bunny Socialization',
  'Buncare',
  'Vet transport',
  'Field rescue',
  'Events & fundraising',
  'Hop Shop',
  'Foster',
  'Photography',
  'Admin & marketing',
]

export function statusLabel(s: VolunteerStatus): string {
  return VOLUNTEER_STATUS.find((x) => x.value === s)?.label ?? s
}

/** The private link a volunteer opens on a phone — the same link the app hands out. */
export function hoursUrl(token: string): string {
  return `${APP_ORIGIN}/volunteer/hours/${token}`
}

/** The same record on this website — for someone at a computer. */
export function siteHoursUrl(token: string): string {
  return `${SITE_ORIGIN}/volunteer/hours/${token}`
}

/* ----------------------------------------------------------------- staff */

export async function listVolunteers(orgId: string): Promise<VolunteerRow[]> {
  const { data, error } = await supabase.from('volunteers').select('*').eq('org_id', orgId).order('status').order('name')
  if (error) throw error
  return (data ?? []) as VolunteerRow[]
}

export async function saveVolunteer(v: VolunteerInput): Promise<VolunteerRow> {
  const { data, error } = await supabase.from('volunteers').upsert(v, { onConflict: 'id' }).select('*').single()
  if (error) throw error
  const row = data as VolunteerRow
  // Pull in any hours already recorded against the same email address. A
  // failure here is not worth losing the save over.
  try {
    await supabase.rpc('link_volunteer_hours', { p_volunteer: row.id })
  } catch {
    /* the roster row is saved either way */
  }
  return row
}

export async function deleteVolunteer(id: string): Promise<void> {
  const { error } = await supabase.from('volunteers').delete().eq('id', id)
  if (error) throw error
}

/** Every hours entry for one volunteer (staff view — logged and confirmed). */
export async function volunteerHours(volunteerId: string): Promise<HoursRow[]> {
  const { data, error } = await supabase
    .from('volunteer_hours_entries')
    .select('*')
    .eq('volunteer_id', volunteerId)
    .order('on_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as HoursRow[]
}

/** Hours a volunteer logged that staff haven't confirmed yet, across the org. */
export async function unconfirmedHours(orgId: string): Promise<HoursRow[]> {
  const { data, error } = await supabase
    .from('volunteer_hours_entries')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'logged')
    .order('on_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as HoursRow[]
}

export async function setHoursStatus(entryId: string, status: HoursStatus): Promise<void> {
  const { error } = await supabase.rpc('set_hours_status', { p_entry: entryId, p_status: status })
  if (error) throw error
}

export async function deleteHoursEntry(id: string): Promise<void> {
  const { error } = await supabase.from('volunteer_hours_entries').delete().eq('id', id)
  if (error) throw error
}

/* ------------------------------------------------------ a volunteer's own */

export interface MyHoursEntry {
  id: string
  on_date: string
  hours: number
  activity: string
  status: HoursStatus
  source: HoursSource
  note: string | null
}

export interface MyRecord {
  id: string
  name: string
  email: string | null
  status: VolunteerStatus
  roles: string[]
  started_on: string | null
  orientation_on: string | null
  entries: MyHoursEntry[]
  totals: { all: number; confirmed: number; this_year: number; this_month: number; this_week: number; today: number }
  by_year: { year: number; hours: number }[]
}

/** Read a volunteer's own record by their private token. null = bad link. */
export async function myRecord(token: string): Promise<MyRecord | null> {
  const { data, error } = await supabase.rpc('my_volunteer_record', { p_token: token })
  if (error) throw error
  return (data as MyRecord | null) ?? null
}

export async function logMyHours(
  token: string,
  i: { onDate: string; hours: number; activity: string; note?: string },
): Promise<void> {
  const { error } = await supabase.rpc('log_my_hours', {
    p_token: token,
    p_on_date: i.onDate,
    p_hours: i.hours,
    p_activity: i.activity,
    p_note: i.note ?? null,
  })
  if (error) throw error
}

export async function deleteMyHours(token: string, entryId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_my_hours', { p_token: token, p_entry: entryId })
  if (error) throw error
}

/* --------------------------------------------------------------- helpers */

export const HOURS_ACTIVITIES = [
  'Bunny Socialization',
  'Buncare',
  'Vet transport',
  'Field rescue',
  'Event help',
  'Hop Shop',
  'Fostering',
  'Behind the scenes',
]

/** "12.5 hours" / "1 hour" / "30 minutes" */
export function hoursLabel(h: number): string {
  if (!h) return '0 hours'
  if (h < 1) return `${Math.round(h * 60)} minutes`
  return `${Number.isInteger(h) ? h : h.toFixed(1)} ${h === 1 ? 'hour' : 'hours'}`
}

/** The device remembers the link once it has been opened — the same key the app uses. */
const TOKEN_KEY = 'ohrr:volunteer:token:v1'

/** Returns false when the browser won't keep it (private mode), so the caller keeps the link in the address. */
export function rememberToken(token: string): boolean {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    return localStorage.getItem(TOKEN_KEY) === token
  } catch {
    return false
  }
}
export function savedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export function forgetToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* nothing to do */
  }
}
