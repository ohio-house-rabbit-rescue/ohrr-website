// Reading and writing volunteer calls — the website's copy of the app's
// src/features/volunteers/callsApi.ts. Same database functions; see calls.ts
// for what a call is and ohrr-app/supabase/migrations/20260923120000_volunteer_calls.sql
// for the tables.
import { supabase } from '../supabase'
import type { Call, Helper, HoursFor } from './calls'
import type { HoursLine } from './letters'

export interface CallRow {
  id: string
  org_id: string
  slug: string
  title: string
  summary: string | null
  details: string | null
  location: string | null
  on_date: string
  starts_at: string
  ends_at: string
  shift_minutes: number
  people_per_shift: number
  areas: string[]
  who: string | null
  perks: string[]
  requirements: string | null
  closes_on: string | null
  type_id: string | null
  is_published: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface OpenCall {
  slug: string
  title: string
  summary: string | null
  on_date: string
  starts_at: string
  ends_at: string
  location: string | null
  places: number
  taken: number
}

export interface RosterLine {
  slot_id: string
  starts_at: string
  ends_at: string
  capacity: number
  booking_id: string | null
  name: string | null
  email: string | null
  phone: string | null
  area: string | null
  status: string | null
  source: string | null
  thanked_at: string | null
}

export interface SignUpResult {
  shifts: { booking_id: string; slot_id: string; starts_at: string; ends_at: string; cancel_token: string }[]
  new_volunteer: boolean
  hours_token: string | null
}

/* ------------------------------------------------------------ public */

export async function loadPublicCall(slug: string): Promise<Call | null> {
  const { data, error } = await supabase.rpc('volunteer_call_public', { p_slug: slug })
  if (error) throw error
  return (data as Call | null) ?? null
}

export async function listOpenCalls(): Promise<OpenCall[]> {
  const { data, error } = await supabase.rpc('volunteer_calls_open')
  if (error) throw error
  return (data ?? []) as OpenCall[]
}

export interface SignUp {
  slug: string
  slotIds: string[]
  name: string
  email: string
  phone: string
  area: string
  hoursFor: HoursFor | ''
  details: Record<string, string>
  source: string | null
  attested: boolean
}

export async function signUpForCall(s: SignUp): Promise<SignUpResult> {
  const { data, error } = await supabase.rpc('sign_up_for_call', {
    p_slug: s.slug,
    p_slot_ids: s.slotIds,
    p_name: s.name,
    p_email: s.email,
    p_phone: s.phone || null,
    p_area: s.area || null,
    p_hours_for: s.hoursFor || null,
    p_details: s.details,
    p_source: s.source,
    p_attested: s.attested,
  })
  if (error) throw error
  return data as SignUpResult
}

/* ------------------------------------------------------------ staff */

export async function listCalls(orgId: string): Promise<CallRow[]> {
  const { data, error } = await supabase.from('volunteer_calls').select('*').eq('org_id', orgId).order('on_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as CallRow[]
}

export async function loadCall(id: string): Promise<CallRow | null> {
  const { data, error } = await supabase.from('volunteer_calls').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as CallRow | null) ?? null
}

/** Save the call and (re)make its shifts. */
export async function saveCall(orgId: string, call: Partial<CallRow>): Promise<{ id: string; slug: string; shifts: number; orphaned: number }> {
  const { data, error } = await supabase.rpc('save_volunteer_call', { p_org: orgId, p_call: call })
  if (error) throw error
  return data as { id: string; slug: string; shifts: number; orphaned: number }
}

export async function deleteCall(id: string): Promise<void> {
  const { error } = await supabase.from('volunteer_calls').delete().eq('id', id)
  if (error) throw error
}

export async function callRoster(callId: string): Promise<RosterLine[]> {
  const { data, error } = await supabase.rpc('call_roster', { p_call: callId })
  if (error) throw error
  return (data ?? []) as RosterLine[]
}

export async function callThanks(callId: string): Promise<Helper[]> {
  const { data, error } = await supabase.rpc('call_thanks', { p_call: callId })
  if (error) throw error
  return (data ?? []) as Helper[]
}

export async function markThanked(callId: string, email: string): Promise<void> {
  const { error } = await supabase.rpc('mark_thanked', { p_call: callId, p_email: email })
  if (error) throw error
}

export async function callSources(callId: string): Promise<{ source: string; people: number }[]> {
  const { data, error } = await supabase.rpc('call_sources', { p_call: callId })
  if (error) throw error
  return (data ?? []) as { source: string; people: number }[]
}

/** Present, or didn't come — the same statuses the shift roster uses. */
export async function setAttendance(bookingId: string, status: 'checked_in' | 'no_show' | 'confirmed'): Promise<void> {
  const { error } = await supabase.rpc('mark_call_attendance', { p_booking: bookingId, p_status: status })
  if (error) throw error
}

export async function addWalkIn(slotId: string, name: string, email: string, phone: string, area: string): Promise<void> {
  const { error } = await supabase.rpc('add_walk_in', {
    p_slot_id: slotId,
    p_name: name,
    p_email: email,
    p_phone: phone || null,
    p_area: area || null,
  })
  if (error) throw error
}

/** What each volunteer said their hours are for, keyed by lower-case email. */
export async function hoursForByEmail(orgId: string, emails: string[]): Promise<Record<string, HoursFor | null>> {
  if (emails.length === 0) return {}
  const { data, error } = await supabase.from('volunteers').select('email, hours_for').eq('org_id', orgId).in('email', emails)
  if (error) throw error
  return Object.fromEntries(((data ?? []) as { email: string | null; hours_for: HoursFor | null }[]).map((v) => [(v.email ?? '').toLowerCase(), v.hours_for]))
}

/** Every recorded hour for one volunteer between two dates: shifts they were here for, and hours added by hand. */
export async function hoursHistory(orgId: string, email: string, from: string, to: string): Promise<HoursLine[]> {
  const { data, error } = await supabase.rpc('volunteer_history', { p_org: orgId, p_email: email, p_from: from, p_to: to })
  if (error) throw error
  return ((data ?? []) as HoursLine[]).map((r) => ({ ...r, hours: Number(r.hours) }))
}
