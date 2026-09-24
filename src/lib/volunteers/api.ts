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
import type { Cap } from '../staff'
import { APP_ORIGIN, SITE_ORIGIN } from './calls'
import type { CertificateSuggestion } from './approval'

export type VolunteerStatus = 'prospect' | 'active' | 'paused' | 'former'
export type HoursStatus = 'logged' | 'confirmed'
export type HoursSource = 'self' | 'staff' | 'checkin'
/** Update 28: a trusted volunteer's self-logged hours count straight away; a standard one's wait for staff. */
export type TrustLevel = 'standard' | 'trusted'

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
  /*
   * Applications and approvals (update 25) — optional because the columns
   * aren't there until that update has been run.
   */
  /** What they may sign up for: kinds such as 'socialization', or '*' for everything. */
  approved_for?: string[]
  review_status?: ReviewStatus | null
  applied_at?: string | null
  /** Their answers on the application (age, availability …) plus `kinds`: what they asked to do. */
  application?: Record<string, unknown> | null
  reviewed_at?: string | null
  reviewed_by?: string | null
  /** Update 28 — optional because the column isn't there until that update has been run. */
  trust_level?: TrustLevel
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
  /** Only sent once update 25 has added the column. */
  approved_for?: string[]
  /** Only sent once update 28 has added the column. */
  trust_level?: TrustLevel
}

export type ReviewStatus = 'pending' | 'approved' | 'declined'

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

/**
 * Hours volunteers logged for themselves that already count — a trusted
 * volunteer's arrive confirmed (update 28) — logged in the last `days` days,
 * newest first, so staff can still look them over. null = couldn't be read.
 */
export async function selfReportedHours(orgId: string, days = 30): Promise<HoursRow[] | null> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const { data, error } = await supabase
    .from('volunteer_hours_entries')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'confirmed')
    .eq('source', 'self')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return null
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

/* ------------------------------------------ applications and approvals */

// Update 25: new people apply, staff approve them for everything or for some
// kinds of volunteering, and shifts or calls can be for approved volunteers
// only. Until that update is run the columns aren't there, so the staff
// screens ask first and hide what can't be saved yet.

/** Whether these columns exist yet, e.g. columnsReady('volunteers', 'approved_for,review_status'). */
export async function columnsReady(table: string, columns: string): Promise<boolean> {
  const { error } = await supabase.from(table).select(columns).limit(1)
  return !error
}

/** How many applications are waiting for someone to look at them (0 before update 25). */
export async function pendingApplications(orgId: string): Promise<number> {
  const { count, error } = await supabase
    .from('volunteers')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('review_status', 'pending')
  if (error) return 0
  return count ?? 0
}

async function review(id: string, change: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.from('volunteers').update(change).eq('id', id).select('id')
  if (error) throw error
  // Row-level security turns a refused update into "nothing changed" — say so.
  if (!data || data.length === 0) throw new Error('That wasn’t saved — you may not have permission to change the volunteer roster.')
}

/** Approve someone: they become active and may sign up for `kinds` ('*' = everything). */
export async function approveVolunteer(id: string, kinds: string[], reviewer: string | null): Promise<void> {
  await review(id, {
    status: 'active',
    approved_for: kinds,
    review_status: 'approved',
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewer,
  })
}

/** Decline an application. What they were already approved for (if anything) stays. */
export async function declineVolunteer(id: string, reviewer: string | null): Promise<void> {
  await review(id, { review_status: 'declined', reviewed_at: new Date().toISOString(), reviewed_by: reviewer })
}

/** Who can sign up for a volunteer call: a kind, or null for anyone. The database copies it to the call's shifts. */
export async function setCallApproval(callId: string, role: string | null): Promise<void> {
  const { error } = await supabase.from('volunteer_calls').update({ approval_role: role }).eq('id', callId)
  if (error) throw error
}

/** A hours letter a volunteer made for themselves (or staff made), with the code that checks it. */
export interface IssuedLetterRow {
  code: string
  kind: string
  period_from: string
  period_to: string
  total_hours: number | string
  issued_by: 'self' | 'staff'
  created_at: string
}

/** The letters on someone's record, newest first. null = not available yet (before update 25). */
export async function volunteerLetters(volunteerId: string): Promise<IssuedLetterRow[] | null> {
  const { data, error } = await supabase
    .from('volunteer_letters')
    .select('code, kind, period_from, period_to, total_hours, issued_by, created_at')
    .eq('volunteer_id', volunteerId)
    .order('created_at', { ascending: false })
  if (error) return null
  return (data ?? []) as IssuedLetterRow[]
}

/* ------------------------------------------------ certificates (update 25) */

// Certificates are OHRR's top tier's to give: owners and admins, or anyone
// granted "Make volunteer certificates". A certificate is suggested when a
// volunteer makes a letter and when their confirmed hours pass a mark the top
// tier sets. Before update 25 the tables aren't there: these return null / 0.

/** "Make volunteer certificates and set the hours that earn one" (not in the Team list's CAPS yet). */
export const CERTIFICATES_CAP = 'volunteers.certificates' as string as Cap

/** Open suggestions, newest first. null = not available (before update 25, or not allowed). */
export async function certificateSuggestions(orgId: string): Promise<CertificateSuggestion[] | null> {
  const { data, error } = await supabase
    .from('certificate_suggestions')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  if (error) return null
  return (data ?? []) as CertificateSuggestion[]
}

export async function openCertificateCount(orgId: string): Promise<number> {
  const { count, error } = await supabase
    .from('certificate_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'open')
  if (error) return 0
  return count ?? 0
}

/** "Make certificate" (once it's made) or "Not now". */
export async function setSuggestionStatus(id: string, status: 'made' | 'dismissed', by: string | null): Promise<void> {
  const { data, error } = await supabase
    .from('certificate_suggestions')
    .update({ status, handled_by: by, handled_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('That wasn’t saved — making certificates needs the “Make volunteer certificates” permission.')
}

/** The hours marks that earn a certificate, e.g. [25, 50, 100, 250]. null = not available. */
export async function certificateHours(orgId: string): Promise<number[] | null> {
  const { data, error } = await supabase.from('volunteer_settings').select('certificate_hours').eq('org_id', orgId).maybeSingle()
  if (error) return null
  return ((data?.certificate_hours as number[] | null) ?? []).map(Number)
}

/** Save the marks; returns how many new suggestions that made (for people already past one). */
export async function setCertificateHours(orgId: string, hours: number[]): Promise<number> {
  const { data, error } = await supabase.rpc('set_certificate_hours', { p_org: orgId, p_hours: hours })
  if (error) throw error
  return Number(data ?? 0)
}

/* ------------------------------------------------ staff who volunteer (28) */

/**
 * The signed-in staff member's own volunteer page — found by their email, or
 * made for them the first time (update 28). Returns the private token for
 * /volunteer/hours/<token>, where they can log hours for work that isn't a shift.
 */
export async function myStaffVolunteerPage(orgId: string): Promise<string> {
  const { data, error } = await supabase.rpc('my_staff_volunteer_page', { p_org: orgId })
  if (error) throw error
  if (!data) throw new Error('Your volunteer page couldn’t be opened. Try again in a moment.')
  return String(data)
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
